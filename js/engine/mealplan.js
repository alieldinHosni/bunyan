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

   4. From the person's own food first (js/engine/habits.js, and the foods they said they
      like in the assessment, pref.likes): a meal they eat again
      and again is served again, the amounts solved for this meal's share the same
      way, when it lands within USUAL_FIT of the meal's energy; and in every plate a
      slot takes the food they log most, when one fits it, before the app's choice.
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
   not the same food every time. min/max/step in grams.
   cu is the kitchen a plate comes from (owner, 10 Nov: "more food options and
   variety"): egy Egyptian home food, lev the Levant (Syria, Lebanon, Palestine,
   Jordan), gulf the Gulf, med the Mediterranean, intl international. The person's own
   kitchen is tried first, the rest after (pref.style; "mixed" takes them as they
   come). Every plate is made of foods in the database; a dish (kabsa, mujadara,
   koshari) stands in a slot by what its energy mostly is. */
function S(r,ids,min,max,step){return {r:r,ids:ids,min:min,max:max,step:step};}
function FX(r,ids,g){return {r:r,ids:ids,g:g};}
var BREAD=["baladi_bran","baladi","aish_shamsi","bread_wholegrain","potato","sweet_potato_baked"];
var RICE=["rice_egyptian","rice_basmati","brown_rice","rice_with_vermicelli"];
var SALAD=["salata_baladi","salad","cucumber","tomato"];
var OIL=["olive_oil"];
var PLATES={
  Breakfast:[
    {k:"ful_eggs",cu:"egy",egy:1,s:[S("P",["egg_boiled","egg_white_ck"],50,200,50),S("C",["ful","ful_tomato"],100,300,50),S("C",BREAD,45,135,45),FX("V",SALAD,100)]},
    {k:"eggs_cheese",cu:"egy",egy:1,s:[S("P",["egg_boiled","omelette","egg_scrambled"],50,200,50),S("P",["gebna_areesh","cottage_low","skyr","lupini"],0,200,25),S("C",BREAD,45,180,45),FX("V",["tomato","cucumber"],100)]},
    {k:"oats_yogurt",cu:"intl",s:[S("C",["oats","rice_cake","banana"],30,120,10),S("P",["greek_yog_0","skyr","greek_yog","soy_milk"],150,400,50),FX("X",["banana","blueberries","strawberry","apple"],100),S("F",["almonds","peanut_butter","walnuts","chia"],0,30,5)]},
    {k:"labneh_eggs",cu:"lev",s:[S("P",["egg_boiled","halloumi","omelette"],50,200,50),S("P",["labneh","gebna_areesh","greek_yog_0"],0,150,25),S("C",["pita","bread_wholegrain","baladi_bran"],60,180,60),FX("V",["tomato","cucumber"],100),S("F",["olive_oil","zaatar_oil"],0,20,5)]},
    {k:"shakshuka",cu:"lev",s:[S("P",["shakshuka"],200,450,50),S("P",["egg_white_ck","gebna_areesh","labneh"],0,200,25),S("C",["pita","baladi","bread_wholegrain"],60,180,60)]},
    {k:"eggs_dates",cu:"gulf",s:[S("P",["omelette","egg_boiled","egg_scrambled"],100,240,40),S("P",["laban_rayeb","ayran","greek_yog_0"],0,300,50),S("C",["pita","bread_wholegrain"],60,120,60),S("C",["dates"],0,40,8),FX("V",["tomato","cucumber"],100)]},
    {k:"feta_omelette",cu:"med",s:[S("P",["omelette","egg_scrambled"],100,240,40),S("P",["feta","cottage_low"],0,60,10),S("C",["bread_wholegrain","toast_wholemeal"],38,152,38),FX("V",["tomato","spinach_ck","cucumber"],100),S("F",["olive_oil","avocado"],0,30,5)]},
    {k:"cereal_milk",cu:"intl",s:[S("C",["muesli","bran_flakes","oats","granola"],30,120,10),S("P",["milk_skim","milk_semi","soy_milk"],200,400,50),S("P",["whey","greek_yog_0","skyr"],0,200,25),FX("X",["banana","blueberries","strawberry"],100)]},
    {k:"toast_eggs",cu:"intl",s:[S("P",["egg_scrambled","egg_fried","egg_boiled"],100,240,40),S("P",["turkey_breast","cottage_low","egg_white_ck"],0,150,25),S("C",["toast_wholemeal","bagel_plain","bread_wholegrain"],38,152,38),S("F",["avocado","peanut_butter"],0,60,5)]},
    {k:"tofu_toast",cu:"intl",s:[S("P",["tofu_firm","tempeh"],100,250,25),S("C",["bread_wholegrain","baladi_bran","oats","sweet_potato_baked","potato"],38,152,38),FX("V",["tomato","spinach_ck"],100),S("F",["avocado","olive_oil"],0,60,5)]}
  ],
  Main:[
    {k:"chicken_rice",cu:"egy",egy:1,s:[S("P",["chicken_breast_ck","charcoal_chicken","turkey_breast"],100,300,25),S("C",RICE,100,400,25),FX("V",["salata_baladi","mixed_veg","green_beans","broccoli_ck"],150),S("F",OIL,0,20,5)]},
    {k:"fish_rice",cu:"egy",egy:1,s:[S("P",["tilapia_ck","fish_grilled_generic","seabass","salmon_ck","shrimp_ck"],120,300,30),S("C",RICE,100,400,25),FX("V",["salata_baladi","salad"],150),S("F",["tahina","olive_oil"],0,30,5)]},
    {k:"molokhia",cu:"egy",egy:1,s:[S("P",["chicken_breast_ck","beef_lean_ck","rabbit"],100,250,25),FX("V",["molokhia_plain"],250),S("C",["rice_egyptian","baladi"],100,350,25),S("F",OIL,0,15,5)]},
    {k:"beef_potato",cu:"intl",s:[S("P",["beef_lean_ck","veal","beef_steak","mince_cooked"],100,250,25),S("C",["potato_baked","sweet_potato_baked","potato"],150,450,50),FX("V",["salad","salata_baladi","green_beans"],150),S("F",OIL,0,20,5)]},
    {k:"pasta",cu:"med",s:[S("P",["chicken_breast_ck","tuna_water","mince_cooked","turkey_breast"],100,250,25),S("C",["pasta_ck","pasta_wholemeal","quinoa_ck"],100,400,25),FX("V",["tomato_sauce"],100),S("F",["olive_oil","parmesan"],0,20,5)]},
    {k:"lentils",cu:"egy",egy:1,s:[S("P",["lentils","lentils_yellow","chickpea"],150,400,50),S("P",["salata_zabady","greek_yog_0","egg_boiled","tofu_firm"],0,200,50),S("C",["rice_egyptian","baladi_bran","bulgur"],0,250,25),FX("V",SALAD,150),S("F",OIL,0,15,5)]},
    {k:"eggs_light",cu:"egy",egy:1,s:[S("P",["eggah","omelette","egg_boiled"],100,240,40),S("P",["gebna_areesh","cottage_low","lupini"],0,200,25),S("C",BREAD,45,180,45),FX("V",["salata_baladi","cucumber"],150)]},
    {k:"koshari",cu:"egy",s:[S("C",["koshari"],200,500,50),S("P",["salata_zabady","greek_yog_0","egg_boiled","lentils"],100,300,50),FX("V",["salata_baladi"],150)]},
    {k:"kofta_rice",cu:"egy",s:[S("P",["kofta","kabab_halla","kamouneya","kebda_eskandarani"],100,250,25),S("C",["rice_egyptian","rice_with_vermicelli","baladi"],100,350,25),FX("V",["salata_baladi","salad"],150),S("F",["tahina"],0,20,5)]},
    {k:"mahshi",cu:"egy",s:[S("C",["mahshi_mix","mahshi_kousa","mahshi_wara2","mahshi_felfel"],200,450,50),S("P",["chicken_breast_ck","charcoal_chicken","kofta","lentils"],100,250,25),S("P",["salata_zabady","greek_yog_0"],0,150,50)]},
    {k:"stew",cu:"egy",s:[S("P",["chicken_breast_ck","beef_stew_meat","veal","lentils"],100,250,25),FX("V",["fasolia_stew","bazella","bamia_meat","batates_stew","sabanekh_stew"],250),S("C",["rice_egyptian","rice_with_vermicelli","baladi"],100,350,25)]},
    {k:"sayadeya",cu:"egy",s:[S("C",["fish_sayadeya"],200,450,50),S("P",["fish_grilled_generic","tilapia_ck","shrimp_ck","mullet"],100,250,25),FX("V",["salata_baladi","salad"],150),S("F",["tahina"],0,20,5)]},
    {k:"falafel",cu:"egy",s:[S("C",["tameya"],60,200,20),S("P",["greek_yog_0","salata_zabady","egg_boiled","lupini"],100,300,50),S("C",["baladi_bran","pita"],0,120,60),FX("V",["salata_baladi","salad"],150)]},
    {k:"shish_tawook",cu:"lev",s:[S("P",["chicken_shish","grilled_platter","kebab"],100,300,25),S("C",["rice_basmati","bulgur","freekeh","pita"],100,350,25),FX("V",["tabbouleh","fattoush"],150),S("F",["hummus_dip","tahina","baba_ganoush"],0,80,10)]},
    {k:"shawarma_plate",cu:"lev",s:[S("P",["shawarma_ch","shawarma_beef"],100,300,25),S("C",["pita","rice_basmati"],60,240,60),FX("V",["fattoush","salad"],150),S("F",["tahina"],0,30,5)]},
    {k:"mujadara",cu:"lev",s:[S("C",["mujadara"],150,450,50),S("P",["greek_yog_0","labneh","salata_zabady","egg_boiled"],100,300,50),FX("V",["fattoush","salad","salata_baladi"],150)]},
    {k:"maqluba",cu:"lev",s:[S("C",["maqluba","freekeh"],150,400,50),S("P",["chicken_breast_ck","lamb_leg"],50,200,25),S("P",["salata_zabady","greek_yog_0","yogurt"],0,200,50),FX("V",["salad"],150)]},
    {k:"kabsa",cu:"gulf",s:[S("C",["kabsa","machboos","mandi"],200,500,50),S("P",["chicken_breast_ck","charcoal_chicken","lamb_leg","fish_grilled_generic"],50,200,25),FX("V",["salad","salata_baladi"],150),S("P",["salata_zabady","yogurt","laban_rayeb"],0,150,50)]},
    {k:"saloona",cu:"gulf",s:[S("P",["chicken_breast_ck","fish_grilled_generic","beef_stew_meat"],100,250,25),FX("V",["saloona"],250),S("C",["rice_basmati","rice_egyptian"],100,350,25)]},
    {k:"harees",cu:"gulf",s:[S("P",["harees"],250,500,50),S("P",["chicken_breast_ck"],0,150,25),FX("V",["salad","cucumber"],100)]},
    {k:"fish_potato",cu:"med",s:[S("P",["salmon_ck","seabass","cod_ck","sardine"],100,250,25),S("C",["potato_baked","couscous","quinoa_ck","bulgur"],100,400,25),FX("V",["salad","mixed_veg","broccoli_ck"],150),S("F",["olive_oil"],0,20,5)]},
    {k:"chicken_couscous",cu:"med",s:[S("P",["chicken_breast_ck","chicken_thigh_ck","turkey_breast"],100,300,25),S("C",["couscous","bulgur","freekeh"],100,400,25),FX("V",["mixed_veg","salad"],150),S("F",["olive_oil","feta"],0,30,5)]},
    {k:"greek_bowl",cu:"med",s:[S("P",["chickpea","tuna_water","chicken_breast_ck"],100,300,25),S("C",["bread_wholegrain","pita","quinoa_ck"],0,200,25),FX("V",["salad","tomato","cucumber"],200),S("F",["feta","olive_oil"],10,60,10)]},
    {k:"burrito_bowl",cu:"intl",s:[S("P",["chicken_breast_ck","mince_cooked","turkey_breast"],100,300,25),S("C",["brown_rice","rice_basmati"],100,350,25),S("C",["black_beans","kidney_beans"],0,150,25),FX("V",["salad","mixed_veg"],150),S("F",["avocado","cheddar"],0,80,10)]},
    {k:"wrap",cu:"intl",s:[S("P",["turkey_breast","chicken_breast_ck","tuna_water"],100,250,25),S("C",["tortilla"],60,180,60),FX("V",["salad","tomato"],100),S("F",["avocado","cream_cheese","olive_oil"],0,50,5)]},
    {k:"tofu_bowl",cu:"intl",s:[S("P",["tofu_firm","tempeh","edamame"],100,300,25),S("C",["rice_basmati","quinoa_ck","brown_rice"],100,350,25),FX("V",["broccoli_ck","mixed_veg"],150),S("F",["olive_oil","sesame"],0,20,5)]}
  ],
  Snack:[
    {k:"yogurt_fruit",cu:"med",s:[S("P",["greek_yog_0","skyr","cottage_low","greek_yog"],150,350,50),S("C",["banana","guava","apple","orange","mango","blueberries"],0,250,50)]},
    {k:"lupini",cu:"egy",egy:1,s:[S("P",["lupini"],100,250,25),S("C",["orange","apple","guava"],0,250,50)]},
    {k:"shake",cu:"intl",s:[S("P",["whey","whey_isolate"],20,50,5),S("C",["banana","oats","dates"],0,150,10),S("P",["milk_skim","soy_milk"],0,300,50)]},
    {k:"hummus_veg",cu:"lev",s:[S("P",["greek_yog_0","labneh","halloumi"],0,200,25),S("C",["hummus_dip","baba_ganoush"],50,200,25),FX("V",["cucumber","tomato"],100),S("C",["pita"],0,60,30)]},
    {k:"dates_laban",cu:"gulf",s:[S("C",["dates"],16,96,8),S("P",["laban_rayeb","ayran","greek_yog_0","yog_drink"],150,400,50),S("F",["almonds","pistachios"],0,30,5)]},
    {k:"hummus_sham",cu:"egy",s:[S("C",["hummus_sham"],100,300,50),S("P",["lupini","greek_yog_0"],0,200,25)]},
    {k:"cottage_crackers",cu:"intl",s:[S("P",["cottage_low","skyr","turkey_breast"],100,300,25),S("C",["rice_cake","crackers","apple"],20,90,10)]},
    {k:"nuts_fruit",cu:"intl",s:[S("F",["almonds","peanuts","walnuts","pistachios","pumpkin_seeds"],10,40,5),S("C",["banana","apple","dates"],0,200,50),S("P",["skyr","greek_yog_0","edamame"],0,200,50)]}
  ]
};

