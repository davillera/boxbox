const RACES = 10;
const FIRST_TEST = 5;

/**
 * Walk-forward at a glance: one line per backtest step. Every race before the
 * predicted one is training data; the ones after it do not exist yet.
 */
export function WalkForwardDiagram({
  caption,
  labels,
}: {
  caption: string;
  labels: { train: string; predict: string; future: string };
}) {
  const steps = Array.from(
    { length: RACES - FIRST_TEST },
    (_, i) => FIRST_TEST + i,
  );
  return (
    <figure
      data-anim="timing"
      className="flex max-w-[76ch] flex-col gap-3 border-3 border-ink bg-panel p-4 shadow-hard-sm"
    >
      <div aria-hidden className="flex flex-col gap-1.5">
        {steps.map((test) => (
          <div key={test} className="grid grid-cols-10 gap-1">
            {Array.from({ length: RACES }, (_, race) => (
              <span
                key={race}
                data-cell
                data-sector={race === test ? "" : undefined}
                className={`h-5 origin-left border-2 ${
                  race < test
                    ? "border-fg bg-fg"
                    : race === test
                      ? "border-ink bg-pirelli"
                      : "border-dashed border-fg/40"
                }`}
              />
            ))}
          </div>
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm font-semibold">
        <li className="flex items-center gap-2">
          <span className="size-3.5 border-2 border-fg bg-fg" />
          {labels.train}
        </li>
        <li className="flex items-center gap-2">
          <span className="size-3.5 border-2 border-ink bg-pirelli" />
          {labels.predict}
        </li>
        <li className="flex items-center gap-2">
          <span className="size-3.5 border-2 border-dashed border-fg/40" />
          {labels.future}
        </li>
      </ul>
      <figcaption className="text-xs text-muted">{caption}</figcaption>
    </figure>
  );
}
