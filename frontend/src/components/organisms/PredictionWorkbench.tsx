"use client";

import { useRef, useState, useTransition } from "react";
import { Flag, LoaderCircle } from "lucide-react";
import { predictRace } from "@/app/[lang]/actions";
import { Button } from "@/components/atoms/Button";
import { ShareButton } from "@/components/molecules/ShareButton";
import { PitBoard } from "@/components/organisms/PitBoard";
import { RaceSetup, raceKey } from "@/components/organisms/RaceSetup";
import { ResultsTable } from "@/components/organisms/ResultsTable";
import { ReviewPanel } from "@/components/organisms/ReviewPanel";
import { StartingGrid } from "@/components/organisms/StartingGrid";
import { TrustPanel } from "@/components/organisms/TrustPanel";
import { WhyPanel } from "@/components/organisms/WhyPanel";
import type { Dictionary, Locale } from "@/dictionaries";
import { startingOrder } from "@/lib/grid";
import type {
  Driver,
  EntryPrediction,
  Health,
  PredictRequest,
  Race,
  Review,
} from "@/lib/api";

type Props = {
  lang: Locale;
  dict: Dictionary;
  drivers: Driver[];
  health: Health;
  races: Race[];
  review: Review;
  /** `season-round` from the shared link, if it names a race still on the calendar. */
  initialRace?: string;
};

type Run = {
  id: number;
  key: string;
  heading: string[];
  predictions: EntryPrediction[];
};

export function PredictionWorkbench({
  lang,
  dict,
  drivers,
  health,
  races,
  review,
  initialRace,
}: Props) {
  // The API lists races in calendar order, so the first one is the next GP.
  const [selected, setSelected] = useState(() =>
    races.some((r) => raceKey(r) === initialRace)
      ? initialRace!
      : races[0]
        ? raceKey(races[0])
        : "",
  );
  const [order, setOrder] = useState(() =>
    startingOrder(
      drivers,
      races.find((r) => raceKey(r) === selected)?.qualifying,
    ),
  );
  const [run, setRun] = useState<Run | null>(null);
  const [explained, setExplained] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const boardRef = useRef<HTMLDivElement>(null);

  const teams = new Map(drivers.map((d) => [d.driver_ref, d.team_ref]));
  const race = races.find((r) => raceKey(r) === selected);
  const w = race?.weather;
  const quali = new Map(race?.qualifying?.map((q) => [q.driver_ref, q]));

  const pick = (key: string) => {
    setSelected(key);
    setOrder(
      startingOrder(drivers, races.find((r) => raceKey(r) === key)?.qualifying),
    );
  };

  // Defaults to the favourite; clicking a driver in the table explains that one instead.
  const why = run
    ? (run.predictions.find((p) => p.driver_ref === explained) ??
      run.predictions[0])
    : null;

  const request: PredictRequest | null = race
    ? {
        circuit_ref: race.circuit_ref,
        season: race.season,
        round: race.round,
        // No forecast yet: unknown weather (the model treats it as missing), dry track.
        weather: {
          air_temp_c: w?.air_temp_c ?? null,
          humidity_pct: w?.humidity_pct ?? null,
          wind_speed_ms: w?.wind_speed_ms ?? null,
          rainfall: w?.rainfall ?? false,
        },
        entries: order.map((d, i) => {
          // The qualifying gap only holds while the driver still starts from his qualifying slot.
          const q = quali.get(d.driver_ref);
          return {
            driver_ref: d.driver_ref,
            grid_position: i + 1,
            ...(q?.position === i + 1 && q.gap_pct !== null
              ? { quali_gap_pct: q.gap_pct }
              : {}),
          };
        }),
        normalize: true,
      }
    : null;
  const key = JSON.stringify(request);

  // A function `action` (not onSubmit) keeps a click before hydration from doing a native GET submit.
  const submit = () => {
    if (!race || !request) return;
    const heading = [
      race.name,
      w && (w.rainfall ? dict.setup.wet : dict.setup.dry),
      w && `${Math.round(w.air_temp_c)} °C`,
    ].filter((part): part is string => Boolean(part));
    startTransition(async () => {
      const res = await predictRace(request);
      if (res.ok) {
        setError(null);
        setExplained(null);
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
          lang={lang}
          races={races}
          value={selected}
          onChange={pick}
        />
        <StartingGrid
          dict={dict.grid}
          order={order}
          onChange={setOrder}
          onReset={() => pick(selected)}
        />
        <div className="sticky bottom-3 z-10 -mx-1 mt-1">
          <Button type="submit" disabled={pending || !race} className="w-full">
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
          action={
            <ShareButton
              raceKey={selected}
              label={dict.board.share}
              done={dict.board.shared}
            />
          }
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
            selectedRef={why?.driver_ref}
            onSelect={setExplained}
          />
        )}
        {why && <WhyPanel dict={dict.why} lang={lang} prediction={why} />}
        <ReviewPanel dict={dict.review} lang={lang} review={review} />
        <TrustPanel dict={dict.trust} lang={lang} health={health} />
      </div>
    </div>
  );
}
