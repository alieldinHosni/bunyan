/* Bunyan — train
   Train tab: days, library, splits, bodyweight. */
import {t} from "../../i18n/dict.js";
import {empty, EQUIP, LIB, muscleOf, muscleOfEntry, MUSCLES, thumb} from "../../data/exercises.js";
import {exName} from "../../i18n/exnames.js";
import {groupLabel, vLogger} from "./session.js";
import {allSplits, dayOf, editSplit, ownerOf, S, split} from "../../state.js";
import {SPLIT_LEVEL} from "../../engine/plan.js";
import {deloadDue, inDeload} from "../../engine/formulas.js";
import {nextPinned, pinnedOn, suggestWd} from "../../engine/schedule.js";
import {esc, fmtN, shortd, today, weekDays} from "../../util.js";
import {dateBar, shiftDay} from "../datebar.js";
import {tokenMatch} from "../../engine/text.js";
import {actInfo, intensityOf, isActivity} from "../../data/activities.js";
import {head, V} from "../view.js";
import {backArrow, backBar} from "../nav.js";

/* ============================================================ TRAIN */

/* One photograph per preset, keyed by the split's own id rather than by its position
   in the list. The cards used to read img/program-<i%3+1>.jpg, so six programs shared
   three pictures and which program got which changed whenever the list reordered —
   adopting a split drops it out of "Other Programs" and shifted every image along. */
var SPLIT_IMG={ap:"split-ap",arnold:"split-arnold",ppl:"split-ppl",
  ul:"split-ul",fb:"split-fb",bw:"split-bw",bro:"split-bro"};
/* A split the user built themselves has no photograph of its own. It gets the accent
   field instead of borrowing another programme's picture. */
function splitCover(id){
  var f=SPLIT_IMG[id];
  return f?'<span class="tcover"><img src="img/'+f+'.jpg" alt="" loading="lazy"></span>'
          :'<span class="tcover tcover-none"></span>';}

/* ---- where the rotation stands ------------------------------------------------
   The latest planned session sets it; a run or a match logged on its own (no day id)
   does not move it. The next training day is due once the rest days that follow the
   last session in the cycle have passed on the calendar — rest days used to be skipped
   over, so three full-body sessions landed on consecutive days. A missed day is never
   skipped: once due, the next session stays due until it is done. */
function addDaysISO(iso,n){var d=new Date(iso+"T00:00:00");d.setDate(d.getDate()+n);
  return new Date(d.getTime()-d.getTimezoneOffset()*6e4).toISOString().slice(0,10);}
function rotation(sp){
  var len=sp.days.length,now=today();if(!len)return null;
  var ls=null,li=-1;
  for(var j=0;j<S.sessions.length&&!ls;j++){
    var s=S.sessions[j];if(!s.dayId)continue;
    for(var i=0;i<len;i++)if(sp.days[i].id===s.dayId){ls=s;li=i;break;}}
  var start=ls?li+1:0,rests=0,idx=-1;
  for(var k=0;k<len;k++){
    var d=sp.days[(start+k)%len];
    if(d.ex.length){idx=(start+k)%len;break;}
    rests++;}
  if(idx<0)return null;
  var due=ls?addDaysISO(ls.date,rests+1):now;
  if(due<now)due=now;
  return {idx:idx,due:due,last:ls,li:li};}
/* The next day to train. By weekday: today's pinned day unless it is already done,
   else the next pinned one. In rotation: the next in order. */
function nextDayOf(sp){
  if(sp.schedule==="week"){
    var now=today(),done=S.sessions.some(function(s){return s.date===now&&s.dayId;});
    var n=nextPinned(sp,done?addDaysISO(now,1):now);return n?n.day:null;}
  var r=rotation(sp);return r?sp.days[r.idx]:null;}
/* Short weekday names in the app's language, Monday = 1. */
function wdName(n){
  var d=new Date(2024,0,n);/* 1 Jan 2024 was a Monday */
  try{return d.toLocaleDateString(S.prefs&&S.prefs.lang==="ar"?"ar-EG":"en-GB",{weekday:"short"});}
  catch(e){return ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][n-1];}}

/* ---- the plan on a date --------------------------------------------------------
   The split is a rotation, not a calendar, so "what is on Thursday" is a projection:
   today is the next day of the rotation (or the one already trained today), and each
   day after takes the next one in order, rest days included. A past day is whatever
   was logged. */
