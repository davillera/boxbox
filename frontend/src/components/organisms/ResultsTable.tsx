import { ProbabilityBar } from "@/components/atoms/ProbabilityBar";
import { TeamSwatch } from "@/components/atoms/TeamSwatch";
import type { Dictionary, Locale } from "@/dictionaries";
import type { EntryPrediction } from "@/lib/api";
import { pct, shortTeam } from "@/lib/teams";

type Props = {
  dict: Dictionary["table"];
  lang: Locale;
  predictions: (EntryPrediction & {
    finish?: number | null;
    status?: string;
  })[];
  teamOf: (driverRef: string) => string | undefined;
  runId: number;
  /** Adds the real finishing position (past races). */
  showFinish?: boolean;
};

// Ergast letters for unclassified cars.
const OUT: Record<string, string> = {
  R: "DNF",
  D: "DSQ",
  W: "DNS",
  N: "NC",
  E: "EX",
  F: "DNQ",
};

export function ResultsTable({
  dict,
  lang,
  predictions,
  teamOf,
  runId,
  showFinish = false,
}: Props) {
  // Phones lose the podium column to make room for the result.
  const podiumCol = showFinish ? "hidden sm:table-cell" : "";
  const maxWin = Math.max(...predictions.map((p) => p.win_probability), 0.01);
  return (
    <section
      aria-labelledby="table-title"
      className="border-3 border-ink bg-panel shadow-hard"
    >
      <div className="flex flex-col gap-1 border-b-3 border-fg px-4 py-3">
        <h2 id="table-title" className="text-xl font-sidewall">
          {dict.title}
        </h2>
        <p className="text-sm text-muted">{dict.caption}</p>
      </div>
      <div className="overflow-x-auto">
        <table key={runId} className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b-3 border-fg bg-raised text-xs font-extrabold tracking-wide uppercase">
              <th scope="col" className="w-10 px-2 py-2 sm:w-12 sm:px-3">
                {dict.rank}
              </th>
              <th scope="col" className="px-2 py-2 sm:px-3">
                {dict.driver}
              </th>
              <th
                scope="col"
                className="hidden w-14 px-3 py-2 text-right sm:table-cell"
              >
                {dict.grid}
              </th>
              <th scope="col" className="px-2 py-2 sm:w-[28%] sm:px-3">
                {dict.win}
              </th>
              <th
                scope="col"
                className={`px-2 py-2 sm:w-[28%] sm:px-3 ${podiumCol}`}
              >
                {dict.podium}
              </th>
              {showFinish && (
                <th scope="col" className="w-16 px-2 py-2 text-right sm:px-3">
                  {dict.finish}
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {predictions.map((p, i) => (
              <tr
                key={p.driver_ref}
                className="border-b border-fg/15 last:border-b-0 hover:bg-raised"
              >
                <td className="px-2 py-1.5 text-base font-sidewall tabular-nums sm:px-3">
                  {i + 1}
                </td>
                <th scope="row" className="px-2 py-1.5 font-normal sm:px-3">
                  <span className="flex items-center gap-2 sm:gap-2.5">
                    <TeamSwatch teamRef={teamOf(p.driver_ref)} />
                    {/* Phones stack code over team; wider screens add the full name. */}
                    <span className="flex flex-col leading-tight sm:flex-row sm:items-center sm:gap-2.5">
                      <span className="text-base font-sidewall sm:w-11">
                        {p.driver_code}
                      </span>
                      <span className="flex min-w-0 flex-col leading-tight">
                        <span className="hidden truncate text-sm font-semibold sm:block">
                          {p.driver_name}
                        </span>
                        <span className="text-[11px] text-muted sm:text-xs">
                          {shortTeam(p.team_name)}
                        </span>
                      </span>
                    </span>
                  </span>
                </th>
                <td className="hidden px-3 py-1.5 text-right text-sm font-bold tabular-nums sm:table-cell">
                  {p.grid_position ? `P${p.grid_position}` : "PL"}
                </td>
                <td className="px-2 py-1.5 sm:px-3">
                  <ProbabilityBar
                    tone="win"
                    value={p.win_probability}
                    scale={maxWin}
                    label={pct(p.win_probability, lang)}
                    delay={i * 25}
                  />
                </td>
                <td className={`px-2 py-1.5 sm:px-3 ${podiumCol}`}>
                  <ProbabilityBar
                    tone="podium"
                    value={p.podium_probability}
                    label={pct(p.podium_probability, lang)}
                    delay={i * 25}
                  />
                </td>
                {showFinish && (
                  <td className="px-2 py-1.5 text-right sm:px-3">
                    {p.status && /^\d+$/.test(p.status) ? (
                      <span
                        className={`inline-block min-w-11 border-2 px-1.5 text-center text-sm font-black tabular-nums ${Number(p.status) <= 3 ? "border-ink bg-pirelli text-ink" : "border-transparent"}`}
                      >
                        P{p.status}
                      </span>
                    ) : (
                      <span className="text-xs font-black text-redline">
                        {OUT[p.status ?? ""] ?? p.status}
                      </span>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
