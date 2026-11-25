/* Bunyan — the coach's answers: answers that take what the sentence names (js/ui/answers/answers.js gathers them;
   road map step 4, 25 Nov: split by topic as they were, no answer's words or figures changed). */
import {t, tm} from "../../i18n/dict.js";
import {act, fill, foods, l, n, p, rd, src, uiLang} from "./kit.js";
import {exName, planName} from "../../i18n/exnames.js";
import {isActivity} from "../../data/activities.js";
import {fold} from "../../coach/intent.js";
import {addDays as addDaysW, wdName} from "../../engine/schedule.js";
import {EXDB, exSteps, movementOfEx, muscleOf} from "../../data/exercises.js";
import * as KB from "../../engine/kb.js";
import {canUndo} from "../handlers/actions.js";
import {bwShare, e1RM, inDeload, loadText, recommend} from "../../engine/formulas.js";
import {mealName} from "../../engine/meals.js";
import {sumNutrition} from "../../engine/nutrition.js";
import {S, split} from "../../state.js";
import {fmtW} from "../../units.js";
import {fmtN, num, pretty, r1, today} from "../../util.js";
import {doseText} from "../dose.js";
import {estMinutes, planOn} from "../../engine/dayplan.js";
import {BUILT as BUILTID, limitsOf, standIn, usable} from "../../engine/plan.js";
import {TOPIC} from "../views/chat.js";
import {GROUPOF, KITOF, WHYKIND, lifts, readAs} from "./route.js";
import {inSpan, weekSpan} from "./ans-checkin.js";
import {aBalance, aStrong} from "./ans-training.js";
import {itemName} from "./ans-food.js";
import {lastNights, mode} from "./ans-know.js";
import {kcalOn} from "./ans-report.js";

/* ---- answers that take what the sentence names (js/coach/understand.js, C-3) --------
   Each reads it.reading: the exercise, the day or span, the muscle, the minutes and
   kit that were said, so "best squat" is the squat, "ate yesterday" is yesterday. Every
   figure is from the log; where the log has nothing, the answer says so. */
function rdEx(it){var e=rd(it).entities.exercise[0];return e&&e.name?e.name:"";}
/* A said day as a date: yesterday, the day before, or the last such weekday. */
function rdDate(day){
  var n=today();if(!day)return n;
  if(day.when==="yesterday")return addDaysW(n,-1);if(day.when==="daybefore")return addDaysW(n,-2);
  if(day.when==="tomorrow")return addDaysW(n,1);if(day.when==="ago")return addDaysW(n,-day.n);
  if(day.when==="weekday"){for(var i=day.last?1:0;i<8;i++){var d=addDaysW(n,-i),wd=new Date(d+"T00:00:00").getDay()||7;if(wd===day.n&&(i>0||!day.last))return d;}}
  return n;}
function dayName(iso){var n=today();return iso===n?t("today"):iso===addDaysW(n,-1)?t("yesterday"):pretty(iso);}
/* The working sets of one exercise, newest session first: [{date, sets:[{w,r,rpe}]}]. */
function setsFor(name){
  var out=[];(S.sessions||[]).forEach(function(s){(s.entries||[]).forEach(function(e){
    if(e.name!==name)return;var w=(e.sets||[]).filter(function(x){return !x.wu&&(num(x.r)>0||num(x.w)>0);});
    if(w.length)out.push({date:s.date,sets:w});});});
  return out.sort(function(a,b){return a.date<b.date?1:a.date>b.date?-1:0;});}
function topOf(sets,name){
  var bw=bwShare(name)>0,best=null,be=-1;
  sets.forEach(function(x){var e=bw?num(x.r):e1RM(num(x.w),num(x.r),num(x.rpe));if(e>be){be=e;best=x;}});
  return best?{w:num(best.w),r:num(best.r),e:bw?0:be}:null;}
