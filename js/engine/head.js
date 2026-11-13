/* Bunyan — the head: one decision engine
   Everything the app tells the person without being asked comes from here (docs/
   NEXT-PHASE.md WP-1). Before it, five parts of the code each decided on their own and
   contradicted each other on the same day: Training said "Time for a lighter week" while
   Coach said "Under your range: Balance the volume" (F-A1). The head collects what each
   source would say, as signals of one shape, resolves the contradictions by fixed rules,
   and ranks what is left.

   It wraps the sources; it does not rewrite them. What each one works out stays where it
   is (plancheck.js, coachinfo.js and js/coach/insights.js, checkin.js, monthly.js,
   formulas.js, stress.js, missed.js, needs.js), and so do the words: a signal carries
   the source's own data (src) for a page to draw its existing card from. Reads the state;
   no DOM.

   A signal:
     {id        stable: the source's own id (a plan check finding's, a coach insight's),
                or the head's for the rest; used for dismissal and the tests
      domain    training | nutrition | recovery | body | data | setup
      kind      act (changes a plan) | log (asks for data) | info
      pri       0-100, by the bands below
      effect    {volume, load, kcal, protein}, each -1 | 0 | +1: what accepting it does to
                the plan: the weekly sets planned, the loads planned, the calories the plan
                has the person eat (the target, the macros, the meal plan) and the protein
                target. A signal that changes no plan (today's intake, a reminder) is all 0.
      page      where it belongs when it is not the lead: train | food | coach | progress
      source    which provider: plancheck | coach | checkin | monthly | deload | stress |
                missed | needs | food | housekeeping
      src       the source's own data, as it returns it
      parent    for one change of the weekly check-in or the monthly review: that card's id
      title, body, actions   where the source already gives them through t() (the plan
                check's findings); otherwise left to the page that draws the card}

   Priority bands (fixed):
     100     Safety: a health condition or injury rule being broken, calories under the floor
     80-90   Recovery: lighter week due, stress/sleep protocol, pain reported
     60-79   Plan is wrong for the goal: calories vs goal, protein, volume far out of range
     40-59   Adherence: missed sessions, check-in open, monthly review
     20-39   Optimisation: balance the volume, phase change, learned maintenance
     0-19    Housekeeping: backup, weigh-in reminder, name not set

   The conflict rules, each a small pure function over the list (exported, and tested in
   js/engine/test/head.test.js). Rules 1-4 read the same list, the signals not dismissed;
   rule 5 reads what they leave; rule 6 holds what was dismissed. Each says why it took a
   signal out, for headWhy:
     1 recovery      a recovery signal (pri >= 80 that lowers volume or load) is live:
                     nothing that adds volume shows
     2 calories      at most one signal that changes calories: the highest priority
     3 deficit       a deficit is live (kcal-down, kcal-steep, deficit-volume): nothing that
                     adds volume shows; deficit-volume says why
     4 missed        fewer workouts done than planned: "less training than your program has"
                     goes when the missed workouts explain every muscle in it
     5 housekeeping  never leads while anything at 40 or more is live, and one a day
     6 said-once     dismissed (S.pcDismiss, S.coachDismiss, kept as the stores), or put
                     away on its own card ("Still stressed"): not in the queue
     7 lighter       one lighter week, said once: several sources can offer it on the same
                     day (Training's lighter week due, the check-in's, a lift the coach saw
                     getting harder, going backwards or stalled). One shows: a lighter week
                     already running says it, else Training's own card (deload-due), else
                     the highest priority. Read with rules 1-4.

   headNow()      {lead, queue, byPage:{train,food,coach,progress}, count, suppressed}
   headFor(page)  the queue's signals for that page, the lead left out
   headWhy(id)    the rule that took a signal out, or null
   headFresh()    forget the memo: render() asks afresh once a screen
   headOn(page)   what a page draws, in the head's order: the lead first when it is the
                  page's own, then headFor(page). Every signal belongs to one page, so no
                  advice is drawn on two, and the lead tops one page only.
   todayPlan(iso) the Training page's Today card (WP-2): what the day is (state), its
                  session, the lead worth a line in the card, and the at most one other
                  prompt and one housekeeping card the page may draw below it.
   Worked out once per change to the data (dataRev), per day and per hour (the Food
   page's "behind for the time of day" moves with the clock). */
