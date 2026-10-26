import type { Driver } from "@/lib/api";

/** Starting order of the last race; pit-lane starts (grid 0) go to the back. */
export const lastRaceOrder = (drivers: Driver[]) =>
  [...drivers].sort((a, b) => (a.last_grid || 99) - (b.last_grid || 99));

export function swap<T>(list: T[], a: number, b: number): T[] {
  const next = [...list];
  [next[a], next[b]] = [next[b], next[a]];
  return next;
}

/** Take the item at `from` and insert it at `to`; everything between shifts by one. */
export function move<T>(list: T[], from: number, to: number): T[] {
  const next = [...list];
  next.splice(to, 0, ...next.splice(from, 1));
  return next;
}
