/* Bunyan — nutrition
   Food database, natural-language parsing and macro maths. */
import {S} from "../state.js";
import {num, uid} from "../util.js";
import {fuzzyRank, matchScore, norm, tokenMatch} from "./text.js";

/* ============================================================================
   NUTRITION ENGINE — pure functions, no DOM, no side effects.
   Layer order: local db -> user's own foods -> Open Food Facts -> manual.
   ========================================================================== */
var FOODDB=null, FOODDB_TRIED=false;

function loadFoods(cb){
  if(FOODDB||FOODDB_TRIED){cb&&cb();return;}
  FOODDB_TRIED=true;
  fetch("foods.json").then(function(r){return r.json();})
    .then(function(j){FOODDB=j.foods||[];cb&&cb();})
    .catch(function(){FOODDB=[];cb&&cb();});
}

/* ---- unit handling -------------------------------------------------- */
/* Grams per unit. Volume units are millilitres and are converted to grams through the
   food's density (liquidDensity below), so "250 ml olive oil" is not logged as 250 g.
   Zero means countable: the amount comes from the food's own servings instead. */
var UNITS={
  g:1,gram:1,grams:1,gm:1,gms:1,gr:1,
  kg:1000,kilo:1000,kilos:1000,kilogram:1000,kilograms:1000,
  oz:28.35,ounce:28.35,ounces:28.35,lb:453.6,lbs:453.6,pound:453.6,pounds:453.6,
  ml:1,millilitre:1,milliliter:1,millilitres:1,milliliters:1,
  l:1000,litre:1000,liter:1000,litres:1000,liters:1000,ltr:1000,
  floz:29.57,
  tbsp:15,tablespoon:15,tablespoons:15,
  tsp:5,teaspoon:5,teaspoons:5,
  cup:240,cups:240,
  scoop:30,scoops:30,slice:0,slices:0,piece:0,pieces:0,can:0,cans:0,
  glass:0,glasses:0,bottle:0,bottles:0,mug:0,mugs:0
};
/* The units measured by volume. Everything else in UNITS with a value is a mass. */
var VOLUME={ml:1,millilitre:1,milliliter:1,millilitres:1,milliliters:1,l:1,litre:1,liter:1,
  litres:1,liters:1,ltr:1,floz:1,tbsp:1,tablespoon:1,tablespoons:1,tsp:1,teaspoon:1,
  teaspoons:1,cup:1,cups:1};
/* A drink ordered by the glass or the can, when the food lists no serving by that
   name. Only ever used for liquids: "a can of tuna" is not 330 ml. */
var DRINK_SERVINGS={glass:250,bottle:500,can:330,mug:300,cup:240};
/* The one place a typed unit becomes a canonical key, so "Litres", "ltr" and "L" are
   the same unit everywhere — the parser, the picker and the stored item. */
var CANON={g:"g",gram:"g",grams:"g",gm:"g",gms:"g",gr:"g",
  kg:"kg",kilo:"kg",kilos:"kg",kilogram:"kg",kilograms:"kg",
  oz:"oz",ounce:"oz",ounces:"oz",lb:"lb",lbs:"lb",pound:"lb",pounds:"lb",
  ml:"ml",millilitre:"ml",milliliter:"ml",millilitres:"ml",milliliters:"ml",
  l:"l",litre:"l",liter:"l",litres:"l",liters:"l",ltr:"l",floz:"floz",
  tbsp:"tbsp",tablespoon:"tbsp",tablespoons:"tbsp",tsp:"tsp",teaspoon:"tsp",teaspoons:"tsp",
  cup:"cup",cups:"cup"};
function canonUnit(u){
  if(!u)return null;
  u=String(u).toLowerCase().replace(/[\s.]/g,"");
  if(u==="fl"||u==="fluidounce"||u==="fluidounces")u="floz";
  return CANON[u]||null;}

/* Drinks are logged by volume. The food database has no liquid flag, so it is read
   off the category and the name — a Beverages entry, or anything that is plainly a
   drink, a soup or an oil. Branded products from Open Food Facts carry neither, which
   is why the picker still offers volume for them: better one unit too many than a
   carton of milk that can only be weighed. */
