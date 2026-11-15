"use client";

import {
  ArrowDown10,
  CloudRain,
  Flame,
  RotateCcw,
  Shuffle,
  Zap,
} from "lucide-react";
import type { Dictionary } from "@/dictionaries";
import type { ChaosPreset } from "@/lib/scenarios";

interface Props {
  activePreset: ChaosPreset;
  onSelectPreset: (preset: ChaosPreset) => void;
  onReset: () => void;
  dict: Dictionary["chaos"];
  disabled?: boolean;
}

export function ChaosToolbar({
  activePreset,
  onSelectPreset,
  onReset,
  dict,
  disabled = false,
}: Props) {
  const PRESETS: {
    id: Exclude<ChaosPreset, null>;
    label: string;
    desc: string;
    icon: typeof CloudRain;
    activeClass: string;
  }[] = [
    {
      id: "rain",
      label: dict.rain,
      desc: dict.rainDesc,
      icon: CloudRain,
      activeClass: "bg-wet text-white border-wet shadow-[3px_3px_0_0_#0d0d0d]",
    },
    {
      id: "polePenalty",
      label: dict.polePenalty,
      desc: dict.polePenaltyDesc,
      icon: ArrowDown10,
      activeClass:
        "bg-redline text-white border-redline shadow-[3px_3px_0_0_#0d0d0d]",
    },
    {
      id: "reverseTop10",
      label: dict.reverseTop10,
      desc: dict.reverseTop10Desc,
      icon: Shuffle,
      activeClass: "bg-pirelli text-ink border-ink shadow-[3px_3px_0_0_#0d0d0d]",
    },
    {
      id: "heatwave",
      label: dict.heatwave,
      desc: dict.heatwaveDesc,
      icon: Flame,
      activeClass:
        "bg-amber-500 text-ink border-ink shadow-[3px_3px_0_0_#0d0d0d]",
    },
  ];

  return (
    <section
      aria-label={dict.title}
      className="border-3 border-fg bg-panel p-3 shadow-hard-sm transition-shadow hover:shadow-hard"
    >
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 border-b-2 border-fg/20 pb-2">
        <div className="flex items-center gap-2">
          <Zap className="size-4 fill-pirelli text-pirelli" />
          <h2 className="text-xs font-black tracking-wider uppercase italic">
            {dict.title}
          </h2>
        </div>
        <p className="text-muted text-[11px] font-medium tracking-tight">
          {dict.hint}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map((preset) => {
          const Icon = preset.icon;
          const isActive = activePreset === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              disabled={disabled}
              title={preset.desc}
              aria-pressed={isActive}
              onClick={() => onSelectPreset(preset.id)}
              className={`inline-flex items-center gap-1.5 border-2 px-2.5 py-1 text-xs font-black tracking-wide uppercase italic transition-[translate,box-shadow,background-color] duration-100 ease-out hover:-translate-0.5 active:translate-0.5 disabled:pointer-events-none disabled:opacity-50 ${
                isActive
                  ? preset.activeClass
                  : "border-fg/40 bg-raised text-fg hover:border-fg hover:bg-ground hover:shadow-hard-sm"
              }`}
            >
              <Icon className="size-3.5 shrink-0" />
              <span>{preset.label}</span>
            </button>
          );
        })}

        <button
          type="button"
          disabled={disabled || activePreset === null}
          title={dict.resetDesc}
          onClick={onReset}
          className="ml-auto inline-flex items-center gap-1.5 border-2 border-fg/30 bg-ground px-2.5 py-1 text-xs font-bold tracking-wide uppercase italic text-muted transition-[translate,box-shadow,color] duration-100 hover:-translate-0.5 hover:border-fg hover:text-fg hover:shadow-hard-sm active:translate-0.5 disabled:pointer-events-none disabled:opacity-40"
        >
          <RotateCcw className="size-3.5 shrink-0" />
          <span>{dict.reset}</span>
        </button>
      </div>
    </section>
  );
}
