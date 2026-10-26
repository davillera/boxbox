"""Load a trained bundle and score race scenarios. Runtime-only deps (no FastF1)."""

from dataclasses import asdict, dataclass
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import xgboost as xgb

from boxbox_ml.features import build_features, to_model_frame


@dataclass(frozen=True)
class Scenario:
    driver_ref: str
    circuit_ref: str
    grid_position: int
    quali_position: int | None = None  # defaults to grid_position
    quali_gap_pct: float | None = None  # % off pole; unknown is fine
    air_temp_c: float | None = None
    humidity_pct: float | None = None
    wind_speed_ms: float | None = None
    rainfall: bool = False
    team_ref: str | None = None  # defaults to the driver's latest team


@dataclass(frozen=True)
class Factor:
    """One feature's push on a driver's win chance (TreeSHAP, in log-odds; >0 helps)."""

    feature: str
    value: float | str | None
    effect: float


@dataclass(frozen=True)
class Prediction:
    driver_ref: str
    circuit_ref: str
    win_probability: float
    podium_probability: float
    factors: tuple[Factor, ...] = ()


TOP_FACTORS = 4


class RacePredictor:
    def __init__(self, bundle: dict):
        self.model = bundle["model"]
        self.categories: dict[str, list[str]] = bundle["categories"]
        self.history: pd.DataFrame = bundle["history"]
        self.metadata: dict = bundle["metadata"]
        self.calibrators: dict = bundle.get("calibrators", {})
        # The columns this model was trained on; build_features may compute more.
        self.feature_columns: list[str] = self.model.get_booster().feature_names
        latest = self.history.sort_values(["season", "round"]).groupby("driver_ref").tail(1)
        self._latest_team = latest.set_index("driver_ref")["team_ref"].to_dict()

    @classmethod
    def load(cls, path: str | Path) -> "RacePredictor":
        return cls(joblib.load(path))

    @property
    def model_name(self) -> str:
        return self.metadata["model_name"]

    @property
    def model_version(self) -> str:
        return self.metadata["model_version"]

    def drivers(self) -> pd.DataFrame:
        """The current grid: entrants of the most recent race, grouped by team."""
        h = self.history
        last = h[(h["season"] == h["season"].max())]
        last = last[last["round"] == last["round"].max()]
        cols = ["driver_ref", "driver_code", "first_name", "last_name", "team_ref", "team_name", "grid_position"]
        return last.sort_values(["team_name", "last_name"])[cols].reset_index(drop=True)

    def circuits(self) -> pd.DataFrame:
        cols = ["circuit_ref", "circuit_name", "country"]
        return self.history.drop_duplicates("circuit_ref", keep="last")[cols].sort_values("circuit_name").reset_index(drop=True)

    def predict(self, scenarios: list[Scenario]) -> list[Prediction]:
        rows = []
        for s in scenarios:
            if s.driver_ref not in self._latest_team and s.team_ref is None:
                raise ValueError(f"unknown driver {s.driver_ref!r}; pass team_ref for a rookie")
            row = asdict(s)
            row["team_ref"] = s.team_ref or self._latest_team[s.driver_ref]
            row["quali_position"] = s.quali_position if s.quali_position is not None else s.grid_position
            rows.append(row)

        # Each upcoming race may hold a driver once; batch duplicates separately.
        batches: list[list[int]] = []
        for i, row in enumerate(rows):
            for batch in batches:
                if all(rows[j]["driver_ref"] != row["driver_ref"] for j in batch):
                    batch.append(i)
                    break
            else:
                batches.append([i])

        out: list[Prediction | None] = [None] * len(rows)
        for batch in batches:
            upcoming = pd.DataFrame([rows[i] for i in batch])
            feats = build_features(self.history, upcoming)
            feats = feats[feats["is_upcoming"]].set_index("driver_ref").loc[upcoming["driver_ref"]]
            X = to_model_frame(feats.reset_index(), self.categories)[self.feature_columns]
            proba = self.model.predict_proba(X)
            win, podium = self._calibrate(proba[:, 0], proba[:, 0] + proba[:, 1])
            factors = self._factors(X)
            for k, i in enumerate(batch):
                out[i] = Prediction(
                    driver_ref=rows[i]["driver_ref"],
                    circuit_ref=rows[i]["circuit_ref"],
                    win_probability=float(win[k]),
                    podium_probability=float(podium[k]),
                    factors=factors[k],
                )
        return out

    def _calibrate(self, win: np.ndarray, podium: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
        """Map raw probabilities through the backtest-fitted calibrators (identity when none was kept)."""
        if (cal := self.calibrators.get("win")) is not None:
            win = cal(win)
        if (cal := self.calibrators.get("podium")) is not None:
            podium = cal(podium)
        win = np.clip(win, 0, 1)
        return win, np.clip(np.maximum(podium, win), win, 1)

    def _factors(self, X: pd.DataFrame) -> list[tuple[Factor, ...]]:
        """The features that moved each row's win chance the most, from TreeSHAP contributions."""
        contribs = self.model.get_booster().predict(xgb.DMatrix(X, enable_categorical=True), pred_contribs=True)
        win = contribs[:, 0, :-1]  # class 0 = win; the last column is the bias
        out = []
        for row, effects in zip(X.itertuples(index=False), win):
            top = np.argsort(-np.abs(effects))[:TOP_FACTORS]
            out.append(
                tuple(
                    Factor(X.columns[j], _plain(row[j]), round(float(effects[j]), 4))
                    for j in top
                    if abs(effects[j]) > 1e-3
                )
            )
        return out


def _plain(v) -> float | str | None:
    """A JSON-friendly feature value (NaN -> None)."""
    if v is None or v is pd.NA or (isinstance(v, float) and np.isnan(v)):
        return None
    return v if isinstance(v, str) else float(v)
