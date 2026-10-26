/* Bunyan — the body, from what it is given
   Resting and daily energy, the calorie and protein targets, the weight trend, body
   fat and the tape measurements. Nothing here reads the app's state: each function is
   handed the profile, the weigh-ins or the stored maintenance it works from, so the
   same call gives the same answer on a screen, in the coach and in the engine tests
   (tests/engine.mjs). formulas.js and stats.js keep their old names as one-line
   wrappers that pass S in. tests/architecture.mjs holds this module to that: nothing
   it imports, directly or through another module, may be state.js.

   The arguments, wherever they appear:
     profile  {age, height (cm), weight (kg), sex "m"|"f", activity, goal}
     body     the weigh-ins and measurements, oldest first: [{date, weight, waist, …}]
     energy   the maintenance the person chose to build their targets on, or null:
              {kcal, at} (js/engine/energy.js) */
import {goalOf} from "../data/goals.js";
import {num, r1} from "../util.js";

function daysBetween(a,b){
  return Math.round((new Date(b+"T00:00:00")-new Date(a+"T00:00:00"))/864e5);}

/* ---- weigh-ins -------------------------------------------------------------- */
/* The latest logged weight, or 0 when none has been. */
function lastWeightOf(body){
  body=body||[];
  for(var i=body.length-1;i>=0;i--)if(body[i].weight)return body[i].weight;
  return 0;}
/* The mean of the last seven entries' weights, once at least three of them have one. */
function avg7Of(body){
  var v=(body||[]).slice(-7).map(function(b){return b.weight;}).filter(function(x){return x>0;});
  return v.length>=3?r1(v.reduce(function(a,b){return a+b;},0)/v.length):0;}
function weighInsOf(body){return (body||[]).filter(function(b){return num(b.weight)>0;});}

/* ---- energy ----------------------------------------------------------------- */
/* The body weight the energy maths works from: the latest weigh-in, else the profile's.
   0 when there is neither. There is no default: any number put here would be someone
   else's body, and every target built on it would be wrong without saying so. */
function weightOf(profile,body){return lastWeightOf(body)||num((profile||{}).weight);}
/* What the energy maths still needs, in the coach's words (js/coach/targets.js):
   "no_profile" without an age or a height, "no_weight" without a weight, "" when
   there is everything. The screens use it to ask for what is missing. */
function missingOf(profile,body){
  var p=profile||{};
  if(!(num(p.age)>0&&num(p.height)>0))return "no_profile";
  if(!(weightOf(p,body)>0))return "no_weight";
  return "";}
/* Resting energy, Mifflin–St Jeor, at the latest weigh-in, else the profile's weight.
   null when missingOf says something is missing: never a figure from a guess. */
function bmrOf(profile,body){
  var p=profile||{};
  if(missingOf(p,body))return null;
  return Math.round(10*weightOf(p,body)+6.25*num(p.height)-5*num(p.age)+(p.sex==="f"?-161:5));}
/* Maintenance by formula: resting energy × the activity factor. null without BMR. */
function tdeeFormulaOf(profile,body){
  var b=bmrOf(profile,body);
  return b==null?null:Math.round(b*num((profile||{}).activity,1.4));}
/* Maintenance in use: what the log measured, once the person chose to build their
   targets on it; otherwise the formula (null without BMR). */
function tdeeOf(profile,body,energy){
  return energy&&num(energy.kcal)>0?Math.round(num(energy.kcal)):tdeeFormulaOf(profile,body);}
/* The same, saying where it came from: "learned", "formula", or "none" with kcal null. */
function maintenanceInUseOf(profile,body,energy){
  if(energy&&num(energy.kcal)>0)return {kcal:num(energy.kcal),source:"learned",at:energy.at||""};
  var f=tdeeFormulaOf(profile,body);
  return f==null?{kcal:null,source:"none"}:{kcal:f,source:"formula"};}
/* The lowest daily target anything automated may set: resting energy (BMR). Below it
   nothing in the app goes: not the targets, not the coach's "eat less" step, not the
   week's reconciliation (js/coach/reconcile.js holds each day at BMR). For a small body
   whose BMR is under 1,200 kcal (women) or 1,500 (men), that minimum holds instead.
   null without BMR. */
function kcalFloorOf(profile,body){
  var b=bmrOf(profile,body);
  return b==null?null:Math.max((profile||{}).sex==="f"?1200:1500,b);}
