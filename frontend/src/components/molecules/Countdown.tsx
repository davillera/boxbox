"use client";

import { useEffect, useState } from "react";
import { Timer } from "lucide-react";

const MINUTE = 60_000;

/** Time left until `to`, ticking once a minute. Empty on the server so it never mismatches. */
export function Countdown({ to, label }: { to: string; label: string }) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setLeft(new Date(to).getTime() - Date.now());
    tick();
    const id = setInterval(tick, MINUTE);
    return () => clearInterval(id);
  }, [to]);
  if (left === null || left <= 0) return null;
  const minutes = Math.floor(left / MINUTE);
  const [d, h, m] = [
    Math.floor(minutes / 1440),
    Math.floor((minutes % 1440) / 60),
    minutes % 60,
  ];
  return (
    <p className="flex items-center gap-2 text-sm font-bold">
      <Timer aria-hidden className="size-4 shrink-0" strokeWidth={3} />
      <span>{label}</span>
      <span className="font-sidewall tabular-nums">
        {d > 0 && `${d}d `}
        {h}h {String(m).padStart(2, "0")}m
      </span>
    </p>
  );
}
