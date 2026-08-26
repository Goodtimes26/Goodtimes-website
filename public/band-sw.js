const CACHE = "goodtimes-band-v4";
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

self.addEventListener("push", (event) => {
  let payload = { title: "GoodTimes Band", body: "Er is nieuws in de Band-app.", url: "/bandportaal/", tag: "goodtimes-band" };
  try { if (event.data) payload = { ...payload, ...event.data.json() }; } catch (error) { console.warn("[GoodTimes push] Ongeldige pushinhoud", error); }
  event.waitUntil(self.registration.showNotification(payload.title, {
    body: payload.body,
    icon: "/favicon-192x192.png",
    badge: "/favicon-192x192.png",
    tag: payload.tag,
    renotify: true,
    data: { url: payload.url },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destination = new URL(event.notification.data?.url || "/bandportaal/", self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (clients) => {
    const existing = clients.find((client) => new URL(client.url).origin === self.location.origin);
    if (existing) {
      await existing.navigate(destination);
      return existing.focus();
    }
    return self.clients.openWindow(destination);
  }));
});
