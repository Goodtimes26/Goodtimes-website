import { getSupabaseClient } from "./supabase";

export type PushStatus = "checking" | "unsupported" | "not-installed" | "not-configured" | "denied" | "off" | "on" | "error";
export type BandPushType = "message_created" | "rehearsal_created" | "rehearsal_updated" | "performance_created" | "performance_updated";

const publicVapidKey = process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY ?? "";

export function isStandaloneBandApp() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function applicationServerKey(value: string) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const bytes = atob((value + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bytes, (character) => character.charCodeAt(0));
}

async function registration() {
  await navigator.serviceWorker.register("/band-sw.js");
  return navigator.serviceWorker.ready;
}

async function persistSubscription(subscription: PushSubscription) {
  const json = subscription.toJSON();
  const { error } = await getSupabaseClient()!.rpc("register_push_subscription", {
    p_endpoint: subscription.endpoint,
    p_p256dh: json.keys?.p256dh,
    p_auth_key: json.keys?.auth,
    p_user_agent: navigator.userAgent,
  });
  if (error) throw error;
}

export async function getPushStatus(): Promise<PushStatus> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "unsupported";
  if (!isStandaloneBandApp()) return "not-installed";
  if (!publicVapidKey) return "not-configured";
  if (Notification.permission === "denied") return "denied";
  const current = await (await registration()).pushManager.getSubscription();
  if (current) {
    await persistSubscription(current);
    return "on";
  }
  return "off";
}

export async function enablePushNotifications() {
  if (!publicVapidKey) throw new Error("De publieke VAPID-sleutel ontbreekt.");
  const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "denied" as const : "off" as const;
  const worker = await registration();
  const current = await worker.pushManager.getSubscription();
  const subscription = current ?? await worker.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: applicationServerKey(publicVapidKey) });
  await persistSubscription(subscription);
  window.localStorage.removeItem("goodtimes:push-prompt-dismissed");
  window.dispatchEvent(new Event("goodtimes:badge-permission-granted"));
  return "on" as const;
}

export async function disablePushNotifications() {
  const worker = await registration();
  const subscription = await worker.pushManager.getSubscription();
  if (!subscription) { window.localStorage.setItem("goodtimes:push-prompt-dismissed", "1"); return; }
  const { error } = await getSupabaseClient()!.rpc("unregister_push_subscription", { p_endpoint: subscription.endpoint });
  if (error) throw error;
  await subscription.unsubscribe();
  window.localStorage.setItem("goodtimes:push-prompt-dismissed", "1");
}

export async function sendBandPush(type: BandPushType, entityId: string) {
  try {
    const supabase = getSupabaseClient()!;
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session) throw sessionError ?? new Error("Geen geldige sessie voor pushmelding");
    const { data, error } = await supabase.functions.invoke("send-band-push", {
      body: { type, entityId, eventKey: crypto.randomUUID() },
      headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
    });
    if (error) throw error;
    const result = data as { sent?: number; failed?: number; recipients?: number } | null;
    console.info("[GoodTimes push] Verzendresultaat", { type, entityId, ...result });
    if (!result?.recipients) console.warn("[GoodTimes push] Geen andere bandleden met actieve pushinschrijving gevonden", { type, entityId });
    if (result?.failed) console.error("[GoodTimes push] Niet alle pushmeldingen zijn afgeleverd", { type, entityId, failed: result.failed });
    return result;
  } catch (error) {
    // Een pushfout mag de reeds geslaagde kernactie nooit terugdraaien.
    console.error("[GoodTimes push] Achtergrondmelding versturen mislukt", error);
    return null;
  }
}
