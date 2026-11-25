/* Bunyan — the release this is
   The same number as sw.js's cache (bunyan-vN), shown under Profile and in About so a
   phone can be checked for an update. tests/architecture.mjs keeps the two equal: bump
   both together.
   Shown as major.minor (owner, 25 Nov: "instead of V314 … 3.14, next V3.15"): 320 is
   3.20, 321 is 3.21. The whole number stays the release's id (the cache, crash notes,
   exports); only what a person reads is the dotted name. */
var VERSION=322;
function versionName(v){v=+v||VERSION;var m=v%100;return Math.floor(v/100)+"."+(m<10?"0":"")+m;}
export {VERSION, versionName};
