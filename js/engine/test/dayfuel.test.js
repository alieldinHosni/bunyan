/* The day's fuel (js/engine/dayfuel.js, docs/NEXT-PHASE.md WP-5). Plain data in: the
   sessions, the targets, the day's log, the clock. */
import {aboutTime, afterNote, beforeNote, dayFuel, hhmm, leftOf, restNote, usualStart} from "../dayfuel.js";
import fs from "node:fs";
import {FAQ, FAQ_AR} from "../../data/faq.js";

var DICT=fs.readFileSync(new URL("../../i18n/ar.js",import.meta.url),"utf8");
function hasAr(k){var q=JSON.stringify(k);return !!FAQ_AR[k]||DICT.indexOf(q+":")>=0||DICT.indexOf(q.replace(/\u00a0/g,"\\u00a0")+":")>=0;}

var G={kcal:2500,p:150,c:300,f:70,water:3000};
function at(iso,h,m){return new Date(iso+"T"+(h<10?"0":"")+h+":"+(m<10?"0":"")+m+":00").getTime();}
/* A finished session: started then, an hour of sets. */
function ses(iso,h,m,o){var s=at(iso,h,m);return Object.assign({date:iso,started:s,lastSet:s+60*6e4,activeMs:50*6e4},o||{});}
/* Three Tuesdays at 18:05, 17:50 and 18:20 (the WP-5 example), and a Thursday at 07:00. */
var TUES=[ses("2026-11-03",18,5),ses("2026-11-10",17,50),ses("2026-10-27",18,20),ses("2026-11-05",7,0)];
function kinds(r){return r.notes.map(function(n){return n.kind;});}