var LIQUID_RE=/\b(milk|juice|drink|coffee|latte|cappuccino|espresso|tea|cola|soda|water|shake|smoothie|soup|broth|oil|laban|kefir|buttermilk|lemonade|syrup|vinegar|sauce|nectar|beer|wine)\b|عصير|لبن|قهوة|شاي|مياه|شوربة|زيت|مشروب/i;
function isLiquid(food){
  if(!food)return false;
  if(food.liq!=null)return !!food.liq;
  if(food.cat==="Beverages")return true;
  if(LIQUID_RE.test(food.n||""))return true;
  return (food.s||[]).some(function(s){return /\bml\b|\blitre|\bliter/i.test(s[0]);});}
/* Grams per millilitre. Close enough to 1 for anything water-based; oils are the one
   common case where it is not, and a tablespoon of oil is where people log by volume. */
function liquidDensity(food){
  if(food&&food.dens)return food.dens;
  if(/\boil\b|زيت/i.test((food&&food.n)||""))return 0.92;
  if(/\b(honey|syrup|molasses)\b|عسل/i.test((food&&food.n)||""))return 1.4;
  return 1;}

/* The units a food can be measured in, for the picker beside the amount. Each one is
   {k, label, g} — g being grams per one of it for this food. Liquids lead with volume,
   solids with mass, and the food's own servings ("large egg", "can") come after. */
var UNIT_LABEL={g:"g",kg:"kg",oz:"oz",lb:"lb",ml:"ml",l:"L",floz:"fl oz",cup:"cup",tbsp:"tbsp",tsp:"tsp"};
function unitsFor(food){
  var out=[],liq=isLiquid(food),d=liquidDensity(food),seen={};
  function add(k,g,label){
    if(seen[k]||!(g>0))return;seen[k]=1;
    out.push({k:k,g:Math.round(g*1000)/1000,label:label||UNIT_LABEL[k]||k});}
  var vol=[["ml",1],["l",1000],["floz",29.57],["cup",240],["tbsp",15],["tsp",5]];
  var mass=[["g",1],["kg",1000],["oz",28.35],["lb",453.6]];
  if(liq){
    vol.forEach(function(u){add(u[0],u[1]*d);});
    add("g",1);
  }else{
    mass.forEach(function(u){add(u[0],u[1]);});
    /* Branded products: see isLiquid. */
    if(food&&food.src==="off"){add("ml",d);add("l",1000*d);}
  }
  (food&&food.s||[]).forEach(function(s,i){
    /* "100 g" and "250 ml" are the units already listed, not servings of their own. */
    if(/^\s*\d+(\.\d+)?\s*(g|ml)\s*$/i.test(s[0]))return;
    /* A serving that IS a unit — milk's "cup" of 244 g, oil's 13.5 g "tbsp" — is the
       food's own measure of that unit, so it replaces the generic one rather than
       appearing twice in the picker with two different weights. */
    var ck=canonUnit(s[0]);
    if(ck&&seen[ck]){out.forEach(function(u){if(u.k===ck)u.g=s[1];});return;}
    add("s"+i,s[1],s[0]);});
  return out;}
function unitOf(food,k){
  var list=unitsFor(food);
  for(var i=0;i<list.length;i++)if(list[i].k===k)return list[i];
  return null;}
/* The unit an amount is shown in when nobody has picked one. */
function defaultUnit(food){return isLiquid(food)?"ml":"g";}
/* A sensible increment for the steppers, per unit. */
function unitStep(k){
  return {g:10,ml:25,kg:0.1,l:0.1,oz:1,lb:0.25,floz:1,cup:0.25,tbsp:1,tsp:1}[k]||0.5;}
/* Rounding for display, so 250 ml in litres reads 0.25 and not 0.250000001. */
function roundQty(v,k){
  if(k==="g"||k==="ml")return Math.round(v);
  if(k==="kg"||k==="l"||k==="lb"||k==="cup")return Math.round(v*100)/100;
  return Math.round(v*10)/10;}
function amountLabel(qty,u){
  if(!u)return qty+" g";
  if(/^s\d+$/.test(u.k))return qty+" \u00d7 "+u.label;
  return qty+" "+u.label;}

var COUNT_WORDS={a:1,an:1,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,
  eight:8,nine:9,ten:10,half:0.5,"1/2":0.5,"quarter":0.25};

