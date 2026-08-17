import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { eventVisibilityLabel } from "../lib/bandportal.ts";

const portal = readFileSync(new URL("../app/bandportaal/BandPortal.tsx", import.meta.url), "utf8");
const initialMigration = readFileSync(new URL("../supabase/migrations/001_band_portal.sql", import.meta.url), "utf8");

test("Agenda bewerken is alleen voor beheerders zichtbaar en bereikbaar", () => {
  assert.match(portal, /isAdmin && <button onClick=\{\(\) => \{ setEditingEvent\(null\); setTab\("agenda-admin"\); \}\}/);
  assert.match(portal, /tab === "agenda-admin" && isAdmin/);
  assert.match(initialMigration, /Admins update events[\s\S]*using \(public\.is_admin\(\)\)[\s\S]*with check \(public\.is_admin\(\)\)/);
});

test("agenda-editor schrijft alle bestaande velden en dezelfde zichtbaarheid terug", () => {
  assert.match(portal, /from\("events"\)\.update\(payload\)\.eq\("id", editingEvent\.id\)/);
  for (const field of ["description", "event_date", "start_time", "end_time", "location", "event_type", "is_public", "notes"]) {
    assert.match(portal, new RegExp(`${field}:`));
  }
});

test("homepage en beheer gebruiken één zichtbaarheidstoewijzing", () => {
  assert.equal(eventVisibilityLabel({ is_public: true }), "Openbaar");
  assert.equal(eventVisibilityLabel({ is_public: false }), "Besloten");
  assert.match(portal, /eventVisibilityLabel\(nextEvent\)/);
  assert.match(portal, /eventVisibilityLabel\(item\)/);
  assert.doesNotMatch(portal, /nextEvent\.is_public \? "Openbaar" : "Besloten"/);
});
