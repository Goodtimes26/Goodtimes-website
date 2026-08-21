import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const portal = readFileSync(new URL("../app/bandportaal/BandPortal.tsx", import.meta.url), "utf8");
const migration = readFileSync(new URL("../supabase/migrations/012_band_activity_details.sql", import.meta.url), "utf8");

test("activiteitenlog bewaart oude en nieuwe waarden zonder bestaande data te wijzigen", () => {
  assert.match(migration, /old_data jsonb/);
  assert.match(migration, /new_data jsonb not null/);
  assert.match(migration, /after insert or update/);
  assert.doesNotMatch(migration, /delete from|truncate/i);
});

test("Wat is er nieuw toont titel, wijzigingsregels en ondersteunt alle gevraagde typen", () => {
  assert.match(portal, /latestActivity\.detail/);
  assert.match(portal, /latestActivity\.changes\?\.map/);
  assert.match(portal, /Nieuw bestand\/audio/);
  assert.match(portal, /Repertoire gewijzigd/);
});

test("een melding navigeert naar en markeert het specifieke item", () => {
  assert.match(portal, /CSS\.escape\(activity\.id\)/);
  assert.match(portal, /heading\.textContent\?\.trim\(\) === activity\.detail/);
  assert.match(portal, /scrollIntoView/);
});
