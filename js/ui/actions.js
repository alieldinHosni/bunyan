/* Bunyan — actions
   Sheet plumbing and the ACT registry: things that change state. */
import {t} from "../i18n/dict.js";
import {LIB, muscleOf} from "../data/exercises.js";
import {avgRPE, prevPerf, prFor, recommend, sessionVolume} from "../engine/formulas.js";
import {FOODDB, nutritionFor, toLogItem} from "../engine/nutrition.js";
import {render} from "./render.js";
import {day, ex} from "../data/splits.js";
import {adoptSplit, allSplits, CUR, curProfile, dayOf, dayRec, DEF, dropProfileData, migrate, PROFILES, recordSession, S, saveDB, setProfiles, setS, split, switchProfile} from "../state.js";
import {MEM, num, PERSIST, r1, today, uid, wr} from "../util.js";
import {keepAwake, play, tap, toast, V} from "./view.js";

/* ============================================================ actions */
function openSheet(name,data){V.sheet=name;V.sd=data||null;render();}
function closeSheet(){V.sheet=null;V.sd=null;V.exq="";render();}
function val(id){var el=document.getElementById(id);return el?el.value:"";}

/* Named actions for the ask/confirm sheets. Nothing is eval'd: the sheet carries
   an action name, and the registry below owns the behaviour. */
var ACT={};
function askText(o){openSheet("ask",o);}
function askConfirm(o){openSheet("confirm",o);}
function runAct(name,value){
  var f=ACT[name],d=V.sd&&V.sd.data;
  closeSheet();
  if(f)f(value,d);}

ACT.newsplit=function(name){
  var sp={id:uid(),name:name,tag:"custom",custom:true,days:[day("Day 1",[])]};
  (S.userSplits=S.userSplits||[]).push(sp);
  S.myPlan=adoptSplit(sp);saveDB();V.train="days";render();};
ACT.addday=function(name){split().days.push(day(name,[]));saveDB();render();};
ACT.renameday=function(name,id){
  var d=dayOf(id);if(!d)return;d.name=name;saveDB();render();};
ACT.adopt=function(_,id){
  var pre=allSplits().filter(function(x){return x.id===id;})[0];
  if(!pre)return;
  S.myPlan=adoptSplit(pre);saveDB();V.train="days";render();
  toast(pre.name+" "+t("is now your training."));};
ACT.delday=function(_,id){
  var sp=split();sp.days=sp.days.filter(function(x){return x.id!==id;});
  V.train="days";saveDB();render();};
ACT.delsplit=function(_,id){
  S.userSplits=(S.userSplits||[]).filter(function(x){return x.id!==id;});
  saveDB();render();};
/* Editing a logged food item: recompute from the source food where we still have it,
   scale what was stored where we do not. */
ACT.editgrams=function(v,d){
  var g=num(v,0);
  if(g<=0){toast(t("Enter a number of grams."));return;}
  var m=dayRec(d.date).meals[d.meal],it=m&&m.items[d.idx];
  if(!it)return;
  var f=((S.myFoods||[]).concat(FOODDB||[]))
        .filter(function(x){return x.id===it.fid;})[0];
  if(f){var n=nutritionFor(f,g);
    it.kcal=n.kcal;it.p=n.p;it.c=n.c;it.f=n.f;it.fib=n.fib;}
  else{var k=it.grams?g/it.grams:1;
    it.kcal=Math.round(it.kcal*k);it.p=r1(it.p*k);it.c=r1(it.c*k);
    it.f=r1(it.f*k);it.fib=r1((it.fib||0)*k);}
  it.grams=g;it.label=g+" g";
  saveDB();render();};
ACT.customex=function(name,d){
  name=String(name).trim();
  if(LIB.some(function(l){return l[0].toLowerCase()===name.toLowerCase();})){
    toast(t("That exercise is already in your library."));return;}
  var m=V.exm&&V.exm!=="All"?V.exm:"Other";
  LIB.push([name,m,"Other",0]);
  (S.myEx=S.myEx||[]).push({n:name,m:m});
  saveDB();
  /* Put the picker's context back so a custom exercise can still land in the day or
     replace the live one, exactly like a library pick. */
  V.sd=(d&&d.from)||null;
  var landed=!!dayOf(V.dayId)||(V.sd&&V.sd.swaplive&&S.active);
  addExercise(name);
  if(!landed){V.sd=null;render();toast(name+" "+t("is in your library."));}};
ACT.discard=function(){
  S.active=null;V.restEnd=0;V.restPaused=false;V.fresh=-1;
  keepAwake(false);saveDB();render();};
ACT.newprofile=function(name){
  var np={id:uid(),name:name,owner:false};
  PROFILES.push(np);wr("bunyan:profiles",PROFILES);switchProfile(np.id,render);render();};
ACT.renameprofile=function(name){
  curProfile().name=name;wr("bunyan:profiles",PROFILES);render();};
ACT.delprofile=function(){
  var gone=CUR;
  setProfiles(PROFILES.filter(function(p){return p.id!==gone;}));
  wr("bunyan:profiles",PROFILES);
  try{PERSIST?localStorage.removeItem("bunyan:db:"+gone):delete MEM["bunyan:db:"+gone];}catch(e){}
  dropProfileData(gone);        /* its history and food log outlive the blob otherwise */
  switchProfile(PROFILES[0].id,render);render();};
