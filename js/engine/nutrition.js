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
var UNITS={
  g:1,gram:1,grams:1,gm:1,gr:1,
  kg:1000,kilo:1000,kilos:1000,kilogram:1000,
  ml:1,millilitre:1,milliliter:1,l:1000,litre:1000,liter:1000,
  tbsp:15,tablespoon:15,tablespoons:15,
  tsp:5,teaspoon:5,teaspoons:5,
  cup:240,cups:240,
  scoop:30,scoops:30,slice:0,slices:0,piece:0,pieces:0,can:0,cans:0,
  /* A supplement's own unit: its capsule, softgel or tablet where the food lists one,
     about a gram otherwise. */
  capsule:1,capsules:1,softgel:1,softgels:1,tablet:1,tablets:1
};
var COUNT_WORDS={a:1,an:1,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,
  eight:8,nine:9,ten:10,half:0.5,"1/2":0.5,"quarter":0.25};

/* Measures, as opposed to the countable units above (slice, piece, can), which mean
   whatever the food's own serving of that name says. Mass converts exactly. Volume
   needs the food's density: a cup of water is 240 g, a cup of cooked rice about 160 g
   and a cup of spinach 30 g, so a volume is only offered where the food says what one
   of its cups, spoons or millilitres weighs — or where it is a drink, taken as water.

   Before this, "1 cup rice" logged 240 g whatever the database said a cup weighed, and
   the servings screen had no way to log a drink by volume at all. */
/* mg and mcg are how supplements are dosed: 200 mg of magnesium, 100 mcg of K2. */
var MASS={g:1,kg:1000,oz:28.3495,lb:453.592,mg:0.001,mcg:0.000001};
var VOL={ml:1,l:1000,cup:240,tbsp:15,tsp:5,floz:29.5735};
var UNIT_ALIAS={gram:"g",grams:"g",gm:"g",gms:"g",gr:"g",
  kilo:"kg",kilos:"kg",kilogram:"kg",kilograms:"kg",
  ounce:"oz",ounces:"oz",lbs:"lb",pound:"lb",pounds:"lb",
  milligram:"mg",milligrams:"mg",mgs:"mg",microgram:"mcg",micrograms:"mcg","µg":"mcg",ug:"mcg",
  "i.u.":"iu",ius:"iu",
  millilitre:"ml",milliliter:"ml",millilitres:"ml",milliliters:"ml",mls:"ml",
  litre:"l",liter:"l",litres:"l",liters:"l",
  cups:"cup",tablespoon:"tbsp",tablespoons:"tbsp",teaspoon:"tsp",teaspoons:"tsp",
  "fl oz":"floz",floz:"floz","fluid ounce":"floz","fluid ounces":"floz",
  /* Arabic, as people type it. These arrive folded by norm(). */
  "جرام":"g","جم":"g","كيلو":"kg","مل":"ml","ملي":"ml","لتر":"l","كوب":"cup"};
/* The label a measure is written with. Stored in the log, so it is not translated. */
var UNIT_LABEL={g:"g",kg:"kg",oz:"oz",lb:"lb",ml:"ml",l:"L",cup:"cup",tbsp:"tbsp",tsp:"tsp",floz:"fl oz",mg:"mg",mcg:"mcg",iu:"IU"};
/* What one tap of + or − moves each by: a splash of milk, not a millilitre. */
var UNIT_STEP={g:10,kg:0.1,oz:1,lb:0.25,ml:50,l:0.25,cup:0.25,tbsp:1,tsp:1,floz:1,mg:50,mcg:25,iu:500};
function unitKey(u){
  u=String(u==null?"":u).toLowerCase().replace(/\./g,"").replace(/\s+/g," ").trim();
  return UNIT_ALIAS[u]||u;}
function isMeasure(k){return !!(MASS[k]||VOL[k]);}
function unitLabel(k,qty){
  return k==="cup"&&qty!=null&&qty!==1?"cups":(UNIT_LABEL[k]||k);}
/* Amounts are kept to the precision the unit is read in: whole grams and
   millilitres, hundredths of a litre or a cup, tenths of a spoon. */
function roundUnit(k,v){
  if(k==="g"||k==="ml")return Math.round(v);
  if(k==="kg"||k==="l"||k==="cup"||k==="lb")return Math.round(v*100)/100;
  return Math.round(v*10)/10;}

var DRINK_RE=/\b(coffee|espresso|latte|cappuccino|mocha|americano|macchiato|tea|juice|milk|water|soda|cola|drink|lemonade|smoothie|shake|beer|wine|kefir|ayran|laban|broth|soup|syrup|karkade|hibiscus|sobia|sahlab|tamarind)\b|قهوه|شاي|عصير|لبن|حليب|مياه|ماء|مشروب|شوربه|كركديه|سوبيا|سحلب|تمر هندي|خروب|ينسون|نسكافيه|كابتشينو/;
function isDrink(f){
  if(!f)return false;
  if(f.cat==="Beverages")return true;
  if((f.s||[]).some(function(s){return /\b(ml|glass|mug|bottle|shot)\b/i.test(String(s&&s[0]));}))return true;
  return DRINK_RE.test(normFood(f.n));}
/* Grams per millilitre, read off the food's own servings: "cup" at 245 g is 245/240.
   A drink with no such serving is taken as water. 0 means volume cannot be offered. */
