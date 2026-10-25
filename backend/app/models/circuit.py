from datetime import datetime
from typing import TYPE_CHECKING

from sqlmodel import Field, Relationship, SQLModel

from app.models.base import created_at_field

if TYPE_CHECKING:
    from app.models.prediction_history import PredictionHistory
    from app.models.race_data import RaceData


class Circuit(SQLModel, table=True):
    __tablename__ = "circuit"

    id: int | None = Field(default=None, primary_key=True)
    # Stable slug shared by FastF1/Ergast (e.g. "monza", "silverstone").
    circuit_ref: str = Field(max_length=64, unique=True, index=True)
    name: str = Field(max_length=128)
    locality: str | None = Field(default=None, max_length=128)
    country: str = Field(max_length=64)
    latitude: float | None = None
    longitude: float | None = None
    length_km: float | None = Field(default=None, gt=0)
    created_at: datetime = created_at_field()

    race_entries: list["RaceData"] = Relationship(back_populates="circuit")
    predictions: list["PredictionHistory"] = Relationship(back_populates="circuit")
