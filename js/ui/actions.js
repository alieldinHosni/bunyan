/* Bunyan — actions
   Sheet plumbing and the ACT registry: things that change state. */
import {t} from "../i18n/dict.js";
import {exIdOf, kindOf, LIB, muscleOf, muscleOfEntry} from "../data/exercises.js";
import {actInfo, actMuscle, isActivity} from "../data/activities.js";
import {exName} from "../i18n/exnames.js";
import {deloadSets, inDeload, recordsIn, avgRPE, prevPerf, recommend, sessionVolume} from "../engine/formulas.js";
import {noteSet, sessionClock, sessionWall} from "./views/session.js";
import {coolFor} from "./views/warmup.js";
import {stopHold} from "./hold.js";
import {leave} from "./motion.js";
import {FOODDB, nutritionFor, recalcItem, toLogItem} from "../engine/nutrition.js";
import {render} from "./render.js";
import {pushNav, resetNav} from "./nav.js";
import {spreadWd} from "../engine/schedule.js";
import {day, ex} from "../data/splits.js";
import {addProgram, makeProgram, editSplit, ownerOf, allSplits, CUR, curProfile, dayOf, dayRec, DEF, dropProfileData, migrate, PROFILES, recordSession, S, saveDB, setProfiles, setS, split, switchProfile} from "../state.js";
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

/* A new program opens straight in its builder: three days, by weekday, spread over
   the week. It is not made active until you say so — the builder's button does that. */
ACT.newsplit=function(name){
  var wd=spreadWd(3);
  var sp={id:uid(),name:String(name).trim(),from:null,schedule:"week",
    days:[1,2,3].map(function(n,i){var d=day(t("Day")+" "+n,[]);d.wd=[wd[i]];return d;})};
  (S.programs=S.programs||[]).push(sp);
  saveDB();pushNav();V.previewId=sp.id;V.train="builder";render();window.scrollTo(0,0);};
ACT.renamesplit=function(name,id){
  var sp=editSplit(id);if(!sp)return;sp.name=String(name).trim();saveDB();render();};
/* A saved meal is made the way a program is: named first, then filled in its own
   screen from the same search as logging. */
ACT.newmeal=function(name){
  var m={id:uid(),name:String(name).trim(),items:[]};
  (S.savedMeals=S.savedMeals||[]).push(m);
  saveDB();pushNav();V.tab="food";V.meal=null;V.smeal=m.id;render();window.scrollTo(0,0);};
ACT.renamemeal=function(name,id){
  var m=(S.savedMeals||[]).filter(function(x){return x.id===id;})[0];if(!m)return;
  m.name=String(name).trim();saveDB();render();};
ACT.delsaved=function(_,id){
  var m=(S.savedMeals||[]).filter(function(x){return x.id===id;})[0];
  S.savedMeals=(S.savedMeals||[]).filter(function(x){return x.id!==id;});
  if(V.smeal===id){resetNav();V.smeal=null;V.fsec="foods";}
  saveDB();render();if(m)toast(m.name+" "+t("deleted."));};
ACT.addday=function(name){var d=day(name,[]);d.wd=[];split().days.push(d);saveDB();render();};
ACT.renameday=function(name,id){
  var d=dayOf(id);if(!d)return;d.name=name;saveDB();render();};
/* A template becomes your own program; one of yours becomes the active one. */
function useTemplate(id,activate){
  var tp=allSplits().filter(function(x){return x.id===id&&!editSplit(x.id);})[0];
  if(!tp)return null;
  return addProgram(makeProgram(tp),activate);}
ACT.adopt=function(_,id){
  var own=editSplit(id);
  if(own)S.activeProgram=own.id;else own=useTemplate(id,true);
  if(!own)return;
  V.tsec="today";S.prefs.tsec="today";V.tdate=null;
  saveDB();V.train="days";render();window.scrollTo(0,0);
  toast(own.name+" "+t("is now your training."));};
ACT.addprog=function(_,id){
  var own=useTemplate(id,false);if(!own)return;
  saveDB();V.previewId=own.id;V.train="builder";render();window.scrollTo(0,0);
  toast(own.name+" "+t("is in My programs."));};
