import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
};

const VARIANTS = {
  primary:
    "relative overflow-hidden border-ink bg-pirelli text-ink shadow-red hover:shadow-[8px_8px_0_0_var(--color-redline)] px-6 py-4 text-lg",
  secondary:
    "border-fg bg-ground text-fg shadow-hard-sm hover:shadow-hard px-3 py-1.5 text-sm",
};

export function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: Props) {
  return (
    <button
      // Primary waves its flag and sweeps a sponsor stripe on hover (lib/motion HOVERS.flag).
      data-hover={variant === "primary" ? "flag" : undefined}
      className={`inline-flex items-center justify-center gap-2 border-3 font-black tracking-wide uppercase italic transition-[translate,box-shadow] duration-150 ease-out hover:-translate-0.5 active:translate-0.5 active:shadow-none disabled:cursor-wait disabled:opacity-85 disabled:hover:translate-0 ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {children}
      {variant === "primary" && (
        <span
          data-shine
          aria-hidden
          className="pointer-events-none absolute inset-y-0 -left-[60%] w-2/5 -skew-x-20 bg-linear-to-r from-transparent via-white/60 to-transparent"
        />
      )}
    </button>
  );
}
