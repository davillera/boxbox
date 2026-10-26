---
name: BoxBox
description: F1 race predictor dashboard, a neo-brutalist pit wall in Pirelli rubber, yellow and red.
colors:
  ink: "#0d0d0d"
  chalk: "#f2f2ee"
  smoke: "#b0b0aa"
  pirelli: "#ffd100"
  redline: "#e4002b"
  wet: "#0067b1"
  ground-dark: "#0d0d0d"
  ground-light: "#e9e9e4"
  panel-dark: "#1b1b1a"
  panel-light: "#ffffff"
  raised-dark: "#2c2c2a"
  raised-light: "#dcdcd6"
  fg-dark: "#f2f2ee"
  fg-light: "#0d0d0d"
  muted-dark: "#b0b0aa"
  muted-light: "#55554f"
  shade-dark: "#ffd100"
  shade-light: "#0d0d0d"
typography:
  display:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.25rem, 4vw + 1rem, 3.75rem)"
    fontWeight: 900
    lineHeight: 0.95
    letterSpacing: "-0.025em"
    fontVariation: "'wdth' 125"
  board-code:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 900
    lineHeight: 1
    fontVariation: "'wdth' 125"
  headline:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 900
    lineHeight: 1.4
    fontVariation: "'wdth' 125"
  figure:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 900
    lineHeight: 1
    fontFeature: "'tnum' 1"
  lede:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.375
  body:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.625
    fontFeature: "'tnum' 1"
  label:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1.33
    letterSpacing: "0.025em"
  data-narrow:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 800
    fontFeature: "'tnum' 1"
    fontVariation: "'wdth' 85"
rounded:
  none: "0px"
spacing:
  xs: "6px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.pirelli}"
    textColor: "{colors.ink}"
    typography: "{typography.headline}"
    rounded: "{rounded.none}"
    padding: "16px 24px"
  button-secondary:
    backgroundColor: "{colors.ground-dark}"
    textColor: "{colors.fg-dark}"
    rounded: "{rounded.none}"
    padding: "6px 12px"
  input-field:
    backgroundColor: "{colors.ground-dark}"
    textColor: "{colors.fg-dark}"
    rounded: "{rounded.none}"
    padding: "8px 10px"
  input-unit:
    backgroundColor: "{colors.raised-dark}"
    textColor: "{colors.fg-dark}"
    padding: "0 8px"
  select-field:
    backgroundColor: "{colors.ground-dark}"
    textColor: "{colors.fg-dark}"
    rounded: "{rounded.none}"
    padding: "10px 48px 10px 12px"
  select-handle:
    backgroundColor: "{colors.pirelli}"
    textColor: "{colors.ink}"
    width: "40px"
  track-toggle-dry-on:
    backgroundColor: "{colors.pirelli}"
    textColor: "{colors.ink}"
    padding: "10px 0"
  track-toggle-wet-on:
    backgroundColor: "{colors.wet}"
    textColor: "{colors.chalk}"
    padding: "10px 0"
  panel:
    backgroundColor: "{colors.panel-dark}"
    textColor: "{colors.fg-dark}"
    rounded: "{rounded.none}"
    padding: "24px"
  grid-tarmac:
    backgroundColor: "{colors.ink}"
    padding: "16px 20px 56px"
  grid-slot:
    backgroundColor: "{colors.chalk}"
    textColor: "{colors.ink}"
    padding: "6px 8px"
  grid-slot-selected:
    backgroundColor: "{colors.pirelli}"
    textColor: "{colors.ink}"
  pit-board:
    backgroundColor: "{colors.pirelli}"
    textColor: "{colors.ink}"
    padding: "16px"
  board-slat:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.chalk}"
    padding: "8px 20px 8px 8px"
  tyre-badge:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.chalk}"
    size: "72px"
  team-swatch:
    size: "14px"
  wordmark:
    backgroundColor: "{colors.pirelli}"
    textColor: "{colors.ink}"
    padding: "2px 10px"
  segmented-active:
    backgroundColor: "{colors.pirelli}"
    textColor: "{colors.ink}"
    padding: "6px 12px"
