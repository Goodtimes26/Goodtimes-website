import assert from "node:assert/strict";
import test from "node:test";
import {
  fetchSetlistMakerRepertoire,
  loadPublicRepertoire,
} from "../lib/publicRepertoire.ts";

const songs = [
  { id: "2", title: "Borderline", category: "Repertoire" },
  { id: "1", title: "Africa", category: "Repertoire" },
];

function jsonResponse(payload, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  }));
}

test("gebruikt Setlist Maker als primaire bron met no-store en cache-buster", async () => {
  let requestedUrl = "";
  let requestedCache = "";
  let fallbackCalls = 0;
  const fetcher = (url, options) => {
    requestedUrl = String(url);
    requestedCache = String(options?.cache);
    return jsonResponse({ songs });
  };

  const result = await loadPublicRepertoire(async () => {
    fallbackCalls += 1;
    return { songs: [] };
  }, undefined, fetcher, 12345);

  assert.deepEqual(result.songs, songs);
  assert.equal(fallbackCalls, 0);
  assert.match(requestedUrl, /\/api\/repertoire\?fresh=12345$/);
  assert.equal(requestedCache, "no-store");
});

test("behoudt exact de volgorde uit de Setlist Maker", async () => {
  const result = await fetchSetlistMakerRepertoire(undefined, () => jsonResponse({ songs }), 1);
  assert.deepEqual(result.songs.map((song) => song.title), ["Borderline", "Africa"]);
});

test("beschouwt een geldige lege Setlist Maker-lijst als leidend", async () => {
  let fallbackCalls = 0;
  const result = await loadPublicRepertoire(async () => {
    fallbackCalls += 1;
    return { songs };
  }, undefined, () => jsonResponse({ songs: [] }), 1);

  assert.deepEqual(result.songs, []);
  assert.equal(fallbackCalls, 0);
});

test("gebruikt Supabase-fallback alleen als Setlist Maker niet bereikbaar is", async () => {
  const result = await loadPublicRepertoire(
    async () => ({ songs }),
    undefined,
    () => Promise.reject(new TypeError("network unavailable")),
    1,
  );
  assert.deepEqual(result.songs, songs);
});
