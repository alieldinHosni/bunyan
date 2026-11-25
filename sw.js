/* Bunyan service worker.
   Network-first for the app itself — the page AND its modules and data — so a new
   version is picked up whole on the next load. The modules used to be cache-first
   with a background refresh, which paired a fresh index.html (new CSS) with the
   previous release's JS for one launch: markup the stylesheet no longer styles.
   Cache-first for images only.
   Bump CACHE whenever you change index.html. */
const CACHE = "bunyan-v322";
/* instructions.json (595 KB) is deliberately absent: it is cached on first use by the
   catch-all handler below, so it no longer blocks first install. */
const FILES = ["./", "./index.html", "./manifest.webmanifest",
               "./exercises.json", "./foods.json",
               "./icon-180.png", "./icon-512.png", "./icon-maskable-512.png", "./icon-red-180.png", "./icon-mono-180.png",
               "./mark.png", "./intro.jpg", "./img/page-home.jpg", "./img/page-training.jpg", "./img/page-workout.jpg", "./img/page-warmup.jpg", "./img/page-food.jpg", "./img/page-coach.jpg", "./img/page-progress.jpg", "./img/page-profile.jpg",
               /* The design's typefaces. Precached because the app draws its whole
                  identity from them — offline without the fonts falls back to system
                  type. (The icons are drawn from the stylesheet itself now, so there
                  is nothing of theirs to fetch.) */
               "./fonts/manrope-latin.woff2", "./fonts/outfit-latin.woff2",
               "./fonts/alexandria-arabic.woff2", "./fonts/readex-pro-arabic.woff2",
               "./img/split-ap.jpg", "./img/split-arnold.jpg", "./img/split-ppl.jpg",
               "./img/split-ul.jpg", "./img/split-fb.jpg", "./img/split-bw.jpg", "./img/rest-swirl.jpg",
               "./img/split-bro.jpg", "./img/split-sl5.jpg", "./img/split-db.jpg", "./img/split-glute.jpg",
               "./img/split-ppl3.jpg", "./img/split-foot.jpg", "./img/split-fl.jpg",
               /* Every module is required for the app to run at all, unlike an
                  image, so all of them are precached. */
               "./js/util.js", "./js/units.js", "./js/db.js", "./js/scan.js", "./js/data/exercises.js", "./js/data/splits.js", "./js/engine/plan.js", "./js/state.js", "./js/engine/formulas.js", "./js/engine/nutrition.js", "./js/i18n/dict.js", "./js/knowledge/cues.js", "./js/knowledge/acute-variables.js", "./js/knowledge/nutrition-principles.js", "./js/knowledge/scope.js", "./js/engine/kb.js", "./js/engine/logfix.js", "./js/engine/kbsearch.js", "./js/engine/recovery.js", "./js/coach/recovery.js", "./js/engine/missed.js", "./js/coach/missed.js", "./js/engine/stress.js", "./js/coach/recap.js", "./js/engine/build.js", "./js/engine/conditions.js", "./js/engine/corrective.js", "./js/engine/phase.js", "./js/engine/zones.js", "./js/engine/barriers.js", "./js/knowledge/conditions.js", "./js/engine/habits.js", "./js/engine/checkin.js", "./js/coach/checkin.js", "./js/ui/checkin.js", "./js/engine/faq.js", "./js/data/faq.js", "./js/data/faq-fuel.js", "./js/coach/commands.js", "./js/coach/safety.js", "./js/coach/understand.js", "./js/knowledge/adherence.js", "./js/knowledge/anatomy.js", "./js/knowledge/assessments.js", "./js/knowledge/balance.js", "./js/knowledge/cardio.js", "./js/knowledge/core.js", "./js/knowledge/corrective.js", "./js/knowledge/epidemiology.js", "./js/knowledge/glossary.js", "./js/knowledge/general.js", "./js/coach/guard.js", "./js/knowledge/imbalances.js", "./js/knowledge/modalities.js", "./js/knowledge/phases.js", "./js/knowledge/plyometrics.js", "./js/knowledge/saq.js", "./js/coach/context.js", "./js/coach/reconcile.js", "./js/ui/agent.js", "./js/ui/handlers/actions.js", "./js/i18n/exnames.js", "./js/ui/view.js", "./js/ui/views/home.js", "./js/ui/views/train.js", "./js/ui/views/session.js", "./js/ui/views/finish.js", "./js/ui/views/progress.js", "./js/ui/views/food.js", "./js/ui/views/profile.js", "./js/ui/sheets.js", "./js/ui/render.js", "./js/ui/nav.js", "./js/ui/sheetdrag.js", "./js/ui/patch.js", "./js/ui/motion.js", "./js/ui/datebar.js", "./js/engine/text.js", "./js/ui/actions.js", "./js/app.js",
               /* Progress, its stats and photos, and the add-food sheet: modules like the
                  rest, so the app cannot start offline without them. */
               "./js/engine/stats.js", "./js/photostore.js", "./js/ui/photos.js", "./js/ui/views/addfood.js",
               "./js/ui/dock.js", "./js/data/activities.js", "./js/ui/reorder.js", "./js/ui/workout.js", "./js/engine/schedule.js", "./js/data/extra.js", "./js/ui/wbar.js", "./js/ui/art.js", "./js/ui/cover.js", "./js/ui/handlers/registry.js", "./js/ui/crashnote.js", "./js/version.js", "./js/data/parts.js", "./js/ui/edgeback.js", "./js/coach/monthly.js", "./js/engine/monthly.js", "./js/ui/handlers/common.js", "./js/ui/handlers/fields.js", "./js/ui/handlers/shell.js", "./js/ui/handlers/train.js", "./js/ui/handlers/session.js", "./js/ui/handlers/food.js", "./js/ui/handlers/coach.js", "./js/ui/handlers/progress.js", "./js/ui/handlers/profile.js", "./js/i18n/bidi.js",
               "./js/engine/meals.js", "./js/engine/planparse.js", "./js/ui/theme.js", "./js/ui/exswipe.js", "./js/ui/scrub.js", "./js/ui/press.js", "./js/ui/hold.js", "./js/ui/more.js", "./js/ui/dose.js", "./js/ui/views/timport.js", "./js/ui/views/warmup.js", "./js/engine/splitparse.js", "./js/engine/warmup.js", "./js/engine/volume.js", "./js/engine/mealplan.js", "./js/engine/plancheck.js", "./js/engine/coachinfo.js", "./js/engine/head.js", "./js/coach/util.js", "./js/coach/landmarks.js", "./js/coach/volume.js", "./js/coach/fatigue.js", "./js/coach/strength.js", "./js/coach/autoreg.js", "./js/coach/weakpoints.js", "./js/coach/insights.js", "./js/coach/percentile.js", "./js/coach/powerlifting.js", "./js/ui/views/pcheck.js", "./js/ui/views/coach.js", "./js/ui/views/chat.js", "./js/ui/answers/kit.js", "./js/ui/answers/answers.js", "./js/ui/answers/ans-core.js", "./js/ui/answers/ans-checkin.js", "./js/ui/answers/ans-training.js", "./js/ui/answers/ans-food.js", "./js/ui/answers/ans-know.js", "./js/ui/answers/ans-report.js", "./js/ui/answers/ans-named.js", "./js/ui/answers/route.js", "./js/ui/answers/route-core.js", "./js/ui/answers/route-limits.js", "./js/ui/answers/route-live.js", "./js/ui/answers/route-read.js", "./js/ui/answers/route-follow.js", "./js/ui/answers/route-ask.js", "./js/coach/intent.js", "./js/engine/dayplan.js", "./js/engine/share.js", "./js/engine/planshare.js", "./js/ui/facts.js", "./js/ui/coachwords.js", "./js/coach/energy.js", "./js/engine/energy.js", "./js/engine/body.js", "./js/engine/retarget.js", "./js/engine/intake.js", "./js/engine/lifts.js", "./js/engine/figures.js", "./js/engine/needs.js", "./js/engine/dayfuel.js", "./js/i18n/ar.js", "./js/ui/chatload.js", "./js/ui/liveread.js", "./js/ui/ask.js", "./js/ui/fig3d.js", "./js/data/mannequin/approved.js", "./js/ui/bodyneeds.js", "./js/engine/run.js", "./js/ui/run.js", "./js/ui/runmap.js", "./js/ui/chatmotion.js", "./js/ui/tour.js", "./js/data/poses.js", "./js/data/bodymap.js", "./js/data/acticons.js", "./js/data/foodicons.js", "./js/data/figures.js", "./js/ui/glyphs.js", "./js/ui/haptic.js", "./js/ui/settings.js", "./js/engine/blocks.js", "./js/coach/block.js", "./js/data/movement.js", "./js/schema.js", "./js/data/goals.js", "./js/ui/views/assess.js", "./js/ui/bgart.js", "./js/ui/transit.js", "./js/ui/keypad.js", "./js/ui/sky.js", "./js/ui/simple.js", "./js/engine/feat.js", "./js/engine/sun.js", "./js/data/tzplaces.js", "./js/ui/keyboard.js", "./js/engine/inbody.js", "./js/ui/smartcoach.js", "./js/engine/smart.js", "./js/engine/llm.js", "./js/engine/ocr.js",
               /* The live 3D figure: the body's mesh (about 480 KB), its skeleton, the
                  poses, the equipment and the renderer, so it moves offline too. */
               "./js/data/mannequin/geom.js", "./js/data/mannequin/rig.js", "./js/data/mannequin/roles.js", "./js/data/mannequin/kit.js",
               "./js/data/mannequin/motion.js", "./js/data/mannequin/capsules.js", "./js/data/mannequin/records.js", "./js/data/mannequin/skin.js",
               "./js/data/mannequin/body.js", "./js/data/mannequin/mesh.js", "./js/data/mannequin/moves.js", "./img/fig/body.bin",
               "./js/ui/mannequin.js", "./js/ui/coachfab.js", "./js/ui/chatgest.js",
               /* Reading a plan from a PDF works offline: the reader and Mozilla's pdf.js
                  (about 1.8 MB) are precached with everything else. */
               "./js/engine/pdfplan.js", "./js/vendor/pdfjs/pdf.min.mjs", "./js/vendor/pdfjs/pdf.worker.min.mjs"];

