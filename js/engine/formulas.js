/* Bunyan — formulas
   Training and body maths: volume, 1RM, RPE, BMR, progression. */
import {FOODDB, sumNutrition} from "./nutrition.js";
import {EXDB, isUnilateral, muscleOfEntry} from "../data/exercises.js";
import {isActivity} from "../data/activities.js";
import {dayRec, S, saveDB, split} from "../state.js";
import {num, r1, today} from "../util.js";
import {t} from "../i18n/dict.js";
import {fmtW} from "../units.js";
import {progressionAdvice} from "../coach/autoreg.js";
import {e1rm} from "../coach/util.js";
import {blockNow, plannedLight} from "./blocks.js";
import {avg7Of, bmrOf, lastWeightOf, macroTargetsOf, proteinFor, sessionKcalOf, targetKcalOf, tdeeFormulaOf,
        tdeeOf} from "./body.js";

/* ============================================================ formulas */
/* A warm-up counts for nothing: not volume, not average RPE, not a record, and not
   the progression check. It is there so the row exists, not so it scores. */
/* ---- bodyweight lifts ------------------------------------------------------------
   On a bodyweight exercise the weight box is what is ADDED to you — a belt, a vest, a
   dumbbell between the feet — and 0 is you alone. The load that counts for volume,
   estimated max and records is the share of the body the movement lifts, at the
   weight logged on or before that day, plus what was added. Before this a pull-up
   logged at 0 scored nothing: no volume, no estimated max, no strength line.

   The shares are the commonly measured ones: a pull-up, chin-up or dip lifts about the
   whole body; a push-up about two thirds of it, less on an incline and more with the
   feet raised; an inverted row a little over half; a squat or lunge everything above
   the shins. Bodyweight core work (planks, crunches, leg raises) is not in the table
   and stays scored by reps and time, as it was. */
var BW_SHARE=[[/handstand push/i,1],[/bench dip/i,.6],[/incline push/i,.45],[/decline push|push-?ups? with feet elevated/i,.75],
  [/pull-?ups?|chin-?ups?|muscle-?ups?|\bdips?\b/i,1],[/push-?ups?|press-?ups?/i,.65],[/inverted row/i,.6],
  [/squat|lunge|step-?ups?|pistol/i,.85]];
function bwShare(name){
  var v=EXDB&&EXDB[name];
  if(!v||v.e!=="Bodyweight"||!name)return 0;
  for(var i=0;i<BW_SHARE.length;i++)if(BW_SHARE[i][0].test(name))return BW_SHARE[i][1];
  return 0;}
/* The body weight on a day: the last weigh-in on or before it, else the first one
   after, else the profile's. */
function bodyAt(date){
  var b=S.body||[],before=0,after=0;
  for(var i=0;i<b.length;i++){
    if(!b[i].weight)continue;
    if(!date||b[i].date<=date)before=b[i].weight;else if(!after)after=b[i].weight;}
  return before||after||num(S.profile&&S.profile.weight,0);}
/* The load a set moved. A figure close to the lifter's own weight was the whole load —
   logged before the box said "added" — and is taken as it stands. */
function loadOf(name,w,date){
  var k=bwShare(name),add=num(w);
  if(!k)return add;
  var bw=bodyAt(date);
  if(!bw||add>=bw*0.8)return add;
  return r1(bw*k+add);}
function setVol(x,name,date){return x.wu?0:loadOf(name,x.w,date)*num(x.r);}
function volume(sets,name,date){var tot=0;for(var i=0;i<sets.length;i++)tot+=setVol(sets[i],name,date);return tot;}
function sessionVolume(s){var tot=0;s.entries.forEach(function(e){tot+=volume(e.sets||[],e.name,s.date);});return tot;}
function avgRPE(sets){var n=0,tot=0;sets.forEach(function(x){if(x.wu||!x.rpe)return;tot+=x.rpe;n++;});return n?r1(tot/n):0;}
/* Epley, capped at 12 reps. A single is a max already: Epley would add 3% to it. */
/* The estimated one-rep max, counting reps in reserve from RPE: one formula, the
   coach's (js/coach/util.js), used everywhere. */
