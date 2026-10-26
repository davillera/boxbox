import type { Locale } from "@/dictionaries";
import { pct } from "@/lib/teams";

/** Ranked horizontal bars of XGBoost gain share, labelled in plain words. */
export function ImportanceChart({
  importance,
  labels,
  lang,
}: {
  importance: Record<string, number>;
  labels: Record<string, string>;
  lang: Locale;
}) {
  const rows = Object.entries(importance).sort(([, a], [, b]) => b - a);
  const max = rows[0]?.[1] ?? 1;
  return (
    <ol
      data-anim="reveal"
      className="flex max-w-[76ch] flex-col gap-1.5 border-3 border-ink bg-panel p-4 shadow-hard-sm"
    >
      {rows.map(([key, value], i) => (
        <li
          key={key}
          className="grid grid-cols-[minmax(0,11rem)_1fr_3.5rem] items-center gap-3 sm:grid-cols-[minmax(0,15rem)_1fr_4rem]"
        >
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-sm font-bold">
              {labels[key] ?? key}
            </span>
            <code className="truncate font-mono text-[11px] text-muted">
              {key}
            </code>
          </span>
          <span aria-hidden className="h-4 border-2 border-fg/70 bg-ground">
            <span
              data-anim="bar"
              data-delay={i * 40}
              className={`block h-full origin-left ${i < 2 ? "bg-redline" : "bg-pirelli"}`}
              style={{ width: `${(value / max) * 100}%` }}
            />
          </span>
          <span className="text-right text-sm font-black tabular-nums">
            {pct(value, lang)}
          </span>
        </li>
      ))}
    </ol>
  );
}