function density(f){
  var s=(f&&f.s)||[];
  for(var i=0;i<s.length;i++){
    var l=String(s[i]&&s[i][0]||"").toLowerCase(),g=+(s[i]&&s[i][1]),m;
    if(!(g>0))continue;
    m=l.match(/(\d+(?:\.\d+)?)\s*ml\b/);
    if(m&&+m[1]>0)return g/parseFloat(m[1]);
    m=l.match(/^(?:(\d+(?:\.\d+)?)\s*)?(cup|tbsp|tsp)s?\b/);
    if(m)return g/((m[1]?parseFloat(m[1]):1)*VOL[m[2]]);
  }
  return isDrink(f)?1:0;}
/* Grams in one of a measure, for this food. */
function unitGrams(f,k){
  if(MASS[k])return MASS[k];
  if(VOL[k])return VOL[k]*(density(f)||1);
  return 0;}
/* The measures the servings screen offers for a food: every mass, and volume only
   with a density — less any spoon or cup the food already lists as a serving. */
function unitsFor(f){
  var own=(f.s||[]).map(function(s){return String(s[0]||"").toLowerCase();});
  var vol=density(f)?Object.keys(VOL).filter(function(k){
    return !own.some(function(l){return new RegExp("^(1\\s*)?"+k+"s?\\b").test(l);});}):[];
  /* mg and mcg are for supplements; nobody weighs chicken in milligrams. */
  var supp=f.cat==="Supplements";
  return {mass:Object.keys(MASS).filter(function(k){return supp||(k!=="mg"&&k!=="mcg");}),vol:vol};}

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

function parseChunk(chunk){
  var q=normFood(chunk);
  if(!q)return null;
  var qty=null,unit=null;

  /* "200g chicken" / "250 ml milk" / "1.5 kg rice" / "8 oz steak" / "330 مل عصير" */
  var m=q.match(/^(\d+(?:\.\d+)?)\s*(kg|kilos?|kilograms?|mg|mgs|milligrams?|mcg|µg|ug|micrograms?|iu|g|gm|gms|gr|grams?|oz|ounces?|lbs?|pounds?|fl oz|ml|mls|millilit(?:re|er)s?|l|litres?|liters?|tbsp|tablespoons?|tsp|teaspoons?|cups?|scoops?|slices?|pieces?|cans?|capsules?|softgels?|tablets?|جرام|جم|كيلو|ملي|مل|لتر|كوب)(?=\s|$)\s*(.*)$/);
  if(m){qty=parseFloat(m[1]);unit=m[2];q=m[3];}
  else{
    /* "3 eggs" / "two bananas" */
    var m2=q.match(/^(\d+(?:\.\d+)?)\s+(.*)$/);
    if(m2){qty=parseFloat(m2[1]);q=m2[2];}
    else{
      var m3=q.match(/^(a|an|one|two|three|four|five|six|seven|eight|nine|ten|half)\s+(.*)$/);
      if(m3){qty=COUNT_WORDS[m3[1]];q=m3[2];}
    }
    /* trailing unit: "chicken 200g" */
    var m4=q.match(/^(.*?)\s+(\d+(?:\.\d+)?)\s*(kg|g|gm|oz|lbs?|fl oz|ml|l|cups?|tbsp|tsp|جرام|جم|كيلو|ملي|مل|لتر|كوب)$/);
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
  /* International units measure a vitamin's effect, not its mass; a dose of D3 weighs
     next to nothing and carries no calories, so it is kept as its dose. */
  if(unit&&unitKey(unit)==="iu")return {g:0,label:fmtIU(qty)+" IU"};
  if(unit){
    /* A measure converts through the food: exactly for mass, by its density for
       volume. Typed volume of a food with no density is taken as water, which is
       what this did for every food before. */
    var k=unitKey(unit);
    if(isMeasure(k))return {g:Math.round(qty*unitGrams(food,k)*10)/10,label:qty+" "+unitLabel(k,qty)};
    /* A countable unit is the food's own serving of that name, where it has one:
       a scoop of this powder, not a generic 30 g. */
    var own=(food.s||[]).filter(function(s){
      return s[1]>0&&normFood(s[0]).indexOf(normFood(unit).replace(/s$/,""))>-1;})[0];
    if(own)return {g:qty*own[1],label:qty+" × "+own[0]};
    var u=UNITS[unit]||UNITS[unit.replace(/s$/,"")];
    if(u&&u>0)return {g:qty*u,label:qty+" "+unit};
  }
  var s=(food.s&&food.s[0])||["100 g",100];
  return {g:qty*s[1],label:qty+" \u00d7 "+s[0]};
}

function fmtIU(q){return String(Math.round(q)).replace(/\B(?=(\d{3})+(?!\d))/g,",");}

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
function recalcItem(it){
  var g=gramsFor(it.food,it.parsed.qty,it.parsed.unit);
  it.grams=g.g; it.label=g.label; it.n=nutritionFor(it.food,g.g);
  return it;}
function toLogItem(it){
  return {fid:it.food.id,n:it.name,label:it.label,grams:it.grams,src:it.src,
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

export {density, FOODDB, findByBarcode, fuzzyFoods, gramsFor, isDrink, isMeasure, loadFoods, lookupBarcode, normBarcode, normFood, nutritionFor, offBarcode, offSearch, parseFoodInput, recalcItem, rememberBarcode, resolveItem, roundUnit, searchFoods, sumNutrition, toLogItem, unitGrams, unitKey, unitLabel, UNIT_STEP, unitsFor};
