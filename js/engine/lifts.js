/* Bunyan — the lifts, from what they are given
   The maths over a workout history: the load a set moved (body weight included where
   the movement lifts it), volume, estimated maxes, last time, records, plateaus, the
   next weight step, the lighter week's case, weekly sets and the suggestion for the
   next set. Nothing here reads the app's state: each function is handed the log it
   works from, so the same call gives the same answer on a screen and in the engine
   tests (tests/engine.mjs). formulas.js keeps the old names as one-line wrappers that
   pass S in; tests/architecture.mjs holds this module to never reaching state.js.

   The arguments, wherever they appear:
     log   {sessions, body, weight}: the finished workouts, newest first (as S keeps
           them); the weigh-ins, oldest first; and the profile's weight, used when no
           weigh-in has been logged
     now   today, "YYYY-MM-DD"; nowMs the same moment as a time, for the windows that
           count back in days
   The exercise library (js/data/exercises.js) is read for what an exercise is —
   its equipment, whether it is bodyweight or one-sided — not for anything the person
   logged. */
import {EXDB, isUnilateral, muscleOfEntry} from "../data/exercises.js";
import {isActivity} from "../data/activities.js";
import {num, r1} from "../util.js";
import {progressionAdvice} from "../coach/autoreg.js";
import {e1rm} from "../coach/util.js";

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
function bodyAtIn(log,date){
  var b=log.body||[],before=0,after=0;
  for(var i=0;i<b.length;i++){
    if(!b[i].weight)continue;
    if(!date||b[i].date<=date)before=b[i].weight;else if(!after)after=b[i].weight;}
  return before||after||num(log.weight,0);}
/* The load a set moved. A figure close to the lifter's own weight was the whole load —
   logged before the box said "added" — and is taken as it stands. */
function loadIn(log,name,w,date){
  var k=bwShare(name),add=num(w);
  if(!k)return add;
  var bw=bodyAtIn(log,date);
  if(!bw||add>=bw*0.8)return add;
  return r1(bw*k+add);}
/* A warm-up counts for nothing: not volume, not average RPE, not a record, and not
   the progression check. It is there so the row exists, not so it scores. */
function setVolIn(log,x,name,date){return x.wu?0:loadIn(log,name,x.w,date)*num(x.r);}
function volumeIn(log,sets,name,date){var tot=0;for(var i=0;i<sets.length;i++)tot+=setVolIn(log,sets[i],name,date);return tot;}
function sessionVolumeIn(log,s){var tot=0;s.entries.forEach(function(e){tot+=volumeIn(log,e.sets||[],e.name,s.date);});return tot;}
function avgRPE(sets){var n=0,tot=0;sets.forEach(function(x){if(x.wu||!x.rpe)return;tot+=x.rpe;n++;});return n?r1(tot/n):0;}
/* The estimated one-rep max, counting reps in reserve from RPE: one formula, the
   coach's (js/coach/util.js), used everywhere. */
function e1RM(w,r,rpe){return e1rm(w,r,rpe);}
function bestE1RMIn(log,sets,name,date){var b=0;sets.forEach(function(x){if(x.wu)return;var e=e1RM(loadIn(log,name,x.w,date),num(x.r),x.rpe);if(e>b)b=e;});return b;}

/* ---- last time, best ever ---------------------------------------------------------- */
/* Working sets only. The "last time" column and the recommendation engine would both
   be misled by a warm-up. */
function prevPerfIn(log,name){
  var ss=log.sessions||[];
  for(var i=0;i<ss.length;i++){
    var e=ss[i].entries.filter(function(x){return x.name===name&&x.sets.length;})[0];
    if(e){
      var work=e.sets.filter(function(x){return !x.wu;});
      if(work.length)return {date:ss[i].date,sets:work};}
  } return null;}
function prIn(log,name){
  var best={w:0,e:0,vol:0,reps:0,date:null};
  (log.sessions||[]).forEach(function(s){s.entries.forEach(function(e){
    if(e.name!==name)return;
    e.sets.forEach(function(x){
      if(x.wu)return;
      var w=num(x.w),r=num(x.r);
      if(w>best.w){best.w=w;best.reps=r;best.date=s.date;}
      /* A lift only ever done at body weight has history too: without a date here it
         could never set a record. */
      if(!best.date)best.date=s.date;
      var ld=loadIn(log,name,w,s.date),er=e1RM(ld,r,x.rpe);if(er>best.e)best.e=er;
      if(ld*r>best.vol)best.vol=ld*r;
    });});});
  return best;}