function setText(name,x){return num(x.w)?loadText(name,x.w)+" × "+num(x.r):num(x.r)+" "+t("reps");}
function maxText(name,x){return x.e&&x.r>1&&x.r<=12?" · "+fill(t("about {e} for one (estimated)"),{e:fmtW(x.e)}):"";}
function aRecord(a,q,it){
  var R=rd(it),name=rdEx(it);
  if(!name)return aStrong(a);
  var log=setsFor(name),nm=exName(name);
  if(!log.length){p(a,fill(t("There's no {ex} in your log yet. Once you log it, I can tell you its best and how it's moving."),{ex:nm}));
    return act(a,t("Open Training"),{"data-tab":"train"});}
  var all=[];log.forEach(function(s){s.sets.forEach(function(x){all.push(Object.assign({date:s.date},x));});});
  if(R.mode==="last"){
    var ls=log[0];
    p(a,fill(t("Last time you did {ex}, {d}:"),{ex:nm,d:dayName(ls.date)}));
    l(a,ls.sets.map(function(x){return setText(name,x);}));}
  else if(R.mode==="trend"||R.mode==="down"){
    var span=R.entities.period==="month"||R.entities.period==="lastmonth"?28:7,n0=today();
    var from=addDaysW(n0,-(span-1)),pf=addDaysW(from,-span),pt=addDaysW(from,-1);
    var cur=log.filter(function(s){return s.date>=from;}),bef=log.filter(function(s){return s.date>=pf&&s.date<=pt;});
    var tc=topOf([].concat.apply([],cur.map(function(s){return s.sets;})),name),tb=topOf([].concat.apply([],bef.map(function(s){return s.sets;})),name);
    var lbl=t(span===7?"the last 7 days":"the last 4 weeks"),lblb=t(span===7?"the 7 days before":"the 4 weeks before");
    if(!tc)p(a,fill(t("No {ex} logged in {span}."),{ex:nm,span:lbl}));
    else{
      p(a,fill(t("{ex} in {span}: best set {s}{m}."),{ex:nm,span:lbl,s:setText(name,tc),m:maxText(name,tc)}));
      if(tb){var d=tc.e&&tb.e?Math.round((tc.e-tb.e)*10)/10:tc.r-tb.r;
        p(a,fill(t("In {span}: {s}{m}."),{span:lblb,s:setText(name,tb),m:maxText(name,tb)})+" "
          +(Math.abs(d)<0.5?t("About the same."):d>0?t("Up on the weeks before."):t("Down on the weeks before.")));}
      else p(a,fill(t("Nothing logged in {span} to compare with."),{span:lblb}));}}
  else{
    var b=topOf(all,name),bd=all.filter(function(x){return num(x.w)===b.w&&num(x.r)===b.r;})[0];
    p(a,fill(t("Your best {ex}: {s} on {d}{m}."),{ex:nm,s:setText(name,b),d:pretty(bd.date),m:maxText(name,b)}));
    var hv=all.slice().sort(function(x,y){return num(y.w)-num(x.w)||num(y.r)-num(x.r);})[0];
    if(num(hv.w)>b.w)n(a,fill(t("Heaviest set: {s}."),{s:setText(name,hv)}));
    if(b.e)n(a,t("The one-rep max is worked out from the set (Epley), not lifted."));}
  return act(a,t("Open Progress"),{"data-tab":"progress"});}
function aTechnique(a,q,it){
  var name=rdEx(it)||(S.active&&S.active.entries[S.active.idx||0]||{}).name||"";
  if(!name){p(a,t("Which exercise? Say its name, like “how do I do a squat”."));return a;}
  var st=exSteps(name)||[];
  if(st.length){p(a,fill(t("{ex}:"),{ex:exName(name)}));l(a,st.slice(0,5));}
  else p(a,fill(t("The guide for {ex} has the steps and the common mistakes."),{ex:exName(name)}));
  return act(a,t("How to do it"),{"data-exdetail":name});}
