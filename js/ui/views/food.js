/* Bunyan — food
   Food tab. */
import {t} from "../../i18n/dict.js";
import {curDate, eatenToday, frequentFoods} from "../../engine/formulas.js";
import {sumNutrition} from "../../engine/nutrition.js";
import {dayRec, S} from "../../state.js";
import {esc, r1, shortd, today} from "../../util.js";
import {head, progressBar} from "../view.js";

/* ============================================================ FOOD */
var MEALS=["Breakfast","Lunch","Dinner","Snack"];
function srcBadge(src){
  if(src==="you")return '<span class="pill">Yours</span>';
  if(src==="est")return '<span class="pill" style="color:var(--gold);border-color:var(--gold)">'+t("Estimated")+'</span>';
  if(src==="off")return '<span class="pill">'+t("Branded")+'</span>';
  return "";}

function vFood(){
  var dsel=curDate(), isToday=dsel===today();
  var g=S.goals,e=eatenToday(dsel),r=dayRec(dsel);
  var h=head(t("Nutrition"),t("Fuel the fire within"));
  h+='<div class="card" style="padding:var(--s3);margin-bottom:var(--s3)">'
   +'<div class="row" style="align-items:center">'
   +'<button class="btn d sm iconbtn" data-fday="-1" aria-label="'+t("Previous day")+'">\u2039</button>'
   +'<span aria-live="polite" style="font-weight:800;letter-spacing:.06em;text-transform:uppercase;font-size:13px">'
   +(isToday?"Today, ":"")+shortd(dsel)+'</span>'
   +'<button class="btn d sm iconbtn" data-fday="1"'+(isToday?' disabled':'')
   +' aria-label="'+t("Next day")+'">\u203a</button>'
   +'</div>'+(isToday?'':'<div style="text-align:center"><button class="btn d sm" data-fday="0">'
   +'Back to today</button></div>')+'</div>';

  h+='<div class="card" style="text-align:center">'
   +'<div class="tiny" style="letter-spacing:.12em">'+t("CALORIES CONSUMED")+'</div>'
   +'<div class="metric" style="font-size:38px;margin:6px 0 8px">'+e.kcal+' / '+g.kcal
   +'<span class="unit">kcal</span></div>'
   +progressBar(e.kcal,g.kcal,"var(--accent)")
   +'<div class="grid3" style="margin-top:var(--s4)">'
   +[["PRO",e.p,g.p],["CARB",e.c,g.c],["FAT",e.f,g.f]].map(function(m){
      return '<div><div class="tiny">'+m[0]+'</div>'
       +'<div style="font-weight:800;font-size:15px;margin:3px 0 5px">'+m[1]+'<span class="unit">/'+m[2]+'g</span></div>'
       +progressBar(m[1],m[2],m[1]>=m[2]?"var(--ok)":"var(--accent)")+'</div>';}).join("")
   +'</div></div>';

  h+='<button class="btn" data-addfood="Breakfast">'+t("Add food")+'</button>';

  h+='<div class="overline">'+t("Meals logged")+'</div>';
  MEALS.forEach(function(name){
    var m=r.meals[name]||{items:[]};
    var tot=sumNutrition(m.items||[]);
    h+='<div class="card"><div class="row"><h3>'+name.toUpperCase()+'</h3>'
     +(tot.kcal?'<span class="metric" style="font-size:17px">'+tot.kcal+' kcal</span>'
               :'<span class="dim">\u2014</span>')+'</div>';
    /* Tap the row to change the amount, the \u2715 to remove it. Removal is undoable,
       so it does not stop to ask. */
    (m.items||[]).forEach(function(it,i){
      h+='<div class="fitem"><button class="fitem-b" data-edititem="'+name+'|'+i+'"'
       +' aria-label="'+t("Edit")+' '+esc(it.n)+'">'
       +'<div style="flex:1;min-width:0"><div style="font-size:14px">'+esc(it.n)+'</div>'
       +'<div class="tiny">'+esc(it.label||"")+(it.src&&it.src!=="db"?" \u00b7 "+
          (it.src==="est"?"estimated":it.src==="you"?"yours":"branded"):"")+'</div></div>'
       +'<span class="dim num">'+it.kcal+' kcal</span></button>'
       +'<button class="fitem-x" data-dropfood="'+name+'|'+i+'"'
       +' aria-label="'+t("Remove")+' '+esc(it.n)+'">\u2715</button></div>';});
    h+='<div class="rowc mt"><button class="btn g sm" data-addfood="'+name+'">+ Add food</button>'
     +((m.items||[]).length?'<span class="pill ok">'+t("Logged")+'</span>':'')+'</div></div>';});

  var freq=frequentFoods(6);
  if(freq.length){
    h+='<div class="overline">'+t("Frequent")+'</div><div class="rowc" style="flex-wrap:wrap;gap:var(--s2)">';
    freq.forEach(function(f){
      h+='<button class="pill" data-quickfood="'+esc(f.id)+'">'+esc(f.n)+'</button>';});
    h+='</div>';}

  if((S.savedMeals||[]).length){
    h+='<div class="overline">'+t("Saved meals")+'</div><div class="list">';
    S.savedMeals.forEach(function(sm,i){
      var tot=sumNutrition(sm.items);
      h+='<button class="item" data-addsaved="'+i+'"><div><div style="font-weight:600">'+esc(sm.name)+'</div>'
       +'<div class="tiny">'+sm.items.length+' items \u00b7 '+tot.kcal+' kcal</div></div>'
       +'<span class="pill a">Add</span></button>';});
    h+='</div>';}

  h+='<div class="card"><div class="row"><h3>Water</h3><span class="num" style="font-weight:700">'
   +r1(r.water/1000)+' / '+r1(g.water/1000)+' L</span></div>'
   +progressBar(r.water,g.water,"var(--accent)")
   +'<div class="rowc mt"><button class="btn g sm" data-water="250">+250 ml</button>'
   +'<button class="btn g sm" data-water="500">+500 ml</button>'
   +'<button class="btn d sm" data-water="-250">Undo</button></div></div>';
  return h;}


export {MEALS, srcBadge, vFood};
