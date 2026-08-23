const CACHE = "goodtimes-band-v3";
const APP_SHELL = ["/bandinlog/", "/favicon-192x192.png", "/favicon-512x512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  const isBandApp = url.origin === self.location.origin && (
    url.pathname.startsWith("/bandinlog") ||
    url.pathname.startsWith("/bandportaal") ||
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/favicon-")
  );
  if (!isBandApp) return;
  const networkRequest = new Request(event.request, { cache: "no-store" });
  event.respondWith(fetch(networkRequest).then((response) => {
    if (response.ok) caches.open(CACHE).then((cache) => cache.put(event.request, response.clone()));
    return response;
  }).catch(() => caches.match(event.request).then((cached) => cached || caches.match("/bandinlog/"))));
});