/* Matching lives in engine/text.js so the exercise picker and this share one
   implementation. It was duplicated here first and the two immediately drifted. */
function normFood(str){return norm(str);}
function namesOf(food){return [food.n].concat(food.a||[]);}
function fuzzyFoods(q,limit){
  var pool=(S.myFoods||[]).concat(FOODDB||[]);
  return fuzzyRank(q,pool,namesOf,limit||5).map(function(r){return {f:r.item,dist:r.dist};});
}

/* ---- natural language parsing --------------------------------------- */
function parseFoodInput(text){
  if(!text)return [];
  var chunks=String(text)
    .replace(/\band\b|\bwith\b|\bplus\b|\bon\b|\+|،/gi,",")
    /* Arabic "and" is a waw, written either on its own ("بيض و عيش") or stuck to the
       next word ("فول وطعمية"); "مع" is "with". Without these the whole phrase reads
       as one food and everything after the first item is lost. */
    .replace(/\s+و\s+/g,",")
    .replace(/\s+و(?=[ء-ي])/g,",")
    .replace(/\s+مع\s+/g,",")
    .split(",").map(function(x){return x.trim();}).filter(Boolean);
  return chunks.map(parseChunk).filter(Boolean);
}

/* Longest first, so "ml" is not read as "m" + "l" and "fl oz" wins over "oz". */
var UNIT_WORDS="fl\\.?\\s?oz|kilograms?|kilos?|kg|grams?|gms?|gm|gr|g|ounces?|oz|pounds?|lbs?|lb"
  +"|millilit(?:re|er)s?|ml|lit(?:re|er)s?|ltr|l|tablespoons?|tbsp|teaspoons?|tsp|cups?"
  +"|scoops?|slices?|pieces?|cans?|glass(?:es)?|bottles?|mugs?";
function parseChunk(chunk){
  /* The matcher's normaliser drops punctuation, which turned "1.5 kg rice" into
     "1 5 kg rice" — one of whatever the food's first serving was — and "0.5 l milk"
     into nothing at all. The decimal point is held through it. */
  var q=normFood(String(chunk).replace(/(\d)[.](\d)/g,"$1_$2")).replace(/(\d)_(\d)/g,"$1.$2");
  if(!q)return null;
  var qty=null,unit=null;

  /* "200g chicken" / "250 ml milk" / "1.5 kg rice" */
  var m=q.match(new RegExp("^(\\d+(?:\\.\\d+)?)\\s*("+UNIT_WORDS+")\\b\\s*(?:of\\s+)?(.*)$"));
  if(m){qty=parseFloat(m[1]);unit=m[2];q=m[3];}
  else{
    /* "3 eggs" / "two bananas" */
    var m2=q.match(/^(\d+(?:\.\d+)?)\s+(.*)$/);
    if(m2){qty=parseFloat(m2[1]);q=m2[2];}
    else{
      var m3=q.match(/^(a|an|one|two|three|four|five|six|seven|eight|nine|ten|half)\s+(.*)$/);
      if(m3){qty=COUNT_WORDS[m3[1]];q=m3[2];}
    }
    /* "a glass of juice" / "2 cups of coffee" / "half a litre of milk": the count
       word was read above, the unit follows it. */
    var m5=q.match(new RegExp("^(?:a\\s+)?("+UNIT_WORDS+")\\s+(?:of\\s+)?(.+)$"));
    if(m5&&qty!=null){unit=m5[1];q=m5[2];}
    /* trailing unit: "chicken 200g" */
    var m4=q.match(new RegExp("^(.*?)\\s+(\\d+(?:\\.\\d+)?)\\s*("+UNIT_WORDS+")$"));
    if(m4){q=m4[1];qty=parseFloat(m4[2]);unit=m4[3];}
  }
  q=q.replace(/\b(of|the|some|my|a|an)\b/g," ").replace(/\s+/g," ").trim();
  if(!q)return null;
  return {raw:chunk.trim(),query:q,qty:qty,unit:unit};
}

