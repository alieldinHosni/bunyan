/* Bunyan — the day's fuel: food and training as one plan (docs/NEXT-PHASE.md WP-5)

   The rule first: the day's calories and macros do not change between a training day
   and a rest day. The activity multiplier (Mifflin-St Jeor × activity) already counts
   the training (CLAUDE.md), and the knowledge base gives no day-by-day cycling method.
   What changes is timing and emphasis inside the same targets, and only where the
   knowledge base says so:

     before   from 2 h before the person's usual start until the start, on a day with a
              session planned and not done: the textbook's guidance on carbs and fluid
              before training, in the words of js/data/faq.js "pre-workout" (its text
              keys; the 400-600 ml is said there and only there)
     after    from finishing until 2 h later: the protein still to go today. The
              knowledge base's guidance on protein after training has no figure for a
              person training for muscle (its anabolic window is "24 hours or more";
              the 0.3 g/kg an hour is for sport and multi-session days, and it says
              that for muscle gain the day's total matters more), so the note says only
              what is left of today's target (its figure is the plan's: app-targets).
              On Food it gives way to behind when protein is behind (one sentence)
     rest     a rest day: says so, with the plain targets
     behind   any time: what Food's body needs (js/engine/needs.js) says today, unchanged

   When the person trains is learned, never asked: usualStart(weekday) is the median
   start of the last six finished sessions on that weekday (all weekdays when there are
   fewer than three on it; none at all is null, "no history"), and no before note rests
   on fewer than three timed sessions. Stored nowhere.

   Pure: the sessions, the targets, the day's log and the clock come in; a small plan
   goes out. No state, no words: a note carries its dictionary key and figures, and the
   head (js/engine/head.js fuelLine) says it. tests/architecture.mjs holds it to that;
   js/engine/test/dayfuel.test.js runs it in Node. */
import {bodyNeedsOf} from "./needs.js";
import {FAQ} from "../data/faq.js";

var WINDOW=120;
/* A usual time needs a few sessions behind it: one session is not a habit. */
var MINTIMED=3;
var LAST=6;

/* The behind note's headline, by nutrient: the words Food has always used. */
var HEAD={p:"Your body needs more protein.",c:"Your body needs more fuel.",f:"Your body needs a little more fat.",w:"Your body needs more water."};

/* Local date of a moment, as the app's dates are (YYYY-MM-DD). */
function isoOf(d){return new Date(d.getTime()-d.getTimezoneOffset()*6e4).toISOString().slice(0,10);}
function minuteOf(ms){var d=new Date(ms);return d.getHours()*60+d.getMinutes();}
function weekdayOf(iso){return new Date(iso+"T00:00:00").getDay();}
function hhmm(m){m=((Math.round(m)%1440)+1440)%1440;var h=Math.floor(m/60),n=m%60;return (h<10?"0":"")+h+":"+(n<10?"0":"")+n;}
/* A session whose time is known: one logged afterwards has none (started at noon of its
   date, with no active time) and says nothing about when the person trains. */
function timed(s){return !!(s&&s.date&&s.started>0&&!(s.started===s.lastSet&&!(s.activeMs>0)));}
function median(a){
  var x=a.slice().sort(function(p,q){return p-q;}),n=x.length;
  return n%2?x[(n-1)/2]:Math.round((x[n/2-1]+x[n/2])/2);}

/* Minutes after midnight the person usually starts on that weekday (0 = Sunday), or
   null with no timed session at all. */
function usualOf(weekday,sessions){
  var all=(sessions||[]).filter(timed).sort(function(a,b){return b.started-a.started;});
  var on=all.filter(function(s){return weekdayOf(s.date)===weekday;});
  /* Too few on that weekday to call a habit: every weekday's (review of #158). */
  var use=(on.length>=MINTIMED?on:all).slice(0,LAST);
  return {at:use.length?median(use.map(function(s){return minuteOf(s.started);})):null,n:use.length};}
function usualStart(weekday,sessions){return usualOf(weekday,sessions).at;}
/* Said to the nearest quarter hour: "about" is the precision a median of a few starts supports. */
function aboutTime(m){return hhmm(Math.round(m/15)*15);}

/* When a session ended: the last set, else its start and wall-clock length. */
function endOf(s){
  if(s.lastSet>0&&s.lastSet>=s.started)return s.lastSet;
  return s.wallMins>0?s.started+s.wallMins*6e4:s.mins>0?s.started+s.mins*6e4:0;}

