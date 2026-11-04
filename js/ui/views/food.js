/* Bunyan — food
   Food tab, in three sections behind one control, as Train is: Today (the day's
   dashboard, node 13:12, and one meal's detail, node 13:118), My Foods (the meals you
   saved and the foods you made, kept and edited here) and Targets (what the day is
   measured against, with the evidence for whether it is working beside it). */
import {hb} from "../haptic.js";
import {t} from "../../i18n/dict.js";
import {eatenToday, energyMissing, macroKcal, macroTargets, tdee, tdeeFormula} from "../../engine/formulas.js";
import {learnedDiffers, learnedNow, maintenanceInUse} from "../../engine/energy.js";
import {checkPlans} from "../../engine/plancheck.js";
import {FOODDB, sumNutrition, foodName} from "../../engine/nutrition.js";
import {foodPic} from "../../data/foodicons.js";
import {dayRec, S} from "../../state.js";
import {dfmt, esc, fmtN, num, r1, today} from "../../util.js";
import {curDate, GRIPSVG, mealNow, progressBar, reorderBtn, seg, V} from "../view.js";
import {dayMeals, importName, mealName, mealSlots, mealStyle, nextMeal, planOf, slotOf} from "../../engine/meals.js";
import {dateBar} from "../datebar.js";
import {backArrow} from "../nav.js";
import {art, waterArt} from "../art.js";
import {bodyNeeds} from "../bodyneeds.js";
import {similarFoods} from "../../engine/mealplan.js";
import {glyph} from "../glyphs.js";
import {fitCh, afTile} from "./addfood.js";
import {trendCard, vNutrition} from "./progress.js";

/* ============================================================ FOOD */
/* Meal glyphs, on the dock's grid and stroke: sun, sun on the horizon, moon, apple. A
   meal of the user's own carries its place in the day instead (js/engine/meals.js). */
var MICON={
  Breakfast:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/></svg>',
  Lunch:'<svg viewBox="0 0 24 24"><path d="M7 16a5 5 0 0 1 10 0M3 16h18M12 5v3M5.2 9.2l1.4 1.4M18.8 9.2l-1.4 1.4M6 20h12"/></svg>',
  Dinner:'<svg viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>',
  Snack:'<svg viewBox="0 0 24 24"><path d="M12 8c-1.5-1.3-4.5-1.5-6 .5-1.8 2.4-.8 7 1.5 9.5 1.3 1.4 2.8 1.6 4.5.8 1.7.8 3.2.6 4.5-.8 2.3-2.5 3.3-7.1 1.5-9.5-1.5-2-4.5-1.8-6-.5z"/><path d="M12 8c0-2 1-3.5 3-4"/></svg>'};
/* A meal's badge: its icon if it is one of the four or the supplements, else its
   number — the one in its name ("Meal 3", kept from an imported plan) before its place. */
var PILL='<svg viewBox="0 0 24 24"><rect x="3.5" y="8.5" width="17" height="7" rx="3.5" transform="rotate(-35 12 12)"/><path d="M9.6 8.6l4.8 6.8"/></svg>';
function badgeOf(x,i){
  if(MICON[x.id])return {icon:MICON[x.id]};
  var nm=String(x.name||"");
  if(/^(supplements?|vitamins?|مكملات|فيتامينات)$/i.test(nm.trim()))return {icon:PILL};
  var m=/(?:^|\s)(\d{1,2})$/.exec(nm.trim());
  return {n:m?+m[1]:i+1};}
function mealIcon(id){
  var sl=mealSlots(),i=sl.map(function(s){return s.id;}).indexOf(id);
  var bd=i>=0?badgeOf(sl[i],i):(MICON[id]?{icon:MICON[id]}:{n:"·"});
  if(bd.icon)return '<span class="fmt-i" aria-hidden="true">'+bd.icon+'</span>';
  return '<span class="fmt-i fmt-no" aria-hidden="true">'+bd.n+'</span>';}
var TICK='<svg viewBox="0 0 24 24"><path d="M6 12.5l4 4 8-9"/></svg>';
/* The meal an add belongs to when nothing on screen says which — the Add Food button,
   the frequent-food pills, a saved meal: the one after the last with food in it. It
   was the clock's guess, which a late start or a numbered day made wrong. */

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

/* The Food page is for the day: log what you eat and see where you are. Planning it
   (the meal plan, the targets, foods of your own, imports) is Coach → Nutrition
   (js/ui/views/coach.js), which draws the pieces exported at the foot. */
function vFood(){
  var dsel=curDate();
  /* Planning, one step in from here (owner, 3 Nov): a meal's plan, a saved meal, an
     import, and the plan page itself. */
  var sub=foodSub();if(sub!=null)return sub;
  if(V.fplan)return vFoodPlan();
  if(V.meal)return vMeal(dsel,V.meal);
  /* The drawing is the page's: a baladi loaf and a palm frond at the header's edge. */
  var h='<div class="thead fthead"><div><h1>'+t("Food")+'</h1>'
   +'<p class="thead-s">'+t("Fuel your progress")+'</p></div>'
   +art("loaf",{cls:"fthead-art"})+'</div>';
  return h+vFoodToday(dsel);}
/* ---- Food's plan page ---------------------------------------------------------------
   Where eating is planned: the day's meal plan and the daily targets, two tabs swiped
   between (owner, 3 Nov: "some of the tabs logically don't make sense" — My foods is a
   library you log from, not a plan, so it is a page of its own, reached from the meal
   plan's list and from adding food). Back returns to Food. */
var FPLAN=[["plan","Meal plan"],["targets","Daily goals"]];
function vFoodPlan(){
  if(V.fplan==="foods")return vMyFoodsPage();
  var fs=FPLAN.some(function(x){return x[0]===V.fplan;})?V.fplan:"plan",g=S.goals||{};
  /* How meals are named is the gear at the top right, as on Training's plan page. */
  var h='<div class="dhead">'+backArrow()+'<h1 class="dhead-t">'+esc(t("Nutrition plan"))+'</h1>'
   +'<button class="icobtn dhead-a" data-sheet="set_meals" aria-label="'+esc(t("Meal plan settings"))+'">'+glyph("gear")+'</button></div>'
   +'<p class="dsub">'+esc(t("{k} kcal · {p} g protein a day").replace("{k}",fmtN(Math.round(num(g.kcal)))).replace("{p}",Math.round(num(g.p))))+'</p>';
  h+=seg({items:FPLAN.map(function(x){return [x[0],t(x[1])];}),value:fs,attr:"fplan",tabs:true,cls:"psecs",label:t("Nutrition plan"),key:"fplan"});
  h+='<div class="psec" data-pswipe="fplan" data-k="psec-'+fs+'">'+(fs==="targets"?vTargets():fs==="foods"?vMyFoods():vPlan())+'</div>';
  return h;}
