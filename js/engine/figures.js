/* Bunyan — Progress's figures, as pure functions
   Every figure on the Progress tab, computed from what was logged and nothing else.
   Handed the log ({sessions, body, weight}, as lifts.js takes it) and today's date;
   never reaches state.js, so tests/engine.mjs runs it in Node. stats.js keeps the old
   names, passes this profile's log in and keeps each answer until the data changes.

   Two rules run through all of it:
     - A window is the last N days including today, and "previous" is the N days
       before that. Comparisons are only made when there is history before the
       window; "+4 vs previous 7 days" for someone on their first week is a number
       that means nothing.
     - A food day counts once it is over (intake.js holds that rule). */
import {muscleOfEntry} from "../data/exercises.js";
import {isActivity} from "../data/activities.js";
import {e1RM, loadIn, sessionVolumeIn} from "./lifts.js";
import {weighInsOf} from "./body.js";
import {num} from "../util.js";

/* ---- dates ---------------------------------------------------------------- */
/* n calendar days before an ISO date. Counted in UTC on the date alone, so no
   timezone or clock change moves it. */
function isoBack(now,n){return new Date(Date.parse(now+"T00:00:00Z")-n*864e5).toISOString().slice(0,10);}
function win(n,now){return {from:isoBack(now,n-1),to:now,pfrom:isoBack(now,2*n-1),pto:isoBack(now,n)};}
function inWin(d,a,b){return d>=a&&d<=b;}

/* Percentages that add up to exactly 100: floor each, then hand the leftover points
   to the largest remainders. Rounding each alone gives 99 or 101. */
function pct100(vals){
  var tot=vals.reduce(function(a,b){return a+b;},0);
  if(!tot)return vals.map(function(){return 0;});
  var raw=vals.map(function(v){return v/tot*100;}),out=raw.map(Math.floor);
  var left=100-out.reduce(function(a,b){return a+b;},0);
  raw.map(function(v,i){return {i:i,r:v-Math.floor(v)};})
    .sort(function(a,b){return b.r-a.r;})
    .slice(0,left).forEach(function(x){out[x.i]++;});
  return out;}

/* A set that counts: not a warm-up, and something was done. */
function working(e){
  return (e.sets||[]).filter(function(x){return !x.wu&&(num(x.r)>0||num(x.w)>0);});}
function sessionsOf(log){return log.sessions||[];}

/* ---- overview --------------------------------------------------------------- */
function overviewIn(log,n,now){
  var w=win(n,now),cur=[],prev=[],earlier=false;
  sessionsOf(log).forEach(function(s){
    if(inWin(s.date,w.from,w.to))cur.push(s);
    else if(inWin(s.date,w.pfrom,w.pto))prev.push(s);
    if(s.date<w.from)earlier=true;});
  var vol=0,pvol=0;
  cur.forEach(function(s){vol+=sessionVolumeIn(log,s);});
  prev.forEach(function(s){pvol+=sessionVolumeIn(log,s);});
  /* Active minutes, recorded from the session clock. Sessions logged before the
     clock existed have none and are left out of the average rather than counted
     as zero. */
  var timed=cur.filter(function(s){return num(s.activeMs)>0;});
  var mins=timed.length?Math.round(timed.reduce(function(a,s){return a+num(s.activeMs);},0)/timed.length/60000):null;
  return {n:cur.length,pn:prev.length,vol:Math.round(vol),pvol:Math.round(pvol),
    vpct:earlier&&pvol>0?(vol-pvol)/pvol*100:null,
    compare:earlier,mins:mins,timed:timed.length};}

/* Volume across the window. Up to a month, one point per training day; longer, one
   per week, weeks without training included as zero — a gap is part of the trend.
   Weeks before the first session ever logged are not a gap and are left off. */
