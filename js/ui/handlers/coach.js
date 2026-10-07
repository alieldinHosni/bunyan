/* Bunyan — Coach AI
   Coach AI: the assessment, the plan check and the coach's cards, the chat, and a meal
   plan built from the targets. */
import {coachNow} from "../../engine/coachinfo.js";
import {addDaysISO} from "../../engine/dayplan.js";
import {lastWeight, macroTargets} from "../../engine/formulas.js";
import {buildMealPlan} from "../../engine/mealplan.js";
import {FOODDB, loadFoods} from "../../engine/nutrition.js";
import {buildPlan, rebalance} from "../../engine/plan.js";
import {checkPlans} from "../../engine/plancheck.js";
import {t} from "../../i18n/dict.js";
import {S, saveDB, split} from "../../state.js";
import {restartAfter} from "../../engine/blocks.js";
import {fmtN, num, today} from "../../util.js";
import {closeSheet} from "../actions.js";
import {pushNav, resetNav} from "../nav.js";
import {render} from "../render.js";
import {toast, V} from "../view.js";
import {draftFrom, foodPrefs, GEARS, profileOf, STEPS, youOk} from "../views/assess.js";
import {ask} from "../views/chat.js";
import {coachAct} from "../views/pcheck.js";
import {chatEnd, chatSend, slotsFrom, toCoach} from "./common.js";
import {key, on} from "./registry.js";

/* The assessment's answers become the profile, the daily targets and the training
   plan, all at once and all with one Undo. */
function useAssessment(){
  var A=V.asd;if(!A)return;
  var keys=["profile","prefs","gear","goals","programs","activeProgram","onboarded","plannedWeekly","body","mealSlots"];
  var before=JSON.parse(JSON.stringify(keys.reduce(function(o,k){o[k]=S[k];return o;},{})));
  Object.assign(S.profile,profileOf(A));
  S.prefs.meals=num(A.meals);S.prefs.diet=A.diet;S.prefs.avoid=A.avoid.slice();S.prefs.powder=!!A.powder;S.prefs.fstyle=A.style;
  S.gear=GEARS[A.gear]?GEARS[A.gear].slice():null;
  var bt=S.body.filter(function(b){return b.date===today();})[0];
  if(bt)bt.weight=S.profile.weight;else S.body.push({date:today(),weight:S.profile.weight});
  var m=macroTargets();
  ["kcal","p","c","f","water","steps"].forEach(function(k){if(m[k])S.goals[k]=m[k];});
  buildPlan(A.split||undefined);
  /* The meals the result showed, worked out again from the targets just set. */
  if(FOODDB){var mp=buildMealPlan(S.goals,foodPrefs(A));if(mp&&mp.length)S.mealSlots=slotsFrom(mp);}
  S.onboarded=true;A.done=true;saveDB();render();window.scrollTo(0,0);
  toast(t("Your plan is in: training and meals."),function(){
    keys.forEach(function(k){S[k]=before[k];});A.done=false;saveDB();render();});}
/* The plan check's fixes. Each one is what the finding offered, with Undo. A fix done
   here (targets, protein, carbs, the goal, the volume) always settles its card: if
   something is still off afterwards (a muscle that would need longer sessions), what
   is left is kept as it is, so the card goes, and comes back only if those numbers
   change. Undo puts everything back, the card included. */
function pcFix(id){
  var f=checkPlans().filter(function(x){return x.id===id;})[0];if(!f)return;
  var act=f.fix.act;
  if(act==="meals"){openMealPlan(mealPrefs());return;}
  if(act==="program"){toCoach("train","program");return;}
  if(act==="assess"){V.pcheck=false;pushNav();V.assess=true;V.asd=draftFrom();render();window.scrollTo(0,0);return;}
  var prog=split(),before={goals:JSON.parse(JSON.stringify(S.goals)),goal:S.profile.goal,
    days:prog?JSON.parse(JSON.stringify(prog.days)):null,dis:JSON.parse(JSON.stringify(S.pcDismiss||{})),
    energy:S.energy?JSON.parse(JSON.stringify(S.energy)):null};
  var g=S.goals,w=lastWeight()||num(S.profile.weight),msg="";
  if(act==="targets"){var m=macroTargets();g.kcal=m.kcal;g.p=m.p;g.c=m.c;g.f=m.f;msg=t("Targets updated.");}
  /* Protein or carbs up, the other two moved so the calories stay where they are. */
  else if(act==="protein"){g.p=macroTargets().p;g.c=Math.max(50,Math.round((g.kcal-g.p*4-g.f*9)/4));
    msg=t("Protein raised; carbs moved to keep your calories.");}
  else if(act==="carbs"){g.c=Math.round(w*3/5)*5;g.f=Math.max(Math.round(w*0.6),Math.round((g.kcal-g.p*4-g.c*4)/9));
    msg=t("Carbs raised; fat moved to keep your calories.");}
  /* What the log measured becomes the maintenance the targets are built on. */
  else if(act==="learned"){S.energy={kcal:f.fix.kcal,at:today()};var m4=macroTargets();g.kcal=m4.kcal;g.p=m4.p;g.c=m4.c;g.f=m4.f;
    msg=t("Targets rebuilt on what your log measured.");}
  else if(act==="phasegoal"){S.profile.goal=f.fix.goal;var m2=macroTargets();g.kcal=m2.kcal;g.p=m2.p;g.c=m2.c;g.f=m2.f;
    msg=t("Goal and targets now match your program.");}
  else if(act==="balance"){var r=prog?rebalance(prog,S.profile,S.gear):{sets:0,added:0};
    msg=r.sets||r.added?t("Volume balanced: {s} sets moved, {a} exercises added.").replace("{s}",r.sets).replace("{a}",r.added)
      :t("Nothing could be moved without making sessions longer.");}
  else return;
  var still=checkPlans().filter(function(x){return x.id===id;})[0];
  if(still){S.pcDismiss=S.pcDismiss||{};S.pcDismiss[id]=JSON.stringify(still.sig);msg+=" "+t("The rest is kept as it is.");}
  saveDB();render();
  toast(msg,function(){S.goals=before.goals;S.profile.goal=before.goal;if(prog&&before.days)prog.days=before.days;
    S.pcDismiss=before.dis;if(before.energy)S.energy=before.energy;else delete S.energy;saveDB();render();});}
