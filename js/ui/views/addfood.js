/* Bunyan — add food
   The add-food sheet and the manual-entry sheet: the food group's frames 13:188,
   13:266, 13:337, 13:403 and 13:464, with the state styles from 13:599.

   The frames show two ways in, and this sheet has both:
     Add Food  — search as you type, pick a result, set the servings, add it.
     Quick Add — describe a whole meal in words; it is parsed into items, all added
                 at once. This is the flow the app has always had.
   One sheet, three modes (V.food.mode): "search", "detail" and "quick". */
import {t} from "../../i18n/dict.js";
import {empty} from "../../data/exercises.js";
import {frequentFoods} from "../../engine/formulas.js";
import {density, FOODDB, isMeasure, nutritionFor, searchFoods, sumNutrition, unitGrams, unitKey,
        unitLabel, UNIT_STEP, unitsFor} from "../../engine/nutrition.js";
import {scanSupported} from "../../scan.js";
import {S} from "../../state.js";
import {esc, fmtN, r1} from "../../util.js";
import {seg, V} from "../view.js";
import {MEALS, mealNow} from "./food.js";

/* ---- shared pieces --------------------------------------------------------- */
function pool(){return (S.myFoods||[]).concat(FOODDB||[]);}
function foodById(id){
  var p=pool();
  for(var i=0;i<p.length;i++)if(p[i].id===id)return p[i];
  return null;}
/* The servings a food offers, from its own data, with 100 g always among them so
   anything can be weighed. Exported: app.js reads it when the servings screen adds. */
function isHundred(label){return /^100\s*g$/i.test(String(label||"").trim());}
function servs(f){
  var out=(f.s||[]).filter(function(s){return s&&s[1]>0;});
  if(!out.some(function(s){return isHundred(s[0]);}))out=out.concat([["100 g",100]]);
  return out;}
function fmtCount(n){return n%1?n.toFixed(1):String(n);}
function curMeal(){return (V.sd&&V.sd.meal)||mealNow();}
/* "165 kcal • P: 31g • C: 0g • F: 3.6g" — the frames' result line. */
function macroLine(n,noKcal){
  return (noKcal?"":fmtN(n.kcal)+" kcal  •  ")
   +t("P:")+" "+r1(n.p)+"g  •  "+t("C:")+" "+r1(n.c)+"g  •  "+t("F:")+" "+r1(n.f)+"g";}

/* The frames' header: an optional back chevron, then a title over a subtitle. The
   subtitle is the meal, and it is also where the meal is changed — a native select
   laid invisibly over it, so it reads as the frame's plain text and still opens the
   system picker. The old sheet had a separate meal <select> at the foot instead. */
function afHead(title,opts){
  opts=opts||{};
  var sub=opts.sub;
  if(sub===undefined){
    var meal=curMeal();
    sub='<label class="afmeal">'+(opts.pre?esc(opts.pre)+' ':'')+'<b>'+esc(t(meal))+'</b>'
     +'<span class="ico ico-cdown" aria-hidden="true"></span>'
     +'<select id="afmeal" aria-label="'+esc(t("Meal"))+'">'
     +MEALS.map(function(m){
        return '<option value="'+m+'"'+(m===meal?' selected':'')+'>'+esc(t(m))+'</option>';}).join("")
     +'</select></label>';}
  return '<div class="afhead">'
   +(opts.back?'<button class="icobtn back" '+opts.back+' aria-label="'+esc(t("Back"))+'">'
     +'<span class="ico ico-cleft" aria-hidden="true"></span></button>':'')
   +'<div class="afhead-t"><h2>'+esc(title)+'</h2>'+sub+'</div></div>';}

/* 13:599's states. The shimmer uses the app's existing .skel, so it inherits the
   reduced-motion handling that already exists for it. */