/* The plates in the order they are tried: the person's kitchen first, each list turned
   by the meal's place in the day and the variant, so two lunches are not the same dish
   and "another version" moves on. "egy" is the default kitchen. */
var KITCHENS=["egy","lev","gulf","med","intl"];
function kitchen(p){return p.cu||(p.egy?"egy":"intl");}
function turn(a,n){return a.length?a.slice(n%a.length).concat(a.slice(0,n%a.length)):a;}
function ordered(list,style,n){
  var st=KITCHENS.indexOf(style)>=0?style:style==="mixed"?null:"egy";
  if(!st)return turn(list,n);
  var mine=list.filter(function(p){return kitchen(p)===st;}),rest=list.filter(function(p){return kitchen(p)!==st;});
  return turn(mine,n).concat(turn(rest,n));}
/* Every food a plate can serve, for the assessment's "foods you like": a pick always
   has a place. [{id, role}] in first-seen order, role P, C, F or V. */
function plateFoods(){
  var seen={},out=[];
  Object.keys(PLATES).forEach(function(k){PLATES[k].forEach(function(p){p.s.forEach(function(sl){sl.ids.forEach(function(id){
    if(seen[id])return;seen[id]=1;out.push({id:id,role:sl.r==="X"?"V":sl.r,cu:kitchen(p)});});});});});
  return out;}

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