/* The coach's insights: act on one, or set it aside for two weeks. Taking a lighter
   week also quiets the insight that asked for it until well after the week ends. */
function coachSetAside(id,days){S.coachDismiss=S.coachDismiss||{};S.coachDismiss[id]=addDaysISO(today(),days);}
function coachFix(id){
  var c=coachNow().filter(function(x){return x.id===id;})[0];if(!c)return;
  var act=coachAct(c);
  if(act==="deload"){
    var dlBefore=JSON.parse(JSON.stringify(S.deload||{})),disBefore=JSON.parse(JSON.stringify(S.coachDismiss||{})),
        blBefore=S.block?JSON.parse(JSON.stringify(S.block)):null;
    var dl=S.deload=S.deload||{};dl.until=addDaysISO(today(),6);dl.last=today();delete dl.snooze;
    /* A training block starts again after it, as from the Train page's card. */
    if(S.block)restartAfter(dl.until);
    coachSetAside(id,14);saveDB();render();
    toast(t("Lighter week on. Your next workouts have fewer sets and lighter suggestions."),function(){
      S.deload=dlBefore;S.coachDismiss=disBefore;if(blBefore)S.block=blBefore;saveDB();render();});return;}
  if(act==="balance"){
    var prog=split();if(!prog)return;
    var daysBefore=JSON.parse(JSON.stringify(prog.days)),disB=JSON.parse(JSON.stringify(S.coachDismiss||{}));
    var r=rebalance(prog,S.profile,S.gear);coachSetAside(id,14);saveDB();render();
    toast(r.sets||r.added?t("Volume balanced: {s} sets moved, {a} exercises added.").replace("{s}",r.sets).replace("{a}",r.added)
      :t("Nothing could be moved without making sessions longer."),function(){prog.days=daysBefore;S.coachDismiss=disB;saveDB();render();});
    return;}
  if(act==="program"){coachSetAside(id,14);saveDB();toCoach("train","program");return;}
  coachSetAside(id,28);saveDB();render();}
/* A meal plan built from the daily targets, opened on the same review an imported
   plan gets: every food and amount can be changed before it is used. */
function openMealPlan(prefs){
  loadFoods(function(){
    V.assess=false;V.pcheck=false;resetNav();V.tab="coach";V.csec="food";V.cfsub="plan";S.prefs.csec="food";saveDB();pushNav();
    V.pimport=true;V.pgen=prefs;V.pitext="";V.ptargets=null;
    V.pparse=buildMealPlan(S.goals,prefs);
    render();window.scrollTo(0,0);});}
function mealPrefs(){
  var pr=S.prefs;
  return {meals:num(pr.meals)||4,diet:pr.diet||"any",avoid:(pr.avoid||[]).slice(),powder:!!pr.powder,style:pr.fstyle||"egy",variant:0};}

/* What this module answers. app.js calls register() once, at boot, in the order
   the branches are tried in (see registry.js). */
