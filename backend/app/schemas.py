from datetime import date, datetime
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
    last_grid: int = Field(description="Grid slot at the last trained race; 0 = pit-lane start")


class BacktestMetrics(BaseModel):
    log_loss: float
    win_auc: float
    winner_pick_accuracy: float
    podium_top3_precision: float
    races: int


class Backtest(BaseModel):
    model: BacktestMetrics
    baseline_grid_only: BacktestMetrics


class RaceWeather(BaseModel):
    air_temp_c: float
    humidity_pct: float
    wind_speed_ms: float
    precipitation_mm: float
    rainfall: bool


class RaceOut(BaseModel):
    season: int
    round: int
    name: str
    circuit_ref: str
    circuit_name: str
    country: str | None
    start_utc: datetime
    weather: RaceWeather | None = Field(description="Open-Meteo forecast for the first two hours; null until in range")
    forecast_from: date = Field(description="First day the forecast covers the race start")


class ReviewEntry(BaseModel):
    driver_ref: str
    code: str | None
    grid: int
    win_probability: float


class ReviewRace(BaseModel):
    season: int
    round: int
    name: str
    circuit_ref: str
    winner: ReviewEntry
    pick: ReviewEntry = Field(description="The model's favourite, trained only on earlier races")
    winner_rank: int = Field(description="Where the model ranked the actual winner (1 = favourite)")
    podium_hits: int = Field(description="How many of the model's top 3 finished on the podium")
    pole_won: bool


class ReviewOut(BaseModel):
    races: list[ReviewRace]  # chronological, the latest season(s) of the backtest


class FieldEntry(EntryPrediction):
    team_ref: str
    finish: int | None
    status: str = Field(description="Finishing position as text; letters (R, D, W...) when not classified")


class RaceComparison(ReviewRace):
    field: list[FieldEntry]  # sorted by predicted win probability


class TrainingInfo(BaseModel):
    rows: int = Field(description="Driver-race rows the final model was fit on")
    races: int
    data_from: str
    data_to: str
    n_trees: int
    feature_importance: dict[str, float] = Field(description="XGBoost gain share per feature, highest first")


class HealthOut(BaseModel):
    status: str
    model: ModelInfo
    backtest: Backtest
    training: TrainingInfo