var ACTIVITY='<svg viewBox="0 0 24 24"><path d="M3 12h4l2-6 4 12 2-6h6"/></svg>';
var DUMBBELL='<svg viewBox="0 0 24 24"><path d="M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11"/></svg>';
var MOON='<svg viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>';
function daysApart(a,b){return Math.round((new Date(b+"T00:00:00")-new Date(a+"T00:00:00"))/864e5);}
function planOn(sp,iso){
  var now=today();
  var logged=S.sessions.filter(function(x){return x.date===iso&&x.dayId;});
  /* Today, a run on its own does not stand in for the day's workout. */
  if(!logged.length&&iso<now)logged=S.sessions.filter(function(x){return x.date===iso;});
  if(logged.length){
    var ld=sp.days.filter(function(d){return d.id===logged[0].dayId;})[0]||null;
    return {kind:"done",session:logged[0],day:ld,name:logged[0].dayName};}
  if(iso<now)return {kind:"past"};
  /* A day the user has swapped by hand ("today I'd rather do Anterior") wins over
     the rotation for that date only; the rotation carries on from whatever is
     actually trained. */
  var sw=S.daySwap&&S.daySwap[iso];
  if(sw){var od=sp.days.filter(function(d){return d.id===sw;})[0];
    if(od)return {kind:iso===now?"today":"plan",day:od,name:od.name,rest:!od.ex.length,swapped:true};}
  /* By weekday: whatever is pinned to that weekday, and a rest day otherwise. */
  if(sp.schedule==="week"){
    var pd=pinnedOn(sp,iso),kw=iso===now?"today":"plan";
    if(!sp.days.some(function(d){return d.ex.length&&(d.wd||[]).length;}))return {kind:"none"};
    if(pd)return {kind:kw,day:pd,name:pd.name,rest:false};
    var nx=nextPinned(sp,iso);
    return {kind:kw,day:null,name:t("Rest day"),rest:true,next:nx&&nx.day};}
  var r=rotation(sp);
  if(!r)return {kind:"none"};
  var len=sp.days.length,kind=iso===now?"today":"plan",d;
  /* Still inside the rest that follows the last session. */
  if(iso<r.due&&r.last){
    d=sp.days[(r.li+daysApart(r.last.date,iso))%len];
    return {kind:kind,day:d,name:d.name,rest:true,next:sp.days[r.idx]};}
  d=sp.days[(r.idx+daysApart(r.due,iso))%len];
  return {kind:kind,day:d,name:d.name,rest:!d.ex.length,next:sp.days[r.idx]};}
function planNote(p){
  if(p.kind==="past")return t("Nothing logged");
  if(p.kind==="none")return t("Nothing planned");
  if(p.rest)return t("Rest day");
  return p.name||"";}
/* The selected day's card. What it offers depends on when the day is: today can be
   started, a future day previewed, a finished one opened. */
