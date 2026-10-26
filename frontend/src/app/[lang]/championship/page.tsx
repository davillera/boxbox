import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ProbabilityBar } from "@/components/atoms/ProbabilityBar";
import { SiteHeader } from "@/components/organisms/SiteHeader";
import { DashboardTemplate } from "@/components/templates/DashboardTemplate";
import {
  fill,
  getDictionary,
  hasLocale,
  type Dictionary,
  type Locale,
} from "@/dictionaries";
import { getChampionship } from "@/lib/api";
import { pct, shortTeam } from "@/lib/teams";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/championship">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return {
    title: `BoxBox · ${dict.header.championship}`,
    description: dict.championship.sub,
  };
}

export default async function ChampionshipPage({
  params,
}: PageProps<"/[lang]/championship">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return (
    <DashboardTemplate
      header={
        <SiteHeader lang={lang} dict={dict.header} path="/championship" />
      }
      title={dict.championship.title}
      lede={dict.championship.sub}
    >
      <Suspense
        fallback={
          <div
            aria-busy
            className="h-[40rem] animate-pulse border-3 border-ink bg-panel shadow-hard"
          />
        }
      >
        <Odds lang={lang} dict={dict} />
      </Suspense>
    </DashboardTemplate>
  );
}

async function Odds({ lang, dict }: { lang: Locale; dict: Dictionary }) {
  const c = await getChampionship().catch(() => null);
  const t = dict.championship;
  if (!c)
    return (
      <p className="border-3 border-fg bg-raised p-4 text-base font-semibold">
        {t.unavailable}
      </p>
    );
  const num = (v: number) =>
    v.toLocaleString(lang, { maximumFractionDigits: 0 });
  const contenders = c.drivers.filter(
    (d) => d.title_probability > 0 || d.points > 0,
  );
  const top = Math.max(...contenders.map((d) => d.title_probability), 0.01);
  return (
    <div className="grid items-start gap-8 lg:grid-cols-12 lg:gap-10">
      <section
        data-anim="reveal"
        aria-labelledby="odds-title"
        className="border-3 border-ink bg-panel shadow-hard lg:col-span-8"
      >
        <div className="flex flex-col gap-1 border-b-3 border-fg px-4 py-3">
          <h2 id="odds-title" className="text-xl font-sidewall">
            {dict.header.championship} {c.season}
          </h2>
          <p className="text-sm text-muted">
            {c.remaining_races
              ? fill(t.lede, {
                  sims: num(c.simulations),
                  races: c.remaining_races,
                  season: c.season,
                })
              : t.none}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b-3 border-fg bg-raised text-xs font-extrabold tracking-wide uppercase">
                <th scope="col" className="w-10 px-2 py-2 sm:px-3">
                  #
                </th>
                <th scope="col" className="px-2 py-2 sm:px-3">
                  {t.driver}
                </th>
                <th scope="col" className="px-2 py-2 text-right sm:px-3">
                  {t.points}
                </th>
                <th scope="col" className="px-2 py-2 sm:w-[34%] sm:px-3">
                  {t.titleOdds}
                </th>
                <th
                  scope="col"
                  className="hidden px-3 py-2 text-right md:table-cell"
                >
                  {t.range}
                </th>
              </tr>
            </thead>
            <tbody>
              {contenders.map((d, i) => (
                <tr
                  key={d.driver_ref}
                  className="border-b border-fg/15 last:border-b-0 hover:bg-raised"
                >
                  <td className="px-2 py-1.5 text-base font-sidewall tabular-nums sm:px-3">
                    {i + 1}
                  </td>
                  <th scope="row" className="px-2 py-1.5 font-normal sm:px-3">
                    <a
                      href={`/${lang}/drivers/${d.driver_ref}`}
                      className="flex flex-col leading-tight no-underline hover:underline"
                    >
                      <span className="text-base font-sidewall">
                        {d.code ?? d.driver_name}
                      </span>
                      <span className="text-[11px] text-muted sm:text-xs">
                        {d.driver_name} · {shortTeam(d.team_name)}
                      </span>
                    </a>
                  </th>
                  <td className="px-2 py-1.5 text-right text-sm font-bold tabular-nums sm:px-3">
                    {num(d.points)}
                  </td>
                  <td className="px-2 py-1.5 sm:px-3">
                    <ProbabilityBar
                      tone="win"
                      value={d.title_probability}
                      scale={top}
                      label={pct(d.title_probability, lang)}
                      delay={i * 25}
                    />
                  </td>
                  <td className="hidden px-3 py-1.5 text-right text-sm tabular-nums md:table-cell">
                    {num(d.points_p10)}–{num(d.points_p90)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <aside
        data-anim="reveal"
        data-delay={120}
        className="flex flex-col gap-2 border-3 border-ink bg-panel p-4 shadow-hard sm:p-5 lg:col-span-4"
      >
        <h2 className="text-xl font-sidewall">{t.method}</h2>
        <p className="text-sm leading-relaxed text-muted">{t.methodBody}</p>
      </aside>
    </div>
  );
}