ACT.delday=function(_,id){
  var sp=ownerOf(id)||split();sp.days=sp.days.filter(function(x){return x.id!==id;});
  V.train=V.previewId&&editSplit(V.previewId)===sp?"builder":"days";saveDB();render();};
ACT.delsplit=function(_,id){
  if(id===S.activeProgram){toast(t("Switch to another program first."));return;}
  var gone=editSplit(id);
  S.programs=(S.programs||[]).filter(function(x){return x.id!==id;});
  if(V.train==="builder"&&V.previewId===id){resetNav();V.train="days";V.tsec="explore";V.previewId=null;}
  saveDB();render();if(gone)toast(gone.name+" "+t("deleted."));};
/* An amount changed on the diet import's review screen: the same sum as below, on the
   draft, which is not saved until the plan is used. */
ACT.pigrams=function(v,d){
  var g=num(v,0);
  if(g<=0){toast(t("Enter a number of grams."));return;}
  var m=V.pparse&&V.pparse[d.m],it=m&&m.items[d.i];if(!it)return;
  scaleItem(it,g);render();};
function scaleItem(it,g){
  var f=((S.myFoods||[]).concat(FOODDB||[])).filter(function(x){return x.id===it.fid;})[0];
  if(f){var n=nutritionFor(f,g);
    it.kcal=n.kcal;it.p=n.p;it.c=n.c;it.f=n.f;it.fib=n.fib;}
  else{var k=it.grams?g/it.grams:1;
    it.kcal=Math.round(it.kcal*k);it.p=r1(it.p*k);it.c=r1(it.c*k);
    it.f=r1(it.f*k);it.fib=r1((it.fib||0)*k);}
  it.grams=g;it.label=g+" g";}
/* Editing a logged food item: recompute from the source food where we still have it,
   scale what was stored where we do not. */
ACT.editgrams=function(v,d){
  var g=num(v,0);
  if(g<=0){toast(t("Enter a number of grams."));return;}
  var m=dayRec(d.date).meals[d.meal],it=m&&m.items[d.idx];
  if(!it)return;
  scaleItem(it,g);
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
  var landed=!!dayOf(V.dayId)||(V.sd&&(V.sd.swaplive||V.sd.addlive)&&S.active)||!!(V.sd&&V.sd.timp&&V.tp);
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

/* Which week of its program today falls in, from the day it was imported or built
   with a start: 1 for the first seven days. 0 when the program has no start. */
function programWeek(sp){
  if(!sp||!sp.start)return 0;
  var ms=Date.parse(today()+"T00:00:00")-Date.parse(sp.start+"T00:00:00");
  return ms>=0?Math.floor(ms/6048e5)+1:0;}
/* An exercise kept for some weeks of a program — balance work in weeks 1–4, hops from
   week 9 — joins a workout only in those weeks. */
function inWeek(e,wk){return !(e.wk&&wk&&(wk<e.wk[0]||wk>e.wk[1]));}
function startDay(dayId){
  var d=dayOf(dayId);if(!d||!d.ex.length)return;
  var sp=ownerOf(d.id)||split(),wk=programWeek(sp);
  var list=d.ex.filter(function(e){return inWeek(e,wk);});
  if(!list.length)list=d.ex;
  /* Created on the tap that starts the workout (a user gesture, which iOS requires),
     so logging the first set does not pay for it. */
  audioOn();
  S.active={id:uid(),date:today(),started:Date.now(),lastSet:Date.now(),activeMs:0,idx:0,
    splitId:split().id,dayId:d.id,dayName:d.name,dayNotes:(d.notes||[]).slice(),
    entries:list.map(function(e){
      /* Resolved from the library as the session is created, so the record this
         workout leaves behind is right even if the plan's cached muscle is not. What
         the plan says about doing it — the cue, the starting weight, seconds or reps,
         one side at a time, as many as you can — travels with it. */
      var pl={sets:isActivity(e.name)||!inDeload()?e.sets:deloadSets(e.sets),lo:e.lo,hi:e.hi,min:e.min||0,rpe:e.rpe||0,km:e.km||0};
      if(e.note)pl.note=e.note;
      if(e.w0!=null)pl.w0=e.w0;
      if(e.timed)pl.timed=true;
      if(e.side)pl.side=true;
      if(e.amrap)pl.amrap=true;
      return {name:e.name,exId:e.exId||exIdOf(e.name),kind:e.timed&&!isActivity(e.name)?"timed":kindOf(e.name),muscle:muscleOfEntry(e),planned:pl,
              rest:e.rest,grp:e.grp||null,alt:e.alt||null,sets:[]};})};
  V.logIdx=0;V.tab="train";V.train="days";endRest();stopHold();V.fresh=-1;
  keepAwake(true);syncDraft();saveDB();render();}

/* A run, a match, a class — logged on its own, outside the plan. It carries no day
   id, so the rotation carries on from the last planned day as if it had not happened. */
function startActivity(name){
  if(S.active)return;
  S.active={id:uid(),date:today(),started:Date.now(),lastSet:Date.now(),activeMs:0,idx:0,
    splitId:split().id,dayId:null,dayName:exName(name),
    entries:[{name:name,exId:exIdOf(name),kind:"activity",muscle:actMuscle(name)||"Cardio",planned:{sets:1,lo:0,hi:0},rest:0,grp:null,sets:[]}]};
  V.logIdx=0;V.tab="train";V.train="days";endRest();stopHold();V.fresh=-1;
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
  /* Never done before: the plan's own starting weight, if it gave one. */
  V.draft.w=rec&&rec.w?rec.w:(src?num(src.w):num(e.planned&&e.planned.w0));
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
    delta:prev?vol-Math.round(sessionVolume(prev)):null,
    /* The cool-down for what was actually trained, shown on the complete sheet. */
    cool:coolFor(a.entries)};

  /* The plan's words for the day and each exercise were for doing it, not for the
     record: history keeps what describes the sets, not the cues. */
  delete a.dayNotes;delete a.warm;delete a.wuDone;
  a.entries.forEach(function(e){delete e.alt;if(e.planned){delete e.planned.note;delete e.planned.w0;}});
  recordSession(a);S.active=null;endRest();keepAwake(false);stopHold();V.cdDone={};
  saveDB();V.tab="train";V.train="days";
  play(prs.length?"pr":"complete");tap("ok");
  openSheet("done",summary);}


