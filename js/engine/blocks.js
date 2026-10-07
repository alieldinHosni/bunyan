/* Bunyan — training blocks, for this profile
   js/coach/block.js decides what a block is and how answers move sets; this hands it
   the program, the log and the soreness asked on the recovery sheet, and keeps where
   the current block started (S.block.start).

   When blocks apply: on unless turned off in Settings (S.prefs.noblocks, an "off" flag
   like the warm-up's, so everyone gets them without a migration), and not for a
   program that brings its own weeks (an imported plan with exercises kept for weeks
   1–4 or from week 9 is already periodised; a second scheme on top would fight it).

   Where a block starts: the first workout started with blocks on begins block 1 on the
   first day of that week. After that the blocks roll on by themselves, four weeks at a
   time. Ending a lighter week early starts the next block that day; an unplanned
   lighter week (started from the card) starts the next block the day after it ends. */
import {blockAt, LIGHT_RIR, planVolume, setShift, shiftDay} from "../coach/block.js";
import {isActivity} from "../data/activities.js";
import {muscleOf, secondaryOf} from "../data/exercises.js";
import {S, split} from "../state.js";
import {today} from "../util.js";
import {addDays, weekStartOf} from "./schedule.js";

var INFO={muscle:muscleOf,secondary:secondaryOf,activity:isActivity};

/* A program with its own weeks: any exercise kept for only some of them. */
function ownWeeks(sp){
  return !!(sp&&(sp.days||[]).some(function(d){return (d.ex||[]).some(function(e){return !!e.wk;});}));}
function blocksOn(){return !(S.prefs&&S.prefs.noblocks)&&!ownWeeks(split());}
/* Where a date falls in the blocks, or null: blocks off, none started yet, or the date
   is before the current one began (an unplanned lighter week runs then). */
function blockNow(date){
  if(!blocksOn()||!S.block||!S.block.start)return null;
  return blockAt(S.block.start,date||today());}
/* The planned lighter week, as inDeload() asks it. */
function plannedLight(date){var b=blockNow(date);return !!(b&&b.light);}
/* Called as a workout starts: begins block 1 if none has been — after an unplanned
   lighter week if one is running, so the block does not start inside it. */
function ensureBlock(){
  if(!blocksOn()||(S.block&&S.block.start))return;
  var dl=S.deload;
  S.block={start:dl&&dl.until&&today()<=dl.until?addDays(dl.until,1):weekStartOf(today())};}
/* An unplanned lighter week is running (started from the card or the coach). */
function offPlanLight(){var dl=S.deload;return !!(dl&&dl.until&&today()<=dl.until);}
/* The next block starts on a given day: after a lighter week ended early or taken
   off-schedule. */
function restartBlock(on){if(S.block||blocksOn())S.block={start:on||today()};}
function restartAfter(until){restartBlock(addDays(until,1));}

/* Sets per workout to add or take for each muscle, from this block's answers. */
function shiftNow(date){
  var b=blockNow(date);if(!b||b.light)return {shift:{},answers:0,why:{}};
  var pv=planVolume(split().days,INFO);
  return setShift(S.sessions,INFO,{start:S.block.start,today:date||today(),days:S.days,planned:pv.planned,freq:pv.freq});}

/* A day's exercises as today's block has them: sets moved by the answers, effort set
   by the week. Lighter-week sets are left to the caller, which already thins them
   (deloadSets). Activities and timed holds keep the plan's own prescription. */
function blockDay(exs,date){
  var b=blockNow(date);if(!b)return exs;
  var out=b.light?exs.map(function(e){var c={};Object.keys(e).forEach(function(k){c[k]=e[k];});return c;})
    :shiftDay(exs,shiftNow(date).shift,INFO);
  out.forEach(function(e){if(!isActivity(e.name)&&!e.timed)e.rir=b.light?LIGHT_RIR:b.rir;});
  return out;}

export {blockDay, blockNow, blocksOn, ensureBlock, offPlanLight, ownWeeks, plannedLight, restartAfter, restartBlock, shiftNow, INFO as BLOCK_INFO};
