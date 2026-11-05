/* Bunyan — stats
   Every figure on the Progress tab, computed from what was logged and nothing else.
   No DOM, no rendering — progress.js draws what this returns.

   The figures themselves are pure: figures.js (training and body), body.js and
   intake.js work them out from what they are handed. This file hands them this
   profile's log and today's date, under the names the views already use, and keeps
   each answer until the data changes. */
import {bodyFatOf, daysBetween, measurementsOf, rateOf, weightChangeOf, weightTrendOf} from "./body.js";
import {bodyFatSeriesIn, byUse, cardioIn, consistencyMonthIn, e1rmSeriesIn, isoBack, liftHalf, liftHistoryIn, liftProgressIn, liftsIn, milestonesIn,
        monthRecapIn, muscleShareIn, newest, overviewIn, repsOnlyIn, repsSeriesIn, smoothWeightsIn, stepsIn, strengthIndexIn, volumeSeriesIn,
        weekRunIn, weeklyCardioIn, weeklySetsAvgIn, weeklyVolumeIn, weighInsIn} from "./figures.js";
import {nutritionOf, streaksOf, TOL} from "./intake.js";
import {dataRev, S, split} from "../state.js";
import {num, today} from "../util.js";
import {weekStartOf} from "./schedule.js";

/* What the figures are handed: the workouts, the weigh-ins and the profile's weight
   (body weight counts in a pull-up's load), as lifts.js takes them. */
function LOG(){return {sessions:S.sessions,body:S.body,weight:S.profile&&S.profile.weight,dbHand:!(S.prefs&&S.prefs.dbLoad==="total")};}

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
function isoAgo(n){return isoBack(today(),n);}

/* ---- training ---------------------------------------------------------------- */
var lifts=memo("lifts",function(){return liftsIn(LOG());});
function topLifts(){return byUse(lifts());}
function recentRecords(k){return newest(lifts(),k);}
var overview=memo("overview",function(n){return overviewIn(LOG(),n,today());});
var volumeSeries=memo("volumeSeries",function(n){return volumeSeriesIn(LOG(),n,today());});
var e1rmSeries=memo("e1rmSeries",function(name,n){return e1rmSeriesIn(LOG(),name,n,today());});
var muscleShare=memo("muscleShare",function(n){return muscleShareIn(LOG(),n,today());});
var liftProgress=memo("liftProgress",function(name,n){return liftProgressIn(LOG(),name,n,today());});
var strengthIndex=memo("strengthIndex",function(n,k){return strengthIndexIn(LOG(),n,k,today());});
var consistencyMonth=memo("consistencyMonth",function(){return consistencyMonthIn(LOG(),today());});
/* This week, as the user's week runs (Saturday unless changed). */
function weeklyVolume(){return weeklyVolumeIn(LOG(),weekStartOf(today()),S.plannedWeekly);}
function weeklyCardio(){return weeklyCardioIn(LOG(),weekStartOf(today()),today());}

/* ---- body ------------------------------------------------------------------- */
/* The weight trend against the goal, the change since last week, the tape
   measurements and body fat: body.js works them out from what it is handed (the
   rates, the regression and the Navy formula are documented there); these pass in
   this profile's weigh-ins and goal. */
function weightTrend(){return weightTrendOf(S.body,(S.profile||{}).goal);}
function weighIns(n){return weighInsIn(S.body,n,today());}
function weightChange(){return weightChangeOf(S.body);}
function measurements(){return measurementsOf(S.body);}
function bodyFat(){return bodyFatOf(S.profile,S.body);}
function bodyFatSeries(n){return bodyFatSeriesIn(S.body,n,today());}

/* ---- nutrition -------------------------------------------------------------- */
/* A food day counts once it is over, within 10% of a target is met, and a streak runs
   back from yesterday: intake.js has the rules, handed this profile's log, targets and
   today. Read from S.days directly: dayRec() would create an empty record for every
   day it was asked about. */
function nutrition(n){return nutritionOf(S.days,S.goals,n,today());}
function streaks(){return streaksOf(S.days,S.goals,today());}

/* ---- the second redesign (owner, 5 Nov) -------------------------------------- */
/* The plan's training days a week: the program's days with exercises, else the profile's. */
function plannedDays(){var sp=null;try{sp=split();}catch(e){sp=null;}
  var n=sp&&sp.days?sp.days.filter(function(d){return (d.ex||[]).length;}).length:0;
  return Math.min(7,n||num((S.profile||{}).days)||3);}
function weekRun(){return weekRunIn(LOG(),weekStartOf(today()),plannedDays());}
var smoothWeights=memo("smoothWeights",function(n){return smoothWeightsIn(S.body,n,today());});
var weeklySetsAvg=memo("weeklySetsAvg",function(n){return weeklySetsAvgIn(LOG(),n,today());});
var repsOnly=memo("repsOnly",function(name,n){return repsOnlyIn(LOG(),name,n,today());});
var repsSeries=memo("repsSeries",function(name,n){return repsSeriesIn(LOG(),name,n,today());});
var liftHistory=memo("liftHistory",function(name,k){return liftHistoryIn(LOG(),name,k);});
/* lean: which way the goal wants the scale, -1, +1 or 0. */
var milestones=memo("milestones",function(lean){return milestonesIn(LOG(),lean);});
var monthRecap=memo("monthRecap",function(mo){return monthRecapIn(LOG(),mo);});
var cardio=memo("cardio",function(n){return cardioIn(LOG(),n,today());});
function steps(n){return stepsIn(S.days,n,today());}

export {cardio, liftHistory, milestones, monthRecap, plannedDays, repsOnly, repsSeries, smoothWeights, steps, weekRun, weeklySetsAvg};
export {rateOf, weeklyCardio, weightTrend, weeklyVolume, bodyFat, bodyFatSeries, consistencyMonth, daysBetween, e1rmSeries, isoAgo, liftHalf, liftProgress,
        measurements, muscleShare, nutrition, overview, recentRecords, streaks, strengthIndex, TOL,
        topLifts, volumeSeries, weighIns, weightChange};
