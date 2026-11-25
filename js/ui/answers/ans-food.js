/* Bunyan — the coach's answers: foods: the rest of today, swaps, what is in one (js/ui/answers/answers.js gathers them;
   road map step 4, 25 Nov: split by topic as they were, no answer's words or figures changed). */
import {t} from "../../i18n/dict.js";
import {act, fill, foods, l, n, p, uiLang} from "./kit.js";
import {fold} from "../../coach/intent.js";
import {swapPick} from "../agent.js";
import {eatenToday} from "../../engine/formulas.js";
import {mealName, mealSlots} from "../../engine/meals.js";
import {editDist} from "../../engine/text.js";
import {FOODDB, foodName, fuzzyFoods, isDrink, nutritionFor, searchFoods, sumNutrition} from "../../engine/nutrition.js";
import {nutrition} from "../../engine/stats.js";
import {S, split} from "../../state.js";
import {fmtN, num, r1, today} from "../../util.js";
import {words} from "../coachwords.js";
import {ANSWER, FOODNO, foodWords, namedFood} from "./route.js";

/* ---- foods: the rest of today, swaps, what is in one ------------------------------ */
/* A food's Arabic alias (foodName, js/engine/nutrition.js, is the name shown). */
function arName(f){var a=(f&&f.a||[]).filter(function(x){return /[\u0600-\u06FF]/.test(x);})[0];return a||"";}
function foodOf(it){
  var db=FOODDB||[];
  return (it.fid&&db.filter(function(f){return f.id===it.fid;})[0])||(it.n&&(searchFoods(it.n,1)[0]||{}).f)||null;}
function itemName(it){var f=foodOf(it);return f&&uiLang()==="ar"&&arName(f)?arName(f):(it.n||it.label||"");}
/* The next meal of the plan not yet logged today, or the one the question names. */
var MEALWORD=[["Breakfast",/breakfast|فطار|فطور/],["Lunch",/lunch|غدا|غداء/],["Dinner",/dinner|supper|tonight|عشا|عشاء/],["Snack",/snack|سناك/]];
function planMeal(q){
  var r=S.days[today()]||{meals:{}},fq=fold(q||""),slots=mealSlots().filter(function(x){return (x.plan||[]).length;});
  for(var i=0;i<MEALWORD.length;i++)if(MEALWORD[i][1].test(fq)){
    var named=slots.filter(function(x){return x.id===MEALWORD[i][0];})[0];if(named)return named;}
  return slots.filter(function(x){return !(((r.meals||{})[x.id]||{}).items||[]).length;})[0]||null;}

function aRest(a){
  var g=S.goals||{},e=eatenToday(today()),r=S.days[today()]||{meals:{}};
  var kl=Math.round(num(g.kcal)-e.kcal),pl=Math.round(num(g.p)-e.p);
  if(kl<=0){p(a,fill(t("You're {n} kcal over today. Nothing to make up: tomorrow is a normal day, and a week matters more than one day."),{n:fmtN(-kl)}));
    return act(a,t("Open Food"),{"data-tab":"food"});}
  p(a,fill(t("Left for today: {k} kcal and {p} g protein."),{k:fmtN(kl),p:Math.max(0,pl)}));
  var open=mealSlots().filter(function(x){return (x.plan||[]).length&&!(((r.meals||{})[x.id]||{}).items||[]).length;});
  if(!open.length){
    p(a,pl>25?t("A meal built around protein closes both gaps: a palm of chicken, fish, meat or eggs, with rice, bread or potatoes, and vegetables.")
      :t("Protein is covered. Fill the rest however suits you, with some vegetables or fruit in it."));
    act(a,t("Open Food"),{"data-tab":"food"});
    if(!mealSlots().some(function(x){return (x.plan||[]).length;}))act(a,t("New meal plan from my targets"),{"data-pgen":"1"});
    return a;}
  var tk=0,tp=0;
  p(a,t("Still on your plan today:"));
  l(a,open.map(function(m){var x=sumNutrition(m.plan);tk+=x.kcal;tp+=x.p;
    return mealName(m.id)+": "+foods(m.plan.slice(0,4).map(itemName))+" · "+fill(t("{n} kcal"),{n:fmtN(x.kcal)})+" · "+fill(t("{n} g protein"),{n:Math.round(x.p)});}));
  var dk=Math.round(kl-tk);
  p(a,Math.abs(dk)<=Math.max(100,kl*0.1)?t("Eat those and the day lands on your targets.")
    :dk>0?fill(t("Those leave about {n} kcal spare: a snack, or a little more at one meal."),{n:fmtN(dk)})
    :fill(t("Those come to about {n} kcal more than what is left: go lighter on rice, bread or oil at one meal."),{n:fmtN(-dk)}));
  if(tp<pl-15)n(a,fill(t("Protein falls about {n} g short: add Greek yogurt, eggs, tuna or chicken."),{n:Math.round(pl-tp)}));
  act(a,open.length>1?t("Log today's plan"):fill(t("Log {m}"),{m:mealName(open[0].id)}),{"data-logday":"1"});
  return act(a,t("Other foods with the same macros"),{"data-chatq":"swap","data-chatl":uiLang()});}

