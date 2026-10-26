---
version: 1
slug: "frontend-src-app-lang-page-tsx"
primary_target: "frontend/src/app/[lang]/page.tsx"
related_targets: []
---

Scope: the BoxBox dashboard, `frontend/src/app/[lang]/page.tsx`, the only route. Visitor mode: **Operate**. Build path: code-led (Operate surface; no image generation).

Audience and job: portfolio visitors and F1 fans. They set the circuit, the weather and the full 22-car starting grid, press predict, and read win and podium chances. Content: live `/circuits`, `/drivers` and `/predict` data plus the real backtest numbers. Constraints: es + en, a grid reorderable by keyboard and touch, light and dark themes, and neo-brutalism pinned by the owner. The owner chose the "Goma negra" direction with a Pirelli palette on 2026-10-25, replacing the first grey/yellow pass.

## Direction contract

THESIS: a neo-brutalist pit wall in Pirelli's colours: rubber-black, yellow and red, with tyre-compound bands as the state language. It refuses the category default of a glassy dark dashboard with neon charts.

OWN-WORLD: themed ground (rubber #0d0d0d dark, chalk #e9e9e4 light), panels (#1b1b1a / #fff) and text (chalk / ink). The palette never changes: Pirelli yellow #ffd100, Pirelli red #e4002b, wet blue #0067b1, compound white. Hard 3px borders and zero-blur offset shadows (yellow in dark, ink in light; red under yellow surfaces). Type is Archivo variable, set as sidewall lettering (125% width, italic, 900, uppercase) for display and tabular numerals for data. The wordmark is a skewed yellow block.

STORY: the visitor learns that the model ranks the next race from the grid, the circuit and the weather. They believe it because the backtest limits are shown next to the result. Then they rearrange the grid and predict again.

FIRST VIEWPORT:
- Header: wordmark, tagline, GitHub link, theme toggle, ES/EN switch.
- Below it, an italic sidewall H1 and a lede.
- Left (5/12): the setup panel, with the circuit select (themed `base-select` picker, country first), a Dry/Wet toggle and three weather fields. Under them, the staggered two-column starting grid on a black tarmac strip: P1–P22 bracket slots holding white driver cards with a team swatch, tap-to-swap and drag. The yellow PREDICT button with a red shadow is sticky at the bottom.
- Right (7/12): the yellow pit board. Its slats are black with tyre badges (P1 soft-red band, P2 medium-yellow, P3 hard-white), the code in large sidewall type and the win % in yellow. Below the board come the ranked table (win bar red, podium bar yellow) and the "How far to trust it" backtest table.

SIGNATURE: the starting grid as the input, plus the pit-board slats with compound-banded tyre badges that drop in on every prediction.

FORM: owner-pinned direction (neo-brutalism, Pirelli palette, "Goma negra", picked by the owner from three options on 2026-10-25). A pinned direction beats the roll, so concept-seed was deliberately not run; there is no seed reference.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
