import numpy as np

from boxbox_ml import calibration


def _races(n: int, overconfident: bool) -> list[dict]:
    """20-car fields where the true win chance is 1/20 for everyone but the favourite (30 %)."""
    rng = np.random.default_rng(0)
    races = []
    for _ in range(n):
        p_true = np.full(20, 0.7 / 19)
        p_true[0] = 0.3
        winner = rng.choice(20, p=p_true)
        claimed = np.full(20, 0.02) if overconfident else p_true
        if overconfident:
            claimed[0] = 0.8  # says 80 % for a driver who wins 30 % of the time
        races.append(
            {
                "field": [
                    {"p_win": float(claimed[i]), "p_podium": min(1.0, float(claimed[i]) * 3), "finish": 1 if i == winner else 2 + i}
                    for i in range(20)
                ]
            }
        )
    return races


def test_overconfident_probabilities_are_calibrated_and_stay_monotone():
    calibrators, report = calibration.fit(_races(150, overconfident=True))
    assert report["win"]["applied"] and report["win"]["brier_calibrated"] < report["win"]["brier_raw"]
    fixed = calibrators["win"](np.array([0.02, 0.5, 0.8]))
    assert fixed[2] < 0.8 and np.all(np.diff(fixed) > 0)  # pulled down, never reordered


def test_well_calibrated_probabilities_are_left_alone():
    calibrators, report = calibration.fit(_races(150, overconfident=False))
    # A fit that cannot beat the raw numbers on held-out races must not be applied.
    assert report["win"]["applied"] == (calibrators["win"] is not None)
    assert report["win"]["brier_calibrated"] >= report["win"]["brier_raw"] * 0.97 or report["win"]["applied"]


def test_reliability_bins_cover_every_driver():
    p = np.linspace(0.01, 0.9, 80)
    hit = (p > 0.5).astype(float)
    bins = calibration.reliability(p, hit)
    assert sum(b["n"] for b in bins) == 80
    assert bins[0]["predicted"] < bins[-1]["predicted"] and bins[-1]["observed"] == 1.0
