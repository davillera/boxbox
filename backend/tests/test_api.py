from datetime import UTC, datetime, timedelta

import numpy as np
from sqlmodel import Session, select

from app.models import PredictionHistory
from app.services import calendar
from app.services.prediction import normalize_field

USGP = {
    "circuit_ref": "americas",
    "weather": {"air_temp_c": 24, "humidity_pct": 55, "wind_speed_ms": 3, "rainfall": False},
    "entries": [
        {"driver_ref": "norris", "grid_position": 1},
        {"driver_ref": "max_verstappen", "grid_position": 2, "quali_gap_pct": 0.1},
    ],
    "season": 2026,
    "round": 19,
}


def test_health(client):
    body = client.get("/health").json()
    assert body["status"] == "ok"
    assert body["model"]["version"]
    assert 0 < body["backtest"]["model"]["winner_pick_accuracy"] <= 1


def test_catalog(client):
    circuits = client.get("/circuits").json()
    drivers = client.get("/drivers").json()
    assert any(c["circuit_ref"] == "americas" for c in circuits)
    assert len(drivers) >= 20
    assert {"driver_ref", "code", "team_name", "last_grid"} <= drivers[0].keys()
    assert all(0 <= d["last_grid"] <= 30 for d in drivers)


def test_review_compares_each_race_with_its_result(client):
    races = client.get("/review").json()["races"]
    keys = [(r["season"], r["round"]) for r in races]
    assert keys and keys == sorted(keys) and "field" not in races[0]
    for r in races:
        assert 0 <= r["winner"]["win_probability"] <= r["pick"]["win_probability"] <= 1
        assert 0 <= r["podium_hits"] <= 3 and r["winner_rank"] >= 1

    last = races[-1]
    race = client.get(f"/review/{last['season']}/{last['round']}").json()
    probs = [e["win_probability"] for e in race["field"]]
    assert probs == sorted(probs, reverse=True) and abs(sum(probs) - 1) < 1e-2
    assert race["field"][race["winner_rank"] - 1]["finish"] == 1
    assert client.get("/review/1999/1").status_code == 404


def test_upcoming_races_skip_started_and_get_the_forecast_in_range(client, monkeypatch):
    now = datetime.now(UTC)

    def race(rnd, start):
        return {
            "season": "2026",
            "round": str(rnd),
            "raceName": f"GP {rnd}",
            "date": start.date().isoformat(),
            "time": start.strftime("%H:00:00Z"),
            "Circuit": {"circuitId": "americas", "circuitName": "COTA", "Location": {"lat": "30.1", "long": "-97.6", "country": "USA"}},
        }

    start = now + timedelta(days=3)
    hours = [start.replace(minute=0, second=0, microsecond=0) + timedelta(hours=h) for h in range(2)]
    hourly = {
        "time": [h.strftime("%Y-%m-%dT%H:%M") for h in hours],
        "temperature_2m": [20.0, 22.0],
        "relative_humidity_2m": [50, 60],
        "precipitation": [1.0, 0.5],
        "surface_pressure": [1010, 1010],
        "wind_speed_10m": [2.0, 4.0],
    }
    payloads = {
        "jolpi": {"MRData": {"RaceTable": {"Races": [race(98, now - timedelta(hours=1)), race(99, start), race(100, now + timedelta(days=40))]}}},
        "open-meteo": {"hourly": hourly},
    }
    monkeypatch.setattr(calendar, "_cache", None)
    monkeypatch.setattr(calendar, "_get_json", lambda url: next(v for k, v in payloads.items() if k in url))

    races = client.get("/races/upcoming").json()
    assert [r["round"] for r in races] == [99, 100]  # R98 already started
    assert races[0]["weather"] == {"air_temp_c": 21.0, "humidity_pct": 55.0, "wind_speed_ms": 3.0, "precipitation_mm": 1.5, "rainfall": True}
    assert races[1]["weather"] is None  # beyond the forecast horizon


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
    assert all(r.season == 2026 and r.round == 19 for r in rows)


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