/* Your plan, on Food: what is planned and the targets, the way into the plan page. */
function foodPlanCard(){
  var g=S.goals||{},planned=mealSlots().filter(function(x){return (x.plan||[]).length;}).length;
  return '<button class="pgc pgc-h fpc" data-fplan="plan"><span class="pgc-t"><span class="klabel">'+esc(t("Your plan"))+'</span>'
   +'<b>'+esc(planned?t(planned===1?"1 meal planned":"{n} meals planned").replace("{n}",planned):t("No meal plan yet"))+'</b>'
   +'<span class="pgc-s">'+esc(t("{k} kcal · {p} g protein a day").replace("{k}",fmtN(Math.round(num(g.kcal)))).replace("{p}",Math.round(num(g.p))))+'</span></span>'
   +'<span class="pgc-go">'+esc(t("Plan"))+'<span class="ico ico-chev" aria-hidden="true"></span></span></button>';}
/* The planning screens: null when none is open. */
function foodSub(){
  if(V.smeal){var a=vSavedMeal(V.smeal);if(a!=null)return a;}
  if(V.pslot){var b=vPlanSlot(V.pslot);if(b!=null)return b;}
  if(V.pimport)return vImport();
  return null;}

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

  /* ---- the day's meals as tiles: a logged one is ticked and opens the meal, an empty
     one adds to it — or, when it has a plan, opens it so the plan is one tap away.
     Nothing is marked "Now": the day is the user's, not the clock's. */
  /* ---- what is behind for the time of day, right under the day's numbers, today only
     (js/ui/bodyneeds.js): one slim card, or none. */
  if(dsel===today())h+=bodyNeeds(e,r.water||0);
  var ids=dayMeals(dsel),next=nextMeal(dsel),n=ids.length;
  h+='<div class="tsec"><h2 class="tsec-h">'+t(dsel===today()?"Today's Meals":"Meals")+'</h2>'
   +'<button class="tlink" data-openday="'+dsel+'">'+t("Day details")+'</button></div>';
  h+='<div class="fmt" style="--cols:'+(n<=4?n:n<=6?3:4)+'">';
  ids.forEach(function(id){
    var items=((r.meals[id]||{}).items)||[],tot=sumNutrition(items),done=items.length>0,plan=planOf(id).length>0;
    h+='<button class="fmt-c'+(done?' done':'')+'" '
     +(done||plan?'data-meal="'+esc(id)+'"':'data-addfood="'+esc(id)+'"')
     +' aria-label="'+esc(mealName(id)+", "+fmtN(tot.kcal)+" kcal"+(done?"":plan?", "+t("planned"):", "+t("Add")))+'">'
     +mealIcon(id)
     +'<span class="fmt-n">'+esc(mealName(id))+'</span>'
     +'<span class="fmt-k">'+fmtN(tot.kcal)+' kcal</span>'
     +(!done&&plan?'<span class="fmt-plan" aria-hidden="true"></span>':'')
     +(done?'<span class="fmt-ok" aria-hidden="true">'+TICK+'</span>':'')+'</button>';});
  h+='</div>';

  /* The coach's meal plan, one tap into the meals not logged yet today. */
  if(dsel===today()&&ids.some(function(id){return planOf(id).length&&!(((r.meals[id]||{}).items)||[]).length;}))
    h+='<button class="btn g flogplan" data-logday="1">'+esc(t("Log today's plan"))+'</button>';
  /* In the page, not floating: the dock is the one floating control. */
  h+='<button class="btn fadd" data-addfood="'+esc(next)+'">'
   +'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/></svg>'
   +esc(t("Add Food"))+' <span class="fadd-m">· '+esc(mealName(next))+'</span></button>';

  h+=foodPlanCard();

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
    h+=hb('<button class="fglass'+(full?' full':'')+'" data-wset="'+((full&&i===done?i-1:i)*unit)+'"'
     +' aria-label="'+esc(i+" "+t("glasses"))+'"'+(full?' aria-pressed="true"':'')+'><i></i></button>');}
  h+='</div>'+hb('<button class="fwater-add" data-water="'+unit+'"'
   +' aria-label="'+esc(t("Add")+" "+unit+" ml "+t("Water"))+'">'
   +'<i class="ico ico-plus"></i></button>')+'</div>'
   /* The strands are the day's water: the bright one runs as far as the goal is met. */
   +'<div class="fwater-art">'+waterArt(g.water?r.water/g.water:0)+'</div></div>';
  return h;}

/* ---- one meal (node 13:118). Reached from a logged row above; back returns here. */
/* What a logged item was, for its picture: the food it came from when there is one,
   else just its name (a quick add, or a food since deleted). */
function foodOfItem(it){
  var p=(S.myFoods||[]).concat(FOODDB||[]);
  for(var i=0;it.fid&&i<p.length;i++)if(p[i].id===it.fid)return p[i];
  return {n:it.n};}
