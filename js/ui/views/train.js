/* Bunyan — train
   The Training page is for doing: what is on today, start it, change the day, log a
   run or a match, weigh in. Everything that is planning (the program's days, other
   programs, templates, imports, the library) is drawn here too but shown in Coach →
   Training (js/ui/views/coach.js), which calls the pieces exported at the foot. */
import {hb} from "../haptic.js";
import {t, tm} from "../../i18n/dict.js";
import {alsoKnown, empty, EQUIP, LIB, muscleOf, muscleOfEntry, MUSCLES, thumb} from "../../data/exercises.js";
import {exName, planName} from "../../i18n/exnames.js";
import {groupLabel, vLogger} from "./session.js";
import {allSplits, dayOf, dayRec, editSplit, ownerOf, S, split} from "../../state.js";
import {conformProgram, SPLIT_LEVEL} from "../../engine/plan.js";
import {rulesFor} from "../../engine/conditions.js";
import {canSkipStab} from "../../engine/phase.js";
import {deloadDue, inDeload} from "../../engine/formulas.js";
import {blockNow, offPlanLight, phaseNow, shiftNow} from "../../engine/blocks.js";
import {addDays, isoWeekday, nextPinned, pinnedOn, suggestWd, wdName, weekDates, weekOrder, weekStartOf} from "../../engine/schedule.js";
import {dfmt, esc, fmtN, pretty, shortd, today} from "../../util.js";
import {tokenMatch} from "../../engine/text.js";
import {actIcon, actInfo, intensityOf, isActivity, outdoorOf} from "../../data/activities.js";
import {head, reorderBtn, seg, V} from "../view.js";
import {backArrow, backBar} from "../nav.js";
import {art, markArt} from "../art.js";
import {glyph} from "../glyphs.js";
import {programCover} from "../cover.js";
import {shown} from "../more.js";
import {vTImport} from "./timport.js";
import {condCard, doseText, weeksText} from "../dose.js";
import {addDaysISO, estMinutes, planOn} from "../../engine/dayplan.js";
import {swapAdvice, tooSoon} from "../../engine/recovery.js";
import {addsOn, missedNow} from "../../engine/missed.js";
import {monthGrid} from "../datebar.js";
import {paceOf, routePath, speedOf} from "../../engine/run.js";
import {groundFor, mapSeed} from "../runmap.js";
import {bodyTiles, trainTop} from "./home.js";

/* ============================================================ TRAIN */

/* One photograph per preset, keyed by the split's own id rather than by its position
   in the list. The cards used to read img/program-<i%3+1>.jpg, so six programs shared
   three pictures and which program got which changed whenever the list reordered —
   adopting a split drops it out of "Other Programs" and shifted every image along. */
var SPLIT_IMG={ap:"split-ap",arnold:"split-arnold",ppl:"split-ppl",
  ul:"split-ul",fb:"split-fb",bw:"split-bw",bro:"split-bro",
  sl5:"split-sl5",db:"split-db",glute:"split-glute",ppl3:"split-ppl3",foot:"split-foot",fl:"split-fl"};
/* A program without a photograph of its own is drawn from its own structure (see
   js/ui/cover.js) instead of borrowing another programme's picture. */
function splitCover(sp){
  var f=SPLIT_IMG[sp.id];
  return f?'<span class="tcover"><img src="img/'+f+'.jpg" alt="" loading="lazy"></span>'
          :'<span class="tcover tcover-gen">'+programCover(sp,180,100)+'</span>';}


var ACTIVITY='<svg viewBox="0 0 24 24"><path d="M3 12h4l2-6 4 12 2-6h6"/></svg>';
var DUMBBELL='<svg viewBox="0 0 24 24"><path d="M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11"/></svg>';
var MOON='<svg viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>';
function planNote(p){
  if(p.kind==="past")return t("Nothing logged");
  if(p.kind==="none")return t("Nothing planned");
  if(p.rest)return t("Rest day");
  return planName(p.name)||"";}
/* Another session today, for this day only (owner, 28 Oct: "from the training home
   page, as a one-time added session"): offered on today's card whatever today holds. */
function ANOTHER(){return '<button class="thero2-add" data-another="1"><span aria-hidden="true">+</span> '+t("Add another session today")+'</button>';}
/* The selected day's card. What it offers depends on when the day is: today can be
   started, a future day previewed, a finished one opened. */
/* The coach, on the day due (owner, 2 Nov): when most of it lands on muscles trained
   the day before, and another day of the program is fresh, it says so and offers that
   day instead; keeping the plan is one tap too (js/engine/recovery.js). */
/* ahead: the card for tomorrow, shown on today: its muscles are today's, trained or
   planned (js/engine/recovery.js readyOn counts today's plan for a day ahead). */
function recoCard(sp,p,iso,ahead){
  var s=swapAdvice(sp,iso,p);if(!s)return "";
  var names=s.tired.slice(0,3).map(function(m){return tm(m).trim().toLowerCase();}),ar=S.prefs&&S.prefs.lang==="ar";
  var list=names.length>1?names.slice(0,-1).join(ar?"، ":", ")+(ar?" و":" and ")+names[names.length-1]:names[0]||"";
  var when=ahead?t("today"):iso===today()?t("yesterday"):t("the day before");
  return '<div class="reco" data-k="reco'+iso+'"><div class="reco-h">'+glyph("whistle")+'<b>'+esc(t(ahead?"Coach · tomorrow":"Coach"))+'</b></div>'
   +'<p>'+esc(t(ahead?"Tomorrow's {a} lands mostly on {m}, trained {w}. They need a rest day between hard sessions; {b} is fresh.":"Most of {a} lands on {m}, trained {w}. They need a rest day between hard sessions; {b} is fresh.")
       .replace("{a}",planName(s.fromDay.name)).replace("{m}",list).replace("{w}",when).replace("{b}",planName(s.toDay.name)))+'</p>'
   +'<div class="reco-a"><button class="btn" data-recoswap="'+esc(s.to)+'" data-recodate="'+iso+'">'
   +esc(t(ahead?"Train {b} tomorrow instead":"Train {b} instead").replace("{b}",planName(s.toDay.name)))+'</button>'
   +'<button class="btn g" data-recoswap="'+esc(s.from)+'" data-recodate="'+iso+'">'+esc(t("Keep {a}").replace("{a}",planName(s.fromDay.name)))+'</button></div></div>';}
/* Today, what today's workout means for tomorrow, live: on weekdays, tomorrow's day
   checked against today's muscles (a fresher one offered); in a rotation, tomorrow follows
   on from today's day, so a day changed by hand is said with what comes after it. */
function aheadCard(sp,iso){
  if(iso!==today()||!sp)return "";
  var tm=addDaysISO(iso,1),p1=planOn(sp,tm),h=recoCard(sp,p1,tm,true);
  if(h)return h;
  var p0=planOn(sp,iso);
  if(sp.schedule!=="week"&&S.daySwap&&S.daySwap[iso]&&p0.swapped&&p0.day&&p1&&p1.day&&!p1.rest)
    return '<div class="reco" data-k="ahead'+iso+'"><div class="reco-h">'+glyph("whistle")+'<b>'+esc(t("Coach · tomorrow"))+'</b></div>'
     +'<p>'+esc(t("Your rotation follows on from {a}: tomorrow is {b}.").replace("{a}",planName(p0.day.name)).replace("{b}",planName(p1.day.name)))+'</p></div>';
  return "";}
/* A day missed this week (js/engine/missed.js): moved to a free day, its key lifts carried
   into the days left, or let go, said plainly. Shown on today only, once, until dealt with. */
function missedCard(iso){
  if(iso!==today())return "";
  var r=missedNow();if(!r)return "";
  var ar=S.prefs&&S.prefs.lang==="ar",tm1=addDaysISO(iso,1),name=function(d){return dfmt(new Date(d+"T00:00:00"),{weekday:"long"});};
  /* Today and tomorrow by those words; another day by its name. */
  var wd=function(d){return d===iso?t("today"):d===tm1?t("tomorrow"):name(d);};
  var when=function(d){return d===iso?t("today"):d===tm1?t("tomorrow"):t("on {d}").replace("{d}",name(d));};
  var head=t("You missed {a} on {d}.").replace("{a}",planName(r.missed.name)).replace("{d}",name(r.missed.date)),body="",acts="";
  if(r.kind==="move"){
    body=t(r.to===iso?"Today is free, with a rest day either side for those muscles: train it today.":"{d} is free, with a rest day either side for those muscles: train it then.").replace("{d}",wd(r.to));
    acts='<button class="btn" data-missdo="move">'+esc(t("Move it to {d}").replace("{d}",wd(r.to)))+'</button>';}
  else if(r.kind==="fold"){
    var L=r.adds.map(function(a){return t("{x}, {n} sets, {w}").replace("{x}",exName(a.name)).replace("{n}",a.sets).replace("{w}",when(a.date));});
    body=t("No free day keeps a rest day either side, so its key lifts go into the days left:")+" "+L.join(ar?"؛ ":"; ")+".";
    if(r.left.length)body+=" "+t("{m} can't fit without breaking a rest day.").replace("{m}",r.left.map(function(m){return tm(m).trim();}).join(ar?"، ":", "));
    acts='<button class="btn" data-missdo="fold">'+esc(t(r.adds.length===1?"Add it":"Add them"))+'</button>';}
  else if(r.kind==="covered")body=t("The days left train the same muscles, so nothing needs carrying.");
  else body=t("Nothing fits this week without breaking a rest day or making a session too long. Let it go: the plan carries on.");
  acts+='<button class="btn g" data-missok="1">'+esc(t(acts?"Let it go":"OK"))+'</button>';
  return '<div class="reco" data-k="miss'+r.missed.date+'"><div class="reco-h">'+glyph("whistle")+'<b>'+esc(t("Coach"))+'</b></div>'
   +'<p>'+esc(head+" "+body).replace(/\d+/g,'<span class="num">$&</span>')+'</p><div class="reco-a">'+acts+'</div></div>';}
