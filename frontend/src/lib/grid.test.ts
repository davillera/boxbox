import assert from "node:assert/strict";
import { test } from "node:test";
import type { Driver } from "./api.ts";
import { lastRaceOrder, move, swap } from "./grid.ts";

test("move inserts at the target and shifts the rest", () => {
  assert.deepEqual(move(["a", "b", "c", "d"], 3, 0), ["d", "a", "b", "c"]);
  assert.deepEqual(move(["a", "b", "c", "d"], 0, 3), ["b", "c", "d", "a"]);
});

test("swap exchanges two slots and leaves the input untouched", () => {
  const grid = ["a", "b", "c"];
  assert.deepEqual(swap(grid, 0, 2), ["c", "b", "a"]);
  assert.deepEqual(grid, ["a", "b", "c"]);
});

test("pit-lane starters go to the back of the last-race order", () => {
  const d = (driver_ref: string, last_grid: number) =>
    ({ driver_ref, last_grid }) as Driver;
  const order = lastRaceOrder([d("pit", 0), d("p2", 2), d("p1", 1)]);
  assert.deepEqual(
    order.map((x) => x.driver_ref),
    ["p1", "p2", "pit"],
  );
});
