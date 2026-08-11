"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import type { BandEvent, Profile } from "../../lib/bandportal";
import { formatDate } from "../../lib/bandportal";
import { getSupabaseClient } from "../../lib/supabase";

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
type BandFile = { id: string; title: string; category: string | null; external_url: string | null; storage_path: string | null; description: string | null; created_at: string };
type ExtendedProfile = Profile & { instrument?: string | null; phone?: string | null; avatar_url?: string | null };

const songStatus: Record<string, string> = { new: "Nieuw", attention: "Aandacht nodig", almost: "Bijna goed", ready: "Klaar", active: "Actief", inactive: "Niet actief" };

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
      supabase.from("band_files").select("id,title,category,external_url,storage_path,description,created_at").order("created_at", { ascending: false }),
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
    setFiles((fileResult.data ?? []) as BandFile[]);
    if (!profileResult.error) setExtendedProfile(profileResult.data as ExtendedProfile);
    setReady(true);
  }, [user.id]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

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
  }} />;

  if (tab === "rehearsals") return <RehearsalsPanel rehearsals={rehearsals} rehearsalSongs={rehearsalSongs} songs={songs} events={events} isAdmin={isAdmin} busy={busy} onCreate={async (form) => {
    const data = new FormData(form.currentTarget);
    const eventId = String(data.get("event_id"));
    const ok = await submit("rehearsals", { event_id: eventId, status: "planned", general_notes: String(data.get("general_notes") || "") || null, created_by: user.id }, "Repetitie gekoppeld.");
    if (ok) form.currentTarget.reset();
  }} />;

  if (tab === "messages") return <MessagesPanel messages={messages} profiles={profiles} userId={user.id} isAdmin={isAdmin} busy={busy} onCreate={async (form) => {
    const data = new FormData(form.currentTarget);
    const ok = await submit("band_messages", { author_id: user.id, title: String(data.get("title")), body: String(data.get("body")), important: data.get("important") === "on" }, "Bandbericht geplaatst.");
    if (ok) form.currentTarget.reset();
  }} onDelete={async (id) => {
    const { error } = await getSupabaseClient()!.from("band_messages").delete().eq("id", id);
    if (error) reportError("Het bericht kon niet worden verwijderd."); else { notify("Bericht verwijderd."); await load(); }
  }} />;

  if (tab === "files") return <FilesPanel files={files} isAdmin={isAdmin} busy={busy} onCreate={async (form) => {
    const data = new FormData(form.currentTarget);
    const ok = await submit("band_files", { title: String(data.get("title")), category: String(data.get("category") || "") || null, external_url: String(data.get("external_url")), description: String(data.get("description") || "") || null, uploaded_by: user.id }, "Link toegevoegd.");
    if (ok) form.currentTarget.reset();
  }} />;

  return <ProfilePanel profile={extendedProfile} busy={busy} onSave={async (form) => {
    const data = new FormData(form.currentTarget);
    setBusy(true);
    const { error } = await getSupabaseClient()!.from("profiles").update({ display_name: String(data.get("display_name")), instrument: String(data.get("instrument") || "") || null, phone: String(data.get("phone") || "") || null }).eq("id", user.id);
    setBusy(false);
    if (error) reportError("Je profiel kon niet worden opgeslagen."); else { notify("Je profiel is bijgewerkt."); await load(); }
  }} />;
}