function volumeSeriesIn(log,n,now){
  var w=win(n,now),out=[],ss=sessionsOf(log);
  if(n<=31){
    var by={};
    ss.forEach(function(s){
      if(inWin(s.date,w.from,w.to))by[s.date]=(by[s.date]||0)+sessionVolumeIn(log,s);});
    Object.keys(by).sort().forEach(function(d){out.push({d:d,v:Math.round(by[d])});});
    return out;}
  var first=null;
  ss.forEach(function(s){if(!first||s.date<first)first=s.date;});
  if(!first)return out;
  for(var b=Math.ceil(n/7)-1;b>=0;b--){
    var to=isoBack(now,b*7),from=isoBack(now,b*7+6),v=0;
    if(to<first)continue;
    ss.forEach(function(s){if(inWin(s.date,from,to))v+=sessionVolumeIn(log,s);});
    out.push({d:to,v:Math.round(v)});}
  return out;}

/* ---- lifts ------------------------------------------------------------------ */
/* One pass over history, oldest first, so a record's date is the day it was first
   set, not the latest day it was equalled. The heaviest set is the record, as
   prFor() has it, with reps breaking a tie; a lift never loaded is scored by reps. */
function liftsIn(log){
  var m={},order=[],ss=sessionsOf(log);
  for(var i=ss.length-1;i>=0;i--){
    var s=ss[i];
    s.entries.forEach(function(e){
      var work=working(e);if(!work.length)return;
      var L=m[e.name];
      if(!L){L=m[e.name]={name:e.name,sets:0,w:0,reps:0,date:null,br:0,bdate:null,last:null};order.push(e.name);}
      L.sets+=work.length;L.last=s.date;
      work.forEach(function(x){
        var wt=num(x.w),r=num(x.r);
        if(wt>L.w||(wt===L.w&&wt>0&&r>L.reps)){L.w=wt;L.reps=r;L.rpe=num(x.rpe);L.date=s.date;}
        if(r>L.br){L.br=r;L.bdate=s.date;}});});}
  return order.map(function(k){
    var L=m[k];
    /* Unloaded: the record is the most reps. */
    if(!L.w){L.reps=L.br;L.date=L.bdate;}
    return L;});}
/* The lifts trained most, by working sets, the latest first on a tie. */
function byUse(lifts){
  return lifts.slice().sort(function(a,b){return b.sets-a.sets||(b.last>a.last?1:-1);});}
function topLiftsIn(log){return byUse(liftsIn(log));}
/* The newest records, heaviest first on the same day. */
function newest(lifts,k){
  return lifts.filter(function(L){return L.date&&(L.w>0||L.reps>0);})
    .sort(function(a,b){return a.date<b.date?1:a.date>b.date?-1:b.w-a.w;}).slice(0,k||3);}
function recentRecordsIn(log,k){return newest(liftsIn(log),k);}

/* Estimated one-rep max per session for one lift, oldest first. Epley, working
   sets of twelve reps or fewer, counting reps in reserve from RPE — e1RM() returns 0
   past that, and those are skipped rather than plotted as a collapse to zero.
   n: the window in days, or 0 for all of history. */
function e1rmSeriesIn(log,name,n,now){
  var w=n?win(n,now):null,out=[],ss=sessionsOf(log);
  for(var i=ss.length-1;i>=0;i--){
    var s=ss[i];
    if(w&&!inWin(s.date,w.from,w.to))continue;
    var best=0;
    s.entries.forEach(function(e){
      if(e.name!==name)return;
      working(e).forEach(function(x){var v=e1RM(loadIn(log,name,x.w,s.date),num(x.r),x.rpe);if(v>best)best=v;});});
    if(best)out.push({d:s.date,v:best});}
  return out;}

/* The frame's six groups. Sets, not kilograms: a set of curls and a set of squats
   are the same unit of training, where their tonnage differs tenfold. */
