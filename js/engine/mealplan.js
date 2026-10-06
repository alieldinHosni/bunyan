/* Bunyan — a day of meals, built from the targets
   Turns the day's calories, protein, carbs and fat into meals made of foods in the
   database, the way a coach writes a plan: a protein, a carb, vegetables, a little
   fat, in amounts you can actually serve — two eggs, half a loaf, a cup of rice.

   How:
   1. The day is split into meals (three to six). Each takes a share of the energy
      and a fairer share of the protein, so no meal is a protein desert.
   2. Each meal is one of a set of plates written for that meal: ful and eggs,
      oats and yoghurt, chicken and rice, fish and rice, lentils, molokhia… Egyptian
      home food first, the rest after. A plate whose foods are all ruled out by the
      diet or by what is left out is skipped.
   3. Each plate's amounts are solved for the meal's macros: the protein food for
      the protein still missing, the carb for the carbs, the fat for the fat, a few
      rounds until they settle, every amount rounded to a serving and kept within
      sensible bounds (no 600 g of chicken in one sitting).
   Vegetables are fixed: they are there to be eaten, not to hit a number.

   The result goes to the same review as an imported plan, where every food and
   amount can be changed before anything is saved. The same answers always give the
   same day; "variant" shuffles the plates for another one. */
import {FOODDB, nutritionFor} from "./nutrition.js";

/* ---- what a food is, for leaving things out ----------------------------------- */
var MEAT=/chicken|beef|veal|lamb|kofta|turkey|duck|quail|rabbit|pigeon|liver|kebda|basterma|sausage|luncheon|ham_|bacon|mince|shawarma|kebab|kabab|camel|sujuk|kibbeh|hawawshi|kaware3|kamouneya|mombar|meat|tarb|giblet|fatta|shish|arayes|mandi|kabsa|machboos|mansaf/;
var FISH=/fish|tilapia|tuna|salmon|shrimp|prawn|sardine|mackerel|seabass|cod|crab|mullet|fesikh|renga|sayadeya/;
var EGG=/egg|omelette|eggah/;
var DAIRYID=/gebna|cheese|labneh|yog|milk|laban|kishk|mesh|eshta|cream|halloumi|areesh|whey|casein|kefir|skyr|cottage|ricotta|mozzarella|feta|rumi|muhallab|mahalab|zabady|bechamel/;
var NUT=/almond|peanut|walnut|cashew|pistachio|hazelnut/;
var GLUTEN=/bread|baladi|toast|pasta|macarona|oats|baguette|croissant|bagel|bun|tortilla|cracker|couscous|bulgur|freekeh|pita|fino|shami|aish|feteer|fteer|rusk|semolina|flour|barley|vermicelli|noodle|pizza|bran|kishk|koshari|fatta|sandwich|pane|granola|muesli/;
function isA(f,re){return re.test(f.id);}
/* Whether a food fits the person's diet and what they leave out. */
function allowed(f,pref){
  var diet=pref.diet||"any",no=pref.avoid||[];
  if(!f)return false;
  if((diet==="veg"||diet==="vegan"||diet==="pesc")&&isA(f,MEAT))return false;
  if((diet==="veg"||diet==="vegan")&&isA(f,FISH))return false;
  if(diet==="vegan"&&(isA(f,EGG)||isA(f,DAIRYID)||f.cat==="Dairy"||f.id==="honey"))return false;
  if(no.indexOf("dairy")>=0&&(isA(f,DAIRYID)||f.cat==="Dairy"))return false;
  if(no.indexOf("eggs")>=0&&isA(f,EGG))return false;
  if(no.indexOf("fish")>=0&&isA(f,FISH))return false;
  if(no.indexOf("nuts")>=0&&isA(f,NUT))return false;
  if(no.indexOf("gluten")>=0&&isA(f,GLUTEN))return false;
  if(pref.powder===false&&f.cat==="Supplements")return false;
  return true;}

/* ---- the plates ------------------------------------------------------------------
   r: P protein, C carb, F fat (solved); V and X are fixed amounts (vegetables, a
   piece of fruit). ids are tried in order, after a rotation, so the same plate is
   not the same food every time. min/max/step in grams. egy marks Egyptian home food,
   put first unless the person prefers otherwise. */
