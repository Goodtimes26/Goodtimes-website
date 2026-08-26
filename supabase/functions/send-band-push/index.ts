import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type" };
const allowedTypes = new Set(["message_created", "rehearsal_created", "rehearsal_updated", "performance_created", "performance_updated"]);

type RequestBody = { type?: string; entityId?: string; eventKey?: string };
type NotificationDetails = { body: string; url: string; tag: string };

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authorization = request.headers.get("Authorization") ?? "";
    const service = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return json({ error: "Niet ingelogd" }, 401);
    const { data: member } = await service.from("profiles").select("id,display_name").eq("id", user.id).maybeSingle();
    if (!member) return json({ error: "Geen actief bandlid" }, 403);

    const body = await request.json() as RequestBody;
    if (!body.type || !allowedTypes.has(body.type) || !body.entityId || !body.eventKey) return json({ error: "Ongeldige pushopdracht" }, 400);
    const eventKey = body.eventKey;
    if (!/^[0-9a-f-]{36}$/i.test(eventKey) || !/^[0-9a-f-]{36}$/i.test(body.entityId)) return json({ error: "Ongeldig ID" }, 400);

    if (body.type === "message_created") {
      const { data: authoredMessage } = await service.from("band_messages").select("id").eq("id", body.entityId).eq("author_id", user.id).maybeSingle();
      if (!authoredMessage) return json({ error: "Alleen de auteur kan deze berichtmelding versturen" }, 403);
    } else {
      const { data: actorRole } = await service.from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
      if (actorRole?.role !== "admin") return json({ error: "Alleen beheerders kunnen agenda- en repetitiemeldingen versturen" }, 403);
    }

    const { error: eventError } = await service.from("push_notification_events").insert({ event_key: eventKey, actor_id: user.id, event_type: body.type, entity_id: body.entityId });
    if (eventError?.code === "23505") return json({ duplicate: true, sent: 0 });
    if (eventError) throw eventError;

    const details = await notificationDetails(service, body.type, body.entityId, String(member.display_name ?? "Bandlid"));
    if (!details) return json({ error: "Bronitem niet gevonden" }, 404);
    const { data: subscriptions, error: subscriptionsError } = await service.from("push_subscriptions").select("id,endpoint,p256dh,auth_key").neq("user_id", user.id);
    if (subscriptionsError) throw subscriptionsError;

    webpush.setVapidDetails(Deno.env.get("VAPID_SUBJECT")!, Deno.env.get("VAPID_PUBLIC_KEY")!, Deno.env.get("VAPID_PRIVATE_KEY")!);
    let sent = 0;
    let failed = 0;
    for (const subscription of subscriptions ?? []) {
      try {
        await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth_key } }, JSON.stringify({ title: "GoodTimes Band", ...details }), { TTL: 86_400, urgency: "normal" });
        sent += 1;
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) await service.from("push_subscriptions").delete().eq("id", subscription.id);
        failed += 1;
        console.error("[GoodTimes push] Verzending mislukt", { subscriptionId: subscription.id, statusCode, message: error instanceof Error ? error.message : "Onbekende fout" });
      }
    }
    console.info("[GoodTimes push] Verzendronde afgerond", { type: body.type, entityId: body.entityId, recipients: subscriptions?.length ?? 0, sent, failed });
    return json({ recipients: subscriptions?.length ?? 0, sent, failed });
  } catch (error) {
    console.error("[GoodTimes push] Functiefout", error instanceof Error ? error.message : "Onbekende fout");
    return json({ error: "Pushmelding kon niet worden verwerkt" }, 500);
  }
});

async function notificationDetails(service: ReturnType<typeof createClient>, type: string, entityId: string, actorName: string): Promise<NotificationDetails | null> {
  const firstName = actorName.trim().split(/\s+/)[0] || "Een bandlid";
  if (type === "message_created") {
    const { data } = await service.from("band_messages").select("id").eq("id", entityId).maybeSingle();
    return data ? { body: `Nieuw bericht van ${firstName}`, url: `/bandportaal/?tab=messages&target=message:${entityId}`, tag: `message:${entityId}` } : null;
  }
  if (type.startsWith("performance_")) {
    const { data } = await service.from("events").select("id,description").eq("id", entityId).eq("event_type", "performance").maybeSingle();
    if (!data) return null;
    return { body: `${type.endsWith("created") ? "Nieuw optreden" : "Optreden gewijzigd"}: ${data.description || "GoodTimes live"}`, url: `/bandportaal/?tab=agenda#event-${entityId}`, tag: `${type}:${entityId}` };
  }
  const { data: rehearsal } = await service.from("rehearsals").select("id,event_id,name,rehearsal_date").or(`id.eq.${entityId},event_id.eq.${entityId}`).maybeSingle();
  const eventId = rehearsal?.event_id ?? (/^[0-9a-f-]{36}$/i.test(entityId) ? entityId : null);
  const { data: event } = eventId ? await service.from("events").select("description,event_date").eq("id", eventId).maybeSingle() : { data: null };
  if (!rehearsal && !event) return null;
  const label = event?.description || rehearsal?.name || event?.event_date || rehearsal?.rehearsal_date || "Repetitie";
  return { body: `${type.endsWith("created") ? "Nieuwe repetitie" : "Repetitie gewijzigd"}: ${label}`, url: `/bandportaal/?tab=rehearsals&target=rehearsal:${rehearsal?.id ?? entityId}`, tag: `${type}:${rehearsal?.id ?? entityId}` };
}

function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
