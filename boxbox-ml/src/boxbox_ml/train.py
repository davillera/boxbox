"""Train the XGBoost race-outcome model and export it as a joblib bundle.

    uv run python -m boxbox_ml.train

Evaluation is a chronological backtest: for each of the last BACKTEST_SEASONS
seasons, train on every earlier race and predict that whole season.
Early stopping always uses the latest races of the training span. The exported
model is refit on every race with the tree count found on the full history.
"""

import argparse
import json
import logging
from datetime import UTC, datetime
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import brier_score_loss, log_loss, roc_auc_score
from xgboost import XGBClassifier

from boxbox_ml.config import ENTRIES_PATH, METRICS_PATH, MODEL_PATH
from boxbox_ml.features import (
    CATEGORICAL_FEATURES,
    CLASS_WIN,
    INPUT_COLUMNS,
    TARGET,
    build_features,
    to_model_frame,
)

log = logging.getLogger("boxbox_ml.train")

MODEL_NAME = "xgb-race-outcome"
BACKTEST_SEASONS = 3
VALID_FRACTION = 0.15
# Share of training rows whose qualifying gap is hidden, so the model also
# copes with requests that only send grid positions.
QUALI_GAP_DROPOUT = 0.3
SEED = 42

XGB_PARAMS = dict(
    objective="multi:softprob",
    num_class=3,
    tree_method="hist",  # fast CPU histogram algorithm
    enable_categorical=True,
    max_cat_to_onehot=1,
    n_estimators=2000,
    learning_rate=0.03,
    max_depth=4,
    min_child_weight=5,
    subsample=0.8,
    colsample_bytree=0.8,
    reg_lambda=2.0,
    n_jobs=-1,
    random_state=SEED,
)


def split_races(race_keys: pd.Series, fraction: float) -> tuple[pd.Series, pd.Series]:
    races = np.sort(race_keys.unique())
    cutoff = races[-max(1, int(round(len(races) * fraction)))]
    return race_keys < cutoff, race_keys >= cutoff


def evaluate(proba: np.ndarray, y: pd.Series, race_key: pd.Series) -> dict:
    win_p, podium_p = proba[:, 0], proba[:, 0] + proba[:, 1]
    won, podium = (y == CLASS_WIN).to_numpy(), (y <= 1).to_numpy()
    frame = pd.DataFrame({"race": race_key.to_numpy(), "win_p": win_p, "podium_p": podium_p, "won": won, "podium": podium})
    top_pick = frame.loc[frame.groupby("race")["win_p"].idxmax(), "won"].mean()
    podium_hits = frame.groupby("race").apply(lambda g: g.nlargest(3, "podium_p")["podium"].mean(), include_groups=False).mean()
    return {
        "log_loss": round(float(log_loss(y, proba, labels=[0, 1, 2])), 4),
        "win_auc": round(float(roc_auc_score(won, win_p)), 4),
        "podium_auc": round(float(roc_auc_score(podium, podium_p)), 4),
        "win_brier": round(float(brier_score_loss(won, win_p)), 4),
        "podium_brier": round(float(brier_score_loss(podium, podium_p)), 4),
        "winner_pick_accuracy": round(float(top_pick), 4),  # favourite actually won
        "podium_top3_precision": round(float(podium_hits), 4),  # of our top-3, share on the podium
        "races": int(frame["race"].nunique()),
    }


def _dropout_quali_gap(X: pd.DataFrame, rng: np.random.Generator) -> pd.DataFrame:
    X = X.copy()
    X.loc[rng.random(len(X)) < QUALI_GAP_DROPOUT, "quali_gap_pct"] = np.nan
    return X


def fit_model(X: pd.DataFrame, y: pd.Series, race_key: pd.Series, rng: np.random.Generator) -> tuple[XGBClassifier, int]:
    """Early-stop on the latest races of (X, y), then refit on all of it with that tree count."""
    fit_mask, valid_mask = split_races(race_key, VALID_FRACTION)
    probe = XGBClassifier(**XGB_PARAMS, early_stopping_rounds=100, eval_metric="mlogloss")
    probe.fit(_dropout_quali_gap(X[fit_mask], rng), y[fit_mask], eval_set=[(X[valid_mask], y[valid_mask])], verbose=False)
    n_trees = probe.best_iteration + 1
    model = XGBClassifier(**{**XGB_PARAMS, "n_estimators": n_trees})
    model.fit(_dropout_quali_gap(X, rng), y)
    return model, n_trees


