/* Bunyan — coach: training blocks
   A program runs in blocks of four weeks rather than the same week over and over:
   three weeks in which effort builds — each set stopped with 3, then 2, then 1 rep in
   reserve — and then a planned lighter week, after which the next block begins. The
   lighter week is the app's usual one (fewer sets, about 10% less weight), arriving on
   schedule instead of only once the log shows the lifter has stalled.

   Inside a block, sets per muscle move with the lifter. After each workout one tap
   says how the amount felt — too easy, about right, too much — and the soreness the
   recovery sheet already asks for is read alongside it:
     soreness 7+ out of 10 in the two days after   one set fewer, whatever the answer
     too much                                      one set fewer
     too easy, soreness under 4                    one set more
     too easy, soreness 4–6                        no change: the signals disagree
     about right                                   no change
   Each workout moves only the muscles it trained (their main muscle, with working
   sets), by at most one set per workout for that muscle, and a muscle stays within
   two sets fewer and three more than the plan, per workout. Where the plan's weekly
   sets are known, the week stays under the muscle's recoverable maximum
   (js/coach/landmarks.js), and answers do not take a muscle the plan has at or above
   its minimum effective volume below it. A new block starts from the plan again: the
   lighter week clears the fatigue the extra sets were measured against.

   This is the mesocycle structure most evidence-based coaching uses (Israetel,
   Helms), simplified; the starting sets come from the plan and every number here is
   a default the person's answers move, not a prescription. Pure, like the rest of
   js/coach/. */
import {byDate, dayNo, infoOf, isoOf, num, workSets} from "./util.js";
import {LANDMARKS} from "./landmarks.js";

var WEEKS=4,RIR=[3,2,1],LIGHT_RIR=4,MIN_SHIFT=-2,MAX_SHIFT=3,MAX_SETS=6;

/* Where a date falls, counted from the block's first day: which block (from 1),
   which week of it (from 1), whether that is the lighter week, how many reps to leave
   in reserve, and the dates that bound it. null before the start or without one. */
function blockAt(start,today){
  if(!start||!today)return null;
  var d=dayNo(today)-dayNo(start);if(d<0)return null;
  var wk=Math.floor(d/7),b=Math.floor(wk/WEEKS),w=wk%WEEKS+1,s0=dayNo(start)+b*WEEKS*7;
  return {block:b+1,week:w,of:WEEKS,light:w===WEEKS,rir:w===WEEKS?LIGHT_RIR:RIR[w-1],
    start:isoOf(s0),lightFrom:isoOf(s0+(WEEKS-1)*7),end:isoOf(s0+WEEKS*7-1),next:isoOf(s0+WEEKS*7)};}

/* One workout's answer, read with the soreness after it, as a step in sets. */
function stepOf(feel,sore){
  sore=num(sore);
  if(sore>=7||feel==="much")return -1;
  if(feel==="easy")return sore>=4?0:1;
  return 0;}

/* The worst soreness logged on the two days after a workout. days is the day log:
   {"YYYY-MM-DD": {sore: 0–10}}. */
function soreAfter(days,date){
  var n=dayNo(date),worst=0;
  for(var i=1;i<=2;i++){var r=days&&days[isoOf(n+i)];if(r&&num(r.sore)>worst)worst=num(r.sore);}
  return worst;}

/* Sets per workout to add (positive) or take away (negative) for each muscle, from
   the answers given in the building weeks of the block that contains `today`.
   opts: {start, today, days, planned: {muscle: weekly sets in the plan},
          freq: {muscle: workouts a week that train it}}
   Returns {shift: {muscle: n}, answers: how many workouts answered, why: {muscle: [steps]}}. */
function setShift(sessions,info,opts){
  var I=infoOf(info);opts=opts||{};
  var B=blockAt(opts.start,opts.today),out={shift:{},answers:0,why:{}};
  if(!B)return out;
  var from=dayNo(B.start),to=dayNo(B.lightFrom),raw={};
  byDate(sessions).forEach(function(s){
    var d=dayNo(s.date);
    if(d<from||d>=to||!s.feel)return;
    var st=stepOf(s.feel,soreAfter(opts.days,s.date)),seen={};
    out.answers++;
    (s.entries||[]).forEach(function(e){
      if(!e||!e.name||I.activity(e.name)||!workSets(e).length)return;
      var m=I.muscle(e.name);if(seen[m])return;seen[m]=1;
      raw[m]=Math.max(MIN_SHIFT,Math.min(MAX_SHIFT,(raw[m]||0)+st));
      (out.why[m]=out.why[m]||[]).push(st);});});
  var planned=opts.planned||{},freq=opts.freq||{};
  Object.keys(raw).forEach(function(m){
    var k=raw[m],L=LANDMARKS[m],p=num(planned[m]),f=num(freq[m]);
    if(L&&p&&f){
      if(k>0)k=Math.max(0,Math.min(k,Math.floor((L.mrv-p)/f)));
      if(k<0&&p>=L.mev)k=Math.max(k,Math.ceil((L.mev-p)/f));}
    if(k)out.shift[m]=k;});
  return out;}

/* A day's exercises with the shift applied: a muscle's extra sets go one at a time
   to its exercises in order, main lift first; sets taken away come off the last ones
   first. An exercise keeps at least one set and gets no more than six. Copies, never
   the plan itself; each changed exercise carries plan: the sets the plan had. */
function shiftDay(exs,shift,info){
  var I=infoOf(info);
  var out=(exs||[]).map(function(e){var c={};Object.keys(e).forEach(function(k){c[k]=e[k];});return c;});
  Object.keys(shift||{}).forEach(function(m){
    var k=num(shift[m]);if(!k)return;
    var mine=out.filter(function(e){return !I.activity(e.name)&&I.muscle(e.name)===m&&num(e.sets)>0;});
    if(!mine.length)return;
    if(k<0)mine=mine.slice().reverse();
    for(var guard=0;k&&guard<50;guard++){
      var moved=false;
      for(var i=0;i<mine.length&&k;i++){
        var e=mine[i],n=num(e.sets);
        if(k>0&&n<MAX_SETS){if(e.plan==null)e.plan=n;e.sets=n+1;k--;moved=true;}
        else if(k<0&&n>1){if(e.plan==null)e.plan=n;e.sets=n-1;k++;moved=true;}}
      if(!moved)break;}});
  out.forEach(function(e){if(e.plan===e.sets)delete e.plan;});
  return out;}

/* The plan's weekly sets and workouts per muscle, for setShift's limits: each training
   day once a week, a set counted for its exercise's main muscle. */
function planVolume(days,info){
  var I=infoOf(info),planned={},freq={};
  (days||[]).forEach(function(d){
    var seen={};
    ((d&&d.ex)||[]).forEach(function(e){
      if(!e||!e.name||I.activity(e.name))return;
      var m=I.muscle(e.name);planned[m]=(planned[m]||0)+num(e.sets);
      if(!seen[m]){seen[m]=1;freq[m]=(freq[m]||0)+1;}});});
  return {planned:planned,freq:freq};}

export {blockAt, LIGHT_RIR, planVolume, RIR, setShift, shiftDay, soreAfter, stepOf, WEEKS};
