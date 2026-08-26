"use client";

import { useEffect, useState } from "react";
import { enablePushNotifications, disablePushNotifications, getPushStatus, type PushStatus } from "../../lib/pushNotifications";

const statusText: Record<PushStatus, string> = {
  checking: "Status controleren…", unsupported: "Dit toestel ondersteunt geen Web Push.",
  "not-installed": "Installeer de GoodTimes Band-app eerst op het beginscherm.",
  "not-configured": "Pushmeldingen zijn nog niet door de beheerder geactiveerd.",
  denied: "Meldingen zijn geblokkeerd. Zet ze aan via de instellingen van je toestel.",
  off: "Uit", on: "Aan", error: "De meldingsstatus kon niet worden geladen.",
};

export function PushNotificationSettings({ prompt = false }: { prompt?: boolean }) {
  const [status, setStatus] = useState<PushStatus>("checking");
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(() => typeof window !== "undefined" && window.localStorage.getItem("goodtimes:push-prompt-dismissed") === "1");

  useEffect(() => { void getPushStatus().then(setStatus).catch((error) => { console.error("[GoodTimes push] Statuscontrole mislukt", error); setStatus("error"); }); }, []);
  if (prompt && (dismissed || status !== "off")) return null;

  const enable = async () => {
    setBusy(true);
    try { setStatus(await enablePushNotifications()); }
    catch (error) { console.error("[GoodTimes push] Inschakelen mislukt", error); setStatus("error"); }
    finally { setBusy(false); }
  };
  const disable = async () => {
    setBusy(true);
    try { await disablePushNotifications(); setStatus("off"); }
    catch (error) { console.error("[GoodTimes push] Uitschakelen mislukt", error); setStatus("error"); }
    finally { setBusy(false); }
  };

  if (prompt) return <div className="portal-notice portal-push-prompt" role="status"><span><strong>Wil je meldingen ontvangen van GoodTimes Band?</strong><small>Ontvang belangrijke updates, ook als de app gesloten is.</small></span><button type="button" disabled={busy} onClick={() => void enable()}>{busy ? "Bezig…" : "Meldingen aan"}</button><button type="button" onClick={() => { window.localStorage.setItem("goodtimes:push-prompt-dismissed", "1"); setDismissed(true); }}>Niet nu</button></div>;

  return <section className="portal-card portal-push-settings"><div><strong>Pushmeldingen</strong><span className={`portal-push-state is-${status}`}>{statusText[status]}</span></div><p>Ontvang meldingen over nieuwe berichten, repetities en optredens.</p>{status === "on" ? <button type="button" disabled={busy} onClick={() => void disable()}>Uitschakelen</button> : status === "off" ? <button className="portal-primary" type="button" disabled={busy} onClick={() => void enable()}>Inschakelen</button> : null}</section>;
}
