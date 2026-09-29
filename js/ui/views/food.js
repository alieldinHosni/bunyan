/* Bunyan — food
   Food tab: the day's dashboard (node 13:12) and one meal's detail (node 13:118). */
import {t} from "../../i18n/dict.js";
import {curDate, eatenToday, frequentFoods} from "../../engine/formulas.js";
import {sumNutrition} from "../../engine/nutrition.js";
import {dayRec, S} from "../../state.js";
import {esc, fmtN, r1, today} from "../../util.js";
import {V} from "../view.js";
import {dateBar} from "../datebar.js";
import {backArrow} from "../nav.js";

/* ============================================================ FOOD */
var MEALS=["Breakfast","Lunch","Dinner","Snack"];
/* Meal glyphs, on the dock's grid and stroke: sun, sun on the horizon, moon, apple. */
var MICON={
  Breakfast:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/></svg>',
  Lunch:'<svg viewBox="0 0 24 24"><path d="M7 16a5 5 0 0 1 10 0M3 16h18M12 5v3M5.2 9.2l1.4 1.4M18.8 9.2l-1.4 1.4M6 20h12"/></svg>',
  Dinner:'<svg viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>',
  Snack:'<svg viewBox="0 0 24 24"><path d="M12 8c-1.5-1.3-4.5-1.5-6 .5-1.8 2.4-.8 7 1.5 9.5 1.3 1.4 2.8 1.6 4.5.8 1.7.8 3.2.6 4.5-.8 2.3-2.5 3.3-7.1 1.5-9.5-1.5-2-4.5-1.8-6-.5z"/><path d="M12 8c0-2 1-3.5 3-4"/></svg>'};
var TICK='<svg viewBox="0 0 24 24"><path d="M6 12.5l4 4 8-9"/></svg>';
/* The meal an add belongs to when nothing on screen says which — the floating button,
   the frequent-food pills, a saved meal. Every one of those used to go to Snack, so a
   breakfast logged from the button at 8 a.m. was filed as a snack. The meal rows each
   carry their own meal and never come here. */
