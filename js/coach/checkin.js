/* Bunyan — coach: the weekly check-in
   Owner, 2 Nov, after the coach was asked to be "more like a coach": once a week, read
   the week that ended and say what to change, specifically, for the person to approve.

   It reads last week (the seven days before this week began) and the week before it:
   - workouts done against those planned, both weeks;
   - how hard the working sets were (the RPE logged) against the effort the goal plans;
   - the soreness logged on the recovery sheet;
   - the food logged: on how many days, and the energy eaten against the target;
   - body weight: the slope of a line through three weeks of weigh-ins (not the first
     against the last, so one heavy morning does not swing it), against the pace the
     goal's own energy gap gives (7,700 kcal per kg, as js/coach/energy.js).
   And proposes, each only where the log has the data for it:
   - days:    the week planned is not the week trained, two weeks running: a week built
              for the days actually trained (never under two);
   - kcal:    weight moving at under half or over one and a half times the goal's pace,
              on a week eaten close to the target (so the target, not the eating, is
              what is off): STEP kcal a day the right way, never under the floor given;
   - deload:  soreness of SORE+ on three or more days, or working sets averaging
              RPE_OVER above the effort planned over a dozen sets or more: a lighter week;
   - balance: the program's weekly sets for a muscle under the range, or well over it;
   - eat:     weight off the goal's pace on a week eaten well off the target: the target
              is not what is wrong, so it stays, and the coach says what is (owner, 9 Nov:
              "suggested changes to be effective"; changing a target nobody eats to
              changes nothing);
   - protein: protein under PROTEIN_SHARE of the target on the days food was logged
              (the protein that keeps and builds muscle is the goal's, js/data/goals.js);
   - steps:   a step goal missed by far on the days steps were logged: a stepping stone
              STEPS_ABOVE above what was walked, a goal that is met, then raised again.
   And reads, for what it says only, the program's main lifts over the last weeks
   (lifts: how many are rising, flat or falling, js/coach/strength.js), so a good week is
   said as well as a bad one.
   STEP is a modelling choice (a small step, then another week to see), not a figure
   from a source, and the weight rate is said as an estimate.

   checkin(o) → {from, to, done, donePrev, planned, rpe, sore, food, weight, steps, lifts, changes[]}
   o: {today, weekStart, sessions, days, body, planned, kcal, protein, steps, gap, floor,
       rpeTarget, range:[lo,hi]|null, plannedSets:{muscle:sets}, judged[], deloadOn,
       mains[], info}
   Pure: plain data in, a plain answer out. */
import {dayNo, infoOf, num, workSets} from "./util.js";
import {e1rmTrend} from "./strength.js";

var KCAL_PER_KG=7700,STEP=100,SORE=6,RPE_OVER=1.5,MIN_RPE_SETS=12,MIN_FOOD_DAYS=4,EAT_WITHIN=0.1;
var W_DAYS=21,MIN_WEIGHINS=4,MIN_SPAN=10,PROTEIN_SHARE=0.85,STEPS_SHARE=0.7,STEPS_ABOVE=1500,MIN_STEP_DAYS=4;

function iso(n){return new Date(n*864e5).toISOString().slice(0,10);}
function within(d,a,b){var n=dayNo(d);return n>=a&&n<=b;}
function r1(x){return Math.round(x*10)/10;}

/* Workouts in a span: sessions with at least one lift (a walk on its own is not one of
   the program's days); two in a day are two, as the log says. */
function doneIn(sessions,a,b,I){return (sessions||[]).filter(function(s){
  return s&&s.date&&within(s.date,a,b)&&(s.entries||[]).some(function(e){return !I.activity(e.name);});}).length;}

/* Kilograms a week: the least-squares slope through the weigh-ins. */
function rate(body,a,b){
  var pts=(body||[]).filter(function(x){return x&&num(x.weight)>0&&x.date&&within(x.date,a,b);})
    .map(function(x){return [dayNo(x.date),num(x.weight)];});
  if(pts.length<MIN_WEIGHINS)return null;
  var xs=pts.map(function(p){return p[0];}),span=Math.max.apply(null,xs)-Math.min.apply(null,xs);
  if(span<MIN_SPAN)return null;
  var n=pts.length,mx=0,my=0;pts.forEach(function(p){mx+=p[0]/n;my+=p[1]/n;});
  var sxy=0,sxx=0;pts.forEach(function(p){sxy+=(p[0]-mx)*(p[1]-my);sxx+=(p[0]-mx)*(p[0]-mx);});
  return {perWeek:r1(sxx?sxy/sxx*7:0),n:n,span:span};}

