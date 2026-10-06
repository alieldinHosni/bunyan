/* Bunyan — app
   Entry point: event listeners, wiring and boot. */
import {ACT, addExercise, askConfirm, askText, closeSheet, openSheet, runAct, startActivity, startDay, swapAlt, syncDraft, val} from "./ui/actions.js";
import {actKcal, isActivity} from "./data/activities.js";
import {t} from "./i18n/dict.js";
import {LIB, loadExDB, loadInstructions, reconcileExercises} from "./data/exercises.js";
import {applyLang, exName, planName} from "./i18n/exnames.js";
import {addItems, BACKUP_SNOOZE, curDate, lastWeight, macroKcal, macroTargets} from "./engine/formulas.js";
import {FOODDB, gramsFor, loadFoods, lookupBarcode, normBarcode, nutritionFor, offSearch, parseFoodInput, recalcItem, resolveItem, roundUnit, toLogItem, unitGrams, unitKey, unitLabel, UNIT_STEP, isMeasure} from "./engine/nutrition.js";
import {startScan, stopScan} from "./scan.js";
import {buildPlan, rebalance} from "./engine/plan.js";
import {day} from "./data/splits.js";
import {spreadWd, suggestWd, weekOrder, weekStart} from "./engine/schedule.js";
import {render, syncKeyboard} from "./ui/render.js";
import {goBack, initNav, pushNav, resetNav} from "./ui/nav.js";
import {initSheetDrag} from "./ui/sheetdrag.js";
import {initReorder} from "./ui/reorder.js";
import * as W from "./ui/workout.js";
import {leave} from "./ui/motion.js";
import {groupRun, mmss, paintRest, sessionClock} from "./ui/views/session.js";
import {editSplit, refreshFromStorage, storageKey, normalize, startupNote, ensureSessionIds, removeSession, saveSession, sessionById, adoptRestored, allSplits, addProgram, makeProgram, CUR, curProfile, dayOf, dayRec, friends, initState, isOwner, loadStored, migrate, S, saveDB, saveFriends, setS, split, switchProfile} from "./state.js";
import {toDisp, toKg, wUnit} from "./units.js";
import {fmtN, num, r1, setStorageErrorHandler, today, uid} from "./util.js";
import {syncViewport, restoreWorkoutState, syncWorkoutState, alarmStart, audioOn, beeped, endRest, keepAwake, lastTick, play, setBeeped, setLastTick, tap, toast, V} from "./ui/view.js";
import {shiftDay} from "./ui/datebar.js";
import {addPhoto, removePhoto} from "./ui/photos.js";
import {syncWbar} from "./ui/wbar.js";
import {initDockScroll} from "./ui/dock.js";
import {initPress} from "./ui/press.js";
import {grow} from "./ui/more.js";
import {enter as enterEx, fromOf, initExSwipe} from "./ui/exswipe.js";
import {importName, mealNow, savedById} from "./ui/views/food.js";
import {mealName, mealSlots, mealStyle, newSlot, ownSlot, ownSlots, planOf, setStyle, slotOf} from "./engine/meals.js";
import {parsePlan} from "./engine/planparse.js";
import {readSplit} from "./engine/splitparse.js";
import {newNames, programFromDraft, withIds} from "./ui/views/timport.js";
import {warmShown} from "./ui/views/warmup.js";
import {draftFrom, foodPrefs, GEARS, profileOf, STEPS, youOk} from "./ui/views/assess.js";
import {buildMealPlan} from "./engine/mealplan.js";
import {checkPlans} from "./engine/plancheck.js";
import {coachNow} from "./engine/coachinfo.js";
import {coachAct} from "./ui/views/pcheck.js";
import {holding, startHold, stopHold} from "./ui/hold.js";
import {changeLook, themeOf} from "./ui/theme.js";
import {fitCh, pickAmount, servs} from "./ui/views/addfood.js";

/* Logs one food to the add-food sheet's meal and closes it. The single path for the
   servings screen, the + beside a result, an Open Food Facts result and the
   frequent-food pills — which all had, or would have had, their own copy. With no
   sheet open (the dashboard's pills) the meal is the time of day's. */
function logFood(food,grams,label){
  var meal=(V.sheet==="addfood"&&V.sd&&V.sd.meal)||mealNow(),n=nutritionFor(food,grams);
  var where=addTo(meal,[{fid:food.id,n:food.n,label:label,grams:grams,src:food.src||"db",
    kcal:n.kcal,p:n.p,c:n.c,f:n.f,fib:n.fib}]);
  if(V.sheet)closeSheet();
  V.tab="food";render();play("set");
  toast(food.n+" "+t("added to")+" "+where+".");}
/* Where an add from the sheet lands: the day's meal, or — when the sheet was opened
   from a saved meal in My Foods — that saved meal, in the same amounts. Returns the
   name the toast should say. */
function addTo(meal,items,d){
  /* Into a meal of a plan still being imported (the review screen's draft). Found from
     a line that matched nothing, the line is crossed off as it is found. */
  if(V.sheet==="addfood"&&V.sd&&V.sd.pimp!=null&&V.pparse){
    var pm=V.pparse[+V.sd.pimp];
    if(pm){pm.items=pm.items.concat(items);
      if(V.sd.ptodo!=null){pm.todo.splice(+V.sd.ptodo,1);V.sd.ptodo=null;}
      return importName(pm,+V.sd.pimp);}}
  var into=V.sheet==="addfood"&&V.sd&&V.sd.into?savedById(V.sd.into):null;
  if(into){items.forEach(function(i){into.items.push(i);});saveDB();return into.name;}
  /* Into a meal's plan, from Food → Plan. Found from a line an import could not match,
     the line is crossed off as it is found. */
  var plan=V.sheet==="addfood"&&V.sd&&V.sd.plan?ownSlot(V.sd.plan):null;
  if(plan){
    plan.plan=(plan.plan||[]).concat(items);
    if(V.sd.todo!=null&&plan.todo){plan.todo.splice(+V.sd.todo,1);if(!plan.todo.length)delete plan.todo;V.sd.todo=null;}
    saveDB();return t("the plan for")+" "+mealName(plan.id);}
  addItems(meal,items,d||curDate());return mealName(meal);}


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
/* Moving a program to weekdays: the empty "Rest" days that spaced out a rotation
   mean nothing once any unpinned weekday is a rest day, so they go, and each training
   day is pinned to the weekday it is usually trained on. */
function toWeekdays(sp){
  if(sp.days.some(function(d){return d.ex.length;}))sp.days=sp.days.filter(function(d){return d.ex.length;});
  if(!sp.days.some(function(d){return (d.wd||[]).length;})){
    var sg=suggestWd(sp);sp.days.forEach(function(d){d.wd=sg[d.id]||[];});}}
function addDaysISO(iso,n){var d=new Date(iso+"T00:00:00");d.setDate(d.getDate()+n);
  return new Date(d.getTime()-d.getTimezoneOffset()*6e4).toISOString().slice(0,10);}
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
function removeDayEx(id){
  var d=dayOf(V.dayId);if(!d)return;
  var i=d.ex.findIndex(function(x){return x.id===id;});if(i<0)return;
  var before=d.ex.map(function(x){return Object.assign({},x);});
  var gone=d.ex.splice(i,1)[0];tidyGroups(d.ex);saveDB();render();
  toast(exName(gone.name)+" "+t("removed."),function(){
    var d2=dayOf(d.id);if(!d2)return;d2.ex=before;saveDB();render();});}
/* The program a builder control acts on: the one open in the builder, or the active
   one when My Program shows it inline on the Train tab. */
function builderId(){
  if(V.tab!=="train"||S.active)return null;
  if(V.train==="builder")return V.previewId;
  if(V.train==="days"&&(V.tsec||S.prefs.tsec)==="program")return S.activeProgram;
  return null;}
/* Drag and the arrow keys both land here: a day in the split builder, or an
   exercise in a day. */
