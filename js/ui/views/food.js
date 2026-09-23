/* Bunyan — food
   Food tab: the day's dashboard (node 13:12) and one meal's detail (node 13:118). */
import {t} from "../../i18n/dict.js";
import {curDate, eatenToday, frequentFoods} from "../../engine/formulas.js";
import {sumNutrition} from "../../engine/nutrition.js";
import {dayRec, S} from "../../state.js";
import {esc, fmtN, r1, today} from "../../util.js";
import {progressBar, V} from "../view.js";
import {dateBar} from "../datebar.js";

/* ============================================================ FOOD */
var MEALS=["Breakfast","Lunch","Dinner","Snack"];
function srcBadge(src){
  if(src==="you")return '<span class="pill">Yours</span>';
  if(src==="est")return '<span class="pill" style="color:var(--gold);border-color:var(--gold)">'+t("Estimated")+'</span>';
  if(src==="off")return '<span class="pill">'+t("Branded")+'</span>';
  return "";}

/* The 180px hero ring. The frame draws it as a full 6px border, which can only ever
   read 100%; here it is an arc of eaten/goal, so it agrees with the number inside it. */
function heroRing(pct){
  var R=87,C=2*Math.PI*R,f=Math.max(0,Math.min(1,pct));
  return '<svg viewBox="0 0 180 180" aria-hidden="true">'
   +'<circle cx="90" cy="90" r="'+R+'" fill="none" stroke="var(--border)" stroke-width="6"/>'
   +'<circle cx="90" cy="90" r="'+R+'" fill="none" stroke="var(--accent)" stroke-width="6"'
   +' stroke-linecap="round" stroke-dasharray="'+(f*C).toFixed(1)+' '+C.toFixed(1)+'"'
   +' transform="rotate(-90 90 90)"/></svg>';}

/* Water is stored in millilitres and the goal is the user's, so the number of glasses
   is derived rather than fixed at the frame's eight. A glass is 250 ml until that
   would need more than sixteen of them, at which point the glass grows instead — the
   litres beside the row stay exact either way. */
function glassUnit(goal){
  var u=250;
  if(goal/u>16)u=Math.ceil(goal/16/50)*50;
  return u;}

function vFood(){
  var dsel=curDate();
  if(V.meal)return vMeal(dsel,V.meal);

  var g=S.goals,e=eatenToday(dsel),r=dayRec(dsel);
  /* The same bar Progress uses — js/ui/datebar.js. The frame's own date selector is
     this bar's collapsed state; the month view and the markers are kept. */
  var h=dateBar({date:dsel,open:V.fcal,monthOffset:V.cal});
  /* The day-detail sheet, which shows training and nutrition for one day together. */
  h+='<button class="card tap dbdetail" data-openday="'+dsel+'">'
   +'<div class="row"><span class="tiny" style="letter-spacing:.1em">'+t("THAT DAY")+'</span>'
   +'<span class="chev">›</span></div></button>';

  /* ---- hero */
  var pct=g.kcal?e.kcal/g.kcal:0, over=e.kcal>g.kcal, diff=Math.abs(g.kcal-e.kcal);
  h+='<div class="fhero"><div class="fring" role="img" aria-label="'
   +esc(fmtN(e.kcal)+" "+t("of")+" "+fmtN(g.kcal)+" kcal — "+Math.round(pct*100)+"%")+'">'
   +heroRing(pct)
   +'<span class="fring-n" data-k="kcal" data-count-to="'+e.kcal+'">'+fmtN(e.kcal)+'</span>'
   +'<span class="fring-g">'+esc(t("Eaten")+" / "+fmtN(g.kcal)+" "+t("Goal"))+'</span>'
   +'<span class="fring-r"></span>'
   +'<span class="fring-l'+(over?' over':'')+'">'
   +esc(fmtN(diff)+" "+t(over?"kcal over":"kcal left"))+'</span></div>';

  h+='<div class="fmacros">'
   +[[t("Protein"),e.p,g.p],[t("Carbs"),e.c,g.c],[t("Fat"),e.f,g.f]].map(function(m){
      return '<div class="fmacro"><div class="fmacro-k">'+esc(m[0])+'</div>'
       +'<div class="fmacro-v">'+m[1]+'g <span>/ '+m[2]+'g</span></div>'
       +progressBar(m[1],m[2],m[1]>=m[2]?"var(--ok)":"var(--accent)")+'</div>';}).join("")
   +'</div></div>';

  /* ---- water */
  var unit=glassUnit(g.water),ng=Math.max(1,Math.round(g.water/unit)),
      done=Math.min(ng,Math.floor(r.water/unit));
  h+='<div class="fwater"><div class="fwater-h">'
   +'<div class="fwater-t"><i class="ico ico-drop"></i>'+esc(t("Water"))+'</div>'
   +'<div class="fwater-c">'+done+' / '+ng+' '+esc(t("glasses"))
   +' ('+r1(r.water/1000)+' '+esc(t("L"))+')</div></div>'
   +'<div class="fwater-r"><div class="fglasses">';
  for(var i=1;i<=ng;i++){
    /* Tapping a glass sets the day to that many, so the glass just filled is also the
       one that empties it again — the frame's plus button with an undo built in. */
    var full=i<=done;
    h+='<button class="fglass'+(full?' full':'')+'" data-wset="'+((full&&i===done?i-1:i)*unit)+'"'
     +' aria-label="'+esc(i+" "+t("glasses"))+'"'+(full?' aria-pressed="true"':'')+'><i></i></button>';}
  h+='</div><button class="fwater-add" data-water="'+unit+'"'
   +' aria-label="'+esc(t("Add")+" "+unit+" ml "+t("Water"))+'">'
   +'<i class="ico ico-plus"></i></button></div></div>';

  /* ---- meals */
  h+='<div class="overline">'+t("Meals logged")+'</div>';
  MEALS.forEach(function(name){
    var m=r.meals[name]||{items:[]},items=m.items||[],tot=sumNutrition(items);
    if(items.length)
      h+='<button class="mealrow logged" data-meal="'+name+'" aria-label="'
       +esc(t(name)+" — "+fmtN(tot.kcal)+" kcal, "+items.length+" "+t("items logged"))+'">'
       +'<div style="min-width:0"><div class="mealrow-n">'+esc(t(name))+'</div>'
       +'<div class="mealrow-s">'+items.length+' '+esc(t("items logged"))+'</div></div>'
       +'<div class="mealrow-r"><span class="mealrow-k">'+fmtN(tot.kcal)+' kcal</span>'
       +'<i class="ico ico-chev"></i></div></button>';
    else
      h+='<div class="mealrow empty"><div style="min-width:0">'
       +'<div class="mealrow-n">'+esc(t(name))+'</div>'
       +'<div class="mealrow-s">'+esc(t("No items logged yet"))+'</div></div>'
       +'<button class="mealrow-add" data-addfood="'+name+'">+ '+esc(t("Add"))+'</button></div>';});

  /* ---- the shortcuts the frame has no room for, kept below the fold */
  var freq=frequentFoods(6);
  if(freq.length){
    h+='<div class="overline">'+t("Frequent")+'</div><div class="rowc" style="flex-wrap:wrap;gap:var(--s2)">';
    freq.forEach(function(f){
      h+='<button class="pill" data-quickfood="'+esc(f.id)+'">'+esc(f.n)+'</button>';});
    h+='</div>';}

  if((S.savedMeals||[]).length){
    h+='<div class="overline">'+t("Saved meals")+'</div><div class="list">';
    S.savedMeals.forEach(function(sm,i){
      var st=sumNutrition(sm.items);
      h+='<button class="item" data-addsaved="'+i+'"><div><div style="font-weight:600">'+esc(sm.name)+'</div>'
       +'<div class="tiny">'+sm.items.length+' '+t("items")+' · '+fmtN(st.kcal)+' kcal</div></div>'
       +'<span class="pill a">'+t("Add")+'</span></button>';});
    h+='</div>';}

  /* The floating button is the frame's, and like any floating button it sits over the
     list. The spacer keeps it off the last row at rest; while scrolling it passes over
     the rows, which is what a floating button does and what scrolling past undoes. */
  h+='<div class="ffab-pad"></div>'
   +'<button class="ffab" data-addfood="Snack" aria-label="'+esc(t("Add food"))+'">'
   +'<i class="ico ico-plus"></i></button>';
  return h;}

