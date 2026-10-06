/* Bunyan — how a planned dose reads
   "3 × 6–8", "3 × 40–60 s", "3 × max", "3 × 10–12 / side". One place, so the import
   review, the day screen and the logger cannot write the same prescription three
   ways. */
import {t} from "../i18n/dict.js";

function doseText(e){
  var sets=e.sets||1;
  if(e.amrap)return sets+" × "+t("max");
  var r=e.lo+(e.hi&&e.hi!==e.lo?"–"+e.hi:"");
  return sets+" × "+r+(e.timed?" "+t("s"):"")+(e.side?" "+t("/ side"):"")
    /* How hard: reps left in reserve when the set stops, from a generated plan. */
    +(e.rir!=null&&!e.timed?" · "+t("{n} in reserve").replace("{n}",e.rir):"");}

/* The weeks of a program an exercise belongs to: "Weeks 5–12", "From week 9". */
function weeksText(wk){
  if(!wk)return "";
  return wk[1]>=99?t("From week {n}").replace("{n}",wk[0])
    :t("Weeks {a}–{b}").replace("{a}",wk[0]).replace("{b}",wk[1]);}

export {doseText, weeksText};
