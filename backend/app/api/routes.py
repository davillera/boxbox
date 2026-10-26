from fastapi import APIRouter, BackgroundTasks, HTTPException, status

from app.api.deps import EngineDep, ServiceDep
from app.schemas import (
    ChampionshipOut,
    CircuitOut,
    DriverDetail,
    DriverOut,
    HealthOut,
    MonitorOut,
    PredictRequest,
    PredictResponse,
    RaceComparison,
    RaceOut,
    ReviewOut,
)
from app.services import insights
from app.services.calendar import upcoming_races
from app.services.prediction import PredictionInputError, record_predictions

router = APIRouter()


@router.get("/health", response_model=HealthOut, tags=["meta"])
def health(service: ServiceDep) -> HealthOut:
    return HealthOut(status="ok", model=service.model_info, backtest=service.backtest, training=service.training)


@router.get("/circuits", response_model=list[CircuitOut], tags=["catalog"])
def list_circuits(service: ServiceDep) -> list[CircuitOut]:
    return service.circuits()


@router.get("/drivers", response_model=list[DriverOut], tags=["catalog"])
def list_drivers(service: ServiceDep) -> list[DriverOut]:
    """Current grid (entrants of the most recent race in the training data)."""
    return service.drivers()


@router.get("/drivers/{driver_ref}", response_model=DriverDetail, tags=["catalog"])
def driver_detail(driver_ref: str, service: ServiceDep) -> DriverDetail:
    """Season line, recent form (with what the model gave the driver) and best circuits."""
    detail = insights.driver_detail(service, driver_ref)
    if detail is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="unknown driver")
    return detail


@router.get("/races/upcoming", response_model=list[RaceOut], tags=["catalog"])
def list_upcoming_races(service: ServiceDep) -> list[RaceOut]:
    """Races after the last trained one that have not started, with the race-start forecast once in range."""
    try:
        return upcoming_races(service.last_race)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="race calendar unavailable") from exc


@router.get("/review", response_model=ReviewOut, tags=["meta"])
def review(service: ServiceDep) -> ReviewOut:
    """This season race by race: what the model, trained only on earlier races, predicted vs what happened."""
    return service.review


@router.get("/review/{season}/{round}", response_model=RaceComparison, tags=["meta"])
def race_comparison(season: int, round: int, service: ServiceDep) -> RaceComparison:
    """One backtest race: the whole predicted field (trained only on earlier races) next to how it finished."""
    race = service.comparisons.get((season, round))
    if race is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="race not in the backtest")
    return race


@router.get("/championship", response_model=ChampionshipOut, tags=["meta"])
def championship(service: ServiceDep) -> ChampionshipOut:
    """Title odds from simulating the rest of the season (Monte Carlo, Plackett-Luce finishing orders)."""
    try:
        left = [r.circuit_ref for r in upcoming_races(service.last_race) if r.season == service.last_race[0]]
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="race calendar unavailable") from exc
    return insights.championship(service, left)


@router.get("/monitor", response_model=MonitorOut, tags=["meta"])
def monitor(service: ServiceDep, engine: EngineDep) -> MonitorOut:
    """Drift check: recent backtest error vs the overall one, and logged predictions scored against results."""
    return insights.monitor(service, engine)


@router.post("/predict", response_model=PredictResponse, tags=["predict"])
def predict(req: PredictRequest, service: ServiceDep, engine: EngineDep, background: BackgroundTasks) -> PredictResponse:
    """Win and podium probabilities for each entry; the request is logged to prediction_history."""
    try:
        resp = service.predict(req)
    except PredictionInputError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(exc)) from exc
    background.add_task(record_predictions, engine, req, resp)
    return resp
