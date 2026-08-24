import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { cleanLyricsArtist, cleanLyricsTitle, cleanYoutubeTitle, lyricsDestination, songtekstenSearchUrl, splitYoutubeTitle, validSongtekstenUrl, youtubeMetadataTitle } from "../lib/songLyrics.ts";

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

test("namen van GoodTimes-bandleden worden uit de zoekterm verwijderd", () => {
  for (const [input, expected] of [
    ["Cindy | I Wish", "I Wish"],
    ["Cindy - I Wish", "I Wish"],
    ["Cindy: I Wish", "I Wish"],
    ["Cindy – I Wish", "I Wish"],
    ["Esther | Walking on Sunshine", "Walking on Sunshine"],
  ]) assert.equal(cleanLyricsTitle(input), expected);

  assert.equal(new URL(lyricsDestination({ title: "Cindy | I Wish" })).searchParams.get("query"), "I Wish");
  assert.equal(new URL(lyricsDestination({ title: "Cindy | I Wish", artist: "Stevie Wonder" })).searchParams.get("query"), "Stevie Wonder I Wish");
  assert.equal(new URL(lyricsDestination({ title: "I Wish", artist: "Cindy" })).searchParams.get("query"), "I Wish");
});

test("een niet-bandlid voor een scheidingsteken blijft onderdeel van de titel", () => {
  assert.equal(cleanLyricsTitle("Earth, Wind & Fire - September"), "Earth, Wind & Fire - September");
  assert.equal(cleanLyricsTitle("KC & The Sunshine Band: Give It Up"), "KC & The Sunshine Band: Give It Up");
});

test("gebruikelijke YouTube-toevoegingen worden verwijderd en titel wordt gesplitst", () => {
  assert.equal(cleanYoutubeTitle("Patrice Rushen - Forget Me Nots (Official Video)"), "Patrice Rushen - Forget Me Nots");
  assert.deepEqual(splitYoutubeTitle("Queen – Radio Ga Ga (Official Audio 1984)"), { artist: "Queen", title: "Radio Ga Ga" });
  assert.deepEqual(splitYoutubeTitle("Give It Up (Live HD)"), { artist: null, title: "Give It Up" });
  assert.deepEqual(splitYoutubeTitle("Katrina and the Waves - Walking on Sunshine [Official Music Video HQ]"), { artist: "Katrina and the Waves", title: "Walking on Sunshine" });
});

test("YouTube-metadata vult ontbrekende artiest of titel alleen als fallback aan", () => {
  const url = new URL(lyricsDestination({ title: null, artist: null, youtube_url: "https://youtu.be/test" }, "KC & The Sunshine Band - Give It Up (Official Video)"));
  assert.equal(url.searchParams.get("query"), "KC & The Sunshine Band Give It Up");
});

test("Walking on Sunshine combineert YouTube-artiest met de opgeschoonde Band-app-titel", () => {
  const url = new URL(lyricsDestination({ title: "Cindy | Walking on Sunshine", artist: null }, "Katrina and the Waves - Walking on Sunshine (Official Music Video)"));
  assert.equal(url.searchParams.get("query"), "Katrina and the Waves Walking on Sunshine");
  assert.equal(cleanLyricsArtist("Cindy"), "");
});

test("oEmbed gebruikt browserfallback en cachet metadata per YouTube-link", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    if (String(url).includes("youtube.com/oembed")) throw new TypeError("CORS blocked");
    return new Response(JSON.stringify({ title: "Katrina and the Waves - Walking on Sunshine (Official Music Video)" }), { status: 200 });
  };
  try {
    const youtubeUrl = "https://youtu.be/walking-on-sunshine-test";
    assert.equal(await youtubeMetadataTitle(youtubeUrl), "Katrina and the Waves - Walking on Sunshine (Official Music Video)");
    assert.equal(await youtubeMetadataTitle(youtubeUrl), "Katrina and the Waves - Walking on Sunshine (Official Music Video)");
    assert.equal(calls.length, 2);
    assert.match(calls[0], /youtube\.com\/oembed/);
    assert.match(calls[1], /noembed\.com\/embed/);
  } finally { globalThis.fetch = originalFetch; }
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
