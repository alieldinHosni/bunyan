/* Bunyan — the plan on a date
   What the program says for a given day, the next day to train, and how long a day
   takes. Moved out of the Training view: Progress, the coach chat and the day sheet all
   need it, and a view should not be where logic lives. */
import {t} from "../i18n/dict.js";
import {isActivity, actInfo} from "../data/activities.js";
import {S} from "../state.js";
import {today} from "../util.js";
import {nextPinned, pinnedOn} from "./schedule.js";

/* ---- where the rotation stands ------------------------------------------------
   The latest planned session sets it; a run or a match logged on its own (no day id)
   does not move it. The next training day is due once the rest days that follow the
   last session in the cycle have passed on the calendar — rest days used to be skipped
   over, so three full-body sessions landed on consecutive days. A missed day is never
   skipped: once due, the next session stays due until it is done. */
function addDaysISO(iso,n){var d=new Date(iso+"T00:00:00");d.setDate(d.getDate()+n);
  return new Date(d.getTime()-d.getTimezoneOffset()*6e4).toISOString().slice(0,10);}
function rotation(sp){
  var len=sp.days.length,now=today();if(!len)return null;
  var ls=null,li=-1;
  for(var j=0;j<S.sessions.length&&!ls;j++){
    var s=S.sessions[j];if(!s.dayId)continue;
    for(var i=0;i<len;i++)if(sp.days[i].id===s.dayId){ls=s;li=i;break;}}
  var start=ls?li+1:0,rests=0,idx=-1;
  for(var k=0;k<len;k++){
    var d=sp.days[(start+k)%len];
    if(d.ex.length){idx=(start+k)%len;break;}
    rests++;}
  if(idx<0)return null;
  var due=ls?addDaysISO(ls.date,rests+1):now;
  if(due<now)due=now;
  return {idx:idx,due:due,last:ls,li:li};}
/* The next day to train. By weekday: today's pinned day unless it is already done,
   else the next pinned one. In rotation: the next in order. */
function nextDayOf(sp){
  if(sp.schedule==="week"){
    var now=today(),done=S.sessions.some(function(s){return s.date===now&&s.dayId;});
    var n=nextPinned(sp,done?addDaysISO(now,1):now);return n?n.day:null;}
  var r=rotation(sp);return r?sp.days[r.idx]:null;}

/* ---- the plan on a date --------------------------------------------------------
   The split is a rotation, not a calendar, so "what is on Thursday" is a projection:
   today is the next day of the rotation (or the one already trained today), and each
   day after takes the next one in order, rest days included. A past day is whatever
   was logged. */
function daysApart(a,b){return Math.round((new Date(b+"T00:00:00")-new Date(a+"T00:00:00"))/864e5);}
function planOn(sp,iso){
  var now=today();
  var logged=S.sessions.filter(function(x){return x.date===iso&&x.dayId;});
  /* Today, a run on its own does not stand in for the day's workout. */
  if(!logged.length&&iso<now)logged=S.sessions.filter(function(x){return x.date===iso;});
  if(logged.length){
    var ld=sp.days.filter(function(d){return d.id===logged[0].dayId;})[0]||null;
    return {kind:"done",session:logged[0],day:ld,name:logged[0].dayName};}
  if(iso<now)return {kind:"past"};
  /* A day the user has swapped by hand ("today I'd rather do Anterior") wins over
     the rotation for that date only; the rotation carries on from whatever is
     actually trained. */
  var sw=S.daySwap&&S.daySwap[iso];
  if(sw){var od=sp.days.filter(function(d){return d.id===sw;})[0];
    if(od)return {kind:iso===now?"today":"plan",day:od,name:od.name,rest:!od.ex.length,swapped:true};}
  /* By weekday: whatever is pinned to that weekday, and a rest day otherwise. */
  if(sp.schedule==="week"){
    var pd=pinnedOn(sp,iso),kw=iso===now?"today":"plan";
    if(!sp.days.some(function(d){return d.ex.length&&(d.wd||[]).length;}))return {kind:"none"};
    if(pd)return {kind:kw,day:pd,name:pd.name,rest:false};
    var nx=nextPinned(sp,iso);
    return {kind:kw,day:null,name:t("Rest day"),rest:true,next:nx&&nx.day};}
  var r=rotation(sp);
  if(!r)return {kind:"none"};
  var len=sp.days.length,kind=iso===now?"today":"plan",d;
  /* Still inside the rest that follows the last session. */
  if(iso<r.due&&r.last){
    d=sp.days[(r.li+daysApart(r.last.date,iso))%len];
    return {kind:kind,day:d,name:d.name,rest:true,next:sp.days[r.idx]};}
  d=sp.days[(r.idx+daysApart(r.due,iso))%len];
  return {kind:kind,day:d,name:d.name,rest:!d.ex.length,next:sp.days[r.idx]};}
/* About how long a day takes: each set and its rest, and an activity's own minutes. */
function estMinutes(d){
  var tot=0;
  d.ex.forEach(function(e){
    tot+=isActivity(e.name)?(e.min||(actInfo(e.name).grp==="Sports"?60:30))*60:e.sets*((e.rest||75)+35);});
  return Math.round(tot/60/5)*5;}

export {addDaysISO, estMinutes, nextDayOf, planOn, rotation};
