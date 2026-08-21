import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const modules = readFileSync(new URL("../app/bandportaal/BandAppModules.tsx", import.meta.url), "utf8");

test("bestaande repetitie-editor wijzigt datum en gekoppelde nummers", () => {
  assert.match(modules, /function RehearsalEditor/);
  assert.match(modules, /name="rehearsal_date" type="date"/);
  assert.match(modules, /setSongIds\(\(current\) => current\.filter/);
  assert.match(modules, /setSongIds\(\(current\) => \[\.\.\.current, songToAdd\]\)/);
  assert.match(modules, /from\("events"\)\.update\(\{ event_date: date \}\)/);
  assert.match(modules, /from\("rehearsal_songs"\)\.delete/);
  assert.match(modules, /from\("rehearsal_songs"\)\.insert/);
});

test("repetitie-editor verwijdert geen nummers uit het centrale repertoire", () => {
  assert.doesNotMatch(modules, /from\("songs"\)\.delete\(\)/);
  assert.match(modules, /currentSongIds\.filter\(\(id\) => !songIds\.includes\(id\)\)/);
});
