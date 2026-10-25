import numpy as np
from sqlmodel import Session, select

from app.models import PredictionHistory
from app.services.prediction import normalize_field

USGP = {
    "circuit_ref": "americas",
    "weather": {"air_temp_c": 24, "humidity_pct": 55, "wind_speed_ms": 3, "rainfall": False},
    "entries": [
        {"driver_ref": "norris", "grid_position": 1},
        {"driver_ref": "max_verstappen", "grid_position": 2, "quali_gap_pct": 0.1},
    ],
    "season": 2026,
    "round": 18,
}


def test_health(client):
    body = client.get("/health").json()
    assert body["status"] == "ok"
    assert body["model"]["version"]


def test_catalog(client):
    circuits = client.get("/circuits").json()
    drivers = client.get("/drivers").json()
    assert any(c["circuit_ref"] == "americas" for c in circuits)
    assert len(drivers) >= 20
    assert {"driver_ref", "code", "team_name"} <= drivers[0].keys()


def test_predict_returns_probabilities_and_logs_history(client, engine):
    resp = client.post("/predict", json=USGP)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    preds = body["predictions"]
    assert {p["driver_ref"] for p in preds} == {"norris", "max_verstappen"}
    assert preds[0]["win_probability"] >= preds[1]["win_probability"]  # sorted
    for p in preds:
        assert 0 <= p["win_probability"] <= p["podium_probability"] <= 1
        assert p["driver_name"]

    with Session(engine) as s:  # background task ran after the response
        rows = s.exec(select(PredictionHistory)).all()
    assert len(rows) == 2
    assert {r.model_version for r in rows} == {body["model"]["version"]}
    assert all(r.season == 2026 and r.round == 18 for r in rows)


def test_better_grid_is_not_worse(client):
    def win(grid):
        req = {**USGP, "entries": [{"driver_ref": "norris", "grid_position": grid}]}
        return client.post("/predict", json=req).json()["predictions"][0]["win_probability"]

    assert win(1) > win(15)


def test_normalize_full_field(client):
    drivers = client.get("/drivers").json()
    req = {
        **USGP,
        "entries": [{"driver_ref": d["driver_ref"], "grid_position": i + 1} for i, d in enumerate(drivers)],
        "normalize": True,
    }
    preds = client.post("/predict", json=req).json()["predictions"]
    assert abs(sum(p["win_probability"] for p in preds) - 1) < 1e-2
    assert abs(sum(p["podium_probability"] for p in preds) - 3) < 1e-2


def test_unknown_refs_are_422(client):
    assert client.post("/predict", json={**USGP, "circuit_ref": "nurburgring_nordschleife"}).status_code == 422
    bad_driver = {**USGP, "entries": [{"driver_ref": "senna", "grid_position": 1}]}
    assert "senna" in client.post("/predict", json=bad_driver).json()["detail"]


def test_past_race_is_rejected(client):
    past = client.post("/predict", json={**USGP, "season": 2024, "round": 3})
    assert past.status_code == 422 and "after the last trained race" in past.json()["detail"]
    assert client.post("/predict", json={**USGP, "season": 2027, "round": 1}).status_code == 200


def test_validation_errors(client):
    dup = {**USGP, "entries": [{"driver_ref": "norris", "grid_position": 1}] * 2}
    assert client.post("/predict", json=dup).status_code == 422
    assert client.post("/predict", json={**USGP, "entries": []}).status_code == 422
    bad_grid = {**USGP, "entries": [{"driver_ref": "norris", "grid_position": 40}]}
    assert client.post("/predict", json=bad_grid).status_code == 422


def test_normalize_field_caps_podium():
    win, podium = normalize_field(np.array([0.5, 0.3, 0.1, 0.1]), np.array([0.99, 0.9, 0.6, 0.5]))
    assert np.isclose(win.sum(), 1)
    assert np.isclose(podium.sum(), 3)
    assert (podium <= 1).all() and (podium >= win).all()