function shimmer(note){
  return '<div class="afshim" aria-busy="true"><div class="skel skelbar" style="width:44%"></div>'
   +'<div class="skel skelbar" style="width:72%"></div>'
   +(note?'<p>'+esc(note)+'</p>':'')+'</div>';}
function errCard(title,body,retry){
  return '<div class="aferr" role="alert"><b>'+esc(title)+'</b>'
   +(body?'<p>'+esc(body)+'</p>':'')
   +'<button class="btn sm" '+retry+'>'+esc(t("Retry"))+'</button></div>';}

/* One result row: the whole row opens the servings screen, the + beside it logs one
   default serving straight away. Two buttons side by side, not one inside another. */
function card(f,pick,add){
  var s=servs(f)[0],n=nutritionFor(f,s[1]);
  return '<div class="afres">'
   +'<button class="afres-b" '+pick+'>'
   +'<span class="afres-n">'+esc(f.n)+' <span>('+esc(s[0])+')</span></span>'
   +'<span class="afres-m">'+macroLine(n)+'</span></button>'
   +(add?'<button class="afadd" '+add+' aria-label="'+esc(t("Add")+" "+f.n)+'">'
     +'<span class="ico ico-plus" aria-hidden="true"></span></button>':'')
   +'</div>';}
function localCards(foods){
  return '<div class="afresults">'+foods.map(function(f){
    return card(f,'data-fpick="'+esc(f.id)+'"','data-quickfood="'+esc(f.id)+'"');}).join("")+'</div>';}

/* ---- Add Food: search (13:188) --------------------------------------------- */
/* Recent is what was logged, newest day first — read from the day records directly.
   dayRec() would create an empty record for every day it was asked about. */
function recentFoods(){
  var seen={},out=[];
  Object.keys(S.days||{}).sort().reverse().slice(0,30).forEach(function(d){
    var r=S.days[d];if(!r||!r.meals)return;
    Object.keys(r.meals).forEach(function(m){
      (r.meals[m].items||[]).forEach(function(it){
        if(!it.fid||seen[it.fid])return;
        seen[it.fid]=1;
        var f=foodById(it.fid);if(f)out.push(f);});});});
  return out.slice(0,20);}

function searchHome(){
  var h="",fq=frequentFoods(5);
  if(fq.length)h+='<div class="afpills">'+fq.map(function(f){
    return '<button class="afpill" data-fpick="'+esc(f.id)+'">'+esc(f.n)+'</button>';}).join("")+'</div>';
  /* The way into Quick Add. The frames show it as its own screen but not how it is
     reached, so it is the first thing under an empty search. */
  h+='<button class="afquick" data-fmode="quick">'
   +'<span class="ico ico-edit" aria-hidden="true"></span>'
   +'<span class="afquick-t"><b>'+esc(t("Quick Add"))+'</b>'
   +'<span>'+esc(t("Describe a whole meal"))+' — “'+esc(t("3 eggs, 2 brown toast"))+'”</span></span>'
   +'<span class="ico ico-chev" aria-hidden="true"></span></button>';
  return h;}

function results(q){
  var st=V.food||{},hits=searchFoods(q,20).map(function(x){return x.f;});
  var off=(st.off&&st.off.q===q)?st.off.list:null;
  var h='<div class="aflbl">'+esc(t("Results for"))+' <span class="afq-echo">“'+esc(q)+'”</span></div>';
  if(hits.length)h+=localCards(hits);
  if(st.offBusy)h+=shimmer(t("Checking Open Food Facts…"));
  else if(st.offFail)h+=errCard(t("Unable to load nutrition data"),
    t("Open Food Facts could not be reached. The built-in database still works."),'data-offq="1"');
  else if(off){
    if(off.length)h+='<div class="aflbl">'+esc(t("From Open Food Facts"))+'</div><div class="afresults">'
      +off.map(function(f,i){return card(f,'data-fpickoff="'+i+'"','data-fadd1off="'+i+'"');}).join("")
      +'</div>';
    else h+='<p class="afnote">'+esc(t("Nothing on Open Food Facts for that either."))+'</p>';}
  if(!hits.length&&!off&&!st.offBusy&&!st.offFail)
    h+=empty("search",t("Nothing matches")+" “"+q+"”",
      t("It may be under another name, or not in the built-in database."),"");
  /* After a failed attempt the error card's own Retry is the way to try again, so the
     second online button would only repeat it. Manual entry stays either way. */
  if(!off&&!st.offBusy)
    h+='<div class="afmore2">'
     +(st.offFail?'':'<button class="btn g" data-offq="1">'+esc(t("Search online"))+'</button>')
     +'<button class="btn g" data-manual="'+esc(q)+'">'+esc(t("Enter it manually"))+'</button></div>';
  return h;}