function moveRow(id,to){
  if(V.tab==="food"&&V.reorder==="ms"){
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

/* Deleting a progress photo. Asked first: the photo is on this phone only, so there
   is nothing to undo from. */
/* A meal of the day, added or renamed from Food → Plan. A blank name numbers it by its
   place; a name that is just what it would be called anyway is not stored, so a
   numbered meal keeps renumbering itself when the meals around it move. */
ACT.addslot=function(name){newSlot(name);saveDB();render();};
ACT.renameslot=function(name,id){
  var x=ownSlot(id);if(!x)return;
  name=String(name||"").trim();delete x.name;
  if(name&&name!==mealName(id))x.name=name;
  saveDB();render();};
ACT.delphoto=function(_,id){
  removePhoto(id,function(ok){
    render();toast(ok?t("Photo deleted."):t("That photo could not be deleted."));});};

/* Read as the finger lands, not on the click: by then Chrome has already taken the
   focus off the field for a tap outside it, and iOS has not. */
var askTyping=false;
document.addEventListener("pointerdown",function(){
  askTyping=V.sheet==="ask"&&!!document.activeElement&&document.activeElement.id==="askv";},true);
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
/* The open exercise editor's fields into its working copy (V.sd.e). */
function tieRead(){
  var e=V.sd&&V.sd.e;if(!e)return;
  var g=function(k){var el=document.getElementById("tie_"+k);return el?String(el.value).trim():null;};
  var n=function(k){var v=g(k);return v===null||v===""?null:num(v);};
  if(n("sets")!=null)e.sets=Math.max(1,Math.min(12,Math.round(n("sets"))));
  if(n("rest")!=null)e.rest=Math.max(0,Math.min(900,Math.round(n("rest"))));
  if(n("lo")!=null)e.lo=Math.max(0,Math.round(n("lo")));
  if(n("hi")!=null)e.hi=Math.max(e.lo||0,Math.round(n("hi")));
  if(n("min")!=null)e.min=Math.max(1,Math.round(n("min")));
  var w=g("w0");
  if(w!==null){if(w===""||!(num(w)>0))delete e.w0;else e.w0=r1(toKg(num(w)));}
  if(g("wk0")!==null){var a=n("wk0"),b=n("wk1");
    if(a>0)e.wk=[Math.round(a),b>=a?Math.round(b):99];else delete e.wk;}
  var nt=g("note");if(nt!==null)e.note=nt;
  e.check=false;}
/* A weekday holds one thing: a day of the program, an activity, or rest. */
function assignWd(n,val){
  var tp=V.tp;if(!tp)return;
  tp.days.forEach(function(d){d.wd=d.wd.filter(function(x){return x!==n;});});
  (tp.acts||[]).forEach(function(a){a.wd=(a.wd||[]).filter(function(x){return x!==n;});});
  var m=/^([da]):(\d+)$/.exec(val||"");if(!m)return;
  var it=m[1]==="d"?tp.days[+m[2]]:(tp.acts||[])[+m[2]];
  if(it){(it.wd=it.wd||[]).push(n);it.wd.sort();}}
/* The assessment's answers become the profile, the daily targets and the training
   plan, all at once and all with one Undo. */
function useAssessment(){
  var A=V.asd;if(!A)return;
  var keys=["profile","prefs","gear","goals","programs","activeProgram","onboarded","plannedWeekly","body"];
  var before=JSON.parse(JSON.stringify(keys.reduce(function(o,k){o[k]=S[k];return o;},{})));
  Object.assign(S.profile,profileOf(A));
  S.prefs.meals=num(A.meals);S.prefs.diet=A.diet;S.prefs.avoid=A.avoid.slice();S.prefs.powder=!!A.powder;S.prefs.fstyle=A.style;
  S.gear=GEARS[A.gear]?GEARS[A.gear].slice():null;
  var bt=S.body.filter(function(b){return b.date===today();})[0];
  if(bt)bt.weight=S.profile.weight;else S.body.push({date:today(),weight:S.profile.weight});
  var m=macroTargets();
  ["kcal","p","c","f","water","steps"].forEach(function(k){if(m[k])S.goals[k]=m[k];});
  buildPlan(A.split||undefined);
  S.onboarded=true;A.done=true;saveDB();render();window.scrollTo(0,0);
  toast(t("Your plan is in."),function(){
    keys.forEach(function(k){S[k]=before[k];});A.done=false;saveDB();render();});}
/* The plan check's fixes. Each one is what the finding offered, with Undo. A fix done
   here (targets, protein, carbs, the goal, the volume) always settles its card: if
   something is still off afterwards (a muscle that would need longer sessions), what
   is left is kept as it is, so the card goes, and comes back only if those numbers
   change. Undo puts everything back, the card included. */
function pcFix(id){
  var f=checkPlans().filter(function(x){return x.id===id;})[0];if(!f)return;
  var act=f.fix.act;
  if(act==="meals"){openMealPlan(mealPrefs());return;}
  if(act==="program"){V.pcheck=false;resetNav();V.tab="train";V.train="days";V.tsec="program";S.prefs.tsec="program";saveDB();render();window.scrollTo(0,0);return;}
  if(act==="assess"){V.pcheck=false;pushNav();V.assess=true;V.asd=draftFrom();render();window.scrollTo(0,0);return;}
  var prog=split(),before={goals:JSON.parse(JSON.stringify(S.goals)),goal:S.profile.goal,
    days:prog?JSON.parse(JSON.stringify(prog.days)):null,dis:JSON.parse(JSON.stringify(S.pcDismiss||{}))};
  var g=S.goals,w=lastWeight()||num(S.profile.weight),msg="";
  if(act==="targets"){var m=macroTargets();g.kcal=m.kcal;g.p=m.p;g.c=m.c;g.f=m.f;msg=t("Targets updated.");}
  /* Protein or carbs up, the other two moved so the calories stay where they are. */
  else if(act==="protein"){g.p=macroTargets().p;g.c=Math.max(50,Math.round((g.kcal-g.p*4-g.f*9)/4));
    msg=t("Protein raised; carbs moved to keep your calories.");}
  else if(act==="carbs"){g.c=Math.round(w*3/5)*5;g.f=Math.max(Math.round(w*0.6),Math.round((g.kcal-g.p*4-g.c*4)/9));
    msg=t("Carbs raised; fat moved to keep your calories.");}
  else if(act==="phasegoal"){S.profile.goal=f.fix.goal;var m2=macroTargets();g.kcal=m2.kcal;g.p=m2.p;g.c=m2.c;g.f=m2.f;
    msg=t("Goal and targets now match your program.");}
  else if(act==="balance"){var r=prog?rebalance(prog,S.profile,S.gear):{sets:0,added:0};
    msg=r.sets||r.added?t("Volume balanced: {s} sets moved, {a} exercises added.").replace("{s}",r.sets).replace("{a}",r.added)
      :t("Nothing could be moved without making sessions longer.");}
  else return;
  var still=checkPlans().filter(function(x){return x.id===id;})[0];
  if(still){S.pcDismiss=S.pcDismiss||{};S.pcDismiss[id]=JSON.stringify(still.sig);msg+=" "+t("The rest is kept as it is.");}
  saveDB();render();
  toast(msg,function(){S.goals=before.goals;S.profile.goal=before.goal;if(prog&&before.days)prog.days=before.days;
    S.pcDismiss=before.dis;saveDB();render();});}
/* The coach's insights: act on one, or set it aside for two weeks. Taking a lighter
   week also quiets the insight that asked for it until well after the week ends. */
function coachSetAside(id,days){S.coachDismiss=S.coachDismiss||{};S.coachDismiss[id]=addDaysISO(today(),days);}
function coachFix(id){
  var c=coachNow().filter(function(x){return x.id===id;})[0];if(!c)return;
  var act=coachAct(c);
  if(act==="deload"){
    var dlBefore=JSON.parse(JSON.stringify(S.deload||{})),disBefore=JSON.parse(JSON.stringify(S.coachDismiss||{}));
    var dl=S.deload=S.deload||{};dl.until=addDaysISO(today(),6);dl.last=today();delete dl.snooze;
    coachSetAside(id,14);saveDB();render();
    toast(t("Lighter week on. Your next workouts have fewer sets and lighter suggestions."),function(){
      S.deload=dlBefore;S.coachDismiss=disBefore;saveDB();render();});return;}
  if(act==="balance"){
    var prog=split();if(!prog)return;
    var daysBefore=JSON.parse(JSON.stringify(prog.days)),disB=JSON.parse(JSON.stringify(S.coachDismiss||{}));
    var r=rebalance(prog,S.profile,S.gear);coachSetAside(id,14);saveDB();render();
    toast(r.sets||r.added?t("Volume balanced: {s} sets moved, {a} exercises added.").replace("{s}",r.sets).replace("{a}",r.added)
      :t("Nothing could be moved without making sessions longer."),function(){prog.days=daysBefore;S.coachDismiss=disB;saveDB();render();});
    return;}
  if(act==="program"){coachSetAside(id,14);saveDB();V.pcheck=false;resetNav();V.tab="train";V.train="days";V.tsec="program";S.prefs.tsec="program";saveDB();render();window.scrollTo(0,0);return;}
  coachSetAside(id,28);saveDB();render();}
/* After a plan is used, say what the check found, one tap from the details. */
function pcAfter(){
  if(!checkPlans().length)return;
  /* Counted when it shows, not when the plan was used: fixes made in between count. */
  setTimeout(function(){
    var n=checkPlans().length;if(!n||V.pcheck)return;
    toast(t(n===1?"Plan check: 1 thing to look at":"Plan check: {n} things to look at").replace("{n}",n),
      function(){pushNav();V.pcheck=true;render();window.scrollTo(0,0);},t("Show me"));},5600);}
/* A meal plan built from the daily targets, opened on the same review an imported
   plan gets: every food and amount can be changed before it is used. */
function openMealPlan(prefs){
  loadFoods(function(){
    V.assess=false;V.pcheck=false;resetNav();V.tab="food";V.fsec="plan";S.prefs.fsec="plan";saveDB();pushNav();
    V.pimport=true;V.pgen=prefs;V.pitext="";V.ptargets=null;
    V.pparse=buildMealPlan(S.goals,prefs);
    render();window.scrollTo(0,0);});}
function mealPrefs(){
  var pr=S.prefs;
  return {meals:num(pr.meals)||4,diet:pr.diet||"any",avoid:(pr.avoid||[]).slice(),powder:!!pr.powder,style:pr.fstyle||"egy",variant:0};}
/* The draft becomes a program, the active one, with Undo. Names the library does not
   know join it as the lifter's own exercises, as the plan wrote them. */
function useDraft(){
  var tp=V.tp;if(!tp||!tp.days.length)return;
  var added=newNames(tp);
  added.forEach(function(x){LIB.push([x.n,x.m,"Other",0]);(S.myEx=S.myEx||[]).push({id:"u_"+uid(),n:x.n,m:x.m});});
  var p=makeProgram(programFromDraft(tp,today())),before=S.activeProgram;
  addProgram(p,true);saveDB();
  V.tp=null;V.titext="";
  resetNav();V.tab="train";V.train="days";V.tsec="program";S.prefs.tsec="program";saveDB();render();window.scrollTo(0,0);
  toast(t("{name} is your program now.").replace("{name}",p.name),function(){
    S.programs=(S.programs||[]).filter(function(q){return q.id!==p.id;});
    if(before)S.activeProgram=before;saveDB();render();});
  pcAfter();}

document.addEventListener("click",function(ev){
  /* Named el, not t: t() is the translator, and shadowing it here made every
     translated string inside this handler throw. */
  var el=ev.target.closest("button,[data-close],[data-stop]");
  if(!el)return;
  if(el.matches("button"))tap(el.classList.contains("btn")?"heavy":"light");
  var D=el.dataset;

  /* In the ask dialog a tap that misses the field lowers the keyboard first: on the
     card's blank space, and on the dimmed screen around it, which only closes the
     dialog once nothing is being typed. Closing on that first tap is what made the
     prompt seem to glitch away while someone was only trying to see past the keyboard. */
  var typingAsk=V.sheet==="ask"&&askTyping;askTyping=false;
  if(D.stop!==undefined&&!el.matches("button")){
    if(typingAsk&&ev.target.id!=="askv")document.activeElement.blur();
    return;}
  if(D.close!==undefined){
    if(typingAsk&&!el.matches("button")){document.activeElement.blur();return;}
    requestCloseSheet();return;}
  /* Cancelling the discard prompt has to give the half-typed food back, otherwise
     "Cancel" would throw away exactly what it promised to keep. */
  if(D.restore!==undefined){var kp=(V.sd||{}).back||{};openSheet("manual",kp);return;}
  if(D.askok!==undefined){
    var ao=V.sd||{},av=val("askv");
    if(ao.required!==false&&!String(av).trim()){toast(t("Enter something first."));return;}
    runAct(ao.act,av);return;}
  if(D.confirmok!==undefined){runAct((V.sd||{}).act,true);return;}
  if(D.confirmalt!==undefined){runAct((V.sd||{}).altact,true);return;}
  /* A tab is a change of place, not a step deeper, so it starts a fresh trail. */
  /* A tab tap is a fresh start: the top of the page, and Food on today — a past
     date left selected from earlier was where a meal logged later could land. */
  if(D.tab){resetNav();var same=V.tab===D.tab,top=same&&V.train==="days"&&!V.meal&&!V.smeal&&!V.phist;
    V.tab=D.tab;V.train="days";V.meal=null;V.smeal=null;V.pslot=null;V.pimport=false;V.phist=false;V.dnavDir=0;V.assess=false;V.pcheck=false;
    /* Tapping a tab while already at its top goes back to its first section. */
    if(D.tab==="train"&&top){V.tsec="today";S.prefs.tsec="today";V.tdate=null;saveDB();}
    if(D.tab==="food"&&top){V.fsec="today";S.prefs.fsec="today";V.fdate=null;saveDB();}
    if(D.tab==="progress"&&top)V.ptab="overview";
    if(D.tab==="food"&&!same)V.fdate=null;
    render();if(!same)window.scrollTo(0,0);return;}
  /* Same reset as a tab tap: it is the same kind of move. Without V.train it landed
     on the Train tab still showing whatever sub-view was open, with an empty stack
     behind it — a day view whose back arrow now correctly hides, and nothing to
     return to but the tab bar. */
  if(D.go){resetNav();V.tab=D.go;V.train="days";V.meal=null;V.smeal=null;V.pslot=null;V.pimport=false;V.phist=false;V.assess=false;V.pcheck=false;render();return;}
  /* Food's three sections, remembered as Train's are. */
  if(D.fsec){if(V.sheet)closeSheet();
    /* From another tab (Home's nutrition card, Profile's targets row) it is a change of
       place, so it starts a fresh trail, on today's date. */
    if(V.tab!=="food"){V.fdate=null;V.train="days";}
    if(V.tab!=="food"||V.meal||V.smeal||V.pslot||V.pimport||V.assess||V.pcheck){resetNav();V.meal=null;V.smeal=null;V.pslot=null;V.pimport=false;V.assess=false;V.pcheck=false;}
    V.tab="food";
    V.fsec=D.fsec;S.prefs.fsec=D.fsec;saveDB();render();window.scrollTo(0,0);return;}
  if(D.frange){V.frange=+D.frange;render();return;}
  if(D.reorder){V.reorder=V.reorder===D.reorder?null:D.reorder;render();return;}
  /* Train → Today's recovery check-in: one tap per answer, into today's record. */
  if(D.rchk){var rq=D.rchk.split("|"),rr=dayRec(today());rr[rq[0]]=+rq[1];saveDB();render();
    if(rr.sleep&&rr.sore&&rr.energy)toast(t("Recovery logged."));return;}
  if(D.rchkskip){S.recSkip=today();saveDB();render();return;}
  /* Progress → History, level two; its month steps back from this one. */
  if(D.phist){pushNav();V.phist=true;V.hmonth=0;render();window.scrollTo(0,0);return;}
  if(D.hmonth){V.hmonth=Math.min(0,(+V.hmonth||0)+ +D.hmonth);render();return;}

  /* ---- splits & days */
  /* The Train tab's three sections. Remembered, so the tab opens where you left it. */
  if(D.tsec){if(V.sheet)closeSheet();if(V.tab!=="train"||V.train!=="days"){resetNav();V.train="days";V.meal=null;V.smeal=null;}V.tab="train";
    V.tsec=D.tsec;S.prefs.tsec=D.tsec;saveDB();render();window.scrollTo(0,0);return;}
  if(D.tweek){V.tdate=D.tweek===today()?null:D.tweek;render();return;}
  /* A lighter week: started, put off for a week, or ended early. */
  if(D.deload){
    var dl=S.deload=S.deload||{};
    if(D.deload==="start"){dl.until=addDaysISO(today(),6);dl.last=today();delete dl.snooze;
      toast(t("Lighter week on. Your next workouts have fewer sets and lighter suggestions."));}
    else if(D.deload==="later"){dl.snooze=addDaysISO(today(),7);}
    else if(D.deload==="end"){dl.until=addDaysISO(today(),-1);}
    saveDB();render();return;}
  /* ---- readiness, session effort, pain */
  if(D.ready!==undefined&&S.active){W.setReady(+D.ready);return;}
  if(D.srpe){
    var sw9=V.sd&&sessionById(V.sd.id);if(!sw9)return;
    sw9.srpe=+D.srpe;saveSession(sw9);render();return;}
  if(D.hurt){openSheet("hurt");return;}
  if(D.hurtdo){W.flagPain(D.hurtdo);return;}
  if(D.clearexq){V.exq="";render();topOfResults();var qq=document.getElementById("exq");if(qq)qq.focus();return;}
  if(D.clearfq){if(V.food)V.food.sq="";render();topOfResults();var fq0=document.getElementById("fq");if(fq0)fq0.focus();return;}
  if(D.swapday){openSheet("swapday",{date:D.swapday});return;}
  if(D.swapto!==undefined&&V.sheet==="swapday"){
    var swd=V.sd.date;S.daySwap=S.daySwap||{};
    /* Old swaps are dropped as they pass; only dates still ahead mean anything. */
    Object.keys(S.daySwap).forEach(function(k){if(k<today())delete S.daySwap[k];});
    if(D.swapto)S.daySwap[swd]=D.swapto;else delete S.daySwap[swd];
    saveDB();closeSheet();toast(t("Workout changed"));return;}
  /* From the My Training sheet, a day or the programs list replaces the sheet. */
  if((D.train||D.day)&&V.sheet){V.sheet=null;V.sd=null;}
  if(D.train){pushNav();V.train=D.train;render();return;}
  if(D.day){pushNav();V.dayId=D.day;V.train="day";render();return;}
  /* One meal of the day, on its own screen. */
  if(D.meal){pushNav();V.meal=D.meal;render();return;}
  /* A template asks whether to start on it now (the default) or only add your copy
     to My programs; one of yours asks only whether to switch. */
  if(D.adopt){
    var own=editSplit(D.adopt),pre=own||allSplits().filter(function(x){return x.id===D.adopt;})[0];
    if(!pre)return;
    if(own)askConfirm({title:t("Switch to")+" "+pre.name+"?",
      body:t("It becomes the program you train on. Your other programs and every logged session are kept."),
      cta:t("Make it active"),act:"adopt",data:D.adopt});
    else askConfirm({title:t("Use")+" "+pre.name+"?",
      body:t("You get your own copy to change as you like. Every session you have already logged is kept."),
      cta:t("Use it now"),act:"adopt",data:D.adopt,alt:t("Just add it to My programs"),altact:"addprog"});
    return;}
  if(D.preview){pushNav();V.previewId=D.preview;V.train="preview";render();return;}
  /* ---- the split builder */
  if(D.editsplit){pushNav();V.previewId=D.editsplit;V.train="builder";render();window.scrollTo(0,0);return;}
  if(D.renamesplit){var rs=editSplit(D.renamesplit);if(!rs)return;
    askText({title:t("Rename program"),value:planName(rs.name),act:"renamesplit",data:D.renamesplit});return;}
  if(D.bday!==undefined){var bs=editSplit(builderId());if(!bs)return;
    var nd0=day(t("Day")+" "+(bs.days.length+1),[]);nd0.wd=[];
    /* By weekday, a new day takes the first weekday no other day has. */
    if(bs.schedule==="week"){var used={};bs.days.forEach(function(d){(d.wd||[]).forEach(function(w){used[w]=1;});});
      var fw=spreadWd(bs.days.length+1).concat(weekOrder()).filter(function(w){return !used[w];})[0];if(fw)nd0.wd=[fw];}
    bs.days.push(nd0);saveDB();render();return;}
  if(D.bdays){var bn=editSplit(builderId());if(!bn)return;var want=+D.bdays;
    while(bn.days.length<want){var nd1=day(t("Day")+" "+(bn.days.length+1),[]);nd1.wd=[];bn.days.push(nd1);}
    while(bn.days.length>want&&!bn.days[bn.days.length-1].ex.length)bn.days.pop();
    if(bn.schedule==="week"){var sp1=spreadWd(bn.days.length);bn.days.forEach(function(d,i){d.wd=sp1[i]?[sp1[i]]:[];});}
    saveDB();render();return;}
  /* Weekdays or rotation. Moving to weekdays pins each training day to the weekday it
     is usually trained on (or an even spread); moving back keeps the order. */
  if(D.sched){var sc=editSplit(builderId());if(!sc||sc.schedule===D.sched)return;
    sc.schedule=D.sched==="week"?"week":"cycle";
    if(sc.schedule==="week"){toWeekdays(sc);}
    saveDB();render();
    toast(t(sc.schedule==="week"?"Scheduled by weekday. Tap the weekdays under each day to change them.":"Scheduled in rotation: the next day comes up whenever you train."));return;}
  /* A weekday is one day's at a time: pinning it here takes it from any other day. */
  if(D.wd){var pw=D.wd.split("|"),ws=editSplit(builderId()),wday=ws&&ws.days.filter(function(d){return d.id===pw[0];})[0];
    if(!wday)return;var wn=+pw[1];
    if((wday.wd||[]).indexOf(wn)>=0)wday.wd=wday.wd.filter(function(x){return x!==wn;});
    else{ws.days.forEach(function(d){d.wd=(d.wd||[]).filter(function(x){return x!==wn;});});
      wday.wd=(wday.wd||[]).concat(wn).sort();}
    saveDB();render();return;}
  if(D.wdoffer){var wo=split();S.wdOffered=true;
    if(D.wdoffer==="yes"){wo.schedule="week";toWeekdays(wo);
      toast(t("Now by weekday. Change the days any time in the program."));}
    saveDB();render();return;}
  /* A day's ✕ in the builder: gone at once, with Undo, like an exercise's. */
  if(D.rmday){var rd=editSplit(builderId());if(!rd)return;
    var ri=rd.days.findIndex(function(x){return x.id===D.rmday;});if(ri<0)return;
    var rgone=rd.days.splice(ri,1)[0];saveDB();render();
    toast(rgone.name+" "+t("removed."),function(){var r2=editSplit(builderId())||rd;r2.days.splice(Math.min(ri,r2.days.length),0,rgone);saveDB();render();});
    return;}
  if(D.newsplit){
    askText({title:t("New program"),ph:t("For example, Push / Pull / Legs"),
      cta:t("Create"),act:"newsplit"});return;}
  if(D.addday){
    askText({title:t("Add a day"),ph:t("For example, Chest & Triceps"),
      cta:t("Add"),act:"addday"});return;}
  if(D.renameday){
    var d0=dayOf(D.renameday);if(!d0)return;
    askText({title:t("Rename day"),value:planName(d0.name),
      act:"renameday",data:D.renameday});return;}
  if(D.delday){
    var dD=dayOf(D.delday);
    askConfirm({title:t("Delete")+" "+(dD?dD.name:t("this day"))+"?",icon:"trash",
      body:t("The day is removed from your program. Sessions you already logged are kept."),
      cta:t("Delete the day"),act:"delday",data:D.delday});return;}

  /* ---- exercises */
  /* Opening to add starts from the whole library. The two replace entries below set
     the filters to the exercise being replaced, and without this reset the next add
     inherited them — it always had, but it used to inherit "All", so it never showed. */
  if(D.addex){V.dayId=D.addex;V.exm="All";V.exe="All";V.exq="";openSheet("exercise",{});return;}
  if(D.editex){openSheet("editex",{id:D.editex});return;}
  /* The marker at the end of a long list, if it is ever tapped before it is seen. */
  if(D.more){grow(D.more,+D.step||40);render();return;}
  if(D.exm){V.exm=D.exm;render();topOfResults();return;}
  if(D.exe){V.exe=D.exe;render();topOfResults();return;}
  if(D.cleardiff){V.exd=null;render();return;}
  if(D.exsteps){V.exsteps=!V.exsteps;render();return;}
  if(D.exmiss){V.exmiss=!V.exmiss;render();return;}
  if(D.range){V.range=+D.range;render();return;}
  /* ---- Progress. The view rendered these controls with nothing listening, so its
     tabs never switched and Strength, Body and Nutrition could not be reached. */
  if(D.ptab){V.ptab=D.ptab;render();
    var pt=document.querySelector('[data-ptab="'+D.ptab+'"]');if(pt)pt.focus();
    return;}
  if(D.seeall){V.ptab="strength";render();window.scrollTo(0,0);return;}
  if(D.pall){V.pall=!V.pall;render();return;}
  if(D.phalf){V.phalf=D.phalf;V.pall=false;render();return;}
  /* A lift in the list is charted above it, so bring the chart into view. */
  if(D.chartex){V.chartEx=D.chartex;render();
    var pk=document.querySelector(".pgpick");
    if(pk)pk.scrollIntoView({block:"start",behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});
    return;}
  if(D.photo){openSheet("photo",{id:D.photo});return;}
  if(D.delphoto){
    askConfirm({title:t("Delete this photo?"),icon:"trash",
      body:t("It is removed from this phone. This cannot be undone."),
      cta:t("Delete photo"),act:"delphoto",data:D.delphoto});return;}
  if(D.showall){V.showAll=!V.showAll;render();return;}
  if(D.bwsplit){pushNav();V.train="bodyweight";render();return;}
  if(D.bwcat){pushNav();V.exm=D.bwcat==="All"?"All":D.bwcat;V.exe="Bodyweight";V.exq="";
    V.train="library";render();return;}
  if(D.bwdiff){pushNav();V.exd=D.bwdiff;V.exe="Bodyweight";V.exm="All";V.exq="";V.train="library";render();return;}
  if(D.exdetail){var nm5=D.exdetail;V.exsteps=false;V.exmiss=false;
    /* Opened from inside the sheet (a similar exercise): remember the trail, so back
       returns to the exercise this one was reached from instead of closing. */
    var trail=(V.sheet==="exdetail"&&V.sd&&V.sd.name&&V.sd.name!==nm5)
      ?((V.sd.prev||[]).concat(V.sd.name)).slice(-8):null;
    /* From the Workout complete sheet (a cool-down stretch), back returns to it. */
    var ret5=V.sheet==="done"?{s:"done",d:V.sd}:V.sheet==="exdetail"&&V.sd&&V.sd.ret||null;
    loadInstructions(function(){var o={name:nm5};if(trail)o.prev=trail;if(ret5)o.ret=ret5;openSheet("exdetail",o);});return;}
  if(D.exback!==undefined){
    var tr=(V.sd&&V.sd.prev||[]).slice(),rt=V.sd&&V.sd.ret;
    if(!tr.length){if(rt){openSheet(rt.s,rt.d);return;}requestCloseSheet();return;}
    var back5=tr.pop();V.exsteps=false;V.exmiss=false;
    var o5={name:back5};if(tr.length)o5.prev=tr;if(rt)o5.ret=rt;
    openSheet("exdetail",o5);return;}
  /* Reachable again, from the picker's empty state. It was orphaned when the picker
     was rewritten to read exercises.json: the handler survived, the button did not.
     Custom entries have no illustration, which thumb() already renders gracefully. */
  if(D.customex){
    askText({title:t("Add your own exercise"),value:V.exq||"",
      body:t("It joins your library under the muscle you have filtered to. No illustration, everything else works."),
      cta:t("Add it"),act:"customex",data:{from:V.sd}});return;}
  if(D.pickex){addExercise(D.pickex);return;}
  if(D.replaceex){
    var dR=dayOf(V.dayId),eR2=dR?dR.ex.filter(function(x){return x.id===D.replaceex;})[0]:null;
    /* The frame opens a replacement with the current exercise's muscle already
       selected — "Chest Selected". Ranking alone put like-for-like first but left the
       whole library under it; this starts where the answer almost certainly is, and
       "All" is one tap away. Only a muscle the filter row actually has. */
    V.exm=W.pickMuscle(eR2&&eR2.name);V.exe="All";V.exq="";
    openSheet("exercise",{replace:D.replaceex,like:eR2?eR2.name:null});return;}
  if(D.exint){var ei=editedEx();if(!ei)return;ei.rpe=+D.exint;saveDB();render();return;}
  if(D.exstp){
    var es=editedEx();if(!es)return;
    var stepBy={sets:1,lo:1,hi:1,rest:15,min:5}[D.exstp]||1;
    setExField(es,D.exstp,num(es[D.exstp],0)+stepBy*(+D.d));
    saveDB();render();return;}
  if(D.exincr){
    var ec=editedEx();if(!ec)return;
    var lbU=S.prefs.unit==="lb";
    var steps=lbU?[0,1,2.5,5,10,20].map(function(x){return x/2.2046;}):[0,0.5,1,1.25,2,2.5,4,5,10];
    var cur=num(S.incr[ec.name],0),at=0;
    steps.forEach(function(x,i){if(Math.abs(x-cur)<Math.abs(steps[at]-cur))at=i;});
    at=Math.max(0,Math.min(steps.length-1,at+(+D.exincr)));
    if(steps[at])S.incr[ec.name]=Math.round(steps[at]*1000)/1000;else delete S.incr[ec.name];
    saveDB();render();return;}
  if(D.dbload){S.prefs.dbLoad=S.prefs.dbLoad==="total"?"hand":"total";saveDB();render();return;}
  if(D.saveex){
    var e2=editedEx();
    if(e2)["sets","rest","lo","hi","min","km"].forEach(function(k){
      var f=document.getElementById("e_"+k);if(f)setExField(e2,k,f.value);});
    saveDB();closeSheet();return;}
  if(D.delex){if(V.sheet)closeSheet();removeDayEx(D.delex);return;}
  /* The ✕ on the row: gone at once, with Undo rather than a question. */
  if(D.rmex){removeDayEx(D.rmex);return;}
  if(D.grip)return;

  /* ---- logger */
  if(D.startday){pushNav();startDay(D.startday);return;}
  if(D.continue!==undefined){W.resume();return;}
  /* Moving between exercises: the segments, the arrows either side of them, and the
     list from the title all slide the new one in from the side it lies on. */
  /* The warm-up: done, skipped, brought back from the ⋯ menu; its ticks and timers,
     and the cool-down's on the complete sheet. */
  if(D.wugo||D.wuskip){if(S.active){S.active.warm=D.wugo?1:0;stopHold();saveDB();window.scrollTo(0,0);render();}return;}
  if(D.wuopen){if(S.active){S.active.warm="open";closeSheet();window.scrollTo(0,0);}return;}
  if(D.wutick!==undefined){var wa=S.active;if(wa){wa.wuDone=wa.wuDone||{};
    if(wa.wuDone[D.wutick])delete wa.wuDone[D.wutick];else wa.wuDone[D.wutick]=1;saveDB();render();}return;}
  if(D.cdtick!==undefined){V.cdDone=V.cdDone||{};
    if(V.cdDone[D.cdtick])delete V.cdDone[D.cdtick];else V.cdDone[D.cdtick]=1;render();return;}
  if(D.hold){var hk=D.hold,hn=D.holdn;
    if(holding(hk)){stopHold();render();return;}
    startHold(hk,+D.secs||30,D.side==="1",function(){
      if(hk.indexOf("cd")===0){V.cdDone=V.cdDone||{};V.cdDone[hn]=1;}
      else if(S.active){S.active.wuDone=S.active.wuDone||{};S.active.wuDone[hn]=1;saveDB();}
      render();});
    return;}
  if((D.jump!==undefined||D.exnav!==undefined||D.jumpl!==undefined)&&S.active&&warmShown(S.active)){
    S.active.warm=S.active.warm==="open"?1:0;stopHold();}
  if(D.jump!==undefined){var jF=+D.jump-V.logIdx;W.jumpTo(+D.jump);if(jF)enterEx(fromOf(jF));return;}
  if(D.exnav!==undefined){var nS=+D.exnav,nT=V.logIdx+nS;if(S.active&&nT>=0&&nT<S.active.entries.length){W.jumpTo(nT);enterEx(fromOf(nS));}return;}
  if(D.exlist!==undefined){openSheet("exlist");return;}
  if(D.jumpl!==undefined){closeSheet();W.jumpTo(+D.jumpl);return;}
  if(D.stp){
    var id=D.stp,d1=parseFloat(D.d);
    var cur=id==="bw"?(V.draft.bw!=null?V.draft.bw:toDisp(lastWeight()||86))
           :id==="st"?(V.draft.st||dayRec().steps||0):V.draft[id];
    var min=id==="w"?0:id==="rpe"?1:id==="st"?0:1;
    var max=id==="rpe"?10:1e6;
    V.draft[id]=Math.min(max,Math.max(min,r1(num(cur)+d1)));
    render();return;}
  if(D.rpe){V.draft.rpe=+D.rpe;render();return;}
  /* ---- cardio and sports: one bout of time and effort */
  if(D.actint){V.draft.rpe=+D.actint;render();return;}
  if(D.logact){W.logBout();return;}
  if(D.activ){V.actIv=true;render();var ivf=document.getElementById("in_ivn");if(ivf)ivf.focus();return;}
  if(D.quickact){V.sheet=null;V.sd=null;startActivity(D.quickact);return;}
  if(D.actsheet){openSheet("acts");return;}
  if(D.logset){W.logSet();return;}
  if(D.delset!==undefined){W.removeRow(+D.delset);return;}
  if(D.unlog!==undefined){W.unlogSet(+D.unlog);return;}
  if(D.addrow){W.addRow();return;}
  if(D.rest){W.restControl(D.rest);return;}
  if(D.swap){
    var eS=S.active.entries[V.logIdx];
    V.exm=W.pickMuscle(eS&&eS.name);V.exe="All";V.exq="";
    openSheet("exercise",{swaplive:true,like:eS?eS.name:null});return;}
  if(D.nextex){W.nextExercise();return;}
  if(D.rmlive){W.removeExercise();return;}
  /* Added to this workout only: the picker starts from the whole library. */
  if(D.addlive){V.exm="All";V.exe="All";V.exq="";openSheet("exercise",{addlive:true});return;}
  if(D.sessmore!==undefined){openSheet("sessmore");return;}
  if(D.finish){W.confirmFinish();return;}
  /* Every back affordance in the app comes through here, so none of them can drift
     to a destination of its own. Discarding a session is now part of going back
     rather than a separate link. */
  if(D.back!==undefined){goBack();return;}
  if(D.discard!==undefined){W.askDiscard();return;}

  /* ---- daily logs */
  if(D.water){
    /* Home writes to today explicitly; Food writes to the date it is browsing. */
    var r2=dayRec(D.wdate||curDate());r2.water=Math.max(0,r2.water+ +D.water);saveDB();render();return;}
  /* A tapped glass sets the day outright, so the glass that filled also empties it. */
  if(D.wset!==undefined){
    dayRec(curDate()).water=Math.max(0,+D.wset);saveDB();render();return;}
  if(D.sheet){openSheet(D.sheet);return;}
  if(D.saveweight){
    /* Back to kilograms before it touches storage. */
    var w2=V.draft.bw!=null?toKg(V.draft.bw):(lastWeight()||86);
    var ex0=S.body.filter(function(b){return b.date===today();})[0];
    if(ex0)ex0.weight=w2;else S.body.push({date:today(),weight:w2});
    S.body.sort(function(a,b){return a.date<b.date?-1:1;});
    V.draft.bw=null;saveDB();closeSheet();toast(t("Weight saved."));return;}
  if(D.savesteps){
    dayRec().steps=V.draft.st||0;V.draft.st=null;saveDB();closeSheet();return;}
  if(D.saverec){
    var r3=dayRec();r3.sleep=num(val("r_sleep"));r3.sore=num(val("r_sore"));
    r3.energy=num(val("r_energy"));r3.ankle=num(val("r_ankle"));r3.notes=val("r_notes");
    saveDB();closeSheet();return;}
  if(D.savemeasure){
    var rec={date:today()};
    [["m_chest","chest"],["m_waist","waist"],["m_hips","hips"],["m_arms","arms"],["m_thighs","thighs"],
     ["m_calves","calves"],["m_neck","neck"],["m_bf","bf"]].forEach(function(m){
      var v=num(val(m[0]));if(v>0)rec[m[1]]=v;});
    /* A percentage, not a tape reading: anything outside 2–70 is a typo. */
    if(rec.bf&&(rec.bf<2||rec.bf>70)){toast(t("Body fat should be a percentage between 2 and 70."));return;}
    if(Object.keys(rec).length<2){toast(t("Enter at least one measurement."));return;}
    var e5=S.body.filter(function(b){return b.date===today();})[0];
    if(e5)Object.assign(e5,rec);else S.body.push(rec);
    S.body.sort(function(a,b){return a.date<b.date?-1:1;});
    saveDB();closeSheet();toast(t("Measurements saved."));return;}

  /* ---------------- food ---------------- */
  if(D.addfood){
    loadFoods(function(){
      V.food={mode:"search",tab:"search",sq:"",q:"",items:null,edit:-1};
      openSheet("addfood",{meal:D.addfood});});
    return;}
  if(D.parse){
    var q6=val("nlq").trim();
    if(!q6){toast(t("Type what you ate first."));return;}
    /* Updated in place. This used to replace V.food outright, which was harmless while
       it held nothing else; it now holds the mode and the search tab as well. */
    V.food.q=q6;V.food.items=parseFoodInput(q6).map(resolveItem);V.food.mode="quick";
    V.food.edit=-1;V.food.busy=false;V.food.offline=false;V.food.noresult=false;
    render();return;}
  /* ---- the add-food sheet's own navigation */
  if(D.fmode){V.food.mode=D.fmode;render();return;}
  if(D.fback!==undefined){V.food.mode=(V.food.pick&&V.food.pick.from)||"search";render();return;}
  if(D.ftab){V.food.tab=D.ftab;render();return;}
  if(D.fpick||D.fpickoff!==undefined){
    var fp=D.fpick?(S.myFoods||[]).concat(FOODDB||[]).filter(function(x){return x.id===D.fpick;})[0]
                  :(V.food.off&&V.food.off.list[+D.fpickoff]);
    if(!fp)return;
    /* u/amt: a measure picked from the chooser (ml, L, oz…) and the amount in it.
       Null means the amount is a count of the serving at si. */
    V.food.pick={food:fp,si:0,n:1,u:null,amt:null,more:false,
                 from:V.food.mode==="detail"?"search":V.food.mode};
    V.food.mode="detail";render();return;}
  /* Whole servings, with a half below one — "3 eggs" is two taps, not five. A
     measure steps by its own unit's step instead: 50 ml, a quarter litre. */
  if(D.fcount){
    var pk=V.food.pick;if(!pk)return;
    var up=+D.fcount>0;
    if(pk.u){
      var stp=UNIT_STEP[pk.u];
      pk.amt=Math.max(stp,roundUnit(pk.u,(up?Math.floor:Math.ceil)(pk.amt/stp+(up?1e-9:-1e-9))*stp+(up?stp:-stp)));
    }else pk.n=up?(pk.n<1?1:pk.n+1):(pk.n>1?pk.n-1:0.5);
    render();return;}
  if(D.fmore!==undefined){V.food.pick.more=!V.food.pick.more;render();return;}
  if(D.faddpick!==undefined){
    var pk2=V.food.pick,am2=pickAmount(pk2);
    if(!(am2.g>0)){toast(t("Enter an amount first."));return;}
    logFood(pk2.food,am2.g,am2.label);return;}
  if(D.fadd1off!==undefined){
    var fo=V.food.off&&V.food.off.list[+D.fadd1off];if(!fo)return;
    var so=servs(fo)[0];logFood(fo,so[1],"1 × "+so[0]);return;}
  if(D.fedit!==undefined){V.food.edit=V.food.edit===+D.fedit?-1:+D.fedit;render();return;}
  /* Puts the cursor on the phrase that was not understood, so more can be typed about
     it and the whole line parsed again. */
  if(D.adddetail!==undefined){
    var ta=document.getElementById("nlq");if(!ta)return;
    var at=ta.value.indexOf(D.adddetail);
    ta.focus();
    if(at>=0)ta.setSelectionRange(at+D.adddetail.length,at+D.adddetail.length);
    toast(t("Add the brand, a serving size or what is in it, then Find it again."));
    return;}
  /* Open Food Facts from the search screen: its results list beside the local ones.
     The Quick Add screen has its own path (data-online), which slots a result into the
     parsed meal instead. */
  if(D.offq!==undefined){
    var oq=(V.food.sq||"").trim();if(!oq)return;
    V.food.offBusy=true;V.food.offFail=false;render();
    offSearch(oq,function(found,failed){
      V.food.offBusy=false;
      if(failed)V.food.offFail=true;
      else V.food.off={q:oq,list:found||[]};
      render();});
    return;}
  if(D.bc){onBarcode(D.bc);return;}
  if(D.fbackadd!==undefined){openSheet("addfood",{meal:(V.sd&&V.sd.meal)||mealNow()});return;}
  if(D.qty){
    /* A step this worked out and then never used: every tap moved the amount by one,
       so "300 ml milk" went to 301 ml and "200g chicken" to 201 g. A measure now
       steps by its unit's own step; a count steps as the servings screen does. */
    var pr6=D.qty.split("|"),it6=V.food.items[+pr6[0]];if(!it6)return;
    var k6=unitKey(it6.parsed.unit),dir6=+pr6[1];
    var cur6=it6.parsed.qty==null?1:it6.parsed.qty;
    if(isMeasure(k6)){
      var st6=UNIT_STEP[k6];
      it6.parsed.qty=Math.max(st6,roundUnit(k6,(dir6>0?Math.floor:Math.ceil)(cur6/st6+(dir6>0?1e-9:-1e-9))*st6+dir6*st6));
    }else it6.parsed.qty=dir6>0?(cur6<1?1:cur6+1):(cur6>1?cur6-1:0.5);
    recalcItem(it6);render();return;}
  if(D.gram){
    /* In the unit the item is measured in: a drink typed as 330 ml is corrected in
       millilitres, not converted to grams first. */
    var it7=V.food.items[+D.gram];if(!it7)return;
    var k7=unitKey(it7.parsed&&it7.parsed.unit);
    if(isMeasure(k7)&&k7!=="g"){
      askText({title:it7.name,label:t(unitLabel(k7,2)),numeric:true,
        value:it7.parsed.qty,cta:t("Set amount"),
        act:"grams",data:{idx:+D.gram,meal:V.sd&&V.sd.meal,unit:k7}});return;}
    askText({title:it7.name,label:t("Grams"),numeric:true,
      value:Math.round(it7.grams),cta:t("Set grams"),
      act:"grams",data:{idx:+D.gram,meal:V.sd&&V.sd.meal}});return;}
  /* The meal rides along. openSheet replaces the sheet's data, so "Change" used to
     drop the meal the user had picked, and the add went wherever the default fell. */
  if(D.swapfood){openSheet("pickfood",{idx:+D.swapfood,meal:V.sd&&V.sd.meal});return;}
  if(D.choose){
    var pr8=D.choose.split("|"),it8=V.food.items[+pr8[0]];
    it8.food=it8.alts[+pr8[1]]; it8.name=it8.food.n; it8.src=it8.food.src||"db";
    it8.status="ok"; recalcItem(it8);
    V.sheet="addfood"; render();return;}
  if(D.dropitem){
    /* Same rule as a deleted set: play it out, then remove it. */
    var di=+D.dropitem;
    leave(document.querySelector('#sheet [data-k="fi:'+di+'"]'),function(){
      V.food.items.splice(di,1);
      /* The open editor follows its item: removing one above it shifts it up one. */
      if(V.food.edit===di)V.food.edit=-1; else if(V.food.edit>di)V.food.edit--;
      render();});
    return;}
  if(D.online){
    var q9=D.online;
    /* "Search online instead" is on the Which-one sheet, where the result would have
       landed out of sight behind it. The meal is already on V.sd: it was carried in. */
    if(V.sheet==="pickfood")V.sheet="addfood";
    V.food.mode="quick";V.food.busy=true;render();
    offSearch(q9,function(found,failed){
      V.food.busy=false;
      V.food.offline=false;V.food.noresult=false;
      if(failed){V.food.offline=q9;render();
        toast(t("Could not reach the food database."));return;}
      if(!found.length){V.food.noresult=q9;render();
        toast(t("Nothing found online for that."));return;}
      var f9=found[0];
      var g9=gramsFor(f9,100,"g");
      var newItem={status:"ok",parsed:{raw:q9,query:q9,qty:100,unit:"g"},
        food:f9,alts:found,grams:100,label:"100 g",src:"off",n:nutritionFor(f9,100),name:f9.n};
      var idx9=-1;
      V.food.items.forEach(function(x,i){if(x.status==="unknown"&&x.parsed.query===q9)idx9=i;});
      if(idx9>=0)V.food.items[idx9]=newItem; else V.food.items.push(newItem);
      render();});
    return;}
  /* ---- barcodes: scanning and typing land in the same place */
  if(D.scan){
    startScan(onBarcode,function(why){
      toast(why==="denied"?t("Camera access was refused. Enter the barcode instead.")
           :why==="nocamera"?t("No camera found. Enter the barcode instead.")
           :why==="decoder"?t("The scanner could not be loaded. Enter the barcode instead.")
           :t("Scanning is not available here. Enter the barcode instead."));
      if(why!=="denied")openBarcodePrompt();
    },{hint:t("Hold the barcode inside the frame"),cancel:t("Cancel"),
       loading:t("Starting the scanner…")});
    return;}
  if(D.typecode){openBarcodePrompt();return;}
  if(D.manual!==undefined){
    openSheet("manual",{name:D.manual||"",bc:(V.sd&&V.sd.bc)||"",meal:(V.sd&&V.sd.meal)||mealNow()});
    return;}
  if(D.savemanual||D.savemyfood){
    var nm9=val("mf_n").trim()||t("Manual entry");
    var sv9=val("mf_s").trim()||t("1 serving");
    var p9=num(val("mf_p")),c9=num(val("mf_c")),f9b=num(val("mf_f"));
    var k9=num(val("mf_k"))||macroKcal(p9,c9,f9b);
    if(!k9&&!p9&&!c9&&!f9b){toast(t("Enter at least one number."));return;}
    var item9={fid:"manual_"+uid(),n:nm9,label:sv9,grams:0,src:"you",
      kcal:k9,p:p9,c:c9,f:f9b,fib:0};
    /* The switch decides. data-savemyfood is the old second button's name, still
       honoured in case anything outside this sheet sends it. */
    var keep9=D.savemyfood||(document.getElementById("mf_save")||{}).checked;
    if(keep9){
      /* Carrying the barcode through means the next scan of this packet resolves
         locally, with no network and no second trip through manual entry. */
      var bc9=normBarcode((V.sd&&V.sd.bc)||"");
      /* The serving the user named becomes the food's own serving, so the next time
         it is logged from Custom it reads "1 × 1 bowl", not "1 × 1 serving". */
      S.myFoods.push({id:"my_"+uid(),n:nm9,cat:"My Foods",per:100,
        kcal:k9,p:p9,c:c9,f:f9b,fib:0,s:[[sv9,100]],a:[],src:"you",
        bc:bc9||undefined});}
    var mm9=(V.sd&&V.sd.meal)||mealNow();
    var at9=addTo(mm9,[item9]);
    closeSheet();V.tab="food";render();play("set");
    toast(nm9+" "+t("added to")+" "+at9+".");return;}
  if(D.commit){
    /* The meal is the one in the sheet's header. There used to be a second chooser
       at the foot, which could disagree with it. */
    var meal9=(V.sd&&V.sd.meal)||mealNow();
    var good9=V.food.items.filter(function(i){return i.status!=="unknown"&&i.status!=="suggest";});
    if(!good9.length){toast(t("Nothing to add yet."));return;}
    var at10=addTo(meal9,good9.map(toLogItem));
    closeSheet();V.tab="food";render();
    play("set");toast(at10+" "+t("updated."));return;}
  if(D.savemeal){
    askText({title:t("Save this as a meal"),value:t("My meal"),
      body:t("It goes into Saved meals so you can log the whole thing in one tap."),
      cta:t("Save"),act:"savemeal",data:{meal:V.sd&&V.sd.meal}});return;}
  /* A saved meal, logged whole: from My Foods, its own screen, or the sheet's Meals
     tab (which logs into the sheet's meal and closes it). */
  if(D.addsaved){
    var sm=savedById(D.addsaved)||(S.savedMeals||[])[+D.addsaved];
    if(!sm||!(sm.items||[]).length)return;
    var ms=(V.sheet==="addfood"&&V.sd&&V.sd.meal)||mealNow();
    /* From My Foods, where no date is on screen, it is today's. */
    var atS=addTo(ms,JSON.parse(JSON.stringify(sm.items)),V.sheet?null:today());
    if(V.sheet)closeSheet();
    render();play("set");toast(sm.name+" "+t("added to")+" "+atS+".");return;}
  /* ---- Food → Plan: the day's meals and their plans */
  if(D.mstyle){
    if(D.mstyle===mealStyle())return;
    var keepS=JSON.parse(JSON.stringify(mealSlots()));
    setStyle(D.mstyle);V.reorder=null;saveDB();render();
    toast(t(D.mstyle==="named"?"Meals are named.":"Meals are numbered."),function(){S.mealSlots=keepS;saveDB();render();});return;}
  if(D.pslot){pushNav();V.pslot=D.pslot;render();window.scrollTo(0,0);return;}
  if(D.paddslot){askText({title:t("Add a meal"),ph:t("For example, Pre-workout"),
    body:t("Leave it blank and it is numbered by its place in the day."),required:false,cta:t("Add"),act:"addslot"});return;}
  if(D.prename){var rsl=slotOf(D.prename);if(!rsl)return;
    askText({title:t("Rename meal"),value:mealName(rsl.id),required:false,
      body:t("Leave it blank to go back to its usual name."),act:"renameslot",data:rsl.id});return;}
  /* ✕ on a meal: gone at once, with Undo. What was logged under it stays in the log
     and still shows on the days it was logged. One meal always stays. */
  if(D.rmslot){
    var sl2=ownSlots(),ri3=sl2.findIndex(function(x){return x.id===D.rmslot;});if(ri3<0)return;
    if(sl2.length<2){toast(t("A day needs at least one meal."));return;}
    var goneS=sl2.splice(ri3,1)[0],nmS=mealName(goneS.id);
    if(V.pslot===goneS.id){goBack();V.pslot=null;}
    saveDB();render();
    toast(nmS+" "+t("removed."),function(){ownSlots().splice(Math.min(ri3,ownSlots().length),0,goneS);saveDB();render();});return;}
  if(D.padd){var pa=D.padd;
    loadFoods(function(){
      V.food={mode:"search",tab:"search",sq:"",q:"",items:null,edit:-1};
      openSheet("addfood",{meal:pa,plan:pa});});
    return;}
  /* A line of an imported plan that matched nothing: the search opens with it typed. */
  if(D.pfind){var pf=D.pfind.split("|"),pfs=slotOf(pf[0]),raw=pfs&&(pfs.todo||[])[+pf[1]];if(!raw)return;
    loadFoods(function(){
      V.food={mode:"search",tab:"search",sq:raw,q:"",items:null,edit:-1};
      openSheet("addfood",{meal:pf[0],plan:pf[0],todo:+pf[1]});});
    return;}
  if(D.prmitem||D.pdrop){
    var key=D.prmitem?"plan":"todo",pr=(D.prmitem||D.pdrop).split("|"),ps=ownSlot(pr[0]);if(!ps||!ps[key])return;
    var pi2=+pr[1],goneP=ps[key].splice(pi2,1)[0];if(goneP==null)return;
    if(!ps[key].length)delete ps[key];
    saveDB();render();
    toast((goneP.n||goneP)+" "+t("removed."),function(){
      var o2=ownSlot(pr[0]);if(!o2)return;(o2[key]=o2[key]||[]).splice(Math.min(pi2,o2[key].length),0,goneP);saveDB();render();});return;}
  /* The plan, logged: one meal from its own screen or the meal on Today; the whole
     day from Plan, into each meal not yet logged so nothing is counted twice. */
  if(D.logplan){
    var lp=planOf(D.logplan);if(!lp.length)return;
    var dL=V.pslot?today():curDate();
    addItems(D.logplan,JSON.parse(JSON.stringify(lp)),dL);render();play("set");
    toast(mealName(D.logplan)+" "+t("logged as planned."));return;}
  if(D.logday){
    var rL=dayRec(today()),nL=0;
    mealSlots().forEach(function(x){
      if(!(x.plan||[]).length||((rL.meals[x.id]||{}).items||[]).length)return;
      addItems(x.id,JSON.parse(JSON.stringify(x.plan)),today());nL++;});
    render();
    if(nL){play("set");toast(t(nL===1?"1 meal logged from your plan.":"{n} meals logged from your plan.").replace("{n}",nL));}
    else toast(t("Every planned meal is already logged today."));return;}
  /* ---- a training program, imported (js/ui/views/timport.js) */
  if(D.timport){pushNav();V.tab="train";V.train="import";V.tp=null;V.tierr="";render();window.scrollTo(0,0);return;}
  if(D.tiread){var tt=val("ti_text");V.titext=tt;
    if(!tt.trim()){toast(t("Paste your program first."));return;}
    readTraining(tt);return;}
  if(D.tirestart){V.tp=null;V.tierr="";render();window.scrollTo(0,0);return;}
  if(D.tiex){var tx=D.tiex.split("|"),tdy=V.tp&&V.tp.days[+tx[0]],te=tdy&&tdy.ex[+tx[1]];if(!te)return;
    openSheet("tiex",{d:+tx[0],j:+tx[1],e:JSON.parse(JSON.stringify(te))});return;}
  if(D.titgl){tieRead();var tg2=V.sd&&V.sd.e;if(!tg2)return;
    tg2[D.titgl]=!tg2[D.titgl];
    /* Switching between reps and seconds carries a sensible figure across. */
    if(D.titgl==="timed"){if(tg2.timed&&tg2.lo<15){tg2.lo=30;tg2.hi=45;}else if(!tg2.timed&&tg2.lo>=20){tg2.lo=8;tg2.hi=12;}}
    if(D.titgl==="amrap"&&!tg2.amrap&&!tg2.lo){tg2.lo=8;tg2.hi=12;}
    render();return;}
  if(D.tiswap){tieRead();var sw0=V.sd;if(!sw0||!sw0.e)return;
    V.exm=sw0.e.name?W.pickMuscle(sw0.e.name):"All";V.exe="All";V.exq=sw0.e.name?"":(sw0.e.raw||"");
    openSheet("exercise",{timp:{d:sw0.d,j:sw0.j,e:sw0.e}});return;}
  if(D.tiexsave){tieRead();var sv0=V.sd,dS=sv0&&V.tp&&V.tp.days[sv0.d];
    if(dS&&dS.ex[sv0.j])dS.ex[sv0.j]=sv0.e;
    closeSheet();return;}
  if(D.tiexrm){var sr0=V.sd,dR0=sr0&&V.tp&&V.tp.days[sr0.d];if(!dR0)return;
    var goneE=dR0.ex.splice(sr0.j,1)[0];closeSheet();
    toast(t("Removed from the day."),function(){dR0.ex.splice(Math.min(sr0.j,dR0.ex.length),0,goneE);render();});return;}
  if(D.tiadd!==undefined&&V.tp){V.exm="All";V.exe="All";V.exq="";openSheet("exercise",{timp:{d:+D.tiadd}});return;}
  if(D.tirmday!==undefined&&V.tp){var rdi=+D.tirmday,gd=V.tp.days.splice(rdi,1)[0];if(!gd)return;render();
    toast(gd.name+" "+t("removed."),function(){V.tp.days.splice(Math.min(rdi,V.tp.days.length),0,gd);render();});return;}
  if(D.tirmact!==undefined&&V.tp){var rai=+D.tirmact,ga=(V.tp.acts||[]).splice(rai,1)[0];if(!ga)return;render();
    toast(exName(ga.name)+" "+t("removed."),function(){V.tp.acts.splice(Math.min(rai,V.tp.acts.length),0,ga);render();});return;}
  if(D.tiuse){useDraft();return;}
  /* The plan's other choice for this exercise, before anything is logged on it. */
  if(D.swapalt&&S.active){var ea=S.active.entries[V.logIdx];if(!ea||!ea.alt||ea.sets.length)return;
    swapAlt(ea.alt,V.logIdx,ea.name);return;}
  if(D.pimport){pushNav();V.pimport=true;V.pparse=null;V.pgen=null;render();window.scrollTo(0,0);return;}
  /* ---- editing the diet plan draft before it is used */
  if(D.pirm||D.pidrop){
    var pk=D.pirm?"items":"todo",pa2=(D.pirm||D.pidrop).split("|"),pmd=V.pparse&&V.pparse[+pa2[0]];if(!pmd)return;
    var pj=+pa2[1],gonePI=pmd[pk].splice(pj,1)[0];if(gonePI==null)return;render();
    toast((gonePI.n||gonePI)+" "+t("removed."),function(){pmd[pk].splice(Math.min(pj,pmd[pk].length),0,gonePI);render();});return;}
  if(D.pmrm!==undefined&&V.pparse){var pmi=+D.pmrm,goneM=V.pparse.splice(pmi,1)[0];if(!goneM)return;render();
    toast(importName(goneM,pmi)+" "+t("removed."),function(){V.pparse.splice(Math.min(pmi,V.pparse.length),0,goneM);render();});return;}
  if(D.pigram){var pg=D.pigram.split("|"),pmg=V.pparse&&V.pparse[+pg[0]],itg=pmg&&pmg.items[+pg[1]];if(!itg)return;
    askText({title:itg.n,label:t("Grams"),numeric:true,value:itg.grams||"",cta:t("Save"),act:"pigrams",data:{m:+pg[0],i:+pg[1]}});return;}
  if(D.pifind||D.piadd!==undefined){
    var pfa=D.pifind?D.pifind.split("|"):[D.piadd],pmf=V.pparse&&V.pparse[+pfa[0]];if(!pmf)return;
    var rawF=D.pifind?pmf.todo[+pfa[1]]:"";if(D.pifind&&!rawF)return;
    loadFoods(function(){
      V.food={mode:"search",tab:"search",sq:rawF||"",q:"",items:null,edit:-1};
      openSheet("addfood",{pimp:+pfa[0],ptodo:D.pifind?+pfa[1]:null,pname:importName(pmf,+pfa[0])});});
    return;}
  if(D.papplyt!==undefined){V.papplyT=V.papplyT===false;render();return;}
  if(D.pread){
    var txt=val("pi_text");V.pitext=txt;
    if(!txt.trim()){toast(t("Paste your plan first."));return;}
    loadFoods(function(){V.pparse=withNotes(parsePlan(txt));render();
      var res=document.querySelector(".picard");if(res)res.scrollIntoView({behavior:"smooth",block:"start"});});
    return;}
  if(D.puse){
    var pp=V.pparse;if(!pp||!pp.length)return;
    var before=JSON.parse(JSON.stringify(mealSlots())),used={};
    var goalsBefore=JSON.parse(JSON.stringify(S.goals||{})),tg=V.ptargets;
    S.mealSlots=pp.map(function(m,i){
      var x={};
      /* Renamed on the review screen: its own meal, by that name. */
      if(m.custom){x.id="m_"+uid();x.name=m.custom;}
      else if(m.named&&!used[m.named]){x.id=m.named;used[m.named]=1;}
      else{x.id="m_"+uid();var nm=importName(m,i);
        /* A numbered meal out of place (Meal 3 after a snack) keeps its number by name. */
        if(m.named||(!m.n&&m.name)||(m.n&&m.n!==i+1))x.name=nm;}
      if(m.items.length)x.plan=m.items;
      if(m.todo.length)x.todo=m.todo;
      return x;});
    /* The targets a PDF set, unless the switch was turned off. */
    var tSet=0;
    if(tg&&V.papplyT!==false)["kcal","p","c","f","water","steps"].forEach(function(k){
      if(tg[k]>0){S.goals[k]=tg[k];tSet++;}});
    V.pparse=null;V.pitext="";V.reorder=null;V.ptargets=null;V.psupps=null;V.pgen=null;saveDB();
    goBack();V.pimport=false;V.fsec="plan";S.prefs.fsec="plan";render();window.scrollTo(0,0);
    toast(t(tSet?"Your plan and its daily targets are in.":"Your plan is in."),function(){S.mealSlots=before;S.goals=goalsBefore;saveDB();render();});
    pcAfter();return;}
  /* ---- My Foods */
  if(D.smeal){pushNav();V.smeal=D.smeal;render();window.scrollTo(0,0);return;}
  if(D.newmeal){askText({title:t("New meal"),ph:t("For example, Ful breakfast"),act:"newmeal"});return;}
  if(D.renamemeal){var rm=savedById(D.renamemeal);if(!rm)return;
    askText({title:t("Rename meal"),value:rm.name,act:"renamemeal",data:D.renamemeal});return;}
  if(D.delsaved){var dm=savedById(D.delsaved);if(!dm)return;
    askConfirm({title:t("Delete")+" "+dm.name+"?",icon:"trash",
      body:t("The saved meal is removed. Anything you already logged with it stays in your log."),
      cta:t("Delete the meal"),act:"delsaved",data:D.delsaved});return;}
  /* ✕ on a row: gone at once, with Undo, like a day or an exercise. What was already
     logged keeps its own numbers, so nothing in the log changes. */
  if(D.rmsaved){var ri2=(S.savedMeals||[]).findIndex(function(x){return x.id===D.rmsaved;});if(ri2<0)return;
    var gone2=S.savedMeals.splice(ri2,1)[0];saveDB();render();
    toast(gone2.name+" "+t("removed."),function(){S.savedMeals.splice(Math.min(ri2,S.savedMeals.length),0,gone2);saveDB();render();});return;}
  if(D.rmmyfood){var fi2=(S.myFoods||[]).findIndex(function(x){return x.id===D.rmmyfood;});if(fi2<0)return;
    var goneF=S.myFoods.splice(fi2,1)[0];saveDB();render();
    toast(goneF.n+" "+t("removed."),function(){S.myFoods.splice(Math.min(fi2,S.myFoods.length),0,goneF);saveDB();render();});return;}
  if(D.rmsmitem){var pi=D.rmsmitem.split("|"),smI=savedById(pi[0]);if(!smI)return;
    var ii=+pi[1],goneI=smI.items.splice(ii,1)[0];if(!goneI)return;saveDB();render();
    toast(goneI.n+" "+t("removed."),function(){smI.items.splice(Math.min(ii,smI.items.length),0,goneI);saveDB();render();});return;}
  if(D.smadd){var sa=D.smadd;
    loadFoods(function(){
      V.food={mode:"search",tab:"search",sq:"",q:"",items:null,edit:-1};
      openSheet("addfood",{meal:mealNow(),into:sa});});
    return;}
  if(D.myfood){openSheet("myfood",{id:D.myfood});return;}
  if(D.savemyfoodx){
    var nmX=val("mf_n").trim();if(!nmX){toast(t("Give it a name first."));return;}
    var fx=D.savemyfoodx==="new"?null:(S.myFoods||[]).filter(function(x){return x.id===D.savemyfoodx;})[0];
    var svX=val("mf_s").trim()||t("1 serving");
    var rec={n:nmX,p:Math.max(0,r1(num(val("mf_p")))),c:Math.max(0,r1(num(val("mf_c")))),f:Math.max(0,r1(num(val("mf_f"))))};
    /* Blank calories are worked out from the macros, as manual entry does. */
    rec.kcal=String(val("mf_k")).trim()===""?macroKcal(rec.p,rec.c,rec.f):Math.max(0,Math.round(num(val("mf_k"))));
    if(fx){Object.assign(fx,rec);fx.s=[[svX,100]];}
    else S.myFoods.push(Object.assign({id:"my_"+uid(),cat:"My Foods",per:100,fib:0,s:[[svX,100]],a:[],src:"you"},rec));
    saveDB();closeSheet();render();toast(nmX+" "+t("saved."));return;}
  if(D.usesug){
    var mS=macroTargets();
    S.goals.kcal=mS.kcal;S.goals.p=mS.p;S.goals.f=mS.f;S.goals.c=mS.c;
    saveDB();render();toast(t("Targets updated."));return;}
  /* A frequent-food pill on the dashboard, or the + beside a result in the sheet.
     Both used to go to Snack whatever the meal — including from a sheet opened for
     Breakfast. logFood takes the sheet's meal, or the time of day's without one. */
  if(D.quickfood){
    var f10=(S.myFoods||[]).concat(FOODDB||[]).filter(function(x){return x.id===D.quickfood;})[0];
    if(!f10)return;
    var gq=gramsFor(f10,1,null);
    logFood(f10,gq.g,gq.label);return;}
  if(D.edititem){
    var prE=D.edititem.split("|"),rE=dayRec(curDate()),mE=rE.meals[prE[0]];
    if(!mE)return;
    var itE=mE.items[+prE[1]];
    if(!itE)return;
    askText({title:itE.n,label:t("Grams"),numeric:true,value:Math.round(itE.grams||0),
      body:t("Everything recalculates from the amount."),cta:t("Save"),act:"editgrams",
      data:{meal:prE[0],idx:+prE[1],date:curDate()}});return;}
  if(D.dropfood){
    var prF=D.dropfood.split("|"),dF=curDate(),mF=dayRec(dF).meals[prF[0]];
    if(!mF)return;
    var iF=+prF[1],itF=mF.items[iF];
    if(!itF)return;
    mF.items.splice(iF,1);saveDB();render();
    toast(itF.n+" "+t("removed"),function(){
      var m2=dayRec(dF).meals[prF[0]];
      if(!m2)return;
      m2.items.splice(Math.min(iF,m2.items.length),0,itF);
      saveDB();render();});
    return;}







  /* ---- profile */
  if(D.calc){
    var p3=S.profile;
    p3.age=num(val("p_age"),p3.age);p3.height=num(val("p_height"),p3.height);
    p3.sex=val("p_sex");p3.activity=num(val("p_act"),1.4);p3.goal=val("p_goal");
    p3.weight=toKg(num(val("p_weight"),toDisp(p3.weight)));
    if(p3.weight&&!S.body.some(function(b3){return b3.date===today();}))
      S.body.push({date:today(),weight:p3.weight});
    var m3=macroTargets();
    S.goals.kcal=m3.kcal;S.goals.p=m3.p;S.goals.f=m3.f;S.goals.c=m3.c;
    saveDB();render();toast(t("Targets updated."));return;}
  /* The two settings sheets save independently now that they are separate screens. */
  if(D.saveyou){
    var py=S.profile;
    py.age=num(val("p_age"),py.age);
    py.height=num(val("p_height"),py.height);
    py.sex=val("p_sex")||py.sex;
    py.weight=toKg(num(val("p_weight"),toDisp(py.weight)));
    py.activity=num(val("p_act"),py.activity);
    py.goal=val("p_goal")||py.goal;
    saveDB();render();toast(t("Saved."));return;}
  if(D.savegoals){
    S.goals.kcal=num(val("g_kcal"),S.goals.kcal);S.goals.p=num(val("g_p"),S.goals.p);
    S.goals.c=num(val("g_c"),S.goals.c);S.goals.f=num(val("g_f"),S.goals.f);
    S.goals.water=num(val("g_water"),S.goals.water);S.goals.steps=num(val("g_steps"),S.goals.steps);
    saveDB();render();toast(t("Saved."));return;}
  /* Test Sound plays the actual rest alarm, not a stand-in. A test that plays a
     different sound from the real one tests nothing the user cares about. */
  if(D.testsound){
    if(!S.prefs.sound){toast(t("Turn Sounds on first."));return;}
    alarmStart();
    setTimeout(function(){toast(t("If that was silent, the side switch on your phone is set to silent."));},500);
    return;}
  /* Saturday, Sunday or Monday: the three a week is commonly started on. */
  if(D.wkstart){var wo=[6,7,1];S.prefs.wkstart=wo[(wo.indexOf(weekStart())+1)%wo.length];saveDB();render();return;}
  if(D.toggle){S.prefs[D.toggle]=!S.prefs[D.toggle];
    if(D.toggle==="anim")document.body.classList.toggle("noanim",S.prefs.anim===false);
    if(D.toggle==="awake")keepAwake(S.prefs.awake&&!!S.active);
    saveDB();render();return;}
  if(D.warnmode){var w4=[5,10,15];S.prefs.warn=w4[(w4.indexOf(S.prefs.warn)+1)%3];saveDB();render();return;}
  if(D.langmode){S.prefs.lang=S.prefs.lang==="ar"?"en":"ar";saveDB();applyLang();render();
    toast(S.prefs.lang==="ar"?"\u0627\u062a\u063a\u064a\u0631\u062a \u0644\u0644\u0639\u0631\u0628\u064a\u0629":"Switched to English");return;}
  if(D.unitmode){S.prefs.unit=S.prefs.unit==="kg"?"lb":"kg";saveDB();render();return;}
  if(D.viewmode){S.prefs.view=S.prefs.view==="set"?"all":"set";saveDB();render();return;}
  if(D.rpemode){
    var rm=["every","last","off"];
    S.prefs.rpe=rm[(rm.indexOf(S.prefs.rpe)+1)%3];saveDB();render();return;}
  if(D.theme){changeLook(function(){S.theme=S.theme==="dark"?"light":"dark";saveDB();render();});return;}
  /* Settings → Theme and Mode. The whole screen cross-fades into the new look. */
  if(D.settheme){if(D.settheme===themeOf())return;
    changeLook(function(){S.prefs.palette=D.settheme;saveDB();render();});return;}
  if(D.lookmode){if(D.lookmode===S.theme)return;
    changeLook(function(){S.theme=D.lookmode;saveDB();render();});return;}
  if(D.progmode){
    var order=["conservative","standard","aggressive"];
    S.profile.prog=order[(order.indexOf(S.profile.prog)+1)%3];saveDB();render();return;}
  /* The assessment, from Explore, Home or Profile: a fresh draft from what is saved. */
  if(D.setup){if(V.sheet)closeSheet();pushNav();V.assess=true;V.asd=draftFrom();render();window.scrollTo(0,0);return;}
  if(D.as!==undefined&&V.asd){var ap=D.as.split("|"),af=ap[0],av=ap[1];
    V.asd[af]=/^(days|mins|meals|sleep)$/.test(af)?num(av):af==="powder"?av==="1":av;
    /* A different goal, level, week or kit can change which splits are on offer. */
    if(/^(goal|level|days|gear)$/.test(af))V.asd.split=null;
    render();return;}
  if(D.asm!==undefined&&V.asd){var mp=D.asm.split("|"),ml=V.asd[mp[0]],mi=ml.indexOf(mp[1]);
    if(mi>=0)ml.splice(mi,1);else ml.push(mp[1]);render();return;}
  if(D.asnext&&V.asd){
    if(STEPS[V.asd.step]==="you"&&!youOk(V.asd)){toast(t("Enter your age, height and weight to go on."));return;}
    V.asd.step=Math.min(STEPS.length-1,V.asd.step+1);render();window.scrollTo(0,0);return;}
  if(D.asback&&V.asd){V.asd.step=Math.max(0,V.asd.step-1);render();window.scrollTo(0,0);return;}
  if(D.assplit&&V.asd){V.asd.split=D.assplit;render();return;}
  if(D.asuse){useAssessment();return;}
  if(D.asmeals&&V.asd){openMealPlan(foodPrefs(V.asd));return;}
  if(D.astrain){V.assess=false;V.pcheck=false;resetNav();V.tab="train";V.train="days";V.tsec="program";S.prefs.tsec="program";saveDB();render();window.scrollTo(0,0);return;}
  /* The plan check: open it, fix a finding, keep one as it is, look at kept ones again. */
  if(D.pcopen){if(V.sheet)closeSheet();pushNav();V.pcheck=true;render();window.scrollTo(0,0);return;}
  if(D.pcfix){pcFix(D.pcfix);return;}
  if(D.pckeep){var fk=checkPlans().filter(function(x){return x.id===D.pckeep;})[0];
    if(fk){S.pcDismiss=S.pcDismiss||{};S.pcDismiss[fk.id]=JSON.stringify(fk.sig);saveDB();render();
      toast(t("Kept as it is."),function(){delete S.pcDismiss[fk.id];saveDB();render();});}return;}
  if(D.pcreset){S.pcDismiss={};S.coachDismiss={};saveDB();render();return;}
  if(D.cofix){coachFix(D.cofix);return;}
  if(D.cokeep){var ck=D.cokeep,cb=JSON.parse(JSON.stringify(S.coachDismiss||{}));coachSetAside(ck,14);saveDB();render();
    toast(t("Set aside for two weeks."),function(){S.coachDismiss=cb;saveDB();render();});return;}
  /* A meal plan from the targets, from Food's plan section, and another version of it. */
  if(D.pgen){openMealPlan(mealPrefs());return;}
  if(D.pgenmore&&V.pgen){V.pgen.variant=(V.pgen.variant||0)+1;V.pparse=buildMealPlan(S.goals,V.pgen);render();return;}
  if(D.fav){var i5=S.favs.indexOf(D.fav);
    if(i5>=0)S.favs.splice(i5,1);else S.favs.push(D.fav);saveDB();render();return;}
  if(D.gear){
    S.gear=S.gear||[];
    var i7=S.gear.indexOf(D.gear);
    if(i7>=0)S.gear.splice(i7,1);else S.gear.push(D.gear);
    saveDB();render();return;}
  if(D.exhist){openSheet("exhist",{name:D.exhist});return;}
  if(D.delsplit){
    if(D.delsplit===S.activeProgram){toast(t("This is the program you train on. Switch to another one first."));return;}
    var spD=editSplit(D.delsplit);
    askConfirm({title:t("Delete")+" "+(spD?spD.name:t("this program"))+"?",icon:"trash",
      body:t("The program is removed. Every session you logged with it is kept."),
      cta:t("Delete the program"),act:"delsplit",data:D.delsplit});return;}
  if(D.switch){if(D.switch!==CUR){switchProfile(D.switch,render);render();}return;}
  if(D.addprofile){
    askText({title:t("Add a profile"),
      body:t("A separate log, weight and plan. Nothing crosses over."),
      cta:t("Create"),act:"newprofile"});return;}
  if(D.renameprofile){
    askText({title:t("Rename this profile"),value:curProfile().name,
      act:"renameprofile"});return;}
  if(D.delprofile){
    if(isOwner()){toast(t("The admin profile cannot be deleted."));return;}
    askConfirm({title:t("Delete")+" "+curProfile().name+"?",icon:"trash",
      body:t("Every workout, meal and measurement on this profile goes with it. This cannot be undone."),
      cta:t("Delete the profile"),act:"delprofile"});return;}
  if(D.share){openSheet("share");return;}
  /* The complete screen's second button. The OS share sheet where there is one, the
     clipboard where there is not — both free, neither a dependency. The existing
     "share" sheet is a progress snapshot for friends, which is a different thing from
     this one workout, so it is not what this opens. */
  if(D.sharews!==undefined){
    var ws=V.sd;if(!ws)return;
    var line=ws.dayName+" · "+ws.mins+" "+t("min")+" · "
      +fmtN(toDisp(ws.vol))+" "+wUnit()+" "+t("lifted")+" · "
      +ws.sets+" "+t("sets")
      +(ws.prs.length?" · "+ws.prs.length+" "+t(ws.prs.length>1?"new records":"new record"):"")
      +" — BUNYAN";
    if(navigator.share){
      navigator.share({title:"BUNYAN",text:line}).catch(function(){});
      return;}
    /* writeText rejects asynchronously — a plain try/catch around it catches nothing,
       so a blocked clipboard answered the tap with silence. */
    var wrote=null;
    try{wrote=navigator.clipboard&&navigator.clipboard.writeText(line);}catch(e){}
    if(wrote&&wrote.then)
      wrote.then(function(){toast(t("Copied. Paste it wherever you like."));},
                 function(){toast(t("Sharing is not available here."));});
    else toast(t("Sharing is not available here."));
    return;}
  if(D.copysn){var t2=document.getElementById("sn");t2.select();
    try{document.execCommand("copy");toast(t("Copied. Send it on WhatsApp."));}
    catch(e){toast(t("Select the text and copy it."));}return;}
  if(D.coach){openSheet("coach");return;}
  if(D.addfriend){
    try{var sn=JSON.parse(val("fp"));
      if(!sn||!sn.sessions||!sn.name)throw 1;
      var F=friends();F[sn.name]=sn;saveFriends(F);render();toast(sn.name+" added.");}
    catch(e){toast(t("That code did not read properly. Ask them to copy all of it."));}
    return;}
  if(D.unfollow){
    var F2=friends();delete F2[D.unfollow];saveFriends(F2);render();return;}
  if(D.export){openSheet("backup");return;}
  if(D.warm!==undefined&&S.active){W.toggleWarm(+D.warm);return;}
  /* Pair with the exercise below. If that one is already in a group, join it, so
     tapping down the list chains A1 → A2 → A3. */
  if(D.group){
    var dg=dayOf(V.dayId);if(!dg)return;
    var gi=dg.ex.findIndex(function(x){return x.id===D.group;});
    if(gi<0||gi>=dg.ex.length-1)return;
    /* Absorb both sides into one id. Taking the current exercise's group first is what
       lets a pair grow into a triset, instead of minting a new id and orphaning the
       exercise above it. */
    var gid=dg.ex[gi].grp||dg.ex[gi+1].grp||("g"+uid());
    groupRun(dg.ex,gi).concat(groupRun(dg.ex,gi+1))
      .forEach(function(k){dg.ex[k].grp=gid;});
    saveDB();render();toast(t("Superset created."));return;}
  if(D.ungroup){
    var du=dayOf(V.dayId);if(!du)return;
    var ui=du.ex.findIndex(function(x){return x.id===D.ungroup;});
    if(ui<0)return;
    groupRun(du.ex,ui).forEach(function(k){du.ex[k].grp=null;});
    saveDB();render();toast(t("Superset broken."));return;}
  if(D.plates){openSheet("plates");return;}
  if(D.bar!==undefined){V.bar=+D.bar;render();return;}
  if(D.note){openSheet("note");return;}
  if(D.savenote){
    if(S.active){S.active.notes=val("snote");saveDB();}
    closeSheet();toast(t("Note saved."));return;}
  if(D.snoozebackup){S.backupSnooze=Date.now()+BACKUP_SNOOZE;saveDB();render();return;}
  /* Only a copy that actually succeeded counts as a backup. */
  if(D.copybk){var ta=document.getElementById("bk");ta.select();
    try{document.execCommand("copy");
      S.lastBackup=Date.now();S.backupSnooze=0;saveDB();
      toast(t("Copied. Your backup is up to date."));render();}
    catch(e){toast(t("Select the text and copy it."));}return;}
  if(D.import){openSheet("restore");return;}
  /* Restore: read, check it is one of ours, say what is in it, and only then replace.
     It used to insist on a `splits` key that migrate() deletes on every start, so no
     backup this version wrote could ever be restored. */
  if(D.dorestore){
    var parsed=parseBackup(val("rs"));
    if(!parsed){toast(t("That does not look like a Bunyan backup."));return;}
    var nd=Object.keys(parsed.days||{}).length;
    askConfirm({title:t("Replace everything with this backup?"),icon:"leave",danger:true,
      body:(parsed.sessions||[]).length+" "+t("workouts")+", "+nd+" "+t("food days")+". "
        +t("Everything currently on this profile is replaced."),
      cta:t("Restore"),act:"restore",data:parsed,hard:true});return;}
  if(D.bkfile!==undefined){downloadBackup();return;}
  /* The one place a typed confirmation is warranted: nothing here is recoverable
     without a backup, and the button sits in a list of harmless ones. */
  if(D.wipe){
    askText({title:t("Delete everything?"),
      body:t("Every workout, meal, measurement and setting on this profile. There is no undo. Export a backup first if you are not certain."),
      label:t("Type DELETE to confirm"),ph:"DELETE",cta:t("Delete everything"),act:"wipe"});return;}
  /* ---- a logged workout, after the fact: edit or delete it */
  if(D.sessedit){
    ensureSessionIds();
    var se0=sessionById(D.sessedit);if(!se0)return;
    openSheet("sessedit",{id:se0.id,work:JSON.parse(JSON.stringify(se0))});return;}
  if(D.ssetdel){
    readSE();var sp2=D.ssetdel.split(":"),en2=V.sd.work.entries[+sp2[0]];
    if(en2)en2.sets.splice(+sp2[1],1);render();return;}
  if(D.sexdel!==undefined){
    readSE();var en3=V.sd.work.entries[+D.sexdel];if(en3)en3.sets=[];render();return;}
  if(D.sesssave){
    readSE();var wk2=V.sd.work;
    wk2.entries=wk2.entries.filter(function(e){return e.sets.length||e.pain;});
    if(!wk2.entries.some(function(e){return e.sets.length;})){askDelSession(V.sd.id);return;}
    var ix=S.sessions.findIndex(function(x){return x.id===V.sd.id;});
    if(ix<0){closeSheet();return;}
    S.sessions[ix]=wk2;
    /* Keep history newest-first by date, as loading it does. */
    S.sessions.sort(function(x,y){return x.date<y.date?1:x.date>y.date?-1:0;});
    saveSession(wk2);closeSheet();toast(t("Workout updated"));return;}
  if(D.sessdel){askDelSession(V.sd&&V.sd.id);return;}
  if(D.openday){openSheet("dayview",{date:D.openday});return;}
  if(D.jumpfood){V.fdate=(D.jumpfood===today())?null:D.jumpfood;closeSheet();V.tab="food";render();return;}

  /* ---- date bar, both screens ----------------------------------------------
     One set of handlers for the one component in js/ui/datebar.js. Progress and Food
     previously had their own, and the copies had drifted: Progress's day arithmetic
     omitted the timezone correction, so east of UTC "previous day" skipped one.
     Which day a screen owns is the only thing that differs, so that is the only thing
     these branches branch on. Food stores null for today because curDate() treats null
     as "follow the clock", which keeps the tab correct across midnight. */
  /* Train has its own day too, and is the one screen that looks ahead: it shows what
     the plan holds for tomorrow and after. Food and Progress stop at today. */
  function dbGet(){ return V.tab==="food"?(V.fdate||today()):V.tab==="train"?(V.tdate||today()):(V.pdate||today()); }
  function dbSet(iso){
    if(iso>today()&&V.tab!=="train")return;      /* no logging into the future */
    var was=dbGet();
    V.dnavDir=iso>was?1:iso<was?-1:0;
    if(V.tab==="food")V.fdate=(iso===today())?null:iso;
    else if(V.tab==="train")V.tdate=(iso===today())?null:iso;
    else V.pdate=iso;
  }
  function calOpen(on){
    if(V.tab==="food")V.fcal=on; else if(V.tab==="train")V.tcal=on; else V.pcal=on;}
  function calIsOpen(){return V.tab==="food"?V.fcal:V.tab==="train"?V.tcal:V.pcal;}
  /* A day card on Train moves the date navigator to that day. */
  if(D.tday){dbSet(D.tday);calOpen(false);render();window.scrollTo(0,0);return;}
  if(D.dday!==undefined){
    dbSet(+D.dday===0?today():shiftDay(dbGet(),+D.dday));
    render();return;}
  if(D.dopen!==undefined){
    calOpen(!calIsOpen());
    V.cal=0;render();return;}
  if(D.dmonth!==undefined){V.cal+= +D.dmonth;render();return;}
  if(D.dpick){
    dbSet(D.dpick);
    calOpen(false);
    render();return;}
});



/* Swiping the date navigator moves the day, as the arrows do — it presses the arrow,
   so the rule for which days are reachable lives in one place. A swipe is a quick,
   mostly horizontal drag of at least 48px; anything else is left to scrolling, which
   these listeners never block (passive). */
var swipe=null;
document.addEventListener("touchstart",function(ev){
  var el=ev.touches.length===1&&ev.target.closest&&ev.target.closest('[data-swipe="day"]');
  swipe=el?{el:el,x:ev.touches[0].clientX,y:ev.touches[0].clientY,at:Date.now()}:null;
},{passive:true});
document.addEventListener("touchend",function(ev){
  var sw=swipe;swipe=null;
  if(!sw||!ev.changedTouches.length)return;
  var dx=ev.changedTouches[0].clientX-sw.x,dy=ev.changedTouches[0].clientY-sw.y;
  if(Math.abs(dx)<48||Math.abs(dx)<Math.abs(dy)*1.5||Date.now()-sw.at>700)return;
  /* Content follows the finger: dragging left brings the next day in. */
  var step=dx<0?1:-1;
  if(document.documentElement.getAttribute("dir")==="rtl")step=-step;
  var btn=sw.el.querySelector('[data-dday="'+step+'"]');
  if(btn&&!btn.disabled){swipedAt=Date.now();btn.click();}
},{passive:true});
/* A handled swipe must not also count as a tap on whatever the finger ended over —
   the date itself would open the month. Only the click that immediately follows. */
var swipedAt=0;
document.addEventListener("click",function(ev){
  if(swipedAt&&Date.now()-swipedAt<400&&!(ev.target.closest&&ev.target.closest("[data-dday]"))){
    swipedAt=0;ev.preventDefault();ev.stopPropagation();}
},true);

/* The dock steps aside while the keyboard is up (see syncKeyboard in render.js). The
   same test decides both directions, and render() re-checks it, so the flag cannot be
   left behind by a field that was destroyed rather than blurred. */
document.addEventListener("focusin",syncKeyboard);
document.addEventListener("focusout",function(){setTimeout(syncKeyboard,60);});
/* Every keystroke used to re-render the whole screen, which meant a linear scan of 873
   exercises plus a full innerHTML rebuild per character. The value is captured
   immediately; the redraw waits for a pause in typing. */
var exqTimer=null;
document.addEventListener("input",function(ev){
  var id=ev.target.id||"";
  if(id==="pi_text"){V.pitext=ev.target.value;return;}
  if(id==="ti_text"){V.titext=ev.target.value;return;}
  var ptk=/^pt_(kcal|p|c|f|water|steps)$/.exec(id);
  if(ptk&&V.ptargets){var pv=num(ev.target.value,0);V.ptargets[ptk[1]]=ptk[1]==="water"?Math.round(pv*1000):Math.round(pv);return;}
  var pmn=/^pm_n_(\d+)$/.exec(id);
  if(pmn&&V.pparse&&V.pparse[+pmn[1]]){var nmv=ev.target.value.trim();V.pparse[+pmn[1]].custom=nmv||null;return;}
  if(id==="ti_name"&&V.tp){V.tp.name=ev.target.value;return;}
  /* The assessment's numbers, kept as typed; weight in kilograms whatever is shown. */
  if(V.asd&&(id==="as_age"||id==="as_height")){V.asd[id.slice(3)]=num(ev.target.value,0)||"";return;}
  if(V.asd&&id==="as_weight"){V.asd.weight=toKg(num(ev.target.value,0))||"";return;}
  var dnm=/^ti_dn_(\d+)$/.exec(id);if(dnm&&V.tp&&V.tp.days[+dnm[1]]){V.tp.days[+dnm[1]].name=ev.target.value;return;}
  if(id==="exq"){
    V.exq=ev.target.value;
    clearTimeout(exqTimer);
    exqTimer=setTimeout(function(){exqTimer=null;render();topOfResults();},140);
    return;}
  /* The number tiles are sized to their content so the unit stays beside the figure;
     this keeps them sized as it changes. */
  if(ev.target.closest&&ev.target.closest(".aftile-v,.ngbig,.afamt")){
    ev.target.style.width=fitCh(ev.target.value,ev.target.placeholder)+"ch";}
  /* The servings screen's typed amount. Captured now, drawn after a pause; the
     patcher leaves the focused field's value alone, so the caret stays put. */
  if(id==="afamt"&&V.food&&V.food.pick){
    /* A cleared field is zero, not the last amount: adding then asks for one rather
       than logging a figure no longer on screen. */
    var a0=parseFloat(ev.target.value);
    V.food.pick.amt=isFinite(a0)&&a0>0?a0:0;
    clearTimeout(exqTimer);
    exqTimer=setTimeout(function(){exqTimer=null;render();},140);
    return;}
  /* Food search, the same way: captured now, drawn after a pause. Typing on another
     tab means searching, so it moves to Search. */
  if(id==="fq"&&V.food){
    V.food.sq=ev.target.value;V.food.tab="search";
    clearTimeout(exqTimer);
    exqTimer=setTimeout(function(){exqTimer=null;render();topOfResults();},140);
    return;}
  if(id.indexOf("in_")===0){
    var k=id.slice(3),v=parseFloat(ev.target.value);
    if((k==="w"||k==="r")&&V.draftSg){V.draftSg=false;
      [].forEach.call(document.querySelectorAll("#in_w,#in_r"),function(f){f.classList.remove("sg");});}
    /* The field shows the user's unit; the draft is always kilograms. */
    if(isFinite(v))V.draft[k]=(k==="w")?toKg(v):v;
    if(k==="min"){var ak=document.getElementById("actKcal"),ae2=S.active&&S.active.entries[V.logIdx];
      if(ak&&ae2)ak.textContent=fmtN(actKcal(ae2.name,num(V.draft.min),V.draft.rpe||6,lastWeight()))+" kcal";}
    return;}});
/* Keyboard: Escape closes any sheet, Enter submits the ask sheet. Sheets were
   previously unreachable by keyboard entirely. */
document.addEventListener("keydown",function(ev){
  if(ev.key==="Escape"&&V.sheet){ev.preventDefault();requestCloseSheet();return;}
  /* Arrow keys move along any tablist (the segmented controls), as they do natively. */
  /* The grip moves its row with the arrow keys too, so reordering never needs a drag. */
  var gp=(ev.key==="ArrowUp"||ev.key==="ArrowDown")&&ev.target.closest&&ev.target.closest("[data-grip]");
  if(gp){
    ev.preventDefault();
    var gid=gp.getAttribute("data-grip"),gl=V.tab==="food"&&V.reorder==="ms"?mealSlots()
      :builderId()?(editSplit(builderId())||{days:[]}).days:((dayOf(V.dayId)||{ex:[]}).ex);
    var gi=gl.findIndex(function(x){return x.id===gid;});
    if(gi<0)return;
    moveRow(gid,gi+(ev.key==="ArrowUp"?-1:1));
    var ng=document.querySelector('[data-grip="'+gid+'"]');if(ng)ng.focus();
    return;}
  var tlist=(ev.key==="ArrowRight"||ev.key==="ArrowLeft")&&ev.target.closest&&ev.target.getAttribute("role")==="tab"
    &&ev.target.closest('[role="tablist"]');
  if(tlist){
    var tl=[].slice.call(tlist.querySelectorAll('[role="tab"]')),ti=tl.indexOf(ev.target);
    var fw=(ev.key==="ArrowRight")!==(document.documentElement.dir==="rtl");
    var nx=tl[(ti+(fw?1:-1)+tl.length)%tl.length];
    if(nx){ev.preventDefault();nx.click();}
    return;}
  if(ev.key==="Enter"&&V.sheet==="ask"&&ev.target.id==="askv"){
    ev.preventDefault();
    var ao=V.sd||{},av2=val("askv");
    if(ao.required!==false&&!String(av2).trim()){toast(t("Enter something first."));return;}
    runAct(ao.act,av2);}});
document.addEventListener("change",function(ev){
  if(ev.target.id==="chartsel"){V.chartEx=ev.target.value;render();return;}
  var ek=/^e_(sets|rest|lo|hi|min|km)$/.exec(ev.target.id||"");
  if(ek){var ee=editedEx();if(ee){setExField(ee,ek[1],ev.target.value);saveDB();render();}return;}
  /* A progress photo, picked from the camera or the library. Shrunk and stored on
     this phone by js/ui/photos.js; the Body view re-reads the list once it lands. */
  /* A plan from a file: read as text into the box, then read as a plan straight away. */
  var wdm=/^ti_wd_(\d)$/.exec(ev.target.id||"");
  if(wdm&&V.tp){assignWd(+wdm[1],ev.target.value);render();return;}
  /* A training program from a file: a PDF is read on the phone, a text file as text. */
  if(ev.target.id==="ti_file"){
    var tf=ev.target.files&&ev.target.files[0];ev.target.value="";if(!tf)return;
    if(tf.type==="application/pdf"||/\.pdf$/i.test(tf.name||"")){
      V.tibusy=true;V.tierr="";render();
      import("./engine/pdfplan.js").then(function(m){return m.readPdfLines(tf);})
        .then(function(src){V.tibusy=false;readTraining(src);})
        .catch(function(){V.tibusy=false;V.tierr="That PDF could not be read. Copy its text and paste it instead.";render();});
      return;}
    var tfr=new FileReader();
    tfr.onload=function(){V.titext=String(tfr.result||"");readTraining(V.titext);};
    tfr.readAsText(tf);return;}
  if(ev.target.id==="pi_file"){
    var pfile=ev.target.files&&ev.target.files[0];if(!pfile)return;
    /* A PDF is read on the phone (js/engine/pdfplan.js, loaded only when one is opened):
       its meals become the text in the box, and its targets and supplements ride along
       for the review below it. */
    if(pfile.type==="application/pdf"||/\.pdf$/i.test(pfile.name||"")){
      ev.target.value="";V.pibusy=true;V.pparse=null;render();
      import("./engine/pdfplan.js").then(function(m){return m.readPdfPlan(pfile);}).then(function(r){
        V.pibusy=false;V.pitext=r.text;V.ptargets=r.targets;V.psupps=r.supps;V.papplyT=true;
        var box=document.getElementById("pi_text");
        if(!r.text&&!Object.keys(r.targets||{}).length){render();if(box)box.value="";
          toast(t("No meals were found in that PDF. If it is a training program, import it under Train → Explore."));return;}
        loadFoods(function(){V.pparse=withNotes(parsePlan(V.pitext));render();
          var b2=document.getElementById("pi_text");if(b2)b2.value=V.pitext;
          var res=document.querySelector(".pitg,.picard");if(res)res.scrollIntoView({behavior:"smooth",block:"start"});});
      }).catch(function(){V.pibusy=false;render();
        toast(t("That PDF could not be read. Copy its text and paste it instead."));});
      return;}
    V.ptargets=null;V.psupps=null;
    var pfr=new FileReader();
    pfr.onload=function(){V.pitext=String(pfr.result||"");
      loadFoods(function(){V.pparse=withNotes(parsePlan(V.pitext));render();});};
    pfr.readAsText(pfile);ev.target.value="";return;}
  if(ev.target.id==="pg_photo"){
    var file=ev.target.files&&ev.target.files[0];
    ev.target.value="";
    if(!file)return;
    toast(t("Saving photo…"));
    addPhoto(file,function(ok){
      render();
      toast(ok?t("Photo saved on this phone."):t("That photo could not be saved."));});
    return;}
  /* The meal in the add-food header. */
  if(ev.target.id==="afmeal"&&V.sd){V.sd.meal=ev.target.value;render();return;}
  /* The chooser holds servings ("s2") and measures ("uml"). Moving between them keeps
     the amount: a mug (250 g) becomes 250 ml, 0.25 L, or back to one mug. */
  if(ev.target.id==="afsrv"&&V.food&&V.food.pick){
    var pk3=V.food.pick,v3=ev.target.value,g3=pickAmount(pk3).g;
    if(v3.charAt(0)==="u"){
      var k3=v3.slice(1),per3=unitGrams(pk3.food,k3);
      pk3.u=k3;pk3.amt=per3?Math.max(UNIT_STEP[k3]/10,roundUnit(k3,g3/per3)):UNIT_STEP[k3];
    }else{
      var si3=+v3.slice(1),sv3=servs(pk3.food),s3=sv3[si3]||sv3[0];
      /* From a measure back to a serving: the nearest half serving. Serving to
         serving keeps the count, as it always has. */
      if(pk3.u)pk3.n=Math.max(0.5,Math.round(g3/s3[1]*2)/2);
      pk3.u=null;pk3.amt=null;pk3.si=si3;}
    render();return;}
  /* Quick Add's unit chooser: the same conversion, on a parsed item. */
  if(ev.target.dataset&&ev.target.dataset.qunit!==undefined&&V.food&&V.food.items){
    var it9=V.food.items[+ev.target.dataset.qunit];if(!it9||!it9.food)return;
    var k9=ev.target.value,per9=k9?unitGrams(it9.food,k9):0;
    if(k9&&per9){it9.parsed.unit=k9;it9.parsed.qty=Math.max(UNIT_STEP[k9]/10,roundUnit(k9,it9.grams/per9));}
    else{var s9=servs(it9.food)[0];
      it9.parsed.unit=null;it9.parsed.qty=Math.max(0.5,Math.round(it9.grams/s9[1]*2)/2);}
    recalcItem(it9);render();return;}
  /* A backup file picked on the Restore sheet fills the text box; Restore then checks
     it like pasted text. */
  if(ev.target.id==="rsfile"&&ev.target.files&&ev.target.files[0]){
    var fr=new FileReader();
    fr.onload=function(){var ta=document.getElementById("rs");if(ta)ta.value=String(fr.result||"");
      toast(t("Backup loaded. Tap Restore to continue."));};
    fr.readAsText(ev.target.files[0]);return;}
  /* The manual sheet's button says what it will do. Changed in place rather than by
     re-rendering, which would put the typed values back to what the sheet opened with. */
  if(ev.target.id==="mf_save"){
    var go=document.getElementById("mf_go");
    if(go)go.textContent=t(ev.target.checked?"Save and add to":"Add to")+" "
      +mealName((V.sd&&V.sd.meal)||mealNow());
    return;}
  var si=ev.target.dataset?ev.target.dataset.setidx:undefined;
  if(si!==undefined&&S.active)W.editLoggedSet(+si,ev.target.dataset.k,ev.target.value);});

/* The clock and the rest ring are the only things that change every second, so they
   are patched directly. Re-rendering the whole screen on a timer threw away scroll
   position and stole focus from the set inputs mid-entry. */
function tickSession(){
  if(!S.active)return;
  /* Computed from the last logged set, so a suspended page comes back with the right
     number rather than a counter that stopped when iOS froze the tab. */
  var ck=sessionClock(S.active);
  var c=document.getElementById("sessClock");
  if(c)c.textContent=mmss(ck.ms/1000);
  var pz=document.getElementById("sessPaused");
  if(pz)pz.hidden=!ck.paused;
  syncWbar();
  if(!V.restEnd||V.restPaused)return;
  var left=Math.ceil((V.restEnd-Date.now())/1000);
  /* Running out is the one tick that changes the screen rather than the numbers. The
     rest surface does not disappear at zero any more — it turns into the alert, and
     stays until the user acknowledges it. Sound cannot be relied on (silent switch,
     backgrounded tab), so the screen has to carry it. */
  if(left<=0){V.restEnd=0;V.restPaused=false;V.restDone=true;V.restMin=false;
    if(!V.sheet)render();else syncWbar();return;}
  paintRest();
}
setInterval(function(){
  if(V.restEnd&&!V.restPaused&&!beeped){
    var left=Math.ceil((V.restEnd-Date.now())/1000);
    var warn=S.prefs.warn||10;
    if(left<=Math.min(3,warn)&&left>0&&left!==lastTick){setLastTick(left);play("tick");}
    if(left===warn&&lastTick!==warn){setLastTick(warn);play("tick");}
    /* A rest that ran out while the page was frozen (phone locked, app in the
       background) is not announced minutes later: the screen shows it is over, and
       the eight-second alarm is only for a rest ending in front of you. */
    if(left<=0){setBeeped(true);if(Date.now()-V.restEnd<5000){alarmStart();tap("ok");}}}
  tickSession();
  if(syncWorkoutState())saveDB();},1000);
document.addEventListener("visibilitychange",function(){
  if(document.visibilityState!=="visible")return;
  if(S.active)keepAwake(true);
  /* Catch up at once instead of on the next one-second tick: a rest that ended while
     away shows as over the moment the app is back. */
  if(S.active&&V.restEnd&&!V.restPaused&&Date.now()>=V.restEnd){setBeeped(true);tickSession();}
  else tickSession();});

/* The intro is skippable — a tap ends it immediately. It also runs short when the
   user has asked for less motion, either in the OS or in App settings. */
function endSplash(){var sp=document.getElementById("splash");if(sp)sp.remove();}
/* ---- barcodes ----------------------------------------------------------- */
/* Scanning and typing converge here, so both behave identically from this point on.
   Order matters: anything scanned before resolves with no network at all. */
function onBarcode(code){
  code=normBarcode(code);
  if(!code){toast(t("That barcode could not be read."));return;}
  if(V.sheet!=="addfood")openSheet("addfood",{meal:(V.sd&&V.sd.meal)||mealNow()});
  if(!V.food)V.food={mode:"search",tab:"search",sq:"",q:"",items:null,edit:-1};
  /* The camera is in the search field now, so a lookup runs on the search screen and
     its busy and failed states show there. */
  V.food.mode="search";V.food.busy=true;V.food.bcFail=false;render();
  lookupBarcode(code,function(food,failed,local){
    V.food.busy=false;
    if(failed){
      V.food.bcFail=code;render();
      toast(t("Could not reach the food database."));return;}
    if(!food){
      /* Not a failure of the scan: the product simply is not in the database. Hand
         the barcode to manual entry so saving it teaches this device. */
      render();
      toast(t("That product is not in the database yet."));
      openSheet("manual",{name:"",bc:code,meal:(V.sd&&V.sd.meal)||mealNow()});return;}
    /* A scanned packet is one product, which is exactly what the servings screen is
       for. It used to be pushed into the Quick Add list with grams set to the whole
       object gramsFor() returns — {g:100,label:"100 g"} rather than 100 — so the card
       read "NaN g" and the log stored an object as the weight. */
    V.food.pick={food:food,si:0,n:1,u:null,amt:null,more:false,from:"search"};
    V.food.mode="detail";
    saveDB();render();
    play("set");
    toast(food.n+(local?" · "+t("remembered on this device"):""));
  });
}
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
ACT.dropsheet=function(){closeSheet();};

/* ---- leaving an active workout ------------------------------------------- */
/* One prompt, reached by every exit. nav.js routes the back arrow, Safari's edge
   swipe and the OS gesture through this same guard, so no control hardcodes a
   destination and none of them can behave differently from the others.

   The protocol: return true to cancel this back and take responsibility for it. The
   guard is handed the function that finishes the job and calls it once the user has
   chosen, so "Keep workout and exit" leaves exactly where the gesture was going.

   Leaving has not ended a session since Round 2 — the session is saved and resumable
   either way. The sheet is not there to prevent loss; it is there to say so, because
   a user who does not know their sets are safe will not risk the gesture. That is why
   keeping is the primary and discarding is the secondary, outlined rather than filled:
   the dangerous option should be reachable, not inviting. */
var leaveResume=null;
/* While the logger is the screen you are looking at, the back gesture is held off and
   the ✕ is the way out. Same condition as navGuard below, because it has to be the
   same screen: anywhere else in the app the gesture keeps working normally.

   Pure. canBack() consults it on every render to decide whether to draw a back arrow,
   so anything with a side effect here would fire on every repaint. */
function sessionLocked(){
  return !!(S.active&&V.tab==="train"&&!V.sheet);
}
/* A gesture answered by nothing at all reads as a frozen app, so it says what to do
   instead — once per workout, not per swipe, which would be its own annoyance. Only
   the session has anything to explain: a swipe at a tab root does nothing because
   there is nowhere to go, which needs no telling. */
var lockSaid=false;
function backBlocked(){
  if(!S.active){lockSaid=false;return;}         /* armed again for the next workout */
  if(!sessionLocked()||lockSaid)return;
  lockSaid=true;toast(t("Tap the close button to leave this workout."));
}

/* The edit sheet's inputs into its working copy, before anything re-renders it. */
function readSE(){
  var w=V.sd&&V.sd.work;if(!w)return;
  var dEl=document.getElementById("se_date");
  if(dEl&&/^\d{4}-\d{2}-\d{2}$/.test(dEl.value))w.date=dEl.value;
  w.entries.forEach(function(e,ei){
    e.sets.forEach(function(st,si){
      var a=document.getElementById("se_w_"+ei+"_"+si),b=document.getElementById("se_r_"+ei+"_"+si);
      if(a)st.w=a.value===""?0:toKg(a.value);
      if(b&&b.value!=="")st.r=Math.max(0,Math.round(num(b.value)));
      var m=document.getElementById("se_m_"+ei+"_"+si),k=document.getElementById("se_k_"+ei+"_"+si);
      if(m&&m.value!==""){st.min=Math.max(1,Math.round(num(m.value)));
        st.kcal=actKcal(e.name,st.min,st.rpe||6,lastWeight())||st.kcal||0;}
      if(k)st.km=k.value===""?0:Math.max(0,r1(num(k.value)));});});
}
function askDelSession(id){
  if(!id)return;
  askConfirm({title:t("Delete this workout?"),icon:"trash",
    body:t("Its sets are removed from your history and records. This cannot be undone."),
    cta:t("Delete workout"),act:"delsess",data:id,hard:true});
}
/* A backup is ours if it is an object carrying at least one thing only Bunyan writes.
   Old backups (with `splits`) still qualify; migrate() upgrades them. */
function parseBackup(txt){
  var o;try{o=JSON.parse(String(txt||"").trim());}catch(e){return null;}
  if(!o||typeof o!=="object"||Array.isArray(o))return null;
  var ours=Array.isArray(o.sessions)||Array.isArray(o.programs)||o.myPlan||Array.isArray(o.splits)||(o.prefs&&typeof o.prefs==="object")||o.profile;
  return ours?o:null;
}
ACT.restore=function(_,o){
  setS(normalize(JSON.parse(JSON.stringify(o))));
  migrate();saveDB();V.tab="home";V.train="days";
  adoptRestored(function(){render();toast(t("Restored."));});
};
/* A backup as a file: the share sheet where it can take files (iPhone: Save to
   Files, AirDrop, Mail), a download elsewhere. Copying tens of kilobytes of text out
   of a textarea on a phone was the only way before. */
function downloadBackup(){
  var name="bunyan-backup-"+today()+".json";
  var blob=new Blob([JSON.stringify(S)],{type:"application/json"});
  var done=function(){S.lastBackup=Date.now();S.backupSnooze=0;saveDB();render();toast(t("Backup saved."));};
  try{
    var file=new File([blob],name,{type:"application/json"});
    if(navigator.canShare&&navigator.canShare({files:[file]})){
      navigator.share({files:[file],title:"Bunyan backup"}).then(done).catch(function(){});return;}
  }catch(e){}
  var a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;
  document.body.appendChild(a);a.click();
  setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},1000);
  done();
}
ACT.delsess=function(_,id){if(removeSession(id))toast(t("Workout deleted"));render();};

