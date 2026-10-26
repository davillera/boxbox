"use client";

import { useRef, useState, useTransition } from "react";
import { Flag, LoaderCircle } from "lucide-react";
import { predictRace } from "@/app/[lang]/actions";
import { Button } from "@/components/atoms/Button";
import { PitBoard } from "@/components/organisms/PitBoard";
import { RaceSetup, type SetupState } from "@/components/organisms/RaceSetup";
import { ResultsTable } from "@/components/organisms/ResultsTable";
import { StartingGrid } from "@/components/organisms/StartingGrid";
import { TrustPanel } from "@/components/organisms/TrustPanel";
import type { Dictionary, Locale } from "@/dictionaries";
import { lastRaceOrder } from "@/lib/grid";
import type {
  Circuit,
  Driver,
  EntryPrediction,
  Health,
  PredictRequest,
} from "@/lib/api";

type Props = {
  lang: Locale;
  dict: Dictionary;
  circuits: Circuit[];
  drivers: Driver[];
  health: Health;
};

type Run = {
  id: number;
  key: string;
  heading: string[];
  predictions: EntryPrediction[];
};

// shortcut: fixed default (the 2026 US GP is the next race after the trained data); upgrade when the API exposes the calendar.
const DEFAULT_CIRCUIT = "americas";

const toNumber = (v: string) => (v.trim() === "" ? null : Number(v));

export function PredictionWorkbench({
  lang,
  dict,
  circuits,
  drivers,
  health,
}: Props) {
  const [setup, setSetup] = useState<SetupState>({
    circuit: circuits.some((c) => c.circuit_ref === DEFAULT_CIRCUIT)
      ? DEFAULT_CIRCUIT
      : circuits[0]?.circuit_ref,
    wet: false,
    airTemp: "24",
    humidity: "55",
    wind: "3",
  });
  const [order, setOrder] = useState(() => lastRaceOrder(drivers));
  const [run, setRun] = useState<Run | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const boardRef = useRef<HTMLDivElement>(null);

  const teams = new Map(drivers.map((d) => [d.driver_ref, d.team_ref]));

  const request: PredictRequest = {
    circuit_ref: setup.circuit,
    weather: {
      air_temp_c: toNumber(setup.airTemp),
      humidity_pct: toNumber(setup.humidity),
      wind_speed_ms: toNumber(setup.wind),
      rainfall: setup.wet,
    },
    entries: order.map((d, i) => ({
      driver_ref: d.driver_ref,
      grid_position: i + 1,
    })),
    normalize: true,
  };
  const key = JSON.stringify(request);

  // A function `action` (not onSubmit) keeps a click before hydration from doing a native GET submit.
  const submit = () => {
    const circuit = circuits.find((c) => c.circuit_ref === setup.circuit);
    const heading = [
      circuit?.name,
      setup.wet ? dict.setup.wet : dict.setup.dry,
      setup.airTemp && `${setup.airTemp} °C`,
    ].filter((part): part is string => Boolean(part));
    startTransition(async () => {
      const res = await predictRace(request);
      if (res.ok) {
        setError(null);
        setRun({
          id: (run?.id ?? 0) + 1,
          key,
          heading,
          predictions: res.data.predictions,
        });
      } else {
        setError(
          `${dict.errors[res.error]}${res.detail ? ` ${res.detail}` : ""}`,
        );
      }
      // No-op on desktop (board already in view); scrolls down to it on phones.
      boardRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    });
  };

  return (
    <div className="grid items-start gap-8 lg:grid-cols-12 lg:gap-10">
      <form
        action={submit}
        aria-labelledby="setup-title"
        className="flex min-w-0 flex-col gap-6 border-3 border-ink bg-panel p-4 shadow-hard sm:p-6 lg:col-span-5"
      >
        <h2 id="setup-title" className="text-xl font-sidewall">
          {dict.setup.title}
        </h2>
        <RaceSetup
          dict={dict.setup}
          circuits={circuits}
          value={setup}
          onChange={setSetup}
        />
        <StartingGrid
          dict={dict.grid}
          order={order}
          onChange={setOrder}
          onReset={() => setOrder(lastRaceOrder(drivers))}
        />
        <div className="sticky bottom-3 z-10 -mx-1 mt-1">
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? (
              <LoaderCircle
                aria-hidden
                className="size-6 animate-spin"
                strokeWidth={3}
              />
            ) : (
              <Flag aria-hidden className="size-6" strokeWidth={3} />
            )}
            {pending ? dict.predict.pending : dict.predict.submit}
          </Button>
        </div>
      </form>

      <div
        ref={boardRef}
        className="flex min-w-0 scroll-mt-4 flex-col gap-6 lg:col-span-7"
      >
        <PitBoard
          dict={dict.board}
          lang={lang}
          heading={run?.heading ?? []}
          podium={run ? run.predictions.slice(0, 3) : null}
          runId={run?.id ?? 0}
          error={error}
          pick={{
            model: health.backtest.model.winner_pick_accuracy,
            baseline: health.backtest.baseline_grid_only.winner_pick_accuracy,
          }}
          trustLabel={dict.trust.title}
        />
        {run && run.key !== key && (
          <p className="border-3 border-ink bg-pirelli px-4 py-2.5 text-sm font-bold text-ink">
            {dict.predict.stale}
          </p>
        )}
        {run && (
          <ResultsTable
            dict={dict.table}
            lang={lang}
            predictions={run.predictions}
            teamOf={(ref) => teams.get(ref)}
            runId={run.id}
          />
        )}
        <TrustPanel dict={dict.trust} lang={lang} health={health} />
      </div>
    </div>
  );
}