function customTab(){
  var mine=(S.myFoods||[]).slice().reverse();
  var h='<button class="btn g afcreate" data-manual="">+ '+esc(t("Create custom food"))+'</button>';
  if(!mine.length)return h+empty("search",t("No custom foods yet"),
    t("Anything you enter by hand and save lands here, ready to log again in one tap."),"");
  return h+localCards(mine);}

/* Laid out as a search sheet (see .srch in index.html): the title, the field and the
   four tabs stay put, and only what is under them scrolls. */
function vSearch(){
  var st=V.food||{},q=(st.sq||"").trim(),tab=st.tab||"search";
  var h='<div class="srch-top"><div class="srch-title">'+afHead(t("Add Food"))+'</div>';
  h+='<div class="afq"><span class="ico ico-search" aria-hidden="true"></span>'
   +'<input id="fq" type="search" placeholder="'+esc(t("Search food or scan barcode"))+'" value="'+esc(st.sq||"")+'"'
   +' autocapitalize="none" autocorrect="off" autocomplete="off" spellcheck="false" enterkeyhint="search" aria-label="'+esc(t("Search food"))+'">'
   +(st.sq?'<button class="libq-x" data-clearfq="1" aria-label="'+esc(t("Clear"))+'">\u2715</button>':'')
   /* The frame's camera sits inside the field. Where the browser cannot decode a
      barcode, the same button opens the typed-barcode prompt instead. */
   +'<button class="afcam" '+(scanSupported()?'data-scan="1"':'data-typecode="1"')
   +' aria-label="'+esc(t(scanSupported()?"Scan barcode":"Enter barcode"))+'">'
   +'<span class="ico ico-camera" aria-hidden="true"></span></button></div>';
  var TABS=[["search","Search"],["recent","Recent"],["frequent","Frequent"],["custom","Custom"]];
  h+=seg({items:TABS.map(function(x){return [x[0],t(x[1])];}),value:tab,attr:"ftab",
    tabs:true,soft:true,cls:"aftabs",label:t("Find food"),key:"aftabs"});
  h+='</div><div class="srch-body">';
  /* A barcode lookup runs from this screen, so its states show here. */
  if(st.busy)h+=shimmer(t("Checking the online food database…"));
  else if(st.bcFail)h+=errCard(t("Unable to load nutrition data"),
    t("The barcode could not be looked up. Check the connection and try again."),
    'data-bc="'+esc(st.bcFail)+'"');
  if(tab==="search")h+=q?results(q):searchHome();
  else if(tab==="recent"){var rf=recentFoods();
    h+=rf.length?localCards(rf):empty("search",t("Nothing logged recently"),
      t("Foods you log show up here, most recent first."),"");}
  else if(tab==="frequent"){var ff=frequentFoods(20);
    h+=ff.length?localCards(ff):empty("search",t("Nothing frequent yet"),
      t("The foods you log most often collect here."),"");}
  else h+=customTab();
  return h+'</div>';}

/* ---- Add Food: one food, its servings (13:266) ------------------------------ */
/* What the servings screen will log: grams and the label the log keeps. A picked
   measure (V.food.pick.u) is an amount in that unit; otherwise it is a count of the
   chosen serving. Exported so the add handler and this screen cannot disagree. */
