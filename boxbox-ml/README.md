# boxbox-ml

Data extraction, feature engineering and the XGBoost model behind BoxBox.

```bash
uv sync                                  # runtime + the pipeline and dev groups
uv run python -m boxbox_ml.extract       # Jolpica + Open-Meteo -> data/race_entries.parquet
uv run python -m boxbox_ml.train         # -> artifacts/model.joblib + artifacts/metrics.json
uv run python -m boxbox_ml.load_db       # upsert into Neon (reads DATABASE_URL from backend/.env)
uv run pytest
```

## Sources

| Data                                         | Source                                       |
| -------------------------------------------- | -------------------------------------------- |
| Results, grid, Q1–Q3, fastest lap            | Jolpica (the Ergast successor) through `fastf1.ergast`, with FastF1's cache and rate limiter |
| Weather over the race window (2 h)           | Open-Meteo: ERA5 for history, the forecast API for races in the last 7 days |

Since 3.9, FastF1's live timing (laps, track weather and telemetry) requires an F1 TV
subscription, so it isn't used. Caches live in `cache/` (FastF1 and Open-Meteo).

## Model

- One row per driver per race. A multiclass XGBoost classifier (`win` / `P2–P3` / `rest`),
  `tree_method="hist"` on CPU. P(podium) = P(win) + P(P2–P3), so it is never lower than P(win).
- Features (`features.py`), all known before lights out: grid, qualifying position and gap,
  weather, circuit (categorical), and prior form of driver and team (rolling means over **earlier**
  races: finish, points, retirements, places gained, record at the circuit and in the wet).
- At inference the scenario is appended to the history as the "next race" and goes through the same
  `build_features`, so training and prediction compute features identically (a test checks this).
- Race-by-race walk-forward validation over the last three seasons: before each GP the model is trained
  on earlier races only and predicts the whole field, alongside a baseline that only uses the grid.
  Metrics and each race's prediction (`review`) are written to `artifacts/metrics.json`.
- Retraining after every GP is done by `.github/workflows/retrain.yml` (see the root README).

## Using it from Python (backend)

```python
from boxbox_ml import RacePredictor, Scenario

predictor = RacePredictor.load("artifacts/model.joblib")
[p] = predictor.predict([Scenario(driver_ref="norris", circuit_ref="monza", grid_position=2, rainfall=False)])
p.win_probability, p.podium_probability
```

The package only pulls in `pandas`, `xgboost-cpu`, `scikit-learn` and `joblib`. FastF1 and the
database dependencies live in the local `pipeline` group.
