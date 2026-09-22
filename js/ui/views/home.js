/* Bunyan — home
   Home screen, built to the bunyan-home frame of the Bunyan Figma file (node 2:35):
   a greeting, today's session, daily nutrition and weekly discipline. Every value on
   it is the user's own — the frame's "Khalid", "2,450 kcal" and "5/7" are placeholder
   data in the design and are not copied. */
import {t} from "../../i18n/dict.js";
import {backupAgeDays, backupDue, eatenToday} from "../../engine/formulas.js";
import {curProfile, dayRec, S, split} from "../../state.js";
import {estMinutes, nextDayOf} from "./train.js";
import {esc, fmtN, num, weekDays} from "../../util.js";

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

/* The 72px ring in the Nutrition card. Geometry is the design's own track (Figma
   node 2:71): r=33, 6px stroke, on a 72 box. The exported fill is a fixed
   87% arc, so it cannot show a real value; this draws the same arc live instead. */
function kcalRing(pct){
  var R=33,C=2*Math.PI*R,f=Math.max(0,Math.min(1,pct));
  return '<svg class="hring" viewBox="0 0 72 72" aria-hidden="true">'
   +'<circle cx="36" cy="36" r="'+R+'" fill="none" stroke="var(--border)" stroke-width="6"/>'
   +'<circle cx="36" cy="36" r="'+R+'" fill="none" stroke="var(--accent)" stroke-width="6"'
   +' stroke-dasharray="'+C.toFixed(2)+'" stroke-dashoffset="'+(C*(1-f)).toFixed(2)+'"'
   +' transform="rotate(-90 36 36)"/></svg>';
}

/* This week, Sunday first (weekDays() in util.js, shared with the Train hub). A dot is
   lit when a session was logged that day. The design's example is a Thursday with five
   lit dots and two dark ones, which is exactly a Sunday-first week, so the order is the
   design's own rather than a choice made here. */
function weekDots(){
  var done={},i;
  for(i=0;i<S.sessions.length;i++)done[S.sessions[i].date]=1;
  var dots=weekDays().map(function(iso){return !!done[iso];});
  return {dots:dots,n:dots.filter(Boolean).length};
}