function e1RM(w,r,rpe){return e1rm(w,r,rpe);}
function bestE1RM(sets,name,date){var b=0;sets.forEach(function(x){if(x.wu)return;var e=e1RM(loadOf(name,x.w,date),num(x.r),x.rpe);if(e>b)b=e;});return b;}
function macroKcal(p,c,f){return Math.round(num(p)*4+num(c)*4+num(f)*9);}
/* The body's maths lives in body.js, which is handed what it needs; these pass in
   this profile's state, so the screens and the coach keep calling them as before. */
function bmr(){return bmrOf(S.profile,S.body);}
function tdeeFormula(){return tdeeFormulaOf(S.profile,S.body);}
/* Maintenance in use: what the log measured, once the person chose to build their
   targets on it (S.energy, set from js/engine/energy.js); otherwise the formula. */
function tdee(){return tdeeOf(S.profile,S.body,S.energy);}
function targetKcal(){return targetKcalOf(S.profile,S.body,S.energy);}
function proteinTarget(w){return proteinFor(S.profile,w);}
function macroTargets(){return macroTargetsOf(S.profile,S.body,S.energy);}
/* Clearing Safari's data wipes everything and there is no server copy, so losing a
   history is the most likely real harm this app can do. Once there is enough logged to
   be worth protecting, ask — quietly, and only every so often. */
var BACKUP_EVERY=30*864e5, BACKUP_SNOOZE=7*864e5;
function backupDue(){
  if(S.sessions.length<5)return false;
  var now=Date.now();
  if((S.backupSnooze||0)>now)return false;
  return now-(S.lastBackup||0)>BACKUP_EVERY;}
function backupAgeDays(){
  if(!S.lastBackup)return null;
  return Math.floor((Date.now()-S.lastBackup)/864e5);}

function lastWeight(){return lastWeightOf(S.body);}
/* Calories burned by a session (body.js has the equation), at the latest weigh-in.
   0 when no body weight has ever been logged: the caller shows something it knows. */
function sessionKcal(mins){return sessionKcalOf(lastWeight(),mins);}
function avg7(){return avg7Of(S.body);}
/* Working sets only. The "last time" column and the recommendation engine would both
   be misled by a warm-up. */
function prevPerf(name){
  for(var i=0;i<S.sessions.length;i++){
    var e=S.sessions[i].entries.filter(function(x){return x.name===name&&x.sets.length;})[0];
    if(e){
      var work=e.sets.filter(function(x){return !x.wu;});
      if(work.length)return {date:S.sessions[i].date,sets:work};}
  } return null;}
function prFor(name){
  var best={w:0,e:0,vol:0,reps:0,date:null};
  S.sessions.forEach(function(s){s.entries.forEach(function(e){
    if(e.name!==name)return;
    e.sets.forEach(function(x){
      if(x.wu)return;
      var w=num(x.w),r=num(x.r);
      if(w>best.w){best.w=w;best.reps=r;best.date=s.date;}
      var ld=loadOf(name,w,s.date),er=e1RM(ld,r,x.rpe);if(er>best.e)best.e=er;
      if(ld*r>best.vol)best.vol=ld*r;
    });});});
  return best;}
/* The next load step, in kg, by what the load is made of — the smallest jump that
   is real on that equipment — and never more than about a tenth of the load, so a
   10 kg lateral raise does not jump 25%. In pounds the steps are pound-sized plates.
   Bodyweight work progresses by reps, not load. */
/* A step set on the exercise itself (S.incr, kg) wins over all of this: a gym whose
   stack moves in 7 kg, or a lifter with 0.5 kg micro plates, knows better. */
