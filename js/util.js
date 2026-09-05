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

/* wr() used to call toast() directly, which made the lowest-level module depend on
   the UI. The handler is injected by app.js instead, so util imports nothing. */
var onStorageError=function(){};
function setStorageErrorHandler(f){onStorageError=f;}

export {esc, MEM, num, PERSIST, pretty, r1, rd, setStorageErrorHandler, shortd, today, uid, wr};
