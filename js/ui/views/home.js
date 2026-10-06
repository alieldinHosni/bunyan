/* Bunyan — the top of the Training page
   There is no Home tab any more: Training is where the app opens. What Home had that
   belongs to the day lives on: the greeting, one reminder at most, and the weigh-in
   and steps tiles here; calories and water on Food; the coach's advice in Coach. */
import {t} from "../../i18n/dict.js";
import {backupAgeDays, backupDue, lastWeight} from "../../engine/formulas.js";
import {daysBetween, weightChange} from "../../engine/stats.js";
import {curProfile, dayRec, S} from "../../state.js";
import {toDisp, wUnit} from "../../units.js";
import {dfmt, esc, fmtN, num, today} from "../../util.js";
import {art} from "../art.js";

/* ---- pieces the frame is made of ------------------------------------------ */

/* Time of day decides the greeting, as the design's "Good Morning" implies. */
function greeting(){
  var h=new Date().getHours();
  return h<12?t("Good Morning"):h<17?t("Good Afternoon"):t("Good Evening");
}

/* The profile's own name. "Me" is the placeholder a fresh profile is created with,
   so it is treated as no name at all rather than greeted by. */
function ownName(){
  var n=(curProfile().name||"").trim();
  return n&&n!=="Me"?n:"";
}

/* One reminder at most, the most pressing first: the assessment that builds the plan,
   then a backup, then a weigh-in. (A lighter week has its own card on this page, and
   the coach's advice its own place in Coach.) */
function reminder(){
  if(!S.onboarded)
    return '<button class="card tap hot hnote" data-setup="1"><div class="row"><h3>'+t("Build my plan")+'</h3>'
     +'<span class="pill a">'+t("Start here")+'</span></div>'
     +'<p class="tiny" style="margin:6px 0 0">'+t("A short assessment, and the coach builds your daily targets, your training and a meal plan, and puts them here and on Food.")+'</p></button>';
  if(backupDue()){
    var age=backupAgeDays();
    return '<div class="card hnote gold"><h3>'+t("Back up your history")+'</h3>'
     +'<p class="tiny" style="margin:6px 0 0">'
     +(age===null?t("You have never exported a backup. Everything lives in this browser — clearing its data would take your whole log with it.")
        :t("Your last backup was")+' '+age+' '+t("days ago."))+'</p>'
     +'<div class="rowc mt"><button class="btn sm" data-export="1">'+t("Export a backup")+'</button>'
     +'<button class="btn d sm" data-snoozebackup="1">'+t("Not now")+'</button></div></div>';}
  var w=(S.body||[]).filter(function(b){return num(b.weight)>0;}).map(function(b){return b.date;}).sort().pop();
  if(S.sessions.length&&(!w||daysBetween(w,today())>=7))
    return '<button class="card tap hnote" data-sheet="weigh"><h3>'+t("Time to weigh in")+'</h3>'
     +'<p class="tiny" style="margin:6px 0 0">'+t(w?"A week since the last one. Mornings, before eating, compare best.":"One weigh-in starts your trend. Mornings, before eating, compare best.")+'</p></button>';
  return "";}
function tile(attr,cls,icon,label,value,sub,aria){
  return '<button class="htile '+cls+'" '+attr+' aria-label="'+esc(aria)+'">'
   +'<span class="htile-i" aria-hidden="true"><svg viewBox="0 0 24 24">'+icon+'</svg></span>'
   +'<span class="htile-k">'+esc(label)+'</span><span class="htile-v">'+value+'</span>'
   +'<span class="htile-s">'+sub+'</span></button>';}
var HI={
  steps:'<path d="M8 3c2 0 3 2 3 5s-1 5-3 5-3-2-3-5 1-5 3-5zM6 16h4v2a2 2 0 0 1-4 0zM16 7c2 0 3 2 3 5s-1 5-3 5-3-2-3-5 1-5 3-5zM14 20h4"/>',
  weight:'<path d="M5 20h14l-2-12H7zM9 8a3 3 0 0 1 6 0M12 12v3"/>'};
/* The greeting under a drawing for the time of day, then the one reminder. */
function trainTop(){
  var name=ownName(),hr=new Date().getHours(),scene=hr<12?"sunrise":hr<17?"sun":"moon";
  return '<div class="hgreet">'+art(scene,{cls:"hgreet-art"})+'<div>'
   +'<div class="hdate">'+esc(dfmt(new Date(),{weekday:"long",day:"numeric",month:"short"}))+'</div>'
   /* The name is its own run: a Latin name beside an Arabic greeting otherwise drags
      the comma to the wrong side ("Khalid ,صباح الخير"). Arabic takes its own comma. */
   +'<h1>'+esc(greeting())+(name?esc(S.prefs.lang==="ar"?"، ":", ")+'<bdi>'+esc(name)+'</bdi>':'')+'</h1></div>'
   +(name?'<div class="havatar" aria-hidden="true">'+esc(name.charAt(0).toUpperCase())+'</div>':'')
   +'</div>'+reminder();}
/* Weigh-in and steps, each one tap into its one-field sheet. */
function bodyTiles(){
  var g=S.goals,r=dayRec(today()),kg=lastWeight(),wc=weightChange();
  return '<div class="htiles two">'
   +tile('data-sheet="weigh"','weight',HI.weight,t("Weight"),
      kg?'<b>'+toDisp(kg)+'</b><small>'+esc(wUnit())+'</small>':'<b>—</b>',
      wc&&wc.d!=null?esc((wc.d>0?"+":wc.d<0?"−":"±")+toDisp(Math.abs(wc.d))+" · "+wc.days+" "+t("days")):esc(t(kg?"Tap to weigh in":"Log a weigh-in")),
      t("Weight")+" "+(kg?toDisp(kg)+" "+wUnit():t("Log a weigh-in")))
   +tile('data-sheet="steps"','steps',HI.steps,t("Steps"),
      '<b>'+fmtN(r.steps||0)+'</b>',esc(t("Goal")+" "+fmtN(g.steps)),t("Steps")+" "+fmtN(r.steps||0))
   +'</div>';}

export {bodyTiles, trainTop};