var BYID=null,MINE={};
function food(id){
  if(!BYID){BYID={};(FOODDB||[]).forEach(function(f){BYID[f.id]=f;});}
  return BYID[id]||MINE[id]||null;}

function roundTo(g,step){return Math.round(g/step)*step;}
/* The food a slot uses: the first one that fits, after a rotation by seed. */
function pick(slot,pref,seed){
  var ok=slot.ids.map(food).filter(function(f){return f&&allowed(f,pref);});
  /* What they eat, when the slot has it: the most logged first, "another version"
     moving on to the next of theirs. */
  var eaten=pref.mine_eaten||(pref.habits&&pref.habits.eaten)||{};
  var theirs=ok.filter(function(f){return eaten[f.id]>0;}).sort(function(a,b){return eaten[b.id]-eaten[a.id];});
  if(theirs.length)return theirs[seed%theirs.length];
  return ok.length?ok[seed%ok.length]:null;}

/* ---- the person's usual meals, as plates ---------------------------------------
   Each food takes the part its energy says it plays: protein when a third or more of
   its energy is protein, fat when three fifths is fat, carbohydrate when half is;
   anything else (vegetables, a sauce, tea with milk) stays at what they usually have.
   An amount moves between half and twice the usual, in a serving they count by (two
   eggs, not 113 g) or in grams. A meal with nothing that can move is not used: it
   could not be fitted to anything. */
