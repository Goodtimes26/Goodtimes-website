import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { moveListItem } from "../lib/sortableLists.ts";

const modules = readFileSync(new URL("../app/bandportaal/BandAppModules.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../app/bandportaal/portal.css", import.meta.url), "utf8");
const migration = readFileSync(new URL("../supabase/migrations/016_sortable_band_lists.sql", import.meta.url), "utf8");

test("verplaatst positie 5 naar 2 en nummert de array opnieuw", () => {
  assert.deepEqual(moveListItem([1, 2, 3, 4, 5], 4, 1), [1, 5, 2, 3, 4]);
});

test("verplaatst positie 2 naar laatst en laatst naar eerst", () => {
  assert.deepEqual(moveListItem([1, 2, 3, 4, 5], 1, 4), [1, 3, 4, 5, 2]);
  assert.deepEqual(moveListItem([1, 2, 3, 4, 5], 4, 0), [5, 1, 2, 3, 4]);
});

test("ondersteunt meerdere opeenvolgende verplaatsingen", () => {
  const first = moveListItem([1, 2, 3, 4, 5], 4, 1);
  assert.deepEqual(moveListItem(first, 0, 4), [5, 2, 3, 4, 1]);
});

test("toevoegen en verwijderen behouden de handmatig gekozen volgorde", () => {
  const sorted = moveListItem(["a", "b", "c"], 2, 0);
  const added = [...sorted, "d"];
  assert.deepEqual(added.filter((id) => id !== "b"), ["c", "a", "d"]);
});

test("setlists, repetities en repertoire slaan de volgorde via Supabase op", () => {
  assert.match(modules, /rpc\("save_setlist"/);
  assert.match(modules, /rpc\("save_rehearsal_song_order"/);
  assert.match(modules, /rpc\("save_song_order"/);
  assert.match(migration, /portal_order integer/);
  assert.match(migration, /rehearsal_songs add column if not exists position integer/);
  assert.doesNotMatch(migration, /delete from public\.songs/);
});

test("touch-handles gebruiken pointer capture en automatisch scrollen", () => {
  assert.match(modules, /setPointerCapture/);
  assert.match(modules, /window\.scrollBy/);
  assert.match(css, /touch-action:none/);
});