/* ---- changing the live workout --------------------------------------------------
   On the day, the plan is a starting point: an exercise can be swapped, dropped or
   added. Every one of these changes this session only; the program is untouched. */
/* A session entry for an exercise that was not in the plan. A replacement inherits the
   sets, reps and rest it replaces; anything else starts from 3 × 8–12. */
function liveEntry(name,like){
  var e=ex(name,3,8,12),act=isActivity(name);
  var planned=act?{sets:1,lo:0,hi:0,min:actInfo(name).grp==="Sports"?60:30,rpe:6}
    :(like&&!isActivity(like.name)?{sets:like.planned.sets,lo:like.planned.lo,hi:like.planned.hi}:{sets:3,lo:8,hi:12});
  return {name:name,exId:exIdOf(name),kind:kindOf(name),muscle:muscleOf(name),planned:planned,
    rest:act?0:(like&&!isActivity(like.name)?like.rest:e.rest),grp:null,sets:[]};}
/* The plan's other choice for a slot ("Pull-Ups or Seated Row"), swapped in before a
   set is logged. It keeps the slot's prescription and its grouping, and the first
   choice becomes its alternative, so the swap can be taken back. */
function swapAlt(alt,i,was){
  var a=S.active,cur=a&&a.entries[i];if(!cur||cur.sets.length)return;
  var fresh=liveEntry(alt,cur);
  if(!isActivity(alt))fresh.planned=JSON.parse(JSON.stringify(cur.planned));
  fresh.grp=cur.grp;fresh.alt=was;
  a.entries[i]=fresh;saveDB();syncDraft();render();
  toast(t("Swapped for {ex}.").replace("{ex}",exName(alt)));}
/* keep: the sets logged on the old exercise stay with it, and the replacement comes
   in as the next exercise. Otherwise the replacement takes its place, and anything
   logged on it goes with it. */