function S(r,ids,min,max,step){return {r:r,ids:ids,min:min,max:max,step:step};}
function FX(r,ids,g){return {r:r,ids:ids,g:g};}
var BREAD=["baladi_bran","baladi","aish_shamsi","bread_wholegrain","potato","sweet_potato_baked"];
var RICE=["rice_egyptian","rice_basmati","brown_rice","rice_with_vermicelli"];
var SALAD=["salata_baladi","salad","cucumber","tomato"];
var OIL=["olive_oil"];
var PLATES={
  Breakfast:[
    {k:"ful_eggs",egy:1,s:[S("P",["egg_boiled","egg_white_ck"],50,200,50),S("C",["ful","ful_tomato"],100,300,50),S("C",BREAD,45,135,45),FX("V",SALAD,100)]},
    {k:"eggs_cheese",egy:1,s:[S("P",["egg_boiled","omelette","egg_scrambled"],50,200,50),S("P",["gebna_areesh","cottage_low","skyr","lupini"],0,200,25),S("C",BREAD,45,180,45),FX("V",["tomato","cucumber"],100)]},
    {k:"oats_yogurt",s:[S("C",["oats","rice_cake","banana"],30,120,10),S("P",["greek_yog_0","skyr","greek_yog","soy_milk"],150,400,50),FX("X",["banana","blueberries","strawberry","apple"],100),S("F",["almonds","peanut_butter","walnuts","chia"],0,30,5)]},
    {k:"tofu_toast",s:[S("P",["tofu_firm","tempeh"],100,250,25),S("C",["bread_wholegrain","baladi_bran","oats","sweet_potato_baked","potato"],38,152,38),FX("V",["tomato","spinach_ck"],100),S("F",["avocado","olive_oil"],0,60,5)]}
  ],
  Main:[
    {k:"chicken_rice",egy:1,s:[S("P",["chicken_breast_ck","charcoal_chicken","turkey_breast"],100,300,25),S("C",RICE,100,400,25),FX("V",["salata_baladi","mixed_veg","green_beans","broccoli_ck"],150),S("F",OIL,0,20,5)]},
    {k:"fish_rice",egy:1,s:[S("P",["tilapia_ck","fish_grilled_generic","seabass","salmon_ck","shrimp_ck"],120,300,30),S("C",RICE,100,400,25),FX("V",["salata_baladi","salad"],150),S("F",["tahina","olive_oil"],0,30,5)]},
    {k:"molokhia",egy:1,s:[S("P",["chicken_breast_ck","beef_lean_ck","rabbit"],100,250,25),FX("V",["molokhia_plain"],250),S("C",["rice_egyptian","baladi"],100,350,25),S("F",OIL,0,15,5)]},
    {k:"beef_potato",s:[S("P",["beef_lean_ck","veal","beef_steak","mince_cooked"],100,250,25),S("C",["potato_baked","sweet_potato_baked","potato"],150,450,50),FX("V",["salad","salata_baladi","green_beans"],150),S("F",OIL,0,20,5)]},
    {k:"pasta",s:[S("P",["chicken_breast_ck","tuna_water","mince_cooked","turkey_breast"],100,250,25),S("C",["pasta_ck","pasta_wholemeal","quinoa_ck"],100,400,25),FX("V",["tomato_sauce"],100),S("F",["olive_oil","parmesan"],0,20,5)]},
    {k:"lentils",egy:1,s:[S("P",["lentils","lentils_yellow","chickpea"],150,400,50),S("P",["salata_zabady","greek_yog_0","egg_boiled","tofu_firm"],0,200,50),S("C",["rice_egyptian","baladi_bran","bulgur"],0,250,25),FX("V",SALAD,150),S("F",OIL,0,15,5)]},
    {k:"eggs_light",egy:1,s:[S("P",["eggah","omelette","egg_boiled"],100,240,40),S("P",["gebna_areesh","cottage_low","lupini"],0,200,25),S("C",BREAD,45,180,45),FX("V",["salata_baladi","cucumber"],150)]},
    {k:"tofu_bowl",s:[S("P",["tofu_firm","tempeh","edamame"],100,300,25),S("C",["rice_basmati","quinoa_ck","brown_rice"],100,350,25),FX("V",["broccoli_ck","mixed_veg"],150),S("F",["olive_oil","sesame"],0,20,5)]}
  ],
  Snack:[
    {k:"yogurt_fruit",s:[S("P",["greek_yog_0","skyr","cottage_low","greek_yog"],150,350,50),S("C",["banana","guava","apple","orange","mango","blueberries"],0,250,50)]},
    {k:"lupini",egy:1,s:[S("P",["lupini"],100,250,25),S("C",["orange","apple","guava"],0,250,50)]},
    {k:"shake",s:[S("P",["whey","whey_isolate"],20,50,5),S("C",["banana","oats","dates"],0,150,10),S("P",["milk_skim","soy_milk"],0,300,50)]},
    {k:"nuts_fruit",s:[S("F",["almonds","peanuts","walnuts","pistachios","pumpkin_seeds"],10,40,5),S("C",["banana","apple","dates"],0,200,50),S("P",["skyr","greek_yog_0","edamame"],0,200,50)]}
  ]
};

