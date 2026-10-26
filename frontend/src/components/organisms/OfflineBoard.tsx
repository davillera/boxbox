import { RadioTower } from "lucide-react";
import type { Dictionary, Locale } from "@/dictionaries";

export function OfflineBoard({
  dict,
  lang,
}: {
  dict: Dictionary["errors"];
  lang: Locale;
}) {
  return (
    <section
      role="alert"
      className="flex max-w-2xl flex-col gap-4 border-3 border-ink bg-pirelli p-6 text-ink shadow-red"
    >
      <RadioTower aria-hidden className="size-10" strokeWidth={2.5} />
      <h2 className="text-3xl font-sidewall">{dict.offlineTitle}</h2>
      <p className="max-w-[60ch] text-base font-medium">{dict.offline}</p>
      <a
        href={`/${lang}`}
        className="self-start border-3 border-ink bg-ink px-5 py-2.5 font-black text-pirelli uppercase italic no-underline shadow-[4px_4px_0_0_var(--color-redline)]"
      >
        {dict.retry}
      </a>
    </section>
  );
}