/* ---- matching -------------------------------------------------------- */
function scoreMatch(q,food){
  var names=[food.n].concat(food.a||[]).map(normFood);
  var best=0;
  for(var i=0;i<names.length;i++){
    var n=names[i];
    if(n===q)return 100;
    /* longer, more specific names beat short generic aliases */
    var ratio=Math.min(1,n.length/Math.max(q.length,1));
    if(n.indexOf(q)===0||q.indexOf(n)===0)best=Math.max(best,72+22*ratio);
    else if(n.indexOf(q)>-1||q.indexOf(n)>-1)best=Math.max(best,60+30*ratio);
    var qt=q.split(" "),nt=n.split(" "),hit=0;
    for(var j=0;j<qt.length;j++)if(nt.indexOf(qt[j])>-1)hit++;
    if(hit)best=Math.max(best,45+35*(hit/Math.max(qt.length,nt.length)));
  }
  /* singular / plural */
  if(q.length>3&&q.slice(-1)==="s")
    best=Math.max(best,scoreMatchRaw(q.slice(0,-1),names));
  return best;
}
function scoreMatchRaw(q,names){
  for(var i=0;i<names.length;i++)if(names[i]===q)return 95;
  return 0;
}

function searchFoods(q,limit){
  q=normFood(q);
  if(!q)return [];
  var pool=(S.myFoods||[]).concat(FOODDB||[]);
  var out=[];
  for(var i=0;i<pool.length;i++){
    var sc=scoreMatch(q,pool[i]);
    if(sc>=45)out.push({f:pool[i],score:sc});
  }
  out.sort(function(a,b){return b.score-a.score;});
  return out.slice(0,limit||20);
}

/* ---- serving resolution --------------------------------------------- */
function gramsFor(food,qty,unit){
  if(qty==null)qty=1;
  if(unit){
    /* A unit picked in the sheet: a key from unitsFor(), servings included. */
    var ck=canonUnit(unit),picked=unitOf(food,unit)||(ck&&unitOf(food,ck));
    if(picked)return {g:qty*picked.g,label:amountLabel(qty,picked),unit:picked.k};
    if(ck&&UNITS[ck]>0){
      var per=UNITS[ck]*(VOLUME[ck]?liquidDensity(food):1);
      return {g:qty*per,label:amountLabel(qty,unitOf(food,ck)||{k:ck,label:UNIT_LABEL[ck]}),unit:ck};}
    /* countable units fall through to the food's own servings */
  }
  var s=(food.s&&food.s[0])||["100 g",100],si=0;
  if(unit){
    /* Singular, without mangling "glass" into "glas". */
    var raw=normFood(unit),base=DRINK_SERVINGS[raw]||raw.length<4?raw
          :/(ss|sh|ch|x)es$/.test(raw)?raw.slice(0,-2):raw.replace(/s$/,""),hit=-1;
    for(var i=0;i<(food.s||[]).length;i++){
      if(normFood(food.s[i][0]).indexOf(base)>-1){hit=i;break;}
    }
    if(hit>=0){s=food.s[hit];si=hit;}
    else if(isLiquid(food)&&DRINK_SERVINGS[base]){
      /* "a glass of milk" when milk only lists a cup: a glass is still a glass. */
      var ml=DRINK_SERVINGS[base];
      return {g:qty*ml*liquidDensity(food),label:qty+" \u00d7 "+base+" ("+ml+" ml)",unit:"ml",
        qtyIn:qty*ml};
    }
  }
  /* "100 g" as the only serving is grams in all but name; say so, so the picker
     shows 100 g rather than 1 × 100 g. */
  if(/^\s*100\s*g\s*$/i.test(s[0]))return {g:qty*s[1],label:amountLabel(qty*s[1],{k:"g",label:"g"}),unit:"g",qtyIn:qty*s[1]};
  /* Milk's "cup" serving is listed in the picker as the cup unit itself (see
     unitsFor), so it has to come back under that key or the picker cannot find it. */
  var ck2=canonUnit(s[0]),uk=ck2&&unitOf(food,ck2)?ck2:"s"+si;
  return {g:qty*s[1],label:qty+" \u00d7 "+s[0],unit:uk};
}

