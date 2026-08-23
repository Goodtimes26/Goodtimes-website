"use client";

import { useEffect } from "react";

export function PwaRegistration() {
  useEffect(() => {
    const standaloneQuery = window.matchMedia("(display-mode: standalone)");
    const updateStandaloneMode = () => {
      const iosStandalone = Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
      document.documentElement.classList.toggle("band-app-standalone", standaloneQuery.matches || iosStandalone);
    };

    updateStandaloneMode();
    standaloneQuery.addEventListener("change", updateStandaloneMode);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/band-sw.js").then((registration) => registration.update()).catch(() => {
        // De portaalfuncties blijven bruikbaar als installatie niet wordt ondersteund.
      });
    }

    return () => {
      standaloneQuery.removeEventListener("change", updateStandaloneMode);
      document.documentElement.classList.remove("band-app-standalone");
    };
  }, []);
  return null;
}