function SongsPanel({ songs, busy, isAdmin, onImport, onCreate }: { songs: Song[]; busy: boolean; isAdmin: boolean; onImport: (file: File) => Promise<void>; onCreate: (event: React.FormEvent<HTMLFormElement>) => void }) {
  return <div className="portal-section"><div className="portal-section-head"><div><p className="portal-eyebrow">Centrale database</p><h1>Repertoire / nummers</h1></div><span className="portal-count">{songs.length} nummers</span></div>
    {isAdmin && <details className="portal-editor"><summary>Bestaande Setlist Maker importeren</summary><form className="portal-form portal-card" onSubmit={(event) => { event.preventDefault(); const file = new FormData(event.currentTarget).get("setlist_export"); if (file instanceof File && file.size) void onImport(file); }}><p>Gebruik een JSON-export van de bestaande Setlist Maker. Herhaald importeren maakt geen dubbele bronrecords.</p><label>Setlist Maker-export<input name="setlist_export" type="file" accept="application/json,.json" required /></label><button className="portal-primary" disabled={busy}>Repertoire veilig importeren</button></form></details>}
    <details className="portal-editor"><summary>Nummer toevoegen</summary><form className="portal-form portal-card" onSubmit={(event) => { event.preventDefault(); void onCreate(event); }}>
      <div className="portal-field-row"><label>Titel<input name="title" required /></label><label>Artiest<input name="artist" /></label></div>
      <div className="portal-field-row"><label>Zanger/zangeres<input name="vocalist" /></label><label>Toonsoort<input name="musical_key" /></label></div>
      <div className="portal-field-row"><label>BPM<input name="bpm" type="number" min="30" max="300" /></label><label>Duur in seconden<input name="duration_seconds" type="number" min="1" max="3600" /></label></div>
      <div className="portal-field-row"><label>Status<select name="status"><option value="active">Actief</option><option value="new">Nieuw</option><option value="attention">Aandacht nodig</option><option value="almost">Bijna goed</option><option value="ready">Klaar</option><option value="inactive">Niet actief</option></select></label><label>Score 1–5<input name="score" type="number" min="1" max="5" /></label></div>
      <label>YouTube-link<input name="youtube_url" type="url" /></label><label>Notities<textarea name="notes" /></label><button className="portal-primary" disabled={busy}>Nummer opslaan</button>
    </form></details>
    <div className="portal-data-list">{songs.map((song) => <article className="portal-data-card" key={song.id}><div><span>{songStatus[song.status] ?? song.status}</span>{song.score && <b>Score {song.score}/5</b>}</div><h2>{song.title}</h2><p>{[song.artist, song.vocalist, song.musical_key, song.bpm ? `${song.bpm} BPM` : null].filter(Boolean).join(" · ")}</p>{song.notes && <small>{song.notes}</small>}{song.youtube_url && <a href={song.youtube_url} target="_blank" rel="noopener noreferrer">Open YouTube ↗</a>}</article>)}{!songs.length && <div className="portal-empty">De nummersdatabase is nog leeg. Voeg een nummer toe of migreer het bestaande repertoire.</div>}</div>
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

function SetlistsPanel({ setlists, setlistItems, songs, events, profiles, busy, isAdmin, onCreate, onSave, onArchive }: { setlists: Setlist[]; setlistItems: SetlistItem[]; songs: Song[]; events: BandEvent[]; profiles: Profile[]; busy: boolean; isAdmin: boolean; onCreate: (event: React.FormEvent<HTMLFormElement>) => void; onSave: (setlist: Setlist, name: string, date: string, eventId: string, songIds: string[]) => Promise<boolean>; onArchive: (setlist: Setlist) => void }) {
  const profileName = (id: string) => profiles.find((profile) => profile.id === id)?.display_name ?? "Bandlid";
  const songFor = (id: string) => songs.find((song) => song.id === id);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftDate, setDraftDate] = useState("");
  const [draftEventId, setDraftEventId] = useState("");
  const [draftSongs, setDraftSongs] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [dirty, setDirty] = useState(false);
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
            <div><strong>{song.title}</strong><small>{[song.artist, song.vocalist, song.musical_key, song.bpm ? `${song.bpm} BPM` : null, song.duration_seconds ? formatDuration(song.duration_seconds) : null].filter(Boolean).join(" · ")}</small></div>
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
    <div className="portal-data-list portal-setlist-list">{setlists.map((setlist) => { const items = setlistItems.filter((item) => item.setlist_id === setlist.id).sort((a, b) => a.position - b.position); const cardTotal = items.reduce((sum, item) => sum + (songFor(item.song_id)?.duration_seconds ?? 0), 0); return <article className={`portal-data-card ${setlist.archived ? "is-archived" : ""}`} key={setlist.id}><div><span>{setlist.archived ? "Gearchiveerd" : `Versie ${setlist.version}`}</span><b>{setlist.setlist_date ? formatDate(setlist.setlist_date) : "Geen datum"}</b></div><h2>{setlist.name}</h2><p>{items.length} nummers · {formatDuration(cardTotal)} totale speelduur</p>{items.length > 0 && <ol className="portal-song-order">{items.map((item) => <li key={item.id}>{songFor(item.song_id)?.title ?? "Onbekend nummer"}</li>)}</ol>}<small>Laatst gewijzigd door {profileName(setlist.updated_by)}</small><div className="portal-card-actions"><button className="portal-edit-setlist" onClick={() => openSetlist(setlist)}>{isAdmin ? "Bewerken" : "Bekijken"}</button>{isAdmin && <button onClick={() => onArchive(setlist)}>{setlist.archived ? "Terugzetten" : "Archiveren"}</button>}<button onClick={() => window.print()}>Printen</button></div></article>; })}{!setlists.length && <div className="portal-empty">Er zijn nog geen gedeelde setlists.</div>}</div>
  </div>;
}

