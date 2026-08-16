export const setlistMakerStateUrl =
  "https://goodtimes-setlist-maker.e-voorthuijsen571420.chatgpt.site/api/state";

export type SetlistMakerSong = {
  id: string;
  title: string;
  artist?: string;
  singers?: string[];
  key?: string;
  bpm?: number;
  seconds?: number;
  youtube?: string;
  notes?: string;
  rehearsalNotes?: string;
  rehearsalStatus?: number;
  category?: string;
  active?: boolean;
};

export type CentralSong = {
  id: string;
  title: string;
  artist: string | null;
  vocalist: string | null;
  musical_key: string | null;
  bpm: number | null;
  duration_seconds: number | null;
  youtube_url: string | null;
  status: string;
  score: number | null;
  notes: string | null;
  active: boolean;
  source_order: number | null;
  category: string | null;
  source_system: string | null;
  source_id: string | null;
};

export type SongSyncPlan = {
  inserts: Array<Omit<CentralSong, "id">>;
  updates: Array<{ id: string; values: Omit<CentralSong, "id"> }>;
  deactivateIds: string[];
  duplicatesPrevented: number;
};

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function number(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? Math.round(value) : null;
}

function identity(title: string, artist: string | null) {
  return `${title}|${artist ?? ""}`.normalize("NFKD").toLocaleLowerCase("nl-NL").replace(/[^a-z0-9]+/g, "");
}

function status(value: number | undefined) {
  if (value === 1) return "ready";
  if (value === 2) return "active";
  if (value === 3) return "almost";
  if (value === 4) return "attention";
  return "new";
}

function centralValues(song: SetlistMakerSong, sourceOrder: number): Omit<CentralSong, "id"> {
  const rehearsalStatus = number(song.rehearsalStatus);
  const notes = [text(song.notes), text(song.rehearsalNotes)].filter(Boolean).join("\n") || null;
  return {
    title: song.title.trim(),
    artist: text(song.artist),
    vocalist: Array.isArray(song.singers) ? song.singers.map(text).filter((value): value is string => Boolean(value)).join(", ") || null : null,
    musical_key: text(song.key),
    bpm: number(song.bpm),
    duration_seconds: number(song.seconds),
    youtube_url: text(song.youtube),
    status: status(rehearsalStatus ?? undefined),
    score: rehearsalStatus === null ? null : Math.max(1, Math.min(5, rehearsalStatus)),
    notes,
    active: song.active !== false,
    source_order: sourceOrder,
    category: text(song.category),
    source_system: "goodtimes-setlist-maker",
    source_id: song.id,
  };
}

function changed(song: CentralSong, values: Omit<CentralSong, "id">) {
  return (Object.keys(values) as Array<keyof typeof values>).some((key) => song[key] !== values[key]);
}

export function buildSongSyncPlan(currentSongs: CentralSong[], sourceSongs: SetlistMakerSong[]): SongSyncPlan {
  const bySourceId = new Map(currentSongs.filter((song) => song.source_system === "goodtimes-setlist-maker" && song.source_id).map((song) => [song.source_id!, song]));
  const byIdentity = new Map<string, CentralSong>();
  for (const song of currentSongs) {
    const key = identity(song.title, song.artist);
    if (!byIdentity.has(key)) byIdentity.set(key, song);
  }

  const claimedDatabaseIds = new Set<string>();
  const seenSourceIds = new Set<string>();
  const seenIdentities = new Set<string>();
  const inserts: SongSyncPlan["inserts"] = [];
  const updates: SongSyncPlan["updates"] = [];
  let duplicatesPrevented = 0;

  sourceSongs.forEach((sourceSong, sourceOrder) => {
    if (!sourceSong || typeof sourceSong.id !== "string" || !sourceSong.id.trim() || typeof sourceSong.title !== "string" || !sourceSong.title.trim()) return;
    const values = centralValues(sourceSong, sourceOrder);
    const normalizedIdentity = identity(values.title, values.artist);
    if (seenSourceIds.has(sourceSong.id) || seenIdentities.has(normalizedIdentity)) {
      duplicatesPrevented += 1;
      return;
    }
    seenSourceIds.add(sourceSong.id);
    seenIdentities.add(normalizedIdentity);

    const existing = bySourceId.get(sourceSong.id) ?? byIdentity.get(normalizedIdentity);
    if (!existing || claimedDatabaseIds.has(existing.id)) {
      inserts.push(values);
      return;
    }
    claimedDatabaseIds.add(existing.id);
    if (changed(existing, values)) updates.push({ id: existing.id, values });
  });

  const deactivateIds = currentSongs
    .filter((song) => song.source_system === "goodtimes-setlist-maker" && song.active && !claimedDatabaseIds.has(song.id))
    .map((song) => song.id);

  return { inserts, updates, deactivateIds, duplicatesPrevented };
}

export async function fetchSetlistMakerSongs(
  signal?: AbortSignal,
  fetchState: typeof fetch = fetch,
  requestTime = Date.now(),
) {
  const response = await fetchState(`${setlistMakerStateUrl}?fresh=${requestTime}`, { signal, cache: "no-store" });
  if (!response.ok) throw new Error(`Setlist Maker gaf HTTP ${response.status}`);
  const payload = await response.json() as { state?: { songs?: SetlistMakerSong[] } };
  if (!Array.isArray(payload.state?.songs)) throw new Error("Setlist Maker gaf ongeldige nummersdata");
  return payload.state.songs;
}
