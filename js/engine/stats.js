/* Bunyan — stats
   Every figure on the Progress tab, computed from what was logged and nothing else.
   No DOM, no rendering — progress.js draws what this returns.

   Two rules run through all of it:
     - A window is the last N days including today, and "previous" is the N days
       before that. Comparisons are only made when there is history before the
       window; "+4 vs previous 7 days" for someone on their first week is a number
       that means nothing.
     - A food day counts once it is over. Today is still going, so it is never
       averaged, never judged against a target, and never breaks a streak. */
import {muscleOfEntry} from "../data/exercises.js";
import {isActivity} from "../data/activities.js";
import {e1RM, lastWeight, loadOf, sessionVolume} from "./formulas.js";
import {sumNutrition} from "./nutrition.js";
import {dataRev, S} from "../state.js";
import {num, r1, today} from "../util.js";
import {weekStartOf} from "./schedule.js";

/* ---- dates ---------------------------------------------------------------- */
/* Local calendar dates, with the same timezone correction as shiftDay(): without it
   "7 days ago" is off by one east of Greenwich. */
/* Progress re-renders on every tap — a range, a tab, a chart — and each figure below
   is a sweep over the whole history. They are kept until the data changes: a save
   (dataRev), a different state object (profile switch, restore), history arriving from
   storage, or a new day, since every range is counted back from today. */
var MC={k:null,m:{}};
function memo(name,fn){
  return function(){
    var k=dataRev()+"|"+S.sessions.length+"|"+(S.body||[]).length+"|"+today();
    if(MC.k!==k||MC.s!==S||MC.ss!==S.sessions||MC.b!==S.body)MC={k:k,s:S,ss:S.sessions,b:S.body,m:{}};
    var key=name+"|"+Array.prototype.join.call(arguments,"|");
    if(!(key in MC.m))MC.m[key]=fn.apply(null,arguments);
    return MC.m[key];};}
function isoAgo(n){
  var d=new Date();d.setDate(d.getDate()-n);
  return new Date(d.getTime()-d.getTimezoneOffset()*6e4).toISOString().slice(0,10);}
function daysBetween(a,b){
  return Math.round((new Date(b+"T00:00:00")-new Date(a+"T00:00:00"))/864e5);}
function win(n){return {from:isoAgo(n-1),to:today(),pfrom:isoAgo(2*n-1),pto:isoAgo(n)};}
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

