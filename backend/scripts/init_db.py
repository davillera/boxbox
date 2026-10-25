"""Create the schema on Neon.

    python -m scripts.init_db            # check connection + create missing tables
    python -m scripts.init_db --dry-run  # print the PostgreSQL DDL, no connection needed
"""

import argparse

from sqlalchemy import text
from sqlalchemy.dialects import postgresql
from sqlalchemy.schema import CreateIndex, CreateTable
from sqlmodel import SQLModel

import app.models  # noqa: F401  (registers tables)


def print_ddl() -> None:
    dialect = postgresql.dialect()
    for table in SQLModel.metadata.sorted_tables:
        print(str(CreateTable(table).compile(dialect=dialect)).strip() + ";\n")
        for index in sorted(table.indexes, key=lambda i: i.name or ""):
            print(str(CreateIndex(index).compile(dialect=dialect)) + ";")
        print()


def create_schema() -> None:
    from app.core.config import get_settings
    from app.db.session import build_engine

    # DDL goes through the direct (unpooled) endpoint.
    engine = build_engine(get_settings().migration_url)
    with engine.connect() as conn:
        version = conn.execute(text("select version()")).scalar_one()
        print(f"Connected: {version}")
    SQLModel.metadata.create_all(engine)
    print("Tables:", ", ".join(t.name for t in SQLModel.metadata.sorted_tables))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    print_ddl() if args.dry_run else create_schema()