function run(t){
  /* ---- when the person trains: learned, never asked ---- */
  t.eq(hhmm(usualStart(2,TUES)),"18:05","Tuesdays at 18:05, 17:50, 18:20: the usual start is the median, 18:05");
  t.eq(usualStart(4,TUES),Math.round((1070+1085)/2),"a single Thursday is too few for a habit: every weekday's median");
  var thu=TUES.concat([ses("2026-10-29",7,10),ses("2026-10-22",6,50)]);
  t.eq(hhmm(usualStart(4,thu)),"07:00","three Thursdays: Thursday has its own time");
  t.eq(usualStart(1,TUES),Math.round((1070+1085)/2),"a weekday never trained on falls back to all weekdays: the median of 07:00, 17:50, 18:05, 18:20");
  t.eq(usualStart(2,[]),null,"no sessions: null, not midnight");
  t.eq(usualStart(2,[{date:"2026-11-03",started:at("2026-11-03",12,0),lastSet:at("2026-11-03",12,0),activeMs:0}]),null,
    "a session logged afterwards (started at noon, no active time) says nothing about when");
  var six=[];for(var w=0;w<8;w++)six.push(ses(new Date(at("2026-11-03",0,0)-w*7*864e5+12*36e5).toISOString().slice(0,10),w<6?19:6,0));
  t.eq(hhmm(usualStart(2,six)),"19:00","only the last six count: two old 06:00 Tuesdays drop out");

  /* ---- dayFuel: before, after, neither ---- */
  var tue={plan:"train",sessions:TUES,goals:G,eaten:{kcal:1200,p:70,c:150,f:40},water:1500,days:{}};
  var b=dayFuel(new Date(at("2026-11-17",16,30)),tue);
  t.eq(b.notes[0].kind,"before","16:30 on a Tuesday with a session planned: leads with before");
  t.eq(b.notes[0].vars.t,"18:00","at the usual time, said to the nearest quarter hour (18:05 → 18:00)");
  t.eq(kinds(dayFuel(new Date(at("2026-11-17",15,30)),tue)).indexOf("before"),-1,"15:30 is more than two hours before: no before");
  t.eq(kinds(dayFuel(new Date(at("2026-11-17",18,10)),tue)).indexOf("before"),-1,"after the usual start it is not before any more");
  var fin=TUES.concat([ses("2026-11-17",18,10)]);
  var a=dayFuel(new Date(at("2026-11-17",19,30)),Object.assign({},tue,{plan:"done",sessions:fin}));
  t.eq(a.notes[0].kind,"after","19:30, finished at 19:10: after");
  t.eq(a.notes[0].vars.n,80,"protein still to go today: 150 − 70");
  t.eq(kinds(dayFuel(new Date(at("2026-11-17",21,30)),Object.assign({},tue,{plan:"done",sessions:fin}))).indexOf("after"),-1,"two hours after finishing: no after");
  var met=dayFuel(new Date(at("2026-11-17",19,30)),Object.assign({},tue,{plan:"done",sessions:fin,eaten:{kcal:2400,p:160}}));
  t.eq([met.notes[0].kind,met.notes[0].vars.n,met.notes[0].key],["after",0,"You trained\u00a0— today's protein target is met."],"the target met: says so, no negative left");
  var rest=dayFuel(new Date(at("2026-11-16",16,30)),Object.assign({},tue,{plan:"rest"}));
  t.eq([kinds(rest).indexOf("before"),kinds(rest).indexOf("after"),rest.notes[0].kind],[-1,-1,"rest"],"a rest day: neither before nor after; says rest");
  t.eq([rest.notes[0].vars.k,rest.notes[0].vars.p],[2500,150],"and the plain targets, as they are");
  t.eq(kinds(dayFuel(new Date(at("2026-11-17",16,30)),Object.assign({},tue,{sessions:[]}))).indexOf("before"),-1,"no history: no time, so no before (absent is not midnight)");
  t.eq(dayFuel(new Date(at("2026-11-17",16,30)),Object.assign({},tue,{goals:{}})).notes,[],"no calorie target: nothing");
  /* behind: Food's body needs, unchanged, after the timed note */
  var ev=dayFuel(new Date(at("2026-11-17",19,0)),Object.assign({},tue,{plan:"other",eaten:{kcal:2000,p:40,c:280,f:65},water:2900}));
  t.eq([kinds(ev),ev.notes[0].focus,ev.notes[0].key],[["behind"],"p","Your body needs more protein."],"behind any time: protein short in the evening");
  var both=dayFuel(new Date(at("2026-11-17",17,0)),Object.assign({},tue,{eaten:{kcal:600,p:20,c:80,f:20},water:2500}));
  t.eq(kinds(both),["before","behind"],"timed note first, then behind; never more than three");
  t.eq(dayFuel(new Date(at("2026-11-17",17,0)),Object.assign({},tue,{needs:null})).notes.map(function(n){return n.kind;}),["before"],"the caller's needs (null: the head keeps none) are used as given");

  /* ---- every figure traced to a knowledge entry ---- */
  var ids={};FAQ.forEach(function(f){ids[f.id]=f;});
  var all=[b,a,met,rest,ev,both].reduce(function(x,r){return x.concat(r.notes);},[]);
  all.forEach(function(n){
    t.ok(!!ids[n.source],n.kind+": its source, "+n.source+", is a knowledge entry");
    [n.key].concat(n.more).forEach(function(k){t.ok(hasAr(k),n.kind+": its words have Arabic ("+k.slice(0,30)+"…)");});});
  /* before: the textbook's own sentences, its figures said there only */
  var pre=ids["pre-workout"],bk=b.notes[0];
  t.ok(bk.book&&bk.more.length>=1&&bk.more.every(function(k){return pre.a.some(function(x){return x.p===k;});}),"before: the pre-workout entry's text keys");
  t.ok(bk.more.some(function(k){return /400 to 600 ml/.test(k);}),"the 400–600 ml comes from that entry");
  t.ok(!/\d/.test(bk.key.replace("{t}","")),"the note's own sentence restates no figure");
  t.ok(!/\d/.test(afterNote(0,1).key.replace("{n}",""))&&!/\d/.test(restNote(G).key.replace(/\{\w\}/g,"")),"after and rest carry only the person's own figures");
  t.eq([aboutTime(1083),aboutTime(1093),aboutTime(1087),aboutTime(1088),aboutTime(1435)],["18:00","18:15","18:00","18:15","00:00"],"an about-time to the nearest 15 minutes (18:03, 18:13, 18:07, 18:08, 23:55)");
  t.eq(beforeNote(1083).vars.t,"18:00","the before note says the rounded time");
  /* the carbs paragraph (stores used overnight) only for a session before noon */
  var am=beforeNote(7*60),pm=beforeNote(18*60);
  t.eq([am.more.some(function(k){return /overnight/.test(k);}),pm.more.some(function(k){return /overnight/.test(k);})],[true,false],"the overnight-glycogen paragraph: 07:00 yes, 18:00 no");
  t.ok(pm.more.some(function(k){return /400 to 600 ml/.test(k);}),"the rest of the entry stays for a later session");
  t.ok(/long or hard/.test(pm.key),"the headline keeps the textbook's qualifier (long or hard training)");
  /* one or two sessions are not a usual time */
  var two=[ses("2026-11-03",18,5),ses("2026-11-10",17,50)];
  var tw=dayFuel(new Date(at("2026-11-17",16,30)),Object.assign({},tue,{sessions:two}));
  t.eq([tw.usual,tw.usualN,kinds(tw).indexOf("before")],[Math.round((1085+1070)/2),2,-1],"two timed sessions: a median, but no before note (fewer than three)");
  t.eq(kinds(dayFuel(new Date(at("2026-11-17",16,30)),Object.assign({},tue,{sessions:two.concat([ses("2026-10-27",18,20)])}))).indexOf("before"),0,"three: before");

  /* ---- the targets do not move ---- */
  var g0=JSON.stringify(G);
  dayFuel(new Date(at("2026-11-17",16,30)),tue);dayFuel(new Date(at("2026-11-17",19,30)),Object.assign({},tue,{plan:"done",sessions:fin}));
  t.eq(JSON.stringify(G),g0,"targets equal before and after a training day");
  t.eq(leftOf(G,{kcal:2600,p:10}),{kcal:0,p:140},"what is left never goes below 0");
  t.eq(leftOf({kcal:2000},{kcal:500}).p,null,"no protein target: p is null, not 0");}

export {run};