function register(){
  /* The assessment, from Explore, Home or Profile: a fresh draft from what is saved. */
  key("setup",function(){if(V.sheet)closeSheet();pushNav();V.assess=true;V.asd=draftFrom();render();window.scrollTo(0,0);return;});
  on(function(D){return D.as!==undefined&&V.asd;},function(D){var ap=D.as.split("|"),af=ap[0],av=ap[1];
    V.asd[af]=/^(days|mins|meals|sleep)$/.test(af)?num(av):af==="powder"?av==="1":av;
    /* A different goal, level, week or kit can change which splits are on offer. */
    if(/^(goal|level|days|gear)$/.test(af))V.asd.split=null;
    render();return;});
  on(function(D){return D.asm!==undefined&&V.asd;},function(D){var mp=D.asm.split("|"),ml=V.asd[mp[0]],mi=ml.indexOf(mp[1]);
    if(mi>=0)ml.splice(mi,1);else ml.push(mp[1]);render();return;});
  on(function(D){return D.asnext&&V.asd;},function(){
    if(STEPS[V.asd.step]==="you"&&!youOk(V.asd)){toast(t("Enter your age, height and weight to go on."));return;}
    V.asd.step=Math.min(STEPS.length-1,V.asd.step+1);render();window.scrollTo(0,0);
    if(STEPS[V.asd.step]==="result"&&!FOODDB)loadFoods(function(){render();});
    return;});
  on(function(D){return D.asback&&V.asd;},function(){V.asd.step=Math.max(0,V.asd.step-1);render();window.scrollTo(0,0);return;});
  on(function(D){return D.assplit&&V.asd;},function(D){V.asd.split=D.assplit;render();return;});
  key("asuse",function(){useAssessment();return;});
  key("astrain",function(){V.assess=false;V.pcheck=false;resetNav();V.tab="train";V.train="days";V.tdate=null;render();window.scrollTo(0,0);return;});
  key("asfood",function(){V.assess=false;V.pcheck=false;resetNav();V.tab="food";V.train="days";V.fdate=null;render();window.scrollTo(0,0);return;});
  /* The plan check: open it, fix a finding, keep one as it is, look at kept ones again. */
  key("pcopen",function(){toCoach("ai");V.advall=true;render();return;});
  /* Coach AI's advice: the most important thing, or all of it. */
  key("advall",function(D){V.advall=D.advall==="1";render();return;});
  key("pcfix",function(D){pcFix(D.pcfix);return;});
  key("pckeep",function(D){var fk=checkPlans().filter(function(x){return x.id===D.pckeep;})[0];
    if(fk){S.pcDismiss=S.pcDismiss||{};S.pcDismiss[fk.id]=JSON.stringify(fk.sig);saveDB();render();
      toast(t("Kept as it is."),function(){delete S.pcDismiss[fk.id];saveDB();render();});}return;});
  key("pcreset",function(){S.pcDismiss={};S.coachDismiss={};saveDB();render();return;});
  key("cofix",function(D){coachFix(D.cofix);return;});
  /* Ask the coach (js/ui/views/chat.js): open the conversation, ask a suggestion or what
     was typed, clear it with Undo. */
  key("chat",function(){pushNav();V.chat=true;render();chatEnd();return;});
  key("chatq",function(D){if(!V.chat){pushNav();V.chat=true;}ask("",D.chatq);saveDB();render();chatEnd();return;});
  key("chatsend",function(){chatSend();return;});
  key("chatclear",function(){var chB=S.chat||[];S.chat=[];saveDB();render();window.scrollTo(0,0);
    toast(t("Conversation cleared."),function(){S.chat=chB;saveDB();render();});return;});
  /* What an answer offers to change: a small step on the calorie target, carbs moving
     with it so protein and fat stay where they are; or the goal, with its targets. */
  key("chatkcal",function(D){var gB=JSON.parse(JSON.stringify(S.goals)),gK=S.goals,dK=+D.chatkcal||0,flK=S.profile.sex==="f"?1200:1500;
    gK.kcal=Math.max(flK,Math.round((num(gK.kcal)+dK)/10)*10);gK.c=Math.max(50,Math.round((gK.kcal-num(gK.p)*4-num(gK.f)*9)/4));
    saveDB();render();
    toast(t(dK<0?"Target lowered to {k} kcal; carbs moved with it.":"Target raised to {k} kcal; carbs moved with it.").replace("{k}",fmtN(gK.kcal)),
      function(){S.goals=gB;saveDB();render();});return;});
  key("chatgoal",function(D){var cgB={goals:JSON.parse(JSON.stringify(S.goals)),goal:S.profile.goal};
    S.profile.goal=D.chatgoal;var cgM=macroTargets();S.goals.kcal=cgM.kcal;S.goals.p=cgM.p;S.goals.c=cgM.c;S.goals.f=cgM.f;
    saveDB();render();
    toast(t("Goal and targets updated."),function(){S.goals=cgB.goals;S.profile.goal=cgB.goal;saveDB();render();});return;});
  key("cokeep",function(D){var ck=D.cokeep,cb=JSON.parse(JSON.stringify(S.coachDismiss||{}));coachSetAside(ck,14);saveDB();render();
    toast(t("Set aside for two weeks."),function(){S.coachDismiss=cb;saveDB();render();});return;});
  /* A meal plan from the targets, from Food's plan section, and another version of it. */
  key("pgen",function(){openMealPlan(mealPrefs());return;});
  on(function(D){return D.pgenmore&&V.pgen;},function(){V.pgen.variant=(V.pgen.variant||0)+1;V.pparse=buildMealPlan(S.goals,V.pgen);render();return;});}

export {register};
