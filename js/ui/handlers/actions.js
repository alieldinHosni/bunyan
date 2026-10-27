/* Bunyan — what the coach can do, by name
   The chat's action half (docs/design/chat-spec.md, .claude/SESSION-AGENT.md §1). Each
   action is a name, what it does, what it takes, and whether it waits for a tap; and it
   runs by doing what the app's own button does: the same tap through the same branch
   (dispatchTap), or the same function the button calls. Nothing here changes the
   program or the log any other way, so the registry holds nothing the screens cannot
   already do, and when a screen's behaviour changes the coach's changes with it.

   confirm:true is anything that changes the program or the log: the chat shows what
   will happen and waits for a tap (an inline confirmation in the panel, never a sheet).

   Undo is one step, for the session: the newest applied action can be taken back, with
   no history behind it (SESSION-AGENT.md §4). Before an action runs, the part of the
   state it touches is copied (snap); Undo puts that copy back. A reload ends the session,
   and the Undo with it. */
import {FOODDB} from "../../engine/nutrition.js";
import {itemOf} from "../../engine/mealplan.js";
import {ownSlot} from "../../engine/meals.js";
import {dayOf, dayRec, recordSession, removeSession, S, saveDB, saveSession} from "../../state.js";
import {toDisp} from "../../units.js";
import {today, uid} from "../../util.js";
import {exIdOf, LIB, muscleOf, MUSCLES} from "../../data/exercises.js";
import {actMuscle, isActivity} from "../../data/activities.js";
import {t} from "../../i18n/dict.js";
import {exName} from "../../i18n/exnames.js";
import {render} from "../render.js";
import {V} from "../view.js";
import {LENT, setExField} from "./common.js";
import {dispatchTap} from "./registry.js";
import {STEPS} from "../views/assess.js";

/* A tap on a button carrying these data-* keys, as if the person had made it. */
function tap(D){
  var b=typeof document!=="undefined"?document.createElement("button"):null;
  return dispatchTap(D,b,{target:b},{typingAsk:false});}
function copy(x){return x==null?x:JSON.parse(JSON.stringify(x));}

/* What each kind of action touches, copied before it runs and put back by Undo. */
var SNAP={
  program:function(){var p=copy(S.programs);return function(){S.programs=p;};},
  /* The program and the person's own exercises: an exercise made for them leaves the
     library again (it was the last one in). */
  exlib:function(){var p=copy(S.programs),mx=copy(S.myEx||[]),n=LIB.length;return function(){S.programs=p;S.myEx=mx;LIB.length=n;};},
  live:function(){var a=copy(S.active),i=V.logIdx;return function(){S.active=a;V.logIdx=i;if(a)a.idx=i;};},
  day:function(){var d=today(),r=copy(S.days[d]);return function(){if(r)S.days[d]=r;else delete S.days[d];};},
  body:function(){var b=copy(S.body);return function(){S.body=b;};},
  goals:function(){var g=copy(S.goals),k=S.profile.goal;return function(){S.goals=g;S.profile.goal=k;};},
  meals:function(){var m=copy(S.mealSlots);return function(){S.mealSlots=m;};},
  /* The week's dates moved by hand (S.daySwap), and the lighter week with its block. */
  /* Workouts added to the history: Undo takes out any it didn't have. */
  sessions:function(){var ids={};(S.sessions||[]).forEach(function(s){ids[s.id]=(s.entries||[]).length;});
    return function(){(S.sessions||[]).slice().forEach(function(s){
      if(!(s.id in ids))removeSession(s.id);
      else if((s.entries||[]).length>ids[s.id]){s.entries=s.entries.slice(0,ids[s.id]);saveSession(s);}});};},
  /* The next set's numbers in the logger. */
  draft:function(){var d=copy(V.draft);return function(){V.draft=d;};},
  sched:function(){var w=copy(S.daySwap||{});return function(){S.daySwap=w;};},
  deload:function(){var d=copy(S.deload),b=copy(S.block);return function(){
    if(d)S.deload=d;else delete S.deload;if(b)S.block=b;else delete S.block;};},
  /* Settings put back the way the screen's own buttons left them. */
  prefs:function(){var pr=copy(S.prefs),th=S.theme;return function(){
    if(pr.lang!==S.prefs.lang)tap({setlang:pr.lang});
    if(th!==S.theme)tap({lookmode:th});
    S.prefs=pr;};}};