/* The goal's change against maintenance, kcal a day: the book's fixed figure where the
   goal has one (fat loss 500 under, muscle 350 over: js/data/goals.js), otherwise the
   goal's share of maintenance, capped. */
function changeOf(goal,td){
  var G=goalOf(goal);
  if(G.fixed!=null)return G.fixed;
  var d=Math.round(td*G.kcal);
  return G.cap?Math.max(-G.cap,Math.min(G.cap,d)):d;}
/* Maintenance plus the goal's change, never under the floor. null without BMR: with no
   weight there is no honest target to give. */
function targetKcalOf(profile,body,energy){
  var p=profile||{},fl=kcalFloorOf(p,body);
  if(fl==null)return null;
  var td=tdeeOf(p,body,energy);
  return Math.max(fl,td+changeOf(p.goal,td));}
/* Protein, g/day, from the goal's g/kg (js/data/goals.js). Above a BMI of 30 it is
   scaled from the weight at a BMI of 27, since protein needs follow lean mass, not
   total mass. */
function proteinFor(profile,kg){
  var h=num((profile||{}).height)/100;kg=num(kg);
  if(h>1&&kg/(h*h)>30)kg=27*h*h;
  return Math.round(kg*goalOf((profile||{}).goal).protein);}
/* The whole day's targets: energy, then protein, then fat as the goal's share of the
   energy, carbs with what is left (never under 50 g). Water is 35 ml per kg, rounded
   to a glass. Steps only where the goal leans on them. null when targetKcalOf is:
   the caller asks for what missingOf names. */
function macroTargetsOf(profile,body,energy){
  var pr=profile||{},G=goalOf(pr.goal),w=weightOf(pr,body),tk=targetKcalOf(pr,body,energy);
  if(tk==null)return null;
  var kc=Math.round(tk/10)*10,p=proteinFor(pr,w),f=Math.round(kc*(G.fat||0.28)/9);
  var out={kcal:kc,p:p,f:f,c:Math.max(50,Math.round((kc-p*4-f*9)/4))};
  out.water=Math.max(2000,Math.round(w*35/250)*250);
  if(G.steps)out.steps=G.steps;
  return out;}
/* Calories burned by a resistance session, the standard MET equation at 5.0 METs:
     kcal = MET × 3.5 × kg / 200 × active minutes
   0 without a body weight: the figure scales with it, so there is no honest default. */
function sessionKcalOf(kg,mins){
  if(!kg||!mins)return 0;
  return Math.round(5.0*3.5*kg/200*mins);}

/* ---- the weight trend ------------------------------------------------------- */
/* What "on plan" means per goal, as a share of body weight per week. Losing fat runs
   a deficit, so a slow loss is on plan; recomposition runs a small deficit, so a
   steady scale is; getting stronger runs a small surplus, so a slow gain is. kind says
   which way the goal leans. */
var RATE={lose:["lose",-0.01,-0.005],recomp:["lose",-0.005,0.001],
  gain:["gain",0.0025,0.005],strength:["gain",-0.001,0.0035]};
function rateOf(goal){return RATE[goal]||["hold",-0.0025,0.0025];}
/* The least-squares slope through the last four weeks of weigh-ins, per week, judged
   against the goal's band. Needs four weigh-ins spread over at least two weeks. */
function weightTrendOf(body,goal){
  var list=weighInsOf(body);if(list.length<4)return null;
  var last=list[list.length-1].date;
  var pts=list.filter(function(b){return daysBetween(b.date,last)<=28;});
  if(pts.length<4||daysBetween(pts[0].date,last)<14)return null;
  var x0=pts[0].date,n=pts.length,sx=0,sy=0,sxx=0,sxy=0;
  pts.forEach(function(b){var x=daysBetween(x0,b.date),y=num(b.weight);sx+=x;sy+=y;sxx+=x*x;sxy+=x*y;});
  var den=n*sxx-sx*sx;if(!den)return null;
  var perWk=(n*sxy-sx*sy)/den*7,mean=sy/n;
  var rt=rateOf(goal),kind=rt[0];
  var lo=rt[1]*mean,hi=rt[2]*mean,status="ok";
  if(kind==="lose"){if(perWk>hi)status=perWk>0.05?"wrong":"slow";else if(perWk<lo)status="fast";}
  else if(kind==="gain"){if(perWk<lo)status=perWk<-0.05?"wrong":"slow";else if(perWk>hi)status="fast";}
  else status=perWk<lo?"down":perWk>hi?"up":"ok";
  return {perWk:Math.round(perWk*100)/100,lo:Math.round(lo*100)/100,hi:Math.round(hi*100)/100,
    goal:goal,kind:kind,status:status,weeks:Math.round(daysBetween(pts[0].date,last)/7)};}