function aFoodDay(a,q,it){
  var iso=rdDate(rd(it).entities.day),r=S.days[iso],all=[],lines=[];
  if(r&&r.meals)Object.keys(r.meals).forEach(function(k){var items=(r.meals[k].items||[]);
    if(items.length){lines.push(mealName(k)+": "+foods(items.map(itemName)));items.forEach(function(x){all.push(x);});}});
  if(!all.length){p(a,fill(t("Nothing was logged {d}."),{d:dayName(iso)}));return act(a,t("Open Food"),{"data-tab":"food"});}
  var tot=sumNutrition(all);
  p(a,fill(t("What you logged {d}: {k} kcal and {p} g of protein."),{d:dayName(iso),k:fmtN(Math.round(tot.kcal)),p:Math.round(tot.p)}));
  l(a,lines);
  return act(a,t("Open Food"),{"data-tab":"food"});}
function aDay(a,q,it){
  var iso=rdDate(rd(it).entities.day),ss=(S.sessions||[]).filter(function(s){return s.date===iso;});
  if(!ss.length){p(a,fill(t("No workout was logged {d}."),{d:dayName(iso)}));return act(a,t("Open Training"),{"data-tab":"train"});}
  ss.forEach(function(s){
    var ex=(s.entries||[]).filter(function(e){return (e.sets||[]).some(function(x){return !x.wu;});});
    p(a,fill(t("{d}: {w}, {n} exercises."),{d:cap1(dayName(iso)),w:planName(s.dayName||t("Workout")),n:ex.length}));
    l(a,ex.slice(0,8).map(function(e){var w=e.sets.filter(function(x){return !x.wu;}),tp=topOf(w,e.name);
      return exName(e.name)+": "+w.length+" × · "+(tp?setText(e.name,tp):"");}));});
  return act(a,t("View session"),{"data-openday":iso});}
function cap1(s){s=String(s||"");return s.charAt(0).toUpperCase()+s.slice(1);}
function aVolume(a,q,it){
  var R=rd(it),mus=R.entities.muscle[0];
  if(!mus)return aBalance(a);
  var want=GROUPOF[mus]||[mus],ws=weekSpan(),n2=0,k=0;
  (S.sessions||[]).forEach(function(s){if(!inSpan(s.date,ws.from,ws.to))return;var any=false;
    (s.entries||[]).forEach(function(e){var m=e.muscle||muscleOf(e.name);if(want.indexOf(m)<0)return;
      var c=(e.sets||[]).filter(function(x){return !x.wu;}).length;if(c){n2+=c;any=true;}});if(any)k++;});
  var span=t(ws.last?"last week":"this week");
  p(a,n2?fill(t(k===1?"{n} working sets of {m} {w}, in 1 session.":"{n} working sets of {m} {w}, in {k} sessions."),{n:n2,m:tm(mus),w:span,k:k})
    :fill(t("No working sets of {m} logged {w}."),{m:tm(mus),w:span}));
  return act(a,t("Open Progress"),{"data-tab":"progress"});}
/* Tired most of the time: what the log says about sleep and food this week, and the
   referral when it does not lift (js/knowledge/scope.js, refer_undiagnosed). */
function aTired(a){
  var nights=lastNights(),days=[],g=S.goals||{};
  for(var i=1;i<=7;i++){var k=kcalOn(addDaysW(today(),-i));if(k>0)days.push(k);}
  p(a,t("Tired most of the time is something to look at over weeks, not one day."));
  var ev=[];
  if(nights.length)ev.push(fill(t("You logged {h} hours a night on average over your last {n} nights."),{h:r1(nights.reduce(function(x,y){return x+y;},0)/nights.length),n:nights.length}));
  if(days.length&&num(g.kcal))ev.push(fill(t("Food logged on {n} of the last 7 days: about {k} kcal a day, against a target of {t}."),{n:days.length,k:fmtN(Math.round(days.reduce(function(x,y){return x+y;},0)/days.length)),t:fmtN(g.kcal)}));
  if(ev.length)l(a,ev);else p(a,t("Your log has no sleep or food for the last week, so I can't see a cause in it."));
  p(a,t("If it goes on, see a doctor: tiredness that doesn't lift can have a cause I can't check."));
  src(a,(KB.scopeRule("refer_undiagnosed")||{}).src);
  return act(a,t("Log sleep and energy"),{"data-sheet":"recovery"});}
