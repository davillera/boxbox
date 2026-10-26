import type { LucideIcon } from "lucide-react";

type Props = {
  id: string;
  label: string;
  unit: string;
  icon: LucideIcon;
  value: string;
  min: number;
  max: number;
  step?: number;
  onChange: (value: string) => void;
};

export function NumberField({
  id,
  label,
  unit,
  icon: Icon,
  value,
  min,
  max,
  step = 1,
  onChange,
}: Props) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label
        htmlFor={id}
        className="flex items-center gap-1.5 text-xs font-bold tracking-wide text-muted uppercase"
      >
        <Icon aria-hidden className="size-4 shrink-0" strokeWidth={2.5} />
        {label}
      </label>
      <div className="flex border-3 border-fg bg-ground focus-within:shadow-hard-sm">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full min-w-0 bg-transparent px-2.5 py-2 text-lg font-extrabold outline-none invalid:text-redline"
        />
        <span
          className="flex items-center border-l-3 border-fg bg-raised px-2 text-sm font-bold"
          aria-hidden
        >
          {unit}
        </span>
      </div>
    </div>
  );
}