function vMeal(dsel,name){
  var r=dayRec(dsel),m=r.meals[name]||{items:[]},items=m.items||[],tot=sumNutrition(items);
  var when=dsel===today()?t("Logged today")
    :t("Logged")+" "+dfmt(new Date(dsel+"T00:00"),{month:"short",day:"numeric"});
  /* The same header the Train day screen uses, so the two "one thing inside a tab"
     screens are the same shape. The two frames disagree on its size; the app does not. */
  var h='<div class="dhead">'+backArrow()
   +'<h1 class="dhead-t">'+esc(mealName(name))+'</h1></div>'
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
     +'<button class="fitemrow-b" data-editfood="'+esc("day|"+name+"|"+i)+'" aria-label="'
     +esc(t("Change the amount of")+" "+foodName(it))+'">'+foodPic(foodOfItem(it))
     +'<div style="flex:1;min-width:0"><div class="fitemrow-n">'+esc(foodName(it))
     +(it.label?' <span style="font-weight:400;color:var(--dim)">('+esc(it.label)+')</span>':'')
     +'</div>'
     +'<div class="fitemrow-m">'+esc(t("P:"))+' '+r1(it.p)+'g · '
     +esc(t("C:"))+' '+r1(it.c)+'g · '+esc(t("F:"))+' '+r1(it.f)+'g'
     +(it.src&&it.src!=="db"?' · '+esc(t(it.src==="est"?"Estimated":it.src==="you"?"Yours":"Branded")):'')
     +'</div></div>'
     +'<span class="fitemrow-k">'+fmtN(it.kcal)+' kcal</span></button>'
     +'<button class="fitemrow-x" data-dropfood="'+name+'|'+i+'" aria-label="'
     +esc(t("Remove")+" "+foodName(it))+'"><i class="ico ico-trash"></i></button></div>';});

  /* The plan for this meal, under what was eaten: one tap logs it as written. */
  var plan=planOf(name);
  if(plan.length){
    var pt=sumNutrition(plan);
    h+='<div class="tsec"><h2 class="tsec-h">'+t("Your plan")+'</h2><span class="dhint">'+fmtN(pt.kcal)+' kcal</span></div>'
     +'<div class="plist">'+plan.map(function(it){
        return '<div class="plist-r"><span>'+esc(foodName(it))+(it.label?' <i>'+esc(it.label)+'</i>':'')
          +(it.note?'<small class="plist-note">'+esc(it.note)+'</small>':'')+'</span><b>'+fmtN(it.kcal)+'</b></div>';}).join("")+'</div>'
     +'<button class="btn'+(items.length?' g':'')+' plog" data-logplan="'+esc(name)+'">'+esc(t(items.length?"Add the plan again":"Log as planned"))+'</button>';}
  h+='<button class="btn'+(plan.length&&!items.length?' g':'')+'" data-addfood="'+esc(name)+'">+ '
   +esc(t("Add food to")+" "+mealName(name))+'</button>';
  return h;}

/* ---- My Foods: the meals you saved and the foods you made ------------------------
   Each row is the builder's: ✕ on the leading edge removes it (with Undo), the row
   opens it, and a saved meal carries a + to log the whole thing into the meal of the
   moment. A new meal is built the way a training day is: name it, then add to it. */
var XSVG='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
var PLUS='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
var SPARK='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18"/></svg>';
var DOC='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12h5M10 16h5"/></svg>';
/* My foods: the foods and meals of your own, kept to be logged in one tap. Its own page
   now, one step in from the meal plan. Two ways to add, side by side; the lists; Edit
   for the ✕, as everywhere else. A list with nothing in it is not shown at all. */
function vMyFoodsPage(){
  return '<div class="dhead">'+backArrow()+'<h1 class="dhead-t">'+esc(t("My foods"))+'</h1></div>'
   +'<p class="dsub">'+esc(t("Foods and meals of your own, one tap away when you log."))+'</p>'+vMyFoods();}
function vMyFoods(){
  var sm=S.savedMeals||[],mf=S.myFoods||[],now=mealNow(today()),ed=V.reorder==="mf",h='';
  h+='<div class="ptiles">'
   +'<button class="ptile" data-newmeal="1"><span class="ptile-i">'+PLUS+'</span><b>'+t("Save a meal")+'</b><span>'+t("Several foods logged in one tap")+'</span></button>'
   +'<button class="ptile" data-myfood="new"><span class="ptile-i">'+PLUS+'</span><b>'+t("Add a food")+'</b><span>'+t("From its label")+'</span></button></div>';
  if(!sm.length&&!mf.length){
    return h+'<div class="empty artempty">'+art("idra",{cls:"empty-art"})
     +'<h3>'+esc(t("Nothing saved yet"))+'</h3>'
     +'<p class="tiny">'+esc(t("What you keep here is one tap away when you log."))+'</p></div>';}
  var drm=function(attr,id,name){return ed?'<button class="drm" '+attr+'="'+esc(id)+'" aria-label="'+esc(t("Remove")+" "+name)+'"><i>'+XSVG+'</i></button>':'';};
  if(sm.length){
    h+='<div class="tsec droutine"><h2 class="tsec-h">'+t("Saved meals")+'</h2><span class="libn num">'+sm.length+'</span>'+reorderBtn("mf",ed,true)+'</div><div class="drows'+(ed?' ro ed':'')+'">';
    sm.forEach(function(m){
      var tot=sumNutrition(m.items||[]),n=(m.items||[]).length;
      h+='<div class="drow" data-k="sm:'+m.id+'">'+drm("data-rmsaved",m.id,m.name)
       +'<button class="dmain" data-smeal="'+m.id+'"><span class="dtext"><span class="drow-n">'+esc(m.name)+'</span>'
       +'<span class="drow-s">'+n+' '+t(n===1?"item":"items")+'<i class="ddot"></i>'+fmtN(tot.kcal)+' kcal<i class="ddot"></i>'
       +esc(t("P:"))+' '+r1(tot.p)+'g</span></span></button>'
       +(n&&!ed?'<button class="dquick" data-addsaved="'+m.id+'" aria-label="'+esc(t("Add")+" "+m.name+" "+t("to")+" "+mealName(now))+'">'+PLUS+'</button>':'')
       +'</div>';});
    h+='</div>';}
  if(mf.length){
    h+='<div class="tsec droutine"><h2 class="tsec-h">'+t("Your foods")+'</h2><span class="libn num">'+mf.length+'</span>'+(sm.length?'':reorderBtn("mf",ed,true))+'</div><div class="drows'+(ed?' ro ed':'')+'">';
    mf.slice().reverse().forEach(function(f){
      var sv=(f.s&&f.s[0]&&f.s[0][0])||"100 g";
      h+='<div class="drow" data-k="mf:'+esc(f.id)+'">'+drm("data-rmmyfood",f.id,f.n)
       +'<button class="dmain" data-myfood="'+esc(f.id)+'"><span class="dtext"><span class="drow-n">'+esc(f.n)+'</span>'
       +'<span class="drow-s">'+esc(sv)+'<i class="ddot"></i>'+fmtN(f.kcal)+' kcal<i class="ddot"></i>'
       +esc(t("P:"))+' '+r1(f.p)+'g</span></span><span class="ico ico-chev" aria-hidden="true"></span></button></div>';});
    h+='</div>';}
  return h;}

/* A food in a meal being built: tap it to change its amount (the servings screen
   opens on what it is now), ✕ beside it to take it out. */
function amountRow(where,it){
  return '<button class="dmain dedit" data-editfood="'+esc(where)+'" aria-label="'+esc(t("Change the amount of")+" "+foodName(it))+'">'
   +'<span class="dtext"><span class="drow-n">'+esc(foodName(it))+'</span>'
   +'<span class="drow-s">'+(it.label?esc(it.label)+'<i class="ddot"></i>':'')+fmtN(it.kcal)+' kcal<i class="ddot"></i>'
   +esc(t("P:"))+' '+r1(it.p)+'g</span></span>'
   +'<span class="ico ico-edit" aria-hidden="true"></span></button>';}
