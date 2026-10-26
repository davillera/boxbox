import { fill, type Dictionary, type Locale } from "@/dictionaries";
import type { EntryPrediction, Factor } from "@/lib/api";
import { pct } from "@/lib/teams";

type Props = {
  dict: Dictionary["why"];
  lang: Locale;
  prediction: EntryPrediction;
};

/** What the model saw: a feature's value as text, e.g. "P3", "wet", "1.8". */
function show(dict: Dictionary["why"], lang: Locale, f: Factor) {
  if (f.value === null) return dict.unknown;
  if (typeof f.value === "string") return f.value;
  if (f.feature === "rainfall") return f.value ? dict.wet : dict.dry;
  if (f.feature === "grid" || f.feature === "quali_position")
    return `P${Math.round(f.value)}`;
  return f.value.toLocaleString(lang, { maximumFractionDigits: 2 });
}

/**
 * TreeSHAP breakdown of one driver's win chance. Each factor multiplies the odds of winning
 * (exp of its log-odds push), so "x2" doubles the odds and "x0.5" halves them.
 */
export function WhyPanel({ dict, lang, prediction }: Props) {
  const factors = prediction.factors ?? [];
  const biggest = Math.max(...factors.map((f) => Math.abs(f.effect)), 0.01);
  const labels: Record<string, string> = dict.features;
  return (
    <section
      data-anim="reveal"
      aria-labelledby="why-title"
      aria-live="polite"
      className="flex flex-col gap-3 border-3 border-ink bg-panel p-4 shadow-hard sm:p-5"
    >
      <div className="flex flex-col gap-1">
        <h2 id="why-title" className="text-xl font-sidewall">
          {fill(dict.title, {
            driver: prediction.driver_code ?? prediction.driver_name,
          })}
        </h2>
        <p className="text-sm text-muted">
          {fill(dict.intro, { p: pct(prediction.win_probability, lang) })}
        </p>
      </div>
      {factors.length ? (
        <ul className="flex flex-col gap-2.5">
          {factors.map((f) => {
            const helps = f.effect > 0;
            const odds = Math.exp(f.effect);
            return (
              <li
                key={f.feature}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1"
              >
                <span className="min-w-0 truncate text-sm font-bold">
                  {labels[f.feature] ?? f.feature}
                  <span className="font-medium text-muted">
                    {" "}
                    · {show(dict, lang, f)}
                  </span>
                </span>
                <span
                  className={`text-sm font-black tabular-nums ${helps ? "" : "text-redline"}`}
                >
                  {helps ? dict.helps : dict.hurts} ×
                  {odds.toLocaleString(lang, { maximumFractionDigits: 2 })}
                </span>
                {/* Diverging bar: hurts grow left of the axis, helps right of it. */}
                <div
                  aria-hidden
                  className="relative col-span-2 h-3 border-2 border-fg bg-ground"
                >
                  <span className="absolute inset-y-0 left-1/2 w-0.5 bg-fg" />
                  <span
                    className={`absolute inset-y-0 ${helps ? "left-1/2 bg-pirelli" : "right-1/2 bg-redline"}`}
                    style={{ width: `${(Math.abs(f.effect) / biggest) * 50}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm font-semibold">{dict.none}</p>
      )}
      <p className="border-t-3 border-fg pt-2.5 text-xs leading-relaxed text-muted">
        {dict.note}
      </p>
    </section>
  );
}
