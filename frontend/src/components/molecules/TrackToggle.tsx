import { CloudRain, Sun } from "lucide-react";

type Props = {
  legend: string;
  dryLabel: string;
  wetLabel: string;
  wet: boolean;
  onChange: (wet: boolean) => void;
};

export function TrackToggle({
  legend,
  dryLabel,
  wetLabel,
  wet,
  onChange,
}: Props) {
  const options = [
    { wet: false, label: dryLabel, Icon: Sun, on: "bg-pirelli text-ink" },
    { wet: true, label: wetLabel, Icon: CloudRain, on: "bg-wet text-chalk" },
  ];
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-xs font-bold tracking-wide text-muted uppercase">
        {legend}
      </legend>
      <div className="grid grid-cols-2 border-3 border-fg bg-ground">
        {options.map(({ wet: value, label, Icon, on }) => (
          <label
            key={label}
            className={`flex cursor-pointer items-center justify-center gap-2 py-2.5 text-base font-black uppercase italic transition-colors duration-150 not-first:border-l-3 not-first:border-fg has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-wet ${wet === value ? on : "hover:bg-raised"}`}
          >
            <input
              type="radio"
              name="track"
              className="sr-only"
              checked={wet === value}
              onChange={() => onChange(value)}
            />
            <Icon aria-hidden className="size-5" strokeWidth={2.5} />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
