/* Bunyan — what the tap handlers share
   Helpers more than one handler module (or the app's wiring) needs: going to a Coach
   section, closing a sheet that may hold unsaved typing, the builder being edited, and
   the like. Each is used as it was in app.js; only its home changed. */
import {isActivity} from "../../data/activities.js";
import {loadExDB} from "../../data/exercises.js";
import {importName, ownSlots} from "../../engine/meals.js";
import {checkPlans} from "../../engine/plancheck.js";
import {readSplit} from "../../engine/splitparse.js";
import {t} from "../../i18n/dict.js";
import {dayOf, editSplit, S, saveDB} from "../../state.js";
import {r1, uid} from "../../util.js";
import {askConfirm, closeSheet, val} from "../actions.js";
import {resetNav} from "../nav.js";
import {render} from "../render.js";
import {toast, V} from "../view.js";
import {ask} from "../views/chat.js";
import {withIds} from "../views/timport.js";

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
  ask(q);saveDB();render();chatEnd();}
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

export {MF, builderId, chatEnd, chatSend, editedEx, moveDayEx, moveRow, pcAfter, readTraining, requestCloseSheet, setExField, sheetDirty, slotsFrom, tidyGroups, toCoach, topOfResults, withNotes};
