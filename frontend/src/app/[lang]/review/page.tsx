import { Suspense } from "react";
import { notFound } from "next/navigation";
import { RaceLog } from "@/components/molecules/RaceLog";
import { RaceVerdict } from "@/components/molecules/RaceVerdict";
import { OfflineBoard } from "@/components/organisms/OfflineBoard";
import { ResultsTable } from "@/components/organisms/ResultsTable";
import { SeasonSummary } from "@/components/organisms/SeasonSummary";
import { SiteHeader } from "@/components/organisms/SiteHeader";
import { TrustPanel } from "@/components/organisms/TrustPanel";
import { DashboardTemplate } from "@/components/templates/DashboardTemplate";
import {
  fill,
  getDictionary,
  hasLocale,
  type Dictionary,
  type Locale,
} from "@/dictionaries";
import { getHealth, getRaceComparison, getReview } from "@/lib/api";
import { reviewKey } from "@/lib/review";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/review">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return {
    title: `BoxBox · ${dict.header.history}`,
    description: dict.history.lede,
  };
}

export default async function ReviewPage({
  params,
  searchParams,
}: PageProps<"/[lang]/review">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return (
    <DashboardTemplate
      header={<SiteHeader lang={lang} dict={dict.header} path="/review" />}
      title={dict.history.title}
      lede={dict.history.lede}
    >
      <Suspense fallback={<HistorySkeleton />}>
        <History lang={lang} dict={dict} searchParams={searchParams} />
      </Suspense>
    </DashboardTemplate>
  );
}

async function History({
  lang,
  dict,
  searchParams,
}: {
  lang: Locale;
  dict: Dictionary;
  searchParams: PageProps<"/[lang]/review">["searchParams"];
}) {
  const [{ race: wanted }, data] = await Promise.all([
    searchParams,
    Promise.all([getHealth(), getReview()]).catch(() => null),
  ]);
  const races = data?.[1].races ?? [];
  const selected = races.find((r) => reviewKey(r) === wanted) ?? races.at(-1);
  const comparison =
    selected &&
    (await getRaceComparison(selected.season, selected.round).catch(
      () => null,
    ));
  if (!data || !comparison)
    return <OfflineBoard dict={dict.errors} lang={lang} />;
  const [health] = data;
  const seasons = Map.groupBy(races, (r) => r.season);

  return (
    <div className="grid items-start gap-8 lg:grid-cols-12 lg:gap-10">
      <div className="flex min-w-0 flex-col gap-6 lg:col-span-7">
        <RaceVerdict
          as="h2"
          dict={dict.review}
          lang={lang}
          race={comparison}
          label={fill(dict.review.label, {
            season: comparison.season,
            round: comparison.round,
          })}
        />
        <ResultsTable
          dict={{
            ...dict.table,
            title: dict.history.compare,
            caption: dict.history.caption,
          }}
          lang={lang}
          predictions={comparison.field}
          teamOf={(ref) =>
            comparison.field.find((e) => e.driver_ref === ref)?.team_ref
          }
          runId={comparison.season * 100 + comparison.round}
          showFinish
        />
      </div>

      <div className="flex min-w-0 flex-col gap-6 lg:col-span-5">
        <SeasonSummary dict={dict.history} lang={lang} races={races} />
        <section
          aria-labelledby="all-title"
          className="flex flex-col gap-3 border-3 border-ink bg-panel p-4 shadow-hard sm:p-5"
        >
          <h2 id="all-title" className="text-xl font-sidewall">
            {dict.history.all}
          </h2>
          <p className="text-sm text-muted">{dict.history.allHint}</p>
          {[...seasons].toReversed().map(([season, rs]) => (
            <RaceLog
              key={season}
              dict={dict.review}
              lang={lang}
              races={rs}
              caption={String(season)}
              hrefOf={(r) => `/${lang}/review?race=${reviewKey(r)}`}
              selected={reviewKey(comparison)}
            />
          ))}
        </section>
        <TrustPanel dict={dict.trust} lang={lang} health={health} />
      </div>
    </div>
  );
}

function HistorySkeleton() {
  return (
    <div aria-busy className="grid gap-8 lg:grid-cols-12 lg:gap-10">
      <div className="h-[56rem] animate-pulse border-3 border-ink bg-panel shadow-hard lg:col-span-7" />
      <div className="h-96 animate-pulse border-3 border-ink bg-panel shadow-hard lg:col-span-5" />
    </div>
  );
}
