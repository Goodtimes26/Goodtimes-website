"use client";

import { useEffect } from "react";

export function PwaRegistration() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/band-sw.js").catch(() => {
        // De portaalfuncties blijven bruikbaar als installatie niet wordt ondersteund.
      });
    }
  }, []);
  return null;
}
