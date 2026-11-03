/* Bunyan — today's meal, built where it was asked for
   Owner, 3 Nov: "Build today's meal" sent you to the chat, which only described what was
   left; "either cancel this option, or make it really build it". It builds it: one meal
   of real foods from the database, in servings, solved for what is left of today
   (js/engine/mealplan.js buildOneMeal), for the meal that comes next. The sheet shows the
   foods and amounts, what they come to, and what that leaves; Add puts them in that
   meal (with Undo), Another tries a different plate. Nothing is invented: every figure is
   the database's for the amount shown.

   mealPrefs(): the meal plan's preferences as saved (diet, foods left out, style, likes),
   shared with the day's plan (handlers/coach.js).
   todayMeal(variant) → null | {slot, kind, left{kcal,p,c,f}, items[], tot{kcal,p,c,f}, after}
   vTodayMeal() → the sheet's body. */
import {t} from "../i18n/dict.js";
import {eatenToday} from "../engine/formulas.js";
import {buildOneMeal} from "../engine/mealplan.js";
import {mealName} from "../engine/meals.js";
import {FOODDB, foodName, ownFood} from "../engine/nutrition.js";
import {S} from "../state.js";
import {esc, fmtN, num, today} from "../util.js";
import {mealNow, V} from "./view.js";
import {hb} from "./haptic.js";

function mealPrefs(){
  var pr=S.prefs||{};
  return {meals:num(pr.meals)||4,diet:pr.diet||"any",avoid:(pr.avoid||[]).slice(),powder:!!pr.powder,style:pr.fstyle||"egy",likes:(pr.likes||[]).slice(),variant:0};}

/* The plate kind for a meal: breakfast's own, a snack when it is the snack or little is left. */
function kindFor(slot,kcal){
  if(/breakfast/i.test(slot)||slot==="m1")return "Breakfast";
  if(/snack/i.test(slot)||kcal<450)return "Snack";
  return "Main";}

function todayMeal(variant){
  if(!FOODDB)return null;
  var g=S.goals||{},e=eatenToday(today()),slot=mealNow(today());
  var left={kcal:Math.round(num(g.kcal)-e.kcal),p:Math.max(0,num(g.p)-e.p),c:Math.max(0,num(g.c)-e.c),f:Math.max(0,num(g.f)-e.f)};
  var out={slot:slot,left:left,items:[],tot:{kcal:0,p:0,c:0,f:0},after:left.kcal};
  if(left.kcal<80)return out;
  var m=buildOneMeal(left,kindFor(slot,left.kcal),Object.assign(mealPrefs(),ownFood(),{variant:variant||0}));
  if(!m)return out;
  out.kind=m.kind;out.items=m.items;
  m.items.forEach(function(x){out.tot.kcal+=num(x.kcal);out.tot.p+=num(x.p);out.tot.c+=num(x.c);out.tot.f+=num(x.f);});
  out.after=Math.round(left.kcal-out.tot.kcal);
  return out;}

function vTodayMeal(){
  var sd=V.sd||{},m=todayMeal(sd.v||0),fig=function(x){return '<span class="num">'+x+'</span>';};
  var h='<h2>'+esc(t("Today's meal"))+'</h2>';
  if(!m){return h+'<p class="tiny">'+esc(t("The food list did not load. Check the connection once and try again."))+'</p>';}
  if(m.left.kcal<80)
    return h+'<p class="tm-done">'+esc(t("Today's calories are in. Nothing more to build: tomorrow starts fresh."))+'</p>';
  h+='<p class="tiny tm-for">'+esc(t("For {m}, from what is left today: {k} kcal and {p} g protein."))
    .replace("{m}",esc(mealName(m.slot))).replace("{k}",fig(fmtN(m.left.kcal))).replace("{p}",fig(Math.round(m.left.p)))+'</p>';
  if(!m.items.length)return h+'<p class="tm-done">'+esc(t("Nothing in the food list fits what is left with your food choices. Try Another, or add a food yourself."))+'</p>'
    +'<button class="btn g" data-tmanother="1">'+esc(t("Another"))+'</button>';
  h+='<ul class="tm-list" data-k="tm'+(sd.v||0)+'">'+m.items.map(function(x){
    return '<li><span class="tm-n">'+esc(foodName(x))+'<small>'+esc(x.label)+'</small></span>'
      +'<span class="tm-v"><span>'+fig(fmtN(Math.round(x.kcal)))+' '+esc(t("kcal"))+'</span><small>'+fig(Math.round(x.p))+' g '+esc(t("protein"))+'</small></span></li>';}).join("")+'</ul>';
  h+='<div class="tm-tot"><span>'+esc(t("Together"))+'</span><b>'+fig(fmtN(Math.round(m.tot.kcal)))+' '+esc(t("kcal"))+' · '+fig(Math.round(m.tot.p))+' g '+esc(t("protein"))
    +' · '+fig(Math.round(m.tot.c))+' g '+esc(t("carbs"))+' · '+fig(Math.round(m.tot.f))+' g '+esc(t("fat"))+'</b></div>';
  if(m.after>150)h+='<p class="tiny tm-after">'+esc(t("That leaves about {n} kcal for later today.")).replace("{n}",fig(fmtN(m.after)))+'</p>';
  return h+'<div class="tm-act">'+hb('<button class="btn" data-tmadd="1">'+esc(t("Add to {m}").replace("{m}",mealName(m.slot)))+'</button>')
    +'<button class="btn g" data-tmanother="1">'+esc(t("Another"))+'</button></div>';}

export {mealPrefs, todayMeal, vTodayMeal};
