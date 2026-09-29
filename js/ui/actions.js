/* Bunyan — actions
   Sheet plumbing and the ACT registry: things that change state. */
import {t} from "../i18n/dict.js";
import {exIdOf, kindOf, LIB, muscleOf, muscleOfEntry} from "../data/exercises.js";
import {actInfo, actMuscle, isActivity} from "../data/activities.js";
import {exName} from "../i18n/exnames.js";
import {deloadSets, inDeload, recordsIn, avgRPE, prevPerf, recommend, sessionVolume} from "../engine/formulas.js";
import {noteSet, sessionClock, sessionWall} from "./views/session.js";
import {leave} from "./motion.js";
import {FOODDB, nutritionFor, recalcItem, toLogItem} from "../engine/nutrition.js";
import {render} from "./render.js";
import {pushNav} from "./nav.js";
import {day, ex} from "../data/splits.js";
import {editSplit, ownerOf, adoptSplit, allSplits, CUR, curProfile, dayOf, dayRec, DEF, dropProfileData, migrate, PROFILES, recordSession, S, saveDB, setProfiles, setS, split, switchProfile} from "../state.js";
import {MEM, num, PERSIST, r1, today, uid, wr} from "../util.js";
import {audioOn, endRest, keepAwake, play, tap, toast, V} from "./view.js";

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

/* A new split opens straight in its builder, with three days to start from. It is
   not made your training until you say so — the builder's button does that. */
ACT.newsplit=function(name){
  var sp={id:uid(),name:String(name).trim(),tag:"custom",custom:true,days:[day("Day 1",[]),day("Day 2",[]),day("Day 3",[])]};
  (S.userSplits=S.userSplits||[]).push(sp);
  saveDB();pushNav();V.previewId=sp.id;V.train="builder";render();window.scrollTo(0,0);};
ACT.renamesplit=function(name,id){
  var sp=editSplit(id);if(!sp)return;sp.name=String(name).trim();
  var us=(S.userSplits||[]).filter(function(x){return x.id===id;})[0];if(us)us.name=sp.name;
  saveDB();render();};
ACT.addday=function(name){split().days.push(day(name,[]));saveDB();render();};
ACT.renameday=function(name,id){
  var d=dayOf(id);if(!d)return;d.name=name;saveDB();render();};
ACT.adopt=function(_,id){
  var pre=allSplits().filter(function(x){return x.id===id;})[0];
  if(!pre)return;
  S.myPlan=adoptSplit(pre);saveDB();V.train="days";render();
  toast(pre.name+" "+t("is now your training."));};
ACT.delday=function(_,id){
  var sp=ownerOf(id)||split();sp.days=sp.days.filter(function(x){return x.id!==id;});
  V.train=V.previewId&&editSplit(V.previewId)===sp?"builder":"days";saveDB();render();};
ACT.delsplit=function(_,id){
  var gone=(S.userSplits||[]).filter(function(x){return x.id===id;})[0];
  S.userSplits=(S.userSplits||[]).filter(function(x){return x.id!==id;});
  /* Its active copy stays your training, but stops mirroring into a split that is gone. */
  if(S.myPlan&&S.myPlan.source===id)S.myPlan.source=null;
  if(V.train==="builder"&&V.previewId===id){V.train="splits";V.previewId=null;}
  saveDB();render();if(gone)toast(gone.name+" "+t("deleted."));};
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
  (S.myEx=S.myEx||[]).push({id:"u_"+uid(),n:name,m:m});
  saveDB();
  /* Put the picker's context back so a custom exercise can still land in the day or
     replace the live one, exactly like a library pick. */
  V.sd=(d&&d.from)||null;
  var landed=!!dayOf(V.dayId)||(V.sd&&V.sd.swaplive&&S.active);
  addExercise(name);
  if(!landed){V.sd=null;render();toast(name+" "+t("is in your library."));}};
ACT.delset=function(_,i){
  var e=S.active&&S.active.entries[V.logIdx];if(!e)return;
  /* Play the row out before the state change removes it. Splicing first would leave
     nothing on screen to animate, and the list would appear to jump. */
  leave(document.querySelector('#app .setrow[data-k="set:'+i+'"]'),function(){
    e.sets.splice(i,1);V.fresh=-1;saveDB();syncDraft();render();});};
ACT.discard=function(){
  S.active=null;endRest();V.fresh=-1;
  keepAwake(false);saveDB();V.tab="train";V.train="days";render();window.scrollTo(0,0);};
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
  if(g<=0){toast(t(d.unit?"Enter an amount first.":"Enter a number of grams."));return;}
  if(!it)return;
  /* An amount in the item's own measure keeps that measure; grams become grams. */
  it.parsed.unit=d.unit||"g";it.parsed.qty=g;
  recalcItem(it);render();};
