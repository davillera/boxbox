"""Importing this package registers every table on SQLModel.metadata."""

from app.models.circuit import Circuit
from app.models.driver import Driver
from app.models.prediction_history import PredictionHistory
from app.models.race_data import RaceData

__all__ = ["Circuit", "Driver", "PredictionHistory", "RaceData"]