/* What a food is mostly: protein, carbs or fat by where its calories come from, or a
   mix. A swap keeps that, so rice is swapped for bread or potatoes, not for chicken. */
function role(f){
  var pk=4*num(f.p),ck=4*num(f.c),fk=9*num(f.f),tot=pk+ck+fk||1;
  return pk/tot>=0.38?"p":ck/tot>=0.6?"c":fk/tot>=0.6?"f":"m";}
var NOSWAP=/^(Beverages|Supplements|Condiments|Sweets)$/,INGREDIENT=/raw|powder|dry|dried|flour|starch|uncooked/i;
/* Foods that stand in for this one: the same kind, a portion with the same calories,
   protein, carbs and fat as close as can be, three of them, no two alike. */
/* The words that name a food, without how it is cooked or cut: a swap shares none, so
   rice is not swapped for basmati rice, nor chicken breast for chicken breast cooked. */
var HOW=/^(cooked|raw|boiled|grilled|fried|baked|roasted|steamed|plain|white|brown|whole|fresh|canned|dried|lean|low|fat|full|skimmed|skim|medium|large|small|with|and|without|egyptian|homemade)$/;
function keyWords(n){return fold(n).replace(/[^a-z ]/g," ").split(" ").filter(function(w){return w.length>=4&&!HOW.test(w);});}
function swapsFor(f,kcal){
  var mine=keyWords(f.n),r=role(f),pool=(FOODDB||[]).filter(function(x){
    return x.id!==f.id&&num(x.kcal)>0&&!NOSWAP.test(x.cat||"")&&!isDrink(x)&&!INGREDIENT.test(x.n)&&role(x)===r
      &&!keyWords(x.n).some(function(w){return mine.indexOf(w)>=0;});});
  var tgt=nutritionFor(f,kcal/num(f.kcal)*(f.per||100));
  var ranked=pool.map(function(x){
    var g=Math.round(kcal/num(x.kcal)*(x.per||100)/5)*5,nn=nutritionFor(x,g);
    var d=(Math.abs(nn.p-tgt.p)*4+Math.abs(nn.c-tgt.c)*4+Math.abs(nn.f-tgt.f)*9)/Math.max(kcal,1);
    /* Like for like first: a food from the same aisle (rice for rice, not cornflakes;
       a vegetable for a salad, not pasta) beats a closer macro match from another. */
    if(f.cat&&x.cat!==f.cat)d+=0.18;
    return {f:x,g:g,n:nn,d:d};})
    .filter(function(x){return x.g>=20&&x.g<=600&&x.d<=0.45;})
    .sort(function(x,y){return x.d-y.d;});
  /* Three different foods: none shares a naming word with one already picked. */
  var out=[],used=[];
  for(var i=0;i<ranked.length&&out.length<3;i++){
    var kw=keyWords(ranked[i].f.n);if(!kw.length)kw=[fold(ranked[i].f.n)];
    /* "Cornflakes" and "Corn Flakes" are one food: the name without its spaces counts too. */
    kw=kw.concat([fold(ranked[i].f.n).replace(/[^a-z]/g,"")]);
    if(kw.some(function(w){return used.indexOf(w)>=0;}))continue;
    used=used.concat(kw);out.push(ranked[i]);}
  return out;}
/* A food turned down ("I don't feel like eating egg"): nothing of that food among its
   stand-ins (no egg whites for eggs). */