/* What is left of the day's targets after what is logged, never below 0; p null with no
   protein target. The head's todayPlan().food reads the same. */
function leftOf(goals,eaten){
  goals=goals||{};eaten=eaten||{};
  var k=+goals.kcal||0,p=+goals.p||0;
  return {kcal:Math.max(0,Math.round(k-(+eaten.kcal||0))),p:p?Math.max(0,Math.round(p-(+eaten.p||0))):null};}

/* The textbook's own sentences, by entry: its paragraphs' text keys. */
function faqKeys(id){
  var f=FAQ.filter(function(x){return x.id===id;})[0];
  return f?f.a.filter(function(x){return x.p&&!x.if;}).map(function(x){return x.p;}):[];}

/* The notes, each {kind, key, vars, more (keys said under it), source (the knowledge
   entry it rests on: js/data/faq.js's id), book (it says the textbook's guidance, not
   only the person's own figures), at (minutes, for a timed note)}. */
function beforeNote(at){
  /* The entry's carbs paragraph is about the stores used overnight: said for a session
     before noon only (the owner's lead, review of #158). The rest of the entry stays. */
  return {kind:"before",at:at,key:"Training at about {t}\u00a0— water before it; carbs if it's long or hard.",vars:{t:aboutTime(at)},
    more:faqKeys("pre-workout").filter(function(k){return at<720||!/overnight/.test(k);}),source:"pre-workout",book:true};}
function afterNote(at,pLeft){
  return {kind:"after",at:at,key:pLeft>0?"You trained\u00a0— {n}\u00a0g of protein left today.":"You trained\u00a0— today's protein target is met.",
    vars:{n:pLeft},more:[],source:"app-targets",book:false};}
function restNote(goals){
  var p=+goals.p||0;
  return {kind:"rest",at:null,key:p?"Rest day\u00a0— the same targets: {k}\u00a0kcal and {p}\u00a0g of protein.":"Rest day\u00a0— the same target: {k}\u00a0kcal.",
    vars:{k:+goals.kcal,p:p},more:["Your targets already count your training, so they stay the same on a rest day."],source:"app-targets",book:false};}
function behindNote(b){
  return {kind:"behind",at:null,key:HEAD[b.focus],vars:{},more:[],source:"app-targets",book:false,
    focus:b.focus,left:b.left,unit:b.focus==="w"?"ml":"g",needs:b};}

/* Today's fuel. now a Date; c {plan: "train" (a session planned and not done, a lighter
   week's included: nothing about food changes in one) | "done" | "rest" | "other",
   sessions, goals, eaten ({kcal,p,c,f}), water (ml), days (the food log), needs (what
   Food's body needs says, when the caller has it; else worked out here)}.
   {notes (at most three: the timed note or the rest day first, then behind), usual
   (minutes, or null), left (leftOf)}. */
function dayFuel(now,c){
  c=c||{};var goals=c.goals||{},sessions=c.sessions||[],iso=isoOf(now),t=now.getTime(),m=now.getHours()*60+now.getMinutes();
  var uo=usualOf(now.getDay(),sessions),usual=uo.at,left=leftOf(goals,c.eaten),notes=[];
  if(!(+goals.kcal>0))return {notes:notes,usual:usual,usualN:uo.n,left:left};
  /* After: the latest session finished today, for two hours. */
  var done=sessions.filter(function(s){return timed(s)&&s.date===iso&&endOf(s)>0;}).sort(function(a,b){return endOf(b)-endOf(a);})[0];
  var end=done?endOf(done):0;
  if(done&&left.p!=null&&t>=end&&t-end<WINDOW*6e4)notes.push(afterNote(minuteOf(end),left.p));
  else if(c.plan==="train"&&usual!=null&&uo.n>=MINTIMED&&m>=usual-WINDOW&&m<usual)notes.push(beforeNote(usual));
  else if(c.plan==="rest")notes.push(restNote(goals));
  var b=c.needs!==undefined?c.needs:bodyNeedsOf(c.eaten||{},goals,+c.water||0,now.getHours(),sessions,c.days||{},iso);
  if(b&&b.node)notes.push(behindNote(b));
  return {notes:notes.slice(0,3),usual:usual,usualN:uo.n,left:left};}

export {aboutTime, afterNote, beforeNote, MINTIMED, dayFuel, faqKeys, HEAD, hhmm, leftOf, restNote, usualStart};
