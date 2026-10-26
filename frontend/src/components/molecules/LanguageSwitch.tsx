import Link from "next/link";
import { locales, type Locale } from "@/dictionaries";

export function LanguageSwitch({
  current,
  label,
}: {
  current: Locale;
  label: string;
}) {
  return (
    <nav
      aria-label={label}
      className="flex border-3 border-fg bg-ground shadow-hard-sm"
    >
      {locales.map((locale) => (
        <Link
          key={locale}
          href={`/${locale}`}
          hrefLang={locale}
          aria-current={locale === current ? "page" : undefined}
          className="px-3 py-1.5 text-sm font-black uppercase italic not-first:border-l-3 not-first:border-fg hover:bg-raised aria-[current=page]:bg-pirelli aria-[current=page]:text-ink"
        >
          {locale}
        </Link>
      ))}
    </nav>
  );
}