ACT.wipe=function(word){
  if(String(word).trim().toUpperCase()!=="DELETE"){
    toast(t("Nothing was deleted."));return;}
  dropProfileData(CUR);
  setS(JSON.parse(JSON.stringify(DEF)));migrate();saveDB();V.tab="home";render();
  toast(t("Everything was deleted."));};
/* Both of these are reached from inside the food sheet, so they hand control back
   to it rather than dropping the user on the screen behind. */
ACT.grams=function(v,d){
  var g=num(v,0),it=V.food&&V.food.items[d.idx];
  openSheet("addfood",{meal:d.meal});
  if(g<=0){toast(t("Enter a number of grams."));return;}
  if(!it)return;
  it.grams=g;it.label=g+" g";it.parsed.unit="g";it.parsed.qty=g;
  it.n=nutritionFor(it.food,g);render();};
ACT.savemeal=function(name,d){
  var good=V.food.items.filter(function(i){return i.status!=="unknown";}).map(toLogItem);
  openSheet("addfood",{meal:d.meal});
  if(!good.length){toast(t("Nothing to save."));return;}
  S.savedMeals.push({id:uid(),name:name,items:good});saveDB();
  render();toast(t("Saved as")+" “"+name+"”.");};

function startDay(dayId){
  var d=dayOf(dayId);if(!d||!d.ex.length)return;
  S.active={id:uid(),date:today(),started:Date.now(),splitId:split().id,dayId:d.id,dayName:d.name,
    entries:d.ex.map(function(e){
      return {name:e.name,muscle:e.muscle,planned:{sets:e.sets,lo:e.lo,hi:e.hi},
              rest:e.rest,grp:e.grp||null,sets:[]};})};
  V.logIdx=0;V.tab="train";V.train="days";V.restEnd=0;V.restPaused=false;V.fresh=-1;
  keepAwake(true);syncDraft();saveDB();render();}

/* What the next set reads before the user touches anything. Once a set is logged in
   this session the next one inherits it, so straight sets cost one tap. The
   recommendation engine drives only the opening set. */
function syncDraft(){
  if(!S.active)return;
  var e=S.active.entries[V.logIdx];if(!e)return;
  var last=e.sets.length?e.sets[e.sets.length-1]:null;
  if(last){V.draft.w=num(last.w);V.draft.r=num(last.r);V.draft.rpe=last.rpe||8;return;}
  var p=prevPerf(e.name);
  var src=p?p.sets[0]:null;
  var rec=recommend(e);
  V.draft.w=rec&&rec.w?rec.w:(src?num(src.w):0);
  V.draft.r=src?num(src.r):e.planned.hi||8;
  V.draft.rpe=src&&src.rpe?src.rpe:8;}

function finishSession(){
  var a=S.active;
  a.entries=a.entries.filter(function(e){return e.sets.length;});
  if(!a.entries.length){S.active=null;V.restEnd=0;keepAwake(false);saveDB();render();return;}

  var prs=[];
  a.entries.forEach(function(e){
    var before=prFor(e.name).w, best=0, bestR=0;
    e.sets.forEach(function(x){if(!x.wu&&num(x.w)>best){best=num(x.w);bestR=num(x.r);}});
    if(best>0&&best>before)prs.push({n:e.name,w:best,r:bestR});});

  var prev=null;
  for(var i=0;i<S.sessions.length;i++)
    if(S.sessions[i].dayId===a.dayId){prev=S.sessions[i];break;}

  var vol=Math.round(sessionVolume(a));
  var allSets=[];a.entries.forEach(function(e){allSets=allSets.concat(e.sets);});
  var summary={dayName:a.dayName,date:a.date,vol:vol,
    mins:a.started?Math.max(1,Math.round((Date.now()-a.started)/60000)):0,
    sets:allSets.length,exs:a.entries.length,rpe:avgRPE(allSets),prs:prs,
    notes:a.notes||"",
    delta:prev?vol-Math.round(sessionVolume(prev)):null};

  recordSession(a);S.active=null;V.restEnd=0;keepAwake(false);
  saveDB();V.tab="train";V.train="days";
  play(prs.length?"pr":"complete");tap("ok");
  openSheet("done",summary);}


/* Adding an exercise mutates the plan or the live session, so it belongs with the
   other state-changing actions rather than in the entry point. */
function addExercise(name){
  var e=ex(name,3,8,12);
  if(V.sd&&V.sd.swaplive&&S.active){
    var cur=S.active.entries[V.logIdx];
    cur.name=name;cur.muscle=muscleOf(name);cur.sets=[];
    saveDB();closeSheet();syncDraft();render();return;}
  var d=dayOf(V.dayId);if(!d){closeSheet();return;}
  if(V.sd&&V.sd.replace){
    var i=d.ex.findIndex(function(x){return x.id===V.sd.replace;});
    if(i>=0){e.sets=d.ex[i].sets;e.lo=d.ex[i].lo;e.hi=d.ex[i].hi;e.rest=d.ex[i].rest;d.ex[i]=e;}
  }else d.ex.push(e);
  saveDB();closeSheet();}

export {ACT, addExercise, askConfirm, askText, closeSheet, finishSession, openSheet, runAct, startDay, syncDraft, val};