function dayHero(sp,p,iso){
  var label,cta="",meta="";
  if(p.kind==="done"){
    var sv=p.session;
    label=iso===today()?t("Done today"):t("Completed");
    meta=(sv.mins?sv.mins+' '+t("min")+' · ':'')+sv.entries.filter(function(e){return (e.sets||[]).length;}).length+' '+t("exercises");
    cta='<button class="btn g" data-openday="'+iso+'">'+t("View session")+'</button>';
  }else if(p.kind==="past"||p.kind==="none"){
    label=p.kind==="past"?t("No session"):t("Nothing planned");
    meta=p.kind==="past"?t("Nothing was logged on this day."):t("Add exercises to a day and it becomes startable.");
    if(p.kind==="none")cta='<button class="btn" data-addday="1">'+t("Add a day")+'</button>';
  }else if(p.rest){
    label=p.kind==="today"?t("Today"):t("Planned");
    meta=t("Recover. The plan picks up the day after.");
    /* A rest day is advice, not a lock: someone who feels good can train anyway. */
    if(p.kind==="today"&&p.next)
      cta='<button class="btn g" data-startday="'+p.next.id+'">'+t("Train anyway")+' · '+esc(p.next.name)+'</button>';
  }else{
    label=p.kind==="today"?t("Current workout"):t("Planned");
    meta=p.day.ex.length+' '+t("exercises")+' · ~'+estMinutes(p.day)+' '+t("min");
    cta=p.kind==="today"
      ?'<button class="btn" data-startday="'+p.day.id+'"><span class="ico ico-play" aria-hidden="true"></span>'+t("Start workout")+'</button>'
      :'<button class="btn g" data-day="'+p.day.id+'">'+t("Preview the day")+'</button>';
  }
  var name=p.kind==="past"?t("Rest or unlogged"):p.kind==="none"?esc(sp.name):(p.rest?t("Rest day"):p.name);
  /* Any day still ahead can be switched to another day of the plan. */
  var swap=(p.kind==="today"||p.kind==="plan")&&sp.days.length>1
    ?'<button class="thero2-swap" data-swapday="'+iso+'" aria-label="'+esc(t("Change this day's workout"))+'">'
      +'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h13l-3-3M20 16H7l3 3"/></svg><span>'+t("Change")+'</span></button>':'';
  return '<div class="thero2'+(p.kind==="today"&&!p.rest?' live':'')+'">'
   +'<img class="thero2-art" src="intro.jpg" alt="" aria-hidden="true" width="902" height="897" decoding="async">'+swap
   +'<div class="thero2-top"><span class="tbadge'+(p.rest||p.kind==="past"?' rest':'')+'" aria-hidden="true">'
   +(p.rest||p.kind==="past"?MOON:DUMBBELL)+'</span>'
   +'<div class="thero2-t"><span class="klabel">'+esc(label)+'</span>'
   +'<div class="thero2-n">'+esc(name)+'</div>'
   +'<div class="thero2-m">'+esc(meta)+'</div></div></div>'
   +cta+'</div>';}

