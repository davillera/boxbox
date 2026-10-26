import { Suspense } from "react";
import { notFound } from "next/navigation";
import { DriverPhoto } from "@/components/atoms/DriverPhoto";
import { OfflineBoard } from "@/components/organisms/OfflineBoard";
import { SiteHeader } from "@/components/organisms/SiteHeader";
import { DashboardTemplate } from "@/components/templates/DashboardTemplate";
import {
  getDictionary,
  hasLocale,
  type Dictionary,
  type Locale,
} from "@/dictionaries";
import { getDrivers } from "@/lib/api";
import { shortTeam } from "@/lib/teams";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/drivers">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return {
    title: `BoxBox · ${dict.drivers.title}`,
    description: dict.drivers.lede,
  };
}

export default async function DriversPage({
  params,
}: PageProps<"/[lang]/drivers">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return (
    <DashboardTemplate
      header={<SiteHeader lang={lang} dict={dict.header} path="/drivers" />}
      title={dict.drivers.title}
      lede={dict.drivers.lede}
    >
      <Suspense
        fallback={
          <div
            aria-busy
            className="h-96 animate-pulse border-3 border-ink bg-panel shadow-hard"
          />
        }
      >
        <Grid lang={lang} dict={dict} />
      </Suspense>
    </DashboardTemplate>
  );
}

async function Grid({ lang, dict }: { lang: Locale; dict: Dictionary }) {
  const drivers = await getDrivers().catch(() => null);
  if (!drivers) return <OfflineBoard dict={dict.errors} lang={lang} />;
  return (
    <>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {drivers.map((d, i) => (
          <li key={d.driver_ref} data-anim="reveal" data-delay={(i % 8) * 40}>
            <a
              href={`/${lang}/drivers/${d.driver_ref}`}
              className="flex h-full items-center gap-3 border-3 border-ink bg-panel p-3 no-underline shadow-hard-sm transition-[translate,box-shadow] hover:-translate-0.5 hover:shadow-hard"
            >
              <DriverPhoto
                driverRef={d.driver_ref}
                teamRef={d.team_ref}
                className="size-16"
              />
              <span className="flex min-w-0 flex-col leading-tight">
                <span className="text-xl font-sidewall">
                  {d.code ?? d.last_name}
                </span>
                <span className="truncate text-sm font-semibold">
                  {d.first_name} {d.last_name}
                </span>
                <span className="text-xs text-muted">
                  {shortTeam(d.team_name)}
                </span>
              </span>
            </a>
          </li>
        ))}
      </ul>
      <p className="max-w-[62ch] text-xs text-muted">
        {dict.drivers.photosNote}
      </p>
    </>
  );
}
