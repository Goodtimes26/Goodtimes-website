import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pickerPath = new URL("../app/bandportaal/AgendaAvailabilityPicker.tsx", import.meta.url);
const cssPath = new URL("../app/bandportaal/portal.css", import.meta.url);
const portalPath = new URL("../app/bandportaal/BandPortal.tsx", import.meta.url);
const migrationPath = new URL("../supabase/migrations/029_team_availability_neutral_status.sql", import.meta.url);

test("availability picker toggles multiple dates and saves all three statuses in one batch", async () => {
  const source = await readFile(pickerPath, "utf8");
  assert.match(source, /current\.includes\(chosenDate\) \? current\.filter/);
  assert.match(source, /const rows = selectedDates\.map/);
  assert.match(source, /saveSelectedDates\("available"\)/);
  assert.match(source, /saveSelectedDates\("maybe"\)/);
  assert.match(source, /saveSelectedDates\("unavailable"\)/);
  assert.match(source, /\.from\("availability"\)\.upsert\(rows, \{ onConflict: "user_id,date" \}\)/);
  assert.match(source, /if \(saveError\)[\s\S]*Probeer het opnieuw/);
  assert.match(source, /setSelectedDates\(\[\]\);[\s\S]*window\.location\.reload\(\)/);
});

test("stored statuses can be deleted for one or several selected dates", async () => {
  const source = await readFile(pickerPath, "utf8");
  assert.match(source, /\.from\("availability"\)\.delete\(\)\.eq\("user_id", userId\)\.in\("date", selectedDates\)/);
  assert.match(source, /Status verwijderen/);
  assert.match(source, /if \(deleteError\)[\s\S]*Probeer het opnieuw/);
});

test("selected days have a clear phone-friendly visual state", async () => {
  const css = await readFile(cssPath, "utf8");
  assert.match(css, /\.portal-day\.portal-day-selected/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /@media\(max-width:600px\)/);
});

test("deleting a stored status returns that member and date to neutral", async () => {
  const [portal, migration] = await Promise.all([
    readFile(portalPath, "utf8"),
    readFile(migrationPath, "utf8"),
  ]);
  assert.match(migration, /coalesce\(a\.status::text, 'unset'\)/);
  assert.match(portal, /row\?\.status \?\? "unset"/);
  assert.match(portal, /statuses\.includes\("unset"\) \? "unset"/);
  assert.doesNotMatch(portal, /row\?\.status \?\? "available"/);
});
