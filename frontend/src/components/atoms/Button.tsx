import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
};

const VARIANTS = {
  primary:
    "border-ink bg-pirelli text-ink shadow-red hover:shadow-[8px_8px_0_0_var(--color-redline)] px-6 py-4 text-lg",
  secondary:
    "border-fg bg-ground text-fg shadow-hard-sm hover:shadow-hard px-3 py-1.5 text-sm",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: Props) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 border-3 font-black tracking-wide uppercase italic transition-[translate,box-shadow] duration-150 ease-out hover:-translate-0.5 active:translate-0.5 active:shadow-none disabled:cursor-wait disabled:opacity-85 disabled:hover:translate-0 ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}
