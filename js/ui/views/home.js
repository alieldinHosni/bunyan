/* Bunyan — home
   Home screen, built to the bunyan-home frame of the Bunyan Figma file (node 2:35):
   a greeting, today's session, daily nutrition and weekly discipline. Every value on
   it is the user's own — the frame's "Khalid", "2,450 kcal" and "5/7" are placeholder
   data in the design and are not copied. */
import {t} from "../../i18n/dict.js";
import {backupAgeDays, backupDue, deloadDue, eatenToday, lastWeight} from "../../engine/formulas.js";
import {daysBetween, weightChange} from "../../engine/stats.js";
import {curProfile, dayRec, S, split} from "../../state.js";
import {dayHero, planOn, resumeHero, weekStrip} from "./train.js";
import {glassUnit} from "./food.js";
import {toDisp, wUnit} from "../../units.js";
import {esc, fmtN, num, today} from "../../util.js";
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

/* ============================================================ HOME
   "How is today going?" — a dashboard, not a toolbox, so it has no sections. From
   the top: the greeting under a drawing for the time of day, one reminder at most,
   the day's training in the same card Train → Today uses, four tiles that each log in
   one tap, and the same week strip as Train. */
function reminder(){
  /* Only the most pressing thing owed, so a backup nag cannot sit above everything
     for weeks. Set-up first, then the backup, a lighter week, a weigh-in. */
  if(!S.onboarded)
    return '<button class="card tap hot hnote" data-setup="1"><div class="row"><h3>'+t("Build my plan")+'</h3>'
     +'<span class="pill a">'+t("Start here")+'</span></div>'
     +'<p class="tiny" style="margin:6px 0 0">'+t("Four questions and Bunyan sets your program, sets, reps and rest.")+'</p></button>';
  if(backupDue()){
    var age=backupAgeDays();
    return '<div class="card hnote gold"><h3>'+t("Back up your history")+'</h3>'
     +'<p class="tiny" style="margin:6px 0 0">'
     +(age===null?t("You have never exported a backup. Everything lives in this browser — clearing its data would take your whole log with it.")
        :t("Your last backup was")+' '+age+' '+t("days ago."))+'</p>'
     +'<div class="rowc mt"><button class="btn sm" data-export="1">'+t("Export a backup")+'</button>'
     +'<button class="btn d sm" data-snoozebackup="1">'+t("Not now")+'</button></div></div>';}
  if(deloadDue())
    return '<button class="card tap hnote" data-tsec="today"><h3>'+t("Time for a lighter week")+'</h3>'
     +'<p class="tiny" style="margin:6px 0 0">'+t("One lighter week — fewer sets, about 10% less weight — usually brings progress back.")+'</p></button>';
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
  kcal:'<path d="M12 21a6 6 0 0 0 6-6c0-4-2.5-6-3.5-10-1.2 2.2-2 3.2-3 3.4-.8-.9-1-2-1-3.4-2.2 2.4-4.5 5.4-4.5 10a6 6 0 0 0 6 6z"/><path d="M12 21a2.5 2.5 0 0 1-2.5-2.5c0-1.6 1.2-2.6 2.5-4 1.3 1.4 2.5 2.4 2.5 4A2.5 2.5 0 0 1 12 21z"/>',
  water:'<path d="M12 3.5s6 6.3 6 10.5a6 6 0 0 1-12 0c0-4.2 6-10.5 6-10.5z"/>',
  steps:'<path d="M8 3c2 0 3 2 3 5s-1 5-3 5-3-2-3-5 1-5 3-5zM6 16h4v2a2 2 0 0 1-4 0zM16 7c2 0 3 2 3 5s-1 5-3 5-3-2-3-5 1-5 3-5zM14 20h4"/>',
  weight:'<path d="M5 20h14l-2-12H7zM9 8a3 3 0 0 1 6 0M12 12v3"/>'};
function vHome(){
  var g=S.goals,e=eatenToday(today()),r=dayRec(today()),sp=split(),h="",name=ownName();
  var hr=new Date().getHours(),scene=hr<12?"sunrise":hr<17?"sun":"moon";

  h+='<div class="hgreet">'+art(scene,{cls:"hgreet-art"})+'<div>'
   +'<div class="hdate">'+esc(new Date().toLocaleDateString(undefined,{weekday:"long",day:"numeric",month:"short"}))+'</div>'
   +'<h1>'+esc(greeting()+(name?", "+name:""))+'</h1></div>'
   +(name?'<div class="havatar" aria-hidden="true">'+esc(name.charAt(0).toUpperCase())+'</div>':'')
   +'</div>';

  h+='<div class="hstack">';
  h+=reminder();
  h+=S.active?resumeHero():dayHero(sp,planOn(sp,today()),today());

  /* Four tiles, each one tap: the day's food opens Food, water adds a glass, steps and
     weight open their one-field sheets. */
  var unit=glassUnit(g.water),ng=Math.max(1,Math.round(g.water/unit)),gl=Math.floor(r.water/unit);
  var kg=lastWeight(),wc=weightChange();
  h+='<div class="htiles">'
   +tile('data-fsec="today"','kcal',HI.kcal,t("Calories"),
      '<b data-count-to="'+e.kcal+'">'+fmtN(e.kcal)+'</b><small>/ '+fmtN(g.kcal)+'</small>',
      esc(t("Protein"))+' '+e.p+' / '+g.p+' g',t("Calories")+" "+fmtN(e.kcal)+" "+t("of")+" "+fmtN(g.kcal))
   +tile('data-water="'+unit+'" data-wdate="'+today()+'"','water',HI.water,t("Water"),
      '<b>'+gl+'</b><small>/ '+ng+'</small>','+ '+esc(t("Add a glass")),t("Water")+" "+gl+" "+t("of")+" "+ng+". "+t("Add a glass"))
   +tile('data-sheet="steps"','steps',HI.steps,t("Steps"),
      '<b>'+fmtN(r.steps||0)+'</b>',esc(t("Goal")+" "+fmtN(g.steps)),t("Steps")+" "+fmtN(r.steps||0))
   +tile('data-sheet="weigh"','weight',HI.weight,t("Weight"),
      kg?'<b>'+toDisp(kg)+'</b><small>'+esc(wUnit())+'</small>':'<b>—</b>',
      wc&&wc.d!=null?esc((wc.d>0?"+":wc.d<0?"−":"±")+toDisp(Math.abs(wc.d))+" · "+wc.days+" "+t("days")):esc(t(kg?"Tap to weigh in":"Log a weigh-in")),
      t("Weight")+" "+(kg?toDisp(kg)+" "+wUnit():t("Log a weigh-in")))
   +'</div>';

  /* The same seven days as Train, from the first day of the week; a tap opens that
     day's details. */
  h+=weekStrip(sp,null,"openday");
  h+='</div>';
  return h;}


export {vHome};
