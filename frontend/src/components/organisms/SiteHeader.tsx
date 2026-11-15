import Link from "next/link";
import { GitHubIcon } from "@/components/atoms/GitHubIcon";
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
  /** Current route after the locale ("", "/review", "/championship", "/drivers" or "/how"). */
  path?: string;
}) {
  const pages = [
    { path: "", label: dict.predict },
    { path: "/review", label: dict.history },
    { path: "/championship", label: dict.championship },
    { path: "/drivers", label: dict.drivers },
    { path: "/how", label: dict.how },
  ];
  return (
    <header className="border-b-3 border-shade bg-ground">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-x-3 gap-y-3 px-4 py-3 sm:flex-nowrap sm:gap-x-4 sm:px-6 lg:gap-x-6 lg:px-10">
        <a href={`/${lang}`} className="flex shrink-0 items-center gap-3 no-underline">
          <span
            data-hover="rev"
            className="-skew-x-12 border-3 border-ink bg-pirelli px-2.5 py-0.5 text-2xl leading-none font-sidewall text-ink shadow-red sm:text-3xl"
          >
            Box<span className="text-redline">box</span>
          </span>
          <span className="hidden text-xs font-bold tracking-wide text-muted uppercase xl:inline 2xl:text-sm">
            {dict.tagline}
          </span>
        </a>
        {/* Phones put the sections on their own two-row grid under the logo. */}
        <nav
          aria-label={dict.nav}
          className="order-last grid w-full grid-cols-6 gap-[3px] border-3 border-fg bg-fg sm:order-none sm:flex sm:w-auto sm:shrink-0 sm:gap-0"
        >
          {pages.map((p) => (
            <Link
              key={p.path}
              href={`/${lang}${p.path}`}
              aria-current={p.path === path ? "page" : undefined}
              className="col-span-2 whitespace-nowrap bg-ground px-2 py-2 text-center text-xs font-black uppercase italic hover:bg-raised aria-[current=page]:bg-fg aria-[current=page]:text-ground nth-[n+4]:col-span-3 sm:px-2.5 sm:py-1.5 md:px-3 lg:px-4 sm:text-xs md:text-sm sm:not-first:border-l-3 sm:not-first:border-fg"
            >
              {p.label}
            </Link>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
          <a
            href="https://github.com/davillera/boxbox"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={dict.source}
            title={dict.source}
            className="flex size-10 items-center justify-center border-3 border-fg bg-ground text-fg shadow-hard-sm transition-[translate,box-shadow] duration-150 hover:-translate-0.5 hover:shadow-hard active:translate-0.5 active:shadow-none"
          >
            <GitHubIcon className="size-5" />
          </a>
          <ThemeToggle label={dict.theme} />
          <LanguageSwitch current={lang} label={dict.language} path={path} />
        </div>
      </div>
    </header>
  );
}
