import { Droplets, Thermometer, Wind } from "lucide-react";
import { NumberField } from "@/components/atoms/NumberField";
import { SelectField } from "@/components/atoms/SelectField";
import { TrackToggle } from "@/components/molecules/TrackToggle";
import type { Dictionary } from "@/dictionaries";
import type { Circuit } from "@/lib/api";

export type SetupState = {
  circuit: string;
  wet: boolean;
  airTemp: string;
  humidity: string;
  wind: string;
};

type Props = {
  dict: Dictionary["setup"];
  circuits: Circuit[];
  value: SetupState;
  onChange: (next: SetupState) => void;
};

export function RaceSetup({ dict, circuits, value, onChange }: Props) {
  const set = <K extends keyof SetupState>(key: K, v: SetupState[K]) =>
    onChange({ ...value, [key]: v });
  return (
    <div className="flex flex-col gap-5">
      <SelectField
        id="circuit"
        label={dict.circuit}
        value={value.circuit}
        onChange={(v) => set("circuit", v)}
        options={circuits
          .map((c) => ({
            value: c.circuit_ref,
            // Country first: fans think "Japan", not "Suzuka Circuit".
            label: c.country ? `${c.country} — ${c.name}` : c.name,
          }))
          .sort((a, b) => a.label.localeCompare(b.label))}
      />
      <TrackToggle
        legend={dict.conditions}
        dryLabel={dict.dry}
        wetLabel={dict.wet}
        wet={value.wet}
        onChange={(v) => set("wet", v)}
      />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(7.5rem,1fr))] gap-3">
        <NumberField
          id="air-temp"
          label={dict.airTemp}
          unit="°C"
          icon={Thermometer}
          min={-10}
          max={60}
          value={value.airTemp}
          onChange={(v) => set("airTemp", v)}
        />
        <NumberField
          id="humidity"
          label={dict.humidity}
          unit="%"
          icon={Droplets}
          min={0}
          max={100}
          value={value.humidity}
          onChange={(v) => set("humidity", v)}
        />
        <NumberField
          id="wind"
          label={dict.wind}
          unit="m/s"
          icon={Wind}
          min={0}
          max={40}
          step={0.1}
          value={value.wind}
          onChange={(v) => set("wind", v)}
        />
      </div>
    </div>
  );
}