var USUAL_FIT=0.2;
function roleOf(f){
  var k=+f.kcal||0;if(!k)return null;
  if(f.p*4/k>=0.3)return "P";
  if(f.f*9/k>=0.6)return "F";
  if(f.c*4/k>=0.5)return "C";
  return null;}
function stepOf(f,g,r){
  var c=(f.s||[]).filter(function(u){return u[1]>0&&!/^\d/.test(u[0]);})[0];
  if(c&&g>=c[1]&&Math.abs(g/c[1]-Math.round(g/c[1]))<0.04)return c[1];
  return r==="F"||g<60?5:g<150?10:25;}
function usualPlate(u,pref){
  var s=[],moves=0;
  for(var i=0;i<u.fids.length;i++){
    var f=food(u.fids[i]);
    if(!f||!allowed(f,pref))return null;
    var g=u.grams[f.id],r=roleOf(f);
    if(!r){s.push(FX("V",[f.id],g));continue;}
    var st=stepOf(f,g,r);
    s.push(S(r,[f.id],Math.max(st,roundTo(g/2,st)),Math.max(st,roundTo(g*2,st)),st));moves++;}
  return moves?{k:"usual:"+u.fids.join(","),s:s,usual:u}:null;}

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
      it.forEach(function(x){if(adj.indexOf(x)<0)others+=x.f[k]*x.g/(x.f.per||100);});
      var need=Math.max(0,target[k]-others);
      /* Shared out by how much of it each food carries, the first food first. */
      adj.forEach(function(x,j){
        var share=adj.length===1?1:j===0?0.65:0.35/(adj.length-1);
        var dens=x.f[k]/(x.f.per||100);
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
  var used={},out=[],H=pref.habits||null;
  /* The foods they said they like (the assessment) count as eaten on a couple of days:
     ahead of the app's own choice, behind what the log shows they eat most. */
  var me=Object.assign({},(H&&H.eaten)||{});(pref.likes||[]).forEach(function(id){me[id]=(me[id]||0)+2;});
  pref=Object.assign({},pref,{mine_eaten:me});
  MINE={};(pref.mine||[]).forEach(function(f){if(f&&f.id)MINE[f.id]=f;});
  var usedUsual={};
  shape.forEach(function(sh,i){
    var kind=sh[0],share=sh[1];
    /* Protein is spread more evenly than energy: half by the meal's share, half equally. */
    var tg={kcal:targets.kcal*share,p:targets.p*(share+1/n)/2,c:targets.c*share,f:targets.f*share};
    var plates=ordered(PLATES[kind],pref.style,v+i);
    var meal=null,usual=null;
    /* Their own meal for this kind first, the one usually eaten at this meal before
       another; each once a day. */
    var own=H&&H.usual&&H.usual[kind]?H.usual[kind].slice():[];
    if(names)own.sort(function(a,b){return (b.slot===names[i]?1:0)-(a.slot===names[i]?1:0);});
    for(var q=0;q<own.length&&!meal;q++){
      var up=usualPlate(own[q],pref);
      if(!up||usedUsual[up.k])continue;
      var it=solve(up,tg,pref,0);
      if(!it||!it.length)continue;
      var e=0;it.forEach(function(x){e+=x.f.kcal*x.g/(x.f.per||100);});
      if(Math.abs(e-tg.kcal)<=tg.kcal*USUAL_FIT){usedUsual[up.k]=1;meal=it;usual=own[q];}}
    /* Then a meal they built themselves (pref.saved, from My foods), sized the same way
       and each once a day; Another version starts the list somewhere else. */
    var sv=pref.saved||[],saved=null;
    for(var q2=0;q2<sv.length&&!meal;q2++){
      var sm=sv[(q2+v+i)%sv.length],up2=usualPlate(sm,pref);
      if(!up2||usedUsual[up2.k])continue;
      var it2=solve(up2,tg,pref,0);
      if(!it2||!it2.length)continue;
      var e2=0;it2.forEach(function(x){e2+=x.f.kcal*x.g/(x.f.per||100);});
      if(Math.abs(e2-tg.kcal)<=tg.kcal*USUAL_FIT){usedUsual[up2.k]=1;meal=it2;saved=sm;}}
    for(var k=0;k<plates.length&&!meal;k++){
      var pl=plates[k];
      if(used[pl.k]&&k<plates.length-1)continue;
      var items=solve(pl,tg,pref,v);
      if(items&&items.length){used[pl.k]=1;meal=items;}}
    if(!meal)meal=solve(FALLBACK,tg,pref,v+i);
    out.push({named:names?names[i]:null,n:names?null:i+1,name:"",solved:meal||[],items:[],todo:[],usual:usual?usual.days:0,saved:saved?saved.name:""});});
  /* The day as a whole: rounding to servings drifts. Carbs in the meals take up the
     difference, a serving step at a time, within their bounds: the app's plates first,
     a meal of their own (usual or saved) only when nothing else can move, so it stays
     as they eat it. */
  var byOwn=out.slice().sort(function(a,b){return ((a.usual||a.saved)?1:0)-((b.usual||b.saved)?1:0);});
  for(var round=0;round<12;round++){
    var kc=0;out.forEach(function(m){m.solved.forEach(function(x){kc+=x.f.kcal*x.g/(x.f.per||100);});});
    var diff=targets.kcal-kc;
    if(Math.abs(diff)<targets.kcal*0.04)break;
    var moved=false;
    byOwn.forEach(function(m){m.solved.forEach(function(x){
      if(moved||x.sl.r!=="C"||x.sl.g!=null)return;
      var g=x.g+(diff>0?x.sl.step:-x.sl.step);
      if(g>=x.sl.min&&g<=x.sl.max&&x.f.kcal>0){x.g=g;moved=true;}});});
    if(!moved)break;}
  out.forEach(function(m){m.items=m.solved.filter(function(x){return x.g>0;}).map(itemOf);delete m.solved;});
  return out;}

/* Foods that could take a plan food's place (owner, 3 Nov: "easy to find alternatives
   for the food within the same range of nutrition facts, or preference"). it: a plan item
   {fid, kcal, p, c, f}. Every food the person's diet and exclusions allow (pref, as
   allowed() reads it; pref.mine: their own foods) is sized to the same calories — a
   counted serving when one comes out whole or half, else grams to the nearest 5 — and
   ranked by how close its protein, carbs and fat are, as shares of those calories, with
   the same kind of food first. Impractical amounts (under 10 g, over 500 g) are left out.
   Returns up to n of {food, grams, item}. Pure apart from the food database. */
function similarFoods(it,pref,n){
  pref=pref||{};n=n||6;
  var k0=+it.kcal||0;if(k0<=0)return [];
  var pool=(pref.mine||[]).concat(FOODDB||[]),f0=null;
  for(var q=0;q<pool.length;q++)if(pool[q].id===it.fid){f0=pool[q];break;}
  var share=function(p,c,f){var k=p*4+c*4+f*9||1;return [p*4/k,c*4/k,f*9/k];};
  var s0=share(+it.p||0,+it.c||0,+it.f||0),seen={},out=[];
  pool.forEach(function(f){
    if(!f||f.id===it.fid||!(f.kcal>0)||!allowed(f,pref))return;
    if(f.cat==="Supplements"&&!(f0&&f0.cat==="Supplements"))return;
    var per=f.per||100,g=k0/(f.kcal/per);
    var u=(f.s||[]).filter(function(x){return x[1]>0&&!/^\d/.test(x[0]);})[0];
    if(u){var hk=Math.round(g/u[1]*2)/2;if(hk>=0.5&&Math.abs(hk*u[1]-g)/g<0.2)g=hk*u[1];else g=Math.round(g/5)*5;}
    else g=Math.round(g/5)*5;
    if(g<10||g>500)return;
    var nn=nutritionFor(f,g),s1=share(nn.p,nn.c,nn.f);
    var d=Math.abs(s1[0]-s0[0])+Math.abs(s1[1]-s0[1])+Math.abs(s1[2]-s0[2])
      +(f0&&f.cat!==f0.cat?0.12:0)+Math.abs(nn.kcal-k0)/k0*0.5;
    out.push({food:f,grams:g,d:d});});
  out.sort(function(a,b){return a.d-b.d;});
  var res=[];
  for(var i=0;i<out.length&&res.length<n;i++){
    var key=String(out[i].food.n||"").toLowerCase().split(/[,(]/)[0].trim();
    if(seen[key])continue;seen[key]=1;
    res.push({food:out[i].food,grams:out[i].grams,item:itemOf({f:out[i].food,g:out[i].grams})});}
  return res;}

export {allowed, buildMealPlan, itemOf, plateFoods, similarFoods};
