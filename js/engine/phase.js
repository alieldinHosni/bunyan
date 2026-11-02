/* Bunyan — the training phase each block runs
   Owner, 2 Nov ("all, in order"), item 4: "real phases instead of blocks that only
   change volume: each block moves you along the phase sequence by goal and level, with
   the book's reps, tempo and rest, and says why this month is different".

   The book's model (js/knowledge/phases.js): five phases, everyone starting at phase 1
   (stabilisation endurance), then phase 2 (strength endurance), then the phase the goal
   needs: 3 muscle growth, 4 maximal strength, 5 power. Each phase lasts 2–6 weeks: here
   one four-week block (js/coach/block.js), lighter week included. Phase 1 comes back
   between the harder ones, for recovery; fat loss runs 1 → 2 → 3 and repeats (GOAL_PLANS).

   The sequence for each goal is the book's where it gives one (fat loss); for the others,
   whose plans the source announces but does not print, it is ours, built from what each
   phase is for (PHASES[].who) and the same 1 → 2 → goal shape:
     lose, recomp, gain, general  1 → 2 → 3
     strength                     1 → 2 → 4   (3 in place of 4 for a beginner)
     power                        1 → 2 → 4 → 5 (phase 4 raises what phase 5 gives;
                                               1 → 2 for a beginner)
     endurance                    1 → 2
     mobility                     1
   A health condition or an age group (engine/conditions.js) keeps to phases 1 and 2:
   their rep ranges are the ones the condition's guidelines overlap.

   phaseOf(block, p) → {n, id, name, seq[], reps{min,max}, sets{min,max}, restMax, tempo, why}
   Pure apart from the profile it is handed. */
import {PHASES, PHASE_VARIABLES} from "../knowledge/phases.js";
import {goalOf} from "../data/goals.js";
import {rulesFor} from "./conditions.js";

function seqFor(p){
  p=p||{};
  var tr=goalOf(p.goal).train,novice=p.level==="new";
  if(rulesFor(p))return [1,2];
  if(tr==="mob")return [1];
  if(tr==="end")return [1,2];
  if(tr==="str")return novice?[1,2,3]:[1,2,4];
  if(tr==="pow")return novice?[1,2]:[1,2,4,5];
  return [1,2,3];}

function rng(r){return r&&typeof r==="object"&&r.min!=null?{min:+r.min,max:+r.max}:null;}
function tempoOf(v){var t=v.tempo;if(!t)return "";if(typeof t==="string")return t;return t.strengthExercise||"";}

/* The phase a block runs: the sequence in turn, from the first block on. */
function phaseOf(block,p){
  var seq=seqFor(p),n=seq[(Math.max(1,+block||1)-1)%seq.length];
  var P=PHASES.filter(function(x){return x.phase===n;})[0]||{},V=PHASE_VARIABLES.filter(function(x){return x.phase===n;})[0]||{},R=V.resistance||{};
  var reps=rng(R.reps)||(R.reps&&rng(R.reps.strength))||null;
  var rest=R.rest&&R.rest.s?+R.rest.s.max:(R.rest&&R.rest.betweenPairsS?+R.rest.betweenPairsS.max:0);
  return {n:n,id:P.id||"",name:P.name||"",seq:seq,reps:reps,sets:rng(R.sets),restMax:rest||0,tempo:tempoOf(R),
    progressBy:P.progressBy||"",purpose:P.purpose||""};}

/* A planned exercise as the phase has it: the phase's reps and its sets range. Phases 4
   and 5 put their heavy range (1–5) on the multi-joint lifts only; a single-joint lift
   there keeps the growth range (phase 3's), our choice: five-rep curls are not what the
   book's heavy phases are about. Rest no longer than the phase allows. */
function phaseDose(e,ph,compound){
  if(!ph||!ph.reps)return e;
  var r=ph.reps,s=ph.sets;
  if(ph.n>=4&&!compound){r={min:6,max:12};s={min:3,max:6};}
  e.lo=r.min;e.hi=r.max;
  if(s){e.sets=Math.max(s.min,Math.min(s.max,+e.sets||s.min));}
  /* Phase 2's short rest is the rest after a superset, which the plan does not build: not
     applied to a lift done on its own. */
  if(ph.restMax&&ph.n!==2&&+e.rest>ph.restMax)e.rest=ph.restMax;
  e.phase=ph.n;if(ph.tempo)e.tempo=ph.tempo;
  return e;}

export {phaseDose, phaseOf, seqFor};
