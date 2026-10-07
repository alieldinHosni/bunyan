/* Bunyan — the layer rules, enforced.
   Reads every module's imports and fails when one crosses a line it shouldn't. Each rule
   is a bug that already happened here, or a door it would open:

     coach   js/coach/           pure coaching: imports only itself; no DOM, storage or network
     core    util, db, photostore, scan, state, units
     data    js/data/            the libraries: imports only data and util
     i18n    js/i18n/            words: data, state and util at most
     engine  js/engine/          the app's logic: never the UI or app.js
     ui      js/ui/ and js/ui/views/
     app     js/app.js           boot and wiring: nothing imports it, and it answers no tap itself
             (taps are answered in js/ui/handlers/, one module per domain)
     vendor  js/vendor/          third-party code as shipped (pdf.js), for the engine only

   A view may use another view only to show it (Coach shows the planning screens,
   Training shows the logger): the list below. Logic two views need lives in the
   engine, or in a shared ui module (facts.js, coachwords.js), never in a view.
   No import cycles outside the UI. Every import names a file that exists. Every module
   the app loads is precached for offline.

     node tests/architecture.mjs */
import fs from "fs";
import path from "path";

const ROOT = new URL("..", import.meta.url).pathname;
const rel = f => path.relative(ROOT, f).split(path.sep).join("/");

function walk(d){
  return fs.readdirSync(d, {withFileTypes: true}).flatMap(e => {
    const p = path.join(d, e.name);
    if (e.isDirectory()) return /^(vendor|test)$/.test(e.name) ? [] : walk(p);
    return p.endsWith(".js") ? [p] : [];});}

const files = walk(path.join(ROOT, "js")).map(rel);
const CORE = new Set(["js/util.js", "js/db.js", "js/photostore.js", "js/scan.js", "js/state.js", "js/units.js"]);
function layer(f){
  if (f === "js/app.js") return "app";
  if (CORE.has(f)) return "core";
  if (f.startsWith("js/coach/")) return "coach";
  if (f.startsWith("js/data/")) return "data";
  if (f.startsWith("js/i18n/")) return "i18n";
  if (f.startsWith("js/engine/")) return "engine";
  if (f.startsWith("js/ui/views/")) return "view";
  if (f.startsWith("js/ui/")) return "ui";
  if (f.startsWith("js/vendor/")) return "vendor";
  return "other";}

/* Who may import whom. A layer not listed for an importer is a violation. */
const MAY = {
  coach:  ["coach"],
  data:   ["data", "core:util"],
  i18n:   ["i18n", "data", "core"],
  core:   ["core", "data", "i18n"],
  engine: ["engine", "coach", "data", "i18n", "core", "vendor"],
  ui:     ["ui", "view", "engine", "coach", "data", "i18n", "core"],
  view:   ["ui", "view", "engine", "coach", "data", "i18n", "core"],
  app:    ["ui", "view", "engine", "coach", "data", "i18n", "core"]};
/* Core modules, one by one: state may read the libraries (for templates) but nothing
   above them; units and words read state. */
const CORE_MAY = {
  "js/util.js": [], "js/db.js": [], "js/photostore.js": [], "js/scan.js": [],
  "js/state.js": ["js/util.js", "js/db.js", "js/photostore.js", "data"],
  "js/units.js": ["js/util.js", "js/state.js", "i18n"]};
/* A view showing another view: the whole list. */
const EMBEDS = {
  "coach.js":   ["train.js", "food.js", "pcheck.js", "chat.js"],
  "train.js":   ["session.js", "timport.js", "home.js"],
  "food.js":    ["addfood.js", "progress.js"],
  "session.js": ["warmup.js"]};