def _grid_baseline(X: pd.DataFrame, y: pd.Series, train: pd.Series) -> np.ndarray:
    grid = X[["grid"]].fillna(X["grid"].max())
    return LogisticRegression(max_iter=1000).fit(grid[train], y[train]).predict_proba(grid[~train])


def backtest(feats: pd.DataFrame, X: pd.DataFrame, y: pd.Series, seasons: int = BACKTEST_SEASONS) -> dict:
    """Season-by-season walk-forward evaluation; metrics are pooled over all predicted races."""
    rng = np.random.default_rng(SEED)
    model_p, base_p, idx = [], [], []
    per_season = {}
    for season in sorted(feats["season"].unique())[-seasons:]:
        train, test = feats["season"] < season, feats["season"] == season
        model, n_trees = fit_model(X[train], y[train], feats.loc[train, "race_key"], rng)
        p = model.predict_proba(X[test])
        per_season[int(season)] = {**evaluate(p, y[test], feats.loc[test, "race_key"]), "n_trees": n_trees}
        model_p.append(p)
        base_p.append(_grid_baseline(X, y, train)[test[~train].to_numpy()])
        idx.append(test[test].index)
    idx = np.concatenate(idx)
    return {
        "model": evaluate(np.vstack(model_p), y[idx], feats.loc[idx, "race_key"]),
        "baseline_grid_only": evaluate(np.vstack(base_p), y[idx], feats.loc[idx, "race_key"]),
        "per_season": per_season,
    }


def prepare(entries: pd.DataFrame):
    feats = build_features(entries)
    feats = feats[feats[TARGET].notna()].reset_index(drop=True)
    categories = {c: sorted(entries[c].dropna().unique().tolist()) for c in CATEGORICAL_FEATURES}
    return feats, to_model_frame(feats, categories), feats[TARGET].astype(int), categories


def train(entries_path: Path = ENTRIES_PATH, model_path: Path = MODEL_PATH, metrics_path: Path = METRICS_PATH) -> dict:
    entries = pd.read_parquet(entries_path)
    feats, X, y, categories = prepare(entries)

    bt = backtest(feats, X, y)
    log.info("backtest %s", bt["model"])

    final, n_trees = fit_model(X, y, feats["race_key"], np.random.default_rng(SEED))
    importance = pd.Series(final.feature_importances_, index=X.columns).sort_values(ascending=False)
    trained_at = datetime.now(UTC)
    last = feats.sort_values("race_key").iloc[-1]
    metadata = {
        "model_name": MODEL_NAME,
        "model_version": trained_at.strftime("%Y%m%d.%H%M%S"),
        "trained_at": trained_at.isoformat(),
        "n_trees": n_trees,
        "rows": len(feats),
        "races": int(feats["race_key"].nunique()),
        "data_from": f"{feats['season'].min()}-R{int(feats.loc[feats['race_key'].idxmin(), 'round'])}",
        "data_to": f"{int(last['season'])}-R{int(last['round'])}",
        "features": list(X.columns),
        "backtest": bt,
        "feature_importance": {k: round(float(v), 4) for k, v in importance.items()},
    }

    bundle = {
        "model": final,
        "categories": categories,
        # Raw history drives the form features at inference (see features.build_features).
        "history": entries[INPUT_COLUMNS + ["driver_code", "first_name", "last_name", "team_name", "circuit_name", "country"]],
        "metadata": metadata,
    }
    model_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(bundle, model_path, compress=3)
    metrics_path.write_text(json.dumps(metadata, indent=2))
    log.info("saved %s (%s)", model_path, metadata["model_version"])
    return metadata


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--entries", type=Path, default=ENTRIES_PATH)
    parser.add_argument("--out", type=Path, default=MODEL_PATH)
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    meta = train(args.entries, args.out, args.out.with_name("metrics.json"))
    print(json.dumps({k: meta[k] for k in ("model_version", "n_trees", "races", "data_to", "backtest")}, indent=2))


if __name__ == "__main__":
    main()
