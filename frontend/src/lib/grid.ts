import type { Driver, QualifyingEntry } from "@/lib/api";

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

/**
 * Starting order for a race: the qualifying classification once published (drivers missing from it
 * go to the back), otherwise the order of the last race.
 */
export function startingOrder(
  drivers: Driver[],
  qualifying: QualifyingEntry[] | null | undefined,
) {
  if (!qualifying?.length) return lastRaceOrder(drivers);
  const slot = new Map(qualifying.map((q) => [q.driver_ref, q.position]));
  return [...drivers].sort(
    (a, b) =>
      (slot.get(a.driver_ref) ?? 99) - (slot.get(b.driver_ref) ?? 99) ||
      (a.last_grid || 99) - (b.last_grid || 99),
  );
}
