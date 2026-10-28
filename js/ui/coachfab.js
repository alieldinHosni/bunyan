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
import {S, saveDB} from "../state.js";
import {esc, today} from "../util.js";
import {addDays, weekStartOf} from "../engine/schedule.js";
import {V} from "./view.js";
import {glyph} from "./glyphs.js";
import {patch, replace} from "./patch.js";
import {ASK, askNext, bubble, chatShown, histLink, liveAt, pruneChat} from "./views/chat.js";

/* What to offer first, by where it was opened. Only questions the coach answers. */
var SUGGEST={train:["today","weights","tomorrow"],workout:["busy","weights","sore"],food:["rest","eat","protein"],
  progress:["track","strong","weight"],coach:["balance","track","plan"]};
/* In the first two days of a new week, last week's check-in comes first until read. */
function suggestFor(w){
  var n=today(),ws=weekStartOf(n),fresh=n<=addDays(ws,1)&&S.ckSeen!==ws&&(S.sessions||[]).length;
  return fresh?["week"].concat(SUGGEST[w].filter(function(x){return x!=="week";}).slice(0,2)):SUGGEST[w];}
function where(){return S.active&&V.tab==="train"&&V.train!=="hub"?"workout":(SUGGEST[V.tab]?V.tab:"train");}

/* ---- where the launcher may sit ------------------------------------------------------ */
function fabShown(){
  if(V.coach||V.sheet||V.assess||V.chat)return false;
  /* The keyboard up hides it, but not the panel's own field's: closing while typing (a
     tap in the panel keeps the field's focus, bindPanel) the field goes with the panel. */
  if(typeof document!=="undefined"&&document.body.classList.contains("kb")){
    var ae=document.activeElement;if(!(ae&&ae.id==="chatq"))return false;}
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
  var full=V.coach==="full",log=chatShown();
  /* Every exchange is in the panel and scrolls, compact or full height: a new one is one
     more row and nothing before it is rebuilt (js/ui/patch.js keys them). Compact opens
     on the newest; full height is the same conversation, taller. */
  /* The veil is a button so a tap on it reaches the tap handler; it closes the panel and
     does nothing else. Not in the tab order: the panel's own ✕ is the control. */
  var h='<button class="cp-veil" type="button" tabindex="-1" data-coachclose="1" aria-hidden="true"></button>'
   +'<section class="cp'+(full?' full':'')+(log.length?' has-log':'')+'" role="dialog" aria-modal="true" aria-labelledby="cpT" tabindex="-1">'
   +'<header class="cp-h"><span class="cp-mark" aria-hidden="true">'+MARK+'</span>'
   +'<div class="cp-ht"><h2 id="cpT">'+esc(t("Coach"))+'</h2><p>'+esc(t("From your log, worked out on this phone"))+'</p></div>'
   +(full&&log.length?'<button class="cp-ib" data-chatclear="1" aria-label="'+esc(t("Clear"))+'">'+glyph("trash")+'</button>':'')
   +'<button class="cp-ib" data-coachsize="'+(full?'compact':'full')+'" aria-label="'+esc(t(full?"Smaller":"Show the whole conversation"))+'">'
   +(full?'<svg class="gl" viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 4.5v5h-5M14.5 19.5v-5h5"/></svg>'
         :'<svg class="gl" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4.5h5.5V10M10 19.5H4.5V14"/></svg>')+'</button>'
   +'<button class="cp-ib" data-coachclose="1" aria-label="'+esc(t("Close"))+'">'+glyph("close")+'</button></header>'
   +'<div class="cp-b" id="cpB" role="log" aria-live="polite">'+histLink();
  if(!log.length)h+='<p class="cp-hi">'+esc(t("Ask about training, food or progress"))+'</p>';
  else{
    log.forEach(function(m,i){h+=bubble(m,liveAt(log,i),i<log.length-1);});}
  /* What to ask: for where it was opened, then, after an answer, what follows from it,
     in the conversation's language. */
  var last=log[log.length-1];
  if(last)h+=askNext(last,log.length);
  else h+='<div class="cp-sug">'+suggestFor(where()).map(function(id){
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
  /* An answer's button that goes somewhere (another screen, a sheet, the assessment)
     is the person leaving the conversation: the panel steps aside for it. Decided
     first, so the launcher comes back in the same render: decided after, the dock was
     left without it until something else redrew the screen. */
  if(V.coach&&lastMode&&!held&&(V.sheet||V.assess||routeKey()!==openKey))V.coach=null;
  var show=fabShown();
  if(show!==lastFab){fab.innerHTML=show?fabHtml():"";lastFab=show;}
  document.body.classList.toggle("cfab-on",show);
  var mode=V.coach||null;
  if(!mode){if(pan.firstChild&&!pan.classList.contains("closing"))pan.textContent="";lastMode=null;pan.hidden=true;return;}
  pan.hidden=false;
  var html=panelHtml();if(rtl)html=isolateNums(html);
  var opening=lastMode===null,resized=lastMode&&lastMode!==mode;
  /* A day-old conversation is gone when the panel opens (what the person asked the coach
     to remember is kept apart, in S.context). */
  if(opening){openKey=routeKey();if(pruneChat()){saveDB();html=panelHtml();if(rtl)html=isolateNums(html);}}
  /* Smaller or bigger: the panel grows or shrinks from where it was to where it is
     going (measured before and after, then played back), rather than jumping and
     fading in. With the keyboard up or not, it is the same two boxes. */
  /* The first exchange takes the compact box from the welcome's height to the
     conversation's: that one change glides too (flip), rather than jumping. */
  var cp0=pan.querySelector(".cp"),grow=!opening&&!resized&&cp0&&!cp0.classList.contains("has-log")&&chatShown().length>0;
  var was=(resized||grow)&&cp0,r0=was?was.getBoundingClientRect():null;
  /* Typing when it is resized: the field, what is in it and the keyboard stay (owner,
     28 Oct: maximised with the keyboard up, the rebuild dropped the keyboard halfway
     through the box's glide, and the two fought). Within the tap, so iOS keeps it up. */
  var q0=resized&&document.activeElement&&document.activeElement.id==="chatq"?document.activeElement:null;
  var typed=q0?{v:q0.value,s:q0.selectionStart,e:q0.selectionEnd}:null;
  if(opening||resized)replace(pan,html);else patch(pan,html);
  pan.classList.toggle("opening",opening);
  if(r0)flip(pan.querySelector(".cp"),r0);
  pan.classList.remove("resized");
  lastMode=mode;
  if(opening||resized){
    var box=pan.querySelector(".cp"),q1=typed&&document.getElementById("chatq");
    if(q1){q1.value=typed.v;try{q1.focus({preventScroll:true});q1.setSelectionRange(typed.s,typed.e);}catch(e){}}
    else if(box)try{box.focus({preventScroll:true});}catch(e){}
    toEnd();}}
/* The box itself moves: its edges glide from the old rectangle to the new one, and the
   conversation inside stays in view the whole way, reflowing as it goes (owner, 27 Oct:
   the old way scaled a picture of the box and faded what was in it out and back, which
   flashed dark). */
var MORPH=["position","left","top","width","height","max-width","max-height","margin","transition"];
function flip(box,r0){
  if(!box||document.body.classList.contains("noanim")||document.documentElement.classList.contains("reduced"))return;
  var r1=box.getBoundingClientRect();if(!r1.width||!r1.height)return;
  var set=function(r){box.style.left=r.left+"px";box.style.top=r.top+"px";box.style.width=r.width+"px";box.style.height=r.height+"px";};
  box.style.transition="none";box.style.position="fixed";box.style.margin="0";box.style.maxWidth="none";box.style.maxHeight="none";
  set(r0);box.getBoundingClientRect();
  box.style.transition="left var(--m-panel) var(--e-ios),top var(--m-panel) var(--e-ios),width var(--m-panel) var(--e-ios),height var(--m-panel) var(--e-ios)";
  set(r1);
  var t=setTimeout(done,560);
  function done(){clearTimeout(t);box.removeEventListener("transitionend",end);MORPH.forEach(function(k){box.style.removeProperty(k);});}
  function end(e){if(e.target===box&&e.propertyName==="height")done();}
  box.addEventListener("transitionend",end);}
/* Where an exchange sits in the conversation, by layout, not by what is on screen: the
   panel scales in from the launcher as it opens, and a measure taken then is a fraction
   of the real one (owner, 27 Oct: it opened scrolled up, not on the newest message). */
function offIn(el,b){var y=0;while(el&&el!==b){y+=el.offsetTop;el=el.offsetParent;}return y;}
/* The newest exchange in view, from its top: the question and the start of the answer,
   never the end of a long answer with its first lines scrolled away. */
function toEnd(){
  requestAnimationFrame(function(){
    var b=document.getElementById("cpB");if(!b)return;
    var xs=b.querySelectorAll(".chat-x"),x=xs[xs.length-1];
    if(!x){b.scrollTop=0;return;}
    b.scrollTop=Math.max(0,offIn(x,b)-12);});}
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
  setTimeout(function(){pan.classList.remove("closing");pan.textContent="";render();focusFab();},340);}
/* While typing, a tap on a button in the panel (send, a suggestion, an answer's button,
   bigger or smaller, close) does not take the focus from the field: the keyboard stays
   and nothing moves under the finger before the tap lands, as in a messaging app. A tap
   that closes the panel takes the field with it, and the keyboard goes then. */
function bindPanel(){
  var pan=document.getElementById("cpanel");if(!pan)return;
  pan.addEventListener("mousedown",function(e){
    var b=e.target&&e.target.closest&&e.target.closest("button");
    if(!b)return;
    if(document.activeElement&&document.activeElement.id==="chatq")e.preventDefault();});}
function focusFab(){var b=document.querySelector("#cfab .cfab");if(b)try{b.focus({preventScroll:true});}catch(e){}}

export {bindPanel, closeCoach, fabShown, holdCoach, syncCoach, toEnd};
