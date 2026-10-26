import { ChevronDown } from "lucide-react";

type Props = {
  id: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
};

/** Native select; `.brutal-select` themes its picker where the browser allows it (globals.css). */
export function SelectField({ id, label, value, options, onChange }: Props) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-xs font-bold tracking-wide text-muted uppercase"
      >
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="brutal-select w-full cursor-pointer appearance-none border-3 border-fg bg-ground py-2.5 pr-12 pl-3 text-lg font-extrabold text-fg outline-none open:shadow-hard-sm hover:bg-panel focus-visible:shadow-hard-sm"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-0 flex w-10 items-center justify-center border-l-3 border-fg bg-pirelli text-ink">
          <ChevronDown aria-hidden className="size-5" strokeWidth={3} />
        </span>
      </div>
    </div>
  );
}
