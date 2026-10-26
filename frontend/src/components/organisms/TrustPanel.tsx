import { fill, type Dictionary, type Locale } from "@/dictionaries";
import type { Health } from "@/lib/api";
import { pct } from "@/lib/teams";

export function TrustPanel({
  dict,
  lang,
  health,
}: {
  dict: Dictionary["trust"];
  lang: Locale;
  health: Health;
}) {
  const { model: m, baseline_grid_only: b } = health.backtest;
  const share = (v: number) => pct(v, lang);
  const num = (v: number) =>
    v.toLocaleString(lang, {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    });
  const rows = [
    [dict.pick, m.winner_pick_accuracy, b.winner_pick_accuracy, share, true],
    [
      dict.podium,
      m.podium_top3_precision,
      b.podium_top3_precision,
      share,
      true,
    ],
    [dict.auc, m.win_auc, b.win_auc, num, true],
    [dict.logloss, m.log_loss, b.log_loss, num, false],
  ] as const;
  return (
    <section
      aria-labelledby="trust-title"
      className="flex flex-col gap-4 border-3 border-ink bg-panel p-4 shadow-hard sm:p-5"
    >
      <h2 id="trust-title" className="text-xl font-sidewall">
        {dict.title}
      </h2>
      <p className="max-w-[68ch] text-sm leading-relaxed text-muted">
        {fill(dict.intro, { races: m.races })}
      </p>
      <table className="w-full border-3 border-fg text-left">
        <thead>
          <tr className="border-b-3 border-fg bg-raised text-xs font-extrabold tracking-wide uppercase">
            <th scope="col" className="px-3 py-2">
              {dict.metric}
            </th>
            <th scope="col" className="px-3 py-2 text-right">
              {dict.model}
            </th>
            <th scope="col" className="px-3 py-2 text-right">
              {dict.baseline}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, model, base, fmt, higherIsBetter]) => {
            const modelWins = higherIsBetter ? model > base : model < base;
            const best = "bg-pirelli text-ink";
            return (
              <tr key={label} className="border-b border-fg/15 last:border-b-0">
                <th scope="row" className="px-3 py-2 text-sm font-semibold">
                  {label}
                </th>
                <td
                  className={`px-3 py-2 text-right text-base font-black tabular-nums ${modelWins ? best : ""}`}
                >
                  {fmt(model)}
                </td>
                <td
                  className={`px-3 py-2 text-right text-base font-black tabular-nums ${modelWins ? "" : best}`}
                >
                  {fmt(base)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="max-w-[68ch] text-sm leading-relaxed font-semibold">
        {dict.honest}
      </p>
      <p className="border-t border-fg/15 pt-3 text-xs leading-relaxed text-muted">
        {fill(dict.footer, {
          dataTo: health.model.data_to,
          model: health.model.name,
          version: health.model.version,
        })}{" "}
        <a
          href="https://github.com/davillera/boxbox"
          className="font-bold text-fg underline decoration-redline decoration-2"
        >
          {dict.source}
        </a>
      </p>
    </section>
  );
}
