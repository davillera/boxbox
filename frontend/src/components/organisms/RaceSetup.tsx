import { CloudRain, Droplets, Sun, Thermometer, Wind } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SelectField } from "@/components/atoms/SelectField";
import { Countdown } from "@/components/molecules/Countdown";
import { fill, type Dictionary, type Locale } from "@/dictionaries";
import type { Race } from "@/lib/api";

export const raceKey = (r: Race) => `${r.season}-${r.round}`;

type Props = {
  dict: Dictionary["setup"];
  lang: Locale;
  races: Race[];
  value: string;
  onChange: (key: string) => void;
};

/** Pick a Grand Prix from the calendar; its weather is the forecast, read-only. */
export function RaceSetup({ dict, lang, races, value, onChange }: Props) {
  const race = races.find((r) => raceKey(r) === value);
  if (!race)
    return (
      <p className="border-3 border-fg bg-raised p-4 text-base font-semibold">
        {dict.noRaces}
      </p>
    );
  // Fixed to UTC so the server render and the browser print the same text.
  const date = (iso: string, opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(lang, { timeZone: "UTC", ...opts }).format(
      new Date(iso),
    );
  const num = (v: number, digits = 0) =>
    v.toLocaleString(lang, { maximumFractionDigits: digits });
  const w = race.weather;
  return (
    <div className="flex flex-col gap-5">
      <SelectField
        id="race"
        label={dict.race}
        value={value}
        onChange={onChange}
        options={races.map((r) => ({
          value: raceKey(r),
          label: `R${r.round} · ${r.name} · ${date(r.start_utc, { day: "numeric", month: "short" })}`,
        }))}
      />
      <Countdown to={race.start_utc} label={dict.countdown} />
      {race.qualifying && (
        <p className="border-3 border-ink bg-pirelli px-3 py-2 text-sm leading-relaxed font-bold text-ink">
          {dict.qualifying}
        </p>
      )}
      {w ? (
        <figure className="flex flex-col gap-2">
          {/* Re-mounts per race so the readings refresh like telemetry (PRESETS.readout). */}
          <dl
            key={value}
            data-anim="readout"
            className="grid grid-cols-2 gap-[3px] border-3 border-fg bg-fg"
          >
            <Reading
              icon={w.rainfall ? CloudRain : Sun}
              label={dict.conditions}
              value={w.rainfall ? dict.wet : dict.dry}
              tone={w.rainfall ? "bg-wet text-chalk" : "bg-pirelli text-ink"}
            />
            <Reading
              icon={Thermometer}
              label={dict.airTemp}
              value={`${num(w.air_temp_c)} °C`}
            />
            <Reading
              icon={Droplets}
              label={dict.humidity}
              value={`${num(w.humidity_pct)} %`}
            />
            <Reading
              icon={Wind}
              label={dict.wind}
              value={`${num(w.wind_speed_ms, 1)} m/s`}
            />
          </dl>
          <figcaption className="text-xs leading-relaxed text-muted">
            {fill(dict.forecast, {
              start: `${date(race.start_utc, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} UTC`,
            })}
          </figcaption>
        </figure>
      ) : (
        <p className="border-3 border-dashed border-fg p-3 text-sm leading-relaxed font-semibold">
          {fill(dict.noForecast, {
            date: date(`${race.forecast_from}T00:00:00Z`, {
              day: "numeric",
              month: "long",
            }),
          })}
        </p>
      )}
    </div>
  );
}

function Reading({
  icon: Icon,
  label,
  value,
  tone = "bg-ground text-fg",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className={`flex min-w-0 flex-col gap-1 p-3 ${tone}`}>
      <dt className="flex items-center gap-1.5 text-xs font-bold tracking-wide uppercase opacity-75">
        <Icon aria-hidden className="size-4 shrink-0" strokeWidth={2.5} />
        {label}
      </dt>
      <dd className="text-2xl font-black whitespace-nowrap italic tabular-nums">
        {value}
      </dd>
    </div>
  );
}