function RehearsalsPanel({ rehearsals, rehearsalSongs, songs, events, isAdmin, busy, onCreate }: { rehearsals: Rehearsal[]; rehearsalSongs: RehearsalSong[]; songs: Song[]; events: BandEvent[]; isAdmin: boolean; busy: boolean; onCreate: (event: React.FormEvent<HTMLFormElement>) => void }) {
  const eventFor = (id: string | null) => events.find((event) => event.id === id);
  return <div className="portal-section"><div className="portal-section-head"><div><p className="portal-eyebrow">Samen voorbereiden</p><h1>Repetities</h1></div></div>
    {isAdmin && <details className="portal-editor"><summary>Bestaande activiteit als repetitie inrichten</summary><form className="portal-form portal-card" onSubmit={(event) => { event.preventDefault(); void onCreate(event); }}><label>Repetitie<select name="event_id" required><option value="">Kies een activiteit</option>{events.filter((item) => item.event_type === "rehearsal" && !rehearsals.some((row) => row.event_id === item.id)).map((item) => <option value={item.id} key={item.id}>{formatDate(item.event_date)} – {item.description}</option>)}</select></label><label>Algemene opmerkingen<textarea name="general_notes" /></label><button className="portal-primary" disabled={busy}>Repetitie koppelen</button></form></details>}
    <div className="portal-data-list">{rehearsals.map((rehearsal) => { const event = eventFor(rehearsal.event_id); const plannedSongs = rehearsalSongs.filter((item) => item.rehearsal_id === rehearsal.id); return <article className="portal-data-card" key={rehearsal.id}><div><span>{rehearsal.status === "completed" ? "Afgerond" : rehearsal.status === "cancelled" ? "Geannuleerd" : "Gepland"}</span><b>{event ? formatDate(event.event_date) : rehearsal.rehearsal_date ? formatDate(rehearsal.rehearsal_date) : "Datum onbekend"}</b></div><h2>{event?.description ?? rehearsal.name ?? "Repetitie"}</h2><p>{[event?.start_time?.slice(0, 5), event?.location, plannedSongs.length ? `${plannedSongs.length} nummers` : null].filter(Boolean).join(" · ")}</p>{plannedSongs.length > 0 && <ul className="portal-song-order">{plannedSongs.map((item) => <li key={item.id}>{songs.find((song) => song.id === item.song_id)?.title ?? "Onbekend nummer"}</li>)}</ul>}{rehearsal.general_notes && <small>{rehearsal.general_notes}</small>}</article>; })}{!rehearsals.length && <div className="portal-empty">Er zijn nog geen uitgebreide repetitieplannen. Activiteiten blijven zichtbaar onder Agenda.</div>}</div>
  </div>;
}