function vTrain(){
  if(S.active)return vLogger();
  if(V.train==="splits")return vSplits();
  if(V.train==="builder")return vBuilder();
  if(V.train==="preview")return vPreview();
  if(V.train==="library")return vLibrary();
  if(V.train==="bodyweight")return vBodyweight();
  if(V.train==="day")return vDay();
  if(V.train==="favs")return vFavs();
  /* ---- the hub: canvas screen 1 (Figma node 2:810) ------------------------------
     Built from the canvas's layout in the core frames' tokens, so the app stays one
     system. Every figure is computed from the user's own data; the frame's "Week 4 of
     12 · 33%" is placeholder text, and programs here have no fixed length in weeks. */
  var sp=split(),h="";
  var nd=nextDayOf(sp);
  var wk=weekDays(),inWeek={};
  wk.forEach(function(d){inWeek[d]=1;});
  var doneWeek=S.sessions.filter(function(x){return inWeek[x.date];}).length;
  var target=sp.days.filter(function(d){return d.ex.length;}).length;
  /* Sessions done this week out of the sessions the split plans for it: 2 of 4 is 50%.
     Capped at 100, because training more than planned is not more than finished. */
  var pct=target?Math.min(100,Math.round(doneWeek/target*100)):0;
  var sel=V.tdate||today(), on=planOn(sp,sel);
  h+='<div class="thead"><div><h1>'+t("Workout Plan")+'</h1>'
   +'<p class="thead-s">'+t("Keep pushing. You got this.")+'</p></div>'
   +'<button class="icobtn" data-train="favs" aria-label="'+t("Favourites")
   +(S.favs.length?' ('+S.favs.length+')':'')+'"><span class="ico ico-star" aria-hidden="true"></span></button></div>';

  /* ---- the day: the shared date navigator, looking ahead. Its second line says what
     the plan holds that day, so paging through the week reads the plan out. */
  h+=dateBar({date:sel,open:V.tcal,monthOffset:V.cal,future:true,art:true,
    kicker:t("Workout plan"),note:planNote(on)});

  /* ---- the selected day, over the Bunyan artwork (the frame's "Current Workout") */
  h+=dayHero(sp,on,sel);
  h+='<div class="tprog tprog-wk"><div class="tprog-l"><span>'+esc(sp.name)+' · '+doneWeek+' '+t("of")+' '+target+' '
   +t("sessions this week")+'</span><b>'+pct+'%</b></div>'
   +'<div class="tbar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+pct+'"'
   +' aria-label="'+t("Sessions this week")+'"><i style="width:'+pct+'%"></i></div></div>';

  /* ---- a lighter week: offered when the log shows it is due, shown while it runs */
  h+=deloadCard();
  h+=weekOffer(sp);
  /* ---- two tiles, side by side: the plan's days (in a sheet, so the page stays
     short) and the library. The next two days are one swipe of the date bar away. */
  var nDays=sp.days.length;
  h+='<div class="ttiles">'
   +'<button class="ttile" data-mydays="1"><span class="ttile-i" aria-hidden="true">'+DUMBBELL+'</span>'
   +'<span class="ttile-n">'+t("My Training")+'</span>'
   +'<span class="ttile-s">'+nDays+' '+t(nDays===1?"day":"days")+' · '+esc(sp.name)+'</span></button>'
   +'<button class="ttile" data-train="library"><span class="ttile-i" aria-hidden="true"><span class="ico ico-search"></span></span>'
   +'<span class="ttile-n">'+t("Exercise Library")+'</span>'
   +'<span class="ttile-s">'+fmtN(LIB.length)+' '+t("exercises")+'</span></button>'
   /* Cardio and sports, logged as time and effort — a run, a match, a class. */
   +'<button class="ttile wide" data-actsheet="1"><span class="ttile-i" aria-hidden="true">'+ACTIVITY+'</span>'
   +'<span class="ttile-tx"><span class="ttile-n">'+t("Cardio & Sports")+'</span>'
   +'<span class="ttile-s">'+t("Running, football, padel, tennis, classes…")+'</span></span>'
   +'<span class="ico ico-chev" aria-hidden="true"></span></button></div>';
  /* ---- other programs ----
     The app's own preset splits, each with its own photograph — see SPLIT_IMG.
     No "premium": everything here is free. */
  var others=allSplits().filter(function(o){return !editSplit(o.id)&&o.id!==sp.from;});
  if(others.length){
    h+='<div class="tsec"><h2 class="tsec-h">'+t("Other Programs")+'</h2>'
     +'<button class="tlink" data-train="splits">'+t("All")+'</button></div>'
     +'<div class="tscroll">';
    others.forEach(function(o){
      var days=o.days.filter(function(d){return d.ex.length;}).length;
      var lvl=levelOf(o.id);
      h+='<button class="tprog-card" data-preview="'+o.id+'">'
       +splitCover(o.id)
       +'<span class="tpc-body"><span><span class="tpc-n">'+esc(o.name)+'</span>'
       +'<span class="tpc-s">'+esc(tagNote(o.tag))+'</span></span>'
       +'<span class="tpc-m"><span>'+days+' '+t("days / week")+'</span>'
       +(lvl?'<span class="tchip">'+t(lvl)+'</span>':'')+'</span></span></button>';});
    h+='</div>';
  }
  /* ---- bodyweight & no equipment ----
     Each pill opens the library on that muscle with bodyweight only (data-bwcat, which
     already existed). The muscles are the ones that actually have bodyweight exercises,
     most first — the canvas's "Abs"/"Mobility" labels are not categories this library has.
     The last pill is the four-day bodyweight programme. */
  var bw={};
  LIB.forEach(function(l){if(l[2]==="Bodyweight")bw[l[1]]=(bw[l[1]]||0)+1;});
  var cats=Object.keys(bw).sort(function(a,b){return bw[b]-bw[a];}).slice(0,6);
  h+='<div class="tsec"><h2 class="tsec-h">'+t("Bodyweight & No Equipment")+'</h2></div>'
   +'<div class="tscroll tpills">'
   +cats.map(function(c){return '<button class="tpill" data-bwcat="'+esc(c)+'">'+esc(t(c))+'</button>';}).join("")
   +'<button class="tpill" data-bwsplit="1">'+t("Full Body Program")+'</button></div>';
  return h;}
/* A suggestion with its reason and two answers, or — during the week — a quiet line
   saying it is on and until when, with a way out. Never shown mid-workout. */
