/* Bunyan — live tracking: a run, a walk, a ride or a hike
   An outdoor session tracked live, after the reference the owner chose: the route drawn
   as it grows on a dark ground, the time large, the distance under it, and calories and
   pace (or speed, for a ride) either side of one round pause button. It is reached from
   "Log cardio or a sport" only, by picking an outdoor activity (Running, Walking,
   Cycling, Hiking, a trail run: js/data/activities.js OUTDOOR), and each is its own: its
   name and icon, pace or speed, its calories, the fastest it can go before a jump in the
   GPS is ignored, and the ground under the route (a city for a run, a park for a walk,
   the countryside for a ride, hills for a hike: js/ui/runmap.js). Finishing saves it as
   that activity, the same kind of entry the logger makes, so Progress and the coach read
   it with everything else.

   Free and offline: the distance comes from the phone's own GPS (the Geolocation API),
   and the route is drawn from those points. There is no map underneath, because map
   tiles would need a service; the ground is drawn here. The arithmetic is
   js/engine/run.js's.

   The honest limits, said on the screen: a phone stops reporting its position to a web
   app when the screen is off or the app is in the background, so the screen is kept
   awake, and time keeps counting either way. Without location (refused, or none), the
   session is timed only, and finishing opens the activity logger with the minutes
   filled in so the distance can be typed.

   S.run is the session in progress, saved with the profile: closing the app midway and
   opening it again finds it still going, and watching resumes. One saved before there
   was a choice of activity is a run. */
import {t} from "../i18n/dict.js";
import {addFix, kmMarks, newRun, outdoorKcal, paceOf, pauseRun, resumeRun, routePath, routeXY, runMs, speedOf, thin} from "../engine/run.js";
import {actIcon, outdoorOf} from "../data/activities.js";
import {outdoorName} from "../i18n/exnames.js";
import {groundFor, mapSeed} from "./runmap.js";
import {lastWeight} from "../engine/formulas.js";
import {S, saveDB} from "../state.js";
import {esc, fmtN} from "../util.js";
import {finishSession, startActivity} from "./actions.js";
import {glyph} from "./glyphs.js";
import {keepAwake, toast, V} from "./view.js";

var W=340,H=300,PAD=28;
var watchId=null;

/* ---- the clock and the phone's position ------------------------------------------ */
/* The session's activity and its settings: a run when it says nothing. */
function actOf(r){return r&&outdoorOf(r.act)?r.act:"Running";}
function cfg(r){return outdoorOf(actOf(r));}
function startRun(act){
  if(S.active||S.run)return;
  S.run=newRun(Date.now(),outdoorOf(act)?act:"Running");S.run.gps="wait";
  keepAwake(true);watch();saveDB();}
/* Called after every render: a run opened again after the app was closed starts
   watching again. */
function ensureRunWatch(){if(S.run&&S.run.since!=null)watch();else stopWatch();}
function watch(){
  if(watchId!=null||!S.run)return;
  if(!("geolocation" in navigator)){S.run.gps="off";return;}
  try{watchId=navigator.geolocation.watchPosition(onFix,onErr,{enableHighAccuracy:true,maximumAge:2000,timeout:30000});}
  catch(e){S.run.gps="off";}}
function stopWatch(){
  if(watchId==null)return;
  try{navigator.geolocation.clearWatch(watchId);}catch(e){}
  watchId=null;}
function onFix(pos){
  if(!S.run)return;
  var c=pos.coords||{},res=addFix(S.run,{lat:c.latitude,lon:c.longitude,acc:c.accuracy,t:pos.timestamp||Date.now()},cfg(S.run).top);
  var was=S.run.gps;S.run.gps=c.accuracy<=35?"on":"weak";
  if(res==="kept"){saveDB();paintRoute();}
  if(was!==S.run.gps)paintGps();
  paintRun();}
function onErr(e){
  if(!S.run)return;
  /* 1 is "permission denied": it will not come back by waiting. Anything else (no fix
     yet, a timeout) may. */
  S.run.gps=e&&e.code===1?"denied":"weak";
  if(e&&e.code===1)stopWatch();
  paintGps();}

