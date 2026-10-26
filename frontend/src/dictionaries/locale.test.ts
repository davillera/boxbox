import assert from "node:assert/strict";
import { test } from "node:test";
import { pickLocale } from "./index.ts";

test("pickLocale follows Accept-Language preference and region tags", () => {
  assert.equal(pickLocale("es-CO,es;q=0.9,en;q=0.8"), "es");
  assert.equal(pickLocale("fr-FR,en;q=0.5,es;q=0.4"), "en");
  assert.equal(pickLocale("en;q=0.3,es;q=0.7"), "es");
});

test("pickLocale falls back to the default and skips refused languages", () => {
  assert.equal(pickLocale(null), "en");
  assert.equal(pickLocale("de,fr"), "en");
  assert.equal(pickLocale("es;q=0,en;q=0.1"), "en");
});
