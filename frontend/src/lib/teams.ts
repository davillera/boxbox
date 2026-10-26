// Approximate team colours; the driver code and team name always travel with them.
const TEAM_COLORS: Record<string, string> = {
  alpine: "#0093cc",
  aston_martin: "#229971",
  audi: "#8a8d8f",
  cadillac: "#f2f2f2",
  ferrari: "#e8002d",
  haas: "#b6babd",
  mclaren: "#ff8000",
  mercedes: "#27f4d2",
  rb: "#6692ff",
  red_bull: "#3671c6",
  williams: "#64c4ff",
};

export const teamColor = (teamRef: string | null | undefined) =>
  (teamRef && TEAM_COLORS[teamRef]) || "#9a9a9a";

/** "Haas F1 Team" -> "Haas": fits a grid card next to the code. */
export const shortTeam = (name: string | null) =>
  (name ?? "").replace(/ F1 Team$/, "");

export const pct = (p: number, locale: string) =>
  new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: p < 0.1 ? 1 : 0,
  }).format(p);
