/* Bunyan — a week kept light on purpose, and the check-in that follows it
   Owner, 2 Nov: "I set stress to high so it lowered the volume … but afterwards it shows
   [Some muscles get little training]. Isn't this a contradiction? It should remember the
   situation … and schedule a follow-up … to ask if he is still stressed, and amend the
   plan accordingly."

   High stress or under six hours of sleep, said in the assessment, builds the week to the
   bottom of the range (js/engine/build.js) because recovery is slower. While that holds,
   nothing in the app asks for more volume: the plan check's "little training", the
   coach's "under its minimum" and the weekly check-in's "under your range" stay quiet
   (more is still flagged when it is too much).

   And it is asked about again: the textbook reassesses an assessment's answers "monthly
   or quarterly" (js/knowledge/assessments.js, assessment protocol · reassess), so the
   coach asks after FOLLOW_DAYS, the sooner of the two, or whenever the person says it is
   better. profile.stressAt is the day it was said. */
import {num, today} from "../util.js";

var FOLLOW_DAYS=28;

function lightOnPurpose(p){p=p||{};return p.stress==="high"||(num(p.sleep)>0&&num(p.sleep)<6);}
function addDays(iso,n){var d=new Date(iso+"T00:00:00Z");d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
/* The day the coach asks again, or "". */
function followOn(p){p=p||{};return lightOnPurpose(p)&&p.stressAt?addDays(p.stressAt,FOLLOW_DAYS):"";}
function followDue(p){var f=followOn(p);return !!f&&today()>=f;}

export {FOLLOW_DAYS, followDue, followOn, lightOnPurpose};
