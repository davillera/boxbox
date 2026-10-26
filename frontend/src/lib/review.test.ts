import assert from "node:assert/strict";
import { test } from "node:test";
import type { ReviewRace } from "./api.ts";
import { called, seasonStats } from "./review.ts";

const entry = (driver_ref: string) => ({
  driver_ref,
  code: null,
  grid: 1,
  win_probability: 0.5,
});

const race = (
  season: number,
  winner: string,
  pick: string,
  extra: Partial<ReviewRace> = {},
): ReviewRace => ({
  season,
  round: 1,
  name: "GP",
  circuit_ref: "x",
  winner: entry(winner),
  pick: entry(pick),
  winner_rank: winner === pick ? 1 : 3,
  podium_hits: 2,
  pole_won: false,
  ...extra,
});

test("seasonStats tallies each season, newest first", () => {
  const stats = seasonStats([
    race(2025, "a", "a", { pole_won: true }),
    race(2026, "a", "b", { podium_hits: 3 }),
    race(2026, "c", "c"),
  ]);
  assert.deepEqual(
    stats.map((s) => [s.season, s.races, s.favourite, s.pole]),
    [
      [2026, 2, 1, 0],
      [2025, 1, 1, 1],
    ],
  );
  assert.equal(stats[0].podiumHits, 5 / 6);
  assert.equal(stats[0].winnerRank, 2);
  assert.equal(called(race(2026, "a", "b")), false);
});
