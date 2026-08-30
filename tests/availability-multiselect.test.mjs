import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pickerPath = new URL("../app/bandportaal/AgendaAvailabilityPicker.tsx", import.meta.url);
const cssPath = new URL("../app/bandportaal/portal.css", import.meta.url);

test("availability picker toggles multiple dates and saves one unavailable batch", async () => {
  const source = await readFile(pickerPath, "utf8");
  assert.match(source, /current\.includes\(chosenDate\) \? current\.filter/);
  assert.match(source, /const rows = selectedDates\.map/);
  assert.match(source, /status: "unavailable" as const/);
  assert.match(source, /\.from\("availability"\)\.upsert\(rows, \{ onConflict: "user_id,date" \}\)/);
  assert.match(source, /Geselecteerde datums blokkeren/);
  assert.match(source, /if \(saveError\)[\s\S]*Probeer het opnieuw/);
  assert.match(source, /setSelectedDates\(\[\]\);[\s\S]*window\.location\.reload\(\)/);
});

test("selected days have a clear phone-friendly visual state", async () => {
  const css = await readFile(cssPath, "utf8");
  assert.match(css, /\.portal-day\.portal-day-selected/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /@media\(max-width:600px\)/);
});
