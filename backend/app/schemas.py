from typing import Self

from pydantic import BaseModel, Field, model_validator


class Weather(BaseModel):
    air_temp_c: float | None = Field(default=None, ge=-10, le=60)
    humidity_pct: float | None = Field(default=None, ge=0, le=100)
    wind_speed_ms: float | None = Field(default=None, ge=0, le=40)
    rainfall: bool = False


class EntryIn(BaseModel):
    driver_ref: str = Field(min_length=1, max_length=64, examples=["norris"])
    grid_position: int = Field(ge=0, le=30, description="0 = pit-lane start")
    quali_position: int | None = Field(default=None, ge=1, le=30, description="Defaults to grid_position")
    quali_gap_pct: float | None = Field(default=None, ge=0, le=20, description="% off pole time, if known")


class PredictRequest(BaseModel):
    circuit_ref: str = Field(min_length=1, max_length=64, examples=["americas"])
    weather: Weather = Weather()
    entries: list[EntryIn] = Field(min_length=1, max_length=30)
    season: int | None = Field(default=None, ge=1950)
    round: int | None = Field(default=None, ge=1)
    normalize: bool = Field(
        default=False,
        description="Rescale across entries so win probabilities sum to 1 (and podium to 3). "
        "Only meaningful when the request holds the whole grid.",
    )

    @model_validator(mode="after")
    def _unique_drivers(self) -> Self:
        refs = [e.driver_ref for e in self.entries]
        if len(refs) != len(set(refs)):
            raise ValueError("each driver may appear only once in entries")
        return self


class EntryPrediction(BaseModel):
    driver_ref: str
    driver_code: str | None
    driver_name: str
    team_name: str | None
    grid_position: int
    win_probability: float
    podium_probability: float


class ModelInfo(BaseModel):
    name: str
    version: str
    trained_at: str
    data_to: str


class PredictResponse(BaseModel):
    model: ModelInfo
    circuit_ref: str
    normalized: bool
    predictions: list[EntryPrediction]  # sorted by win probability, highest first


class CircuitOut(BaseModel):
    circuit_ref: str
    name: str
    country: str | None


class DriverOut(BaseModel):
    driver_ref: str
    code: str | None
    first_name: str
    last_name: str
    team_ref: str
    team_name: str


class HealthOut(BaseModel):
    status: str
    model: ModelInfo
