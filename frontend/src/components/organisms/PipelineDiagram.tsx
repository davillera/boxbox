import { Rich } from "@/components/atoms/Rich";

type Step = { name: string; where: string; detail: string };

/** Five boxes from raw data to this page; mobile-first grid that scales to 5 columns on desktop. */
export function PipelineDiagram({ steps }: { steps: Step[] }) {
  return (
    <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 xl:gap-2">
      {steps.map((s, i) => (
        <li
          key={s.name}
          data-anim="reveal"
          data-delay={i * 90}
          className="relative flex flex-col"
        >
          <div
            className={`flex h-full min-w-0 flex-1 flex-col gap-2.5 overflow-hidden border-3 border-ink p-3.5 sm:p-4 ${
              i < 3 ? "bg-panel text-fg" : "bg-ink text-chalk"
            } shadow-hard-sm`}
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex size-7 shrink-0 items-center justify-center border-2 border-ink bg-pirelli text-xs font-black text-ink shadow-[1px_1px_0_0_#0d0d0d]">
                {i + 1}
              </span>
              <h4 className="min-w-0 flex-1 text-sm leading-tight font-sidewall break-words sm:text-base xl:text-sm 2xl:text-base">
                {s.name}
              </h4>
            </div>
            <code
              className={`truncate rounded-xs px-1 py-0.5 font-mono text-[11px] ${
                i < 3 ? "bg-raised text-muted" : "bg-neutral-800 text-smoke"
              }`}
            >
              {s.where}
            </code>
            <p className="text-xs leading-snug text-pretty sm:text-sm">
              <Rich text={s.detail} />
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
