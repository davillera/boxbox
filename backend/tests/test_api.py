import json
from datetime import UTC, datetime, timedelta

import numpy as np
from sqlmodel import Session, select

from app.core.config import get_settings
from app.models import PredictionHistory
from app.services import calendar
from app.services.prediction import normalize_field

# The race right after the deployed model's data, so the suite keeps passing after every retrain.
_trained_to = json.loads(get_settings().model_path.with_name("metrics.json").read_text())["data_to"]
NEXT_SEASON, _last_round = map(int, _trained_to.split("-R"))
NEXT_ROUND = _last_round + 1

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
    importance = body["training"]["feature_importance"]
    assert "grid" in importance and abs(sum(importance.values()) - 1) < 0.01


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
    quali = {"MRData": {"RaceTable": {"Races": [{"QualifyingResults": [
        {"position": "1", "Driver": {"driverId": "norris"}, "Q1": "1:30.000", "Q2": "1:29.500", "Q3": "1:29.000"},
        {"position": "2", "Driver": {"driverId": "max_verstappen"}, "Q1": "1:30.500", "Q2": "1:29.900", "Q3": "1:29.890"},
        {"position": "3", "Driver": {"driverId": "piastri"}, "Q1": "", "Q2": None, "Q3": None},
    ]}]}}}
    payloads = {
        "qualifying": quali,
        "jolpi": {"MRData": {"RaceTable": {"Races": [race(98, now - timedelta(hours=1)), race(99, start), race(100, now + timedelta(days=40))]}}},
        "open-meteo": {"hourly": hourly},
    }
    monkeypatch.setattr(calendar, "_cache", None)
    monkeypatch.setattr(calendar, "_get_json", lambda url: next(v for k, v in payloads.items() if k in url))

    races = client.get("/races/upcoming").json()
    assert [r["round"] for r in races] == [99, 100]  # R98 already started
    assert races[0]["weather"] == {"air_temp_c": 21.0, "humidity_pct": 55.0, "wind_speed_ms": 3.0, "precipitation_mm": 1.5, "rainfall": True}
    assert races[1]["weather"] is None  # beyond the forecast horizon
    # Qualifying is only fetched for the race this weekend, with gaps measured from the pole time.
    assert [(q["driver_ref"], q["position"]) for q in races[0]["qualifying"]] == [("norris", 1), ("max_verstappen", 2), ("piastri", 3)]
    assert races[0]["qualifying"][0]["gap_pct"] == 0
    assert races[0]["qualifying"][1]["gap_pct"] == round((89.89 - 89.0) / 89.0 * 100, 3)
    assert races[0]["qualifying"][2]["gap_pct"] is None
    assert races[1]["qualifying"] is None


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
    assert all(r.season == NEXT_SEASON and r.round == NEXT_ROUND for r in rows)


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


def test_predict_explains_each_driver(client):
    preds = client.post("/predict", json=USGP).json()["predictions"]
    for p in preds:
        assert 0 < len(p["factors"]) <= 4
        assert all({"feature", "value", "effect"} <= f.keys() for f in p["factors"])
        magnitudes = [abs(f["effect"]) for f in p["factors"]]
        assert magnitudes == sorted(magnitudes, reverse=True)
    # Starting first is worth more than starting 15th, so the slot must push the win chance up.
    pole = client.post("/predict", json={**USGP, "entries": [{"driver_ref": "norris", "grid_position": 1}]}).json()
    grid = next(f for f in pole["predictions"][0]["factors"] if f["feature"] == "grid")
    assert grid["value"] == 1 and grid["effect"] > 0


def test_calibration_is_reported(client):
    cal = client.get("/health").json()["training"]["calibration"]
    assert cal["holdout_races"] > 0
    for target in (cal["win"], cal["podium"]):
        assert isinstance(target["applied"], bool) and target["bins"]
        assert all(0 <= b["predicted"] <= 1 and 0 <= b["observed"] <= 1 for b in target["bins"])


def test_driver_sheet(client):
    d = client.get("/drivers/norris").json()
    assert d["name"] == "Lando Norris" and d["wins"] >= d["season_wins"]
    assert 0 < len(d["recent"]) <= 10
    keys = [(r["season"], r["round"]) for r in d["recent"]]
    assert keys == sorted(keys, reverse=True)  # latest first
    assert any(r["model_win_probability"] is not None for r in d["recent"])
    assert client.get("/drivers/nobody").status_code == 404


def test_championship_odds(client, monkeypatch):
    from app.api import routes

    season = NEXT_SEASON
    left = [
        calendar.RaceOut(
            season=season, round=NEXT_ROUND + i, name=f"GP {i}", circuit_ref="americas", circuit_name="COTA", country="USA",
            start_utc=datetime.now(UTC) + timedelta(days=7 * (i + 1)), weather=None, forecast_from=datetime.now(UTC).date(),
        )
        for i in range(3)
    ]
    monkeypatch.setattr(routes, "upcoming_races", lambda after: left)
    body = client.get("/championship").json()
    assert body["remaining_races"] == 3 and body["season"] == season
    assert abs(sum(d["title_probability"] for d in body["drivers"]) - 1) < 1e-6
    odds = [d["title_probability"] for d in body["drivers"]]
    assert odds == sorted(odds, reverse=True)
    assert all(d["points_p10"] >= d["points"] and d["points_p90"] >= d["expected_points"] - 1e-6 for d in body["drivers"])

    monkeypatch.setattr(routes, "upcoming_races", lambda after: [])
    done = client.get("/championship").json()
    assert done["remaining_races"] == 0
    # With nothing left to race, the points leader is champion for sure.
    leader = max(done["drivers"], key=lambda d: d["points"])
    assert leader["title_probability"] == 1.0 and leader["expected_points"] == leader["points"]


def test_monitor(client, engine):
    client.post("/predict", json=USGP)  # logs predictions for a race that has no result yet
    body = client.get("/monitor").json()
    assert body["status"] in {"ok", "watch"}
    assert len(body["series"]) == len(client.get("/review").json()["races"])
    assert body["live_available"] and body["live"] == []  # the logged race has not been scored
    assert all(0 <= s["brier"] <= 1 for s in body["series"])