/* Where "open …" goes: the tap the screen itself makes to get there. */
var PLACE={food:[{tab:"food"}],train:[{tab:"train"}],progress:[{tab:"progress"}],coach:[{tab:"coach"}],profile:[{prof:"1"}],
  mealplan:[{csec:"food",cfsub:"plan"}],targets:[{csec:"food",cfsub:"targets"}],program:[{csec:"train",ctsub:"program"}],
  programs:[{csec:"train",ctsub:"programs"}],history:[{tab:"progress"},{phist:"1"}],weigh:[{sheet:"weigh"}],steps:[{sheet:"steps"}],
  recovery:[{sheet:"recovery"}],activities:[{actsheet:"1"}],assessment:[{setup:"1"}],settings:[{sheet:"set_app"}],
  you:[{sheet:"set_you"}],backup:[{"export":"1"}],newmeals:[{pgen:"1"}]};

var ACTIONS={
  "exercise.add":{desc:"Add a library exercise to a day of the program",params:{name:"exercise, from the library",day:"day id, from the program"},
    confirm:true,snap:"program",
    /* The picker's tap, with the day it was opened for. */
    run:function(p){if(!dayOf(p.day))return false;V.dayId=p.day;V.sd={};tap({pickex:p.name});return true;}},
  "exercise.create":{desc:"Make an exercise of the person's own (a name and the muscle it works, no picture) and add it to a day of the program",
    params:{name:"its name, as the person said it",m:"the muscle it works, one of the library's",day:"day id, from the program"},
    confirm:true,snap:"exlib",
    /* What the picker's "add your own" does, then the picker's tap with the day. */
    run:function(p){
      var name=String(p.name||"").trim();
      if(!dayOf(p.day)||!name||MUSCLES.indexOf(p.m)<0)return false;
      if(!LIB.some(function(l){return l[0].toLowerCase()===name.toLowerCase();})){
        LIB.push([name,p.m,"Other",0]);(S.myEx=S.myEx||[]).push({id:"u_"+uid(),n:name,m:p.m});}
      V.dayId=p.day;V.sd={};tap({pickex:name});return true;}},
  "exercise.dose":{desc:"Change an exercise's sets, reps or rest in the program (or the rests of a whole day)",
    params:{ch:"[{day, id, sets?, lo?, hi?, rest?}], each an exercise in a day"},confirm:true,snap:"program",
    /* What the exercise sheet's steppers write, field by field. */
    run:function(p){var ok=false;
      (p.ch||[]).forEach(function(c){var d=dayOf(c.day),e=d&&d.ex.filter(function(x){return x.id===c.id;})[0];if(!e)return;
        ["sets","lo","hi","rest"].forEach(function(k){if(c[k]!=null)setExField(e,k,c[k]);});ok=true;});
      if(ok){saveDB();render();}return ok;}},
  "sched.skip":{desc:"Make a day's workout a rest day; the plan carries on",params:{date:"YYYY-MM-DD, today or later"},confirm:true,snap:"sched",
    /* The day's own "Change workout" sheet, with a rest day chosen. */
    run:function(p){if(!p.date||p.date<today())return false;(S.daySwap=S.daySwap||{})[p.date]="rest";saveDB();render();return true;}},
  "sched.move":{desc:"Move a workout from one date to another; what was on that date goes the other way",
    params:{from:"date",to:"date",day:"the day id moving",back:"the day id going back, or rest"},confirm:true,snap:"sched",
    run:function(p){if(!p.from||!p.to||p.from<today()||p.to<today()||!dayOf(p.day))return false;
      var w=S.daySwap=S.daySwap||{};w[p.to]=p.day;w[p.from]=p.back||"rest";saveDB();render();return true;}},
  "deload.start":{desc:"Start a lighter week: fewer sets and about 10% lighter suggestions for seven days",params:{},confirm:true,snap:"deload",
    /* The Training card's "Start a lighter week". */
    run:function(){tap({deload:"start"});return true;}},
  "deload.end":{desc:"End the lighter week early",params:{},confirm:true,snap:"deload",run:function(){tap({deload:"end"});return true;}},
  "exercise.remove":{desc:"Take an exercise out of a day of the program",params:{id:"the exercise's id in that day",day:"day id"},
    confirm:true,snap:"program",
    /* The ✕ on the day builder's row. */
    run:function(p){if(!dayOf(p.day))return false;V.dayId=p.day;tap({rmex:p.id});return true;}},
  "exercise.swap":{desc:"Replace an exercise in a day of the program with a library exercise, keeping its sets, reps and rest",
    params:{id:"the exercise's id in that day",day:"day id",name:"the replacement, from the library"},confirm:true,snap:"program",
    /* Replace this exercise, then the picked one: the picker opened with replace. */
    run:function(p){if(!dayOf(p.day))return false;V.dayId=p.day;V.sd={replace:p.id};tap({pickex:p.name});return true;}},
  "exercise.swapToday":{desc:"Swap an exercise in the workout in progress, for today only",params:{i:"its place in the workout",name:"the replacement"},
    confirm:true,snap:"live",
    run:function(p){if(!S.active||!S.active.entries[p.i]||S.active.entries[p.i].sets.length)return false;
      V.logIdx=p.i;S.active.idx=p.i;V.sd={swaplive:true};tap({pickex:p.name});return true;}},
  "set.next":{desc:"Put the next set's weight and reps in the logger (how the last one felt)",params:{w:"weight, kg",r:"reps"},
    confirm:true,snap:"draft",
    /* The logger's two fields, as the person would type them. */
    run:function(p){if(!S.active)return false;V.draft=V.draft||{};V.draft.w=+p.w||0;V.draft.r=+p.r||0;
      var w=document.getElementById("in_w"),r=document.getElementById("in_r");
      if(w)w.value=String(toDisp(V.draft.w));if(r)r.value=String(V.draft.r);render();return true;}},
  "act.log":{desc:"Log a bout of cardio or sport done today or yesterday: minutes, and distance where given",
    params:{act:"an activity of the list",min:"minutes",km:"km or 0",date:"YYYY-MM-DD",kcal:"its estimate, or 0"},confirm:true,snap:"sessions",
    /* A finished session of one bout, as the workout screen records one. */
    run:function(p){if(!isActivity(p.act)||!(p.min>0)||!p.date||p.date>today())return false;
      var at=Date.parse(p.date+"T12:00:00");
      var s={id:"s"+Date.now().toString(36),date:p.date,started:at,lastSet:at+p.min*60000,activeMs:p.min*60000,dayId:null,dayName:exName(p.act),
        entries:[{name:p.act,exId:exIdOf(p.act),kind:"activity",muscle:actMuscle(p.act)||"Cardio",planned:{sets:1,lo:0,hi:0},rest:0,grp:null,
          sets:[{w:0,r:0,min:p.min,km:p.km||0,rpe:6,kcal:p.kcal||0}]}]};
      recordSession(s);S.sessions.sort(function(a,b){return a.date<b.date?1:a.date>b.date?-1:0;});saveDB();render();return true;}},
  "past.log":{desc:"Add a lift done without the app to the history: sets of reps at a weight, on a past date",
    params:{name:"exercise, from the library",date:"YYYY-MM-DD, today or before",sets:"how many",reps:"each",w:"kg, 0 for none"},confirm:true,snap:"sessions",
    run:function(p){if(!LIB.some(function(l){return l[0]===p.name;})||!p.date||p.date>today()||!(p.sets>0&&p.reps>0))return false;
      var label=t("Logged in chat"),s=(S.sessions||[]).filter(function(x){return x.date===p.date&&x.dayName===label&&!x.dayId;})[0],fresh=!s;
      var sets=[];for(var i=0;i<Math.min(20,p.sets);i++)sets.push({w:+p.w||0,r:+p.reps});
      var ent={name:p.name,exId:exIdOf(p.name),muscle:muscleOf(p.name),planned:{sets:sets.length,lo:p.reps,hi:p.reps},rest:0,grp:null,sets:sets};
      if(fresh){var at=Date.parse(p.date+"T12:00:00");
        s={id:"s"+Date.now().toString(36),date:p.date,started:at,lastSet:at,activeMs:sets.length*120000,dayId:null,dayName:label,entries:[ent]};
        recordSession(s);S.sessions.sort(function(a,b){return a.date<b.date?1:a.date>b.date?-1:0;});}
      else{s.entries.push(ent);saveSession(s);}
      saveDB();render();return true;}},
  "recovery.log":{desc:"Save last night's sleep (hours) and today's soreness (0–10)",params:{sleep:"hours or 0",sore:"0–10 or 0"},confirm:true,snap:"day",
    /* The recovery log's own two fields. */
    run:function(p){var r=dayRec(today());if(p.sleep>0)r.sleep=Math.min(16,+p.sleep);if(p.sore>0)r.sore=Math.min(10,Math.round(+p.sore));saveDB();render();return true;}},
  "set.log":{desc:"Log a set of the exercise on screen in the workout in progress",params:{w:"weight, kg",r:"reps"},
    confirm:true,snap:"live",
    /* The logger's fields, filled, and its Log set. */
    run:function(p){var w=document.getElementById("in_w"),r=document.getElementById("in_r");
      if(!S.active||!w||!r)return false;w.value=String(toDisp(p.w));r.value=String(p.r);tap({logset:"1"});return true;}},
  "food.log":{desc:"Log a food from the database to today's meal",params:{fid:"food id, from the database or My Foods",g:"grams",label:"portion as shown",meal:"meal id, or none for the time of day's"},
    confirm:true,snap:"day",
    /* The add-food sheet's servings screen: opened for the meal, then the food. */
    run:function(p){var f=(S.myFoods||[]).concat(FOODDB||[]).filter(function(x){return x.id===p.fid;})[0];if(!f)return false;
      if(p.meal){V.sheet="addfood";V.sd={meal:p.meal};}
      if(!LENT.logFood)return false;LENT.logFood(f,p.g,p.label);return true;}},
  "progress.weighIn":{desc:"Save today's weigh-in",params:{kg:"body weight, kg"},confirm:true,snap:"body",
    /* The weigh-in sheet's Save, with the weight in the field. */
    run:function(p){V.draft.bw=toDisp(p.kg);tap({saveweight:"1"});return true;}},
  "plan.calories":{desc:"Move the calorie target, carbs moving with it",params:{kcal:"change, kcal a day"},confirm:true,snap:"goals",
    run:function(p){tap({chatkcal:String(p.kcal)});return true;}},
  "plan.goal":{desc:"Change the goal, with its targets",params:{goal:"goal id"},confirm:true,snap:"goals",
    run:function(p){tap({chatgoal:p.goal});return true;}},
  /* Opens the assessment; nothing changes until it is used, so no confirmation. */
  "profile.reassess":{desc:"Open the assessment",params:{},confirm:false,run:function(){tap({setup:"1"});return true;}},
  "profile.open":{desc:"Open Profile",params:{},confirm:false,run:function(){tap({prof:"1"});return true;}},
  "profile.you":{desc:"Open Profile > You: age, height, weight, sex, activity and goal",params:{},confirm:false,run:function(){tap({sheet:"set_you"});return true;}},
  /* Cardio is logged as a bout in the workout, or started from Training: the coach opens
     the list of activities rather than logging time it was not given. */
  "cardio.open":{desc:"Open the list of activities to log or start one",params:{},confirm:false,run:function(){tap({actsheet:"1"});return true;}},
  /* A program for other kit: the assessment opened as it stands, its equipment answer
     tapped to the new kit, at its result. Nothing changes until Use this plan. */
  "plan.gear":{desc:"Show the plan rebuilt for other equipment, to review and use",params:{gear:"gym, home or bw"},confirm:false,
    run:function(p){if(!/^(gym|home|bw)$/.test(p.gear))return false;tap({setup:"1"});if(!V.asd)return false;
      tap({as:"gear|"+p.gear});V.asd.step=STEPS.indexOf("result");render();return true;}},
  /* The plan's item replaced in place, as the plan screen's remove-and-add would leave
     it, the new food at the amount offered; only while the item is still the one
     the swap was offered for. */
  "meal.swap":{desc:"Swap one food in a meal of the plan for another",params:{meal:"meal id",idx:"its place in the meal",from:"the food it was",fid:"the new food",g:"grams"},
    confirm:true,snap:"meals",
    run:function(p){var sl=ownSlot(p.meal),it=sl&&(sl.plan||[])[p.idx];
      var f=(S.myFoods||[]).concat(FOODDB||[]).filter(function(x){return x.id===p.fid;})[0];
      if(!it||!f||(p.from&&it.fid&&it.fid!==p.from))return false;
      sl.plan[p.idx]=itemOf({f:f,g:p.g});saveDB();render();return true;}},
  "app.go":{desc:"Open a place in the app",params:{to:"one of "+Object.keys(PLACE).join(", ")},confirm:false,
    run:function(p){var g=PLACE[p.to];if(!g)return false;g.forEach(function(D){tap(D);});return true;}},
  "water.add":{desc:"Add water to today",params:{ml:"millilitres"},confirm:true,snap:"day",
    /* Food's glass button, with the amount. */
    run:function(p){if(!(p.ml>0))return false;tap({water:String(Math.round(p.ml)),wdate:today()});return true;}},
  "steps.log":{desc:"Save today's steps",params:{n:"steps for the day"},confirm:true,snap:"day",
    /* The steps sheet's Save, with the number in the field. */
    run:function(p){if(!(p.n>=0))return false;V.draft.st=p.n;tap({savesteps:"1"});return true;}},
  "app.unit":{desc:"Show weights in kg or lb",params:{unit:"kg or lb"},confirm:false,snap:"prefs",
    run:function(p){if(!/^(kg|lb)$/.test(p.unit))return false;tap({setunit:p.unit});return true;}},
  "app.lang":{desc:"Set the app's language",params:{lang:"en or ar"},confirm:false,snap:"prefs",
    run:function(p){if(!/^(en|ar)$/.test(p.lang))return false;tap({setlang:p.lang});return true;}},
  "app.look":{desc:"Light or dark mode",params:{look:"light or dark"},confirm:false,snap:"prefs",
    run:function(p){if(!/^(light|dark)$/.test(p.look))return false;tap({lookmode:p.look});return true;}},
  "app.palette":{desc:"The app's colour theme",params:{palette:"red, blue or mono"},confirm:false,snap:"prefs",
    run:function(p){if(!/^(red|blue|mono)$/.test(p.palette))return false;tap({settheme:p.palette});return true;}},
  "workout.start":{desc:"Start a day of the program",params:{day:"day id"},confirm:false,
    run:function(p){if(S.active||!dayOf(p.day))return false;tap({startday:p.day});return true;}},
  /* The workout's own buttons: next, finish (its own confirmation), and the rest timer's. */
  "workout.next":{desc:"Go to the next exercise in the workout",params:{},confirm:false,run:function(){if(!S.active)return false;tap({nextex:"1"});return true;}},
  "workout.finish":{desc:"Finish the workout: the app asks to confirm",params:{},confirm:false,run:function(){if(!S.active)return false;tap({finish:"1"});return true;}},
  "rest.skip":{desc:"End the rest timer",params:{},confirm:false,run:function(){if(!S.active||!(V.restEnd||V.restPaused||V.restDone))return false;tap({rest:"skip"});return true;}},
  "rest.extend":{desc:"Thirty more seconds of rest",params:{},confirm:false,run:function(){if(!S.active)return false;tap({rest:V.restEnd&&!V.restDone?"30":"extend"});return true;}}};

/* The newest applied action's way back, for this session only. */
var LAST=null;
function perform(id,p,tag){
  var A=ACTIONS[id];if(!A)return false;
  var back=A.snap?SNAP[A.snap]():null;
  var ok=false;V.quietToast=!!A.confirm;
  try{ok=A.run(p||{});}catch(e){ok=false;}finally{V.quietToast=false;}
  if(!ok){if(back)back();return false;}
  if(back)LAST={tag:tag,back:back};
  return true;}
function canUndo(tag){return !!LAST&&LAST.tag===tag;}
function undo(tag){
  if(!canUndo(tag))return false;
  LAST.back();LAST=null;saveDB();render();return true;}

export {ACTIONS, canUndo, perform, PLACE, undo};
