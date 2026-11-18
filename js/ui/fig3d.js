/* Bunyan — the 3D figure, as the pages see it (WP-9).
   The figure's drawing (js/ui/mannequin.js) and its data (js/data/mannequin/*, with the
   moves table about 250 KB together) are not needed to draw a page: only to bring a figure
   to life once one is on the screen. This module is what the pages call:
   hasMannequin(name)  the exercise has a checked figure (js/data/mannequin/approved.js,
                       kept equal to records.js isChecked by an engine test)
   fig3dHtml(name, o)  its markup, the same as js/ui/mannequin.js writes; the stills show
                       until the figure is live, and wherever it cannot be
   syncFigs()          each render: once a figure is in the page, the drawing loads (once,
                       from the precache offline) and takes it from there
   js/ui/mannequin.js keeps its own fig3dHtml for the offline tools (unchecked figures). */
import {approved} from "../data/mannequin/approved.js";
import {t} from "../i18n/dict.js";
import {esc} from "../util.js";

function hasMannequin(name){return approved(name);}
var ICONS='<svg class="i-pause" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2h3v12H4zM9 2h3v12H9z"/></svg>'
  +'<svg class="i-play" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2l10 6-10 6z"/></svg>';
function fig3dHtml(name,o){
  o=o||{};
  if(!approved(name))return "";
  return '<div class="fig3d" data-mq="'+esc(name)+'" data-k="mq:'+esc(name)+'"'+(o.turn?' data-mq-turn':'')+(o.tempo&&/^[\dX]-[\dX]-[\dX]-[\dX]$/.test(String(o.tempo))?' data-mq-tempo="'+esc(String(o.tempo))+'"':'')+'>'
    +'<canvas role="img" aria-label="'+esc(o.label||name)+'"></canvas>'
    +'<div class="fig3d-still">'+(o.stills||[]).slice(0,2).map(function(src,i){
      return src?'<figure><img src="'+esc(src)+'" alt="" decoding="async"><figcaption>'+t(i?"End":"Start")+'</figcaption></figure>':"";}).join("")+'</div>'
    +(o.turn?'<span class="fig3d-tag" aria-hidden="true">'+t("Drag to turn")+'</span>':'')
    +'<button class="fig3d-play" type="button" aria-label="'+t("Pause")+'">'+ICONS+'</button></div>';}
var M=null,wait=null;
function syncFigs(){
  if(M){M.syncMannequins();return;}
  if(wait||!document.querySelector(".fig3d[data-mq]"))return;
  wait=import("./mannequin.js").then(function(m){M=m;m.syncMannequins();});}
export {fig3dHtml, hasMannequin, syncFigs};