function incrementFor(name,top,auto){
  var own=!auto&&S.incr&&num(S.incr[name]);
  if(own>0)return own;
  var v=EXDB&&EXDB[name],eq=v&&v.e||"Other",lb=S.prefs&&S.prefs.unit==="lb";
  var heavy=/Squat|Deadlift|Leg Press|Hack|Hip Thrust/i.test(name);
  var base=eq==="Barbell"?(heavy?5:2.5):eq==="Dumbbell"?2:eq==="Kettlebell"?4:eq==="Bodyweight"?0:2.5;
  if(lb)base=eq==="Barbell"?(heavy?10:5)/2.2046:eq==="Kettlebell"?9/2.2046:eq==="Bodyweight"?0:5/2.2046;
  if(!base)return 0;
  /* Dumbbells logged as the pair's total move two dumbbells at once. */
  if(eq==="Dumbbell"&&dbTotal()&&!isUnilateral(name))base*=2;
  var mode=S.profile.prog;
  if(mode==="conservative")base=base/2;else if(mode==="aggressive")base=base*2;
  var cap=Math.max(lb?2.5/2.2046:1,(top||0)*0.1);
  return Math.round(Math.min(base,cap)*100)/100;}
/* No gain in estimated max across the last three sessions of a lift, compared with
   the one before them. Deliberately conservative: four sessions of history, working
   sets only, and it only ever suggests. */
function plateauOf(name){
  var best=[];
  for(var i=0;i<S.sessions.length&&best.length<4;i++){
    var e=S.sessions[i].entries.filter(function(x){return x.name===name&&x.sets&&x.sets.length;})[0];
    if(!e)continue;
    var b=0,d=S.sessions[i].date;e.sets.forEach(function(x){if(x.wu)return;var v=e1RM(loadOf(name,x.w,d),num(x.r),x.rpe);if(v>b)b=v;});
    if(b)best.push(b);}
  if(best.length<4)return false;
  return Math.max(best[0],best[1],best[2])<=best[3];}
/* How dumbbell loads are entered: per hand (the default, and what the numbers on the
   dumbbells say) or as the pair's total. */
function dbTotal(){return !!(S.prefs&&S.prefs.dbLoad==="total");}
/* To the nearest real step, so a suggestion is always a weight that exists. */
function snapDown(x,step){step=step||1.25;return Math.max(0,Math.round(Math.round(x/step)*step*100)/100);}
/* ---- a lighter week ----------------------------------------------------------
   Suggested, never imposed. Due when there has been a solid block of training (five
   weeks since the last one, or since the start) and the log shows it: two or more
   lifts stalled, or two weeks of sets close to failure. While it runs the plan's
   sets drop by about 40% and suggested loads by about 10%. */
function isoDays(a,b){return Math.round((new Date(b+"T00:00:00")-new Date(a+"T00:00:00"))/864e5);}
/* A lighter week runs when one was started from the card, or when a training block
   reaches its planned one (js/engine/blocks.js). */
function inDeload(){return !!(S.deload&&S.deload.until&&today()<=S.deload.until)||plannedLight();}
function deloadDue(){
  /* Blocks bring their own lighter week every fourth, so none is suggested on top. */
  if(inDeload()||blockNow()||S.sessions.length<12)return null;
  var now=today(),dl=S.deload||{};
  if(dl.snooze&&now<dl.snooze)return null;
  var since=dl.last||S.sessions[S.sessions.length-1].date;
  if(isoDays(since,now)<35)return null;
  var recent=S.sessions.filter(function(s){var d=isoDays(s.date,now);return d>=0&&d<=14;});
  if(recent.length<3)return null;
  var names={},rp=[],sr=[];
  recent.forEach(function(s){
    if(s.srpe)sr.push(s.srpe);
    s.entries.forEach(function(e){
      if(!e.sets||!e.sets.length||isActivity(e.name))return;
      names[e.name]=1;
      e.sets.forEach(function(x){if(!x.wu&&x.rpe)rp.push(x.rpe);});});});
  var flat=Object.keys(names).filter(plateauOf).length;
  if(flat>=2)return {why:"plateau",n:flat};
  var mean=function(a){return a.reduce(function(x,y){return x+y;},0)/a.length;};
  if((rp.length>=6&&mean(rp)>=9)||(sr.length>=3&&mean(sr)>=8.5))return {why:"effort"};
  return null;}
