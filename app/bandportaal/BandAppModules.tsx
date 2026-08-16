"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import type { BandEvent, Profile } from "../../lib/bandportal";
import { bandMemberFirstName, formatDate } from "../../lib/bandportal";
import { getSupabaseClient } from "../../lib/supabase";
import { clearSetlistPrintScales, fitSetlistsToSinglePages } from "./fitSetlistPrintPages";

export type BandAppTab = "setlists" | "songs" | "rehearsals" | "messages" | "files" | "profile";

type Song = {
  id: string; title: string; artist: string | null; vocalist: string | null; musical_key: string | null;
  bpm: number | null; duration_seconds: number | null; youtube_url: string | null; status: string;
  score: number | null; notes: string | null; active: boolean;
};
type Setlist = { id: string; name: string; event_id: string | null; setlist_date: string | null; version: number; archived: boolean; updated_at: string; updated_by: string };
type SetlistItem = { id: string; setlist_id: string; song_id: string; position: number };
type Rehearsal = { id: string; event_id: string | null; name?: string | null; rehearsal_date?: string | null; status: string; general_notes: string | null };
type RehearsalSong = { id: string; rehearsal_id: string; song_id: string; priority: number; status: string; notes: string | null };
type BandMessage = { id: string; author_id: string; title: string; body: string; important: boolean; created_at: string };
type BandFile = { id: string; title: string; category: string | null; external_url: string | null; storage_path: string | null; description: string | null; song_id: string | null; mime_type: string | null; size_bytes: number | null; original_name: string | null; created_at: string };
type ExtendedProfile = Profile & { instrument?: string | null; phone?: string | null; avatar_url?: string | null };

const songStatus: Record<string, string> = { new: "Nieuw", attention: "Aandacht nodig", almost: "Bijna goed", ready: "Klaar", active: "Actief", inactive: "Niet actief" };
const audioTypes: Record<string, string> = { mp3: "audio/mpeg", m4a: "audio/mp4", wav: "audio/wav" };