var GROUP={Chest:"Chest",Back:"Back",Shoulders:"Shoulders",Biceps:"Arms",Triceps:"Arms",
  Forearms:"Arms",Quads:"Legs",Hamstrings:"Legs",Glutes:"Legs",Adductors:"Legs",Calves:"Legs",
  Core:"Core"};
var GORDER=["Chest","Back","Legs","Shoulders","Arms","Core","Other"];
function muscleShareIn(log,n,now){
  var w=win(n,now),c={},tot=0;
  sessionsOf(log).forEach(function(s){
    if(!inWin(s.date,w.from,w.to))return;
    s.entries.forEach(function(e){
      if(isActivity(e.name))return;          /* cardio and sports are not muscle sets */
      var k=working(e).length;if(!k)return;
      var g=GROUP[muscleOfEntry(e)]||"Other";
      c[g]=(c[g]||0)+k;tot+=k;});});
  var rows=Object.keys(c).map(function(g){return {g:g,sets:c[g]};})
    .sort(function(a,b){return b.sets-a.sets||GORDER.indexOf(a.g)-GORDER.indexOf(b.g);});
  var p=pct100(rows.map(function(r){return r.sets;}));
  rows.forEach(function(r,i){r.pct=p[i];});
  return {tot:tot,rows:rows};}

/* ---- this week's hard sets per muscle ---------------------------------------
   The one volume figure with solid evidence behind it for muscle growth: working
   sets per muscle per week, with roughly ten as a sensible floor and twenty as a
   practical ceiling for most people. The target comes from the plan's level. From
   the first day of the week (from) to today; warm-ups and cardio do not count.
   planned: the plan's sets per muscle a week, or nothing for 12. */
var WGROUP={Chest:"Chest",Back:"Back",Shoulders:"Shoulders",Quads:"Quads",Hamstrings:"Hams & glutes",
  Glutes:"Hams & glutes",Biceps:"Biceps",Triceps:"Triceps"};
var WORDER=["Chest","Back","Shoulders","Quads","Hams & glutes","Biceps","Triceps"];
function weeklyVolumeIn(log,from,planned){
  var c={};
  WORDER.forEach(function(g){c[g]=0;});
  sessionsOf(log).forEach(function(s){
    if(s.date<from)return;
    s.entries.forEach(function(e){
      if(isActivity(e.name))return;
      var g=WGROUP[muscleOfEntry(e)];if(!g)return;
      c[g]+=working(e).length;});});
  var target=Math.max(8,Math.min(20,num(planned,12)));
  return {from:from,target:target,rows:WORDER.map(function(g){return {g:g,sets:c[g]};})};}

/* Cardio and sport this week, in minutes, against the widely used guideline of 150
   minutes of moderate activity a week. Counted from the first day of the week, as the
   sets above are; recent says whether any was done in the last four weeks. */
function weeklyCardioIn(log,from,now){
  var min=0,recent=false,cut=isoBack(now,28);
  sessionsOf(log).forEach(function(s){
    s.entries.forEach(function(e){
      if(!isActivity(e.name))return;
      if(s.date>=cut)recent=true;
      if(s.date<from)return;
      (e.sets||[]).forEach(function(x){min+=num(x.min);});});});
  return {min:Math.round(min),target:150,recent:recent};}

/* ---- body ------------------------------------------------------------------- */
/* Weigh-ins in the window, or all of them for n = 0 (body.js has the rules). */
function weighInsIn(body,n,now){
  var list=weighInsOf(body);
  if(!n)return list;
  var w=win(n,now);
  return list.filter(function(b){return inWin(b.date,w.from,w.to);});}
/* Body-fat figures the user entered, in the window, oldest first. */
function bodyFatSeriesIn(body,n,now){
  var w=n?win(n,now):null;
  return (body||[]).filter(function(b){return num(b.bf)>0&&(!w||inWin(b.date,w.from,w.to));})
    .map(function(b){return {d:b.date,v:num(b.bf)};});}

