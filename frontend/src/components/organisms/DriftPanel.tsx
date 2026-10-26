import { fill, type Dictionary, type Locale } from "@/dictionaries";
import type { Monitor } from "@/lib/api";
import { pct } from "@/lib/teams";

type Props = {
  dict: Dictionary["quality"];
  lang: Locale;
  monitor: Monitor;
};

const STATUS_TONE = {
  ok: "bg-pirelli text-ink",
  watch: "bg-redline text-chalk",
  no_data: "bg-raised text-fg",
} as const;

/** Is the model getting worse? Per-race error as columns, plus real predictions scored after the fact. */
export function DriftPanel({ dict, lang, monitor }: Props) {
  const num = (v: number) =>
    v.toLocaleString(lang, {
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    });
  const tallest = Math.max(...monitor.series.map((s) => s.brier), 0.001);
  const label = { ok: dict.ok, watch: dict.watch, no_data: dict.noData }[
    monitor.status
  ];
  return (
    <section
      data-anim="reveal"
      aria-labelledby="drift-title"
      className="flex flex-col gap-4 border-3 border-ink bg-panel p-4 shadow-hard sm:p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="drift-title" className="text-xl font-sidewall">
          {dict.driftTitle}
        </h2>
        <span
          className={`border-3 border-ink px-2.5 py-0.5 text-sm font-black uppercase italic ${STATUS_TONE[monitor.status]}`}
        >
          {label}
        </span>
      </div>
      <p className="max-w-[68ch] text-sm leading-relaxed text-muted">
        {fill(dict.driftLede, {
          window: monitor.window,
          recent: num(monitor.recent_brier),
          overall: num(monitor.overall_brier),
        })}
      </p>
      <ol
        aria-hidden
        className="relative flex h-24 items-end gap-px border-b-3 border-fg"
      >
        {monitor.series.map((s, i) => (
          <li
            key={`${s.season}-${s.round}`}
            title={`${s.season} R${s.round} · ${s.name}: ${num(s.brier)}`}
            className={`min-w-0 flex-1 ${i >= monitor.series.length - monitor.window ? "bg-redline" : "bg-ink"}`}
            style={{ height: `${(s.brier / tallest) * 100}%` }}
          />
        ))}
      </ol>
      <h3 className="text-base font-sidewall">{dict.liveTitle}</h3>
      <p className="text-sm text-muted">{dict.liveLede}</p>
      {!monitor.live_available ? (
        <p className="text-sm font-semibold">{dict.liveOff}</p>
      ) : monitor.live.length ? (
        <table className="w-full border-3 border-fg text-left text-sm">
          <thead>
            <tr className="border-b-3 border-fg bg-raised text-xs font-extrabold tracking-wide uppercase">
              <th scope="col" className="px-2 py-1.5">
                {dict.race}
              </th>
              <th scope="col" className="px-2 py-1.5 text-right">
                {dict.preds}
              </th>
              <th scope="col" className="px-2 py-1.5 text-right">
                {dict.error}
              </th>
              <th scope="col" className="px-2 py-1.5 text-right">
                {dict.favourite}
              </th>
            </tr>
          </thead>
          <tbody>
            {monitor.live.map((r) => (
              <tr
                key={`${r.season}-${r.round}`}
                className="border-b border-fg/15"
              >
                <th scope="row" className="px-2 py-1.5 font-semibold">
                  {r.name}
                </th>
                <td className="px-2 py-1.5 text-right tabular-nums">
                  {r.predictions}
                </td>
                <td className="px-2 py-1.5 text-right tabular-nums">
                  {num(r.brier)}
                </td>
                <td className="px-2 py-1.5 text-right font-bold">
                  {r.favourite_won ? dict.hit : dict.miss}
                  {r.winner_probability !== null &&
                    ` · ${pct(r.winner_probability, lang)}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-sm font-semibold">{dict.liveEmpty}</p>
      )}
    </section>
  );
}
