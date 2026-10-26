import type { Dictionary, Locale } from "@/dictionaries";
import type { ReviewRace } from "@/lib/api";
import { seasonStats } from "@/lib/review";
import { pct } from "@/lib/teams";

/** Backtest tallies per season: does the favourite win, against the plain "pole wins" rule. */
export function SeasonSummary({
  dict,
  lang,
  races,
}: {
  dict: Dictionary["history"];
  lang: Locale;
  races: ReviewRace[];
}) {
  const rank = (v: number) =>
    v.toLocaleString(lang, { maximumFractionDigits: 1 });
  return (
    <section
      data-anim="reveal"
      aria-labelledby="seasons-title"
      className="flex flex-col gap-3 border-3 border-ink bg-panel p-4 shadow-hard sm:p-5"
    >
      <h2 id="seasons-title" className="text-xl font-sidewall">
        {dict.seasons}
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full border-3 border-fg text-left text-sm">
          <thead>
            <tr className="border-b-3 border-fg bg-raised text-xs font-extrabold tracking-wide uppercase">
              <th scope="col" className="px-3 py-2">
                {dict.season}
              </th>
              <th scope="col" className="px-2 py-2 text-right">
                {dict.favourite}
              </th>
              <th scope="col" className="px-2 py-2 text-right">
                {dict.pole}
              </th>
              <th scope="col" className="px-2 py-2 text-right">
                {dict.podium}
              </th>
              <th
                scope="col"
                className="hidden px-3 py-2 text-right sm:table-cell"
              >
                {dict.winnerRank}
              </th>
            </tr>
          </thead>
          <tbody>
            {seasonStats(races).map((s) => {
              const ahead = s.favourite > s.pole;
              return (
                <tr
                  key={s.season}
                  className="border-b border-fg/15 last:border-b-0"
                >
                  <th scope="row" className="px-3 py-2">
                    <span className="text-base font-sidewall">{s.season}</span>
                    <span className="ml-2 text-xs text-muted">
                      {s.races} {dict.races.toLowerCase()}
                    </span>
                  </th>
                  <td
                    className={`px-2 py-2 text-right text-base font-black tabular-nums ${ahead ? "bg-pirelli text-ink" : ""}`}
                  >
                    {s.favourite}/{s.races}
                  </td>
                  <td
                    className={`px-2 py-2 text-right text-base font-black tabular-nums ${!ahead && s.pole > s.favourite ? "bg-pirelli text-ink" : ""}`}
                  >
                    {s.pole}/{s.races}
                  </td>
                  <td className="px-2 py-2 text-right text-base font-black tabular-nums">
                    {pct(s.podiumHits, lang)}
                  </td>
                  <td className="hidden px-3 py-2 text-right text-base font-black tabular-nums sm:table-cell">
                    {rank(s.winnerRank)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="hidden text-xs leading-relaxed text-muted sm:block">
        {dict.winnerRankHint}
      </p>
    </section>
  );
}
