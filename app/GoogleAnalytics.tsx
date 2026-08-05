"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const privateRoutes = ["/bandinlog", "/bandportaal"];
const isPublicPath = (path: string) => !privateRoutes.some((route) => path.startsWith(route));

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export default function GoogleAnalytics() {
  const pathname = usePathname();
  const lastTrackedPath = useRef(pathname);

  useEffect(() => {
    if (!isPublicPath(pathname) || lastTrackedPath.current === pathname || !window.gtag) return;
    window.gtag("event", "page_view", {
      page_path: pathname,
      page_location: window.location.href,
      page_title: document.title,
    });
    lastTrackedPath.current = pathname;
  }, [pathname]);

  return null;
}