function navGuard(resume){
  /* Only when the workout is the thing you are actually looking at. vTrain() returns
     the logger for as long as a session is live, so "the Train tab" and "the workout"
     are the same screen and that is the whole condition. Without the tab test, every
     back gesture anywhere in the app — on Food, on Progress — would stop to ask about
     a workout the user is not currently in. */
  if(!S.active||V.tab!=="train")return false;
  leaveResume=resume||null;
  askConfirm({title:t("Leave workout?"),icon:"leave",
    body:t("Your sets are saved. Pick up where you left off any time."),
    cta:t("Save and exit"),act:"leavekeep",cancel:t("Keep training"),
    alt:t("Discard workout"),altact:"leavediscard"});
  return true;
}
/* Cancel needs no handler: closing the sheet without choosing leaves the session and
   the screen exactly as they were, which is what Cancel means.

   Both outcomes land on Home rather than calling the resume the gesture was carrying.
   That is not a shortcut — back inside Train resolves to a Train route, and a Train
   route with a live session renders the logger, so honouring the gesture's own
   destination would put the user straight back in the workout they just left. Home is
   also the screen that carries the Resume card, so leaving and returning are adjacent.
   The destination is decided here, once, for the arrow and the swipe alike. */
function leaveTo(tab){
  leaveResume=null;
  resetNav();V.tab=tab||"home";V.train="days";render();window.scrollTo(0,0);
}
ACT.leavekeep=function(){leaveTo("home");};
/* Discarding ends the workout, so there is nothing to resume and no reason to leave
   Train: you stay on the Train hub, ready to pick another day. */
