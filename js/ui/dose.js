/* Bunyan — how a planned dose reads
   "3 × 6–8", "3 × 40–60 s", "3 × max", "3 × 10–12 / side". One place, so the import
   review, the day screen and the logger cannot write the same prescription three
   ways. */
import {t} from "../i18n/dict.js";
import {ex_isTimed} from "./view.js";

/* Held for seconds: what the plan says, or else the exercise itself. A plank is held;
   a carry is loaded and walked, as the workout screen has it. A template's plank has
   no flag of its own, and read "3 × 40" on the day screen without this. */
var LOADED=/Carry|Farmer|Yoke/i;
function heldFor(e){return e.timed!=null?!!e.timed:!!e.name&&ex_isTimed(e)&&!LOADED.test(e.name);}

function doseText(e){
  var sets=e.sets||1;
  if(e.amrap)return sets+" × "+t("max");
  var r=e.lo+(e.hi&&e.hi!==e.lo?"–"+e.hi:"");
  var held=heldFor(e);
  return sets+" × "+r+(held?" "+t("s"):"")+(e.side?" "+t("/ side"):"")
    /* How hard: reps left in reserve when the set stops, from a generated plan. */
    +(e.rir!=null&&!held?" · "+t("{n} in reserve").replace("{n}",e.rir):"");}

/* The weeks of a program an exercise belongs to: "Weeks 5–12", "From week 9". */
function weeksText(wk){
  if(!wk)return "";
  return wk[1]>=99?t("From week {n}").replace("{n}",wk[0])
    :t("Weeks {a}–{b}").replace("{a}",wk[0]).replace("{b}",wk[1]);}

export {doseText, weeksText};