function dayHero(sp,p,iso){
  var label,cta="",meta="";
  if(p.kind==="done"){
    var sv=p.session;
    label=iso===today()?t("Done today"):t("Completed");
    meta=(sv.mins?sv.mins+' '+t("min")+' · ':'')+sv.entries.filter(function(e){return (e.sets||[]).length;}).length+' '+t("exercises");
    cta='<button class="btn g" data-openday="'+iso+'">'+t("View session")+'</button>'
    /* Another session the same day, on the go (owner, 27 Oct): any day of the program,
       or a run, a class, a sport. */
     +(iso===today()?'<button class="btn" data-another="1"><span aria-hidden="true">+</span> '+t("Start another session")+'</button>':'');
  }else if(p.kind==="past"||p.kind==="none"){
    label=p.kind==="past"?t("No session"):t("Nothing planned");
    meta=p.kind==="past"?t("Nothing was logged on this day."):t("Your program has no training days yet. Plan them in Coach.");
    if(p.kind==="none")cta='<button class="btn" data-csec="train">'+t("Plan your training")+'</button>';
  }else if(p.rest){
    label=p.kind==="today"?t("Today"):t("Planned");
    meta=t("Recover. The plan picks up the day after.");
    /* A rest day is advice, not a lock: someone who feels good can train anyway. */
    if(p.kind==="today"&&p.next)
      cta=hb('<button class="btn g" data-startday="'+p.next.id+'">'+t("Train anyway")+' · '+esc(p.next.name)+'</button>');
    if(p.kind==="today")cta+=ANOTHER();
  }else{
    label=p.kind==="today"?(p.again?t("Session {n} today").replace("{n}",p.again):t("Current workout")):t("Planned");
    /* Lifts carried here from a missed day count in, and are named. */
    var add=addsOn(iso,p.day.id),all={ex:p.day.ex.concat(add)};
    meta=all.ex.length+' '+t("exercises")+' · ~'+estMinutes(all)+' '+t("min")
      +(add.length?' · '+t("plus {x} from a missed day").replace("{x}",add.map(function(a){return exName(a.name);}).join(", ")):'');
    cta=p.kind==="today"
      ?hb('<button class="btn" data-startday="'+p.day.id+'"><span class="ico ico-play" aria-hidden="true"></span>'+t("Start workout")+'</button>')+ANOTHER()
      :'<button class="btn g" data-day="'+p.day.id+'">'+t("Preview the day")+'</button>';
  }
  var name=p.kind==="past"?t("Rest or unlogged"):p.kind==="none"?esc(planName(sp.name)):(p.rest?t("Rest day"):planName(p.name));
  /* Any day still ahead can be switched to another day of the plan. */
  var swap=(p.kind==="today"||p.kind==="plan")&&sp.days.length>1
    ?'<button class="thero2-swap" data-swapday="'+iso+'" aria-label="'+esc(t("Change this day's workout"))+'">'
      +'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h13l-3-3M20 16H7l3 3"/></svg><span>'+t("Change")+'</span></button>':'';
  return '<div class="thero2'+(p.kind==="today"&&!p.rest?' live':'')+'">'
   +'<img class="thero2-art" src="intro.jpg" alt="" aria-hidden="true" width="902" height="897" decoding="async">'
   +'<div class="thero2-top"><span class="tbadge'+(p.rest||p.kind==="past"?' rest':'')+'" aria-hidden="true">'
   +(p.rest||p.kind==="past"?MOON:DUMBBELL)+'</span>'
   /* Change sits beside the day's label, in the text, not over the rider (owner, 3 Nov:
      "the change button is hiding the cool figure"). */
   +'<div class="thero2-t"><div class="thero2-k"><span class="klabel">'+esc(label)+'</span>'+swap+'</div>'
   +'<div class="thero2-n">'+esc(name)+'</div>'
   +'<div class="thero2-m">'+esc(meta)+'</div></div></div>'
   +cta+'</div>';}

/* The same card for a workout already under way: Home shows it in place of Next up. */
function resumeHero(){
  var a=S.active,pos=Math.min(+a.idx||0,a.entries.length-1)+1;
  return '<div class="thero2 live">'
   +'<img class="thero2-art" src="intro.jpg" alt="" aria-hidden="true" width="902" height="897" decoding="async">'
   +'<div class="thero2-top"><span class="tbadge" aria-hidden="true">'+DUMBBELL+'</span>'
   +'<div class="thero2-t"><span class="klabel">'+esc(t("Workout in progress"))+'</span>'
   +'<div class="thero2-n">'+esc(planName(a.dayName))+'</div>'
   +'<div class="thero2-m">'+esc(t("Exercise")+" "+pos+" "+t("of")+" "+a.entries.length)+'</div></div></div>'
   +hb('<button class="btn" data-continue="1"><span class="ico ico-play" aria-hidden="true"></span>'+t("Resume workout")+'</button>')+'</div>';}

function vTrain(){
  /* "hub": a workout left for later, seen from its Resume card. */
  if(S.active&&V.train!=="hub")return vLogger();
  /* A day of the plan, opened from the week: what it holds, before you start it. */
  if(V.train==="day")return vDay();
  /* Planning, one step in from here (owner, 3 Nov): the plan page, and the builders,
     library and import it opens. */
  if(V.train==="plan")return vTrainPlan();
  var sub=trainSub();if(sub!=null)return sub;
  return vTrainHome();}

/* ---- Training's plan page -------------------------------------------------------------
   Where the training is planned: your program (its block and days, inline), and the other
   programs, templates and the exercise library on one page (owner, 3 Nov: "the exercise
   page could be inside Programs"). Two tabs, swiped between (js/ui/exswipe.js); back
   returns to Training. An old route to "exercises" lands on Programs at the library. */
var TPLAN=[["program","My program"],["programs","Programs & exercises"]];
function vTrainPlan(){
  if(V.tplan==="exercises"){V.tplan="programs";
    setTimeout(function(){var x=document.getElementById("pex");if(x)x.scrollIntoView({block:"start"});},0);}
  var ts=TPLAN.some(function(x){return x[0]===V.tplan;})?V.tplan:"program",sp=split();
  var h='<div class="dhead">'+backArrow()+'<h1 class="dhead-t">'+esc(t("Training plan"))+'</h1></div>'
   +'<p class="dsub">'+esc(sp?schedLine(sp):t("No program yet"))+'</p>';
  h+=seg({items:TPLAN.map(function(x){return [x[0],t(x[1])];}),value:ts,attr:"tplan",tabs:true,cls:"psecs",label:t("Training plan"),key:"tplan"});
  h+='<div class="psec" data-pswipe="tplan" data-k="psec-'+ts+'">'
   +(ts==="programs"?programsPage()+exercisesPage():builderBody(sp,S.activeProgram,true))+'</div>';
  return h;}
/* How the program falls in a week, in words: its weekdays, or "in rotation". */
function schedLine(sp){
  var n=sp.days.filter(function(d){return d.ex.length;}).length;
  var days=t(n===1?"{n} training day":"{n} training days").replace("{n}",n);
  if(sp.schedule!=="week")return days+" · "+t("in rotation");
  var wd={};sp.days.forEach(function(d){if(d.ex.length)(d.wd||[]).forEach(function(w){wd[w]=1;});});
  var ws=Object.keys(wd).map(Number).sort();
  return ws.length?ws.map(function(n){return wdName(n,true);}).join(", "):days;}

/* ---- the Training page ------------------------------------------------------------
   One question: what do I train today? The greeting and at most one reminder, the
   week with today ringed, the selected day's card (start it, or change it to another
   day of the plan), weigh-in and steps, and a run or a match to log. */
function vTrainHome(){
  var sp=split(),sel=V.tdate||today(),h="";
  if(V.train!=="days"&&V.train!=="hub")V.train="days";
  h+=trainTop();
  if(S.active)h+=resumeHero();
  else{var pd=planOn(sp,sel);h+=weekRail(sp,sel);h+=dayHero(sp,pd,sel);h+=recoCard(sp,pd,sel);h+=aheadCard(sp,sel);h+=missedCard(sel);}
  if(!S.active)h+=programCard();
  h+=deloadCard()+travelCard();
  h+=bodyTiles();
  /* The last outdoor session of the fortnight (a run, a walk, a ride, a hike), as the
     reference's run card: its route, how far, how fast. Opens that day. */
  h+=lastRunCard();
  /* Cardio and sports. Picking an outdoor one there (a run, a walk, a ride, a hike) is
     the way into tracking it live with the phone's GPS (js/ui/run.js): there is no
     separate button for it here. */
  h+='<button class="ttile wide tquick" data-actsheet="1">'+art("track",{cls:"btn-art"})+'<span class="ttile-i" aria-hidden="true">'+ACTIVITY+'</span>'
   +'<span class="ttile-tx"><span class="ttile-n">'+t("Log cardio or a sport")+'</span>'
   +'<span class="ttile-s">'+t("Track a run, a walk or a ride live, or log football, padel, classes…")+'</span></span>'
   +'<span class="ico ico-chev" aria-hidden="true"></span></button>';
  return h;}

/* The most recent outdoor session of the last 14 days with a distance (Running,
   Walking, Cycling, Hiking, a trail run), as a card: the route drawn from its saved
   points on that activity's ground (none for one logged by hand), the kilometres large,
   the pace (a ride: the speed) and the time, and an arrow to the day. "" when there is
   none. */
