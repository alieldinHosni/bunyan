/* Bunyan — the floating Coach
   The coach is a small round button near the bottom right of the ordinary screens, and
   it opens into a panel over whatever is on screen: the same conversation (S.chat), the
   same matcher and answers (js/ui/views/chat.js, js/coach/intent.js), nothing sent
   anywhere. The panel can go full height to read the conversation, and closing it puts
   you back exactly where you were: it lives in its own containers outside #app, so the
   screen under it is never rebuilt, and nothing in it touches the route.

   Where it shows is decided here, once (fabShown): the roots of Training, Food, Progress
   and Coach, and nowhere a launcher could cover something that matters — not over a
   live workout or run (the workout opens it from its ⋯ menu instead), a sheet, the
   assessment, a builder, a meal, or while the keyboard is up.

   V.coach: null (closed), "compact" or "full". */
import {t} from "../i18n/dict.js";
import {isolateNums} from "../i18n/bidi.js";
import {S} from "../state.js";
import {esc} from "../util.js";
import {V} from "./view.js";
import {glyph} from "./glyphs.js";
import {patch, replace} from "./patch.js";
import {ASK, askNext, bubble} from "./views/chat.js";

/* What to offer first, by where it was opened. Only questions the coach answers. */
var SUGGEST={train:["today","weights","tomorrow"],workout:["weights","sore","missed"],food:["rest","eat","protein"],
  progress:["track","strong","weight"],coach:["balance","track","plan"]};
function where(){return S.active&&V.tab==="train"&&V.train!=="hub"?"workout":(SUGGEST[V.tab]?V.tab:"train");}

/* ---- where the launcher may sit ------------------------------------------------------ */
function fabShown(){
  if(V.coach||V.sheet||V.assess||V.chat)return false;
  if(typeof document!=="undefined"&&document.body.classList.contains("kb"))return false;
  if(V.tab==="train")return !S.run&&(!S.active||V.train==="hub")&&(V.train==="days"||V.train==="hub");
  if(V.tab==="food")return !V.meal;
  if(V.tab==="progress")return !V.phist;
  if(V.tab==="coach")return !V.smeal&&!V.pslot&&!V.pimport&&(V.train==="days"||!V.train);
  return false;}

/* The coach's mark: a speech outline with the coach's whistle line, on the dock's grid. */
var MARK='<svg class="gl" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 5.5h16v10.5H11l-4.5 3.5V16H4z"/><path d="M8.5 10.75h7"/></svg>';

function fabHtml(){
  return '<button class="cfab" type="button" data-coachopen="1" aria-label="'+esc(t("Open Coach"))+'" aria-haspopup="dialog">'+MARK+'</button>';}

/* ---- the panel ------------------------------------------------------------------------ */
function panelHtml(){
  var full=V.coach==="full",log=(S.chat||[]).filter(function(m){return m&&typeof m==="object";});
  /* Every exchange is in the panel, so a new one is one more row and nothing before it is
     rebuilt (js/ui/patch.js keys them): compact shows only the newest (.prev hidden),
     full height the whole conversation. */
  /* The veil is a button so a tap on it reaches the tap handler; it closes the panel and
     does nothing else. Not in the tab order: the panel's own ✕ is the control. */
  var h='<button class="cp-veil" type="button" tabindex="-1" data-coachclose="1" aria-hidden="true"></button>'
   +'<section class="cp'+(full?' full':'')+'" role="dialog" aria-modal="true" aria-labelledby="cpT" tabindex="-1">'
   +'<header class="cp-h"><span class="cp-mark" aria-hidden="true">'+MARK+'</span>'
   +'<div class="cp-ht"><h2 id="cpT">'+esc(t("Coach"))+'</h2><p>'+esc(t("From your log, worked out on this phone"))+'</p></div>'
   +(full&&log.length?'<button class="cp-ib" data-chatclear="1" aria-label="'+esc(t("Clear"))+'">'+glyph("trash")+'</button>':'')
   +'<button class="cp-ib" data-coachsize="'+(full?'compact':'full')+'" aria-label="'+esc(t(full?"Smaller":"Show the whole conversation"))+'">'
   +(full?'<svg class="gl" viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 4.5v5h-5M14.5 19.5v-5h5"/></svg>'
         :'<svg class="gl" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4.5h5.5V10M10 19.5H4.5V14"/></svg>')+'</button>'
   +'<button class="cp-ib" data-coachclose="1" aria-label="'+esc(t("Close"))+'">'+glyph("close")+'</button></header>'
   +'<div class="cp-b" id="cpB" role="log" aria-live="polite">';
  if(!log.length)h+='<p class="cp-hi">'+esc(t("Ask about training, food or progress"))+'</p>';
  else{
    /* Always in its place, hidden when there is nothing above, so the rows after it
       keep theirs and the patch leaves them alone. */
    h+='<button class="cp-more" data-coachsize="full"'+(!full&&log.length>1?'':' hidden')+'>'+esc(t("Show the whole conversation"))+'</button>';
    log.forEach(function(m,i){h+=bubble(m,i===log.length-1,i<log.length-1);});}
  /* What to ask: for where it was opened, then, after an answer, what follows from it,
     in the conversation's language. */
  var last=log[log.length-1];
  if(last)h+=askNext(last);
  else h+='<div class="cp-sug">'+SUGGEST[where()].map(function(id){
    return '<button class="cp-chip" data-chatq="'+id+'">'+esc(t(ASK[id]))+'</button>';}).join("")+'</div>';
  h+='</div><div class="cp-f"><input id="chatq" type="text" enterkeyhint="send" autocomplete="off" maxlength="300" placeholder="'
   +esc(t("Ask a question"))+'" aria-label="'+esc(t("Ask a question"))+'">'
   +'<button class="cp-send" data-chatsend="1" aria-label="'+esc(t("Ask"))+'">'+glyph("send")+'</button></div></section>';
  return h;}

