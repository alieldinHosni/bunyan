/* Bunyan — the plan check, on screen
   The most important finding is a card on Home; the Plan check screen has all of
   them, what was checked, and the ones kept as they are (with a way to look again).
   Each finding: what does not fit, why, one fix, and "Keep it as it is". */
import {t} from "../../i18n/dict.js";
import {checkPlans} from "../../engine/plancheck.js";
import {S} from "../../state.js";
import {esc} from "../../util.js";
import {backArrow} from "../nav.js";

var AREA={food:"Nutrition",train:"Training",both:"Nutrition and training"};

function findingCard(f,cls){
  return '<div class="pcf sev'+f.sev+(cls?' '+cls:'')+'" data-k="pc:'+f.id+'">'
   +'<div class="pcf-k">'+esc(t(AREA[f.area]||"Plan check"))+'</div>'
   +'<h3>'+esc(f.title)+'</h3><p>'+esc(f.why)+'</p>'
   +'<div class="pcf-acts"><button class="btn sm" data-pcfix="'+f.id+'">'+esc(f.fix.label)+'</button>'
   +'<button class="btn d sm" data-pckeep="'+f.id+'">'+esc(t("Keep it as it is"))+'</button></div></div>';}

/* Home: one finding at most, so it never becomes a list of chores. */
function pcHome(){
  if(!S.onboarded)return "";
  var all=checkPlans();if(!all.length)return "";
  var f=all[0];
  return '<div class="pchome">'+findingCard(f,"card")
   +(all.length>1?'<button class="linkbtn pcmore" data-pcopen="1">'+esc(t("{n} more in Plan check").replace("{n}",all.length-1))+'</button>':'')+'</div>';}

/* A row that opens the screen, for My Program and Food → Targets. */
function pcRow(){
  var n=checkPlans().length;
  return '<button class="pcrow'+(n?' has':'')+'" data-pcopen="1"><span class="pcrow-d" aria-hidden="true"></span>'
   +'<span>'+esc(n?t(n===1?"Plan check: 1 thing to look at":"Plan check: {n} things to look at").replace("{n}",n):t("Plan check: everything fits"))+'</span>'
   +'<span class="ico ico-chev" aria-hidden="true"></span></button>';}

function vPlanCheck(){
  var all=checkPlans(),kept=Object.keys(S.pcDismiss||{});
  var h='<div class="dhead">'+backArrow()+'<h1 class="dhead-t">'+t("Plan check")+'</h1></div>'
   +'<p class="dsub">'+esc(t("Your targets, meal plan and training, side by side with your goal: where they pull different ways, why it matters, and a fix. Nothing changes unless you choose it."))+'</p>';
  if(!all.length)h+='<div class="pcok"><b>'+t("Everything fits together")+'</b><p>'
    +esc(t("Calories and protein suit your goal, the meal plan matches the targets, and every main muscle gets a fair share of training."))+'</p></div>';
  else h+=all.map(function(f){return findingCard(f);}).join("");
  if(kept.length)h+='<div class="tsec"><h2 class="tsec-h">'+t("Kept as they are")+'</h2></div>'
    +'<p class="dsub">'+esc(t("You chose to keep these. They come back here if the numbers behind them change."))+'</p>'
    +'<button class="btn g" data-pcreset="1">'+t("Check them all again")+'</button>';
  h+='<p class="as-note">'+esc(t("Ranges and targets here are starting points from the research, not rules. How you feel, recover and progress over a few weeks says more."))+'</p>';
  return h;}

export {pcHome, pcRow, vPlanCheck};
