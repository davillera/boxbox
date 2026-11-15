"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Flag, LoaderCircle } from "lucide-react";
import { predictRace } from "@/app/[lang]/actions";
import { Button } from "@/components/atoms/Button";
import { ChaosToolbar } from "@/components/molecules/ChaosToolbar";
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
import {
  applyPolePenalty,
  computeDeltas,
  getScenarioWeather,
  invertTopN,
  type ChaosPreset,
  type ScenarioWeather,
} from "@/lib/scenarios";
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
  initialChaos?: string;
  initialGrid?: string;
};

const REFRESH_MS = 60_000;

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
  initialChaos,
  initialGrid,
}: Props) {
  const validPresets: ChaosPreset[] = [
    "rain",
    "polePenalty",
    "reverseTop10",
    "heatwave",
  ];
  const startChaos: ChaosPreset = validPresets.includes(
    initialChaos as ChaosPreset,
  )
    ? (initialChaos as ChaosPreset)
    : null;

  // The API lists races in calendar order, so the first one is the next GP.
  const [selected, setSelected] = useState(() =>
    races.some((r) => raceKey(r) === initialRace)
      ? initialRace!
      : races[0]
        ? raceKey(races[0])
        : "",
  );

  const initialRaceObj = races.find((r) => raceKey(r) === selected);
  const initialOfficialOrder = startingOrder(drivers, initialRaceObj?.qualifying);

  const [order, setOrder] = useState<Driver[]>(() => {
    let base = initialOfficialOrder;
    if (initialGrid) {
      const refs = initialGrid.split(",");
      const map = new Map(drivers.map((d) => [d.driver_ref, d]));
      const custom = refs
        .map((ref) => map.get(ref))
        .filter((d): d is Driver => Boolean(d));
      if (custom.length === drivers.length) {
        base = custom;
      }
    }
    if (startChaos === "polePenalty") {
      return applyPolePenalty(base, 10);
    }
    if (startChaos === "reverseTop10") {
      return invertTopN(base, 10);
    }
    return base;
  });

  const [run, setRun] = useState<Run | null>(null);
  const [chaosPreset, setChaosPreset] = useState<ChaosPreset>(startChaos);
  const [customWeather, setCustomWeather] = useState<ScenarioWeather | null>(
    () => {
      if (startChaos === "rain" || startChaos === "heatwave") {
        return getScenarioWeather(startChaos, {
          air_temp_c: initialRaceObj?.weather?.air_temp_c ?? null,
          humidity_pct: initialRaceObj?.weather?.humidity_pct ?? null,
          wind_speed_ms: initialRaceObj?.weather?.wind_speed_ms ?? null,
          rainfall: initialRaceObj?.weather?.rainfall ?? false,
        });
      }
      return null;
    },
  );
  const [baselinePredictions, setBaselinePredictions] = useState<
    EntryPrediction[] | null
  >(null);
  const [explained, setExplained] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const boardRef = useRef<HTMLDivElement>(null);

  const router = useRouter();
  // Re-run the server component so qualifying, forecast and race results appear during the weekend.
  useEffect(() => {
    const id = setInterval(() => {
      if (!document.hidden) router.refresh();
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, [router]);

  const teams = new Map(drivers.map((d) => [d.driver_ref, d.team_ref]));
  const race = races.find((r) => raceKey(r) === selected);

  // A new qualifying classification replaces the grid; later manual swaps are kept until the next one.
  const qualiKey = JSON.stringify(race?.qualifying ?? null);
  const seenQuali = useRef(qualiKey);
  useEffect(() => {
    if (seenQuali.current === qualiKey) return;
    seenQuali.current = qualiKey;
    setOrder(startingOrder(drivers, race?.qualifying));
    setChaosPreset(null);
    setCustomWeather(null);
    setBaselinePredictions(null);
    setRun(null);
  }, [qualiKey, drivers, race?.qualifying]);
  const w = race?.weather;
  const quali = new Map(race?.qualifying?.map((q) => [q.driver_ref, q]));

  const pick = (key: string) => {
    setSelected(key);
    setChaosPreset(null);
    setCustomWeather(null);
    setBaselinePredictions(null);
    setOrder(
      startingOrder(drivers, races.find((r) => raceKey(r) === key)?.qualifying),
    );
  };

  const officialOrder = startingOrder(drivers, race?.qualifying);
  const baseWeather: ScenarioWeather = {
    air_temp_c: w?.air_temp_c ?? null,
    humidity_pct: w?.humidity_pct ?? null,
    wind_speed_ms: w?.wind_speed_ms ?? null,
    rainfall: w?.rainfall ?? false,
  };

  const handleSelectPreset = (preset: ChaosPreset) => {
    setChaosPreset(preset);
    if (run?.predictions && !baselinePredictions) {
      setBaselinePredictions(run.predictions);
    }
    if (preset === "polePenalty") {
      setOrder(applyPolePenalty(officialOrder, 10));
      setCustomWeather(null);
    } else if (preset === "reverseTop10") {
      setOrder(invertTopN(officialOrder, 10));
      setCustomWeather(null);
    } else if (preset === "rain" || preset === "heatwave") {
      setCustomWeather(getScenarioWeather(preset, baseWeather));
    }
  };

  const handleResetChaos = () => {
    setChaosPreset(null);
    setCustomWeather(null);
    setOrder(officialOrder);
  };

  // Defaults to the favourite; clicking a driver in the table explains that one instead.
  const why = run
    ? (run.predictions.find((p) => p.driver_ref === explained) ??
      run.predictions[0])
    : null;

  const effectiveWeather: ScenarioWeather = customWeather ?? baseWeather;

  const deltas =
    baselinePredictions && run?.predictions
      ? computeDeltas(baselinePredictions, run.predictions)
      : null;

  const request: PredictRequest | null = race
    ? {
        circuit_ref: race.circuit_ref,
        season: race.season,
        round: race.round,
        weather: {
          air_temp_c: effectiveWeather.air_temp_c,
          humidity_pct: effectiveWeather.humidity_pct,
          wind_speed_ms: effectiveWeather.wind_speed_ms,
          rainfall: effectiveWeather.rainfall,
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
    const condLabel = chaosPreset
      ? dict.chaos[chaosPreset]
      : effectiveWeather.rainfall
        ? dict.setup.wet
        : dict.setup.dry;
    const heading = [
      race.name,
      condLabel,
      effectiveWeather.air_temp_c !== null
        ? `${Math.round(effectiveWeather.air_temp_c)} °C`
        : null,
    ].filter((part): part is string => Boolean(part));
    startTransition(async () => {
      const res = await predictRace(request);
      if (res.ok) {
        setError(null);
        setExplained(null);
        if (!chaosPreset && !baselinePredictions) {
          setBaselinePredictions(res.data.predictions);
        }
        setRun({
          id: (run?.id ?? 0) + 1,
          key,
          heading,
          predictions: res.data.predictions,
        });

        // Sync its own unique link in the address bar
        if (typeof window !== "undefined") {
          const url = new URL(window.location.href);
          url.searchParams.set("race", selected);
          if (chaosPreset) {
            url.searchParams.set("chaos", chaosPreset);
          } else {
            url.searchParams.delete("chaos");
          }
          const isCustomGrid = order.some(
            (d, idx) => d.driver_ref !== initialOfficialOrder[idx]?.driver_ref,
          );
          if (isCustomGrid && !chaosPreset) {
            url.searchParams.set(
              "grid",
              order.map((d) => d.driver_ref).join(","),
            );
          } else {
            url.searchParams.delete("grid");
          }
          window.history.replaceState(null, "", url.toString());
        }
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

  const initialPredicted = useRef(false);
  useEffect(() => {
    if (initialPredicted.current) return;
    if (initialRace) {
      initialPredicted.current = true;
      submit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        <ChaosToolbar
          activePreset={chaosPreset}
          onSelectPreset={handleSelectPreset}
          onReset={handleResetChaos}
          dict={dict.chaos}
          disabled={pending || !race}
        />
        <StartingGrid
          dict={dict.grid}
          order={order}
          onChange={setOrder}
          onReset={() => {
            handleResetChaos();
            pick(selected);
          }}
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
              chaosPreset={chaosPreset}
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
        {why && <WhyPanel dict={dict.why} lang={lang} prediction={why} />}
        {run && (
          <ResultsTable
            dict={dict.table}
            dictChaos={dict.chaos}
            deltas={deltas}
            lang={lang}
            predictions={run.predictions}
            teamOf={(ref) => teams.get(ref)}
            runId={run.id}
            selectedRef={why?.driver_ref}
            onSelect={setExplained}
          />
        )}
        <ReviewPanel dict={dict.review} lang={lang} review={review} />
        <TrustPanel dict={dict.trust} lang={lang} health={health} />
      </div>
    </div>
  );
}
