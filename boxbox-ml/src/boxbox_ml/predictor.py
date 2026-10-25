"""Load a trained bundle and score race scenarios. Runtime-only deps (no FastF1)."""

from dataclasses import asdict, dataclass
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

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
class Prediction:
    driver_ref: str
    circuit_ref: str
    win_probability: float
    podium_probability: float


class RacePredictor:
    def __init__(self, bundle: dict):
        self.model = bundle["model"]
        self.categories: dict[str, list[str]] = bundle["categories"]
        self.history: pd.DataFrame = bundle["history"]
        self.metadata: dict = bundle["metadata"]
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
        cols = ["driver_ref", "driver_code", "first_name", "last_name", "team_ref", "team_name"]
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
            for i, p in zip(batch, proba):
                win = float(np.clip(p[0], 0, 1))
                out[i] = Prediction(
                    driver_ref=rows[i]["driver_ref"],
                    circuit_ref=rows[i]["circuit_ref"],
                    win_probability=win,
                    podium_probability=float(np.clip(p[0] + p[1], win, 1)),
                )
        return out
