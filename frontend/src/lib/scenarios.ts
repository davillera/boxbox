/**
 * Pure transformations and delta calculations for What-If / Chaos Mode race scenarios.
 */

export type ChaosPreset =
  | "rain"
  | "polePenalty"
  | "reverseTop10"
  | "heatwave"
  | null;

export interface ScenarioWeather {
  air_temp_c: number | null;
  humidity_pct: number | null;
  wind_speed_ms: number | null;
  rainfall: boolean;
}

export interface DriverDelta {
  driver_ref: string;
  delta_win: number;
  delta_podium: number;
}

export interface ScenarioDeltas {
  deltas: Map<string, DriverDelta>;
  topRiserRef: string | null;
  topFallerRef: string | null;
}

/**
 * Move the pole-sitter (position 0) back by penaltyPlaces (default 10).
 * Drivers from 1 to penaltyPlaces shift up by 1 position.
 */
export function applyPolePenalty<T>(grid: T[], penaltyPlaces = 10): T[] {
  if (grid.length === 0) return [];
  const next = [...grid];
  const targetIndex = Math.min(penaltyPlaces, next.length - 1);
  const [poleDriver] = next.splice(0, 1);
  next.splice(targetIndex, 0, poleDriver);
  return next;
}

/**
 * Reverse only the top N positions of the grid (default 10).
 */
export function invertTopN<T>(grid: T[], n = 10): T[] {
  if (grid.length === 0) return [];
  const topCount = Math.min(n, grid.length);
  const top = grid.slice(0, topCount).reverse();
  const rest = grid.slice(topCount);
  return [...top, ...rest];
}

/**
 * Get adjusted weather conditions for a chosen chaos preset.
 */
export function getScenarioWeather(
  preset: ChaosPreset,
  base: ScenarioWeather,
): ScenarioWeather {
  switch (preset) {
    case "rain":
      return {
        ...base,
        rainfall: true,
        air_temp_c: 16,
        humidity_pct: 90,
        wind_speed_ms: 8.5,
      };
    case "heatwave":
      return {
        ...base,
        rainfall: false,
        air_temp_c: 40,
        humidity_pct: 25,
        wind_speed_ms: 2.0,
      };
    default:
      return base;
  }
}

/**
 * Compute differences in win and podium probabilities between baseline and current scenario.
 */
export function computeDeltas(
  baseline: { driver_ref: string; p_win: number; p_podium: number }[],
  current: { driver_ref: string; p_win: number; p_podium: number }[],
): ScenarioDeltas {
  const baseMap = new Map(baseline.map((b) => [b.driver_ref, b]));
  const deltas = new Map<string, DriverDelta>();

  let maxGain = 0.005; // Ignore sub-0.5% floating fluctuations
  let maxDrop = -0.005;
  let topRiserRef: string | null = null;
  let topFallerRef: string | null = null;

  for (const entry of current) {
    const base = baseMap.get(entry.driver_ref);
    if (!base) continue;

    const delta_win = entry.p_win - base.p_win;
    const delta_podium = entry.p_podium - base.p_podium;

    deltas.set(entry.driver_ref, {
      driver_ref: entry.driver_ref,
      delta_win,
      delta_podium,
    });

    if (delta_win > maxGain) {
      maxGain = delta_win;
      topRiserRef = entry.driver_ref;
    }
    if (delta_win < maxDrop) {
      maxDrop = delta_win;
      topFallerRef = entry.driver_ref;
    }
  }

  return { deltas, topRiserRef, topFallerRef };
}