ACT.leavediscard=function(){
  S.active=null;endRest();V.fresh=-1;
  keepAwake(false);saveDB();
  leaveTo("train");
};

function openBarcodePrompt(){
  askText({title:t("Enter barcode"),label:t("Barcode"),
    body:t("The digits printed under the bars on the packet."),
    ph:"5000112637922",numeric:true,cta:t("Look it up"),act:"barcode"});
}
ACT.barcode=function(v){ onBarcode(v); };

/* Ids and names agree once both the library and the history have arrived; run on
   each of the two callbacks, whichever lands last does the work. A rename in the
   library is persisted only for the sessions it actually touched. */
function applyExReconcile(){
  var r=reconcileExercises(S);
  if(r.plansChanged)saveDB();
  r.changedSessions.forEach(function(s){saveSession(s);});
}

/* Boot. Nothing above ran on import, so this is the whole startup sequence
   in the order it actually happens. */
/* The installed app gets the full-screen page height (see "The Home Screen app" in
   index.html). The display-mode query covers current iOS; this covers older ones. */
try{if(navigator.standalone)document.documentElement.classList.add("standalone");}catch(e){}
initState();
setStorageErrorHandler(toast);
/* One back path for the arrow, the edge swipe and the OS gesture. */
initNav({render:render,guard:navGuard,closeSheet:requestCloseSheet,
         locked:sessionLocked,onBlocked:backBlocked});