/* When nothing above fits (a vegan who also avoids gluten, say), a plain plate
   from whatever is left: a protein, a carb, vegetables. */
var ANYP=["chicken_breast_ck","tilapia_ck","egg_boiled","greek_yog_0","tofu_firm","tempeh","lentils","chickpea","edamame","lupini","beef_lean_ck"];
var ANYC=["rice_egyptian","rice_basmati","potato_baked","sweet_potato_baked","quinoa_ck","banana","apple","oats","baladi_bran"];
var FALLBACK={k:"plain",s:[S("P",ANYP,80,300,20),S("C",ANYC,0,350,25),FX("V",["salad","cucumber","tomato","mixed_veg"],150),S("F",["olive_oil","avocado"],0,20,5)]};

/* How a day of n meals is shared out, and which kind each meal is. */
var SHAPE={
  2:[["Breakfast",0.45],["Main",0.55]],
  3:[["Breakfast",0.30],["Main",0.40],["Main",0.30]],
  4:[["Breakfast",0.25],["Main",0.35],["Snack",0.15],["Main",0.25]],
  5:[["Breakfast",0.22],["Snack",0.10],["Main",0.30],["Snack",0.13],["Main",0.25]],
  6:[["Breakfast",0.20],["Snack",0.10],["Main",0.25],["Snack",0.10],["Main",0.25],["Snack",0.10]]
};
/* Names for the four named meals; a fifth and sixth are numbered. */
var NAMES={2:["Breakfast","Dinner"],3:["Breakfast","Lunch","Dinner"],4:["Breakfast","Lunch","Snack","Dinner"]};

var BYID=null;
function food(id){
  if(!BYID){BYID={};(FOODDB||[]).forEach(function(f){BYID[f.id]=f;});}
  return BYID[id]||null;}

function roundTo(g,step){return Math.round(g/step)*step;}
/* The food a slot uses: the first one that fits, after a rotation by seed. */
function pick(slot,pref,seed){
  var ok=slot.ids.map(food).filter(function(f){return f&&allowed(f,pref);});
  return ok.length?ok[seed%ok.length]:null;}

/* Solve one plate for one meal's macros. Returns items, or null if a slot the
   plate cannot do without has nothing that fits. */
