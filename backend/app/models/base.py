from datetime import UTC, datetime

from sqlalchemy import DateTime, func
from sqlmodel import Field


def utcnow() -> datetime:
    return datetime.now(UTC)


def created_at_field() -> datetime:
    return Field(
        default_factory=utcnow,
        sa_type=DateTime(timezone=True),
        sa_column_kwargs={"server_default": func.now()},
        nullable=False,
    )
