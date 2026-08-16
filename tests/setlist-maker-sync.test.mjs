import assert from "node:assert/strict";
import test from "node:test";
import { buildSongSyncPlan, fetchSetlistMakerSongs } from "../lib/setlistMakerSongs.ts";

const existing = (overrides = {}) => ({
  id: "database-1", title: "Borderline", artist: "Madonna", vocalist: "Cindy", musical_key: "D", bpm: 120,
  duration_seconds: 241, youtube_url: null, status: "active", score: 2, notes: null, active: true,
  source_order: 0, category: "Repertoire", source_system: "goodtimes-setlist-maker", source_id: "maker-1", ...overrides,
});

test("voegt nieuwe Setlist Maker-nummers zonder duplicaten toe", () => {
  const plan = buildSongSyncPlan([], [
    { id: "maker-1", title: "Borderline", artist: "Madonna" },
    { id: "maker-1", title: "Borderline", artist: "Madonna" },
  ]);
  assert.equal(plan.inserts.length, 1);
  assert.equal(plan.duplicatesPrevented, 1);
});

test("werkt een bestaand nummer bij op stabiele bron-id", () => {
  const plan = buildSongSyncPlan([existing()], [{ id: "maker-1", title: "Borderline (Live)", artist: "Madonna", singers: ["Cindy"], key: "D", bpm: 122, seconds: 241, rehearsalStatus: 2, category: "Repertoire" }]);
  assert.equal(plan.inserts.length, 0);
  assert.equal(plan.updates.length, 1);
  assert.equal(plan.updates[0].id, "database-1");
  assert.equal(plan.updates[0].values.title, "Borderline (Live)");
  assert.equal(plan.updates[0].values.bpm, 122);
});

test("maakt verwijderde bronnummers inactief zonder databaseverwijdering", () => {
  const plan = buildSongSyncPlan([existing()], []);
  assert.deepEqual(plan.deactivateIds, ["database-1"]);
});

test("gebruikt no-store en een cache-buster bij iedere synchronisatie", async () => {
  let request;
  const songs = await fetchSetlistMakerSongs(undefined, async (url, options) => {
    request = { url, options };
    return new Response(JSON.stringify({ state: { songs: [{ id: "maker-1", title: "Borderline" }] } }), { status: 200 });
  }, 1234);
  assert.equal(songs.length, 1);
  assert.match(request.url, /fresh=1234/);
  assert.equal(request.options.cache, "no-store");
});
