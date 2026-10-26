import type es from "./es.json";

const dictionaries = {
  es: () => import("./es.json").then((m) => m.default),
  en: () => import("./en.json").then((m) => m.default),
};

export type Locale = keyof typeof dictionaries;
export type Dictionary = typeof es;

export const locales = Object.keys(dictionaries) as Locale[];
export const defaultLocale: Locale = "en";

export const hasLocale = (locale: string): locale is Locale =>
  locale in dictionaries;

export const getDictionary = (locale: Locale): Promise<Dictionary> =>
  dictionaries[locale]();

/** First supported language in Accept-Language order ("es-CO,es;q=0.9,en;q=0.8" -> "es"). */
export function pickLocale(acceptLanguage: string | null): Locale {
  const preferred = (acceptLanguage ?? "")
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { lang: tag.toLowerCase().split("-")[0], q: q ? Number(q) : 1 };
    })
    .filter((p) => p.q > 0)
    .sort((a, b) => b.q - a.q);
  return preferred.map((p) => p.lang).find(hasLocale) ?? defaultLocale;
}

/** Fill `{name}` placeholders in a dictionary string. */
export function fill(text: string, values: Record<string, string | number>) {
  return text.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));
}
