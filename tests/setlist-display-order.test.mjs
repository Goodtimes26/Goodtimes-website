import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("genummerde setlists worden numeriek weergegeven zonder nummerinhoud te wijzigen", async () => {
  const source = await readFile(new URL("../app/bandportaal/BandAppModules.tsx", import.meta.url), "utf8");

  assert.match(source, /function sortSetlistsForDisplay/);
  assert.match(source, /name\.match\(\/\^\\s\*set\\s\*\(\\d\+\)\\s\*\$\/i\)/);
  assert.match(source, /Number\(leftNumber\) - Number\(rightNumber\)/);
  assert.match(source, /displaySetlists\.map\(\(setlist\)/);
  assert.match(source, /setlistItems\.filter\(\(item\) => item\.setlist_id === setlist\.id\)\.sort\(\(a, b\) => a\.position - b\.position\)/);
});
