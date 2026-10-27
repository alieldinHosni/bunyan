/* Bunyan — the guide
   The first time a page opens, it is explained where it stands: one thing at a time,
   the rest of the screen dimmed, the thing lit, and a glass card beside it with an
   arrow pointing at it, saying in a sentence or two what it is and what a tap does.
   A tap anywhere moves on to the next; after the last the page is the user's. Each
   page's guide is shown once (S.prefs.toured, per profile); Profile → Show the guide
   again brings them all back.

   A step names what it points at by selector. One that is not on the screen (no
   reminder today, no advice, Coach open on another section) is passed over, so a
   guide never points at nothing.

   New things later: a step can carry v (the guide's version it arrived in). Someone
   who has seen the page's guide sees only the steps newer than what they saw. */
import {t} from "../i18n/dict.js";
import {S, saveDB} from "../state.js";
import {esc} from "../util.js";
import {V} from "./view.js";

var GUIDES={
  train:{name:"Training",steps:[
    {sel:'.hacts [data-csec="ai"]',h:"What the coach noticed",p:"The bell opens what your coach has spotted in your log. A dot on it means there is something to look at."},
    {sel:".hacts .havatar",h:"You",p:"Your picture opens Profile: your details, your picture, the app's settings and your backups."},
    {sel:".twk",h:"Your week",p:"Every day of this week. A tick is a workout done. Tap a day to see what it holds."},
    {sel:".thero2",h:"Today's workout",p:"Start it here. Change swaps today for another day of your plan."},
    {sel:".htiles",h:"Weigh-in and steps",p:"Tap either one to log it, and type the number. The ring fills toward your daily steps goal."},
    {sel:"[data-actsheet]",h:"Cardio and sports",p:"Log a match or a class by time and effort. Pick a run, a walk, a ride or a hike to track it live with your phone's GPS."},
    {sel:"nav .dock",fixed:true,h:"Getting around",p:"Training, Food, Coach and Progress. The tab you are on opens to show its name."}]},
  food:{name:"Food",steps:[
    {sel:".dnav",h:"The day",p:"Swipe or tap the arrows to see another day. Food always opens on today."},
    {sel:".fsum",h:"Today against your targets",p:"Calories eaten and left, and protein, carbs and fat, against what your plan asks for."},
    {sel:".fmt",h:"Your meals",p:"Tap a meal to see it, log it as planned, or change any food's amount."},
    {sel:"[data-addfood]",h:"Add food",p:"Search the food list, scan a barcode, or describe a meal in words."},
    {sel:".fbody",h:"What your body needs",p:"What is behind for the time of day, and everyday foods that bring it. One tap logs one."},
    {sel:".fwater",h:"Water",p:"Tap the glasses to set how much you have drunk today."}]},
  coach:{name:"Coach",steps:[
    {sel:".csecs",h:"Three parts",p:"Training is your program, Nutrition your meal plan and targets, Coach what the coach sees and the chat."},
    {sel:".cweek",h:"Your week, judged",p:"The coach's word on this week, with workouts done, protein days and your streak."},
    {sel:".pcf",h:"Coach noticed",p:"One thing at a time from your log. Act on it with its button, or set it aside."},
    {sel:".chatcard",h:"Ask me anything",p:"Ask about training, food or progress, in English or Arabic. Answers come from your own log."},
    {sel:".cplan",h:"Your plan",p:"Your program and meal plan at a glance. Tap one to open it."}]},
  progress:{name:"Progress",steps:[
    {sel:".pgtabs2",h:"Three views",p:"Overview for the big picture, Strength for your lifts, Body for weight, measurements and photos."},
    {sel:".pgrange",h:"How far back",p:"From the last week to the last year. Every chart on the page follows it."},
    {sel:".pgkm",h:"Key numbers",p:"Weight, strength and consistency, with how they changed. Tap one for its details."}]},
  profile:{name:"Profile",steps:[
    {sel:".pid-av",h:"Your picture",p:"Tap it to upload a photo from your phone, or keep your initial."},
    {sel:".pid-top",h:"Your details",p:"Age, height, weight, goal and activity. Your calorie and macro targets are worked out from them."},
    {sel:".sg",h:"Settings",p:"Each row says what is set now. Tap one to change it."},
    {sel:'[data-sheet="set_data"]',h:"Your data",p:"Everything stays on this phone. Save a backup now and then, so nothing can be lost."}]},
  chat:{name:"Ask the coach",steps:[
    {sel:".chat-topics",h:"Tap a question",p:"Pick one, and the coach answers from your own log, plan and targets."},
    {sel:".chat-form",fixed:true,h:"Or type your own",p:"In English or Arabic. Nothing you type leaves your phone."}]},
  run:{name:"Live tracking",steps:[
    {sel:".run-gps",h:"GPS",p:"Whether your phone has your position. Green means the route and distance are being tracked."},
    {sel:".run-play",h:"Pause and carry on",p:"Pause stops the clock and the distance; tap again to carry on."},
    {sel:".run-end",h:"Finish and save",p:"Saves it to your training, with its route, distance and calories."}]}};

