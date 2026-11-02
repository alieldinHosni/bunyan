/* Bunyan — coach: is each muscle ready, and is the next day the right one
   Owner, 2 Nov: "I have push today, but I decided to train pull, and tomorrow was
   planned to be pull: the app should understand that the muscles trained today need
   time to recover … and suggest or change the next day to the appropriate training
   day based on my split … based on the overall load on the majority of the muscles
   that day compared to the rest taken."

   The textbook's rule (js/knowledge/acute-variables.js, variables · frequency): at least
   one day of rest between sessions that stress the same muscles. So a muscle trained
   hard on a day is ready two days later, and not the day after: that day is the rest
   the rule asks for (owner, 2 Nov: Full A the day after Full A was let through when the
   day after counted as half-way there). How tired it is depends on how much it did: a muscle that only helped (half a set
   for each set it assisted, as the app counts everywhere) or did a couple of sets is
   less tired than one that did a full session's work. FULL is the dose taken as a full
   session for one muscle; it is the app's modelling choice, not a figure from a source,
   so nothing shows it as one: readiness is said in words ("fresh", "one day of rest").
   Soreness the person logged on the recovery sheet (7 or more out of 10, in the last
   two days) holds back every muscle they trained in that time.

   readiness(sessions, today, info, sore) → {muscle: 0..1}
   dayReady(dayEx, ready, info)           → 0..1, weighted by the day's planned sets
   suggest(days, plannedIdx, ready, info)  → {from, to, ready, toReady, tired[]} or null

   Pure, like the rest of js/coach/: sessions, dates and the library's answers come in
   as arguments. */
import {dayNo, infoOf, num, workSets} from "./util.js";

var REST_DAYS=2,FULL=4,SORE=7,SORE_HOLD=0.5;
/* A day is worth swapping when most of its planned work lands on muscles still tired,
   and another day of the program would be clearly fresher. */
var LOW=0.65,BETTER=0.25;

/* Hard sets per muscle in one session: a working set counts in full for its main muscle
   and half for those it also works; a set logged at RPE 6 or easier counts half. */
function loadOf(s,I){
  var m={};
  (s.entries||[]).forEach(function(e){
    if(I.activity(e.name))return;
    var n=0;workSets(e).forEach(function(x){n+=num(x.rpe)&&num(x.rpe)<=6?0.5:1;});
    if(!n)return;
    var main=e.muscle||I.muscle(e.name);
    m[main]=(m[main]||0)+n;
    (I.secondary(e.name)||[]).forEach(function(x){if(x!==main)m[x]=(m[x]||0)+n/2;});});
  return m;}

function readiness(sessions,today,info,sore){
  var I=infoOf(info),t=dayNo(today),tired={};
  (sessions||[]).forEach(function(s){
    var ago=t-dayNo(s.date);
    if(ago<0||ago>=REST_DAYS)return;
    /* The day of the session and the day after are both inside the rest the rule asks
       for; from the second day on, the muscle is ready. */
    var load=loadOf(s,I),left=1;
    Object.keys(load).forEach(function(mu){
      var f=Math.min(1,load[mu]/FULL)*left;
      if(f>(tired[mu]||0))tired[mu]=f;});});
  var out={};
  Object.keys(tired).forEach(function(mu){out[mu]=1-tired[mu];});
  /* Sore, and said so: what was trained in the last two days is not ready yet. */
  if(num(sore)>=SORE)Object.keys(out).forEach(function(mu){out[mu]=Math.min(out[mu],SORE_HOLD);});
  return out;}

/* How ready a planned day is: its planned sets per muscle, weighted by each muscle's
   readiness. A muscle not trained lately is fully ready. */
function plannedLoad(dayEx,I){
  var m={},tot=0;
  (dayEx||[]).forEach(function(e){
    if(I.activity(e.name))return;
    var n=Math.max(1,num(e.sets)||num(e.planned&&e.planned.sets)||3),main=e.muscle||I.muscle(e.name);
    m[main]=(m[main]||0)+n;tot+=n;
    (I.secondary(e.name)||[]).forEach(function(x){if(x!==main){m[x]=(m[x]||0)+n/2;tot+=n/2;}});});
  return {m:m,tot:tot};}
function dayReady(dayEx,ready,info){
  var I=infoOf(info),pl=plannedLoad(dayEx,I);
  if(!pl.tot)return 1;
  var s=0;Object.keys(pl.m).forEach(function(mu){s+=pl.m[mu]*(ready[mu]==null?1:ready[mu]);});
  return s/pl.tot;}

/* The muscles that make a day not ready: those carrying a real share of its work and
   still tired, most work first. */
function tiredOn(dayEx,ready,info){
  var I=infoOf(info),pl=plannedLoad(dayEx,I);
  /* A real share: two sets or more of it, or a sixth of the day. A full-body day gives
     each muscle a small share, and every one still tired is worth naming. */
  return Object.keys(pl.m).filter(function(mu){return ready[mu]!=null&&ready[mu]<0.75&&(pl.m[mu]>=2||pl.m[mu]>=pl.tot*0.15);})
    .sort(function(a,b){return pl.m[b]-pl.m[a];});}

/* days: the program's days in order ({id, name, ex}); plannedIdx: the one due. When it
   is not ready and another training day is clearly fresher, that one, preferring the
   nearest after the planned one in the program's order (the split stays in its order
   as far as it can). Rest days are never suggested: resting is always open. */
function suggest(days,plannedIdx,ready,info){
  var d=days&&days[plannedIdx];
  if(!d||!(d.ex||[]).length)return null;
  var r0=dayReady(d.ex,ready,info);
  if(r0>=LOW)return null;
  var best=null;
  for(var k=1;k<days.length;k++){
    var j=(plannedIdx+k)%days.length,c=days[j];
    if(!c||!(c.ex||[]).length||c.id===d.id)continue;
    var r=dayReady(c.ex,ready,info);
    if(r>=r0+BETTER&&(!best||r>best.r+0.05))best={i:j,r:r};}
  if(!best)return null;
  return {from:d.id,to:days[best.i].id,ready:r0,toReady:best.r,tired:tiredOn(d.ex,ready,info)};}

export {dayReady, readiness, suggest, tiredOn, LOW, REST_DAYS};
