import Link from "next/link";
import { LanguageSwitch } from "@/components/molecules/LanguageSwitch";
import { ThemeToggle } from "@/components/molecules/ThemeToggle";
import type { Dictionary, Locale } from "@/dictionaries";

export function SiteHeader({
  lang,
  dict,
  path = "",
}: {
  lang: Locale;
  dict: Dictionary["header"];
  /** Current route after the locale ("", "/review" or "/how"). */
  path?: string;
}) {
  const pages = [
    { path: "", label: dict.predict },
    { path: "/review", label: dict.history },
    { path: "/how", label: dict.how },
  ];
  return (
    <header className="border-b-3 border-shade bg-ground">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3 sm:px-6 lg:px-10">
        <a href={`/${lang}`} className="flex items-center gap-4 no-underline">
          <span
            data-hover="rev"
            className="-skew-x-12 border-3 border-ink bg-pirelli px-2.5 py-0.5 text-2xl leading-none font-sidewall text-ink shadow-red sm:text-3xl"
          >
            Box<span className="text-redline">box</span>
          </span>
          <span className="hidden text-sm font-bold tracking-wide text-muted uppercase xl:inline">
            {dict.tagline}
          </span>
        </a>
        {/* Phones put the sections on their own row under the logo. */}
        <nav
          aria-label={dict.nav}
          className="order-last flex w-full border-3 border-fg sm:order-none sm:mr-auto sm:w-auto"
        >
          {pages.map((p) => (
            <Link
              key={p.path}
              href={`/${lang}${p.path}`}
              aria-current={p.path === path ? "page" : undefined}
              className="flex-1 px-2 py-1.5 text-center text-xs font-black uppercase italic not-first:border-l-3 not-first:border-fg hover:bg-raised aria-[current=page]:bg-fg aria-[current=page]:text-ground sm:flex-none sm:px-4 sm:text-sm"
            >
              {p.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-5">
          <a
            href="https://github.com/davillera/boxbox"
            className="hidden text-sm font-bold underline decoration-redline decoration-3 hover:text-redline md:inline"
          >
            {dict.source}
          </a>
          <ThemeToggle label={dict.theme} />
          <LanguageSwitch current={lang} label={dict.language} path={path} />
        </div>
      </div>
    </header>
  );
}