---

# Design System: BoxBox

## Overview

**Creative North Star: "Goma Negra, the Pirelli Pit Wall"**

BoxBox is a pit wall built from rubber, paint and signboard. The ground is tyre-black in dark mode and pit-lane chalk in light mode. On top of it sit square slabs with 3px edges and hard offset shadows that never blur. Pirelli yellow is the colour of the call (the pit board, the primary action, the active option). Pirelli red is the colour of urgency and of the shadow under anything yellow. Wet blue appears only for rain and for focus. Type is one variable family, Archivo. It is pushed to 125% width, italic and 900 weight for "sidewall lettering", and pulled back to tabular body weights for data.

Density is that of a working dashboard: one form, one results column, full 22-car tables. Rows and controls are compact, but every surface keeps a heavy frame so the hierarchy reads at a glance. State is carried by tyre-compound colour bands (soft red, medium yellow, hard white) rather than by glow, gradient or blur. The world rejects the category default of a glassy dark dashboard with neon charts.

Some parts of the world never change with the theme. The tarmac strip under the grid, the slats on the pit board, the tyre badges and the yellow surfaces are fixed. Only the ground, panels, text and shadow colour switch with `html[data-theme]`.

**Key Characteristics:**
- Two themes from one fixed Pirelli palette; only six themed tokens switch.
- Zero radius everywhere, 3px borders, zero-blur offset shadows.
- Sidewall lettering (expanded, italic, black, uppercase) for display, codes and actions; tabular numerals for all data.
- Compound bands (red, yellow, white) as the podium state language.
- Motion is mechanical: slats flip down, bars grow from the left, buttons shift by 2px.

## Colors

A fixed rubber-and-paint palette: three Pirelli signal colours over ink and chalk, with a themed neutral layer underneath.

### Primary
- **Pirelli Yellow** (pirelli): the colour of the call. Used for the pit board, the primary PREDICT button, the wordmark block, the selected grid slot, the active segment of the ES/EN switch, the Dry option, the select handle, podium probability bars, winning cells in the trust table, the win % on board slats, and `::selection`. In dark mode it is also the hard shadow colour (shade).

### Secondary
- **Pirelli Red** (redline): urgency and the shadow under yellow. Used as `shadow-red` beneath every yellow surface, for win probability bars, the "box" half of the wordmark, the P1 soft-compound band, the checkmark square in the select picker, link underlines, error icons, invalid number text and the input caret.

### Tertiary
- **Wet Blue** (wet): rain and focus only. It fills the active Wet option and draws the global `:focus-visible` outline (3px, offset 3px).

### Neutral
- **Ink** (ink): tyre rubber. Used for the fixed tarmac strip, board slats, tyre badges, text and borders on yellow and chalk surfaces, and the frame of all panels.
- **Chalk** (chalk): compound white. Used for grid slot cards, text on ink, the P3 hard-compound band and bracket lines on the tarmac (at 70% opacity).
- **Smoke** (smoke): secondary text on ink slats, the idle 3px shadow under grid cards, and the badge band beyond P3.
- **Ground** (ground-dark / ground-light): page background; also the fill of inputs, toggles and the secondary button.
- **Panel** (panel-dark / panel-light): the setup form, the results table and the trust panel.
- **Raised** (raised-dark / raised-light): table header rows, unit suffix cells, hover fills, and dividers inside the select picker.
- **Fg** (fg-dark / fg-light): body text, control borders and inner table rules (`fg` at 15% for row dividers).
- **Muted** (muted-dark / muted-light): labels, captions, the lede and the tagline.
- **Shade** (shade-dark / shade-light): the colour of the hard shadow. It is yellow in dark mode and ink in light mode, and the header's bottom rule uses it too.

### Named Rules
**The Fixed Palette Rule.** Ink, chalk, smoke, pirelli, redline and wet never change with the theme. Only ground, panel, raised, fg, muted and shade switch. Surfaces drawn in fixed tokens (tarmac, slats, badges, yellow boards, grid cards) look identical in both themes.

