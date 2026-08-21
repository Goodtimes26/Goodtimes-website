import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const modules = readFileSync(new URL("../app/bandportaal/BandAppModules.tsx", import.meta.url), "utf8");

test("beheerders kunnen ook links en documenten verwijderen", () => {
  assert.match(modules, /onDeleteItem/);
  assert.match(modules, /Weet je zeker dat je dit item wilt verwijderen\?/);
  assert.match(modules, /from\("band_files"\)\.delete\(\)\.eq\("id", file\.id\)\.is\("storage_path", null\)/);
});

test("audio en externe items houden afzonderlijke veilige verwijderpaden", () => {
  assert.match(modules, /onDeleteAudio\(file\)/);
  assert.match(modules, /onDeleteItem\(file\)/);
  assert.match(modules, /isAdmin && <button className="portal-delete-audio"/);
});
