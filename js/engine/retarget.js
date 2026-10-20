/* Bunyan — stored targets carried to the current formula
   The log keeps only what was entered, so a changed formula recomputes estimated maxes,
   volume, BMR and maintenance by itself the next time they are read. The day's targets
   (goals: kcal, protein, carbs, fat) are the exception: they are stored. When the formula
   behind them changes, targets the old formula made are rebuilt on the new one, once per
   profile, so one method applies throughout (CLAUDE.md, Formulas). Targets the person
   chose (typed on the Targets screen, read from a coach's PDF, moved by a step the coach
   offered) are theirs and are kept; the Targets screen shows the new suggestion beside
   them, one tap away.

   Formula versions (db.formulaV; a blob without one is version 1):
     1  to 20 Oct 2026: fat loss a fifth under maintenance, at most 750; muscle a tenth
        over, at most 300; 2.0 g/kg protein losing fat; the floor 0.95 × BMR while
        losing, never under 1,200 / 1,500 kcal.
     2  20 Oct 2026, the textbook's values (docs/FORMULA-RECONCILIATION.md rows 2–4, 13):
        500 under, 350 over, 2.4 g/kg losing fat; the floor BMR for every goal, never
        under 1,200 / 1,500 kcal. */
import {bmrOf, macroTargetsOf, tdeeOf} from "./body.js";
import {goalOf} from "../data/goals.js";
import {num} from "../util.js";

var FORMULA_V=2;
/* What version 1 had that goals.js no longer does: the caps on the shares, and the
   protein for fat loss. Every other goal's numbers are the same in both. */
var V1={lose:{cap:750,protein:2.0},gain:{cap:300}};

/* The day's targets as version 1 worked them out, at the data given. null without BMR. */
function v1TargetsOf(profile,body,energy){
  var p=profile||{},b=bmrOf(p,body);
  if(b==null)return null;
  var G=goalOf(p.goal),o=V1[p.goal]||{},cap=o.cap!=null?o.cap:G.cap,td=tdeeOf(p,body,energy);
  var d=Math.round(td*G.kcal);
  if(cap)d=Math.max(-cap,Math.min(cap,d));
  var kc=Math.round(Math.max(Math.max(p.sex==="f"?1200:1500,G.kcal<0?Math.round(b*0.95):0),td+d)/10)*10;
  var pr=Math.round(leanKg(p,body)*(o.protein!=null?o.protein:G.protein)),f=Math.round(kc*(G.fat||0.28)/9);
  return {kcal:kc,p:pr,f:f,c:Math.max(50,Math.round((kc-pr*4-f*9)/4))};}
/* The weight protein is worked from: the latest weigh-in, else the profile's, taken
   at a BMI of 27 above a BMI of 30 (as proteinFor does). */
function leanKg(p,body){
  var list=Array.isArray(body)?body:[],w=0;
  for(var i=list.length-1;i>=0&&!w;i--)w=num(list[i]&&list[i].weight);
  w=w||num(p.weight);
  var h=num(p.height)/100;
  return h>1&&w/(h*h)>30?27*h*h:w;}

/* Whether stored targets have the shape version 1 gave them: energy in tens, fat the
   goal's share of it, carbs what is left, and protein the goal's version 1 g/kg of a
   weight this profile has had. Typed, imported and hand-moved targets do not. */
function fromV1(goals,profile,body){
  var g=goals||{},p=profile||{},G=goalOf(p.goal),o=V1[p.goal]||{};
  var kc=num(g.kcal),pr=num(g.p),f=num(g.f),c=num(g.c);
  if(!(kc>0)||kc%10)return false;
  if(f!==Math.round(kc*(G.fat||0.28)/9))return false;
  if(c!==Math.max(50,Math.round((kc-pr*4-f*9)/4)))return false;
  var gk=o.protein!=null?o.protein:G.protein,h=num(p.height)/100;
  var ws=(Array.isArray(body)?body:[]).map(function(b){return num(b&&b.weight);}).concat([num(p.weight)]);
  return ws.some(function(w){
    if(!(w>0))return false;
    if(h>1&&w/(h*h)>30)w=27*h*h;
    return Math.round(w*gk)===pr;});}

/* A profile's blob brought to FORMULA_V. null when nothing was due; otherwise
   {changed, before}, before being the old targets, for Undo. formulaV is set either
   way, so this runs once per profile. Rebuilt only where the targets came from the old
   formula and the new one gives this person different numbers; without a weight there
   is nothing to rebuild them on, and they are left as they are. */
function retarget(db){
  if(!db||num(db.formulaV)>=FORMULA_V)return null;
  var out={changed:false,before:JSON.parse(JSON.stringify(db.goals||{}))};
  db.formulaV=FORMULA_V;
  if(!db.goals||!fromV1(db.goals,db.profile,db.body))return out;
  var now=macroTargetsOf(db.profile,db.body,db.energy),was=v1TargetsOf(db.profile,db.body,db.energy);
  if(!now||!was)return out;
  if(["kcal","p","c","f"].every(function(k){return now[k]===was[k];}))return out;
  ["kcal","p","c","f"].forEach(function(k){if(db.goals[k]!==now[k]){db.goals[k]=now[k];out.changed=true;}});
  return out;}

export {FORMULA_V, fromV1, retarget, v1TargetsOf};
