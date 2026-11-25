/* Bunyan — the coach's answers: the weekly check-in and the month (js/ui/answers/answers.js gathers them;
   road map step 4, 25 Nov: split by topic as they were, no answer's words or figures changed). */
import {t} from "../../i18n/dict.js";
import {act, fill, l, list, n, p, src} from "./kit.js";
import {exName} from "../../i18n/exnames.js";
import {actInfo, isActivity} from "../../data/activities.js";
import {addDays as addDaysW, weekStartOf} from "../../engine/schedule.js";
import {bestE1RM, recommend, sessionVolume} from "../../engine/formulas.js";
import {sumNutrition} from "../../engine/nutrition.js";
import {S, split} from "../../state.js";
import {fmtW} from "../../units.js";
import {fmtN, num, today} from "../../util.js";
import {blockNow, phaseNow} from "../../engine/blocks.js";
import {stageFor, zonesFor} from "../../engine/zones.js";
import {COND_LABEL, condLines, rulesFor} from "../../engine/conditions.js";
import {checkinOpen} from "../../engine/checkin.js";
import {ckChange, moChange, moFacts} from "../checkin.js";
import {lastMonth, monthlyNow} from "../../engine/monthly.js";
import {lifts, told} from "./route.js";
import {range} from "./ans-know.js";

/* ---- the weekly check-in ------------------------------------------------------------
   A week from the person's own log: the last one, in the first two days of a new week,
   otherwise this one so far. Workouts against the plan, sets and volume against the
   week before, protein days, the weight's average against the week before, lifts that
   beat their best; each line only where the log has the data. Then one thing to change. */
function weekSpan(){
  var n=today(),ws=weekStartOf(n),last=addDaysW(n,-1)<=ws&&n<=addDaysW(ws,1);
  var from=last?addDaysW(ws,-7):ws,to=last?addDaysW(ws,-1):n;
  return {from:from,to:to,last:last,prevFrom:addDaysW(from,-7),prevTo:addDaysW(from,-1)};}
function inSpan(d,a,b){return d>=a&&d<=b;}
/* In a workout, the workout first (owner, 3 Nov: "when I chat in a live session, most
   probably I need something within this session; that should be the priority unless I say
   something not related"). The exercise on screen: what is asked of it now, where the
   person is in it, the weight to use, the rest and tempo, what comes next, and what can be
   asked. */
function aLive(a){
  var A0=S.active,i=Math.min(A0.idx||0,A0.entries.length-1),e=A0.entries[i];
  if(!e){p(a,t("Your workout is on. Ask me about the exercise on screen."));return a;}
  var pl=e.planned||{},done=(e.sets||[]).filter(function(x){return !x.wu;}).length;
  p(a,fill(t("Now: {ex}, set {n} of {s}."),{ex:exName(e.name),n:Math.min(done+1,pl.sets||done+1),s:pl.sets||"?"}));
  var L2=[];
  if(isActivity(e.name))L2.push(fill(t("{m} min, effort {r} of 10"),{m:pl.min||30,r:pl.rpe||6}));
  else{
    if(pl.lo||pl.hi)L2.push(fill(t("Target {r} reps"),{r:pl.lo&&pl.hi&&pl.lo!==pl.hi?pl.lo+"–"+pl.hi:(pl.hi||pl.lo)})+(pl.rir!=null?", "+fill(t("{n} in reserve"),{n:pl.rir}):""));
    var rc=null;try{rc=recommend(e);}catch(err){rc=null;}
    if(rc&&rc.w)L2.push(fill(t("Weight: {w}"),{w:fmtW(rc.w)})+(rc.note?" — "+t(rc.note):""));
    if(e.rest)L2.push(fill(t("Rest {s} s between sets"),{s:e.rest}));
    var tmp=pl.tempo&&(pl.tempo.match(/[\dX]-[\dX]-[\dX]-[\dX]/)||[""])[0];if(tmp)L2.push(fill(t("Tempo {t}"),{t:tmp}));}
  l(a,L2);
  var nx=A0.entries[i+1];if(nx)n(a,fill(t("Then {ex}."),{ex:exName(nx.name)}));
  n(a,t("Ask me to fit the reps, swap it if the machine is taken, or how to do it."));
  act(a,t("How to do it"),{"data-exdetail":e.name});
  return a;}
/* The phase this block runs, what it asks and why, and what comes next (engine/phase.js). */
var PHASE_LINE={1:"Lighter loads, slow and controlled: movement quality, joint stability and endurance first. Progress by control, not weight.",
  2:"More strength in the main movers while keeping the stability you built.",3:"More sets in the growth range: building muscle.",
  4:"Heavy, low-rep work on the big lifts: the most force you can make.",5:"Heavy lifts paired with fast, light ones: strength turned into speed."};
