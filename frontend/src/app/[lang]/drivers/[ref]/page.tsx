import { Suspense } from "react";
import { notFound } from "next/navigation";
import { TeamSwatch } from "@/components/atoms/TeamSwatch";
import { SiteHeader } from "@/components/organisms/SiteHeader";
import { DashboardTemplate } from "@/components/templates/DashboardTemplate";
import {
  fill,
  getDictionary,
  hasLocale,
  type Dictionary,
  type Locale,
} from "@/dictionaries";
import { getDriverDetail } from "@/lib/api";
import { pct, shortTeam } from "@/lib/teams";

// Ergast letters for unclassified cars.
const OUT: Record<string, string> = {
  R: "DNF",
  D: "DSQ",
  W: "DNS",
  N: "NC",
  E: "EX",
  F: "DNQ",
};

// `ref` is only known per request, so everything that reads it streams inside Suspense.
export default function DriverPage({
  params,
}: PageProps<"/[lang]/drivers/[ref]">) {
  return (
    <Suspense
      fallback={
        <div
          aria-busy
          className="m-4 h-96 animate-pulse border-3 border-ink bg-panel shadow-hard"
        />
      }
    >
      <DriverView params={params} />
    </Suspense>
  );
}

async function DriverView({
  params,
}: {
  params: PageProps<"/[lang]/drivers/[ref]">["params"];
}) {
  const { lang, ref } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return (
    <DashboardTemplate
      header={<SiteHeader lang={lang} dict={dict.header} path="/drivers" />}
      title={ref.replaceAll("_", " ")}
      lede={dict.drivers.lede}
    >
      <Sheet lang={lang} dict={dict} driverRef={ref} />
    </DashboardTemplate>
  );
}

async function Sheet({
  lang,
  dict,
  driverRef,
}: {
  lang: Locale;
  dict: Dictionary;
  driverRef: string;
}) {
  const t = dict.drivers;
  const d = await getDriverDetail(driverRef).catch(() => null);
  if (!d)
    return (
      <p className="border-3 border-fg bg-raised p-4 text-base font-semibold">
        {t.notFound}
      </p>
    );
  const stats: [string, string | number][] = [
    [fill(t.season, { season: d.season }), ""],
    [t.points, d.season_points.toLocaleString(lang)],
    [t.wins, d.season_wins],
    [t.podiums, d.season_podiums],
  ];
  const career: [string, number][] = [
    [t.races, d.races],
    [t.wins, d.wins],
    [t.podiums, d.podiums],
  ];
  return (
    <div className="grid items-start gap-8 lg:grid-cols-12 lg:gap-10">
      <div className="flex min-w-0 flex-col gap-6 lg:col-span-8">
        <section
          data-anim="reveal"
          className="flex flex-wrap items-center gap-4 border-3 border-ink bg-pirelli p-4 text-ink shadow-red"
        >
          <TeamSwatch teamRef={d.team_ref} />
          <div className="flex min-w-0 flex-col leading-tight">
            <p className="text-3xl font-sidewall">{d.code ?? d.name}</p>
            <p className="text-base font-bold">
              {d.name} · {shortTeam(d.team_name)}
            </p>
          </div>
          <dl className="ml-auto grid grid-cols-3 gap-x-5 gap-y-1 text-right">
            {stats.slice(1).map(([label, value]) => (
              <div key={label} className="flex flex-col">
                <dt className="text-xs font-bold tracking-wide uppercase">
                  {label}
                </dt>
                <dd className="text-2xl font-black italic tabular-nums">
                  {value}
                </dd>
              </div>
            ))}
            <p className="col-span-3 text-xs font-bold">{stats[0][0]}</p>
          </dl>
        </section>

        <section
          data-anim="reveal"
          aria-labelledby="recent-title"
          className="border-3 border-ink bg-panel shadow-hard"
        >
          <div className="flex flex-col gap-1 border-b-3 border-fg px-4 py-3">
            <h2 id="recent-title" className="text-xl font-sidewall">
              {t.recent}
            </h2>
            <p className="text-sm text-muted">{t.modelHint}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b-3 border-fg bg-raised text-xs font-extrabold tracking-wide uppercase">
                  <th scope="col" className="px-3 py-2">
                    {t.race}
                  </th>
                  <th scope="col" className="px-3 py-2 text-right">
                    {t.grid}
                  </th>
                  <th scope="col" className="px-3 py-2 text-right">
                    {t.finish}
                  </th>
                  <th scope="col" className="px-3 py-2 text-right">
                    {t.model}
                  </th>
                </tr>
              </thead>
              <tbody>
                {d.recent.map((r) => (
                  <tr
                    key={`${r.season}-${r.round}`}
                    className="border-b border-fg/15 last:border-b-0 hover:bg-raised"
                  >
                    <th
                      scope="row"
                      className="px-3 py-1.5 text-sm font-semibold"
                    >
                      <span className="text-xs text-muted">
                        {r.season} R{r.round} ·{" "}
                      </span>
                      {r.name}
                    </th>
                    <td className="px-3 py-1.5 text-right text-sm font-bold tabular-nums">
                      {r.grid ? `P${r.grid}` : "PL"}
                    </td>
                    <td className="px-3 py-1.5 text-right text-sm font-black tabular-nums">
                      {/^\d+$/.test(r.status) ? (
                        `P${r.status}`
                      ) : (
                        <span className="text-redline">
                          {OUT[r.status] ?? r.status}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-1.5 text-right text-sm tabular-nums">
                      {r.model_win_probability === null
                        ? "—"
                        : pct(r.model_win_probability, lang)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div className="flex min-w-0 flex-col gap-6 lg:col-span-4">
        <section
          data-anim="reveal"
          data-delay={100}
          className="flex flex-col gap-3 border-3 border-ink bg-panel p-4 shadow-hard sm:p-5"
        >
          <h2 className="text-xl font-sidewall">{t.career}</h2>
          <dl className="grid grid-cols-3 gap-2">
            {career.map(([label, value]) => (
              <div key={label} className="flex flex-col">
                <dt className="text-xs font-bold tracking-wide text-muted uppercase">
                  {label}
                </dt>
                <dd className="text-3xl font-black italic tabular-nums">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </section>
        {d.circuits.length > 0 && (
          <section
            data-anim="reveal"
            data-delay={160}
            className="flex flex-col gap-3 border-3 border-ink bg-panel p-4 shadow-hard sm:p-5"
          >
            <h2 className="text-xl font-sidewall">{t.circuits}</h2>
            <ul className="flex flex-col gap-2">
              {d.circuits.map((c) => (
                <li
                  key={c.circuit_ref}
                  className="flex items-baseline justify-between gap-3 border-b border-fg/15 pb-1.5 last:border-b-0"
                >
                  <span className="min-w-0 truncate text-sm font-semibold">
                    {c.circuit_name}
                  </span>
                  <span className="text-xs whitespace-nowrap text-muted tabular-nums">
                    {t.avg} P{c.avg_finish.toLocaleString(lang)} · {t.best} P
                    {c.best_finish} · {c.races}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
        <a
          href={`/${lang}/drivers`}
          className="text-sm font-bold underline decoration-redline decoration-3"
        >
          ← {t.back}
        </a>
      </div>
    </div>
  );
}
