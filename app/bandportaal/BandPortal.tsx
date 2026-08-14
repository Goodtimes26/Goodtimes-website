"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  availabilityLabels,
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
  type PageView,
  type Profile,
  type RequestResponse,
  type RequestStatus,
  type ResponseStatus,
  type UserRole,
} from "../../lib/bandportal";
import { getSupabaseClient } from "../../lib/supabase";
import { clearAppBadge, countUnreadMessages, syncAppBadge } from "../../lib/appBadge";
import { BandAppModules, type BandAppTab } from "./BandAppModules";
import { PwaBadgePermission } from "./PwaBadgePermission";

type PortalTab = "home" | "agenda" | "requests" | "availability" | "events" | "more" | "users" | "analytics" | BandAppTab;
type TeamAvailability = Pick<Availability, "user_id" | "status"> & { display_name: string };
type DatedTeamAvailability = TeamAvailability & { date: string };
type RoleRow = { user_id: string; role: UserRole };
type DashboardSetlist = { id: string; name: string; updated_at: string; archived: boolean };
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

function teamAvailabilityTone(rows: TeamAvailability[]): Exclude<AvailabilityStatus, "unset"> {
  if (rows.some((row) => row.status === "unavailable")) return "unavailable";
  if (rows.some((row) => row.status === "maybe")) return "maybe";
  return "available";
}