function notSame(sw,f){var w=fold(f.n||"").split(" ")[0].replace(/s$/,"");return w.length<3?sw:sw.filter(function(x){return fold(x.f.n||"").indexOf(w)<0;});}
function swapLine(it,f,kcal,declined){
  var sw=swapsFor(f,kcal);if(declined)sw=notSame(sw,f);
  if(!sw.length)return null;
  return (it?itemName(it):foodName(f))+(it&&it.grams?" "+fill(t("{n} g"),{n:Math.round(it.grams)}):"")+" → "
    +sw.map(function(x){return foodName(x.f)+" "+fill(t("{n} g"),{n:x.g});}).join(" · ");}

/* One item of a planned meal the question names, spelt as people type it ("the talibia
   grill in my lunch"): the meal it says, or every planned meal, item by item, a word
   of the item's name within a letter or two of a word of the question. */
function planItemNamed(q){
  /* Three letters count where they start a planned food's name ("egg", "بيض"). */
  var fq=fold(q),qw=foodWords(q).split(" ").filter(function(w){return w.length>=3;});
  if(!qw.length)return null;
  var slots=mealSlots().filter(function(x){return (x.plan||[]).length;}),named=null;
  for(var i=0;i<MEALWORD.length;i++)if(MEALWORD[i][1].test(fq)){named=MEALWORD[i][0];break;}
  if(named)slots=slots.filter(function(x){return x.id===named;}).concat(slots.filter(function(x){return x.id!==named;}));
  var best=null;
  slots.forEach(function(m){(m.plan||[]).forEach(function(it,i){
    var nw=fold(itemName(it)+" "+(it.n||"")).replace(/[^a-z\u0600-\u06ff ]/g," ").split(" ").filter(function(w){return w.length>=3;});
    var hits=qw.filter(function(w){return nw.some(function(x){return x===w||(w.length>=5&&editDist(w,x)<=2)||x.indexOf(w)===0||(x.length>=4&&w.indexOf(x)===0);});}).length;
    if(hits&&(!best||hits>best.hits||(hits===best.hits&&m.id===named&&best.m.id!==named)))best={m:m,i:i,it:it,hits:hits};});});
  return best;}
function aSwap(a,q){
  /* One item of a planned meal: three foods that fit its place, each a tap away from
     going into the plan instead (js/ui/agent.js swapPick, with a confirmation). */
  var pi=null,no=FOODNO.test(fold(q||""));try{pi=planItemNamed(q);}catch(e){pi=null;}
  if(pi){var pf=foodOf(pi.it),sw=pf?swapsFor(pf,num(pi.it.kcal)):[];if(no&&pf)sw=notSame(sw,pf);
    if(sw.length){a.ag=swapPick(pi.m.id,pi.i,pi.it,itemName(pi.it),sw.map(function(x){
      return {v:x.f.id+"|"+x.g,l:foodName(x.f)+" "+fill(t("{n} g"),{n:x.g}),
        sub:fill(t("{k} kcal · {p} g protein · {c} g carbs · {f} g fat"),{k:fmtN(x.n.kcal),p:Math.round(x.n.p),c:Math.round(x.n.c),f:Math.round(x.n.f)})};}));
      return a;}}
  /* Named by its name, not a near miss: "dinner" is the meal, not ginger, and "lunch"
     is the meal, not luncheon meat (the meal's words are taken out first). */
  var qf=fold(q);MEALWORD.forEach(function(m){qf=qf.replace(new RegExp(m[1].source,"g")," ");});
  var nf=namedFood(qf,true);
  /* A food named: what stands in for it, a usual portion's worth. */
  if(nf){
    var meal=planMeal(""),inPlan=meal&&meal.plan.filter(function(it){var f=foodOf(it);return f&&f.id===nf.id;})[0];
    var kc=inPlan?num(inPlan.kcal):nutritionFor(nf,(nf.s&&nf.s[0]&&nf.s[0][1])||100).kcal;
    var ln=swapLine(inPlan||null,nf,kc,no);
    if(!ln){p(a,fill(t("I couldn't find a close match for {f} in the food database."),{f:foodName(nf)}));return act(a,t("Open Food"),{"data-tab":"food"});}
    p(a,fill(t("Instead of {f}, the same calories with protein, carbs and fat close to it:"),{f:foodName(nf)}));
    l(a,[ln]);
    return act(a,t("Open Food"),{"data-tab":"food"});}
  var m=planMeal(q);
  if(!m){
    /* No plan to swap within: what closes today's protein gap. */
    var g=S.goals||{},pl=Math.round(num(g.p)-eatenToday(today()).p);
    p(a,t("There's no planned meal left today to swap. These each give about 25 g of protein:"));
    var picks=(FOODDB||[]).filter(function(f){return role(f)==="p"&&!NOSWAP.test(f.cat||"")&&!isDrink(f)&&!INGREDIENT.test(f.n)&&num(f.p)>=8;})
      .sort(function(x,y){return num(y.p)/num(y.kcal)-num(x.p)/num(x.kcal);});
    var out=[],seen={};
    picks.forEach(function(f){var k=fold(f.n).split(" ")[0];if(out.length>=5||seen[k])return;seen[k]=1;
      var gr=Math.round(25/num(f.p)*(f.per||100)/5)*5;if(gr>400)return;
      out.push(foodName(f)+" "+fill(t("{n} g"),{n:gr})+" · "+fill(t("{n} kcal"),{n:fmtN(nutritionFor(f,gr).kcal)}));});
    l(a,out);
    if(pl>0)n(a,fill(t("You have {p} g of protein left today."),{p:pl}));
    return act(a,t("Open Food"),{"data-tab":"food"});}
  var lines=m.plan.map(function(it){var f=foodOf(it);return f&&num(it.kcal)>0?swapLine(it,f,num(it.kcal)):null;}).filter(Boolean);
  if(!lines.length){p(a,fill(t("I couldn't match the foods in {m} to the food database, so I can't suggest swaps for it."),{m:mealName(m.id)}));
    return act(a,t("Open Food"),{"data-tab":"food"});}
  p(a,fill(t("Swaps for {m}: each is the same calories, with protein, carbs and fat close to what it replaces."),{m:mealName(m.id)}));
  l(a,lines);
  n(a,t("Swap one item or all of them; the meal still adds up to about the same.")+" "+t("Say which, like “swap the rice in my lunch”, and I'll put it in your plan."));
  return act(a,t("Open Food"),{"data-tab":"food"});}