function deloadSets(n){return Math.max(1,Math.round(num(n,3)*0.6));}

/* ---- records -------------------------------------------------------------------
   A set is a record when it beats everything before it — earlier sessions and the
   sets already done today — by weight, by estimated max, or by reps at that weight
   or heavier. The first time a lift is ever logged there is nothing to beat, so it is
   not called a record. */
function repsAt(name,w){
  var best=0;
  S.sessions.forEach(function(s){s.entries.forEach(function(e){
    if(e.name!==name)return;
    e.sets.forEach(function(x){if(!x.wu&&num(x.w)>=w&&num(x.r)>best)best=num(x.r);});});});
  return best;}
/* A bodyweight lift can set a record with nothing added: more reps, or a better
   estimated max as the lifter gets lighter or stronger. */
function recordOf(name,x,earlier){
  var bwl=bwShare(name)>0;
  if(!x||x.wu||!(num(x.r)>0)||isActivity(name))return null;
  if(!(num(x.w)>0)&&!bwl)return null;
  var h=prFor(name);if(!h.date)return null;
  var w=num(x.w),r=num(x.r),pw=h.w,pe=h.e,pr=repsAt(name,w),now=today();
  (earlier||[]).forEach(function(y){
    if(y.wu)return;var yw=num(y.w),yr=num(y.r);
    if(yw>pw)pw=yw;var ye=e1RM(loadOf(name,yw,now),yr,y.rpe);if(ye>pe)pe=ye;if(yw>=w&&yr>pr)pr=yr;});
  if(w>pw)return {k:"w",n:name,w:w,r:r};
  var er=e1RM(loadOf(name,w,now),r,x.rpe);
  if(er&&er>pe)return {k:"e",n:name,w:w,r:r,e:er};
  if(pr>0&&r>pr)return {k:"r",n:name,w:w,r:r};
  return null;}
/* The best record in one exercise's sets: weight first, then estimated max, then reps. */
var RANK={w:3,e:2,r:1};
function recordsIn(e){
  var best=null;
  (e.sets||[]).forEach(function(x,i){
    var rec=recordOf(e.name,x,e.sets.slice(0,i));
    if(rec&&(!best||RANK[rec.k]>RANK[best.k]||(rec.k===best.k&&rec.w>best.w)))best=rec;});
  return best;}

/* How a set's weight reads: "BW + 10 kg" or "BW" on a bodyweight lift. */
function loadText(name,w){
  if(bwShare(name)>0)return num(w)>0?t("BW")+" + "+fmtW(w):t("BW");
  return fmtW(w);}
function recordText(rec){
  if(!rec)return "";
  if(rec.k==="e")return t("New best estimated max")+": "+fmtW(rec.e)+" ("+loadText(rec.n,rec.w)+" \u00d7 "+rec.r+")";
  if(rec.k==="r")return t("Rep record")+": "+rec.r+" \u00d7 "+loadText(rec.n,rec.w);
  return t("New record")+": "+loadText(rec.n,rec.w)+" \u00d7 "+rec.r;}
