/* Bunyan — what the tap handlers share
   Helpers more than one handler module (or the app's wiring) needs: going to a Coach
   section, closing a sheet that may hold unsaved typing, the builder being edited, and
   the like. Each is used as it was in app.js; only its home changed. */
import {isActivity} from "../../data/activities.js";
import {loadExDB} from "../../data/exercises.js";
import {importName, ownSlots} from "../../engine/meals.js";
import {checkPlans} from "../../engine/plancheck.js";
import {retarget} from "../../engine/retarget.js";
import {adoptLibrary, convertDbLoads, fixBodyweightLogs} from "../../engine/logfix.js";
import {readSplit} from "../../engine/splitparse.js";
import {t} from "../../i18n/dict.js";
import {exName} from "../../i18n/exnames.js";
import {CUR, dayOf, editSplit, S, saveDB, saveSession} from "../../state.js";
import {r1, uid} from "../../util.js";
import {askConfirm, closeSheet, val} from "../actions.js";
import {resetNav} from "../nav.js";
import {fromEl, land} from "../chatmotion.js";
import {render} from "../render.js";
import {toast, V} from "../view.js";
import {ask} from "../views/chat.js";
import {loadFoods} from "../../engine/nutrition.js";
import {toEnd} from "../coachfab.js";
import {withIds} from "../views/timport.js";
import {dispatchTap} from "./registry.js";

/* The exercise open in the edit sheet, and the one place its numbers are bounded:
   at least one set and one rep, the range never inverted, rest in whole seconds. */
function editedEx(){
  var d=dayOf(V.dayId);if(!d||V.sheet!=="editex"||!V.sd)return null;
  return d.ex.filter(function(x){return x.id===V.sd.id;})[0]||null;}
function setExField(e,k,v){
  if(k==="km"&&String(v).trim()===""){e.km=0;return;}
  v=parseFloat(v);if(!isFinite(v))return;
  if(k==="sets")e.sets=Math.max(1,Math.min(20,Math.round(v)));
  else if(k==="rest")e.rest=Math.max(0,Math.min(900,Math.round(v)));
  else if(k==="lo"){e.lo=Math.max(1,Math.min(100,Math.round(v)));if(e.hi<e.lo)e.hi=e.lo;}
  else if(k==="hi"){e.hi=Math.max(1,Math.min(100,Math.round(v)));if(e.lo>e.hi)e.lo=e.hi;}
  else if(k==="min"){e.min=Math.max(1,Math.min(1440,Math.round(v)));}
  else if(k==="km"){e.km=Math.max(0,Math.min(500,r1(v)));}
  if(isActivity(e.name)){e.sets=1;e.rest=0;}}
/* A new query or filter shows its results from the top: the list scrolls on its own
   inside a search sheet, and would otherwise stay wherever the last one was left. */
function topOfResults(){var sb=document.querySelector(".srch-body");if(sb)sb.scrollTop=0;}
/* A superset is a run of neighbours sharing a group id. After a row is removed or
   moved, a run can be split in two or left with one member: each separate run gets
   its own id, and a lone member stops being a superset. */
function tidyGroups(list){
  var ended={};
  for(var i=0;i<list.length;i++){
    var g=list[i].grp;if(!g)continue;
    if(i>0&&list[i-1].grp===g)continue;
    var e=i;while(e+1<list.length&&list[e+1].grp===g)e++;
    var id=ended[g]?"g"+uid():g;ended[g]=1;
    for(var k=i;k<=e;k++)list[k].grp=e>i?id:null;
    i=e;}}
/* The program a builder control acts on: the one open in the builder, or the active
   one when Coach → Training → My program shows it inline. */
function builderId(){
  if(V.tab!=="coach")return null;
  if(V.train==="builder")return V.previewId;
  if(V.train==="days"&&(V.csec||S.prefs.csec)==="train"&&(V.ctsub||"program")==="program")return S.activeProgram;
  return null;}
/* Drag and the arrow keys both land here: a day in the split builder, or an
   exercise in a day. */
function moveRow(id,to){
  if(V.tab==="coach"&&V.reorder==="ms"){
    var sl=ownSlots(),k0=sl.findIndex(function(x){return x.id===id;});
    to=Math.max(0,Math.min(sl.length-1,to));
    if(k0<0||to===k0)return;
    sl.splice(to,0,sl.splice(k0,1)[0]);saveDB();render();return;}
  if(builderId()){
    var sp=editSplit(builderId());if(!sp)return;
    var k=sp.days.findIndex(function(x){return x.id===id;});
    to=Math.max(0,Math.min(sp.days.length-1,to));
    if(k<0||to===k)return;
    sp.days.splice(to,0,sp.days.splice(k,1)[0]);saveDB();render();return;}
  moveDayEx(id,to);}
function moveDayEx(id,to){
  var d=dayOf(V.dayId);if(!d)return;
  var i=d.ex.findIndex(function(x){return x.id===id;});
  to=Math.max(0,Math.min(d.ex.length-1,to));
  if(i<0||to===i)return;
  d.ex.splice(to,0,d.ex.splice(i,1)[0]);
  tidyGroups(d.ex);saveDB();render();}