initSheetDrag(requestCloseSheet);
syncViewport();
if(window.visualViewport){
  window.visualViewport.addEventListener("resize",syncViewport);
  window.visualViewport.addEventListener("scroll",syncViewport);}
initReorder(moveRow,function(){tap("light");});
initDockScroll();
initPress();
/* A swipe on the exercise moves through the workout (js/ui/exswipe.js). */
initExSwipe({
  can:function(step){var a=S.active,n=V.logIdx+step;return !!(a&&!V.sheet&&V.tab==="train"&&n>=0&&n<a.entries.length);},
  go:function(step){W.jumpTo(V.logIdx+step);tap("light");}});
/* History comes from IndexedDB, so it arrives a tick later than everything else.
   Painting first and repainting when it lands keeps a slow or wedged IndexedDB from
   holding the whole app behind the intro; in practice it resolves well inside it. */
loadStored(function(){ applyExReconcile(); render(); });
/* The intro belongs to a cold start, not to every document load. A reload for any
   reason — a service worker taking over, a crash recovery, the OS reclaiming the
   tab — used to replay it, which reads as the app restarting. */
var coldStart=true;
try{ coldStart=!sessionStorage.getItem("bunyan:seen"); sessionStorage.setItem("bunyan:seen","1"); }
catch(e){ coldStart=true; }
if(!coldStart||(S.prefs&&S.prefs.splash===false))document.body.classList.add("nosplash");
else{
  var reduced=false;
  try{reduced=window.matchMedia("(prefers-reduced-motion:reduce)").matches;}catch(e){}
  var brief=reduced||(S.prefs&&S.prefs.anim===false);
  setTimeout(endSplash,brief?2150:3750);
  var spEl=document.getElementById("splash");
  if(spEl)spEl.addEventListener("click",endSplash);
}
loadExDB(function(){applyExReconcile();render();});
if(startupNote()==="corrupt")setTimeout(function(){
  toast(t("Your saved data could not be read, so Bunyan started fresh. A copy of it was kept on this phone."));},1200);