/* ---- the calculation engine ------------------------------------------ */
function nutritionFor(food,grams){
  var k=grams/(food.per||100);
  return {
    kcal:Math.round(food.kcal*k),
    p:Math.round(food.p*k*10)/10,
    c:Math.round(food.c*k*10)/10,
    f:Math.round(food.f*k*10)/10,
    fib:Math.round((food.fib||0)*k*10)/10
  };
}
function sumNutrition(items){
  var tot={kcal:0,p:0,c:0,f:0,fib:0};
  (items||[]).forEach(function(i){
    tot.kcal+=num(i.kcal);tot.p+=num(i.p);tot.c+=num(i.c);tot.f+=num(i.f);tot.fib+=num(i.fib);});
  return {kcal:Math.round(tot.kcal),p:Math.round(tot.p),c:Math.round(tot.c),
          f:Math.round(tot.f),fib:Math.round(tot.fib)};
}

/* ---- resolve a parsed chunk into a logged item ----------------------- */
/* Every draft item carries its amount as (qty, unit key) from here on, so the picker,
   the steppers and the stored log all agree on what the user asked for. A typed
   "a glass of milk" becomes 250 ml; "3 eggs" stays 3 × large egg. */
function settleUnit(it,g){
  it.parsed.unit=g.unit||it.parsed.unit;
  if(g.qtyIn!=null)it.parsed.qty=roundQty(g.qtyIn,it.parsed.unit);
  else if(it.parsed.qty==null)it.parsed.qty=1;
  return it;}
function recalcItem(it){
  var g=gramsFor(it.food,it.parsed.qty,it.parsed.unit);
  settleUnit(it,g);
  it.grams=g.g; it.label=g.label; it.n=nutritionFor(it.food,g.g);
  return it;}
/* The same amount, expressed in another unit. Switching 250 ml to litres shows 0.25 L
   and changes nothing else: the unit is how it is read, not how much was drunk. */
function convertItem(it,k){
  var u=unitOf(it.food,k);
  if(!u)return it;
  it.parsed.unit=k;
  it.parsed.qty=Math.max(roundQty(it.grams/u.g,k),k==="g"||k==="ml"?1:0.01);
  /* The grams, and so the macros, stay exactly as they were; only the reading of
     them changes. Recalculating from the rounded figure would drift a few grams on
     every switch. */
  it.label=amountLabel(it.parsed.qty,u);
  return it;}
function toLogItem(it){
  return {fid:it.food.id,n:it.name,label:it.label,grams:it.grams,src:it.src,
          qty:it.parsed?it.parsed.qty:null,unit:it.parsed?it.parsed.unit:null,
          kcal:it.n.kcal,p:it.n.p,c:it.n.c,f:it.n.f,fib:it.n.fib};}
function resolveItem(parsed){
  var hits=searchFoods(parsed.query,5);
  if(!hits.length){
    /* Zero-hit only. A guess is offered, never taken: logging the wrong food quietly
       corrupts the day's numbers, and one tap does not. */
    var guess=fuzzyFoods(parsed.query,4);
    if(guess.length)return {status:"suggest",parsed:parsed,
      alts:guess.map(function(x){return x.f;})};
    return {status:"unknown",parsed:parsed};
  }
  var top=hits[0];
  var ambiguous=hits.length>1&&hits[1].score>=top.score-8&&top.score<95;
  var g=gramsFor(top.f,parsed.qty,parsed.unit);
  var n=nutritionFor(top.f,g.g);
  settleUnit({parsed:parsed},g);
  return {
    status:ambiguous?"ambiguous":"ok",
    parsed:parsed, food:top.f, alts:hits.slice(0,5).map(function(x){return x.f;}),
    grams:g.g, label:g.label, confidence:top.score,
    src:top.f.src||"db",
    n:n, name:top.f.n
  };
}

/* ---- Open Food Facts: keyless, CORS-enabled, optional ----------------- */
/* cb(results, failed). "No such food" and "no connection" are different problems and
   the user needs to be told which one they have. */