import {checkPlansAll, pcKept, planTotals} from "./plancheck.js";
import {coachAll, coachKept} from "./coachinfo.js";
import {checkinOpen, plannedWeek} from "./checkin.js";
import {monthlyOpen} from "./monthly.js";
import {backupAgeDays, backupDue, deloadDue, inDeload, macroKcal, macroTargets, weighInDue} from "./formulas.js";
import {offPlanLight} from "./blocks.js";
import {followDue, followOn, lightOnPurpose} from "./stress.js";
import {missedNow} from "./missed.js";
import {bodyNeedsOf} from "./needs.js";
import {sumNutrition} from "./intake.js";
import {weeklyVolume} from "../coach/volume.js";
import {addDaysISO, planOn} from "./dayplan.js";
import {swapAdvice} from "./recovery.js";
import {dayNo} from "../coach/util.js";
import {EXDB, muscleOf, secondaryOf} from "../data/exercises.js";
import {isActivity} from "../data/activities.js";
import {t} from "../i18n/dict.js";
import {dataRev, S, split} from "../state.js";
import {num, today} from "../util.js";

var PAGES=["train","food","coach","progress"];
var HOUSE=20,ADHERE=40,RECOVER=80;
function sign(x){return x>0?1:x<0?-1:0;}
function fx(o){o=o||{};return {volume:sign(o.volume||0),load:sign(o.load||0),kcal:sign(o.kcal||0),protein:sign(o.protein||0)};}

/* ---- the plan check (js/engine/plancheck.js), by finding id ----------------------
   Every id checkPlans() can return has a line here (the test reads checkPlans' own
   source, so a finding added there without one fails). "part:" covers every
   "part:<id>". pri and effect may read the finding. */
var PLAN={
  "maint-learned":{domain:"nutrition",pri:34,effect:function(f){return {kcal:num(f.sig&&f.sig[0])-num(f.sig&&f.sig[1])};}},
  "kcal-up":{domain:"nutrition",pri:70,effect:{kcal:-1}},
  "kcal-down":{domain:"nutrition",pri:70,effect:{kcal:1}},
  "kcal-steep":{domain:"nutrition",pri:72,effect:{kcal:1}},
  "kcal-off":{domain:"nutrition",pri:64,effect:function(f){return {kcal:num(f.sig&&f.sig[1])-num(f.sig&&f.sig[0])};}},
  "protein":{domain:"nutrition",pri:66,effect:{protein:1}},
  "meals-off":{domain:"nutrition",pri:60,effect:function(){
    var pt=planTotals(),g=S.goals||{},cur=num(g.kcal),off=pt.kcal-cur;
    return {kcal:Math.abs(off)>cur*0.1?-off:0,protein:num(g.p)&&pt.p-num(g.p)<-num(g.p)*0.15?1:0};}},
  "vol-low":{domain:"training",pri:function(f){return f.sev>=2?38:30;},effect:{volume:1}},
  "vol-high":{domain:"training",pri:32,effect:{volume:-1}},
  "int-str":{domain:"training",pri:34,effect:{load:1}},
  "int-end":{domain:"training",pri:26,effect:{}},
  "mob-none":{domain:"training",pri:62,effect:{}},
  "part:":{domain:"training",pri:60,effect:{volume:1}},
  "phase":{domain:"nutrition",pri:65,effect:function(f){return {kcal:f.fix&&f.fix.goal==="lose"?-1:1};}},
  "deficit-volume":{domain:"nutrition",pri:68,effect:{kcal:1}},
  "surplus-low":{domain:"training",pri:63,effect:{volume:1}},
  "carbs-sport":{domain:"nutrition",pri:30,effect:{}}};
