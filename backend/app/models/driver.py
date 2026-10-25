from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlmodel import Field, Relationship, SQLModel

from app.models.base import created_at_field

if TYPE_CHECKING:
    from app.models.prediction_history import PredictionHistory
    from app.models.race_data import RaceData


class Driver(SQLModel, table=True):
    __tablename__ = "driver"

    id: int | None = Field(default=None, primary_key=True)
    # Ergast/FastF1 driverId (e.g. "max_verstappen"); 3-letter codes get reused across eras.
    driver_ref: str = Field(max_length=64, unique=True, index=True)
    code: str | None = Field(default=None, max_length=3, index=True)
    permanent_number: int | None = Field(default=None, ge=1, le=99)
    first_name: str = Field(max_length=64)
    last_name: str = Field(max_length=64)
    nationality: str | None = Field(default=None, max_length=64)
    date_of_birth: date | None = None
    created_at: datetime = created_at_field()

    race_entries: list["RaceData"] = Relationship(back_populates="driver")
    predictions: list["PredictionHistory"] = Relationship(back_populates="driver")