export function BandPortal() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<UserRole>("member");
  const [tab, setTab] = useState<PortalTab>("home");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [teamCalendarAvailability, setTeamCalendarAvailability] = useState<DatedTeamAvailability[]>([]);
  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [responses, setResponses] = useState<RequestResponse[]>([]);
  const [events, setEvents] = useState<BandEvent[]>([]);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [recentSetlist, setRecentSetlist] = useState<DashboardSetlist | null>(null);
  const [pageViews, setPageViews] = useState<PageView[]>([]);
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [checkDate, setCheckDate] = useState(toIsoDate(new Date()));
  const [checkRows, setCheckRows] = useState<TeamAvailability[] | null>(null);
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
    const visibleDates = monthDays(month).map(toIsoDate);
    const analyticsSince = new Date();
    analyticsSince.setDate(analyticsSince.getDate() - 90);
    const teamAvailabilityPromise = Promise.all(visibleDates.map(async (date) => {
      const result = await supabase.rpc("team_availability", { target_date: date });
      return { date, ...result };
    }));
    const [profilesResult, requestsResult, responsesResult, eventsResult, setlistResult, rolesResult, pageViewsResult, teamAvailabilityResults] = await Promise.all([
      supabase.from("profiles").select("id,display_name,email").order("display_name"),
      supabase.from("requests").select("*").order("event_date"),
      supabase.from("request_responses").select("id,request_id,user_id,status,note"),
      supabase.from("events").select("id,event_date,start_time,end_time,location,description,notes,event_type").order("event_date"),
      supabase.from("setlists").select("id,name,updated_at,archived").eq("archived", false).order("updated_at", { ascending: false }).limit(1),
      activeRole === "admin"
        ? supabase.from("user_roles").select("user_id,role")
        : Promise.resolve({ data: [{ user_id: activeUser.id, role: activeRole }], error: null }),
      activeRole === "admin"
        ? supabase.from("page_views").select("id,path,visit_id,viewed_at").gte("viewed_at", analyticsSince.toISOString()).order("viewed_at", { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      teamAvailabilityPromise,
    ]);
    const firstError = [
      profilesResult.error,
      requestsResult.error,
      responsesResult.error,
      eventsResult.error,
      rolesResult.error,
      pageViewsResult.error,
      teamAvailabilityResults.find((result) => result.error)?.error,
    ].find(Boolean);
    if (firstError) throw firstError;
    setProfiles((profilesResult.data ?? []) as Profile[]);
    setRequests((requestsResult.data ?? []) as BookingRequest[]);
    setResponses((responsesResult.data ?? []) as RequestResponse[]);
    setEvents((eventsResult.data ?? []) as BandEvent[]);
    if (!setlistResult.error) setRecentSetlist((setlistResult.data?.[0] as DashboardSetlist | undefined) ?? null);
    setRoles((rolesResult.data ?? []) as RoleRow[]);
    setPageViews((pageViewsResult.data ?? []) as PageView[]);
    setTeamCalendarAvailability(teamAvailabilityResults.flatMap((result) =>
      ((result.data ?? []) as TeamAvailability[]).map((row) => ({ ...row, date: result.date })),
    ));
  }, [month]);

  const syncUnreadMessageBadge = useCallback(async (activeUserId: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const [messagesResult, readsResult] = await Promise.all([
      supabase.from("band_messages").select("id"),
      supabase.from("message_reads").select("message_id").eq("user_id", activeUserId),
    ]);
    if (messagesResult.error || readsResult.error) return;

    const unreadCount = countUnreadMessages(
      (messagesResult.data ?? []).map((row) => row.id as string),
      (readsResult.data ?? []).map((row) => row.message_id as string),
    );
    setUnreadMessageCount(unreadCount);
    await syncAppBadge(unreadCount);
  }, []);

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
        void clearAppBadge();
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
      if (!session) {
        void clearAppBadge();
        router.replace("/bandinlog");
      }
    });
    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, [loadPortalData, router]);

  useEffect(() => {
    if (!user) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const synchronize = () => { void syncUnreadMessageBadge(user.id); };
    const synchronizeWhenVisible = () => {
      if (document.visibilityState === "visible") synchronize();
    };

    synchronize();
    const channel = supabase
      .channel(`message-badge-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "band_messages" }, synchronize)
      .on("postgres_changes", { event: "*", schema: "public", table: "message_reads", filter: `user_id=eq.${user.id}` }, synchronize)
      .subscribe();
    const pollingTimer = window.setInterval(synchronize, 30_000);
    window.addEventListener("focus", synchronize);
    window.addEventListener("goodtimes:messages-changed", synchronize);
    window.addEventListener("goodtimes:messages-read", synchronize);
    window.addEventListener("goodtimes:badge-permission-granted", synchronize);
    document.addEventListener("visibilitychange", synchronizeWhenVisible);

    return () => {
      window.clearInterval(pollingTimer);
      window.removeEventListener("focus", synchronize);
      window.removeEventListener("goodtimes:messages-changed", synchronize);
      window.removeEventListener("goodtimes:messages-read", synchronize);
      window.removeEventListener("goodtimes:badge-permission-granted", synchronize);
      document.removeEventListener("visibilitychange", synchronizeWhenVisible);
      void supabase.removeChannel(channel);
    };
  }, [syncUnreadMessageBadge, user]);

  async function refresh() {
    if (!user) return;
    await loadPortalData(user, role);
  }

  async function signOut() {
    await clearAppBadge();
    await getSupabaseClient()?.auth.signOut();
    router.replace("/bandinlog");
  }

  async function checkAvailability(date = checkDate) {
    const supabase = getSupabaseClient()!;
    const { data, error: checkError } = await supabase.rpc("team_availability", { target_date: date });
    if (checkError) {
      setError("Het teamoverzicht is beschikbaar nadat database-migratie 003 is uitgevoerd.");
      return;
    }
    setCheckRows((data ?? []) as TeamAvailability[]);
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

  const requestResponseFor = (requestId: string) => responses.filter((response) => response.request_id === requestId);

  return (
    <main className="portal-shell portal-app">
      <header className="portal-topbar">
        <div className="portal-brand-group">
          <div className="portal-brand">GOOD<span>TIMES</span><small>BANDPORTAAL</small></div>
          <Link className="portal-site-link" href="/">← Terug naar website</Link>
        </div>
        <div className="portal-account">
          <span><strong>{profile.display_name}</strong><small>{isAdmin ? "Beheerder" : "Bandlid"}</small></span>
        </div>
      </header>

      <nav className="portal-tabs portal-desktop-nav" aria-label="Bandportaal">
        <button className={tab === "home" ? "active" : ""} onClick={() => setTab("home")}>Home</button>
        <button className={tab === "agenda" ? "active" : ""} onClick={() => setTab("agenda")}>Agenda</button>
        <button className={tab === "setlists" ? "active" : ""} onClick={() => setTab("setlists")}>Setlists</button>
        <button className={tab === "rehearsals" ? "active" : ""} onClick={() => setTab("rehearsals")}>Repetities</button>
        <button className={tab === "requests" ? "active" : ""} onClick={() => setTab("requests")}>Aanvragen</button>
        <button className={tab === "more" ? "active" : ""} onClick={() => setTab("more")}>Meer</button>
      </nav>

      <section className="portal-content">
        <PwaBadgePermission />
        {message && <div className="portal-notice" role="status">{message}<button onClick={() => setMessage("")} aria-label="Melding sluiten">×</button></div>}
        {error && <div className="portal-notice portal-notice-error" role="alert">{error}<button onClick={() => setError("")} aria-label="Foutmelding sluiten">×</button></div>}

        {tab === "home" && <PortalDashboard profile={profile} events={events} requests={requests} unreadMessageCount={unreadMessageCount} recentSetlist={recentSetlist} isAdmin={isAdmin} setTab={setTab} />}

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
                const teamRows = teamCalendarAvailability.filter((row) => row.date === iso);
                const teamStatus = teamAvailabilityTone(teamRows);
                const dayEvents = events.filter((item) => item.event_date === iso);
                return (
                  <button
                    key={iso}
                    className={`portal-day ${day.getMonth() !== month.getMonth() ? "outside" : ""} status-${teamStatus}`}
                    onClick={() => {
                      setCheckDate(iso);
                      setCheckRows(teamRows);
                      setTab("availability");
                    }}
                  >
                    <strong>{day.getDate()}</strong>
                    <span>{availabilityLabels[teamStatus]}</span>
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
          <div className="portal-section portal-availability-layout">
            <div className="portal-date-check-column">
              <p className="portal-eyebrow">Team</p>
              <h1>Beschikbaarheid</h1>
              <div className="portal-card portal-date-check">
                <label>Datum<input type="date" value={checkDate} onChange={(event) => { setCheckDate(event.target.value); setCheckRows(null); }} /></label>
                <button className="portal-primary" onClick={() => checkAvailability()}>Check beschikbaarheid</button>
                {checkRows && <AvailabilityCheck profiles={profiles} rows={checkRows} />}
              </div>
            </div>
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

        {tab === "analytics" && isAdmin && <AnalyticsDashboard pageViews={pageViews} />}

        {(["setlists", "songs", "rehearsals", "messages", "files", "profile"] as BandAppTab[]).includes(tab as BandAppTab) && (
          <BandAppModules
            tab={tab as BandAppTab}
            user={user}
            profile={profile}
            isAdmin={isAdmin}
            profiles={profiles}
            events={events}
            notify={setMessage}
            reportError={setError}
          />
        )}

        {tab === "more" && (
          <div className="portal-section portal-more-section">
            <p className="portal-eyebrow">GoodTimes Band</p><h1>Meer</h1>
            <div className="portal-more-grid">
              <button onClick={() => setTab("availability")}><strong>Beschikbaarheid</strong><span>Controleer de beschikbaarheid van de band</span></button>
              <button onClick={() => setTab("songs")}><strong>Repertoire</strong><span>Nummers, notities en oefenstatus</span></button>
              <button onClick={() => setTab("files")}><strong>Bestanden & audio</strong><span>Documenten, links en oefenopnames</span></button>
              <button onClick={() => setTab("events")}><strong>Activiteiten</strong><span>Repetities en optredens beheren</span></button>
              {isAdmin && <button onClick={() => setTab("users")}><strong>Gebruikers</strong><span>Bandleden en rollen beheren</span></button>}
              {isAdmin && <button onClick={() => setTab("analytics")}><strong>Bezoekers</strong><span>Websitebezoek bekijken</span></button>}
              <button className="portal-more-signout" type="button" onClick={signOut}><strong>Uitloggen</strong><span>Veilig afmelden bij de Band-app</span></button>
            </div>
          </div>
        )}
      </section>

      <nav className="portal-mobile-nav" aria-label="Mobiele bandnavigatie">
        <button className={tab === "home" ? "active" : ""} onClick={() => setTab("home")}><span>⌂</span>Home</button>
        <button className={tab === "agenda" ? "active" : ""} onClick={() => setTab("agenda")}><span>□</span>Agenda</button>
        <button className={tab === "setlists" ? "active" : ""} onClick={() => setTab("setlists")}><span>≡</span>Setlists</button>
        <button className={tab === "rehearsals" ? "active" : ""} onClick={() => setTab("rehearsals")}><span>●</span>Repetities</button>
        <button className={tab === "more" ? "active" : ""} onClick={() => setTab("more")}><span>•••</span>Meer</button>
      </nav>
    </main>
  );
}

function PortalDashboard({ profile, events, requests, unreadMessageCount, recentSetlist, isAdmin, setTab }: {
  profile: Profile;
  events: BandEvent[];
  requests: BookingRequest[];
  unreadMessageCount: number;
  recentSetlist: DashboardSetlist | null;
  isAdmin: boolean;
  setTab: (tab: PortalTab) => void;
}) {
  const today = toIsoDate(new Date());
  const nextEvent = events.filter((item) => item.event_type === "performance" && item.event_date >= today).sort((a, b) => a.event_date.localeCompare(b.event_date))[0];
  const openRequests = requests.filter((item) => ["new", "pending", "option"].includes(item.status)).length;
  const firstName = profile.display_name.trim().split(/\s+/)[0] || profile.display_name;
  const daysUntilEvent = nextEvent
    ? Math.round((new Date(`${nextEvent.event_date}T12:00:00`).getTime() - new Date(`${today}T12:00:00`).getTime()) / 86_400_000)
    : null;
  const hasUpdates = unreadMessageCount > 0 || Boolean(recentSetlist) || openRequests > 0;

  return <div className="portal-section portal-dashboard">
    <div className="portal-dashboard-welcome">
      <p className="portal-eyebrow">GoodTimes · 80&apos;s coverband</p>
      <h1>Hoi {firstName} <span aria-hidden="true">👋</span></h1>
      <p>Alles wat vandaag belangrijk is voor de band.</p>
    </div>

    <article className="portal-card portal-next-event">
      <div className="portal-next-event-label"><span>Volgende optreden</span>{daysUntilEvent !== null && <b>{daysUntilEvent === 0 ? "Vandaag" : daysUntilEvent === 1 ? "Morgen" : `Nog ${daysUntilEvent} dagen`}</b>}</div>
      {nextEvent ? <button className="portal-next-event-content" onClick={() => setTab("agenda")}>
        <time>{formatDate(nextEvent.event_date)}</time>
        <strong>{nextEvent.description || "GoodTimes live"}</strong>
        <span>{nextEvent.location || "Locatie volgt"}{nextEvent.start_time ? ` · ${nextEvent.start_time.slice(0, 5)} uur` : ""}</span>
      </button> : <p>Er staat nog geen optreden gepland.</p>}
    </article>

    {hasUpdates && <section className="portal-dashboard-updates" aria-labelledby="portal-updates-title">
      <div className="portal-dashboard-heading"><h2 id="portal-updates-title">Wat is er nieuw?</h2></div>
      <div className="portal-update-list">
        {unreadMessageCount > 0 ? <button onClick={() => setTab("messages")}><span className="portal-update-icon is-message" aria-hidden="true">●</span><span><strong>{unreadMessageCount === 1 ? "1 ongelezen bericht" : `${unreadMessageCount} ongelezen berichten`}</strong><small>Open Berichten</small></span><b aria-hidden="true">→</b></button>
          : recentSetlist ? <button onClick={() => setTab("setlists")}><span className="portal-update-icon is-setlist" aria-hidden="true">≡</span><span><strong>Setlist bijgewerkt</strong><small>{recentSetlist.name}</small></span><b aria-hidden="true">→</b></button>
            : <button onClick={() => setTab("requests")}><span className="portal-update-icon is-request" aria-hidden="true">?</span><span><strong>{openRequests === 1 ? "1 openstaande aanvraag" : `${openRequests} openstaande aanvragen`}</strong><small>{isAdmin ? "Bekijk en beheer" : "Controleer je beschikbaarheid"}</small></span><b aria-hidden="true">→</b></button>}
      </div>
    </section>}

    <section className="portal-dashboard-actions" aria-labelledby="portal-actions-title">
      <div className="portal-dashboard-heading"><h2 id="portal-actions-title">Snel naar</h2></div>
      <div className="portal-dashboard-grid">
        <button className="portal-dashboard-tile" onClick={() => setTab("availability")}><span className="portal-dashboard-icon" aria-hidden="true">✓</span><strong>Beschikbaarheid</strong><small>Kies een datum en check de band</small></button>
        <button className="portal-dashboard-tile portal-dashboard-message" onClick={() => setTab("messages")}><span className="portal-dashboard-icon" aria-hidden="true">●</span><strong>Berichten</strong><small>{unreadMessageCount === 0 ? "Alles gelezen" : unreadMessageCount === 1 ? "1 ongelezen" : `${unreadMessageCount} ongelezen`}</small></button>
        <button className="portal-dashboard-tile" onClick={() => setTab("songs")}><span className="portal-dashboard-icon" aria-hidden="true">80</span><strong>Repertoire</strong><small>Alle nummers bij elkaar</small></button>
      </div>
    </section>
  </div>;
}

function AnalyticsDashboard({ pageViews }: { pageViews: PageView[] }) {
  const today = toIsoDate(new Date());
  const uniqueVisits = new Set(pageViews.map((view) => view.visit_id)).size;
  const todayViews = pageViews.filter((view) => view.viewed_at.slice(0, 10) === today);
  const pageCounts = [...pageViews.reduce((counts, view) => {
    counts.set(view.path, (counts.get(view.path) ?? 0) + 1);
    return counts;
  }, new Map<string, number>())].sort((a, b) => b[1] - a[1]);
  const dailyCounts = Array.from({ length: 14 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (13 - index));
    const iso = toIsoDate(date);
    return {
      date: new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short" }).format(date),
      count: pageViews.filter((view) => view.viewed_at.slice(0, 10) === iso).length,
    };
  });
  const maxDaily = Math.max(1, ...dailyCounts.map((day) => day.count));

  return <div className="portal-section">
    <div className="portal-section-head"><div><p className="portal-eyebrow">Website</p><h1>Bezoekers</h1></div></div>
    <div className="portal-analytics-metrics">
      <article><span>Paginaweergaven</span><strong>{pageViews.length}</strong><small>afgelopen 90 dagen</small></article>
      <article><span>Bezoeken</span><strong>{uniqueVisits}</strong><small>anonieme browsersessies</small></article>
      <article><span>Vandaag</span><strong>{todayViews.length}</strong><small>paginaweergaven</small></article>
    </div>
    <div className="portal-analytics-grid">
      <article className="portal-card">
        <h2>Laatste 14 dagen</h2>
        <div className="portal-bars">{dailyCounts.map((day) => <div key={day.date}><span style={{ height: `${Math.max(4, (day.count / maxDaily) * 100)}%` }} title={`${day.count} paginaweergaven`} /><small>{day.date}</small><b>{day.count}</b></div>)}</div>
      </article>
      <article className="portal-card">
        <h2>Populaire pagina’s</h2>
        <div className="portal-page-list">{pageCounts.length ? pageCounts.slice(0, 10).map(([path, count]) => <div key={path}><span>{path === "/" ? "Home" : path}</span><strong>{count}</strong></div>) : <p className="portal-help">De eerste bezoeken verschijnen hier na publicatie.</p>}</div>
      </article>
    </div>
    <p className="portal-help portal-analytics-note">Deze meting gebruikt geen cookies en bewaart geen namen, e-mailadressen of IP-adressen.</p>
  </div>;
}

function AvailabilityCheck({ profiles, rows }: { profiles: Profile[]; rows: TeamAvailability[] }) {
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