function aPhase(a){
  var b=blockNow(),ph=phaseNow();
  if(!b||!ph){p(a,t("Training blocks are off, so there is no phase. Turn them on in Settings to train in phases."));return a;}
  p(a,fill(t("Block {b}, week {w} of {n}: {p}."),{b:b.block,w:b.week,n:b.of,p:t(ph.name)}));
  p(a,t(PHASE_LINE[ph.n]||""));
  var tmp=(ph.tempo.match(/[\dX]-[\dX]-[\dX]-[\dX]/)||[""])[0];
  l(a,[fill(t("{a}–{b} reps a set"),{a:ph.reps.min,b:ph.reps.max})].concat(tmp?[fill(t("Tempo {t}: seconds lowering, pausing, lifting, pausing"),{t:tmp})]:[]));
  if(ph.seq.length>1)n(a,fill(t("Your goal runs {s}, then round again. Next block: {p}."),{s:ph.seq.map(function(x){return x;}).join(" → "),p:t(PHASE_NAME_CHAT[ph.seq[b.block%ph.seq.length]])}));
  src(a,"phases 13.3");
  return a;}
var PHASE_NAME_CHAT={1:"Stabilisation endurance",2:"Strength endurance",3:"Muscular development",4:"Maximal strength",5:"Power"};
/* The cardio stage and zones (engine/zones.js), as Cardio & Sports shows them. */
function aZones(a){
  var pz=S.profile||{},z=zonesFor(pz),st=stageFor(pz,S.sessions,today(),{cardio:function(nm){var x=actInfo(nm);return !!(x&&x.grp==="Cardio");}});
  p(a,fill(t("You are at cardio stage {n}."),{n:st.stage}));
  if(z.feelOnly)p(a,t("Your medication can change your heart rate, so go by feel and the talk test, not a number."));
  l(a,z.rows.filter(function(r){return r.zone<=Math.max(2,st.stage);}).map(function(r){
    var fig=r.min||r.max?(r.min&&r.max?r.min+"–"+r.max:r.min?r.min+"+":"<"+(r.max+1))+" "+t("bpm"):fill(t("RPE {a}–{b}"),{a:r.rpe.min,b:r.rpe.max});
    return fill(t("Zone {n}"),{n:r.zone})+": "+fig;}));
  if(!z.measured&&!z.feelOnly)n(a,t("These are by feel until you do the talk test: it finds the heart rate where talking gets hard, and your zones follow from it."));
  act(a,t(z.measured?"Change your zones":"Find your zones"),{"data-zones":"1"});
  src(a,"cardio 15.4");
  return a;}
/* What the person's health conditions change in the plan (engine/conditions.js). */
function aHealth(a){
  var R=rulesFor(S.profile);
  if(!R){p(a,t("You haven't told me about a health condition. If a doctor has, add it in the assessment's health step: the plan then follows the guidelines for it."));
    act(a,t("Open the health step"),{"data-setupstep":"health"});return a;}
  p(a,fill(t("Your plan is adjusted for: {c}."),{c:R.ids.map(function(i){return t(COND_LABEL[i]).toLowerCase();}).join(S.prefs.lang==="ar"?"، ":", ")}));
  l(a,condLines(R,S.profile).map(function(x){var s0=t(x[0]);Object.keys(x[1]).forEach(function(k){s0=s0.replace("{"+k+"}",x[1][k]);});return s0;}));
  n(a,t("From the guidelines for training with each one. Your doctor's advice comes first; stop and get checked if anything feels wrong."));
  return a;}
