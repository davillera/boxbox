import type { ReactNode } from "react";
import { Rich } from "@/components/atoms/Rich";

/** A numbered chapter of the model guide: tyre-yellow number, sidewall title, prose paragraphs. */
export function ExplainerSection({
  id,
  index,
  title,
  body = [],
  children,
}: {
  id: string;
  index: number;
  title: string;
  body?: string[];
  children?: ReactNode;
}) {
  return (
    <section
      data-anim="reveal"
      id={id}
      aria-labelledby={`${id}-title`}
      className="flex min-w-0 scroll-mt-6 flex-col gap-5 border-t-3 border-fg pt-8"
    >
      <h2
        id={`${id}-title`}
        className="flex items-baseline gap-3 text-2xl leading-tight font-sidewall text-balance hyphens-auto sm:text-4xl"
      >
        <span className="shrink-0 border-3 border-ink bg-pirelli px-2 text-xl text-ink sm:text-2xl">
          {String(index).padStart(2, "0")}
        </span>
        {title}
      </h2>
      <Prose paragraphs={body} />
      {children}
    </section>
  );
}

export function Prose({ paragraphs }: { paragraphs: string[] }) {
  return paragraphs.map((p) => (
    <p key={p} className="max-w-[68ch] text-lg leading-relaxed text-pretty">
      <Rich text={p} />
    </p>
  ));
}

/** Numbered procedure: yellow position boards down the left. */
export function Steps({ items }: { items: string[] }) {
  return (
    <ol className="flex max-w-[68ch] list-none flex-col gap-2.5">
      {items.map((s, i) => (
        <li
          key={s}
          data-anim="reveal"
          data-delay={i * 60}
          className="flex gap-3 text-lg leading-snug"
        >
          <span className="flex size-7 shrink-0 items-center justify-center border-2 border-ink bg-pirelli text-sm font-black text-ink">
            {i + 1}
          </span>
          <span>
            <Rich text={s} />
          </span>
        </li>
      ))}
    </ol>
  );
}

/** A boxed aside inside a chapter (rules, tricks, caveats). */
export function Callout({
  title,
  tone = "panel",
  children,
}: {
  title: string;
  tone?: "panel" | "warn";
  children: ReactNode;
}) {
  return (
    <aside
      data-anim="reveal"
      className={`flex max-w-[76ch] min-w-0 flex-col gap-3 border-3 border-ink p-4 sm:p-5 ${tone === "warn" ? "bg-pirelli text-ink shadow-red" : "bg-panel shadow-hard"}`}
    >
      <h3 className="text-xl font-sidewall">{title}</h3>
      {children}
    </aside>
  );
}