**The Red-Under-Yellow Rule.** Any yellow surface that casts a shadow casts it in redline (`shadow-red`), never in shade. A yellow shadow under a yellow block disappears.

**The Rain Is Blue Rule.** Wet blue means rain or keyboard focus. Do not use it as a general accent.

## Typography

**Display Font:** Archivo variable (wdth axis, normal + italic), with ui-sans-serif, system-ui, sans-serif
**Body Font:** Archivo (same family)

**Character:** One family carries the whole system. Stretched to 125%, slanted and set at 900, it becomes sidewall lettering for headings, driver codes and actions. At 400 to 700 with tabular figures it handles the data.

### Hierarchy
- **Display** (sidewall, 36px / 48px at sm / 60px at lg, line-height 0.95, tracking-tight, balanced): the single H1.
- **Board code** (sidewall, 36px, 60px at sm, line-height 1): driver codes on the pit-board slats.
- **Figure** (900 italic, 30px, 48px at sm, tabular): the win % on slats, in pirelli.
- **Headline** (sidewall, 20px): section titles (The race, Starting grid, Predicted order, How far to trust it). The pit-board title uses 18px.
- **Title / codes** (sidewall, 16px): driver codes in grid cards and table rows, and rank numbers.
- **Lede** (400, 18px, line-height 1.375, max 62ch, muted).
- **Body** (400 to 600, 14px to 16px, line-height 1.625 for prose, max 60 to 68ch).
- **Label** (700, 12px, tracking 0.025em, uppercase, muted): form labels and legends. Table headers use 800.
- **Data narrow** (800, 14px, 85% width, tabular): percentage labels beside probability bars.

### Named Rules
**The Sidewall Rule.** Display text, section titles, driver codes and positions use the `font-sidewall` utility (font-stretch 125%, italic, 900, uppercase). Buttons and toggles use the same italic 900 uppercase at normal width. Body copy is never sidewall.

**The Tabular Rule.** `tnum` is set on the body, so every figure aligns in columns. Percentages and metrics are set at 800 to 900 weight.

## Layout

- **Container:** max width 1440px, centred. Side padding 16px, 24px at sm and 40px at lg. Top padding 32px (48px at lg), bottom padding 64px.
- **Workbench grid:** a single column below lg. At lg (1024px) it becomes 12 columns: the setup form takes 5 and the board column takes 7, with a 40px gap (32px below lg). Columns are aligned to the top.
- **Rhythm:** about 24px between blocks inside a panel, about 20px between setup fields, 6px between a label and its control, and 12px between weather fields. Panel padding is 16px, or 24px at sm.
- **Weather fields** auto-fit at a minimum of 7.5rem each, so they show three across in a wide column and wrap to two plus one on phones.
- **The PREDICT button** is sticky 12px from the bottom of the form, so it stays reachable while the visitor scrolls the 22-slot grid.
- **Phones (below lg):** the board column stacks under the form. After a prediction the page scrolls the board into view (`scroll-mt-4`). Below sm the header tagline is hidden, and the GitHub link is hidden below md. The results table hides the grid column and the full name below sm, stacking code over team instead. The table scrolls horizontally if it still overflows.
- **Breakpoints:** sm 640px, md 768px, lg 1024px (Tailwind defaults).

## Elevation & Depth

Depth is structural and flat: zero-blur offset shadows that read as slabs, not light. There are no blurred shadows, gradients or translucency layers.

### Shadow Vocabulary
- **Hard** (`box-shadow: 6px 6px 0 0 var(--shade)`): the frame shadow for panels (setup form, results table, trust panel), the select picker popover, and the hover state of secondary controls.
- **Hard small** (`box-shadow: 3px 3px 0 0 var(--shade)`): the resting state of secondary buttons, the theme toggle and the language switch. It also marks focus-within on inputs and the open or focused select.
- **Red** (`box-shadow: 6px 6px 0 0 var(--color-redline)`): under every yellow surface (pit board, PREDICT button, wordmark, selected grid card, offline board).
- **Lift:** on hover a control moves -2px on both axes and its shadow grows (3px to 6px for shade, 6px to 8px for the red primary). On press it moves +2px and the shadow drops to none.

