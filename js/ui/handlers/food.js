/* Bunyan — food
   Food: the day, its meals and water, adding food every way (search, scan, typing a
   meal, by hand), the meal plan and a plan brought in, saved meals and your own foods,
   and the targets. */
import {day} from "../../data/splits.js";
import {addItems, macroKcal, macroTargets} from "../../engine/formulas.js";
import {importName, mealName, mealSlots, mealStyle, newSlot, ownSlot, ownSlots, planOf, setStyle, slotOf} from "../../engine/meals.js";
import {FOODDB, gramsFor, isMeasure, loadFoods, lookupBarcode, normBarcode, nutritionFor, offSearch, parseFoodInput, recalcItem, resolveItem, roundUnit, toLogItem, UNIT_STEP, unitKey, unitLabel} from "../../engine/nutrition.js";
import {parsePlan} from "../../engine/planparse.js";
import {t} from "../../i18n/dict.js";
import {startScan} from "../../scan.js";
import {dayRec, S, saveDB} from "../../state.js";
import {toDisp, toKg} from "../../units.js";
import {num, r1, today, uid} from "../../util.js";
import {ACT, askConfirm, askText, closeSheet, openSheet, val} from "../actions.js";
import {leave} from "../motion.js";
import {goBack, pushNav} from "../nav.js";
import {render} from "../render.js";
import {curDate, mealNow, play, toast, V} from "../view.js";
import {pickAmount, servs} from "../views/addfood.js";
import {savedById} from "../views/food.js";
import {pcAfter, slotsFrom, topOfResults, withNotes} from "./common.js";
import {has, key, on} from "./registry.js";

/* Logs one food to the add-food sheet's meal and closes it. The single path for the
   servings screen, the + beside a result, an Open Food Facts result and the
   frequent-food pills — which all had, or would have had, their own copy. With no
   sheet open (the dashboard's pills) the meal is the time of day's. */
function logFood(food,grams,label){
  var meal=(V.sheet==="addfood"&&V.sd&&V.sd.meal)||mealNow(),n=nutritionFor(food,grams);
  var day=!intoPlan(),where=addTo(meal,[{fid:food.id,n:food.n,label:label,grams:grams,src:food.src||"db",
    kcal:n.kcal,p:n.p,c:n.c,f:n.f,fib:n.fib}]);
  if(V.sheet)closeSheet();
  if(day)V.tab="food";render();play("set");
  toast(food.n+" "+t("added to")+" "+where+".");}
/* Where an add from the sheet lands: the day's meal, or — when the sheet was opened
   from a saved meal in My Foods — that saved meal, in the same amounts. Returns the
   name the toast should say. */
/* The add-food sheet is filling a plan (a saved meal, a meal's plan, an import under
   review) rather than the day: those live in Coach, and the sheet closes back onto them. */
function intoPlan(){
  return !!(V.sheet==="addfood"&&V.sd&&(V.sd.into||V.sd.plan||(V.sd.pimp!=null&&V.pparse)));}
function addTo(meal,items,d){
  /* Into a meal of a plan still being imported (the review screen's draft). Found from
     a line that matched nothing, the line is crossed off as it is found. */
  if(V.sheet==="addfood"&&V.sd&&V.sd.pimp!=null&&V.pparse){
    var pm=V.pparse[+V.sd.pimp];
    if(pm){pm.items=pm.items.concat(items);
      if(V.sd.ptodo!=null){pm.todo.splice(+V.sd.ptodo,1);V.sd.ptodo=null;}
      return importName(pm,+V.sd.pimp);}}
  var into=V.sheet==="addfood"&&V.sd&&V.sd.into?savedById(V.sd.into):null;
  if(into){items.forEach(function(i){into.items.push(i);});saveDB();return into.name;}
  /* Into a meal's plan, from Food → Plan. Found from a line an import could not match,
     the line is crossed off as it is found. */
  var plan=V.sheet==="addfood"&&V.sd&&V.sd.plan?ownSlot(V.sd.plan):null;
  if(plan){
    plan.plan=(plan.plan||[]).concat(items);
    if(V.sd.todo!=null&&plan.todo){plan.todo.splice(+V.sd.todo,1);if(!plan.todo.length)delete plan.todo;V.sd.todo=null;}
    saveDB();return t("the plan for")+" "+mealName(plan.id);}
  addItems(meal,items,d||curDate());return mealName(meal);}