self.addEventListener("install", e => {
  /* Added one at a time on purpose. addAll() rejects the whole install if a single
     file 404s, which would leave the app with no offline cache at all. */
  e.waitUntil(
    caches.open(CACHE)
      /* cache:"reload" skips the browser's HTTP cache, which would otherwise hand a
         just-released worker the previous release's files for a few minutes. */
      .then(c => Promise.all(FILES.map(f => c.add(new Request(f, {cache: "reload"})).then(() => 0, () => 1))))
      /* An update must be whole: a launch is served from this cache alone (appFetch), so
         a file missing from it would come from the network, perhaps from a later
         release, and the two would not fit (owner, 25 Nov: a blank screen after the
         intro). An update with a hole fails, and the release in use stays until the next
         try. A first install keeps what it got: something is better than nothing. */
      .then(miss => { if (self.registration.active && miss.some(Boolean)) throw new Error("incomplete release"); })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      /* Only this app's old releases. The smart coach's model (WebLLM's own "webllm/…"
         caches) and its library ("bunyan-llm") are hundreds of megabytes the person chose
         to download, and the photo reader's files ("bunyan-ocr") are fetched once: an
         update must not throw them away. */
      .then(keys => Promise.all(keys.filter(k => k !== CACHE && /^bunyan-v\d+$/.test(k)).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", e => {
  if (e.data === "skipWaiting") self.skipWaiting();
});

/* Cache first, from this worker's own cache (owner, 25 Nov: "the start of the app is very
   slow"). The cache is one release, written whole at install (bunyan-v<VERSION>, every
   file in FILES), so what it holds is exactly the files of this worker's version: there
   is nothing to check with the network on a launch. Before, every script went to the
   network first (no-cache, a round trip each) and the cache was used only when that
   failed or the page itself took 3 s: on a phone's connection, 190 modules in waves of
   imports, seconds before the first screen. It also kept a launch from mixing two
   releases (the page from the network, a module from the cache), the old cause of a
   launch that drew nothing (index.html, the boot guard).
   A new version is fetched in the background (js/app.js reg.update: a new worker installs
   its own cache) and opens the next time the app is come back to, as before. A file
   this cache does not hold (a first visit before the install has finished, a page of
   tools/) comes from the network, and is kept. */
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
/* The app's own page: "/" or index.html, with or without a query or a hash. */
function isShell(url) { return /\/(index\.html)?$/.test(url.pathname); }
function appFetch(req) {
  const url = new URL(req.url);
  return caches.open(CACHE).then(c => c.match(req, {ignoreSearch: req.mode === "navigate"}).then(hit => {
    if (hit) return hit;
    if (req.mode === "navigate" && isShell(url))
      return c.match("./index.html").then(h => h || fresh(req));
    return fresh(req).catch(() => req.mode === "navigate" ? c.match("./index.html").then(h => h || Response.error()) : Response.error());
  }));
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  const own = url.origin === self.location.origin;

  /* The smart coach's library and its worker (js/vendor/web-llm*.js): loaded only once it
     is switched on, then kept across releases in a cache of their own, so the coach works
     offline after an update. Cache first; the file is versioned in its name's header. */
  if (own && /\/js\/vendor\/web-llm[^/]*\.js$/.test(url.pathname)) {
    e.respondWith(caches.open("bunyan-llm").then(c => c.match(req).then(hit => hit || fetch(req).then(res => {
      if (res && res.status === 200) c.put(req, res.clone());
      return res;}))));
    return;
  }
  /* The photo reader (js/vendor/ocr/: its library, worker, core and language data):
     fetched the first time a photo is read, then kept across releases, cache first. */
  if (own && /\/js\/vendor\/ocr\/[^/]+$/.test(url.pathname)) {
    e.respondWith(caches.open("bunyan-ocr").then(c => c.match(req).then(hit => hit || fetch(req).then(res => {
      if (res && res.status === 200) c.put(req, res.clone());
      return res;}))));
    return;
  }
  const isApp = req.mode === "navigate" ||
                (own && /(\/|\.html|\.js|\.json|\.webmanifest)$/.test(url.pathname));

  if (isApp) {
    /* Cache first: this worker's release, whole (appFetch). The page and its modules
       always come from the same release (the PR #5 bug). */
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
