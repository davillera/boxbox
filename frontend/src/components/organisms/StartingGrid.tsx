"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/atoms/Button";
import { GridSlot } from "@/components/molecules/GridSlot";
import { fill, type Dictionary } from "@/dictionaries";
import type { Driver } from "@/lib/api";
import { move, swap } from "@/lib/grid";

type Props = {
  dict: Dictionary["grid"];
  order: Driver[];
  onChange: (next: Driver[]) => void;
  onReset: () => void;
};

/** The staggered two-column F1 grid. Drag to move a driver, or select two to swap them. */
export function StartingGrid({ dict, order, onChange, onReset }: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const [announce, setAnnounce] = useState("");

  const select = (i: number) => {
    if (selected === null) {
      setSelected(i);
      setAnnounce(dict.selected);
      return;
    }
    if (selected !== i) {
      onChange(swap(order, selected, i));
      setAnnounce(
        fill(dict.swapped, {
          a: order[selected].last_name,
          b: order[i].last_name,
        }),
      );
    }
    setSelected(null);
  };

  return (
    <section aria-labelledby="grid-title" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="grid-title" className="text-xl font-sidewall">
            {dict.title}
          </h2>
          <p className="text-sm text-muted">{dict.hint}</p>
        </div>
        <Button
          type="button"
          variant="secondary"
          title={dict.resetHint}
          onClick={() => {
            onReset();
            setSelected(null);
          }}
        >
          <RotateCcw aria-hidden className="size-4" strokeWidth={3} />
          {dict.reset}
        </Button>
      </div>
      <div className="border-3 border-fg bg-ink px-2 pt-4 pb-14 sm:px-5">
        <ol className="grid grid-cols-2 gap-x-4 gap-y-2 sm:gap-x-10 [&>li:nth-child(even)]:translate-y-[55%]">
          {order.map((driver, i) => (
            <GridSlot
              key={driver.driver_ref}
              position={i + 1}
              driver={driver}
              selected={selected === i}
              label={fill(dict.swap, {
                driver: `${driver.first_name} ${driver.last_name}`,
                position: i + 1,
              })}
              onSelect={() => select(i)}
              onDropFrom={(from) => {
                onChange(move(order, from - 1, i));
                setSelected(null);
              }}
            />
          ))}
        </ol>
      </div>
      <p aria-live="polite" className="sr-only">
        {announce}
      </p>
    </section>
  );
}
