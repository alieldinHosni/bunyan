/* Bunyan — running mode
   A run tracked live, after the reference the owner chose: the route drawn as it grows
   on a dark ground, the time large, the distance under it, and calories and pace either
   side of one round pause button. Finishing saves it as a Running activity, the same
   kind of entry "Log cardio or a sport" makes, so Progress and the coach read it with
   everything else.

   Free and offline: the distance comes from the phone's own GPS (the Geolocation API),
   and the route is drawn from those points. There is no map underneath, because map
   tiles would need a service; the ground is a quiet grid. The arithmetic is
   js/engine/run.js's.

   The honest limits, said on the screen: a phone stops reporting its position to a web
   app when the screen is off or the app is in the background, so the screen is kept
   awake while running, and time keeps counting either way. Without location (refused,
   or none), the run is timed only, and finishing opens the activity logger with the
   minutes filled in so the distance can be typed.

   S.run is the run in progress, saved with the profile: closing the app mid-run and
   opening it again finds it still going, and watching resumes. */
import {t} from "../i18n/dict.js";
import {addFix, newRun, paceOf, pauseRun, resumeRun, routePath, runKcal, runMs, thin} from "../engine/run.js";
import {lastWeight} from "../engine/formulas.js";
import {S, saveDB} from "../state.js";
import {esc, fmtN} from "../util.js";
import {finishSession, startActivity} from "./actions.js";
import {glyph} from "./glyphs.js";
import {keepAwake, toast, V} from "./view.js";

var W=340,H=300,PAD=28;
var watchId=null;