### Named Rules
**The Shade Swap Rule.** Hard shadows are drawn in `--shade`: yellow on rubber in dark mode, ink on chalk in light mode. Never hard-code the shadow colour on themed surfaces.

**The Pressed Flat Rule.** On press, a control drops onto its shadow (translate +2px, shadow none).

## Shapes

- **Corners:** square everywhere (0px). Nothing is rounded except the tyre badge, which is a drawn circle.
- **Borders:** 3px solid is the system stroke for panels, controls, slats and dividers between segments. Probability bar tracks and the team swatch use 2px. Row dividers inside tables are 1px `fg` at 15%. Panels are framed in ink, so in dark mode their edge against the ground is carried by the yellow shade shadow. Controls inside panels are framed in fg.
- **Skew:** the wordmark is a yellow block skewed -12deg. It is the only skewed shape.
- **Brackets:** grid slots are open-bottom brackets (3px left, top and right strokes covering 70% of the slot height), like painted grid boxes.

## Components

### Buttons
Tactile slabs that shift on hover and press.
- **Shape:** square, 3px border, italic 900 uppercase with wide tracking, a gap of 8px before the icon.
- **Primary:** pirelli fill, ink border and text, red shadow, 16px 24px padding, 18px text. It is used once per surface, for PREDICT, and is sticky in the form.
- **Secondary:** ground fill, fg border and text, small hard shadow, 6px 12px padding, 14px text (Reset).
- **Hover / Active:** translate -2px with a larger shadow; on press, translate +2px with no shadow. Transitions on translate and box-shadow last 150ms ease-out.
- **Disabled / pending:** wait cursor, 85% opacity, no hover lift. A spinning loader icon replaces the flag.

### Inputs / Fields
- **Number field:** 3px fg frame on ground. The value is set at 18px, weight 800. A unit cell sits on the right on raised, behind a 3px divider. The label above is 12px uppercase muted with a 16px Lucide icon at stroke 2.5.
- **Focus:** the frame gains a small hard shadow (focus-within). The caret is redline. Invalid values turn redline.

### Select Picker
- Native `<select>` with a 3px fg frame on ground, 18px weight-800 text and a 40px pirelli handle on the right holding an ink chevron (stroke 3). It hovers to the panel fill and takes a small hard shadow when open or focused.
- Where `appearance: base-select` is supported, the popover is themed: 3px fg border, ground fill, hard shadow, 6px offset, max height min(26rem, 60dvh). Options are bold with 1px raised dividers. Hover or focus turns an option pirelli with ink text. The checked option is set at 900 and its checkmark is a 0.6rem redline square. Other browsers keep the native picker.
- Circuit options list the country first.

### Track Toggle
- A two-segment radio inside a 3px fg frame on ground, split by a 3px divider. Labels are italic 900 uppercase with a 20px icon.
- Dry on: pirelli with ink text. Wet on: wet blue with chalk text. An inactive segment hovers to raised. Colour changes take 150ms.

### Segmented Switch (Language)
- ES/EN links in a 3px fg frame with a small hard shadow, split by 3px dividers, set at italic 900 uppercase 14px. The current locale is pirelli with ink text, and the others hover to raised.

### Cards / Containers (Panels)
- **Corner Style:** square.
- **Background:** panel.
- **Border:** 3px ink.
- **Shadow Strategy:** hard (shade).
- **Internal Padding:** 16px, or 20px to 24px at sm. A panel opens with a sidewall headline. Table panels put their title in a bar separated by a 3px fg rule, with header rows on raised.

