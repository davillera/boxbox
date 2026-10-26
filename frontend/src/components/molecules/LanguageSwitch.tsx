import { locales, type Locale } from "@/dictionaries";

/**
 * Plain links, not next/link: each locale is its own root layout, and a client-side
 * swap re-creates <html> without the data-theme the pre-paint script set.
 */
export function LanguageSwitch({
  current,
  label,
  path = "",
}: {
  current: Locale;
  label: string;
  /** Route after the locale, e.g. "/review", so switching keeps the page. */
  path?: string;
}) {
  return (
    <nav
      aria-label={label}
      className="flex border-3 border-fg bg-ground shadow-hard-sm"
    >
      {locales.map((locale) => (
        <a
          key={locale}
          href={`/${locale}${path}`}
          hrefLang={locale}
          aria-current={locale === current ? "page" : undefined}
          className="px-3 py-1.5 text-sm font-black uppercase italic not-first:border-l-3 not-first:border-fg hover:bg-raised aria-[current=page]:bg-pirelli aria-[current=page]:text-ink"
        >
          {locale}
        </a>
      ))}
    </nav>
  );
}