function deloadCard(){
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
/* Offered once, for a program running in rotation: fixed weekdays, suggested from
   when each day has actually been trained. */
function weekOffer(sp){
  if(sp.schedule==="week"||S.wdOffered)return "";
  var train=sp.days.filter(function(d){return d.ex.length;});
  if(train.length<2)return "";
  var sug=suggestWd(sp);
  var line=train.map(function(d){return esc(d.name)+' · '+(sug[d.id]||[]).map(wdName).join(", ");}).join('<br>');
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
function myDaysList(){
  var sp=split(),h='<div class="card tdays">';
  var todayId=(planOn(sp,today()).day||{}).id;
  sp.days.forEach(function(d){
    var last=null;
    for(var i=0;i<S.sessions.length;i++)if(S.sessions[i].dayId===d.id){last=S.sessions[i].date;break;}
    h+='<button class="trow" data-day="'+d.id+'"><span><span class="trow-n">'+esc(d.name)+'</span>'
     +'<span class="trow-s">'+(d.ex.length?d.ex.length+' '+t("exercises"):t("rest day"))
     +(last?' · '+t("last")+' '+shortd(last):'')+'</span></span>'
     +(d.id===todayId?'<span class="tnext">'+t("Today")+'</span>':'')
     +'<span class="ico ico-chev" aria-hidden="true"></span></button>';});
  return h+'<button class="trow tadd" data-addday="1"><span class="trow-n">+ '+t("Add a day")+'</span></button></div>';
}

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
     +'<div class="tiny">'+t(muscleOf(n))+'</div></div>'
     +'<span class="chev">\u203a</span></button>';});
  return h+'</div>';}

function estMinutes(d){
  var tot=0;
  d.ex.forEach(function(e){
    tot+=isActivity(e.name)?(e.min||(actInfo(e.name).grp==="Sports"?60:30))*60:e.sets*((e.rest||75)+35);});
  return Math.round(tot/60/5)*5;}

function vPreview(){
  var sp=allSplits().filter(function(x){return x.id===V.previewId;})[0];
  if(!sp){V.train="splits";return vTrain();}
  var h=backBar();
  h+='<h1>'+esc(sp.name)+'</h1><p class="sub">'+esc(sp.tag||"custom")+'</p>';
  sp.days.forEach(function(d){
    if(!d.ex.length){h+='<div class="card"><div class="row"><h3 class="dim">'+esc(d.name)
      +'</h3><span class="tiny">rest</span></div></div>';return;}
    h+='<div class="card"><div class="row"><h3>'+esc(d.name)+'</h3>'
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
function exHay(l){return l[0]+" "+exName(l[0])+" "+l[1]+" "+t(l[1])+" "+l[2]+" "+t(l[2]);}
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
  h+='<div class="libhero"><img class="libhero-art" src="mark.png" alt="" aria-hidden="true" width="440" height="440" decoding="async">'
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
    h+='<button class="pill'+(V.exm===m?" a":"")+'" data-exm="'+m+'" aria-pressed="'+(V.exm===m)+'">'+t(m)+'</button>';});
  h+='</div><div class="libfilters" role="group" aria-label="'+t("Equipment")+'">';
  ["All"].concat(EQUIP).forEach(function(q2){
    h+='<button class="pill'+(V.exe===q2?" a":"")+'" data-exe="'+q2+'" aria-pressed="'+(V.exe===q2)+'">'+t(q2)+'</button>';});
  h+='</div>';
  if(list.length){
    h+='<div class="tsec"><h2 class="tsec-h">'
     +(V.exm==="All"?t("All Exercises"):t(V.exm)+' '+t("Exercises"))+'</h2>'
     +'<span class="libn">'+fmtN(list.length)+'</span></div><div class="card tdays">';
    list.slice(0,120).forEach(function(l){
      h+='<button class="trow libtrow" data-exdetail="'+esc(l[0])+'">'+thumb(l[0],52)
       +'<span><span class="trow-n">'+esc(exName(l[0]))+'</span>'
       +'<span class="trow-s">'+t(l[1])+(l[2]==="Other"&&(l[1]==="Cardio"||l[1]==="Sports")?'':' \u00b7 <b>'+t(l[2])+'</b>')+'</span></span>'
       +'<span class="ico ico-chev" aria-hidden="true"></span></button>';});
    h+='</div>';}
  if(list.length>120)h+='<p class="tiny" style="text-align:center">'+t("Showing the first 120. Narrow the filters.")+'</p>';
  if(!list.length)h+=empty("search",
    q?t("Nothing matches")+" “"+esc(V.exq)+"”":t("Nothing matches those filters"),
    t("Your gym may call it something else, or it may not be in the library at all."),
    '<button class="btn" data-customex="1">'+t("Add it yourself")+'</button>');
  return h;}

/* ---- programs: the ready-made splits (fixed) and yours (editable) -------------
   Ready-made splits cannot be changed or deleted, only previewed and adopted. Yours
   open in the builder, and each has an ✕ that deletes it after one question. */