function aFoodInfo(a,q,it){
  var f=namedFood(q,true);
  /* Misspelt: the closest foods the database has, to pick from; never one chosen
     quietly for the person. */
  var fw=foodWords(q),near=!f&&fw.length>=3?fuzzyFoods(fw,4).filter(function(x){return x.dist<=2;}):[];
  if(near.length){a.ag={s:"pick",what:"food",lead:fill(t("No food called “{q}”. Closest:"),{q:fw}),act:"food.info",slot:"fid",none:true,
      opts:near.map(function(x){return {v:x.f.id,l:foodName(x.f),sub:""};})};return a;}
  /* "How much protein in a day do I need" names no food: answer what it asks. */
  if(!f){var nx=(it&&it.ranked||[]).filter(function(x){return x!=="foodinfo";})[0];
    if(nx&&ANSWER[nx])return ANSWER[nx](a,q,it);
    p(a,t("I couldn't find that food in the food database. Try its common name, in English or Arabic."));
    return act(a,t("Open Food"),{"data-tab":"food"});}
  var sv=(f.s||[]).filter(function(x){return x[1]>0;})[0]||["100 g",100],ns=nutritionFor(f,sv[1]),nh=nutritionFor(f,f.per||100);
  var gl=fill(t("{n} g"),{n:sv[1]}),lbl=/^\d+\s*g$/.test(sv[0])||uiLang()==="ar"?gl:sv[0]+" ("+gl+")";
  p(a,fill(t("{f}, per {s}: {k} kcal, {p} g protein, {c} g carbs, {x} g fat."),{f:foodName(f),s:lbl,k:fmtN(ns.kcal),p:r1(ns.p),c:r1(ns.c),x:r1(ns.f)}));
  if(sv[1]!==(f.per||100))n(a,fill(t("Per 100 g: {k} kcal, {p} g protein."),{k:fmtN(nh.kcal),p:r1(nh.p)}));
  /* What it would do to today. */
  var g=S.goals||{},pl=num(g.p)-eatenToday(today()).p;
  if(pl>5&&ns.p>=3)p(a,fill(t("One portion covers about {n}% of the protein you have left today."),{n:Math.min(100,Math.round(ns.p/pl*100))}));
  return act(a,t("Open Food"),{"data-tab":"food"});}

export {HOW, INGREDIENT, MEALWORD, NOSWAP, aFoodInfo, aRest, aSwap, arName, foodOf, itemName, keyWords, notSame, planItemNamed, planMeal, role, swapLine, swapsFor};
