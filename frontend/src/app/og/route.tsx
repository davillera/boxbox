import { ImageResponse } from "next/og";
import { API_URL, type Driver, type Race } from "@/lib/api";
import { hasLocale, type Locale } from "@/dictionaries";
import { startingOrder } from "@/lib/grid";

const TEXT: Record<Locale, { podium: string; fallback: string; win: string }> =
  {
    es: {
      podium: "Podio previsto",
      fallback: "¿Quién gana el domingo?",
      win: "gana",
    },
    en: {
      podium: "Predicted podium",
      fallback: "Who wins on Sunday?",
      win: "win",
    },
  };

const YELLOW = "#ffd100";
const INK = "#0d0d0d";
const RED = "#e4002b";

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`${path} -> ${res.status}`);
  return res.json();
}

type Slat = { code: string; name: string; win: number };

/** The race's predicted podium, from the qualifying (or last-race) grid and the forecast. */
async function podium(wanted: string | null) {
  const [races, drivers] = await Promise.all([
    json<Race[]>("/races/upcoming"),
    json<Driver[]>("/drivers"),
  ]);
  const race =
    races.find((r) => `${r.season}-${r.round}` === wanted) ?? races[0];
  if (!race) return null;
  const w = race.weather;
  const { predictions } = await json<{
    predictions: {
      driver_code: string | null;
      driver_name: string;
      win_probability: number;
    }[];
  }>("/predict", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      circuit_ref: race.circuit_ref,
      season: race.season,
      round: race.round,
      weather: {
        air_temp_c: w?.air_temp_c ?? null,
        humidity_pct: w?.humidity_pct ?? null,
        wind_speed_ms: w?.wind_speed_ms ?? null,
        rainfall: w?.rainfall ?? false,
      },
      entries: startingOrder(drivers, race.qualifying).map((d, i) => ({
        driver_ref: d.driver_ref,
        grid_position: i + 1,
      })),
      normalize: true,
    }),
  });
  const slats: Slat[] = predictions.slice(0, 3).map((p) => ({
    code: p.driver_code ?? p.driver_name.slice(0, 3).toUpperCase(),
    name: p.driver_name,
    win: p.win_probability,
  }));
  return { race: race.name, slats };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lang = searchParams.get("lang") ?? "";
  const t = TEXT[hasLocale(lang) ? lang : "en"];
  const result = await podium(searchParams.get("race")).catch(() => null);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: YELLOW,
        color: INK,
        padding: 56,
        fontWeight: 900,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 64,
            background: INK,
            color: YELLOW,
            padding: "4px 24px",
            boxShadow: `10px 10px 0 ${RED}`,
          }}
        >
          BOXBOX
        </div>
        <div style={{ display: "flex", fontSize: 34 }}>
          {result ? result.race : ""}
        </div>
      </div>

      {result ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", fontSize: 30, color: RED }}>
            {t.podium.toUpperCase()}
          </div>
          {result.slats.map((s, i) => (
            <div
              key={s.code}
              style={{
                display: "flex",
                alignItems: "center",
                background: INK,
                color: "#ffffff",
                padding: "10px 28px",
                gap: 28,
                boxShadow: `8px 8px 0 ${RED}`,
              }}
            >
              <div style={{ display: "flex", fontSize: 54, color: YELLOW }}>
                P{i + 1}
              </div>
              <div style={{ display: "flex", fontSize: 54, width: 150 }}>
                {s.code}
              </div>
              <div style={{ display: "flex", fontSize: 30, flexGrow: 1 }}>
                {s.name}
              </div>
              <div style={{ display: "flex", fontSize: 54, color: YELLOW }}>
                {Math.round(s.win * 100)} % {t.win}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: "flex", fontSize: 110, lineHeight: 1 }}>
          {t.fallback}
        </div>
      )}

      <div style={{ display: "flex", fontSize: 26 }}>
        XGBoost · walk-forward backtest · F1
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      headers: {
        "cache-control": "public, max-age=900, s-maxage=900",
      },
    },
  );
}