/* ---- keeping the containers in step ---------------------------------------------------- */
var lastMode=null,lastFab=null,openKey="",held=false;
function routeKey(){return [V.tab,V.train,V.dayId,V.previewId,V.meal,V.smeal,V.pslot,V.pimport,V.phist,V.csec,V.ctsub,V.cfsub].join("|");}
function syncCoach(){
  var fab=document.getElementById("cfab"),pan=document.getElementById("cpanel");
  if(!fab||!pan)return;
  var rtl=S.prefs&&S.prefs.lang==="ar";
  var show=fabShown();
  if(show!==lastFab){fab.innerHTML=show?fabHtml():"";lastFab=show;}
  document.body.classList.toggle("cfab-on",show);
  /* An answer's button that goes somewhere (another screen, a sheet, the assessment)
     is the person leaving the conversation: the panel steps aside for it. */
  if(V.coach&&lastMode&&!held&&(V.sheet||V.assess||routeKey()!==openKey))V.coach=null;
  var mode=V.coach||null;
  if(!mode){if(pan.firstChild&&!pan.classList.contains("closing"))pan.textContent="";lastMode=null;pan.hidden=true;return;}
  pan.hidden=false;
  var html=panelHtml();if(rtl)html=isolateNums(html);
  var opening=lastMode===null,resized=lastMode&&lastMode!==mode;
  if(opening)openKey=routeKey();
  if(opening||resized)replace(pan,html);else patch(pan,html);
  pan.classList.toggle("opening",opening);
  pan.classList.toggle("resized",!!resized);
  lastMode=mode;
  if(opening||resized){
    var box=pan.querySelector(".cp");
    if(box)try{box.focus({preventScroll:true});}catch(e){}
    toEnd();}}
/* The newest exchange in view, from its top: the question and the start of the answer,
   never the end of a long answer with its first lines scrolled away. */
function toEnd(){
  requestAnimationFrame(function(){
    var b=document.getElementById("cpB");if(!b)return;
    var xs=b.querySelectorAll(".chat-x"),x=xs[xs.length-1];
    /* Compact holds the newest exchange alone: from the top, Show the whole
       conversation included. */
    if(!x||!b.closest(".cp.full")){b.scrollTop=0;return;}
    b.scrollTop=Math.max(0,b.scrollTop+x.getBoundingClientRect().top-b.getBoundingClientRect().top-12);});}
/* A change the coach makes on the person's behalf runs the screen's own code, which
   may move the screen behind (a food logged opens Food): the panel stays over it, and
   what is behind it now is where closing it returns to. */
function holdCoach(fn){
  held=true;
  try{return fn();}finally{held=false;openKey=routeKey();}}
/* Closing plays the panel back into the launcher, then lets go; focus returns to it. */
function closeCoach(render){
  var pan=document.getElementById("cpanel");
  V.coach=null;
  var reduced=document.documentElement.classList.contains("reduced")||document.body.classList.contains("noanim");
  if(!pan||!pan.firstChild||reduced){render();focusFab();return;}
  pan.classList.add("closing");
  setTimeout(function(){pan.classList.remove("closing");pan.textContent="";render();focusFab();},200);}
function focusFab(){var b=document.querySelector("#cfab .cfab");if(b)try{b.focus({preventScroll:true});}catch(e){}}

export {closeCoach, fabShown, holdCoach, syncCoach, toEnd};
