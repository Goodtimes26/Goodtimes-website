"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  availabilityLabels,
  datesBetween,
  eventLabels,
  formatDate,
  requestLabels,
  responseLabels,
  toIsoDate,
  type Availability,
  type AvailabilityStatus,
  type BandEvent,
  type BookingRequest,
  type EventType,
  type Profile,
  type RequestResponse,
  type RequestStatus,
  type ResponseStatus,
  type UserRole,
} from "../../lib/bandportal";
import { getSupabaseClient } from "../../lib/supabase";

type PortalTab = "agenda" | "requests" | "availability" | "events" | "users";
type RoleRow = { user_id: string; role: UserRole };
type AvailabilityDraft = {
  start: string;
  end: string;
  status: "unavailable" | "maybe";
  note: string;
};

const emptyAvailability = (): AvailabilityDraft => ({
  start: toIsoDate(new Date()),
  end: toIsoDate(new Date()),
  status: "unavailable",
  note: "",
});

function monthDays(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - ((first.getDay() + 6) % 7));
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function responseTone(responses: RequestResponse[], memberCount: number) {
  if (responses.some((response) => response.status === "no")) return "unavailable";
  if (memberCount > 0 && responses.filter((response) => response.status === "yes").length === memberCount) return "available";
  return "pending";
}