/* The program's own of it: that exercise, else the one of its family the program has
   ("squat" asked, the Hack Squat in the program). */
function whyEntry(name,key){
  var hit=null,kw=String(key||"").toLowerCase().split(" ").filter(Boolean);
  split().days.forEach(function(d){d.ex.forEach(function(e){if(!hit&&e.name===name)hit={d:d,e:e};});});
  if(!hit&&kw.length)split().days.forEach(function(d){d.ex.forEach(function(e){var ln=e.name.toLowerCase();
    if(!hit&&!isActivity(e.name)&&kw.every(function(w){return ln.indexOf(w.replace(/s$/,""))>=0;}))hit={d:d,e:e};});});
  return hit;}
/* The last session's best set of an exercise, from the log: "80 × 8", or "". */
function lastBest(name){
  var s=(S.sessions||[]).filter(function(x){return (x.entries||[]).some(function(e){return e.name===name&&(e.sets||[]).length;});})
    .sort(function(a,b){return a.date<b.date?1:-1;})[0];
  if(!s)return "";var e=s.entries.filter(function(x){return x.name===name;})[0],top=null;
  e.sets.forEach(function(x){if(!x.wu&&(!top||num(x.w)>num(top.w)))top=x;});
  return top?(num(top.w)?fmtW(num(top.w))+" × ":"")+num(top.r):"";}
function aWhy(a,q,it){
  var fq=fold(q||""),name=rdEx(it),act0=S.active&&S.active.entries[S.active.idx||0],ex0=rd(it).entities.exercise[0],key=ex0&&ex0.key||"";
  if(!name&&act0&&/(this|that|ده|دي)/.test(fq))name=act0.name;
  /* The program's own of the family asked about, for an exercise or its weight. */
  var own=name?whyEntry(name,key):null;
  /* Only when the one named isn't itself logged: "the weight for squat 80 kg" is the
     squat they logged at 80, not the program's Hack Squat. */
  if(own&&own.e.name!==name&&!(act0&&act0.name===name)){if(WHYKIND.load.test(fq)&&lastBest(name))own=null;else name=own.e.name;}
  /* A weight. */
  if(name&&WHYKIND.load.test(fq)){
    var w=own,pe=act0&&act0.name===name?act0.planned:w?{lo:w.e.lo,hi:w.e.hi,sets:w.e.sets}:null;
    var rc=pe?recommend({name:name,planned:pe}):null;
    if(rc&&rc.note){
      p(a,(rc.w?fill(t("{ex}: {w} next."),{ex:exName(name),w:fmtW(rc.w)})+" ":"")+t(rc.note));
      if(rc.last)n(a,fill(t("From your last session's best set: {s}."),{s:rc.last}));
      return act(a,t("Open Training"),{"data-tab":"train"});}
    if(pe&&!rc){p(a,fill(t("{ex} has nothing logged yet, so there is no suggestion to explain: find a weight you can control for the planned reps."),{ex:exName(name)}));return a;}
    if(!pe){var lb=lastBest(name);
      p(a,fill(t("{ex} isn't in your program, so the app doesn't suggest a weight for it."),{ex:exName(name)})+(lb?" "+fill(t("Your last best set of it: {s}."),{s:lb}):""));
      return a;}}
  /* A lighter day. */
  if(WHYKIND.light.test(fq)&&!name){
    if(inDeload()){
      var until=S.deload&&S.deload.until;
      p(a,t("This is a lighter week: fewer sets and about 10% less weight, so you recover and come back stronger.")+(until?" "+fill(t("It runs until {d}."),{d:pretty(until)}):" "+t("It is the planned lighter week of your training block.")));
      return act(a,t("Open Training"),{"data-tab":"train"});}
    var pl0=planOn(split(),today());
    p(a,pl0.day&&!pl0.rest?fill(t("Today isn't lighter: it is {d}, as your program plans it."),{d:planName(pl0.day.name)}):t("Today is a rest day."));
    return a;}
  /* An exercise. */
  if(name&&(WHYKIND.choice.test(fq)||!WHYKIND.day.test(fq))){
    var we=own,sp=split(),v=EXDB&&EXDB[name]||{};
    if(we){
      p(a,fill(t("{ex} is in {d} to train your {m}, with a {mv} movement."),{ex:exName(name),d:planName(we.d.name),m:tm(muscleOf(name)).toLowerCase(),mv:t(movementName(name))}));
      if(v.e)n(a,fill(t("It uses {k}, which your kit has."),{k:t(v.e).toLowerCase()}));
      n(a,sp&&sp.from==="built"||sp&&sp.id===BUILTID?t("Your program was built for you from your assessment: your goal, days, time and kit."):fill(t("It came with the {p} program."),{p:planName(sp.name)}));
      return act(a,t("Swap it"),{"data-chatsay":uiLang()==="ar"?"بدل "+exName(name):"swap "+name+" for"});}
    p(a,fill(t("{ex} isn't in your program."),{ex:exName(name)}));return a;}
  /* "Why this exercise?" with none on screen: which one. */
  if(!name&&WHYKIND.choice.test(fq)){p(a,t("Which exercise? Say its name, like “why is Leg Press in my program?”."));return a;}
  /* Today's day. */
  if(WHYKIND.day.test(fq)){
    var sp2=split(),pl=planOn(sp2,today());
    if(pl.day&&!pl.rest&&pl.kind!=="done"){
      p(a,sp2.schedule==="week"?fill(t("{d} is on {w} in your program."),{d:planName(pl.day.name),w:t(WDNAME[isoWeekdayOf(today())])})
        :fill(t("{d} is next in your program's rotation: the days come round in order, whatever the weekday."),{d:planName(pl.day.name)}));
      return act(a,t("Change workout"),{"data-tab":"train"});}}
  p(a,t("The app suggested it from your recent sessions, but I can't show the working for this one yet."));
  n(a,t("The weight for each set is on the workout page, next to the set."));
  return act(a,t("Open Training"),{"data-tab":"train"});}