function planMapping(id){return PLAN[id]||(/^part:/.test(id)?PLAN["part:"]:null);}

/* ---- the coach's insights (js/coach/insights.js), by kind ------------------------ */
var COACH={
  fatigue:{domain:"recovery",pri:84,effect:{volume:-1,load:-1}},
  falling:{domain:"recovery",pri:84,effect:{volume:-1,load:-1}},
  stall:{domain:"training",pri:36,effect:{volume:-1,load:-1}},
  deload:{domain:"training",pri:38,kind:"info",effect:{load:-1}},
  over:{domain:"training",pri:62,effect:{volume:-1}},
  under:{domain:"training",pri:42,effect:{volume:1}},
  weak:{domain:"training",pri:22,kind:"info",effect:{}}};

/* ---- the weekly check-in's changes (js/coach/checkin.js), by kind ------------------
   balance is split in two, its muscles under the range and those over it, because they
   pull opposite ways: checkinOpen already does the same split for a week kept light. */
var CHECKIN={
  days:{domain:"training",pri:48,effect:{volume:-1}},
  kcal:{domain:"nutrition",pri:62,effect:function(x){return {kcal:x.by};}},
  deload:{domain:"recovery",pri:82,effect:{volume:-1,load:-1}},
  "balance-low":{domain:"training",pri:34,effect:{volume:1}},
  "balance-high":{domain:"training",pri:34,effect:{volume:-1}},
  eat:{domain:"nutrition",pri:46,kind:"info",effect:{}},
  protein:{domain:"nutrition",pri:46,kind:"info",effect:{}},
  steps:{domain:"body",pri:44,effect:{}}};
/* ---- the monthly review's changes (js/coach/monthly.js), by kind ------------------- */
var MONTHLY={
  days:{domain:"training",pri:47,effect:{volume:-1}},
  emphasis:{domain:"training",pri:30,effect:{}},
  weigh:{domain:"body",pri:44,kind:"log",effect:{}},
  food:{domain:"nutrition",pri:44,kind:"log",effect:{}},
  reassess:{domain:"setup",pri:40,effect:{}}};

function val(v,x){return typeof v==="function"?v(x):v;}
function sig(o){
  return {id:o.id,domain:o.domain,kind:o.kind||"act",pri:o.pri,effect:fx(o.effect),page:o.page,source:o.source,src:o.src,
    parent:o.parent||null,dismissed:!!o.dismissed,quiet:!!o.quiet,title:o.title,body:o.body,actions:o.actions||null,expires:o.expires||null};}

/* ---- the providers: each returns its signals, in its own order ------------------- */
function fromPlans(){
  return checkPlansAll().map(function(f){
    var m=planMapping(f.id);if(!m)return null;
    return sig({id:f.id,domain:m.domain,pri:val(m.pri,f),effect:val(m.effect,f),page:"coach",source:"plancheck",src:f,
      dismissed:pcKept(f),title:f.title,body:f.why,
      actions:[{label:f.fix.label,attr:{"data-pcfix":f.id}},{label:t("Keep it as it is"),attr:{"data-pckeep":f.id}}]});}).filter(Boolean);}
function fromCoach(){
  return coachAll().map(function(c){
    var m=COACH[c.kind];if(!m)return null;
    return sig({id:c.id,domain:m.domain,kind:m.kind,pri:m.pri,effect:m.effect,page:"coach",source:"coach",src:c,dismissed:coachKept(c)});}).filter(Boolean);}
/* The check-in as one card (asks for a look at last week: log), and each change on it. */
function changes(id,r,map,page){
  var out=[];
  (r.changes||[]).forEach(function(x){
    var parts=x.kind==="balance"?[x.low&&x.low.length?"balance-low":null,x.high&&x.high.length?"balance-high":null].filter(Boolean):[x.kind];
    parts.forEach(function(k){var m=map[k];if(!m)return;
      out.push(sig({id:id+":"+k,domain:m.domain,kind:m.kind,pri:m.pri,effect:val(m.effect,x),page:page,source:id,src:x,parent:id}));});});
  return out;}
