/* Bunyan — the plan check
   Reads the daily targets, the meal plan and the training program side by side
   against the goal, and says where they pull in different directions: a fat-loss
   goal on a maintenance target, a meal plan 400 kcal off its targets, a muscle the
   program barely trains, a steep deficit under a heavy week of volume, a lot of
   running on few carbs. A plan imported from a coach's PDF and one built here are
   checked the same way.

   Each finding says what, why, and one fix the app can make (with Undo), or where
   to go to make it. None is an order: "Keep it as it is" hides a finding until the
   numbers behind it change (its sig), so a choice made on purpose is not nagged
   about. The most important one shows on Home; the rest wait on the Plan check
   screen. Severity: 3 works against the goal, 2 holds it back, 1 worth knowing.

   Pure: it reads the state and returns findings; acting on them is the app's. */
import {isActivity} from "../data/activities.js";
import {isCompound, muscleOf} from "../data/exercises.js";
import {goalOf} from "../data/goals.js";
import {hasPlan, mealSlots} from "./meals.js";
import {lastWeight, macroTargets, tdee} from "./formulas.js";
import {learnedDiffers} from "./energy.js";
import {fmtW} from "../units.js";
import {perWeek, RANGE, volumeCheck} from "./volume.js";
import {LEVELS} from "./plan.js";
import {S, split} from "../state.js";
import {fmtN, num} from "../util.js";
import {t, tm} from "../i18n/dict.js";

function r50(v){return Math.round(v/50)*50;}
/* Shown with thousands separators: 2,800 kcal. */
function k50(v){return fmtN(r50(v));}
/* Opens a sentence, so the first name keeps its capital: "Biceps, calves: fewer than…". */
function list(ms){var s=ms.map(function(m){return tm(m).trim().toLowerCase();}).join(S.prefs.lang==="ar"?"، ":", ");
  return s.charAt(0).toUpperCase()+s.slice(1);}
function fill(s,o){Object.keys(o).forEach(function(k){s=s.split("{"+k+"}").join(o[k]);});return s;}

/* What the meal plan adds up to, across every meal that has one. */
function planTotals(){
  var t0={kcal:0,p:0,c:0,f:0};
  mealSlots().forEach(function(s){(s.plan||[]).forEach(function(i){
    t0.kcal+=num(i.kcal);t0.p+=num(i.p);t0.c+=num(i.c);t0.f+=num(i.f);});});
  return t0;}

/* The active program's lifting, as the checks need it. */
function programFacts(prog){
  var mains=[],rests=[],sport=0,lifts=0,mob=0;
  (prog.days||[]).forEach(function(d){
    var k=perWeek(prog,d),first=true;
    (d.ex||[]).forEach(function(e){
      if(isActivity(e.name)){sport+=(num(e.min)||30)*k;return;}
      lifts++;
      if(/Stretch|Mobili|Rotation|Swings|Pass-Through/i.test(e.name))mob++;
      if(first&&isCompound(e.name)){mains.push(e);first=false;}
      if(num(e.rest))rests.push(num(e.rest));});});
  return {mains:mains,sport:Math.round(sport),lifts:lifts,mob:mob,
    rest:rests.length?rests.reduce(function(a,b){return a+b;},0)/rests.length:0};}

