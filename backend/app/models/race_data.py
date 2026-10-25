from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, Index, UniqueConstraint
from sqlmodel import Field, Relationship, SQLModel

from app.models.base import created_at_field

if TYPE_CHECKING:
    from app.models.circuit import Circuit
    from app.models.driver import Driver


class RaceData(SQLModel, table=True):
    """One row per driver per race: the grain the model trains on.

    Weather is race-level and repeats across the ~20 rows of a race; that keeps
    the training extract a single-table read.
    """

    __tablename__ = "race_data"
    __table_args__ = (
        UniqueConstraint("season", "round", "driver_id", name="uq_race_data_season_round_driver"),
        Index("ix_race_data_circuit_season", "circuit_id", "season"),
        CheckConstraint("grid_position >= 0", name="ck_race_data_grid_position"),
        CheckConstraint("finish_position >= 1", name="ck_race_data_finish_position"),
        CheckConstraint("humidity_pct BETWEEN 0 AND 100", name="ck_race_data_humidity"),
    )

    id: int | None = Field(default=None, primary_key=True)

    # Event
    season: int = Field(ge=1950, index=True)
    round: int = Field(ge=1)
    event_name: str = Field(max_length=128)
    race_date: date
    # Indexed via ix_race_data_circuit_season (leading column).
    circuit_id: int = Field(foreign_key="circuit.id", ondelete="RESTRICT")

    # Entry
    driver_id: int = Field(foreign_key="driver.id", index=True, ondelete="RESTRICT")
    team_name: str = Field(max_length=128)
    quali_position: int | None = Field(default=None, ge=1)
    grid_position: int | None = None  # 0 = pit-lane start (FastF1 convention)

    # Outcome (target variables); NULL until the race is run
    finish_position: int | None = None
    status: str | None = Field(default=None, max_length=64)  # "Finished", "+1 Lap", "Collision"...
    points: float | None = Field(default=None, ge=0)
    laps_completed: int | None = Field(default=None, ge=0)

    # Pace aggregates from FastF1 laps (seconds)
    best_lap_time_s: float | None = Field(default=None, gt=0)
    median_lap_time_s: float | None = Field(default=None, gt=0)

    # Weather (session averages from FastF1 weather_data)
    air_temp_c: float | None = None
    track_temp_c: float | None = None
    humidity_pct: float | None = None
    pressure_mbar: float | None = Field(default=None, gt=0)
    wind_speed_ms: float | None = Field(default=None, ge=0)
    rainfall: bool = False

    created_at: datetime = created_at_field()

    circuit: "Circuit" = Relationship(back_populates="race_entries")
    driver: "Driver" = Relationship(back_populates="race_entries")
