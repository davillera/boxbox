import numpy as np
import pandas as pd
import pytest

from boxbox_ml.features import FEATURE_COLUMNS, TARGET, build_features, make_target

DRIVERS = [("ver", "red_bull"), ("nor", "mclaren"), ("lec", "ferrari"), ("ham", "ferrari")]
CIRCUITS = ["bahrain", "monza", "spa", "bahrain", "monza"]


def make_history() -> pd.DataFrame:
    rng = np.random.default_rng(0)
    rows = []
    for rnd, circuit in enumerate(CIRCUITS, start=1):
        order = rng.permutation(len(DRIVERS))
        for pos, idx in enumerate(order, start=1):
            driver, team = DRIVERS[idx]
            rows.append(
                {
                    "season": 2025,
                    "round": rnd,
                    "circuit_ref": circuit,
                    "driver_ref": driver,
                    "team_ref": team,
                    "grid_position": int(rng.integers(1, 5)),
                    "quali_position": pos,
                    "quali_gap_pct": float(pos) / 10,
                    "air_temp_c": 25.0,
                    "humidity_pct": 50.0,
                    "wind_speed_ms": 2.0,
                    "rainfall": rnd == 3,
                    "finish_position": pos,
                    "position_text": "R" if pos == 4 else str(pos),
                    "points": {1: 25.0, 2: 18.0, 3: 15.0}.get(pos, 0.0),
                }
            )
    return pd.DataFrame(rows)


def test_target_classes():
    t = make_target(pd.Series([1, 2, 3, 4, None], dtype="Int64"))
    assert t.tolist()[:4] == [0, 1, 1, 2]
    assert pd.isna(t.iloc[4])


def test_first_race_has_no_form():
    feats = build_features(make_history())
    first = feats[feats["race_key"] == 202501]
    assert first["drv_avg_finish_5"].isna().all()
    assert (first["drv_races"] == 0).all()


def test_no_leakage_from_current_or_future_races():
    """Changing results of race N must not change features of races <= N."""
    hist = make_history()
    base = build_features(hist)
    tampered = hist.copy()
    mask = tampered["round"] >= 3
    tampered.loc[mask, "finish_position"] = 20
    tampered.loc[mask, "points"] = 0.0
    tampered.loc[mask, "position_text"] = "R"
    other = build_features(tampered)

    cols = [c for c in FEATURE_COLUMNS if c != "circuit_ref"]
    keep = base["race_key"] <= 202503
    pd.testing.assert_frame_equal(base.loc[keep, cols], other.loc[keep, cols])
    # ...but later races do see it.
    assert not base.loc[~keep, cols].equals(other.loc[~keep, cols])


def test_upcoming_matches_training_features():
    """Train/serve consistency: features of race 5 computed as 'upcoming' equal those from training."""
    hist = make_history()
    trained = build_features(hist)
    expected = trained[trained["race_key"] == 202505].set_index("driver_ref")[FEATURE_COLUMNS]

    upcoming = hist[hist["round"] == 5].drop(columns=["finish_position", "points", "position_text"])
    served = build_features(hist[hist["round"] < 5], upcoming)
    served = served[served["is_upcoming"]].set_index("driver_ref")[FEATURE_COLUMNS]

    pd.testing.assert_frame_equal(served.loc[expected.index], expected, check_dtype=False)
    assert served[TARGET].isna().all() if TARGET in served else True


def test_upcoming_rejects_duplicate_drivers():
    hist = make_history()
    up = hist[hist["round"] == 5].head(2).assign(driver_ref="ver")
    with pytest.raises(ValueError):
        build_features(hist, up)


def test_circuit_overtaking_uses_previous_editions_only():
    feats = build_features(make_history())
    first_bahrain = feats[feats["race_key"] == 202501]
    second_bahrain = feats[feats["race_key"] == 202504]
    assert first_bahrain["circuit_grid_corr"].isna().all()  # no earlier edition
    classified = first_bahrain[first_bahrain["position_text"].str.isdigit()]
    expected = classified["grid"].rank().corr(classified["finish_position"].astype(float).rank())
    assert np.isclose(second_bahrain["circuit_grid_corr"].iloc[0], expected, equal_nan=True)


def test_pit_lane_start_goes_to_back():
    hist = make_history()
    hist.loc[0, "grid_position"] = 0
    feats = build_features(hist)
    row = feats[(feats["race_key"] == 202501) & (feats["driver_ref"] == hist.loc[0, "driver_ref"])]
    assert row["grid"].iloc[0] == 21
