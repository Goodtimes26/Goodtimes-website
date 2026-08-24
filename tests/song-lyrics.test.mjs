import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { cleanYoutubeTitle, lyricsDestination, songtekstenSearchUrl, splitYoutubeTitle, validSongtekstenUrl } from "../lib/songLyrics.ts";

test("handmatige Songteksten-link heeft voorrang", () => {
  const manual = "https://www.songteksten.nl/songteksten/123/test";
  assert.equal(lyricsDestination({ title: "Titel", artist: "Artiest", lyrics_url: manual }), manual);
  assert.equal(validSongtekstenUrl(manual), true);
  assert.equal(validSongtekstenUrl("https://example.com/songtekst"), false);
});

test("artiest, titel en bijzondere tekens vormen een gerichte zoekopdracht", () => {
  const url = new URL(songtekstenSearchUrl("Beyoncé & Jay-Z", "Don't Stop 'Til You Get Enough"));
  assert.equal(url.hostname, "www.songteksten.nl");
  assert.equal(url.pathname, "/search");
  assert.equal(url.searchParams.get("query"), "Beyoncé & Jay-Z Don't Stop 'Til You Get Enough");
  assert.equal(url.searchParams.get("type"), "title");
});

test("opgeslagen artiest en titel werken zonder YouTube-link", () => {
  const url = new URL(lyricsDestination({ title: "Borderline", artist: "Madonna" }));
  assert.equal(url.searchParams.get("query"), "Madonna Borderline");
});

test("alleen een titel levert een veilige gerichte fallback op", () => {
  const url = new URL(lyricsDestination({ title: "Give It Up" }));
  assert.equal(url.searchParams.get("query"), "Give It Up");
});

test("gebruikelijke YouTube-toevoegingen worden verwijderd en titel wordt gesplitst", () => {
  assert.equal(cleanYoutubeTitle("Patrice Rushen - Forget Me Nots (Official Video)"), "Patrice Rushen - Forget Me Nots");
  assert.deepEqual(splitYoutubeTitle("Queen – Radio Ga Ga (Official Audio 1984)"), { artist: "Queen", title: "Radio Ga Ga" });
  assert.deepEqual(splitYoutubeTitle("Give It Up (Live HD)"), { artist: null, title: "Give It Up" });
});

test("YouTube-metadata vult ontbrekende artiest of titel alleen als fallback aan", () => {
  const url = new URL(lyricsDestination({ title: null, artist: null, youtube_url: "https://youtu.be/test" }, "KC & The Sunshine Band - Give It Up (Official Video)"));
  assert.equal(url.searchParams.get("query"), "KC & The Sunshine Band Give It Up");
});

test("één gedeeld component bedient repertoire, setlists, repetities en editor", async () => {
  const source = await readFile(new URL("../app/bandportaal/BandAppModules.tsx", import.meta.url), "utf8");
  const helper = await readFile(new URL("../lib/songLyrics.ts", import.meta.url), "utf8");
  assert.match(source, /function SongResourceLinks/);
  assert.equal((source.match(/<SongResourceLinks song=\{song\}/g) ?? []).length, 4);
  assert.match(source, /Songtekstlink \(optioneel\)/);
  assert.match(helper, /youtube\.com\/oembed/);
});

test("migratie is niet-destructief en bewaart uitsluitend een externe link", async () => {
  const sql = await readFile(new URL("../supabase/migrations/018_song_lyrics_links.sql", import.meta.url), "utf8");
  assert.match(sql, /add column if not exists lyrics_url text/i);
  assert.doesNotMatch(sql, /drop table|delete from|truncate/i);
});