function fromCheckin(){
  var c=checkinOpen();if(!c)return [];
  return [sig({id:"checkin",domain:"data",kind:"log",pri:50,effect:{},page:"coach",source:"checkin",src:c,expires:c.week})].concat(changes("checkin",c,CHECKIN,"coach"));}
function fromMonthly(){
  var r=monthlyOpen();if(!r)return [];
  return [sig({id:"monthly",domain:"data",kind:"log",pri:52,effect:{},page:"coach",source:"monthly",src:r})].concat(changes("monthly",r,MONTHLY,"coach"));}
/* A lighter week: due (Training's card offers it), or running. A block's planned lighter
   week is drawn by the block's own card (src.planned). */
function fromDeload(){
  if(inDeload())return [sig({id:"deload-on",domain:"recovery",kind:"info",pri:80,effect:{volume:-1,load:-1},page:"train",source:"deload",
    src:{until:S.deload&&S.deload.until||null,planned:!offPlanLight()},actions:[{attr:{"data-deload":"end"}}]})];
  var due=deloadDue();if(!due)return [];
  return [sig({id:"deload-due",domain:"recovery",pri:85,effect:{volume:-1,load:-1},page:"train",source:"deload",src:due,
    actions:[{attr:{"data-deload":"start"}},{attr:{"data-deload":"later"}}]})];}
/* A week kept light on purpose (js/engine/stress.js): said while it holds, asked about
   again when the follow-up is due. "Still stressed" puts the card away (quiet) while the
   week stays light, so it still holds back more volume. */
function fromStress(){
  var p=S.profile||{};if(!lightOnPurpose(p))return [];
  var due=followDue(p),src={stress:p.stress||null,sleep:num(p.sleep)||null,on:followOn(p)||null};
  if(due)return [sig({id:"stress-follow",domain:"recovery",kind:"log",pri:86,effect:{volume:-1},page:"coach",source:"stress",src:src})];
  return [sig({id:"stress-light",domain:"recovery",kind:"info",pri:80,effect:{volume:-1},page:"coach",source:"stress",src:src,quiet:!!p.stressOk})];}
function fromMissed(){
  var r=missedNow();if(!r)return [];
  return [sig({id:"missed",domain:"training",pri:50,effect:{},page:"train",source:"missed",src:r})];}
/* Food's "your body needs" (js/engine/needs.js bodyNeedsOf): today, read from the log
   without creating the day's record. */
function fromNeeds(){
  var now=today(),r=(S.days||{})[now]||{},items=[];
  Object.keys(r.meals||{}).forEach(function(k){items=items.concat((r.meals[k]&&r.meals[k].items)||[]);});
  var b=bodyNeedsOf(sumNutrition(items),S.goals||{},num(r.water),new Date().getHours(),S.sessions,S.days,now);
  if(!b)return [];
  var out=[];
  if(b.focus)out.push(sig({id:"needs-today",domain:"nutrition",kind:"info",pri:44,effect:{},page:"food",source:"needs",src:b,expires:now}));
  if(b.week)out.push(sig({id:"needs-week",domain:"nutrition",kind:"info",pri:b.week.kind==="kept"?20:42,effect:{},page:"food",source:"needs",src:b.week}));
  return out;}
/* The Nutrition plan page's own prompts: the coach's suggested targets when they differ,
   and macros that do not add up to the calories (drawn by js/ui/views/food.js goalCard
   when the head keeps them). Both rank under the plan check's calorie findings: the
   suggestion is the same formula's target that kcal-up/down/steep and phase already offer
   with their reason, and maint-learned says that formula is off for this person; macros
   that do not add up are tidied by whichever target is chosen. So a page prompt speaks
   only when the plan check has no calorie voice. */
