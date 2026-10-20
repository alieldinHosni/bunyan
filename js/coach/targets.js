/* Bunyan — coach: the week's targets, from the engine
   The one thin wrapper between the coach and the app's body maths. reconcile.js takes
   BMR and each day's targets as arguments, so it stays pure and testable; this file
   gets those numbers from js/engine/body.js (Mifflin-St Jeor × activity, the goal's
   deficit or surplus, protein by the goal's g/kg), so there is one implementation of
   the calculation, not two that drift apart.

   Body weight comes from the profile and the weigh-ins, never from a default. bmrOf()
   falls back to a fixed weight when there is none (logged in PROGRESS.md for the app
   session), so nothing here calls it without a real weight: a profile with no weight,
   or without age, height or sex, gets "no_weight" / "no_profile", never a number.

   Each day's target uses the weigh-ins up to that day, so a past day is judged against
   the target it had at the time, not today's. */
import {bmrOf, lastWeightOf, macroTargetsOf} from "../engine/body.js";
import {reconcileNutrition} from "./reconcile.js";
import {dayNo, num} from "./util.js";

function upTo(body,date){
  var d=dayNo(date);
  return (Array.isArray(body)?body:[]).filter(function(b){return b&&b.date&&dayNo(b.date)<=d;});}

/* Why the numbers cannot be had, or "" when they can. */
function missing(profile,body){
  var p=profile||{};
  if(!(num(p.age)>0&&num(p.height)>0&&(p.sex==="m"||p.sex==="f")))return "no_profile";
  if(!(lastWeightOf(body)>0||num(p.weight)>0))return "no_weight";
  return "";}

/* BMR and the day's targets, or {kind:"no_profile"|"no_weight"}. */
function dayTargetsFor(profile,body,energy,date){
  var b=upTo(body,date),why=missing(profile,b);
  if(why)return {kind:why,bmr:0,target:null};
  var m=macroTargetsOf(profile,b,energy);
  return {kind:"ok",bmr:bmrOf(profile,b),target:{kcal:num(m.kcal),p:num(m.p),c:num(m.c),f:num(m.f)}};}

/* The week reconciled with the engine's numbers.
   eaten: {date: kcal} for the days logged (a day absent is not logged).
   week:  the week's dates; from: the first date that can still change.
   The BMR floor is today's (the latest weigh-in). Days with no target at the time
   (no weight yet then) are left out and listed in noTarget. */
function reconcileWeekFor(input){
  input=input||{};
  var latest=missing(input.profile,input.body);
  if(latest){var r=reconcileNutrition({});r.why=latest;r.noTarget=[];return r;}
  var bmr=bmrOf(input.profile,input.body),eaten=input.eaten||{},noTarget=[],days=[];
  (Array.isArray(input.week)?input.week:[]).forEach(function(d){
    var T=dayTargetsFor(input.profile,input.body,input.energy,d);
    if(T.kind!=="ok"){noTarget.push(d);return;}
    days.push({date:d,target:T.target,eaten:eaten[d]==null?null:{kcal:num(eaten[d])}});});
  var out=reconcileNutrition({days:days,bmr:bmr,from:input.from});
  out.noTarget=noTarget;
  return out;}

export {dayTargetsFor, reconcileWeekFor};