function lastRunCard(){
  var now=today(),cut=new Date(Date.now()-14*864e5).toISOString().slice(0,10),run=null,date=null,act="";
  (S.sessions||[]).some(function(ss){
    if(!ss||!ss.date||ss.date<cut)return false;
    (ss.entries||[]).some(function(e){
      if(!outdoorOf(e.name))return false;
      var x=(e.sets||[]).filter(function(b){return +b.km>0;})[0];
      if(x){run=x;date=ss.date;act=e.name;}
      return !!x;});
    return !!run;});
  if(!run)return "";
  var o=outdoorOf(act),d=run.route&&run.route.length>1?routePath(run.route,120,80,10):"";
  var ms=(+run.min||0)*60000,m=(+run.km||0)*1000,spd=o.read==="speed";
  var rate=spd?speedOf(ms,m):paceOf(ms,m),unit=spd?" "+t("km/h"):" /"+t("km");
  var when=date===now?t("Today"):pretty(date);
  return '<button class="trun-last" data-openday="'+esc(date)+'" data-act="'+esc(act)+'" aria-label="'+esc(t(o.last)+", "+run.km+" "+t("km")
     +(rate?", "+rate+(spd?" "+t("km/h"):" "+t("per km")):"")+", "+when)+'">'
   +'<span class="trun-map" aria-hidden="true">'+(d?'<svg viewBox="0 0 120 80" preserveAspectRatio="xMidYMid slice">'
     +groundFor(o.ground,120,80,run.map||mapSeed(run),.55)+'<path class="rt-glow" d="'+d+'"/><path class="rt" d="'+d+'"/></svg>':actIcon(act,26))+'</span>'
   +'<span class="trun-t" aria-hidden="true"><span class="trun-k">'+esc(t(o.last))+' · '+esc(when)+'</span>'
   +'<b><span class="num">'+(+run.km).toFixed(2)+'</span><small> '+esc(t("km"))+'</small></b>'
   +'<span class="trun-s">'+esc([rate?rate+unit:"",run.min?run.min+" "+t("min"):""].filter(Boolean).join(" · "))+'</span></span>'
   +'<span class="trun-go" aria-hidden="true">'+glyph("arrow")+'</span></button>';}

/* The planning screens, for Coach: null when none is open. */
function trainSub(){
  /* Old routes land on the plan page: the program list, or the active program inline. */
  if(V.train==="splits"){V.train="plan";V.tplan="programs";return vTrainPlan();}
  if(V.train==="builder"&&V.previewId===S.activeProgram){V.train="plan";V.tplan="program";return vTrainPlan();}
  if(V.train==="builder")return vBuilder();
  if(V.train==="preview")return vPreview();
  if(V.train==="library")return vLibrary();
  if(V.train==="bodyweight")return vBodyweight();
  if(V.train==="day")return vDay();
  if(V.train==="favs")return vFavs();
  if(V.train==="import")return vTImport();
  return null;}

/* Seven days: done (a tick), planned (a dot), rest or missed (quiet), today ringed. A
   tap shows that day in the card below; tapping today again goes back to it. */
/* attr: what a day's tap does — "tweek" shows it here; Home passes "openday" for the
   day's details. */
/* One day's state, for the week and the month alike. */
function dayState(sp,iso){
  var p=planOn(sp,iso),st=p.kind==="done"?"done":p.kind==="past"?"past":(p.rest||p.kind==="none")?"rest":"plan";
  return {p:p,st:st,lbl:pretty(iso)+", "+t({done:"Done",past:"Nothing logged",rest:"Rest day",plan:"Planned"}[st])+(p.name&&st!=="rest"&&st!=="past"?", "+planName(p.name):"")};}
/* The day navigator, Food's own (js/ui/datebar.js; owner, 2 Nov: "I meant all the
   calendar to look like this one, and when it expands, it expands from the calendar bar
   body"): the arrows, the day, what it holds, and the month unfolding inside the bar,
   with a filled dot for a day trained and a ring for one planned. Train looks ahead, so
   the days after today are open. */
/* ---- the week rail ---------------------------------------------------------------------
   Owner, 2 Nov: Training's calendar should answer the week, not one date ("words under each
   day, Saturday weeks; smart, not taking too much space, modern and premium, with an option
   to expand"). One card: "This week · 2 of 4 done" with its bar, then the seven days, each
   its initial, its date, a mark and the one word of what it holds:
     green dot   trained            ring          planned
     faint ring  a rotation's day ahead, which moves with what is trained
     red ✕       a weekday's workout that went by without a session
     ⇄           a day the coach or the person moved
   The selected day sits on an accent pill that glides between days (one shape, its place a
   CSS variable, so the move is the compositor's). A tap shows the day below, and a second
   tap unfolds what it holds in the card (railPeek); a swipe goes a week either side, the
   row following the finger (owner, 2 Nov: "remove the arrows … gesture-first"); "Today"
   brings it back; the calendar icon opens the month inside the same card (Food's month,
   js/ui/datebar.js, the same marks) and folds it back. */
function shortWord(name){
  var w=String(name||"").replace(/\s+/g," ").trim().split(" ");
  /* "Full Body A" → "Full A", "Upper B" stays: the letter tells the sessions apart. */
  if(w.length>2&&/^([A-F]|[أبجدهـو])$/.test(w[w.length-1]))return w[0]+" "+w[w.length-1];
  return w.length>2?w.slice(0,2).join(" "):w.join(" ");}
function railDay(sp,iso,now){
  var d=dayState(sp,iso),p=d.p,x={st:d.st,lbl:d.lbl,word:"",mark:""};
  if(d.st==="done"){x.mark="done";x.word=planName(p.name||(p.session&&p.session.dayName)||t("Workout"));}
  else if(d.st==="plan"){x.mark=sp.schedule!=="week"&&iso>now?"proj":"plan";x.word=planName(p.name);}
  else if(d.st==="past"){var pd=sp.schedule==="week"?pinnedOn(sp,iso):null;
    if(pd&&pd.ex.length){x.mark="miss";x.word=planName(pd.name);x.lbl+=", "+t("missed");}else x.word="—";}
  else x.word="—";
  x.swap=!!(S.daySwap&&S.daySwap[iso]&&iso>=now);
  /* Planned, still ahead, and too soon for the muscles it trains (engine/recovery.js). */
  if(x.mark==="plan"||x.mark==="proj"){var ts=null;try{ts=tooSoon(sp,iso);}catch(e){ts=null;}
    if(ts&&ts.length){x.soon=ts;x.lbl+=", "+t("too soon for {m}").replace("{m}",ts.slice(0,3).map(function(m){return tm(m).trim().toLowerCase();}).join(", "));}}
  x.word=shortWord(x.word);
  return x;}
/* What the chosen day holds, unfolded in the card by tapping it again (owner, 2 Nov:
   "tap the selected day again to expand its details … tap again or outside to collapse"):
   its whole name, where it stands, and its size. The time is the plan's estimate
   (dayplan estMinutes), shown as one; a session done shows the minutes it took. */
function railPeek(sp,iso,now){
  var x=railDay(sp,iso,now),d=dayState(sp,iso),p=d.p,ex=[],name,st,stc="",meta=[],mins=0,est=false;
  if(x.mark==="done"){var sv=p.session;
    name=planName(p.name||sv.dayName||t("Workout"));st=t("Done");stc=" ok";
    ex=(sv.entries||[]).filter(function(e){return (e.sets||[]).length;}).map(function(e){return {name:e.name,sets:e.sets.length};});
    mins=+sv.mins||0;}
  else if(x.mark==="miss"){var pd=pinnedOn(sp,iso);name=planName(pd.name);st=t("Missed");stc=" bad";ex=pd.ex;}
  else if(x.mark==="plan"||x.mark==="proj"){
    if(p.rest||!p.day){name=t("Rest day");st=t("Rest day");}
    else{var add=addsOn(iso,p.day.id),all={ex:p.day.ex.concat(add)};name=planName(p.name);ex=all.ex;
      st=iso===now?t("Today"):x.mark==="proj"?t("In your rotation"):t("Planned");mins=estMinutes(all);est=true;}}
  else{name=x.st==="past"?t("Rest or unlogged"):t("Rest day");st=x.st==="past"?t("Nothing logged"):t("Rest day");}
  var sets=0,mus={};ex.forEach(function(e){var n=Math.max(1,+e.sets||0);sets+=n;var m=muscleOf(e.name);if(m&&m!=="Other")mus[m]=(mus[m]||0)+n;});
  if(ex.length){meta.push('<span class="num">'+ex.length+'</span> '+esc(t("exercises")));meta.push('<span class="num">'+sets+'</span> '+esc(t("sets")));}
  if(mins)meta.push((est?'~':'')+'<span class="num">'+mins+'</span> '+esc(t("min"))+(est?' <i>'+esc(t("Estimated"))+'</i>':''));
  var top=Object.keys(mus).sort(function(a,b){return mus[b]-mus[a];}).slice(0,4);
  return '<div class="wkr-pk-c" data-k="pk'+iso+'">'
   +'<div class="wkr-pk-h"><b>'+esc(name)+'</b><span class="wkr-chip'+stc+'">'+esc(st)+'</span>'
   +(x.swap?'<span class="wkr-chip">'+esc(t("Moved"))+'</span>':'')+'</div>'
   +(meta.length?'<div class="wkr-pk-m">'+meta.join('<span class="wkr-dot" aria-hidden="true">·</span>')+'</div>':'')
   +(top.length?'<div class="wkr-pk-mu">'+top.map(function(m){return '<span>'+esc(tm(m).trim())+'</span>';}).join("")+'</div>':'')
   +(x.soon?'<p class="wkr-pk-soon">'+esc(t("Too soon for {m}: they are still recovering from the day before.").replace("{m}",x.soon.slice(0,3).map(function(m){return tm(m).trim().toLowerCase();}).join(", ")))
      +' <button class="wkr-pk-ch" data-swapday="'+iso+'">'+esc(t("Change"))+'</button></p>':'')
   +(x.mark==="proj"?'<p class="wkr-pk-n">'+esc(t("A rotation moves with what you train, so this day may shift."))+'</p>':'')
   +'</div>';}
