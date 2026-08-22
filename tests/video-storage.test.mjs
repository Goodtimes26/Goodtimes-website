import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const modules = readFileSync(new URL("../app/bandportaal/BandAppModules.tsx", import.meta.url), "utf8");
const portal = readFileSync(new URL("../app/bandportaal/BandPortal.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../app/bandportaal/portal.css", import.meta.url), "utf8");
const migration = readFileSync(new URL("../supabase/migrations/017_band_video_storage.sql", import.meta.url), "utf8");

test("bestaande privébucket en RLS blijven behouden terwijl video-MIME-types worden toegevoegd", () => {
  assert.match(migration, /update storage\.buckets/);
  assert.match(migration, /where id = 'band-audio'/);
  assert.match(migration, /video\/mp4/);
  assert.match(migration, /video\/quicktime/);
  assert.match(migration, /video\/x-m4v/);
  assert.match(migration, /video\/webm/);
  assert.doesNotMatch(migration, /delete from|drop policy|drop table/i);
});

test("upload accepteert mobiele audio en video en bewaakt de bestaande limiet", () => {
  assert.match(modules, /\.mp3,\.m4a,\.wav,\.mp4,\.mov,\.m4v,\.webm/);
  assert.match(modules, /file\.size > 52428800/);
  assert.match(modules, /Deze video is te groot om te uploaden/);
  assert.match(modules, /category: media\.kind/);
  assert.match(modules, /contentType: media\.mimeType/);
});

test("video speelt inline met native controls en bestaande audio blijft werken", () => {
  assert.match(modules, /<video className="portal-video-player" controls playsInline preload="metadata"/);
  assert.match(modules, /<audio className="portal-audio-player" controls preload="none"/);
  assert.match(css, /\.portal-video-player/);
  assert.match(modules, /storage\.from\("band-audio"\)\.remove/);
});

test("zichtbare naam is Bestanden, audio & video", () => {
  assert.match(modules, /Bestanden, audio &amp; video/);
  assert.match(portal, /Bestanden, audio &amp; video/);
});