/* ---- the clock and the phone's position ------------------------------------------ */
function startRun(){
  if(S.active||S.run)return;
  S.run=newRun(Date.now());S.run.gps="wait";
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
  var c=pos.coords||{},res=addFix(S.run,{lat:c.latitude,lon:c.longitude,acc:c.accuracy,t:pos.timestamp||Date.now()});
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
/* Saved as a Running activity. With a distance it is logged and finished at once and
   the session summary follows; without one, the logger opens with the time filled in,
   for the distance to be typed. render is passed in: the caller's. */
function finishRun(render){
  var r=S.run;if(!r)return;
  var now=Date.now();pauseRun(r,now);stopWatch();
  var ms=runMs(r,now),m=r.dist,mins=Math.max(1,Math.round(ms/60000));
  S.run=null;
  startActivity("Running");
  if(!S.active)return;
  if(m>=50){
    S.active.entries[0].sets.push({w:0,r:0,min:mins,km:Math.round(m/10)/100,rpe:6,kcal:runKcal(m,ms,lastWeight()),
      gps:1,route:thin(r.pts,120).map(function(p){return [p[0],p[1]];})});
    finishSession();}
  else{V.draft.min=mins;V.draft.km=0;saveDB();render();
    toast(t("No distance from the GPS. Type it in, then log the run."));}}

/* ---- the screen -------------------------------------------------------------------- */
function gpsWord(g){
  return t(g==="on"?"GPS on":g==="weak"?"Weak GPS signal":g==="denied"?"Location is off":g==="off"?"No GPS on this device":"Finding GPS…");}
function vRun(){
  var r=S.run,going=r.since!=null,ms=runMs(r,Date.now());
  /* Always the dark side of the theme, as the reference is: data-theme on the screen
     itself, so the theme blocks colour it dark whatever the mode. */
  var h='<div class="run'+(going?'':' paused')+'" data-theme="dark">'
   +'<div class="run-top"><button class="run-x" data-run="leave" aria-label="'+esc(t("End or leave the run"))+'">'
   +'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>'
   +'<span class="run-h">'+esc(t("Running mode"))+'</span>'
   +'<span class="run-gps '+esc(r.gps||"wait")+'" id="runGps" role="status">'+esc(gpsWord(r.gps))+'</span></div>'
   +'<div class="run-map" aria-hidden="true">'+mapSvg(r)+'</div>'
   +'<div class="run-big"><b class="num" id="runT" dir="ltr">'+clock(ms)+'</b><span>'+esc(t(going?"Total duration":"Paused"))+'</span></div>'
   +'<div class="run-mid"><span class="run-pin">'+glyph("route")+'</span><b class="num" id="runD" dir="ltr">'+km(r.dist)+'</b><span>'+esc(t("km"))+'</span></div>'
   +'<div class="run-bar">'
   +'<div class="run-pill"><span class="run-pi">'+glyph("flame")+'</span><span class="run-pt"><span>'+esc(t("Kcal"))+'</span>'
   +'<b class="num" id="runK">'+fmtN(runKcal(r.dist,ms,lastWeight()))+'</b></span></div>'
   +'<button class="run-play" data-run="'+(going?"pause":"resume")+'" aria-label="'+esc(t(going?"Pause the run":"Carry on running"))+'">'
   +(going?'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg>':'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15L19.5 12z"/></svg>')+'</button>'
   +'<div class="run-pill"><span class="run-pi">'+glyph("clock")+'</span><span class="run-pt"><span>'+esc(t("Pace /km"))+'</span>'
   +'<b class="num" id="runP" dir="ltr">'+(paceOf(ms,r.dist)||"—")+'</b></span></div></div>'
   +'<button class="btn run-end" data-run="finish">'+esc(t("Finish and save"))+'</button>'
   +'<p class="run-note">'+esc(t(r.gps==="denied"||r.gps==="off"?"Without location this run is timed only. Add the distance when you finish."
      :"Keep the screen on: a phone stops sharing its position with an app in the background. The time keeps counting."))+'</p>'
   +'</div>';
  return h;}
/* The ground (a quiet grid and a few long lines, not a map) and the route on it: the
   start ringed, where you are now a dot with a ring that breathes. */
function mapSvg(r){
  var g='';
  for(var x=20;x<W;x+=40)g+='<path class="g" d="M'+x+' 0V'+H+'"/>';
  for(var y=20;y<H;y+=40)g+='<path class="g" d="M0 '+y+'H'+W+'"/>';
  g+='<path class="s" d="M-10 214C80 196 140 120 220 104S330 60 360 40M60 -10C84 80 70 180 110 320M250 -10C236 110 280 200 260 320"/>';
  var d=routePath(r.pts,W,H,PAD),ends=endsOf(d);
  return '<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="xMidYMid slice">'+g
   +'<path class="rt-glow" id="runRouteG" d="'+d+'"/><path class="rt" id="runRoute" d="'+d+'"/>'
   +'<circle class="st" id="runStart" r="6" cx="'+(ends?ends[0]:-20)+'" cy="'+(ends?ends[1]:-20)+'"/>'
   +'<circle class="now-r" id="runNowR" r="14" cx="'+(ends?ends[2]:W/2)+'" cy="'+(ends?ends[3]:H/2)+'"/>'
   +'<circle class="now" id="runNow" r="6" cx="'+(ends?ends[2]:W/2)+'" cy="'+(ends?ends[3]:H/2)+'"/></svg>';}
function endsOf(d){
  var m=d&&d.match(/[\d.]+/g);if(!m||m.length<4)return null;
  return [+m[0],+m[1],+m[m.length-2],+m[m.length-1]];}

function clock(ms){
  var s=Math.floor(ms/1000),hh=Math.floor(s/3600),mm=Math.floor(s%3600/60),ss=s%60;
  return (hh?hh+":"+String(mm).padStart(2,"0"):String(mm).padStart(2,"0"))+":"+String(ss).padStart(2,"0");}
function km(m){return (Math.floor(m/10)/100).toFixed(2);}

/* Every second, the numbers only; the route when a point is added. */
function paintRun(){
  var r=S.run;if(!r)return;
  var ms=runMs(r,Date.now()),set=function(id,v){var el=document.getElementById(id);if(el&&el.textContent!==v)el.textContent=v;};
  set("runT",clock(ms));set("runD",km(r.dist));set("runP",paceOf(ms,r.dist)||"—");set("runK",fmtN(runKcal(r.dist,ms,lastWeight())));}
function paintRoute(){
  var r=S.run;if(!r)return;
  var d=routePath(r.pts,W,H,PAD),e=endsOf(d);
  ["runRoute","runRouteG"].forEach(function(id){var el=document.getElementById(id);if(el)el.setAttribute("d",d);});
  if(!e)return;
  [["runStart",0,1],["runNow",2,3],["runNowR",2,3]].forEach(function(x){
    var el=document.getElementById(x[0]);if(el){el.setAttribute("cx",e[x[1]]);el.setAttribute("cy",e[x[2]]);}});}
function paintGps(){
  var el=document.getElementById("runGps");if(!el||!S.run)return;
  el.className="run-gps "+(S.run.gps||"wait");el.textContent=gpsWord(S.run.gps);}

export {discardRun, ensureRunWatch, finishRun, paintRun, pauseIt, resumeIt, startRun, vRun};
