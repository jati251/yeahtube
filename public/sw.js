// YeahTube Lightweight Service Worker for Chrome Mobile PWA Installability & Offline Cache
const CACHE_NAME = "yeahtube-v1";
const STATIC_ASSETS = [
  "/",
  "/manifest.webmanifest",
  "/favicon.ico",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable-512.png",
  "/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Only handle GET requests for navigation and static files
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Skip video streams and API mutations
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/storage/")) {
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request).then((response) => {
        if (response) return response;
        if (event.request.mode === "navigate") {
          return caches.match("/");
        }
        return new Response("Network offline", { status: 503, statusText: "Offline" });
      });
    })
  );
});
