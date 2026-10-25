"""Feature engineering shared by training and inference.

Every feature for a race uses only information available before lights out:
grid/qualifying, weather, circuit, and form computed from *earlier* races.
Inference appends the scenario as an "upcoming" race to the history and runs
this same code, so train and serve can never drift apart.
"""

import numpy as np
import pandas as pd

TARGET = "target"
# 0 = win, 1 = P2-P3, 2 = rest. P(podium) = P(0) + P(1) >= P(win) by construction.
CLASS_WIN, CLASS_PODIUM, CLASS_REST = 0, 1, 2

CATEGORICAL_FEATURES = ["circuit_ref"]
NUMERIC_FEATURES = [
    # Pre-race session
    "grid",
    "quali_position",
    "quali_gap_pct",
    # Weather
    "air_temp_c",
    "humidity_pct",
    "wind_speed_ms",
    "rainfall",
    # Circuit (previous editions only)
    "circuit_grid_corr",  # rank correlation grid vs finish: ~1 = hard to overtake
    "grid_x_overtaking",
    # Driver form (previous races only)
    "drv_avg_finish_5",
    "drv_avg_points_5",
    "drv_avg_grid_gain_5",
    "drv_dnf_rate_10",
    "drv_races",
    "drv_circuit_avg_finish",
    "drv_wet_avg_finish",
    # Constructor form (previous races only)
    "team_avg_points_5",
]
FEATURE_COLUMNS = NUMERIC_FEATURES + CATEGORICAL_FEATURES

# Columns a history/upcoming frame must provide.
INPUT_COLUMNS = [
    "season",
    "round",
    "circuit_ref",
    "driver_ref",
    "team_ref",
    "grid_position",
    "quali_position",
    "quali_gap_pct",
    "air_temp_c",
    "humidity_pct",
    "wind_speed_ms",
    "rainfall",
    "finish_position",
    "position_text",
    "points",
]

MIN_FIELD_SIZE = 20


def make_target(finish_position: pd.Series) -> pd.Series:
    pos = pd.to_numeric(finish_position, errors="coerce").astype(float)
    target = np.where(pos == 1, CLASS_WIN, np.where(pos <= 3, CLASS_PODIUM, CLASS_REST)).astype(float)
    return pd.Series(np.where(np.isnan(pos), np.nan, target), index=pos.index)


def _lagged(df: pd.DataFrame, keys: list[str], col: str, window: int | None = None) -> pd.Series:
    """Mean of `col` over the previous `window` rows of each group (expanding if None).

    Rows must already be in chronological order. NaNs (e.g. upcoming races) are skipped.
    """

    group_keys = [df[k] for k in keys]
    prev = df[col].astype(float).groupby(group_keys, sort=False).shift(1)
    grouped = prev.groupby(group_keys, sort=False)
    out = grouped.rolling(window, min_periods=1).mean() if window else grouped.expanding().mean()
    # Vectorised rolling returns (group keys..., original index); realign to df.
    return out.droplevel(list(range(len(keys)))).reindex(df.index)


def _per_group_corr(keys: pd.Series, a: pd.Series, b: pd.Series) -> pd.Series:
    """Pearson correlation of a and b within each key (vectorised; NaN if undefined)."""
    da = a - a.groupby(keys).transform("mean")
    db = b - b.groupby(keys).transform("mean")
    num = (da * db).groupby(keys).sum()
    den = np.sqrt((da**2).groupby(keys).sum() * (db**2).groupby(keys).sum())
    return (num / den.replace(0, np.nan)).rename("corr")


