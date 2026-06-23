/* Plantões da Gabi — minimal service worker.
 *
 * Strategy:
 *  - NetworkFirst for HTML navigations (so a deploy is picked up immediately).
 *  - CacheFirst for /assets/* (Vite hashes filenames, so safe to cache long).
 *  - Auto-update: skipWaiting + clients.claim() so new SWs activate at once.
 *  - Cache version bump invalidates the asset cache between releases.
 */

const ASSET_CACHE = "plantoes-assets-v1";
const HTML_CACHE = "plantoes-html-v1";
const KNOWN_CACHES = new Set([ASSET_CACHE, HTML_CACHE]);

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter(
            (name) =>
              (name.startsWith("plantoes-") || name.startsWith("workbox-")) &&
              !KNOWN_CACHES.has(name),
          )
          .map((name) => caches.delete(name)),
      );
      if ("navigationPreload" in self.registration) {
        try {
          await self.registration.navigationPreload.enable();
        } catch {}
      }
      await self.clients.claim();
    })(),
  );
});

function isHTMLRequest(request) {
  if (request.mode === "navigate") return true;
  const accept = request.headers.get("accept") || "";
  return accept.includes("text/html");
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Never intercept API / auth callback / server-fn paths.
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/_serverFn")) {
    return;
  }

  if (isHTMLRequest(request)) {
    event.respondWith(
      (async () => {
        try {
          const preload = await event.preloadResponse;
          const network = preload || (await fetch(request));
          const cache = await caches.open(HTML_CACHE);
          cache.put(request, network.clone()).catch(() => {});
          return network;
        } catch {
          const cached = await caches.match(request);
          if (cached) return cached;
          const fallback = await caches.match("/");
          if (fallback) return fallback;
          throw new Error("offline");
        }
      })(),
    );
    return;
  }

  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        const network = await fetch(request);
        if (network.ok) {
          const cache = await caches.open(ASSET_CACHE);
          cache.put(request, network.clone()).catch(() => {});
        }
        return network;
      })(),
    );
  }
});
