import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const site = await readFile(new URL("../app/site.tsx", import.meta.url), "utf8");
const translations = await readFile(new URL("../app/i18n.ts", import.meta.url), "utf8");

test("publieke agenda toont Venray en daarna Geldermalsen met dezelfde kaartstructuur", () => {
  const venray = site.indexOf("Café-Zaal De Gouwe Leeuw");
  const geldermalsen = site.indexOf("Schenkerij De Beurs");
  assert.ok(venray >= 0 && geldermalsen > venray);
  assert.equal((site.match(/className="agenda-event"/g) ?? []).length, 2);
  assert.match(site.slice(geldermalsen, geldermalsen + 500), /Aanvang 20:30 uur · Gratis toegang/);
  assert.doesNotMatch(site.slice(geldermalsen, geldermalsen + 500), /Eindtijd/);
});

test("agenda-intro is neutraal en de nieuwe agenda-inhoud heeft Duitse en Engelse vertalingen", () => {
  assert.match(site, /title="AGENDA\." accent="LIVE\."/);
  assert.match(translations, /"februari": "Februar"/);
  assert.match(translations, /"februari": "February"/);
  assert.match(translations, /"Aanvang 20:30 uur · Gratis toegang": "Beginn 20:30 Uhr · Eintritt frei"/);
  assert.match(translations, /"Aanvang 20:30 uur · Gratis toegang": "Starts at 8:30 pm · Free admission"/);
});