function fromFood(){
  var g=S.goals||{},sg=macroTargets(),out=[];
  if(sg&&!(sg.kcal===g.kcal&&sg.p===g.p&&sg.c===g.c&&sg.f===g.f))
    out.push(sig({id:"tg-suggest",domain:"nutrition",pri:33,effect:{kcal:sg.kcal-num(g.kcal),protein:sg.p-num(g.p)},page:"food",source:"food",src:sg}));
  var gap=Math.round(num(g.kcal)-macroKcal(g.p,g.c,g.f));
  if(num(g.kcal)&&Math.abs(gap)>40)
    out.push(sig({id:"macro-gap",domain:"nutrition",pri:24,effect:{kcal:gap},page:"food",source:"food",src:{gap:gap}}));
  return out;}
function fromHouse(){
  var out=[];
  if(backupDue())out.push(sig({id:"backup",domain:"data",pri:10,effect:{},page:"train",source:"housekeeping",src:{age:backupAgeDays()}}));
  var w=weighInDue();
  if(w)out.push(sig({id:"weigh-in",domain:"body",kind:"log",pri:8,effect:{},page:"train",source:"housekeeping",src:w}));
  return out;}
var PROVIDERS=[fromStress,fromDeload,fromPlans,fromCoach,fromCheckin,fromMonthly,fromMissed,fromNeeds,fromFood,fromHouse];

/* What rule 4 needs: workouts done a week against those planned, over the weeks the
   coach's volume reading averages (js/coach/volume.js: the complete weeks before this
   one with a lifting session). */
var VINFO={muscle:muscleOf,secondary:secondaryOf,activity:isActivity};
function weekCtx(){
  var vol=weeklyVolume(S.sessions||[],VINFO,{today:today()}),done=vol.weeks.slice(0,-1).filter(function(w){return w.sessions>0;});
  return {planned:num(plannedWeek(split())),done:done.length?done.reduce(function(a,w){return a+w.sessions;},0)/done.length:0};}

/* ================================================================ the rules ======
   Each takes the signals and returns [{id, why, by}]: what to take out, the rule's name,
   and the signal that made it so. */
function out(list,why,by){return list.map(function(s){return {id:s.id,why:why,by:by};});}

/* 1. Recovery beats progression. */
function ruleRecovery(list){
  var rec=list.filter(function(s){return s.pri>=RECOVER&&(s.effect.volume<0||s.effect.load<0);}).sort(function(a,b){return b.pri-a.pri;})[0];
  if(!rec)return [];
  return out(list.filter(function(s){return s.effect.volume>0;}),"recovery",rec.id);}
/* 2. One calorie voice: the highest priority (the first, at a tie). */
function ruleCalories(list){
  var k=list.filter(function(s){return s.effect.kcal!==0;});
  if(k.length<2)return [];
  var win=k.reduce(function(a,s){return s.pri>a.pri?s:a;},k[0]);
  return out(k.filter(function(s){return s!==win;}),"calories",win.id);}
/* 3. Deficit and volume. */
var DEFICIT=["kcal-down","kcal-steep","deficit-volume"];
function ruleDeficit(list){
  var d=list.filter(function(s){return DEFICIT.indexOf(s.id)>=0;})[0];
  if(!d)return [];
  return out(list.filter(function(s){return s.effect.volume>0;}),"deficit",d.id);}
/* 4. A missed week is not a weak week. ctx {planned, done}: workouts a week. A muscle's
   shortfall is explained when its logged sets, scaled up to the workouts planned, reach
   where growth starts (its mev): it was the workouts that were missing, not the sets. */
function explainedBy(c,ctx){
  if(!(ctx&&ctx.planned>0&&ctx.done<ctx.planned))return [];
  return (c.muscles||[]).filter(function(m){return ctx.done<=0||num(m.avg)*ctx.planned/ctx.done>=num(m.mev);}).map(function(m){return m.m;});}
