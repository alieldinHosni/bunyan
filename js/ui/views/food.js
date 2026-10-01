/* Bunyan — food
   Food tab, in three sections behind one control, as Train is: Today (the day's
   dashboard, node 13:12, and one meal's detail, node 13:118), My Foods (the meals you
   saved and the foods you made, kept and edited here) and Targets (what the day is
   measured against, with the evidence for whether it is working beside it). */
import {t} from "../../i18n/dict.js";
import {curDate, eatenToday, lastWeight, macroKcal, proteinTarget, targetKcal, tdee} from "../../engine/formulas.js";
import {sumNutrition} from "../../engine/nutrition.js";
import {dayRec, S} from "../../state.js";
import {dfmt, esc, fmtN, r1, today} from "../../util.js";
import {progressBar, seg, V} from "../view.js";
import {dateBar} from "../datebar.js";
import {backArrow} from "../nav.js";
import {art, gaugeArt, waterArt} from "../art.js";
import {fitCh, afTile} from "./addfood.js";
import {trendCard, vNutrition} from "./progress.js";

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

var FSECS=[["today","Today"],["foods","My Foods"],["targets","Targets"]];
function fsec(){var v=V.fsec||S.prefs.fsec||"today";return v==="foods"||v==="targets"?v:"today";}
function vFood(){
  var dsel=curDate();
  if(V.meal)return vMeal(dsel,V.meal);
  if(V.smeal)return vSavedMeal(V.smeal);
  var sec=fsec();
  /* The drawing is Today's: a baladi loaf and a palm frond at the header's edge. */
  var h='<div class="thead fthead"><div><h1>'+t("Nutrition")+'</h1>'
   +'<p class="thead-s">'+t("Fuel your progress")+'</p></div>'
   +(sec==="today"?art("loaf",{cls:"fthead-art"}):'')+'</div>';
  h+=seg({items:FSECS.map(function(x){return [x[0],t(x[1])];}),value:sec,attr:"fsec",tabs:true,
    cls:"tsecs",label:t("Nutrition"),key:"fsecs"});
  if(sec==="foods")return h+vMyFoods();
  if(sec==="targets")return h+vTargets();
  return h+vFoodToday(dsel);}

function vFoodToday(dsel){
  var g=S.goals,e=eatenToday(dsel),r=dayRec(dsel);
  /* The same navigator Progress and Train use — js/ui/datebar.js. */
  var h=dateBar({date:dsel,open:V.fcal,monthOffset:V.cal});

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

  /* ---- the four meals as tiles: the one for now carries a small "Now" label (it is
     what Add Food logs to), a logged one is ticked. A
     logged tile opens the meal, an empty one adds to it. */
  var now=dsel===today()?mealNow():null;
  /* The tiles are the day's meals: a logged one opens the meal, an empty one adds to
     it. The list that repeated them underneath is gone. */
  h+='<div class="tsec"><h2 class="tsec-h">'+t(dsel===today()?"Today's Meals":"Meals")+'</h2>'
   +'<button class="tlink" data-openday="'+dsel+'">'+t("Day details")+'</button></div>';
  h+='<div class="fmt">';
  MEALS.forEach(function(name){
    var items=((r.meals[name]||{}).items)||[],tot=sumNutrition(items),done=items.length>0;
    h+='<button class="fmt-c'+(name===now?' now':'')+(done?' done':'')+'" '
     +(done?'data-meal="'+name+'"':'data-addfood="'+name+'"')
     +' aria-label="'+esc(t(name)+", "+fmtN(tot.kcal)+" kcal"+(done?"":", "+t("Add")))+'">'
     +'<span class="fmt-i" aria-hidden="true">'+MICON[name]+'</span>'
     +'<span class="fmt-n">'+esc(t(name==="Snack"?"Snacks":name))+'</span>'
     +'<span class="fmt-k">'+fmtN(tot.kcal)+' kcal</span>'
     +(name===now?'<span class="fmt-now">'+esc(t("Now"))+'</span>':'')
     +(done?'<span class="fmt-ok" aria-hidden="true">'+TICK+'</span>':'')+'</button>';});
  h+='</div>';

  /* In the page, not floating: the dock is the one floating control. */
  h+='<button class="btn fadd" data-addfood="'+(now||mealNow())+'">'
   +'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/></svg>'
   +esc(t("Add Food"))+' <span class="fadd-m">· '+esc(t((now||mealNow())==="Snack"?"Snacks":(now||mealNow())))+'</span></button>';

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
   +'<i class="ico ico-plus"></i></button></div>'
   /* The strands are the day's water: the bright one runs as far as the goal is met. */
   +'<div class="fwater-art">'+waterArt(g.water?r.water/g.water:0)+'</div></div>';
  return h;}

