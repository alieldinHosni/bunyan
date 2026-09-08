/* Bunyan — home
   Home screen. */
import {t} from "../../i18n/dict.js";
import {exName} from "../../i18n/exnames.js";
import {avg7, backupAgeDays, backupDue, eatenToday, lastWeight} from "../../engine/formulas.js";
import {curProfile, dayRec, S, split} from "../../state.js";
import {estMinutes, nextDayOf} from "./train.js";
import {fmtW, toDisp, wUnit} from "../../units.js";
import {esc, r1, today} from "../../util.js";
import {head, progressBar, recentPR, ring, streak} from "../view.js";

/* ============================================================ HOME */
function vHome(){
  var g=S.goals,e=eatenToday(),r=dayRec(),sp=split(),h="";
  var nd=nextDayOf(sp);
  var name=(curProfile().name&&curProfile().name!=="Me")?curProfile().name:"";
  h+=head(t("Today"),t("Strength starts within")+(name?", "+name:""));

  if(!S.onboarded)
    h+='<button class="card tap hot" data-setup="1"><div class="row"><h3>'+t("Build my plan")+'</h3>'
     +'<span class="pill a">'+t("Start here")+'</span></div>'
     +'<p class="tiny" style="margin:6px 0 0">'+t("Four questions and Bunyan sets your split, sets, reps and rest.")+'</p></button>';

  if(backupDue()){
    var age=backupAgeDays();
    h+='<div class="card" style="border-color:var(--gold)">'
     +'<div class="row"><h3 style="color:var(--gold)">'+t("Back up your history")+'</h3></div>'
     +'<p class="tiny" style="margin:6px 0 0">'
     +(age===null
        ?t("You have never exported a backup. Everything lives in this browser — clearing its data would take your whole log with it.")
        :t("Your last backup was")+' '+age+' '+t("days ago."))
     +'</p>'
     +'<div class="rowc mt"><button class="btn sm" data-export="1">'+t("Export a backup")+'</button>'
     +'<button class="btn d sm" data-snoozebackup="1">'+t("Not now")+'</button></div></div>';
  }

  h+='<div class="overline">'+t("Training status")+'</div>';
  if(S.active){
    var doneN=S.active.entries.filter(function(x){return x.sets.length;}).length;
    h+='<div class="card hot"><div class="row"><h3>'+esc(S.active.dayName)+'</h3>'
     +'<span class="pill a">'+t("Active")+'</span></div>'
     +'<p class="tiny" style="margin:6px 0 0">'+(S.active.entries.length-doneN)+' of '
     +S.active.entries.length+' exercises left</p>'
     +'<button class="btn" data-continue="1">'+t("Continue workout")+'</button></div>';
  }else if(nd){
    h+='<div class="card"><div class="row"><h3>'+esc(nd.name)+'</h3>'
     +'<span class="pill">'+esc(sp.name)+'</span></div>'
     +'<p class="tiny" style="margin:6px 0 0">'+nd.ex.length+' exercises \u00b7 about '
     +estMinutes(nd)+' min</p>'
     +'<button class="btn" data-startday="'+nd.id+'">'+t("Start workout")+'</button></div>';
  }else h+='<div class="card"><p class="tiny" style="margin:0">'+t("No exercises in this split yet.")+'</p></div>';

  h+='<div class="overline">'+t("Fuel log")+'</div>';
  h+='<div class="card"><div class="rowc" style="gap:var(--s4)">'
   +ring(g.kcal?e.kcal/g.kcal:0,"var(--accent)","kcal",e.kcal)
   +'<div style="flex:1">'
   +'<div class="row" style="margin-bottom:6px"><span class="dim">PRO</span>'
   +'<span class="num" style="font-weight:700">'+e.p+'g / '+g.p+'g</span></div>'
   +'<div class="row" style="margin-bottom:6px"><span class="dim">CARB</span>'
   +'<span class="num" style="font-weight:700">'+e.c+'g / '+g.c+'g</span></div>'
   +'<div class="row"><span class="dim">FAT</span>'
   +'<span class="num" style="font-weight:700">'+e.f+'g / '+g.f+'g</span></div>'
   +'</div></div></div>';

  h+='<div class="overline">'+t("Progress highlight")+'</div>';
  var pr=recentPR(),st=streak();
  h+='<div class="grid2">'
   +'<div class="card" style="margin:0"><div class="tiny">'+t("STREAK")+'</div>'
   +'<div style="margin-top:4px"><span class="metric">'+st+'</span>'
   +'<span class="unit">'+(st===1?"DAY":"DAYS")+'</span></div></div>'
   +'<div class="card" style="margin:0"><div class="tiny">'+t("RECENT PR")+'</div>'
   +(pr?'<div class="stat" style="font-size:17px;margin-top:5px">'+esc(exName(pr.n).toUpperCase().slice(0,22))+'</div>'
       +'<div class="metric" style="font-size:22px;margin-top:2px">'+fmtW(pr.w)+'</div>'
     :'<div class="tiny" style="margin-top:8px">'+t("Log a session to set one.")+'</div>')
   +'</div></div>';

  h+='<div class="overline">'+t("Quick actions")+'</div>';
  h+='<div class="grid2">'
   +'<button class="card tap" data-go="train" style="margin:0;text-align:center;font-weight:700">'+t("Log workout")+'</button>'
   +'<button class="card tap" data-go="food" style="margin:0;text-align:center;font-weight:700">'+t("Add food")+'</button>'
   +'</div>';

  h+='<div class="grid2 mt">'
   +'<button class="card tap" data-sheet="weigh" style="margin:0"><div class="tiny">'+t("WEIGHT")+'</div>'
   +'<div class="stat" style="margin-top:4px">'
   +((avg7()||lastWeight())?toDisp(avg7()||lastWeight()):"\u2014")
   +'<span class="unit">'+wUnit()+'</span></div></button>'
   +'<button class="card tap" data-sheet="steps" style="margin:0"><div class="tiny">STEPS</div>'
   +'<div class="stat" style="margin-top:4px">'+(r.steps||0)+'</div></button>'
   +'</div>';

  h+='<div class="card mt"><div class="row"><h3>Water</h3><span class="num" style="font-weight:700">'
   +r1(r.water/1000)+' / '+r1(g.water/1000)+' L</span></div>'
   +progressBar(r.water,g.water,"var(--accent)")
   +'<div class="rowc mt"><button class="btn g sm" data-water="250" data-wdate="'+today()+'">+250 ml</button>'
   +'<button class="btn g sm" data-water="500" data-wdate="'+today()+'">+500 ml</button>'
   +'<button class="btn d sm" data-water="-250" data-wdate="'+today()+'">Undo</button></div></div>';
  return h;}


export {vHome};