/* A PDF's supplement table says when each one is taken; that rides on the plan's
   supplement items as a note. Matched by name, the table's order as the fallback. */
function withNotes(pp){
  var su=V.psupps||[];if(!su.length)return pp;
  pp.forEach(function(m){
    if(!/^supplements?$/i.test(String(m.name||"").trim()))return;
    m.items.forEach(function(it,i){
      var nm=String(it.n||"").toLowerCase();
      var hit=su.filter(function(x){return nm.indexOf(String(x.name).toLowerCase())>-1;})[0]
        ||su.filter(function(x){return nm.indexOf(String(x.name).toLowerCase().split(/\s+/)[0])>-1;})[0]||su[i];
      if(hit)it.note=[hit.when,hit.note].filter(Boolean).join(" \u00b7 ");});});
  return pp;}
/* ---- reading and saving an imported program ------------------------------------ */
/* Pages from a PDF, or pasted text, into the draft the import screen shows. */
function readTraining(src){
  V.tierr="";V.tibusy=false;
  loadExDB(function(){
    var r=null;
    try{r=readSplit(src);}catch(e){r=null;}
    if(!r||!r.days.length){V.tp=null;
      V.tierr="No training days or exercises were found in that file. If it is a meal plan, import it under Food.";
      render();return;}
    V.tp=withIds(r);render();window.scrollTo(0,0);});}
/* The question typed into the chat, asked; and the newest question brought into view
   with its answer under it. */
function chatSend(){
  var el=document.getElementById("chatq"),q=el?String(el.value||"").trim():"";
  if(!q){if(el)el.focus();return;}
  /* Emptied before the render: the field is kept across renders, value and all, and a
     question that stayed in the box after its answer read as not yet sent. */
  var from=fromEl(el);
  el.value="";
  sendText(q,from,"");}
/* A request sent as if typed: from the box, or from an answer's button that asks for
   something (data-chatsay), shown as that button's words. */
function sendText(q,from,shown){
  loadFoods(function(){
    var m=ask(q);if(m&&!m.tap&&shown)m.q=shown;
    /* "yes" or "no" to a change waiting for a tap: that tap. */
    if(m&&m.tap){dispatchTap(m.tap,document.createElement("button"),{},{typingAsk:false});return;}
    /* Something to do at once: it runs, and its row says it was done. */
    if(m&&m.ag&&m.ag.run&&m.ag.s==="confirm"){saveDB();render();land(from);toEnd();
      dispatchTap({agrun:String(m.at)},document.createElement("button"),{},{typingAsk:false});return;}
    saveDB();render();land(from);toEnd();});}
function chatEnd(){
  requestAnimationFrame(function(){
    var qs=document.querySelectorAll(".chat-q"),q=qs[qs.length-1];
    if(q)window.scrollTo(0,Math.max(0,q.getBoundingClientRect().top+window.pageYOffset-72));});}
/* A plan, reviewed or built by the coach, as the day's meals: the four named ones by
   their names, the rest numbered, each with its foods and whatever is still to find. */
function slotsFrom(pp){
  var used={};
  return pp.map(function(m,i){
    var x={};
    /* Renamed on the review screen: its own meal, by that name. */
    if(m.custom){x.id="m_"+uid();x.name=m.custom;}
    else if(m.named&&!used[m.named]){x.id=m.named;used[m.named]=1;}
    else{x.id="m_"+uid();var nm=importName(m,i);
      /* A numbered meal out of place (Meal 3 after a snack) keeps its number by name. */
      if(m.named||(!m.n&&m.name)||(m.n&&m.n!==i+1))x.name=nm;}
    if(m.items.length)x.plan=m.items;
    if(m.todo&&m.todo.length)x.todo=m.todo;
    return x;});}
/* Coach, at a section and the view inside it: a change of place, so a fresh trail. */
function toCoach(sec,sub){
  if(V.sheet)closeSheet();
  resetNav();V.tab="coach";V.train="days";V.meal=null;V.smeal=null;V.pslot=null;V.pimport=false;V.chat=false;V.assess=false;V.pcheck=false;
  if(sec){V.csec=sec;S.prefs.csec=sec;}
  if(sub){if(V.csec==="train")V.ctsub=sub;else if(V.csec==="food")V.cfsub=sub;}
  saveDB();render();window.scrollTo(0,0);}
/* After a plan is used, say what the check found, one tap from the details. */
function pcAfter(){
  if(!checkPlans().length)return;
  /* Counted when it shows, not when the plan was used: fixes made in between count. */
  setTimeout(function(){
    var n=checkPlans().length;if(!n||V.pcheck)return;
    toast(t(n===1?"Plan check: 1 thing to look at":"Plan check: {n} things to look at").replace("{n}",n),
      function(){toCoach("ai");},t("Show me"));},5600);}