/* One saved meal, built in place: the title renames it, ✕ takes an item out, a tap
   on an item changes its amount, the dashed + adds from the same search as logging.
   Level two of the Food tab. */
function savedById(id){return (S.savedMeals||[]).filter(function(m){return m.id===id;})[0]||null;}
function vSavedMeal(id){
  var m=savedById(id);if(!m){V.smeal=null;return null;}
  var items=m.items||[],tot=sumNutrition(items),now=mealNow(today());
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
    h+='<div class="drow" data-k="si:'+i+':'+esc(foodName(it))+'">'
     +'<button class="drm" data-rmsmitem="'+m.id+'|'+i+'" aria-label="'+esc(t("Remove")+" "+foodName(it))+'"><i>'+XSVG+'</i></button>'
     +amountRow("saved|"+m.id+"|"+i,it)+'</div>';});
  h+='</div>';
  if(!items.length)h+='<p class="dempty">'+esc(t("Add the foods that go in it. They are logged together, in these amounts."))+'</p>';
  h+='<button class="dadd" data-smadd="'+m.id+'"><span aria-hidden="true">+</span>'+t("Add food")+'</button>';
  h+='<div class="dcta">'
   +'<button class="btn dbegin" data-addsaved="'+m.id+'"'+(items.length?'':' disabled')+'>'
   +esc(t("Add to")+" "+mealName(now))+'</button>'
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
/* null without an age, a height or a weight: nothing is worked out from a guess. */
function suggested(){
  var m=macroTargets();
  if(!m)return null;
  return {tdee:tdee(),kcal:m.kcal,p:m.p,f:m.f,c:m.c};}
/* Where the maintenance figure comes from, and what the log measures. */
function maintSource(){
  var use=maintenanceInUse(),L=learnedNow(),h='<p class="pgnote tgsrc">';
  var ld=checkPlans().some(function(f){return f.id==="maint-learned";})?learnedDiffers():null;
  if(use.source==="learned")h+=esc(t("Maintenance measured from your own log (the formula says {f}).").replace("{f}",fmtN(tdeeFormula())));
  else if(L.kind==="ok")h+=esc(t("Maintenance by formula. Your own log measures about {k} ({lo}–{hi}).")
    .replace("{k}",fmtN(L.kcal)).replace("{lo}",fmtN(L.low)).replace("{hi}",fmtN(L.high)));
  else h+=esc(t("Worked out from your age, height, weight and activity. After two weeks of logging food and weight, Bunyan checks it against your own results."));
  h+='</p>';
  if(ld)h+='<button class="btn g sm tgsrc-b" data-pcfix="maint-learned">'+esc(t("Build my targets on {k} kcal").replace("{k}",fmtN(ld.learned.kcal)))+'</button>';
  return h;}
var TRANGES=[[7,"1W"],[30,"1M"],[90,"3M"]];
var TPAST={7:"Past 7 days",30:"Past 30 days",90:"Past 90 days"};
/* Targets (owner, 3 Nov: "looks like a PDF", too much at once). One card says the
   target: the calories, what they are made of, water and steps, and where maintenance
   comes from. Edit opens the same card as fields; Save or Cancel closes it. The coach's
   suggestion shows only when it differs, with Use. Then whether it is working; the
   eating history folds away under one row. */
