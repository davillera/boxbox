# boxbox-ml

Extracción de datos, ingeniería de variables y modelo XGBoost de BoxBox.

```bash
uv sync                                  # runtime + grupos pipeline y dev
uv run python -m boxbox_ml.extract       # Jolpica + Open-Meteo -> data/race_entries.parquet
uv run python -m boxbox_ml.train         # -> artifacts/model.joblib + artifacts/metrics.json
uv run python -m boxbox_ml.load_db       # upsert en Neon (lee DATABASE_URL de backend/.env)
uv run pytest
```

## Fuentes

| Dato                                        | Fuente                                       |
| ------------------------------------------- | -------------------------------------------- |
| Resultados, parrilla, Q1–Q3, vuelta rápida  | Jolpica (sucesor de Ergast) vía `fastf1.ergast`, con la caché y el rate limiter de FastF1 |
| Clima en la ventana de carrera (2 h)        | Open-Meteo: ERA5 para el histórico, API de pronóstico para carreras de los últimos 7 días |

El live timing de FastF1 (vueltas, clima de pista y telemetría) exige desde la 3.9 una
suscripción de F1 TV, por eso no se usa. Caché en `cache/` (FastF1 y Open-Meteo).

## Modelo

- Una fila por piloto y carrera. Clasificador XGBoost multiclase (`gana` / `P2–P3` / `resto`),
  `tree_method="hist"` sobre CPU. P(podio) = P(gana) + P(P2–P3), así que nunca es menor que P(victoria).
- Variables (`features.py`), todas conocidas antes de la salida: parrilla, posición y gap de
  clasificación, clima, circuito (categórica), y forma previa del piloto y del equipo (medias móviles
  de las carreras **anteriores**: llegada, puntos, abandonos, posiciones ganadas, historial en el
  circuito y en mojado).
- En la inferencia, el escenario se añade como "próxima carrera" al histórico y pasa por el mismo
  `build_features`, así que entrenamiento y predicción calculan las variables igual (lo comprueba un test).
- Validación walk-forward carrera a carrera sobre las tres últimas temporadas: antes de cada GP se
  entrena solo con las carreras anteriores y se predice su parrilla completa, junto con un baseline que
  solo usa la parrilla. Las métricas y la predicción de cada carrera (`review`) van en `artifacts/metrics.json`.
- El reentreno después de cada GP lo hace `.github/workflows/retrain.yml` (ver el README de la raíz).

## Uso desde Python (backend)

```python
from boxbox_ml import RacePredictor, Scenario

predictor = RacePredictor.load("artifacts/model.joblib")
[p] = predictor.predict([Scenario(driver_ref="norris", circuit_ref="monza", grid_position=2, rainfall=False)])
p.win_probability, p.podium_probability
```

El paquete solo arrastra `pandas`, `xgboost-cpu`, `scikit-learn` y `joblib`. FastF1 y las
dependencias de BD están en el grupo local `pipeline`.
