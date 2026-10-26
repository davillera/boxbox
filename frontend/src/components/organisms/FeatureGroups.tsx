import { Rich } from "@/components/atoms/Rich";

type Group = {
  name: string;
  items: { key: string; label: string; what: string }[];
};

/** The model's inputs, grouped by the question each one answers. */
export function FeatureGroups({ groups }: { groups: Group[] }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {groups.map((g, i) => (
        <section
          key={g.name}
          data-anim="reveal"
          data-delay={i * 80}
          className="flex flex-col border-3 border-ink bg-panel shadow-hard-sm"
        >
          <h3 className="border-b-3 border-ink bg-fg px-3 py-2 text-lg font-sidewall text-ground">
            {g.name}
          </h3>
          <dl className="flex flex-col">
            {g.items.map((f) => (
              <div
                key={f.key}
                className="flex flex-col gap-1 border-b border-fg/15 px-3 py-2.5 last:border-b-0"
              >
                <dt className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-extrabold">{f.label}</span>
                  <code className="font-mono text-xs text-muted">{f.key}</code>
                </dt>
                <dd className="text-sm leading-snug">
                  <Rich text={f.what} />
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