/* ---- the next weight step ----------------------------------------------------------
   By what the load is made of — the smallest jump that is real on that equipment —
   and never more than about a tenth of the load, so a 10 kg lateral raise does not jump
   25%. In pounds the steps are pound-sized plates. Bodyweight work progresses by reps,
   not load. A step set on the exercise itself wins over all of this: a gym whose stack
   moves in 7 kg, or a lifter with 0.5 kg micro plates, knows better.
   opts: {own: the exercise's own step (kg) or 0, lb: true in pounds, dbTotal: dumbbells
   logged as the pair's total, prog: "conservative" | "standard" | "aggressive"} */
function incrementOf(name,top,opts){
  opts=opts||{};
  var own=num(opts.own);
  if(own>0)return own;
  var v=EXDB&&EXDB[name],eq=v&&v.e||"Other",lb=!!opts.lb;
  var heavy=/Squat|Deadlift|Leg Press|Hack|Hip Thrust/i.test(name);
  var base=eq==="Barbell"?(heavy?5:2.5):eq==="Dumbbell"?2:eq==="Kettlebell"?4:eq==="Bodyweight"?0:2.5;
  if(lb)base=eq==="Barbell"?(heavy?10:5)/2.2046:eq==="Kettlebell"?9/2.2046:eq==="Bodyweight"?0:5/2.2046;
  if(!base)return 0;
  /* Dumbbells logged as the pair's total move two dumbbells at once. */
  if(eq==="Dumbbell"&&opts.dbTotal&&!isUnilateral(name))base*=2;
  var mode=opts.prog;
  if(mode==="conservative")base=base/2;else if(mode==="aggressive")base=base*2;
  var cap=Math.max(lb?2.5/2.2046:1,(top||0)*0.1);
  return Math.round(Math.min(base,cap)*100)/100;}
/* To the nearest real step, so a suggestion is always a weight that exists. */
function snapDown(x,step){step=step||1.25;return Math.max(0,Math.round(Math.round(x/step)*step*100)/100);}

/* ---- stalls and the lighter week ---------------------------------------------------
   No gain in estimated max across the last three sessions of a lift, compared with
   the one before them. Deliberately conservative: four sessions of history, working
   sets only, and it only ever suggests. */
function plateauIn(log,name){
  var best=[],ss=log.sessions||[];
  for(var i=0;i<ss.length&&best.length<4;i++){
    var e=ss[i].entries.filter(function(x){return x.name===name&&x.sets&&x.sets.length;})[0];
    if(!e)continue;
    var b=0,d=ss[i].date;e.sets.forEach(function(x){if(x.wu)return;var v=e1RM(loadIn(log,name,x.w,d),num(x.r),x.rpe);if(v>b)b=v;});
    if(b)best.push(b);}
  if(best.length<4)return false;
  return Math.max(best[0],best[1],best[2])<=best[3];}
function isoDays(a,b){return Math.round((new Date(b+"T00:00:00")-new Date(a+"T00:00:00"))/864e5);}
/* Suggested, never imposed. Due when there has been a solid block of training (five
   weeks since the last one, or since the start) and the log shows it: two or more
   lifts stalled, or two weeks of sets close to failure. dl: the person's lighter-week
   record {last, snooze}. The caller has already ruled out one running now. */
function deloadDueIn(log,dl,now){
  var ss=log.sessions||[];
  if(ss.length<12)return null;
  dl=dl||{};
  if(dl.snooze&&now<dl.snooze)return null;
  var since=dl.last||ss[ss.length-1].date;
  if(isoDays(since,now)<35)return null;
  var recent=ss.filter(function(s){var d=isoDays(s.date,now);return d>=0&&d<=14;});
  if(recent.length<3)return null;
  var names={},rp=[],sr=[];
  recent.forEach(function(s){
    if(s.srpe)sr.push(s.srpe);
    s.entries.forEach(function(e){
      if(!e.sets||!e.sets.length||isActivity(e.name))return;
      names[e.name]=1;
      e.sets.forEach(function(x){if(!x.wu&&x.rpe)rp.push(x.rpe);});});});
  var flat=Object.keys(names).filter(function(n){return plateauIn(log,n);}).length;
  if(flat>=2)return {why:"plateau",n:flat};
  var mean=function(a){return a.reduce(function(x,y){return x+y;},0)/a.length;};
  if((rp.length>=6&&mean(rp)>=9)||(sr.length>=3&&mean(sr)>=8.5))return {why:"effort"};
  return null;}
function deloadSets(n){return Math.max(1,Math.round(num(n,3)*0.6));}