function weekRail(sp,sel){
  var now=today(),ws=V.twkBase||weekStartOf(sel),days=weekDates(ws),done=0,plan=0,cells="",idx=-1;
  var nowWs=weekStartOf(now),off=Math.round((Date.parse(ws)-Date.parse(nowWs))/6048e5),open=!!V.tcal;
  var peek=!!V.wkPeek&&!open&&days.indexOf(sel)>=0;
  days.forEach(function(iso,i){
    var x=railDay(sp,iso,now);
    if(x.mark==="done")done++;if(x.mark==="done"||x.mark==="plan"||x.mark==="proj"||x.mark==="miss")plan++;
    if(iso===sel)idx=i;
    var dt=new Date(iso+"T00:00:00");
    cells+=hb('<button class="wkr-d '+x.mark+(x.soon?' soon':'')+(iso===now?' today':'')+(iso===sel?' sel':'')+(x.word==="—"?' rest':'')+'" data-wkday="'+iso+'"'
     +' aria-pressed="'+(iso===sel)+'"'+(iso===sel?' aria-expanded="'+peek+'" aria-controls="wkr-pk"':'')
     +' aria-label="'+esc(x.lbl+(x.swap?", "+t("moved"):""))+'">'
     +'<span class="wkr-w" aria-hidden="true">'+esc(dfmt(dt,{weekday:"narrow"}))+'</span>'
     +'<span class="wkr-n num" aria-hidden="true">'+dt.getDate()+'</span>'
     +'<i class="wkr-m" aria-hidden="true"></i>'
     +'<span class="wkr-t" aria-hidden="true">'+esc(x.word)+'</span>'+(x.swap?'<b class="wkr-sw" aria-hidden="true">⇄</b>':'')+'</button>');});
  var title=off===0?t("This week"):off===1?t("Next week"):off===-1?t("Last week")
    :off<0?t("{n} weeks ago").replace("{n}",-off):t("In {n} weeks").replace("{n}",off);
  var range=dfmt(new Date(days[0]+"T00:00:00"),{day:"numeric",month:"short"})+" – "+dfmt(new Date(days[6]+"T00:00:00"),{day:"numeric",month:"short"});
  var away=sel!==now||off!==0,dir=V.wkDir>0?' fwd':V.wkDir<0?' back':'';
  var pct=plan?Math.round(done/plan*100):0;
  return '<section class="wkr'+(open?' open':'')+(peek?' peek':'')+'" data-k="wkr">'
   +'<div class="wkr-h"><div class="wkr-ti'+dir+'" data-k="wkt'+(open?'cal':ws)+'" aria-live="polite"><b>'+esc(open?t("Training calendar"):title)+'</b>'
   +(open?'':'<span class="wkr-p">'+esc(range)+' · <span class="num">'+done+'</span> '+esc(t("of"))+' <span class="num">'+plan+'</span> '+esc(t("done"))+'</span>')+'</div>'
   +'<div class="wkr-ha">'
   /* Each keyed (owner, 3 Nov: the calendar flashed on Today): without a key the patcher
      matches by position, so Today going made the hidden week button turn into the
      calendar one, replaying its colour transition. */
   +(away?'<button class="wkr-today" data-k="wkr-today" data-wktoday="1">'+esc(t("Today"))+'</button>':'')
   /* No arrows on screen: the row swipes. These two are for a keyboard or a screen reader. */
   +(open?'':'<button class="vh" data-k="wkr-prev" data-wkpage="-1">'+esc(t("Previous week"))+'</button><button class="vh" data-k="wkr-next" data-wkpage="1">'+esc(t("Next week"))+'</button>')
 +'<button class="wkr-cal" data-k="wkr-cal" data-wkopen="1" aria-expanded="'+open+'" aria-label="'+esc(t(open?"Back to the week":"See the whole month"))+'">'+CAL+'</button>'
   +'</div></div>'
   +(open?'':'<div class="wkr-bar" aria-hidden="true"><i style="width:'+pct+'%"></i></div>')
   +'<div class="wkr-fold"'+(open?' inert aria-hidden="true"':'')+'><div class="wkr-in">'
   +'<div class="wkr-r" data-swipe="week" role="group" aria-label="'+esc(title+", "+range)+'" style="--i:'+(idx<0?0:idx)+'">'
   +'<span class="wkr-hl'+(idx<0?' off':'')+'" aria-hidden="true"></span>'
   +'<div class="wkr-days'+dir+'" data-k="wkd'+ws+'">'+cells+'</div></div>'
   +'<div class="wkr-pk" id="wkr-pk"'+(peek?'':' inert aria-hidden="true"')+'><div class="wkr-pk-in">'+(idx<0?'':railPeek(sp,sel,now))+'</div></div>'
   +'</div></div>'
   +'<div class="dbfold'+(open?' open':'')+'"'+(open?'':' inert aria-hidden="true"')+'><div class="dbfold-in">'
   +monthGrid(sel,V.cal,true,function(iso){var x=railDay(sp,iso,now);return {t:x.mark==="done",p:x.mark==="plan"||x.mark==="proj",lbl:x.lbl};})
   +'</div></div></section>';}

/* Coach → Training → Programs: a new one from scratch, one brought in from a coach's
   PDF, every program you own, and the templates. (Letting Bunyan build it is Coach AI's
   job, so it is not offered twice.) */
function programsPage(){
  /* Two ways to a new program, side by side, like the meal plan's. */
  var h='<div class="ptiles">'
   +'<button class="ptile" data-newsplit="1"><span class="ptile-i">'+PLUS+'</span><b>'+t("Build a program")+'</b><span>'+t("Pick the days, fill them from the library")+'</span></button>'
   +'<button class="ptile" data-timport="1"><span class="ptile-i">'+PLUS+'</span><b>'+t("Copy in a program")+'</b><span>'+t("A PDF, pasted text, or one shared with you")+'</span></button></div>';
  h+=programsList();
  var tpls=allSplits().filter(function(o){return !editSplit(o.id);});
  h+='<div class="tsec"><h2 class="tsec-h">'+t("Templates")+'</h2><span class="dhint">'+t("Use one to get your own copy")+'</span></div>'
   +'<div class="tscroll">';
  tpls.forEach(function(o){
    var days=o.days.filter(function(d){return d.ex.length;}).length,lvl=levelOf(o.id);
    h+='<button class="tprog-card" data-preview="'+o.id+'">'+splitCover(o)
     +'<span class="tpc-body"><span><span class="tpc-n">'+esc(planName(o.name))+'</span>'
     +'<span class="tpc-s">'+esc(t(tagNote(o.tag)))+'</span></span>'
     +'<span class="tpc-m"><span>'+days+' '+t("days / week")+'</span>'
     +(lvl?'<span class="tchip">'+t(lvl)+'</span>':'')+'</span></span></button>';});
  return h+'</div>';}
/* Under the programs: the library, favourites, and bodyweight work by area. */
function exercisesPage(){
  var h='<div class="tsec" id="pex"><h2 class="tsec-h">'+t("Exercises")+'</h2></div><div class="ttiles">'
   +'<button class="ttile" data-train="library">'+art("barbell",{cls:"btn-art"})+'<span class="ttile-i" aria-hidden="true"><span class="ico ico-search"></span></span>'
   +'<span class="ttile-n">'+t("Exercise Library")+'</span><span class="ttile-s">'+fmtN(LIB.length)+' '+t("exercises")+'</span></button>'
   +'<button class="ttile" data-train="favs">'+art("star",{cls:"btn-art"})+'<span class="ttile-i" aria-hidden="true"><span class="ico ico-star"></span></span>'
   +'<span class="ttile-n">'+t("Favourites")+'</span><span class="ttile-s">'+S.favs.length+' '+t(S.favs.length===1?"exercise":"exercises")+'</span></button></div>';
  /* Each pill opens the library on that muscle, bodyweight only; the last is the
     bodyweight program. */
  var bw={};
  LIB.forEach(function(l){if(l[2]==="Bodyweight")bw[l[1]]=(bw[l[1]]||0)+1;});
  var cats=Object.keys(bw).sort(function(a,b){return bw[b]-bw[a];}).slice(0,6);
  h+='<div class="tsec"><h2 class="tsec-h">'+t("Bodyweight & No Equipment")+'</h2></div>'
   +'<div class="tscroll tpills">'
   +cats.map(function(c){return '<button class="tpill" data-bwcat="'+esc(c)+'">'+esc(t(c))+'</button>';}).join("")
   +'<button class="tpill" data-preview="bw">'+t("Bodyweight program")+'</button></div>';
  return h;}
/* Every program you own. The active one opens My Program; the others their builder. */
function programsList(){
  var mine=S.activeProgram,us=S.programs||[];
  var h='<div class="tsec"><h2 class="tsec-h">'+t("My programs")+'</h2><span class="libn">'+us.length+'</span></div><div class="drows">';
  us.forEach(function(sp){
    var tr=sp.days.filter(function(d){return d.ex.length;}).length,on=mine===sp.id;
    h+='<div class="drow bsp'+(on?' on':'')+'" data-k="us:'+sp.id+'">'
     /* The active program cannot be deleted from here: switch away from it first. */
     +(on?'<span class="drm" aria-hidden="true"></span>'
        :'<button class="drm" data-delsplit="'+sp.id+'" aria-label="'+esc(t("Delete")+" "+planName(sp.name))+'"><i>'+XSVG+'</i></button>')
     +'<button class="dmain" '+(on?'data-tplan="program"':'data-editsplit="'+sp.id+'"')+'>'
     /* Its own cover: the program's week, drawn from its days. */
     +'<span class="drow-cov">'+programCover(sp,64,48)+'</span>'
     +'<span class="dtext"><span class="drow-n">'+esc(planName(sp.name))+'</span>'
     +'<span class="drow-s">'+tr+' '+t(tr===1?"training day":"training days")+'<i class="ddot"></i>'
     +t(sp.schedule==="week"?"By weekday":"In rotation")+'</span></span>'
     +(on?'<span class="bpill">'+t("Active")+'</span>':'<span class="ico ico-chev" aria-hidden="true"></span>')
     +'</button></div>';});
  return h+'</div>';}

