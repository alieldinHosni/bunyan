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
import {e1RM, lastWeight, sessionVolume} from "./formulas.js";
import {sumNutrition} from "./nutrition.js";
import {S} from "../state.js";
import {num, r1, today} from "../util.js";

/* ---- dates ---------------------------------------------------------------- */
/* Local calendar dates, with the same timezone correction as shiftDay(): without it
   "7 days ago" is off by one east of Greenwich. */
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
function overview(n){
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
function volumeSeries(n){
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
function lifts(){
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
  return lifts().sort(function(a,b){return b.sets-a.sets||(b.last>a.last?1:-1);});}
function recentRecords(k){
  return lifts().filter(function(L){return L.date&&(L.w>0||L.reps>0);})
    .sort(function(a,b){return a.date<b.date?1:a.date>b.date?-1:b.w-a.w;}).slice(0,k||3);}

/* Estimated one-rep max per session for one lift, oldest first. Epley, working
   sets of twelve reps or fewer — e1RM() returns 0 past that, and those are skipped
   rather than plotted as a collapse to zero. */
function e1rmSeries(name,n){
  var w=n?win(n):null,out=[];
  for(var i=S.sessions.length-1;i>=0;i--){
    var s=S.sessions[i];
    if(w&&!inWin(s.date,w.from,w.to))continue;
    var best=0;
    s.entries.forEach(function(e){
      if(e.name!==name)return;
      working(e).forEach(function(x){var v=e1RM(num(x.w),num(x.r));if(v>best)best=v;});});
    if(best)out.push({d:s.date,v:best});}
  return out;}

/* The frame's six groups. Sets, not kilograms: a set of curls and a set of squats
   are the same unit of training, where their tonnage differs tenfold. */
var GROUP={Chest:"Chest",Back:"Back",Shoulders:"Shoulders",Biceps:"Arms",Triceps:"Arms",
  Forearms:"Arms",Quads:"Legs",Hamstrings:"Legs",Glutes:"Legs",Adductors:"Legs",Calves:"Legs",
  Core:"Core"};
var GORDER=["Chest","Back","Legs","Shoulders","Arms","Core","Other"];
function muscleShare(n){
  var w=win(n),c={},tot=0;
  S.sessions.forEach(function(s){
    if(!inWin(s.date,w.from,w.to))return;
    s.entries.forEach(function(e){
      var k=working(e).length;if(!k)return;
      var g=GROUP[muscleOfEntry(e)]||"Other";
      c[g]=(c[g]||0)+k;tot+=k;});});
  var rows=Object.keys(c).map(function(g){return {g:g,sets:c[g]};})
    .sort(function(a,b){return b.sets-a.sets||GORDER.indexOf(a.g)-GORDER.indexOf(b.g);});
  var p=pct100(rows.map(function(r){return r.sets;}));
  rows.forEach(function(r,i){r.pct=p[i];});
  return {tot:tot,rows:rows};}

/* ---- body ------------------------------------------------------------------- */
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

export {bodyFat, daysBetween, e1rmSeries, isoAgo, measurements, muscleShare, nutrition, overview,
        recentRecords, streaks, TOL, topLifts, volumeSeries, weighIns, weightChange};