function checkPlans(){
  var out=[],p=S.profile||{},G=goalOf(p.goal),w=lastWeight()||num(p.weight);
  var known=num(p.age)>0&&num(p.height)>0&&w>0;
  var g=S.goals||{},cur=num(g.kcal);
  var sug=known?macroTargets():null,td=known?tdee():0;

  /* ---- what the log says the body uses, against what the targets are built on ---- */
  var ld=known?learnedDiffers():null;
  if(ld){
    var L=ld.learned,pw=L.perWeek,rate=(pw>0.004?"+":pw<-0.004?"−":"±")+fmtW(Math.abs(pw));
    out.push({id:"maint-learned",area:"food",sev:2,title:fill(t("Your body uses about {k} kcal a day"),{k:fmtN(L.kcal)}),
      why:fill(t(ld.use.source==="learned"
          ?"Over the last four weeks you logged about {i} kcal on {d} full days, and your weight moved {r} a week. That means your body now uses about {k} kcal a day ({lo}–{hi}), not the {f} your targets are built on."
          :"Over the last four weeks you logged about {i} kcal on {d} full days, and your weight moved {r} a week. That means your body uses about {k} kcal a day ({lo}–{hi}), not the {f} the formula estimated."),
        {i:fmtN(L.intake),d:L.foodDays,r:rate,k:fmtN(L.kcal),lo:fmtN(L.low),hi:fmtN(L.high),f:fmtN(ld.use.kcal)}),
      fix:{label:fill(t("Build my targets on {k} kcal"),{k:fmtN(L.kcal)}),act:"learned",kcal:L.kcal},sig:[r50(L.kcal),r50(ld.use.kcal)]});}

  /* ---- the targets against the goal ---- */
  if(known&&cur){
    if(G.kcal<0&&cur>=td-50)
      out.push({id:"kcal-up",area:"food",sev:3,title:t("Your calories will not lose fat"),
        why:fill(t("Your target is {cur} kcal and maintenance is about {td}. Fat loss needs less than maintenance: {sug} kcal fits your goal."),{cur:k50(cur),td:k50(td),sug:fmtN(sug.kcal)}),
        fix:{label:fill(t("Use {sug} kcal"),{sug:fmtN(sug.kcal)}),act:"targets"},sig:[r50(cur),r50(td),p.goal]});
    /* Only building muscle needs a surplus. Strength, sport and the rest grow on
       maintenance, so they get the "far from maintenance" check below instead. */
    else if(G.kcal>=0.08&&cur<=td)
      out.push({id:"kcal-down",area:"food",sev:3,title:t("Your calories will not build muscle"),
        why:fill(t("Your target is {cur} kcal and maintenance is about {td}. Building needs a little more than maintenance: {sug} kcal fits your goal."),{cur:k50(cur),td:k50(td),sug:fmtN(sug.kcal)}),
        fix:{label:fill(t("Use {sug} kcal"),{sug:fmtN(sug.kcal)}),act:"targets"},sig:[r50(cur),r50(td),p.goal]});
    else if(cur<td*0.7)
      out.push({id:"kcal-steep",area:"food",sev:3,title:t("That deficit is steep"),
        why:fill(t("{cur} kcal is more than 30% under your maintenance of about {td}. Muscle, energy and training go with the fat that fast. {sug} kcal still loses fat."),{cur:k50(cur),td:k50(td),sug:fmtN(sug.kcal)}),
        fix:{label:fill(t("Use {sug} kcal"),{sug:fmtN(sug.kcal)}),act:"targets"},sig:[r50(cur),r50(td)]});
    else if(G.kcal>-0.08&&G.kcal<0.08&&Math.abs(cur-td)>td*0.15)
      out.push({id:"kcal-off",area:"food",sev:2,title:t("Your calories are far from maintenance"),
        why:fill(t("Your goal holds your weight, but {cur} kcal is {d} kcal from your maintenance of about {td}."),{cur:k50(cur),td:k50(td),d:k50(Math.abs(cur-td))}),
        fix:{label:fill(t("Use {sug} kcal"),{sug:fmtN(sug.kcal)}),act:"targets"},sig:[r50(cur),r50(td),p.goal]});
    if(num(g.p)&&num(g.p)<sug.p*0.85)
      out.push({id:"protein",area:"food",sev:2,title:t("Protein is low for your goal"),
        why:fill(t("{p} g a day is {k} g per kg. For your goal about {s} g ({gk} g per kg) keeps and builds muscle."),{p:g.p,k:(g.p/w).toFixed(1),s:sug.p,gk:G.protein}),
        fix:{label:fill(t("Use {s} g"),{s:sug.p}),act:"protein"},sig:[g.p,sug.p]});}

  /* ---- the meal plan against the targets ---- */
  if(hasPlan()&&cur){
    var pt=planTotals(),off=pt.kcal-cur,poff=num(g.p)?pt.p-num(g.p):0;
    if(Math.abs(off)>cur*0.1||(num(g.p)&&poff<-num(g.p)*0.15))
      out.push({id:"meals-off",area:"food",sev:2,title:t("Your meal plan and your targets disagree"),
        why:fill(t("The plan adds up to {k} kcal and {p} g of protein a day; your targets are {ck} kcal and {cp} g. Eat the plan and you {dir}."),
          {k:k50(pt.kcal),p:Math.round(pt.p),ck:k50(cur),cp:g.p,dir:t(off>cur*0.1?"eat more than your target":off<-cur*0.1?"eat less than your target":"come up short on protein")}),
        fix:{label:t("Rebuild the plan from my targets"),act:"meals"},sig:[r50(pt.kcal),Math.round(pt.p),r50(cur),g.p]});}

  /* ---- the training against the goal and the level ---- */
  var prog=split(),f=prog&&prog.days&&prog.days.length?programFacts(prog):null;
  if(f&&f.lifts){
    var level=LEVELS[p.level]?p.level:"some",vc=volumeCheck(prog,level),r=RANGE[level];
    var low=vc.filter(function(v){return v.status==="low";}).map(function(v){return v.m;});
    var high=vc.filter(function(v){return v.status==="high";}).map(function(v){return v.m;});
    if(low.length)
      out.push({id:"vol-low",area:"train",sev:G.train==="hyp"?2:1,title:t("Some muscles get little training"),
        why:fill(t("{m}: fewer than {lo} hard sets a week. For your experience {lo}–{hi} is a typical range. A starting point, not a rule."),{m:list(low),lo:r[0],hi:r[1]}),
        fix:{label:t("Balance the volume"),act:"balance"},sig:low});
    if(high.length)
      out.push({id:"vol-high",area:"train",sev:1,title:t("A lot of volume for some muscles"),
        why:fill(t("{m}: well over {hi} hard sets a week. More is not always better: past what you recover from, it stops paying."),{m:list(high),hi:r[1]}),
        fix:{label:t("Balance the volume"),act:"balance"},sig:high});
    var lo=f.mains.length?f.mains.reduce(function(a,e){return a+num(e.lo);},0)/f.mains.length:0;
    if(p.goal==="strength"&&lo>6)
      out.push({id:"int-str",area:"train",sev:2,title:t("Heavy enough for strength?"),
        why:fill(t("Your main lifts start at about {lo} reps. Strength comes fastest from heavier sets of 3 to 6, with longer rests."),{lo:Math.round(lo)}),
        fix:{label:t("Open my program"),act:"program"},sig:[Math.round(lo)]});
    if(p.goal==="endurance"&&f.rest>150)
      out.push({id:"int-end",area:"train",sev:1,title:t("Long rests for endurance"),
        why:fill(t("Rests average {s} seconds. For endurance, 30 to 90 seconds keeps your heart rate up between sets."),{s:Math.round(f.rest)}),
        fix:{label:t("Open my program"),act:"program"},sig:[Math.round(f.rest/15)]});
    if(p.goal==="mobility"&&!f.mob)
      out.push({id:"mob-none",area:"train",sev:2,title:t("No mobility work in your program"),
        why:t("Your goal is mobility, but the program has no stretches or mobility drills. The warm-up and cool-down help; a few minutes at the end of each session helps more."),
        fix:{label:t("Rebuild my plan"),act:"assess"},sig:[f.mob]});
    /* A coach's PDF names its phase; it may not be the goal set here. */
    var ph=prog.meta&&prog.meta.phase||"";
    var cutPh=/fat|cut|shred|loss|lean/i.test(ph),bulkPh=/bulk|mass|gain|size/i.test(ph);
    if(ph&&(cutPh&&G.kcal>0||bulkPh&&G.kcal<0)){
      /* The coach's program is the plan being followed, so the fix is the goal (and the
         targets with it), not a new program. */
      var pg=cutPh?"lose":"gain";
      out.push({id:"phase",area:"both",sev:2,title:t("Your program and your goal point different ways"),
        why:fill(t("The program says “{ph}”; your goal is {g}. Training like that while eating for the other works against both."),{ph:ph,g:t(G.label).toLowerCase()}),
        fix:{label:fill(t("Set my goal to {g}"),{g:t(goalOf(pg).label).toLowerCase()}),act:"phasegoal",goal:pg},sig:[ph,p.goal]});}

    /* ---- the two together ---- */
    if(known&&cur){
      var sets=vc.reduce(function(a,v){return a+v.sets;},0);
      if(cur<td*0.8&&sets>r[1]*vc.length*0.9)
        out.push({id:"deficit-volume",area:"both",sev:2,title:t("A big deficit under a heavy week"),
          why:fill(t("{d}% under maintenance with about {n} hard sets a week is a lot to recover from. Eat a little more, or trim a few sets."),{d:Math.round((1-cur/td)*100),n:Math.round(sets)}),
          fix:{label:fill(t("Use {sug} kcal"),{sug:fmtN(sug.kcal)}),act:"targets"},sig:[r50(cur),Math.round(sets/5)]});
      if(G.kcal>0&&low.length>=vc.length/2)
        out.push({id:"surplus-low",area:"both",sev:2,title:t("Eating to grow, training too little to use it"),
          why:t("A surplus builds muscle only where training asks for it. With this little volume, more of it is stored as fat."),
          fix:{label:t("Balance the volume"),act:"balance"},sig:low});
      var ck=num(g.c)/w;
      if(f.sport>=150&&ck<3)
        out.push({id:"carbs-sport",area:"both",sev:1,title:t("Carbs for your running and sport"),
          why:fill(t("{m} minutes of cardio and sport a week on {c} g of carbs ({k} g per kg) can leave you flat. Around 3 to 5 g per kg fuels that much."),{m:f.sport,c:g.c,k:ck.toFixed(1)}),
          fix:{label:fill(t("Use {c} g of carbs"),{c:Math.round(w*3/5)*5}),act:"carbs"},sig:[g.c,f.sport]});}}

  /* Kept as they are, until their numbers change. */
  var dis=S.pcDismiss||{};
  out=out.filter(function(x){return dis[x.id]!==JSON.stringify(x.sig);});
  out.sort(function(a,b){return b.sev-a.sev;});
  return out;}

export {checkPlans, planTotals};
