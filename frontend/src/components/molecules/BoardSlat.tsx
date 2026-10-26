import { Joined } from "@/components/atoms/Joined";
import { TyreBadge } from "@/components/atoms/TyreBadge";

type Props = {
  position: number;
  code: string;
  detail?: string[];
  value?: string;
  valueLabel?: string;
  delay?: number;
};

/** A pit-board line: tyre badge, driver code, the number that matters. */
export function BoardSlat({
  position,
  code,
  detail,
  value,
  valueLabel,
  delay = 0,
}: Props) {
  return (
    <li
      className="grid [transform-origin:top] animate-slat grid-cols-[auto_1fr_auto] items-center gap-x-4 border-3 border-ink bg-ink py-2 pr-4 pl-2 sm:gap-x-6 sm:pr-5"
      style={{ animationDelay: `${delay}ms` }}
    >
      <TyreBadge position={position} />
      <span className="flex min-w-0 flex-col">
        <span className="text-4xl leading-none font-sidewall text-chalk sm:text-6xl">
          {code}
        </span>
        {detail && (
          <span className="mt-1 text-sm leading-snug font-semibold text-smoke">
            <Joined parts={detail} />
          </span>
        )}
      </span>
      {value && (
        <span className="flex flex-col items-end">
          <span className="text-3xl leading-none font-black text-pirelli italic tabular-nums sm:text-5xl">
            {value}
          </span>
          <span className="mt-1 text-xs font-bold tracking-wide text-smoke uppercase">
            {valueLabel}
          </span>
        </span>
      )}
    </li>
  );
}