function checkin(o){
  var I=infoOf(o.info),ws=dayNo(o.weekStart),from=ws-7,to=ws-1;
  var out={from:iso(from),to:iso(to),done:doneIn(o.sessions,from,to,I),donePrev:doneIn(o.sessions,from-7,from-1,I),
    planned:num(o.planned),rpe:null,sore:null,food:null,weight:null,changes:[]};
  /* Effort: every working set with an RPE, lifts only. */
  var rs=[];
  (o.sessions||[]).forEach(function(s){
    if(!s||!s.date||!within(s.date,from,to))return;
    (s.entries||[]).forEach(function(e){if(I.activity(e.name))return;
      workSets(e).forEach(function(x){if(num(x.rpe)>0)rs.push(num(x.rpe));});});});
  if(rs.length)out.rpe={avg:r1(rs.reduce(function(a,b){return a+b;},0)/rs.length),n:rs.length,target:num(o.rpeTarget)||null};
  /* Soreness and food, day by day. */
  var sore=[],eaten=[],prot=[],walked=[];
  for(var d=from;d<=to;d++){
    var r=(o.days||{})[iso(d)];if(!r)continue;
    if(num(r.sore)>0)sore.push(num(r.sore));
    if(num(r.steps)>0)walked.push(num(r.steps));
    var k=0,pg=0,any=false;
    Object.keys(r.meals||{}).forEach(function(m){((r.meals[m]&&r.meals[m].items)||[]).forEach(function(it){any=true;k+=num(it.kcal);pg+=num(it.p);});});
    if(any&&k>0){eaten.push(k);prot.push(pg);}}
  if(sore.length)out.sore={avg:r1(sore.reduce(function(a,b){return a+b;},0)/sore.length),n:sore.length,high:sore.filter(function(x){return x>=SORE;}).length};
  if(eaten.length)out.food={n:eaten.length,avg:Math.round(eaten.reduce(function(a,b){return a+b;},0)/eaten.length),target:num(o.kcal)||null,
    p:Math.round(prot.reduce(function(a,b){return a+b;},0)/prot.length),pTarget:num(o.protein)||null};
  if(walked.length)out.steps={n:walked.length,avg:Math.round(walked.reduce(function(a,b){return a+b;},0)/walked.length),target:num(o.steps)||null};
  /* The main lifts over the last weeks, rising, flat or falling (insufficient left out). */
  var up=0,flat=0,down=0;
  (o.mains||[]).forEach(function(n){var tr=e1rmTrend(o.sessions,n,o.info,{today:iso(to),weeks:6});
    if(tr.direction==="rising")up++;else if(tr.direction==="falling")down++;else if(tr.direction==="flat")flat++;});
  if(up+flat+down)out.lifts={up:up,flat:flat,down:down};
  var wr=rate(o.body,to-W_DAYS+1,to);
  if(wr)out.weight={perWeek:wr.perWeek,n:wr.n,span:wr.span,
    pace:o.gap!=null?r1(num(o.gap)*7/KCAL_PER_KG):null};

  /* ---- what to change -------------------------------------------------------------- */
  var P=out.planned;
  if(P>=3&&out.done<P&&out.donePrev<P&&(out.done+out.donePrev)>0){
    var n=Math.max(2,Math.round((out.done+out.donePrev)/2));
    if(n<P)out.changes.push({kind:"days",to:n,done:out.done,donePrev:out.donePrev,planned:P});}

  var ate=out.food&&out.food.target&&out.food.n>=MIN_FOOD_DAYS&&Math.abs(out.food.avg-out.food.target)<=out.food.target*EAT_WITHIN;
  if(out.weight&&out.weight.pace!=null&&ate){
    var pace=out.weight.pace,now=out.weight.perWeek,by=0,why="";
    if(pace<0){if(now>pace*0.5){by=-STEP;why="slow";}else if(now<pace*1.5){by=STEP;why="fast";}}
    else if(pace>0){if(now<pace*0.5){by=STEP;why="slow";}else if(now>pace*1.5){by=-STEP;why="fast";}}
    else if(Math.abs(now)>0.25){by=now>0?-STEP:STEP;why="drift";}
    var kc=num(o.kcal)+by;
    if(by&&!(by<0&&o.floor&&kc<num(o.floor)))out.changes.push({kind:"kcal",by:by,to:kc,why:why,perWeek:now,pace:pace});}
  /* Off the pace on a week eaten well off the target: the eating, not the target. Said
     only where it explains the miss (eating over a deficit and losing slowly; under a
     surplus and gaining slowly; either way when the goal is to hold). */
  if(out.weight&&out.weight.pace!=null&&!ate&&out.food&&out.food.target&&out.food.n>=MIN_FOOD_DAYS){
    var pc=out.weight.pace,nw=out.weight.perWeek,over=out.food.avg-out.food.target,miss=
      pc<0?(nw>pc*0.5&&over>0):pc>0?(nw<pc*0.5&&over<0):(Math.abs(nw)>0.25&&(nw>0)===(over>0));
    if(miss)out.changes.push({kind:"eat",over:over,avg:out.food.avg,target:out.food.target,perWeek:nw,pace:pc});}
  if(out.food&&out.food.pTarget&&out.food.n>=MIN_FOOD_DAYS&&out.food.p<out.food.pTarget*PROTEIN_SHARE)
    out.changes.push({kind:"protein",avg:out.food.p,target:out.food.pTarget});
  if(out.steps&&out.steps.target&&out.steps.n>=MIN_STEP_DAYS&&out.steps.avg<out.steps.target*STEPS_SHARE){
    var st=Math.round((out.steps.avg+STEPS_ABOVE)/500)*500;
    if(st<out.steps.target)out.changes.push({kind:"steps",avg:out.steps.avg,target:out.steps.target,to:st});}

  if(!o.deloadOn){
    var soreHigh=out.sore&&out.sore.high>=3,hard=out.rpe&&out.rpe.target&&out.rpe.n>=MIN_RPE_SETS&&out.rpe.avg>=out.rpe.target+RPE_OVER;
    if(soreHigh||hard)out.changes.push({kind:"deload",sore:!!soreHigh,hard:!!hard});}

  if(o.range&&o.plannedSets){
    var lo=o.range[0],hi=o.range[1],low=[],high=[];
    (o.judged||Object.keys(o.plannedSets)).forEach(function(m){var s=num(o.plannedSets[m]);
      if(s<lo)low.push(m);else if(s>hi*1.15)high.push(m);});
    if(low.length||high.length)out.changes.push({kind:"balance",low:low,high:high,lo:lo,hi:hi});}
  return out;}

export {checkin, KCAL_PER_KG, STEP, STEPS_ABOVE};