function vTargets(){
  var g=S.goals,h='',pc=macroPct(g.p,g.c,g.f),sg=suggested(),ed=!!V.tgedit;
  var mk=macroKcal(g.p,g.c,g.f),gap=Math.round(num(g.kcal)-mk),fig=function(x){return '<span class="num">'+x+'</span>';};
  if(!sg)h+=energyMissing()==="no_weight"
    ?'<div class="pgcard tgneed"><p class="pgnote" style="margin:0 0 12px">'+esc(t("Log your weight, and Bunyan works out your maintenance and a target for your goal. Nothing is worked out without it."))+'</p>'
      +'<button class="btn g" data-sheet="weigh">'+esc(t("Log weight"))+'</button></div>'
    :'<div class="pgcard tgneed"><p class="pgnote" style="margin:0 0 12px">'+esc(t("Add your age, height and weight, and Bunyan works out a target for your goal."))+'</p>'
      +'<button class="btn g" data-sheet="set_you">'+esc(t("Add your details"))+'</button></div>';
  var same=!!sg&&sg.kcal===g.kcal&&sg.p===g.p&&sg.c===g.c&&sg.f===g.f;
  if(sg&&!same&&!ed)h+='<div class="tgoffer"><div><span class="klabel">'+esc(t("The coach suggests"))+'</span>'
    +'<b>'+fig(fmtN(sg.kcal)+' kcal')+' · '+fig(sg.p+' g')+' '+esc(t("protein"))+'</b>'
    +'<span class="tgoffer-s">'+esc(t("Maintenance {m} kcal, adjusted for your goal.")).replace("{m}",fig(fmtN(sg.tdee)))+'</span></div>'
    +hb('<button class="btn sm" data-usesug="1">'+esc(t("Use"))+'</button>')+'</div>';
  if(!ed){
    h+='<section class="tgcard glass"><div class="tgcard-h"><span class="klabel">'+esc(t("Your daily goal"))+'</span>'
     +'<button class="tlink dreorder" data-tgedit="1">'+esc(t("Edit"))+'</button></div>'
     +'<div class="tgcard-k">'+fig(fmtN(g.kcal)+' <small>kcal</small>')+'</div>'
     +'<div class="ngsplit" role="img" aria-label="'+esc(t("Protein")+" "+pc[0]+"%, "+t("Carbs")+" "+pc[1]+"%, "+t("Fat")+" "+pc[2]+"%")+'">'
     +(pc[0]?'<i class="p" style="flex-grow:'+pc[0]+'"></i>':'')+(pc[1]?'<i class="c" style="flex-grow:'+pc[1]+'"></i>':'')+(pc[2]?'<i class="f" style="flex-grow:'+pc[2]+'"></i>':'')+'</div>'
     +'<div class="tgmac">'+[["p","Protein",g.p,pc[0]],["c","Carbs",g.c,pc[1]],["f","Fat",g.f,pc[2]]].map(function(x){
        return '<div class="'+x[0]+'"><span>'+esc(t(x[1]))+'</span><b>'+fig(x[2]+' g')+'</b><em>'+fig(x[3]+'%')+'</em></div>';}).join("")+'</div>'
     +'<div class="tgmore"><span>'+esc(t("Water"))+' <b>'+fig(fmtN(g.water))+'</b> ml</span><span>'+esc(t("Steps"))+' <b>'+fig(fmtN(g.steps))+'</b></span></div>'
     +(Math.abs(gap)>40?'<div class="tgwarn"><p>'+esc(t(gap>0?"Your macros add up to {m} kcal, {d} under your target.":"Your macros add up to {m} kcal, {d} over your target."))
        .replace("{m}",fig(fmtN(mk))).replace("{d}",fig(fmtN(Math.abs(gap))))+'</p><button class="btn g sm" data-fitmacros="1">'+esc(t("Fix it for me"))+'</button></div>':'')
     +(sg?'<div class="tgsrc-w">'+(same?'<p class="pgnote tgsame">'+esc(t("Matches the coach's suggestion."))+'</p>':'')+maintSource()+'</div>':'')
     +'</section>';}
  else{
    h+='<section class="tgcard tgedit glass"><div class="tgcard-h"><span class="klabel">'+esc(t("Your daily goal"))+'</span></div>'
     +'<label class="ngenergy" for="g_kcal"><span class="ngbig"><input id="g_kcal" type="number" inputmode="numeric" style="width:'+fitCh(g.kcal,"")+'ch" value="'+g.kcal+'"><i>kcal</i></span></label>'
     +'<div class="aftiles ng3">'+afTile("g_p",t("Protein"),"g",g.p,"0","numeric")+afTile("g_c",t("Carbs"),"g",g.c,"0","numeric")+afTile("g_f",t("Fat"),"g",g.f,"0","numeric")+'</div>'
     +'<p class="afnote">'+esc(t("Your macros add up to {m} kcal.")).replace("{m}",fig(fmtN(mk)))+'</p>'
     +(Math.abs(gap)>40?'<button class="btn g sm afit" data-fitmacros="1">'+esc(t("Fix it for me"))+'</button>':'')
     +'<div class="aftiles">'+afTile("g_water",t("Water"),"ml",g.water,"0","numeric")+afTile("g_steps",t("Steps"),"",g.steps,"0","numeric")+'</div>'
     +'<div class="tgacts">'+hb('<button class="btn" data-savegoals="1">'+esc(t("Save"))+'</button>')
     +'<button class="btn g" data-tgedit="0">'+esc(t("Cancel"))+'</button></div></section>';}
  /* Is it working: the weigh-ins against the goal. */
  var tc=trendCard(true);
  h+='<div class="tsec"><h2 class="tsec-h">'+t("Is it working?")+'</h2></div>'
   +(tc||('<div class="pgcard"><p class="pgnote" style="margin:0 0 12px">'+esc(t("Weigh in a few times over two weeks and this says whether the target is working."))+'</p>'
    +'<button class="btn g" data-sheet="weigh">'+esc(t("Log weight"))+'</button></div>'));
  /* How the eating has actually gone: folded, one row until asked for. */
  var r=[7,30,90].indexOf(+V.frange)>=0?+V.frange:30,open=!!(V.fold&&V.fold.feat);
  h+='<div class="fold tgfold'+(open?' open':'')+'"><button class="tgfold-h" data-fold="feat" aria-expanded="'+open+'"><span>'+esc(t("How you have been eating"))+'</span>'+glyph("chev","fold-chev")+'</button>'
   +'<div class="fold-body">'+seg({items:TRANGES.map(function(x){return [x[0],t(x[1]),t(TPAST[x[0]])];}),value:r,attr:"frange",
    soft:true,cls:"pgrange",label:t("Time range"),key:"frange"})+vNutrition(r)+'</div></div>';
  return h;}

/* ---- Plan: the day's meals and what is planned for each ---------------------------
   Built the way Train's My Program is: the day at the top, how its meals are named,
   then the meals as rows (✕ removes with Undo, Reorder moves, the row opens its plan),
   + to add one, and the day's plan logged in one tap. Import reads a plan from text. */
function slotLine(id){
  var s=slotOf(id)||{},pl=s.plan||[],td=(s.todo||[]).length,tot=sumNutrition(pl),bits=[];
  if(pl.length)bits.push(pl.length+' '+t(pl.length===1?"food":"foods"),fmtN(tot.kcal)+' kcal',t("P:")+' '+tot.p+'g');
  if(td)bits.push(td+' '+t("to find"));
  return bits.length?bits.map(esc).join('<i class="ddot"></i>'):'<em>'+esc(t("No plan yet — tap to add foods"))+'</em>';}
/* The meal plan (owner, 3 Nov: inconsistent, unorganised, "looks like a PDF"). What the
   day's plan comes to against the target, in two bars and one verdict; the meals; two
   ways to fill it at once, as two tiles; then the settings of the plan as one list — how
   meals are named, your own foods, sharing — instead of cards and links one under
   another. */
