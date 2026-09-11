import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migration = await readFile(new URL("../supabase/migrations/030_add_geldermalsen_band_event.sql", import.meta.url), "utf8");
const portal = await readFile(new URL("../app/bandportaal/BandPortal.tsx", import.meta.url), "utf8");

test("Geldermalsen wordt niet-destructief als toekomstig optreden toegevoegd", () => {
  assert.match(migration, /date '2027-02-26'/);
  assert.match(migration, /time '20:30'/);
  assert.match(migration, /null,\s*'Geldermalsen',\s*'Schenkerij De Beurs',\s*'Gratis toegang'/s);
  assert.match(migration, /'performance'/);
  assert.match(migration, /'confirmed'/);
  assert.match(migration, /true/);
  assert.doesNotMatch(migration, /delete\s+from|truncate|drop\s+table/i);
});

test("de migratie bewaart Venray en voorkomt een dubbel Geldermalsen-record", () => {
  assert.match(migration, /event_date = date '2026-10-10'/);
  assert.match(migration, /gouwe leeuw/);
  assert.match(migration, /if exists[\s\S]*2027-02-26[\s\S]*return;/i);
});

test("bestaande portal-logica sorteert optredens en gebruikt dezelfde datumgestuurde beschikbaarheid", () => {
  assert.match(portal, /from\("events"\)[\s\S]{0,180}order\("event_date"\)/);
  assert.match(portal, /item\.event_type === "performance" && item\.event_date >= today/);
  assert.match(portal, /rpc\("team_availability", \{ target_date: date \}\)/);
});
