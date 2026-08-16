import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(new URL("../supabase/migrations/010_audio_upload_messages.sql", import.meta.url), "utf8");
const modules = readFileSync(new URL("../app/bandportaal/BandAppModules.tsx", import.meta.url), "utf8");

test("iedere audio-insert gebruikt één centrale database-trigger", () => {
  assert.match(migration, /after insert on public\.band_files/i);
  assert.match(migration, /new\.storage_path is null[\s\S]*lower\(coalesce\(new\.category/);
  assert.match(migration, /insert into public\.band_messages/);
  assert.match(migration, /new\.uploaded_by/);
  assert.match(migration, /new\.title/);
});

test("bestand en bericht hebben een unieke idempotente koppeling", () => {
  assert.match(migration, /source_file_id uuid references public\.band_files\(id\) on delete set null/);
  assert.match(migration, /create unique index if not exists band_messages_source_file_unique/);
  assert.match(migration, /on conflict \(source_file_id\)[\s\S]*do nothing/);
});

test("migratie maakt geen historische berichten en bestaande upload blijft atomair geordend", () => {
  assert.doesNotMatch(migration, /insert into public\.band_messages[\s\S]*select[\s\S]*from public\.band_files/i);
  const storageUpload = modules.indexOf('.storage.from("band-audio").upload');
  const metadataInsert = modules.indexOf('.from("band_files").insert', storageUpload);
  assert.ok(storageUpload >= 0 && metadataInsert > storageUpload);
});

test("Bandberichten en Wat is nieuw blijven dezelfde bestaande berichtentabel gebruiken", () => {
  assert.match(modules, /from\("band_messages"\)\.select/);
  assert.match(migration, /insert into public\.band_messages/);
});