/* A suggestion with its reason and two answers, or — during the week — a quiet line
   saying it is on and until when, with a way out. Never shown mid-workout. */
/* Travel mode on: a quiet line saying so, until when, and a way out (the coach turns it on). */
function travelCard(){
  var tv=S.travel;if(!tv||!tv.until||today()>tv.until)return "";
  return '<div class="dlcard on"><span class="dlcard-t"><b>'+t("Travel mode")+'</b><span>'+t("Until")+' '+shortd(tv.until)
   +' · '+t("exercises swapped for your kit at hand")+'</span></span><button class="dlcard-x" data-travel="end">'+t("End it")+'</button></div>';}
function deloadCard(){
  /* The planned lighter week of a training block is shown by its own card. */
  if(inDeload()&&!offPlanLight())return "";
  if(inDeload()){
    return '<div class="dlcard on"><span class="dlcard-i" aria-hidden="true">'+FEATHER+'</span>'
     +'<span class="dlcard-t"><b>'+t("Lighter week")+'</b><span>'+t("Until")+' '+shortd(S.deload.until)
     +' · '+t("fewer sets, about 10% lighter")+'</span></span>'
     +'<button class="dlcard-x" data-deload="end">'+t("End it")+'</button></div>';}
  var due=deloadDue();
  if(!due)return "";
  return '<div class="dlcard"><div class="dlcard-h"><span class="dlcard-i" aria-hidden="true">'+FEATHER+'</span>'
   +'<b>'+t("Time for a lighter week")+'</b></div>'
   +'<p>'+t(due.why==="plateau"?"Several of your lifts have stalled for three sessions in a row."
      :"Your sets have been close to failure for two weeks running.")+' '
   +t("One lighter week — fewer sets, about 10% less weight — usually brings progress back.")+'</p>'
   +'<div class="dlcard-a"><button class="btn" data-deload="start">'+t("Start a lighter week")+'</button>'
   +'<button class="dlcard-later" data-deload="later">'+t("Not now")+'</button></div></div>';}
/* What each phase is for, in a line (js/knowledge/phases.js PHASES, paraphrased). */
var PHASE_NAME={1:"Stabilisation endurance",2:"Strength endurance",3:"Muscular development",4:"Maximal strength",5:"Power"};
var PHASE_WHY={1:"Lighter loads, slow and controlled: movement quality, joint stability and endurance first. Progress by control, not weight.",
  2:"More strength in the main movers while keeping the stability you built.",
  3:"More sets in the growth range: building muscle.",
  4:"Heavy, low-rep work on the big lifts: the most force you can make.",
  5:"Heavy lifts paired with fast, light ones: strength turned into speed."};
/* Where the training block stands: four segments for its weeks, this one lit, and
   what this week asks — reps to leave in reserve, or the lighter week with a way to
   end it early. Then what the answers after earlier workouts have moved, if anything.
   Quiet: a line and a bar, not a card asking for anything. */
/* Your program, on Training: its name and how it falls in the week, the way into the
   plan page (one tap on the top row), and under it the training block, folded. */
function programCard(){
  var sp=split();
  var top='<button class="pgc-h" data-tplan="program"><span class="pgc-t"><span class="klabel">'+esc(t("Your program"))+'</span>'
   +'<b>'+esc(sp?planName(sp.name):t("No program yet"))+'</b>'
   +'<span class="pgc-s">'+esc(sp?schedLine(sp):t("Pick one, or build your own"))+'</span></span>'
   +'<span class="pgc-go">'+esc(t("Plan"))+'<span class="ico ico-chev" aria-hidden="true"></span></span></button>';
  /* The block lives on My program now (owner, 3 Nov): the card is the way in. */
  return '<section class="pgc">'+top+'</section>';}
function blockCard(){
  var b=blockNow();if(!b||offPlanLight())return "";
  var segs="";
  for(var i=1;i<=b.of;i++)segs+='<i class="'+(i<b.week?'done':i===b.week?'on':'')+(i===b.of?' lt':'')+'"></i>';
  var line=b.light
    ?t("Lighter week: fewer sets, about 10% lighter.")+" "+t("Block {n} starts {d}.").replace("{n}",b.block+1).replace("{d}",shortd(b.next))
    :t(b.rir===1?"Stop each set with 1 rep in reserve.":"Stop each set with {n} reps in reserve.").replace("{n}",b.rir);
  var sh=b.light?{}:shiftNow().shift,moved=Object.keys(sh).sort().map(function(m){
    return tm(m)+" "+(sh[m]>0?"+":"\u2212")+Math.abs(sh[m]);});
  /* The phase this block runs (engine/phase.js). Folded by default (owner, 3 Nov: "taking
     all the screen"): the header says the block, the week, the phase, its reps and the
     reserve; the arrow opens why, what comes next, the tempo and the choices. */
  var ph=phaseNow(),sum="",more="";
  var fig=function(x){return '<span class="num" dir="ltr">'+x+'</span>';};
  if(ph){var tmp=(ph.tempo.match(/[\dX]-[\dX]-[\dX]-[\dX]/)||[""])[0];
    sum=esc(t(ph.name))+' · '+esc(t("{a}–{b} reps")).replace("{a}–{b}",fig(ph.reps.min+"–"+ph.reps.max));
    more+='<p class="blk-l">'+esc(t(PHASE_WHY[ph.n]||""))
     +(ph.seq.length>1?' '+esc(t("Next block: {p}.").replace("{p}",t(PHASE_NAME[ph.seq[b.block%ph.seq.length]]))):'')+'</p>'
     +(tmp?'<p class="blk-l">'+esc(t("tempo {t}")).replace("{t}",fig(tmp))+'</p>':'');
    /* Most people start at stabilisation; an experienced lifter may skip it, as a choice
       they make here, and take it back (engine/phase.js canSkipStab). */
    if(canSkipStab(S.profile)){
      if(!S.profile.skipStab&&ph.n===1)more+='<p class="blk-opt">'+esc(t("Most people start here. With your experience it's optional: you can skip stabilisation and go straight to the heavier phases."))
        +' <button class="blk-optb" data-skipstab="1">'+esc(t("Skip it"))+'</button></p>';
      else if(S.profile.skipStab)more+='<p class="blk-opt">'+esc(t("You chose to skip stabilisation."))+' <button class="blk-optb" data-skipstab="0">'+esc(t("Add it back"))+'</button></p>';}}
  if(!b.light)sum+=(sum?' · ':'')+esc(t("{n} in reserve")).replace("{n}",fig(b.rir));
  if(moved.length)more+='<p class="blk-m">'+esc(t("Sets per workout, from your answers:"))+' '+esc(moved.join(", "))+'</p>';
  var open=!!(more&&V.fold&&V.fold.blk);
  return '<div class="blk fold'+(b.light?' light':'')+(open?' open':'')+'" role="group" aria-label="'+esc(t("Training block"))+'">'
   +(more?'<button class="blk-h" data-fold="blk" aria-expanded="'+open+'">':'<div class="blk-h">')
   +'<span class="blk-t"><b>'+esc(t("Block {b} · Week {w} of {n}").replace("{b}",b.block).replace("{w}",b.week).replace("{n}",b.of))+'</b>'
   +(sum?'<span class="blk-s">'+sum+'</span>':'')+'</span>'+(more?glyph("chev","fold-chev")+'</button>':'</div>')
   +'<div class="blk-bar" aria-hidden="true">'+segs+'</div>'
   +(b.light?'<div class="blk-lt"><p class="blk-l">'+esc(line)+'</p><button class="dlcard-x" data-deload="end">'+t("End it")+'</button></div>':'')
   +(more?'<div class="fold-body">'+more+'</div>':'')
   +'</div>';}
/* The schedule as one card: By weekday or In rotation, then the week it makes. By
   weekday, the seven days with each training day's number on the weekday it falls (the
   same numbers as the day rows above); in rotation, the days in their order, coming
   round again. Then two sessions a day, how, in a line; then, once, the weekdays offer. */
var LOOPI='<path d="M4 12a8 8 0 0 1 14-5.6M20 12a8 8 0 0 1-14 5.6"/><path d="M18 2.5v4h-4M6 21.5v-4h4"/>';
var CALI='<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>';
function schedCard(sp,week,inline){
  var h='<section class="bsched glass" aria-label="'+esc(t("Schedule"))+'">'
   +'<div class="bsch-h"><h2 class="tsec-h">'+t("Schedule")+'</h2><span class="bsch-q">'+esc(t(week?"Same days every week":"Next day whenever you train"))+'</span></div>'
   +seg({items:[["week",t("By weekday"),"",CALI],["cycle",t("In rotation"),"",LOOPI]],value:week?"week":"cycle",attr:"sched",label:t("Schedule"),key:"sched",cls:"bsch-seg",row:true});
  var num=function(i){return '<i class="num">'+(i+1)+'</i>';};
  if(week){
    h+='<ol class="bsch-wk" data-k="schv-week">'+weekOrder().map(function(n){
      var on=[];sp.days.forEach(function(d,i){if((d.wd||[]).indexOf(n)>=0)on.push(i);});
      /* Arabic weekdays without their article, so seven fit across a phone. */
      return '<li class="'+(on.length?'on':'')+(on.length>1?' two':'')+'"><span>'+esc(wdName(n).replace(/^ال/,""))+'</span>'
        +(on.length?'<b>'+on.map(num).join("")+'</b>':'<b class="rest" aria-label="'+esc(t("Rest day"))+'"></b>')+'</li>';}).join("")+'</ol>';}
  else{
    h+='<ol class="bsch-cy" data-k="schv-cycle" style="--n:'+(sp.days.length+1)+'">'+sp.days.map(function(d,i){
      var rest=!d.ex.length;
      return '<li class="'+(rest?'rest':'on')+'"><b>'+(rest?'':num(i))+'</b><span>'+esc(rest?t("Rest"):t("Day")+" "+(i+1))+'</span></li>';}).join("")
     +'<li class="again" aria-label="'+esc(t("Then again from day 1"))+'"><b><svg viewBox="0 0 24 24" aria-hidden="true">'+LOOPI+'</svg></b><span>'+esc(t("Again"))+'</span></li></ol>';}
  /* Two sessions on one weekday, every week (owner, 28 Oct): said where the weekdays are
     picked, and in rotation, how to get there. */
  var twoOn=week&&sp.days.some(function(d){return (d.wd||[]).some(function(n){return sp.days.some(function(o){return o!==d&&(o.wd||[]).indexOf(n)>=0;});});});
  var note=week?(twoOn?t("A weekday on two days is two sessions that day, the upper one first."):t("Two sessions on one day every week: tap a weekday another day already has. Both are trained that day, the upper one first."))
    :sp.days.length>1?t("Two sessions on the same day every week? Set the schedule By weekday, then give two days the same weekday."):"";
  if(note)h+='<p class="bsch-n"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.5v.5"/></svg><span>'+esc(note)+'</span></p>';
  h+='</section>';
  /* In rotation, offered once: the weekdays it would fall on, from when you train. */
  if(inline)h+=weekOffer(sp);
  return h;}
