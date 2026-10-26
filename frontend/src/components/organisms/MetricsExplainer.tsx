import { Rich } from "@/components/atoms/Rich";
import type { Dictionary, Locale } from "@/dictionaries";
import type { Health } from "@/lib/api";
import { pct } from "@/lib/teams";

type Key =
  "log_loss" | "win_auc" | "winner_pick_accuracy" | "podium_top3_precision";

/** One card per backtest metric: what it asks, model vs grid-only, the better one in yellow. */
export function MetricsExplainer({
  dict,
  lang,
  backtest,
}: {
  dict: Dictionary["how"]["metrics"];
  lang: Locale;
  backtest: Health["backtest"];
}) {
  const fmt = (key: Key, v: number) =>
    key === "log_loss" || key === "win_auc"
      ? v.toLocaleString(lang, {
          minimumFractionDigits: 3,
          maximumFractionDigits: 3,
        })
      : pct(v, lang);
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {dict.items.map((m, i) => {
        const key = m.key as Key;
        const model = backtest.model[key];
        const base = backtest.baseline_grid_only[key];
        const modelWins = key === "log_loss" ? model < base : model > base;
        const cell = (v: number, best: boolean, label: string) => (
          <div
            className={`flex flex-col border-2 border-ink px-3 py-2 ${best ? "bg-pirelli text-ink" : "bg-ground"}`}
          >
            <span className="text-xs font-bold tracking-wide uppercase opacity-75">
              {label}
            </span>
            <span className="text-2xl font-black italic tabular-nums">
              {fmt(key, v)}
            </span>
          </div>
        );
        return (
          <article
            key={m.key}
            data-anim="reveal"
            data-delay={i * 80}
            className="flex flex-col gap-3 border-3 border-ink bg-panel p-4 shadow-hard-sm"
          >
            <header className="flex flex-col">
              <h3 className="text-xl font-sidewall">{m.name}</h3>
              <span className="text-xs font-bold text-muted uppercase">
                {m.better}
              </span>
            </header>
            <div className="grid grid-cols-2 gap-2">
              {cell(model, modelWins, dict.model)}
              {cell(base, !modelWins, dict.baselineCol)}
            </div>
            <p className="text-sm leading-relaxed">
              <Rich text={m.what} />
            </p>
          </article>
        );
      })}
    </div>
  );
}