var HERO_ART='<img class="libhero-art" src="mark.png" alt="" aria-hidden="true" width="440" height="440" decoding="async">';
var PLUS='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
function vSplits(){
  var h=backBar(),mine=S.activeProgram,us=S.programs||[];
  /* The same hero as the library: the Bunyan mark over the red glow. */
  h+='<div class="libhero bhero">'+HERO_ART
   +'<span class="shk">'+t("Training")+'</span><h1>'+t("Programs")+'</h1>'
   +'<p class="sub">'+t("One active at a time. Build your own, or start from a proven program.")+'</p>'
   +'<button class="bnew" data-newsplit="1"><span class="bnew-i">'+PLUS+'</span>'
   +'<span class="bnew-t"><b>'+t("Build a program from scratch")+'</b><span>'+t("Name it, pick the days, fill them from the library")+'</span></span>'
   +'<span class="ico ico-chev" aria-hidden="true"></span></button></div>';
  if(us.length){
    h+='<div class="tsec"><h2 class="tsec-h">'+t("My programs")+'</h2><span class="libn">'+us.length+'</span></div><div class="drows">';
    us.forEach(function(sp){
      var src=editSplit(sp.id)||sp,tr=src.days.filter(function(d){return d.ex.length;}).length,on=mine===sp.id;
      h+='<div class="drow bsp'+(on?' on':'')+'" data-k="us:'+sp.id+'">'
       /* The active program cannot be deleted from here: switch away from it first. */
       +(on?'<span class="drm" aria-hidden="true"></span>'
          :'<button class="drm" data-delsplit="'+sp.id+'" aria-label="'+esc(t("Delete")+" "+src.name)+'"><i>'+XSVG+'</i></button>')
       +'<button class="dmain" data-editsplit="'+sp.id+'"><span class="dtext"><span class="drow-n">'+esc(src.name)+'</span>'
       +'<span class="drow-s">'+src.days.length+' '+t(src.days.length===1?"day":"days")+'<i class="ddot"></i>'
       +tr+' '+t(tr===1?"training day":"training days")+'</span></span>'
       +(on?'<span class="bpill">'+t("Active")+'</span>':'<span class="ico ico-chev" aria-hidden="true"></span>')
       +'</button></div>';});
    h+='</div>';}
  h+='<div class="tsec"><h2 class="tsec-h">'+t("Ready-made")+'</h2><span class="dhint">'+t("Fixed — adopt one to train on it")+'</span></div>';
  h+='<div class="card tdays">';
  allSplits().filter(function(sp){return !editSplit(sp.id);}).forEach(function(sp){
    var days=sp.days.filter(function(d){return d.ex.length;}).length;
    h+='<button class="trow" data-preview="'+sp.id+'"><span class="bdays" aria-hidden="true"><b>'+days+'</b>'+t("days")+'</span>'
     +'<span><span class="trow-n">'+esc(sp.name)+'</span>'
     +'<span class="trow-s">'+(tagNote(sp.tag)?esc(t(tagNote(sp.tag))):'')+'</span></span>'
     +'<span class="ico ico-chev" aria-hidden="true"></span></button>';});
  return h+'</div>';}

/* ---- the split builder ------------------------------------------------------------
   One screen per split you made: how many days, each day with an ✕ and a grip, a +
   for another, and a tap into any day to fill it from the library. */
