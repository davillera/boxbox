from functools import lru_cache

from sqlalchemy import Engine
from sqlmodel import create_engine

from app.core.config import get_settings


def build_engine(url: str, *, echo: bool = False) -> Engine:
    return create_engine(
        url,
        echo=echo,
        # Neon suspends idle computes and drops idle connections: validate before use
        # and recycle well below the ~5 min idle window.
        pool_pre_ping=True,
        pool_recycle=300,
        pool_size=5,
        max_overflow=5,
        # Disable psycopg server-side prepared statements, which are unreliable
        # behind PgBouncer in transaction mode (Neon "-pooler" endpoint).
        connect_args={"prepare_threshold": None, "connect_timeout": 15},
    )


@lru_cache
def get_engine() -> Engine:
    settings = get_settings()
    return build_engine(settings.database_url, echo=settings.db_echo)
