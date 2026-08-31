import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migration = await readFile(new URL("../supabase/migrations/025_band_message_comments.sql", import.meta.url), "utf8");
const moduleSource = await readFile(new URL("../app/bandportaal/BandAppModules.tsx", import.meta.url), "utf8");

test("reacties blijven aan hun oorspronkelijke bericht gekoppeld en verdwijnen mee", () => {
  assert.match(migration, /message_id uuid not null references public\.band_messages\(id\) on delete cascade/i);
  assert.match(moduleSource, /from\("message_comments"\)[\s\S]{0,160}order\("created_at"\)/);
});

test("leden beheren alleen eigen reacties en beheerders mogen alle reacties verwijderen", () => {
  assert.match(migration, /author_id = auth\.uid\(\)/);
  assert.match(migration, /author_id = auth\.uid\(\) or public\.is_admin\(\)/);
});

test("nieuwe reactie hergebruikt de persoonlijke bericht-leesstatus", () => {
  assert.match(migration, /delete from public\.message_reads[\s\S]*user_id <> new\.author_id/);
  assert.match(migration, /on conflict \(message_id, user_id\) do update/);
  assert.match(migration, /Nieuwe reactie/);
});

test("ieder bericht toont standaard direct alleen de eigen chronologische reacties en invoer", () => {
  assert.match(moduleSource, /Schrijf een reactie…/);
  assert.match(moduleSource, /count === 1 \? "reactie" : "reacties"/);
  assert.match(moduleSource, /comments\.filter\(\(comment\) => comment\.message_id === messageId\)\.sort\(/);
  assert.match(moduleSource, /<MessageCommentsSection messageId=\{message\.id\}/);
  assert.doesNotMatch(moduleSource, /selectedId === message\.id && <MessageCommentsSection/);
  assert.doesNotMatch(moduleSource, /<button className="portal-comment-count"/);
  assert.match(moduleSource, /onUpdateComment/);
  assert.match(moduleSource, /onDeleteComment/);
});

test("plaatsen is tegen dubbel tikken beveiligd en wordt pas actief met tekst", () => {
  assert.match(moduleSource, /commentSubmitBusy\.current/);
  assert.match(moduleSource, /if \(!body \|\| commentSubmitBusy\.current\) return/);
  assert.match(moduleSource, /disabled=\{commentSubmitting \|\| !commentBody\.trim\(\)\}/);
  assert.match(moduleSource, /Reactie geplaatst ✓/);
});