/* Which guide fits the screen now, or null. */
function pageKey(){
  if(V.sheet||V.assess)return null;
  if(V.tab==="train"&&S.run&&!S.active)return "run";
  if(S.active)return null;
  if(V.tab==="coach"&&V.chat)return "chat";
  if(V.tab==="train")return V.train==="days"?"train":null;
  if(V.tab==="coach")return V.train==="days"&&!V.pslot&&!V.pimport&&!V.smeal&&!V.pcheck?"coach":null;
  if(V.tab==="food")return !V.meal?"food":null;
  if(V.tab==="progress")return !V.phist?"progress":null;
  if(V.tab==="profile")return "profile";
  return null;}
function seen(key){var s=(S.prefs&&S.prefs.toured)||{};return +s[key]||0;}
function stepsFor(key){
  var g=GUIDES[key],was=seen(key);
  return g.steps.filter(function(st){return (st.v||1)>was;});}
function version(key){return GUIDES[key].steps.reduce(function(m,st){return Math.max(m,st.v||1);},1);}
function off(){try{return !!localStorage.getItem("bunyan:notour");}catch(e){return false;}}
/* The intro still on screen: wait for it. */
function splashing(){return !!document.getElementById("splash")&&!document.body.classList.contains("nosplash");}

var T=null,timer=null;

/* ---- the workout's swipe hint ------------------------------------------------------
   The first time a workout of more than one exercise reaches its first exercise: the
   screen dims, an arrow points at the screen's edge, and a finger slides from that edge
   across, looping, with one line: swipe left for the next exercise (right in Arabic,
   where the next one comes from the left). A tap anywhere, or the first swipe, puts it
   away for good (S.prefs.toured.swipe, per profile; Show the guide again brings it back
   with the others). With reduced motion the finger stays still, the arrow says it. */
var SH=null;
function swipeDue(){
  var a=S.active;
  return !!a&&V.tab==="train"&&V.train!=="hub"&&!V.sheet&&!V.coach&&!off()&&!seen("swipe")
    &&a.entries&&a.entries.length>1&&!!document.querySelector("#app [data-exswipe]");}
