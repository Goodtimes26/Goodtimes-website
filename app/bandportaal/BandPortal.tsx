"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  availabilityLabels,
  bandMemberFirstName,
  eventLabels,
  eventVisibilityLabel,
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
import { clearAppBadge, syncAppBadge, unreadMessageIds } from "../../lib/appBadge";
import {
  activityAgeInDays,
  deduplicateDashboardActivities,
  setlistActivityKey,
  type DashboardActivity,
} from "../../lib/dashboardActivities";
import { BandAppModules, type BandAppTab } from "./BandAppModules";
import { PwaBadgePermission } from "./PwaBadgePermission";

type PortalTab = "home" | "agenda" | "agenda-admin" | "requests" | "availability" | "events" | "more" | "users" | "analytics" | "app-activity" | BandAppTab;
type TeamAvailability = Pick<Availability, "user_id" | "status"> & { display_name: string };
type DatedTeamAvailability = TeamAvailability & { date: string };
type RoleRow = { user_id: string; role: UserRole };
type AppActivityRow = { user_id: string; last_active_at: string; last_login_at: string | null };
type ActivityLogRow = { id: string; entity_type: DashboardActivity["kind"]; entity_id: string; action: "created" | "updated"; title: string; old_data: Record<string, unknown> | null; new_data: Record<string, unknown>; actor_id: string | null; created_at: string };
const ONLINE_WINDOW_MS = 3 * 60 * 1_000;
function isNewActivity(createdAt: string, updatedAt: string) {
  return Math.abs(new Date(updatedAt).getTime() - new Date(createdAt).getTime()) < 5_000;
}

function activityAgeLabel(value: string) {
  const days = activityAgeInDays(value);
  if (days === null) return "";
  if (days === 0) return "vandaag";
  if (days === 1) return "1 dag geleden";
  return `${days} dagen geleden`;
}