function recommend(e){
  var p=prevPerf(e.name);
  if(!p||!p.sets.length)return null;
  var top=0,topR=0,rpes=[];
  p.sets.forEach(function(x){
    if(num(x.w)>top){top=num(x.w);topR=num(x.r);}
    if(x.rpe)rpes.push(x.rpe);});
  var avg=rpes.length?rpes.reduce(function(a,b){return a+b;},0)/rpes.length:0;
  var hitTop=p.sets.filter(function(x){return num(x.r)>=e.planned.hi;}).length>=Math.max(1,p.sets.length-1);
  var inc=incrementFor(e.name,top);
  var w=top,note;
  /* As many as you can: the target is last time's best, not a range. */
  if(e.planned.amrap)return {w:top,lo:0,hi:0,amrap:true,last:(top?top+" \u00d7 ":"")+topR};
  if(!top){
    /* Body weight alone: progress by reps, then by a little added load. */
    var bwOnly=!e.planned.timed&&(bwShare(e.name)>0||(EXDB&&EXDB[e.name]&&EXDB[e.name].e==="Bodyweight"));
    if(bwOnly)return {w:0,bw:true,lo:e.planned.lo,hi:e.planned.hi,last:topR+"",
      note:hitTop?"Top of the range on body weight alone. Add a rep or two, or a little weight if you have a belt or vest."
        :"Same as last time, and aim for one more rep on each set."};
    return {w:0,lo:e.planned.lo,hi:e.planned.hi,note:"Find a weight you can control for "+e.planned.lo+" reps."};}
  /* Short of the range: held twice, lighter the third time (js/coach/autoreg.js). The
     load is the logged one, so a suggestion is a weight on the bar, not body weight. */
  var adv=progressionAdvice(S.sessions,e.name,{lo:e.planned.lo,hi:e.planned.hi},{load:function(n,x){return num(x);}});
  if(inDeload()){w=snapDown(top*0.9,inc)||top;note="Lighter week: about 10% less and fewer sets. Leave three or four reps in the tank.";}
  else if(adv.kind==="deload"){w=snapDown(adv.w*0.9,inc)||top;note="Short of the range three sessions running. About 10% lighter for a week, same reps, then build back up.";}
  else if(adv.kind==="hold"){w=adv.w;note="Short of the range twice at this weight. Hold it and chase the reps; a third miss means a lighter week.";}
  /* Reported effort earns a bigger step only when it was reported: the top of the
     range at RPE 7 or less means reps to spare. Still no more than a tenth. */
  else if(hitTop&&avg&&avg<=7&&inc){
    w=Math.round((top+Math.min(inc*2,Math.max(inc,top*0.1)))*100)/100;
    note="Top of the range with reps to spare. A bigger step this time.";}
  /* At the top but close to failure: the step is earned, the recovery is not certain. */
  else if(hitTop&&avg>=9&&inc){w=Math.round((top+inc)*100)/100;note="Top of the range, but close to failure. The weight goes up; if it was a grind, hold it instead.";}
  else if(hitTop&&inc){w=Math.round((top+inc)*100)/100;note="You hit the top of the range last time.";}
  else if(plateauOf(e.name)){w=top;note="No gain in three sessions. Hold this weight and chase a rep, or take a lighter week.";}
  else if(avg&&avg>=9.5){w=top;note="Last session was near failure. Hold this weight.";}
  else note="Same weight, aim for more reps.";
  /* How the lifter feels today (asked as the workout starts) moves today's number, and
     says so. A lighter week or a planned deload already sets it lighter. Drained: about
     5% under last time. Low: last time's weight, never more. Great, after a session
     with reps to spare: the bigger step. */
  var rd=S.active&&num(S.active.ready);
  if(rd&&!inDeload()&&adv.kind!=="deload"){
    if(rd===1){w=snapDown(top*0.95,inc)||top;note="A drained day: about 5% under last time, same reps. It still counts.";}
    else if(rd===2&&w>top){w=top;note="A low day: last time's weight, not more. The step can wait for next time.";}
    else if(rd===5&&hitTop&&avg&&avg<=8&&inc&&w<=Math.round((top+inc)*100)/100){
      w=Math.round((top+Math.min(inc*2,Math.max(inc,top*0.1)))*100)/100;note="A great day after reps to spare last time: a bigger step.";}}
  return {w:w,lo:e.planned.lo,hi:e.planned.hi,note:note,last:top+" \u00d7 "+topR,ready:rd||0};}