/* ---- one meal (node 13:118). Reached from a logged row above; back returns here. */
function vMeal(dsel,name){
  var r=dayRec(dsel),m=r.meals[name]||{items:[]},items=m.items||[],tot=sumNutrition(items);
  var when=dsel===today()?t("Logged today")
    :t("Logged")+" "+dfmt(new Date(dsel+"T00:00"),{month:"short",day:"numeric"});
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

/* ---- My Foods: the meals you saved and the foods you made ------------------------
   Each row is the builder's: ✕ on the leading edge removes it (with Undo), the row
   opens it, and a saved meal carries a + to log the whole thing into the meal of the
   moment. A new meal is built the way a training day is: name it, then add to it. */
var XSVG='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
var PLUS='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
function vMyFoods(){
  var sm=S.savedMeals||[],mf=S.myFoods||[],now=mealNow(),h='';
  h+='<button class="bnew" data-newmeal="1">'+art("plate",{cls:"btn-art"})+'<span class="bnew-i">'+PLUS+'</span>'
   +'<span class="bnew-t"><b>'+t("Build a meal")+'</b><span>'+t("Name it, then add what goes in it")+'</span></span>'
   +'<span class="ico ico-chev" aria-hidden="true"></span></button>';
  if(!sm.length&&!mf.length){
    return h+'<div class="empty artempty">'+art("idra",{cls:"empty-art"})
     +'<h3>'+esc(t("Nothing saved yet"))+'</h3>'
     +'<p class="tiny">'+esc(t("Save a meal you eat often, or add a food of your own, and it is one tap away when you log."))+'</p>'
     +'<div class="empty-a"><button class="btn g" data-myfood="new">'+esc(t("Add your own food"))+'</button></div></div>';}
  h+='<div class="tsec"><h2 class="tsec-h">'+t("Saved meals")+'</h2>'
   +(sm.length?'<span class="dhint">'+sm.length+'</span>':'')+'</div>';
  if(!sm.length)h+='<p class="dempty">'+esc(t("A saved meal logs everything in it in one tap."))+'</p>';
  else{
    h+='<div class="drows">';
    sm.forEach(function(m){
      var tot=sumNutrition(m.items||[]),n=(m.items||[]).length;
      h+='<div class="drow" data-k="sm:'+m.id+'">'
       +'<button class="drm" data-rmsaved="'+m.id+'" aria-label="'+esc(t("Remove")+" "+m.name)+'"><i>'+XSVG+'</i></button>'
       +'<button class="dmain" data-smeal="'+m.id+'"><span class="dtext"><span class="drow-n">'+esc(m.name)+'</span>'
       +'<span class="drow-s">'+n+' '+t(n===1?"item":"items")+'<i class="ddot"></i>'+fmtN(tot.kcal)+' kcal<i class="ddot"></i>'
       +esc(t("P:"))+' '+r1(tot.p)+'g</span></span></button>'
       +(n?'<button class="dquick" data-addsaved="'+m.id+'" aria-label="'+esc(t("Add")+" "+m.name+" "+t("to")+" "+t(now))+'">'+PLUS+'</button>':'')
       +'</div>';});
    h+='</div>';}
  h+='<div class="tsec"><h2 class="tsec-h">'+t("Your foods")+'</h2>'
   +(mf.length?'<span class="dhint">'+mf.length+'</span>':'')+'</div>';
  if(mf.length){
    h+='<div class="drows">';
    mf.slice().reverse().forEach(function(f){
      var sv=(f.s&&f.s[0]&&f.s[0][0])||"100 g";
      h+='<div class="drow" data-k="mf:'+esc(f.id)+'">'
       +'<button class="drm" data-rmmyfood="'+esc(f.id)+'" aria-label="'+esc(t("Remove")+" "+f.n)+'"><i>'+XSVG+'</i></button>'
       +'<button class="dmain" data-myfood="'+esc(f.id)+'"><span class="dtext"><span class="drow-n">'+esc(f.n)+'</span>'
       +'<span class="drow-s">'+esc(sv)+'<i class="ddot"></i>'+fmtN(f.kcal)+' kcal<i class="ddot"></i>'
       +esc(t("P:"))+' '+r1(f.p)+'g</span></span><span class="ico ico-chev" aria-hidden="true"></span></button></div>';});
    h+='</div>';}
  h+='<button class="dadd" data-myfood="new"><span aria-hidden="true">+</span>'+t("Add your own food")+'</button>';
  return h;}

/* One saved meal, built in place: the title renames it, ✕ takes an item out, the
   dashed + adds from the same search as logging. Level two of the Food tab. */
function savedById(id){return (S.savedMeals||[]).filter(function(m){return m.id===id;})[0]||null;}
function vSavedMeal(id){
  var m=savedById(id);if(!m){V.smeal=null;return vFood();}
  var items=m.items||[],tot=sumNutrition(items),now=mealNow();
  var h='<div class="dhead">'+backArrow()
   +'<button class="dname" data-renamemeal="'+m.id+'" aria-label="'+esc(t("Rename meal")+": "+m.name)+'">'
   +'<h1 class="dhead-t">'+esc(m.name)+'</h1><span class="ico ico-edit" aria-hidden="true"></span></button></div>'
   +'<p class="dsub">'+esc(t("Saved meal"))+'</p>';
  h+='<div class="mealbanner"><div><div class="mealbanner-k">'+esc(t("Total calories"))+'</div>'
   +'<div class="mealbanner-v">'+fmtN(tot.kcal)+' kcal</div></div>'
   +'<div class="mealbanner-m"><span>'+esc(t("P:"))+' '+r1(tot.p)+'g</span>'
   +'<span>'+esc(t("C:"))+' '+r1(tot.c)+'g</span>'
   +'<span>'+esc(t("F:"))+' '+r1(tot.f)+'g</span></div></div>';
  h+='<div class="drows">';
  items.forEach(function(it,i){
    h+='<div class="drow" data-k="si:'+i+':'+esc(it.n)+'">'
     +'<button class="drm" data-rmsmitem="'+m.id+'|'+i+'" aria-label="'+esc(t("Remove")+" "+it.n)+'"><i>'+XSVG+'</i></button>'
     +'<div class="dmain"><span class="dtext"><span class="drow-n">'+esc(it.n)+'</span>'
     +'<span class="drow-s">'+(it.label?esc(it.label)+'<i class="ddot"></i>':'')+fmtN(it.kcal)+' kcal<i class="ddot"></i>'
     +esc(t("P:"))+' '+r1(it.p)+'g</span></span></div></div>';});
  h+='</div>';
  if(!items.length)h+='<p class="dempty">'+esc(t("Add the foods that go in it. They are logged together, in these amounts."))+'</p>';
  h+='<button class="dadd" data-smadd="'+m.id+'"><span aria-hidden="true">+</span>'+t("Add food")+'</button>';
  h+='<div class="dcta">'
   +'<button class="btn dbegin" data-addsaved="'+m.id+'"'+(items.length?'':' disabled')+'>'
   +esc(t("Add to")+" "+t(now==="Snack"?"Snacks":now))+'</button>'
   +'<button class="ddel" data-delsaved="'+m.id+'">'+t("Delete this meal")+'</button></div>';
  return h;}

/* ---- Targets: what the day is measured against, and whether it is working ------
   The gauge's sword stands upright on a day that meets the calorie target. Every
   figure below it is its own input, as the old Nutrition Goals sheet had them; the
   suggestion from your profile, the weight trend against your goal and how you have
   actually been eating sit under them, so a target is changed where its evidence is. */
function macroPct(p,c,f){
  var kc=[p*4,c*4,f*9],kt=kc[0]+kc[1]+kc[2],pc=[0,0,0];
  if(!kt)return pc;
  var raw=kc.map(function(x){return x/kt*100;});
  pc=raw.map(Math.floor);
  var rest=100-pc[0]-pc[1]-pc[2];
  raw.map(function(x,i){return [x-Math.floor(x),i];})
    .sort(function(a,c2){return c2[0]-a[0];}).slice(0,rest)
    .forEach(function(x){pc[x[1]]++;});
  return pc;}
function suggested(){
  var p=S.profile||{};
  if(!p.age||!p.height||!(lastWeight()||p.weight))return null;
  var kc=Math.round(targetKcal()/10)*10,w=lastWeight()||p.weight,pr=proteinTarget(w),f=Math.round(kc*0.28/9);
  return {tdee:tdee(),kcal:kc,p:pr,f:f,c:Math.max(50,Math.round((kc-pr*4-f*9)/4))};}
var TRANGES=[[7,"1W"],[30,"1M"],[90,"3M"]];
var TPAST={7:"Past 7 days",30:"Past 30 days",90:"Past 90 days"};
function vTargets(){
  var g=S.goals,e=eatenToday(today()),frac=g.kcal?e.kcal/g.kcal:0,over=e.kcal>g.kcal,h='';
  h+='<div class="libhero tghero">'+gaugeArt(frac,{cls:"tghero-art"})
   +'<span class="shk">'+t("Today")+'</span>'
   +'<div class="tghero-n"><b>'+fmtN(e.kcal)+'</b><span>/ '+fmtN(g.kcal)+' kcal</span></div>'
   +'<p class="tghero-s'+(over?' over':'')+'">'+esc(fmtN(Math.abs(g.kcal-e.kcal))+" "+t(over?"kcal over":"kcal left"))
   +' · '+esc(t("Protein"))+' '+e.p+' / '+g.p+' g</p></div>';
  var pc=macroPct(g.p,g.c,g.f);
  h+='<div class="tsec"><h2 class="tsec-h">'+t("Daily targets")+'</h2></div>'
   +'<label class="ngcard ngenergy" for="g_kcal"><span class="ngenergy-t">'
   +'<span class="aflbl">'+esc(t("Daily energy goal"))+'</span>'
   +'<span class="ngbig"><input id="g_kcal" type="number" inputmode="numeric" style="width:'+fitCh(g.kcal,"")+'ch" value="'+g.kcal+'"><i>kcal</i></span></span>'
   +'<span class="ico ico-edit" aria-hidden="true"></span></label>'
   +'<div class="ngcard"><div class="aflbl">'+esc(t("Macronutrient split"))+'</div>'
   +'<div class="ngsplit" role="img" aria-label="'
   +esc(t("Protein")+" "+pc[0]+"%, "+t("Carbs")+" "+pc[1]+"%, "+t("Fat")+" "+pc[2]+"%")+'">'
   +(pc[0]?'<i class="p" style="flex-grow:'+pc[0]+'"></i>':'')
   +(pc[1]?'<i class="c" style="flex-grow:'+pc[1]+'"></i>':'')
   +(pc[2]?'<i class="f" style="flex-grow:'+pc[2]+'"></i>':'')+'</div>'
   +'<div class="nglegend"><span>'+esc(t("Protein"))+': '+pc[0]+'%</span>'
   +'<span>'+esc(t("Carbs"))+': '+pc[1]+'%</span><span>'+esc(t("Fat"))+': '+pc[2]+'%</span></div>'
   +'<div class="aftiles ng3">'
   +afTile("g_p",t("Protein"),"g",g.p,"0","numeric")
   +afTile("g_c",t("Carbs"),"g",g.c,"0","numeric")
   +afTile("g_f",t("Fat"),"g",g.f,"0","numeric")+'</div>'
   +'<p class="afnote">'+esc(t("Your macros add up to"))+' '+fmtN(macroKcal(g.p,g.c,g.f))+' kcal.</p></div>'
   +'<div class="ngcard"><div class="aflbl">'+esc(t("Other targets"))+'</div><div class="aftiles">'
   +afTile("g_water",t("Water"),"ml",g.water,"0","numeric")
   +afTile("g_steps",t("Steps"),"",g.steps,"0","numeric")+'</div></div>'
   +'<button class="btn afcta" data-savegoals="1">'+esc(t("Save targets"))+'</button>';
  /* From the profile: maintenance and a target sized to the goal. */
  var sg=suggested();
  h+='<div class="tsec"><h2 class="tsec-h">'+t("Suggested for you")+'</h2></div>';
  if(!sg)h+='<div class="pgcard"><p class="pgnote" style="margin:0 0 12px">'+esc(t("Add your age, height and weight, and Bunyan works out a target for your goal."))+'</p>'
    +'<button class="btn g" data-sheet="set_you">'+esc(t("Add your details"))+'</button></div>';
  else{
    var same=sg.kcal===g.kcal&&sg.p===g.p&&sg.c===g.c&&sg.f===g.f;
    h+='<div class="pgcard tgsug"><div class="tgsug-r"><div><div class="pgstat-k">'+esc(t("Maintenance"))+'</div><b>'+fmtN(sg.tdee)+'</b><small>kcal</small></div>'
     +'<div><div class="pgstat-k">'+esc(t("For your goal"))+'</div><b class="a">'+fmtN(sg.kcal)+'</b><small>kcal</small></div>'
     +'<div><div class="pgstat-k">'+esc(t("Protein"))+'</div><b>'+sg.p+'</b><small>g</small></div></div>'
     +(same?'<p class="pgnote">✓ '+esc(t("These are your targets."))+'</p>'
       :'<button class="btn g" data-usesug="1">'+esc(t("Use these targets"))+'</button>')+'</div>';}
  /* Is it working: the weigh-ins against the goal. */
  var tc=trendCard(true);
  h+='<div class="tsec"><h2 class="tsec-h">'+t("Is it working?")+'</h2></div>'
   +(tc||('<div class="pgcard"><p class="pgnote" style="margin:0 0 12px">'+esc(t("Weigh in a few times over two weeks and this says whether the target is working."))+'</p>'
    +'<button class="btn g" data-sheet="weigh">'+esc(t("Log weight"))+'</button></div>'));
  /* And how the eating has actually gone, over a range of its own. */
  var r=[7,30,90].indexOf(+V.frange)>=0?+V.frange:30;
  h+='<div class="tsec"><h2 class="tsec-h">'+t("How you have been eating")+'</h2></div>';
  h+=seg({items:TRANGES.map(function(x){return [x[0],t(x[1]),t(TPAST[x[0]])];}),value:r,attr:"frange",
    soft:true,cls:"pgrange",label:t("Time range"),key:"frange"});
  h+=vNutrition(r);
  return h;}

export {glassUnit, MEALS, mealNow, savedById, vFood};
