// Podium order wears the dry compounds: soft, medium, hard.
const COMPOUNDS = [
  "var(--color-redline)",
  "var(--color-pirelli)",
  "var(--color-chalk)",
];

/** A tyre seen side-on: black rubber, compound band, position on the hub. */
export function TyreBadge({
  position,
  delay = 0,
}: {
  position: number;
  /** ms; spins down in step with its slat (lib/motion PRESETS.tyre). */
  delay?: number;
}) {
  const band = COMPOUNDS[position - 1] ?? "var(--color-smoke)";
  return (
    <svg
      data-anim="tyre"
      data-delay={delay}
      viewBox="0 0 64 64"
      className="size-14 shrink-0 sm:size-18"
      aria-hidden
    >
      <circle cx="32" cy="32" r="30" fill="var(--color-ink)" />
      <circle
        cx="32"
        cy="32"
        r="22"
        fill="none"
        stroke={band}
        strokeWidth="5"
      />
      <text
        x="32"
        y="33"
        textAnchor="middle"
        dominantBaseline="central"
        fill="var(--color-chalk)"
        fontSize="19"
        fontWeight="900"
        fontStyle="italic"
      >
        P{position}
      </text>
    </svg>
  );
}
