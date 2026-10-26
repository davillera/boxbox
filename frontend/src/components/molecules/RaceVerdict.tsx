import { Check, X } from "lucide-react";
import { fill, type Dictionary, type Locale } from "@/dictionaries";
import type { ReviewRace } from "@/lib/api";
import { called, driverCode } from "@/lib/review";
import { pct } from "@/lib/teams";

export function Stamp({
  hit,
  dict,
}: {
  hit: boolean;
  dict: Dictionary["review"];
}) {
  const Icon = hit ? Check : X;
  return (
    <span
      data-anim="stamp"
      data-delay={250}
      className={`inline-flex items-center gap-1 border-2 border-ink px-2 py-0.5 text-xs font-black uppercase italic ${hit ? "bg-pirelli text-ink" : "bg-redline text-chalk"}`}
    >
      <Icon aria-hidden className="size-3.5" strokeWidth={3.5} />
      {hit ? dict.hit : dict.miss}
    </span>
  );
}

/** One past race in a sentence: who won, what we gave them, and our favourite if it was someone else. */
export function RaceVerdict({
  dict,
  lang,
  race,
  label,
  as: Heading = "p",
}: {
  dict: Dictionary["review"];
  lang: Locale;
  race: ReviewRace;
  label: string;
  as?: "p" | "h2";
}) {
  const share = (v: number) => pct(v, lang);
  const hit = called(race);
  return (
    <div className="flex flex-col gap-2 border-3 border-ink bg-ink p-4 text-chalk">
      <p className="flex items-center justify-between gap-3 text-xs font-bold tracking-wide text-smoke uppercase">
        <span>{label}</span>
        <Stamp hit={hit} dict={dict} />
      </p>
      <Heading className="text-2xl leading-tight font-sidewall sm:text-3xl">
        {race.name}
      </Heading>
      <p className="max-w-[60ch] text-base leading-snug font-semibold">
        {fill(dict.won, {
          driver: driverCode(race.winner),
          grid: race.winner.grid,
          p: share(race.winner.win_probability),
        })}{" "}
        {!hit &&
          fill(dict.pick, {
            driver: driverCode(race.pick),
            p: share(race.pick.win_probability),
          })}
      </p>
    </div>
  );
}