function vPlan(){
  var sl=mealSlots(),g=S.goals,all=[],h='',style=mealStyle(),ro=sl.length>0&&V.reorder==="ms";
  sl.forEach(function(x){all=all.concat(x.plan||[]);});
  var tot=sumNutrition(all),fig=function(x){return '<span class="num">'+x+'</span>';};
  var bar=function(cls,cur,goal){var p=goal?Math.min(1,cur/goal):0;return '<span class="plbar '+cls+'"><i style="width:'+Math.round(p*100)+'%"></i></span>';};
  var d=Math.round(tot.kcal-num(g.kcal)),near=Math.abs(d)<=Math.max(60,num(g.kcal)*0.04);
  var verdict=!all.length?t("Nothing planned yet."):near?t("On target."):d<0?t("{n} kcal left to plan.").replace("{n}",fmtN(-d)):t("{n} kcal over your goal.").replace("{n}",fmtN(d));
  /* Nothing planned yet: the first thing is how to start, not a summary of nothing. */
  var tiles='<div class="ptiles">'
   +'<button class="ptile" data-pgen="1"><span class="ptile-i">'+SPARK+'</span><b>'+t("Make it from my goals")+'</b><span>'+t("A full day that adds up. You check it first.")+'</span></button>'
   +'<button class="ptile" data-pimport="1"><span class="ptile-i">'+DOC+'</span><b>'+t("Copy in a plan")+'</b><span>'+t("Paste it, open a file, or one shared with you")+'</span></button></div>';
  /* Copying a plan in and sharing it are icons by its name, as a program's are; making a
     new one from the goals and your own foods are in the gear (owner, 4 Nov). With
     nothing planned yet the card below is the way in, so no row. */
  var np=sl.filter(function(x){return (x.plan||[]).length;}).length,ib=function(a,g,l){return '<button class="icobtn" '+a+' aria-label="'+esc(l)+'">'+glyph(g)+'</button>';};
  if(all.length)h+='<div class="bname"><div class="bname-l"><h2 class="bname-t">'+esc(t("Your meal plan"))+'</h2>'
   +'<span class="bname-s">'+esc(t(np===1?"1 meal · {k} kcal":"{n} meals · {k} kcal").replace("{n}",np).replace("{k}",fmtN(tot.kcal)))+'</span></div>'
   +'<div class="bname-a">'+ib('data-pimport="1"',"download",t("Copy in a plan"))+ib('data-shareplan="meals"',"share",t("Share my meal plan"))
   +'</div></div>';
  if(!all.length)h+='<section class="plstart glass"><span class="klabel">'+esc(t("Make your meal plan"))+'</span>'
   +'<p>'+esc(t("Let the coach make a full day from your goals, or copy in a plan you already have."))+'</p>'+tiles+'</section>';
  else h+='<section class="plsum glass"><div class="plsum-h"><span class="klabel">'+esc(t("Planned for a day"))+'</span>'
   +'<span class="plsum-v'+(all.length&&near?' ok':'')+'">'+esc(verdict)+'</span></div>'
   +'<div class="plsum-r"><span>'+esc(t("Calories"))+'</span>'+bar("k",tot.kcal,g.kcal)+'<b>'+fig(fmtN(tot.kcal)+' / '+fmtN(g.kcal))+'</b></div>'
   +'<div class="plsum-r"><span>'+esc(t("Protein"))+'</span>'+bar("p",tot.p,g.p)+'<b>'+fig(Math.round(tot.p)+' / '+g.p+' g')+'</b></div></section>';
  /* Edit shows each meal's ✕ and grip; out of it, the list is the plan. */
  h+='<div class="tsec droutine"><h2 class="tsec-h">'+t("Meals")+'</h2>'
   +(sl.length?reorderBtn("ms",ro,true):'')+'</div>';
  h+='<div class="drows'+(ro?' ro ed':'')+'">';
  sl.forEach(function(x,i){
    h+='<div class="drow" data-k="ms:'+esc(x.id)+'" data-rowid="'+esc(x.id)+'">'
     +(ro?'<button class="drm" data-rmslot="'+esc(x.id)+'" aria-label="'+esc(t("Remove")+" "+mealName(x.id))+'"><i>'+XSVG+'</i></button>':'')
     +'<button class="dmain" data-pslot="'+esc(x.id)+'">'
     +(function(bd){return bd.icon?'<span class="bnum pli" aria-hidden="true">'+bd.icon+'</span>':'<span class="bnum">'+bd.n+'</span>';})(badgeOf(x,i))
     +'<span class="dtext"><span class="drow-n">'+esc(mealName(x.id))+'</span>'
     +'<span class="drow-s">'+slotLine(x.id)+'</span></span>'
     +'<span class="ico ico-chev" aria-hidden="true"></span></button>'
     +(ro?'<button class="dgrip" data-grip="'+esc(x.id)+'" aria-label="'+esc(t("Move")+" "+mealName(x.id))+'">'+GRIPSVG+'</button>':'')
     +'</div>';});
  h+='</div><button class="dadd" data-paddslot="1"><span aria-hidden="true">+</span>'+t("Add a meal")+'</button>';
  return h;}

/* One meal's plan, built in place like a saved meal: the title renames it, ✕ takes a
   food out, + adds from the same search as logging. Lines an import could not match
   wait under the list, each with Find, which opens the search already typed. */
function vPlanSlot(id){
  var x=slotOf(id);if(!x){V.pslot=null;return null;}
  var sl=mealSlots(),pos=sl.findIndex(function(s){return s.id===id;})+1,pl=x.plan||[],todo=x.todo||[],tot=sumNutrition(pl);
  var h='<div class="dhead">'+backArrow()
   +'<button class="dname" data-prename="'+esc(id)+'" aria-label="'+esc(t("Rename meal")+": "+mealName(id))+'">'
   +'<h1 class="dhead-t">'+esc(mealName(id))+'</h1><span class="ico ico-edit" aria-hidden="true"></span></button></div>'
   +'<p class="dsub">'+esc(t("Meal {n} of {m}").replace("{n}",pos).replace("{m}",sl.length))+' · '+esc(t("Your plan"))+'</p>';
  h+='<div class="mealbanner"><div><div class="mealbanner-k">'+esc(t("Total calories"))+'</div>'
   +'<div class="mealbanner-v">'+fmtN(tot.kcal)+' kcal</div></div>'
   +'<div class="mealbanner-m"><span>'+esc(t("P:"))+' '+r1(tot.p)+'g</span>'
   +'<span>'+esc(t("C:"))+' '+r1(tot.c)+'g</span>'
   +'<span>'+esc(t("F:"))+' '+r1(tot.f)+'g</span></div></div>';
  h+='<div class="drows">';
  pl.forEach(function(it,i){
    h+='<div class="drow" data-k="pi:'+i+':'+esc(foodName(it))+'">'
     +'<button class="drm" data-prmitem="'+esc(id)+'|'+i+'" aria-label="'+esc(t("Remove")+" "+foodName(it))+'"><i>'+XSVG+'</i></button>'
     +amountRow("plan|"+id+"|"+i,it)+'</div>';});
  h+='</div>';
  if(!pl.length&&!todo.length)h+='<p class="dempty">'+esc(t("Add what this meal should be. Logging it is then one tap, from here or from the meal on Today."))+'</p>';
  if(todo.length){
    h+='<div class="tsec"><h2 class="tsec-h">'+t("Still to find")+'</h2><span class="dhint">'+todo.length+'</span></div>'
     +'<p class="dempty">'+esc(t("These lines of your plan matched no food. Find each one, or drop it."))+'</p><div class="drows">';
    todo.forEach(function(raw,i){
      h+='<div class="drow ptodo" data-k="pt:'+i+':'+esc(raw)+'">'
       +'<button class="drm" data-pdrop="'+esc(id)+'|'+i+'" aria-label="'+esc(t("Remove")+" "+raw)+'"><i>'+XSVG+'</i></button>'
       +'<div class="dmain"><span class="dtext"><span class="drow-n">'+esc(raw)+'</span></span></div>'
       +'<button class="btn sm g ptodo-b" data-pfind="'+esc(id)+'|'+i+'">'+esc(t("Find"))+'</button></div>';});
    h+='</div>';}
  h+='<button class="dadd" data-padd="'+esc(id)+'"><span aria-hidden="true">+</span>'+t("Add food")+'</button>';
  /* Planning only: the meal is logged from Food, where the day is. */
  h+='<div class="dcta"><button class="ddel" data-rmslot="'+esc(id)+'">'+t("Remove this meal")+'</button></div>';
  return h;}