/* Offered once, for a program running in rotation: fixed weekdays, suggested from
   when each day has actually been trained. */
function weekOffer(sp){
  if(sp.schedule==="week"||S.wdOffered)return "";
  var train=sp.days.filter(function(d){return d.ex.length;});
  if(train.length<2)return "";
  var sug=suggestWd(sp);
  var line=train.map(function(d){return esc(planName(d.name))+' · '+(sug[d.id]||[]).map(function(n){return wdName(n);}).join(", ");}).join('<br>');
  return '<div class="dlcard wkoffer"><div class="dlcard-h"><span class="dlcard-i" aria-hidden="true">'+CAL+'</span>'
   +'<b>'+t("Train on fixed weekdays?")+'</b></div>'
   +'<p>'+t("Your program runs in rotation. Pinned to weekdays, from when you usually train:")+'</p>'
   +'<p class="wkoffer-l">'+line+'</p>'
   +'<div class="dlcard-a"><button class="btn" data-wdoffer="yes">'+t("Switch to weekdays")+'</button>'
   +'<button class="dlcard-later" data-wdoffer="no">'+t("Keep rotation")+'</button></div></div>';}
var CAL='<svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>';
var FEATHER='<svg viewBox="0 0 24 24"><path d="M20 4c-7 0-13 5-13 12v4M7 16c3 0 8-1 11-6M4 20l3-4"/></svg>';

/* Every day of the plan, for the My Training sheet. The only way to open, edit or
   reorder any day but today's. */
/* The experience level a preset scores best for, from the plan recommender's own
   table rather than a label invented for the card. Ties go to the lower level, so a
   split that suits two levels is shown to the less experienced of them. That lands on
   every preset's own tag: PPL intermediate, Arnold advanced, Full Body beginner. */

var LEVEL_LABEL={new:"Beginner",some:"Intermediate",experienced:"Intermediate",advanced:"Advanced"};

function levelOf(id){
  var best=null,score=-1e9;
  ["new","some","experienced","advanced"].forEach(function(l){
    var s=(SPLIT_LEVEL[l]||{})[id];
    if(typeof s==="number"&&s>score){score=s;best=l;}});
  return best?LEVEL_LABEL[best]:"";
}
/* A preset's tag reads "6 days · advanced"; the day count is shown separately, from
   the plan itself, so only the descriptive half goes under the name. */

function tagNote(tag){
  var p=String(tag||"").split("·");
  return (p[1]||p[0]||"").trim();
}

/* ---- favourites ---------------------------------------------------------- */

function vFavs(){
  var h=backBar();
  h+=head(t("Favourites"),t("Suggested first when you add an exercise"));
  if(!S.favs.length)
    return h+empty("star",t("No favourites yet"),
      t("Open any exercise and tap the star at the top of the sheet. Starred lifts come first in the picker."),
      '<button class="btn" data-train="library">'+t("Exercise library")+'</button>');
  h+='<div class="list">';
  S.favs.forEach(function(n){
    h+='<button class="item" data-exdetail="'+esc(n)+'">'+thumb(n,36)
     +'<div style="flex:1;min-width:0"><div style="font-weight:600">'+esc(exName(n))+'</div>'
     +'<div class="tiny">'+tm(muscleOf(n))+'</div></div>'
     +'<span class="chev">\u203a</span></button>';});
  return h+'</div>';}


function vPreview(){
  var sp=allSplits().filter(function(x){return x.id===V.previewId;})[0];
  if(!sp){V.train="plan";V.tplan="programs";return "";}
  var h=backBar();
  h+='<h1>'+esc(planName(sp.name))+'</h1><p class="sub">'+esc(sp.tag||"custom")+'</p>';
  sp.days.forEach(function(d){
    if(!d.ex.length){h+='<div class="card"><div class="row"><h3 class="dim">'+esc(planName(d.name))
      +'</h3><span class="tiny">rest</span></div></div>';return;}
    h+='<div class="card"><div class="row"><h3>'+esc(planName(d.name))+'</h3>'
     +'<span class="tiny">'+estMinutes(d)+' min</span></div>';
    d.ex.forEach(function(e,i){
      h+='<div class="row" style="margin-top:8px"><span style="font-size:14px">'+(i+1)+'. '
       +esc(exName(e.name))+'</span><span class="tiny num">'+e.sets+' \u00d7 '+e.lo
       +(e.hi!==e.lo?"\u2013"+e.hi:"")+'</span></div>';});
    h+='</div>';});
  h+='<button class="btn" data-adopt="'+sp.id+'">'+t("Use this program")+'</button>'
   +'<p class="bnote">'+t("You get your own copy to change as you like.")+'</p>';
  return h;}

function vBodyweight(){
  var bw=LIB.filter(function(l){return l[2]==="Bodyweight";});
  var h=backBar();
  h+=head(t("Bodyweight"),t("Nothing but the floor"));
  h+='<button class="card tap" data-preview="bw" style="border-color:var(--accent)">'
   +'<div class="row"><h3>'+t("Bodyweight program")+'</h3><span class="pill a">4 days</span></div>'
   +'<p class="tiny" style="margin:5px 0 0">'+t("Push, pull, legs and a conditioning day. No equipment at all.")+'</p>'
   +'</button>';
  h+='<div class="sec">'+t("Browse by area")+'</div><div class="list">';
  [["Core","Core and abs"],["Chest","Push"],["Back","Pull"],["Quads","Legs"],
   ["Hamstrings","Hamstrings and glutes"],["Shoulders","Shoulders"],["Calves","Calves"]]
   .forEach(function(c){
    var n=bw.filter(function(l){return l[1]===c[0];}).length;
    if(!n)return;
    h+='<button class="item" data-bwcat="'+c[0]+'"><div><div style="font-weight:600">'+c[1]+'</div>'
     +'<div class="tiny">'+n+' exercises</div></div><span class="chev">\u203a</span></button>';});
  h+='</div>';
  h+='<div class="sec">'+t("By difficulty")+'</div><div class="list">';
  ["Beginner","Intermediate","Advanced"].forEach(function(d){
    var n=bw.filter(function(l){return l[4]===d;}).length;
    if(!n)return;
    h+='<button class="item" data-bwdiff="'+d+'"><div><div style="font-weight:600">'+d+'</div>'
     +'<div class="tiny">'+n+' exercises</div></div><span class="chev">\u203a</span></button>';});
  h+='</div>';
  h+='<button class="btn g" data-bwcat="All">See all '+bw.length+' bodyweight exercises</button>';
  return h;}

/* What a search matches an exercise on: its name in English and in the language on
   screen, its muscle and its equipment, so "incline db", "صدر" and "cable" all work. */
/* The kinds of training a library has no muscle or gear filter for are found by
   their word: "plyometric", "isometric", "mobility", in either language. Jumps and
   hops from free-exercise-db are filed as conditioning, so their names place them. */
var KINDWORD={Isometric:1,Mobility:1,Plyometric:1},PLYO=/\b(jumps?|hops?|bounds?|plyo)\b/i;
function kindWords(l){
  var k=KINDWORD[l[5]]?l[5]:PLYO.test(l[0])?"Plyometric":"";
  return k?" "+k+" "+t(k):"";}
