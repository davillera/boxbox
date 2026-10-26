import { Suspense } from "react";
import { notFound } from "next/navigation";
import { CodeBlock } from "@/components/atoms/CodeBlock";
import { Rich } from "@/components/atoms/Rich";
import {
  Callout,
  ExplainerSection,
  Prose,
  Steps,
} from "@/components/molecules/ExplainerSection";
import { FeatureGroups } from "@/components/organisms/FeatureGroups";
import { GuideToc } from "@/components/organisms/GuideToc";
import { ImportanceChart } from "@/components/organisms/ImportanceChart";
import { MetricsExplainer } from "@/components/organisms/MetricsExplainer";
import { OfflineBoard } from "@/components/organisms/OfflineBoard";
import { PipelineDiagram } from "@/components/organisms/PipelineDiagram";
import { SiteHeader } from "@/components/organisms/SiteHeader";
import { WalkForwardDiagram } from "@/components/organisms/WalkForwardDiagram";
import { DashboardTemplate } from "@/components/templates/DashboardTemplate";
import {
  fill,
  getDictionary,
  hasLocale,
  type Dictionary,
  type Locale,
} from "@/dictionaries";
import { getHealth } from "@/lib/api";

export async function generateMetadata({ params }: PageProps<"/[lang]/how">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return { title: `BoxBox · ${dict.how.title}`, description: dict.how.lede };
}

export default async function HowPage({ params }: PageProps<"/[lang]/how">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return (
    <DashboardTemplate
      header={<SiteHeader lang={lang} dict={dict.header} path="/how" />}
      title={dict.how.title}
      lede={dict.how.lede}
    >
      <Suspense
        fallback={
          <div
            aria-busy
            className="h-[60rem] animate-pulse border-3 border-ink bg-panel shadow-hard"
          />
        }
      >
        <Guide lang={lang} dict={dict} />
      </Suspense>
    </DashboardTemplate>
  );
}

