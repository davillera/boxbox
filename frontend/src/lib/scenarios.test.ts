import assert from "node:assert/strict";
import { test } from "node:test";
import {
  applyPolePenalty,
  computeDeltas,
  getScenarioWeather,
  invertTopN,
  type ScenarioWeather,
} from "./scenarios.ts";

test("applyPolePenalty moves the pole-sitter to P11 (index 10) and shifts P2-P11 up", () => {
  const drivers = Array.from({ length: 20 }, (_, i) => `D${i + 1}`);
  const result = applyPolePenalty(drivers, 10);
  assert.equal(result[10], "D1");
  assert.equal(result[0], "D2");
  assert.equal(result[9], "D11");
  assert.equal(result[11], "D12");
});

test("invertTopN reverses only the first N items in the grid", () => {
  const drivers = Array.from({ length: 20 }, (_, i) => `D${i + 1}`);
  const result = invertTopN(drivers, 10);
  assert.equal(result[0], "D10");
  assert.equal(result[9], "D1");
  assert.equal(result[10], "D11");
  assert.equal(result[19], "D20");
});

test("getScenarioWeather returns correct conditions for rain and heatwave", () => {
  const baseWeather: ScenarioWeather = {
    air_temp_c: 24,
    humidity_pct: 50,
    wind_speed_ms: 3.5,
    rainfall: false,
  };

  const rain = getScenarioWeather("rain", baseWeather);
  assert.equal(rain.rainfall, true);
  assert.equal(rain.air_temp_c, 16);
  assert.equal(rain.humidity_pct, 90);

  const heatwave = getScenarioWeather("heatwave", baseWeather);
  assert.equal(heatwave.rainfall, false);
  assert.equal(heatwave.air_temp_c, 40);
  assert.equal(heatwave.humidity_pct, 25);

  const unmodified = getScenarioWeather(null, baseWeather);
  assert.deepEqual(unmodified, baseWeather);
});

test("computeDeltas computes accurate probability deltas and spots top riser and faller", () => {
  const baseline = [
    { driver_ref: "norris", p_win: 0.35, p_podium: 0.75 },
    { driver_ref: "verstappen", p_win: 0.40, p_podium: 0.80 },
    { driver_ref: "leclerc", p_win: 0.15, p_podium: 0.50 },
  ];

  const current = [
    { driver_ref: "norris", p_win: 0.50, p_podium: 0.85 }, // +0.15 win -> top riser
    { driver_ref: "verstappen", p_win: 0.20, p_podium: 0.60 }, // -0.20 win -> top faller
    { driver_ref: "leclerc", p_win: 0.18, p_podium: 0.55 }, // +0.03 win
  ];

  const { deltas, topRiserRef, topFallerRef } = computeDeltas(baseline, current);

  const norrisDelta = deltas.get("norris");
  assert.ok(norrisDelta);
  assert.ok(Math.abs(norrisDelta.delta_win - 0.15) < 0.0001);
  assert.ok(Math.abs(norrisDelta.delta_podium - 0.10) < 0.0001);

  const maxDelta = deltas.get("verstappen");
  assert.ok(maxDelta);
  assert.ok(Math.abs(maxDelta.delta_win - (-0.20)) < 0.0001);

  assert.equal(topRiserRef, "norris");
  assert.equal(topFallerRef, "verstappen");
});
