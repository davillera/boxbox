import { Suspense } from "react";
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

export default async function Page({ params }: PageProps<"/[lang]">) {
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
        <Workbench lang={lang} dict={dict} />
      </Suspense>
    </DashboardTemplate>
  );
}

// Catalog is read per request so a retrained model shows up without a rebuild.
async function Workbench({ lang, dict }: { lang: Locale; dict: Dictionary }) {
  const catalog = await getCatalog().catch(() => null);
  if (!catalog) return <OfflineBoard dict={dict.errors} lang={lang} />;
  return <PredictionWorkbench lang={lang} dict={dict} {...catalog} />;
}

function WorkbenchSkeleton() {
  return (
    <div aria-busy className="grid gap-8 lg:grid-cols-12 lg:gap-10">
      <div className="h-[56rem] animate-pulse border-3 border-ink bg-panel shadow-hard lg:col-span-5" />
      <div className="h-80 animate-pulse border-3 border-ink bg-pirelli shadow-red lg:col-span-7" />
    </div>
  );
}