function ruleMissed(list,ctx){
  return out(list.filter(function(s){
    if(!(s.source==="coach"&&s.src&&s.src.kind==="under"))return false;
    var ms=s.src.muscles||[];return ms.length>0&&explainedBy(s.src,ctx).length===ms.length;}),"missed",null);}
/* 5. Housekeeping: one a day, turn about by the date. Never the lead while something at
   40 or more is live (pickLead). */
function ruleHousekeeping(list,day){
  var h=list.filter(function(s){return s.pri<HOUSE;});
  if(h.length<2)return [];
  var keep=h[((day||0)%h.length+h.length)%h.length];
  return out(h.filter(function(s){return s!==keep;}),"housekeeping",keep.id);}
/* 7. One lighter week. What offers one: Training's card (deload-due, or deload-on while
   one runs), the check-in's change, and the coach's insights whose one button is "Take a
   lighter week" (js/ui/coachwords.js: fatigue, falling, stall). */
var LIGHTER_COACH=["fatigue","falling","stall"];
function isLighter(s){
  return s.id==="deload-due"||s.id==="deload-on"||s.id==="checkin:deload"
    ||(s.source==="coach"&&!!s.src&&LIGHTER_COACH.indexOf(s.src.kind)>=0);}
function ruleLighter(list){
  var l=list.filter(isLighter);
  if(l.length<2)return [];
  var win=l.filter(function(s){return s.id==="deload-on";})[0]||l.filter(function(s){return s.id==="deload-due";})[0]
    ||l.reduce(function(a,s){return s.pri>a.pri?s:a;},l[0]);
  return out(l.filter(function(s){return s!==win;}),"lighter",win.id);}
/* 6. Said once: dismissed in its store, or its card put away. */
function ruleSaidOnce(list){return out(list.filter(function(s){return s.dismissed||s.quiet;}),"said-once",null);}

/* Highest priority first; at a tie, in the order collected. */
function rank(list){
  return list.map(function(s,i){return [s,i];}).sort(function(a,b){return b[0].pri-a[0].pri||a[1]-b[1];}).map(function(x){return x[0];});}
function pickLead(queue){
  var big=queue.some(function(s){return s.pri>=ADHERE;});
  for(var i=0;i<queue.length;i++)if(!(big&&queue[i].pri<HOUSE))return queue[i];
  return null;}

/* The rules over a list of signals, then the ranking. ctx: {planned, done, day}. Pure. */
function decide(signals,ctx){
  ctx=ctx||{};
  var gone={},why=[];
  var take=function(list){list.forEach(function(x){if(!gone[x.id]){gone[x.id]=x;why.push(x);}});};
  take(out(signals.filter(function(s){return s.dismissed;}),"said-once",null));
  var live=signals.filter(function(s){return !s.dismissed;});
  take(ruleRecovery(live));take(ruleCalories(live));take(ruleDeficit(live));take(ruleMissed(live,ctx));take(ruleLighter(live));
  var left=live.filter(function(s){return !gone[s.id];});
  take(ruleHousekeeping(left,ctx.day));
  take(ruleSaidOnce(left));
  var kept=rank(signals.filter(function(s){return !gone[s.id];}));
  /* A check-in's or a review's changes ride on their card: the queue holds the card,
     with the changes still standing (parts). */
  var queue=kept.filter(function(s){return !s.parent;}).map(function(s){
    var parts=kept.filter(function(x){return x.parent===s.id;}).map(function(x){return x.id;});
    return parts.length||signals.some(function(x){return x.parent===s.id;})?Object.assign({},s,{parts:parts}):s;});
  var lead=pickLead(queue),byPage={};
  PAGES.forEach(function(p){byPage[p]=queue.filter(function(s){return s!==lead&&s.page===p;});});
  return {lead:lead,queue:queue,byPage:byPage,count:queue.length,suppressed:why};}

