// Types mirror backend/app/schemas.py.

export type RaceWeather = {
  air_temp_c: number;
  humidity_pct: number;
  wind_speed_ms: number;
  precipitation_mm: number;
  rainfall: boolean;
};

export type QualifyingEntry = {
  driver_ref: string;
  position: number;
  /** % off the pole time. */
  gap_pct: number | null;
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
  /** Qualifying classification once published, best first. */
  qualifying: QualifyingEntry[] | null;
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
  entries: {
    driver_ref: string;
    grid_position: number;
    quali_gap_pct?: number;
  }[];
  normalize: boolean;
};

/** One feature's TreeSHAP push on a win chance, in log-odds (> 0 helps). */
export type Factor = {
  feature: string;
  value: number | string | null;
  effect: number;
};

export type EntryPrediction = {
  driver_ref: string;
  driver_code: string | null;
  driver_name: string;
  team_name: string | null;
  grid_position: number;
  win_probability: number;
  podium_probability: number;
  factors?: Factor[];
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
    calibration: Calibration | null;
  };
};

export type CalibrationTarget = {
  /** Kept only if it beat the raw probabilities on held-out races. */
  applied: boolean;
  brier_raw: number;
  brier_calibrated: number;
  bins: { predicted: number; observed: number; n: number }[];
};

export type Calibration = {
  holdout_races: number;
  win: CalibrationTarget;
  podium: CalibrationTarget;
};

export type ChampionDriver = {
  driver_ref: string;
  code: string | null;
  driver_name: string;
  team_name: string;
  points: number;
  title_probability: number;
  expected_points: number;
  points_p10: number;
  points_p90: number;
};

export type Championship = {
  season: number;
  remaining_races: number;
  simulations: number;
  drivers: ChampionDriver[];
};

export type FormRace = {
  season: number;
  round: number;
  name: string;
  circuit_ref: string;
  grid: number;
  finish: number | null;
  status: string;
  points: number;
  model_win_probability: number | null;
};

export type DriverDetail = {
  driver_ref: string;
  code: string | null;
  name: string;
  team_ref: string;
  team_name: string;
  season: number;
  season_points: number;
  season_wins: number;
  season_podiums: number;
  races: number;
  wins: number;
  podiums: number;
  recent: FormRace[];
  circuits: {
    circuit_ref: string;
    circuit_name: string;
    races: number;
    avg_finish: number;
    best_finish: number;
  }[];
};

export type Monitor = {
  status: "ok" | "watch" | "no_data";
  recent_brier: number;
  overall_brier: number;
  window: number;
  series: {
    season: number;
    round: number;
    name: string;
    brier: number;
    winner_probability: number;
  }[];
  live: {
    season: number;
    round: number;
    name: string;
    predictions: number;
    brier: number;
    favourite_won: boolean;
    winner_probability: number | null;
  }[];
  live_available: boolean;
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

export const getDrivers = () => get<Driver[]>("/drivers");

export const getChampionship = () => get<Championship>("/championship");

export const getDriverDetail = (ref: string) =>
  get<DriverDetail>(`/drivers/${encodeURIComponent(ref)}`);

export const getMonitor = () => get<Monitor>("/monitor");
