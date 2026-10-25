# BoxBox

Monorepo full-stack ML para predecir resultados de carreras de Fórmula 1.

| Carpeta        | Stack                                              |
| -------------- | -------------------------------------------------- |
| `boxbox-ml/` | Python, FastF1/Jolpica, Open-Meteo, Pandas, XGBoost (ver su README) |
| `backend/`     | FastAPI, SQLModel, PostgreSQL (Neon), Docker       |
| `frontend/`    | Next.js (App Router), TypeScript, Tailwind CSS     |

## Backend: base de datos

Requiere [uv](https://docs.astral.sh/uv/).

```bash
cd backend
uv sync
cp .env.example .env                       # rellenar con las URLs de Neon
uv run python -m scripts.init_db --dry-run # ver el DDL sin conectarse
uv run python -m scripts.init_db           # crear las tablas en Neon
```

### Variables de entorno (`backend/.env`)

| Variable                | Uso                                                        |
| ----------------------- | ---------------------------------------------------------- |
| `DATABASE_URL`          | Conexión **pooled** de Neon (host con `-pooler`). Runtime. |
| `DATABASE_URL_UNPOOLED` | Conexión **directa** (sin `-pooler`). DDL / migraciones.   |
| `DB_ECHO`               | `true` para loguear el SQL (opcional).                     |
| `MODEL_PATH`            | Bundle del modelo (por defecto `../boxbox-ml/artifacts/model.joblib`). |
| `CORS_ORIGINS`          | Orígenes permitidos, separados por comas (por defecto `http://localhost:3000`). |

## Backend: API

```bash
cd boxbox-ml && uv run python -m boxbox_ml.train   # genera el modelo si no existe
cd ../backend
uv run uvicorn app.main:app --reload              # http://localhost:8000/docs
uv run pytest
```

| Método | Ruta        | Descripción                                                       |
| ------ | ----------- | ----------------------------------------------------------------- |
| GET    | `/health`   | Estado y versión del modelo cargado                               |
| GET    | `/circuits` | Circuitos conocidos por el modelo                                 |
| GET    | `/drivers`  | Parrilla actual (participantes de la última carrera)              |
| POST   | `/predict`  | Probabilidad de victoria y podio por piloto; queda registrada en `prediction_history` |

```json
POST /predict
{
  "circuit_ref": "americas",
  "weather": { "air_temp_c": 27, "humidity_pct": 50, "wind_speed_ms": 2.5, "rainfall": false },
  "entries": [
    { "driver_ref": "norris", "grid_position": 1 },
    { "driver_ref": "max_verstappen", "grid_position": 2, "quali_gap_pct": 0.08 }
  ],
  "season": 2026, "round": 18,
  "normalize": false
}
```

`normalize: true` (con la parrilla completa) reescala para que las victorias sumen 1 y los podios 3.

### Docker

Se construye desde la raíz porque el backend depende de `boxbox-ml/`, y necesita el modelo ya entrenado:

```bash
docker build -f backend/Dockerfile -t boxbox-api .
docker run --env-file backend/.env -p 8000:8000 boxbox-api
```
