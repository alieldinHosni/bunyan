/* Bunyan — recovery, for this profile
   js/coach/recovery.js decides how ready each muscle is and whether a day of the
   program fits better than the one due; this hands it the log, the soreness logged on
   the recovery sheet and the library's answers, and says what the coach would offer for
   a date: the day due, the fresher one, and the muscles that make the difference.

   Nothing is changed by itself: the person decides (Training's card, the coach). A day
   already moved or kept by hand (S.daySwap) is the person's decision and is left alone. */
import {dayReady, LOW, readiness, suggest, tiredOn} from "../coach/recovery.js";
import {isCompound, muscleOf, secondaryOf} from "../data/exercises.js";
import {isActivity} from "../data/activities.js";
import {S} from "../state.js";
import {addDaysISO, planOn} from "./dayplan.js";
import {today} from "../util.js";

var JUMPY=/\b(jumps?|hops?|bounds?|plyo|depth jump|box jump)\b/i;
var INFO={muscle:muscleOf,secondary:secondaryOf,activity:isActivity,plyo:function(n){return JUMPY.test(n);},compound:isCompound};
/* A beginner gets the top of the book's 48–72 h after jumps. */
function opts(){return {novice:((S.profile||{}).level)==="new"};}

/* Readiness on a date, from everything logged before it (and earlier that day). For a
   date ahead, the workouts planned between now and then count as done, as they will be:
   tomorrow is judged against today's workout, trained or not yet (owner, 2 Nov: change the
   next day from the day before, in a rotation as on weekdays). */
function plannedBetween(sp,from,to){
  var out=[];
  for(var d=from;d<to;d=addDaysISO(d,1)){
    if((S.sessions||[]).some(function(s){return s.date===d&&(s.entries||[]).length;}))continue;
    var p=planOn(sp,d);if(!p||p.rest||!p.day||!(p.day.ex||[]).length)continue;
    out.push({date:d,entries:p.day.ex.map(function(e){var n=Math.max(1,+e.sets||3),sets=[];for(var i=0;i<n;i++)sets.push({w:0,r:8});
      return {name:e.name,muscle:e.muscle,sets:sets};})});}
  return out;}
function readyOn(iso,sp){
  var days=S.days||{},sore=Math.max(+((days[iso]||{}).sore)||0,+((days[addDaysISO(iso,-1)]||{}).sore)||0),now=today();
  var log=(S.sessions||[]).filter(function(s){return s.date<=iso;});
  if(sp&&iso>now)log=log.concat(plannedBetween(sp,now,iso));
  return readiness(log,iso,INFO,sore,opts());}

/* p: dayplan.js planOn for that date. → {from, to, fromDay, toDay, tired} or null. */
function swapAdvice(sp,iso,p){
  if(!sp||!p||p.rest||!p.day||(p.kind!=="today"&&p.kind!=="plan"))return null;
  if(S.daySwap&&S.daySwap[iso])return null;
  var idx=-1;sp.days.forEach(function(d,i){if(d.id===p.day.id)idx=i;});
  if(idx<0)return null;
  var s=suggest(sp.days,idx,readyOn(iso,sp),INFO);
  if(!s)return null;
  s.fromDay=sp.days[idx];s.toDay=sp.days.filter(function(d){return d.id===s.to;})[0];
  return s;}

/* Owner, 2 Nov (today Full A, and the app let tomorrow be Full A too): "the app should
   scan the muscles in my split and find the next possible day from the load on each
   muscle and the rest it needs". Every day of the plan, judged for a date before it is
   picked, by the textbook's rule (at least one day of rest between sessions that stress
   the same muscles, acute-variables · frequency):
     ready   how ready that day's planned work is on the date (dayReady, 0..1)
     tired   the muscles still recovering that carry a real share of it
     next    the day after: the workout it would then hold, and whether this choice
             leaves that one too soon (on weekdays the day pinned there; in a rotation
             the day that follows this one)
     ok      ready, and the day after still ready
   best: the plan's own day when it is ok, else the readiest ok day nearest after it in
   the program's order, else "rest" — nothing fits, and resting is the right call.
   → {date, days:[{id, name, rest, ready, tired[], next, ok}], best} */
function virt(d,iso){return {date:iso,entries:(d.ex||[]).map(function(e){var n=Math.max(1,+e.sets||3),sets=[];for(var i=0;i<n;i++)sets.push({w:0,r:8});
  return {name:e.name,muscle:e.muscle,sets:sets};})};}