/* ================================================================ the state ======= */
function collect(){
  var all=[],errors=[];
  PROVIDERS.forEach(function(f){
    try{all=all.concat(f());}catch(e){errors.push({provider:f.name,error:String(e&&e.message||e)});}});
  return {signals:all,errors:errors};}

var NONE={lead:null,queue:[],byPage:{train:[],food:[],coach:[],progress:[]},count:0,suppressed:[],errors:[]};
var MEMO={k:null,s:null,v:null};
function headNow(){
  if(!S||!S.onboarded)return NONE;
  var now=today(),k=[dataRev(),now,new Date().getHours(),!!EXDB].join("|");
  if(MEMO.k===k&&MEMO.s===S)return MEMO.v;
  var c=collect(),ctx={day:dayNo(now)},v;
  try{var w=weekCtx();ctx.planned=w.planned;ctx.done=w.done;}catch(e){c.errors.push({provider:"weekCtx",error:String(e&&e.message||e)});}
  v=decide(c.signals,ctx);
  v.errors=c.errors;v.all=c.signals;
  MEMO={k:k,s:S,v:v};
  return v;}
/* Worked out again at the next ask: render() calls it once a screen, so the pages read the
   state as it is even when something changed it without a save (about a millisecond). */
function headFresh(){MEMO={k:null,s:null,v:null};}
function headFor(page){return headNow().byPage[page]||[];}
function headOn(page){
  var h=headNow(),l=h.lead&&h.lead.page===page?[h.lead]:[];
  return l.concat(h.byPage[page]||[]);}
function headWhy(id){
  var x=headNow().suppressed.filter(function(s){return s.id===id;})[0];
  return x?x.why:null;}

/* ================================================================ today (WP-2) ====
   What the top of Training says: what to do now. Read from the head and today's plan; the
   page only draws it.
     state    setup (no assessment yet, and nothing to train: otherwise the day as it is,
              with the assessment as the line) | resume (a workout is open) | none (the program
              has no training days) | done (trained that day) | rest | light (a training
              day inside a lighter week) | train (a session planned, not done) | plan (a
              day still ahead) | past (a day gone with nothing logged)
     session  the day of the program it is ({day, name}), or the session done
     lead     headNow().lead when it is worth leading the day with (pri >= 60). A lighter
              week already running is the card's own status (light), not a lead.
     line     the one prompt drawn inside the card, today only: the assessment when not
              set up, else the lead, else what the
              coach says about today's session (a fresher day), else what Training's own
              signals say (a missed day), else a word on tomorrow
     other    the next of those, drawn as its own card below the day: at most one
     house    the one housekeeping signal the head keeps for the day (backup, weigh-in),
              drawn at the foot of the page
     next     the next session, on a day done or a rest day ({date, name})
     light    the lighter week running ({until, planned}); travel ({until}) likewise
     food     the day's targets the plan sets ({kcal, p}) and what is left of them after
              what is logged that day ({kLeft, pLeft}, never below 0; pLeft null with no
              protein target); null with no calorie target
   Never more than two prompt cards on the page: other and house. */
var LEAD=60;
function nextSession(sp,iso){
  for(var i=1;i<=14;i++){var d=addDaysISO(iso,i),p=planOn(sp,d);
    if(p&&p.day&&!p.rest&&(p.kind==="plan"||p.kind==="today"))return {date:d,name:p.name,day:p.day};}
  return null;}
/* Tomorrow, from today: the fresher day the coach would train instead, or, in a rotation
   changed by hand today, what tomorrow follows on with. */
function aheadOf(sp,iso){
  var tm=addDaysISO(iso,1),p1=planOn(sp,tm),s=swapAdvice(sp,tm,p1);
  if(s)return {kind:"swap",id:"ahead"+iso,swap:s,date:tm,ahead:true};
  var p0=planOn(sp,iso);
  if(sp.schedule!=="week"&&S.daySwap&&S.daySwap[iso]&&p0.swapped&&p0.day&&p1&&p1.day&&!p1.rest)
    return {kind:"note",id:"ahead"+iso,from:p0.day.name,to:p1.day.name,date:tm};
  return null;}
