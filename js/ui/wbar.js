/* Bunyan — workout bar
   While a workout is running and you are on another tab, a slim bar above the dock
   says so and takes you back to it: the day and its clock, the rest counting down,
   or that the rest is over. On the Train tab the logger is the screen itself, so the
   bar is not shown there.

   Like the dock it is its own element beside #app, so the page transition cannot
   carry it. It is rebuilt only when what it says changes (working, resting, rest
   over, a new day or language); every other second tickSession repaints the digits. */
import {S} from "../state.js";
import {t} from "../i18n/dict.js";
import {exName, planName} from "../i18n/exnames.js";
import {esc} from "../util.js";
import {V} from "./view.js";
import {mmss, sessionClock} from "./views/session.js";

function mode(){
  var a=S.active;
  if(!a||V.tab==="train")return "";
  if(V.restDone)return "done";
  if(V.restEnd>Date.now()||V.restPaused)return "rest";
  return "work";}

function paintWbar(){
  var el=document.getElementById("wbarT");
  if(!el||!S.active)return;
  var m=mode(),s;
  if(m==="rest")s=mmss(V.restPaused?V.restLeft:Math.max(0,Math.ceil((V.restEnd-Date.now())/1000)));
  else s=mmss(sessionClock(S.active).ms/1000);
  if(el.textContent!==s)el.textContent=s;}

function syncWbar(){
  var host=document.getElementById("wbar");
  if(!host)return;
  var m=mode(),a=S.active;
  document.body.classList.toggle("wb",!!m);
  if(!m){if(host.firstChild)host.textContent="";host.removeAttribute("data-k");return;}
  var e=a.entries[V.logIdx]||a.entries[a.idx||0];
  var name=m==="work"||!e?planName(a.dayName):exName(e.name);
  var kick=t(m==="done"?"Rest over":m==="rest"?(V.restPaused?"Rest paused":"Rest"):"Workout");
  var key=m+"|"+(V.restPaused?1:0)+"|"+name+"|"+(S.prefs&&S.prefs.lang||"en");
  if(host.getAttribute("data-k")!==key){
    /* It slides in when it appears, not every time what it says changes. */
    var fresh=!host.firstChild;
    host.setAttribute("data-k",key);
    host.innerHTML='<button type="button" class="wbar '+m+(fresh?' in':'')+'" data-go="train" aria-label="'
      +esc(kick+", "+name+". "+t("Back to your workout"))+'">'
      +'<span class="wbar-dot" aria-hidden="true"></span>'
      +'<span class="wbar-k" aria-hidden="true">'+esc(kick)+'</span>'
      +'<span class="wbar-n" aria-hidden="true">'+esc(name)+'</span>'
      +(m==="done"?'<span class="wbar-go" aria-hidden="true">'+esc(t("Next set"))+'</span>'
        :'<span class="wbar-t num" id="wbarT" aria-hidden="true"></span>')
      +'<span class="ico ico-chev" aria-hidden="true"></span></button>';}
  paintWbar();}

export {syncWbar};
