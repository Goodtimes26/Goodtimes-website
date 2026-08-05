"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";

const measurementId = "G-Y9T36EJ1Z6";
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
  const lastTrackedPath = useRef<string | null>(null);

  const trackPage = useCallback((path: string) => {
    if (!isPublicPath(path) || lastTrackedPath.current === path || !window.gtag) return;
    window.gtag("event", "page_view", {
      page_path: path,
      page_location: window.location.href,
      page_title: document.title,
    });
    lastTrackedPath.current = path;
  }, []);

  useEffect(() => {
    trackPage(pathname);
  }, [pathname, trackPage]);

  return <>
    <script async src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`} />
    <script id="goodtimes-ga4" dangerouslySetInnerHTML={{ __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}window.gtag=gtag;gtag('js',new Date());gtag('config','${measurementId}',{send_page_view:false});` }} />
  </>;
}