function foodOn(iso,g){
  if(!(num(g.kcal)>0))return null;
  var r=(S.days||{})[iso]||{},items=[];
  Object.keys(r.meals||{}).forEach(function(k){items=items.concat((r.meals[k]&&r.meals[k].items)||[]);});
  var e=sumNutrition(items),p=num(g.p)||null;
  return {kcal:num(g.kcal),p:p,kLeft:Math.max(0,Math.round(num(g.kcal)-e.kcal)),pLeft:p?Math.max(0,Math.round(p-e.p)):null};}
function todayPlan(iso){
  var now=today();iso=iso||now;
  var isNow=iso===now,sp=split(),g=S.goals||{};
  var r={date:iso,state:null,session:null,plan:null,lead:null,line:null,other:null,house:null,next:null,light:null,travel:null,
    food:foodOn(iso,g)};
  /* Not set up: the assessment is the card only when there is nothing else to do today (no
     workout open, no program with training days); otherwise the day is drawn as it is and
     the assessment is the card's line. */
  var setup=!S||!S.onboarded;
  if(setup&&!S.active&&!(sp&&(sp.days||[]).some(function(d){return d.ex&&d.ex.length;}))){r.state="setup";return r;}
  var h=headNow(),train=headOn("train");
  r.house=train.filter(function(s){return s.source==="housekeeping";})[0]||null;
  var p=sp?planOn(sp,iso):{kind:"none"};r.plan=p;
  if(isNow&&S.active)r.state="resume";
  else if(p.kind==="none")r.state="none";
  else if(p.kind==="done")r.state="done";
  else if(p.kind==="past")r.state="past";
  else if(p.rest)r.state="rest";
  else r.state=!isNow?"plan":inDeload()?"light":"train";
  if(r.state==="resume")r.session={name:S.active.dayName,day:null};
  else if(p.kind==="done")r.session={name:p.name,day:p.day||null,done:p.session};
  else if(p.day&&!p.rest)r.session={name:p.name,day:p.day};
  if(sp&&(r.state==="done"||r.state==="rest"))r.next=nextSession(sp,iso);
  var on=h.queue.filter(function(s){return s.id==="deload-on";})[0];
  if(on)r.light={until:on.src.until,planned:!!on.src.planned};
  var tv=S.travel;if(tv&&tv.until&&now<=tv.until)r.travel={until:tv.until};
  var l=h.lead;r.lead=l&&l.pri>=LEAD&&l.id!=="deload-on"?l:null;
  /* What may be said, in order; the first is the card's line, the next its one other card. */
  var says=[];
  if(isNow&&setup)says.push({kind:"setup",id:"setup"});
  if(isNow&&r.lead)says.push({kind:"lead",id:r.lead.id,sig:r.lead});
  var sw=sp&&(r.state==="train"||r.state==="light"||r.state==="plan")?swapAdvice(sp,iso,p):null;
  if(sw)says.push({kind:"swap",id:"reco"+iso,swap:sw,date:iso});
  if(isNow)train.forEach(function(s){
    if(s===r.lead||s.source==="housekeeping"||s.id==="deload-on")return;
    says.push({kind:"sig",id:s.id,sig:s});});
  if(isNow&&sp){var a=aheadOf(sp,iso);if(a)says.push(a);}
  if(isNow&&r.state!=="setup"){r.line=says[0]||null;r.other=says[1]||null;}
  else r.other=says[0]||null;
  return r;}

export {COACH, CHECKIN, decide, headFor, headFresh, headNow, headOn, headWhy, isLighter, MONTHLY, pickLead, PLAN, planMapping, rank, ruleCalories,
  ruleDeficit, ruleHousekeeping, ruleLighter, ruleMissed, ruleRecovery, ruleSaidOnce, todayPlan};
