"use client";

import { useEffect, useRef, useState } from "react";
import { animate, utils } from "animejs";
import { Flag } from "lucide-react";
import { fill } from "@/dictionaries";
import { motionOK } from "@/lib/motion";

type Chapter = { id: string; n: number; title: string };

const pad = (n: number) => String(n).padStart(2, "0");
// A chapter is "current" once its top passes this share of the viewport.
const READING_LINE = 0.3;

/**
 * Scroll-spy index for the model guide: a yellow marker slides to the chapter in
 * view, and a car laps a track as the reader moves through the article.
 * Phones get the same lap as a bar pinned to the top.
 */
export function GuideToc({
  chapters,
  label,
  note,
  lap,
}: {
  chapters: Chapter[];
  label: string;
  note: string;
  /** "Lap {n} of {total}" */
  lap: string;
}) {
  const [active, setActive] = useState(0);
  const list = useRef<HTMLOListElement>(null);
  const marker = useRef<HTMLSpanElement>(null);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const line = innerHeight * READING_LINE;
      const tops = chapters.map(
        (c) =>
          document.getElementById(c.id)?.getBoundingClientRect().top ??
          Infinity,
      );
      setActive(
        Math.max(
          0,
          tops.findLastIndex((t) => t <= line),
        ),
      );
      const first = document.getElementById(chapters[0].id);
      const last = document.getElementById(chapters.at(-1)!.id);
      if (!first || !last) return;
      const start = first.getBoundingClientRect().top + scrollY - line;
      const end = last.getBoundingClientRect().bottom + scrollY - innerHeight;
      const progress = utils.clamp(
        (scrollY - start) / (end - start || 1),
        0,
        1,
      );
      // Scroll-linked, so it is set every frame rather than tweened.
      utils.set(root.current?.querySelectorAll("[data-car]") ?? [], {
        left: `${progress * 100}%`,
      });
    };
    const onScroll = () => {
      frame ||= requestAnimationFrame(measure);
    };
    measure();
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener("scroll", onScroll);
      removeEventListener("resize", onScroll);
    };
  }, [chapters]);

  // The marker drives to the current chapter like a car changing position on the timing tower.
  useEffect(() => {
    const item = list.current?.children[active] as HTMLElement | undefined;
    if (!item || !marker.current) return;
    animate(marker.current, {
      y: item.offsetTop,
      height: item.offsetHeight,
      duration: motionOK() ? 420 : 0,
      ease: "outBack(1.3)",
    });
  }, [active]);

  const current = chapters[active];
  const lapText = fill(lap, { n: current.n, total: chapters.length });
  const track = (
    <span className="relative block h-3 border-2 border-fg bg-ground">
      {/* Racing line down the middle of the tarmac. */}
      <span className="absolute inset-x-1 top-1/2 h-px -translate-y-1/2 border-t border-dashed border-fg/40" />
      <span
        data-car
        className="absolute top-1/2 h-2.5 w-4 -translate-x-1/2 -translate-y-1/2 -skew-x-12 border border-ink bg-redline"
      />
      <Flag
        aria-hidden
        className="absolute top-1/2 -right-5 size-4 -translate-y-1/2"
        strokeWidth={3}
      />
    </span>
  );

  return (
    <div ref={root} className="contents">
      {/* Phones: the lap rides along at the top of the screen. */}
      <div className="sticky top-0 z-30 -mx-4 flex flex-col gap-1.5 border-b-3 border-fg bg-ground px-4 py-2 sm:-mx-6 sm:px-6 lg:hidden">
        <p className="flex items-baseline justify-between gap-3 text-sm">
          <span className="truncate font-black">
            <span className="mr-1.5 bg-pirelli px-1 text-ink">
              {pad(current.n)}
            </span>
            {current.title}
          </span>
          <span className="shrink-0 text-xs font-bold text-muted uppercase">
            {lapText}
          </span>
        </p>
        <span className="pr-5">{track}</span>
      </div>

      <nav
        aria-labelledby="toc-title"
        className="border-3 border-ink bg-panel p-4 shadow-hard lg:sticky lg:top-6 lg:col-span-3"
      >
        <h2
          id="toc-title"
          className="mb-2 text-xs font-extrabold tracking-wide text-muted uppercase"
        >
          {label}
        </h2>
        <div className="relative">
          <span
            ref={marker}
            aria-hidden
            className="absolute top-0 left-0 hidden w-full border-l-4 border-redline bg-pirelli lg:block"
          />
          <ol
            ref={list}
            className="relative grid gap-x-4 sm:grid-cols-2 lg:grid-cols-1"
          >
            {chapters.map((c, i) => (
              <li key={c.id}>
                <a
                  href={`#${c.id}`}
                  aria-current={i === active ? "location" : undefined}
                  className="flex gap-2 py-1 pl-2 text-sm font-semibold transition-colors hover:text-redline aria-[current=location]:font-black lg:aria-[current=location]:text-ink lg:aria-[current=location]:hover:text-ink"
                >
                  <span className="w-5 shrink-0 font-black tabular-nums">
                    {pad(c.n)}
                  </span>
                  {c.title}
                </a>
              </li>
            ))}
          </ol>
        </div>
        <div className="mt-4 hidden flex-col gap-2 border-t border-fg/15 pt-3 lg:flex">
          <span className="text-xs font-extrabold tracking-wide uppercase">
            {lapText}
          </span>
          <span className="pr-5">{track}</span>
        </div>
        <p className="mt-3 border-t border-fg/15 pt-3 text-xs leading-relaxed text-muted">
          {note}
        </p>
      </nav>
    </div>
  );
}
