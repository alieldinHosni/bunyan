/* Bunyan — a missed day, for this profile
   js/coach/missed.js decides where a missed day's work can go; this hands it this week
   (with a day either side, for the neighbours): what was trained on each date, what is
   planned on each date still ahead (a day moved by hand included, and any lifts already
   carried onto it), how long each takes, and the session length. Only a program on
   weekdays loses a day by missing it, so a rotating one gets nothing.

   Nothing changes by itself: Training's card offers it (handlers/train.js), with Undo.
   S.dayAdd {date: [lift]} holds lifts carried onto a date; startDay adds them to that
   date's workout. S.missedDone {date: 1} marks a missed day dealt with (moved, folded or
   let go), so it is offered once. */
import {rebalanceWeek} from "../coach/missed.js";
import {isCompound, muscleOf, secondaryOf} from "../data/exercises.js";
import {isActivity} from "../data/activities.js";
import {S, split} from "../state.js";
import {num, today} from "../util.js";
import {addDaysISO, estMinutes, planOn} from "./dayplan.js";
import {doseFor} from "./plan.js";
import {pinnedOn, weekDates} from "./schedule.js";

var INFO={muscle:muscleOf,secondary:secondaryOf,activity:isActivity,compound:isCompound};

function loadOf(ex){
  var m={};
  (ex||[]).forEach(function(e){
    if(!e||isActivity(e.name))return;
    /* A logged entry's working sets, or a planned one's set count. */
    var s=Array.isArray(e.sets)?e.sets.filter(function(x){return x&&!x.wu;}).length:Math.max(1,num(e.sets)||3),mu=muscleOf(e.name);
    if(!s)return;
    m[mu]=(m[mu]||0)+s;
    (secondaryOf(e.name)||[]).forEach(function(x){if(x!==mu)m[x]=(m[x]||0)+s/2;});});
  return m;}

/* The lifts carried onto a date for a day of the program. */
function addsOn(iso,dayId){return ((S.dayAdd||{})[iso]||[]).filter(function(a){return !dayId||!a.dayId||a.dayId===dayId;});}

function missedNow(){
  var sp=split(),now=today(),p=S.profile||{};
  if(!sp||sp.schedule!=="week")return null;
  var wk=weekDates(now),dates=[addDaysISO(wk[0],-1)].concat(wk,[addDaysISO(wk[6],1)]);
  var byId={};sp.days.forEach(function(d){byId[d.id]=d;});
  var days=dates.map(function(iso){
    var ss=(S.sessions||[]).filter(function(s){return s.date===iso&&(s.entries||[]).some(function(e){return !isActivity(e.name);});});
    if(ss.length){var ex=[];ss.forEach(function(s){ex=ex.concat(s.entries||[]);});
      return {date:iso,dayId:ss[0].dayId||"done",name:ss[0].dayName||"",ex:ex,done:true,load:loadOf(ex),mins:0};}
    var d=null;
    if(iso<now)d=pinnedOn(sp,iso);
    else{var pl=planOn(sp,iso);d=pl.rest?null:pl.day;}
    if(!d||!d.ex.length)return {date:iso,dayId:null,name:"",ex:[],done:false,load:{},mins:0};
    var all=d.ex.concat(iso>=now?addsOn(iso,d.id):[]);
    return {date:iso,dayId:d.id,name:d.name,ex:d.ex,done:false,load:loadOf(all),mins:estMinutes({ex:all})};});
  return rebalanceWeek({today:now,days:days,handled:S.missedDone||{},budget:Math.max(25,(num(p.mins)||60)-8),
    addMin:function(n,sets){var e=doseFor(n,p);return sets*((e.rest||90)+35)/60;},info:INFO});}

export {addsOn, missedNow};