/* ---- one meal (node 13:118). Reached from a logged row above; back returns here. */
function vMeal(dsel,name){
  var r=dayRec(dsel),m=r.meals[name]||{items:[]},items=m.items||[],tot=sumNutrition(items);
  var when=dsel===today()?t("Logged today")
    :t("Logged")+" "+new Date(dsel+"T00:00").toLocaleDateString(undefined,{month:"short",day:"numeric"});
  /* The same header the Train day screen uses, so the two "one thing inside a tab"
     screens are the same shape. The two frames disagree on its size; the app does not. */
  var h='<div class="dhead"><button class="icobtn back" data-back="1" aria-label="'+t("Back")+'">'
   +'<span class="ico ico-cleft" aria-hidden="true"></span></button>'
   +'<h1 class="dhead-t">'+esc(t(name))+'</h1></div>'
   +'<p class="dsub">'+esc(when)+'</p>';

  h+='<div class="mealbanner"><div><div class="mealbanner-k">'+esc(t("Total calories"))+'</div>'
   +'<div class="mealbanner-v">'+fmtN(tot.kcal)+' kcal</div></div>'
   +'<div class="mealbanner-m"><span>'+esc(t("P:"))+' '+r1(tot.p)+'g</span>'
   +'<span>'+esc(t("C:"))+' '+r1(tot.c)+'g</span>'
   +'<span>'+esc(t("F:"))+' '+r1(tot.f)+'g</span></div></div>';

  if(!items.length)
    h+='<div class="empty"><p>'+esc(t("No items logged yet"))+'</p></div>';
  items.forEach(function(it,i){
    h+='<div class="fitemrow">'
     +'<button class="fitemrow-b" data-edititem="'+name+'|'+i+'" aria-label="'
     +esc(t("Edit")+" "+it.n)+'">'
     +'<div style="flex:1;min-width:0"><div class="fitemrow-n">'+esc(it.n)
     +(it.label?' <span style="font-weight:400;color:var(--dim)">('+esc(it.label)+')</span>':'')
     +'</div>'
     +'<div class="fitemrow-m">'+esc(t("P:"))+' '+r1(it.p)+'g · '
     +esc(t("C:"))+' '+r1(it.c)+'g · '+esc(t("F:"))+' '+r1(it.f)+'g'
     +(it.src&&it.src!=="db"?' · '+esc(t(it.src==="est"?"Estimated":it.src==="you"?"Yours":"Branded")):'')
     +'</div></div>'
     +'<span class="fitemrow-k">'+fmtN(it.kcal)+' kcal</span></button>'
     +'<button class="fitemrow-x" data-dropfood="'+name+'|'+i+'" aria-label="'
     +esc(t("Remove")+" "+it.n)+'"><i class="ico ico-trash"></i></button></div>';});

  h+='<button class="btn" data-addfood="'+name+'">+ '
   +esc(t("Add food to")+" "+t(name))+'</button>';
  return h;}


export {MEALS, srcBadge, vFood};