var VOLUME={ml:1,l:1,cup:1,tbsp:1,tsp:1,floz:1};
function pickAmount(p){
  if(p.u)return {g:Math.round(unitGrams(p.food,p.u)*p.amt*10)/10,
                 label:fmtCount(p.amt)+" "+unitLabel(p.u,p.amt),measure:true};
  var sv=servs(p.food),s=sv[p.si]||sv[0];
  return {g:s[1]*p.n,label:fmtCount(p.n)+" × "+s[0],measure:false};}
/* The unit names as the chooser shows them; the log keeps the plain symbol. */
var UNAME={g:"grams (g)",kg:"kilograms (kg)",oz:"ounces (oz)",lb:"pounds (lb)",
  ml:"millilitres (ml)",l:"litres (L)",cup:"cups (240 ml)",tbsp:"tablespoons (15 ml)",
  tsp:"teaspoons (5 ml)",floz:"fluid ounces (fl oz)"};
function vDetail(){
  var p=V.food.pick,f=p.food,sv=servs(f),s=sv[p.si]||sv[0],am=pickAmount(p),g=am.g,n=nutritionFor(f,g);
  var us=unitsFor(f);
  var h=afHead(f.n,{back:'data-fback="1"',pre:t("Add to")});
  h+='<div class="afmono"><div class="afmono-k">'+esc(t("Total calories"))+'</div>'
   +'<div class="afmono-v">'+fmtN(n.kcal)+'</div><div class="afmono-u">kcal</div>'
   +'<div class="afmono-m">'
   +'<div><b>'+r1(n.p)+'g</b><span>'+esc(t("PRO"))+'</span></div>'
   +'<div><b>'+r1(n.c)+'g</b><span>'+esc(t("CARB"))+'</span></div>'
   +'<div><b>'+r1(n.f)+'g</b><span>'+esc(t("FAT"))+'</span></div></div></div>';
  /* One chooser for everything the amount can be measured in: the food's own
     servings, then weights, then volumes where the food has a density. A coffee can
     be logged as a mug, as 330 ml or as 0.33 L, and each converts through the same
     density rather than being assumed to be grams. */
  var dens=density(f);
  h+='<div class="aflbl">'+esc(t("Serving size"))+'</div>'
   +'<label class="afsel"><b class="afsel-v">'
   +(p.u?esc(t(UNAME[p.u]))
     :esc(s[0])+(isHundred(s[0])?'':' <i>· '+Math.round(s[1])+' g</i>'))+'</b>'
   +'<span class="ico ico-cdown" aria-hidden="true"></span>'
   +'<select id="afsrv" aria-label="'+esc(t("Serving size"))+'">'
   +'<optgroup label="'+esc(t("Servings"))+'">'
   +sv.map(function(x,i){
      return '<option value="s'+i+'"'+(!p.u&&i===p.si?' selected':'')+'>'+esc(x[0])
       +(isHundred(x[0])?'':' ('+Math.round(x[1])+' g)')+'</option>';}).join("")
   +'</optgroup><optgroup label="'+esc(t("Weight"))+'">'
   +us.mass.map(function(k){
      return '<option value="u'+k+'"'+(p.u===k?' selected':'')+'>'+esc(t(UNAME[k]))+'</option>';}).join("")
   +'</optgroup>'
   +(us.vol.length?'<optgroup label="'+esc(t("Volume"))+'">'
     +us.vol.map(function(k){
        return '<option value="u'+k+'"'+(p.u===k?' selected':'')+'>'+esc(t(UNAME[k]))+'</option>';}).join("")
     +'</optgroup>':'')
   +'</select></label>';
  if(p.u){
    /* An amount in the chosen unit, typed or stepped. The patcher leaves a focused
       field's value alone, so a redraw never overwrites what is being typed. */
    var st=UNIT_STEP[p.u];
    h+='<label class="aflbl" for="afamt">'+esc(t("Amount"))+'</label>'
     +'<div class="afstep">'
     +'<button class="afstep-m" data-fcount="-1" aria-label="'+esc(t("Less"))+'"'
     +(p.amt<=st?' disabled':'')+'>−</button>'
     +'<span class="afamt"><input id="afamt" type="number" inputmode="decimal" min="0" step="any"'
     +' value="'+p.amt+'" style="width:'+fitCh(p.amt,"0")+'ch" autocomplete="off">'
     +'<i>'+esc(t(unitLabel(p.u,p.amt)))+'</i></span>'
     +'<button class="afstep-p" data-fcount="1" aria-label="'+esc(t("More"))+'">+</button></div>';
    /* Say what a volume was taken as, so a litre of oil does not quietly log as a
       kilogram. */
    if(VOLUME[p.u])h+='<p class="afnote afconv">≈ '+fmtN(g)+' g · '
      +(Math.abs(dens-1)>0.02?(Math.round(dens*100)/100)+' '+esc(t("g per ml"))
        :esc(t("taken as water, 1 g per ml")))+'</p>';
  }else{
    h+='<div class="aflbl">'+esc(t("Number of servings"))+'</div>'
     +'<div class="afstep">'
     +'<button class="afstep-m" data-fcount="-1" aria-label="'+esc(t("Less"))+'"'
     +(p.n<=0.5?' disabled':'')+'>−</button>'
     +'<b aria-live="polite">'+fmtCount(p.n)+'</b>'
     +'<button class="afstep-p" data-fcount="1" aria-label="'+esc(t("More"))+'">+</button></div>';}
  /* The frame's row says "Fiber, Sodium…". This database has fibre and not sodium, so
     it says what it has. */
  h+='<button class="afmore" data-fmore="1" aria-expanded="'+(p.more?"true":"false")+'">'
   +'<span class="ico ico-info" aria-hidden="true"></span><span>'+esc(t("More nutrients"))+'</span>'
   +'<span class="ico ico-plus" aria-hidden="true"></span></button>';
  if(p.more){
    var per=nutritionFor(f,f.per||100);
    h+='<div class="afmore-b">'
     +'<div><span>'+esc(t("Fibre"))+'</span><b>'+r1(n.fib)+' g</b></div>'
     +'<div><span>'+esc(t("Weight"))+'</span><b>'+(p.u&&VOLUME[p.u]?esc(am.label)+' ≈ ':'')+Math.round(g)+' g</b></div>'
     +'<div><span>'+esc(t("Per 100 g"))+'</span><b>'+fmtN(per.kcal)+' kcal · '+macroLine(per,true)+'</b></div>'
     +(f.src==="off"?'<div><span>'+esc(t("Source"))+'</span><b>Open Food Facts</b></div>'
      :f.src==="you"?'<div><span>'+esc(t("Source"))+'</span><b>'+esc(t("Your food"))+'</b></div>':'')
     +'</div>';}
  h+='<button class="btn afcta" data-faddpick="1">'+esc(t("Add to"))+' '+esc(t(curMeal()))+'</button>';
  return h;}

