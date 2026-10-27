/* Bunyan — Coach AI
   Coach AI: the assessment, the plan check and the coach's cards, the chat, and a meal
   plan built from the targets. */
import {coachNow} from "../../engine/coachinfo.js";
import {addDaysISO} from "../../engine/dayplan.js";
import {kcalFloor, lastWeight, macroTargets} from "../../engine/formulas.js";
import {buildMealPlan} from "../../engine/mealplan.js";
import {FOODDB, loadFoods} from "../../engine/nutrition.js";
import {buildPlan, rebalance} from "../../engine/plan.js";
import {checkPlans} from "../../engine/plancheck.js";
import {t} from "../../i18n/dict.js";
import {S, saveDB, split} from "../../state.js";
import {restartAfter} from "../../engine/blocks.js";
import {fmtN, num, today} from "../../util.js";
import {ACT, askConfirm, closeSheet, openSheet} from "../actions.js";
import {isReady, run as runSmart, start as smartStart, state as smartState, stop as smartStop} from "../smartcoach.js";
import {pushNav, resetNav} from "../nav.js";
import {fromEl, land} from "../chatmotion.js";
import {render} from "../render.js";
import {toast, V} from "../view.js";
import {draftFrom, foodPrefs, GEARS, profileOf, STEPS, youOk} from "../views/assess.js";
import {ask, findMsg, follow} from "../views/chat.js";
import {coachAct} from "../views/pcheck.js";
import {chatSend, sendText, slotsFrom, toCoach} from "./common.js";
import {closeCoach, holdCoach, toEnd} from "../coachfab.js";
import {perform, undo} from "./actions.js";
import {addFact, removeFact} from "../../coach/context.js";
import {key, on} from "./registry.js";
import {closeMenu, msgText} from "../chatgest.js";
/* Where the clipboard API is missing or refused: a hidden field, selected and copied. */
function copyOld(tx){try{var f=document.createElement("textarea");f.value=tx;f.setAttribute("readonly","");f.style.position="fixed";f.style.opacity="0";
  document.body.appendChild(f);f.select();document.execCommand("copy");f.remove();}catch(e){}}

/* The answer marked done and shown for a beat, the panel closed, then the move. */
var BEAT=420,CLOSE=290,HIST_IN=420;
function goAfter(m){
  m.ag.s="applied";saveDB();render();toEnd();
  setTimeout(function(){
    if(V.coach)closeCoach(render);
    setTimeout(function(){
      if(!perform(m.ag.act,m.ag.p,m.at)){m.ag.s="failed";saveDB();render();}},V.coach===null?CLOSE:0);},BEAT);}
/* The kept message a button in the conversation belongs to: the newest one (only the
   newest carries buttons). */
