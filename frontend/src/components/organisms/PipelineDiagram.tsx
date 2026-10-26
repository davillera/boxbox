import { ArrowDown, ArrowRight } from "lucide-react";
import { Rich } from "@/components/atoms/Rich";

type Step = { name: string; where: string; detail: string };

/** Five boxes from raw data to this page; a row on wide screens, a column on phones. */
export function PipelineDiagram({ steps }: { steps: Step[] }) {
  return (
    <ol className="grid gap-2 lg:grid-cols-[repeat(5,minmax(0,1fr))] lg:gap-0">
      {steps.map((s, i) => (
        <li
          key={s.name}
          data-anim="reveal"
          data-delay={i * 90}
          className="flex flex-col lg:flex-row"
        >
          <div
            className={`flex min-w-0 flex-1 flex-col gap-2 border-3 border-ink p-3 ${i < 3 ? "bg-panel" : "bg-ink text-chalk"} shadow-hard-sm`}
          >
            <span className="flex items-center gap-2">
              <span className="flex size-7 shrink-0 items-center justify-center border-2 border-ink bg-pirelli text-sm font-black text-ink">
                {i + 1}
              </span>
              <span className="text-lg leading-tight font-sidewall">
                {s.name}
              </span>
            </span>
            <code
              className={`font-mono text-xs ${i < 3 ? "text-muted" : "text-smoke"}`}
            >
              {s.where}
            </code>
            <p className="text-sm leading-snug">
              <Rich text={s.detail} />
            </p>
          </div>
          {i < steps.length - 1 && (
            <span
              aria-hidden
              className="flex shrink-0 items-center justify-center py-1 text-redline lg:px-1 lg:py-0"
            >
              <ArrowDown
                data-anim="nudge"
                data-axis="y"
                className="size-5 lg:hidden"
                strokeWidth={3}
              />
              <ArrowRight
                data-anim="nudge"
                className="hidden size-5 lg:block"
                strokeWidth={3}
              />
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}