function newestMessagesFirst(messages: BandMessage[]) {
  return [...messages].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

function audioType(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return audioTypes[extension] ?? null;
}

function safeAudioName(name: string) {
  return name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "audio";
}

function MissingMigration() {
  return <div className="portal-empty portal-migration-note"><strong>Deze module staat klaar.</strong><p>Voer eerst migratie <code>003_band_app.sql</code> uit in Supabase. De bestaande Bandinlog blijft ondertussen gewoon werken.</p></div>;
}

export function BandAppModules({ tab, user, profile, isAdmin, profiles, events, notify, reportError }: {
  tab: BandAppTab;
  user: User;
  profile: Profile;
  isAdmin: boolean;
  profiles: Profile[];
  events: BandEvent[];
  notify: (message: string) => void;
  reportError: (message: string) => void;
}) {
  const [ready, setReady] = useState<boolean | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [setlistItems, setSetlistItems] = useState<SetlistItem[]>([]);
  const [rehearsals, setRehearsals] = useState<Rehearsal[]>([]);
  const [rehearsalSongs, setRehearsalSongs] = useState<RehearsalSong[]>([]);
  const [messages, setMessages] = useState<BandMessage[]>([]);
  const [files, setFiles] = useState<BandFile[]>([]);
  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({});
  const [extendedProfile, setExtendedProfile] = useState<ExtendedProfile>(profile);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const songProbe = await supabase.from("songs").select("id,title,artist,vocalist,musical_key,bpm,duration_seconds,youtube_url,status,score,notes,active").order("source_order", { nullsFirst: false }).order("title");
    if (songProbe.error) {
      setReady(false);
      return;
    }
    const [setlistResult, setlistItemsResult, rehearsalResult, rehearsalSongsResult, messageResult, fileResult, profileResult] = await Promise.all([
      supabase.from("setlists").select("id,name,event_id,setlist_date,version,archived,updated_at,updated_by").order("updated_at", { ascending: false }),
      supabase.from("setlist_items").select("id,setlist_id,song_id,position").order("position"),
      supabase.from("rehearsals").select("id,event_id,name,rehearsal_date,status,general_notes").order("rehearsal_date", { ascending: false, nullsFirst: false }),
      supabase.from("rehearsal_songs").select("id,rehearsal_id,song_id,priority,status,notes"),
      supabase.from("band_messages").select("id,author_id,title,body,important,created_at").order("created_at", { ascending: false }),
      supabase.from("band_files").select("id,title,category,external_url,storage_path,description,song_id,mime_type,size_bytes,original_name,created_at").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id,display_name,email,instrument,phone,avatar_url").eq("id", user.id).single(),
    ]);
    if ([setlistResult.error, setlistItemsResult.error, rehearsalResult.error, rehearsalSongsResult.error, messageResult.error, fileResult.error].some(Boolean)) {
      setReady(false);
      return;
    }
    setSongs((songProbe.data ?? []) as Song[]);
    setSetlists((setlistResult.data ?? []) as Setlist[]);
    setSetlistItems((setlistItemsResult.data ?? []) as SetlistItem[]);
    setRehearsals((rehearsalResult.data ?? []) as Rehearsal[]);
    setRehearsalSongs((rehearsalSongsResult.data ?? []) as RehearsalSong[]);
    setMessages((messageResult.data ?? []) as BandMessage[]);
    const loadedFiles = (fileResult.data ?? []) as BandFile[];
    setFiles(loadedFiles);
    const signedAudio = await Promise.all(loadedFiles.filter((file) => file.storage_path).map(async (file) => {
      const { data } = await supabase.storage.from("band-audio").createSignedUrl(file.storage_path!, 3600);
      return data?.signedUrl ? [file.id, data.signedUrl] as const : null;
    }));
    setAudioUrls(Object.fromEntries(signedAudio.filter((entry): entry is readonly [string, string] => Boolean(entry))));
    if (!profileResult.error) setExtendedProfile(profileResult.data as ExtendedProfile);
    setReady(true);
  }, [user.id]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase || ready !== true) return;
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const announceChange = () => window.dispatchEvent(new Event("goodtimes:messages-changed"));
    const refreshMessages = async () => {
      const { data, error } = await supabase
        .from("band_messages")
        .select("id,author_id,title,body,important,created_at")
        .order("created_at", { ascending: false });
      if (!error) setMessages((data ?? []) as BandMessage[]);
    };

    const connectRealtime = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!active) return;
      if (error || !data.session) {
        console.error("[GoodTimes berichten] Geen geldige sessie voor Realtime", error);
        return;
      }

      await supabase.realtime.setAuth(data.session.access_token);
      if (!active) return;

      channel = supabase
        .channel(`band-messages-live-${user.id}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "band_messages" }, (payload) => {
          const incoming = payload.new as BandMessage;
          console.info("[GoodTimes berichten] Realtime INSERT ontvangen", { messageId: incoming.id });
          setMessages((current) => newestMessagesFirst([incoming, ...current.filter((message) => message.id !== incoming.id)]));
          console.info("[GoodTimes berichten] Bericht verwerkt", { messageId: incoming.id });
          announceChange();
        })
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "band_messages" }, (payload) => {
          const updated = payload.new as BandMessage;
          console.info("[GoodTimes berichten] Realtime UPDATE ontvangen", { messageId: updated.id });
          setMessages((current) => newestMessagesFirst([updated, ...current.filter((message) => message.id !== updated.id)]));
          console.info("[GoodTimes berichten] Bericht verwerkt", { messageId: updated.id });
          announceChange();
        })
        .on("postgres_changes", { event: "DELETE", schema: "public", table: "band_messages" }, (payload) => {
          const deletedId = String(payload.old.id ?? "");
          console.info("[GoodTimes berichten] Realtime DELETE ontvangen", { messageId: deletedId });
          setMessages((current) => current.filter((message) => message.id !== deletedId));
          console.info("[GoodTimes berichten] Bericht verwijderd uit weergave", { messageId: deletedId });
          announceChange();
        })
        .subscribe((status, error) => {
          console.info("[GoodTimes berichten] Realtime status", { status });
          if (error) console.error("[GoodTimes berichten] Realtime fout", error);
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") void refreshMessages();
        });
    };

    void connectRealtime();

    const pollingFallback = window.setInterval(() => { void refreshMessages(); }, 5_000);

    return () => {
      active = false;
      window.clearInterval(pollingFallback);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [ready, user.id]);

  useEffect(() => {
    if (tab !== "messages" || ready !== true) return;

    const markVisibleMessagesRead = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) return;
      if (messages.length > 0) {
        const { error } = await supabase.from("message_reads").upsert(
          messages.map((message) => ({ message_id: message.id, user_id: user.id })),
          { onConflict: "message_id,user_id", ignoreDuplicates: true },
        );
        if (error) return;
      }
      window.dispatchEvent(new Event("goodtimes:messages-read"));
    };

    void markVisibleMessagesRead();
  }, [messages, ready, tab, user.id]);

  async function submit(table: string, payload: Record<string, unknown>, success: string) {
    setBusy(true);
    const { error } = await getSupabaseClient()!.from(table).insert(payload);
    setBusy(false);
    if (error) reportError("Opslaan is niet gelukt. Controleer de invoer en probeer opnieuw.");
    else { notify(success); await load(); }
    return !error;
  }

  if (ready === null) return <div className="portal-loading-inline"><div className="portal-loader" />Bandgegevens laden…</div>;
  if (!ready) return <MissingMigration />;

  if (tab === "songs") return <SongsPanel songs={songs} busy={busy} isAdmin={isAdmin} onImport={async (file) => {
    setBusy(true);
    try {
      const payload = JSON.parse(await file.text()) as Record<string, unknown>;
      const { data, error } = await getSupabaseClient()!.rpc("import_setlist_maker", { source_payload: payload });
      if (error) throw error;
      const result = data as { songs_inserted?: number; songs_updated?: number; duplicates_prevented?: number };
      notify(`Import voltooid: ${result.songs_inserted ?? 0} toegevoegd, ${result.songs_updated ?? 0} bijgewerkt, ${result.duplicates_prevented ?? 0} duplicaten voorkomen.`);
      await load();
    } catch {
      reportError("Importeren is niet gelukt. Controleer migratie 004 en kies een geldige Setlist Maker-export.");
    } finally { setBusy(false); }
  }} onUpdateYoutube={async (song, youtubeUrl) => {
    setBusy(true);
    const { error } = await getSupabaseClient()!.rpc("update_song_youtube", { p_song_id: song.id, p_youtube_url: youtubeUrl || null });
    setBusy(false);
    if (error) {
      reportError("De YouTube-link kon niet worden opgeslagen. Gebruik een geldige youtube.com- of youtu.be-link.");
      return false;
    }
    notify(youtubeUrl ? "YouTube-link opgeslagen." : "YouTube-link verwijderd.");
    await load();
    return true;
  }} onCreate={async (form) => {
    const data = new FormData(form.currentTarget);
    const ok = await submit("songs", {
      title: String(data.get("title")), artist: String(data.get("artist") || "") || null,
      vocalist: String(data.get("vocalist") || "") || null, musical_key: String(data.get("musical_key") || "") || null,
      bpm: data.get("bpm") ? Number(data.get("bpm")) : null, duration_seconds: data.get("duration_seconds") ? Number(data.get("duration_seconds")) : null,
      youtube_url: String(data.get("youtube_url") || "") || null, status: String(data.get("status")),
      score: data.get("score") ? Number(data.get("score")) : null, notes: String(data.get("notes") || "") || null,
      created_by: user.id,
    }, "Nummer toegevoegd.");
    if (ok) form.currentTarget.reset();
  }} />;

  if (tab === "setlists") return <SetlistsPanel setlists={setlists} setlistItems={setlistItems} songs={songs} events={events} profiles={profiles} busy={busy} isAdmin={isAdmin} onCreate={async (form) => {
    const data = new FormData(form.currentTarget);
    const ok = await submit("setlists", {
      name: String(data.get("name")), setlist_date: String(data.get("setlist_date") || "") || null,
      event_id: String(data.get("event_id") || "") || null, created_by: user.id, updated_by: user.id,
    }, "Setlist aangemaakt.");
    if (ok) form.currentTarget.reset();
  }} onSave={async (setlist, name, date, eventId, songIds) => {
    setBusy(true);
    const { error } = await getSupabaseClient()!.rpc("save_setlist", {
      p_setlist_id: setlist.id,
      p_name: name,
      p_setlist_date: date || null,
      p_event_id: eventId || null,
      p_song_ids: songIds,
    });
    setBusy(false);
    if (error) {
      reportError("De setlist kon niet worden opgeslagen. Controleer je rechten en probeer opnieuw.");
      return false;
    }
    notify("Setlist opgeslagen.");
    await load();
    return true;
  }} onArchive={async (setlist) => {
    const { error } = await getSupabaseClient()!.from("setlists").update({ archived: !setlist.archived, updated_by: user.id, version: setlist.version + 1 }).eq("id", setlist.id);
    if (error) reportError("De setlist kon niet worden bijgewerkt."); else { notify(setlist.archived ? "Setlist teruggezet." : "Setlist gearchiveerd."); await load(); }
  }} onDelete={async (setlist) => {
    if (!isAdmin || !setlist.archived) return false;
    setBusy(true);
    const { data, error } = await getSupabaseClient()!.from("setlists").delete().eq("id", setlist.id).eq("archived", true).select("id").maybeSingle();
    setBusy(false);
    if (error || !data) {
      reportError("De gearchiveerde setlist kon niet worden verwijderd.");
      return false;
    }
    notify("Setlist definitief verwijderd.");
    await load();
    return true;
  }} />;

  if (tab === "rehearsals") return <RehearsalsPanel rehearsals={rehearsals} rehearsalSongs={rehearsalSongs} songs={songs} events={events} isAdmin={isAdmin} busy={busy} onCreate={async (form) => {
    const data = new FormData(form.currentTarget);
    const eventId = String(data.get("event_id"));
    const ok = await submit("rehearsals", { event_id: eventId, status: "planned", general_notes: String(data.get("general_notes") || "") || null, created_by: user.id }, "Repetitie gekoppeld.");
    if (ok) form.currentTarget.reset();
  }} />;

  if (tab === "messages") return <MessagesPanel messages={messages} profiles={profiles} userId={user.id} isAdmin={isAdmin} busy={busy} onCreate={async (form) => {
    const data = new FormData(form.currentTarget);
    setBusy(true);
    const supabase = getSupabaseClient()!;
    const { data: createdMessage, error: createError } = await supabase.from("band_messages").insert({
      author_id: user.id,
      title: String(data.get("title")),
      body: String(data.get("body")),
      important: data.get("important") === "on",
    }).select("id").single();
    if (createError || !createdMessage) {
      setBusy(false);
      reportError("Opslaan is niet gelukt. Controleer de invoer en probeer opnieuw.");
      return;
    }
    const { error: readError } = await supabase.from("message_reads").upsert(
      { message_id: createdMessage.id, user_id: user.id },
      { onConflict: "message_id,user_id" },
    );
    setBusy(false);
    if (readError) {
      reportError("Het bericht is geplaatst, maar de leesstatus kon niet worden opgeslagen.");
      return;
    }
    notify("Bandbericht geplaatst.");
    form.currentTarget.reset();
    await load();
    window.dispatchEvent(new Event("goodtimes:messages-changed"));
  }} onDelete={async (id) => {
    const { error } = await getSupabaseClient()!.from("band_messages").delete().eq("id", id);
    if (error) reportError("Het bericht kon niet worden verwijderd."); else { notify("Bericht verwijderd."); await load(); }
  }} />;

  if (tab === "files") return <FilesPanel files={files} songs={songs} audioUrls={audioUrls} isAdmin={isAdmin} busy={busy} onCreate={async (form) => {
    const data = new FormData(form.currentTarget);
    const ok = await submit("band_files", { title: String(data.get("title")), category: String(data.get("category") || "") || null, external_url: String(data.get("external_url")), description: String(data.get("description") || "") || null, uploaded_by: user.id }, "Link toegevoegd.");
    if (ok) form.currentTarget.reset();
  }} onUpload={async (form) => {
    if (!isAdmin) return;
    const formElement = form.currentTarget;
    const data = new FormData(formElement);
    const file = data.get("audio_file");
    if (!(file instanceof File) || !file.size) {
      reportError("Kies een audiobestand om te uploaden.");
      return;
    }
    const mimeType = audioType(file);
    if (!mimeType) {
      reportError("Gebruik een MP3-, M4A- of WAV-bestand.");
      return;
    }
    if (file.size > 52428800) {
      reportError("Het audiobestand mag maximaal 50 MB groot zijn.");
      return;
    }
    setBusy(true);
    const supabase = getSupabaseClient()!;
    const storagePath = `${user.id}/${crypto.randomUUID()}-${safeAudioName(file.name)}`;
    const uploadResult = await supabase.storage.from("band-audio").upload(storagePath, file, { contentType: mimeType, upsert: false });
    if (uploadResult.error) {
      setBusy(false);
      reportError("Uploaden is niet gelukt. Controleer migratie 007 en probeer opnieuw.");
      return;
    }
    const insertResult = await supabase.from("band_files").insert({
      title: String(data.get("title")),
      category: "Audio",
      storage_path: storagePath,
      song_id: String(data.get("song_id") || "") || null,
      description: String(data.get("description") || "") || null,
      mime_type: mimeType,
      size_bytes: file.size,
      original_name: file.name,
      uploaded_by: user.id,
    });
    if (insertResult.error) {
      await supabase.storage.from("band-audio").remove([storagePath]);
      setBusy(false);
      reportError("De audio kon niet worden opgeslagen. Het geüploade bestand is veilig opgeruimd.");
      return;
    }
    setBusy(false);
    formElement.reset();
    notify("Audio toegevoegd.");
    await load();
  }} onDeleteAudio={async (file) => {
    if (!isAdmin || !file.storage_path || !window.confirm(`Audiobestand “${file.title}” verwijderen?`)) return;
    setBusy(true);
    const supabase = getSupabaseClient()!;
    const storageResult = await supabase.storage.from("band-audio").remove([file.storage_path]);
    if (storageResult.error) {
      setBusy(false);
      reportError("Het audiobestand kon niet uit de beveiligde opslag worden verwijderd.");
      return;
    }
    const deleteResult = await supabase.from("band_files").delete().eq("id", file.id);
    setBusy(false);
    if (deleteResult.error) reportError("De audioregistratie kon niet worden verwijderd.");
    else { notify("Audio verwijderd."); await load(); }
  }} />;

  return <ProfilePanel profile={extendedProfile} busy={busy} onSave={async (form) => {
    const data = new FormData(form.currentTarget);
    setBusy(true);
    const { error } = await getSupabaseClient()!.from("profiles").update({ display_name: String(data.get("display_name")), instrument: String(data.get("instrument") || "") || null, phone: String(data.get("phone") || "") || null }).eq("id", user.id);
    setBusy(false);
    if (error) reportError("Je profiel kon niet worden opgeslagen."); else { notify("Je profiel is bijgewerkt."); await load(); }
  }} />;
}

function YoutubeLink({ song }: { song: Song }) {
  if (!song.youtube_url) return null;
  return <a className="portal-youtube-link" href={song.youtube_url} target="_blank" rel="noopener noreferrer" aria-label={`Open YouTube-video voor ${song.title} in een nieuw tabblad`}>▶ YouTube</a>;
}

function CompactYoutubeLink({ song }: { song: Song }) {
  if (!song.youtube_url) return null;
  return <a className="portal-youtube-icon" href={song.youtube_url} target="_blank" rel="noopener noreferrer" aria-label={`Open YouTube-video voor ${song.title} in een nieuw tabblad`}><span aria-hidden="true">▶</span></a>;
}

function YoutubeEditor({ song, busy, onSave }: { song: Song; busy: boolean; onSave: (song: Song, url: string) => Promise<boolean> }) {
  const [url, setUrl] = useState(song.youtube_url ?? "");
  return <details className="portal-youtube-edit-details"><summary>YouTube-link bewerken</summary><form className="portal-youtube-editor" onSubmit={(event) => { event.preventDefault(); void onSave(song, url.trim()); }}>
      <label htmlFor={`youtube-${song.id}`}>YouTube-link</label>
      <div><input id={`youtube-${song.id}`} type="url" inputMode="url" placeholder="https://www.youtube.com/watch?v=…" value={url} onChange={(event) => setUrl(event.target.value)} /><button disabled={busy || url.trim() === (song.youtube_url ?? "")}>Opslaan</button></div>
      {song.youtube_url && <button className="portal-remove-youtube" type="button" disabled={busy} onClick={() => { setUrl(""); void onSave(song, ""); }}>Link verwijderen</button>}
    </form></details>;
}

function CompactRepertoireSong({ song, busy, isAdmin, onUpdateYoutube }: { song: Song; busy: boolean; isAdmin: boolean; onUpdateYoutube: (song: Song, url: string) => Promise<boolean> }) {
  const metadata = [song.artist, song.vocalist, song.musical_key, song.bpm ? `${song.bpm} BPM` : null].filter(Boolean).join(" · ");
  return <article className="portal-data-card portal-repertoire-song">
    <div className="portal-repertoire-song-head">
      <span>{songStatus[song.status] ?? song.status}</span>
      {song.score && <b>Score {song.score}/5</b>}
      <div className="portal-repertoire-song-tools">
        {song.notes && <details className="portal-song-notes"><summary>Notitie</summary><small>{song.notes}</small></details>}
        {isAdmin && <YoutubeEditor key={`${song.id}-${song.youtube_url ?? "empty"}`} song={song} busy={busy} onSave={onUpdateYoutube} />}
      </div>
    </div>
    <div className="portal-repertoire-song-copy"><h2>{song.title}</h2>{metadata && <p>{metadata}</p>}</div>
    <CompactYoutubeLink song={song} />
  </article>;
}

function SongsPanel({ songs, busy, isAdmin, onImport, onCreate, onUpdateYoutube }: { songs: Song[]; busy: boolean; isAdmin: boolean; onImport: (file: File) => Promise<void>; onCreate: (event: React.FormEvent<HTMLFormElement>) => void; onUpdateYoutube: (song: Song, url: string) => Promise<boolean> }) {
  return <div className="portal-section"><div className="portal-section-head"><div><p className="portal-eyebrow">Centrale database</p><h1>Repertoire / nummers</h1></div><span className="portal-count">{songs.length} nummers</span></div>
    {isAdmin && <details className="portal-editor"><summary>Bestaande Setlist Maker importeren</summary><form className="portal-form portal-card" onSubmit={(event) => { event.preventDefault(); const file = new FormData(event.currentTarget).get("setlist_export"); if (file instanceof File && file.size) void onImport(file); }}><p>Gebruik een JSON-export van de bestaande Setlist Maker. Herhaald importeren maakt geen dubbele bronrecords.</p><label>Setlist Maker-export<input name="setlist_export" type="file" accept="application/json,.json" required /></label><button className="portal-primary" disabled={busy}>Repertoire veilig importeren</button></form></details>}
    {isAdmin && <details className="portal-editor"><summary>Nummer toevoegen</summary><form className="portal-form portal-card" onSubmit={(event) => { event.preventDefault(); void onCreate(event); }}>
      <div className="portal-field-row"><label>Titel<input name="title" required /></label><label>Artiest<input name="artist" /></label></div>
      <div className="portal-field-row"><label>Zanger/zangeres<input name="vocalist" /></label><label>Toonsoort<input name="musical_key" /></label></div>
      <div className="portal-field-row"><label>BPM<input name="bpm" type="number" min="30" max="300" /></label><label>Duur in seconden<input name="duration_seconds" type="number" min="1" max="3600" /></label></div>
      <div className="portal-field-row"><label>Status<select name="status"><option value="active">Actief</option><option value="new">Nieuw</option><option value="attention">Aandacht nodig</option><option value="almost">Bijna goed</option><option value="ready">Klaar</option><option value="inactive">Niet actief</option></select></label><label>Score 1–5<input name="score" type="number" min="1" max="5" /></label></div>
      <label>YouTube-link<input name="youtube_url" type="url" /></label><label>Notities<textarea name="notes" /></label><button className="portal-primary" disabled={busy}>Nummer opslaan</button>
    </form></details>}
    <div className="portal-data-list portal-song-list">{songs.map((song) => <CompactRepertoireSong key={song.id} song={song} busy={busy} isAdmin={isAdmin} onUpdateYoutube={onUpdateYoutube} />)}{!songs.length && <div className="portal-empty">De nummersdatabase is nog leeg. Voeg een nummer toe of migreer het bestaande repertoire.</div>}</div>
  </div>;
}

function moveSong(list: string[], from: number, to: number) {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const next = [...list];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

function formatDuration(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function SetlistsPanel({ setlists, setlistItems, songs, events, profiles, busy, isAdmin, onCreate, onSave, onArchive, onDelete }: { setlists: Setlist[]; setlistItems: SetlistItem[]; songs: Song[]; events: BandEvent[]; profiles: Profile[]; busy: boolean; isAdmin: boolean; onCreate: (event: React.FormEvent<HTMLFormElement>) => void; onSave: (setlist: Setlist, name: string, date: string, eventId: string, songIds: string[]) => Promise<boolean>; onArchive: (setlist: Setlist) => void; onDelete: (setlist: Setlist) => Promise<boolean> }) {
  const profileName = (id: string) => {
    const member = profiles.find((profile) => profile.id === id);
    return member ? bandMemberFirstName(member) : "Bandlid";
  };
  const songFor = (id: string) => songs.find((song) => song.id === id);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");

  useEffect(() => {
    const printMedia = window.matchMedia("print");
    const preparePrint = () => fitSetlistsToSinglePages();
    const resetPrint = () => clearSetlistPrintScales();
    const handlePrintMedia = (event: MediaQueryListEvent) => event.matches ? preparePrint() : resetPrint();

    window.addEventListener("beforeprint", preparePrint);
    window.addEventListener("afterprint", resetPrint);
    printMedia.addEventListener("change", handlePrintMedia);

    return () => {
      window.removeEventListener("beforeprint", preparePrint);
      window.removeEventListener("afterprint", resetPrint);
      printMedia.removeEventListener("change", handlePrintMedia);
      resetPrint();
    };
  }, [setlists, setlistItems, songs]);
  const [draftDate, setDraftDate] = useState("");
  const [draftEventId, setDraftEventId] = useState("");
  const [draftSongs, setDraftSongs] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [dirty, setDirty] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Setlist | null>(null);
  const draggedIndex = useRef<number | null>(null);
  const pointerIndex = useRef<number | null>(null);
  const selected = setlists.find((setlist) => setlist.id === selectedId) ?? null;
  const selectedSongs = draftSongs.map(songFor).filter((song): song is Song => Boolean(song));
  const availableSongs = songs.filter((song) => song.active && !draftSongs.includes(song.id) && `${song.title} ${song.artist ?? ""}`.toLocaleLowerCase("nl-NL").includes(search.trim().toLocaleLowerCase("nl-NL")));
  const total = selectedSongs.reduce((sum, song) => sum + (song.duration_seconds ?? 0), 0);

  function openSetlist(setlist: Setlist) {
    setSelectedId(setlist.id);
    setDraftName(setlist.name);
    setDraftDate(setlist.setlist_date ?? "");
    setDraftEventId(setlist.event_id ?? "");
    setDraftSongs(setlistItems.filter((item) => item.setlist_id === setlist.id).sort((a, b) => a.position - b.position).map((item) => item.song_id));
    setSearch("");
    setDirty(false);
  }

  function reorder(from: number, to: number) {
    setDraftSongs((current) => moveSong(current, from, to));
    setDirty(true);
  }

  function pointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    if (pointerIndex.current === null || event.pointerType === "mouse") return;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-setlist-position]");
    const nextIndex = Number(target?.dataset.setlistPosition);
    if (Number.isInteger(nextIndex) && nextIndex !== pointerIndex.current) {
      reorder(pointerIndex.current, nextIndex);
      pointerIndex.current = nextIndex;
    }
  }

  if (selected) return <div className="portal-section portal-setlist-editor">
    <div className="portal-section-head"><div><p className="portal-eyebrow">{isAdmin ? "Setlist bewerken" : "Setlist bekijken"}</p><h1>{selected.name}</h1></div><button className="portal-secondary" onClick={() => setSelectedId(null)}>Terug naar setlists</button></div>
    <div className="portal-setlist-editor-grid">
      <section className="portal-card portal-setlist-compose" aria-label="Nummers in de setlist">
        <div className="portal-setlist-summary"><strong>{draftSongs.length} nummers</strong><span>{formatDuration(total)} totale speelduur</span></div>
        {!draftSongs.length && <div className="portal-empty">Deze setlist is nog leeg.</div>}
        <ol className="portal-setlist-sortable">
          {selectedSongs.map((song, index) => <li key={song.id} data-setlist-position={index} draggable={isAdmin} onDragStart={() => { draggedIndex.current = index; }} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (draggedIndex.current !== null) reorder(draggedIndex.current, index); draggedIndex.current = null; }}>
            {isAdmin && <button className="portal-drag-handle" type="button" aria-label={`${song.title} verslepen`} onPointerDown={(event) => { if (event.pointerType !== "mouse") { pointerIndex.current = index; event.currentTarget.setPointerCapture(event.pointerId); } }} onPointerMove={pointerMove} onPointerUp={() => { pointerIndex.current = null; }} onPointerCancel={() => { pointerIndex.current = null; }}>↕</button>}
            <span className="portal-setlist-position">{index + 1}</span>
            <div><strong>{song.title}</strong><small>{[song.artist, song.vocalist, song.musical_key, song.bpm ? `${song.bpm} BPM` : null, song.duration_seconds ? formatDuration(song.duration_seconds) : null].filter(Boolean).join(" · ")}</small><YoutubeLink song={song} /></div>
            {isAdmin && <button className="portal-remove-song" type="button" onClick={() => { setDraftSongs((current) => current.filter((id) => id !== song.id)); setDirty(true); }} aria-label={`${song.title} uit setlist verwijderen`}>Verwijderen</button>}
          </li>)}
        </ol>
      </section>
      <aside className="portal-setlist-sidebar">
        <form className="portal-form portal-card" onSubmit={(event) => { event.preventDefault(); if (selected) void onSave(selected, draftName, draftDate, draftEventId, draftSongs).then((ok) => { if (ok) setDirty(false); }); }}>
          <label>Naam<input value={draftName} onChange={(event) => { setDraftName(event.target.value); setDirty(true); }} required disabled={!isAdmin} /></label>
          <label>Datum<input type="date" value={draftDate} onChange={(event) => { setDraftDate(event.target.value); setDirty(true); }} disabled={!isAdmin} /></label>
          <label>Koppel aan optreden<select value={draftEventId} onChange={(event) => { setDraftEventId(event.target.value); setDirty(true); }} disabled={!isAdmin}><option value="">Niet gekoppeld</option>{events.filter((item) => item.event_type === "performance").map((item) => <option value={item.id} key={item.id}>{formatDate(item.event_date)} – {item.description}</option>)}</select></label>
          {isAdmin && <button className="portal-primary" disabled={busy || !dirty}>{busy ? "Opslaan…" : "Wijzigingen opslaan"}</button>}
          {!isAdmin && <p className="portal-help">Je kunt deze setlist bekijken. Alleen beheerders kunnen wijzigingen opslaan.</p>}
        </form>
        {isAdmin && <div className="portal-card portal-song-picker"><label>Zoek in repertoire<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Zoek op titel of artiest" /></label><div className="portal-song-picker-list">{availableSongs.map((song) => <button key={song.id} type="button" onClick={() => { setDraftSongs((current) => [...current, song.id]); setDirty(true); }}><span><strong>{song.title}</strong><small>{song.artist ?? "Artiest onbekend"}</small></span><b aria-hidden="true">+</b></button>)}{!availableSongs.length && <p>Geen beschikbare nummers gevonden.</p>}</div></div>}
      </aside>
    </div>
  </div>;

  return <div className="portal-section"><div className="portal-section-head"><div><p className="portal-eyebrow">Gedeelde setlists</p><h1>Setlists</h1></div><a className="portal-primary" href="https://goodtimes-setlist-maker.e-voorthuijsen571420.chatgpt.site" target="_blank" rel="noopener noreferrer">Open Setlist Maker ↗</a></div>
    {isAdmin && <details className="portal-editor"><summary>Nieuwe setlist</summary><form className="portal-form portal-card" onSubmit={(event) => { event.preventDefault(); void onCreate(event); }}><div className="portal-field-row"><label>Naam<input name="name" required /></label><label>Datum<input name="setlist_date" type="date" /></label></div><label>Koppel aan optreden<select name="event_id"><option value="">Niet gekoppeld</option>{events.filter((item) => item.event_type === "performance").map((item) => <option value={item.id} key={item.id}>{formatDate(item.event_date)} – {item.description}</option>)}</select></label><button className="portal-primary" disabled={busy}>Setlist aanmaken</button></form></details>}
    <div className="portal-data-list portal-setlist-list">{setlists.map((setlist) => { const items = setlistItems.filter((item) => item.setlist_id === setlist.id).sort((a, b) => a.position - b.position); const cardTotal = items.reduce((sum, item) => sum + (songFor(item.song_id)?.duration_seconds ?? 0), 0); return <article className={`portal-data-card ${setlist.archived ? "is-archived" : ""}`} data-print-density={items.length <= 10 ? "roomy" : items.length <= 15 ? "normal" : "compact"} key={setlist.id}><div><span>{setlist.archived ? "Gearchiveerd" : `Versie ${setlist.version}`}</span><b>{setlist.setlist_date ? formatDate(setlist.setlist_date) : "Geen datum"}</b></div><h2>{setlist.name}</h2><p>{items.length} nummers · {formatDuration(cardTotal)} totale speelduur</p>{items.length > 0 && <ol className="portal-song-order">{items.map((item, index) => { const song = songFor(item.song_id); const printDetails = song ? [song.artist, song.vocalist ? `Zang: ${song.vocalist}` : null, song.musical_key ? `Toonsoort: ${song.musical_key}` : null, song.notes].filter(Boolean).join(" · ") : ""; return <li key={item.id}><span className="portal-song-number">{index + 1}.</span><span className="portal-song-title">{song?.title ?? "Onbekend nummer"}</span>{printDetails && <span className="portal-print-song-details">{printDetails}</span>}{song && <CompactYoutubeLink song={song} />}</li>; })}</ol>}<small>Laatst gewijzigd door {profileName(setlist.updated_by)}</small><div className="portal-card-actions"><button className="portal-edit-setlist" onClick={() => openSetlist(setlist)}>{isAdmin ? "Bewerken" : "Bekijken"}</button>{isAdmin && <button onClick={() => onArchive(setlist)}>{setlist.archived ? "Terugzetten" : "Archiveren"}</button>}<button onClick={() => window.print()}>Printen</button>{isAdmin && setlist.archived && <button className="danger" onClick={() => setPendingDelete(setlist)}>Verwijderen</button>}</div></article>; })}{!setlists.length && <div className="portal-empty">Er zijn nog geen gedeelde setlists.</div>}</div>
    {pendingDelete && <div className="portal-confirm-backdrop" role="presentation" onKeyDown={(event) => { if (event.key === "Escape" && !busy) setPendingDelete(null); }} onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setPendingDelete(null); }}><section className="portal-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-setlist-title" aria-describedby="delete-setlist-description"><h2 id="delete-setlist-title">Setlist definitief verwijderen</h2><p id="delete-setlist-description">Weet je zeker dat je deze setlist definitief wilt verwijderen? Dit kan niet ongedaan worden gemaakt.</p><div className="portal-confirm-actions"><button type="button" autoFocus disabled={busy} onClick={() => setPendingDelete(null)}>Annuleren</button><button className="danger" type="button" disabled={busy} onClick={() => { void onDelete(pendingDelete).then((deleted) => { if (deleted) setPendingDelete(null); }); }}>{busy ? "Verwijderen…" : "Definitief verwijderen"}</button></div></section></div>}
  </div>;
}

function RehearsalsPanel({ rehearsals, rehearsalSongs, songs, events, isAdmin, busy, onCreate }: { rehearsals: Rehearsal[]; rehearsalSongs: RehearsalSong[]; songs: Song[]; events: BandEvent[]; isAdmin: boolean; busy: boolean; onCreate: (event: React.FormEvent<HTMLFormElement>) => void }) {
  const eventFor = (id: string | null) => events.find((event) => event.id === id);
  return <div className="portal-section"><div className="portal-section-head"><div><p className="portal-eyebrow">Samen voorbereiden</p><h1>Repetities</h1></div></div>
    {isAdmin && <details className="portal-editor"><summary>Bestaande activiteit als repetitie inrichten</summary><form className="portal-form portal-card" onSubmit={(event) => { event.preventDefault(); void onCreate(event); }}><label>Repetitie<select name="event_id" required><option value="">Kies een activiteit</option>{events.filter((item) => item.event_type === "rehearsal" && !rehearsals.some((row) => row.event_id === item.id)).map((item) => <option value={item.id} key={item.id}>{formatDate(item.event_date)} – {item.description}</option>)}</select></label><label>Algemene opmerkingen<textarea name="general_notes" /></label><button className="portal-primary" disabled={busy}>Repetitie koppelen</button></form></details>}
    <div className="portal-data-list portal-rehearsal-list">{rehearsals.map((rehearsal) => { const event = eventFor(rehearsal.event_id); const plannedSongs = rehearsalSongs.filter((item) => item.rehearsal_id === rehearsal.id); const rehearsalTotal = plannedSongs.reduce((sum, item) => sum + (songs.find((song) => song.id === item.song_id)?.duration_seconds ?? 0), 0); return <article className="portal-data-card" data-print-density={plannedSongs.length <= 10 ? "roomy" : plannedSongs.length <= 15 ? "normal" : "compact"} key={rehearsal.id}><div><span>{rehearsal.status === "completed" ? "Afgerond" : rehearsal.status === "cancelled" ? "Geannuleerd" : "Gepland"}</span><b>{event ? formatDate(event.event_date) : rehearsal.rehearsal_date ? formatDate(rehearsal.rehearsal_date) : "Datum onbekend"}</b></div><h2>{event?.description ?? rehearsal.name ?? "Repetitie"}</h2><p>{[event?.start_time?.slice(0, 5), event?.location, plannedSongs.length ? `${plannedSongs.length} nummers` : null].filter(Boolean).join(" · ")}</p><p className="portal-print-summary">{plannedSongs.length} nummers · {formatDuration(rehearsalTotal)} totale speelduur</p>{plannedSongs.length > 0 && <ol className="portal-song-order">{plannedSongs.map((item, index) => { const song = songs.find((candidate) => candidate.id === item.song_id); const printDetails = song ? [song.artist, song.vocalist ? `Zang: ${song.vocalist}` : null, song.musical_key ? `Toonsoort: ${song.musical_key}` : null, item.notes ?? song.notes].filter(Boolean).join(" · ") : ""; return <li key={item.id}><span className="portal-song-number">{index + 1}.</span><span className="portal-song-title">{song?.title ?? "Onbekend nummer"}</span>{printDetails && <span className="portal-print-song-details">{printDetails}</span>}{song && <CompactYoutubeLink song={song} />}</li>; })}</ol>}{rehearsal.general_notes && <small>{rehearsal.general_notes}</small>}</article>; })}{!rehearsals.length && <div className="portal-empty">Er zijn nog geen uitgebreide repetitieplannen. Activiteiten blijven zichtbaar onder Agenda.</div>}</div>
  </div>;
}

function MessagesPanel({ messages, profiles, userId, isAdmin, busy, onCreate, onDelete }: { messages: BandMessage[]; profiles: Profile[]; userId: string; isAdmin: boolean; busy: boolean; onCreate: (event: React.FormEvent<HTMLFormElement>) => void; onDelete: (id: string) => void }) {
  return <div className="portal-section"><div className="portal-section-head"><div><p className="portal-eyebrow">Voor de hele band</p><h1>Bandberichten</h1></div></div><details className="portal-editor"><summary>Bericht plaatsen</summary><form className="portal-form portal-card" onSubmit={(event) => { event.preventDefault(); void onCreate(event); }}><label>Titel<input name="title" required maxLength={160} /></label><label>Bericht<textarea name="body" required maxLength={3000} /></label><label className="portal-check-label"><input name="important" type="checkbox" /> Markeer als belangrijk</label><button className="portal-primary" disabled={busy}>Bericht plaatsen</button></form></details>
    <div className="portal-data-list">{messages.map((message) => { const author = profiles.find((profile) => profile.id === message.author_id); return <article className={`portal-data-card portal-message-card ${message.important ? "important" : ""}`} key={message.id}><div><span>{message.important ? "Belangrijk" : "Bericht"}</span><b>{new Intl.DateTimeFormat("nl-NL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(message.created_at))}</b></div><h2>{message.title}</h2><p>{message.body}</p><small>Door {author ? bandMemberFirstName(author) : "Bandlid"}</small>{(isAdmin || message.author_id === userId) && <button className="portal-delete-link" onClick={() => onDelete(message.id)}>Verwijderen</button>}</article>; })}{!messages.length && <div className="portal-empty">Er zijn nog geen berichten.</div>}</div></div>;
}

function FilesPanel({ files, songs, audioUrls, isAdmin, busy, onCreate, onUpload, onDeleteAudio }: { files: BandFile[]; songs: Song[]; audioUrls: Record<string, string>; isAdmin: boolean; busy: boolean; onCreate: (event: React.FormEvent<HTMLFormElement>) => void; onUpload: (event: React.FormEvent<HTMLFormElement>) => void; onDeleteAudio: (file: BandFile) => void }) {
  const songFor = (id: string | null) => songs.find((song) => song.id === id);
  return <div className="portal-section">
    <div className="portal-section-head"><div><p className="portal-eyebrow">Documenten, links en oefenopnames</p><h1>Bestanden & audio</h1></div></div>
    {isAdmin && <div className="portal-file-editors">
      <details className="portal-editor"><summary>Audio uploaden</summary><form className="portal-form portal-card" onSubmit={(event) => { event.preventDefault(); void onUpload(event); }}>
        <div className="portal-field-row"><label>Titel<input name="title" required maxLength={180} /></label><label>Koppel aan repertoire<select name="song_id"><option value="">Niet gekoppeld</option>{songs.map((song) => <option value={song.id} key={song.id}>{song.title}</option>)}</select></label></div>
        <label>Omschrijving / notitie<textarea name="description" /></label>
        <label>Audiobestand<input name="audio_file" type="file" accept=".mp3,.m4a,.wav,audio/mpeg,audio/mp4,audio/wav,audio/x-m4a,audio/x-wav" required /></label>
        <p className="portal-help">MP3, M4A of WAV, maximaal 50 MB. Alleen ingelogde bandleden kunnen de audio openen.</p>
        <button className="portal-primary" disabled={busy}>{busy ? "Uploaden…" : "Audio uploaden"}</button>
      </form></details>
      <details className="portal-editor"><summary>Link toevoegen</summary><form className="portal-form portal-card" onSubmit={(event) => { event.preventDefault(); void onCreate(event); }}><div className="portal-field-row"><label>Titel<input name="title" required /></label><label>Categorie<input name="category" placeholder="Bijvoorbeeld techniek" /></label></div><label>Veilige link<input name="external_url" type="url" required /></label><label>Omschrijving<textarea name="description" /></label><button className="portal-primary" disabled={busy}>Link opslaan</button></form></details>
    </div>}
    <div className="portal-file-grid">{files.map((file) => file.storage_path ? <article className="portal-file-card portal-audio-card" key={file.id}>
      <span>Audio</span><h2>{file.title}</h2>
      {file.song_id && <p className="portal-audio-song">Repertoire: <strong>{songFor(file.song_id)?.title ?? "Onbekend nummer"}</strong></p>}
      {file.description && <p>{file.description}</p>}
      {audioUrls[file.id] ? <audio className="portal-audio-player" controls preload="none" src={audioUrls[file.id]}>Je browser ondersteunt deze audiospeler niet.</audio> : <p className="portal-help">Audio tijdelijk niet beschikbaar.</p>}
      {isAdmin && <button className="portal-delete-audio" type="button" disabled={busy} onClick={() => onDeleteAudio(file)}>Verwijderen</button>}
    </article> : <a className="portal-file-card" href={file.external_url ?? "#"} target="_blank" rel="noopener noreferrer" key={file.id}><span>{file.category ?? "Bestand"}</span><h2>{file.title}</h2>{file.description && <p>{file.description}</p>}<b>Openen ↗</b></a>)}{!files.length && <div className="portal-empty">Er zijn nog geen bestanden, links of audiobestanden toegevoegd.</div>}</div>
  </div>;
}

function ProfilePanel({ profile, busy, onSave }: { profile: ExtendedProfile; busy: boolean; onSave: (event: React.FormEvent<HTMLFormElement>) => void }) {
  return <div className="portal-section portal-profile-section"><div><p className="portal-eyebrow">Mijn account</p><h1>Mijn profiel</h1><p className="portal-lead">Houd je eigen basisgegevens actueel. Je e-mailadres wordt beheerd via je beveiligde account.</p></div><form className="portal-form portal-card" onSubmit={(event) => { event.preventDefault(); void onSave(event); }}><label>Naam<input name="display_name" defaultValue={profile.display_name} required /></label><label>Instrument / rol<input name="instrument" defaultValue={profile.instrument ?? ""} /></label><label>Mobiel nummer<input name="phone" type="tel" defaultValue={profile.phone ?? ""} /></label><label>E-mailadres<input value={profile.email ?? ""} disabled /></label><button className="portal-primary" disabled={busy}>Profiel opslaan</button></form></div>;
}