/* ---- Quick Add (13:337, 13:403) --------------------------------------------- */
/* Every control carries the item's index in V.food.items. It used to carry its
   position among the recognised items only, which is a different number whenever an
   unrecognised line comes first — and the handlers index the whole list, so editing
   one food changed another. */
function itemCard(it,idx){
  var ed=V.food.edit===idx,est=it.src==="est",amb=it.status==="ambiguous";
  var h='<div class="afitem'+(est||amb?' warn':'')+'" data-k="fi:'+idx+'">'
   +'<div class="afitem-r"><div class="afitem-t">'
   +'<div class="afitem-n">'+esc(it.name)+' <span>('+esc(it.label)+')</span></div>'
   +'<div class="afitem-m">'+macroLine(it.n)+'</div>'
   +(est?'<div class="afwarn tag"><span class="ico ico-warn" aria-hidden="true"></span>'
     +esc(t("Estimated values only"))+'</div>':'')
   +(amb?'<div class="afwarn"><span class="ico ico-warn" aria-hidden="true"></span>'
     +esc(t("Not certain this is the right match."))+'</div>':'')
   +'</div><button class="afedit" data-fedit="'+idx+'" aria-expanded="'+(ed?"true":"false")+'"'
   +' aria-label="'+esc(t("Edit")+" "+it.name)+'"><span class="ico ico-edit" aria-hidden="true"></span></button></div>';
  /* The amount reads in the unit it was typed in — "330 ml", not "330 g" — and the
     unit can be changed here, converting through the food so the amount is kept. */
  var uk=unitKey(it.parsed&&it.parsed.unit),meas=isMeasure(uk),qn=it.parsed&&it.parsed.qty!=null?it.parsed.qty:1;
  if(ed){
    var us=unitsFor(it.food),vl=us.vol.slice();
    /* Typed as a volume the chooser would not offer — a cup of something that lists
       its cup as a serving — it is still shown as what was typed. */
    if(VOLUME[uk]&&vl.indexOf(uk)<0)vl.push(uk);
    h+='<div class="fqty afitem-q">'
     +'<button class="btn g sm" data-qty="'+idx+'|-1" aria-label="'+esc(t("Less"))+'">−</button>'
     +'<button class="fqty-v" data-gram="'+idx+'" aria-label="'+esc(t(meas&&uk!=="g"?"Set amount":"Set grams"))+'">'
     +(meas&&uk!=="g"?fmtCount(qn)+' '+esc(t(unitLabel(uk,qn))):Math.round(it.grams)+' g')+'</button>'
     +'<button class="btn g sm" data-qty="'+idx+'|1" aria-label="'+esc(t("More"))+'">+</button></div>'
     +'<label class="afsel afunit"><span class="afunit-k">'+esc(t("Measured in"))+'</span>'
     +'<b class="afsel-v">'+esc(meas?t(UNAME[uk]):t("Servings"))+'</b>'
     +'<span class="ico ico-cdown" aria-hidden="true"></span>'
     +'<select data-qunit="'+idx+'" aria-label="'+esc(t("Measured in"))+'">'
     +'<option value=""'+(meas?'':' selected')+'>'+esc(t("Servings"))+' — '+esc(servs(it.food)[0][0])+'</option>'
     +'<optgroup label="'+esc(t("Weight"))+'">'
     +us.mass.map(function(k){return '<option value="'+k+'"'+(uk===k?' selected':'')+'>'+esc(t(UNAME[k]))+'</option>';}).join("")
     +'</optgroup>'
     +(vl.length?'<optgroup label="'+esc(t("Volume"))+'">'
       +vl.map(function(k){return '<option value="'+k+'"'+(uk===k?' selected':'')+'>'+esc(t(UNAME[k]))+'</option>';}).join("")
       +'</optgroup>':'')
     +'</select></label>'
     /* "Set grams" used to sit here as well, a second copy of the amount button. */
     +'<div class="facts">'
     +(it.alts&&it.alts.length>1?'<button data-swapfood="'+idx+'">'+esc(t("Change"))+'</button>':'')
     +'<button class="danger" data-dropitem="'+idx+'">'+esc(t("Remove"))+'</button></div>';}
  return h+'</div>';}

