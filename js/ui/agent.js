/* Bunyan — what a request to the coach names
   The chat's other half: a question asks, a request changes something. When the
   matcher (js/coach/intent.js) says a message is a request, this finds what it names —
   an exercise in the library, a day of the program, a food in the database — with the
   matchers the app already uses (the picker's token match and near-miss ranking, the
   program import's name match, the food search), and builds what the chat shows:

     confirm   one change, said in full, waiting for a tap (Add it / Not now);
     pick      one missing piece, its real choices as buttons: which day, which
               exercise, which food;
     matches   nothing matched well: "No exercise called “…”. Closest:" and the
               closest real entries, then None of these.

   It never makes anything up. An exercise is one the library has, a day is one the
   program has, a food is one the database (or My Foods) has; when none is close, the
   answer says so and points to where it can be found. The change itself is run by
   js/ui/handlers/actions.js, the same way the screens' own buttons run it. */
import {actKcal, actRate, isActivity} from "../data/activities.js";
import {difficultyOf, exSteps, EXDB, isCompound as isCompoundName, isFav, LIB, movementOfEx, muscleOf as muscleOfName, MUSCLES, patternOf, pickable} from "../data/exercises.js";
import {planOn} from "../engine/dayplan.js";
import {avoids, doseFor, standIn, usable} from "../engine/plan.js";
import {goalOf} from "../data/goals.js";
import {FOODDB, fuzzyFoods, gramsFor, nutritionFor, parseFoodInput, searchFoods} from "../engine/nutrition.js";
import {mealName} from "../engine/meals.js";
import {matchExercise} from "../engine/splitparse.js";
import {editDist, fuzzTol, fuzzyRank, matchScore, norm, tokenMatch} from "../engine/text.js";
import {fold, spell} from "../coach/intent.js";
import {t} from "../i18n/dict.js";
import {exName, planName} from "../i18n/exnames.js";
import {deloadDue, incrementFor, inDeload, lastWeight} from "../engine/formulas.js";
import {addDays, isoWeekday} from "../engine/schedule.js";
import {S, split} from "../state.js";
import {fmtW, toDisp, wUnit} from "../units.js";
import {fmtN, num, pretty, today} from "../util.js";
import {doseText} from "./dose.js";
import {mealNow, V} from "./view.js";
import {exHay} from "./views/train.js";
import {platePlan} from "./views/session.js";

function fill(s,o){Object.keys(o).forEach(function(k){s=s.split("{"+k+"}").join(o[k]);});return s;}

/* ---- the words around the names --------------------------------------------------- */
/* What a request says besides what it names: the verbs, the little words, and the
   words for a workout or a program. Taken out before the rest is looked up. */
