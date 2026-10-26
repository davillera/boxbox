// Types mirror backend/app/schemas.py.

export type Circuit = {
  circuit_ref: string;
  name: string;
  country: string | null;
};

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
  const [health, circuits, drivers] = await Promise.all([
    get<Health>("/health"),
    get<Circuit[]>("/circuits"),
    get<Driver[]>("/drivers"),
  ]);
  return { health, circuits, drivers };
}