function lastAsked(){var c=S.chat||[];return c[c.length-1]||null;}
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
  /* The assessment asks for a weight (youOk), so there are targets; if not, none are set. */
  var m=macroTargets();
  if(m)["kcal","p","c","f","water","steps"].forEach(function(k){if(m[k])S.goals[k]=m[k];});
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
  /* These fixes are built on the targets, which need a weight: ask for it, never assume one. */
  if(/^(targets|protein|carbs|learned|phasegoal)$/.test(act)&&!macroTargets()){openSheet("weigh");return;}
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
ACT.smartoff=function(){smartStop().then(function(){toast(t("Smart coach off. The download is removed."));});};
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
  /* "Ask me anything" opens it ready to type: the field takes focus inside the tap, which
     is what lets a phone raise its keyboard. */
  /* The conversation is the floating Coach's panel (js/ui/coachfab.js), over the screen
     it was opened from: no route changes, so closing it is back where you were. */
  key("chat",function(D){V.coach=D.chat==="ask"?"compact":"full";render();
    if(D.chat==="ask"){var q=document.getElementById("chatq");if(q){try{q.focus({preventScroll:true});}catch(e){q.focus();}}}
    return;});
  key("coachopen",function(){if(V.sheet)closeSheet();V.coach="compact";render();return;});
  key("coachclose",function(){closeCoach(render);return;});
  key("chatsay",function(D,el){if(!V.coach)V.coach="compact";sendText(D.chatsay,fromEl(el),el&&el.textContent||"");return;});
  /* A long press on an exchange (js/ui/chatgest.js): copy it, or delete it with Undo. */
  key("msgcopy",function(D){var tx=msgText(D.msgcopy);closeMenu();
    var ok=function(){toast(t("Copied."));};
    try{if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(tx).then(ok,function(){copyOld(tx);ok();});return;}}catch(e){}
    copyOld(tx);ok();return;});
  /* Not what I asked: the question kept for the owner to send on (S.missed, newest last,
     200 at most); the link becomes its thanks, that element alone. */
  key("chatmiss",function(D,el){var m=findMsg(D.chatmiss);if(!m||m.miss)return;
    S.missed=(Array.isArray(S.missed)?S.missed:[]).concat([{q:String(m.q||"").slice(0,300),id:String(m.id||""),at:Date.now(),lang:m.lang==="ar"?"ar":"en"}]).slice(-200);
    m.miss=1;saveDB();
    var p=document.createElement("p");p.className="chat-missd";p.textContent=t("Kept, thanks. Try saying it another way, or tap a question below.");
    if(el&&el.parentNode)el.parentNode.replaceChild(p,el);return;});
  /* The smart coach (js/ui/smartcoach.js): a question the rules missed, tried again by
     the model; the setting's buttons. */
  key("smarttry",function(D){var m0=findMsg(D.smarttry);if(!m0||!isReady())return;
    var m={q:m0.qq||m0.q,id:"smart",at:Date.now(),b:[{p:""}],acts:[],lang:m0.lang,pending:true};
    S.chat=(S.chat||[]).concat([m]);saveDB();render();toEnd();
    runSmart(m,saveDB,function(){render();toEnd();});return;});
  key("smarton",function(){smartStart(smartState().size);return;});
  key("smartsize",function(D){if(/^(small|better)$/.test(D.smartsize)){smartState().size=D.smartsize;render();}return;});
  key("smartoff",function(){askConfirm({title:t("Turn off the smart coach?"),icon:"trash",
    body:t("The model is removed from this phone. The coach answers as before; turn it on again any time."),cta:t("Turn off and remove"),act:"smartoff",danger:true});return;});
  key("misscopy",function(){
    var tx=(S.missed||[]).map(function(x){return x.q+"  →  "+x.id;}).join("\n");
    var ok=function(){toast(t("Copied."));};
    try{if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(tx).then(ok,function(){copyOld(tx);ok();});return;}}catch(e){}
    copyOld(tx);ok();return;});
  key("missclear",function(D,el){var before=S.missed||[];S.missed=[];saveDB();
    var sec=el&&el.closest&&el.closest(".chh-miss");if(sec)sec.remove();
    toast(t("Cleared."),function(){S.missed=before;saveDB();render();});return;});
  key("msgdel",function(D){closeMenu();var before=S.chat||[],at=+D.msgdel;
    S.chat=before.filter(function(m){return !(m&&m.at===at);});saveDB();render();
    toast(t("Deleted."),function(){S.chat=before;saveDB();render();});return;});
  key("coachsize",function(D){V.coach=D.coachsize==="full"?"full":"compact";render();return;});
  /* The food database loads first (from the cache, offline): swaps and food facts
     answer from it. */
  key("chatq",function(D,el){var from=fromEl(el);if(!V.coach)V.coach="compact";
    loadFoods(function(){ask("",D.chatq,D.chatl);saveDB();render();land(from);toEnd();});return;});
  key("chatsend",function(){chatSend();return;});
  /* A request in the chat (js/ui/agent.js): Add it runs the action the way its screen
     does (js/ui/handlers/actions.js) and the row turns to done, with Undo for the
     session; Not now leaves everything as it is. Only that row changes. */
  key("agok",function(D){var m=findMsg(D.agok);if(!m||!m.ag||m.ag.s!=="confirm")return;
    /* A confirmed move to another screen (the plan rebuilt for other kit): the same
       sequence as one that runs at once. */
    if(/^(app\.go|plan\.gear)$/.test(m.ag.act)){goAfter(m);return;}
    loadFoods(function(){
      var ok=holdCoach(function(){return perform(m.ag.act,m.ag.p,m.at);});
      m.ag.s=ok?"applied":"failed";saveDB();render();});return;});
  /* Something the person told the coach to do that runs at once (js/ui/agent.js
     planCommand). A setting keeps the panel open, with Undo. Going somewhere (and the
     workout's buttons) is said first: the answer shows for a beat, the panel closes
     back into its button, and only then does the page move, with its own rise, so the
     change never looks like a jump. */
  key("agrun",function(D){var m=findMsg(D.agrun);if(!m||!m.ag||m.ag.s!=="confirm"||!m.ag.run)return;
    var go=/^(app\.go|workout\.|rest\.|plan\.gear)/.test(m.ag.act);
    if(go){goAfter(m);return;}
    m.ag.s="applied";saveDB();
    if(!holdCoach(function(){return perform(m.ag.act,m.ag.p,m.at);}))m.ag.s="failed";
    saveDB();render();toEnd();return;});
  key("agno",function(D){var m=findMsg(D.agno);if(!m||!m.ag||m.ag.s!=="confirm")return;
    m.ag.s="declined";saveDB();render();return;});
  key("agundo",function(D){var m=findMsg(D.agundo);if(!m||!m.ag||m.ag.s!=="applied")return;
    if(holdCoach(function(){return undo(m.at);})){m.ag.s="undone";saveDB();render();}return;});
  /* A choice on a pick, or None of these: one more exchange, as if typed. */
  key("agpick",function(D,el){var pr=String(D.agpick).split("|"),from=fromEl(el);
    loadFoods(function(){if(follow(pr[0],+pr[1])){saveDB();render();land(from);toEnd();}});return;});
  /* What the person said, kept in their words under the kind they picked
     (js/coach/context.js), or not kept; and deleted when they ask. */
  key("ctxadd",function(D,el){var m=lastAsked(el);if(!m)return;
    var r=addFact(S.context,{kind:D.ctxadd,text:m.q,by:"user"},{today:today()});
    if(r.ok)S.context=r.store;
    m.acts=[];m.b=[{p:r.ok||r.why==="duplicate"?t("Kept, in your words. Ask “What have I told you?” to see or delete it."):t("That couldn't be kept.")}];
    saveDB();render();return;});
  key("ctxno",function(D,el){var m=lastAsked(el);if(!m)return;m.acts=[];m.b=[{p:t("Not kept.")}];saveDB();render();return;});
  key("ctxdel",function(D){var r=removeFact(S.context,D.ctxdel);S.context=r.store;
    (S.chat||[]).forEach(function(m){if(m&&Array.isArray(m.acts))m.acts=m.acts.filter(function(b){return !(b.a&&b.a["data-ctxdel"]===D.ctxdel);});});
    saveDB();render();toast(t("Deleted."));return;});
  key("agnone",function(D,el){var from=fromEl(el);if(follow(D.agnone,null)){saveDB();render();land(from);toEnd();}return;});
  /* Clearing the conversation hides it from the chat; the history keeps it (its own
     button deletes that). */
  key("chatclear",function(){var fB=S.chatFrom;S.chatFrom=Date.now();saveDB();render();
    toast(t("Conversation cleared."),function(){S.chatFrom=fB;saveDB();render();});return;});
  /* From the chat to its history: the panel closes, Profile comes in, then the history
     rises over it, each move given its own time (owner, 27 Oct: not fast). */
  key("chathist",function(){
    var go=function(){pushNav();V.tab="profile";V.train="days";render();window.scrollTo(0,0);
      setTimeout(function(){openSheet("set_chat");},HIST_IN);};
    if(V.coach){closeCoach(render);setTimeout(go,CLOSE);}else go();return;});
  key("chathistdel",function(){var cB=S.chat||[],fB=S.chatFrom;S.chat=[];S.chatFrom=0;saveDB();render();
    toast(t("Chat history deleted."),function(){S.chat=cB;S.chatFrom=fB;saveDB();render();});return;});
  /* What an answer offers to change: a small step on the calorie target, carbs moving
     with it so protein and fat stay where they are; or the goal, with its targets. */
  /* Never under the app's one floor (BMR): a step down stops there. Without a weight
     there is no floor to check against, so a step down waits for one. */
  key("chatkcal",function(D){var gB=JSON.parse(JSON.stringify(S.goals)),gK=S.goals,dK=+D.chatkcal||0,flK=kcalFloor();
    if(dK<0&&flK==null){openSheet("weigh");return;}
    gK.kcal=Math.max(flK==null?0:Math.ceil(flK/10)*10,Math.round((num(gK.kcal)+dK)/10)*10);gK.c=Math.max(50,Math.round((gK.kcal-num(gK.p)*4-num(gK.f)*9)/4));
    saveDB();render();
    toast(t(dK<0?"Target lowered to {k} kcal; carbs moved with it.":"Target raised to {k} kcal; carbs moved with it.").replace("{k}",fmtN(gK.kcal)),
      function(){S.goals=gB;saveDB();render();});return;});
  key("chatgoal",function(D){var cgB={goals:JSON.parse(JSON.stringify(S.goals)),goal:S.profile.goal};
    S.profile.goal=D.chatgoal;var cgM=macroTargets();if(cgM){S.goals.kcal=cgM.kcal;S.goals.p=cgM.p;S.goals.c=cgM.c;S.goals.f=cgM.f;}
    saveDB();render();
    toast(t(cgM?"Goal and targets updated.":"Goal updated. Log your weight and its targets are worked out."),function(){S.goals=cgB.goals;S.profile.goal=cgB.goal;saveDB();render();});return;});
  key("cokeep",function(D){var ck=D.cokeep,cb=JSON.parse(JSON.stringify(S.coachDismiss||{}));coachSetAside(ck,14);saveDB();render();
    toast(t("Set aside for two weeks."),function(){S.coachDismiss=cb;saveDB();render();});return;});
  /* A meal plan from the targets, from Food's plan section, and another version of it. */
  key("pgen",function(){openMealPlan(mealPrefs());return;});
  on(function(D){return D.pgenmore&&V.pgen;},function(){V.pgen.variant=(V.pgen.variant||0)+1;V.pparse=buildMealPlan(S.goals,V.pgen);render();return;});}

export {register};
