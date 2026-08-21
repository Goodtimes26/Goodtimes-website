import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const modules = readFileSync(new URL("../app/bandportaal/BandAppModules.tsx", import.meta.url), "utf8");

test("bestaande repetitie-editor wijzigt datum en gekoppelde nummers", () => {
  assert.match(modules, /function RehearsalEditor/);
  assert.match(modules, /name="rehearsal_date" type="date"/);
  assert.match(modules, /songIdsRef\.current\.filter/);
  assert.match(modules, /\[\.\.\.songIdsRef\.current, songToAdd\]/);
  assert.match(modules, /from\("events"\)\.update\(\{ event_date: date \}\)/);
  assert.match(modules, /rpc\("save_rehearsal_song_order"/);
  assert.match(modules, /console\.error\("\[GoodTimes repetities\] Repetitienummers opslaan mislukt/);
});

test("repetitie-editor verwijdert geen nummers uit het centrale repertoire", () => {
  assert.doesNotMatch(modules, /from\("songs"\)\.delete\(\)/);
  assert.match(modules, /Repertoire-items zijn behouden/);
});
