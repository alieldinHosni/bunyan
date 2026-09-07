/* Bunyan service worker.
   Network-first for the app itself, so a new version is picked up on the next
   load instead of being served from cache. Cache-first for images only.
   Bump CACHE whenever you change index.html. */
const CACHE = "bunyan-v24";
/* instructions.json (595 KB) is deliberately absent: it is cached on first use by the
   catch-all handler below, so it no longer blocks first install. */
const FILES = ["./", "./index.html", "./manifest.webmanifest",
               "./exercises.json", "./foods.json",
               "./icon-180.png", "./icon-512.png", "./mark.png", "./intro.jpg",
               /* Every module is required for the app to run at all, unlike an
                  image, so all of them are precached. */
               "./js/util.js", "./js/units.js", "./js/db.js", "./js/scan.js", "./js/data/exercises.js", "./js/data/splits.js", "./js/engine/plan.js", "./js/state.js", "./js/engine/formulas.js", "./js/engine/nutrition.js", "./js/i18n/dict.js", "./js/i18n/exnames.js", "./js/ui/view.js", "./js/ui/views/home.js", "./js/ui/views/train.js", "./js/ui/views/session.js", "./js/ui/views/progress.js", "./js/ui/views/food.js", "./js/ui/views/profile.js", "./js/ui/sheets.js", "./js/ui/render.js", "./js/ui/nav.js", "./js/ui/sheetdrag.js", "./js/ui/actions.js", "./js/app.js"];

self.addEventListener("install", e => {
  /* Added one at a time on purpose. addAll() rejects the whole install if a single
     file 404s, which would leave the app with no offline cache at all. */
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(FILES.map(f => c.add(f).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", e => {
  if (e.data === "skipWaiting") self.skipWaiting();
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;

  const isPage = req.mode === "navigate" ||
                 (req.destination === "" && req.url.endsWith(".html")) ||
                 req.url.endsWith("/") ||
                 req.url.endsWith("sw.js") ||
                 req.url.endsWith("manifest.webmanifest");

  if (isPage) {
    // Network first: always try for a fresh app, fall back to cache offline.
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req).then(hit => hit || caches.match("./index.html")))
    );
    return;
  }

  // Open Food Facts: always live, never cached, never blocking.
  if (req.url.indexOf("openfoodfacts.org") > -1) return;

  // Remote exercise photos: cache them permanently on first view.
  if (req.url.indexOf("cdn.jsdelivr.net") > -1) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return res;
      }).catch(() => new Response("", {status: 404})))
    );
    return;
  }

  // Images and everything else: cache first, refresh in the background.
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req).then(res => {
        if (res && res.status === 200 && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
