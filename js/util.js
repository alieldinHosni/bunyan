/* Bunyan — util
   Pure helpers: storage primitives, ids, dates, escaping, numbers. Depends on nothing. */

"use strict";
/* ============================================================ storage */
var MEM={},PERSIST=true;
try{localStorage.setItem("_t","1");localStorage.removeItem("_t");}catch(e){PERSIST=false;}
function rd(k,f){try{var v=PERSIST?localStorage.getItem(k):MEM[k];return v?JSON.parse(v):f;}catch(e){return f;}}
function wr(k,v){try{var s=JSON.stringify(v);if(PERSIST)localStorage.setItem(k,s);else MEM[k]=s;}catch(e){onStorageError("Storage is full. Export a backup and clear old data.");}}
function uid(){return Math.random().toString(36).slice(2,9);}
function today(){var d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*6e4).toISOString().slice(0,10);}
function pretty(iso){return new Date(iso+"T00:00:00").toLocaleDateString(undefined,{weekday:"short",day:"numeric",month:"short"});}
function shortd(iso){return new Date(iso+"T00:00:00").toLocaleDateString(undefined,{day:"numeric",month:"short"});}
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
function fmtN(v){v=Math.round(num(v,0));return v.toLocaleString();}

/* wr() used to call toast() directly, which made the lowest-level module depend on
   the UI. The handler is injected by app.js instead, so util imports nothing. */
var onStorageError=function(){};
function setStorageErrorHandler(f){onStorageError=f;}

export {esc, fmtN, MEM, num, PERSIST, pretty, r1, rd, setStorageErrorHandler, shortd, today, uid, wr};