/* ---- pause, finish, throw away ---------------------------------------------------- */
function pauseIt(){if(!S.run)return;pauseRun(S.run,Date.now());stopWatch();saveDB();}
function resumeIt(){if(!S.run)return;resumeRun(S.run,Date.now());watch();saveDB();}
function discardRun(){stopWatch();S.run=null;keepAwake(false);saveDB();}
/* Saved as its activity (a Running, Walking, Cycling… entry). With a distance it is
   logged and finished at once and the session summary follows; without one, the
   logger opens with the time filled in, for the distance to be typed. render is passed
   in: the caller's. */
function finishRun(render){
  var r=S.run;if(!r)return;
  var now=Date.now(),act=actOf(r);pauseRun(r,now);stopWatch();
  var ms=runMs(r,now),m=r.dist,mins=Math.max(1,Math.round(ms/60000));
  S.run=null;
  startActivity(act);
  if(!S.active)return;
  if(m>=50){
    S.active.entries[0].sets.push({w:0,r:0,min:mins,km:Math.round(m/10)/100,rpe:6,kcal:outdoorKcal(act,m,ms,lastWeight()),
      gps:1,map:mapSeed(r),route:thin(r.pts,120).map(function(p){return [p[0],p[1]];})});
    finishSession();}
  else{V.draft.min=mins;V.draft.km=0;saveDB();render();
    toast(t("No distance from the GPS. Type it in, then log it."));}}

/* ---- the screen -------------------------------------------------------------------- */
function gpsWord(g){
  return t(g==="on"?"GPS on":g==="weak"?"Weak GPS signal":g==="denied"?"Location is off":g==="off"?"No GPS on this device":"Finding GPS…");}
/* Pace for a run, a walk or a hike; speed for a ride. */
function rate(r,ms){var o=cfg(r);return o.read==="speed"?speedOf(ms,r.dist):paceOf(ms,r.dist);}
function vRun(){
  var r=S.run,o=cfg(r),act=actOf(r),going=r.since!=null,ms=runMs(r,Date.now()),spd=o.read==="speed";
  /* Always the dark side of the theme, as the reference is: data-theme on the screen
     itself, so the theme blocks colour it dark whatever the mode. */
  var h='<div class="run'+(going?'':' paused')+'" data-theme="dark" data-act="'+esc(act)+'">'
   +'<div class="run-top"><button class="run-x" data-run="leave" aria-label="'+esc(t("End or leave"))+'">'
   +'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>'
   +'<span class="run-h">'+esc(outdoorName(act,true))+'</span>'
   +'<span class="run-gps '+esc(r.gps||"wait")+'" id="runGps" role="status">'+esc(gpsWord(r.gps))+'</span></div>'
   +'<div class="run-map" aria-hidden="true">'+mapSvg(r)+'</div>'
   +'<div class="run-big"><b class="num" id="runT" dir="ltr">'+clock(ms)+'</b><span>'+esc(t(going?"Total duration":"Paused"))+'</span></div>'
   +'<div class="run-mid"><span class="run-pin">'+actIcon(act,22)+'</span><b class="num" id="runD" dir="ltr">'+km(r.dist)+'</b><span>'+esc(t("km"))+'</span></div>'
   +'<div class="run-bar">'
   +'<div class="run-pill"><span class="run-pi">'+glyph("flame")+'</span><span class="run-pt"><span>'+esc(t("Kcal"))+'</span>'
   +'<b class="num" id="runK">'+fmtN(outdoorKcal(act,r.dist,ms,lastWeight()))+'</b></span></div>'
   +'<button class="run-play" data-run="'+(going?"pause":"resume")+'" aria-label="'+esc(t(going?"Pause":"Carry on"))+'">'
   +(going?'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg>':'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15L19.5 12z"/></svg>')+'</button>'
   +'<div class="run-pill"><span class="run-pi">'+glyph(spd?"route":"clock")+'</span><span class="run-pt"><span>'+esc(t(spd?"Speed km/h":"Pace /km"))+'</span>'
   +'<b class="num" id="runP" dir="ltr">'+(rate(r,ms)||"—")+'</b></span></div></div>'
   +'<button class="btn run-end" data-run="finish">'+esc(t("Finish and save"))+'</button>'
   +'<p class="run-note">'+esc(t(r.gps==="denied"||r.gps==="off"?"Without location this is timed only. Add the distance when you finish."
      :"Keep the screen on: a phone stops sharing its position with an app in the background. The time keeps counting."))+'</p>'
   +'</div>';
  return h;}