function unknownCard(it){
  return '<div class="afunk">'
   +'<div class="afunk-r"><span class="ico ico-warn" aria-hidden="true"></span><div class="afunk-t">'
   +'<div class="afunk-n">“'+esc(it.parsed.raw)+'”</div>'
   +'<div class="afunk-s">'+esc(t("We couldn’t calculate this yet"))+'</div></div></div>'
   +'<div class="afunk-a">'
   /* Add details puts the cursor on this phrase in the box above, so more can be
      typed about it — the brand, a serving, what is in it — and it is parsed again. */
   +'<button class="afunk-p" data-adddetail="'+esc(it.parsed.raw)+'">'+esc(t("Add details"))+'</button>'
   +'<button data-online="'+esc(it.parsed.query)+'">'+esc(t("Try again"))+'</button>'
   +'<button data-manual="'+esc(it.parsed.raw)+'">'+esc(t("Enter manually"))+'</button></div></div>';}

function vQuick(){
  var st=V.food||{},items=st.items||[],meal=curMeal();
  var known=items.filter(function(i){return i.status!=="unknown"&&i.status!=="suggest";});
  var lost=items.filter(function(i){return i.status==="unknown";});
  /* The frame's subtitle reads "AI Natural Language". This parser is a set of local
     rules, not a model — it is free and it works offline, which is the point of it —
     so the subtitle is the meal, as on every other food screen. */
  var h=afHead(t("Quick Add"),{back:'data-fmode="search"'});
  h+='<label class="aflbl" for="nlq">'+esc(t("Describe your meal"))+'</label>'
   +'<textarea id="nlq" class="afnl'+(lost.length?' warn':'')+'" rows="3"'
   +' placeholder="'+esc(t("3 eggs, 2 brown toast"))+'" autocapitalize="none" autocorrect="off">'
   +esc(st.q||"")+'</textarea>'
   +'<button class="btn g afparse" data-parse="1">'+esc(t("Find it"))+'</button>';
  if(items.length){
    if(lost.length)h+='<p class="afstat warn"><span class="ico ico-warn" aria-hidden="true"></span>'
      +esc(t("Partially parsed."))+' '+lost.length+' '
      +esc(t(lost.length===1?"item unknown.":"items unknown."))+'</p>';
    else if(known.length)h+='<p class="afstat ok"><span class="ico ico-check" aria-hidden="true"></span>'
      +esc(t("Found"))+' '+known.length+' '+esc(t(known.length===1?"item":"items"))+'</p>';}
  if(st.busy)h+=shimmer(t("Checking the online food database…"));
  else if(st.offline)h+=errCard(t("Unable to load nutrition data"),
      t("Bunyan works offline, but branded products come from Open Food Facts. Your own foods and the built-in database still work."),
      'data-online="'+esc(st.offline)+'"')
     +'<button class="btn g" data-manual="'+esc(st.offline)+'">'+esc(t("Enter it manually"))+'</button>';
  else if(st.noresult)h+=empty("search",t("Nothing found online"),
      t("Open Food Facts has no product under that name. Enter the numbers off the packet and Bunyan will remember it."),
      '<button class="btn" data-manual="'+esc(st.noresult)+'">'+esc(t("Enter it manually"))+'</button>');
  /* A near miss is offered, never taken: a wrong food quietly corrupts the day. */
  items.forEach(function(it,idx){
    if(it.status!=="suggest")return;
    h+='<div class="aflbl">'+esc(t("Did you mean"))+'… <span class="afq-echo">“'
     +esc(it.parsed.query)+'”</span></div><div class="afresults">'
     +(it.alts||[]).map(function(f,k){
        return '<div class="afres"><button class="afres-b" data-choose="'+idx+'|'+k+'">'
         +'<span class="afres-n">'+esc(f.n)+'</span>'
         +'<span class="afres-m">'+fmtN(f.kcal)+' kcal / 100 g</span></button></div>';}).join("")
     +'</div><button class="btn g sm afnone" data-dropitem="'+idx+'">'+esc(t("None of these"))+'</button>';});
  if(known.length){
    h+='<div class="aflbl">'+esc(t("Recognized foods"))+'</div>';
    known.forEach(function(it){h+=itemCard(it,items.indexOf(it));});}
  lost.forEach(function(it){h+=unknownCard(it);});
  if(known.length){
    var tot=sumNutrition(known.map(function(i){return i.n;}));
    h+='<div class="aftotal"><b>'+esc(t("Total"))+' ('+fmtN(tot.kcal)+' kcal)</b>'
     +'<span>'+macroLine(tot,true)+'</span></div>'
     +'<button class="btn afcta" data-commit="1">'
     +esc(lost.length?t("Add recognized items"):t("Add all to")+" "+t(meal))+'</button>'
     +'<button class="btn g" data-savemeal="1">'+esc(t("Save this as a meal"))+'</button>';}
  return h;}

