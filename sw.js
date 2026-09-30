/* Bunyan service worker.
   Network-first for the app itself — the page AND its modules and data — so a new
   version is picked up whole on the next load. The modules used to be cache-first
   with a background refresh, which paired a fresh index.html (new CSS) with the
   previous release's JS for one launch: markup the stylesheet no longer styles.
   Cache-first for images only.
   Bump CACHE whenever you change index.html. */
const CACHE = "bunyan-v72";
/* instructions.json (595 KB) is deliberately absent: it is cached on first use by the
   catch-all handler below, so it no longer blocks first install. */
const FILES = ["./", "./index.html", "./manifest.webmanifest",
               "./exercises.json", "./foods.json",
               "./icon-180.png", "./icon-512.png", "./mark.png", "./intro.jpg",
               /* The design's typefaces and icons. Precached because the app draws
                  its whole identity from them — offline without the fonts falls back
                  to system type, and without the icons the tab bar is blank. */
               "./fonts/manrope-latin.woff2", "./fonts/outfit-latin.woff2",
               "./icons/nav-home.svg", "./icons/nav-train.svg", "./icons/nav-food.svg",
               "./icons/nav-progress.svg", "./icons/nav-profile.svg", "./icons/play.svg",
               "./icons/day-on.svg", "./icons/day-off.svg",
               "./icons/star.svg", "./icons/arrow-right.svg", "./icons/search.svg",
               "./icons/chevron-right.svg", "./icons/chevron-left.svg",
               "./icons/clock.svg", "./icons/bulb.svg",
               "./icons/droplet.svg", "./icons/plus.svg", "./icons/trash.svg",
               "./icons/check.svg", "./icons/pause.svg", "./icons/chevron-down.svg",
               "./icons/award.svg", "./icons/camera.svg", "./icons/info.svg",
               "./icons/edit.svg", "./icons/warn.svg", "./icons/alert.svg",
               "./img/split-ap.jpg", "./img/split-arnold.jpg", "./img/split-ppl.jpg",
               "./img/split-ul.jpg", "./img/split-fb.jpg", "./img/split-bw.jpg", "./img/rest-swirl.jpg",
               "./img/split-bro.jpg",
               /* Every module is required for the app to run at all, unlike an
                  image, so all of them are precached. */
               "./js/util.js", "./js/units.js", "./js/db.js", "./js/scan.js", "./js/data/exercises.js", "./js/data/splits.js", "./js/engine/plan.js", "./js/state.js", "./js/engine/formulas.js", "./js/engine/nutrition.js", "./js/i18n/dict.js", "./js/i18n/exnames.js", "./js/ui/view.js", "./js/ui/views/home.js", "./js/ui/views/train.js", "./js/ui/views/session.js", "./js/ui/views/progress.js", "./js/ui/views/food.js", "./js/ui/views/profile.js", "./js/ui/sheets.js", "./js/ui/render.js", "./js/ui/nav.js", "./js/ui/sheetdrag.js", "./js/ui/patch.js", "./js/ui/motion.js", "./js/ui/datebar.js", "./js/engine/text.js", "./js/ui/actions.js", "./js/app.js",
               /* Progress, its stats and photos, and the add-food sheet: modules like the
                  rest, so the app cannot start offline without them. */
               "./js/engine/stats.js", "./js/photostore.js", "./js/ui/photos.js", "./js/ui/views/addfood.js",
               "./js/ui/dock.js", "./js/data/activities.js", "./js/ui/reorder.js", "./js/ui/workout.js", "./js/engine/schedule.js"];

self.addEventListener("install", e => {
  /* Added one at a time on purpose. addAll() rejects the whole install if a single
     file 404s, which would leave the app with no offline cache at all. */
  e.waitUntil(
    caches.open(CACHE)
      /* cache:"reload" skips the browser's HTTP cache, which would otherwise hand a
         just-released worker the previous release's files for a few minutes. */
      .then(c => Promise.all(FILES.map(f => c.add(new Request(f, {cache: "reload"})).catch(() => {}))))
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

const NAV_TIMEOUT = 3000;
let cacheModeUntil = 0;
function fresh(req) {
  return fetch(req.mode === "navigate" ? new Request(req.url, {cache: "no-cache", credentials: "same-origin"})
                                     : new Request(req, {cache: "no-cache"})).then(res => {
    if (res && res.status === 200) {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy));
    }
    return res;
  });
}
function appFetch(req) {
  const nav = req.mode === "navigate";
  /* index.html is only ever a stand-in for a page, never for a script or data file. */
  const fallback = () => caches.match(req).then(hit => hit || (nav ? caches.match("./index.html") : Response.error()));
  if (!nav && Date.now() < cacheModeUntil)
    return caches.match(req).then(hit => hit || fresh(req).catch(fallback));
  if (!nav) return fresh(req).catch(fallback);
  return caches.match(req).then(h => h || caches.match("./index.html")).then(cached => {
    const net = fresh(req).then(res => { cacheModeUntil = 0; return res; });
    if (!cached) return net.catch(fallback);
    const slow = new Promise(r => setTimeout(r, NAV_TIMEOUT, "slow"));
    return Promise.race([net.catch(() => "fail"), slow]).then(v => {
      if (v === "slow" || v === "fail") { cacheModeUntil = Date.now() + 20000; return cached; }
      return v;
    });
  });
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  const own = url.origin === self.location.origin;
  const isApp = req.mode === "navigate" ||
                (own && /(\/|\.html|\.js|\.json|\.webmanifest)$/.test(url.pathname));

  if (isApp) {
    /* Network first, so a new version is picked up whole — but not forever. On a
       weak gym signal the launch used to wait on every revalidation. If the page
       itself does not arrive within NAV_TIMEOUT and a cached copy exists, that copy is
       served and, for a short window, so is everything the page asks for next: the
       page and its modules must come from the same release, or the stylesheet and the
       screens disagree (the PR #5 bug). */
    e.respondWith(appFetch(req));
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