var WDNAME=["","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
function isoWeekdayOf(iso){return new Date(iso+"T00:00:00").getDay()||7;}
function movementName(n){var m=movementOfEx(n)||"";return {push:"pushing",pull:"pulling",squat:"squat",hinge:"hinge",lunge:"lunge",carry:"carry",core:"core",rotation:"rotation",isolation:"single-joint"}[m]||(m||"single-joint");}
function aFit(a,q,it){
  var R=rd(it),E=R.entities,sp=split(),pl=planOn(sp,today()),d=pl.day&&!pl.rest&&pl.kind!=="done"?pl.day:null;
  if(!d){
    if(pl.kind==="done")p(a,t("You've already trained today."));
    else p(a,t("Today is a rest day."));
    return act(a,t("Open Training"),{"data-tab":"train"});}
  var gear=null;E.equipment.forEach(function(k){if(KITOF[k]){gear=(gear||["Bodyweight"]).concat(KITOF[k]);}});
  var full=estMinutes(d),have=E.minutes||0,keep=d.ex.slice();
  if(have&&have<full){
    var used=0;keep=[];
    d.ex.forEach(function(e){var m=isActivity(e.name)?(e.min||30):e.sets*((e.rest||75)+35)/60;if(used+m<=have||!keep.length){keep.push(e);used+=m;}});
    p(a,fill(t("Today's workout takes about {f} min. In {h}, do these, in order, and skip the rest:"),{f:full,h:have+" "+t("min")}));}
  else if(have)p(a,fill(t("Today's workout takes about {f} min, so it fits in {h}."),{f:full,h:have+" "+t("min")}));
  else p(a,fill(t("Today's workout: {w}, about {f} min."),{w:planName(d.name),f:full}));
  var lims=limitsOf(S.profile),miss=0,names=[],swap={},none=0;
  l(a,keep.map(function(e){
    var nm=exName(e.name)+(isActivity(e.name)?"":" · "+doseText(e));
    if(!gear||isActivity(e.name)||usable(e.name,gear)){names.push(e.name);return nm;}
    var sb=standIn(e.name,gear,lims);miss++;
    if(sb){names.push(e.name);swap[e.name]=sb;}else none++;
    return sb?fill(t("{a} → {b}, with what you have"),{a:nm,b:exName(sb)}):fill(t("{a}: nothing close with that kit; skip it"),{a:nm});}));
  var changed=names.length&&(names.length<d.ex.length||Object.keys(swap).length);
  if(gear)n(a,miss?t("Your program itself stays as it is: this is today only."):t("Everything here works with what you have."));
  else if(have&&have<full)n(a,t("The main lifts come first in your program, so a short session still does most of the work. Rest a little less between sets if you need to."));
  /* C-5a: not only a guide. Started like this with a tap, Undo ends it; the program is not
     changed (handlers/actions.js session.fit). With a workout already open, the guide. */
  if(changed&&!S.active){
    var sws=Object.keys(swap).length;
    a.ag={s:"confirm",act:"session.fit",p:{day:d.id,keep:names,swap:swap},
      lead:t("Start today's workout like this?"),
      item:fill(t(names.length===1?"{n} exercise":"{n} exercises"),{n:names.length})+(sws?" · "+fill(t(sws===1?"{n} stand-in":"{n} stand-ins"),{n:sws}):""),
      detail:t("Today only"),cta:t("Start it like this"),
      done:t("Started. Today's workout is as above; your program is as it was."),
      undone:t("Undone. No workout was started.")};
    return a;}
  return act(a,t("Start workout"),{"data-startday":d.id});}
/* "Make my program 4 days" / "I can only train Mon Wed Fri" (docs/COACH-AGENT.md 2.4,
   plan.days in the app; program.days in the plan): the assessment rebuilds the week for that many days, or on those days,
   keeping everything else it knows, and shows the whole plan first; nothing changes
   until Use this plan (handlers/actions.js plan.days, as plan.gear does for kit). */
var DAYSOK=[2,6];
function aDays(a,q,it){
  var R=rd(it),sp=split(),tr=sp.days.filter(function(x){return x.ex&&x.ex.length;}),days=tr.length;
  var wd=(R.entities.weekdays||[]).filter(function(n,i,l){return n>=1&&n<=7&&l.indexOf(n)===i;}).sort(function(x,y){return x-y;});
  var want=wd.length>=2?wd.length:(R.n||0);
  var now=sp.schedule==="week"?tr.map(function(d){return (d.wd||[])[0];}).filter(Boolean).sort(function(x,y){return x-y;}):[];
  p(a,fill(t(days===1?"Your program has 1 training day.":"Your program has {n} training days."),{n:days})
    +(now.length===days&&days?" "+fill(t("Its days: {d}."),{d:now.map(function(n){return wdName(n);}).join(R.lang==="ar"?"، ":", ")}):""));
  if(!want)return act(a,t("Plan my training"),{"data-csec":"train","data-ctsub":"program"});
  if(want===days&&(!wd.length||wd.join()===now.join())){p(a,t("That's already your week."));return a;}
  if(want<DAYSOK[0]||want>DAYSOK[1]){
    p(a,fill(t("The plan is built for {lo} to {hi} days a week."),{lo:DAYSOK[0],hi:DAYSOK[1]}));
    return act(a,t("Plan my training"),{"data-csec":"train","data-ctsub":"program"});}
  var on=wd.length?wd.map(function(n){return wdName(n);}).join(R.lang==="ar"?"، ":", "):"";
  a.ag={s:"confirm",act:"plan.days",p:{n:want,wd:wd},
    lead:t("I can rebuild your week for that, keeping your goal, kit and session length. You'll see the whole plan first: nothing changes until you tap Use this plan."),
    item:wd.length?fill(t("{n} days: {d}"),{n:want,d:on}):fill(t(want===1?"{n} day a week":"{n} days a week"),{n:want}),
    detail:fill(t("Now: {n} days."),{n:days}),cta:t("Show me"),
    done:t("Opened your rebuilt plan. Tap Use this plan to keep it, or Back to leave everything as it is.")};
  return a;}
/* An exercise to leave out, not said (said, it is agent.js planLeave). */
function aAvoid(a,q,it){
  p(a,t("Which exercise? Say its name, and I'll leave it out of your plans."));
  return act(a,t("Open Favourites"),{"data-train":"favs"});}
/* Away, and no kit said: what there will be, asked, with the three usual answers. */
function aAway(a,q,it){
  var R=rd(it),ar=R.lang==="ar",next=R.entities.period==="nextweek";
  p(a,next?t("Travel mode swaps your workouts for what you'll have with you, for next week. What will you have with you?"):t("What will you have with you?"));
  var base=ar?(next?"مسافر الاسبوع الجاي، ":"مسافر الويك اند، "):(next?"travelling next week, ":"travelling this weekend, ");
  [["Bodyweight only",ar?"بوزن الجسم بس":"bodyweight only"],["Dumbbells",ar?"دمبل بس":"only dumbbells"],["A hotel gym",ar?"جيم الفندق":"hotel gym"]].forEach(function(o){
    act(a,t(o[0]),{"data-chatsay":base+o[1]});});
  return a;}
/* Outside what the coach does: said plainly, with what it can do instead. */
var OUTLINE={who:"I'm the app's coach: I answer from your own log and plan and the textbooks in the app, on this phone.",
  remind:"The app doesn't set reminders. Your weigh-ins are under Progress.",joke:"That's outside what I do.",news:"That's outside what I do."};
function aOut(a,q,it){
  var R=rd(it);p(a,t(OUTLINE[R.mode]||"That's outside what I do."));
  return act(a,t("What can I ask?"),{"data-chatq":"help","data-chatl":uiLang()});}
function aClarify(a,q,it){
  var R=rd(it),opts=[{topic:R.topic,mode:R.mode}].concat(R.alts||[]),seen={},shown=0;
  p(a,t("I'm not sure what you mean. Is it one of these?"));
  opts.forEach(function(x){if(shown>=3||seen[x.topic])return;var o=readAs(x,R);if(!o)return;seen[x.topic]=1;shown++;act(a,o.l,{"data-chatsay":o.say});});
  if(!shown)act(a,t("What can I ask?"),{"data-chatq":"help","data-chatl":uiLang()});
  return a;}
/* A correction with nothing in it to re-read ("you're wrong"): the last change offered
   back, or the last reading said, and the other readings it could have had. */
function aCorrection(a,q,it){
  var R=rd(it),c=R.correction||{},pv=c.prev||null,last=c.msg||pv&&pv.msg||null;
  if(last&&last.ag&&last.ag.s==="applied"&&canUndo(last.at)){
    p(a,fill(t("Undo “{d}”?"),{d:String(last.ag.done||"")}));return act(a,t("Undo it"),{"data-agundo":String(last.at)});}
  if(last&&last.ag&&last.ag.s==="confirm"){last.ag.s="declined";p(a,t("Not done: nothing changed. Tell me what you meant."));return a;}
  var tp=last&&TOPIC[last.id];
  p(a,tp?fill(t("I answered that as “{t}”. What did you mean?"),{t:t(tp[0])}):t("Sorry. What did you mean?"));
  var shown=0;
  if(pv)(pv.alts||[]).concat(pv.topic&&last&&last.id!==pv.topic?[{topic:pv.topic}]:[]).forEach(function(x){
    if(shown>=3||(last&&x.topic===last.id))return;var o=readAs(x,pv);if(o){shown++;act(a,o.l,{"data-chatsay":o.say});}});
  if(!shown)n(a,t("Try saying it another way: name the exercise, the food or the day."));
  return a;}

export {DAYSOK, OUTLINE, WDNAME, aAvoid, aAway, aClarify, aCorrection, aDay, aDays, aFit, aFoodDay, aOut, aRecord, aTechnique, aTired, aVolume, aWhy, cap1, dayName, isoWeekdayOf, lastBest, maxText, movementName, rdDate, rdEx, setText, setsFor, topOf, whyEntry};