/* The latest weigh-in against the most recent one at least a week older, which is
   what "vs last week" means. Without one that old, against the earliest there is,
   and the view says since when. */
function weightChangeOf(body){
  var list=weighInsOf(body);
  if(!list.length)return null;
  var cur=list[list.length-1],ref=null;
  for(var i=list.length-2;i>=0;i--)
    if(daysBetween(list[i].date,cur.date)>=7){ref=list[i];break;}
  if(!ref&&list.length>1)ref=list[0];
  return {cur:cur,ref:ref,d:ref?r1(cur.weight-ref.weight):null,
    days:ref?daysBetween(ref.date,cur.date):null};}

/* ---- measurements and body fat ---------------------------------------------- */
/* good: which way is progress for this measure. +1 up, -1 down, 0 neither. Only
   progress is coloured; the other way is plain text, not red. */
var MEASURES=[["chest","Chest",1],["waist","Waist",-1],["hips","Hips",-1],["arms","Arms",1],
  ["thighs","Thighs",1],["calves","Calves",1],["neck","Neck",0]];
function latestIn(body,k){
  body=body||[];
  for(var i=body.length-1;i>=0;i--){var v=num(body[i][k]);if(v>0)return {v:v,d:body[i].date};}
  return null;}
/* Each measure's latest value and its change from the one before. */
function measurementsOf(body){
  body=body||[];
  return MEASURES.map(function(m){
    var cur=null,prev=null;
    for(var i=body.length-1;i>=0;i--){
      var v=num(body[i][m[0]]);
      if(!(v>0))continue;
      if(!cur)cur={v:v,d:body[i].date};else{prev={v:v,d:body[i].date};break;}}
    return cur?{k:m[0],name:m[1],good:m[2],v:cur.v,d:cur.d,
      delta:prev?r1(cur.v-prev.v):null}:null;}).filter(Boolean);}
/* Body fat: a figure the user entered (a scale, a DEXA scan) where there is one at
   least as recent as the tape measurements; otherwise the US Navy circumference
   method, which needs height, waist and neck, and hips as well for women:
     men    495 / (1.0324 − 0.19077·log10(waist − neck) + 0.15456·log10(height)) − 450
     women  495 / (1.29579 − 0.35004·log10(waist + hip − neck) + 0.22100·log10(height)) − 450
   All in centimetres. It is an estimate, typically within 3–4 points of a lab
   measurement, and the screen says which of the two it is showing. */
function bodyFatOf(profile,body){
  var p=profile||{},h=num(p.height),fem=p.sex==="f";
  var waist=latestIn(body,"waist"),neck=latestIn(body,"neck"),hips=latestIn(body,"hips"),own=latestIn(body,"bf");
  var need=[];
  if(!h)need.push("height");
  if(!waist)need.push("waist");
  if(!neck)need.push("neck");
  if(fem&&!hips)need.push("hips");
  var navy=null;
  if(!need.length){
    var x=fem?waist.v+hips.v-neck.v:waist.v-neck.v;
    if(x>0){
      var L=Math.log10||function(v){return Math.log(v)/Math.LN10;};
      navy=fem?495/(1.29579-0.35004*L(x)+0.22100*L(h))-450
              :495/(1.0324-0.19077*L(x)+0.15456*L(h))-450;
      if(!(navy>=2&&navy<=60))navy=null;}}
  var bf=null,src=null,date=null;
  if(own&&(!navy||own.d>=waist.d)){bf=own.v;src="entered";date=own.d;}
  else if(navy){bf=navy;src="navy";date=waist.d;}
  var wt=lastWeightOf(body);
  return {bf:bf==null?null:r1(bf),src:src,date:date,need:own?[]:need,
    lean:bf!=null&&wt?r1(wt*(1-bf/100)):null};}

export {avg7Of, bmrOf, bodyFatOf, changeOf, daysBetween, kcalFloorOf, lastWeightOf, macroTargetsOf, maintenanceInUseOf,
        measurementsOf, missingOf, proteinFor, rateOf, sessionKcalOf, targetKcalOf, tdeeFormulaOf, tdeeOf, weighInsOf,
        weightChangeOf, weightOf, weightTrendOf};