function aWeek(a){
  var w=weekSpan(),ss=S.sessions||[],G=S.goals||{};
  var wk=ss.filter(function(s){return inSpan(s.date,w.from,w.to);}),pv=ss.filter(function(s){return inSpan(s.date,w.prevFrom,w.prevTo);});
  var sets=function(list){var c=0;list.forEach(function(s){(s.entries||[]).forEach(function(e){(e.sets||[]).forEach(function(x){if(!x.wu)c++;});});});return c;};
  var vol=function(list){return list.reduce(function(t0,s){return t0+sessionVolume(s);},0);};
  var plan=num(S.profile.days)||split().days.filter(function(d){return d.ex.length;}).length;
  p(a,t(w.last?"Last week, from your log:":"This week so far, from your log:"));
  var L=[];
  L.push(fill(t(plan?"Workouts: {n} of {p} planned":"Workouts: {n}"),{n:wk.length,p:plan}));
  if(wk.length){var s1=sets(wk),s0=sets(pv),v1=vol(wk),v0=vol(pv);
    L.push(fill(t("Working sets: {n}"),{n:s1})+(pv.length?" ("+fill(t("{n} the week before"),{n:s0})+")":""));
    if(v1)L.push(fill(t("Volume: {v}"),{v:fmtW(v1)})+(v0?" ("+(v1>=v0?"+":"−")+Math.round(Math.abs(v1-v0)/v0*100)+"%)":""));}
  /* Protein: the days food was logged, and how many of them reached the target. */
  var logged=0,hit=0;
  for(var d=w.from;d<=w.to;d=addDaysW(d,1)){var r=S.days&&S.days[d];if(!r||!r.meals)continue;
    var it=[];Object.keys(r.meals).forEach(function(k){(r.meals[k].items||[]).forEach(function(i){it.push(i);});});
    if(!it.length)continue;logged++;if(G.p&&sumNutrition(it).p>=G.p*0.9)hit++;}
  if(logged&&G.p)L.push(fill(t("Protein: on target {h} of the {n} days you logged food"),{h:hit,n:logged}));
  /* Weight: the week's average against the week before's, both from weigh-ins. */
  var avg=function(x,y){var b=(S.body||[]).filter(function(e){return e&&e.weight&&inSpan(e.date,x,y);});
    return b.length?b.reduce(function(t0,e){return t0+num(e.weight);},0)/b.length:0;};
  var aw=avg(w.from,w.to),ap=avg(w.prevFrom,w.prevTo);
  if(aw&&ap)L.push(fill(t("Weight: {w} average, {d} on the week before"),{w:fmtW(aw),d:(aw-ap>=0?"+":"−")+fmtW(Math.abs(aw-ap))}));
  /* Lifts that beat their best estimated max from before the week. */
  var beat=[];
  wk.forEach(function(s){(s.entries||[]).forEach(function(e){
    var now1=bestE1RM(e.sets||[],e.name,s.date);if(!now1)return;
    var before=0;ss.forEach(function(o){if(o.date>=w.from)return;(o.entries||[]).forEach(function(x){if(x.name===e.name){var b=bestE1RM(x.sets||[],x.name,o.date);if(b>before)before=b;}});});
    if(before&&now1>before&&beat.indexOf(e.name)<0)beat.push(e.name);});});
  if(beat.length)L.push(fill(t("New bests: {list}"),{list:beat.slice(0,3).map(exName).join(", ")}));
  l(a,L);
  /* One thing to change, the first that applies. */
  var tip;
  if(w.last&&plan&&wk.length<plan)tip=fill(t("This week, get all {p} workouts in: the plan only works if it's trained."),{p:plan});
  if(!tip&&logged<4)tip=t("Log your food on more days. With four or more a week I can tell whether your targets fit.");
  if(!tip&&G.p&&hit<logged*0.7)tip=fill(t("Protein is the gap: {g} g a day. Put some in every meal rather than catching up at night."),{g:fmtN(G.p)});
  if(!tip&&!beat.length&&wk.length)tip=t("Push a little where last week's sets felt easy: one more rep, or the next weight up.");
  if(!tip)tip=t("Keep it as it is: it's working.");
  p(a,tip);
  S.ckSeen=weekStartOf(today());
  /* Last week's check-in: the changes it proposes, one tap each (js/engine/checkin.js). */
  var ck=checkinOpen();
  if(ck&&ck.changes.length){if(!w.last)p(a,t("From last week's check-in:"));ck.changes.forEach(function(x){var c=ckChange(x);p(a,c.text);act(a,c.btn,{"data-ckdo":x.kind});});return a;}
  return act(a,t("Open Progress"),{"data-tab":"progress"});}

/* The month that ended (js/engine/monthly.js), said as the Coach page's card says it:
   the facts, then each change with its one tap. */
function aMonth(a){
  var r=monthlyNow(lastMonth(today()));
  if(!r){p(a,t("Not enough was logged last month to review it yet. A few workouts and weigh-ins, and the next one has something to read."));return act(a,t("Open Progress"),{"data-tab":"progress"});}
  l(a,moFacts(r));
  var did=S.moDid&&S.moDid.m===r.month?S.moDid.k||[]:[],ch=r.changes.filter(function(x){return did.indexOf(x.kind)<0;});
  if(!ch.length){p(a,t("A good month: nothing to change. Keep going as you are."));return a;}
  ch.forEach(function(x){var c=moChange(x);p(a,c.text);act(a,c.btn,{"data-modo":x.kind});});
  return a;}

export {PHASE_LINE, PHASE_NAME_CHAT, aHealth, aLive, aMonth, aPhase, aWeek, aZones, inSpan, weekSpan};
