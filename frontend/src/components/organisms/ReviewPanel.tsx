import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { RaceLog } from "@/components/molecules/RaceLog";
import { RaceVerdict } from "@/components/molecules/RaceVerdict";
import { fill, type Dictionary, type Locale } from "@/dictionaries";
import type { Review } from "@/lib/api";
import { called } from "@/lib/review";

/** The current season so far: what the model said before each GP, next to what happened. */
export function ReviewPanel({
  dict,
  lang,
  review,
}: {
  dict: Dictionary["review"];
  lang: Locale;
  review: Review;
}) {
  const last = review.races.at(-1);
  if (!last) return null;
  const races = review.races.filter((r) => r.season === last.season);
  return (
    <section
      aria-labelledby="review-title"
      className="flex flex-col gap-4 border-3 border-ink bg-panel p-4 shadow-hard sm:p-5"
    >
      <h2 id="review-title" className="text-xl font-sidewall">
        {dict.title}
      </h2>
      <p className="max-w-[68ch] text-sm leading-relaxed text-muted">
        {fill(dict.intro, { season: last.season })}
      </p>
      <RaceVerdict
        dict={dict}
        lang={lang}
        race={last}
        label={`${dict.last} · R${last.round}`}
      />
      <p className="text-sm font-bold">
        {fill(dict.tally, {
          season: last.season,
          hits: races.filter(called).length,
          races: races.length,
          pole: races.filter((r) => r.pole_won).length,
        })}
      </p>
      <RaceLog dict={dict} lang={lang} races={races} />
      <Link
        href={`/${lang}/review`}
        className="inline-flex items-center gap-1.5 self-start text-base font-black underline decoration-redline decoration-3 underline-offset-2"
      >
        {fill(dict.all, { races: review.races.length })}
        <ArrowRight aria-hidden className="size-4" strokeWidth={3} />
      </Link>
    </section>
  );
}