/* ---- overview --------------------------------------------------------------- */
function overview_raw(n){
  var w=win(n),cur=[],prev=[],earlier=false;
  S.sessions.forEach(function(s){
    if(inWin(s.date,w.from,w.to))cur.push(s);
    else if(inWin(s.date,w.pfrom,w.pto))prev.push(s);
    if(s.date<w.from)earlier=true;});
  var vol=0,pvol=0;
  cur.forEach(function(s){vol+=sessionVolume(s);});
  prev.forEach(function(s){pvol+=sessionVolume(s);});
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
function volumeSeries_raw(n){
  var w=win(n),out=[];
  if(n<=31){
    var by={};
    S.sessions.forEach(function(s){
      if(inWin(s.date,w.from,w.to))by[s.date]=(by[s.date]||0)+sessionVolume(s);});
    Object.keys(by).sort().forEach(function(d){out.push({d:d,v:Math.round(by[d])});});
    return out;}
  var first=null;
  S.sessions.forEach(function(s){if(!first||s.date<first)first=s.date;});
  if(!first)return out;
  for(var b=Math.ceil(n/7)-1;b>=0;b--){
    var to=isoAgo(b*7),from=isoAgo(b*7+6),v=0;
    if(to<first)continue;
    S.sessions.forEach(function(s){if(inWin(s.date,from,to))v+=sessionVolume(s);});
    out.push({d:to,v:Math.round(v)});}
  return out;}

/* ---- lifts ------------------------------------------------------------------ */
/* One pass over history, oldest first, so a record's date is the day it was first
   set, not the latest day it was equalled. The heaviest set is the record, as
   prFor() has it, with reps breaking a tie; a lift never loaded is scored by reps. */
function lifts_raw(){
  var m={},order=[];
  for(var i=S.sessions.length-1;i>=0;i--){
    var s=S.sessions[i];
    s.entries.forEach(function(e){
      var work=working(e);if(!work.length)return;
      var L=m[e.name];
      if(!L){L=m[e.name]={name:e.name,sets:0,w:0,reps:0,date:null,br:0,bdate:null,last:null};order.push(e.name);}
      L.sets+=work.length;L.last=s.date;
      work.forEach(function(x){
        var wt=num(x.w),r=num(x.r);
        if(wt>L.w||(wt===L.w&&wt>0&&r>L.reps)){L.w=wt;L.reps=r;L.date=s.date;}
        if(r>L.br){L.br=r;L.bdate=s.date;}});});}
  return order.map(function(k){
    var L=m[k];
    /* Unloaded: the record is the most reps. */
    if(!L.w){L.reps=L.br;L.date=L.bdate;}
    return L;});}
function topLifts(){
  return lifts().slice().sort(function(a,b){return b.sets-a.sets||(b.last>a.last?1:-1);});}
function recentRecords(k){
  return lifts().filter(function(L){return L.date&&(L.w>0||L.reps>0);})
    .sort(function(a,b){return a.date<b.date?1:a.date>b.date?-1:b.w-a.w;}).slice(0,k||3);}

/* Estimated one-rep max per session for one lift, oldest first. Epley, working
   sets of twelve reps or fewer — e1RM() returns 0 past that, and those are skipped
   rather than plotted as a collapse to zero. */
function e1rmSeries_raw(name,n){
  var w=n?win(n):null,out=[];
  for(var i=S.sessions.length-1;i>=0;i--){
    var s=S.sessions[i];
    if(w&&!inWin(s.date,w.from,w.to))continue;
    var best=0;
    s.entries.forEach(function(e){
      if(e.name!==name)return;
      working(e).forEach(function(x){var v=e1RM(loadOf(name,x.w,s.date),num(x.r));if(v>best)best=v;});});
    if(best)out.push({d:s.date,v:best});}
  return out;}

/* The frame's six groups. Sets, not kilograms: a set of curls and a set of squats
   are the same unit of training, where their tonnage differs tenfold. */
var GROUP={Chest:"Chest",Back:"Back",Shoulders:"Shoulders",Biceps:"Arms",Triceps:"Arms",
  Forearms:"Arms",Quads:"Legs",Hamstrings:"Legs",Glutes:"Legs",Adductors:"Legs",Calves:"Legs",
  Core:"Core"};
var GORDER=["Chest","Back","Legs","Shoulders","Arms","Core","Other"];
function muscleShare_raw(n){
  var w=win(n),c={},tot=0;
  S.sessions.forEach(function(s){
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
   the first day of the week to today; warm-ups and cardio do not count. */
var WGROUP={Chest:"Chest",Back:"Back",Shoulders:"Shoulders",Quads:"Quads",Hamstrings:"Hams & glutes",
  Glutes:"Hams & glutes",Biceps:"Biceps",Triceps:"Triceps"};
var WORDER=["Chest","Back","Shoulders","Quads","Hams & glutes","Biceps","Triceps"];
/* The first day of this week, as the user's week runs (Saturday unless changed). */
function weekStartISO(){return weekStartOf(today());}
function weeklyVolume(){
  var from=weekStartISO(),c={};
  WORDER.forEach(function(g){c[g]=0;});
  S.sessions.forEach(function(s){
    if(s.date<from)return;
    s.entries.forEach(function(e){
      if(isActivity(e.name))return;
      var g=WGROUP[muscleOfEntry(e)];if(!g)return;
      c[g]+=working(e).length;});});
  var target=Math.max(8,Math.min(20,num(S.plannedWeekly,12)));
  return {from:from,target:target,rows:WORDER.map(function(g){return {g:g,sets:c[g]};})};}

/* Cardio and sport this week, in minutes, against the widely used guideline of 150
   minutes of moderate activity a week. Counted from the first day of the week, as the sets above are. */
function weeklyCardio(){
  var from=weekStartISO(),min=0,recent=false,cut=isoAgo(28);
  S.sessions.forEach(function(s){
    s.entries.forEach(function(e){
      if(!isActivity(e.name))return;
      if(s.date>=cut)recent=true;
      if(s.date<from)return;
      (e.sets||[]).forEach(function(x){min+=num(x.min);});});});
  return {min:Math.round(min),target:150,recent:recent};}

/* ---- body ------------------------------------------------------------------- */
/* The weight trend against the goal: a least-squares line through the last four weeks
   of weigh-ins, as kg per week, beside the rate the goal calls for. Needs at least
   four weigh-ins spread over two weeks, because day-to-day water swings are larger
   than a week of real change. Rates are the usual evidence-based ones: losing fat at
   0.5–1% of body weight a week, gaining at 0.25–0.5%, maintaining within ±0.25%. */
function weightTrend(){
  var list=weighIns();if(list.length<4)return null;
  var last=list[list.length-1].date;
  var pts=list.filter(function(b){return daysBetween(b.date,last)<=28;});
  if(pts.length<4||daysBetween(pts[0].date,last)<14)return null;
  var x0=pts[0].date,n=pts.length,sx=0,sy=0,sxx=0,sxy=0;
  pts.forEach(function(b){var x=daysBetween(x0,b.date),y=num(b.weight);sx+=x;sy+=y;sxx+=x*x;sxy+=x*y;});
  var den=n*sxx-sx*sx;if(!den)return null;
  var perWk=(n*sxy-sx*sy)/den*7,mean=sy/n;
  var g=(S.profile||{}).goal,band=g==="lose"?[-0.01,-0.005]:g==="gain"?[0.0025,0.005]:[-0.0025,0.0025];
  var lo=band[0]*mean,hi=band[1]*mean,status;
  if(g==="lose")status=perWk>0.05?"wrong":perWk>hi?"slow":perWk<lo?"fast":"ok";
  else if(g==="gain")status=perWk<-0.05?"wrong":perWk<lo?"slow":perWk>hi?"fast":"ok";
  else status=perWk<lo?"down":perWk>hi?"up":"ok";
  return {perWk:Math.round(perWk*100)/100,lo:Math.round(lo*100)/100,hi:Math.round(hi*100)/100,
    goal:g,status:status,weeks:Math.round(daysBetween(pts[0].date,last)/7)};}
function weighIns(n){
  var list=(S.body||[]).filter(function(b){return num(b.weight)>0;});
  if(!n)return list;
  var w=win(n);
  return list.filter(function(b){return inWin(b.date,w.from,w.to);});}
/* The latest weigh-in against the most recent one at least a week older, which is
   what "vs last week" means. Without one that old, against the earliest there is,
   and the view says since when. */
function weightChange(){
  var list=weighIns();
  if(!list.length)return null;
  var cur=list[list.length-1],ref=null;
  for(var i=list.length-2;i>=0;i--)
    if(daysBetween(list[i].date,cur.date)>=7){ref=list[i];break;}
  if(!ref&&list.length>1)ref=list[0];
  return {cur:cur,ref:ref,d:ref?r1(cur.weight-ref.weight):null,
    days:ref?daysBetween(ref.date,cur.date):null};}

/* good: which way is progress for this measure. +1 up, -1 down, 0 neither. Only
   progress is coloured; the other way is plain text, not red. */
var MEASURES=[["chest","Chest",1],["waist","Waist",-1],["hips","Hips",-1],["arms","Arms",1],
  ["thighs","Thighs",1],["calves","Calves",1],["neck","Neck",0]];
function latestOf(k){
  for(var i=(S.body||[]).length-1;i>=0;i--){var v=num(S.body[i][k]);if(v>0)return {v:v,d:S.body[i].date};}
  return null;}
function measurements(){
  return MEASURES.map(function(m){
    var cur=null,prev=null;
    for(var i=(S.body||[]).length-1;i>=0;i--){
      var v=num(S.body[i][m[0]]);
      if(!(v>0))continue;
      if(!cur)cur={v:v,d:S.body[i].date};else{prev={v:v,d:S.body[i].date};break;}}
    return cur?{k:m[0],name:m[1],good:m[2],v:cur.v,d:cur.d,
      delta:prev?r1(cur.v-prev.v):null}:null;}).filter(Boolean);}

/* Body fat: a figure the user entered (a scale, a DEXA scan) where there is one at
   least as recent as the tape measurements; otherwise the US Navy circumference
   method, which needs height, waist and neck, and hips as well for women:
     men    495 / (1.0324 − 0.19077·log10(waist − neck) + 0.15456·log10(height)) − 450
     women  495 / (1.29579 − 0.35004·log10(waist + hip − neck) + 0.22100·log10(height)) − 450
   All in centimetres. It is an estimate, typically within 3–4 points of a lab
   measurement, and the screen says which of the two it is showing. */
function bodyFat(){
  var p=S.profile||{},h=num(p.height),fem=p.sex==="f";
  var waist=latestOf("waist"),neck=latestOf("neck"),hips=latestOf("hips"),own=latestOf("bf");
  var need=[];
  if(!h)need.push("height");
  if(!waist)need.push("waist");
  if(!neck)need.push("neck");
  if(fem&&!hips)need.push("hips");
  var navy=null;
  if(!need.length){
    var x=fem?waist.v+hips.v-neck.v:waist.v-neck.v;
    if(x>0){
      var L=Math.log10||function(v){return Math.log(v)/Math.LN10;};
      navy=fem?495/(1.29579-0.35004*L(x)+0.22100*L(h))-450
              :495/(1.0324-0.19077*L(x)+0.15456*L(h))-450;
      if(!(navy>=2&&navy<=60))navy=null;}}
  var bf=null,src=null,date=null;
  if(own&&(!navy||own.d>=waist.d)){bf=own.v;src="entered";date=own.d;}
  else if(navy){bf=navy;src="navy";date=waist.d;}
  var wt=lastWeight();
  return {bf:bf==null?null:r1(bf),src:src,date:date,need:own?[]:need,
    lean:bf!=null&&wt?r1(wt*(1-bf/100)):null};}

/* ---- nutrition -------------------------------------------------------------- */
/* A day's totals, or null for a day with nothing eaten logged. Read from S.days
   directly: dayRec() would create an empty record for every day it was asked about. */
function foodDay(d){
  var r=S.days&&S.days[d];
  if(!r||!r.meals)return null;
  var all=[];
  Object.keys(r.meals).forEach(function(k){(r.meals[k].items||[]).forEach(function(i){all.push(i);});});
  return all.length?sumNutrition(all):null;}
/* The finished days in the window: yesterday and the n−1 before it. */
function foodDays(n){
  var out=[];
  for(var i=n;i>=1;i--){var d=isoAgo(i),x=foodDay(d);if(x){x.d=d;out.push(x);}}
  return out;}
/* Within 10% of the target, both ways — the tolerance a food log can honestly
   claim, given what a portion estimate is worth. Protein counts as met at 90% or
   more: over on protein is not a miss. */
var TOL=0.10;
function nearTarget(v,g){return g>0&&Math.abs(v-g)<=g*TOL;}
function macrosMet(x,g){return nearTarget(x.p,g.p)&&nearTarget(x.c,g.c)&&nearTarget(x.f,g.f);}
function proteinMet(x,g){return g.p>0&&x.p>=g.p*(1-TOL);}
function kcalMet(x,g){return nearTarget(x.kcal,g.kcal);}
function nutrition(n){
  var g=S.goals||{},days=foodDays(n),k=days.length;
  function avg(key){return k?Math.round(days.reduce(function(a,x){return a+num(x[key]);},0)/k):0;}
  var met=days.filter(function(x){return macrosMet(x,g);}).length;
  return {days:days,count:k,
    avg:{kcal:avg("kcal"),p:avg("p"),c:avg("c"),f:avg("f")},
    met:met,adherence:k?Math.round(met/k*100):null};}
/* Consecutive days back from yesterday. Today joins the run once it qualifies and
   never breaks it before then; a day with nothing logged does break it. */
function runOf(test){
  var g=S.goals||{},n=0,t0=foodDay(today());
  if(t0&&test(t0,g))n++;
  for(var i=1;i<1000;i++){var x=foodDay(isoAgo(i));if(x&&test(x,g))n++;else break;}
  return n;}
function streaks(){return {protein:runOf(proteinMet),kcal:runOf(kcalMet)};}

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
function liftProgress_raw(name,n){
  var ser=e1rmSeries(name,n),pct=null;
  if(ser.length>=2&&ser[0].v>0)pct=(ser[ser.length-1].v-ser[0].v)/ser[0].v*100;
  var last=null;
  for(var i=0;i<S.sessions.length&&!last;i++){
    S.sessions[i].entries.forEach(function(e){
      if(last||e.name!==name)return;
      var work=working(e);if(!work.length)return;
      var top=0,reps={};
      work.forEach(function(x){var w=num(x.w);if(w>top)top=w;reps[num(x.r)]=(reps[num(x.r)]||0)+1;});
      var common=+Object.keys(reps).sort(function(a,b){return reps[b]-reps[a]||b-a;})[0];
      last={sets:work.length,reps:common,w:top,date:S.sessions[i].date};});}
  return {series:ser,pct:pct,last:last};}

/* The frame's "Strength +12% since start": how far the estimated maxes of the lifts
   trained most have moved across the window, averaged so one lift cannot carry it.
   Only lifts with two estimates in the window count. The series is the same figure
   session by session, 100 at the start, for the card's sparkline. */
function strengthIndex_raw(n,k){
  var names=topLifts().slice(0,k||5).map(function(L){return L.name;});
  var base={},pcts=[],byDate={};
  names.forEach(function(nm){
    var ser=e1rmSeries(nm,n);
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
function consistencyMonth_raw(){
  var now=today(),mo=now.slice(0,7),days={};
  S.sessions.forEach(function(s){if(s.date.slice(0,7)===mo)days[s.date]=1;});
  var weeks=[];
  for(var b=5;b>=0;b--){
    var to=isoAgo(b*7),from=isoAgo(b*7+6),c=0;
    S.sessions.forEach(function(s){if(inWin(s.date,from,to))c++;});
    weeks.push(c);}
  return {days:Object.keys(days).length,weeks:weeks};}

/* Body-fat figures the user entered, in the window, oldest first. */
function bodyFatSeries(n){
  var w=n?win(n):null;
  return (S.body||[]).filter(function(b){return num(b.bf)>0&&(!w||inWin(b.date,w.from,w.to));})
    .map(function(b){return {d:b.date,v:num(b.bf)};});}

export {weeklyCardio, weightTrend, weeklyVolume, bodyFat, bodyFatSeries, consistencyMonth, daysBetween, e1rmSeries, isoAgo, liftHalf, liftProgress,
        measurements, muscleShare, nutrition, overview, recentRecords, streaks, strengthIndex, TOL,
        topLifts, volumeSeries, weighIns, weightChange};

var lifts=memo("lifts",lifts_raw);
var e1rmSeries=memo("e1rmSeries",e1rmSeries_raw);
var volumeSeries=memo("volumeSeries",volumeSeries_raw);
var overview=memo("overview",overview_raw);
var muscleShare=memo("muscleShare",muscleShare_raw);
var strengthIndex=memo("strengthIndex",strengthIndex_raw);
var liftProgress=memo("liftProgress",liftProgress_raw);
var consistencyMonth=memo("consistencyMonth",consistencyMonth_raw);