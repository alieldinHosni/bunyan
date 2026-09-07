/* Bunyan — nutrition
   Food database, natural-language parsing and macro maths. */
import {S} from "../state.js";
import {num, uid} from "../util.js";

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
  scoop:30,scoops:30,slice:0,slices:0,piece:0,pieces:0,can:0,cans:0
};
var COUNT_WORDS={a:1,an:1,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,
  eight:8,nine:9,ten:10,half:0.5,"1/2":0.5,"quarter":0.25};

/* Arabic goes wrong by character variant, not by transposition: people type \u0647 for \u0629,
   \u0627 for \u0623, \u064A for \u0649, and skip the marks entirely. Folding those away before any
   comparison catches more real mistyping than edit distance does, and costs nothing.
   \u0629 only ever appears at the end of a word, so folding it everywhere is the same rule
   stated more simply. */
function arFold(s){
  return s
    .replace(/[\u064B-\u0652\u0670\u0640]/g,"")   /* tashkeel and tatweel */
    .replace(/[\u0623\u0625\u0622\u0671]/g,"\u0627")  /* \u0623 \u0625 \u0622 \u0671 -> \u0627 */
    .replace(/\u0649/g,"\u064A")                  /* \u0649 -> \u064A */
    .replace(/\u0624/g,"\u0648").replace(/\u0626/g,"\u064A")
    .replace(/\u0629/g,"\u0647");                 /* \u0629 -> \u0647 */
}
function normFood(str){
  return arFold(String(str||"").toLowerCase()
    .replace(/[^\w\s\u0600-\u06FF/]/g," ")
    .replace(/\s+/g," ").trim());
}

/* ---- typo tolerance --------------------------------------------------
   Levenshtein, abandoned as soon as the whole row is past the tolerance, so a
   873-name sweep stays cheap. It only ever runs when the ordinary search found
   nothing at all. */
function editDist(a,b,max){
  var la=a.length,lb=b.length;
  if(Math.abs(la-lb)>max)return max+1;
  if(!la)return lb;if(!lb)return la;
  var prev=new Array(lb+1),cur=new Array(lb+1),i,j;
  for(j=0;j<=lb;j++)prev[j]=j;
  for(i=1;i<=la;i++){
    cur[0]=i;var best=i;
    for(j=1;j<=lb;j++){
      var c=a.charAt(i-1)===b.charAt(j-1)?0:1;
      cur[j]=Math.min(prev[j]+1,cur[j-1]+1,prev[j-1]+c);
      if(cur[j]<best)best=cur[j];
    }
    if(best>max)return max+1;
    var tmp=prev;prev=cur;cur=tmp;
  }
  return prev[lb];
}
/* One edit for a short word, three for a long one: a fixed threshold either misses
   "chiken" or matches half the database. */
function fuzzTol(len){return len<=4?1:len<=7?2:3;}
function namesOf(food){return [food.n].concat(food.a||[]).map(normFood);}

function fuzzyFoods(q,limit){
  q=normFood(q);
  if(q.length<3)return [];
  var tol=fuzzTol(q.length);
  var pool=(S.myFoods||[]).concat(FOODDB||[]),out=[];
  for(var i=0;i<pool.length;i++){
    var names=namesOf(pool[i]),best=tol+1;
    for(var j=0;j<names.length&&best>0;j++){
      var n=names[j];if(!n)continue;
      var d=editDist(q,n,tol);
      if(d<best)best=d;
      /* Also against each word, so a one-word typo finds a two-word food. */
      var w=n.split(" ");
      if(w.length>1)for(var k=0;k<w.length;k++){
        if(Math.abs(w[k].length-q.length)>tol)continue;
        var dw=editDist(q,w[k],tol);
        if(dw<best)best=dw;
      }
    }
    if(best<=tol)out.push({f:pool[i],dist:best});
  }
  out.sort(function(a,b){return a.dist-b.dist||a.f.n.length-b.f.n.length;});
  return out.slice(0,limit||5);
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

  /* "200g chicken" / "250 ml milk" / "1.5 kg rice" */
  var m=q.match(/^(\d+(?:\.\d+)?)\s*(kg|g|gm|gr|grams?|ml|l|litres?|liters?|tbsp|tablespoons?|tsp|teaspoons?|cups?|scoops?|slices?|pieces?|cans?)\b\s*(.*)$/);
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
    var m4=q.match(/^(.*?)\s+(\d+(?:\.\d+)?)\s*(kg|g|ml|l)$/);
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
    var u=UNITS[unit]||UNITS[unit.replace(/s$/,"")];
    if(u&&u>0)return {g:qty*u,label:qty+" "+unit};
    /* countable units fall through to the food's own servings */
  }
  var s=(food.s&&food.s[0])||["100 g",100];
  if(unit){
    for(var i=0;i<(food.s||[]).length;i++){
      var lbl=normFood(food.s[i][0]);
      if(lbl.indexOf(normFood(unit).replace(/s$/,""))>-1){s=food.s[i];break;}
    }
  }
  return {g:qty*s[1],label:qty+" \u00d7 "+s[0]};
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

export {FOODDB, findByBarcode, fuzzyFoods, gramsFor, loadFoods, lookupBarcode, normBarcode, normFood, nutritionFor, offBarcode, offSearch, parseFoodInput, recalcItem, rememberBarcode, resolveItem, sumNutrition, toLogItem, UNITS};
