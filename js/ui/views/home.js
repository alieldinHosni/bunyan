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
import {glyph} from "../glyphs.js";
import {V} from "../view.js";

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
/* A tile: its icon in a round glass button at the top corner, the label, the figure and a
   line under it. ring (0..1) draws the share of a goal as an arc round the icon, the way
   the reference's stat tiles do; null, for a figure with no goal, leaves the circle
   plain. met adds a "Goal met" pill. */
function tile(attr,cls,icon,label,value,sub,aria,ring,met){
  var arc=ring==null?'':'<svg class="htile-ring" viewBox="0 0 48 48" aria-hidden="true"><circle class="t" cx="24" cy="24" r="21"/>'
    +(ring>0?'<circle class="a" cx="24" cy="24" r="21" pathLength="100" stroke-dasharray="'+Math.round(Math.min(1,ring)*100)+' 100"/>':'')+'</svg>';
  return '<button class="htile ringed '+cls+'" '+attr+' aria-label="'+esc(aria)+'">'
   +'<span class="htile-i" aria-hidden="true">'+arc+'<svg viewBox="0 0 24 24">'+icon+'</svg></span>'
   +'<span class="htile-k">'+esc(label)+'</span><span class="htile-v">'+value+'</span>'
   +'<span class="htile-s">'+sub+'</span>'
   +(met?'<span class="htile-met">'+esc(t("Goal met"))+'</span>':'')+'</button>';}
var HI={
  steps:'<path d="M8 3c2 0 3 2 3 5s-1 5-3 5-3-2-3-5 1-5 3-5zM6 16h4v2a2 2 0 0 1-4 0zM16 7c2 0 3 2 3 5s-1 5-3 5-3-2-3-5 1-5 3-5zM14 20h4"/>',
  weight:'<path d="M5 20h14l-2-12H7zM9 8a3 3 0 0 1 6 0M12 12v3"/>'};
/* The greeting under a drawing for the time of day, then the one reminder. At the top
   right, two round glass buttons: the bell, which opens what the coach has noticed and
   carries a dot while there is something, and the person, which opens Profile. */
function trainTop(){
  var name=ownName(),hr=new Date().getHours(),scene=hr<12?"sunrise":hr<17?"sun":"moon",n=V.advice||0;
  var bell=t("What the coach noticed")+(n?", "+t(n===1?"1 thing to look at":"{n} things to look at").replace("{n}",n):"");
  return '<div class="hgreet">'+art(scene,{cls:"hgreet-art"})+'<div class="hgreet-t">'
   +'<div class="hdate">'+esc(dfmt(new Date(),{weekday:"long",day:"numeric",month:"short"}))+'</div>'
   /* The name is its own run: a Latin name beside an Arabic greeting otherwise drags
      the comma to the wrong side ("Khalid ,صباح الخير"). Arabic takes its own comma. */
   +'<h1>'+esc(greeting())+(name?esc(S.prefs.lang==="ar"?"، ":", ")+'<bdi>'+esc(name)+'</bdi>':'')+'</h1></div>'
   +'<div class="hacts">'
   +'<button class="hbtn'+(n?' flag':'')+'" data-csec="ai" aria-label="'+esc(bell)+'">'+glyph("bell")+'</button>'
   +'<button class="hbtn havatar" data-go="profile" aria-label="'+esc(t("Profile"))+'">'
   +(name?'<span aria-hidden="true">'+esc(name.charAt(0).toUpperCase())+'</span>':glyph("person"))+'</button>'
   +'</div></div>'+reminder();}
/* Weigh-in and steps, each one tap into its one-field sheet. */
function bodyTiles(){
  var g=S.goals,r=dayRec(today()),kg=lastWeight(),wc=weightChange();
  return '<div class="htiles two">'
   +tile('data-sheet="weigh"','weight',HI.weight,t("Weight"),
      kg?'<b>'+toDisp(kg)+'</b><small>'+esc(wUnit())+'</small>':'<b>—</b>',
      wc&&wc.d!=null?esc((wc.d>0?"+":wc.d<0?"−":"±")+toDisp(Math.abs(wc.d))+" · "+wc.days+" "+t("days")):esc(t(kg?"Tap to weigh in":"Log a weigh-in")),
      t("Weight")+" "+(kg?toDisp(kg)+" "+wUnit():t("Log a weigh-in")))
   +tile('data-sheet="steps"','steps',HI.steps,t("Steps"),
      '<b>'+fmtN(r.steps||0)+'</b>',esc(t("Goal")+" "+fmtN(g.steps)),
      t("Steps")+" "+fmtN(r.steps||0)+(g.steps?", "+Math.min(100,Math.round((r.steps||0)/g.steps*100))+"% "+t("of goal"):""),
      g.steps?(r.steps||0)/g.steps:null,g.steps>0&&(r.steps||0)>=g.steps)
   +'</div>';}

export {bodyTiles, trainTop};
