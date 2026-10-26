import type { ReviewRace } from "./api.ts";

export const called = (r: ReviewRace) =>
  r.pick.driver_ref === r.winner.driver_ref;

export const driverCode = (e: ReviewRace["winner"]) => e.code ?? e.driver_ref;

/** "2026-18": the `?race=` value on the track-record page. */
export const reviewKey = (r: Pick<ReviewRace, "season" | "round">) =>
  `${r.season}-${r.round}`;

/** Per-season tallies, newest season first. */
export function seasonStats(races: ReviewRace[]) {
  const bySeason = Map.groupBy(races, (r) => r.season);
  return [...bySeason]
    .sort(([a], [b]) => b - a)
    .map(([season, rs]) => ({
      season,
      races: rs.length,
      favourite: rs.filter(called).length,
      pole: rs.filter((r) => r.pole_won).length,
      podiumHits: rs.reduce((s, r) => s + r.podium_hits, 0) / (3 * rs.length),
      winnerRank: rs.reduce((s, r) => s + r.winner_rank, 0) / rs.length,
    }));
}
