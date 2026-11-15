# Modo Caos / Simulador "What-If" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an interactive "What-If / Modo Caos" toolbar and live delta indicator badges to the BoxBox prediction workbench so F1 fans can simulate dramatic race scenarios in one click.

**Architecture:** Pure domain transformations in `frontend/src/lib/scenarios.ts` calculate grid and weather permutations along with win/podium deltas against the baseline prediction. A neo-brutalist `ChaosToolbar` molecule triggers presets in `PredictionWorkbench`, which executes predictions via the existing server action and renders delta badges and top riser/faller callouts.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, lucide-react, Node.js test runner (`node:test`).

**Spec:** `docs/superpowers/specs/2026-11-14-what-if-chaos-mode-design.md`

## Global Constraints

- Must strictly adhere to the neo-brutalist design system of BoxBox (sharp borders, high-contrast badges, brand tokens).
- Pure logic functions in `frontend/src/lib/scenarios.ts` must have 0 external runtime dependencies.
- Multilingual dictionary keys must remain 100% symmetric between `es.json` and `en.json`.
- All automated tests must run via `node --test` or `pnpm test`.

## Review Focus

1. Applying a scenario when already on a modified custom grid should cleanly apply relative to the official starting grid or active scenario.
2. The Reset button must restore both the exact official starting order and the Open-Meteo weather forecast.
3. Top Riser and Top Faller must handle ties or 0-delta situations gracefully without throwing.
4. Probabilities must format cleanly (e.g. `+5.2%`, `-3.1%`, `0%`) with correct color coding (green for gain, red/muted for drop).
5. All UI controls must be accessible via keyboard and screen readers.

---

### Task 1: Domain Logic for Scenario Transforms & Deltas

**Files:**
- Create: `frontend/src/lib/scenarios.ts`
- Test: `frontend/src/lib/scenarios.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  export type ChaosPreset = "rain" | "polePenalty" | "reverseTop10" | "heatwave" | null;

  export interface ScenarioWeather {
    air_temp_c: number | null;
    humidity_pct: number | null;
    wind_speed_ms: number | null;
    rainfall: boolean;
  }

  export interface DriverDelta {
    driver_ref: string;
    delta_win: number;     // e.g. +0.05
    delta_podium: number;  // e.g. -0.12
  }

  export interface ScenarioDeltas {
    deltas: Map<string, DriverDelta>;
    topRiserRef: string | null;
    topFallerRef: string | null;
  }

  export function applyPolePenalty<T>(grid: T[], penaltyPlaces?: number): T[];
  export function invertTopN<T>(grid: T[], n?: number): T[];
  export function getScenarioWeather(preset: ChaosPreset, defaultWeather: ScenarioWeather): ScenarioWeather;
  export function computeDeltas(baseline: { driver_ref: string; p_win: number; p_podium: number }[], current: { driver_ref: string; p_win: number; p_podium: number }[]): ScenarioDeltas;
  ```

- [ ] **Step 1: Write the failing unit tests**

