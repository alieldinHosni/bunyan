/* Bunyan — the top of the Training page
   There is no Home tab any more: Training is where the app opens. What Home had that
   belongs to the day lives on: the greeting, one reminder at most (now at the foot), the weigh-in
   and steps tiles here; calories and water on Food; the coach's advice in Coach. */
import {t} from "../../i18n/dict.js";
import {lastWeight} from "../../engine/formulas.js";
import {weightChange} from "../../engine/stats.js";
import {curProfile, dayRec, S} from "../../state.js";
import {toDisp, wUnit} from "../../units.js";
import {dfmt, esc, fmtN, today} from "../../util.js";
import {art} from "../art.js";
import {glyph} from "../glyphs.js";
import {avatar} from "../settings.js";
import {inDays, V} from "../view.js";

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

/* Nothing set up yet: the assessment that builds the plan is what to do now, so it is the
   Today card itself (WP-2), in the card's own frame. */
function setupCard(){
  return '<div class="thero2 tdc live" data-k="today" data-state="setup">'
   +'<img class="thero2-art" src="intro.jpg" alt="" aria-hidden="true" width="902" height="897" decoding="async">'
   +'<div class="thero2-top"><span class="tbadge" aria-hidden="true">'+glyph("person")+'</span>'
   +'<div class="thero2-t"><div class="thero2-k"><span class="klabel">'+esc(t("Start here"))+'</span></div>'
   +'<div class="thero2-n">'+esc(t("Build my plan"))+'</div>'
   +'<div class="thero2-m">'+esc(t("A short assessment, and the coach builds your daily targets, your training and a meal plan, and puts them here and on Food."))+'</div></div></div>'
   +'<button class="btn" data-setup="1">'+esc(t("Start the assessment"))+'</button></div>';}
/* The one housekeeping card of the day, at the foot of Training: the backup or the
   weigh-in, whichever the head (js/engine/head.js) keeps for today (one a day, by its
   housekeeping rule; it never leads). hk: that signal, from todayPlan().house. */
function houseCard(hk){
  if(hk&&hk.id==="backup"){
    var age=hk.src.age;
    return '<div class="card hnote gold" data-k="hk:backup" data-prompt="1"><h3>'+t("Back up your history")+'</h3>'
     +'<p class="tiny" style="margin:6px 0 0">'
     +(age===null?t("You have never exported a backup. Everything lives in this browser — clearing its data would take your whole log with it.")
        :t("Your last backup was")+' <span class="num">'+age+'</span> '+t("days ago."))+'</p>'
     +'<div class="rowc mt"><button class="btn sm" data-export="1">'+t("Export a backup")+'</button>'
     +'<button class="btn d sm" data-snoozebackup="1">'+t("Not now")+'</button></div></div>';}
  var wd=hk&&hk.id==="weigh-in"?hk.src:null;
  if(wd)
    return '<button class="card tap hnote" data-k="hk:weigh" data-sheet="weigh" data-prompt="1"><h3>'+t("Time to weigh in")+'</h3>'
     +'<p class="tiny" style="margin:6px 0 0">'+t(wd.last?"A week since the last one. Mornings, before eating, compare best.":"One weigh-in starts your trend. Mornings, before eating, compare best.")+'</p></button>';
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
/* The greeting and the date under a drawing for the time of day. At the top right, the
   person, which opens Profile. Nothing else: the Today card comes next (WP-2). */
function trainTop(){
  var name=ownName(),hr=new Date().getHours(),scene=hr<12?"sunrise":hr<17?"sun":"moon";
  return '<div class="hgreet">'+art(scene,{cls:"hgreet-art"})+'<div class="hgreet-t">'
   +'<div class="hdate">'+esc(dfmt(new Date(),{weekday:"long",day:"numeric",month:"short"}))+'</div>'
   /* The name is its own run: a Latin name beside an Arabic greeting otherwise drags
      the comma to the wrong side ("Khalid ,صباح الخير"). Arabic takes its own comma. */
   +'<h1>'+esc(greeting())+(name?esc(S.prefs.lang==="ar"?"، ":", ")+'<bdi>'+esc(name)+'</bdi>':'')+'</h1></div>'
   +'<div class="hacts">'
   /* No bell here (owner, 3 Nov: no two buttons for one job): the dock's Coach tab opens
      the same page and carries the same dot. */
   +'<button class="hbtn havatar" data-prof="1" aria-label="'+esc(t("Profile"))+'">'
   +(S.profile.photo||name?avatar(name,"",true):glyph("person"))+'</button>'
   +'</div></div>';}
/* Weigh-in and steps, each one tap into its one-field sheet. */
function bodyTiles(){
  var g=S.goals,r=dayRec(today()),kg=lastWeight(),wc=weightChange();
  return '<div class="htiles two">'
   +tile('data-sheet="weigh"','weight',HI.weight,t("Weight"),
      kg?'<b>'+toDisp(kg)+'</b><small>'+esc(wUnit())+'</small>':'<b>—</b>',
      wc&&wc.d!=null?esc((wc.d>0?"+":wc.d<0?"−":"±")+toDisp(Math.abs(wc.d))+" "+wUnit()+" "+inDays(wc.days)):esc(t(kg?"Tap to weigh in":"Log a weigh-in")),
      t("Weight")+" "+(kg?toDisp(kg)+" "+wUnit():t("Log a weigh-in")))
   +tile('data-sheet="steps"','steps',HI.steps,t("Steps"),
      '<b>'+fmtN(r.steps||0)+'</b>',esc(t("Goal")+" "+fmtN(g.steps)),
      t("Steps")+" "+fmtN(r.steps||0)+(g.steps?", "+Math.min(100,Math.round((r.steps||0)/g.steps*100))+"% "+t("of goal"):""),
      g.steps?(r.steps||0)/g.steps:null,g.steps>0&&(r.steps||0)>=g.steps)
   +'</div>';}

export {bodyTiles, houseCard, setupCard, trainTop};
