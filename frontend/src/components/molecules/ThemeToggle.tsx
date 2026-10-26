"use client";

import { animate } from "animejs";
import { Moon, Sun } from "lucide-react";
import { motionOK } from "@/lib/motion";

/** Flips <html data-theme>; the inline script in layout.tsx restores it before paint. */
export function ThemeToggle({ label }: { label: string }) {
  const toggle = (button: HTMLButtonElement) => {
    const root = document.documentElement;
    const next = root.dataset.theme === "light" ? "dark" : "light";
    root.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {}
    // The new icon spins in like a wheel nut on a pit stop.
    if (motionOK())
      animate(button.querySelectorAll("svg"), {
        rotate: [-180, 0],
        scale: [0.4, 1],
        duration: 520,
        ease: "outBack(1.8)",
      });
  };
  return (
    <button
      type="button"
      onClick={(e) => toggle(e.currentTarget)}
      aria-label={label}
      title={label}
      className="flex size-10 items-center justify-center border-3 border-fg bg-ground shadow-hard-sm transition-[translate,box-shadow] duration-150 hover:-translate-0.5 hover:shadow-hard active:translate-0.5 active:shadow-none"
    >
      <Sun aria-hidden className="size-5 light:hidden" strokeWidth={2.5} />
      <Moon
        aria-hidden
        className="hidden size-5 light:block"
        strokeWidth={2.5}
      />
    </button>
  );
}
