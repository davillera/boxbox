# BoxBox

Monorepo full-stack ML para predecir resultados de carreras de Fórmula 1.

| Carpeta        | Stack                                              |
| -------------- | -------------------------------------------------- |
| `ml_pipeline/` | Python, FastF1, Pandas, scikit-learn, XGBoost      |
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
