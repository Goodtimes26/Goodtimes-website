"use client";

import { useCallback, useEffect, useState } from "react";
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
type Setlist = { id: string; name: string; setlist_date: string | null; version: number; archived: boolean; updated_at: string; updated_by: string };
type Rehearsal = { id: string; event_id: string; status: string; general_notes: string | null };
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
  const [rehearsals, setRehearsals] = useState<Rehearsal[]>([]);
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
    const [setlistResult, rehearsalResult, messageResult, fileResult, profileResult] = await Promise.all([
      supabase.from("setlists").select("id,name,setlist_date,version,archived,updated_at,updated_by").order("updated_at", { ascending: false }),
      supabase.from("rehearsals").select("id,event_id,status,general_notes").order("created_at", { ascending: false }),
      supabase.from("band_messages").select("id,author_id,title,body,important,created_at").order("created_at", { ascending: false }),
      supabase.from("band_files").select("id,title,category,external_url,storage_path,description,created_at").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id,display_name,email,instrument,phone,avatar_url").eq("id", user.id).single(),
    ]);
    if ([setlistResult.error, rehearsalResult.error, messageResult.error, fileResult.error].some(Boolean)) {
      setReady(false);
      return;
    }
    setSongs((songProbe.data ?? []) as Song[]);
    setSetlists((setlistResult.data ?? []) as Setlist[]);
    setRehearsals((rehearsalResult.data ?? []) as Rehearsal[]);
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

  if (tab === "songs") return <SongsPanel songs={songs} busy={busy} onCreate={async (form) => {
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

  if (tab === "setlists") return <SetlistsPanel setlists={setlists} events={events} profiles={profiles} busy={busy} onCreate={async (form) => {
    const data = new FormData(form.currentTarget);
    const ok = await submit("setlists", {
      name: String(data.get("name")), setlist_date: String(data.get("setlist_date") || "") || null,
      event_id: String(data.get("event_id") || "") || null, created_by: user.id, updated_by: user.id,
    }, "Setlist aangemaakt.");
    if (ok) form.currentTarget.reset();
  }} onArchive={async (setlist) => {
    const { error } = await getSupabaseClient()!.from("setlists").update({ archived: !setlist.archived, updated_by: user.id, version: setlist.version + 1 }).eq("id", setlist.id);
    if (error) reportError("De setlist kon niet worden bijgewerkt."); else { notify(setlist.archived ? "Setlist teruggezet." : "Setlist gearchiveerd."); await load(); }
  }} />;

  if (tab === "rehearsals") return <RehearsalsPanel rehearsals={rehearsals} events={events} isAdmin={isAdmin} busy={busy} onCreate={async (form) => {
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

function SongsPanel({ songs, busy, onCreate }: { songs: Song[]; busy: boolean; onCreate: (event: React.FormEvent<HTMLFormElement>) => void }) {
  return <div className="portal-section"><div className="portal-section-head"><div><p className="portal-eyebrow">Centrale database</p><h1>Repertoire / nummers</h1></div><span className="portal-count">{songs.length} nummers</span></div>
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

function SetlistsPanel({ setlists, events, profiles, busy, onCreate, onArchive }: { setlists: Setlist[]; events: BandEvent[]; profiles: Profile[]; busy: boolean; onCreate: (event: React.FormEvent<HTMLFormElement>) => void; onArchive: (setlist: Setlist) => void }) {
  const profileName = (id: string) => profiles.find((profile) => profile.id === id)?.display_name ?? "Bandlid";
  return <div className="portal-section"><div className="portal-section-head"><div><p className="portal-eyebrow">Gedeelde setlists</p><h1>Setlists</h1></div><a className="portal-primary" href="https://goodtimes-setlist-maker.e-voorthuijsen571420.chatgpt.site" target="_blank" rel="noopener noreferrer">Open Setlist Maker ↗</a></div>
    <details className="portal-editor"><summary>Nieuwe setlist</summary><form className="portal-form portal-card" onSubmit={(event) => { event.preventDefault(); void onCreate(event); }}><div className="portal-field-row"><label>Naam<input name="name" required /></label><label>Datum<input name="setlist_date" type="date" /></label></div><label>Koppel aan optreden<select name="event_id"><option value="">Niet gekoppeld</option>{events.filter((item) => item.event_type === "performance").map((item) => <option value={item.id} key={item.id}>{formatDate(item.event_date)} – {item.description}</option>)}</select></label><button className="portal-primary" disabled={busy}>Setlist aanmaken</button></form></details>
    <div className="portal-data-list portal-setlist-list">{setlists.map((setlist) => <article className={`portal-data-card ${setlist.archived ? "is-archived" : ""}`} key={setlist.id}><div><span>{setlist.archived ? "Gearchiveerd" : `Versie ${setlist.version}`}</span><b>{setlist.setlist_date ? formatDate(setlist.setlist_date) : "Geen datum"}</b></div><h2>{setlist.name}</h2><p>Laatst gewijzigd door {profileName(setlist.updated_by)}</p><div className="portal-card-actions"><button onClick={() => onArchive(setlist)}>{setlist.archived ? "Terugzetten" : "Archiveren"}</button><button onClick={() => window.print()}>Printen</button></div></article>)}{!setlists.length && <div className="portal-empty">Er zijn nog geen gedeelde setlists.</div>}</div>
  </div>;
}

function RehearsalsPanel({ rehearsals, events, isAdmin, busy, onCreate }: { rehearsals: Rehearsal[]; events: BandEvent[]; isAdmin: boolean; busy: boolean; onCreate: (event: React.FormEvent<HTMLFormElement>) => void }) {
  const eventFor = (id: string) => events.find((event) => event.id === id);
  return <div className="portal-section"><div className="portal-section-head"><div><p className="portal-eyebrow">Samen voorbereiden</p><h1>Repetities</h1></div></div>
    {isAdmin && <details className="portal-editor"><summary>Bestaande activiteit als repetitie inrichten</summary><form className="portal-form portal-card" onSubmit={(event) => { event.preventDefault(); void onCreate(event); }}><label>Repetitie<select name="event_id" required><option value="">Kies een activiteit</option>{events.filter((item) => item.event_type === "rehearsal" && !rehearsals.some((row) => row.event_id === item.id)).map((item) => <option value={item.id} key={item.id}>{formatDate(item.event_date)} – {item.description}</option>)}</select></label><label>Algemene opmerkingen<textarea name="general_notes" /></label><button className="portal-primary" disabled={busy}>Repetitie koppelen</button></form></details>}
    <div className="portal-data-list">{rehearsals.map((rehearsal) => { const event = eventFor(rehearsal.event_id); return <article className="portal-data-card" key={rehearsal.id}><div><span>{rehearsal.status === "completed" ? "Afgerond" : rehearsal.status === "cancelled" ? "Geannuleerd" : "Gepland"}</span><b>{event ? formatDate(event.event_date) : "Datum onbekend"}</b></div><h2>{event?.description ?? "Repetitie"}</h2><p>{[event?.start_time?.slice(0, 5), event?.location].filter(Boolean).join(" · ")}</p>{rehearsal.general_notes && <small>{rehearsal.general_notes}</small>}</article>; })}{!rehearsals.length && <div className="portal-empty">Er zijn nog geen uitgebreide repetitieplannen. Activiteiten blijven zichtbaar onder Agenda.</div>}</div>
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