function exHay(l){return l[0]+" "+exName(l[0])+" "+l[1]+" "+tm(l[1])+" "+l[2]+" "+t(l[2])+kindWords(l)+" "+alsoKnown(l[0]);}
function vLibrary(){
  var q=V.exq.trim().toLowerCase();
  /* Token matching, as the picker sheet and the food search do: "incline db" finds
     "Dumbbell Incline Bench Press" in any word order. */
  var list=LIB.filter(function(l){
    return (V.exm==="All"||l[1]===V.exm)
        && (V.exe==="All"||l[2]===V.exe)
        && (!V.exd||l[4]===V.exd)
        && (!q||tokenMatch(q,exHay(l)));});
  var h=backBar();
  h+='<div class="libhero">'+markArt("libhero-art")
   +'<div class="libhead"><div><span class="shk">'+t("Training")+'</span><h1>'+t("Exercise Library")+'</h1>'
   +'<p class="sub">'+fmtN(LIB.length)+' '+t("exercises")+'</p></div>'
   +'<button class="icobtn" data-train="favs" aria-label="'+t("Favourites")
   +(S.favs.length?' ('+S.favs.length+')':'')+'">'
   +'<span class="ico ico-star" aria-hidden="true"></span></button></div>'
   +'<div class="libq"><span class="ico ico-search" aria-hidden="true"></span>'
   +'<input id="exq" type="search" placeholder="'+t("Search exercises, muscles, gear")+'\u2026" '
   +'value="'+esc(V.exq)+'" autocapitalize="none" autocorrect="off" autocomplete="off" spellcheck="false" enterkeyhint="search"'
   +' aria-label="'+t("Search exercises, muscles, gear")+'">'
   +(V.exq?'<button class="libq-x" data-clearexq="1" aria-label="'+t("Clear")+'">✕</button>':'')+'</div></div>';
  if(V.exd)h+='<button class="btn d sm" data-cleardiff="1" style="width:auto">'
   +t("Clear difficulty filter")+' \u00b7 '+t(V.exd)+'</button>';
  h+='<div class="libfilters" role="group" aria-label="'+t("Muscle")+'">';
  ["All"].concat(MUSCLES).forEach(function(m){
    h+='<button class="pill'+(V.exm===m?" a":"")+'" data-exm="'+m+'" aria-pressed="'+(V.exm===m)+'">'+tm(m)+'</button>';});
  h+='</div><div class="libfilters" role="group" aria-label="'+t("Equipment")+'">';
  ["All"].concat(EQUIP).forEach(function(q2){
    h+='<button class="pill'+(V.exe===q2?" a":"")+'" data-exe="'+q2+'" aria-pressed="'+(V.exe===q2)+'">'+t(q2)+'</button>';});
  h+='</div>';
  if(list.length){
    h+='<div class="tsec"><h2 class="tsec-h">'
     +(V.exm==="All"?t("All Exercises"):t(V.exm)+' '+t("Exercises"))+'</h2>'
     +'<span class="libn">'+fmtN(list.length)+'</span></div><div class="card tdays">';
    /* Forty rows, and forty more each time the end comes into view (js/ui/more.js).
       Keyed, so a filter change swaps whole rows rather than rewriting each one in
       place — which showed the last exercise's photo under the new name until the
       new one arrived. */
    var n=shown("lib",[V.exm,V.exe,V.exd||"",q].join("|"),40);
    list.slice(0,n).forEach(function(l){
      h+='<button class="trow libtrow" data-k="lib:'+esc(l[0])+'" data-exdetail="'+esc(l[0])+'">'+thumb(l[0],52)
       +'<span><span class="trow-n">'+esc(exName(l[0]))+'</span>'
       +'<span class="trow-s">'+tm(l[1])+(l[2]==="Other"&&(l[1]==="Cardio"||l[1]==="Sports")?'':' \u00b7 <b>'+t(l[2])+'</b>')+'</span></span>'
       +'<span class="ico ico-chev" aria-hidden="true"></span></button>';});
    h+='</div>';
    if(list.length>n)h+='<button class="btn d sm libmore" data-more="lib" data-step="40">'+t("Show more")+'</button>';}
  if(!list.length)h+=empty("search",
    q?t("Nothing matches")+" “"+esc(V.exq)+"”":t("Nothing matches those filters"),
    t("Your gym may call it something else, or it may not be in the library at all."),
    '<button class="btn" data-customex="1">'+t("Add it yourself")+'</button>');
  return h;}

/* ---- programs: the ready-made splits (fixed) and yours (editable) -------------
   Ready-made splits cannot be changed or deleted, only previewed and adopted. Yours
   open in the builder, and each has an ✕ that deletes it after one question. */
var HERO_ART=markArt("libhero-art");
var PLUS='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
var SPARK='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/></svg>';
/* ---- the split builder ------------------------------------------------------------
   One screen per split you made: how many days, each day with an ✕ and a grip, a +
   for another, and a tap into any day to fill it from the library. */
function vBuilder(){
  var sp=editSplit(V.previewId);if(!sp){V.train="plan";V.tplan="programs";return "";}
  return backBar()+builderBody(sp,V.previewId,false);}
/* One program, laid out for building: its name, its schedule, its days. Inline it is
   My Program (the active one, with Switch program); on its own it is the builder for
   any other program, with Make it active and Delete. */
function builderBody(sp,id,inline){
  var active=S.activeProgram===id,week=sp.schedule=="week";
  var tr=sp.days.filter(function(d){return d.ex.length;}).length;
  var nEx=sp.days.reduce(function(n,d){return n+d.ex.length;},0);
  var h='';
  /* On the plan page the page's own title and line say what the program is: here only its
     name, to rename, and what it holds. */
  if(inline)h+='<div class="bname"><button class="dname" data-renamesplit="'+id+'" aria-label="'+esc(t("Rename program"))+': '+esc(planName(sp.name))+'">'
    +'<h2 class="bname-t">'+esc(planName(sp.name))+'</h2><span class="ico ico-edit" aria-hidden="true"></span></button>'
    +'<span class="bname-s"><span class="num">'+nEx+'</span> '+esc(t(nEx===1?"exercise":"exercises"))+'</span></div>'
    /* Where the program is in its training block, folded (owner, 3 Nov: on My program,
       not on Training's card). */
    +(active?blockCard():'');
  else h+='<div class="libhero bhero">'+HERO_ART
   +'<span class="shk">'+t(active?"Your training":"Program builder")+'</span>'
   +'<button class="dname" data-renamesplit="'+id+'" aria-label="'+esc(t("Rename program"))+': '+esc(planName(sp.name))+'">'
   +'<h1 class="dhead-t">'+esc(planName(sp.name))+'</h1><span class="ico ico-edit" aria-hidden="true"></span></button>'
   /* What the program holds (owner, 3 Nov: "7 days" beside "3 training days" read as a
      contradiction): its training days and exercises; a rotation says its cycle once. */
   +'<div class="bstats"><span><b>'+tr+'</b>'+t(tr===1?"training day":"training days")+'</span>'
   +'<span><b>'+nEx+'</b>'+t(nEx===1?"exercise":"exercises")+'</span>'
   +(!week&&sp.days.length>tr?'<span><b>'+sp.days.length+'</b>'+t("day cycle")+'</span>':'')+'</div>';
  /* Until anything is in it, the number of days is one tap. */
  if(!tr)
    h+='<div class="bcount"><span class="bcount-l">'+t("How many days in the cycle?")+'</span><div class="bcount-c">'
     +[2,3,4,5,6,7].map(function(n){return '<button class="'+(sp.days.length===n?'on':'')+'" data-bdays="'+n+'" aria-pressed="'+(sp.days.length===n)+'">'+n+'</button>';}).join("")
     +'</div></div>';
  if(!inline)h+='</div>';
  /* A health condition: what the book says for it, and anything in this program that
     does not fit yet, with one tap to make it fit (engine/plan.js conformProgram). */
  if(active&&rulesFor(S.profile)){
    var iss=conformProgram(JSON.parse(JSON.stringify(sp)),S.profile,S.gear,true),fx="";
    if(iss.length){var sw=iss.filter(function(x){return x.from;}),ds=iss.filter(function(x){return x.dose;});
      fx='<div class="cond-fix"><p>'+esc(t("{n} things in this program don't fit yet.").replace("{n}",iss.length))
       +(sw.length?' '+esc(t("To swap:"))+' '+esc(sw.slice(0,3).map(function(x){return exName(x.from);}).join(S.prefs&&S.prefs.lang==="ar"?"، ":", "))+(sw.length>3?'…':'.'):'')
       +(ds.length?' '+esc(t("Sets or reps to adjust: {n}.").replace("{n}",ds.length)):'')+'</p>'
       +'<button class="btn" data-condfix="'+esc(id)+'">'+esc(t("Make it fit"))+'</button></div>';}
    h+=condCard(S.profile,fx);}
  /* The block's phase sets the reps in the workout, not the numbers below (owner, 3 Nov:
     the program showed 8–12 while the workout asked 12–20). Said where the numbers are. */
  var phb=active?phaseNow():null;
  /* Said once a phase (owner, 3 Nov: "I should be able to acknowledge it"): Got it puts
     it away until the next phase (S.phaseSeen, per profile). */
  if(phb&&phb.reps&&S.phaseSeen!==phb.n)h+='<div class="bphase"><p>'+esc(t("This block is {p}: your workouts use {a}–{b} reps on the lifts, as each phase sets its own. The reps below are the program's, used when training blocks are off in Settings.")
      .replace("{p}",t(phb.name)).replace("{a}",phb.reps.min).replace("{b}",phb.reps.max)).replace(/(\d+)–(\d+)/,'<span class="num" dir="ltr">$1–$2</span>')+'</p><button class="bphase-ok" data-phaseseen="'+phb.n+'">'+esc(t("Got it"))+'</button></div>';
  /* Edit (owner, 3 Nov: a ✕ on every row was always one slip away): the same place the
     Reorder link was, now showing both the ✕ that removes a day (with Undo) and the
     grips that move it. Out of it, the list is the plan and nothing else. */
  var roD=sp.days.length>0&&V.reorder==="bd:"+sp.id;
  h+='<div class="tsec droutine"><h2 class="tsec-h">'+t("Days")+'</h2>'
   +(sp.days.length?reorderBtn("bd:"+sp.id,roD,true):'')+'</div>';
  h+='<div class="drows'+(roD?' ro ed':'')+'">';
  sp.days.forEach(function(d,i){
    var full=d.ex.length>0;
    /* A day with nothing in it is a rest day in the cycle: a thin row, not a card. */
    h+='<div class="drow bkday'+(full?'':' blank')+'" data-k="bd:'+d.id+'" data-rowid="'+d.id+'">'
     +(roD?'<button class="drm" data-rmday="'+d.id+'" aria-label="'+esc(t("Remove")+" "+planName(d.name))+'"><i>'+XSVG+'</i></button>':'')
     +'<button class="dmain" data-day="'+d.id+'"><span class="bnum">'+(i+1)+'</span>'
     +'<span class="dtext"><span class="drow-n">'+esc(planName(d.name))+'</span>'
     +'<span class="drow-s">'+(full?d.ex.length+' '+t(d.ex.length===1?"exercise":"exercises")+'<i class="ddot"></i>~'+estMinutes(d)+' '+t("min")
        :'<em>'+t("Tap to add exercises")+'</em>')+'</span></span>'
     +'<span class="ico ico-chev" aria-hidden="true"></span></button>'
     +(roD?'<button class="dgrip" data-grip="'+d.id+'" aria-label="'+esc(t("Move")+" "+planName(d.name))+'">'+GRIPSVG+'</button>':'')
     /* By weekday, each day carries the week: tap a weekday to pin it here. One another
        day has too is marked: that weekday holds both, as two sessions. */
     +(week?'<div class="bwd" role="group" aria-label="'+esc(t("Weekdays for")+" "+planName(d.name))+'">'
       +weekOrder().map(function(n){
         var mine=(d.wd||[]).indexOf(n)>=0,also=sp.days.some(function(o){return o!==d&&(o.wd||[]).indexOf(n)>=0;}),other=!mine&&also;
         return '<button class="'+(mine?'on':other?'taken':'')+(mine&&also?' two':'')+'" data-wd="'+d.id+'|'+n+'" aria-pressed="'+mine+'">'+esc(wdName(n))+'</button>';}).join("")
       +'</div>':'')
     +'</div>';});
  h+='</div>';
  h+='<button class="dadd" data-bday="1"><span aria-hidden="true">+</span>'+t("Add day")+'</button>';
  /* How the days fall, set once: pinned to weekdays, or one after another whenever you
     train. Under the days it shapes. One card (owner, 3 Nov: the two boxes and the lines
     under them "look like a PDF"): the choice, a picture of what it means for this
     program, and what it allows. */
  h+=schedCard(sp,week,inline);
  /* What an imported program came with: its phase and length, and the coach's notes —
     the rules, the reasons, the warnings — kept with it rather than thrown away. */
  if(sp.meta&&(sp.meta.phase||sp.meta.weeks))
    h+='<p class="bmeta">'+esc([sp.meta.phase,sp.meta.weeks?sp.meta.weeks+" "+t("weeks"):""].filter(Boolean).join(" · "))
     +(sp.start&&sp.meta.weeks?' · '+t("week")+' '+Math.min(sp.meta.weeks,Math.max(1,Math.floor((Date.parse(today()+"T00:00:00")-Date.parse(sp.start+"T00:00:00"))/6048e5)+1)):'')+'</p>';
  if(sp.notes&&sp.notes.length)
    h+='<details class="tinotes bnotes"><summary>'+t("Coach's notes")+' <span class="num">'+sp.notes.length+'</span></summary>'
     +sp.notes.map(function(n){return (n.h?'<h3>'+esc(n.h)+'</h3>':'')+(n.t||[]).map(function(l){return '<p>'+esc(l)+'</p>';}).join("");}).join("")
     +'</details>';
  /* On the plan page, the program's settings are one list, like the meal plan's (owner,
     3 Nov: things that belong together, together; not loose lines of text). */
  if(active&&inline){
    var srow=function(attr,name,sub){return '<button class="srow" '+attr+'><span class="srow-t"><span class="srow-n">'+esc(name)+'</span><span class="srow-s">'+esc(sub)+'</span></span><span class="ico ico-chev" aria-hidden="true"></span></button>';};
    return h+'<section class="sg plset"><div class="sg-list">'
     +srow('data-tplan="programs"',t("Switch program"),t("Another of yours, or a template"))
     +srow('data-sheet="set_training"',t("Workout settings"),t("Progression, warm-up, rest timer, equipment"))
     +(sp.days.some(function(d){return d.ex.length;})?srow('data-shareplan="p:'+esc(id)+'"',t("Share this program"),t("With another Bunyan user")):'')
     +'</div></section>';}
  h+='<div class="dcta">'
   /* To another Bunyan user, as it is (owner, 27 Oct): js/engine/planshare.js. */
   +(sp.days.some(function(d){return d.ex.length;})?'<button class="ddel dset" data-shareplan="p:'+esc(id)+'">'+t("Share this program")+'</button>':'')
   +(active?(inline?'<button class="ddel dset" data-tplan="programs">'+t("Switch program")+'</button>'
             +'<button class="ddel dset" data-sheet="set_training">'+t("Workout settings")+'</button>'
             :'<p class="bactive">✓ '+t("This is your training")+'</p>')
      :'<button class="btn dbegin" data-adopt="'+id+'"'+(tr?'':' disabled')+'>'+t("Make it active")+'</button>'
       +(tr?'':'<p class="bnote">'+t("Add exercises to at least one day first.")+'</p>')
       +'<button class="ddel" data-delsplit="'+id+'">'+t("Delete this program")+'</button>')
   +'</div>';
  return h;}

