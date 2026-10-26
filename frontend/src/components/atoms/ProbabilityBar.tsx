type Props = {
  value: number;
  /** Bar length for value = scale; keeps small win chances readable. */
  scale?: number;
  tone: "win" | "podium";
  label: string;
  delay?: number;
};

export function ProbabilityBar({
  value,
  scale = 1,
  tone,
  label,
  delay = 0,
}: Props) {
  const width = Math.min(100, (value / scale) * 100);
  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      <div
        className="h-3.5 min-w-6 flex-1 border-2 border-fg/70 bg-ground"
        aria-hidden
      >
        <div
          className={`h-full origin-left animate-bar ${tone === "win" ? "bg-redline" : "bg-pirelli"}`}
          style={{ width: `${width}%`, animationDelay: `${delay}ms` }}
        />
      </div>
      <span className="w-11 text-right text-sm font-extrabold font-narrow tabular-nums sm:w-14">
        {label}
      </span>
    </div>
  );
}
