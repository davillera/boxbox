import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OfflineBoard } from "@/components/organisms/OfflineBoard";
import { PredictionWorkbench } from "@/components/organisms/PredictionWorkbench";
import { SiteHeader } from "@/components/organisms/SiteHeader";
import { DashboardTemplate } from "@/components/templates/DashboardTemplate";
import {
  getDictionary,
  hasLocale,
  type Dictionary,
  type Locale,
} from "@/dictionaries";
import { getCatalog } from "@/lib/api";

// A shared link (?race=season-round) gets its own podium card as the preview image.
export async function generateMetadata({
  params,
  searchParams,
}: PageProps<"/[lang]">): Promise<Metadata> {
  const [{ lang }, { race }] = await Promise.all([params, searchParams]);
  if (!hasLocale(lang)) notFound();
  const card = new URLSearchParams({ lang });
  if (typeof race === "string" && /^\d{4}-\d{1,2}$/.test(race))
    card.set("race", race);
  return {
    openGraph: {
      images: [{ url: `/og?${card}`, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", images: [`/og?${card}`] },
  };
}

export default async function Page({
  params,
  searchParams,
}: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return (
    <DashboardTemplate
      header={<SiteHeader lang={lang} dict={dict.header} />}
      title={dict.intro.title}
      lede={dict.intro.lede}
    >
      <Suspense fallback={<WorkbenchSkeleton />}>
        <Workbench lang={lang} dict={dict} searchParams={searchParams} />
      </Suspense>
    </DashboardTemplate>
  );
}

// Catalog is read per request so a retrained model shows up without a rebuild.
async function Workbench({
  lang,
  dict,
  searchParams,
}: {
  lang: Locale;
  dict: Dictionary;
  searchParams: PageProps<"/[lang]">["searchParams"];
}) {
  const [{ race }, catalog] = await Promise.all([
    searchParams,
    getCatalog().catch(() => null),
  ]);
  if (!catalog) return <OfflineBoard dict={dict.errors} lang={lang} />;
  return (
    <PredictionWorkbench
      lang={lang}
      dict={dict}
      initialRace={typeof race === "string" ? race : undefined}
      {...catalog}
    />
  );
}

function WorkbenchSkeleton() {
  return (
    <div aria-busy className="grid gap-8 lg:grid-cols-12 lg:gap-10">
      <div className="h-[56rem] animate-pulse border-3 border-ink bg-panel shadow-hard lg:col-span-5" />
      <div className="h-80 animate-pulse border-3 border-ink bg-pirelli shadow-red lg:col-span-7" />
    </div>
  );
}