const activityFieldLabels: Record<string, string> = { event_date: "datum", start_time: "aanvangstijd", end_time: "eindtijd", location: "locatie", description: "omschrijving", is_public: "zichtbaarheid", title: "titel", name: "naam", setlist_date: "datum", status: "status", general_notes: "opmerkingen", youtube_url: "YouTube-link", artist: "artiest", vocalist: "zanger/zangeres", musical_key: "toonsoort", bpm: "BPM", external_url: "link" };
function activityChanges(row: ActivityLogRow) {
  if (row.action === "created") return [`Toegevoegd: ${row.title}`];
  const ignored = new Set(["id", "created_at", "updated_at", "created_by", "updated_by", "author_id", "uploaded_by", "version"]);
  return Object.keys(row.new_data).filter((key) => !ignored.has(key) && JSON.stringify(row.old_data?.[key] ?? null) !== JSON.stringify(row.new_data[key] ?? null)).slice(0, 3).map((key) => {
    const label = activityFieldLabels[key] ?? key.replaceAll("_", " ");
    const before = String(row.old_data?.[key] ?? "niet ingevuld").replace(/:00$/, "");
    const after = String(row.new_data[key] ?? "niet ingevuld").replace(/:00$/, "");
    return `Gewijzigd: ${label} van ${before} naar ${after}${key.includes("time") ? " uur" : ""}`;
  });
}
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
  const [recentActivities, setRecentActivities] = useState<DashboardActivity[]>([]);
  const [pageViews, setPageViews] = useState<PageView[]>([]);
  const [appActivity, setAppActivity] = useState<AppActivityRow[]>([]);
  const [activityNow, setActivityNow] = useState(() => Date.now());
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [checkDate, setCheckDate] = useState(toIsoDate(new Date()));
  const [checkRows, setCheckRows] = useState<TeamAvailability[] | null>(null);
  const [editingRequest, setEditingRequest] = useState<BookingRequest | null>(null);
  const [editingEvent, setEditingEvent] = useState<BandEvent | null>(null);
  const [selectedAgendaEventId, setSelectedAgendaEventId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const isAdmin = role === "admin";
  const selectedAgendaEvent = events.find((item) => item.id === selectedAgendaEventId) ?? null;
  const openAgendaEvent = useCallback((eventId: string) => {
    setSelectedAgendaEventId(eventId);
    setTab("agenda");
    window.history.pushState({ goodtimesAgendaEvent: eventId }, "", `${window.location.pathname}${window.location.search}#event-${eventId}`);
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const eventId = window.location.hash.startsWith("#event-") ? window.location.hash.slice(7) : null;
      setSelectedAgendaEventId(eventId);
      setTab(eventId ? "agenda" : "home");
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);
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
    const [profilesResult, requestsResult, responsesResult, eventsResult, rolesResult, pageViewsResult, teamAvailabilityResults] = await Promise.all([
      supabase.from("profiles").select("id,display_name,email").order("display_name"),
      supabase.from("requests").select("*").order("event_date"),
      supabase.from("request_responses").select("id,request_id,user_id,status,note"),
      supabase.from("events").select("id,event_date,start_time,end_time,location,description,notes,event_type,is_public").order("event_date"),
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
    setRoles((rolesResult.data ?? []) as RoleRow[]);
    setPageViews((pageViewsResult.data ?? []) as PageView[]);
    setTeamCalendarAvailability(teamAvailabilityResults.flatMap((result) =>
      ((result.data ?? []) as TeamAvailability[]).map((row) => ({ ...row, date: result.date })),
    ));
  }, [month]);

  const loadAppActivity = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const result = await supabase.from("app_activity").select("user_id,last_active_at,last_login_at").order("last_active_at", { ascending: false });
    if (result.error) throw result.error;
    setAppActivity((result.data ?? []) as AppActivityRow[]);
    setActivityNow(Date.now());
  }, []);

  const loadDashboardActivity = useCallback(async (activeUserId: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const activitySince = new Date();
    activitySince.setDate(activitySince.getDate() - 14);
    const [activityLogResult, messageResult, messageReadsResult, setlistResult, rehearsalResult, rehearsalPlanningResult, performanceResult] = await Promise.all([
      supabase.from("band_activity_log").select("id,entity_type,entity_id,action,title,old_data,new_data,actor_id,created_at").gte("created_at", activitySince.toISOString()).order("created_at", { ascending: false }).limit(20),
      supabase.from("band_messages").select("id,title,author_id,created_at,updated_at").gte("updated_at", activitySince.toISOString()).order("updated_at", { ascending: false }),
      supabase.from("message_reads").select("message_id").eq("user_id", activeUserId),
      supabase.from("setlists").select("id,name,event_id,setlist_date,source_system,source_id,created_at,updated_at,updated_by").eq("archived", false).order("updated_at", { ascending: false }).limit(12),
      supabase.from("rehearsals").select("id,name,rehearsal_date,created_at,updated_at,created_by").order("updated_at", { ascending: false }).limit(6),
      supabase.from("rehearsal_songs").select("id,rehearsal_id,created_at,updated_at,rehearsals(name,rehearsal_date)").order("updated_at", { ascending: false }).limit(6),
      supabase.from("events").select("id,description,created_at,updated_at,created_by").eq("event_type", "performance").order("updated_at", { ascending: false }).limit(6),
    ]);
    const unreadIds = new Set(unreadMessageIds(
      (messageResult.data ?? []).map((row) => ({ id: row.id, author_id: row.author_id })),
      (messageReadsResult.data ?? []).map((row) => row.message_id),
      activeUserId,
    ));
    setUnreadMessageCount(unreadIds.size);
    void syncAppBadge(unreadIds.size);
    const existingMessageIds = new Set((messageResult.data ?? []).map((row) => row.id));
    const currentSetlists = new Map((setlistResult.data ?? []).map((row) => [row.id, row]));
    const candidates: DashboardActivity[] = [];
    if (!activityLogResult.error) {
      for (const row of (activityLogResult.data ?? []) as ActivityLogRow[]) {
        if (row.entity_type === "message" && !existingMessageIds.has(row.entity_id)) continue;
        if (row.entity_type === "setlist") {
          const setlist = currentSetlists.get(row.entity_id);
          if (!setlist) continue;
          candidates.push({ id: `setlist:${setlist.id}`, entityKey: `setlist:${setlist.id}`, kind: "setlist", detail: setlist.name, updatedAt: row.created_at, actorId: row.actor_id, isNew: row.action === "created" });
          continue;
        }
        candidates.push({ id: `${row.entity_type}:${row.entity_id}`, entityKey: `${row.entity_type}:${row.entity_id}`, kind: row.entity_type, detail: row.title, updatedAt: row.created_at, actorId: row.actor_id, isNew: row.action === "created", changes: activityChanges(row) });
      }
      setRecentActivities(deduplicateDashboardActivities(candidates));
      return;
    }
    for (const row of messageResult.data ?? []) {
      if (unreadIds.has(row.id)) candidates.push({ id: `message:${row.id}`, entityKey: `message:${row.id}`, kind: "message", detail: row.title, updatedAt: row.updated_at, actorId: row.author_id, isNew: true });
    }
    for (const row of setlistResult.data ?? []) candidates.push({
      id: `setlist:${row.id}`,
      entityKey: setlistActivityKey({ id: row.id, name: row.name, eventId: row.event_id, setlistDate: row.setlist_date, sourceSystem: row.source_system, sourceId: row.source_id }),
      kind: "setlist",
      detail: row.name,
      updatedAt: row.updated_at,
      actorId: row.updated_by,
      isNew: isNewActivity(row.created_at, row.updated_at),
    });
    for (const row of rehearsalResult.data ?? []) candidates.push({ id: `rehearsal:${row.id}`, entityKey: `rehearsal:${row.id}`, kind: "rehearsal", detail: row.name || row.rehearsal_date || "Repetitie", updatedAt: row.updated_at, actorId: isNewActivity(row.created_at, row.updated_at) ? row.created_by : null, isNew: isNewActivity(row.created_at, row.updated_at) });
    for (const row of rehearsalPlanningResult.data ?? []) {
      const rehearsal = Array.isArray(row.rehearsals) ? row.rehearsals[0] : row.rehearsals;
      candidates.push({ id: `rehearsal-planning:${row.rehearsal_id}`, entityKey: `rehearsal-planning:${row.rehearsal_id}`, kind: "rehearsal", detail: rehearsal?.name || rehearsal?.rehearsal_date || "Repetitieplanning", updatedAt: row.updated_at, actorId: null, isNew: false });
    }
    for (const row of performanceResult.data ?? []) candidates.push({ id: `performance:${row.id}`, entityKey: `performance:${row.id}`, kind: "performance", detail: row.description || "Optreden", updatedAt: row.updated_at, actorId: isNewActivity(row.created_at, row.updated_at) ? row.created_by : null, isNew: isNewActivity(row.created_at, row.updated_at) });
    setRecentActivities(deduplicateDashboardActivities(candidates));
  }, []);

  const syncUnreadMessageBadge = useCallback(async (activeUserId: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const [messagesResult, readsResult] = await Promise.all([
      supabase.from("band_messages").select("id,author_id"),
      supabase.from("message_reads").select("message_id").eq("user_id", activeUserId),
    ]);
    if (messagesResult.error || readsResult.error) return;

    const unreadCount = unreadMessageIds(
      (messagesResult.data ?? []).map((row) => ({ id: row.id as string, author_id: row.author_id as string })),
      (readsResult.data ?? []).map((row) => row.message_id as string),
      activeUserId,
    ).length;
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
        await Promise.all([loadPortalData(activeUser, activeRole), loadDashboardActivity(activeUser.id)]);
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
  }, [loadDashboardActivity, loadPortalData, router]);

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

  useEffect(() => {
    if (!user) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const synchronize = () => { void loadDashboardActivity(user.id); };
    const channel = supabase
      .channel(`dashboard-activity-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "band_messages" }, synchronize)
      .on("postgres_changes", { event: "*", schema: "public", table: "message_reads", filter: `user_id=eq.${user.id}` }, synchronize)
      .on("postgres_changes", { event: "*", schema: "public", table: "setlists" }, synchronize)
      .on("postgres_changes", { event: "*", schema: "public", table: "rehearsals" }, synchronize)
      .on("postgres_changes", { event: "*", schema: "public", table: "rehearsal_songs" }, synchronize)
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, synchronize)
      .on("postgres_changes", { event: "*", schema: "public", table: "band_activity_log" }, synchronize)
      .subscribe();
    const pollingTimer = window.setInterval(synchronize, 30_000);
    const synchronizeWhenVisible = () => { if (document.visibilityState === "visible") synchronize(); };
    window.addEventListener("focus", synchronize);
    window.addEventListener("goodtimes:messages-changed", synchronize);
    window.addEventListener("goodtimes:messages-read", synchronize);
    document.addEventListener("visibilitychange", synchronizeWhenVisible);
    return () => {
      window.clearInterval(pollingTimer);
      window.removeEventListener("focus", synchronize);
      window.removeEventListener("goodtimes:messages-changed", synchronize);
      window.removeEventListener("goodtimes:messages-read", synchronize);
      document.removeEventListener("visibilitychange", synchronizeWhenVisible);
      void supabase.removeChannel(channel);
    };
  }, [loadDashboardActivity, user]);

  useEffect(() => {
    if (!user) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    let lastTouch = 0;
    const touch = async (force = false) => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (!force && now - lastTouch < 60_000) return;
      lastTouch = now;
      await supabase.rpc("touch_app_activity");
    };
    const touchWhenVisible = () => { if (document.visibilityState === "visible") void touch(true); };
    const touchFromUse = () => { void touch(false); };
    void touch(true);
    const timer = window.setInterval(() => { void touch(false); }, 120_000);
    window.addEventListener("focus", touchWhenVisible);
    window.addEventListener("pointerdown", touchFromUse, { passive: true });
    window.addEventListener("keydown", touchFromUse);
    document.addEventListener("visibilitychange", touchWhenVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", touchWhenVisible);
      window.removeEventListener("pointerdown", touchFromUse);
      window.removeEventListener("keydown", touchFromUse);
      document.removeEventListener("visibilitychange", touchWhenVisible);
    };
  }, [user]);

  useEffect(() => {
    if (!isAdmin || tab !== "app-activity") return;
    const initialTimer = window.setTimeout(() => {
      void loadAppActivity().catch(() => setError("De app-activiteit kon niet worden geladen. Controleer database-migratie 009."));
    }, 0);
    const timer = window.setInterval(() => {
      setActivityNow(Date.now());
      void loadAppActivity().catch(() => undefined);
    }, 30_000);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(timer);
    };
  }, [isAdmin, loadAppActivity, tab]);

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
      is_public: form.get("is_public") === "true",
      created_by: user.id,
    });
    if (eventError) setError("De activiteit kon niet worden opgeslagen.");
    else {
      event.currentTarget.reset();
      setMessage("De activiteit is toegevoegd.");
      await refresh();
    }
  }

  async function updateEvent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingEvent || !isAdmin) return;
    const form = new FormData(event.currentTarget);
    const payload = {
      event_date: String(form.get("event_date")),
      start_time: String(form.get("start_time") || "") || null,
      end_time: String(form.get("end_time") || "") || null,
      location: String(form.get("location") || "") || null,
      description: String(form.get("description")),
      notes: String(form.get("notes") || "") || null,
      event_type: String(form.get("event_type")) as EventType,
      is_public: form.get("is_public") === "true",
    };
    const { error: eventError } = await getSupabaseClient()!.from("events").update(payload).eq("id", editingEvent.id);
    if (eventError) {
      setError("De agenda-afspraak kon niet worden opgeslagen.");
      return;
    }
    setEditingEvent(null);
    setMessage("De agenda-afspraak is bijgewerkt.");
    await Promise.all([refresh(), user ? loadDashboardActivity(user.id) : Promise.resolve()]);
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
          <span><strong>{bandMemberFirstName(profile)}</strong><small>{isAdmin ? "Beheerder" : "Bandlid"}</small></span>
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

      <section className={`portal-content ${tab === "home" ? "portal-content-home" : ""}`}>
        <PwaBadgePermission />
        {message && <div className="portal-notice" role="status">{message}<button onClick={() => setMessage("")} aria-label="Melding sluiten">×</button></div>}
        {error && <div className="portal-notice portal-notice-error" role="alert">{error}<button onClick={() => setError("")} aria-label="Foutmelding sluiten">×</button></div>}

        {tab === "home" && <PortalDashboard profile={profile} profiles={profiles} events={events} unreadMessageCount={unreadMessageCount} recentActivities={recentActivities} setTab={setTab} openAgendaEvent={openAgendaEvent} />}

        {tab === "agenda" && (selectedAgendaEvent ? <AgendaEventDetail event={selectedAgendaEvent} onBack={() => window.history.back()} /> : (
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
        ))}

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
                  <article className={`portal-event-card event-${item.event_type}`} data-portal-entity-id={`${item.event_type === "performance" ? "performance" : item.event_type}:${item.id}`} key={item.id}>
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
                return <article className="portal-user-card" key={member.id}><div><strong>{bandMemberFirstName(member)}</strong><span>{member.email}</span></div><select value={memberRole} disabled={member.id === user.id} onChange={(event) => updateRole(member.id, event.target.value as UserRole)}><option value="member">Bandlid</option><option value="admin">Beheerder</option></select></article>;
              })}
            </div>
            <p className="portal-help">Nieuwe accounts worden veilig toegevoegd in Supabase Authentication. Wachtwoorden zijn nooit zichtbaar in dit portaal.</p>
          </div>
        )}

        {tab === "analytics" && isAdmin && <AnalyticsDashboard pageViews={pageViews} />}

        {tab === "app-activity" && isAdmin && <AppActivityDashboard profiles={profiles} rows={appActivity} now={activityNow} />}

        {tab === "agenda-admin" && isAdmin && (
          <AgendaAdmin
            events={events}
            editingEvent={editingEvent}
            onEdit={setEditingEvent}
            onCancel={() => setEditingEvent(null)}
            onSubmit={updateEvent}
            onDelete={deleteEvent}
          />
        )}

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
              <button className="portal-more-signout" type="button" onClick={signOut}><strong>Uitloggen</strong><span>Veilig afmelden bij de Band-app</span></button>
              <button onClick={() => setTab("availability")}><strong>Beschikbaarheid</strong><span>Controleer de beschikbaarheid van de band</span></button>
              <button onClick={() => setTab("songs")}><strong>Repertoire</strong><span>Nummers, notities en oefenstatus</span></button>
              <button onClick={() => setTab("files")}><strong>Bestanden, audio &amp; video</strong><span>Documenten, links en media</span></button>
              <button onClick={() => setTab("events")}><strong>Activiteiten</strong><span>Repetities en optredens beheren</span></button>
              {isAdmin && <button onClick={() => { setEditingEvent(null); setTab("agenda-admin"); }}><strong>Agenda bewerken</strong><span>Bestaande afspraken aanpassen</span></button>}
              {isAdmin && <button onClick={() => setTab("users")}><strong>Gebruikers</strong><span>Bandleden en rollen beheren</span></button>}
              {isAdmin && <button onClick={() => setTab("analytics")}><strong>Bezoekers</strong><span>Websitebezoek bekijken</span></button>}
              {isAdmin && <button onClick={() => setTab("app-activity")}><strong>App-activiteit</strong><span>Bekijk wanneer bandleden actief zijn</span></button>}
            </div>
          </div>
        )}
      </section>

      <nav className="portal-mobile-nav" aria-label="Mobiele bandnavigatie">
        <button className={tab === "home" ? "active" : ""} onClick={() => setTab("home")}><span>⌂</span>Home</button>
        <button className={tab === "agenda" ? "active" : ""} onClick={() => setTab("agenda")}><span>□</span>Agenda</button>
        <button className={tab === "messages" ? "active" : ""} onClick={() => setTab("messages")}><span>●</span>Berichten</button>
        <button className={tab === "more" ? "active" : ""} onClick={() => setTab("more")}><span>•••</span>Meer</button>
      </nav>
    </main>
  );
}

function lastActiveDetailLabel(value: string | null, now: number) {
  if (!value) return "Nog nooit actief";
  const moment = new Date(value);
  const elapsed = Math.max(0, now - moment.getTime());
  const today = new Date(now);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const sameDate = (left: Date, right: Date) => left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate();
  const time = new Intl.DateTimeFormat("nl-NL", { hour: "2-digit", minute: "2-digit" }).format(moment);
  if (sameDate(moment, today)) return `vandaag, ${time}`;
  if (sameDate(moment, yesterday)) return `gisteren, ${time}`;
  const days = Math.floor(elapsed / 86_400_000);
  if (days < 7) return `${days} dagen geleden, ${time}`;
  return new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(moment);
}

function AppActivityDashboard({ profiles, rows, now }: { profiles: Profile[]; rows: AppActivityRow[]; now: number }) {
  const activeSince = now - 7 * 86_400_000;
  const activeLastWeek = rows.filter((row) => new Date(row.last_active_at).getTime() >= activeSince).length;
  const sortedProfiles = [...profiles].sort((left, right) => {
    const leftTime = new Date(rows.find((row) => row.user_id === left.id)?.last_active_at ?? 0).getTime();
    const rightTime = new Date(rows.find((row) => row.user_id === right.id)?.last_active_at ?? 0).getTime();
    return rightTime - leftTime || bandMemberFirstName(left).localeCompare(bandMemberFirstName(right), "nl");
  });
  return <div className="portal-section portal-app-activity">
    <div className="portal-section-head"><div><p className="portal-eyebrow">Beheerder</p><h1>App-activiteit</h1></div></div>
    <div className="portal-activity-summary"><strong>{profiles.length}</strong><span>gebruikers</span><strong>{activeLastWeek}</strong><span>actief in de afgelopen 7 dagen</span></div>
    <div className="portal-user-list">
      {sortedProfiles.map((member) => {
        const activity = rows.find((row) => row.user_id === member.id);
        const lastActive = activity?.last_active_at ?? null;
        const isOnline = lastActive !== null && now - new Date(lastActive).getTime() <= ONLINE_WINDOW_MS;
        return <article className="portal-user-card portal-activity-card" key={member.id}>
          <div><strong>{bandMemberFirstName(member)}</strong>{isOnline && <span className="is-online">Nu online</span>}</div>
          <small>{lastActive ? `Laatst actief: ${lastActiveDetailLabel(lastActive, now)}` : "Nog nooit actief"}</small>
          {activity?.last_login_at && <small>Laatste inlog: {new Intl.DateTimeFormat("nl-NL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(activity.last_login_at))}</small>}
        </article>;
      })}
    </div>
  </div>;
}

function AgendaEventDetail({ event, onBack }: { event: BandEvent; onBack: () => void }) {
  return <div className="portal-section portal-event-detail" data-portal-entity-id={`performance:${event.id}`}>
    <button className="portal-back-button" type="button" onClick={onBack}>← Terug naar Home</button>
    <article className={`portal-event-card event-${event.event_type}`}>
      <div className="portal-card-head"><span>{eventLabels[event.event_type]}</span><time>{formatDate(event.event_date)}</time></div>
      <h1>{event.description || "GoodTimes live"}</h1>
      <dl className="portal-details">
        {event.start_time && <><dt>Aanvang</dt><dd>{event.start_time.slice(0, 5)} uur</dd></>}
        {event.end_time && <><dt>Eindtijd</dt><dd>{event.end_time.slice(0, 5)} uur</dd></>}
        {event.location && <><dt>Locatie</dt><dd>{event.location}</dd></>}
        <dt>Status</dt><dd>{eventVisibilityLabel(event)}</dd>
      </dl>
      {event.notes && <p className="portal-card-note">{event.notes}</p>}
    </article>
  </div>;
}

function PortalDashboard({ profile, profiles, events, unreadMessageCount, recentActivities, setTab, openAgendaEvent }: {
  profile: Profile;
  profiles: Profile[];
  events: BandEvent[];
  unreadMessageCount: number;
  recentActivities: DashboardActivity[];
  setTab: (tab: PortalTab) => void;
  openAgendaEvent: (eventId: string) => void;
}) {
  const [showActivityOverview, setShowActivityOverview] = useState(false);
  const activitySeenKey = `goodtimes:activity-seen:${profile.id}`;
  const [activitySeenAt, setActivitySeenAt] = useState(() => typeof window === "undefined" ? "" : window.localStorage.getItem(activitySeenKey) ?? "");
  const today = toIsoDate(new Date());
  const nextEvent = events.filter((item) => item.event_type === "performance" && item.event_date >= today).sort((a, b) => a.event_date.localeCompare(b.event_date))[0];
  const firstName = bandMemberFirstName(profile);
  const daysUntilEvent = nextEvent
    ? Math.round((new Date(`${nextEvent.event_date}T12:00:00`).getTime() - new Date(`${today}T12:00:00`).getTime()) / 86_400_000)
    : null;
  const activityPresentation = (activity: DashboardActivity) => ({
    message: { icon: "●", title: "Nieuw bericht", tab: "messages" as PortalTab, className: "is-message" },
    setlist: { icon: "≡", title: activity.isNew ? "Nieuwe setlist" : "Setlist gewijzigd", tab: "setlists" as PortalTab, className: "is-setlist" },
    rehearsal: { icon: "●", title: activity.id.startsWith("rehearsal-planning:") ? "Repetitieplanning aangepast" : activity.isNew ? "Repetitie toegevoegd" : "Repetitie gewijzigd", tab: "rehearsals" as PortalTab, className: "is-rehearsal" },
    performance: { icon: "□", title: activity.isNew ? "Optreden toegevoegd" : "Optreden gewijzigd", tab: "agenda" as PortalTab, className: "is-performance" },
    file: { icon: "□", title: activity.isNew ? "Nieuw bestand/audio" : "Bestand/audio gewijzigd", tab: "files" as PortalTab, className: "is-file" },
    song: { icon: "80", title: activity.isNew ? "Nieuw repertoirenummer" : "Repertoire gewijzigd", tab: "songs" as PortalTab, className: "is-song" },
  }[activity.kind]);
  const openActivity = (activity: DashboardActivity) => {
    if (activity.kind === "performance") {
      openAgendaEvent(activity.id.replace(/^performance:/, ""));
      return;
    }
    window.sessionStorage.setItem("goodtimes:activity-target", JSON.stringify({ id: activity.id, title: activity.detail }));
    setTab(activityPresentation(activity).tab);
    window.setTimeout(() => {
      const target = document.querySelector<HTMLElement>(`[data-portal-entity-id="${CSS.escape(activity.id)}"]`) ?? [...document.querySelectorAll<HTMLElement>("article h2")].find((heading) => heading.textContent?.trim() === activity.detail)?.closest<HTMLElement>("article");
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
      target?.classList.add("is-activity-target");
      if (target) window.sessionStorage.removeItem("goodtimes:activity-target");
    }, 120);
  };
  const latestActivity = recentActivities[0] ?? null;
  const latestPresentation = latestActivity ? activityPresentation(latestActivity) : null;
  const hasNewActivities = unreadMessageCount > 0 || recentActivities.some((activity) => activity.kind === "message" || !activitySeenAt || new Date(activity.updatedAt).getTime() > new Date(activitySeenAt).getTime());
  const toggleActivityOverview = () => {
    setShowActivityOverview((visible) => !visible);
    if (!showActivityOverview) {
      const seenAt = new Date().toISOString();
      window.localStorage.setItem(activitySeenKey, seenAt);
      setActivitySeenAt(seenAt);
    }
  };

  return <div className="portal-section portal-dashboard">
    <div className="portal-dashboard-welcome">
      <p className="portal-eyebrow">GoodTimes · 80&apos;s coverband</p>
      <h1>Hoi {firstName} <span aria-hidden="true">👋</span></h1>
      <p>Alles wat vandaag belangrijk is voor de band.</p>
    </div>

    <article className="portal-card portal-next-event">
      <div className="portal-next-event-label"><span>Volgende optreden</span>{daysUntilEvent !== null && <b>{daysUntilEvent === 0 ? "Vandaag" : daysUntilEvent === 1 ? "Morgen" : `Nog ${daysUntilEvent} dagen`}</b>}</div>
      {nextEvent ? <button className="portal-next-event-content" onClick={() => openActivity({ id: `performance:${nextEvent.id}`, entityKey: `performance:${nextEvent.id}`, kind: "performance", detail: nextEvent.description || "GoodTimes live", updatedAt: `${nextEvent.event_date}T${nextEvent.start_time ?? "00:00"}`, actorId: null, isNew: false })}>
        <time>{formatDate(nextEvent.event_date)}</time>
        <strong>{nextEvent.description || "GoodTimes live"}<em>{eventVisibilityLabel(nextEvent)}</em></strong>
        <span>{nextEvent.location || "Locatie volgt"}{nextEvent.start_time ? ` · ${nextEvent.start_time.slice(0, 5)} uur` : ""}</span>
      </button> : <p>Er staat nog geen optreden gepland.</p>}
    </article>

    <section className="portal-dashboard-updates" aria-labelledby="portal-updates-title">
      <button className="portal-update-summary" onClick={toggleActivityOverview} aria-expanded={showActivityOverview}>
        <span className="portal-update-summary-icon" aria-hidden="true">✦</span>
        <span><small id="portal-updates-title">Wat is er nieuw?</small><strong>{hasNewActivities ? "Er zijn nieuwe berichten" : "Er zijn geen nieuwe berichten"}</strong>{latestPresentation && <em>{latestPresentation.title}</em>}{latestActivity && <small>{latestActivity.detail}</small>}{latestActivity && latestActivity.kind !== "setlist" && latestActivity.changes?.map((change) => <small key={change}>{change}</small>)}{latestActivity && <small>{activityAgeLabel(latestActivity.updatedAt)}</small>}</span>
        <b aria-hidden="true">{showActivityOverview ? "−" : "+"}</b>
      </button>
      {showActivityOverview && <div className="portal-update-list portal-update-overview">{recentActivities.map((activity) => { const presentation = activityPresentation(activity); const actor = activity.actorId ? profiles.find((candidate) => candidate.id === activity.actorId) : null; return <button key={activity.id} onClick={() => openActivity(activity)}><span className={`portal-update-icon ${presentation.className}`} aria-hidden="true">{presentation.icon}</span><span><strong>{presentation.title}</strong><em>{activity.detail}</em>{activity.changes?.map((change) => <small key={change}>{change}</small>)}<small>{[activityAgeLabel(activity.updatedAt), actor ? `door ${bandMemberFirstName(actor)}` : null].filter(Boolean).join(" · ")}</small></span><b aria-hidden="true">→</b></button>; })}{!recentActivities.length && <p className="portal-dashboard-empty">Er zijn nog geen nieuwe wijzigingen sinds de activiteitenregistratie is gestart.</p>}</div>}
    </section>

    <section className="portal-dashboard-actions" aria-labelledby="portal-actions-title">
      <h2 className="portal-sr-only" id="portal-actions-title">Hoofdfuncties</h2>
      <div className="portal-dashboard-grid">
        <button className="portal-dashboard-tile tone-agenda" onClick={() => setTab("agenda")}><span className="portal-dashboard-icon" aria-hidden="true">□</span><strong>Agenda</strong><small>Alles op één plek</small></button>
        <button className="portal-dashboard-tile tone-availability" onClick={() => setTab("availability")}><span className="portal-dashboard-icon" aria-hidden="true">✓</span><strong>Beschikbaarheid</strong><small>Check de band</small></button>
        <button className="portal-dashboard-tile tone-setlists" onClick={() => setTab("setlists")}><span className="portal-dashboard-icon" aria-hidden="true">≡</span><strong>Setlists</strong><small>Sets en speelvolgorde</small></button>
        <button className="portal-dashboard-tile tone-repertoire" onClick={() => setTab("songs")}><span className="portal-dashboard-icon" aria-hidden="true">80</span><strong>Repertoire</strong><small>Alle nummers</small></button>
        <button className="portal-dashboard-tile tone-rehearsals" onClick={() => setTab("rehearsals")}><span className="portal-dashboard-icon" aria-hidden="true">●</span><strong>Repetities</strong><small>Planning en nummers</small></button>
        <button className="portal-dashboard-tile tone-messages" onClick={() => setTab("messages")}><span className="portal-dashboard-icon" aria-hidden="true">✦</span><strong>Berichten</strong><small>{unreadMessageCount === 0 ? "Alles gelezen" : unreadMessageCount === 1 ? "1 ongelezen" : `${unreadMessageCount} ongelezen`}</small>{unreadMessageCount > 0 && <b className="portal-tile-badge" aria-label={`${unreadMessageCount} ongelezen berichten`}>{unreadMessageCount}</b>}</button>
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
    return <div key={profile.id}><span>{bandMemberFirstName(profile)}</span><b className={`status-${row?.status ?? "available"}`}>{availabilityLabels[row?.status ?? "available"]}</b></div>;
  })}</div>;
}

function ResponseSummary({ profiles, responses }: { profiles: Profile[]; responses: RequestResponse[] }) {
  return <div className="portal-response-summary">{profiles.map((profile) => {
    const response = responses.find((item) => item.user_id === profile.id);
    return <span className={`response-${response?.status ?? "unset"}`} key={profile.id}>{bandMemberFirstName(profile)}: {response ? responseLabels[response.status] : "Nog niet gereageerd"}</span>;
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
    <label>Locatie<input name="location" /></label><label>Omschrijving<input name="description" required /></label><label>Zichtbaarheid<select name="is_public" defaultValue="false"><option value="false">Besloten</option><option value="true">Openbaar</option></select></label><label>Opmerkingen<textarea name="notes" /></label>
    <button className="portal-primary" type="submit">Activiteit toevoegen</button>
  </form></div>;
}

function AgendaAdmin({ events, editingEvent, onEdit, onCancel, onSubmit, onDelete }: {
  events: BandEvent[];
  editingEvent: BandEvent | null;
  onEdit: (event: BandEvent) => void;
  onCancel: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onDelete: (id: string) => void;
}) {
  const sortedEvents = [...events].sort((left, right) => `${left.event_date}T${left.start_time ?? "00:00"}`.localeCompare(`${right.event_date}T${right.start_time ?? "00:00"}`));
  return <div className="portal-section portal-agenda-admin">
    <div className="portal-section-head"><div><p className="portal-eyebrow">Beheerder</p><h1>Agenda bewerken</h1></div></div>
    {editingEvent && <form className="portal-form portal-card portal-agenda-edit-form" onSubmit={onSubmit} key={editingEvent.id}>
      <h2>{editingEvent.description}</h2>
      <label>Titel / omschrijving<input name="description" defaultValue={editingEvent.description} required maxLength={240} /></label>
      <div className="portal-field-row"><label>Datum<input name="event_date" type="date" defaultValue={editingEvent.event_date} required /></label><label>Locatie<input name="location" defaultValue={editingEvent.location ?? ""} /></label></div>
      <div className="portal-field-row"><label>Begintijd<input name="start_time" type="time" defaultValue={editingEvent.start_time?.slice(0, 5) ?? ""} /></label><label>Eindtijd<input name="end_time" type="time" defaultValue={editingEvent.end_time?.slice(0, 5) ?? ""} /></label></div>
      <div className="portal-field-row"><label>Type afspraak<select name="event_type" defaultValue={editingEvent.event_type}>{Object.entries(eventLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label>Zichtbaarheid<select name="is_public" defaultValue={String(editingEvent.is_public)}><option value="true">Openbaar</option><option value="false">Besloten</option></select></label></div>
      <label>Aanvullende informatie / opmerking<textarea name="notes" defaultValue={editingEvent.notes ?? ""} maxLength={2000} /></label>
      <div className="portal-form-actions"><button className="portal-primary" type="submit">Wijzigingen opslaan</button><button type="button" onClick={onCancel}>Annuleren</button></div>
    </form>}
    <div className="portal-agenda-admin-list">
      {sortedEvents.map((item) => <article className={`portal-event-card event-${item.event_type}`} data-portal-entity-id={`${item.event_type === "performance" ? "performance" : item.event_type}:${item.id}`} key={item.id}>
        <div className="portal-card-head"><span>{eventLabels[item.event_type]}</span><time>{formatDate(item.event_date)}</time></div>
        <h2>{item.description}</h2>
        <p>{[item.start_time?.slice(0, 5), item.end_time ? `tot ${item.end_time.slice(0, 5)}` : null, item.location].filter(Boolean).join(" · ") || "Tijd en locatie niet ingevuld"}</p>
        <span className={`portal-visibility-badge ${item.is_public ? "is-public" : "is-private"}`}>{eventVisibilityLabel(item)}</span>
        {item.notes && <p className="portal-card-note">{item.notes}</p>}
        <div className="portal-card-actions"><button type="button" onClick={() => { onEdit(item); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Bewerken</button><button className="danger" type="button" onClick={() => onDelete(item.id)}>Verwijderen</button></div>
      </article>)}
      {!sortedEvents.length && <div className="portal-empty">Er zijn nog geen agenda-items.</div>}
    </div>
  </div>;
}