/* The ground (js/ui/runmap.js: drawn, not fetched, its kind the activity's) and the route on it: a
   glow under it, the line, and a bright thread down its middle; a mark at each whole
   kilometre; the start ringed, where you are now a dot with a ring that breathes. */
function mapSvg(r){
  var d=routePath(r.pts,W,H,PAD),ends=endsOf(r.pts);
  return '<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="xMidYMid slice">'+groundFor(cfg(r).ground,W,H,mapSeed(r))
   +'<path class="rt-glow" id="runRouteG" d="'+d+'"/><path class="rt" id="runRoute" d="'+d+'"/><path class="rt-hi" id="runRouteH" d="'+d+'"/>'
   +'<g id="runKm">'+kmSvg(r.pts)+'</g>'
   +'<circle class="st" id="runStart" r="6" cx="'+(ends?ends[0]:-20)+'" cy="'+(ends?ends[1]:-20)+'"/>'
   +'<circle class="now-r" id="runNowR" r="14" cx="'+(ends?ends[2]:W/2)+'" cy="'+(ends?ends[3]:H/2)+'"/>'
   +'<circle class="now" id="runNow" r="6" cx="'+(ends?ends[2]:W/2)+'" cy="'+(ends?ends[3]:H/2)+'"/></svg>';}
function kmSvg(pts){
  return kmMarks(pts,W,H,PAD).map(function(m){
    return '<g class="km" transform="translate('+m.x+' '+m.y+')"><circle r="8.5"/><text dy="3.2">'+m.km+'</text></g>';}).join("");}
function endsOf(pts){
  var xy=routeXY(pts,W,H,PAD);if(xy.length<2)return null;
  return [xy[0][0],xy[0][1],xy[xy.length-1][0],xy[xy.length-1][1]];}

function clock(ms){
  var s=Math.floor(ms/1000),hh=Math.floor(s/3600),mm=Math.floor(s%3600/60),ss=s%60;
  return (hh?hh+":"+String(mm).padStart(2,"0"):String(mm).padStart(2,"0"))+":"+String(ss).padStart(2,"0");}
function km(m){return (Math.floor(m/10)/100).toFixed(2);}

/* Every second, the numbers only; the route when a point is added. */
function paintRun(){
  var r=S.run;if(!r)return;
  var ms=runMs(r,Date.now()),set=function(id,v){var el=document.getElementById(id);if(el&&el.textContent!==v)el.textContent=v;};
  set("runT",clock(ms));set("runD",km(r.dist));set("runP",rate(r,ms)||"—");set("runK",fmtN(outdoorKcal(actOf(r),r.dist,ms,lastWeight())));}
function paintRoute(){
  var r=S.run;if(!r)return;
  var d=routePath(r.pts,W,H,PAD),e=endsOf(r.pts);
  ["runRoute","runRouteG","runRouteH"].forEach(function(id){var el=document.getElementById(id);if(el)el.setAttribute("d",d);});
  var km=document.getElementById("runKm");if(km)km.innerHTML=kmSvg(r.pts);
  if(!e)return;
  [["runStart",0,1],["runNow",2,3],["runNowR",2,3]].forEach(function(x){
    var el=document.getElementById(x[0]);if(el){el.setAttribute("cx",e[x[1]]);el.setAttribute("cy",e[x[2]]);}});}
function paintGps(){
  var el=document.getElementById("runGps");if(!el||!S.run)return;
  el.className="run-gps "+(S.run.gps||"wait");el.textContent=gpsWord(S.run.gps);}

export {discardRun, ensureRunWatch, finishRun, paintRun, pauseIt, resumeIt, startRun, vRun};
