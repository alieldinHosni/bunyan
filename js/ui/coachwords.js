/* Bunyan — the coach's insights, in words
   What each insight from js/coach/ says and offers: a title, the reason in the person's
   own numbers, the action's label and what it does. Shared by Coach AI's cards and the
   coach chat, and kept out of both views. */
import {t, tm} from "../i18n/dict.js";
import {exName} from "../i18n/exnames.js";
import {S} from "../state.js";
import {fmtW} from "../units.js";

var LIFT={squat:"squat",bench:"bench press",deadlift:"deadlift",press:"overhead press",row:"row"};
function fill(s,o){Object.keys(o).forEach(function(k){s=s.split("{"+k+"}").join(o[k]);});return s;}
function muscleList(ms,key){
  return ms.map(function(x){return tm(x.m)+" "+x[key];}).join(S.prefs.lang==="ar"?"، ":", ");}
/* What an insight says and what it offers: [title, why, action label, action]. */
function words(c){
  var ex=c.name?exName(c.name):"";
  if(c.kind==="fatigue")return [fill(t("{ex} is feeling harder"),{ex:ex}),
    fill(t("The same {w} × {r} went from RPE {a} to {b} over your last {n} sessions. The weight has not changed, so this is fatigue building up, not lost strength. A lighter week usually clears it."),
      {w:fmtW(c.w),r:c.r,a:c.from,b:c.to,n:c.points}),t("Take a lighter week"),"deload"];
  if(c.kind==="falling")return [fill(t("{ex} is going backwards"),{ex:ex}),
    fill(t("Your best estimated max on it has dropped {n} weeks running, from {a} to {b}. That is usually fatigue or too little recovery, not lost strength. A lighter week usually brings it back."),
      {n:c.weeks,a:fmtW(c.peak),b:fmtW(c.latest)}),t("Take a lighter week"),"deload"];
  if(c.kind==="stall")return [fill(t("{ex} has stalled"),{ex:ex}),
    fill(t("No new best on it for {n} weeks, around {b}. A lighter week, or a few weeks in a different rep range, usually gets it moving again."),{n:c.weeks,b:fmtW(c.best)}),
    t("Take a lighter week"),"deload"];
  if(c.kind==="deload")return [fill(t("{ex}: three sessions short of the range"),{ex:ex}),
    fill(t("Three sessions running you stayed under {lo} reps at {w}. Your next session on it suggests about 10% less for a week, same reps, then building back up."),{lo:c.lo,w:fmtW(c.w)}),
    t("Got it"),"ok"];
  if(c.kind==="over")return [t("More volume than most recover from"),
    fill(t("Hard sets a week over the last {n} weeks: {list}. That is above what most people recover from. It is a rule of thumb, not your limit, but if you feel run down, this is the first place to trim."),
      {n:c.weeks,list:muscleList(c.muscles,"avg")}),t("Balance the volume"),"balance"];
  if(c.kind==="under")return [t("Less training than your program has"),
    fill(t("Hard sets a week logged over the last {n} weeks: {list}. That is under where growth usually starts. Your program has more; skipped sets or exercises are the usual reason."),
      {n:c.weeks,list:muscleList(c.muscles,"avg")}),t("Open my program"),"program"];
  if(c.kind==="weak"){var a=t(LIFT[c.a]),b=t(LIFT[c.b]);
    return [fill(t(c.side==="low"?"Your {a} is behind your {b}":"Your {a} is ahead of your {b}"),{a:a,b:b}),
      fill(t("Your {a} is about {p}% of your {b}; most lifters' sit between {lo}% and {hi}%. Leverages differ, so this may simply be how you are built. If it matters to you, more {a} practice closes the gap."),
        {a:a,b:b,p:Math.round(c.ratio*100),lo:Math.round(c.lo*100),hi:Math.round(c.hi*100)}),t("Got it"),"ok"];}
  return null;}
export {words};
