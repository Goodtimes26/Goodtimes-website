import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const modules = readFileSync(new URL("../app/bandportaal/BandAppModules.tsx", import.meta.url), "utf8");
const migration = readFileSync(new URL("../supabase/migrations/011_band_message_read_receipts.sql", import.meta.url), "utf8");

test("berichten gebruiken per gebruiker een expliciete leesstatus", () => {
  assert.doesNotMatch(modules, /markVisibleMessagesRead/);
  assert.match(modules, /Markeer als gelezen/);
  assert.match(modules, /Nog niet gelezen:/);
  assert.match(modules, /Gelezen:/);
});

test("snelle dubbele inzending wordt geblokkeerd en het formulier wordt gewist", () => {
  assert.match(modules, /messageSubmitBusy\.current/);
  assert.match(modules, /formElement\.reset\(\)/);
});

test("RLS deelt leesbevestigingen maar laat alleen eigen status schrijven", () => {
  assert.match(migration, /for select[\s\S]*using \(public\.is_band_member\(\)\)/);
  assert.match(migration, /user_id = auth\.uid\(\)/);
});