/* ---- records -------------------------------------------------------------------
   A set is a record when it beats everything before it — earlier sessions and the
   sets already done today — by weight, by estimated max, or by reps at that weight
   or heavier. The first time a lift is ever logged there is nothing to beat, so it is
   not called a record. A bodyweight lift can set one with nothing added: more reps, or
   a better estimated max as the lifter gets lighter or stronger. */
function repsAtIn(log,name,w){
  var best=0;
  (log.sessions||[]).forEach(function(s){s.entries.forEach(function(e){
    if(e.name!==name)return;
    e.sets.forEach(function(x){if(!x.wu&&num(x.w)>=w&&num(x.r)>best)best=num(x.r);});});});
  return best;}
function recordIn(log,name,x,earlier,now){
  var bwl=bwShare(name)>0;
  if(!x||x.wu||!(num(x.r)>0)||isActivity(name))return null;
  if(!(num(x.w)>0)&&!bwl)return null;
  var h=prIn(log,name);if(!h.date)return null;
  var w=num(x.w),r=num(x.r),pw=h.w,pe=h.e,pr=repsAtIn(log,name,w);
  (earlier||[]).forEach(function(y){
    if(y.wu)return;var yw=num(y.w),yr=num(y.r);
    if(yw>pw)pw=yw;var ye=e1RM(loadIn(log,name,yw,now),yr,y.rpe);if(ye>pe)pe=ye;if(yw>=w&&yr>pr)pr=yr;});
  if(w>pw)return {k:"w",n:name,w:w,r:r};
  var er=e1RM(loadIn(log,name,w,now),r,x.rpe);
  if(er&&er>pe)return {k:"e",n:name,w:w,r:r,e:er};
  if(pr>0&&r>pr)return {k:"r",n:name,w:w,r:r};
  return null;}
/* The best record in one exercise's sets: weight first, then estimated max, then reps. */
var RANK={w:3,e:2,r:1};
function recordsOfEntry(log,e,now){
  var best=null;
  (e.sets||[]).forEach(function(x,i){
    var rec=recordIn(log,e.name,x,e.sets.slice(0,i),now);
    if(rec&&(!best||RANK[rec.k]>RANK[best.k]||(rec.k===best.k&&rec.w>best.w)))best=rec;});
  return best;}

/* ---- the suggestion for the next set ------------------------------------------------
   ctx: {increment(name, top), deload: a lighter week is running, ready: how the lifter
   said they feel today, 1–5 or 0} */
function recommendIn(log,e,ctx){
  var p=prevPerfIn(log,e.name);
  if(!p||!p.sets.length)return null;
  var top=0,topR=0,rpes=[];
  /* A body-weight exercise logged with the lifter's own body weight in the weight
     field (an old logger filled it in) is body weight alone, not that much added: it
     suggested 86 kg on push-ups. Within a kilo and a half of the body weight given. */
  var bwEx=!e.planned.timed&&(bwShare(e.name)>0||!!(EXDB&&EXDB[e.name]&&EXDB[e.name].e==="Bodyweight"));
  var bodyKg=num(ctx.bodyKg);
  function wOf(x){var w=num(x.w);return bwEx&&bodyKg&&Math.abs(w-bodyKg)<=1.5?0:w;}
  p.sets.forEach(function(x){
    if(wOf(x)>top){top=wOf(x);topR=num(x.r);}
    else if(!top&&num(x.r)>topR)topR=num(x.r);   /* body weight alone: the best reps */
    if(x.rpe)rpes.push(x.rpe);});
  var avg=rpes.length?rpes.reduce(function(a,b){return a+b;},0)/rpes.length:0;
  var hitTop=p.sets.filter(function(x){return num(x.r)>=e.planned.hi;}).length>=Math.max(1,p.sets.length-1);
  var inc=ctx.increment(e.name,top);
  var w=top,note;
  /* As many as you can: the target is last time's best, not a range. */
  if(e.planned.amrap)return {w:top,lo:0,hi:0,amrap:true,last:(top?top+" × ":"")+topR};
  if(!top){
    /* Body weight alone: progress by reps, then by a little added load. */
    var bwOnly=!e.planned.timed&&(bwShare(e.name)>0||(EXDB&&EXDB[e.name]&&EXDB[e.name].e==="Bodyweight"));
    if(bwOnly)return {w:0,bw:true,lo:e.planned.lo,hi:e.planned.hi,last:topR+"",
      note:hitTop?"Top of the range on body weight alone. Add a rep or two, or a little weight if you have a belt or vest."
        :"Same as last time, and aim for one more rep on each set."};
    return {w:0,lo:e.planned.lo,hi:e.planned.hi,note:"Find a weight you can control for "+e.planned.lo+" reps."};}
  /* Short of the range: held twice, lighter the third time (js/coach/autoreg.js). The
     load is the logged one, so a suggestion is a weight on the bar, not body weight. */
  var adv=progressionAdvice(log.sessions,e.name,{lo:e.planned.lo,hi:e.planned.hi},{load:function(n,x){return num(x);}});
  if(ctx.deload){w=snapDown(top*0.9,inc)||top;note="Lighter week: about 10% less and fewer sets. Leave three or four reps in the tank.";}
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
  else if(plateauIn(log,e.name)){w=top;note="No gain in three sessions. Hold this weight and chase a rep, or take a lighter week.";}
  else if(avg&&avg>=9.5){w=top;note="Last session was near failure. Hold this weight.";}
  else note="Same weight, aim for more reps.";
  /* How the lifter feels today (asked as the workout starts) moves today's number, and
     says so. A lighter week or a planned deload already sets it lighter. Drained: about
     5% under last time. Low: last time's weight, never more. Great, after a session
     with reps to spare: the bigger step. */
  var rd=num(ctx.ready);
  if(rd&&!ctx.deload&&adv.kind!=="deload"){
    if(rd===1){w=snapDown(top*0.95,inc)||top;note="A drained day: about 5% under last time, same reps. It still counts.";}
    else if(rd===2&&w>top){w=top;note="A low day: last time's weight, not more. The step can wait for next time.";}
    else if(rd===5&&hitTop&&avg&&avg<=8&&inc&&w<=Math.round((top+inc)*100)/100){
      w=Math.round((top+Math.min(inc*2,Math.max(inc,top*0.1)))*100)/100;note="A great day after reps to spare last time: a bigger step.";}}
  return {w:w,lo:e.planned.lo,hi:e.planned.hi,note:note,last:top+" × "+topR,ready:rd||0};}