/* ============================================================ HOME */
function vHome(){
  var g=S.goals,e=eatenToday(),r=dayRec(),sp=split(),h="";
  var nd=nextDayOf(sp),name=ownName();

  /* ---- greeting ---- */
  h+='<div class="hgreet"><div>'
   +'<div class="hdate">'+esc(new Date().toLocaleDateString(undefined,
      {weekday:"long",day:"numeric",month:"short"}))+'</div>'
   +'<h1>'+esc(greeting()+(name?", "+name:""))+'</h1></div>'
   +(name?'<div class="havatar" aria-hidden="true">'+esc(name.charAt(0).toUpperCase())+'</div>':'')
   +'</div>';

  h+='<div class="hstack">';

  /* Prompts that only appear when they are owed. Not in the frame, because the frame
     shows a set-up user with a recent backup; they keep the card language. */
  if(!S.onboarded)
    h+='<button class="card tap hot" data-setup="1"><div class="row"><h3>'+t("Build my plan")+'</h3>'
     +'<span class="pill a">'+t("Start here")+'</span></div>'
     +'<p class="tiny" style="margin:6px 0 0">'+t("Four questions and Bunyan sets your split, sets, reps and rest.")+'</p></button>';

  if(backupDue()){
    var age=backupAgeDays();
    h+='<div class="card" style="border-color:var(--gold)">'
     +'<h3 style="color:var(--gold)">'+t("Back up your history")+'</h3>'
     +'<p class="tiny" style="margin:6px 0 0">'
     +(age===null
        ?t("You have never exported a backup. Everything lives in this browser — clearing its data would take your whole log with it.")
        :t("Your last backup was")+' '+age+' '+t("days ago."))
     +'</p>'
     +'<div class="rowc mt"><button class="btn sm" data-export="1">'+t("Export a backup")+'</button>'
     +'<button class="btn d sm" data-snoozebackup="1">'+t("Not now")+'</button></div></div>';
  }

  /* ---- today's session ----
     One card, three states. The frame shows only "ready to start"; a session already
     under way reuses the same component rather than inventing a second one. */
  if(S.active){
    var pos=Math.min(num(S.active.idx,0),S.active.entries.length-1)+1;
    h+='<div class="card sess hot">'
     +'<div class="sess-head"><span class="sbadge">'+t("Workout in progress")+'</span></div>'
     +'<div><div class="sess-title">'+esc(S.active.dayName)+'</div>'
     +'<div class="sess-sub">'+t("Exercise")+' '+pos+' '+t("of")+' '+S.active.entries.length+'</div></div>'
     +'<div class="sdiv" aria-hidden="true"><i></i><b></b></div>'
     +'<button class="btn" data-continue="1"><span class="ico ico-play" aria-hidden="true"></span>'
     +t("Resume workout")+'</button></div>';
  }else if(nd){
    h+='<div class="card sess">'
     +'<div class="sess-head"><span class="sbadge">'+t("Today's Session")+'</span>'
     +'<span class="sess-min">'+estMinutes(nd)+' '+t("min")+'</span></div>'
     +'<div><div class="sess-title">'+esc(nd.name)+'</div>'
     +'<div class="sess-sub">'+esc(sp.name)+' • '+nd.ex.length+' '+t("exercises")+'</div></div>'
     +'<div class="sdiv" aria-hidden="true"><i></i><b></b></div>'
     +'<button class="btn" data-startday="'+nd.id+'"><span class="ico ico-play" aria-hidden="true"></span>'
     +t("Start Training")+'</button></div>';
  }else h+='<div class="card"><p class="tiny" style="margin:0">'+t("No exercises in this split yet.")+'</p></div>';

  /* ---- daily nutrition ---- */
  var pct=g.kcal?e.kcal/g.kcal:0;
  h+='<button class="card tap nutri" data-go="food">'
   +'<div class="nutri-info"><h3 class="nutri-h">'+t("Daily Nutrition")+'</h3>'
   /* The calories figure is the number logging food changes, so it counts up. The
      attribute carries the raw value; the text is the grouped one. */
   +'<div class="nutri-kcal">'+t("Calories")+': <b data-count-to="'+e.kcal+'">'+fmtN(e.kcal)+'</b>'
   +' / '+fmtN(g.kcal)+' kcal</div>'
   +'<div class="nutri-pro">'+t("Protein")+': <b>'+e.p+'g</b> / '+g.p+'g</div></div>'
   +'<div class="nutri-ring">'+kcalRing(pct)
   +'<span class="nutri-pct">'+Math.round(pct*100)+'%</span></div></button>';

  /* ---- weekly discipline ---- */
  var wk=weekDots();
  h+='<div class="card wk">'
   +'<div class="wk-head"><h3 class="wk-h">'+t("Weekly Discipline")+'</h3>'
   +'<span class="wk-n">'+wk.n+'/7 '+t("Days Active")+'</span></div>'
   /* The dots are the design's two exported states. Read as one image with a spoken
      summary, because seven unlabelled circles mean nothing to a screen reader. */
   +'<div class="wk-dots" role="img" aria-label="'+wk.n+' '+t("of")+' 7 '+t("days active this week")+'">'
   +wk.dots.map(function(on){
      return '<img src="icons/'+(on?'day-on':'day-off')+'.svg" alt="" width="28" height="28">';}).join("")
   +'</div></div>';

  /* ---- steps ----
     Not in the frame. It stays because this is the only place in the app that opens
     the steps sheet: removing it to match the frame would delete a feature, not
     restyle one. Water and weight did move off Home, because Food and Progress already
     carry them. */
  h+='<button class="card tap hsteps" data-sheet="steps">'
   +'<span class="tiny">'+t("Steps")+'</span>'
   +'<span class="hsteps-n">'+fmtN(r.steps||0)+'</span></button>';

  h+='</div>';
  return h;}


export {vHome};
