export type LyricsSong = {
  title?: string | null;
  artist?: string | null;
  youtube_url?: string | null;
  lyrics_url?: string | null;
};

const VIDEO_SUFFIX = /\s*[\[(](?:official\s+)?(?:music\s+)?(?:video|audio|lyrics?|lyric\s+video|live|hd|4k|remaster(?:ed)?(?:\s+\d{4})?|\d{4})[^\])]*[\])]/gi;

export function cleanYoutubeTitle(value: string) {
  return value.replace(VIDEO_SUFFIX, "").replace(/\s+(?:official\s+)?(?:music\s+)?(?:video|audio|lyrics?|lyric\s+video|live|hd|4k|remaster(?:ed)?)(?:\s+\d{4})?\s*$/i, "").replace(/\s{2,}/g, " ").trim();
}

export function splitYoutubeTitle(value: string) {
  const cleaned = cleanYoutubeTitle(value);
  const separator = cleaned.match(/\s[-–—]\s/);
  if (!separator?.index) return { title: cleaned, artist: null };
  return { artist: cleaned.slice(0, separator.index).trim() || null, title: cleaned.slice(separator.index + separator[0].length).trim() || cleaned };
}

export function validSongtekstenUrl(value: string | null | undefined) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (url.hostname === "songteksten.nl" || url.hostname === "www.songteksten.nl");
  } catch { return false; }
}

export function songtekstenSearchUrl(artist: string | null | undefined, title: string | null | undefined) {
  const query = [artist?.trim(), title?.trim()].filter(Boolean).join(" ");
  const url = new URL("https://www.songteksten.nl/search");
  url.searchParams.set("query", query || "songtekst");
  url.searchParams.set("type", "title");
  return url.toString();
}

export function lyricsDestination(song: LyricsSong, youtubeTitle?: string | null) {
  if (validSongtekstenUrl(song.lyrics_url)) return song.lyrics_url!;
  if (song.artist?.trim() && song.title?.trim()) return songtekstenSearchUrl(song.artist, song.title);
  if (youtubeTitle) {
    const parsed = splitYoutubeTitle(youtubeTitle);
    return songtekstenSearchUrl(song.artist || parsed.artist, song.title || parsed.title);
  }
  return songtekstenSearchUrl(song.artist, song.title);
}

export async function youtubeMetadataTitle(youtubeUrl: string) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 5_000);
  try {
    const endpoint = new URL("https://www.youtube.com/oembed");
    endpoint.searchParams.set("url", youtubeUrl);
    endpoint.searchParams.set("format", "json");
    const response = await fetch(endpoint, { signal: controller.signal, cache: "no-store" });
    if (!response.ok) return null;
    const data = await response.json() as { title?: unknown };
    return typeof data.title === "string" ? data.title : null;
  } catch { return null; }
  finally { window.clearTimeout(timeout); }
}
