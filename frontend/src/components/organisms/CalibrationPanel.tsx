import { fill, type Dictionary, type Locale } from "@/dictionaries";
import type { Calibration, CalibrationTarget } from "@/lib/api";
import { pct } from "@/lib/teams";

type Props = {
  dict: Dictionary["quality"];
  lang: Locale;
  calibration: Calibration;
};

/** Reliability diagram as paired bars: what the model said vs how often it happened. */
export function CalibrationPanel({ dict, lang, calibration }: Props) {
  const num = (v: number) =>
    v.toLocaleString(lang, {
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    });
  return (
    <section
      data-anim="reveal"
      aria-labelledby="calibration-title"
      className="flex flex-col gap-4 border-3 border-ink bg-panel p-4 shadow-hard sm:p-5"
    >
      <h2 id="calibration-title" className="text-xl font-sidewall">
        {dict.calibrationTitle}
      </h2>
      <p className="max-w-[68ch] text-sm leading-relaxed text-muted">
        {dict.calibrationLede}
      </p>
      {(
        [
          [dict.win, calibration.win],
          [dict.podium, calibration.podium],
        ] as [string, CalibrationTarget][]
      ).map(([label, target]) => {
        const top = Math.max(
          ...target.bins.flatMap((b) => [b.predicted, b.observed]),
          0.05,
        );
        return (
          <figure key={label} className="flex flex-col gap-2">
            <figcaption className="text-sm font-black uppercase italic">
              {label}
            </figcaption>
            <ul className="flex flex-col gap-1.5">
              {target.bins.map((b) => (
                <li
                  key={b.predicted}
                  className="grid grid-cols-[3.2rem_minmax(0,1fr)] items-center gap-2"
                >
                  <span className="text-right text-xs font-bold tabular-nums">
                    {pct(b.predicted, lang)}
                  </span>
                  <div
                    role="img"
                    aria-label={`${dict.predicted} ${pct(b.predicted, lang)}, ${dict.observed} ${pct(b.observed, lang)} (n=${b.n})`}
                    className="flex flex-col gap-0.5"
                  >
                    <span
                      data-anim="bar"
                      className="h-2 origin-left bg-pirelli outline-2 outline-ink"
                      style={{ width: `${(b.predicted / top) * 100}%` }}
                    />
                    <span
                      data-anim="bar"
                      data-delay={60}
                      className="h-2 origin-left bg-ink"
                      style={{ width: `${(b.observed / top) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
            <p className="text-xs leading-relaxed text-muted">
              {fill(target.applied ? dict.applied : dict.notApplied, {
                n: calibration.holdout_races,
                raw: num(target.brier_raw),
                cal: num(target.brier_calibrated),
              })}
            </p>
          </figure>
        );
      })}
      <p className="border-t-3 border-fg pt-2.5 text-xs leading-relaxed text-muted">
        <span className="mr-3 inline-flex items-center gap-1.5">
          <span
            aria-hidden
            className="size-3 bg-pirelli outline-2 outline-ink"
          />
          {dict.predicted}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="size-3 bg-ink" />
          {dict.observed}
        </span>
        <br />
        {dict.calibrationNote}
      </p>
    </section>
  );
}
