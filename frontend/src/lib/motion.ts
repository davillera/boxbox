import { animate, stagger, utils } from "animejs";

/**
 * Drop the inline pose once a move ends. A leftover transform would trap sticky and
 * fixed descendants, and anime's `set` reads "" as 0, so the styles are removed directly.
 */
const settle = (el: HTMLElement) => {
  el.style.removeProperty("opacity");
  el.style.removeProperty("transform");
};

/** False when the visitor asked for reduced motion (or on the server). */
export const motionOK = () =>
  typeof window !== "undefined" &&
  matchMedia("(prefers-reduced-motion: no-preference)").matches;

/**
 * Race micro-motion presets, applied by name through `data-anim="<name>"`
 * (see components/motion/RaceMotion). `hide` puts an element in its start pose
 * while it waits off-screen; `play` runs the move, with an optional `data-delay` in ms.
 */
export const PRESETS: Record<
  string,
  {
    hide?: (el: HTMLElement) => void;
    play: (el: HTMLElement, delay: number) => void;
  }
> = {
  // A car entering the frame: from the left, leaning into the skew.
  reveal: {
    // Only short blocks lean: a skew shifts a tall section's bottom edge sideways by ~tan(6°)·height.
    hide: (el) =>
      utils.set(el, {
        opacity: 0,
        x: -28,
        skewX: el.offsetHeight < 240 ? -6 : 0,
      }),
    play: (el, delay) =>
      animate(el, {
        opacity: 1,
        x: 0,
        skewX: 0,
        duration: 650,
        delay,
        ease: "outExpo",
        onComplete: () => settle(el),
      }),
  },
  // Pit-board slat dropping from the gantry.
  slat: {
    hide: (el) => utils.set(el, { opacity: 0, y: "-115%", rotateX: 70 }),
    play: (el, delay) =>
      animate(el, {
        opacity: 1,
        y: "0%",
        rotateX: 0,
        duration: 560,
        delay,
        ease: "outExpo",
        onComplete: () => settle(el),
      }),
  },
  // Wheel spinning down as the slat lands.
  tyre: {
    hide: (el) => utils.set(el, { rotate: -540 }),
    play: (el, delay) =>
      animate(el, { rotate: 0, duration: 1000, delay, ease: "outCubic" }),
  },
  // Probability bars fill like a rev counter.
  bar: {
    hide: (el) => utils.set(el, { scaleX: 0 }),
    play: (el, delay) =>
      animate(el, { scaleX: 1, duration: 750, delay, ease: "outExpo" }),
  },
  // Steward's stamp: hit / miss lands with a bounce.
  stamp: {
    hide: (el) => utils.set(el, { opacity: 0, scale: 1.8, rotate: -12 }),
    play: (el, delay) =>
      animate(el, {
        opacity: 1,
        scale: 1,
        rotate: 0,
        duration: 480,
        delay,
        ease: "outBack(2)",
      }),
  },
  // Telemetry refresh: each reading slides up into its cell.
  readout: {
    hide: (el) =>
      utils.set(el.querySelectorAll("dd"), { opacity: 0, y: "45%" }),
    play: (el) =>
      animate(el.querySelectorAll("dd"), {
        opacity: 1,
        y: "0%",
        duration: 420,
        delay: stagger(60),
        ease: "outExpo",
      }),
  },
  // Timing screen: cells fill race by race, the predicted one flashes like a sector.
  timing: {
    hide: (el) => utils.set(el.querySelectorAll("[data-cell]"), { scaleX: 0 }),
    play: (el) => {
      animate(el.querySelectorAll("[data-cell]"), {
        scaleX: 1,
        duration: 240,
        delay: stagger(14),
        ease: "outQuad",
      });
      animate(el.querySelectorAll("[data-sector]"), {
        backgroundColor: ["#ffd100", "#e4002b", "#ffd100"],
        duration: 900,
        delay: stagger(220, { start: 700 }),
        ease: "inOutSine",
      });
    },
  },
  // Traffic flowing along the pipeline arrows (data-axis="y" on phones' down arrows).
  nudge: {
    play: (el) =>
      animate(el, {
        [el.dataset.axis === "y" ? "y" : "x"]: [0, 4],
        duration: 700,
        loop: true,
        alternate: true,
        ease: "inOutSine",
      }),
  },
};

/** Hover moves, delegated from the document through `data-hover="<name>"`. */
export const HOVERS: Record<string, (el: HTMLElement) => void> = {
  // Chequered flag waved on the primary button.
  flag: (el) => {
    const icon = el.querySelector("svg");
    if (icon)
      animate(icon, {
        rotate: [0, -16, 12, -8, 0],
        duration: 650,
        ease: "inOutSine",
      });
    const stripe = el.querySelector("[data-shine]");
    if (stripe)
      animate(stripe, {
        left: ["-60%", "130%"],
        duration: 650,
        ease: "outQuad",
      });
  },
  // Logo blips the throttle; starts and ends on its resting -12° slant (-skew-x-12).
  rev: (el) =>
    animate(el, {
      skewX: [-12, -20, -8, -12],
      duration: 480,
      ease: "outQuad",
    }),
};
