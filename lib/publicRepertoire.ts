export type PublicRepertoireSong = {
  id: string;
  title: string;
  artist?: string;
  category?: string;
};

type RepertoirePayload = { songs: PublicRepertoireSong[] };
type FetchRepertoire = typeof fetch;

export const setlistMakerRepertoireUrl =
  "https://goodtimes-setlist-maker.e-voorthuijsen571420.chatgpt.site/api/repertoire";

function validSong(value: unknown): value is PublicRepertoireSong {
  if (!value || typeof value !== "object") return false;
  const song = value as Partial<PublicRepertoireSong>;
  return typeof song.id === "string" && typeof song.title === "string" && song.title.trim().length > 0;
}

export async function fetchSetlistMakerRepertoire(
  signal?: AbortSignal,
  fetchRepertoire: FetchRepertoire = fetch,
  requestTime = Date.now(),
): Promise<RepertoirePayload> {
  const response = await fetchRepertoire(`${setlistMakerRepertoireUrl}?fresh=${requestTime}`, {
    signal,
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Setlist Maker repertoire gaf HTTP ${response.status}`);

  const payload = await response.json() as Partial<RepertoirePayload>;
  if (!Array.isArray(payload.songs)) throw new Error("Ongeldige Setlist Maker repertoiredata");

  // De API-volgorde is de beheerde repertoirevolgorde. Ook een lege lijst is
  // geldig: verwijderde nummers mogen dan niet via de fallback terugkomen.
  return { songs: payload.songs.filter(validSong) };
}

export async function loadPublicRepertoire(
  fallback: () => Promise<RepertoirePayload>,
  signal?: AbortSignal,
  fetchRepertoire: FetchRepertoire = fetch,
  requestTime = Date.now(),
) {
  try {
    return await fetchSetlistMakerRepertoire(signal, fetchRepertoire, requestTime);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    return fallback();
  }
}