### Starting Grid (Signature)
- **Tarmac:** a fixed ink strip inside a 3px fg frame, padded 16px top and 56px bottom so the offset column clears. It is black in both themes.
- **Stagger:** two columns with a 40px gap at sm (16px on phones). Every even slot is shifted down 55%, like a real staggered F1 grid.
- **Slot:** a chalk bracket at 70% opacity with a sidewall `P{n}` at 12px in the top-left corner. While a dragged card is over the slot, the bracket turns pirelli.
- **Card:** chalk fill, 3px ink border, ink text, an idle 3px smoke shadow, and a pirelli shadow with -2px lift on hover. The selected card is pirelli with a red shadow, lifted. The card holds the team swatch, the code (sidewall 16px), the short team name (11px, 12px at sm, ink at 70%) and a grip icon from sm up.
- **Interaction:** tap two cards to swap them, or drag one onto a slot. Swaps are announced in a polite live region.

### Pit Board (Signature)
- A pirelli board with a 3px ink border, red shadow and 16px padding (12px on phones). Its title is sidewall 18px, with the run heading (circuit, conditions, temperature) on the right.
- **Slats:** ink rows with a 3px ink border, 8px apart. Each slat holds a tyre badge, the driver code (board-code type, chalk), a detail line in smoke, and the win % (figure type, pirelli) with a small uppercase label.
- **Empty state:** two "Box" slats and a short call to action.
- **Error state:** an ink slab with a redline warning icon.
- **Limit line:** a 3px ink rule closes the board. Below it sits the backtest limit line with an underlined link to the trust panel.
- **Motion:** `slat-drop`, 520ms with cubic-bezier(0.16, 1, 0.3, 1), flipping down from translateY(-115%) rotateX(70deg) to rest, origin top, inside a 900px perspective. It replays on every prediction, staggered by 110ms per slat.

### Tyre Badge
- A side-on tyre in 64-unit SVG: an ink disc, a 5-unit compound band at radius 22, and `P{n}` in chalk, 900 italic, on the hub. It renders at 56px, or 72px at sm.
- Band colour by position: P1 redline (soft), P2 pirelli (medium), P3 chalk (hard), any later position smoke.

### Probability Bar
- A 14px-tall track on ground with a 2px fg border at 70%. The fill is redline for win and pirelli for podium. Win bars are scaled to the field leader so small chances stay visible.
- `bar-grow`, 700ms with the same easing, grows the fill from scaleX(0) at the left edge, staggered by 25ms per row. The label beside it uses the data-narrow type.

### Team Swatch
- A 14px square with a 2px ink border and a 1px fg outline at 40%, filled with the approximate team colour. It always appears next to the driver code and team name, never alone.

### Wordmark
- "Box" in ink and "box" in redline, set in sidewall type (24px, 30px at sm) on a pirelli block skewed -12deg. The block has a 3px ink border and a red shadow.

### Header
- Ground fill with a 3px bottom rule in shade. It holds the wordmark, the tagline (sm and up), the GitHub link (md and up, redline 3px underline, hovering to redline text), the theme toggle (a 40px square, small hard shadow, sun or moon icon via the `light:` variant) and the language switch.

### Motion and Reduced Motion
- Every animation and transition is clamped to 1ms under `prefers-reduced-motion: reduce`, and animation delays are removed. Slats and bars then appear in their final state.

## Do's and Don'ts

### Do:
- **Do** frame every surface and control with a 3px border and square corners.
- **Do** draw themed shadows with `--shade` (`shadow-hard` at 6px, `shadow-hard-sm` at 3px), and put `shadow-red` under every yellow surface.
- **Do** use `font-sidewall` for display, section titles, driver codes and positions, and keep figures tabular.
- **Do** keep the tarmac, slats, tyre badges and grid cards in fixed tokens so they read the same in both themes.
- **Do** use compound colours (redline, pirelli, chalk, then smoke) for the podium order.
- **Do** pair every team swatch with the driver code and team name.
- **Do** keep the global focus ring at 3px wet blue, offset 3px.
- **Do** let hover lift a control by 2px and press flatten it onto its shadow, in 150ms.

### Don't:
- **Don't** round corners, blur shadows, or add gradients, glass or glow.
- **Don't** put a shade (yellow) shadow under a yellow surface; use redline.
- **Don't** use wet blue for anything except rain and focus.
- **Don't** let team colour carry meaning on its own.
- **Don't** set body copy in sidewall lettering.
- **Don't** add motion that ignores the reduced-motion clamp.