function progressionHint(e){
  if(!e.sets.length)return null;
  var work=e.sets.filter(function(x){return !x.wu&&num(x.r)>0;});
  if(work.length<Math.max(2,e.planned.sets-1))return null;
  var allTop=work.every(function(x){return num(x.r)>=e.planned.hi;});
  if(!allTop)return null;
  var w=Math.max.apply(null,work.map(function(x){return num(x.w);}));
  if(!w)return null;
  var inc=incrementFor(e.name,w);if(!inc)return null;
  return {inc:inc,next:Math.round((w+inc)*100)/100};}
function weeklySets(){
  var cut=Date.now()-7*864e5,out={};
  S.sessions.forEach(function(s){
    if(new Date(s.date+"T00:00:00").getTime()<cut)return;
    s.entries.forEach(function(e){
      if(!e.sets.length||isActivity(e.name))return;
      /* Resolved from the library, not the copy stored on the entry: that copy is
         written when the exercise joins a plan and is "Other" for any plan built
         before the library finished loading. Grouping on it silently files a whole
         programme under "Other". */
      /* Working sets: a warm-up is not training volume. */
      var n=e.sets.filter(function(x){return x&&!x.wu;}).length;if(!n)return;
      var m=muscleOfEntry(e);
      out[m]=(out[m]||0)+n;});});
  return out;}
function daysSince(muscle){
  for(var i=0;i<S.sessions.length;i++){
    var hit=S.sessions[i].entries.some(function(e){return muscleOfEntry(e)===muscle&&e.sets.length;});
    if(hit)return Math.floor((Date.now()-new Date(S.sessions[i].date+"T00:00:00").getTime())/864e5);
  } return null;}
function consistency(){
  var cut=Date.now()-28*864e5;
  var n=S.sessions.filter(function(s){return new Date(s.date+"T00:00:00").getTime()>=cut;}).length;
  var planned=split().days.filter(function(d){return d.ex.length;}).length*4;
  return planned?Math.min(100,Math.round(n/planned*100)):0;}
function mealTotal(name,d){
  var r=dayRec(d),m=r.meals[name];
  return sumNutrition(m&&m.items||[]);}
function eatenToday(d){
  var r=dayRec(d),all=[];
  Object.keys(r.meals).forEach(function(k){
    var m=r.meals[k];
    (m.items||[]).forEach(function(i){all.push(i);});});
  return sumNutrition(all);}
function bumpFreq(id){if(!id)return;S.freq[id]=(S.freq[id]||0)+1;}
function frequentFoods(n){
  var pool=(S.myFoods||[]).concat(FOODDB||[]);
  return Object.keys(S.freq||{})
    .sort(function(a,b){return S.freq[b]-S.freq[a];})
    .map(function(id){return pool.filter(function(f){return f.id===id;})[0];})
    .filter(Boolean).slice(0,n||8);}
function addItems(meal,items,d){
  var r=dayRec(d);
  if(!r.meals[meal])r.meals[meal]={done:true,items:[]};
  items.forEach(function(i){r.meals[meal].items.push(i);bumpFreq(i.fid);});
  r.meals[meal].done=true;
  saveDB();}



export {bmr, bodyAt, bwShare, loadOf, loadText, recordText, dbTotal, deloadDue, deloadSets, inDeload, recordOf, recordsIn, snapDown, proteinTarget, incrementFor, plateauOf, addItems, avg7, avgRPE, BACKUP_SNOOZE, backupAgeDays, backupDue, bestE1RM, consistency, e1RM, daysSince, eatenToday, frequentFoods, lastWeight, macroKcal, prevPerf, prFor, progressionHint, recommend, sessionKcal, sessionVolume, targetKcal, tdee, tdeeFormula, volume, weeklySets, macroTargets};
