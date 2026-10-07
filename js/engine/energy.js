/* Bunyan — maintenance, from the log
   What the log says the body uses a day (js/coach/energy.js does the measuring), and
   the figure the targets are built on. The formula's guess is the starting point; once
   the person taps to build their targets on what the log measured, that figure is kept
   in S.energy and used everywhere maintenance is (formulas.js tdee()), until a later
   measurement differs and they choose to update it. */
import {learnMaintenance} from "../coach/energy.js";
import {maintenanceInUseOf} from "./body.js";
import {tdeeFormula} from "./formulas.js";
import {intakeDaysOf} from "./intake.js";
import {dataRev, S} from "../state.js";
import {num, today} from "../util.js";

/* Each day's logged intake, from every meal's items (intake.js). */
function intakeDays(){return intakeDaysOf(S.days);}

var MEMO={k:null,v:null};
/* What the log measures now, against the formula. Kept until the data changes. */
function learnedNow(){
  var p=S.profile||{},f=tdeeFormula();
  var k=[dataRev(),today(),(S.body||[]).length,Object.keys(S.days||{}).length,f,p.weight,p.age,p.height,p.activity].join("|");
  if(MEMO.k===k&&MEMO.s===S)return MEMO.v;
  var v;
  try{v=learnMaintenance(intakeDays(),(S.body||[]).map(function(b){return {date:b.date,weight:num(b.weight)};}),{today:today(),formula:f});}
  catch(e){v={kind:"none",why:"error"};}
  MEMO={k:k,s:S,v:v};
  return v;}

/* The maintenance in use: the one the person built their targets on, else the formula. */
function maintenanceInUse(){return maintenanceInUseOf(S.profile,S.body,S.energy);}

/* Worth saying: the log is sure enough (most of the answer is its own) and it differs
   from what the targets are built on by at least 150 kcal or 6%. */
function learnedDiffers(){
  var L=learnedNow();
  if(L.kind!=="ok"||L.share<0.5)return null;
  var use=maintenanceInUse();
  if(Math.abs(L.kcal-use.kcal)<Math.max(150,use.kcal*0.06))return null;
  return {learned:L,use:use};}

export {intakeDays, learnedDiffers, learnedNow, maintenanceInUse};
