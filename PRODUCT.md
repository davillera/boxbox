# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two audiences, confirmed by the owner:

- **Portfolio visitors** (recruiters, engineers) evaluating BoxBox as a full-stack ML project. They arrive cold and need the page to explain itself: what the model predicts, from what, and how good it is.
- **F1 fans before a race**, typically after Saturday qualifying, who set up the starting grid and conditions to see who the model favours for Sunday.

## Product Purpose

BoxBox predicts each driver's probability of winning and of finishing on the podium for the next Formula 1 race, given the circuit, the starting grid and the weather. Success: a visitor sets a grid, gets a ranked prediction in about a second, and understands both what it says and how far to trust it.

## Positioning

An honest, end-to-end race-outcome model: real results 2022 → present (Jolpica) joined with race-hour weather (Open-Meteo), no-leakage form features, a walk-forward backtest against a grid-only baseline, served by a typed API that logs every prediction. It reports its limits instead of hiding them.

## Operating Context

- Dashboard: one page, one form (circuit, weather, full 22-driver grid in order) and one results panel.
- Backend: FastAPI `GET /health`, `GET /circuits`, `GET /drivers`, `POST /predict` (normalised over the whole field). Every prediction is written to `prediction_history` on Neon.
- The model always scores the next race after its last trained race, using current form.

## Capabilities and Constraints

- Inputs: circuit (27 known), air temperature, humidity, wind, rain yes/no, grid position per driver (0 = pit-lane start). Qualifying gap is optional and currently not exposed in the UI.
- Outputs: win and podium probability per driver; model name, version and data cut-off.
- No telemetry, lap data or live timing (no F1 TV subscription).
- Interface in Spanish and English (i18n), both first-class.
- Stack fixed by the monorepo: Next.js App Router, TypeScript, Tailwind, pnpm, Prettier, exact version pins, Atomic Design components.

## Brand Commitments

- Name: **BoxBox** (the pit-radio call to come into the pits).
- Visual direction pinned by the owner: **neo-brutalism**.

## Evidence on Hand

- Backtest (`boxbox-ml/artifacts/metrics.json`, 3 seasons, 65 races): log loss 0.301 vs 0.312 grid-only baseline; win AUC 0.950 vs 0.943; winner pick 51 % vs 60 % for "pole sitter wins". These are the only performance claims allowed.
- No testimonials, users, press or usage numbers exist. Do not invent any.
- Not affiliated with Formula 1; no official F1 logos, fonts or team marks.

## Product Principles

1. Show the probability, never a certainty: every number reads as a chance.
2. Honest about limits: show where the model is weaker than the obvious baseline.
3. The grid is the input: arranging it should feel like setting a real starting grid.
4. Fast loop: change one thing, predict again, compare.

## Accessibility & Inclusion

- Grid reordering must work by keyboard and touch, not only drag-and-drop.
- Team colour is never the only carrier of meaning; driver code and team name always accompany it.