function vAddFood(){
  var st=V.food||{};
  var mode=st.mode||((st.items&&st.items.length)?"quick":"search");
  if(mode==="detail"&&st.pick)return vDetail();
  if(mode==="quick")return vQuick();
  return vSearch();}

/* ---- Enter manually (13:464) ------------------------------------------------- */
/* An input as wide as what is in it, so its unit sits beside the number the way the
   frames draw "450 kcal" — stretched to fill, the unit drifted to the far edge. The
   input handler in app.js keeps it fitted while typing. */
function fitCh(val,ph){
  return Math.max(String(val==null?"":val).length,String(ph||"").length,1)+0.6;}
function tile(id,label,unit,val,ph,mode){
  return '<label class="aftile" for="'+id+'">'+'<span class="aftile-k">'+esc(label)+'</span>'
   +'<span class="aftile-v"><input id="'+id+'" type="number" inputmode="'+mode+'" style="width:'+fitCh(val,ph)+'ch"'
   +' placeholder="'+esc(ph)+'" value="'+esc(val==null?"":String(val))+'">'
   +'<i>'+esc(unit)+'</i></span></label>';}
function vManual(){
  var mf=V.sd||{},meal=mf.meal||mealNow();
  var h=afHead(t("Enter manually"),{back:'data-fbackadd="1"',
    sub:'<span class="afsub">'+esc(t("Create custom food"))+'</span>'});
  if(mf.bc)h+='<p class="afnote">'+esc(t("Barcode"))+' <span class="num">'+esc(mf.bc)+'</span> — '
    +esc(t("saving this to your foods will make it scan offline next time."))+'</p>';
  h+='<label class="aflbl" for="mf_n">'+esc(t("Food name"))+'</label>'
   +'<input id="mf_n" class="affield" placeholder="'+esc(t("Food name"))+'" value="'+esc(mf.name||"")+'">'
   +'<label class="aflbl" for="mf_s">'+esc(t("Serving size"))+'</label>'
   +'<input id="mf_s" class="affield" placeholder="'+esc(t("1 serving"))+'" value="'+esc(mf.s||"")+'">'
   +'<div class="aflbl">'+esc(t("Macronutrients"))+'</div>'
   +'<div class="aftiles">'
   +tile("mf_k",t("Calories"),"kcal",mf.k,t("Auto"),"numeric")
   +tile("mf_p",t("Protein"),"g",mf.p,"0","decimal")
   +tile("mf_c",t("Carbs"),"g",mf.c,"0","decimal")
   +tile("mf_f",t("Fat"),"g",mf.f,"0","decimal")
   +'</div><p class="afnote">'+esc(t("Leave calories blank and Bunyan works them out from the macros."))+'</p>'
   /* One button and a switch, as the frame has it, in place of two buttons that did
      the same thing except for one side effect. The label follows the switch. */
   +'<label class="aftoggle"><span>'+esc(t("Save to My Foods"))+'</span>'
   +'<input type="checkbox" id="mf_save" role="switch" checked><i aria-hidden="true"></i></label>'
   +'<button class="btn afcta" id="mf_go" data-savemanual="1">'
   +esc(t("Save and add to"))+' '+esc(t(meal))+'</button>';
  return h;}

export {afHead, fitCh, pickAmount, tile as afTile, servs, vAddFood, vManual};