/* Ask the browser not to evict this origin's data under storage pressure. Everything
   Bunyan knows lives only here; this is free and silent where it is granted. */
try{if(navigator.storage&&navigator.storage.persist&&S.onboarded)
  navigator.storage.persisted().then(function(p){if(!p)navigator.storage.persist();}).catch(function(){});}catch(e){}
window.addEventListener("storage",function(ev){
  if(ev.key!==storageKey())return;
  refreshFromStorage(function(){if(S.active)syncDraft();render();});
});
/* Reopened mid-workout (a reload, or iOS having reclaimed the tab): straight back to
   the exercise and the rest that were on screen, not to Home. */
V.tsec=(S.prefs&&S.prefs.tsec)||"today";
V.fsec=(S.prefs&&S.prefs.fsec)||"today";
if(S.active){restoreWorkoutState();syncDraft();V.tab="train";V.train="days";}
if(!S.onboarded){V.tab="home";V.assess=true;V.asd=draftFrom();}
render();

if("serviceWorker" in navigator){
  window.addEventListener("load",function(){
    navigator.serviceWorker.register("sw.js").then(function(reg){
      reg.update();
      reg.addEventListener("updatefound",function(){
        var nw=reg.installing;
        if(!nw)return;
        nw.addEventListener("statechange",function(){
          if(nw.state==="installed"&&navigator.serviceWorker.controller){
            nw.postMessage("skipWaiting");
            toast(t("Updated. Reopen the app to finish."));
          }});});
    }).catch(function(){});
  });
  /* No automatic reload. controllerchange fires on the first install as well as on
     an update, so this reloaded the page at an arbitrary moment — which replayed the
     intro and looked exactly like the app restarting under a back gesture. Reloading
     mid-workout is hostile anyway; the toast above already says what to do, and the
     new version is picked up on the next open. */
}