def build_features(history: pd.DataFrame, upcoming: pd.DataFrame | None = None) -> pd.DataFrame:
    """Return history (+ upcoming) rows with FEATURE_COLUMNS, TARGET and an `is_upcoming` flag.

    `upcoming` rows describe a race that has not happened: no finish/points, and at
    most one row per driver. They are placed after every historical race.
    """
    hist = history[INPUT_COLUMNS].copy()
    hist["is_upcoming"] = False
    frames = [hist]
    if upcoming is not None and len(upcoming):
        if upcoming["driver_ref"].duplicated().any():
            raise ValueError("upcoming must have at most one row per driver")
        up = upcoming.reindex(columns=INPUT_COLUMNS).copy()
        last_season, last_round = hist[["season", "round"]].sort_values(["season", "round"]).iloc[-1]
        up["season"], up["round"] = last_season, last_round + 1
        up[["finish_position", "points"]] = np.nan
        up["position_text"] = None
        up["is_upcoming"] = True
        # All-NA columns would otherwise be object-typed and degrade the concat.
        # Match history dtypes; numpy ints cannot hold NaN, so those become float.
        def _nullable(dtype):
            numpy_int = pd.api.types.is_integer_dtype(dtype) and not isinstance(dtype, pd.api.extensions.ExtensionDtype)
            return float if numpy_int else dtype

        up = up.astype({c: _nullable(hist[c].dtype) for c in INPUT_COLUMNS if up[c].isna().all()})
        frames.append(up)

    df = pd.concat(frames, ignore_index=True)
    df["race_key"] = df["season"].astype(int) * 100 + df["round"].astype(int)
    df = df.sort_values(["race_key", "driver_ref"], kind="stable").reset_index(drop=True)

    finish = df["finish_position"].astype(float)
    df["rainfall"] = df["rainfall"].astype("boolean").fillna(False).astype(int)

    # Pit-lane starts are grid 0 in Ergast: put them behind the last car.
    grid = df["grid_position"].astype(float)
    field = df.groupby("race_key")["grid_position"].transform("max").astype(float).clip(lower=MIN_FIELD_SIZE)
    df["grid"] = grid.where(grid > 0, field + 1)

    classified = df["position_text"].astype(str).str.fullmatch(r"\d+")
    df["_dnf"] = np.where(finish.isna(), np.nan, (~classified).astype(float))
    df["_grid_gain"] = df["grid"] - finish
    df["_finish"] = finish
    df["_wet_finish"] = finish.where(df["rainfall"] == 1)

    df["drv_avg_finish_5"] = _lagged(df, ["driver_ref"], "_finish", 5)
    df["drv_avg_points_5"] = _lagged(df, ["driver_ref"], "points", 5)
    df["drv_avg_grid_gain_5"] = _lagged(df, ["driver_ref"], "_grid_gain", 5)
    df["drv_dnf_rate_10"] = _lagged(df, ["driver_ref"], "_dnf", 10)
    df["drv_races"] = df.groupby("driver_ref", sort=False).cumcount()
    df["drv_circuit_avg_finish"] = _lagged(df, ["driver_ref", "circuit_ref"], "_finish")
    df["drv_wet_avg_finish"] = _lagged(df, ["driver_ref"], "_wet_finish")

    # Constructor form on a team-per-race grain (both cars' points summed).
    team = (
        df.groupby(["team_ref", "race_key"], sort=False)["points"]
        .sum(min_count=1)
        .reset_index()
        .sort_values("race_key", kind="stable")
    )
    team["team_avg_points_5"] = _lagged(team, ["team_ref"], "points", 5)
    df = df.merge(team[["team_ref", "race_key", "team_avg_points_5"]], on=["team_ref", "race_key"], how="left")

    # Overtaking difficulty: grid-vs-finish rank correlation of classified cars,
    # averaged over the circuit's previous editions.
    done = df[classified & df["_finish"].notna()]
    race_corr = _per_group_corr(
        done["race_key"],
        done.groupby("race_key")["grid"].rank(),
        done.groupby("race_key")["_finish"].rank(),
    )
    races = df.groupby("race_key")["circuit_ref"].first().to_frame().join(race_corr).reset_index()
    races["circuit_grid_corr"] = _lagged(races, ["circuit_ref"], "corr")
    df = df.merge(races[["race_key", "circuit_grid_corr"]], on="race_key", how="left")
    df["grid_x_overtaking"] = df["grid"] * df["circuit_grid_corr"]

    df[TARGET] = make_target(df["finish_position"])
    return df.drop(columns=[c for c in df.columns if c.startswith("_")])


def to_model_frame(features: pd.DataFrame, categories: dict[str, list[str]]) -> pd.DataFrame:
    """Select model inputs with stable dtypes; unseen categories become NaN (XGBoost "missing")."""
    X = features[FEATURE_COLUMNS].copy()
    for col in NUMERIC_FEATURES:
        X[col] = pd.to_numeric(X[col], errors="coerce").astype(float)
    for col in CATEGORICAL_FEATURES:
        X[col] = pd.Categorical(X[col], categories=categories[col])
    return X
