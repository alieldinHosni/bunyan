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
import {isActivity} from "../data/activities.js";
import {LIB, pickable} from "../data/exercises.js";
import {planOn} from "../engine/dayplan.js";
import {FOODDB, fuzzyFoods, gramsFor, nutritionFor, parseFoodInput, searchFoods} from "../engine/nutrition.js";
import {mealName} from "../engine/meals.js";
import {matchExercise} from "../engine/splitparse.js";
import {editDist, fuzzTol, fuzzyRank, matchScore, norm, tokenMatch} from "../engine/text.js";
import {fold, spell} from "../coach/intent.js";
import {t} from "../i18n/dict.js";
import {exName, planName} from "../i18n/exnames.js";
import {lastWeight} from "../engine/formulas.js";
import {S, split} from "../state.js";
import {fmtW} from "../units.js";
import {fmtN, pretty, today} from "../util.js";
import {doseText} from "./dose.js";
import {mealNow} from "./view.js";
import {exHay} from "./views/train.js";

function fill(s,o){Object.keys(o).forEach(function(k){s=s.split("{"+k+"}").join(o[k]);});return s;}

/* ---- the words around the names --------------------------------------------------- */
/* What a request says besides what it names: the verbs, the little words, and the
   words for a workout or a program. Taken out before the rest is looked up. */
var FILLER=/(^| )(please|pls|can|could|would|you|u|i|id|want|wanna|like|to|the|a|an|my|me|some|in|into|on|onto|from|of|for|with|at|this|that|it|day|days|workout|workouts|session|program|programme|routine|plan|exercise|exercises|movement|lift|add|put|include|remove|delete|drop|take|out|off|get|rid|no|more|swap|replace|switch|change|substitute|instead|log|record|ate|eaten|had|have|just|ive|i've|and|then|also|ممكن|عايز|عاوز|عايزه|لو|سمحت|ضيف|اضيف|ضيفلي|زود|حط|حطلي|شيل|امسح|احذف|الغي|بدل|غير|استبدل|سجل|سجلي|اكلت|كلت|تمرين|التمرين|يوم|اليوم|برنامج|البرنامج|في|من|على|علي|ل|لـ|مكان)(?= |$)/g;
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
function daysIn(text){
  var sp=split(),fq=" "+spell(fold(text))+" ",hit=[],left=fq;
  if(/ (today|tonight|النهارده|انهارده|اليوم) /.test(fq)){
    var pl=planOn(sp,today());
    if(pl.day&&!pl.rest)hit.push(pl.day);
    left=left.replace(/ (today|tonight|النهارده|انهارده|اليوم)(?= )/g," ");}
  sp.days.forEach(function(d){
    if(hit.indexOf(d)>=0)return;
    var full=" "+spell(fold(d.name))+" ";
    /* The whole name ("Push A"), or every word of it that names something ("push"). */
    if(fq.indexOf(full)>=0){hit.push(d);left=left.split(full).join(" ");return;}
    dayWords(d).some(function(ws){
      if(!ws.length||!ws.every(function(w){return fq.indexOf(" "+w+" ")>=0||fq.indexOf(" ال"+w+" ")>=0;}))return false;
      hit.push(d);ws.forEach(function(w){left=left.replace(new RegExp(" (ال)?"+w+"(?= )","g")," ");});return true;});});
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
  return pick("exercise",fill(t("No exercise called “{q}”. Closest:"),{q:q}),exOpts(names),act,p,slot,true);}

/* ---- each request ---------------------------------------------------------------------- */
/* Add: an exercise from the library, to a day of the program. */
function planAdd(text,p){
  p=p||{};
  var dd=daysIn(text),q=rest(dd.left);
  if(!p.name){
    var r=findExercise(q,libPool());
    if(r.kind==="empty")return say(t("Which exercise? Say its name, like “add Leg Press to Legs”."));
    if(r.kind==="none")return say(fill(t("No exercise called “{q}” in the library."),{q:q})+" "+t("The picker on any day lists all of them."),
      [{l:t("Open Training"),a:{"data-tab":"train"}}]);
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
    item:exName(p.name),detail:fill(t("{d} · last in the day"),{d:act?fill(t("{n} min"),{n:30}):"3 × 8–12"}),
    cta:t("Add it"),done:fill(t("Added {ex} to {day}."),{ex:exName(p.name),day:planName(d.name)}),
    undone:fill(t("Undone. {day} is as it was."),{day:planName(d.name)})});}

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
/* A choice made from a pick: the same request, with that piece filled in. */
function proceed(ag,v){
  var p=Object.assign({},ag.p);p[ag.slot]=v;
  if(ag.act==="exercise.add")return addNext(p,null);
  if(ag.act==="exercise.remove")return planRemove("",p);
  if(ag.act==="exercise.swap")return planSwap("",p);
  if(ag.act==="food.log")return planLog("",p);
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
    var w=" "+norm(hay(n))+" ";return qt.every(function(x){return w.indexOf(" "+x)>=0;});});}
function namesFood(text){
  var fq=" "+fold(text)+" ";
  if(mealIn(fq))return true;
  if(!FOODDB)return false;
  return [rest(swapParts(fq).from),rest(fq)].some(function(q){
    var c=parseFoodInput(q)[0];return !!c&&searchFoods(c.query,1).some(function(h){return h.score>=72;});});}

export {foodById, namesExercise, namesFood, plan, proceed};