Create `frontend/src/lib/scenarios.test.ts` testing `applyPolePenalty`, `invertTopN`, `getScenarioWeather`, and `computeDeltas`.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test frontend/src/lib/scenarios.test.ts`
Expected: FAIL with module not found or missing exports.

- [ ] **Step 3: Implement domain logic in `frontend/src/lib/scenarios.ts`**

Implement the pure transformation functions and delta calculators.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test frontend/src/lib/scenarios.test.ts`
Expected: PASS (all assertions green).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/scenarios.ts frontend/src/lib/scenarios.test.ts
git commit -m "feat(frontend): add domain logic and tests for what-if scenarios"
```

---

### Task 2: i18n Dictionaries for Chaos Mode

**Files:**
- Modify: `frontend/src/dictionaries/es.json`
- Modify: `frontend/src/dictionaries/en.json`

**Interfaces:**
- Produces `dict.chaos`:
  ```json
  {
    "title": "Modo Caos / What-If",
    "hint": "Prueba situaciones dramáticas de carrera con un solo clic",
    "rain": "Lluvia torrencial",
    "rainDesc": "Pista mojada (16°C, 90% humedad)",
    "polePenalty": "Penalización Pole (+10)",
    "polePenaltyDesc": "El poleman sale 10 puestos atrás",
    "reverseTop10": "Invertir Top 10",
    "reverseTop10Desc": "Parrilla invertida para los 10 primeros",
    "heatwave": "Ola de calor",
    "heatwaveDesc": "Asfalto hirviendo (40°C, 25% humedad)",
    "reset": "Restablecer",
    "resetDesc": "Volver a la parrilla y clima oficial",
    "topRiser": "Mayor beneficiado",
    "topFaller": "Mayor perjudicado"
  }
  ```

- [ ] **Step 1: Add Spanish entries to `frontend/src/dictionaries/es.json`**

Under `"chaos"` section.

- [ ] **Step 2: Add English entries to `frontend/src/dictionaries/en.json`**

Ensure key symmetry and matching structure.

- [ ] **Step 3: Run existing dictionary tests**

Run: `node --test frontend/src/dictionaries/locale.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/dictionaries/es.json frontend/src/dictionaries/en.json
git commit -m "feat(i18n): add dictionary strings for what-if chaos mode"
```

---

### Task 3: ChaosToolbar Molecule Component

**Files:**
- Create: `frontend/src/components/molecules/ChaosToolbar.tsx`

**Interfaces:**
- Consumes: `dict.chaos`, `ChaosPreset` from `frontend/src/lib/scenarios.ts`.
- Produces:
  ```typescript
  interface ChaosToolbarProps {
    activePreset: ChaosPreset;
    onSelectPreset: (preset: ChaosPreset) => void;
    onReset: () => void;
    dict: Dictionary["chaos"];
    disabled?: boolean;
  }
  export function ChaosToolbar(props: ChaosToolbarProps): JSX.Element;
  ```

- [ ] **Step 1: Implement `ChaosToolbar.tsx`**

Build the neo-brutalist buttons with `lucide-react` icons (`CloudRain`, `ArrowDown10`, `Shuffle`, `Flame`, `RotateCcw`), tooltips or labels, and active styling.

- [ ] **Step 2: Verify TypeScript compiles**

Run: `pnpm --filter boxbox-frontend exec tsc --noEmit`
Expected: PASS (0 errors).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/molecules/ChaosToolbar.tsx
git commit -m "feat(ui): create ChaosToolbar component"
```

---

### Task 4: Integrate Chaos Mode & Delta Callouts in PredictionWorkbench

**Files:**
- Modify: `frontend/src/components/organisms/PredictionWorkbench.tsx`
- Modify: `frontend/src/components/organisms/ResultsTable.tsx`
- Modify: `frontend/src/components/organisms/PitBoard.tsx`

**Interfaces:**
- Integrates `ChaosToolbar` above the starting grid / race setup.
- Displays `DriverDelta` badges (e.g. `+14.2%` green, `-8.5%` red) in `ResultsTable` and `PitBoard` when an active scenario or custom order diverges from the baseline.
- Displays "Mayor Beneficiado" and "Mayor Perjudicado" callout badges next to affected drivers.

- [ ] **Step 1: Update `ResultsTable.tsx` to accept optional `deltas?: ScenarioDeltas`**

Render subtle, stylish badges next to win/podium odds when delta is non-zero.

- [ ] **Step 2: Update `PredictionWorkbench.tsx`**

1. Maintain `baselineRun` when the initial official scenario runs.
2. Hook up `ChaosToolbar` to trigger `applyPolePenalty`, `invertTopN`, or weather presets.
3. Compute `ScenarioDeltas` and pass to `ResultsTable` and `PitBoard`.
4. Provide a reset callback to restore original order and forecast.

- [ ] **Step 3: Verify TypeScript compilation**

Run: `pnpm --filter boxbox-frontend exec tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/organisms/PredictionWorkbench.tsx frontend/src/components/organisms/ResultsTable.tsx frontend/src/components/organisms/PitBoard.tsx
git commit -m "feat(workbench): integrate what-if chaos mode with real-time delta badges"
```

---

### Task 5: Full Verification & Build Check

**Files:**
- All modified files.

- [ ] **Step 1: Run all frontend unit tests**

Run: `pnpm --filter boxbox-frontend test`
Expected: All tests pass (0 failures).

- [ ] **Step 2: Run linter and formatting check**

Run: `pnpm --filter boxbox-frontend lint`
Expected: Clean lint (0 errors).

- [ ] **Step 3: Run production Next.js build**

Run: `pnpm --filter boxbox-frontend build`
Expected: Production build succeeds with 0 errors.

- [ ] **Step 4: Final verification and commit**

```bash
git commit -m "chore: complete what-if chaos mode implementation"
```