function MessagesPanel({ messages, profiles, userId, isAdmin, busy, onCreate, onDelete }: { messages: BandMessage[]; profiles: Profile[]; userId: string; isAdmin: boolean; busy: boolean; onCreate: (event: React.FormEvent<HTMLFormElement>) => void; onDelete: (id: string) => void }) {
  return <div className="portal-section"><div className="portal-section-head"><div><p className="portal-eyebrow">Voor de hele band</p><h1>Bandberichten</h1></div></div><details className="portal-editor"><summary>Bericht plaatsen</summary><form className="portal-form portal-card" onSubmit={(event) => { event.preventDefault(); void onCreate(event); }}><label>Titel<input name="title" required maxLength={160} /></label><label>Bericht<textarea name="body" required maxLength={3000} /></label><label className="portal-check-label"><input name="important" type="checkbox" /> Markeer als belangrijk</label><button className="portal-primary" disabled={busy}>Bericht plaatsen</button></form></details>
    <div className="portal-data-list">{messages.map((message) => <article className={`portal-data-card portal-message-card ${message.important ? "important" : ""}`} key={message.id}><div><span>{message.important ? "Belangrijk" : "Mededeling"}</span><b>{new Intl.DateTimeFormat("nl-NL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(message.created_at))}</b></div><h2>{message.title}</h2><p>{message.body}</p><small>Door {profiles.find((profile) => profile.id === message.author_id)?.display_name ?? "Bandlid"}</small>{(isAdmin || message.author_id === userId) && <button className="portal-delete-link" onClick={() => onDelete(message.id)}>Verwijderen</button>}</article>)}{!messages.length && <div className="portal-empty">Er zijn nog geen bandberichten.</div>}</div></div>;
}

function FilesPanel({ files, isAdmin, busy, onCreate }: { files: BandFile[]; isAdmin: boolean; busy: boolean; onCreate: (event: React.FormEvent<HTMLFormElement>) => void }) {
  return <div className="portal-section"><div className="portal-section-head"><div><p className="portal-eyebrow">Documenten en links</p><h1>Bestanden</h1></div></div>{isAdmin && <details className="portal-editor"><summary>Link toevoegen</summary><form className="portal-form portal-card" onSubmit={(event) => { event.preventDefault(); void onCreate(event); }}><div className="portal-field-row"><label>Titel<input name="title" required /></label><label>Categorie<input name="category" placeholder="Bijvoorbeeld techniek" /></label></div><label>Veilige link<input name="external_url" type="url" required /></label><label>Omschrijving<textarea name="description" /></label><button className="portal-primary" disabled={busy}>Link opslaan</button></form></details>}<div className="portal-file-grid">{files.map((file) => <a className="portal-file-card" href={file.external_url ?? "#"} target="_blank" rel="noopener noreferrer" key={file.id}><span>{file.category ?? "Bestand"}</span><h2>{file.title}</h2>{file.description && <p>{file.description}</p>}<b>Openen ↗</b></a>)}{!files.length && <div className="portal-empty">Er zijn nog geen bestanden of links toegevoegd. Supabase Storage kan later op deze structuur worden aangesloten.</div>}</div></div>;
}

function ProfilePanel({ profile, busy, onSave }: { profile: ExtendedProfile; busy: boolean; onSave: (event: React.FormEvent<HTMLFormElement>) => void }) {
  return <div className="portal-section portal-profile-section"><div><p className="portal-eyebrow">Mijn account</p><h1>Mijn profiel</h1><p className="portal-lead">Houd je eigen basisgegevens actueel. Je e-mailadres wordt beheerd via je beveiligde account.</p></div><form className="portal-form portal-card" onSubmit={(event) => { event.preventDefault(); void onSave(event); }}><label>Naam<input name="display_name" defaultValue={profile.display_name} required /></label><label>Instrument / rol<input name="instrument" defaultValue={profile.instrument ?? ""} /></label><label>Mobiel nummer<input name="phone" type="tel" defaultValue={profile.phone ?? ""} /></label><label>E-mailadres<input value={profile.email ?? ""} disabled /></label><button className="portal-primary" disabled={busy}>Profiel opslaan</button></form></div>;
}