/* When every working set reached the top of the range: the next weight. */
function progressionHintOf(e,increment){
  if(!e.sets.length)return null;
  var work=e.sets.filter(function(x){return !x.wu&&num(x.r)>0;});
  if(work.length<Math.max(2,e.planned.sets-1))return null;
  var allTop=work.every(function(x){return num(x.r)>=e.planned.hi;});
  if(!allTop)return null;
  var w=Math.max.apply(null,work.map(function(x){return num(x.w);}));
  if(!w)return null;
  var inc=increment(e.name,w);if(!inc)return null;
  return {inc:inc,next:Math.round((w+inc)*100)/100};}

/* ---- weeks and muscles ------------------------------------------------------------ */
/* Working sets per muscle over the last seven days. Resolved from the library, not
   the copy stored on the entry: that copy is written when the exercise joins a plan
   and is "Other" for any plan built before the library finished loading. Grouping on
   it silently files a whole programme under "Other". A warm-up is not training volume. */
function weeklySetsIn(log,nowMs){
  var cut=nowMs-7*864e5,out={};
  (log.sessions||[]).forEach(function(s){
    if(new Date(s.date+"T00:00:00").getTime()<cut)return;
    s.entries.forEach(function(e){
      if(!e.sets.length||isActivity(e.name))return;
      var n=e.sets.filter(function(x){return x&&!x.wu;}).length;if(!n)return;
      var m=muscleOfEntry(e);
      out[m]=(out[m]||0)+n;});});
  return out;}
/* Days since a muscle was last trained, or null. */
function daysSinceIn(log,muscle,nowMs){
  var ss=log.sessions||[];
  for(var i=0;i<ss.length;i++){
    var hit=ss[i].entries.some(function(e){return muscleOfEntry(e)===muscle&&e.sets.length;});
    if(hit)return Math.floor((nowMs-new Date(ss[i].date+"T00:00:00").getTime())/864e5);
  } return null;}
/* Workouts in the last four weeks against the plan's training days × 4, as a %. */
function consistencyIn(log,trainingDays,nowMs){
  var cut=nowMs-28*864e5;
  var n=(log.sessions||[]).filter(function(s){return new Date(s.date+"T00:00:00").getTime()>=cut;}).length;
  var planned=trainingDays*4;
  return planned?Math.min(100,Math.round(n/planned*100)):0;}

export {avgRPE, bestE1RMIn, bodyAtIn, bwShare, consistencyIn, daysSinceIn, deloadDueIn, deloadSets, e1RM, incrementOf, isoDays,
        loadIn, plateauIn, prevPerfIn, prIn, progressionHintOf, recommendIn, recordIn, recordsOfEntry, repsAtIn, sessionVolumeIn,
        setVolIn, snapDown, volumeIn, weeklySetsIn};
