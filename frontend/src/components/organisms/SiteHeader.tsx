import { LanguageSwitch } from "@/components/molecules/LanguageSwitch";
import { ThemeToggle } from "@/components/molecules/ThemeToggle";
import type { Dictionary, Locale } from "@/dictionaries";

export function SiteHeader({
  lang,
  dict,
}: {
  lang: Locale;
  dict: Dictionary["header"];
}) {
  return (
    <header className="border-b-3 border-shade bg-ground">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-10">
        <a href={`/${lang}`} className="flex items-center gap-4 no-underline">
          <span className="-skew-x-12 border-3 border-ink bg-pirelli px-2.5 py-0.5 text-2xl leading-none font-sidewall text-ink shadow-red sm:text-3xl">
            Box<span className="text-redline">box</span>
          </span>
          <span className="hidden text-sm font-bold tracking-wide text-muted uppercase sm:inline">
            {dict.tagline}
          </span>
        </a>
        <div className="flex items-center gap-5">
          <a
            href="https://github.com/davillera/boxbox"
            className="hidden text-sm font-bold underline decoration-redline decoration-3 hover:text-redline md:inline"
          >
            {dict.source}
          </a>
          <ThemeToggle label={dict.theme} />
          <LanguageSwitch current={lang} label={dict.language} />
        </div>
      </div>
    </header>
  );
}