function swapLive(name,i,keep){
  var a=S.active,cur=a&&a.entries[i];if(!cur){closeSheet();return;}
  var fresh=liveEntry(name,cur);
  if(keep){
    a.entries.splice(i+1,0,fresh);
    V.logIdx=i+1;
    toast(t("Your logged sets were kept. Next up:")+" "+exName(name));
  }else{
    /* The group stays: a replacement in a superset is still in the superset. */
    fresh.grp=cur.grp||null;
    a.entries[i]=fresh;V.logIdx=i;}
  a.idx=V.logIdx;
  endRest();V.fresh=-1;saveDB();closeSheet();syncDraft();render();}
ACT.swapkeep=function(_,d){if(d)swapLive(d.name,d.i,true);};
ACT.swapdrop=function(_,d){if(d)swapLive(d.name,d.i,false);};

/* Adding an exercise mutates the plan or the live session, so it belongs with the
   other state-changing actions rather than in the entry point. */
function addExercise(name){
  /* Picked for a program still being imported (js/ui/views/timport.js): it goes into
     the draft, never into a saved day. */
  if(V.sd&&V.sd.timp&&V.tp){
    var ti=V.sd.timp,td=V.tp.days[ti.d],act=isActivity(name);
    if(!td){closeSheet();return;}
    if(ti.j!=null){
      var ce=ti.e||td.ex[ti.j];if(!ce){closeSheet();return;}
      ce.name=name;ce.conf="exact";if(!ce.raw)ce.raw=name;
      if(act){ce.min=ce.min||30;ce.sets=1;ce.lo=0;ce.hi=0;ce.rest=0;}
      openSheet("tiex",{d:ti.d,j:ti.j,e:ce});return;}
    td.ex.push({id:uid(),raw:name,name:name,conf:"exact",sets:act?1:3,lo:act?0:8,hi:act?0:12,rest:act?0:90,note:"",min:act?30:undefined});
    closeSheet();
    toast(t("{ex} added to {day}.").replace("{ex}",exName(name)).replace("{day}",td.name));
    return;}
  var e=ex(name,3,8,12);
  e.exId=exIdOf(name);
  /* A match or a run is planned as time and effort, not sets and reps. */
  if(isActivity(name)){e.sets=1;e.lo=0;e.hi=0;e.rest=0;
    e.min=actInfo(name).grp==="Sports"?60:30;e.rpe=6;}
  if(V.sd&&V.sd.swaplive&&S.active){
    var cur=S.active.entries[V.logIdx];if(!cur){closeSheet();return;}
    if(cur.sets.length){
      /* Sets already done on it: the lifter says what happens to them, rather than
         the app quietly keeping the old exercise in the workout. */
      var nS=cur.sets.length;
      askConfirm({title:t("Replace {ex}?").replace("{ex}",exName(cur.name)),icon:"swap",
        body:t(nS===1?"You logged 1 set on it. Keep it, with {new} next, or replace the exercise and delete the set."
                     :"You logged {n} sets on it. Keep them, with {new} next, or replace the exercise and delete the sets.")
             .replace("{n}",nS).replace("{new}",exName(name)),
        cta:t(nS===1?"Keep my set":"Keep my sets"),act:"swapkeep",
        alt:t(nS===1?"Replace it and delete the set":"Replace it and delete the sets"),altact:"swapdrop",altbad:true,
        data:{name:name,i:V.logIdx}});
      return;}
    swapLive(name,V.logIdx,false);return;}
  /* Added during a workout: it joins this session only, at the end, and the plan is
     left as it was. */
  if(V.sd&&V.sd.addlive&&S.active){
    var a=S.active,stamp=a.started,fresh=liveEntry(name,null);
    a.entries.push(fresh);
    saveDB();closeSheet();syncDraft();render();
    toast(t("{ex} added as exercise {n}.").replace("{ex}",exName(name)).replace("{n}",a.entries.length),function(){
      var b=S.active;if(!b||b.started!==stamp)return;
      var k=b.entries.indexOf(fresh);if(k<0||fresh.sets.length)return;
      b.entries.splice(k,1);if(V.logIdx>=b.entries.length)V.logIdx=b.entries.length-1;b.idx=V.logIdx;
      saveDB();syncDraft();render();});
    return;}
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
export {startActivity, swapAlt, ACT, addExercise, askConfirm, askText, closeSheet, finishSession, openSheet, runAct, startDay, syncDraft, val};