function swipeHint(){
  if(SH||T||!swipeDue())return;
  var ar=document.documentElement.getAttribute("dir")==="rtl",idx=V.logIdx;
  var el=document.createElement("div");
  el.className="swhint"+(ar?" rtl":"");el.setAttribute("role","dialog");el.setAttribute("aria-modal","true");
  el.setAttribute("aria-label",t("Swipe for the next exercise"));
  el.innerHTML='<div class="swhint-edge" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></div>'
   +'<div class="swhint-track" aria-hidden="true"><span class="swhint-dot"></span></div>'
   +'<div class="swhint-card"><h2>'+esc(t(ar?"Swipe right for the next exercise":"Swipe left for the next exercise"))+'</h2>'
   +'<p>'+esc(t(ar?"And left to go back. The list at the top reaches any of them.":"And right to go back. The list at the top reaches any of them."))+'</p>'
   +'<span class="tour-tap">'+esc(t("Tap anywhere to continue"))+'</span></div>';
  document.body.appendChild(el);
  SH={el:el,idx:idx};
  el.addEventListener("click",function(ev){ev.stopPropagation();ev.preventDefault();swipeDone();},false);
  ["wheel","touchmove"].forEach(function(n){el.addEventListener(n,function(ev){ev.preventDefault();},{passive:false});});
  document.addEventListener("keydown",swipeKey,true);
  requestAnimationFrame(function(){el.classList.add("on");});}
function swipeKey(ev){if(SH&&(ev.key==="Escape"||ev.key==="Enter"||ev.key===" ")){ev.preventDefault();ev.stopPropagation();swipeDone();}}
function swipeDone(){
  if(!SH)return;
  var el=SH.el;SH=null;
  document.removeEventListener("keydown",swipeKey,true);
  el.classList.remove("on");
  setTimeout(function(){if(el.parentNode)el.parentNode.removeChild(el);},260);
  S.prefs.toured=Object.assign({},S.prefs.toured||{});S.prefs.toured.swipe=1;saveDB();}

/* After every render: if this page has a guide not yet seen, it starts once the
   screen has settled. */
function tourCheck(){
  /* The workout moved on (a swipe, the list) or ended: the hint has done its job. */
  if(SH&&(!S.active||V.logIdx!==SH.idx||V.sheet))swipeDone();
  if(!SH&&swipeDue())setTimeout(swipeHint,700);
  if(T)return;
  clearTimeout(timer);
  timer=setTimeout(function(){
    var key=pageKey();
    if(!key||T||off()||!stepsFor(key).length)return;
    if(splashing()){tourCheck();return;}
    start(key);},900);}

function start(key){
  var steps=stepsFor(key).filter(function(st){return !!visibleEl(st.sel);});
  if(!steps.length){finish(key);return;}
  T={key:key,steps:steps,i:0,el:null};
  var el=document.createElement("div");
  el.className="tour";el.setAttribute("role","dialog");el.setAttribute("aria-modal","true");
  el.setAttribute("aria-label",t("Guide")+": "+t(GUIDES[key].name));
  el.innerHTML='<div class="tour-hole"></div><div class="tour-card" tabindex="-1"><i class="tour-arrow"></i>'
   +'<div class="tour-k"></div><h2 class="tour-h"></h2><p class="tour-p"></p>'
   +'<div class="tour-f"><span class="tour-tap"></span><button class="tour-skip" type="button">'+esc(t("Skip"))+'</button></div></div>';
  document.body.appendChild(el);document.body.classList.add("touring");
  T.el=el;
  el.addEventListener("click",function(ev){
    ev.stopPropagation();ev.preventDefault();
    if(ev.target.closest(".tour-skip"))end();else next();},false);
  /* The page under it stays where it is. */
  ["wheel","touchmove"].forEach(function(n){el.addEventListener(n,function(ev){ev.preventDefault();},{passive:false});});
  window.addEventListener("resize",onResize);
  window.addEventListener("popstate",end);
  document.addEventListener("keydown",onKey,true);
  requestAnimationFrame(function(){el.classList.add("on");show();});}
function visibleEl(sel){
  var e=document.querySelector(sel);if(!e)return null;
  var r=e.getBoundingClientRect();return r.width>0&&r.height>0?e:null;}
function onResize(){if(T)place();}
function onKey(ev){
  if(!T)return;
  if(ev.key==="Escape"){ev.preventDefault();ev.stopPropagation();end();}
  else if(ev.key==="Enter"||ev.key===" "||ev.key==="ArrowRight"||ev.key==="ArrowLeft"){ev.preventDefault();ev.stopPropagation();next();}}
