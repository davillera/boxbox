from fastapi import APIRouter, BackgroundTasks, HTTPException, status

from app.api.deps import EngineDep, ServiceDep
from app.schemas import CircuitOut, DriverOut, HealthOut, PredictRequest, PredictResponse
from app.services.prediction import PredictionInputError, record_predictions

router = APIRouter()


@router.get("/health", response_model=HealthOut, tags=["meta"])
def health(service: ServiceDep) -> HealthOut:
    return HealthOut(status="ok", model=service.model_info, backtest=service.backtest)


@router.get("/circuits", response_model=list[CircuitOut], tags=["catalog"])
def list_circuits(service: ServiceDep) -> list[CircuitOut]:
    return service.circuits()


@router.get("/drivers", response_model=list[DriverOut], tags=["catalog"])
def list_drivers(service: ServiceDep) -> list[DriverOut]:
    """Current grid (entrants of the most recent race in the training data)."""
    return service.drivers()


@router.post("/predict", response_model=PredictResponse, tags=["predict"])
def predict(req: PredictRequest, service: ServiceDep, engine: EngineDep, background: BackgroundTasks) -> PredictResponse:
    """Win and podium probabilities for each entry; the request is logged to prediction_history."""
    try:
        resp = service.predict(req)
    except PredictionInputError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(exc)) from exc
    background.add_task(record_predictions, engine, req, resp)
    return resp
