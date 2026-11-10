/* Bunyan — the ground's pictures under the real sky
   Owner, 10 Nov: "dark as a night in night, and bright and sunny in day, and depends on
   the season … in a perfect way, and very accurate." The sun's height for this place and
   this minute (js/engine/sun.js) sets the photographs' light (index.html, #bgart): night
   blue and dim after dark, the violet and rose of the blue hour, amber at sunrise and
   sunset, full and bright at noon, fuller in summer than in winter.

   The place is the phone's time zone's city (js/data/tzplaces.js), or, once asked for in
   Settings → App, the phone's own location, rounded to a tenth of a degree (about 10 km,
   under half a minute of sunrise) and kept only in this profile's settings.

   It is applied as custom properties on #bgart that the CSS registers as numbers, so
   between one minute and the next the browser eases them (60 s, linear) and the light
   moves as continuously as the sun does. At start, and on coming back to the app after a
   while away, the light is set at once: nobody should watch noon fade into night. Only
   the photographs change: the cards, the words and the theme's ground do not, so
   nothing is harder to read at night. Off: Settings → App → Background follows the sun. */
import {skyLook, sunTimes} from "../engine/sun.js";
import {zonePlace} from "../data/tzplaces.js";
import {S} from "../state.js";

var timer=null,clock=null,last=0;
function now(){return clock!=null?clock:Date.now();}
function zone(){try{return Intl.DateTimeFormat().resolvedOptions().timeZone||"";}catch(e){return "";}}
/* The zone's standard offset (January's or July's, the smaller: daylight saving adds). */
function stdOff(){var y=new Date().getFullYear();
  return -Math.max(new Date(y,0,1).getTimezoneOffset(),new Date(y,6,1).getTimezoneOffset());}
function where(){
  var l=S.prefs&&S.prefs.skyLoc;
  if(l&&isFinite(l.lat)&&isFinite(l.lon))return {name:null,lat:+l.lat,lon:+l.lon,src:"gps"};
  return zonePlace(zone(),stdOff());}
function on(){return !(S.prefs&&S.prefs.nosky);}

var PROPS=["--sky-b","--sky-s","--sky-w","--sky-h","--sky-t","--sky-ga"];
function applySky(instant){
  var el=document.getElementById("bgart");if(!el)return null;
  if(!on()){PROPS.concat(["--sky-g"]).forEach(function(p){el.style.removeProperty(p);});
    el.removeAttribute("data-sky");return null;}
  var w=where(),L=skyLook(now(),w.lat,w.lon);
  if(instant)el.classList.add("sky-now");
  el.style.setProperty("--sky-b",String(L.bright));el.style.setProperty("--sky-s",String(L.sat));
  el.style.setProperty("--sky-w",String(L.warm));el.style.setProperty("--sky-h",L.hue+"deg");
  el.style.setProperty("--sky-t",String(L.tint));el.style.setProperty("--sky-ga",String(L.glow));
  el.style.setProperty("--sky-g",L.glowRGB.join(","));
  el.setAttribute("data-sky",L.phase);
  if(instant)requestAnimationFrame(function(){requestAnimationFrame(function(){el.classList.remove("sky-now");});});
  last=Date.now();
  return L;}

/* Every minute, on the minute; at once on coming back after more than two. */
function tick(){applySky(false);
  clearTimeout(timer);timer=setTimeout(tick,60000-(Date.now()%60000)+50);}
function initSky(){
  applySky(true);
  clearTimeout(timer);timer=setTimeout(tick,60000-(Date.now()%60000)+50);
  document.addEventListener("visibilitychange",function(){
    if(document.visibilityState==="visible")applySky(Date.now()-last>120000);});}

/* For Settings → App: where the sky is taken from, and today's sunrise and sunset there,
   in the phone's own clock. */
function skyInfo(){
  var w=where(),n=now(),off=-new Date(n).getTimezoneOffset(),st=sunTimes(n,w.lat,w.lon,off);
  return {place:w,rise:st.rise,set:st.set,polar:st.polar,look:skyLook(n,w.lat,w.lon)};}
/* The phone's location, asked for once: rounded, kept in this profile's settings. */
function locate(done){
  if(!navigator.geolocation){done(false,"none");return;}
  navigator.geolocation.getCurrentPosition(function(p){
    S.prefs.skyLoc={lat:Math.round(p.coords.latitude*10)/10,lon:Math.round(p.coords.longitude*10)/10};
    applySky(true);done(true);},
    function(e){done(false,e&&e.code===1?"denied":"failed");},{maximumAge:36e5,timeout:15000});}
function forgetLocation(){delete S.prefs.skyLoc;applySky(true);}
/* For the tests: the sky at a given moment. null goes back to the real clock. */
function setSkyClock(ms){clock=ms;return applySky(true);}

export {applySky, forgetLocation, initSky, locate, setSkyClock, skyInfo};
