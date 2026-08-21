import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const modules = readFileSync(new URL("../app/bandportaal/BandAppModules.tsx", import.meta.url), "utf8");
const migration = readFileSync(new URL("../supabase/migrations/011_band_message_read_receipts.sql", import.meta.url), "utf8");

test("berichten gebruiken per gebruiker een expliciete leesstatus", () => {
  assert.doesNotMatch(modules, /markVisibleMessagesRead/);
  assert.match(modules, /Markeer als gelezen/);
  assert.doesNotMatch(modules, /Nog niet gelezen:/);
  assert.doesNotMatch(modules, /<strong>Gelezen:/);
  assert.match(modules, /className="is-read"/);
  assert.match(modules, /className="is-unread"/);
});

test("frontend gebruikt de werkelijke read_at-kolom uit migratie 003", () => {
  const baseMigration = readFileSync(new URL("../supabase/migrations/003_band_app.sql", import.meta.url), "utf8");
  assert.match(baseMigration, /read_at timestamptz not null default now\(\)/);
  assert.match(modules, /select\("message_id,user_id,read_at"\)/);
  assert.doesNotMatch(modules, /message_reads"\)\.select\("message_id,user_id,created_at"\)/);
});

test("een fout in leesbevestigingen blokkeert niet de volledige berichtenmodule", () => {
  assert.doesNotMatch(modules, /messageResult\.error, messageReadsResult\.error, fileResult\.error/);
  assert.match(modules, /De berichten zijn beschikbaar, maar de leesbevestigingen konden niet worden geladen/);
});

test("snelle dubbele inzending wordt geblokkeerd en het formulier wordt gewist", () => {
  assert.match(modules, /messageSubmitBusy\.current/);
  assert.match(modules, /formElement\.reset\(\)/);
});

test("RLS deelt leesbevestigingen maar laat alleen eigen status schrijven", () => {
  assert.match(migration, /for select[\s\S]*using \(public\.is_band_member\(\)\)/);
  assert.match(migration, /user_id = auth\.uid\(\)/);
});