function next(){
  if(!T)return;
  T.i++;
  if(T.i>=T.steps.length){end();return;}
  show();}
function show(){
  /* The page changed under the guide (a redraw, a reminder): it stops, unseen, and
     the page now on screen gets its own. */
  if(pageKey()!==T.key){quit();tourCheck();return;}
  var st=T.steps[T.i],tgt=visibleEl(st.sel);
  if(!tgt){next();return;}
  var card=T.el.querySelector(".tour-card");
  card.classList.remove("in");
  card.querySelector(".tour-k").textContent=t(GUIDES[T.key].name)+" · "+t("{i} of {n}").replace("{i}",T.i+1).replace("{n}",T.steps.length);
  card.querySelector(".tour-h").textContent=t(st.h);
  card.querySelector(".tour-p").textContent=t(st.p);
  card.querySelector(".tour-tap").textContent=t(T.i===T.steps.length-1?"Tap anywhere to finish":"Tap anywhere for the next tip");
  if(!st.fixed)tgt.scrollIntoView({block:"center",inline:"nearest"});
  /* After the scroll has landed. */
  setTimeout(function(){if(T)place();},st.fixed?20:260);}
function place(){
  var st=T.steps[T.i],tgt=visibleEl(st.sel);if(!tgt)return;
  var r=tgt.getBoundingClientRect(),vw=window.innerWidth,vh=window.innerHeight,pad=8;
  var hole=T.el.querySelector(".tour-hole"),card=T.el.querySelector(".tour-card"),arrow=card.querySelector(".tour-arrow");
  var rad=parseFloat(getComputedStyle(tgt).borderTopLeftRadius)||12;
  var hl=Math.max(6,r.left-pad),ht=Math.max(6,r.top-pad),hr=Math.min(vw-6,r.right+pad),hb=Math.min(vh-6,r.bottom+pad);
  hole.style.left=hl+"px";hole.style.top=ht+"px";hole.style.width=(hr-hl)+"px";hole.style.height=(hb-ht)+"px";
  hole.style.borderRadius=Math.min(rad+pad,(hb-ht)/2,28)+"px";
  var cw=Math.min(340,vw-32),ch;
  card.style.width=cw+"px";ch=card.offsetHeight;
  var below=vh-hb,above=ht,top,dir;
  if(below>=ch+30){top=hb+16;dir="up";}
  else if(above>=ch+30){top=ht-16-ch;dir="down";}
  else{top=Math.max(16,vh-ch-24);dir="none";}
  var cx=r.left+r.width/2,left=Math.max(16,Math.min(vw-16-cw,cx-cw/2));
  card.style.left=left+"px";card.style.top=top+"px";
  card.className="tour-card "+dir+" in";
  arrow.style.left=Math.max(22,Math.min(cw-40,cx-left-9))+"px";
  try{card.focus({preventScroll:true});}catch(e){}}
function end(){
  if(!T)return;
  var key=T.key;quit();
  finish(key);
  window.scrollTo(0,0);
  /* Another page's guide may be waiting where this one ended. */
  tourCheck();}
/* Takes the guide off the screen. */
function quit(){
  if(!T)return;
  var el=T.el;T=null;
  window.removeEventListener("resize",onResize);
  window.removeEventListener("popstate",end);
  document.removeEventListener("keydown",onKey,true);
  document.body.classList.remove("touring");
  el.classList.remove("on");
  setTimeout(function(){if(el.parentNode)el.parentNode.removeChild(el);},260);}
function finish(key){
  S.prefs.toured=Object.assign({},S.prefs.toured||{});
  S.prefs.toured[key]=version(key);
  saveDB();}
/* Profile → Show the guide again. */
function tourReset(){S.prefs.toured={};saveDB();}

export {GUIDES, pageKey, tourCheck, tourReset};
