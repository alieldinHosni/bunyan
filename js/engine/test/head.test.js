/* The head (js/engine/head.js): its conflict rules over plain signals, and the whole of
   it over a seeded profile. head.js reads the state, so the profile is put in S
   (state.js setS) the way the app's own boot leaves it: DEF, filled in by normalize. */
import {decide, headFor, headNow, headOn, headWhy, todayPlan, isLighter, pickLead, ruleLighter, planMapping, COACH, CHECKIN, MONTHLY, rank, ruleCalories, ruleDeficit,
  ruleHousekeeping, ruleMissed, ruleRecovery, ruleSaidOnce} from "../head.js";
import {checkPlansAll} from "../plancheck.js";
import {insights} from "../../coach/insights.js";
import {checkin} from "../../coach/checkin.js";
import {monthly} from "../../coach/monthly.js";
import {weekStartOf} from "../schedule.js";
import {S, saveDB, setS, split} from "../../state.js";
import {DEF, normalize} from "../../schema.js";
import {today} from "../../util.js";

function s(id,pri,effect,o){return Object.assign({id:id,pri:pri,effect:Object.assign({volume:0,load:0,kcal:0,protein:0},effect||{}),
  page:"coach",source:"test",src:{},parent:null,dismissed:false,quiet:false},o||{});}
function ids(list){return list.map(function(x){return x.id;});}
function iso(d){var x=new Date(Date.now()-d*864e5);return new Date(x-x.getTimezoneOffset()*6e4).toISOString().slice(0,10);}
/* The profile tests/regression.mjs seeds: a gain goal on 2,500 kcal, three lifts every
   third day at RPE 8. */
function seeded(){
  var lifts=[["Barbell Bench Press - Medium Grip","Chest"],["Barbell Squat","Quads"],["Pullups","Back"]],sessions=[];
  for(var d=2;d<40;d+=3)sessions.push({id:"s"+d,date:iso(d),dayName:"Seed",activeMs:45*6e4,
    entries:lifts.map(function(l,i){return {name:l[0],muscle:l[1],sets:[1,2,3].map(function(){return {w:60+i*20,r:8,rpe:8};})};})});
  var db=Object.assign(JSON.parse(JSON.stringify(DEF)),{onboarded:true,prefs:Object.assign({},DEF.prefs,{lang:"en",unit:"kg"}),
    profile:{age:30,height:180,weight:84,sex:"m",activity:1.4,goal:"gain",prog:"standard",level:"some",days:3},
    goals:{kcal:2500,p:150,c:300,f:70,water:3000,steps:9000},sessions:sessions,body:[{date:iso(3),weight:84}],days:{}});
  setS(normalize(db));saveDB();
  return db;}
function fresh(){var db=normalize(JSON.parse(JSON.stringify(DEF)));db.onboarded=true;setS(db);saveDB();return db;}

