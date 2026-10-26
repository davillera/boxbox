"use client";

import { useEffect, useRef, useState } from "react";
import { animate } from "animejs";
import { GripVertical } from "lucide-react";
import { motionOK } from "@/lib/motion";
import { TeamSwatch } from "@/components/atoms/TeamSwatch";
import type { Driver } from "@/lib/api";
import { shortTeam } from "@/lib/teams";

type Props = {
  position: number;
  driver: Driver;
  selected: boolean;
  label: string;
  onSelect: () => void;
  onDropFrom: (fromPosition: number) => void;
};

/** One painted grid box: the position bracket on the tarmac and the driver card inside it. */
export function GridSlot({
  position,
  driver,
  selected,
  label,
  onSelect,
  onDropFrom,
}: Props) {
  const [over, setOver] = useState(false);
  const card = useRef<HTMLButtonElement>(null);
  // The picked car idles on the grid (a sub-degree shimmy) until it is swapped.
  useEffect(() => {
    if (!selected || !card.current || !motionOK()) return;
    const idle = animate(card.current, {
      rotate: [-0.6, 0.6],
      duration: 90,
      loop: true,
      alternate: true,
      ease: "linear",
    });
    return () => {
      idle.revert();
    };
  }, [selected]);
  return (
    <li
      className="relative pt-5"
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const from = Number(e.dataTransfer.getData("text/plain"));
        if (from && from !== position) onDropFrom(from);
      }}
    >
      <span
        aria-hidden
        className={`absolute inset-x-0 top-0 h-[70%] border-x-3 border-t-3 transition-colors ${over ? "border-pirelli" : "border-chalk/70"}`}
      />
      <span
        aria-hidden
        className="absolute top-0.5 left-2 text-xs font-sidewall text-chalk"
      >
        P{position}
      </span>
      <button
        ref={card}
        type="button"
        draggable
        aria-pressed={selected}
        aria-label={label}
        onClick={onSelect}
        onDragStart={(e) => {
          e.dataTransfer.setData("text/plain", String(position));
          e.dataTransfer.effectAllowed = "move";
        }}
        className={`relative mx-1.5 mb-1.5 flex w-[calc(100%-0.75rem)] cursor-grab items-center gap-2 border-3 border-ink px-2 py-1.5 text-left text-ink transition-[translate,box-shadow,background-color] duration-150 ease-out active:cursor-grabbing ${
          selected
            ? "-translate-0.5 bg-pirelli shadow-red"
            : "bg-chalk shadow-[3px_3px_0_0_var(--color-smoke)] hover:-translate-0.5 hover:shadow-[3px_3px_0_0_var(--color-pirelli)]"
        }`}
      >
        <TeamSwatch teamRef={driver.team_ref} />
        <span className="flex min-w-0 flex-1 flex-col leading-tight">
          <span className="text-base font-sidewall">
            {driver.code ?? driver.last_name.slice(0, 3)}
          </span>
          <span className="text-[11px] font-semibold whitespace-nowrap text-ink/70 sm:text-xs">
            {shortTeam(driver.team_name)}
          </span>
        </span>
        <GripVertical
          aria-hidden
          className="hidden size-4 shrink-0 text-ink/60 sm:block"
        />
      </button>
    </li>
  );
}
