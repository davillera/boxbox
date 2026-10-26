// Types mirror backend/app/schemas.py.

export type RaceWeather = {
  air_temp_c: number;
  humidity_pct: number;
  wind_speed_ms: number;
  precipitation_mm: number;
  rainfall: boolean;
};

export type Race = {
  season: number;
  round: number;
  name: string;
  circuit_ref: string;
  circuit_name: string;
  country: string | null;
  start_utc: string;
  /** Open-Meteo forecast for the race start; null until it is in range. */
  weather: RaceWeather | null;
  forecast_from: string;
};

type ReviewEntry = {
  driver_ref: string;
  code: string | null;
  grid: number;
  win_probability: number;
};

export type ReviewRace = {
  season: number;
  round: number;
  name: string;
  circuit_ref: string;
  winner: ReviewEntry;
  pick: ReviewEntry;
  /** Where the model ranked the actual winner (1 = favourite). */
  winner_rank: number;
  podium_hits: number;
  pole_won: boolean;
};

export type Review = { races: ReviewRace[] };

export type FieldEntry = EntryPrediction & {
  team_ref: string;
  finish: number | null;
  /** Digits when classified; R, D, W... otherwise. */
  status: string;
};

export type RaceComparison = ReviewRace & { field: FieldEntry[] };

export type Driver = {
  driver_ref: string;
  code: string | null;
  first_name: string;
  last_name: string;
  team_ref: string;
  team_name: string;
  last_grid: number;
};

export type Weather = {
  air_temp_c: number | null;
  humidity_pct: number | null;
  wind_speed_ms: number | null;
  rainfall: boolean;
};

export type PredictRequest = {
  circuit_ref: string;
  season: number;
  round: number;
  weather: Weather;
  entries: { driver_ref: string; grid_position: number }[];
  normalize: boolean;
};

export type EntryPrediction = {
  driver_ref: string;
  driver_code: string | null;
  driver_name: string;
  team_name: string | null;
  grid_position: number;
  win_probability: number;
  podium_probability: number;
};

export type ModelInfo = {
  name: string;
  version: string;
  trained_at: string;
  data_to: string;
};

export type PredictResponse = {
  model: ModelInfo;
  circuit_ref: string;
  normalized: boolean;
  predictions: EntryPrediction[];
};

type BacktestMetrics = {
  log_loss: number;
  win_auc: number;
  winner_pick_accuracy: number;
  podium_top3_precision: number;
  races: number;
};

export type Health = {
  status: string;
  model: ModelInfo;
  backtest: { model: BacktestMetrics; baseline_grid_only: BacktestMetrics };
  training: {
    rows: number;
    races: number;
    data_from: string;
    data_to: string;
    n_trees: number;
    /** XGBoost gain share per feature. */
    feature_importance: Record<string, number>;
  };
};

export const API_URL = process.env.BOXBOX_API_URL ?? "http://localhost:8000";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`GET ${path} -> ${res.status}`);
  return res.json();
}

export async function getCatalog() {
  const [health, drivers, races, review] = await Promise.all([
    get<Health>("/health"),
    get<Driver[]>("/drivers"),
    get<Race[]>("/races/upcoming"),
    get<Review>("/review"),
  ]);
  return { health, drivers, races, review };
}

export const getReview = () => get<Review>("/review");

export const getHealth = () => get<Health>("/health");

export const getRaceComparison = (season: number, round: number) =>
  get<RaceComparison>(`/review/${season}/${round}`);
