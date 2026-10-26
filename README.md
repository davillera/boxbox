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

## Backend: API

```bash
cd boxbox-ml && uv run python -m boxbox_ml.train   # genera el modelo si no existe
cd ../backend
uv run uvicorn app.main:app --reload              # http://localhost:8000/docs
uv run pytest
```

### Después de cada Gran Premio

El modelo aprende de cada carrera al reentrenarse con su resultado:

```bash
cd boxbox-ml
uv run python -m boxbox_ml.extract --seasons 2026   # baja el nuevo resultado y su clima
uv run python -m boxbox_ml.load_db                   # lo sube a Neon
uv run python -m boxbox_ml.train                     # reentrena; la revisión carrera a carrera va en metrics.json
```

Luego reinicia la API para que cargue el modelo nuevo.

| Método | Ruta        | Descripción                                                       |
| ------ | ----------- | ----------------------------------------------------------------- |
| GET    | `/health`   | Estado, versión del modelo y métricas del backtest                |
| GET    | `/circuits` | Circuitos conocidos por el modelo                                 |
| GET    | `/drivers`  | Parrilla actual (participantes de la última carrera, con `last_grid`) |
| GET    | `/races/upcoming` | Próximos GP del calendario (Jolpica) con el pronóstico de Open-Meteo para la salida; `weather` es `null` hasta que la carrera entra en los 14 días del pronóstico. Caché de 1 h |
| GET    | `/review`   | Backtest carrera a carrera (3 últimas temporadas): favorito del modelo, entrenado solo con carreras anteriores, frente al ganador real |
| GET    | `/review/{season}/{round}` | Una carrera del backtest: la parrilla prevista completa junto a la posición final real |
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
  "season": 2026, "round": 19,
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

## Frontend: dashboard

Requiere Node 22+ y [pnpm](https://pnpm.io/). La API tiene que estar corriendo; el dashboard la llama desde el servidor (server action), así que no hace falta CORS.

```bash
cd frontend
pnpm install
cp .env.example .env.local   # BOXBOX_API_URL, por defecto http://localhost:8000
pnpm dev                     # http://localhost:3000 -> redirige a /es o /en
pnpm test                    # tests de parrilla e idioma (node --test)
pnpm lint && pnpm format:check
```

| Variable         | Uso                                                       |
| ---------------- | --------------------------------------------------------- |
| `BOXBOX_API_URL` | URL base de la API FastAPI (solo servidor).               |

Interfaz en español e inglés (`src/dictionaries/`), modo claro y oscuro, componentes en Atomic Design (`src/components/{atoms,molecules,organisms,templates}`).

## Despliegue

| Pieza    | Dónde  | URL                                    | Configuración |
| -------- | ------ | -------------------------------------- | ------------- |
| API      | Render (Docker, Virginia, plan free) | https://boxbox-api-4nx4.onrender.com | `backend/Dockerfile` con contexto en la raíz; variable `DATABASE_URL` (pooled de Neon) puesta a mano en el dashboard |
| Frontend | Vercel (raíz `frontend/`) | https://boxbox-azure.vercel.app | `BOXBOX_API_URL` = URL de la API en Render; install `npx -y pnpm@11.24.0 install --frozen-lockfile` y build `npx -y pnpm@11.24.0 run build` (Vercel solo lee `packageManager` en la raíz del repo); Node 24 |

Los dos se despliegan solos con cada push a `main`. El modelo (`boxbox-ml/artifacts/model.joblib`) va en el repo, así que reentrenar y hacer push publica el modelo nuevo. En el plan free de Render la API se duerme tras 15 min sin tráfico: la primera visita tarda ~1 min.