function run(t){
  /* ---- 1. recovery beats progression ---- */
  var dl=s("deload-due",85,{volume:-1,load:-1}),vl=s("vol-low",38,{volume:1}),vh=s("vol-high",32,{volume:-1});
  t.eq(ids(ruleRecovery([dl,vl,vh])),["vol-low"],"recovery: a lighter week due takes out what adds volume, and only that");
  t.eq(ruleRecovery([dl,vl])[0].by,"deload-due","recovery: says which signal it was");
  t.eq(ruleRecovery([s("stall",36,{volume:-1,load:-1}),vl]).length,0,"recovery: below 80 is not a recovery signal");
  var r1=decide([dl,vl]);
  t.ok(ids(r1.queue).indexOf("deload-due")>=0&&ids(r1.queue).indexOf("vol-low")<0,"deload due and volume under range: the deload in the queue, the volume not");
  t.eq(r1.suppressed.filter(function(x){return x.id==="vol-low";})[0].why,"recovery","and the volume's reason is recovery");
  t.eq(ids(decide([vl]).queue),["vol-low"],"the volume comes back once the recovery signal clears");

  /* ---- 2. one calorie voice ---- */
  var kd=s("kcal-down",70,{kcal:1}),mo=s("meals-off",60,{kcal:-1}),ml=s("maint-learned",34,{kcal:1});
  var r2=decide([ml,mo,kd,s("protein",66,{protein:1})]);
  t.eq(ids(r2.queue),["kcal-down","protein"],"three calorie findings in, one out: the highest priority; protein is not a calorie voice");
  t.eq(ruleCalories([ml,mo,kd]).map(function(x){return x.why+":"+x.by;}),["calories:kcal-down","calories:kcal-down"],"calories: the others say which won");
  t.eq(ruleCalories([kd]).length,0,"calories: one alone stays");

  /* ---- 3. deficit and volume ---- */
  var ks=s("kcal-steep",72,{kcal:1});
  t.eq(ids(ruleDeficit([ks,vl,vh])),["vol-low"],"deficit: a steep deficit takes out what adds volume");
  t.eq(ruleDeficit([s("kcal-up",70,{kcal:-1}),vl]).length,0,"deficit: kcal-up is not one of the deficit signals");
  t.eq(headWhyOf(decide([ks,vl]),"vol-low"),"deficit","deficit: the reason given");

  /* ---- 4. a missed week is not a weak week ---- */
  var under=s("under",42,{volume:1},{source:"coach",src:{kind:"under",muscles:[{m:"Chest",avg:6,mev:8},{m:"Back",avg:7,mev:8}]}});
  t.eq(ids(ruleMissed([under],{planned:3,done:2})),["under"],"missed: two of three workouts done, 6 sets scaled to 9 reaches 8: explained");
  t.eq(ruleMissed([under],{planned:3,done:3}).length,0,"missed: every workout done, the shortfall is real");
  var under2=s("under",42,{volume:1},{source:"coach",src:{kind:"under",muscles:[{m:"Chest",avg:6,mev:8},{m:"Back",avg:3,mev:8}]}});
  t.eq(ruleMissed([under2],{planned:3,done:2}).length,0,"missed: a muscle the missed workouts do not explain keeps it");
  t.eq(ruleMissed([s("vol-low",38,{volume:1})],{planned:3,done:1}).length,0,"missed: the program's own volume is not about missed workouts");

  /* ---- 5. housekeeping ---- */
  var bk=s("backup",10),wi=s("weigh-in",8);
  t.eq(ids(ruleHousekeeping([bk,wi],0)),["weigh-in"],"housekeeping: one a day");
  t.eq(ids(ruleHousekeeping([bk,wi],1)),["backup"],"housekeeping: the next day, the other");
  t.eq(pickLead(rank([bk,s("checkin",50)])).id,"checkin","housekeeping never leads while something at 40 or more is live");
  t.eq(pickLead([bk]).id,"backup","alone, it may");

  /* ---- 6. said once ---- */
  var kept=s("kcal-down",70,{kcal:1},{dismissed:true});
  var r6=decide([kept,mo]);
  t.eq(ids(r6.queue),["meals-off"],"said once: a dismissed signal is not in the queue, and it is no calorie voice either");
  t.eq(headWhyOf(r6,"kcal-down"),"said-once","said once: the reason given");
  t.eq(ids(ruleSaidOnce([s("stress-light",80,{volume:-1},{quiet:true}),vl])),["stress-light"],"said once: a card put away");
  t.eq(ids(decide([s("stress-light",80,{volume:-1},{quiet:true}),vl]).queue),[],"…and while put away it still holds back more volume");

  /* ---- ranking ---- */
  var mix=decide([s("backup",10),s("balance",30),s("checkin",50),s("kcal-up",70,{kcal:-1}),s("deload-due",85,{volume:-1})]);
  t.eq(ids(mix.queue),["deload-due","kcal-up","checkin","balance","backup"],"ranked by band, highest first");
  t.eq(mix.lead.id,"deload-due","the lead is the first");
  t.eq(mix.count,5,"count is the queue");
  var parts=decide([s("checkin",50),s("checkin:balance-low",34,{volume:1},{parent:"checkin"}),s("checkin:kcal",62,{kcal:1},{parent:"checkin"}),dl]);
  t.eq([ids(parts.queue),parts.queue[1].parts],[["deload-due","checkin"],["checkin:kcal"]],"a check-in's changes ride on its card, the ones still standing");
  var pg=decide([s("a",60,{},{page:"train"}),s("b",50,{},{page:"food"}),s("c",40,{},{page:"food"})]);
  t.eq([ids(pg.byPage.train),ids(pg.byPage.food)],[[],["b","c"]],"byPage: by page, the lead left out");

  /* ---- every source's ids have a mapping ---- */
  var pcIds={};String(checkPlansAll).replace(/id:"([^"]+)"/g,function(m,x){pcIds[x]=1;});
  var known=Object.keys(pcIds);
  t.ok(known.length>=17,"the plan check's ids are read from its source ("+known.length+")");
  t.eq(known.filter(function(x){var m=planMapping(x);return !(m&&m.domain&&m.pri!=null&&m.effect);}),[],"every plan check finding has a domain, a priority and an effect");
  var kinds=function(f){var o={};String(f).replace(/kind:"([a-z]+)"/g,function(m,x){o[x]=1;});return Object.keys(o);};
  t.eq(kinds(insights).filter(function(k){return !COACH[k];}),[],"every coach insight kind has a mapping");
  t.eq(kinds(checkin).filter(function(k){return k==="balance"?!(CHECKIN["balance-low"]&&CHECKIN["balance-high"]):!CHECKIN[k];}),[],"every check-in change has a mapping");
  t.eq(kinds(monthly).filter(function(k){return !MONTHLY[k];}),[],"every monthly change has a mapping");

  /* ---- the whole head, over a profile ---- */
  seeded();var v=headNow(),q=ids(v.queue),all=ids(v.all);
  t.eq(v.errors,[],"the seeded profile: no provider fails");
  if(all.indexOf("deload-due")>=0&&all.indexOf("checkin:balance-low")>=0){
    t.ok(q.indexOf("deload-due")>=0&&ids(v.queue.filter(function(x){return x.id==="checkin";})[0].parts||[]).indexOf("checkin:balance-low")<0,
      "the seeded profile: the lighter week is in the queue, the check-in's under your range is not");
    t.eq(headWhy("checkin:balance-low"),"recovery","…and why: recovery");}
  else t.ok(false,"the seeded profile should have a lighter week due and a check-in under range: "+all.join(", "));
  t.eq([v.all.filter(function(x){return x.effect.kcal!==0;}).length>1,v.queue.filter(function(x){return x.effect.kcal!==0;}).length],[true,1],
    "the seeded profile: several calorie voices in, one in the queue");
  t.ok(headNow()===v,"memoised: asked again, the same answer");
  t.ok(headFor("train").every(function(x){return x.page==="train"&&x!==v.lead;}),"headFor: that page's, the lead left out");
  S.goals.kcal=3000;saveDB();
  var v2=headNow();
  t.ok(v2!==v&&ids(v2.all).indexOf("kcal-down")<0,"a change to the data is worked out again: 3,000 kcal builds muscle");
  seeded();
  var f=headNow().all.filter(function(x){return x.id==="kcal-down";})[0];
  t.ok(!!f,"the seeded profile has kcal-down");
  if(f){S.pcDismiss={"kcal-down":JSON.stringify(f.src.sig)};saveDB();
    t.eq([ids(headNow().queue).indexOf("kcal-down"),headWhy("kcal-down")],[-1,"said-once"],"Keep it as it is: out of the queue, said once");}

  /* ---- 7. one lighter week ---- */
  var ldue=s("deload-due",85,{volume:-1,load:-1},{page:"train",source:"deload"}),
    lck=s("checkin:deload",82,{volume:-1,load:-1},{source:"checkin",parent:"checkin"}),
    lfat=s("fat1",84,{volume:-1,load:-1},{source:"coach",src:{kind:"fatigue"}}),
    lstall=s("stall1",36,{volume:-1,load:-1},{source:"coach",src:{kind:"stall"}}),
    lper=s("dl1",38,{load:-1},{source:"coach",src:{kind:"deload"}});
  t.eq([isLighter(ldue),isLighter(lck),isLighter(lfat),isLighter(lstall),isLighter(lper)],[true,true,true,true,false],
    "lighter: what offers a lighter week (a per-lift 10% drop does not)");
  t.eq(ruleLighter([lfat,ldue,lck,lstall]).map(function(x){return x.id+":"+x.why+":"+x.by;}),
    ["fat1:lighter:deload-due","checkin:deload:lighter:deload-due","stall1:lighter:deload-due"],"lighter: Training's card wins over the others, whatever their priority");
  t.eq(ids(ruleLighter([lck,lfat,lstall])),["checkin:deload","stall1"],"lighter: without it, the highest priority stays");
  var lon=s("deload-on",80,{volume:-1,load:-1},{page:"train",source:"deload"});
  t.eq(ids(ruleLighter([lon,lfat])),["fat1"],"lighter: one running says it; nothing offers another");
  t.eq([ruleLighter([lfat,lper]).length,ruleLighter([lstall]).length],[0,0],"lighter: one alone, or with a per-lift drop, stays");
  var r7=decide([ldue,lfat,lstall,lper,s("checkin",50,{},{source:"checkin"}),lck]);
  t.eq([ids(r7.queue),r7.queue.filter(function(x){return x.id==="checkin";})[0].parts],[["deload-due","checkin","dl1"],[]],
    "lighter: three sources in, one card out; the check-in's own change rides away from its card");
  t.eq(headWhyOf(r7,"stall1"),"lighter","lighter: the reason given");

  /* ---- nothing to say ---- */
  /* A new profile has the default program (state.js split: Full Body), and the plan
     check reads it as it does today; nothing else has anything to say. */
  var e=fresh();e.ckDone=weekStartOf(today());saveDB();
  var ev=headNow();
  /* Food's "your body needs" reads the clock: with nothing eaten, later in the day it says
     the day is behind, as Food shows it. It is the only voice that may speak here. */
  t.eq([ev.errors,ev.queue.filter(function(x){return x.source!=="plancheck"&&x.source!=="needs";}).length],[[],0],"an empty profile: nothing from the log, and nothing fails");
  t.ok(ev.queue.filter(function(x){return x.source==="needs";}).every(function(x){return x.id==="needs-today";}),"…only today's body needs, which depends on the hour");
  e.ckDone=null;saveDB();
  t.ok(ids(headNow().queue).indexOf("checkin")>=0,"…with this week's check-in open, it asks what got in the way, as Coach shows it today");
  var n=fresh();n.onboarded=false;saveDB();
  t.eq([headNow().count,headNow().lead],[0,null],"not onboarded: nothing");
  setS({onboarded:true});saveDB();
  var bare;try{bare=headNow();}catch(x){bare=null;}
  t.ok(bare&&bare.count===0,"a state with nothing in it does not throw");
  /* ---- headOn: the lead on its own page only, then the page's queue ---- */
  seeded();
  var hn=headNow(),pages=["train","food","coach","progress"],drawn=[];
  pages.forEach(function(p){drawn=drawn.concat(ids(headOn(p)));});
  t.eq(drawn.slice().sort(),ids(hn.queue).slice().sort(),"headOn: every signal in the queue is drawn on exactly one page");
  t.ok(hn.lead&&headOn(hn.lead.page)[0]===hn.lead&&pages.filter(function(p){return p!==hn.lead.page;}).every(function(p){return headOn(p).indexOf(hn.lead)<0;}),
    "headOn: the lead tops its own page and no other");

  /* ---- todayPlan: the Training page's Today card (WP-2) ---- */
  seeded();
  var tp=todayPlan();
  t.ok(tp.state==="train"||tp.state==="rest","today: a training day or a rest day in the seeded program ("+tp.state+")");
  t.eq([tp.lead&&tp.lead.id,tp.line&&tp.line.kind,tp.line&&tp.line.id],["deload-due","lead","deload-due"],"today: the lighter week due leads, as the card's one line");
  t.eq(tp.house&&tp.house.id,"backup","today: the backup reminder is the housekeeping card, never the line");
  t.ok(!tp.other||tp.other.id!=="deload-due","today: what the line says is not a second card");
  S.deload={snooze:"2099-01-01"};saveDB();
  var tk=todayPlan();
  t.eq([tk.lead&&tk.lead.id,tk.line&&tk.line.id],["kcal-down","kcal-down"],"today: the lighter week put off, the next lead (pri >= 60) takes the line, wherever it belongs");
  S.deload={until:addDays(6),last:today()};saveDB();
  var tl=todayPlan();
  t.ok(tl.light&&tl.light.until===addDays(6)&&(tl.state==="light"||tl.state==="rest"),"today: a lighter week running is the card's status (light), not a lead");
  t.ok(!tl.lead||tl.lead.id!=="deload-on","…and never the line");
  S.deload={snooze:"2099-01-01"};
  var day=(split().days.filter(function(d){return d.ex.length;})[0]);
  S.sessions.push({id:"tdy",date:today(),dayId:day.id,dayName:day.name,entries:[{name:"Barbell Squat",muscle:"Quads",sets:[{w:80,r:8}]}]});saveDB();
  var td=todayPlan();
  t.eq([td.state,td.session&&td.session.name],["done",day.name],"today: trained today is done, with the session done");
  t.ok(td.next&&td.next.date>today(),"…and the next session after it");
  S.sessions.pop();S.active={dayName:day.name,idx:0,entries:[{name:"Barbell Squat",sets:[]}]};saveDB();
  t.eq(todayPlan().state,"resume","today: a workout open is resume");
  S.active=null;S.daySwap={};S.daySwap[today()]="rest";saveDB();
  t.eq(todayPlan().state,"rest","today: a day taken off is a rest day");
  S.daySwap={};saveDB();
  var other=todayPlan(addDays(1));
  t.eq([other.line,other.house&&other.house.id],[null,"backup"],"another day: no line in the card (the lead is today's)");
  var nb=fresh();nb.onboarded=false;saveDB();
  var ns=todayPlan();
  t.ok(ns.state!=="setup"&&ns.line&&ns.line.kind==="setup","not set up, with a program that trains: the day as it is, the assessment as its line ("+ns.state+")");
  split().days.forEach(function(d){d.ex=[];});saveDB();
  t.eq([todayPlan().state,todayPlan().line],["setup",null],"not set up and nothing to train: the assessment is the card");
  fresh();}
function addDays(n){var d=new Date(today()+"T00:00:00");d.setDate(d.getDate()+n);return new Date(d.getTime()-d.getTimezoneOffset()*6e4).toISOString().slice(0,10);}

function headWhyOf(r,id){var x=r.suppressed.filter(function(y){return y.id===id;})[0];return x?x.why:null;}

export {run};