// The guide quotes the deployed model's own numbers, so it reads them per request.
async function Guide({ lang, dict }: { lang: Locale; dict: Dictionary }) {
  const health = await getHealth().catch(() => null);
  if (!health?.training) return <OfflineBoard dict={dict.errors} lang={lang} />;
  const h = dict.how;
  const t = health.training;
  const features = h.features.groups.flatMap((g) => g.items);
  const values = {
    rows: t.rows.toLocaleString(lang),
    races: t.races,
    from: t.data_from,
    to: t.data_to,
    trees: t.n_trees,
    backtestRaces: health.backtest.model.races,
    count: features.length,
  };
  const f = (texts: string[]) => texts.map((s) => fill(s, values));

  const chapters = [
    "short",
    "pipeline",
    "data",
    "target",
    "features",
    "model",
    "validation",
    "metrics",
    "normalize",
    "importance",
    "serving",
    "retrain",
    "limits",
    "glossary",
  ] as const;
  const n = (id: (typeof chapters)[number]) => chapters.indexOf(id) + 1;

  return (
    <div className="grid items-start gap-10 lg:grid-cols-12">
      <GuideToc
        chapters={chapters.map((id) => ({
          id,
          n: n(id),
          title: h[id].title,
        }))}
        label={h.toc}
        note={h.readingTime}
        lap={h.lap}
      />

      <article className="flex min-w-0 flex-col gap-12 lg:col-span-9">
        <ExplainerSection
          id="short"
          index={n("short")}
          title={h.short.title}
          body={f(h.short.body)}
        />

        <ExplainerSection
          id="pipeline"
          index={n("pipeline")}
          title={h.pipeline.title}
          body={f(h.pipeline.body)}
        >
          <PipelineDiagram steps={h.pipeline.steps} />
        </ExplainerSection>

        <ExplainerSection
          id="data"
          index={n("data")}
          title={h.data.title}
          body={f(h.data.body)}
        />

        <ExplainerSection
          id="target"
          index={n("target")}
          title={h.target.title}
          body={f(h.target.body)}
        >
          <ol className="grid max-w-[76ch] gap-2 sm:grid-cols-3">
            {h.target.classes.map((c, i) => (
              <li
                key={c.name}
                data-anim="reveal"
                data-delay={i * 90}
                className={`flex flex-col gap-1 border-3 border-ink p-3 shadow-hard-sm ${["bg-redline text-chalk", "bg-pirelli text-ink", "bg-panel"][i]}`}
              >
                <span className="text-base leading-tight font-sidewall">
                  {c.name}
                </span>
                <span className="text-sm leading-snug">{c.detail}</span>
              </li>
            ))}
          </ol>
          <Prose paragraphs={f(h.target.after)} />
        </ExplainerSection>

        <ExplainerSection
          id="features"
          index={n("features")}
          title={h.features.title}
          body={f(h.features.body)}
        >
          <FeatureGroups groups={h.features.groups} />
          <Prose paragraphs={[h.features.tried]} />
          <Callout title={h.features.leakTitle} tone="warn">
            <Prose paragraphs={h.features.leak} />
            <CodeBlock code={h.features.code} />
          </Callout>
          <Callout title={h.features.skewTitle}>
            <Prose paragraphs={h.features.skew} />
          </Callout>
        </ExplainerSection>

        <ExplainerSection
          id="model"
          index={n("model")}
          title={h.model.title}
          body={f(h.model.body)}
        >
          <CodeBlock
            code={h.model.tree.join("\n")}
            caption={h.model.treeCaption}
          />
          <Prose paragraphs={f(h.model.boosting)} />
          <h3 className="text-2xl font-sidewall">{h.model.paramsTitle}</h3>
          <Prose paragraphs={[h.model.paramsIntro]} />
          <dl className="flex max-w-[76ch] flex-col border-3 border-ink bg-panel shadow-hard-sm">
            {h.model.params.map((p) => (
              <div
                key={p.name}
                className="grid gap-1 border-b border-fg/15 px-4 py-3 last:border-b-0 sm:grid-cols-[13rem_1fr] sm:gap-4"
              >
                <dt className="flex flex-col">
                  <code className="font-mono text-sm font-bold">{p.name}</code>
                  <span className="text-lg font-black text-redline tabular-nums">
                    {p.value}
                  </span>
                </dt>
                <dd className="text-sm leading-relaxed">
                  <Rich text={p.what} />
                </dd>
              </div>
            ))}
          </dl>
          <Callout title={h.model.overfitTitle}>
            <Prose paragraphs={h.model.overfit} />
          </Callout>
          <Callout title={h.model.dropoutTitle}>
            <Prose paragraphs={[h.model.dropout]} />
          </Callout>
        </ExplainerSection>

        <ExplainerSection
          id="validation"
          index={n("validation")}
          title={h.validation.title}
          body={f(h.validation.body)}
        >
          <Steps items={h.validation.steps} />
          <WalkForwardDiagram
            caption={h.validation.timelineCaption}
            labels={h.validation}
          />
          <Prose paragraphs={f(h.validation.after)} />
        </ExplainerSection>

        <ExplainerSection
          id="metrics"
          index={n("metrics")}
          title={h.metrics.title}
          body={f(h.metrics.body)}
        >
          <Callout title={h.metrics.baselineTitle}>
            <Prose paragraphs={[h.metrics.baseline]} />
          </Callout>
          <MetricsExplainer
            dict={h.metrics}
            lang={lang}
            backtest={health.backtest}
          />
          <Prose paragraphs={h.metrics.reading} />
        </ExplainerSection>

        <ExplainerSection
          id="normalize"
          index={n("normalize")}
          title={h.normalize.title}
          body={h.normalize.body}
        />

        <ExplainerSection
          id="importance"
          index={n("importance")}
          title={h.importance.title}
          body={h.importance.body}
        >
          <ImportanceChart
            importance={t.feature_importance}
            labels={Object.fromEntries(features.map((x) => [x.key, x.label]))}
            lang={lang}
          />
          <Prose paragraphs={[h.importance.caveat]} />
        </ExplainerSection>

        <ExplainerSection
          id="serving"
          index={n("serving")}
          title={h.serving.title}
          body={h.serving.body}
        />

        <ExplainerSection
          id="retrain"
          index={n("retrain")}
          title={h.retrain.title}
          body={h.retrain.body}
        >
          <Callout title={h.retrain.triggerTitle}>
            <Prose paragraphs={[h.retrain.trigger]} />
          </Callout>
          <h3 className="text-2xl font-sidewall">{h.retrain.stepsTitle}</h3>
          <Steps items={h.retrain.steps} />
          <h3 className="text-2xl font-sidewall">{h.retrain.whyTitle}</h3>
          <Prose paragraphs={h.retrain.why} />
        </ExplainerSection>

        <ExplainerSection
          id="limits"
          index={n("limits")}
          title={h.limits.title}
        >
          <ul className="flex max-w-[68ch] flex-col gap-3">
            {h.limits.items.map((item) => (
              <li
                key={item}
                className="border-l-6 border-redline pl-4 text-lg leading-relaxed"
              >
                <Rich text={item} />
              </li>
            ))}
          </ul>
        </ExplainerSection>

        <ExplainerSection
          id="glossary"
          index={n("glossary")}
          title={h.glossary.title}
        >
          <dl
            data-anim="reveal"
            className="grid gap-px border-3 border-ink bg-ink sm:grid-cols-2"
          >
            {h.glossary.terms.map((g) => (
              <div key={g.term} className="flex flex-col gap-1 bg-panel p-4">
                <dt className="text-lg font-sidewall">{g.term}</dt>
                <dd className="text-sm leading-relaxed">{g.def}</dd>
              </div>
            ))}
          </dl>
        </ExplainerSection>
      </article>
    </div>
  );
}