function offSearch(q,cb){
  var url="https://world.openfoodfacts.org/cgi/search.pl?search_terms="
    +encodeURIComponent(q)+"&search_simple=1&action=process&json=1&page_size=6"
    +"&fields=product_name,brands,nutriments,serving_quantity,code";
  var done=false;
  var timer=setTimeout(function(){if(!done){done=true;cb([],true);}},6000);
  fetch(url).then(function(r){return r.json();}).then(function(j){
    if(done)return; done=true; clearTimeout(timer);
    var out=(j.products||[]).map(function(p){
      var nu=p.nutriments||{};
      if(!nu["energy-kcal_100g"])return null;
      return {id:"off_"+(p.code||uid()),n:p.product_name||q,brand:p.brands||"",
        cat:"Branded",per:100,
        kcal:Math.round(nu["energy-kcal_100g"]),
        p:+(nu.proteins_100g||0),c:+(nu.carbohydrates_100g||0),
        f:+(nu.fat_100g||0),fib:+(nu.fiber_100g||0),
        s:[["100 g",100]],a:[],src:"off"};
    }).filter(Boolean);
    cb(out,false);
  }).catch(function(){if(!done){done=true;clearTimeout(timer);cb([],true);}});
}

/* ---- barcodes ---------------------------------------------------------- */
/* A scanned product is remembered so the second scan of the same packet needs no
   network at all. Capped, because this is a convenience cache and not the user's
   own food list — those still live in My Foods and are never evicted. */
var BC_MAX=200;
function normBarcode(code){
  code=String(code==null?"":code).replace(/\D/g,"");
  /* UPC-A is EAN-13 with a leading zero. Storing one form means a packet scanned on
     one device and typed on another still matches. */
  if(code.length===12)code="0"+code;
  return code;
}
function barcodeCache(){ if(!S.barcodes)S.barcodes={}; return S.barcodes; }
function findByBarcode(code){
  code=normBarcode(code);
  if(!code)return null;
  var mine=(S.myFoods||[]).filter(function(f){return f.bc&&normBarcode(f.bc)===code;})[0];
  if(mine)return mine;
  var hit=barcodeCache()[code];
  return hit?hit.f:null;
}
function rememberBarcode(code,food){
  code=normBarcode(code);
  if(!code||!food)return;
  var c=barcodeCache();
  c[code]={at:Date.now(),f:food};
  var keys=Object.keys(c);
  if(keys.length>BC_MAX){
    keys.sort(function(a,b){return (c[a].at||0)-(c[b].at||0);});
    for(var i=0;i<keys.length-BC_MAX;i++)delete c[keys[i]];
  }
}
/* cb(food, failed). Same three outcomes as offSearch: found, genuinely not in the
   database, or could not be reached at all. */
function offBarcode(code,cb){
  code=normBarcode(code);
  var url="https://world.openfoodfacts.org/api/v2/product/"+encodeURIComponent(code)
    +".json?fields=product_name,brands,nutriments,serving_quantity,code";
  var done=false;
  var timer=setTimeout(function(){if(!done){done=true;cb(null,true);}},6000);
  fetch(url).then(function(r){return r.json();}).then(function(j){
    if(done)return; done=true; clearTimeout(timer);
    var p=j&&j.product, nu=(p&&p.nutriments)||{};
    if(!p||j.status!==1||nu["energy-kcal_100g"]==null){cb(null,false);return;}
    cb({id:"off_"+(p.code||code),n:p.product_name||("Barcode "+code),brand:p.brands||"",
      cat:"Branded",per:100,
      kcal:Math.round(nu["energy-kcal_100g"]),
      p:+(nu.proteins_100g||0),c:+(nu.carbohydrates_100g||0),
      f:+(nu.fat_100g||0),fib:+(nu.fiber_100g||0),
      s:[["100 g",100]],a:[],src:"off",bc:code},false);
  }).catch(function(){if(!done){done=true;clearTimeout(timer);cb(null,true);}});
}
/* Local first: a packet scanned before resolves with no network. */
function lookupBarcode(code,cb){
  var local=findByBarcode(code);
  if(local)return cb(local,false,true);
  offBarcode(code,function(food,failed){
    if(food)rememberBarcode(code,food);
    cb(food,failed,false);
  });
}

export {amountLabel, convertItem, defaultUnit, FOODDB, findByBarcode, fuzzyFoods, gramsFor, isLiquid, liquidDensity, loadFoods, lookupBarcode, normBarcode, normFood, nutritionFor, offBarcode, offSearch, parseFoodInput, recalcItem, rememberBarcode, resolveItem, roundQty, sumNutrition, toLogItem, UNITS, unitOf, unitsFor, unitStep};
