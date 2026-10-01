/* Bunyan — the day's meals
   Which meals a day is made of, what they are called, and what is planned for each.

   They were fixed: Breakfast, Lunch, Dinner and Snack, with the clock choosing which
   one an add went to and a "Now" label on it. A day is the user's own now. It starts as
   those four; it can be numbered instead (Meal 1, Meal 2 …, which suits a coach's plan
   and a day that starts late), and any meal can be renamed, added, removed or moved.

   S.mealSlots is the list, [{id, name?, plan?, todo?}], absent until the user changes
   something. A day's log is still keyed by the meal's id, so the four named meals keep
   the keys they always had and nothing already logged moves:
     · one of the four ids with no name of its own reads as that meal, translated;
     · any other id with no name reads as its place in the day, "Meal 3";
     · a name, once given, is the name.
   plan holds the foods planned for that meal, in the log's own item shape, so logging
   the plan is a copy. todo holds the lines of an imported plan that matched no food,
   kept so they can be found one by one rather than lost. */
import {t} from "../i18n/dict.js";
import {S} from "../state.js";
import {uid} from "../util.js";

var NAMED=["Breakfast","Lunch","Dinner","Snack"];

function mealSlots(){
  var s=S.mealSlots;
  return s&&s.length?s:NAMED.map(function(id){return {id:id};});}
/* The list made real, for an edit to land in. */
function ownSlots(){
  if(!S.mealSlots||!S.mealSlots.length)S.mealSlots=NAMED.map(function(id){return {id:id};});
  return S.mealSlots;}
function slotOf(id){return mealSlots().filter(function(x){return x.id===id;})[0]||null;}
/* The same meal, from the list made real: what an edit holds on to. */
function ownSlot(id){return ownSlots().filter(function(x){return x.id===id;})[0]||null;}
function isNamedId(id){return NAMED.indexOf(id)>=0;}
function numberedName(n){return t("Meal {n}").replace("{n}",n);}
function mealName(id){
  var sl=mealSlots(),i=-1;
  for(var k=0;k<sl.length;k++)if(sl[k].id===id){i=k;break;}
  if(i>=0&&sl[i].name)return sl[i].name;
  if(isNamedId(id))return t(id==="Snack"?"Snacks":id);
  if(i>=0)return numberedName(i+1);
  /* A meal that was logged under a list since changed: its id is all there is. */
  return /^m_/.test(id)?t("Meal"):id;}
/* Whether the day is numbered: every meal is unnamed and none is one of the four. */
function mealStyle(){
  var sl=mealSlots();
  return sl.every(function(s){return !s.name&&!isNamedId(s.id);})?"numbered"
    :sl.every(function(s){return isNamedId(s.id);})?"named":"own";}

function itemsOf(r,id){return (r&&r.meals&&r.meals[id]&&r.meals[id].items)||[];}
/* The meals a date shows: the day's list, then anything logged that day under a meal
   no longer in it — logged food is never hidden by a change to the list. */
function dayMeals(d){
  var ids=mealSlots().map(function(s){return s.id;}),r=S.days[d];
  if(r&&r.meals)Object.keys(r.meals).forEach(function(k){
    if(ids.indexOf(k)<0&&itemsOf(r,k).length)ids.push(k);});
  return ids;}
/* Where an add goes when nothing on screen says which: the meal after the last one
   with anything in it. Not the clock — a late start makes the first meal of the day a
   lunchtime one. A day with nothing yet starts at the first meal; once the last meal
   has food in it, that is where more goes. */
function nextMeal(d){
  var ids=mealSlots().map(function(s){return s.id;}),r=S.days[d],last=-1;
  ids.forEach(function(id,i){if(itemsOf(r,id).length)last=i;});
  return ids[Math.min(last+1,ids.length-1)];}

function planOf(id){var s=slotOf(id);return (s&&s.plan)||[];}
function hasPlan(){return mealSlots().some(function(s){return (s.plan||[]).length;});}

/* Switching between the four named meals and a numbered day. Plans follow their meal by
   place, so the third meal's plan is still the third meal's; the count is kept. */
function setStyle(style){
  var old=mealSlots(),n=Math.max(old.length,style==="named"?4:3);
  var ids=style==="named"?NAMED.slice():null;
  var out=[];
  for(var i=0;i<(style==="named"?4:n);i++){
    var was=old[i]||{};
    out.push({id:ids?ids[i]:(isNamedId(was.id)||!was.id?"m_"+uid():was.id),
      plan:was.plan,todo:was.todo});}
  /* Named meals beyond the four keep going as numbered ones, plan and all. */
  if(style==="named")for(var j=4;j<old.length;j++)
    out.push({id:isNamedId(old[j].id)?"m_"+uid():old[j].id,name:old[j].name,plan:old[j].plan,todo:old[j].todo});
  out.forEach(function(s){if(!s.plan)delete s.plan;if(!s.todo)delete s.todo;if(!s.name)delete s.name;});
  S.mealSlots=out;}
function newSlot(name){
  var s={id:"m_"+uid()};name=String(name||"").trim();if(name)s.name=name;
  ownSlots().push(s);return s;}

export {dayMeals, hasPlan, isNamedId, mealName, mealSlots, mealStyle, NAMED, newSlot, nextMeal, numberedName, ownSlot, ownSlots, planOf, setStyle, slotOf};