/* Import: the plan as text, read into meals before anything changes. What it found is
   shown meal by meal — matched foods with their amounts, and what matched nothing —
   and only "Use this plan" replaces the day's meals. */
function vImport(){
  var pp=V.pparse,h;
  /* A plan Bunyan built from the targets: the same review, without the paste box. */
  /* Built from the goals (owner, 3 Nov: "more streamlined, not like a PDF … flexible with
     amendments, easy to find alternatives"): the title, one line, then the plan itself. */
  if(V.pgen)h='<div class="dhead">'+backArrow()+'<h1 class="dhead-t">'+esc(t("Your meal plan"))+'</h1></div>'
   +'<p class="dsub">'+esc(t("Made from your goals. Tap any food to change it or swap it."))+'</p>';
  else h='<div class="dhead">'+backArrow()+'<h1 class="dhead-t">'+esc(t("Copy in a plan"))+'</h1></div>'
   +'<p class="dsub">'+esc(t("Paste it from WhatsApp or Notes, open the PDF it came in, or paste the message another Bunyan user sent you. Everything is read on this phone."))+'</p>';
  if(!V.pgen)h+='<textarea id="pi_text" class="pitext" rows="9" spellcheck="false" placeholder="'
   +esc(t("Meal 1: 3 eggs, 2 slices toast\nMeal 2: 150g chicken, 200g rice\nMeal 3: 200g yogurt, 30g almonds"))+'">'+esc(V.pitext||"")+'</textarea>'
   +'<div class="piacts"><label class="btn g pifile"><input id="pi_file" type="file" accept=".pdf,application/pdf,.txt,.csv,.md,text/plain,text/csv">'
   +esc(t("Open a file"))+'</label>'
   +'<button class="btn" data-pread="1">'+esc(t("Read the plan"))+'</button></div>';
  if(V.pibusy)h+='<p class="pibusy" role="status"><span class="pispin" aria-hidden="true"></span>'+esc(t("Reading the PDF…"))+'</p>';
  if(pp){
    /* What the PDF sets for the day, beside what the app uses now. Applied with the plan
       unless switched off. */
    var tg=V.ptargets,tk=tg?["kcal","p","c","f","water","steps"].filter(function(k){return tg[k]>0;}):[];
    if(tk.length){
      var TL={kcal:["Calories","kcal"],p:["Protein","g"],c:["Carbs","g"],f:["Fat","g"],water:["Water","L"],steps:["Steps",""]};
      var fv=function(k,v){return k==="water"?String(Math.round(v/50)*50/1000)+" L":fmtN(v)+(TL[k][1]?" "+TL[k][1]:"");};
      /* Each figure is a field: what the PDF said, to keep or to change. Water is
         typed in litres and kept in millilitres. */
      h+='<div class="tsec"><h2 class="tsec-h">'+t("Daily targets in the PDF")+'</h2></div><div class="pitg">'
       +tk.map(function(k){var cur=S.goals&&S.goals[k],same=cur===tg[k];
          var v=k==="water"?String(Math.round(tg[k]/50)*50/1000):String(tg[k]);
          return '<label class="pitg-r"><span>'+esc(t(TL[k][0]))+'</span>'
           +'<span class="pitg-v"><input id="pt_'+k+'" type="number" inputmode="decimal" step="'+(k==="water"?"0.05":"1")+'" value="'+v+'">'
           +'<em>'+esc(k==="water"?"L":TL[k][1])+'</em></span>'
           +'<i>'+(same?esc(t("as now")):cur?esc(t("now"))+' '+esc(fv(k,cur)):'')+'</i></label>';}).join("")
       +'<button class="pitg-use" role="switch" aria-checked="'+(V.papplyT!==false)+'" data-papplyt="1">'
       +'<span>'+esc(t("Use these as my daily targets"))+'</span><span class="tgl'+(V.papplyT!==false?' on':'')+'" aria-hidden="true"><i></i></span></button></div>';}
    if(!pp.length)h+='<div class="empty"><p>'+esc(t("No meals or foods were found in that text."))+'</p></div>';
    else h+=planReview(pp);}
  return h;}
/* The plan under review, as cards (a built plan, or one copied in): what the day comes to
   against the goals, with Another version for a built one; each meal a card of its foods,
   one tap on a food for everything that can be done to it (vPlanFood: the amount, a swap
   for something similar, removing it); lines that matched nothing, each with Find; and
   Use this plan, at the end of the plan. */