var FILLER=/(^| )(please|pls|can|could|would|you|u|i|id|want|wanna|like|to|the|a|an|my|me|some|in|into|on|onto|from|of|for|with|at|this|that|it|day|days|workout|workouts|session|program|programme|routine|plan|exercise|exercises|movement|lift|add|put|include|remove|delete|drop|take|out|off|get|rid|no|more|swap|replace|switch|change|substitute|instead|log|record|ate|eaten|had|have|just|ive|i've|and|then|also|current|week|weeks|weekly|this|next|routine|schedule|الاسبوع|اسبوع|ده|الحالي|ممكن|عايز|عاوز|عايزه|لو|سمحت|ضيف|اضيف|ضيفلي|زود|حط|حطلي|شيل|امسح|احذف|الغي|بدل|غير|استبدل|سجل|سجلي|اكلت|كلت|تمرين|التمرين|يوم|اليوم|برنامج|البرنامج|في|من|على|علي|ل|لـ|مكان)(?= |$)/g;
function rest(text){
  var s=" "+spell(fold(text))+" ",prev;
  do{prev=s;s=s.replace(FILLER," ");}while(s!==prev);
  /* The Arabic article and the prepositions written onto a word: "السكوات" is "سكوات". */
  return s.replace(/\s+/g," ").trim().split(" ").map(function(w){return w.replace(/^(وال|بال|فال|لل|ال)(?=[\u0600-\u06FF]{3})/,"");}).join(" ");}

/* ---- days -------------------------------------------------------------------------- */
var DAYWORD=/^(day|a|b|c|d|\d+|يوم)$/;
function dayWords(d){return [d.name,planName(d.name)].map(function(n){return spell(fold(n)).split(" ").filter(function(w){return w&&!DAYWORD.test(w);});});}
/* The days the text names, and the text without them. "today" is the day on today's
   plan, when there is one. */
var BEFOREDAY="(to|from|in|into|on|for|of|ل|لـ|من|في|يوم|ليوم)",AFTERDAY="(day|days|workout|session|يوم)";
function dayRes(name){
  var n=name.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
  return [new RegExp(" "+BEFOREDAY+" (my |the |ال)?"+n+" "),new RegExp(" (ال)?"+n+" "+AFTERDAY+" "),new RegExp(" (ل|لل|بال)"+n+" ")];}
function asDay(fq,name){return !!name&&dayRes(name).some(function(re){return re.test(fq);});}
/* Takes out the day as it was said, and only there: the same word elsewhere ("push"
   in "push ups") stays. */
function dropDay(left,name){
  var res=dayRes(name);
  for(var i=0;i<res.length;i++)if(res[i].test(left))return left.replace(res[i]," ");
  return left;}
function daysIn(text){
  var sp=split(),fq=" "+spell(fold(text))+" ",hit=[],left=fq;
  if(/ (today|tonight|النهارده|انهارده|اليوم) /.test(fq)){
    var pl=planOn(sp,today());
    if(pl.day&&!pl.rest)hit.push(pl.day);
    left=left.replace(/ (today|tonight|النهارده|انهارده|اليوم)(?= )/g," ");}
  /* The whole name ("Push A"), or every word of it that names something ("push") —
     only where it is said as a day: after to, from, in, on or for (or the Arabic for
     them), or before day or workout. "add push ups" names Push-Ups, not the Push day.
     A whole name said wins over the words it shares with other days ("Full Body A" is
     not also Full Body B and C). */
  sp.days.forEach(function(d){
    if(hit.indexOf(d)>=0)return;
    var full=spell(fold(d.name));
    if(asDay(fq,full)){hit.push(d);left=dropDay(left,full);}});
  if(!hit.length)sp.days.forEach(function(d){
    dayWords(d).some(function(ws){
      if(!ws.length||!asDay(fq,ws.join(" ")))return false;
      hit.push(d);left=dropDay(left,ws.join(" "));return true;});});
  /* "push day" when the program has no such day: said back, never matched to another. */
  var miss="";
  if(!hit.length){var mm=/ (?!(?:a|the|my|this|that|rest|leg|arm|one|every|each|a)\b)([^ ]+) day /.exec(left)||/ ل?ل?يوم (?!ال?راحه)([^ ]+) /.exec(left);
    if(mm){miss=mm[1];left=left.replace(mm[0]," ");}}
  /* "Push" names Push A and Push B: both stay, and the person picks. */
  return {days:hit,left:left.replace(/\s+/g," ").trim(),miss:miss};}
function dayOpt(d){
  var pl=planOn(split(),today()),when=pl.day&&pl.day.id===d.id?t("Today"):"";
  return {v:d.id,l:planName(d.name),sub:when||fill(t("{n} exercises"),{n:d.ex.length})};}

/* ---- exercises ---------------------------------------------------------------------- */
function hay(name){var l=LIB.filter(function(x){return x[0]===name;})[0];return l?exHay(l):name+" "+exName(name);}
function scoreOf(q,name){return Math.max(matchScore(q,name),matchScore(q,exName(name)));}
/* Words of the query, each landing near a word of the name: how many land. */
function nearWords(q,name){
  var bare=function(w){return w.replace(/^(وال|بال|فال|لل|ال)(?=[\u0600-\u06FF]{3})/,"");};
  var qt=norm(q).split(" ").filter(function(w){return w.length>=3;}).map(bare),nw=norm(name+" "+exName(name)).split(" ").map(bare),n=0;
  qt.forEach(function(w){
    var w1=w==="tricep"?"triceps":w==="bicep"?"biceps":w,tol=fuzzTol(w1.length);
    /* A word cut short ("تراي" for "ترايسبس") is the word. */
    if(nw.some(function(x){return (w1.length>=4&&x.indexOf(w1)===0)||(Math.abs(x.length-w1.length)<=tol&&editDist(w1,x,tol)<=tol);}))n++;});
  return n;}
/* What an exercise phrase names, among the names in pool (the library, or the
   program's own): {kind:"one", name} | {kind:"some", names} | {kind:"close", names} |
   {kind:"none"}. "some" is more than one good match: the person picks. "close" is
   only near misses: they are offered, never chosen. */
function findExercise(q,pool){
  q=String(q||"").trim();if(!q)return {kind:"empty"};
  var inPool=function(n){return pool.indexOf(n)>=0;};
  var m=matchExercise(q);
  if(m.conf==="exact"&&inPool(m.name))return {kind:"one",name:m.name};
  /* The name run together or split ("push ups", "pushups", "push-ups"), singular or
     plural: the same exercise. */
  var sq=function(x){return norm(x).replace(/[\s-]+/g,"").replace(/s$/,"");},qs=sq(q);
  var same=qs.length>=4?pool.filter(function(n){return sq(n)===qs||sq(exName(n))===qs;}):[];
  if(same.length===1)return {kind:"one",name:same[0]};
  /* Among equal matches, the ones already in the program come first. */
  var mine={};inProgram().forEach(function(x){mine[x.e.name]=1;});
  var hits=pool.filter(function(n){return tokenMatch(q,hay(n));})
    .map(function(n){return {n:n,s:scoreOf(q,n),m:mine[n]?1:0};}).sort(function(a,b){return b.s-a.s||b.m-a.m||a.n.length-b.n.length;});
  if(hits.length===1)return {kind:"one",name:hits[0].n};
  if(hits.length&&hits[0].s>=85&&(!hits[1]||hits[1].s<hits[0].s))return {kind:"one",name:hits[0].n};
  if(hits.length)return {kind:"some",names:hits.slice(0,4).map(function(h){return h.n;})};
  /* Near misses: the picker's own ranking first, then the names sharing the most
     words with it, a typo apart at most. */
  var near=fuzzyRank(q,pool,function(n){return [n,exName(n)];},4).map(function(r){return r.item;});
  if(near.length<3){
    var scored=pool.map(function(n){return {n:n,k:nearWords(q,n)};}).filter(function(x){return x.k>0&&near.indexOf(x.n)<0;})
      .sort(function(a,b){return b.k-a.k||a.n.length-b.n.length;});
    near=near.concat(scored.slice(0,4-near.length).map(function(x){return x.n;}));}
  return near.length?{kind:"close",names:near.slice(0,4)}:{kind:"none"};}
function libPool(){return LIB.filter(function(l){return pickable(l[0]);}).map(function(l){return l[0];});}
/* The program's exercises: [{day, e}]. */
function inProgram(){var out=[];split().days.forEach(function(d){d.ex.forEach(function(e){out.push({day:d,e:e});});});return out;}
function exOpt(n,sub){return {v:n,l:exName(n),sub:sub||""};}
/* exName() gives some library names the same Arabic ("بنش بريس" for two benches): the
   library's own name tells them apart, under the row. */
function exOpts(names){
  var o=names.map(function(n){return exOpt(n);});
  o.forEach(function(x){if(o.filter(function(y){return y.l===x.l;}).length>1)x.sub=x.v;});
  return o;}

/* ---- the shapes the chat shows ------------------------------------------------------- */
function pick(what,lead,opts,act,p,slot,none){return {s:"pick",what:what,lead:lead,opts:opts,act:act,p:p,slot:slot,none:!!none};}
function confirm(act,p,o){return Object.assign({s:"confirm",act:act,p:p},o);}
function say(lead,acts){return {s:"say",lead:lead,acts:acts||[]};}
function closeOf(q,names,act,p,slot){
  /* For an add, the words asked for go with the pick: "None of these" makes them an
     exercise of the person's own (createAsk). */
  if(act==="exercise.add")p=Object.assign({q:q},p);
  return pick("exercise",fill(t("No exercise called “{q}”. Closest:"),{q:q}),exOpts(names),act,p,slot,true);}

/* ---- each request ---------------------------------------------------------------------- */
/* Add: an exercise from the library, to a day of the program. */
/* "a new exercise called …", "my own move …": the words around a name that are not it. */
var NEWEX=/^((create|make|add|put|please|can you|could you) )*((a|an|my|me) )*((new|custom|own) )*((exercise|move|movement|lift) )?((called|named|that s called) )?|^((اعمل|اعملي|ضيف|ضيفلي) )?((تمرين|حركه) )?((جديد|جديده) )?((اسمه|اسمها) )?/;
function planAdd(text,p){
  p=p||{};
  var dd=daysIn(text),q=rest(dd.left).replace(NEWEX,"").trim();
  if(!p.name){
    var r=findExercise(q,libPool());
    if(r.kind==="empty")return say(t("Which exercise? Say its name, like “add Leg Press to Legs”."));
    if(r.kind==="none")return createAsk(q,{day:p.day||(dd.days.length===1?dd.days[0].id:"")});
    if(r.kind==="close")return closeOf(q,r.names,"exercise.add",{day:p.day||(dd.days.length===1?dd.days[0].id:"")},"name");
    if(r.kind==="some")return pick("exercise",t("Which exercise?"),exOpts(r.names),"exercise.add",{day:p.day||(dd.days.length===1?dd.days[0].id:"")},"name");
    p.name=r.name;}
  return addNext(p,dd.days,dd.miss);}
function addNext(p,days,miss){
  var sp=split();
  if(!p.day){
    var ds=(days&&days.length?days:sp.days).filter(function(d){return d.ex.length;});
    if(ds.length===1)p.day=ds[0].id;
    else if(!ds.length)return say(t("Your program has no days yet."),[{l:t("Plan my training"),a:{"data-csec":"train","data-ctsub":"program"}}]);
    else return pick("day",(miss?fill(t("Your program has no “{d}” day."),{d:miss})+" ":"")+fill(t("Add {ex} to which day?"),{ex:exName(p.name)}),ds.map(dayOpt),"exercise.add",{name:p.name},"day");}
  var d=sp.days.filter(function(x){return x.id===p.day;})[0];
  if(!d)return say(t("That day isn't in your program any more."));
  if(d.ex.some(function(e){return e.name===p.name;}))
    return say(fill(t("{ex} is already in {day}."),{ex:exName(p.name),day:planName(d.name)}));
  var act=isActivity(p.name);
  return confirm("exercise.add",{name:p.name,day:d.id},{
    lead:fill(t("Add {ex} to {day}?"),{ex:exName(p.name),day:planName(d.name)}),
    item:exName(p.name),detail:fill(t("{d} · last in the day"),{d:act?fill(t("{n} min"),{n:30}):doseLine(doseFor(p.name))}),
    cta:t("Add it"),done:fill(t("Added {ex} to {day}."),{ex:exName(p.name),day:planName(d.name)}),
    undone:fill(t("Undone. {day} is as it was."),{day:planName(d.name)})});}

/* ---- an exercise of the person's own ---------------------------------------------------
   Asked for by a name the library doesn't have ("add Turkish get-ups to Monday", or
   "None of these" under the closest): made the way the picker makes one (a name and
   the muscle it works, no picture or guide), saved to the library and added to a day,
   with Undo. The muscle is asked, never guessed: it decides the volume counts. */
var OWN_MUSCLES=MUSCLES.filter(function(m){return m!=="Cardio"&&m!=="Sports";});
function ownName(q){
  var s=String(q||"").replace(/[^\w\u0600-\u06FF' -]/g," ").replace(/\s+/g," ").trim().slice(0,48);
  return s.replace(/(^|[ -])([a-z])/g,function(m,a,b){return a+b.toUpperCase();});}
function createAsk(q,p){
  var name=ownName(q);
  if(name.replace(/[^A-Za-z\u0600-\u06FF]/g,"").length<3)return say(t("Which exercise? Say its name, like “add Leg Press to Legs”."));
  return pick("muscle",fill(t("“{n}” isn't in the library. I can add it as an exercise of your own. Which muscle does it work most?"),{n:name}),
    OWN_MUSCLES.map(function(m){return {v:m,l:t(m)};}),"exercise.create",Object.assign({},p,{name:name}),"m",false);}
function createNext(p){
  var sp=split();
  if(!p.m)return createAsk(p.name,p);
  if(LIB.some(function(l){return l[0].toLowerCase()===String(p.name).toLowerCase();}))return addNext({name:p.name,day:p.day},null);
  if(!p.day){
    var ds=sp.days.filter(function(d){return d.ex.length;});
    if(ds.length===1)p.day=ds[0].id;
    else if(!ds.length)return say(t("Your program has no days yet."),[{l:t("Plan my training"),a:{"data-csec":"train","data-ctsub":"program"}}]);
    else return pick("day",fill(t("Add {ex} to which day?"),{ex:p.name}),ds.map(dayOpt),"exercise.create",{name:p.name,m:p.m},"day");}
  var d=sp.days.filter(function(x){return x.id===p.day;})[0];
  if(!d)return say(t("That day isn't in your program any more."));
  return confirm("exercise.create",{name:p.name,m:p.m,day:d.id},{
    lead:fill(t("Add {ex}, your own exercise for {m}, to {day}?"),{ex:p.name,m:t(p.m).toLowerCase(),day:planName(d.name)}),
    item:p.name,detail:fill(t("{d} · last in the day"),{d:doseLine(doseFor(p.name))})+" · "+t("no picture or guide"),
    cta:t("Add it"),done:fill(t("Added {ex} to {day}. It's in your library too."),{ex:p.name,day:planName(d.name)}),
    undone:fill(t("Undone. {day} is as it was, and {ex} is out of your library."),{day:planName(d.name),ex:p.name})});}

/* Sets × reps, and the rest, as a line. */
function doseLine(z){return z.sets+" × "+(z.lo===z.hi?z.lo:z.lo+"–"+z.hi)+" · "+fill(t("{s} s rest"),{s:z.rest});}
/* Exercises for a muscle, chosen for this person: from the library, what their kit
   allows (usable), nothing that loads a sore spot they named (avoids), no skill moves
   for someone new, the big compound lifts first and what is already in the program
   marked; each with the goal's own prescription (doseFor). A pick: tapping one adds it
   to a day, asking which, the same as "add … to …". */
var SKILL=/Nordic|Pistol|Muscle[- ]Up|Handstand|One[- ]Arm Push|Planche|Dragon|Human Flag|Front Lever|Back Lever/i;
function suggestExercises(muscle){
  var p=S.profile||{},limits=p.limits||[],gear=S.gear,mine={};
  split().days.forEach(function(d){d.ex.forEach(function(e){mine[e.name]=1;});});
  var pool=LIB.filter(function(l){var n=l[0];
    return pickable(n)&&!isActivity(n)&&muscleOfName(n)===muscle&&usable(n,gear)&&!avoids(n,limits)&&!(p.level==="new"&&(SKILL.test(n)||/Advanced|Expert/.test(difficultyOf(n)||"")));})
    .map(function(l){return l[0];});
  if(!pool.length)return say(fill(t("Nothing in the library trains {m} with your equipment and around what you've said hurts."),{m:t(muscle).toLowerCase()}),
    [{l:t("Open Training"),a:{"data-tab":"train"}}]);
  /* For size and strength a move that takes a load comes before the same move with
     none, when there is something to load it with. */
  var loadGoal=/^(hyp|str|pow)$/.test(goalOf(p.goal).train)&&gear&&gear.some(function(g){return g!=="Bodyweight";});
  function score(n){var e=(EXDB&&EXDB[n]||{}).e||"";
    return (isCompoundName(n)?4:0)+(loadGoal&&e&&e!=="Bodyweight"?2:0)+(mine[n]?1:0)
      +(p.level==="new"&&difficultyOf(n)==="Beginner"?3:0);}
  pool.sort(function(a,b){return score(b)-score(a);});
  /* Stretches, holds and cardio drills are not what "exercises for legs" means, unless
     the goal is mobility or endurance. A spread, not five versions of one move: at most
     two of each movement, by the move its name says. */
  var tr=goalOf(p.goal).train,side=tr==="mob"?/Conditioning|Isometric/:tr==="end"?/Mobility|Isometric/:/Mobility|Conditioning|Isometric/;
  var noJumps=(p.level==="new"&&tr!=="pow")||(p.health||[]).length>0;
  var main=pool.filter(function(n){return !side.test(patternOf(n)||"")&&!(noJumps&&/jump|bound|hop|plyo|burpee|skater/i.test(n))
    &&!(tr!=="pow"&&/atlas|drag|yoke|log lift|tire|sled|keg|farmer/i.test(n));});
  if(main.length)pool=main;
  var MOVE=/squat|lunge|step|deadlift|thrust|bridge|press|push|fly|row|pull|chin|curl|raise|extension|kickback|dip|crunch|plank/i;
  var seen={},top=[];
  pool.forEach(function(n){var m=n.match(MOVE),k=m?m[0].toLowerCase():n;if(top.length<5&&(seen[k]||0)<2){seen[k]=(seen[k]||0)+1;top.push(n);}});
  var G=goalOf(p.goal);
  var lead=fill(t("For {m}, for {g}, with what you train with:"),{m:t(muscle).toLowerCase(),g:t(G.label).toLowerCase()})
    +((p.health||[]).length?" "+t("Keep the effort moderate until a professional has cleared you."):"")
    +(limits.length?" "+t("Moves the app keeps away from what you said hurts are left out; stop anything that brings it on."):"")+" "+t("Tap one to add it to a day.");
  return pick("exercise",lead,top.map(function(n){var o=exOpt(n,doseLine(doseFor(n))+(mine[n]?" · "+t("in your program"):""));return o;}),
    "exercise.add",{},"name",false);}

/* Remove: an exercise that is in the program, from the day it is in. */
function planRemove(text,p){
  p=p||{};
  var dd=daysIn(text),q=rest(dd.left),all=inProgram();
  var scope=dd.days.length?all.filter(function(x){return dd.days.indexOf(x.day)>=0;}):all;
  if(!p.name){
    var names=[];scope.forEach(function(x){if(names.indexOf(x.e.name)<0)names.push(x.e.name);});
    var r=findExercise(q,names);
    if(r.kind==="empty")return say(t("Which exercise? Say its name, like “remove Leg Press from Legs”."));
    if(r.kind==="none"||r.kind==="close"){
      var lib=findExercise(q,libPool());
      if(lib.kind==="one")return say(fill(t("{ex} isn't in your program, so there's nothing to take out."),{ex:exName(lib.name)}));
      if(r.kind==="close")return closeOf(q,r.names,"exercise.remove",{day:p.day||""},"name");
      return say(fill(t("No exercise called “{q}” in your program."),{q:q}),[{l:t("Open Training"),a:{"data-tab":"train"}}]);}
    if(r.kind==="some")return pick("exercise",t("Which exercise?"),exOpts(r.names),"exercise.remove",{day:p.day||""},"name");
    p.name=r.name;}
  var where=scope.filter(function(x){return x.e.name===p.name&&(!p.day||x.day.id===p.day);});
  if(!where.length)return say(fill(t("{ex} isn't in your program, so there's nothing to take out."),{ex:exName(p.name)}));
  if(where.length>1)return pick("day",fill(t(where.length===2?"{ex} is in two workouts this week. Which one?":"{ex} is in {n} workouts. Which one?"),{ex:exName(p.name),n:where.length}),
    where.map(function(x){return dayOpt(x.day);}),"exercise.remove",{name:p.name},"day");
  var w=where[0];
  return confirm("exercise.remove",{id:w.e.id,day:w.day.id,name:p.name},{
    lead:fill(t("Take {ex} out of {day}?"),{ex:exName(p.name),day:planName(w.day.name)}),
    item:exName(p.name),detail:isActivity(p.name)?"":doseText(w.e),
    cta:t("Remove it"),done:fill(t("Removed {ex} from {day}."),{ex:exName(p.name),day:planName(w.day.name)}),
    undone:fill(t("Undone. {day} is as it was."),{day:planName(w.day.name)})});}

/* Swap: an exercise in the program for one in the library. "for", "with", "to" and
   Arabic "بـ" split the two; "instead of" names them the other way round. */
var SWAPSPLIT=/ (?:for|with|to|by|into|ب|بـ|بال) /,INSTEAD=/ (?:instead of|in place of|مكان|بدل) /;
function swapParts(text){
  var fq=" "+spell(fold(text))+" ";
  /* "Y instead of X"; an Arabic بدل at the start is the verb ("بدل X بـY"), not "instead". */
  if(INSTEAD.test(fq)){var a=fq.split(INSTEAD);if(rest(a[0]))return {from:a.slice(1).join(" "),to:a[0]};}
  var b=fq.split(SWAPSPLIT);
  if(b.length<2){var m=/^(.*?) بال(\S.*)$/.exec(fq.trim());if(m)return {from:m[1],to:m[2]};}
  return {from:b[0]||"",to:b.slice(1).join(" ")};}
function planSwap(text,p){
  p=p||{};
  var dd=daysIn(text),parts=swapParts(dd.left),all=inProgram();
  var scope=dd.days.length?all.filter(function(x){return dd.days.indexOf(x.day)>=0;}):all;
  var fq=rest(parts.from),tq=rest(parts.to);
  if(!p.from){
    var names=[];scope.forEach(function(x){if(names.indexOf(x.e.name)<0)names.push(x.e.name);});
    var r=findExercise(fq,names);
    if(r.kind==="empty")return say(t("Which exercise? Say both, like “swap Squat for Leg Press”."));
    if(r.kind==="none"||r.kind==="close"){
      if(r.kind==="close")return Object.assign(closeOf(fq,r.names,"exercise.swap",{day:p.day||"",tq:tq},"from"),{});
      return say(fill(t("No exercise called “{q}” in your program."),{q:fq}),[{l:t("Open Training"),a:{"data-tab":"train"}}]);}
    if(r.kind==="some")return pick("exercise",t("Which exercise?"),exOpts(r.names),"exercise.swap",{day:p.day||"",tq:tq},"from");
    p.from=r.name;}
  if(!p.name){
    var q2=p.tq!=null?p.tq:tq;
    if(!q2)return say(fill(t("Swap {ex} for what? Say the exercise, like “swap {ex} for Leg Press”."),{ex:exName(p.from)}));
    var r2=findExercise(q2,libPool().filter(function(n){return n!==p.from;}));
    if(r2.kind==="none")return say(fill(t("No exercise called “{q}” in the library."),{q:q2})+" "+t("The picker on any day lists all of them."));
    if(r2.kind==="close")return closeOf(q2,r2.names,"exercise.swap",{day:p.day||"",from:p.from},"name");
    if(r2.kind==="some")return pick("exercise",t("Which exercise?"),exOpts(r2.names),"exercise.swap",{day:p.day||"",from:p.from},"name");
    p.name=r2.name;}
  /* In the workout under way and not started yet: for today, or the program. */
  var live=S.active?S.active.entries.findIndex(function(e){return e.name===p.from&&!e.sets.length;}):-1;
  if(live>=0&&!p.scope)return pick("scope",fill(t("Swap {old} for {new}: for today, or in your program?"),{old:exName(p.from),new:exName(p.name)}),
    [{v:"today",l:t("Swap for today"),sub:t("Your program stays as it is.")},{v:"program",l:t("Change your program"),sub:""}],
    "exercise.swap",{from:p.from,name:p.name,day:p.day||""},"scope");
  if(p.scope==="today"&&live>=0)return confirm("exercise.swapToday",{i:live,name:p.name},{
    lead:fill(t("Swap {old} for {new} for today?"),{old:exName(p.from),new:exName(p.name)}),
    item:exName(p.name),detail:t("Your program stays as it is."),cta:t("Swap it"),
    done:fill(t("Swapped {old} for {new} for today."),{old:exName(p.from),new:exName(p.name)}),
    undone:t("Undone. Today's workout is as it was.")});
  var where=scope.filter(function(x){return x.e.name===p.from&&(!p.day||x.day.id===p.day);});
  if(!where.length)return say(fill(t("{ex} isn't in your program, so there's nothing to swap."),{ex:exName(p.from)}));
  if(where.length>1)return pick("day",fill(t(where.length===2?"{ex} is in two workouts this week. Which one?":"{ex} is in {n} workouts. Which one?"),{ex:exName(p.from),n:where.length}),
    where.map(function(x){return dayOpt(x.day);}),"exercise.swap",{from:p.from,name:p.name,scope:p.scope||""},"day");
  var w=where[0];
  return confirm("exercise.swap",{id:w.e.id,day:w.day.id,name:p.name,from:p.from},{
    lead:fill(t("Swap {old} for {new} in {day}?"),{old:exName(p.from),new:exName(p.name),day:planName(w.day.name)}),
    item:exName(p.name),detail:isActivity(p.name)||isActivity(p.from)?"":fill(t("Same sets, reps and rest: {d}"),{d:doseText(w.e)}),
    cta:t("Swap it"),done:fill(t("Swapped {old} for {new} in {day}."),{old:exName(p.from),new:exName(p.name),day:planName(w.day.name)}),
    undone:fill(t("Undone. {day} is as it was."),{day:planName(w.day.name)})});}

/* Log: a food from the database, in the amount said or one serving, to the meal said
   or the time of day's. */
var MEALS=[["Breakfast",/(^| )(breakfast|فطار|فطور|الفطار|الفطور)( |$)/],["Lunch",/(^| )(lunch|غدا|غداء|الغدا|الغداء)( |$)/],
  ["Dinner",/(^| )(dinner|supper|عشا|عشاء|العشا|العشاء)( |$)/],["Snack",/(^| )(snack|snacks|سناك)( |$)/]];
function mealIn(fq){for(var i=0;i<MEALS.length;i++)if(MEALS[i][1].test(fq))return MEALS[i][0];return "";}
var INGREDIENT=/raw|powder|dry|dried|flour|starch|uncooked/i;
function foodById(id){return (S.myFoods||[]).concat(FOODDB||[]).filter(function(f){return f.id===id;})[0]||null;}
function foodShown(f){var a=(f.a||[]).filter(function(x){return /[؀-ۿ]/.test(x);})[0];return S.prefs.lang==="ar"&&a?a:f.n;}
function planLog(text,p,it){
  p=p||{};
  var fq=" "+fold(text)+" ",meal=p.meal!=null?p.meal:mealIn(fq);
  var s=fq;MEALS.forEach(function(m){s=s.replace(m[1]," ");});
  var q=rest(s.replace(/(^| )(\d+(?:\.\d+)?) ?(g|gm|gr|grams?|جرام|جم)(?= |$)/g,"$1$2g"));
  if(!p.fid){
    if(!FOODDB)return say(t("The food list is still loading. Ask again in a moment."));
    var parsed=parseFoodInput(q),c=parsed[0];
    if(!c)return say(t("Which food? Say it with how much, like “log 200 g chicken breast for lunch”."));
    var hits=searchFoods(c.query,6).filter(function(h){return h.score>=60;});
    if(!hits.length){
      var near=fuzzyFoods(c.query,4).map(function(x){return x.f;});
      if(!near.length)return say(fill(t("No food called “{q}” in the food list."),{q:c.query}),[{l:t("Open Food"),a:{"data-tab":"food"}}]);
      return pick("food",fill(t("No food called “{q}”. Closest:"),{q:c.query}),near.map(function(f){return {v:f.id,l:foodShown(f),sub:fill(t("{n} kcal"),{n:fmtN(nutritionFor(f,f.per||100).kcal)})+" / "+fill(t("{n} g"),{n:f.per||100})};}),
        "food.log",{meal:meal,qty:c.qty,unit:c.unit},"fid",true);}
    /* As people eat it, as the food answers read it: "chicken breast" is the cooked
       entry, not the raw one, when both match about as well. */
    var eaten=hits.filter(function(h){return h.score>=hits[0].score-12&&!INGREDIENT.test(h.f.n);});
    var pool=eaten.length?eaten:hits,top=pool[0],close=pool.filter(function(h){return h.score>=top.score-6;});
    if(top.score<100&&close.length>1)
      return pick("food",t("Which food?"),close.slice(0,4).map(function(h){return {v:h.f.id,l:foodShown(h.f),sub:""};}),"food.log",{meal:meal,qty:c.qty,unit:c.unit},"fid",true);
    p.fid=top.f.id;p.qty=c.qty;p.unit=c.unit;p.meal=meal;}
  var f=foodById(p.fid);if(!f)return say(t("That food isn't in the food list any more."));
  var gq=gramsFor(f,p.qty==null?1:p.qty,p.unit||null),n=nutritionFor(f,gq.g),m=p.meal||mealNow();
  return confirm("food.log",{fid:f.id,g:gq.g,label:gq.label,meal:p.meal||""},{
    lead:fill(t("Log {food}, {amount}, to {meal}?"),{food:foodShown(f),amount:gq.label,meal:mealName(m)}),
    item:foodShown(f),detail:fill(t("{k} kcal · {p} g protein"),{k:fmtN(n.kcal),p:Math.round(n.p)}),
    cta:t("Log it"),done:fill(t("Logged {food} to {meal}."),{food:foodShown(f),meal:mealName(m)}),
    undone:fill(t("Undone. {meal} is as it was."),{meal:mealName(m)})});}

/* Weigh-in: a body weight the message names, saved as today's. */
function planWeigh(text,p,it){
  var kg=p&&p.kg||it&&it.kg||0;
  if(!kg)return say(t("What did you weigh? Say it with the number, like “I weigh 82.5 kg”."),[{l:t("Log weight"),a:{"data-sheet":"weigh"}}]);
  /* A bare number in a pounds app is pounds. */
  if(it&&!it.unit&&S.prefs.unit==="lb")kg=Math.round(kg/2.2046*10)/10;
  if(kg<30||kg>300)return say(fill(t("{w} doesn't look like a body weight. Say it again with kg or lb."),{w:fmtW(kg)}));
  var last=(S.body||[]).filter(function(b){return b.date!==today();}).slice(-1)[0];
  return confirm("progress.weighIn",{kg:kg},{
    lead:fill(t("Save {w} as today's weight?"),{w:fmtW(kg)}),item:fmtW(kg),
    detail:last?fill(t("Your last weigh-in: {w}, {d}."),{w:fmtW(last.weight),d:pretty(last.date)}):t("Your first weigh-in."),
    cta:t("Save it"),done:fill(t("Saved {w} as today's weight."),{w:fmtW(kg)}),undone:t("Undone. Today's weight is as it was.")});}

/* A request, from its intent and words: what the chat shows for it. */
function plan(id,text,it){
  if(id==="exadd")return planAdd(text);
  if(id==="exremove")return planRemove(text);
  if(id==="exswap")return planSwap(text);
  if(id==="foodlog")return planLog(text,null,it);
  if(id==="weighlog")return planWeigh(text,null,it);
  return null;}
/* ---- doing things in the app ------------------------------------------------------
   A command (js/coach/commands.js) as what the chat shows. Going somewhere, a setting,
   and the workout's own buttons run at once (run:true): the chat says what was done,
   and a setting can be undone. Anything that writes to the log waits for a tap. */
var PLACENAME={food:"Food",train:"Training",progress:"Progress",coach:"Coach",profile:"Profile",mealplan:"your meal plan",
  targets:"your targets",program:"your program",programs:"the programs",history:"your workout history",weigh:"the weigh-in",
  steps:"steps",recovery:"sleep and recovery",activities:"the activities",assessment:"the assessment",settings:"settings",
  you:"your details",backup:"backup",newmeals:"a new meal plan"};
function now(act,p,lead,done,o){return Object.assign({s:"confirm",act:act,p:p,lead:"",done:done,run:true},o||{});}
/* ---- the week's schedule ------------------------------------------------------------
   A said day as a date: today, tomorrow, or the next such weekday (today included). */
function whenIso(w){
  var n=today();if(!w||w==="today")return n;if(w==="tomorrow")return addDays(n,1);
  for(var i=0;i<7;i++){var d=addDays(n,i);if(isoWeekday(d)===+w)return d;}return "";}
function dayWord(iso){var n=today();return iso===n?t("today"):iso===addDays(n,1)?t("tomorrow"):pretty(iso);}
/* Skip: the day's workout off, the day a rest day; the plan carries on. */
function planSkip(c){
  var iso=whenIso(c.on),pl=planOn(split(),iso);
  if(pl.kind==="done")return say(fill(t("You've already trained {d}."),{d:dayWord(iso)}));
  if(!pl.day||pl.rest)return say(fill(t("{D} is already a rest day."),{D:cap(dayWord(iso))}));
  return confirm("sched.skip",{date:iso},{lead:fill(t("Skip {w} {d}? It becomes a rest day, and the plan carries on from what you train."),{w:planName(pl.day.name),d:dayWord(iso)}),
    item:planName(pl.day.name),detail:pretty(iso),cta:t("Skip it"),done:fill(t("{D} is a rest day now."),{D:cap(dayWord(iso))}),
    undone:t("Undone. Your week is as it was.")});}
/* Move: the workout on one day to another; what was there goes back the other way (a
   rest day if nothing was). */
function planMove(c){
  var from=whenIso(c.from||"today"),to=whenIso(c.to),sp=split();
  if(!to)return say(t("To which day? Say it like “move today's workout to Friday”."));
  if(from===to)return say(t("That's the same day."));
  var a=planOn(sp,from),b=planOn(sp,to);
  if(a.kind==="done")return say(fill(t("You've already trained {d}."),{d:dayWord(from)}));
  if(!a.day||a.rest)return say(fill(t("There's no workout {d} to move."),{d:dayWord(from)}));
  if(b.kind==="done")return say(fill(t("You've already trained {d}."),{d:dayWord(to)}));
  var back=b.day&&!b.rest?b.day:null;
  return confirm("sched.move",{from:from,to:to,day:a.day.id,back:back?back.id:"rest"},{
    lead:fill(t("Move {w} from {a} to {b}?"),{w:planName(a.day.name),a:dayWord(from),b:dayWord(to)}),item:planName(a.day.name),
    detail:back?fill(t("{w} moves to {a} in its place."),{w:planName(back.name),a:dayWord(from)}):fill(t("{A} becomes a rest day."),{A:cap(dayWord(from))}),
    cta:t("Move it"),done:fill(t("{w} is on {b} now."),{w:planName(a.day.name),b:dayWord(to)}),undone:t("Undone. Your week is as it was.")});}
function cap(s){s=String(s||"");return s.charAt(0).toUpperCase()+s.slice(1);}

/* ---- the lighter week: the card's own button, said in the chat ---------------------- */
function planDeload(c){
  if(c.cmd==="deload.end"){
    if(!inDeload())return say(t("There's no lighter week on."));
    return confirm("deload.end",{},{lead:t("End the lighter week now?"),item:t("Lighter week"),detail:t("Your next workouts go back to the full plan."),
      cta:t("End it"),done:t("The lighter week is over."),undone:t("Undone. The lighter week is back on.")});}
  if(inDeload())return say(fill(t("Your lighter week is already on, until {d}."),{d:pretty(S.deload.until)}));
  var due=deloadDue();
  return confirm("deload.start",{},{lead:t("Start a lighter week? For the next seven days, fewer sets and about 10% lighter suggestions."),
    item:t("Lighter week"),detail:due?t(due.why==="plateau"?"Several of your lifts have stalled for three sessions in a row."
      :"Your sets have been close to failure for two weeks running."):t("Nothing in your log calls for one yet; it's yours to take."),
    cta:t("Start it"),done:fill(t("Lighter week on, until {d}."),{d:pretty(addDays(today(),6))}),undone:t("Undone. Your weeks are as they were.")});}

/* ---- logged in a sentence: cardio, a lift done without the app, sleep and soreness ---- */
function ago(iso){var n=today();return iso===n?t("today"):iso===addDays(n,-1)?t("yesterday"):pretty(iso);}
/* "Ran 5 km in 28 min": a finished bout, as the workout screen saves one. Calories
   only where the activity has a measured MET and the person's weight is known, and
   said as an estimate; they never touch the food target. */
function planAct(c){
  if(!c.min)return say(fill(t("How long did it take? Say it like “ran {k} km in 28 minutes”."),{k:c.km||5}));
  var date=c.when==="yesterday"?addDays(today(),-1):today(),kg=lastWeight()||num(S.profile.weight);
  var kcal=kg?actKcal(c.act,c.min,6,kg):0,nm=exName(c.act),pace=c.km?actRate(c.act,c.min,c.km):"";
  var parts=[fill(t("{n} min"),{n:c.min})];if(c.km)parts.push(c.km+" "+t("km"));if(pace)parts.push(pace);
  if(kcal)parts.push(fill(t("about {k} kcal (an estimate)"),{k:fmtN(kcal)}));
  return confirm("act.log",{act:c.act,min:c.min,km:c.km||0,date:date,kcal:kcal},{
    lead:fill(t("Log {a}, {d}?"),{a:nm,d:ago(date)}),item:nm,detail:parts.join(" · ")+". "+t("Cardio doesn't change your food target."),
    cta:t("Log it"),done:fill(t("Logged {a}."),{a:nm}),undone:t("Undone. Nothing was logged.")});}
/* "Yesterday I did bench 3x8 at 80": into the history on that date. */
var PASTW=/(^| )(\d+(\.\d+)?|x|×|by|sets?|reps?|of|at|with|kg|kgs|lb|lbs|yesterday|today|did|done|trained|hit|i|on|last|امبارح|امس|عملت|لعبت|اتمرنت|كيلو|monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun|الاتنين|التلات|الاربع|الخميس|الجمعه|السبت|الحد|الاحد)(?= |$)/g;
function pastIso(w){var n=today();if(w==="yesterday")return addDays(n,-1);if(w==="today")return n;
  for(var i=0;i<7;i++){var d=addDays(n,-i);if(isoWeekday(d)===+w)return d;}return "";}
function planPast(c,p){
  p=p||{};
  if(!p.name){
    var q=rest(c.text||"").replace(/[٠-٩]/g," ").replace(PASTW," ").replace(/\s+/g," ").trim();
    var r=findExercise(q,libPool().filter(function(n){return !isActivity(n);}));
    if(r.kind==="empty"||r.kind==="none")return say(t("Which exercise? Say it like “yesterday I did Bench Press 3x8 at 80 kg”."));
    var pp={date:pastIso(c.when),sets:c.sets,reps:c.reps,w:c.unit==="lb"||(!c.unit&&S.prefs.unit==="lb")?Math.round(c.w/2.2046*100)/100:c.w};
    if(r.kind!=="one")return pick("exercise",t("Which exercise?"),exOpts(r.names),"past.log",pp,"name");
    p=Object.assign(pp,{name:r.name});}
  if(!p.date)return say(t("Which day? Say it like “yesterday” or “on Monday”."));
  var line=p.sets+" × "+p.reps+(p.w?" · "+fmtW(p.w):"");
  return confirm("past.log",{name:p.name,date:p.date,sets:p.sets,reps:p.reps,w:p.w},{
    lead:fill(t("Add {ex}, {s}, to {d}?"),{ex:exName(p.name),s:line,d:ago(p.date)}),item:exName(p.name),
    detail:t("It goes into your history for that day; records and progress count it."),cta:t("Add it"),
    done:fill(t("Added {ex} to {d}."),{ex:exName(p.name),d:ago(p.date)}),undone:t("Undone. Your history is as it was.")});}
/* "Slept 5 hours", "legs are very sore": the recovery log's two numbers, and what they
   mean for today. */
function planRecovery(c){
  var bits=[];if(c.sleep)bits.push(fill(t("{h} h of sleep"),{h:c.sleep}));if(c.sore)bits.push(fill(t("soreness {n}/10"),{n:c.sore}));
  var tip=c.sore>=7?t("Very sore: train it lighter today, or take the rest day (say “skip today”)."):
    c.sleep&&c.sleep<6?t("A short night: keep today's effort moderate and stop a rep or two earlier. The plan itself stays."):
    t("Noted. Today's plan stays as it is.");
  return confirm("recovery.log",{sleep:c.sleep||0,sore:c.sore||0},{lead:fill(t("Log {x} for today?"),{x:bits.join(t(" and "))}),
    item:bits.join(" · "),detail:tip,cta:t("Log it"),done:t("Logged.")+" "+tip,undone:t("Undone. Today's log is as it was.")});}

/* ---- a sore spot, across the program ----------------------------------------------------
   Every exercise in the program that loads it (the plan's own avoid lists) for its closest
   stand-in that doesn't (standIn); one with none is left in and said so. The area joins
   the profile's limits, so new plans and suggestions keep away from it too. Not advice
   about the pain itself: that is a professional's (js/knowledge/scope.js). */
var AREANAME={knee:"knees",back:"lower back",shoulder:"shoulders",wrist:"wrists",ankle:"ankles"};
function planLimit(c){
  var lim=((S.profile||{}).limits||[]).slice();if(lim.indexOf(c.area)<0)lim.push(c.area);
  var sw=[],kept=[],taken={};
  split().days.forEach(function(d){d.ex.forEach(function(e){taken[e.name]=1;});});
  split().days.forEach(function(d){d.ex.forEach(function(e){
    if(isActivity(e.name)||!avoids(e.name,[c.area]))return;
    var to=standIn(e.name,S.gear,lim,taken);
    if(to){taken[to]=1;sw.push({day:d.id,id:e.id,from:e.name,to:to});}else kept.push(e.name);});});
  var area=t(AREANAME[c.area]);
  if(!sw.length&&!kept.length)return say(fill(t("Nothing in your program loads your {a} much. I'll keep new suggestions away from it too."),{a:area}));
  if(!sw.length)return say(fill(t("What loads your {a} has no close stand-in with your kit: {list}. Go lighter on it, or ask me to remove it."),{a:area,list:kept.map(exName).join(", ")}));
  return confirm("plan.avoid",{area:c.area,sw:sw},{lead:fill(t(sw.length===1?"Swap the exercise that loads your {a}?":"Swap the {n} exercises that load your {a}?"),{n:sw.length,a:area}),
    item:sw.slice(0,4).map(function(x){return exName(x.from)+" → "+exName(x.to);}).join(" · ")+(sw.length>4?" …":""),
    detail:(kept.length?fill(t("No close stand-in for {list}: it stays."),{list:kept.map(exName).join(", ")})+" ":"")
      +t("Sets, reps and rest stay. If the pain is sharp, swollen or lasting, have it seen by a professional."),
    cta:t("Swap them"),done:fill(t("Swapped. New plans keep away from your {a} too."),{a:area}),undone:t("Undone. Your program is as it was.")});}

/* ---- travel mode: other kit for a few days ------------------------------------------------
   Until the date, each workout swaps what needs kit you don't have with you for its closest
   stand-in that you do (actions.js startDay); the program itself stays as it is. */
var KITNAME={Dumbbell:"dumbbells",Band:"bands",Kettlebell:"kettlebells",Machine:"machines",Cable:"cables"};
function planTravel(c){
  if(c.cmd==="travel.end"){
    if(!S.travel||!S.travel.until||S.travel.until<today())return say(t("Travel mode isn't on."));
    return confirm("travel.end",{},{lead:t("End travel mode now?"),item:t("Travel mode"),detail:t("Your workouts go back to your own kit."),
      cta:t("End it"),done:t("Travel mode is off. Welcome back."),undone:t("Undone. Travel mode is back on.")});}
  var n=today(),until=c.until?whenIso(c.until):c.days>0?addDays(n,c.days-1):c.days<0?(function(){for(var i=0;i<7;i++){var d=addDays(n,i);if(isoWeekday(d)===7)return d;}return addDays(n,6);})():addDays(n,6);
  var kit=c.gear.filter(function(g){return g!=="Bodyweight";}).map(function(g){return t(KITNAME[g]||g);});
  var kitTxt=kit.length?kit.join(t(" and ")):t("your bodyweight");
  var change=0;split().days.forEach(function(d){d.ex.forEach(function(e){if(!isActivity(e.name)&&!usable(e.name,c.gear))change++;});});
  return confirm("travel.set",{gear:c.gear,until:until},{lead:fill(t("Train with {k} until {d}?"),{k:kitTxt,d:pretty(until)}),
    item:t("Travel mode"),detail:(change?fill(t(change===1?"1 exercise in your program needs other kit: each workout swaps it for the closest one with what you have.":"{n} exercises in your program need other kit: each workout swaps them for the closest ones with what you have."),{n:change}):t("Everything in your program works with that."))
      +" "+t("Your program itself stays as it is."),
    cta:t("Start travel mode"),done:fill(t("Travel mode on, until {d}."),{d:pretty(until)}),undone:t("Undone. Your kit is as it was.")});}

/* ---- in the gym: how the last set felt, the form, the plates ----------------------- */
/* "Too easy" / "too heavy": the next set's numbers moved a step, the way the logger's
   own suggestion moves them (incrementFor). Only the next set changes; nothing logged
   is touched. Without a load, reps move instead. */
function planFeel(dir){
  var a=S.active;
  if(!a)return say(t("Tell me during a workout, after a set, and I'll move the next one."));
  var e=a.entries[a.idx||0],ls=e&&e.sets[e.sets.length-1];
  if(!e||isActivity(e.name))return say(t("Nothing to move on this one."));
  if(!ls)return say(fill(t("Log a set of {ex} first, then tell me how it felt."),{ex:exName(e.name)}));
  var w=num(ls.w),r=num(ls.r),inc=incrementFor(e.name,w),nw=w,nr=r;
  if(w>0&&inc>0){
    if(dir>0)nw=w+inc;
    else{var cut=Math.max(inc,w*0.1);nw=Math.max(0,Math.round((w-cut)/inc)*inc);}}
  else nr=Math.max(1,r+(dir>0?2:-2));
  nw=Math.round(nw*100)/100;
  var line=(nw?fmtW(nw)+" × ":"")+nr+(nw?"":" "+t("reps"));
  return confirm("set.next",{w:nw,r:nr},{lead:fill(t(dir>0?"Then go up a step. Next set: {s}?":"Then ease off. Next set: {s}?"),{s:line}),
    item:line,detail:fill(t("{ex}, last set {w} × {r}. Only the next set changes."),{ex:exName(e.name),w:w?fmtW(w):"",r:r}).replace(" ×  "," × ").replace(",  ×",","),
    cta:t("Use it"),done:fill(t("Next set: {s}."),{s:line}),undone:t("Undone. The next set is as it was.")});}
/* "How do I do this?": the steps for the exercise on screen, and its full guide. */
function planHow(){
  var a=S.active,e=a&&a.entries[a.idx||0];
  if(!e)return say(t("During a workout I'll show the exercise on screen. Or ask how to do one by name."),[{l:t("Open Training"),a:{"data-tab":"train"}}]);
  var st=exSteps(e.name)||[];
  var lead=st.length?st.slice(0,4).map(function(s,i){return (i+1)+". "+s;}).join(" "):fill(t("The guide for {ex} has the steps and the common mistakes."),{ex:exName(e.name)});
  return say(fill(t("{ex}:"),{ex:exName(e.name)})+" "+lead,[{l:t("How to do it"),a:{"data-exdetail":e.name}}]);}
/* "Plates for 87.5": per side, heaviest first, on the bar the plates sheet uses. */
function planPlates(c){
  var kg=c.unit==="lb"||(!c.unit&&S.prefs.unit==="lb")?c.w/2.2046:c.w,bar=V.bar==null?20:num(V.bar);
  var pp=platePlan(kg,bar),u=wUnit();
  if(pp.under)return say(fill(t("{w} is less than the bar, {b}."),{w:fmtW(kg),b:fmtW(bar)}));
  var list=pp.plates.map(function(x){return (x.n>1?x.n+" × ":"")+x.w;}).join(" + ");
  return say(fill(t("For {w} on a {b} bar: {list} {u} on each side."),{w:fmtW(kg),b:fmtW(bar),list:list||"0",u:u})
    +(pp.left>0?" "+fill(t("{l} {u} a side can't be made with standard plates."),{l:pp.left,u:u}):""));}

/* ---- the machine is taken: the same muscles, another way, for today -------------------
   The picker's own like-for-like ranking (same muscle, same movement), with other
   equipment first, what the person has and nothing near a sore spot; never one already
   in today's workout. */
function planBusy(){
  var a=S.active;
  if(!a)return say(t("That's for a workout in progress. Start it and tell me when a machine is taken."));
  var i=a.idx||0,e=a.entries[i];
  if(!e||isActivity(e.name))return say(t("Nothing to swap on this one."));
  if(e.sets.length)return say(fill(t("You've logged sets on {ex}, so it stays. Tell me when you're on the next one."),{ex:exName(e.name)}));
  var p=S.profile||{},mus=muscleOfName(e.name),mv=movementOfEx(e.name),te=(EXDB&&EXDB[e.name]||{}).e,inToday={};
  a.entries.forEach(function(x){inToday[x.name]=1;});
  var alts=LIB.filter(function(l){var n=l[0];return l[1]===mus&&!inToday[n]&&pickable(n)&&!isActivity(n)&&usable(n,S.gear)&&!avoids(n,p.limits||[]);})
    .map(function(l){var s=(movementOfEx(l[0])===mv?3:0)+(l[2]!==te?2:0)+(isCompoundName(l[0])===isCompoundName(e.name)?1:0)+(isFav(l[0])?1:0);return {n:l[0],s:s,eq:l[2]};})
    .sort(function(x,y){return y.s-x.s||x.n.length-y.n.length;}).slice(0,4);
  if(!alts.length)return say(fill(t("Nothing else in the library trains {m} with what you have. Wait it out, or skip {ex} today."),{m:t(mus).toLowerCase(),ex:exName(e.name)}));
  return pick("exercise",fill(t("{ex} taken? These work the same muscles another way. Tap one to swap it in for today:"),{ex:exName(e.name)}),
    alts.map(function(x){return exOpt(x.n,t(x.eq||""));}),"exercise.swapToday",{i:i,from:e.name},"name",false);}

/* ---- sets, reps and rest ---------------------------------------------------------------
   "make bench 4 sets of 6", "rest 2 min on squats", "shorter rests on Legs": the
   exercise (or a whole day, for rests) from the words, changed wherever it is in the
   program unless a day is said, the way the exercise sheet's steppers change it. */
var DOSEW=/(^| )(\d+|x|×|by|sets?|reps?|rests?|seconds?|secs?|s|mins?|minutes?|shorter|longer|less|more|cut|reduce|increase|make|set|update|use|do|lets|let|s|mine|each|all|every|time|times|مجموعات|مجموعه|سيت|سيتات|عدات|عده|راحه|الراحه|ثانيه|ثواني|دقيقه|دقايق|قلل|اقل|اقصر|اطول|اكتر|خلي|اعمل)(?= |$)/g;
function planDose(c){
  var dd=daysIn(c.text||""),q=rest(dd.left).replace(/[٠-٩]/g,"").replace(DOSEW," ").replace(/\s+/g," ").trim(),all=inProgram();
  var scope=dd.days.length?all.filter(function(x){return dd.days.indexOf(x.day)>=0;}):all;
  var bad=(c.sets&&(c.sets<1||c.sets>10))||(c.lo&&(c.lo<1||c.lo>50||c.hi>50))||(c.rest&&(c.rest<15||c.rest>600));
  if(bad)return say(t("That's outside what a plan uses: 1 to 10 sets, 1 to 50 reps, and 15 seconds to 10 minutes of rest."));
  var targets;
  if(!q){
    if(c.restBy&&dd.days.length===1)targets=scope.filter(function(x){return !isActivity(x.e.name);});
    else return say(t("Which exercise? Say it like “make Bench Press 4 sets of 6” or “rest 2 minutes on Squats”."));}
  else{
    var names=[];scope.forEach(function(x){if(names.indexOf(x.e.name)<0)names.push(x.e.name);});
    var r=findExercise(q,names);
    if(r.kind==="some")return say(fill(t("Which one? {list}. Say it with the name."),{list:r.names.map(exName).join(", ")}));
    if(r.kind!=="one")return say(fill(t("No exercise called “{q}” in your program."),{q:q}),[{l:t("Open Training"),a:{"data-tab":"train"}}]);
    targets=scope.filter(function(x){return x.e.name===r.name;});}
  if(!targets.length)return say(t("Nothing there to change."));
  var ch=targets.map(function(x){var e=x.e,o={day:x.day.id,id:e.id};
    if(c.sets&&!isActivity(e.name))o.sets=c.sets;
    if(c.lo&&!isActivity(e.name)){o.lo=c.lo;o.hi=c.hi||c.lo;}
    if(c.rest)o.rest=c.rest;
    if(c.restBy)o.rest=Math.max(30,Math.min(600,num(e.rest,90)+c.restBy));
    return o;});
  var e0=targets[0].e,after=Object.assign({},e0,ch[0]);
  var dayList=targets.map(function(x){return planName(x.day.name);}).filter(function(n,i,a){return a.indexOf(n)===i;});
  var restTxt=function(s){return s>=60&&s%60===0?fill(t("{n} min rest"),{n:s/60}):fill(t("{s} s rest"),{s:s});};
  var whole=!q;
  var lead=whole?fill(t(c.restBy<0?"Shorter rests on {day}: 30 seconds less on each exercise?":"Longer rests on {day}: 30 seconds more on each exercise?"),{day:dayList[0]})
    :fill(t("Change {ex} to {d}?"),{ex:exName(e0.name),d:(c.sets||c.lo?doseText(after):"")+(c.sets||c.lo?(ch[0].rest?" · ":""):"")+(ch[0].rest?restTxt(ch[0].rest):"")});
  var detail=whole?targets.map(function(x,i){return exName(x.e.name)+" "+restTxt(ch[i].rest);}).slice(0,4).join(" · ")+(targets.length>4?" …":"")
    :fill(t("Now: {d}"),{d:doseText(e0)+" · "+restTxt(num(e0.rest,90))})+(dayList.length>1?" · "+fill(t("in {days}"),{days:dayList.join(", ")}):"");
  return confirm("exercise.dose",{ch:ch},{lead:lead,item:whole?dayList[0]:exName(e0.name),detail:detail,cta:t("Change it"),
    done:whole?fill(t("Rests changed on {day}."),{day:dayList[0]}):fill(t("{ex} changed."),{ex:exName(e0.name)}),undone:t("Undone. Your program is as it was.")});}

var GOALNAME={lose:"Lose fat",recomp:"Lose fat and build muscle",gain:"Build muscle",strength:"Get stronger",athletic:"Athletic performance",endurance:"Endurance",mobility:"Mobility"};
function planCommand(c){
  if(!c)return null;
  if(c.cmd==="ex.busy")return planBusy();
  if(c.cmd==="set.feel")return planFeel(c.dir);
  if(c.cmd==="act.log")return planAct(c);
  if(c.cmd==="limit.add")return planLimit(c);
  if(c.cmd==="travel.set"||c.cmd==="travel.end")return planTravel(c);
  if(c.cmd==="past.log")return planPast(c);
  if(c.cmd==="recovery.log")return planRecovery(c);
  if(c.cmd==="ex.how")return planHow();
  if(c.cmd==="plates")return planPlates(c);
  if(c.cmd==="ex.dose")return planDose(c);
  if(c.cmd==="deload.start"||c.cmd==="deload.end")return planDeload(c);
  if(c.cmd==="sched.skip")return planSkip(c);
  if(c.cmd==="sched.move")return planMove(c);
  if(c.cmd==="go"){
    if(!c.to)return say(t("Where to? I can open Food, Training, Progress, your program, meal plan, targets, history, settings, or the weigh-in, steps and sleep logs."));
    var nm=t(PLACENAME[c.to]||c.to);
    return now("app.go",{to:c.to},fill(t("Opening {p}."),{p:nm}),fill(t("Opened {p}."),{p:nm}));}
  /* Rebuilding the program is a big step: said first, shown on a tap. */
  if(c.cmd==="plan.gear"){
    var KIT={bw:"no equipment",home:"home equipment",gym:"a full gym"};
    return confirm("plan.gear",{gear:c.gear},{
      lead:fill(t("Yes. I can rebuild your program for {k}, keeping your goal, training days and session length. You'll see the whole plan first: nothing changes until you tap Use this plan."),{k:t(KIT[c.gear])}),
      item:fill(t("Your program, for {k}"),{k:t(KIT[c.gear])}),detail:t("Exercises swapped for ones that work the same muscles with what you have."),
      cta:t("Show me"),done:t("Opened your rebuilt plan. Tap Use this plan to keep it, or Back to leave everything as it is.")});}
  if(c.cmd==="water.add"){
    if(!c.ml)return say(t("How much? Say it like “add 500 ml of water” or “two glasses”."),[{l:t("Open Food"),a:{"data-tab":"food"}}]);
    var r=S.days[today()]||{},w=(r.water||0)+c.ml;
    return confirm("water.add",{ml:c.ml},{lead:fill(t("Add {n} ml of water to today?"),{n:fmtN(c.ml)}),item:fmtN(c.ml)+" "+t("ml"),
      detail:fill(t("Today goes to {d} of {g} ml."),{d:fmtN(w),g:fmtN((S.goals||{}).water||0)}),cta:t("Add it"),
      done:fill(t("Added {n} ml. Today: {d} ml."),{n:fmtN(c.ml),d:fmtN(w)}),undone:t("Undone. Today's water is as it was.")});}
  if(c.cmd==="steps.log"){
    if(!c.n)return say(t("How many steps? Say it with the number, like “log 8000 steps”."),[{l:t("Log steps"),a:{"data-sheet":"steps"}}]);
    var cur=(S.days[today()]||{}).steps||0,n=c.add?cur+c.n:c.n;
    return confirm("steps.log",{n:n},{lead:fill(t("Save {n} steps for today?"),{n:fmtN(n)}),item:fmtN(n),
      detail:cur?fill(t("Logged so far today: {n}."),{n:fmtN(cur)}):"",cta:t("Save it"),
      done:fill(t("Saved {n} steps for today."),{n:fmtN(n)}),undone:t("Undone. Today's steps are as they were.")});}
  if(c.cmd==="app.unit"){if(S.prefs.unit===c.unit)return say(fill(t("Weights are already in {u}."),{u:c.unit==="lb"?"lb":"kg"}));
    return now("app.unit",{unit:c.unit},"",fill(t("Weights now show in {u}."),{u:c.unit==="lb"?"lb":"kg"}),{undone:t("Undone. Units are as they were.")});}
  if(c.cmd==="app.lang"){if(S.prefs.lang===c.lang)return say(t(c.lang==="ar"?"The app is already in Arabic.":"The app is already in English."));
    return now("app.lang",{lang:c.lang},"",t(c.lang==="ar"?"The app is now in Arabic.":"The app is now in English."),{undone:t("Undone. The language is as it was.")});}
  if(c.cmd==="app.look"){if(S.theme===c.look)return say(t(c.look==="dark"?"Dark mode is already on.":"Light mode is already on."));
    return now("app.look",{look:c.look},"",t(c.look==="dark"?"Dark mode is on.":"Light mode is on."),{undone:t("Undone. The look is as it was.")});}
  if(c.cmd==="app.palette")
    return now("app.palette",{palette:c.palette},"",fill(t("The theme is now {p}."),{p:t(c.palette==="red"?"Red":c.palette==="mono"?"Mono":"Blue")}),{undone:t("Undone. The look is as it was.")});
  if(c.cmd==="workout.start"){
    if(S.active)return say(fill(t("You have a workout in progress: {d}. Pick it up where you left off."),{d:planName(S.active.dayName||"")}),[{l:t("Resume workout"),a:{"data-tab":"train"}}]);
    var pl=planOn(split(),today()),d=pl&&pl.day&&!pl.rest&&pl.kind!=="done"?pl.day:null;
    if(!d)return say(pl&&pl.rest?t("Today is a rest day. Pick a day to train anyway on Training."):t("There's no workout planned for today."),[{l:t("Open Training"),a:{"data-tab":"train"}}]);
    return now("workout.start",{day:d.id},fill(t("Starting {d}."),{d:planName(d.name)}),fill(t("Started {d}."),{d:planName(d.name)}));}
  if(/^(workout|rest)\./.test(c.cmd)&&!S.active)return say(t("There's no workout in progress. Say “start my workout” to begin today's."));
  if(c.cmd==="workout.next")return now("workout.next",{},"",t("On to the next exercise."));
  if(c.cmd==="workout.finish")return now("workout.finish",{},"",t("Finishing: confirm on the workout screen."));
  if(c.cmd==="rest.skip")return now("rest.skip",{},"",t("Rest ended."));
  if(c.cmd==="rest.extend")return now("rest.extend",{},"",t("Thirty more seconds of rest."));
  if(c.cmd==="set.log"){
    if(!S.active)return say(t("There's no workout in progress. Say “start my workout” to begin today's."));
    var e=S.active.entries&&S.active.entries[S.active.idx||0],kg=c.unit==="lb"||(!c.unit&&S.prefs.unit==="lb")?Math.round(c.w/2.2046*10)/10:c.w;
    if(!e||!c.r)return say(t("Say it like “80 kg for 8”."));
    var nm2=exName(e.name);
    return confirm("set.log",{w:kg,r:c.r},{lead:fill(t("Log {w} × {r} on {ex}?"),{w:fmtW(kg),r:c.r,ex:nm2}),item:fmtW(kg)+" × "+c.r,detail:nm2,
      cta:t("Log it"),done:fill(t("Logged {w} × {r} on {ex}."),{w:fmtW(kg),r:c.r,ex:nm2}),undone:t("Undone. The set is taken back.")});}
  if(c.cmd==="plan.calories"){
    if(!c.kcal)return say(t("By how much? Say it like “raise my calories by 200”."),[{l:t("Targets"),a:{"data-csec":"food","data-cfsub":"targets"}}]);
    var k0=num((S.goals||{}).kcal);
    return confirm("plan.calories",{kcal:c.kcal},{lead:fill(t(c.kcal>0?"Raise your calorie target by {n} kcal?":"Lower your calorie target by {n} kcal?"),{n:fmtN(Math.abs(c.kcal))}),
      item:fmtN(k0)+" → "+fmtN(k0+c.kcal)+" "+t("kcal"),detail:t("Carbs move with it; protein and fat stay."),cta:t("Change it"),
      done:t("Target changed; carbs moved with it."),undone:t("Undone. Your targets are as they were.")});}
  if(c.cmd==="plan.goal"){
    if(!c.goal)return say(t("To which goal? Lose fat, build muscle, get stronger, endurance, athletic performance or mobility."));
    if(S.profile.goal===c.goal)return say(fill(t("Your goal is already {g}."),{g:t(GOALNAME[c.goal])}));
    return confirm("plan.goal",{goal:c.goal},{lead:fill(t("Change your goal to {g}?"),{g:t(GOALNAME[c.goal])}),item:t(GOALNAME[c.goal]),
      detail:t("Your calorie and macro targets are worked out again for it."),cta:t("Change it"),
      done:fill(t("Goal changed to {g}, with its targets."),{g:t(GOALNAME[c.goal])}),undone:t("Undone. Your goal and targets are as they were.")});}
  return null;}
/* A planned meal's item swapped for one of the foods offered (js/ui/views/chat.js
   aSwap): a pick, then a confirmation, then the plan changes, with Undo. */
function swapPick(meal,idx,it,name,opts){
  return pick("food",fill(t("Instead of {f} in {m}, the same calories with protein, carbs and fat close to it. Tap one to put it in your plan:"),
    {f:name+(it.grams?" "+Math.round(it.grams)+" g":""),m:mealName(meal)}),opts,"meal.swap",{meal:meal,idx:idx,from:it.fid||"",name:name},"pick",false);}
function swapNext(p){
  var pr=String(p.pick||"").split("|"),f=foodById(pr[0]),g=+pr[1];
  if(!f||!g)return say(t("That food isn't in the database any more."));
  var lbl=foodShown(f)+" "+g+" g";
  return confirm("meal.swap",{meal:p.meal,idx:p.idx,from:p.from,fid:f.id,g:g},{
    lead:fill(t("Swap {a} for {b} in {m}?"),{a:p.name,b:lbl,m:mealName(p.meal)}),item:lbl,
    detail:t("Only the plan changes; anything you've logged stays as it is."),cta:t("Swap it"),
    done:fill(t("{b} is in {m} now."),{b:lbl,m:mealName(p.meal)}),undone:fill(t("Undone. {m} is as it was."),{m:mealName(p.meal)})});}
/* A choice made from a pick: the same request, with that piece filled in. */
function proceed(ag,v){
  var p=Object.assign({},ag.p);p[ag.slot]=v;
  if(ag.act==="exercise.add")return addNext(p,null);
  if(ag.act==="exercise.create")return createNext(p);
  if(ag.act==="past.log")return planPast({},p);
  /* The machine was taken: the swap for today, said before it is made. */
  if(ag.act==="exercise.swapToday")return confirm("exercise.swapToday",{i:p.i,name:p.name},{
    lead:fill(t("Swap {old} for {new} for today?"),{old:exName(p.from),new:exName(p.name)}),
    item:exName(p.name),detail:t("Your program stays as it is."),cta:t("Swap it"),
    done:fill(t("Swapped {old} for {new} for today."),{old:exName(p.from),new:exName(p.name)}),
    undone:t("Undone. Today's workout is as it was.")});
  if(ag.act==="exercise.remove")return planRemove("",p);
  if(ag.act==="exercise.swap")return planSwap("",p);
  if(ag.act==="food.log")return planLog("",p);
  if(ag.act==="meal.swap")return swapNext(p);
  return null;}


/* ---- a follow-up to the last question --------------------------------------------------
   A typed answer to a pick ("Is it pull ups?", "the second one", "Push") is that pick
   answered, the same as tapping the row. Only what the pick asked for is looked for;
   nothing is invented, and near misses are offered again rather than chosen. */
var ORD=[/^(1|first|the first|1st|الاول|اول|اولي|الاولي)$/,/^(2|second|the second|2nd|التاني|تاني|التانيه|تانيه)$/,
  /^(3|third|the third|3rd|التالت|تالت|التالته)$/,/^(4|fourth|the fourth|4th|الرابع|رابع)$/];
var ASKY=/(^| )(is|it|its|that|this|one|mean|meant|maybe|about|how|what|which|hmm|ok|oh|يعني|قصدي|هو|هي|ده|دي|اللي|طيب)(?= |$)/g;
function answerPick(ag,text){
  if(!ag||ag.s!=="pick")return null;
  var q=rest(String(text||"")).replace(ASKY," ").replace(/\s+/g," ").trim(),opts=ag.opts||[];
  if(!q)return null;
  var pick=function(v){return proceed(ag,v);};
  for(var i=0;i<ORD.length;i++)if(ORD[i].test(q)&&opts[i])return pick(opts[i].v);
  var fq=fold(q),hit=opts.filter(function(o){return fold(o.l)===fq||fold(String(o.v))===fq;})[0];
  if(hit)return pick(hit.v);
  if(ag.what==="exercise"){
    var pool=ag.act==="exercise.remove"||(ag.act==="exercise.swap"&&ag.slot==="from")
      ?inProgram().map(function(x){return x.e.name;}).filter(function(n,j,a){return a.indexOf(n)===j;}):libPool();
    var r=findExercise(q,pool);
    if(r.kind==="one")return pick(r.name);
    if(r.kind==="some")return Object.assign({},ag,{lead:t("Which exercise?"),opts:exOpts(r.names),none:false});
    return null;}
  if(ag.what==="day"){
    var ds=split().days.filter(function(d){return d.ex.length&&opts.some(function(o){return o.v===d.id;});});
    var d=ds.filter(function(x){return dayWords(x).some(function(ws){return ws.length&&ws.every(function(w){return (" "+fq+" ").indexOf(" "+w+" ")>=0;});});});
    return d.length===1?pick(d[0].id):null;}
  if(ag.what==="food"&&FOODDB){
    var h=searchFoods(q,1)[0];return h&&h.score>=72?pick(h.f.id):null;}
  if(ag.what==="scope"){
    if(/(today|النهارده|انهارده)/.test(fq))return pick("today");
    if(/(program|plan|برنامج|البرنامج)/.test(fq))return pick("program");}
  return null;}

/* Whether a request names an exercise (the library's or the program's), so "swap" and
   "add" go to training rather than food; and whether it names a food or a meal. */
/* Word by word: "rice" is not in "triceps", though the picker's search finds it there. */
function namesExercise(text){
  var parts=swapParts(daysIn(text).left),q=rest(parts.from)||rest(text);
  if(!q)return daysIn(text).days.length>0;
  var r=findExercise(q,libPool()),qt=norm(q).split(" ").filter(Boolean);
  if(r.kind!=="one"&&r.kind!=="some")return false;
  return (r.name?[r.name]:r.names).some(function(n){
    var w=" "+norm(hay(n))+" ";return qt.every(function(x){return w.indexOf(" "+x)>=0||(x.length>4&&w.indexOf(" "+x.replace(/s$/,""))>=0);});});}
function namesFood(text){
  var fq=" "+fold(text)+" ";
  if(mealIn(fq))return true;
  if(!FOODDB)return false;
  return [rest(swapParts(fq).from),rest(fq)].some(function(q){
    var c=parseFoodInput(q)[0];return !!c&&searchFoods(c.query,1).some(function(h){return h.score>=72;});});}

export {answerPick, createAsk, daysIn, foodById, namesExercise, namesFood, plan, planCommand, proceed, suggestExercises, swapPick};
