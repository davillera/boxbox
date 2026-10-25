from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, Index
from sqlmodel import Field, Relationship, SQLModel

from app.models.base import created_at_field

if TYPE_CHECKING:
    from app.models.circuit import Circuit
    from app.models.driver import Driver


class PredictionHistory(SQLModel, table=True):
    """Audit log of every /predict call: inputs, model version and output.

    `actual_finish_position` is back-filled after the race to measure live accuracy.
    """

    __tablename__ = "prediction_history"
    __table_args__ = (
        Index("ix_prediction_history_driver_created", "driver_id", "created_at"),
        CheckConstraint("win_probability BETWEEN 0 AND 1", name="ck_prediction_win_prob"),
        CheckConstraint("podium_probability BETWEEN 0 AND 1", name="ck_prediction_podium_prob"),
        CheckConstraint(
            "podium_probability >= win_probability", name="ck_prediction_podium_ge_win"
        ),
    )

    id: int | None = Field(default=None, primary_key=True)
    created_at: datetime = created_at_field()

    # Target event (season/round optional: hypothetical scenarios are allowed)
    circuit_id: int = Field(foreign_key="circuit.id", index=True, ondelete="RESTRICT")
    # Indexed via ix_prediction_history_driver_created (leading column).
    driver_id: int = Field(foreign_key="driver.id", ondelete="RESTRICT")
    season: int | None = Field(default=None, ge=1950)
    round: int | None = Field(default=None, ge=1)

    # Input features as sent by the client
    grid_position: int = Field(ge=0)
    air_temp_c: float | None = None
    track_temp_c: float | None = None
    humidity_pct: float | None = Field(default=None, ge=0, le=100)
    rainfall: bool = False

    # Model output
    model_name: str = Field(max_length=64)
    model_version: str = Field(max_length=64)
    win_probability: float = Field(ge=0, le=1)
    podium_probability: float = Field(ge=0, le=1)

    # Ground truth, filled in post-race
    actual_finish_position: int | None = Field(default=None, ge=1)

    circuit: "Circuit" = Relationship(back_populates="predictions")
    driver: "Driver" = Relationship(back_populates="predictions")
