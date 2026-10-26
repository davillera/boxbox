import type { ReactNode } from "react";
import { ArrowDown, TriangleAlert } from "lucide-react";
import { Joined } from "@/components/atoms/Joined";
import { BoardSlat } from "@/components/molecules/BoardSlat";
import { fill, type Dictionary, type Locale } from "@/dictionaries";
import type { EntryPrediction } from "@/lib/api";
import { pct } from "@/lib/teams";

type Props = {
  dict: Dictionary["board"];
  lang: Locale;
  heading: string[];
  podium: EntryPrediction[] | null;
  /** Changes on every prediction so the slats drop in again. */
  runId: number;
  error: string | null;
  /** Backtest winner-pick rates, shown beside the result so the 62 % is read with its limit. */
  pick: { model: number; baseline: number };
  trustLabel: string;
  /** Shown next to the title once there is a podium (e.g. the share button). */
  action?: ReactNode;
};

/** The yellow board held over the pit wall: the three most likely winners, or the call to come in. */
export function PitBoard({
  dict,
  lang,
  heading,
  podium,
  runId,
  error,
  pick,
  trustLabel,
  action,
}: Props) {
  return (
    <section
      aria-labelledby="board-title"
      aria-live="polite"
      className="border-3 border-ink bg-pirelli p-3 text-ink shadow-red [perspective:900px] sm:p-4"
    >
      <div className="mb-3 flex items-center justify-between gap-3 px-1">
        <h2 id="board-title" className="text-lg font-sidewall">
          {dict.title}
        </h2>
        <p className="text-right text-sm font-bold">
          <Joined parts={heading} />
        </p>
      </div>
      {podium && action && (
        <div className="mb-3 flex justify-end">{action}</div>
      )}
      {error ? (
        <div
          role="alert"
          className="flex items-start gap-3 border-3 border-ink bg-ink p-5 text-chalk"
        >
          <TriangleAlert
            aria-hidden
            className="mt-0.5 size-6 shrink-0 text-redline"
            strokeWidth={2.5}
          />
          <p className="text-base font-semibold">{error}</p>
        </div>
      ) : podium ? (
        <ol key={runId} className="flex flex-col gap-2">
          {podium.map((p, i) => (
            <BoardSlat
              key={p.driver_ref}
              position={i + 1}
              code={p.driver_code ?? p.driver_name}
              detail={[
                p.driver_name,
                fill(dict.from, { grid: p.grid_position || "—" }),
              ]}
              value={pct(p.win_probability, lang)}
              valueLabel={dict.win}
              delay={i * 110}
            />
          ))}
        </ol>
      ) : (
        <div className="flex flex-col gap-2">
          <ol className="flex flex-col gap-2" aria-hidden>
            <BoardSlat position={1} code="Box" />
            <BoardSlat position={2} code="Box" delay={110} />
          </ol>
          <p className="px-1 pt-2 text-base">
            <strong className="font-black uppercase italic">
              {dict.emptyTitle}.
            </strong>{" "}
            {dict.empty}
          </p>
        </div>
      )}
      <p className="mt-3 border-t-3 border-ink px-1 pt-2.5 text-sm font-medium">
        {fill(dict.limit, {
          model: pct(pick.model, lang),
          baseline: pct(pick.baseline, lang),
        })}{" "}
        <a
          href="#trust-title"
          className="inline-flex items-center gap-1 font-black whitespace-nowrap underline"
        >
          {trustLabel}
          <ArrowDown aria-hidden className="size-4" strokeWidth={3} />
        </a>
      </p>
    </section>
  );
}