export function BandPortal() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<UserRole>("member");
  const [tab, setTab] = useState<PortalTab>("agenda");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [responses, setResponses] = useState<RequestResponse[]>([]);
  const [events, setEvents] = useState<BandEvent[]>([]);
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [availabilityDraft, setAvailabilityDraft] = useState<AvailabilityDraft>(emptyAvailability);
  const [checkDate, setCheckDate] = useState(toIsoDate(new Date()));
  const [checkRows, setCheckRows] = useState<Availability[] | null>(null);
  const [editingRequest, setEditingRequest] = useState<BookingRequest | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const isAdmin = role === "admin";
  const calendarDays = useMemo(() => monthDays(month), [month]);
  const monthLabel = useMemo(
    () => new Intl.DateTimeFormat("nl-NL", { month: "long", year: "numeric" }).format(month),
    [month],
  );

  const loadPortalData = useCallback(async (activeUser: User, activeRole: UserRole) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const firstDay = toIsoDate(new Date(month.getFullYear(), month.getMonth(), 1));
    const lastDay = toIsoDate(new Date(month.getFullYear(), month.getMonth() + 1, 0));
    const [profilesResult, availabilityResult, requestsResult, responsesResult, eventsResult, rolesResult] = await Promise.all([
      supabase.from("profiles").select("id,display_name,email").order("display_name"),
      supabase.from("availability").select("id,user_id,date,status,private_note").gte("date", firstDay).lte("date", lastDay),
      supabase.from("requests").select("*").order("event_date"),
      supabase.from("request_responses").select("id,request_id,user_id,status,note"),
      supabase.from("events").select("id,event_date,start_time,end_time,location,description,notes,event_type").order("event_date"),
      activeRole === "admin"
        ? supabase.from("user_roles").select("user_id,role")
        : Promise.resolve({ data: [{ user_id: activeUser.id, role: activeRole }], error: null }),
    ]);
    const firstError = [
      profilesResult.error,
      availabilityResult.error,
      requestsResult.error,
      responsesResult.error,
      eventsResult.error,
      rolesResult.error,
    ].find(Boolean);
    if (firstError) throw firstError;
    setProfiles((profilesResult.data ?? []) as Profile[]);
    setAvailability((availabilityResult.data ?? []) as Availability[]);
    setRequests((requestsResult.data ?? []) as BookingRequest[]);
    setResponses((responsesResult.data ?? []) as RequestResponse[]);
    setEvents((eventsResult.data ?? []) as BandEvent[]);
    setRoles((rolesResult.data ?? []) as RoleRow[]);
  }, [month]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      router.replace("/bandinlog");
      return;
    }
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      if (!data.session) {
        router.replace("/bandinlog");
        return;
      }
      const activeUser = data.session.user;
      const [profileResult, roleResult] = await Promise.all([
        supabase.from("profiles").select("id,display_name,email").eq("id", activeUser.id).single(),
        supabase.from("user_roles").select("role").eq("user_id", activeUser.id).single(),
      ]);
      if (!active) return;
      if (profileResult.error || roleResult.error) {
        setError("Je account heeft nog geen geldig bandprofiel of rol.");
        setLoading(false);
        return;
      }
      const activeRole = roleResult.data.role as UserRole;
      setUser(activeUser);
      setProfile(profileResult.data as Profile);
      setRole(activeRole);
      try {
        await loadPortalData(activeUser, activeRole);
      } catch {
        setError("De bandgegevens konden niet veilig worden geladen.");
      } finally {
        setLoading(false);
      }
    });
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace("/bandinlog");
    });
    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, [loadPortalData, router]);

  async function refresh() {
    if (!user) return;
    await loadPortalData(user, role);
  }

  async function signOut() {
    await getSupabaseClient()?.auth.signOut();
    router.replace("/bandinlog");
  }

  async function saveAvailability(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    setError("");
    const supabase = getSupabaseClient()!;
    const rows = datesBetween(availabilityDraft.start, availabilityDraft.end).map((date) => ({
      user_id: user.id,
      date,
      status: availabilityDraft.status,
      private_note: availabilityDraft.note.trim() || null,
    }));
    const { error: saveError } = await supabase.from("availability").upsert(rows, { onConflict: "user_id,date" });
    if (saveError) {
      setError("Je beschikbaarheid kon niet worden opgeslagen.");
      return;
    }
    setMessage(rows.length > 1 ? "De periode is opgeslagen." : "Je beschikbaarheid is opgeslagen.");
    await refresh();
  }

  async function clearAvailability() {
    if (!user) return;
    setError("");
    const { error: clearError } = await getSupabaseClient()!
      .from("availability")
      .delete()
      .eq("user_id", user.id)
      .gte("date", availabilityDraft.start)
      .lte("date", availabilityDraft.end);
    if (clearError) {
      setError("De periode kon niet als beschikbaar worden hersteld.");
      return;
    }
    setAvailabilityDraft((draft) => ({ ...draft, status: "unavailable", note: "" }));
    setMessage("Geen bijzonderheden voor deze periode: je staat automatisch als beschikbaar.");
    await refresh();
  }

  async function checkAvailability(date = checkDate) {
    const supabase = getSupabaseClient()!;
    const { data, error: checkError } = await supabase
      .from("availability")
      .select("id,user_id,date,status,private_note")
      .eq("date", date);
    if (checkError) {
      setError("De datumcontrole kon niet worden uitgevoerd.");
      return;
    }
    setCheckRows((data ?? []) as Availability[]);
  }

  async function saveRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !isAdmin) return;
    const form = new FormData(event.currentTarget);
    const payload = {
      event_date: String(form.get("event_date")),
      event_name: String(form.get("event_name")),
      location: String(form.get("location") || "") || null,
      city: String(form.get("city") || "") || null,
      performance_type: String(form.get("performance_type") || "") || null,
      start_time: String(form.get("start_time") || "") || null,
      end_time: String(form.get("end_time") || "") || null,
      contact_name: String(form.get("contact_name") || "") || null,
      contact_phone: String(form.get("contact_phone") || "") || null,
      contact_email: String(form.get("contact_email") || "") || null,
      offered_fee: String(form.get("offered_fee") || "") || null,
      response_deadline: String(form.get("response_deadline") || "") || null,
      notes: String(form.get("notes") || "") || null,
      status: String(form.get("status")) as RequestStatus,
      created_by: user.id,
    };
    const supabase = getSupabaseClient()!;
    const result = editingRequest
      ? await supabase.from("requests").update(payload).eq("id", editingRequest.id)
      : await supabase.from("requests").insert(payload);
    if (result.error) {
      setError("De aanvraag kon niet worden opgeslagen.");
      return;
    }
    event.currentTarget.reset();
    setEditingRequest(null);
    setMessage("De aanvraag is opgeslagen.");
    await refresh();
  }

  async function deleteRequest(id: string) {
    if (!isAdmin || !window.confirm("Weet je zeker dat je deze aanvraag wilt verwijderen?")) return;
    const { error: deleteError } = await getSupabaseClient()!.from("requests").delete().eq("id", id);
    if (deleteError) setError("De aanvraag kon niet worden verwijderd.");
    else await refresh();
  }

  async function respondToRequest(requestId: string, status: ResponseStatus) {
    if (!user) return;
    const { error: responseError } = await getSupabaseClient()!
      .from("request_responses")
      .upsert({ request_id: requestId, user_id: user.id, status }, { onConflict: "request_id,user_id" });
    if (responseError) setError("Je reactie kon niet worden opgeslagen.");
    else {
      setMessage("Je reactie is opgeslagen.");
      await refresh();
    }
  }

  async function saveEvent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !isAdmin) return;
    const form = new FormData(event.currentTarget);
    const { error: eventError } = await getSupabaseClient()!.from("events").insert({
      event_date: String(form.get("event_date")),
      start_time: String(form.get("start_time") || "") || null,
      end_time: String(form.get("end_time") || "") || null,
      location: String(form.get("location") || "") || null,
      description: String(form.get("description")),
      notes: String(form.get("notes") || "") || null,
      event_type: String(form.get("event_type")) as EventType,
      created_by: user.id,
    });
    if (eventError) setError("De activiteit kon niet worden opgeslagen.");
    else {
      event.currentTarget.reset();
      setMessage("De activiteit is toegevoegd.");
      await refresh();
    }
  }

  async function deleteEvent(id: string) {
    if (!isAdmin || !window.confirm("Deze activiteit verwijderen?")) return;
    const { error: eventError } = await getSupabaseClient()!.from("events").delete().eq("id", id);
    if (eventError) setError("De activiteit kon niet worden verwijderd.");
    else await refresh();
  }

  async function updateRole(userId: string, nextRole: UserRole) {
    if (!isAdmin) return;
    const { error: roleError } = await getSupabaseClient()!
      .from("user_roles")
      .update({ role: nextRole })
      .eq("user_id", userId);
    if (roleError) setError("De gebruikersrol kon niet worden gewijzigd.");
    else await refresh();
  }

  if (loading) return <main className="portal-shell portal-loading"><div className="portal-loader" />Bandportaal laden…</main>;
  if (!user || !profile) {
    return <main className="portal-shell portal-loading"><p>{error || "Je wordt doorgestuurd naar de bandinlog…"}</p></main>;
  }

  const ownAvailability = availability.filter((row) => row.user_id === user.id);
  const requestResponseFor = (requestId: string) => responses.filter((response) => response.request_id === requestId);

  return (
    <main className="portal-shell portal-app">
      <header className="portal-topbar">
        <div className="portal-brand-group">
          <div className="portal-brand">GOOD<span>TIMES</span><small>BANDPORTAAL</small></div>
          <a className="portal-site-link" href="/">← Terug naar website</a>
        </div>
        <div className="portal-account">
          <span><strong>{profile.display_name}</strong><small>{isAdmin ? "Beheerder" : "Bandlid"}</small></span>
          <button type="button" onClick={signOut}>Uitloggen</button>
        </div>
      </header>

      <nav className="portal-tabs" aria-label="Bandportaal">
        <button className={tab === "agenda" ? "active" : ""} onClick={() => setTab("agenda")}>Agenda</button>
        <button className={tab === "requests" ? "active" : ""} onClick={() => setTab("requests")}>Aanvragen</button>
        <button className={tab === "availability" ? "active" : ""} onClick={() => setTab("availability")}>Beschikbaarheid</button>
        <button className={tab === "events" ? "active" : ""} onClick={() => setTab("events")}>Repetities & optredens</button>
        {isAdmin && <button className={tab === "users" ? "active" : ""} onClick={() => setTab("users")}>Gebruikers</button>}
      </nav>

      <section className="portal-content">
        {message && <div className="portal-notice" role="status">{message}<button onClick={() => setMessage("")} aria-label="Melding sluiten">×</button></div>}
        {error && <div className="portal-notice portal-notice-error" role="alert">{error}<button onClick={() => setError("")} aria-label="Foutmelding sluiten">×</button></div>}

        {tab === "agenda" && (
          <div className="portal-section">
            <div className="portal-section-head">
              <div><p className="portal-eyebrow">Bandagenda</p><h1>{monthLabel}</h1></div>
              <div className="portal-month-controls">
                <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="Vorige maand">←</button>
                <button onClick={() => setMonth(new Date())}>Vandaag</button>
                <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="Volgende maand">→</button>
              </div>
            </div>
            <div className="portal-calendar-weekdays">{["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"].map((day) => <span key={day}>{day}</span>)}</div>
            <div className="portal-calendar">
              {calendarDays.map((day) => {
                const iso = toIsoDate(day);
                const own = ownAvailability.find((row) => row.date === iso);
                const dayEvents = events.filter((item) => item.event_date === iso);
                return (
                  <button
                    key={iso}
                    className={`portal-day ${day.getMonth() !== month.getMonth() ? "outside" : ""} status-${own?.status ?? "available"}`}
                    onClick={() => {
                      setAvailabilityDraft({
                        start: iso,
                        end: iso,
                        status: own?.status === "maybe" ? "maybe" : "unavailable",
                        note: own?.private_note ?? "",
                      });
                      setTab("availability");
                    }}
                  >
                    <strong>{day.getDate()}</strong>
                    <span>{availabilityLabels[own?.status ?? "available"]}</span>
                    {dayEvents.slice(0, 2).map((item) => <small key={item.id} className={`event-${item.event_type}`}>{eventLabels[item.event_type]}</small>)}
                  </button>
                );
              })}
            </div>
            <div className="portal-legend">
              {(["available", "unavailable", "maybe"] as AvailabilityStatus[]).map((status) => <span key={status} className={`status-${status}`}>{availabilityLabels[status]}</span>)}
            </div>
          </div>
        )}

        {tab === "availability" && (
          <div className="portal-section portal-two-column portal-availability-layout">
            <div className="portal-availability-column">
              <p className="portal-eyebrow">Mijn beschikbaarheid</p>
              <h1>Beschikbaarheid invullen</h1>
              <form className="portal-form portal-card" onSubmit={saveAvailability}>
                <div className="portal-field-row">
                  <label>Van<input type="date" value={availabilityDraft.start} onChange={(event) => setAvailabilityDraft((draft) => ({ ...draft, start: event.target.value, end: event.target.value > draft.end ? event.target.value : draft.end }))} required /></label>
                  <label>Tot en met<input type="date" min={availabilityDraft.start} value={availabilityDraft.end} onChange={(event) => setAvailabilityDraft((draft) => ({ ...draft, end: event.target.value }))} required /></label>
                </div>
                <label>Status<select value={availabilityDraft.status} onChange={(event) => setAvailabilityDraft((draft) => ({ ...draft, status: event.target.value as AvailabilityDraft["status"] }))}>
                  <option value="unavailable">Niet beschikbaar</option><option value="maybe">Misschien</option>
                </select></label>
                <label>Privé-opmerking<textarea maxLength={500} value={availabilityDraft.note} onChange={(event) => setAvailabilityDraft((draft) => ({ ...draft, note: event.target.value }))} placeholder="Bijvoorbeeld vakantie, werk of verjaardag" /></label>
                <p className="portal-help">Vul alleen een uitzondering in. Zonder invoer sta je automatisch als beschikbaar. De opmerking is alleen zichtbaar voor jou en een beheerder.</p>
                <div className="portal-form-actions">
                  <button className="portal-primary" type="submit">Uitzondering opslaan</button>
                  <button type="button" onClick={clearAvailability}>Geen uitzondering: beschikbaar</button>
                </div>
              </form>
            </div>
            {isAdmin && (
              <div className="portal-date-check-column">
                <p className="portal-eyebrow">Beheerder</p>
                <h2>Controleer datum</h2>
                <div className="portal-card portal-date-check">
                  <label>Datum<input type="date" value={checkDate} onChange={(event) => setCheckDate(event.target.value)} /></label>
                  <button className="portal-primary" onClick={() => checkAvailability()}>Controleer datum</button>
                  {checkRows && <AvailabilityCheck profiles={profiles} rows={checkRows} />}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "requests" && (
          <div className="portal-section">
            <div className="portal-section-head"><div><p className="portal-eyebrow">Boekingen</p><h1>Aanvragen</h1></div></div>
            {isAdmin && <RequestForm request={editingRequest} onSubmit={saveRequest} onCancel={() => setEditingRequest(null)} />}
            <div className="portal-request-grid">
              {requests.map((request) => {
                const requestResponses = requestResponseFor(request.id);
                const tone = responseTone(requestResponses, profiles.length);
                const ownResponse = requestResponses.find((response) => response.user_id === user.id);
                return (
                  <article className={`portal-request-card tone-${tone}`} key={request.id}>
                    <div className="portal-card-head"><span>{requestLabels[request.status]}</span><time>{formatDate(request.event_date)}</time></div>
                    <h2>{request.event_name}</h2>
                    <p>{[request.location, request.city].filter(Boolean).join(" · ") || "Locatie nog niet ingevuld"}</p>
                    <dl className="portal-details">
                      {request.performance_type && <><dt>Soort</dt><dd>{request.performance_type}</dd></>}
                      {request.start_time && <><dt>Tijd</dt><dd>{request.start_time.slice(0, 5)}{request.end_time ? ` – ${request.end_time.slice(0, 5)}` : ""}</dd></>}
                      {request.response_deadline && <><dt>Reageren voor</dt><dd>{formatDate(request.response_deadline)}</dd></>}
                      {request.offered_fee && <><dt>Vergoeding</dt><dd>{request.offered_fee}</dd></>}
                    </dl>
                    {request.notes && <p className="portal-card-note">{request.notes}</p>}
                    {isAdmin ? (
                      <>
                        <ResponseSummary profiles={profiles} responses={requestResponses} />
                        <div className="portal-card-actions"><button onClick={() => setEditingRequest(request)}>Wijzigen</button><button className="danger" onClick={() => deleteRequest(request.id)}>Verwijderen</button></div>
                      </>
                    ) : (
                      <div className="portal-response-actions">
                        {(["yes", "no", "tentative"] as ResponseStatus[]).map((status) => <button className={ownResponse?.status === status ? "selected" : ""} key={status} onClick={() => respondToRequest(request.id, status)}>{responseLabels[status]}</button>)}
                      </div>
                    )}
                  </article>
                );
              })}
              {requests.length === 0 && <div className="portal-empty">Er zijn nog geen aanvragen.</div>}
            </div>
          </div>
        )}

        {tab === "events" && (
          <div className="portal-section portal-two-column">
            {isAdmin && <EventForm onSubmit={saveEvent} />}
            <div>
              <p className="portal-eyebrow">Bandactiviteiten</p>
              <h1>Repetities & optredens</h1>
              <div className="portal-event-list">
                {events.map((item) => (
                  <article className={`portal-event-card event-${item.event_type}`} key={item.id}>
                    <span>{eventLabels[item.event_type]}</span><time>{formatDate(item.event_date)}</time>
                    <h2>{item.description}</h2>
                    <p>{[item.start_time?.slice(0, 5), item.end_time?.slice(0, 5), item.location].filter(Boolean).join(" · ")}</p>
                    {item.notes && <p className="portal-card-note">{item.notes}</p>}
                    {isAdmin && <button className="portal-delete-link" onClick={() => deleteEvent(item.id)}>Verwijderen</button>}
                  </article>
                ))}
                {events.length === 0 && <div className="portal-empty">Er zijn nog geen bandactiviteiten.</div>}
              </div>
            </div>
          </div>
        )}

        {tab === "users" && isAdmin && (
          <div className="portal-section">
            <p className="portal-eyebrow">Beheerder</p><h1>Gebruikers en rollen</h1>
            <div className="portal-user-list">
              {profiles.map((member) => {
                const memberRole = roles.find((item) => item.user_id === member.id)?.role ?? "member";
                return <article className="portal-user-card" key={member.id}><div><strong>{member.display_name}</strong><span>{member.email}</span></div><select value={memberRole} disabled={member.id === user.id} onChange={(event) => updateRole(member.id, event.target.value as UserRole)}><option value="member">Bandlid</option><option value="admin">Beheerder</option></select></article>;
              })}
            </div>
            <p className="portal-help">Nieuwe accounts worden veilig toegevoegd in Supabase Authentication. Wachtwoorden zijn nooit zichtbaar in dit portaal.</p>
          </div>
        )}
      </section>
    </main>
  );
}

function AvailabilityCheck({ profiles, rows }: { profiles: Profile[]; rows: Availability[] }) {
  const statuses = profiles.map((profile) => rows.find((row) => row.user_id === profile.id)?.status ?? "available");
  const tone = statuses.includes("unavailable") ? "unavailable" : statuses.includes("maybe") ? "pending" : "available";
  return <div className={`portal-check-result tone-${tone}`}><strong>{tone === "available" ? "Iedereen beschikbaar" : tone === "unavailable" ? "Niet volledig beschikbaar" : "Nog niet definitief"}</strong>{profiles.map((profile) => {
    const row = rows.find((item) => item.user_id === profile.id);
    return <div key={profile.id}><span>{profile.display_name}</span><b className={`status-${row?.status ?? "available"}`}>{availabilityLabels[row?.status ?? "available"]}</b></div>;
  })}</div>;
}

function ResponseSummary({ profiles, responses }: { profiles: Profile[]; responses: RequestResponse[] }) {
  return <div className="portal-response-summary">{profiles.map((profile) => {
    const response = responses.find((item) => item.user_id === profile.id);
    return <span className={`response-${response?.status ?? "unset"}`} key={profile.id}>{profile.display_name}: {response ? responseLabels[response.status] : "Nog niet gereageerd"}</span>;
  })}</div>;
}

function RequestForm({ request, onSubmit, onCancel }: { request: BookingRequest | null; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void; onCancel: () => void }) {
  return <details className="portal-editor" open={Boolean(request)}><summary>{request ? "Aanvraag wijzigen" : "Nieuwe aanvraag"}</summary><form className="portal-form portal-card" onSubmit={onSubmit} key={request?.id ?? "new"}>
    <div className="portal-field-row"><label>Datum<input name="event_date" type="date" defaultValue={request?.event_date} required /></label><label>Naam evenement<input name="event_name" defaultValue={request?.event_name} required /></label></div>
    <div className="portal-field-row"><label>Locatie<input name="location" defaultValue={request?.location ?? ""} /></label><label>Plaats<input name="city" defaultValue={request?.city ?? ""} /></label></div>
    <div className="portal-field-row"><label>Soort optreden<input name="performance_type" defaultValue={request?.performance_type ?? ""} /></label><label>Status<select name="status" defaultValue={request?.status ?? "new"}>{Object.entries(requestLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label></div>
    <div className="portal-field-row"><label>Aanvangstijd<input name="start_time" type="time" defaultValue={request?.start_time?.slice(0, 5)} /></label><label>Verwachte eindtijd<input name="end_time" type="time" defaultValue={request?.end_time?.slice(0, 5)} /></label></div>
    <div className="portal-field-row"><label>Contactpersoon<input name="contact_name" defaultValue={request?.contact_name ?? ""} /></label><label>Telefoonnummer<input name="contact_phone" type="tel" defaultValue={request?.contact_phone ?? ""} /></label></div>
    <div className="portal-field-row"><label>E-mailadres<input name="contact_email" type="email" defaultValue={request?.contact_email ?? ""} /></label><label>Aangeboden vergoeding<input name="offered_fee" defaultValue={request?.offered_fee ?? ""} /></label></div>
    <label>Uiterste reactiedatum<input name="response_deadline" type="date" defaultValue={request?.response_deadline ?? ""} /></label>
    <label>Opmerkingen<textarea name="notes" defaultValue={request?.notes ?? ""} /></label>
    <div className="portal-form-actions"><button className="portal-primary" type="submit">{request ? "Wijzigingen opslaan" : "Aanvraag toevoegen"}</button>{request && <button type="button" onClick={onCancel}>Annuleren</button>}</div>
  </form></details>;
}

function EventForm({ onSubmit }: { onSubmit: (event: React.FormEvent<HTMLFormElement>) => void }) {
  return <div><p className="portal-eyebrow">Beheerder</p><h2>Activiteit toevoegen</h2><form className="portal-form portal-card" onSubmit={onSubmit}>
    <label>Type<select name="event_type">{Object.entries(eventLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
    <label>Datum<input name="event_date" type="date" required /></label>
    <div className="portal-field-row"><label>Begintijd<input name="start_time" type="time" /></label><label>Eindtijd<input name="end_time" type="time" /></label></div>
    <label>Locatie<input name="location" /></label><label>Omschrijving<input name="description" required /></label><label>Opmerkingen<textarea name="notes" /></label>
    <button className="portal-primary" type="submit">Activiteit toevoegen</button>
  </form></div>;
}
