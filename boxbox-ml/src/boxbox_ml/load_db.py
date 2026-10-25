"""Upsert extracted entries into Neon (circuit, driver, race_data).

    uv run python -m boxbox_ml.load_db

The schema is owned by the backend (SQLModel); tables are reflected here, not
redefined. Reads DATABASE_URL from the environment, boxbox-ml/.env or
backend/.env. Safe to re-run: every write is an upsert on the natural keys.
"""

import logging
import os
from pathlib import Path

import pandas as pd
from dotenv import load_dotenv
from sqlalchemy import MetaData, create_engine, select
from sqlalchemy.dialects.postgresql import insert

from boxbox_ml.config import ENTRIES_PATH, ML_ROOT

log = logging.getLogger("boxbox_ml.load_db")
CHUNK = 1000


def database_url() -> str:
    for env_file in (ML_ROOT / ".env", ML_ROOT.parent / "backend" / ".env"):
        load_dotenv(env_file, override=False)
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise SystemExit("DATABASE_URL is not set (env, boxbox-ml/.env or backend/.env)")
    return "postgresql+psycopg://" + url.split("://", 1)[1]


def _records(df: pd.DataFrame) -> list[dict]:
    """pandas -> plain Python values (psycopg does not adapt numpy scalars or NA)."""
    return df.astype(object).where(df.notna(), None).to_dict("records")


def _upsert(conn, table, df: pd.DataFrame, conflict: dict) -> None:
    rows = _records(df)
    for i in range(0, len(rows), CHUNK):
        stmt = insert(table).values(rows[i : i + CHUNK])
        update = {c: stmt.excluded[c] for c in df.columns if c not in conflict.get("index_elements", [])}
        conn.execute(stmt.on_conflict_do_update(**conflict, set_=update))


def load(entries_path: Path = ENTRIES_PATH) -> None:
    entries = pd.read_parquet(entries_path).sort_values(["season", "round"])
    engine = create_engine(database_url(), pool_pre_ping=True, connect_args={"prepare_threshold": None})
    meta = MetaData()
    meta.reflect(engine, only=["circuit", "driver", "race_data"])
    circuit_t, driver_t, race_t = (meta.tables[t] for t in ("circuit", "driver", "race_data"))

    circuits = (
        entries.drop_duplicates("circuit_ref", keep="last")[
            ["circuit_ref", "circuit_name", "locality", "country", "latitude", "longitude"]
        ]
        .rename(columns={"circuit_name": "name"})
    )
    drivers = entries.drop_duplicates("driver_ref", keep="last")[
        ["driver_ref", "driver_code", "permanent_number", "first_name", "last_name", "nationality", "date_of_birth"]
    ].rename(columns={"driver_code": "code"})

    with engine.begin() as conn:
        _upsert(conn, circuit_t, circuits, {"index_elements": ["circuit_ref"]})
        _upsert(conn, driver_t, drivers, {"index_elements": ["driver_ref"]})
        circuit_ids = dict(conn.execute(select(circuit_t.c.circuit_ref, circuit_t.c.id)).all())
        driver_ids = dict(conn.execute(select(driver_t.c.driver_ref, driver_t.c.id)).all())

        race = entries.assign(
            circuit_id=entries["circuit_ref"].map(circuit_ids),
            driver_id=entries["driver_ref"].map(driver_ids),
        )[
            [
                "season", "round", "event_name", "race_date", "circuit_id", "driver_id", "team_name",
                "quali_position", "grid_position", "finish_position", "status", "points", "laps_completed",
                "best_lap_time_s", "air_temp_c", "humidity_pct", "pressure_mbar", "wind_speed_ms", "rainfall",
            ]
        ]  # fmt: skip
        _upsert(conn, race_t, race, {"constraint": "uq_race_data_season_round_driver"})

    log.info("upserted %d circuits, %d drivers, %d race entries", len(circuits), len(drivers), len(race))


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    load()


if __name__ == "__main__":
    main()
