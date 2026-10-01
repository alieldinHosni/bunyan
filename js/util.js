/* Bunyan — util
   Pure helpers: storage primitives, ids, dates, escaping, numbers. Depends on nothing. */

"use strict";
/* ============================================================ storage */
var MEM={},PERSIST=true;
try{localStorage.setItem("_t","1");localStorage.removeItem("_t");}catch(e){PERSIST=false;}
function rd(k,f){try{var v=PERSIST?localStorage.getItem(k):MEM[k];return v?JSON.parse(v):f;}catch(e){return f;}}
/* The stored string as it is, unparsed — so a blob that no longer parses can be kept
   aside instead of being overwritten by defaults. */
function rdRaw(k){try{return PERSIST?localStorage.getItem(k):(MEM[k]||null);}catch(e){return null;}}
function wrRaw(k,s){try{if(PERSIST)localStorage.setItem(k,s);else MEM[k]=s;return true;}catch(e){return false;}}
function wr(k,v){try{var s=JSON.stringify(v);if(PERSIST)localStorage.setItem(k,s);else MEM[k]=s;}catch(e){onStorageError("Storage is full. Export a backup and clear old data.");}}
function uid(){return Math.random().toString(36).slice(2,9);}
function today(){var d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*6e4).toISOString().slice(0,10);}
/* Dates are written in the app's language, not the browser's. Every call site passed
   undefined, which meant the phone's locale: an English phone showed "Thursday, Oct 1"
   inside the Arabic interface, and an Arabic phone showed Arabic-Indic digits inside
   the English one. Arabic is ar-EG with Latin digits, because every other figure in the
   app is written in Latin digits. applyLang() calls setLang on every render. */
var LOC;
function setLang(l){LOC=l==="ar"?"ar-EG-u-nu-latn":undefined;}
function dfmt(d,o){return d.toLocaleDateString(LOC,o);}
function pretty(iso){return dfmt(new Date(iso+"T00:00:00"),{weekday:"short",day:"numeric",month:"short"});}
function shortd(iso){return dfmt(new Date(iso+"T00:00:00"),{day:"numeric",month:"short"});}
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
function num(v,d){v=parseFloat(v);return isFinite(v)?v:(d||0);}
function r1(v){return Math.round(v*10)/10;}
/* One place that decides how a displayed number is grouped.

   Before this, four call sites used toLocaleString() and every other one interpolated
   the raw value, so the same quantity was written two ways on one screen: Progress
   showed 5724 and 5,724, and the Food tab showed a day's intake as "2,450 / 1950"
   because the left half was counted by countTo (which groups) and the right half was
   not. countTo now delegates here, so the animated value and the static value cannot
   disagree.

   Use it for totals a user accumulates - volume, calories, steps. Do NOT use it for
   years, an <input type="number"> value, or anything parsed back as a number: the
   separator is locale-dependent and would corrupt it. Values under 1000 are unchanged,
   which is why per-100g figures and rep counts can be left alone either way. */
/* Grouped with a comma in every language. The browser's own locale would group with a
   full stop on a German phone (beside decimals written with a point) and switch to
   Arabic-Indic digits on an Arabic one. */
function fmtN(v){v=Math.round(num(v,0));return v.toLocaleString("en-US");}

/* wr() used to call toast() directly, which made the lowest-level module depend on
   the UI. The handler is injected by app.js instead, so util imports nothing. */
var onStorageError=function(){};
function setStorageErrorHandler(f){onStorageError=f;}

export {dfmt, esc, fmtN, MEM, num, PERSIST, pretty, r1, rd, rdRaw, wrRaw, setLang, setStorageErrorHandler, shortd, today, uid, wr};
