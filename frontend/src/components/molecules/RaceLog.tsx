import Link from "next/link";
import { Check, X } from "lucide-react";
import type { Dictionary, Locale } from "@/dictionaries";
import type { ReviewRace } from "@/lib/api";
import { called, driverCode, reviewKey } from "@/lib/review";
import { pct } from "@/lib/teams";

type Props = {
  dict: Dictionary["review"];
  lang: Locale;
  /** Shown newest first. */
  races: ReviewRace[];
  caption?: string;
  /** Makes each GP a link (track-record page). */
  hrefOf?: (race: ReviewRace) => string;
  selected?: string;
};

/** One row per past race: winner, our favourite, how many of our top 3 made the podium. */
export function RaceLog({
  dict,
  lang,
  races,
  caption,
  hrefOf,
  selected,
}: Props) {
  return (
    <table className="w-full border-3 border-fg text-left text-sm">
      {caption && (
        <caption className="border-3 border-b-0 border-fg bg-fg px-3 py-1.5 text-left text-sm font-sidewall text-ground">
          {caption}
        </caption>
      )}
      <thead>
        <tr className="border-b-3 border-fg bg-raised text-xs font-extrabold tracking-wide uppercase">
          <th scope="col" className="py-2 pr-1 pl-3">
            {dict.round}
          </th>
          <th scope="col" className="px-2 py-2">
            {dict.gp}
          </th>
          <th scope="col" className="px-2 py-2">
            {dict.winner}
          </th>
          <th scope="col" className="px-2 py-2">
            {dict.favourite}
          </th>
          <th
            scope="col"
            className="hidden py-2 pr-3 pl-2 text-right sm:table-cell"
          >
            {dict.podium}
          </th>
        </tr>
      </thead>
      <tbody>
        {races.toReversed().map((r) => {
          const hit = called(r);
          const current = selected === reviewKey(r);
          const name = r.name.replace(" Grand Prix", "");
          return (
            <tr
              key={reviewKey(r)}
              className={`border-b border-fg/15 last:border-b-0 ${current ? "bg-pirelli text-ink" : hrefOf ? "hover:bg-raised" : ""}`}
            >
              <td className="py-1.5 pr-1 pl-3 font-bold tabular-nums">
                {r.round}
              </td>
              <th scope="row" className="px-2 py-1.5 font-semibold">
                {hrefOf ? (
                  <Link
                    href={hrefOf(r)}
                    aria-current={current ? "page" : undefined}
                    className="underline decoration-redline decoration-2 underline-offset-2"
                  >
                    {name}
                  </Link>
                ) : (
                  name
                )}
              </th>
              <td className="px-2 py-1.5 font-black">
                {driverCode(r.winner)}
                <span
                  className={`ml-1.5 text-xs font-semibold tabular-nums ${current ? "" : "text-muted"}`}
                >
                  {pct(r.winner.win_probability, lang)}
                </span>
              </td>
              <td className="px-2 py-1.5">
                <span className="inline-flex items-center gap-1.5 font-black">
                  {hit ? (
                    <Check aria-hidden className="size-4" strokeWidth={3.5} />
                  ) : (
                    <X
                      aria-hidden
                      className={`size-4 ${current ? "" : "text-redline"}`}
                      strokeWidth={3.5}
                    />
                  )}
                  <span className="sr-only">{hit ? dict.hit : dict.miss}:</span>
                  {driverCode(r.pick)}
                </span>
              </td>
              <td className="hidden py-1.5 pr-3 pl-2 text-right font-bold tabular-nums sm:table-cell">
                {r.podium_hits}/3
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