function dayOptions(sp,iso){
  if(!sp||!(sp.days||[]).length)return null;
  var now=today(),ready=readyOn(iso,sp),cur=planOn(sp,iso),nx=addDaysISO(iso,1),len=sp.days.length;
  var days=S.days||{},sore=Math.max(+((days[iso]||{}).sore)||0,+((days[nx]||{}).sore)||0);
  var base=(S.sessions||[]).filter(function(s){return s.date<=iso;});
  if(iso>now)base=base.concat(plannedBetween(sp,now,iso));
  var out=sp.days.map(function(d,i){
    var o={id:d.id,name:d.name,rest:!(d.ex||[]).length,ready:1,tired:[],next:null,ok:true};
    if(o.rest)return o;
    o.ready=dayReady(d.ex,ready,INFO);o.tired=o.ready<LOW?tiredOn(d.ex,ready,INFO):[];
    /* The day after, if this one is trained. */
    var nd=null;
    if(sp.schedule==="week"){var np=planOn(sp,nx);nd=np&&!np.rest&&np.day&&(np.day.ex||[]).length?np.day:null;}
    else{var c=sp.days[(i+1)%len];nd=c&&(c.ex||[]).length&&len>1?c:null;}
    if(nd){var r2=readiness(base.concat([virt(d,iso)]),nx,INFO,sore,opts()),nr=dayReady(nd.ex,r2,INFO);
      o.next={date:nx,id:nd.id,name:nd.name,ready:nr,tired:nr<LOW?tiredOn(nd.ex,r2,INFO):[]};}
    o.ok=o.ready>=LOW&&(!o.next||o.next.ready>=LOW);
    return o;});
  var at=-1;sp.days.forEach(function(d,i){if(cur.day&&d.id===cur.day.id)at=i;});
  var best=null;
  if(at>=0&&out[at].ok&&!out[at].rest)best=out[at].id;
  else{var bi=-1;
    for(var k=0;k<len;k++){var j=((at<0?0:at)+k)%len,c=out[j];
      if(c.rest||!c.ok)continue;if(bi<0||c.ready>out[bi].ready+0.05)bi=j;}
    best=bi>=0?out[bi].id:"rest";}
  return {date:iso,days:out,best:best};}

/* A planned day still ahead that comes too soon for the muscles it trains, judged with
   everything planned before it counted as done: the muscles, or null (the week rail
   marks it, owner, 2 Nov: "the app should identify the next possible day"). */
function tooSoon(sp,iso){
  if(!sp||iso<today())return null;
  var p=planOn(sp,iso);if(!p||p.rest||!p.day||!(p.day.ex||[]).length)return null;
  var r=readyOn(iso,sp),k=dayReady(p.day.ex,r,INFO);
  return k<LOW?tiredOn(p.day.ex,r,INFO):null;}

/* How recovered each muscle is on a date, from what was logged (owner, 3 Nov: "can this
   show percentages, recovered at how many percent"). The model is an estimate (hard sets
   in the last two or three days against the book's rest-day rule, js/coach/recovery.js),
   so it is said in quarters, never to the percent, and with the day each muscle is ready
   by the rule, which the rule does fix. Muscles still recovering, least ready first:
   [{m, pct (0, 25, 50, 75), ready: the first date it is fully ready}] */
function q25(x){return Math.max(0,Math.min(75,Math.floor(x*4)*25));}
function muscleStatus(sp,iso){
  /* What is logged, and for a date ahead what is planned before it (counted as done, as
     the day options count it): the same basis as the days judged below it. */
  var now=today(),log=(S.sessions||[]).filter(function(s){return s.date<=iso;});
  var planned=sp&&iso>now?plannedBetween(sp,now,iso):[];log=log.concat(planned);
  var days=S.days||{},sore=+((days[iso]||{}).sore)||0,o=opts();
  var r=readiness(log,iso,INFO,sore,o),out=[];
  Object.keys(r).forEach(function(m){if(r[m]>=1)return;
    var d=iso;for(var k=1;k<=4;k++){d=addDaysISO(iso,k);var rr=readiness(log,d,INFO,0,o);if(rr[m]==null||rr[m]>=1)break;}
    out.push({m:m,pct:q25(r[m]),ready:d});});
  return {list:out.sort(function(a,b){return a.pct-b.pct||(a.m<b.m?-1:1);}),planned:planned.length>0};}

export {dayOptions, muscleStatus, q25, readyOn, swapAdvice, tooSoon};