function solve(plate,target,pref,seed){
  var it=[];
  for(var i=0;i<plate.s.length;i++){
    var sl=plate.s[i],f=pick(sl,pref,seed);
    if(!f){if(sl.g!=null||sl.min>0)return null;continue;}
    it.push({sl:sl,f:f,g:sl.g!=null?sl.g:sl.min});}
  var KEY={P:"p",C:"c",F:"f"};
  for(var round=0;round<6;round++){
    ["P","C","F"].forEach(function(r){
      var adj=it.filter(function(x){return x.sl.r===r&&x.sl.g==null;});
      if(!adj.length)return;
      var k=KEY[r],others=0;
      it.forEach(function(x){if(adj.indexOf(x)<0)others+=x.f[k]*x.g/100;});
      var need=Math.max(0,target[k]-others);
      /* Shared out by how much of it each food carries, the first food first. */
      adj.forEach(function(x,j){
        var share=adj.length===1?1:j===0?0.65:0.35/(adj.length-1);
        var dens=x.f[k]/100;
        var g=dens>0.01?need*share/dens:x.sl.min;
        x.g=Math.max(x.sl.min,Math.min(x.sl.max,roundTo(g,x.sl.step)));});});}
  return it.filter(function(x){return x.g>0;});}

/* "2 × egg" where the amount is a whole number of a counted serving, else grams. */
function labelOf(f,g){
  var c=(f.s||[]).filter(function(u){return u[1]>0&&!/^\d/.test(u[0]);});
  for(var i=0;i<c.length;i++){var k=g/c[i][1];
    if(Math.abs(k-Math.round(k))<0.04&&Math.round(k)>=1)return Math.round(k)+" × "+c[i][0];
    /* A loaf and a half reads better than three half loaves. */
    if(i===0&&k>1&&Math.abs(k*2-Math.round(k*2))<0.04)return Math.floor(k)+"½ × "+c[i][0];}
  return g+" g";}
function itemOf(x){
  var n=nutritionFor(x.f,x.g);
  return {fid:x.f.id,n:x.f.n,label:labelOf(x.f,x.g),grams:x.g,src:"plan",
          kcal:n.kcal,p:n.p,c:n.c,f:n.f,fib:n.fib};}

/* targets: {kcal,p,c,f}. pref: {meals, diet, avoid[], powder, style, variant}.
   Returns meals in the shape the plan review reads: {named|n, items, todo}. */
function buildMealPlan(targets,pref){
  pref=pref||{};
  var n=Math.max(2,Math.min(6,+pref.meals||4)),shape=SHAPE[n],names=NAMES[n],v=+pref.variant||0;
  var used={},out=[];
  shape.forEach(function(sh,i){
    var kind=sh[0],share=sh[1];
    /* Protein is spread more evenly than energy: half by the meal's share, half equally. */
    var tg={kcal:targets.kcal*share,p:targets.p*(share+1/n)/2,c:targets.c*share,f:targets.f*share};
    var plates=PLATES[kind].slice();
    if(pref.style==="intl")plates.sort(function(a,b){return (a.egy?1:0)-(b.egy?1:0);});
    else plates.sort(function(a,b){return (b.egy?1:0)-(a.egy?1:0);});
    var meal=null;
    for(var k=0;k<plates.length&&!meal;k++){
      var pl=plates[(k+v+i)%plates.length];
      if(used[pl.k]&&k<plates.length-1)continue;
      var items=solve(pl,tg,pref,v);
      if(items&&items.length){used[pl.k]=1;meal=items;}}
    if(!meal)meal=solve(FALLBACK,tg,pref,v+i);
    out.push({named:names?names[i]:null,n:names?null:i+1,name:"",solved:meal||[],items:[],todo:[]});});
  /* The day as a whole: rounding to servings drifts. Carbs in the meals take up the
     difference, a serving step at a time, within their bounds. */
  for(var round=0;round<12;round++){
    var kc=0;out.forEach(function(m){m.solved.forEach(function(x){kc+=x.f.kcal*x.g/100;});});
    var diff=targets.kcal-kc;
    if(Math.abs(diff)<targets.kcal*0.04)break;
    var moved=false;
    out.forEach(function(m){m.solved.forEach(function(x){
      if(moved||x.sl.r!=="C"||x.sl.g!=null)return;
      var g=x.g+(diff>0?x.sl.step:-x.sl.step);
      if(g>=x.sl.min&&g<=x.sl.max&&x.f.kcal>0){x.g=g;moved=true;}});});
    if(!moved)break;}
  out.forEach(function(m){m.items=m.solved.filter(function(x){return x.g>0;}).map(itemOf);delete m.solved;});
  return out;}

export {allowed, buildMealPlan};