/* ---- barcodes ----------------------------------------------------------- */
/* Scanning and typing converge here, so both behave identically from this point on.
   Order matters: anything scanned before resolves with no network at all. */
function onBarcode(code){
  code=normBarcode(code);
  if(!code){toast(t("That barcode could not be read."));return;}
  if(V.sheet!=="addfood")openSheet("addfood",{meal:(V.sd&&V.sd.meal)||mealNow()});
  if(!V.food)V.food={mode:"search",tab:"search",sq:"",q:"",items:null,edit:-1};
  /* The camera is in the search field now, so a lookup runs on the search screen and
     its busy and failed states show there. */
  V.food.mode="search";V.food.busy=true;V.food.bcFail=false;render();
  lookupBarcode(code,function(food,failed,local){
    V.food.busy=false;
    if(failed){
      V.food.bcFail=code;render();
      toast(t("Could not reach the food database."));return;}
    if(!food){
      /* Not a failure of the scan: the product simply is not in the database. Hand
         the barcode to manual entry so saving it teaches this device. */
      render();
      toast(t("That product is not in the database yet."));
      openSheet("manual",{name:"",bc:code,meal:(V.sd&&V.sd.meal)||mealNow()});return;}
    /* A scanned packet is one product, which is exactly what the servings screen is
       for. It used to be pushed into the Quick Add list with grams set to the whole
       object gramsFor() returns — {g:100,label:"100 g"} rather than 100 — so the card
       read "NaN g" and the log stored an object as the weight. */
    V.food.pick={food:food,si:0,n:1,u:null,amt:null,more:false,from:"search"};
    V.food.mode="detail";
    saveDB();render();
    play("set");
    toast(food.n+(local?" · "+t("remembered on this device"):""));
  });
}

function openBarcodePrompt(){
  askText({title:t("Enter barcode"),label:t("Barcode"),
    body:t("The digits printed under the bars on the packet."),
    ph:"5000112637922",numeric:true,cta:t("Look it up"),act:"barcode"});
}

/* What this module answers. app.js calls register() once, at boot, in the order
   the branches are tried in (see registry.js). */