function vBuilder(){
  var sp=editSplit(V.previewId);if(!sp){V.train="splits";return vSplits();}
  var active=S.activeProgram===V.previewId,week=sp.schedule=="week";
  var tr=sp.days.filter(function(d){return d.ex.length;}).length;
  var nEx=sp.days.reduce(function(n,d){return n+d.ex.length;},0);
  var h=backBar();
  h+='<div class="libhero bhero">'+HERO_ART
   +'<span class="shk">'+t(active?"Your training":"Program builder")+'</span>'
   +'<button class="dname" data-renamesplit="'+V.previewId+'" aria-label="'+esc(t("Rename program"))+': '+esc(sp.name)+'">'
   +'<h1 class="dhead-t">'+esc(sp.name)+'</h1><span class="ico ico-edit" aria-hidden="true"></span></button>'
   +'<div class="bstats"><span><b>'+sp.days.length+'</b>'+t(sp.days.length===1?"day":"days")+'</span>'
   +'<span><b>'+tr+'</b>'+t(tr===1?"training day":"training days")+'</span>'
   +'<span><b>'+nEx+'</b>'+t(nEx===1?"exercise":"exercises")+'</span></div>';
  /* Until anything is in it, the number of days is one tap. */
  if(!tr)
    h+='<div class="bcount"><span class="bcount-l">'+t("How many days in the cycle?")+'</span><div class="bcount-c">'
     +[2,3,4,5,6,7].map(function(n){return '<button class="'+(sp.days.length===n?'on':'')+'" data-bdays="'+n+'" aria-pressed="'+(sp.days.length===n)+'">'+n+'</button>';}).join("")
     +'</div></div>';
  h+='</div>';
  /* How the days fall: pinned to weekdays, or one after another whenever you train. */
  h+='<div class="bsched" role="group" aria-label="'+esc(t("Schedule"))+'">'
   +'<button class="'+(week?'on':'')+'" data-sched="week" aria-pressed="'+week+'"><b>'+t("By weekday")+'</b><span>'+t("Same days every week")+'</span></button>'
   +'<button class="'+(week?'':'on')+'" data-sched="cycle" aria-pressed="'+!week+'"><b>'+t("In rotation")+'</b><span>'+t("Next day whenever you train")+'</span></button></div>';
  h+='<div class="tsec droutine"><h2 class="tsec-h">'+t("Days")+'</h2>'
   +(sp.days.length>1?'<span class="dhint">'+t("Hold the grip to reorder")+'</span>':'')+'</div>';
  h+='<div class="drows">';
  sp.days.forEach(function(d,i){
    var full=d.ex.length>0;
    h+='<div class="drow bkday'+(full?'':' blank')+'" data-k="bd:'+d.id+'" data-rowid="'+d.id+'">'
     +'<button class="drm" data-rmday="'+d.id+'" aria-label="'+esc(t("Remove")+" "+d.name)+'"><i>'+XSVG+'</i></button>'
     +'<button class="dmain" data-day="'+d.id+'"><span class="bnum">'+(i+1)+'</span>'
     +'<span class="dtext"><span class="drow-n">'+esc(d.name)+'</span>'
     +'<span class="drow-s">'+(full?d.ex.length+' '+t(d.ex.length===1?"exercise":"exercises")+'<i class="ddot"></i>~'+estMinutes(d)+' '+t("min")
        :'<em>'+t("Tap to add exercises")+'</em>')+'</span></span>'
     +'<span class="ico ico-chev" aria-hidden="true"></span></button>'
     +(sp.days.length>1?'<button class="dgrip" data-grip="'+d.id+'" aria-label="'+esc(t("Move")+" "+d.name)+'">'+GRIPSVG+'</button>':'')
     /* By weekday, each day carries the week: tap a weekday to pin it here. One taken
        by another day is dimmed, and tapping it moves it to this one. */
     +(week?'<div class="bwd" role="group" aria-label="'+esc(t("Weekdays for")+" "+d.name)+'">'
       +[1,2,3,4,5,6,7].map(function(n){
         var mine=(d.wd||[]).indexOf(n)>=0,other=!mine&&sp.days.some(function(o){return o!==d&&(o.wd||[]).indexOf(n)>=0;});
         return '<button class="'+(mine?'on':other?'taken':'')+'" data-wd="'+d.id+'|'+n+'" aria-pressed="'+mine+'">'+esc(wdName(n))+'</button>';}).join("")
       +'</div>':'')
     +'</div>';});
  h+='</div><button class="dadd" data-bday="1"><span aria-hidden="true">+</span>'+t("Add day")+'</button>';
  h+='<div class="dcta">'
   +(active?'<p class="bactive">✓ '+t("This is your training")+'</p>'
      :'<button class="btn dbegin" data-adopt="'+V.previewId+'"'+(tr?'':' disabled')+'>'+t("Make it active")+'</button>'
       +(tr?'':'<p class="bnote">'+t("Add exercises to at least one day first.")+'</p>'))
   +'<button class="ddel" data-delsplit="'+V.previewId+'">'+t("Delete this program")+'</button></div>';
  return h;}

/* ---- a day: the routine, built in place --------------------------------------
   Everything that shapes the day is on the screen itself: ✕ on a row removes it (with
   Undo), the grip on its other end drags it to a new place, the dashed + under the
   list adds, and the title renames. Tapping the exercise opens its sets, reps and
   rest. There is no edit mode to find first. */