ACT.savemeal=function(name,d){
  /* A pending "Did you mean" has no food yet; toLogItem would throw on it. */
  var good=V.food.items.filter(function(i){return i.status!=="unknown"&&i.status!=="suggest";}).map(toLogItem);
  openSheet("addfood",{meal:d.meal});
  if(!good.length){toast(t("Nothing to save."));return;}
  S.savedMeals.push({id:uid(),name:name,items:good});saveDB();
  render();toast(t("Saved as")+" “"+name+"”.");};

function startDay(dayId){
  var d=dayOf(dayId);if(!d||!d.ex.length)return;
  /* Created on the tap that starts the workout (a user gesture, which iOS requires),
     so logging the first set does not pay for it. */
  audioOn();
  S.active={id:uid(),date:today(),started:Date.now(),lastSet:Date.now(),activeMs:0,idx:0,
    splitId:split().id,dayId:d.id,dayName:d.name,
    entries:d.ex.map(function(e){
      /* Resolved from the library as the session is created, so the record this
         workout leaves behind is right even if the plan's cached muscle is not. */
      return {name:e.name,exId:e.exId||exIdOf(e.name),kind:kindOf(e.name),muscle:muscleOfEntry(e),planned:{sets:isActivity(e.name)||!inDeload()?e.sets:deloadSets(e.sets),lo:e.lo,hi:e.hi,min:e.min||0,rpe:e.rpe||0,km:e.km||0},
              rest:e.rest,grp:e.grp||null,sets:[]};})};
  V.logIdx=0;V.tab="train";V.train="days";endRest();V.fresh=-1;
  keepAwake(true);syncDraft();saveDB();render();}

/* A run, a match, a class — logged on its own, outside the plan. It carries no day
   id, so the rotation carries on from the last planned day as if it had not happened. */
function startActivity(name){
  if(S.active)return;
  S.active={id:uid(),date:today(),started:Date.now(),lastSet:Date.now(),activeMs:0,idx:0,
    splitId:split().id,dayId:null,dayName:exName(name),
    entries:[{name:name,exId:exIdOf(name),kind:"activity",muscle:actMuscle(name)||"Cardio",planned:{sets:1,lo:0,hi:0},rest:0,grp:null,sets:[]}]};
  V.logIdx=0;V.tab="train";V.train="days";endRest();V.fresh=-1;
  keepAwake(true);syncDraft();saveDB();render();}

/* What the next set reads before the user touches anything. Once a set is logged in
   this session the next one inherits it, so straight sets cost one tap. The
   recommendation engine drives only the opening set. */
function syncDraft(){
  if(!S.active)return;
  var e=S.active.entries[V.logIdx];if(!e)return;
  var last=e.sets.length?e.sets[e.sets.length-1]:null;
  if(isActivity(e.name)){
    /* The plan's target first, then the last time, then a sensible default. */
    var pl=e.planned||{},pa=last||(pl.min?null:(prevPerf(e.name)||{sets:[]}).sets[0]);
    V.draft.min=pa&&pa.min?num(pa.min):pl.min||(actInfo(e.name).grp==="Sports"?60:30);
    V.draft.km=pa&&pa.km?num(pa.km):pl.km||0;V.draft.rpe=pa&&pa.rpe?pa.rpe:pl.rpe||6;return;}
  /* RPE starts empty on every set. It is how that set felt, which nothing can know
     in advance; a pre-filled 8 was being saved as if the lifter had said it, and the
     progression rule then trusted it. */
  /* Whatever goes in the fields here is a suggestion, and is shown as one until the
     lifter touches it; a set logged untouched is marked as such. */
  V.draftSg=true;
  if(last){V.draft.w=num(last.w);V.draft.r=num(last.r);V.draft.rpe=null;return;}
  var p=prevPerf(e.name);
  var src=p?p.sets[0]:null;
  var rec=recommend(e);
  V.draft.w=rec&&rec.w?rec.w:(src?num(src.w):0);
  V.draft.r=src?num(src.r):e.planned.hi||8;
  V.draft.rpe=null;
  if(!p)V.draftSg=false;}