function register(){
  /* Deleting a progress photo. Asked first: the photo is on this phone only, so there
     is nothing to undo from. */
  /* A meal of the day, added or renamed from Food → Plan. A blank name numbers it by its
     place; a name that is just what it would be called anyway is not stored, so a
     numbered meal keeps renumbering itself when the meals around it move. */
  ACT.addslot=function(name){newSlot(name);saveDB();render();};
  ACT.renameslot=function(name,id){
    var x=ownSlot(id);if(!x)return;
    name=String(name||"").trim();delete x.name;
    if(name&&name!==mealName(id))x.name=name;
    saveDB();render();};
  ACT.barcode=function(v){ onBarcode(v); };
  key("frange",function(D){V.frange=+D.frange;render();return;});
  key("clearfq",function(){if(V.food)V.food.sq="";render();topOfResults();var fq0=document.getElementById("fq");if(fq0)fq0.focus();return;});
  /* One meal of the day, on its own screen. */
  key("meal",function(D){pushNav();V.meal=D.meal;render();return;});
  key("water",function(D){
    /* Home writes to today explicitly; Food writes to the date it is browsing. */
    var r2=dayRec(D.wdate||curDate());r2.water=Math.max(0,r2.water+ +D.water);saveDB();render();return;});
  /* A tapped glass sets the day outright, so the glass that filled also empties it. */
  has("wset",function(D){
    dayRec(curDate()).water=Math.max(0,+D.wset);saveDB();render();return;});
  /* ---------------- food ---------------- */
  key("addfood",function(D){
    loadFoods(function(){
      V.food={mode:"search",tab:"search",sq:"",q:"",items:null,edit:-1};
      openSheet("addfood",{meal:D.addfood});});
    return;});
  key("parse",function(){
    var q6=val("nlq").trim();
    if(!q6){toast(t("Type what you ate first."));return;}
    /* Updated in place. This used to replace V.food outright, which was harmless while
       it held nothing else; it now holds the mode and the search tab as well. */
    V.food.q=q6;V.food.items=parseFoodInput(q6).map(resolveItem);V.food.mode="quick";
    V.food.edit=-1;V.food.busy=false;V.food.offline=false;V.food.noresult=false;
    render();return;});
  key("fmode",function(D){V.food.mode=D.fmode;render();return;});
  has("fback",function(){V.food.mode=(V.food.pick&&V.food.pick.from)||"search";render();return;});
  key("ftab",function(D){V.food.tab=D.ftab;render();return;});
  on(function(D){return D.fpick||D.fpickoff!==undefined;},function(D){
    var fp=D.fpick?(S.myFoods||[]).concat(FOODDB||[]).filter(function(x){return x.id===D.fpick;})[0]
                  :(V.food.off&&V.food.off.list[+D.fpickoff]);
    if(!fp)return;
    /* u/amt: a measure picked from the chooser (ml, L, oz…) and the amount in it.
       Null means the amount is a count of the serving at si. */
    V.food.pick={food:fp,si:0,n:1,u:null,amt:null,more:false,
                 from:V.food.mode==="detail"?"search":V.food.mode};
    V.food.mode="detail";render();return;});
  /* Whole servings, with a half below one — "3 eggs" is two taps, not five. A
     measure steps by its own unit's step instead: 50 ml, a quarter litre. */
  key("fcount",function(D){
    var pk=V.food.pick;if(!pk)return;
    var up=+D.fcount>0;
    if(pk.u){
      var stp=UNIT_STEP[pk.u];
      pk.amt=Math.max(stp,roundUnit(pk.u,(up?Math.floor:Math.ceil)(pk.amt/stp+(up?1e-9:-1e-9))*stp+(up?stp:-stp)));
    }else pk.n=up?(pk.n<1?1:pk.n+1):(pk.n>1?pk.n-1:0.5);
    render();return;});
  has("fmore",function(){V.food.pick.more=!V.food.pick.more;render();return;});
  has("faddpick",function(){
    var pk2=V.food.pick,am2=pickAmount(pk2);
    if(!(am2.g>0)){toast(t("Enter an amount first."));return;}
    logFood(pk2.food,am2.g,am2.label);return;});
  has("fadd1off",function(D){
    var fo=V.food.off&&V.food.off.list[+D.fadd1off];if(!fo)return;
    var so=servs(fo)[0];logFood(fo,so[1],"1 × "+so[0]);return;});
  has("fedit",function(D){V.food.edit=V.food.edit===+D.fedit?-1:+D.fedit;render();return;});
  /* Puts the cursor on the phrase that was not understood, so more can be typed about
     it and the whole line parsed again. */
  has("adddetail",function(D){
    var ta=document.getElementById("nlq");if(!ta)return;
    var at=ta.value.indexOf(D.adddetail);
    ta.focus();
    if(at>=0)ta.setSelectionRange(at+D.adddetail.length,at+D.adddetail.length);
    toast(t("Add the brand, a serving size or what is in it, then Find it again."));
    return;});
  /* Open Food Facts from the search screen: its results list beside the local ones.
     The Quick Add screen has its own path (data-online), which slots a result into the
     parsed meal instead. */
  has("offq",function(){
    var oq=(V.food.sq||"").trim();if(!oq)return;
    V.food.offBusy=true;V.food.offFail=false;render();
    offSearch(oq,function(found,failed){
      V.food.offBusy=false;
      if(failed)V.food.offFail=true;
      else V.food.off={q:oq,list:found||[]};
      render();});
    return;});
  key("bc",function(D){onBarcode(D.bc);return;});
  has("fbackadd",function(){openSheet("addfood",{meal:(V.sd&&V.sd.meal)||mealNow()});return;});
  key("qty",function(D){
    /* A step this worked out and then never used: every tap moved the amount by one,
       so "300 ml milk" went to 301 ml and "200g chicken" to 201 g. A measure now
       steps by its unit's own step; a count steps as the servings screen does. */
    var pr6=D.qty.split("|"),it6=V.food.items[+pr6[0]];if(!it6)return;
    var k6=unitKey(it6.parsed.unit),dir6=+pr6[1];
    var cur6=it6.parsed.qty==null?1:it6.parsed.qty;
    if(isMeasure(k6)){
      var st6=UNIT_STEP[k6];
      it6.parsed.qty=Math.max(st6,roundUnit(k6,(dir6>0?Math.floor:Math.ceil)(cur6/st6+(dir6>0?1e-9:-1e-9))*st6+dir6*st6));
    }else it6.parsed.qty=dir6>0?(cur6<1?1:cur6+1):(cur6>1?cur6-1:0.5);
    recalcItem(it6);render();return;});
  key("gram",function(D){
    /* In the unit the item is measured in: a drink typed as 330 ml is corrected in
       millilitres, not converted to grams first. */
    var it7=V.food.items[+D.gram];if(!it7)return;
    var k7=unitKey(it7.parsed&&it7.parsed.unit);
    if(isMeasure(k7)&&k7!=="g"){
      askText({title:it7.name,label:t(unitLabel(k7,2)),numeric:true,
        value:it7.parsed.qty,cta:t("Set amount"),
        act:"grams",data:{idx:+D.gram,meal:V.sd&&V.sd.meal,unit:k7}});return;}
    askText({title:it7.name,label:t("Grams"),numeric:true,
      value:Math.round(it7.grams),cta:t("Set grams"),
      act:"grams",data:{idx:+D.gram,meal:V.sd&&V.sd.meal}});return;});
  /* The meal rides along. openSheet replaces the sheet's data, so "Change" used to
     drop the meal the user had picked, and the add went wherever the default fell. */
  key("swapfood",function(D){openSheet("pickfood",{idx:+D.swapfood,meal:V.sd&&V.sd.meal});return;});
  key("choose",function(D){
    var pr8=D.choose.split("|"),it8=V.food.items[+pr8[0]];
    it8.food=it8.alts[+pr8[1]]; it8.name=it8.food.n; it8.src=it8.food.src||"db";
    it8.status="ok"; recalcItem(it8);
    V.sheet="addfood"; render();return;});
  key("dropitem",function(D){
    /* Same rule as a deleted set: play it out, then remove it. */
    var di=+D.dropitem;
    leave(document.querySelector('#sheet [data-k="fi:'+di+'"]'),function(){
      V.food.items.splice(di,1);
      /* The open editor follows its item: removing one above it shifts it up one. */
      if(V.food.edit===di)V.food.edit=-1; else if(V.food.edit>di)V.food.edit--;
      render();});
    return;});
  key("online",function(D){
    var q9=D.online;
    /* "Search online instead" is on the Which-one sheet, where the result would have
       landed out of sight behind it. The meal is already on V.sd: it was carried in. */
    if(V.sheet==="pickfood")V.sheet="addfood";
    V.food.mode="quick";V.food.busy=true;render();
    offSearch(q9,function(found,failed){
      V.food.busy=false;
      V.food.offline=false;V.food.noresult=false;
      if(failed){V.food.offline=q9;render();
        toast(t("Could not reach the food database."));return;}
      if(!found.length){V.food.noresult=q9;render();
        toast(t("Nothing found online for that."));return;}
      var f9=found[0];
      var g9=gramsFor(f9,100,"g");
      var newItem={status:"ok",parsed:{raw:q9,query:q9,qty:100,unit:"g"},
        food:f9,alts:found,grams:100,label:"100 g",src:"off",n:nutritionFor(f9,100),name:f9.n};
      var idx9=-1;
      V.food.items.forEach(function(x,i){if(x.status==="unknown"&&x.parsed.query===q9)idx9=i;});
      if(idx9>=0)V.food.items[idx9]=newItem; else V.food.items.push(newItem);
      render();});
    return;});
  key("scan",function(){
    startScan(onBarcode,function(why){
      toast(why==="denied"?t("Camera access was refused. Enter the barcode instead.")
           :why==="nocamera"?t("No camera found. Enter the barcode instead.")
           :why==="decoder"?t("The scanner could not be loaded. Enter the barcode instead.")
           :t("Scanning is not available here. Enter the barcode instead."));
      if(why!=="denied")openBarcodePrompt();
    },{hint:t("Hold the barcode inside the frame"),cancel:t("Cancel"),
       loading:t("Starting the scanner…")});
    return;});
  key("typecode",function(){openBarcodePrompt();return;});
  has("manual",function(D){
    openSheet("manual",{name:D.manual||"",bc:(V.sd&&V.sd.bc)||"",meal:(V.sd&&V.sd.meal)||mealNow()});
    return;});
  on(function(D){return D.savemanual||D.savemyfood;},function(D){
    var nm9=val("mf_n").trim()||t("Manual entry");
    var sv9=val("mf_s").trim()||t("1 serving");
    var p9=num(val("mf_p")),c9=num(val("mf_c")),f9b=num(val("mf_f"));
    var k9=num(val("mf_k"))||macroKcal(p9,c9,f9b);
    if(!k9&&!p9&&!c9&&!f9b){toast(t("Enter at least one number."));return;}
    var item9={fid:"manual_"+uid(),n:nm9,label:sv9,grams:0,src:"you",
      kcal:k9,p:p9,c:c9,f:f9b,fib:0};
    /* The switch decides. data-savemyfood is the old second button's name, still
       honoured in case anything outside this sheet sends it. */
    var keep9=D.savemyfood||(document.getElementById("mf_save")||{}).checked;
    if(keep9){
      /* Carrying the barcode through means the next scan of this packet resolves
         locally, with no network and no second trip through manual entry. */
      var bc9=normBarcode((V.sd&&V.sd.bc)||"");
      /* The serving the user named becomes the food's own serving, so the next time
         it is logged from Custom it reads "1 × 1 bowl", not "1 × 1 serving". */
      S.myFoods.push({id:"my_"+uid(),n:nm9,cat:"My Foods",per:100,
        kcal:k9,p:p9,c:c9,f:f9b,fib:0,s:[[sv9,100]],a:[],src:"you",
        bc:bc9||undefined});}
    var mm9=(V.sd&&V.sd.meal)||mealNow();
    var day9=!intoPlan(),at9=addTo(mm9,[item9]);
    closeSheet();if(day9)V.tab="food";render();play("set");
    toast(nm9+" "+t("added to")+" "+at9+".");return;});
  key("commit",function(){
    /* The meal is the one in the sheet's header. There used to be a second chooser
       at the foot, which could disagree with it. */
    var meal9=(V.sd&&V.sd.meal)||mealNow();
    var good9=V.food.items.filter(function(i){return i.status!=="unknown"&&i.status!=="suggest";});
    if(!good9.length){toast(t("Nothing to add yet."));return;}
    var day10=!intoPlan(),at10=addTo(meal9,good9.map(toLogItem));
    closeSheet();if(day10)V.tab="food";render();
    play("set");toast(at10+" "+t("updated."));return;});
  key("savemeal",function(){
    askText({title:t("Save this as a meal"),value:t("My meal"),
      body:t("It goes into Saved meals so you can log the whole thing in one tap."),
      cta:t("Save"),act:"savemeal",data:{meal:V.sd&&V.sd.meal}});return;});
  /* A saved meal, logged whole: from My Foods, its own screen, or the sheet's Meals
     tab (which logs into the sheet's meal and closes it). */
  key("addsaved",function(D){
    var sm=savedById(D.addsaved)||(S.savedMeals||[])[+D.addsaved];
    if(!sm||!(sm.items||[]).length)return;
    var ms=(V.sheet==="addfood"&&V.sd&&V.sd.meal)||mealNow();
    /* From My Foods, where no date is on screen, it is today's. */
    var atS=addTo(ms,JSON.parse(JSON.stringify(sm.items)),V.sheet?null:today());
    if(V.sheet)closeSheet();
    render();play("set");toast(sm.name+" "+t("added to")+" "+atS+".");return;});
  key("mstyle",function(D){
    if(D.mstyle===mealStyle())return;
    var keepS=JSON.parse(JSON.stringify(mealSlots()));
    setStyle(D.mstyle);V.reorder=null;saveDB();render();
    toast(t(D.mstyle==="named"?"Meals are named.":"Meals are numbered."),function(){S.mealSlots=keepS;saveDB();render();});return;});
  key("pslot",function(D){pushNav();V.tab="coach";V.pslot=D.pslot;render();window.scrollTo(0,0);return;});
  key("paddslot",function(){askText({title:t("Add a meal"),ph:t("For example, Pre-workout"),
    body:t("Leave it blank and it is numbered by its place in the day."),required:false,cta:t("Add"),act:"addslot"});return;});
  key("prename",function(D){var rsl=slotOf(D.prename);if(!rsl)return;
    askText({title:t("Rename meal"),value:mealName(rsl.id),required:false,
      body:t("Leave it blank to go back to its usual name."),act:"renameslot",data:rsl.id});return;});
  /* ✕ on a meal: gone at once, with Undo. What was logged under it stays in the log
     and still shows on the days it was logged. One meal always stays. */
  key("rmslot",function(D){
    var sl2=ownSlots(),ri3=sl2.findIndex(function(x){return x.id===D.rmslot;});if(ri3<0)return;
    if(sl2.length<2){toast(t("A day needs at least one meal."));return;}
    var goneS=sl2.splice(ri3,1)[0],nmS=mealName(goneS.id);
    if(V.pslot===goneS.id){goBack();V.pslot=null;}
    saveDB();render();
    toast(nmS+" "+t("removed."),function(){ownSlots().splice(Math.min(ri3,ownSlots().length),0,goneS);saveDB();render();});return;});
  key("padd",function(D){var pa=D.padd;
    loadFoods(function(){
      V.food={mode:"search",tab:"search",sq:"",q:"",items:null,edit:-1};
      openSheet("addfood",{meal:pa,plan:pa});});
    return;});
  /* A line of an imported plan that matched nothing: the search opens with it typed. */
  key("pfind",function(D){var pf=D.pfind.split("|"),pfs=slotOf(pf[0]),raw=pfs&&(pfs.todo||[])[+pf[1]];if(!raw)return;
    loadFoods(function(){
      V.food={mode:"search",tab:"search",sq:raw,q:"",items:null,edit:-1};
      openSheet("addfood",{meal:pf[0],plan:pf[0],todo:+pf[1]});});
    return;});
  on(function(D){return D.prmitem||D.pdrop;},function(D){
    var key=D.prmitem?"plan":"todo",pr=(D.prmitem||D.pdrop).split("|"),ps=ownSlot(pr[0]);if(!ps||!ps[key])return;
    var pi2=+pr[1],goneP=ps[key].splice(pi2,1)[0];if(goneP==null)return;
    if(!ps[key].length)delete ps[key];
    saveDB();render();
    toast((goneP.n||goneP)+" "+t("removed."),function(){
      var o2=ownSlot(pr[0]);if(!o2)return;(o2[key]=o2[key]||[]).splice(Math.min(pi2,o2[key].length),0,goneP);saveDB();render();});return;});
  /* The plan, logged: one meal from its own screen or the meal on Today; the whole
     day from Plan, into each meal not yet logged so nothing is counted twice. */
  key("logplan",function(D){
    var lp=planOf(D.logplan);if(!lp.length)return;
    var dL=V.pslot?today():curDate();
    addItems(D.logplan,JSON.parse(JSON.stringify(lp)),dL);render();play("set");
    toast(mealName(D.logplan)+" "+t("logged as planned."));return;});
  key("logday",function(){
    var rL=dayRec(today()),nL=0;
    mealSlots().forEach(function(x){
      if(!(x.plan||[]).length||((rL.meals[x.id]||{}).items||[]).length)return;
      addItems(x.id,JSON.parse(JSON.stringify(x.plan)),today());nL++;});
    render();
    if(nL){play("set");toast(t(nL===1?"1 meal logged from your plan.":"{n} meals logged from your plan.").replace("{n}",nL));}
    else toast(t("Every planned meal is already logged today."));return;});
  key("pimport",function(){pushNav();V.tab="coach";V.pimport=true;V.pparse=null;V.pgen=null;render();window.scrollTo(0,0);return;});
  on(function(D){return D.pirm||D.pidrop;},function(D){
    var pk=D.pirm?"items":"todo",pa2=(D.pirm||D.pidrop).split("|"),pmd=V.pparse&&V.pparse[+pa2[0]];if(!pmd)return;
    var pj=+pa2[1],gonePI=pmd[pk].splice(pj,1)[0];if(gonePI==null)return;render();
    toast((gonePI.n||gonePI)+" "+t("removed."),function(){pmd[pk].splice(Math.min(pj,pmd[pk].length),0,gonePI);render();});return;});
  on(function(D){return D.pmrm!==undefined&&V.pparse;},function(D){var pmi=+D.pmrm,goneM=V.pparse.splice(pmi,1)[0];if(!goneM)return;render();
    toast(importName(goneM,pmi)+" "+t("removed."),function(){V.pparse.splice(Math.min(pmi,V.pparse.length),0,goneM);render();});return;});
  key("pigram",function(D){var pg=D.pigram.split("|"),pmg=V.pparse&&V.pparse[+pg[0]],itg=pmg&&pmg.items[+pg[1]];if(!itg)return;
    askText({title:itg.n,label:t("Grams"),numeric:true,value:itg.grams||"",cta:t("Save"),act:"pigrams",data:{m:+pg[0],i:+pg[1]}});return;});
  on(function(D){return D.pifind||D.piadd!==undefined;},function(D){
    var pfa=D.pifind?D.pifind.split("|"):[D.piadd],pmf=V.pparse&&V.pparse[+pfa[0]];if(!pmf)return;
    var rawF=D.pifind?pmf.todo[+pfa[1]]:"";if(D.pifind&&!rawF)return;
    loadFoods(function(){
      V.food={mode:"search",tab:"search",sq:rawF||"",q:"",items:null,edit:-1};
      openSheet("addfood",{pimp:+pfa[0],ptodo:D.pifind?+pfa[1]:null,pname:importName(pmf,+pfa[0])});});
    return;});
  has("papplyt",function(){V.papplyT=V.papplyT===false;render();return;});
  key("pread",function(){
    var txt=val("pi_text");V.pitext=txt;
    if(!txt.trim()){toast(t("Paste your plan first."));return;}
    loadFoods(function(){V.pparse=withNotes(parsePlan(txt));render();
      var res=document.querySelector(".picard");if(res)res.scrollIntoView({behavior:"smooth",block:"start"});});
    return;});
  key("puse",function(){
    var pp=V.pparse;if(!pp||!pp.length)return;
    var before=JSON.parse(JSON.stringify(mealSlots()));
    var goalsBefore=JSON.parse(JSON.stringify(S.goals||{})),tg=V.ptargets;
    S.mealSlots=slotsFrom(pp);
    /* The targets a PDF set, unless the switch was turned off. */
    var tSet=0;
    if(tg&&V.papplyT!==false)["kcal","p","c","f","water","steps"].forEach(function(k){
      if(tg[k]>0){S.goals[k]=tg[k];tSet++;}});
    V.pparse=null;V.pitext="";V.reorder=null;V.ptargets=null;V.psupps=null;V.pgen=null;saveDB();
    goBack();V.pimport=false;V.chat=false;V.tab="coach";V.csec="food";V.cfsub="plan";render();window.scrollTo(0,0);
    toast(t(tSet?"Your plan and its daily targets are in.":"Your plan is in."),function(){S.mealSlots=before;S.goals=goalsBefore;saveDB();render();});
    pcAfter();return;});
  key("smeal",function(D){pushNav();V.tab="coach";V.smeal=D.smeal;render();window.scrollTo(0,0);return;});
  key("newmeal",function(){askText({title:t("New meal"),ph:t("For example, Ful breakfast"),act:"newmeal"});return;});
  key("renamemeal",function(D){var rm=savedById(D.renamemeal);if(!rm)return;
    askText({title:t("Rename meal"),value:rm.name,act:"renamemeal",data:D.renamemeal});return;});
  key("delsaved",function(D){var dm=savedById(D.delsaved);if(!dm)return;
    askConfirm({title:t("Delete")+" "+dm.name+"?",icon:"trash",
      body:t("The saved meal is removed. Anything you already logged with it stays in your log."),
      cta:t("Delete the meal"),act:"delsaved",data:D.delsaved});return;});
  /* ✕ on a row: gone at once, with Undo, like a day or an exercise. What was already
     logged keeps its own numbers, so nothing in the log changes. */
  key("rmsaved",function(D){var ri2=(S.savedMeals||[]).findIndex(function(x){return x.id===D.rmsaved;});if(ri2<0)return;
    var gone2=S.savedMeals.splice(ri2,1)[0];saveDB();render();
    toast(gone2.name+" "+t("removed."),function(){S.savedMeals.splice(Math.min(ri2,S.savedMeals.length),0,gone2);saveDB();render();});return;});
  key("rmmyfood",function(D){var fi2=(S.myFoods||[]).findIndex(function(x){return x.id===D.rmmyfood;});if(fi2<0)return;
    var goneF=S.myFoods.splice(fi2,1)[0];saveDB();render();
    toast(goneF.n+" "+t("removed."),function(){S.myFoods.splice(Math.min(fi2,S.myFoods.length),0,goneF);saveDB();render();});return;});
  key("rmsmitem",function(D){var pi=D.rmsmitem.split("|"),smI=savedById(pi[0]);if(!smI)return;
    var ii=+pi[1],goneI=smI.items.splice(ii,1)[0];if(!goneI)return;saveDB();render();
    toast(goneI.n+" "+t("removed."),function(){smI.items.splice(Math.min(ii,smI.items.length),0,goneI);saveDB();render();});return;});
  key("smadd",function(D){var sa=D.smadd;
    loadFoods(function(){
      V.food={mode:"search",tab:"search",sq:"",q:"",items:null,edit:-1};
      openSheet("addfood",{meal:mealNow(),into:sa});});
    return;});
  key("myfood",function(D){openSheet("myfood",{id:D.myfood});return;});
  key("savemyfoodx",function(D){
    var nmX=val("mf_n").trim();if(!nmX){toast(t("Give it a name first."));return;}
    var fx=D.savemyfoodx==="new"?null:(S.myFoods||[]).filter(function(x){return x.id===D.savemyfoodx;})[0];
    var svX=val("mf_s").trim()||t("1 serving");
    var rec={n:nmX,p:Math.max(0,r1(num(val("mf_p")))),c:Math.max(0,r1(num(val("mf_c")))),f:Math.max(0,r1(num(val("mf_f"))))};
    /* Blank calories are worked out from the macros, as manual entry does. */
    rec.kcal=String(val("mf_k")).trim()===""?macroKcal(rec.p,rec.c,rec.f):Math.max(0,Math.round(num(val("mf_k"))));
    if(fx){Object.assign(fx,rec);fx.s=[[svX,100]];}
    else S.myFoods.push(Object.assign({id:"my_"+uid(),cat:"My Foods",per:100,fib:0,s:[[svX,100]],a:[],src:"you"},rec));
    saveDB();closeSheet();render();toast(nmX+" "+t("saved."));return;});
  key("usesug",function(){
    var mS=macroTargets();
    S.goals.kcal=mS.kcal;S.goals.p=mS.p;S.goals.f=mS.f;S.goals.c=mS.c;
    saveDB();render();toast(t("Targets updated."));return;});
  /* A frequent-food pill on the dashboard, or the + beside a result in the sheet.
     Both used to go to Snack whatever the meal — including from a sheet opened for
     Breakfast. logFood takes the sheet's meal, or the time of day's without one. */
  key("quickfood",function(D){
    var f10=(S.myFoods||[]).concat(FOODDB||[]).filter(function(x){return x.id===D.quickfood;})[0];
    if(!f10)return;
    var gq=gramsFor(f10,1,null);
    logFood(f10,gq.g,gq.label);return;});
  key("edititem",function(D){
    var prE=D.edititem.split("|"),rE=dayRec(curDate()),mE=rE.meals[prE[0]];
    if(!mE)return;
    var itE=mE.items[+prE[1]];
    if(!itE)return;
    askText({title:itE.n,label:t("Grams"),numeric:true,value:Math.round(itE.grams||0),
      body:t("Everything recalculates from the amount."),cta:t("Save"),act:"editgrams",
      data:{meal:prE[0],idx:+prE[1],date:curDate()}});return;});
  key("dropfood",function(D){
    var prF=D.dropfood.split("|"),dF=curDate(),mF=dayRec(dF).meals[prF[0]];
    if(!mF)return;
    var iF=+prF[1],itF=mF.items[iF];
    if(!itF)return;
    mF.items.splice(iF,1);saveDB();render();
    toast(itF.n+" "+t("removed"),function(){
      var m2=dayRec(dF).meals[prF[0]];
      if(!m2)return;
      m2.items.splice(Math.min(iF,m2.items.length),0,itF);
      saveDB();render();});
    return;});
  key("calc",function(){
    var p3=S.profile;
    p3.age=num(val("p_age"),p3.age);p3.height=num(val("p_height"),p3.height);
    p3.sex=val("p_sex");p3.activity=num(val("p_act"),1.4);p3.goal=val("p_goal");
    p3.weight=toKg(num(val("p_weight"),toDisp(p3.weight)));
    if(p3.weight&&!S.body.some(function(b3){return b3.date===today();}))
      S.body.push({date:today(),weight:p3.weight});
    var m3=macroTargets();
    S.goals.kcal=m3.kcal;S.goals.p=m3.p;S.goals.f=m3.f;S.goals.c=m3.c;
    saveDB();render();toast(t("Targets updated."));return;});
  key("savegoals",function(){
    S.goals.kcal=num(val("g_kcal"),S.goals.kcal);S.goals.p=num(val("g_p"),S.goals.p);
    S.goals.c=num(val("g_c"),S.goals.c);S.goals.f=num(val("g_f"),S.goals.f);
    S.goals.water=num(val("g_water"),S.goals.water);S.goals.steps=num(val("g_steps"),S.goals.steps);
    saveDB();render();toast(t("Saved."));return;});
  key("jumpfood",function(D){V.fdate=(D.jumpfood===today())?null:D.jumpfood;closeSheet();V.tab="food";render();return;});}

export {register};
