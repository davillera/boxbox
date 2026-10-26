"""Probability calibration fitted on the walk-forward backtest.

The backtest predicts every race without having seen it, so those probabilities are honest
out-of-sample scores. A Platt scaler (logistic regression on the logit) maps them to the
frequency that actually happened. It is smooth and monotone, so it never reorders drivers,
which matters with ~70 winners; an isotonic fit would collapse them into ties.
"""

import numpy as np
from sklearn.linear_model import LogisticRegression

EPS = 1e-4
HOLDOUT_FRACTION = 1 / 3
BINS = 8


def _logit(p: np.ndarray) -> np.ndarray:
    p = np.clip(np.asarray(p, dtype=float), EPS, 1 - EPS)
    return np.log(p / (1 - p))


class Platt:
    """p -> sigmoid(a * logit(p) + b), fitted by logistic regression."""

    def __init__(self, p: np.ndarray, hit: np.ndarray):
        self.model = LogisticRegression(C=100.0).fit(_logit(p).reshape(-1, 1), hit)

    def __call__(self, p: np.ndarray) -> np.ndarray:
        return self.model.predict_proba(_logit(p).reshape(-1, 1))[:, 1]


def brier(p: np.ndarray, hit: np.ndarray) -> float:
    return float(np.mean((np.asarray(p, dtype=float) - hit) ** 2))


def reliability(p: np.ndarray, hit: np.ndarray, bins: int = BINS) -> list[dict]:
    """Equal-count bins of predicted probability next to how often it happened."""
    order = np.argsort(p)
    out = []
    for chunk in np.array_split(order, bins):
        if len(chunk):
            out.append(
                {
                    "predicted": round(float(np.mean(p[chunk])), 4),
                    "observed": round(float(np.mean(hit[chunk])), 4),
                    "n": int(len(chunk)),
                }
            )
    return out


def _target(races: list[dict], key: str, hit_up_to: int) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Predicted p, hit flag and race index of every driver, for p_win (hit_up_to=1) or p_podium (3)."""
    p, hit, idx = [], [], []
    for i, race in enumerate(races):
        for e in race["field"]:
            p.append(e[key])
            hit.append(e["finish"] is not None and e["finish"] <= hit_up_to)
            idx.append(i)
    return np.array(p, dtype=float), np.array(hit, dtype=float), np.array(idx)


def fit(races: list[dict]) -> tuple[dict[str, Platt | None], dict]:
    """Calibrators for win and podium, plus a report.

    A calibrator is kept only if it beats the raw probabilities on the most recent third of the
    backtest races when fitted on the earlier two thirds; then it is refit on all of them.
    """
    cut = int(len(races) * (1 - HOLDOUT_FRACTION))
    calibrators: dict[str, Platt | None] = {}
    report: dict = {"holdout_races": len(races) - cut}
    for name, key, upto in (("win", "p_win", 1), ("podium", "p_podium", 3)):
        p, hit, idx = _target(races, key, upto)
        early, late = idx < cut, idx >= cut
        raw = brier(p[late], hit[late])
        cal = brier(Platt(p[early], hit[early])(p[late]), hit[late])
        kept = bool(cal < raw)
        calibrators[name] = Platt(p, hit) if kept else None
        report[name] = {
            "applied": kept,
            "brier_raw": round(raw, 5),
            "brier_calibrated": round(cal, 5),
            "bins": reliability(p, hit),
        }
    return calibrators, report