var XSVG='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
var GRIPSVG='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/>'
  +'<circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>';
function vDay(){
  var d=dayOf(V.dayId);if(!d){V.train="days";return vTrain();}
  var sp=ownerOf(d.id)||split(),live=sp===split();
  var pos=sp.days.indexOf(d)+1;
  var lvl=levelOf(sp.from);
  var h='<div class="dhead">'+backArrow()
   +'<button class="dname" data-renameday="'+d.id+'" aria-label="'+esc(t("Rename day"))+': '+esc(d.name)+'">'
   +'<h1 class="dhead-t">'+esc(d.name)+'</h1><span class="ico ico-edit" aria-hidden="true"></span></button></div>'
   +'<p class="dsub">'+esc(sp.name)+(pos?' • '+t("Day")+' '+pos:'')+'</p>';
  /* Every figure measured from the day itself. */
  h+='<div class="dstrip">'
   +'<div><span class="klabel dim">'+t("Exercises")+'</span><b>'+d.ex.length+' '+t(d.ex.length===1?"Movement":"Movements")+'</b></div>'
   +'<div><span class="klabel dim">'+t("Duration")+'</span><b>~'+estMinutes(d)+' '+t("Min")+'</b></div>'
   +(lvl&&!d.ex.every(function(e){return isActivity(e.name);})?'<div><span class="klabel dim">'+t("Level")+'</span><b>'+t(lvl)+'</b></div>':'')
   +'</div>';
  h+='<div class="tsec droutine"><h2 class="tsec-h">'+t("Session Routine")+'</h2>'
   +(d.ex.length>1?'<span class="dhint">'+t("Hold the grip to reorder")+'</span>':'')+'</div>';
  if(!d.ex.length)
    h+='<p class="dempty">'+t("A rest day for now. Add exercises and it becomes a training day — sets, reps and rest are filled in for you and can be changed any time.")+'</p>';
  h+='<div class="drows">';
  d.ex.forEach(function(e,i){
    var gl=groupLabel(d.ex,i),nm=exName(e.name);
    h+='<div class="drow" data-k="dx:'+e.id+'" data-rowid="'+e.id+'">'
     +'<button class="drm" data-rmex="'+e.id+'" aria-label="'+esc(t("Remove")+" "+nm)+'"><i>'+XSVG+'</i></button>'
     +'<button class="dmain" data-editex="'+e.id+'">'
     +'<span class="dnum">'+(i+1)+'</span>'
     +'<span class="dtext"><span class="drow-n">'
     +(gl?'<span class="glabel">'+gl+'</span> ':'')+esc(nm)+'</span>'
     +'<span class="drow-s">'+(isActivity(e.name)
        ?(e.min||(actInfo(e.name).grp==="Sports"?60:30))+' '+t("min")+(e.km?' · '+e.km+' km':'')+'<i class="ddot"></i>'+esc(t(intensityOf(e.rpe||6)[1]))
        :e.sets+' × '+e.lo+(e.hi!==e.lo?'–'+e.hi:'')+'<i class="ddot"></i>'+(e.rest||0)+'s')
     +'<i class="ddot"></i>'+esc(t(muscleOfEntry(e)))+'</span></span></button>'
     +(d.ex.length>1?'<button class="dgrip" data-grip="'+e.id+'" aria-label="'+esc(t("Move")+" "+nm)
       +'" aria-describedby="dgriphelp">'+GRIPSVG+'</button>':'')
     +'</div>';});
  h+='</div>';
  if(d.ex.length>1)h+='<span id="dgriphelp" class="sr">'+t("Drag, or use the arrow keys, to move it up or down.")+'</span>';
  h+='<button class="dadd" data-addex="'+d.id+'"><span aria-hidden="true">+</span>'+t("Add exercise")+'</button>';
  h+='<div class="dcta">';
  /* A day of a split you are not training on is built here but not started: the
     workout would be filed against the wrong plan. */
  if(d.ex.length&&live)h+='<button class="btn dbegin" data-startday="'+d.id+'">'+t("Begin Workout")+'</button>';
  h+='<button class="ddel" data-delday="'+d.id+'">'+t("Delete this day")+'</button>';
  h+='</div>';
  return h;}

export {estMinutes, exHay, myDaysList, nextDayOf, planOn, vTrain, wdName};
