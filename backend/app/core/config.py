from functools import lru_cache
from pathlib import Path

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]


def _to_psycopg_url(url: str) -> str:
    """Neon hands out `postgresql://` URLs; SQLAlchemy needs the psycopg (v3) driver prefix."""
    for prefix in ("postgresql+psycopg://", "postgresql://", "postgres://"):
        if url.startswith(prefix):
            return "postgresql+psycopg://" + url[len(prefix) :]
    raise ValueError("DATABASE_URL must be a PostgreSQL connection string")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env", env_file_encoding="utf-8", extra="ignore"
    )

    # Pooled endpoint (PgBouncer) for request traffic.
    database_url: str = Field(alias="DATABASE_URL")
    # Direct endpoint for DDL/migrations; falls back to the pooled one.
    database_url_unpooled: str | None = Field(default=None, alias="DATABASE_URL_UNPOOLED")
    db_echo: bool = Field(default=False, alias="DB_ECHO")

    # Bundle produced by `boxbox_ml.train`.
    model_path: Path = Field(
        default=BACKEND_DIR.parent / "boxbox-ml" / "artifacts" / "model.joblib", alias="MODEL_PATH"
    )
    # Comma-separated list of allowed browser origins (the Next.js frontend).
    cors_origins: str = Field(default="http://localhost:3000", alias="CORS_ORIGINS")

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @field_validator("database_url", "database_url_unpooled")
    @classmethod
    def _normalize_driver(cls, v: str | None) -> str | None:
        return _to_psycopg_url(v) if v else v

    @property
    def migration_url(self) -> str:
        return self.database_url_unpooled or self.database_url


@lru_cache
def get_settings() -> Settings:
    return Settings()