function mealNow(){
  var h=new Date().getHours();
  return h>=5&&h<11?"Breakfast":h>=11&&h<15?"Lunch":h>=17&&h<22?"Dinner":"Snack";}

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
  var h='<div class="thead"><div><h1>'+t("Nutrition")+'</h1>'
   +'<p class="thead-s">'+t("Fuel your progress")+'</p></div></div>';
  /* The same navigator Progress and Train use — js/ui/datebar.js. */
  h+=dateBar({date:dsel,open:V.fcal,monthOffset:V.cal});

  /* ---- the day at a glance: the ring beside the three macros, as the frame has it */
  var pct=g.kcal?e.kcal/g.kcal:0, over=e.kcal>g.kcal, diff=Math.abs(g.kcal-e.kcal);
  h+='<div class="fsum"><div class="fring2" role="img" aria-label="'
   +esc(fmtN(e.kcal)+" "+t("of")+" "+fmtN(g.kcal)+" kcal — "+Math.round(pct*100)+"%, "+fmtN(diff)+" "+t(over?"kcal over":"kcal left"))+'">'
   +heroRing(pct)
   +'<span class="fring2-n" data-k="kcal" data-count-to="'+e.kcal+'">'+fmtN(e.kcal)+'</span>'
   +'<span class="fring2-u">kcal</span>'
   +'<span class="fring2-g">'+esc(t("of")+" "+fmtN(g.kcal))+'</span></div>'
   +'<div class="fmac2">'
   +[["p",t("Protein"),e.p,g.p],["c",t("Carbs"),e.c,g.c],["f",t("Fat"),e.f,g.f]].map(function(m){
      var mp=m[3]?Math.round(m[2]/m[3]*100):0;
      return '<div class="fmac2-r '+m[0]+'"><div class="fmac2-h"><span class="fmac2-k"><i aria-hidden="true"></i>'+esc(m[1])+'</span>'
       +'<span class="fmac2-p">'+mp+'%</span></div>'
       +'<div class="fmac2-v">'+m[2]+' g <span>/ '+m[3]+' g</span></div>'
       +'<div class="fmac2-b" aria-hidden="true"><i style="width:'+Math.min(100,mp)+'%"></i></div></div>';}).join("")
   +'<div class="fleft'+(over?' over':'')+'">'+esc(fmtN(diff)+" "+t(over?"kcal over":"kcal left"))+'</div>'
   +'</div></div>';

  /* ---- the four meals as tiles: the one for now is lit, a logged one is ticked. A
     logged tile opens the meal, an empty one adds to it. */
  var now=dsel===today()?mealNow():null;
  h+='<div class="fmt">';
  MEALS.forEach(function(name){
    var items=((r.meals[name]||{}).items)||[],tot=sumNutrition(items),done=items.length>0;
    h+='<button class="fmt-c'+(name===now?' now':'')+(done?' done':'')+'" '
     +(done?'data-meal="'+name+'"':'data-addfood="'+name+'"')
     +' aria-label="'+esc(t(name)+", "+fmtN(tot.kcal)+" kcal"+(done?"":", "+t("Add")))+'">'
     +'<span class="fmt-i" aria-hidden="true">'+MICON[name]+'</span>'
     +'<span class="fmt-n">'+esc(t(name==="Snack"?"Snacks":name))+'</span>'
     +'<span class="fmt-k">'+fmtN(tot.kcal)+' kcal</span>'
     +(done?'<span class="fmt-ok" aria-hidden="true">'+TICK+'</span>':'')+'</button>';});
  h+='</div>';

  /* ---- today's meals: what is in each, and its numbers */
  h+='<div class="tsec"><h2 class="tsec-h">'+t(dsel===today()?"Today's Meals":"Meals")+'</h2>'
   +'<button class="tlink" data-openday="'+dsel+'">'+t("Day details")+'</button></div>';
  MEALS.forEach(function(name){
    var m=r.meals[name]||{items:[]},items=m.items||[],tot=sumNutrition(items);
    var ic='<span class="fml-i '+name.toLowerCase()+'" aria-hidden="true">'+MICON[name]+'</span>';
    if(items.length){
      var list=items.map(function(it){return it.n;}).join(", ");
      h+='<button class="fml done" data-meal="'+name+'" aria-label="'
       +esc(t(name)+" — "+fmtN(tot.kcal)+" kcal, "+items.length+" "+t(items.length===1?"item logged":"items logged"))+'">'
       +ic+'<span class="fml-t"><span class="fml-n">'+esc(t(name))+'</span>'
       +'<span class="fml-s">'+esc(list)+'</span>'
       +'<span class="fml-m">'+fmtN(tot.kcal)+' kcal · '+tot.p+'g P · '+tot.c+'g C · '+tot.f+'g F</span></span>'
       +'<span class="fml-ok" aria-hidden="true">'+TICK+'</span></button>';}
    else
      h+='<div class="fml">'+ic+'<span class="fml-t"><span class="fml-n">'+esc(t(name))+'</span>'
       +'<span class="fml-s">'+esc(t("Not logged yet"))+'</span></span>'
       +'<button class="fml-add" data-addfood="'+name+'" aria-label="'+esc(t("Add food to")+" "+t(name))+'">'
       +'<i class="ico ico-plus" aria-hidden="true"></i></button></div>';});
  /* In the page, not floating: the dock is the one floating control. */
  h+='<button class="btn fadd" data-addfood="'+(now||mealNow())+'">'
   +'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/></svg>'
   +esc(t("Add Food"))+'</button>';

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

  return h;}

/* ---- one meal (node 13:118). Reached from a logged row above; back returns here. */
function vMeal(dsel,name){
  var r=dayRec(dsel),m=r.meals[name]||{items:[]},items=m.items||[],tot=sumNutrition(items);
  var when=dsel===today()?t("Logged today")
    :t("Logged")+" "+new Date(dsel+"T00:00").toLocaleDateString(undefined,{month:"short",day:"numeric"});
  /* The same header the Train day screen uses, so the two "one thing inside a tab"
     screens are the same shape. The two frames disagree on its size; the app does not. */
  var h='<div class="dhead">'+backArrow()
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


export {MEALS, mealNow, vFood};
