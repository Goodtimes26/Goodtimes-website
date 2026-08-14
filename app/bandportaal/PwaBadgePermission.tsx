"use client";

import { useEffect, useState } from "react";
import { getBadgeAvailability } from "../../lib/appBadge";

type BadgePermissionState = "checking" | "hidden" | "prompt" | "denied" | "unsupported";

function isStandalonePwa() {
  const iosNavigator = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || iosNavigator.standalone === true;
}

export function PwaBadgePermission() {
  const [state, setState] = useState<BadgePermissionState>("checking");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const standalone = isStandalonePwa();
      const badgeApiAvailable = typeof (navigator as Navigator & { setAppBadge?: unknown }).setAppBadge === "function";
      const notificationsAvailable = "Notification" in window;
      const notificationPermission = notificationsAvailable ? Notification.permission : "unsupported";

      console.info("[GoodTimes badge] iOS/PWA-controle", {
        standalone,
        badgeApiAvailable,
        notificationsAvailable,
        notificationPermission,
        serviceWorkerAvailable: "serviceWorker" in navigator,
      });

      const availability = getBadgeAvailability({
        standalone,
        badgeApiAvailable,
        notificationsAvailable,
        notificationPermission,
      });
      if (availability === "browser" || availability === "ready") setState("hidden");
      else if (availability === "permission-required") setState("prompt");
      else if (availability === "permission-denied") setState("denied");
      else setState("unsupported");
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function requestBadgePermission() {
    try {
      const permission = await Notification.requestPermission();
      console.info("[GoodTimes badge] Meldingsrecht na gebruikersactie", { permission });
      if (permission === "granted") {
        setState("hidden");
        window.dispatchEvent(new Event("goodtimes:badge-permission-granted"));
      } else {
        setState("denied");
      }
    } catch (error) {
      console.error("[GoodTimes badge] iOS-meldingsrecht kon niet worden aangevraagd", error);
      setState("unsupported");
    }
  }

  if (state === "checking" || state === "hidden") return null;

  if (state === "prompt") {
    return <div className="portal-notice portal-notice-warning" role="status">
      <span>Sta meldingen toe om het aantal ongelezen berichten op het GT-appicoon te tonen.</span>
      <button type="button" onClick={() => { void requestBadgePermission(); }}>Badge inschakelen</button>
    </div>;
  }

  if (state === "denied") {
    return <div className="portal-notice portal-notice-warning" role="status">
      De badge is geblokkeerd. Zet op je iPhone bij Instellingen → Meldingen → GoodTimes Band zowel meldingen als badges aan.
    </div>;
  }

  return <div className="portal-notice portal-notice-warning" role="status">
    Dit toestel ondersteunt badges voor deze webapp niet. Gebruik een geïnstalleerde PWA op iOS 16.4 of hoger.
  </div>;
}