/* ---- closing a sheet ------------------------------------------------------ */
/* Most sheets show what is already stored, so closing them costs nothing. The ones
   holding typed input that has not been saved anywhere ask first. */
var MF=["mf_n","mf_s","mf_k","mf_p","mf_c","mf_f"];
function sheetDirty(){
  if(V.sheet!=="manual")return false;
  return MF.some(function(id){var el=document.getElementById(id);
    return el&&String(el.value).trim()!=="";});
}
/* Every way out of a sheet goes through here: the ✕, a tap outside, a drag down and
   Escape. One of them skipping the check would make the guard pointless. */
function requestCloseSheet(){
  if(sheetDirty()){
    askConfirm({title:t("Discard what you typed?"),icon:"trash",
      body:t("This food has not been added to your log yet."),
      cta:t("Discard"),act:"dropsheet",
      back:{name:val("mf_n"),s:val("mf_s"),k:val("mf_k"),p:val("mf_p"),c:val("mf_c"),f:val("mf_f"),
            meal:(V.sd&&V.sd.meal)||"",bc:(V.sd&&V.sd.bc)||""}});
    return;}
  closeSheet();
}

/* Targets the old formula made, rebuilt on the current one (js/engine/retarget.js), once
   per profile: at start-up, on a profile switch and after a restore. Said once, with
   Undo, since the day's numbers move. Undo puts the old ones back on the profile they
   came from, and only there. */
function retargetNow(){
  var r=retarget(S);
  if(!r)return;
  saveDB();
  if(!r.changed)return;
  var s0=S,before=r.before;
  setTimeout(function(){
    if(S!==s0)return;
    toast(t("Your targets now follow the textbook: 500 kcal under maintenance to lose fat, 350 over to build muscle, 2.4 g of protein per kg while losing."),
      function(){if(S!==s0)return;Object.assign(S.goals,before);saveDB();render();});},1200);}
/* Body-weight sets logged with the body weight as the weight (js/engine/logfix.js),
   read back as body weight, once per profile, when the history and the exercise
   library are both in (app.js calls it once the history has loaded; a profile switch
   and a restore after theirs). Each changed session is saved where history is kept.
   Said, with Undo, when anything changed. */
function fixLogsNow(){
  loadExDB(function(){
    adoptLibNow();
    var f=fixBodyweightLogs(S);if(!f)return;
    f.sessions.forEach(function(s){saveSession(s);});
    saveDB();if(!f.changed)return;
    render();
    var prof=CUR;
    setTimeout(function(){if(CUR!==prof)return;
      toast(t(f.changed===1?"1 body-weight set logged with your body weight as the weight now reads as body weight.":"{n} body-weight sets logged with your body weight as the weight now read as body weight.").replace("{n}",f.changed),
        function(){if(CUR!==prof)return;f.undo(S).forEach(function(s){saveSession(s);});saveDB();render();});},2600);});}
/* Own exercises the library has after all become the library's (js/engine/logfix.js
   adoptLibrary), said once with their names and Undo. Runs with fixLogsNow, so on every
   load: a name the library learns later is adopted then. */
function adoptLibNow(){
  var a=adoptLibrary(S);if(!a.names.length)return;
  a.sessions.forEach(function(s){saveSession(s);});saveDB();render();
  var prof=CUR,list=a.names.map(function(p){return exName(p[1]);}).join(", ");
  setTimeout(function(){if(CUR!==prof)return;
    toast(t(a.names.length===1?"1 exercise of your own is the library's now, with its picture and how-to: {list}.":"{n} exercises of your own are the library's now, with their pictures and how-to: {list}.")
      .replace("{n}",a.names.length).replace("{list}",list),
      function(){if(CUR!==prof)return;a.undo(S).forEach(function(s){saveSession(s);});saveDB();render();});},3200);}
/* How dumbbells are entered, per hand or both together, with the logged history
   converted to match (js/engine/logfix.js convertDbLoads). Said, with Undo, when any
   set changed. */
function setDbLoad(to,quiet){
  var from=S.prefs.dbLoad==="total"?"total":"hand";if(to===from)return;
  var c=convertDbLoads(S,to);
  c.sessions.forEach(function(s){saveSession(s);});
  saveDB();render();
  if(c.changed&&!quiet)toast(t(to==="total"?"{n} dumbbell sets now read as both dumbbells together.":"{n} dumbbell sets now read as one dumbbell.").replace("{n}",c.changed),
    function(){setDbLoad(from,true);});}
/* Functions a handler module lends the coach's actions (js/ui/handlers/actions.js),
   set when it registers: the actions run what the screens run without the handler
   modules importing each other. */
var LENT={};
export {builderId, chatEnd, chatSend, editedEx, fixLogsNow, LENT, setDbLoad, MF, moveDayEx, moveRow, pcAfter, readTraining, requestCloseSheet, retargetNow, sendText, setExField, sheetDirty, slotsFrom, tidyGroups, toCoach, topOfResults, withNotes};