/* ---- the redesign's summary cards ------------------------------------------ */
/* Upper or lower body, for the Strength filter. Core and anything unclassified is
   neither and shows only under All. */
var UPPER={Chest:1,Back:1,Shoulders:1,Biceps:1,Triceps:1,Forearms:1,Neck:1};
var LOWER={Quads:1,Hamstrings:1,Glutes:1,Adductors:1,Calves:1};
function liftHalf(entryOrName){
  var m=typeof entryOrName==="string"?muscleOfEntry({name:entryOrName}):muscleOfEntry(entryOrName);
  return UPPER[m]?"upper":LOWER[m]?"lower":"";}

/* One lift over the window: its e1RM trend, the change from the first estimate to the
   last, and what the latest session did (sets × typical reps · top weight). */
function liftProgressIn(log,name,n,now){
  var ser=e1rmSeriesIn(log,name,n,now),pct=null,ss=sessionsOf(log);
  if(ser.length>=2&&ser[0].v>0)pct=(ser[ser.length-1].v-ser[0].v)/ser[0].v*100;
  var last=null;
  for(var i=0;i<ss.length&&!last;i++){
    ss[i].entries.forEach(function(e){
      if(last||e.name!==name)return;
      var work=working(e);if(!work.length)return;
      var top=0,reps={};
      work.forEach(function(x){var w=num(x.w);if(w>top)top=w;reps[num(x.r)]=(reps[num(x.r)]||0)+1;});
      var common=+Object.keys(reps).sort(function(a,b){return reps[b]-reps[a]||b-a;})[0];
      last={sets:work.length,reps:common,w:top,date:ss[i].date};});}
  return {series:ser,pct:pct,last:last};}

/* The frame's "Strength +12% since start": how far the estimated maxes of the lifts
   trained most have moved across the window, averaged so one lift cannot carry it.
   Only lifts with two estimates in the window count. The series is the same figure
   session by session, 100 at the start, for the card's sparkline. */
function strengthIndexIn(log,n,k,now){
  var names=topLiftsIn(log).slice(0,k||5).map(function(L){return L.name;});
  var base={},pcts=[],byDate={};
  names.forEach(function(nm){
    var ser=e1rmSeriesIn(log,nm,n,now);
    if(ser.length<2)return;
    base[nm]=ser[0].v;
    pcts.push((ser[ser.length-1].v-ser[0].v)/ser[0].v*100);
    ser.forEach(function(p){(byDate[p.d]=byDate[p.d]||[]).push(p.v/base[nm]*100);});});
  var series=Object.keys(byDate).sort().map(function(d){
    var a=byDate[d];return {d:d,v:a.reduce(function(x,y){return x+y;},0)/a.length};});
  return {pct:pcts.length?pcts.reduce(function(a,b){return a+b;},0)/pcts.length:null,
    lifts:pcts.length,series:series};}

/* Days trained this calendar month, and sessions per week for the last six weeks
   (oldest first) for the card's bars. */
function consistencyMonthIn(log,now){
  var mo=now.slice(0,7),days={},ss=sessionsOf(log);
  ss.forEach(function(s){if(s.date.slice(0,7)===mo)days[s.date]=1;});
  var weeks=[];
  for(var b=5;b>=0;b--){
    var to=isoBack(now,b*7),from=isoBack(now,b*7+6),c=0;
    ss.forEach(function(s){if(inWin(s.date,from,to))c++;});
    weeks.push(c);}
  return {days:Object.keys(days).length,weeks:weeks};}

export {bodyFatSeriesIn, byUse, consistencyMonthIn, e1rmSeriesIn, isoBack, liftHalf, liftProgressIn, liftsIn, muscleShareIn,
        newest, overviewIn, pct100, recentRecordsIn, strengthIndexIn, topLiftsIn, volumeSeriesIn, weeklyCardioIn,
        weeklyVolumeIn, weighInsIn, win, working};