const graph = {}, bad = [];
for (const f of files){
  const src = fs.readFileSync(path.join(ROOT, f), "utf8");
  graph[f] = [];
  for (const m of src.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|^\s*import\s*)["']([^"']+)["']/gm)){
    const spec = m[1];
    if (!spec.startsWith(".")) continue;
    const to = rel(path.resolve(path.dirname(path.join(ROOT, f)), spec));
    graph[f].push(to);
    /* A path is relative to the module that names it: code moved to another folder
       keeps working only if its imports move with it, dynamic ones included. */
    if (!fs.existsSync(path.join(ROOT, to))){bad.push(`${f} imports ${spec}, which is not a file (${to})`); continue;}
    const A = layer(f), B = layer(to);
    if (to === "js/app.js"){bad.push(`${f} imports app.js: nothing may`); continue;}
    if (A === "core"){
      const ok = (CORE_MAY[f] || []).some(x => x === to || x === B);
      if (!ok) bad.push(`${f} (core) imports ${to} (${B})`);
      continue;}
    const allowed = MAY[A] || [];
    const ok = allowed.includes(B) || allowed.includes(B + ":" + path.basename(to, ".js"));
    if (!ok) bad.push(`${f} (${A}) imports ${to} (${B})`);
    if (A === "view" && B === "view"){
      const from = path.basename(f), into = path.basename(to);
      if (!(EMBEDS[from] || []).includes(into))
        bad.push(`${f} takes from the view ${into}: move what it needs to engine/ or a shared ui module, or list it in EMBEDS if it shows that screen`);}}
  if (layer(f) === "coach" && /\b(document|window|localStorage|sessionStorage|indexedDB|fetch|XMLHttpRequest|navigator)\b\s*[.(]/.test(src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "")))
    bad.push(`${f} (coach) touches the DOM, storage or the network`);}

/* app.js is boot and wiring. Taps are answered in js/ui/handlers/, one module per
   domain, registered by app.js at boot; those modules do not import each other (only
   the registry and the helpers they share), so the order their branches are tried in
   is written in one place, app.js. */
{
  const app = fs.readFileSync(path.join(ROOT, "js/app.js"), "utf8");
  if (/\bif\s*\(\s*D\.[A-Za-z]/.test(app)) bad.push("js/app.js answers a tap itself: tap branches belong in js/ui/handlers/");
  for (const f of files.filter(f => f.startsWith("js/ui/handlers/")))
    for (const to of graph[f])
      if (to.startsWith("js/ui/handlers/") && !/\/(registry|common)\.js$/.test(to))
        bad.push(`${f} imports ${to}: handler modules share code through common.js only`);
}

/* Cycles: strongly connected groups of more than one module, unless all of it is UI. */
let n = 0; const st = [], on = new Set(), ix = {}, low = {}, cycles = [];
function visit(v){
  ix[v] = low[v] = n++; st.push(v); on.add(v);
  for (const w of graph[v] || []){
    if (!(w in graph)) continue;
    if (!(w in ix)){visit(w); low[v] = Math.min(low[v], low[w]);}
    else if (on.has(w)) low[v] = Math.min(low[v], ix[w]);}
  if (low[v] === ix[v]){
    const c = []; let w;
    do {w = st.pop(); on.delete(w); c.push(w);} while (w !== v);
    if (c.length > 1) cycles.push(c);}}
for (const f of files) if (!(f in ix)) visit(f);
for (const c of cycles)
  if (!c.every(f => ["ui", "view"].includes(layer(f))))
    bad.push("import cycle below the UI: " + c.sort().join(" → "));

/* Offline: every module the app can load is in the service worker's precache, or the
   installed app cannot start without the network. */
const sw = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8");
const cached = new Set([...sw.matchAll(/"\.\/([^"]+)"/g)].map(m => m[1]));
const reach = new Set(), todo = ["js/app.js"];
while (todo.length){const f = todo.pop(); if (reach.has(f) || !(f in graph)) continue; reach.add(f); todo.push(...graph[f]);}
for (const f of [...reach].sort()) if (!cached.has(f)) bad.push(`${f} is loaded by the app but not precached in sw.js: the app would not start offline`);

const edges = Object.values(graph).reduce((a, x) => a + x.length, 0);
for (const b of bad) console.log("FAIL " + b);
console.log(`\n${files.length} modules, ${edges} imports: ${bad.length ? bad.length + " broken rules" : "every layer rule holds"}`);
process.exit(bad.length ? 1 : 0);