function finishSession(){
  var a=S.active;
  /* Counted before the filter below drops untouched exercises, because "6 of 6" and
     "every planned set logged" are about what the day asked for, not about what
     survived. */
  var exsPlanned=a.entries.length;
  var setsPlanned=a.entries.reduce(function(n,e){
    return n+((e.planned&&e.planned.sets)||0);},0);
  /* Untouched exercises are dropped — except one flagged as painful: that flag is
     history worth keeping, so a pattern can be noticed next time. */
  a.entries=a.entries.filter(function(e){return e.sets.length||e.pain;});
  if(!a.entries.some(function(e){return e.sets.length;})){S.active=null;endRest();keepAwake(false);saveDB();render();return;}

  /* A record by weight, by estimated max, or by reps at a weight — the best one per
     exercise. Measured against history, which this session has not joined yet. */
  var prs=[];
  a.entries.forEach(function(e){var rec=recordsIn(e);if(rec)prs.push(rec);});

  var prev=null;
  for(var i=0;i<S.sessions.length;i++)
    if(S.sessions[i].dayId===a.dayId){prev=S.sessions[i];break;}

  /* A match logged after the fact lasted as long as it says, not as long as the
     screen was open. */
  var actMin=0,actKcalT=0,actKm=0;
  a.entries.forEach(function(e){if(!isActivity(e.name))return;
    e.sets.forEach(function(x){actMin+=num(x.min);actKcalT+=num(x.kcal);actKm+=num(x.km);});});
  if(actMin*60000>(sessionClock(a).ms||0)){a.activeMs=actMin*60000;a.lastSet=Date.now();}
  var vol=Math.round(sessionVolume(a));
  var allSets=[];a.entries.forEach(function(e){allSets=allSets.concat(e.sets);});
  if(!a.id)a.id="s"+Date.now().toString(36);
  var summary={id:a.id,actKcal:actKcalT,actKm:Math.round(actKm*10)/10,dayName:a.dayName,date:a.date,vol:vol,
    /* Active time, not wall clock: that is what was trained, and it keeps sessions
       comparable. The wall clock is stored too, since it cannot be recovered later. */
    mins:Math.max(1,Math.round(sessionClock(a).ms/60000)),
    /* The complete screen prints mm:ss. Deriving that from the rounded minutes would
       have put :00 after every workout ever logged — the format promising a precision
       the figure did not have. */
    secs:Math.max(1,Math.round(sessionClock(a).ms/1000)),
    wallMins:Math.max(1,Math.round(sessionWall(a)/60000)),
    sets:allSets.length,exs:a.entries.filter(function(e){return e.sets.length;}).length,rpe:avgRPE(allSets),prs:prs,
    notes:a.notes||"",
    /* What the complete screen needs to state an achievement rather than a number:
       the plan it is being measured against, and the session it is being compared to. */
    exsPlanned:exsPlanned,setsPlanned:setsPlanned,
    prevVol:prev?Math.round(sessionVolume(prev)):null,
    delta:prev?vol-Math.round(sessionVolume(prev)):null};

  recordSession(a);S.active=null;endRest();keepAwake(false);
  saveDB();V.tab="train";V.train="days";
  play(prs.length?"pr":"complete");tap("ok");
  openSheet("done",summary);}


/* Adding an exercise mutates the plan or the live session, so it belongs with the
   other state-changing actions rather than in the entry point. */
function addExercise(name){
  var e=ex(name,3,8,12);
  e.exId=exIdOf(name);
  /* A match or a run is planned as time and effort, not sets and reps. */
  if(isActivity(name)){e.sets=1;e.lo=0;e.hi=0;e.rest=0;
    e.min=actInfo(name).grp==="Sports"?60:30;e.rpe=6;}
  if(V.sd&&V.sd.swaplive&&S.active){
    var cur=S.active.entries[V.logIdx];
    var planned=isActivity(name)?{sets:1,lo:0,hi:0,min:e.min,rpe:e.rpe}
      :(isActivity(cur.name)?{sets:3,lo:8,hi:12}:{sets:cur.planned.sets,lo:cur.planned.lo,hi:cur.planned.hi});
    if(cur.sets.length){
      /* Sets already done stay with the exercise they were done on. The replacement
         comes in as the next exercise instead of overwriting them. */
      var fresh={name:name,exId:exIdOf(name),kind:kindOf(name),muscle:muscleOf(name),planned:planned,rest:isActivity(name)?0:cur.rest,grp:null,sets:[]};
      S.active.entries.splice(V.logIdx+1,0,fresh);
      V.logIdx=V.logIdx+1;S.active.idx=V.logIdx;
      toast(t("Your logged sets were kept. Next up:")+" "+exName(name));
    }else{
      cur.name=name;cur.exId=exIdOf(name);cur.kind=kindOf(name);cur.muscle=muscleOf(name);cur.planned=planned;cur.extra=0;
      if(isActivity(name))cur.rest=0;}
    endRest();V.fresh=-1;saveDB();closeSheet();syncDraft();render();return;}
  var d=dayOf(V.dayId);if(!d){closeSheet();return;}
  if(V.sd&&V.sd.replace){
    var i=d.ex.findIndex(function(x){return x.id===V.sd.replace;});
    if(i>=0){if(!isActivity(name)&&!isActivity(d.ex[i].name)){e.sets=d.ex[i].sets;e.lo=d.ex[i].lo;e.hi=d.ex[i].hi;e.rest=d.ex[i].rest;}d.ex[i]=e;}
  }else{
    d.ex.push(e);
    /* Added from the picker itself: it stays open so the next one can go straight in,
       and remembers what it added so a second tap can take it back out. */
    saveDB();closeSheet();toast(exName(name)+" "+t("added to")+" "+d.name+".");return;
  }
  saveDB();closeSheet();}
export {startActivity, ACT, addExercise, askConfirm, askText, closeSheet, finishSession, openSheet, runAct, startDay, syncDraft, val};