/* ---- a day: the routine, built in place --------------------------------------
   Everything that shapes the day is on this screen: Edit (where Reorder was) shows the
   ✕ that removes a row (with Undo) and the grips that move it; the dashed + under the
   list adds; the title renames. Tapping an exercise opens its sets, reps and rest. Out of
   Edit the list is the workout and nothing else (owner, 3 Nov: no ✕ one slip away). */
var XSVG='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
var GRIPSVG='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/>'
  +'<circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>';
function vDay(){
  var d=dayOf(V.dayId);if(!d){V.train="days";return vTrain();}
  var sp=ownerOf(d.id)||split(),live=sp===split();
  var pos=sp.days.indexOf(d)+1;
  var lvl=levelOf(sp.from);
  var h='<div class="dhead">'+backArrow()
   +'<button class="dname" data-renameday="'+d.id+'" aria-label="'+esc(t("Rename day"))+': '+esc(planName(d.name))+'">'
   +'<h1 class="dhead-t">'+esc(planName(d.name))+'</h1><span class="ico ico-edit" aria-hidden="true"></span></button></div>'
   +'<p class="dsub">'+esc(planName(sp.name))+(pos?' • '+t("Day")+' '+pos:'')+'</p>';
  /* Every figure measured from the day itself. */
  h+='<div class="dstrip">'
   +'<div><span class="klabel dim">'+t("Exercises")+'</span><b class="num">'+d.ex.length+'</b></div>'
   +'<div><span class="klabel dim">'+t("Duration")+'</span><b>~'+estMinutes(d)+' '+t("Min")+'</b></div>'
   +(lvl&&!d.ex.every(function(e){return isActivity(e.name);})?'<div><span class="klabel dim">'+t("Level")+'</span><b>'+t(lvl)+'</b></div>':'')
   +'</div>';
  /* Edit shows each exercise's ✕ and grip; out of it, the list is the workout. */
  var roX=d.ex.length>0&&V.reorder==="dx:"+d.id;
  h+='<div class="tsec droutine"><h2 class="tsec-h">'+t("Exercises")+'</h2>'
   +(d.ex.length?reorderBtn("dx:"+d.id,roX,true):'')+'</div>';
  if(!d.ex.length)
    h+='<p class="dempty">'+t("A rest day for now. Add exercises and it becomes a training day — sets, reps and rest are filled in for you and can be changed any time.")+'</p>';
  h+='<div class="drows'+(roX?' ro ed':'')+'">';
  d.ex.forEach(function(e,i){
    var gl=groupLabel(d.ex,i),nm=exName(e.name);
    h+='<div class="drow" data-k="dx:'+e.id+'" data-rowid="'+e.id+'">'
     +(roX?'<button class="drm" data-rmex="'+e.id+'" aria-label="'+esc(t("Remove")+" "+nm)+'"><i>'+XSVG+'</i></button>':'')
     +'<button class="dmain" data-editex="'+e.id+'">'
     +'<span class="dnum">'+(i+1)+'</span>'
     +'<span class="dtext"><span class="drow-n">'
     +(gl?'<span class="glabel">'+gl+'</span> ':'')+esc(nm)+'</span>'
     +'<span class="drow-s">'+(isActivity(e.name)
        ?(e.min||(actInfo(e.name).grp==="Sports"?60:30))+' '+t("min")+(e.km?' · '+e.km+' km':'')+'<i class="ddot"></i>'+esc(t(intensityOf(e.rpe||6)[1]))
        :esc(doseText(e))+'<i class="ddot"></i>'+(e.rest||0)+'s')
     +'<i class="ddot"></i>'+esc(tm(muscleOfEntry(e)))+'</span>'
     /* What the plan says about it, and the weeks it belongs to. */
     +(e.note?'<small class="drow-note">'+esc(e.note)+'</small>':'')
     +(e.wk?'<small class="drow-wk">'+esc(weeksText(e.wk))+'</small>':'')
     +'</span></button>'
     +(roX?'<button class="dgrip" data-grip="'+e.id+'" aria-label="'+esc(t("Move")+" "+nm)
       +'" aria-describedby="dgriphelp">'+GRIPSVG+'</button>':'')
     +'</div>';});
  h+='</div>';
  if(roX)h+='<span id="dgriphelp" class="sr">'+t("Drag, or use the arrow keys, to move it up or down.")+'</span>';
  if(d.notes&&d.notes.length)
    h+='<details class="daynotes"><summary>'+t("Session notes")+'</summary>'
     +d.notes.map(function(l){return '<p>'+esc(l)+'</p>';}).join("")+'</details>';
  h+='<button class="dadd" data-addex="'+d.id+'"><span aria-hidden="true">+</span>'+t("Add exercise")+'</button>';
  h+='<div class="dcta">';
  /* A day of a split you are not training on is built here but not started: the
     workout would be filed against the wrong plan. */
  if(d.ex.length&&live)h+=hb('<button class="btn dbegin" data-startday="'+d.id+'">'+t("Begin Workout")+'</button>');
  h+='<button class="ddel" data-delday="'+d.id+'">'+t("Delete this day")+'</button>';
  h+='</div>';
  return h;}

export {builderBody, dayHero, exercisesPage, exHay, programsPage, resumeHero, trainSub, vTrain, wdName, weekOffer};
