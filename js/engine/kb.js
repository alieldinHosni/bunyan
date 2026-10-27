/* Bunyan — what the knowledge files say, for the coach's answers
   The coach answers a question about how training works from js/knowledge/ and nowhere
   else: this file looks the numbers up and hands them over with the entry they came
   from (src), so every technical answer can say where it stands. What is not in the
   knowledge files is not here, and the answer says so rather than filling the gap.

   The person's own side of the answer (their program, their log) is worked out by the
   caller with the engines the rest of the app uses; this file is only the reading.

   Which row of the prescription a goal reads is Bunyan's choice, said in the answer:
   building muscle (and losing fat while keeping it) reads hypertrophy, getting stronger
   reads maximal strength. */
import {BY_ADAPTATION, ONE_RM, SYSTEMS, VARIABLES} from "../knowledge/acute-variables.js";
import {PROTEIN, WEIGHT_MANAGEMENT} from "../knowledge/nutrition-principles.js";
import {RULES} from "../knowledge/scope.js";

function adaptationFor(goal){return goal==="strength"?"maximal_strength":"hypertrophy";}
function rowFor(goal){
  var id=adaptationFor(goal);
  return BY_ADAPTATION.filter(function(r){return r.adaptation===id;})[0]||null;}
function cite(file,src){return file+" "+src;}

/* Reps, sets and rest for the goal: {adaptation, reps, sets, rest, src}. */
function prescription(goal){
  var r=rowFor(goal);if(!r)return null;
  return {adaptation:r.adaptation,reps:r.reps,sets:r.sets,rest:r.restS,note:r.note||"",src:cite("acute-variables",r.src)};}
/* Sessions a week for a training status: the app's level read as the book's status. */
var STATUS={new:"beginner",some:"intermediate",experienced:"intermediate",advanced:"advanced"};
function frequency(level){
  var st=STATUS[level]||"beginner",f=VARIABLES.frequency;
  var row=f.byStatus.filter(function(x){return x.status===st;})[0];
  return row?{status:st,per:row.sessionsPerWeek,rule:f.rule,src:cite("acute-variables",VARIABLES.src)}:null;}
function duration(){var d=VARIABLES.duration;return {min:d.typicalMin.min,max:d.typicalMin.max,src:cite("acute-variables",VARIABLES.src)};}
function tempo(){return {use:VARIABLES.tempo.use,src:cite("acute-variables",VARIABLES.src)};}
function warmup(){var w=SYSTEMS.filter(function(s){return s.id==="warm_up_set";})[0];
  return w?{sets:[1,2],reps:w.reps,src:cite("acute-variables",w.src)}:null;}
function volume(){return {multipleBeatsSingle:true,src:cite("acute-variables",VARIABLES.src)};}
function oneRM(){return {repsRange:ONE_RM.repsRange,src:cite("acute-variables",ONE_RM.src)};}
/* Protein a day for people who train to build and keep muscle. */
function protein(){
  var row=(PROTEIN.dailyTargets||[]).filter(function(x){return /build and maintain muscle/.test(x.who||"");})[0];
  return row&&row.gPerKg?{min:row.gPerKg.min,max:row.gPerKg.max,src:cite("nutrition-principles",PROTEIN.src)}:null;}
/* Hours of sleep a night for adults. */
function sleep(){var g=WEIGHT_MANAGEMENT.sleep&&WEIGHT_MANAGEMENT.sleep.target;
  return g?{min:g.minHours,max:g.maxHours,src:cite("nutrition-principles",WEIGHT_MANAGEMENT.src||"")}:null;}
/* A hard limit from scope.js, by id: it overrides every other answer. */
function scopeRule(id){var r=RULES.filter(function(x){return x.id===id;})[0];return r?{id:r.id,src:cite("scope",r.src)}:null;}

export {adaptationFor, duration, frequency, oneRM, prescription, protein, scopeRule, sleep, tempo, volume, warmup};