function planReview(pp){
  var g=S.goals||{},all=[],nTodo=0,fig=function(x){return '<span class="num">'+x+'</span>';};
  pp.forEach(function(m){all=all.concat(m.items);nTodo+=m.todo.length;});
  var tot=sumNutrition(all),d=Math.round(tot.kcal-num(g.kcal)),near=Math.abs(d)<=Math.max(60,num(g.kcal)*0.04);
  var bar=function(cls,cur,goal){var q=goal?Math.min(1,cur/goal):0;return '<span class="plbar '+cls+'"><i style="width:'+Math.round(q*100)+'%"></i></span>';};
  var verdict=near?t("On target."):d<0?t("{n} kcal under your goal.").replace("{n}",fmtN(-d)):t("{n} kcal over your goal.").replace("{n}",fmtN(d));
  var h='<section class="plsum prsum glass"><div class="plsum-h"><span class="klabel">'+esc(t(pp.length===1?"1 meal":"{n} meals").replace("{n}",pp.length)+" · "+t(all.length===1?"1 food":"{n} foods").replace("{n}",all.length))+'</span>'
   +'<span class="plsum-v'+(near?' ok':'')+'">'+esc(verdict)+'</span></div>'
   +'<div class="plsum-r"><span>'+esc(t("Calories"))+'</span>'+bar("k",tot.kcal,g.kcal)+'<b>'+fig(fmtN(tot.kcal)+' / '+fmtN(g.kcal))+'</b></div>'
   +'<div class="plsum-r"><span>'+esc(t("Protein"))+'</span>'+bar("p",tot.p,g.p)+'<b>'+fig(Math.round(tot.p)+' / '+g.p+' g')+'</b></div>'
   +(V.pgen?'<div class="prfoot"><button class="prmore" data-pgenmore="1">'+glyph("swap")+'<span>'+esc(t("Another version"))+'</span></button>'+ownChip(pp,all)+'</div>':'')
   +(nTodo?'<p class="prtodo">'+esc(t(nTodo===1?"1 line matched no food: find it in its meal.":"{n} lines matched no food: find them in their meals.").replace("{n}",nTodo))+'</p>':'')
   +'</section>';
  pp.forEach(function(m,i){
    var mt=sumNutrition(m.items);
    h+='<section class="pmeal glass"><div class="pmeal-h">'
     +'<input id="pm_n_'+i+'" class="pmeal-n" type="text" value="'+esc(importName(m,i))+'" aria-label="'+esc(t("Meal name"))+'" autocomplete="off" spellcheck="false">'
     +'<span class="pmeal-k">'+fig(fmtN(mt.kcal)+' kcal')+' · '+fig(Math.round(mt.p)+' g')+' '+esc(t("protein"))+'</span>'
     +'<button class="pmeal-x" data-pmrm="'+i+'" aria-label="'+esc(t("Remove")+" "+importName(m,i))+'">'+XSVG+'</button></div>'
     +(m.usual?'<span class="pmeal-own">'+esc(t("Your usual: {n} days in the last 4 weeks").replace("{n}",m.usual))+'</span>':'')
     +m.items.map(function(it,j){return '<button class="pmrow" data-pfood="'+i+'|'+j+'">'
       +'<span class="pmrow-t"><b>'+esc(foodName(it))+'</b><span>'+esc(it.label||"")+(it.label?' · ':'')+fig(r1(it.p)+' g')+' '+esc(t("protein"))+'</span>'
       +(it.note?'<small class="plist-note">'+esc(it.note)+'</small>':'')+'</span>'
       +'<span class="pmrow-k">'+fig(fmtN(it.kcal))+'<small>kcal</small></span><span class="ico ico-chev" aria-hidden="true"></span></button>';}).join("")
     +m.todo.map(function(raw,j){return '<div class="pmrow miss"><span class="pmrow-t"><b>'+esc(raw)+'</b><span>'+esc(t("Not matched yet"))+'</span></span>'
       +'<button class="btn sm g" data-pifind="'+i+'|'+j+'">'+esc(t("Find"))+'</button>'
       +'<button class="pmeal-x" data-pidrop="'+i+'|'+j+'" aria-label="'+esc(t("Remove")+" "+raw)+'">'+XSVG+'</button></div>';}).join("")
     +'<button class="pmadd" data-piadd="'+i+'"><span aria-hidden="true">+</span>'+esc(t("Add food"))+'</button></section>';});
  h+='<div class="prcta">'+hb('<button class="btn dbegin" data-puse="1">'+esc(t("Use this plan"))+'</button>')
   +'<p>'+esc(t("Replaces your meal plan. What you have logged stays."))+'</p></div>';
  return h;}
/* How much of a built plan is food they already eat or picked: a badge, not a sentence. */
function ownChip(pp,all){
  var eat=Object.assign({},(V.pgen.habits&&V.pgen.habits.eaten)||{}),own=0;
  (V.pgen.likes||[]).forEach(function(id){eat[id]=1;});
  all.forEach(function(it){if(eat[it.fid])own++;});
  return own?'<span class="prown">'+esc(t("{a} of {b} foods are ones you eat").replace("{a}",own).replace("{b}",all.length))+'</span>':'';}
/* One food of the plan under review, in a sheet: its numbers; change the amount or take
   it out; and foods that could take its place — the same calories, closest in protein,
   carbs and fat, within the diet and the foods left out (engine/mealplan.js
   similarFoods) — one tap each. */
function vPlanFood(){
  var a=V.sd||{},m=V.pparse&&V.pparse[a.i],it=m&&m.items[a.j];
  if(!it)return '<p class="tiny">'+esc(t("This food is no longer in the plan."))+'</p>';
  var fig=function(x){return '<span class="num">'+x+'</span>';};
  var pref=Object.assign({},V.pgen||{diet:(S.prefs||{}).diet,avoid:(S.prefs||{}).avoid,powder:(S.prefs||{}).powder},{mine:S.myFoods||[]});
  var alts=similarFoods(it,pref,6);
  var h='<h2>'+esc(foodName(it))+'</h2>'
   +'<p class="pf-n">'+esc(it.label||"")+' · '+fig(fmtN(it.kcal)+' kcal')+' · '+esc(t("P"))+' '+fig(r1(it.p)+'g')+' · '+esc(t("C"))+' '+fig(r1(it.c)+'g')+' · '+esc(t("F"))+' '+fig(r1(it.f)+'g')+'</p>'
   +'<div class="pf-acts"><button class="btn g" data-editfood="imp|'+a.i+'|'+a.j+'"'+(it.grams?'':' disabled')+'>'+esc(t("Change amount"))+'</button>'
   +'<button class="btn g" data-pfoodrm="1">'+esc(t("Remove"))+'</button></div>'
   +'<div class="tsec"><h3 class="tsec-h">'+esc(t("Swap for something similar"))+'</h3></div>'
   +'<p class="pf-s">'+esc(t("Same calories, closest in protein, carbs and fat."))+'</p>';
  if(!alts.length)return h+'<p class="tiny">'+esc(t("Nothing in the food list is close enough."))+'</p>';
  return h+'<div class="pf-alts">'+alts.map(function(x){var n=x.item,dp=Math.round(n.p-it.p);
    return '<button class="pf-alt" data-pswapto="'+a.i+'|'+a.j+'|'+esc(x.food.id)+'|'+x.grams+'">'
     +'<span class="pmrow-t"><b>'+esc(foodName(n))+'</b><span>'+esc(n.label)+' · '+fig(fmtN(n.kcal)+' kcal')+'</span></span>'
     +'<span class="pf-p">'+fig(r1(n.p)+' g')+'<small>'+esc(t("protein"))+(dp?' '+fig((dp>0?"+":"−")+Math.abs(dp)):'')+'</small></span></button>';}).join("")+'</div>';}
/* What an imported meal will be called in the app: one of the four named meals in
   the language of the app, a numbered meal by its place, otherwise its own heading. */
/* A meal the plan numbered keeps its number: a plan's Meal 3 after its snack is still
   Meal 3, not the fourth meal of the day. */

export {foodSub, glassUnit, MICON, savedById, vFood, vMyFoods, vPlan, vPlanFood, vTargets};
