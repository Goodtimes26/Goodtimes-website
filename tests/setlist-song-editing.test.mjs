import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../app/bandportaal/BandAppModules.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../app/bandportaal/portal.css", import.meta.url), "utf8");

test("setlist songs can be edited without replacing or reordering setlist items", () => {
  assert.match(source, /function SetlistSongEditor/);
  assert.match(source, /className="portal-edit-song"/);
  assert.match(source, /source_system: song\.source_id \? "goodtimes-setlist-maker-manual" : song\.source_system/);
  assert.match(source, /Titel<input name="title"/);
  assert.match(source, /Artiest<input name="artist"/);
  assert.match(source, /Zanger\/zangeres<input name="vocalist"/);
  assert.match(source, /Toonsoort<input name="musical_key"/);
  assert.match(source, /BPM<input name="bpm"/);
  assert.match(source, /Speelduur in seconden<input name="duration_seconds"/);
  assert.match(source, /YouTube-link<input name="youtube_url"/);
  assert.match(styles, /\.portal-setlist-song-actions button\{width:100%;min-height:44px\}/);
});
