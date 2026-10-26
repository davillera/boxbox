import logging
from pathlib import Path

import numpy as np
from boxbox_ml import RacePredictor, Scenario
from sqlalchemy import Engine
from sqlmodel import Session, select

from app.models import Circuit, Driver, PredictionHistory
from app.schemas import (
    Backtest,
    CircuitOut,
    DriverOut,
    EntryPrediction,
    ModelInfo,
    PredictRequest,
    PredictResponse,
)

log = logging.getLogger(__name__)


class PredictionInputError(ValueError):
    """A request the model cannot answer (unknown circuit/driver, past race)."""


def normalize_field(win: np.ndarray, podium: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Rescale a whole field: sum(win) = 1, sum(podium) = min(3, n), with win <= podium <= 1."""
    if win.sum() > 0:
        win = win / win.sum()
    target = min(3.0, float(len(podium)))
    podium = podium.astype(float).copy()
    # Water-filling: scale the uncapped entries until the capped total matches.
    for _ in range(20):
        capped = podium >= 1.0
        free_total = target - capped.sum()
        free_sum = podium[~capped].sum()
        if free_sum <= 0 or abs(free_sum - free_total) < 1e-9:
            break
        podium[~capped] *= free_total / free_sum
        podium = np.minimum(podium, 1.0)
    return win, np.clip(np.maximum(podium, win), 0.0, 1.0)


class PredictionService:
    def __init__(self, predictor: RacePredictor):
        self.predictor = predictor
        meta = predictor.metadata
        self.model_info = ModelInfo(
            name=meta["model_name"], version=meta["model_version"], trained_at=meta["trained_at"], data_to=meta["data_to"]
        )
        self.backtest = Backtest.model_validate(meta["backtest"])
        latest = predictor.history.sort_values(["season", "round"]).groupby("driver_ref").tail(1)
        self._drivers = latest.set_index("driver_ref")[["driver_code", "first_name", "last_name", "team_name"]].to_dict("index")
        self._circuits = set(predictor.categories["circuit_ref"])
        last = predictor.history.sort_values(["season", "round"]).iloc[-1]
        self._last_race = (int(last["season"]), int(last["round"]))

    @classmethod
    def from_path(cls, path: Path) -> "PredictionService":
        if not path.exists():
            raise FileNotFoundError(f"model bundle not found at {path}; run `uv run python -m boxbox_ml.train` in boxbox-ml/")
        return cls(RacePredictor.load(path))

    def circuits(self) -> list[CircuitOut]:
        df = self.predictor.circuits()
        return [CircuitOut(circuit_ref=r.circuit_ref, name=r.circuit_name, country=r.country) for r in df.itertuples()]

    def drivers(self) -> list[DriverOut]:
        df = self.predictor.drivers()
        return [
            DriverOut(
                driver_ref=r.driver_ref,
                code=r.driver_code,
                first_name=r.first_name,
                last_name=r.last_name,
                team_ref=r.team_ref,
                team_name=r.team_name,
                last_grid=r.grid_position,
            )
            for r in df.itertuples()
        ]

    def predict(self, req: PredictRequest) -> PredictResponse:
        if req.circuit_ref not in self._circuits:
            raise PredictionInputError(f"unknown circuit_ref {req.circuit_ref!r}")
        unknown = [e.driver_ref for e in req.entries if e.driver_ref not in self._drivers]
        if unknown:
            raise PredictionInputError(f"unknown driver_ref: {', '.join(unknown)}")
        # The model always scores the *next* race with current form; a past race would be mislabelled.
        last_season, last_round = self._last_race
        if req.season is not None and (
            req.season < last_season or (req.season == last_season and req.round is not None and req.round <= last_round)
        ):
            raise PredictionInputError(f"season/round must be after the last trained race ({last_season} R{last_round})")

        w = req.weather
        scenarios = [
            Scenario(
                driver_ref=e.driver_ref,
                circuit_ref=req.circuit_ref,
                grid_position=e.grid_position,
                quali_position=e.quali_position,
                quali_gap_pct=e.quali_gap_pct,
                air_temp_c=w.air_temp_c,
                humidity_pct=w.humidity_pct,
                wind_speed_ms=w.wind_speed_ms,
                rainfall=w.rainfall,
            )
            for e in req.entries
        ]
        results = self.predictor.predict(scenarios)
        win = np.array([r.win_probability for r in results])
        podium = np.array([r.podium_probability for r in results])
        if req.normalize:
            win, podium = normalize_field(win, podium)

        predictions = []
        for entry, p_win, p_podium in zip(req.entries, win, podium):
            info = self._drivers[entry.driver_ref]
            predictions.append(
                EntryPrediction(
                    driver_ref=entry.driver_ref,
                    driver_code=info["driver_code"],
                    driver_name=f"{info['first_name']} {info['last_name']}",
                    team_name=info["team_name"],
                    grid_position=entry.grid_position,
                    win_probability=round(float(p_win), 4),
                    podium_probability=round(float(p_podium), 4),
                )
            )
        predictions.sort(key=lambda p: p.win_probability, reverse=True)
        return PredictResponse(
            model=self.model_info, circuit_ref=req.circuit_ref, normalized=req.normalize, predictions=predictions
        )


def record_predictions(engine: Engine, req: PredictRequest, resp: PredictResponse) -> None:
    """Background task: audit-log each prediction. Never raises (the response is already sent)."""
    try:
        with Session(engine) as session:
            circuit_id = session.exec(select(Circuit.id).where(Circuit.circuit_ref == req.circuit_ref)).first()
            refs = [p.driver_ref for p in resp.predictions]
            driver_ids = dict(session.exec(select(Driver.driver_ref, Driver.id).where(Driver.driver_ref.in_(refs))).all())
            if circuit_id is None:
                log.warning("prediction not recorded: circuit %s missing in DB", req.circuit_ref)
                return
            for p in resp.predictions:
                if p.driver_ref not in driver_ids:
                    log.warning("prediction not recorded: driver %s missing in DB", p.driver_ref)
                    continue
                session.add(
                    PredictionHistory(
                        circuit_id=circuit_id,
                        driver_id=driver_ids[p.driver_ref],
                        season=req.season,
                        round=req.round,
                        grid_position=p.grid_position,
                        air_temp_c=req.weather.air_temp_c,
                        humidity_pct=req.weather.humidity_pct,
                        rainfall=req.weather.rainfall,
                        model_name=resp.model.name,
                        model_version=resp.model.version,
                        win_probability=p.win_probability,
                        podium_probability=p.podium_probability,
                    )
                )
            session.commit()
    except Exception:
        log.exception("failed to record predictions")
