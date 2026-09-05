/* Bunyan — sheets
   Every bottom sheet, dispatched by vSheet(). */
import {t} from "../i18n/dict.js";
import {difficultyOf, empty, EQUIP, EXDB, exImg, exMedia, exSteps, isFav, isSkipped, LIB, libFind, muscleOf, MUSCLES, patternOf, pickable, secondaryOf, thumb} from "../data/exercises.js";
import {exName} from "../i18n/exnames.js";
import {MEALS, srcBadge} from "./views/food.js";
import {backupAgeDays, bestE1RM, eatenToday, frequentFoods, lastWeight, macroKcal, prevPerf, prFor, sessionVolume, targetKcal, tdee, volume} from "../engine/formulas.js";
import {sumNutrition} from "../engine/nutrition.js";
import {scanSupported} from "../scan.js";
import {GOALS, LEVELS} from "../engine/plan.js";
import {groupLabel, groupRun, platePlan} from "./views/session.js";
import {buildSnapshot, CUR, dayOf, dayRec, friends, isOwner, PROFILES, S, snapStats} from "../state.js";
import {fmtW, inLb, toDisp, wUnit} from "../units.js";
import {esc, num, pretty, r1, shortd, today} from "../util.js";
import {CUES, MISTAKES, muscleMap, sparkline, stepper, V} from "./view.js";

/* ============================================================ sheets */
function vSheet(){
  if(!V.sheet)return "";
  var b="";
  /* Two generic sheets stand in for every native prompt() and confirm(). Native
     dialogs cannot be styled, look wrong in a standalone PWA, and are blocked
     outright in some embedded browsers. */
  if(V.sheet==="ask"){
    var o=V.sd||{};
    b='<h2>'+esc(o.title||"")+'</h2>'
     +(o.body?'<p class="sub" style="margin:6px 0 16px">'+esc(o.body)+'</p>':'<div style="height:12px"></div>')
     +(o.label?'<label class="sec" for="askv" style="margin-top:0;display:block">'+esc(o.label)+'</label>':'')
     +'<input id="askv" type="'+(o.numeric?"number":"text")+'"'
     +(o.numeric?' inputmode="decimal"':'')
     +' value="'+esc(o.value==null?"":o.value)+'" placeholder="'+esc(o.ph||"")+'"'
     +' autocomplete="off" enterkeyhint="done">'
     +'<button class="btn" data-askok="1">'+esc(o.cta||t("Save"))+'</button>';
  }
  else if(V.sheet==="confirm"){
    var c=V.sd||{};
    b='<h2>'+esc(c.title||"")+'</h2>'
     +(c.body?'<p class="sub" style="margin:8px 0 20px">'+esc(c.body)+'</p>':'<div style="height:14px"></div>')
     +'<button class="btn" data-confirmok="1">'+esc(c.cta||t("Delete"))+'</button>'
     +'<button class="btn g" data-close="1">'+t("Cancel")+'</button>';
  }
  else if(V.sheet==="exercise"){
    var q=V.exq.toLowerCase();
    var target=(V.sd&&V.sd.like)||null;
    var list=LIB.filter(function(l){
      if(V.exm!=="All"&&l[1]!==V.exm)return false;
      if(V.exe&&V.exe!=="All"&&l[2]!==V.exe)return false;
      if(q&&l[0].toLowerCase().indexOf(q)<0)return false;
      if(!V.showAll&&!pickable(l[0]))return false;
      return true;});
    if(target){
      var tp=patternOf(target),tm=muscleOf(target),te=(EXDB[target]||{}).e;
      list.sort(function(a,b){
        function sc(l){var s2=0;
          if(l[1]===tm)s2+=4; if(patternOf(l[0])===tp)s2+=3;
          if(l[2]===te)s2+=2; if(isFav(l[0]))s2+=2; return -s2;}
        return sc(a)-sc(b);});}
    else list.sort(function(a,b){return (isFav(b[0])?1:0)-(isFav(a[0])?1:0);});
    list=list.slice(0,80);
    b='<h2>'+(V.sd&&V.sd.replace?"Replace exercise":"Add exercise")+'</h2>';
    b+='<p class="tiny" style="margin:2px 0 12px">'
     +(target?'Best alternatives to '+esc(target)+' first. ':'')
     +list.length+' shown'+(S.gear&&S.gear.length?', matched to your equipment':'')+'.</p>';
    b+='<input id="exq" placeholder="Search" value="'+esc(V.exq)+'">';
    b+='<div style="display:flex;gap:6px;overflow-x:auto;margin:11px 0;padding-bottom:4px">';
    ["All"].concat(MUSCLES).forEach(function(m){
      b+='<button class="pill'+(V.exm===m?" a":"")+'" data-exm="'+m+'" style="border:none;flex-shrink:0">'+m+'</button>';});
    b+='</div><div class="list">';
    list.forEach(function(l){
      b+='<button class="item" data-pickex="'+esc(l[0])+'"><div><div style="font-weight:600">'+esc(exName(l[0]))+'</div>'
       +'<div class="tiny">'+t(l[1])+' · '+t(l[2])+'</div></div><span class="chev">+</span></button>';});
    b+='</div>';
    if(!list.length)b+=empty("search",
      V.exq?t("Nothing matches")+" “"+V.exq+"”":t("Nothing matches those filters"),
      S.gear&&S.gear.length&&!V.showAll
        ?t("You may have filtered it out with your equipment, or it may not be in the library.")
        :t("Your gym may call it something else, or it may not be in the library at all."),
      '<button class="btn" data-customex="1">'+t("Add it yourself")+'</button>');
    b+='<button class="btn g" data-showall="1">'
     +(V.showAll?'Only what I can do':'Show everything, including gear I lack')+'</button>';
  }
  else if(V.sheet==="editex"){
    var d=dayOf(V.dayId),e=null;
    if(d)e=d.ex.filter(function(x){return x.id===V.sd.id;})[0];
    if(!e)return "";
    b='<h2>'+esc(exName(e.name))+'</h2><p class="tiny" style="margin:2px 0 14px">'+esc(t(e.muscle))+'</p>'
     +'<div class="grid2"><div><label class="tiny">Sets</label><input id="e_sets" type="number" value="'+e.sets+'"></div>'
     +'<div><label class="tiny">'+t("Rest (sec)")+'</label><input id="e_rest" type="number" value="'+e.rest+'"></div>'
     +'<div><label class="tiny">'+t("Min reps")+'</label><input id="e_lo" type="number" value="'+e.lo+'"></div>'
     +'<div><label class="tiny">'+t("Max reps")+'</label><input id="e_hi" type="number" value="'+e.hi+'"></div></div>'
     +'<button class="btn" data-saveex="'+e.id+'">'+t("Save")+'</button>';
    /* Supersets are built by pairing an exercise with the one under it, which is how
       they read on paper: A1 then A2. Chain three and you have a triset. */
    var eIdx=d.ex.findIndex(function(x){return x.id===e.id;});
    var eRun=groupRun(d.ex,eIdx),paired=eRun.length>1;
    var nextEx=d.ex[eIdx+1];
    if(paired)
      b+='<div class="card mt" style="border-color:var(--gold)">'
       +'<div class="row"><h3 style="color:var(--gold);font-size:14px">'+t("Superset")+' '
       +groupLabel(d.ex,eIdx)+'</h3></div>'
       +'<p class="tiny" style="margin:5px 0 0">'
       +t("No rest until the round is done. Rest comes after the last exercise in the group.")
       +'</p>'
       +'<button class="btn g sm mt" data-ungroup="'+e.id+'">'+t("Break the superset")+'</button></div>';
    /* Offered whenever the exercise below is not already part of this run, so a pair
       can be extended into a triset by walking down the list. */
    if(nextEx&&eRun.indexOf(eIdx+1)<0)
      b+='<button class="btn g mt" data-group="'+e.id+'">'
       +t("Superset with")+' '+esc(nextEx.name)+'</button>';
    b+='<div class="rowc mt"><button class="btn g sm" data-moveex="'+e.id+'|-1">'+t("Move up")+'</button>'
     +'<button class="btn g sm" data-moveex="'+e.id+'|1">'+t("Move down")+'</button>'
     +'<button class="btn g sm" data-replaceex="'+e.id+'">'+t("Replace")+'</button></div>'
     +'<button class="btn g" data-exhist="'+esc(e.name)+'" style="margin-top:10px">'+t("See my history for this lift")+'</button>'
     +'<button class="btn d" data-delex="'+e.id+'">'+t("Remove from this day")+'</button>';
  }
  else if(V.sheet==="weigh"){
    var lw=lastWeight()||86;
    b='<h2>'+t("Morning weight")+'</h2><p class="tiny" style="margin:2px 0 14px">'
     +'After the bathroom, before eating. Judge the seven-day average, not the daily number.</p>'
     /* V.draft.bw is held in the user's display unit while this sheet is open and
        converted back to kilograms on save. */
     +stepper("bw",V.draft.bw!=null?V.draft.bw:toDisp(lw),inLb()?0.2:0.1,wUnit())
     +'<button class="btn" data-saveweight="1">Save for '+pretty(today())+'</button>';
  }
  else if(V.sheet==="steps"){
    b='<h2>'+t("Steps today")+'</h2><p class="tiny" style="margin:2px 0 14px">Target '+S.goals.steps+'.</p>'
     +stepper("st",V.draft.st||dayRec().steps||0,500,"steps")
     +'<button class="btn" data-savesteps="1">Save</button>';
  }
  else if(V.sheet==="recovery"){
    var r=dayRec();
    b='<h2>'+t("Recovery")+'</h2><p class="tiny" style="margin:2px 0 14px">'
     +'Raw inputs only. No score, no verdict. You decide what to do with them.</p>'
     +'<div class="grid2"><div><label class="tiny">'+t("Sleep (hours)")+'</label><input id="r_sleep" type="number" step="0.25" value="'+(r.sleep||"")+'"></div>'
     +'<div><label class="tiny">'+t("Soreness 0-10")+'</label><input id="r_sore" type="number" value="'+(r.sore||"")+'"></div>'
     +'<div><label class="tiny">'+t("Energy 0-10")+'</label><input id="r_energy" type="number" value="'+(r.energy||"")+'"></div>'
     +'<div><label class="tiny">'+t("Ankle pain 0-10")+'</label><input id="r_ankle" type="number" value="'+(r.ankle||"")+'"></div></div>'
     +'<div class="mt"><label class="tiny">Notes</label><input id="r_notes" value="'+esc(r.notes||"")+'"></div>'
     +'<button class="btn" data-saverec="1">Save</button>';
  }
  else if(V.sheet==="measure"){
    var last=S.body.filter(function(x){return x.chest||x.waist;}).slice(-1)[0]||{};
    b='<h2>'+t("Measurements")+'</h2><p class="tiny" style="margin:2px 0 14px">'+t("In centimetres. Leave blank to skip.")+'</p>'
     +'<div class="grid2">'
     +[["Chest","m_chest","chest"],["Waist","m_waist","waist"],["Arms","m_arms","arms"],
       ["Thighs","m_thighs","thighs"],["Calves","m_calves","calves"],["Neck","m_neck","neck"]]
      .map(function(m){return '<div><label class="tiny">'+m[0]+'</label>'
        +'<input id="'+m[1]+'" type="number" step="0.5" value="'+(last[m[2]]||"")+'"></div>';}).join("")
     +'</div><button class="btn" data-savemeasure="1">'+t("Save for today")+'</button>';
  }
  else if(V.sheet==="text"){
    b='<h2>'+esc(V.sd.title)+'</h2><p class="tiny" style="margin:2px 0 12px">'+esc(V.sd.note||"")+'</p>'
     +'<input id="txt" value="'+esc(V.sd.value||"")+'" placeholder="'+esc(V.sd.ph||"")+'">'
     +'<button class="btn" data-savetext="1">Save</button>';
  }
  else if(V.sheet==="addfood"){
    var meal=V.sd.meal, st=V.food||{};
    b='<h2>'+t("Log fuel")+'</h2><p class="tiny" style="margin:2px 0 12px">'
     +'Type what you ate. "3 eggs, 2 brown toast" works.</p>';
    b+='<input id="nlq" placeholder="3 eggs, 2 brown toast" value="'+esc(st.q||"")+'" '
     +'autocapitalize="none" autocorrect="off">';
    b+='<div class="rowc mt"><button class="btn" data-parse="1" style="margin:0">'+t("Find it")+'</button></div>';
    /* Scanning shows only where the browser can actually decode. Typing the digits
       off the packet runs the same lookup and works everywhere. */
    b+='<div class="rowc" style="margin-top:8px">'
     +(scanSupported()?'<button class="btn g" data-scan="1" style="margin:0">'+t("Scan barcode")+'</button>':'')
     +'<button class="btn g" data-typecode="1" style="margin:0">'+t("Enter barcode")+'</button></div>';

    /* Three distinct outcomes, three distinct messages: still working, no match,
       could not reach the service at all. */
    if(st.busy)b+='<div class="card mt"><div class="skel skelbar" style="width:58%"></div>'
     +'<div class="skel skelbar" style="width:34%"></div>'
     +'<p class="tiny" style="margin:6px 0 0">'+t("Checking the online food database…")+'</p></div>';
    else if(st.offline)b+=empty("cloud",t("No connection to the food database"),
      t("Bunyan works offline, but branded products come from Open Food Facts. Your own foods and the built-in database still work."),
      '<button class="btn g" data-online="'+esc(st.offline)+'">'+t("Try again")+'</button>'
      +'<button class="btn" data-manual="'+esc(st.offline)+'">'+t("Enter it manually")+'</button>');
    else if(st.noresult)b+=empty("search",t("Nothing found online"),
      t("Open Food Facts has no product under that name. Enter the numbers off the packet and Bunyan will remember it."),
      '<button class="btn" data-manual="'+esc(st.noresult)+'">'+t("Enter it manually")+'</button>');

    if(st.items&&st.items.length){
      var known=st.items.filter(function(i){return i.status!=="unknown";});
      var lost=st.items.filter(function(i){return i.status==="unknown";});
      b+='<div class="overline">I found</div>';
      known.forEach(function(it,i){
        b+='<div class="card"><div class="row"><div style="flex:1">'
         +'<div style="font-weight:700">'+esc(it.name)+'</div>'
         +'<div class="tiny">'+esc(it.label)+' \u00b7 '+Math.round(it.grams)+' g</div></div>'
         +srcBadge(it.src)+'</div>'
         +'<div class="row" style="margin-top:8px"><span class="metric" style="font-size:20px">'
         +it.n.kcal+'<span class="unit">kcal</span></span>'
         +'<span class="tiny num">'+it.n.p+'p \u00b7 '+it.n.c+'c \u00b7 '+it.n.f+'f</span></div>'
         +'<div class="rowc mt"><button class="btn g sm" data-qty="'+i+'|-1">\u2212</button>'
         +'<button class="btn g sm" data-qty="'+i+'|1">+</button>'
         +'<button class="btn g sm" data-gram="'+i+'">'+t("Set grams")+'</button>'
         +(it.alts&&it.alts.length>1?'<button class="btn g sm" data-swapfood="'+i+'">'+t("Change")+'</button>':'')
         +'<button class="btn d sm" data-dropitem="'+i+'">'+t("Remove")+'</button></div>'
         +(it.status==="ambiguous"?'<p class="tiny" style="margin:8px 0 0;color:var(--gold)">'
            +'Not certain this is the right match. Tap Change if it is wrong.</p>':'')
         +'</div>';});
      if(known.length){
        var tot=sumNutrition(known.map(function(i){return i.n;}));
        b+='<div class="card hot"><div class="tiny" style="letter-spacing:.12em">TOTAL</div>'
         +'<div class="metric" style="font-size:32px;margin:4px 0 6px">'+tot.kcal
         +'<span class="unit">kcal</span></div>'
         +'<div class="row"><span class="dim">Protein '+tot.p+'g</span>'
         +'<span class="dim">Carbs '+tot.c+'g</span><span class="dim">Fat '+tot.f+'g</span></div></div>';
        b+='<div class="rowc"><select id="mealsel">'
         +MEALS.map(function(m){return '<option'+(m===meal?" selected":"")+'>'+m+'</option>';}).join("")
         +'</select></div>';
        b+='<button class="btn" data-commit="1">'+t("Add to meal")+'</button>';
        b+='<button class="btn g" data-savemeal="1">'+t("Save this as a meal")+'</button>';}
      if(lost.length){
        b+='<div class="overline">We couldn\u2019t calculate this yet</div>';
        lost.forEach(function(it){
          b+='<div class="card"><div style="font-weight:700">'+esc(it.parsed.raw)+'</div>'
           +'<p class="tiny" style="margin:6px 0 0">We couldn\u2019t find reliable nutrition for this. '
           +'Try adding the brand, a serving size, or the ingredients.</p>'
           +'<div class="rowc mt"><button class="btn g sm" data-online="'+esc(it.parsed.query)+'">'+t("Search online")+'</button>'
           +'<button class="btn g sm" data-manual="'+esc(it.parsed.raw)+'">'+t("Enter it manually")+'</button></div></div>';});}
    }

    var fq=frequentFoods(8);
    if(fq.length&&!(st.items&&st.items.length)){
      b+='<div class="overline">'+t("Frequent")+'</div><div class="list">';
      fq.forEach(function(f){
        b+='<button class="item" data-quickfood="'+esc(f.id)+'"><div><div style="font-weight:600">'
         +esc(f.n)+'</div><div class="tiny">'+f.kcal+' kcal / 100 g</div></div>'
         +'<span class="pill a">Add</span></button>';});
      b+='</div>';}
    b+='<button class="btn g" data-manual="">'+t("Enter nutrition manually")+'</button>';
  }
  else if(V.sheet==="manual"){
    var mf=V.sd||{};
    b='<h2>'+t("Enter it manually")+'</h2><p class="tiny" style="margin:2px 0 12px">'
     +'Read the numbers off the packet, or your best estimate.</p>'
     /* Saving to My Foods attaches this, so the same packet scans locally next time. */
     +(mf.bc?'<p class="tiny" style="margin:0 0 10px">'+t("Barcode")+' <span class="num">'
       +esc(mf.bc)+'</span> — '+t("saving this to your foods will make it scan offline next time.")+'</p>':'')
     +'<input id="mf_n" placeholder="Food name" value="'+esc(mf.name||"")+'">'
     +'<div class="grid2 mt">'
     +'<div><div class="tiny">'+t("Calories")+'</div><input id="mf_k" type="number" inputmode="numeric"></div>'
     +'<div><div class="tiny">'+t("Protein (g)")+'</div><input id="mf_p" type="number" inputmode="decimal"></div>'
     +'<div><div class="tiny">'+t("Carbs (g)")+'</div><input id="mf_c" type="number" inputmode="decimal"></div>'
     +'<div><div class="tiny">'+t("Fat (g)")+'</div><input id="mf_f" type="number" inputmode="decimal"></div>'
     +'</div>'
     +'<p class="tiny mt">'+t("Leave calories blank and Bunyan works them out from the macros.")+'</p>'
     +'<div class="rowc mt"><select id="mf_meal">'
     +MEALS.map(function(m){return '<option>'+m+'</option>';}).join("")+'</select></div>'
     +'<button class="btn" data-savemanual="1">'+t("Add it")+'</button>'
     +'<button class="btn g" data-savemyfood="1">'+t("Save to my foods and add")+'</button>';
  }
  else if(V.sheet==="pickfood"){
    var pi=V.sd.idx, cur=V.food.items[pi];
    b='<h2>'+t("Which one?")+'</h2><p class="tiny" style="margin:2px 0 12px">You typed \u201c'
     +esc(cur.parsed.raw)+'\u201d</p><div class="list">';
    cur.alts.forEach(function(f,i){
      b+='<button class="item" data-choose="'+pi+'|'+i+'"><div><div style="font-weight:600">'
       +esc(f.n)+'</div><div class="tiny">'+f.kcal+' kcal / 100 g \u00b7 '+esc(f.cat||"")+'</div></div>'
       +(f.id===cur.food.id?'<span class="pill a">'+t("Current")+'</span>':'<span class="chev">\u203a</span>')
       +'</button>';});
    b+='</div><button class="btn g" data-online="'+esc(cur.parsed.query)+'">'+t("Search online instead")+'</button>';
  }
  else if(V.sheet==="dayview"){
    var dv=V.sd.date, rv2=S.days[dv]||{meals:{}}, sess=S.sessions.filter(function(x){return x.date===dv;});
    b='<h2>'+pretty(dv)+'</h2>';
    b+='<div class="overline">'+t("Training")+'</div>';
    if(!sess.length)b+='<p class="tiny">'+t("No session logged.")+'</p>';
    sess.forEach(function(x){
      b+='<div class="card"><div class="row"><h3>'+esc(x.dayName)+'</h3>'
       +'<span class="metric" style="font-size:17px">'+fmtW(Math.round(sessionVolume(x)))+'</span></div>';
      x.entries.forEach(function(en){
        if(!en.sets.length)return;
        b+='<div class="row" style="margin-top:7px;font-size:13px"><span class="dim">'+esc(exName(en.name))+'</span>'
         +'<span class="num">'+en.sets.map(function(st){return st.w?st.w+"\u00d7"+st.r:st.r;}).join("  ")+'</span></div>';});
      b+='</div>';});
    b+='<div class="overline">'+t("Nutrition")+'</div>';
    var et=eatenToday(dv);
    if(!et.kcal)b+='<p class="tiny">'+t("No food logged.")+'</p>';
    else{
      b+='<div class="card"><div class="metric" style="font-size:30px">'+et.kcal+'<span class="unit">kcal</span></div>'
       +'<div class="row mt"><span class="dim">Protein '+et.p+'g</span>'
       +'<span class="dim">Carbs '+et.c+'g</span><span class="dim">Fat '+et.f+'g</span></div></div>';
      MEALS.forEach(function(mn){
        var mm=rv2.meals[mn];
        if(!mm||!(mm.items||[]).length)return;
        b+='<div class="card"><div class="row"><h3>'+mn.toUpperCase()+'</h3>'
         +'<span class="dim num">'+sumNutrition(mm.items).kcal+' kcal</span></div>';
        mm.items.forEach(function(it){
          b+='<div class="row" style="margin-top:6px;font-size:13px"><span>'+esc(it.n)+'</span>'
           +'<span class="dim num">'+it.kcal+'</span></div>';});
        b+='</div>';});}
    if(rv2.weight||rv2.steps)b+='<div class="card"><div class="row">'
      +'<span class="dim">Steps '+(rv2.steps||0)+'</span></div></div>';
    b+='<button class="btn g" data-jumpfood="'+dv+'">'+t("Open this day in Food")+'</button>';
  }
  else if(V.sheet==="exdetail"){
    var nD=V.sd.name, mD=muscleOf(nD), pD=patternOf(nD), secD=secondaryOf(nD), lD=libFind(nD);
    var prD=prFor(nD), pvD=prevPerf(nD);
    b='<h2>'+esc(exName(nD))+'</h2>'
     +'<div class="rowc" style="margin:8px 0 14px;flex-wrap:wrap">'
     +'<span class="pill a">'+t(mD)+'</span><span class="pill">'+t(lD?lD[2]:"Other")+'</span>'
     +'<span class="pill">'+t(pD)+'</span><span class="pill">'+t(difficultyOf(nD))+'</span></div>';
    var med=exMedia(nD);
    if(med){
      b+='<div class="demo" style="margin-bottom:12px">'
       +'<figure><img src="'+exImg(nD,0)+'" alt=""><figcaption>Start</figcaption></figure>'
       +'<figure><img src="'+exImg(nD,1)+'" alt=""><figcaption>'+t("Finish")+'</figcaption></figure></div>';}
    b+='<div class="card" style="padding:10px">'+muscleMap(mD,secD)+'</div>';
    b+='<div class="row"><span class="tiny">'+t("Primary")+'</span><span style="font-weight:600;color:var(--accent)">'
     +t(mD)+'</span></div>';
    if(secD.length)b+='<div class="row" style="margin-top:4px"><span class="tiny">'+t("Secondary")+'</span>'
     +'<span class="dim">'+secD.join(" \u00b7 ")+'</span></div>';
    b+='<div class="sec">'+t("How to do it")+'</div><div class="card">';
    var steps=exSteps(nD)||(CUES[pD]||CUES.Isolation);
    steps.forEach(function(c,i){
      b+='<div class="rowc" style="align-items:flex-start;margin-bottom:9px">'
       +'<span class="pill a" style="min-width:22px;text-align:center">'+(i+1)+'</span>'
       +'<span style="font-size:14px;flex:1">'+esc(c)+'</span></div>';});
    b+='</div>';
    b+='<div class="sec">'+t("Common mistakes")+'</div><div class="card">';
    (MISTAKES[pD]||MISTAKES.Isolation).forEach(function(c){
      b+='<div class="rowc" style="align-items:flex-start;margin-bottom:8px">'
       +'<span style="color:var(--accent);font-weight:700">\u00d7</span>'
       +'<span style="font-size:14px;flex:1">'+esc(c)+'</span></div>';});
    b+='</div>';
    if(prD.w)b+='<div class="sec">'+t("Your record")+'</div><div class="card"><div class="grid3">'
     +'<div><div class="tiny">'+t("Heaviest")+'</div><div class="big" style="font-size:19px">'+prD.w+'</div></div>'
     +'<div><div class="tiny">'+t("Best 1RM")+'</div><div class="big" style="font-size:19px">'+(prD.e||"\u2014")+'</div></div>'
     +'<div><div class="tiny">'+t("Best set")+'</div><div class="big" style="font-size:19px">'+prD.vol+'</div></div>'
     +'</div></div>';
    b+='<div class="rowc mt"><button class="btn g sm" data-fav="'+esc(nD)+'">'
     +(isFav(nD)?"\u2605 Favourite":"\u2606 Favourite")+'</button>'
     +'<button class="btn '+(isSkipped(nD)?"g":"d")+' sm" data-skipex="'+esc(nD)+'">'
     +(isSkipped(nD)?"Unhide":"Never suggest this")+'</button></div>';
    if(pvD)b+='<button class="btn g" data-exhist="'+esc(nD)+'">'+t("See every session")+'</button>';
    b+='<div class="sec">'+t("Similar exercises")+'</div><div class="list">';
    LIB.filter(function(l){return l[1]===mD&&l[0]!==nD&&patternOf(l[0])===pD;}).slice(0,8)
      .forEach(function(l){
        b+='<button class="item" data-exdetail="'+esc(l[0])+'">'+thumb(l[0],38)
         +'<div style="flex:1"><div style="font-weight:600">'+esc(exName(l[0]))+'</div>'
         +'<div class="tiny">'+l[2]+' \u00b7 '+difficultyOf(l[0])+'</div></div>'
         +'<span class="chev">\u203a</span></button>';});
    b+='</div>';
  }
  else if(V.sheet==="done"){
    var w=V.sd;
    b='<div style="text-align:center;margin-bottom:var(--s5)">'
     +'<div style="width:76px;height:76px;border-radius:50%;background:var(--ok);margin:0 auto;'
     +'display:flex;align-items:center;justify-content:center;font-size:38px;color:#fff">\u2713</div>'
     +'<h1 style="margin-top:var(--s4)">'+t("Workout complete")+'</h1>'
     +'<p class="sub" style="margin-top:6px">'+esc(w.dayName)+' \u00b7 '+pretty(w.date)+'</p></div>';
    b+='<div class="card"><div class="tiny" style="letter-spacing:.12em">'+t("PERFORMANCE SUMMARY")+'</div>'
     +'<div class="grid2" style="margin-top:var(--s4)">'
     +'<div><div class="tiny">'+t("DURATION")+'</div><div class="metric" style="font-size:30px">'+w.mins+'</div>'
     +'<div class="tiny">'+t("mins total")+'</div></div>'
     +'<div><div class="tiny">'+t("TOTAL VOLUME")+'</div><div class="stat">'
     +Math.round(toDisp(w.vol)).toLocaleString()
     +'<span class="unit">'+wUnit()+'</span></div><div class="tiny">'+t("lifted")+'</div></div></div>'
     +'<div class="grid2" style="margin-top:var(--s5)">'
     +'<div><div class="tiny">'+t("EXERCISES")+'</div><div class="stat">'+w.exs+'</div>'
     +'<div class="tiny">'+t("completed")+'</div></div>'
     +'<div><div class="tiny">'+t("SETS LOGGED")+'</div><div class="stat">'+w.sets+'</div>'
     +'<div class="tiny">avg RPE '+(w.rpe||"\u2014")+'</div></div></div></div>';
    if(w.delta!==null)b+='<div class="card mt"><div class="row"><span class="tiny">Versus last '
      +esc(w.dayName)+'</span><span style="font-weight:700;color:'
      +(w.delta>=0?"var(--ok)":"var(--dim)")+'">'+(w.delta>=0?"+":"")+toDisp(w.delta).toLocaleString()+' '+wUnit()+'</span></div></div>';
    if(w.prs.length){
      b+='<div class="card"><div class="row"><span class="tiny" style="letter-spacing:.12em">'
       +'ACHIEVED PERSONAL RECORDS</span><span class="pill a">New</span></div>';
      w.prs.forEach(function(p){
        b+='<div class="row" style="margin-top:var(--s4);align-items:center">'
         +'<div><div style="font-weight:800;text-transform:uppercase;font-size:15px">'+esc(exName(p.n))+'</div>'
         +'<div class="tiny">New '+p.r+'-rep max</div></div>'
         +'<div class="metric" style="font-size:22px">'+fmtW(p.w)+'</div></div>';});
      b+='</div>';}
    if(w.notes)b+='<div class="card"><div class="tiny" style="letter-spacing:.12em">'
      +t("SESSION NOTE")+'</div><p style="margin:8px 0 0;font-size:14.5px;line-height:1.5">'
      +esc(w.notes)+'</p></div>';
    b+='<button class="btn" data-close="1">'+t("Done")+'</button>';
  }
  else if(V.sheet==="gear"){
    b='<h2>'+t("My equipment")+'</h2><p class="tiny" style="margin:2px 0 14px">'
     +'Pick what you actually have. Exercise suggestions and replacements will stick to it. '
     +'Bodyweight is always included.</p><div class="list">';
    EQUIP.filter(function(q3){return q3!=="Bodyweight";}).forEach(function(q3){
      var on=!S.gear||S.gear.indexOf(q3)>=0;
      b+='<button class="item" data-gear="'+q3+'"><span>'+q3+'</span>'
       +'<span class="'+(on?"pill ok":"dim")+'">'+(on?"Have it":"No")+'</span></button>';});
    b+='</div><p class="tiny">'+t("Leave everything on if you train in a full gym.")+'</p>';
  }
  else if(V.sheet==="likes"){
    b='<h2>'+t("Favourites and exclusions")+'</h2>';
    b+='<div class="sec">'+t("Favourites")+'</div>';
    if(!S.favs.length)b+='<p class="tiny">None yet. Star an exercise from its detail page and it '
      +'will be suggested first.</p>';
    else{b+='<div class="list">';
      S.favs.forEach(function(n){b+='<button class="item" data-fav="'+esc(n)+'">'+thumb(n,36)
        +'<span style="flex:1">'+esc(n)+'</span><span class="pill a">'+t("Remove")+'</span></button>';});
      b+='</div>';}
    b+='<div class="sec">'+t("Never suggest")+'</div>';
    if(!S.skip.length)b+='<p class="tiny">'+t("Nothing hidden.")+'</p>';
    else{b+='<div class="list">';
      S.skip.forEach(function(n){b+='<button class="item" data-skipex="'+esc(n)+'">'+thumb(n,36)
        +'<span style="flex:1">'+esc(n)+'</span><span class="pill a">'+t("Unhide")+'</span></button>';});
      b+='</div>';}
  }
  else if(V.sheet==="setup"){
    var p=S.profile;
    b='<h2>'+t("Build my plan")+'</h2><p class="tiny" style="margin:2px 0 14px">'
     +'Four answers. I pick the split, the sets, the rep ranges and the rest times from them, '
     +'and you can change any of it afterwards.</p>';
    b+='<div class="tiny">'+t("How long have you been training?")+'</div><select id="o_level">'
     +Object.keys(LEVELS).map(function(k){
        return '<option value="'+k+'"'+(p.level===k?" selected":"")+'>'+LEVELS[k].label+'</option>';}).join("")
     +'</select>';
    b+='<div class="tiny mt">'+t("What are you after?")+'</div><select id="o_goal">'
     +Object.keys(GOALS).map(function(k){
        return '<option value="'+k+'"'+(p.goal===k?" selected":"")+'>'+GOALS[k].label+'</option>';}).join("")
     +'</select>';
    b+='<div class="tiny mt">'+t("Days a week you can actually train")+'</div><select id="o_days">'
     +[2,3,4,5,6].map(function(d){
        return '<option value="'+d+'"'+(+p.days===d?" selected":"")+'>'+d+' days</option>';}).join("")
     +'</select>';
    b+='<div class="grid2 mt"><div><div class="tiny">'+t("Weight")+' ('+wUnit()+')</div>'
     +'<input id="o_weight" type="number" step="0.1" value="'+toDisp(lastWeight()||p.weight||86)+'"></div>'
     +'<div><div class="tiny">'+t("Height (cm)")+'</div><input id="o_height" type="number" value="'+p.height+'"></div>'
     +'<div><div class="tiny">Age</div><input id="o_age" type="number" value="'+p.age+'"></div>'
     +'<div><div class="tiny">Sex</div><select id="o_sex">'
     +'<option value="m"'+(p.sex==="m"?" selected":"")+'>Male</option>'
     +'<option value="f"'+(p.sex==="f"?" selected":"")+'>'+t("Female")+'</option></select></div></div>';
    b+='<div class="plan mt"><div class="tiny">This replaces your current split with a generated one. '
     +'Splits you already have are kept.</div></div>';
    b+='<button class="btn" data-buildplan="1">'+t("Build it")+'</button>';
  }
  else if(V.sheet==="exhist"){
    var nm3=V.sd.name,rows=[];
    S.sessions.forEach(function(ss){ss.entries.forEach(function(en){
      if(en.name===nm3&&en.sets.length)rows.push({d:ss.date,s:en.sets});});});
    b='<h2>'+esc(exName(nm3))+'</h2><p class="tiny" style="margin:2px 0 14px">'+rows.length+' sessions logged</p>';
    if(!rows.length)b+='<p class="tiny">'+t("Nothing recorded yet.")+'</p>';
    rows.forEach(function(r){
      b+='<div class="card"><div class="row"><span class="tiny">'+pretty(r.d)+'</span>'
       +'<span class="tiny">'+fmtW(volume(r.s))+' \u00b7 1RM '
       +(bestE1RM(r.s)?toDisp(bestE1RM(r.s)):"\u2014")+'</span></div>'
       +'<div class="num mt" style="font-size:15px">'+r.s.map(function(x){
          return x.w?toDisp(x.w)+' \u00d7 '+x.r+(x.rpe?' <span class="tiny">@'+x.rpe+'</span>':''):x.r;
         }).join(' &nbsp; ')+'</div></div>';});
  }
  else if(V.sheet==="share"){
    b='<h2>'+t("Share your progress")+'</h2><p class="tiny" style="margin:2px 0 12px">'
     +'Copy all of this and send it. It contains your sessions, lifts and weight. '
     +'It does not contain your meals or anything else.</p>'
     +'<textarea id="sn" style="width:100%;height:200px;background:var(--raised);color:var(--text);'
     +'border:1px solid var(--border);border-radius:11px;padding:12px;font-size:12px">'
     +esc(JSON.stringify(buildSnapshot()))+'</textarea>'
     +'<button class="btn g" data-copysn="1">'+t("Select all")+'</button>';
  }
  else if(V.sheet==="coach"){
    var F=friends(),names=Object.keys(F);
    b='<h2>'+t("Friends I follow")+'</h2><p class="tiny" style="margin:2px 0 14px">'
     +'Read only. Nothing here touches your own log.</p>';
    if(!names.length)b+='<p class="tiny">Nobody yet. Ask a friend to tap Share my progress '
      +'and send you the code.</p>';
    names.forEach(function(n){
      var st=snapStats(F[n]);
      b+='<div class="card"><div class="row"><h3>'+esc(n)+'</h3>'
       +'<span class="tiny">'+(F[n].at?shortd(F[n].at):"")+'</span></div>'
       +'<div class="grid3 mt">'
       +'<div><div class="tiny">'+t("Sessions")+'</div><div class="big" style="font-size:19px">'+st.count+'</div></div>'
       +'<div><div class="tiny">'+t("Volume")+'</div><div class="big" style="font-size:19px">'+Math.round(st.vol/1000)+'k</div></div>'
       +'<div><div class="tiny">'+t("Weight")+'</div><div class="big" style="font-size:19px">'+(st.avg7||st.weight||"—")+'</div></div>'
       +'</div>';
      if(st.last)b+='<p class="tiny mt">Last trained '+shortd(st.last)+'</p>';
      if(st.body.length>1)b+=sparkline(st.body.map(function(x){return x[1];}),
        st.body.map(function(x){return shortd(x[0]);}),"var(--accent)");
      var pk=Object.keys(st.prs).slice(0,6);
      if(pk.length){b+='<div class="tiny mt">'+t("Best lifts")+'</div>';
        pk.forEach(function(k){b+='<div class="row" style="font-size:13px;margin-top:3px">'
          +'<span class="dim">'+esc(k)+'</span><span class="num">'+st.prs[k][0]+' × '+st.prs[k][1]+'</span></div>';});}
      b+='<button class="btn d sm mt" data-unfollow="'+esc(n)+'">Remove '+esc(n)+'</button></div>';});
    b+='<div class="sec">'+t("Add or update a friend")+'</div>'
     +'<textarea id="fp" placeholder="Paste the code they sent you" style="width:100%;height:120px;'
     +'background:var(--raised);color:var(--text);border:1px solid var(--border);border-radius:11px;'
     +'padding:12px;font-size:12px"></textarea>'
     +'<button class="btn" data-addfriend="1">'+t("Add them")+'</button>';
  }
  else if(V.sheet==="backup"){
    b='<h2>'+t("Backup")+'</h2><p class="tiny" style="margin:2px 0 12px">'
     +'Copy all of this text and keep it somewhere safe. Paste it into Restore to bring everything back.</p>'
     +'<textarea id="bk" style="width:100%;height:220px;background:var(--raised);color:var(--text);'
     +'border:1px solid var(--border);border-radius:11px;padding:12px;font-size:12px">'
     +esc(JSON.stringify(S))+'</textarea>'
     +'<button class="btn g" data-copybk="1">'+t("Select all")+'</button>';
  }
  else if(V.sheet==="restore"){
    b='<h2>'+t("Restore")+'</h2><p class="tiny" style="margin:2px 0 12px">'+t("Paste a backup. This replaces everything currently in the app.")+'</p>'
     +'<textarea id="rs" style="width:100%;height:180px;background:var(--raised);color:var(--text);'
     +'border:1px solid var(--border);border-radius:11px;padding:12px;font-size:12px"></textarea>'
     +'<button class="btn" data-dorestore="1">'+t("Restore")+'</button>';
  }
  /* ---- grouped settings. One sheet per section, opened from the Profile hub. ---- */
  else if(V.sheet==="set_you"){
    var yp=S.profile;
    b='<h2>'+t("You")+'</h2><p class="tiny" style="margin:2px 0 14px">'
     +t("These drive your calorie and macro estimates.")+'</p>'
     +'<div class="grid2"><div><label class="tiny" for="p_age">'+t("Age")+'</label>'
     +'<input id="p_age" type="number" value="'+yp.age+'"></div>'
     +'<div><label class="tiny" for="p_height">'+t("Height (cm)")+'</label>'
     +'<input id="p_height" type="number" value="'+yp.height+'"></div></div>'
     +'<div class="grid2 mt"><div><label class="tiny" for="p_weight">'+t("Weight")+' ('+wUnit()+')</label>'
     +'<input id="p_weight" type="number" step="0.1" value="'+toDisp(lastWeight()||yp.weight||86)+'"></div>'
     +'<div><label class="tiny" for="p_sex">'+t("Sex")+'</label><select id="p_sex">'
     +'<option value="m"'+(yp.sex==="m"?" selected":"")+'>'+t("Male")+'</option>'
     +'<option value="f"'+(yp.sex==="f"?" selected":"")+'>'+t("Female")+'</option></select></div></div>'
     +'<div class="mt"><label class="tiny" for="p_act">'+t("Activity")+'</label><select id="p_act">'
     +[[1.2,t("Desk, no training")],[1.375,t("Light, 1-3 days")],[1.4,t("Desk plus 3 lifts")],
       [1.55,t("Moderate, 4-5 days")],[1.725,t("Heavy, 6+ days")]].map(function(a){
         return '<option value="'+a[0]+'"'+(+yp.activity===a[0]?" selected":"")+'>'+a[1]+'</option>';}).join("")
     +'</select></div>'
     +'<div class="mt"><label class="tiny" for="p_goal">'+t("Goal")+'</label><select id="p_goal">'
     +[["lose",t("Lose fat")],["maintain",t("Maintain")],["gain",t("Build muscle")],
       ["recomp",t("Recomposition")]].map(function(a){
         return '<option value="'+a[0]+'"'+(yp.goal===a[0]?" selected":"")+'>'+a[1]+'</option>';}).join("")
     +'</select></div>'
     +'<p class="tiny mt">'+t("Maintenance estimate")+' '+tdee()+' kcal. '
     +t("Suggested target")+' '+targetKcal()+' kcal.</p>'
     +'<button class="btn" data-saveyou="1">'+t("Save")+'</button>'
     +'<button class="btn g" data-calc="1">'+t("Use the suggested targets")+'</button>';
  }
  else if(V.sheet==="set_training"){
    var tp=S.prefs,tpr=S.profile;
    b='<h2>'+t("Training")+'</h2><div class="list mt">'
     +'<button class="item" data-progmode="1"><div><div>'+t("Progression")+'</div>'
     +'<div class="tiny">'+t("How fast Bunyan adds weight")+'</div></div><span class="dim">'
     +t(tpr.prog.charAt(0).toUpperCase()+tpr.prog.slice(1))+'</span></button>'
     +'<button class="item" data-rpemode="1"><span>'+t("Ask for RPE")+'</span><span class="dim">'
     +({every:t("Every set"),last:t("Last set only"),off:t("Never")})[tp.rpe]+'</span></button>'
     +'<button class="item" data-toggle="autorest"><span>'+t("Auto-start rest timer")+'</span>'
     +'<span class="'+(tp.autorest?"pill ok":"dim")+'">'+(tp.autorest?t("On"):t("Off"))+'</span></button>'
     +'<button class="item" data-warnmode="1"><span>'+t("Countdown warning")+'</span><span class="dim">'
     +(tp.warn||10)+' '+t("sec")+'</span></button>'
     +'<button class="item" data-toggle="sound"><span>'+t("Sounds")+'</span>'
     +'<span class="'+(tp.sound?"pill ok":"dim")+'">'+(tp.sound?t("On"):t("Off"))+'</span></button>'
     +'<button class="item" data-testsound="1"><div><div>'+t("Test sound")+'</div>'
     +'<div class="tiny">'+t("Hear nothing? Check the side switch on your phone")+'</div></div>'
     +'<span class="pill a">'+t("Play")+'</span></button>'
     +'<button class="item" data-toggle="awake"><span>'+t("Keep screen awake")+'</span>'
     +'<span class="'+(tp.awake?"pill ok":"dim")+'">'+(tp.awake?t("On"):t("Off"))+'</span></button>'
     +'<button class="item" data-sheet="gear"><span>'+t("My equipment")+'</span><span class="dim">'
     +(S.gear&&S.gear.length?S.gear.length+" "+t("selected"):t("Everything"))+'</span></button>'
     +'<button class="item" data-sheet="likes"><span>'+t("Favourites and exclusions")+'</span>'
     +'<span class="dim">'+S.favs.length+" ★ · "+S.skip.length+' '+t("hidden")+'</span></button>'
     +'</div>'
     +'<p class="tiny">'+t("Conservative adds 2.5 kg. Standard adds 2.5 on isolation and 5 on the big lifts. Aggressive adds 5 and 10.")+'</p>';
  }
  else if(V.sheet==="set_nutrition"){
    var ng=S.goals;
    b='<h2>'+t("Nutrition")+'</h2><p class="tiny" style="margin:2px 0 14px">'
     +t("Your daily targets. The rings on Home and Food measure against these.")+'</p>'
     +'<div class="grid2">'
     +'<div><label class="tiny" for="g_kcal">'+t("Calories")+'</label>'
     +'<input id="g_kcal" type="number" value="'+ng.kcal+'"></div>'
     +'<div><label class="tiny" for="g_p">'+t("Protein")+' (g)</label>'
     +'<input id="g_p" type="number" value="'+ng.p+'"></div>'
     +'<div><label class="tiny" for="g_c">'+t("Carbs")+' (g)</label>'
     +'<input id="g_c" type="number" value="'+ng.c+'"></div>'
     +'<div><label class="tiny" for="g_f">'+t("Fat")+' (g)</label>'
     +'<input id="g_f" type="number" value="'+ng.f+'"></div>'
     +'<div><label class="tiny" for="g_water">'+t("Water")+' (ml)</label>'
     +'<input id="g_water" type="number" value="'+ng.water+'"></div>'
     +'<div><label class="tiny" for="g_steps">'+t("Steps")+'</label>'
     +'<input id="g_steps" type="number" value="'+ng.steps+'"></div></div>'
     +'<p class="tiny mt">'+t("Your macros add up to")+' '+macroKcal(ng.p,ng.c,ng.f)+' kcal.</p>'
     +'<button class="btn" data-savegoals="1">'+t("Save targets")+'</button>';
  }
  else if(V.sheet==="set_app"){
    var ap=S.prefs;
    b='<h2>'+t("App")+'</h2><div class="list mt">'
     +'<button class="item" data-theme="1"><span>'+t("Theme")+'</span><span class="dim">'
     +(S.theme==="dark"?t("Dark"):t("Light"))+'</span></button>'
     +'<button class="item" data-langmode="1"><span>'+t("Language")+'</span><span class="dim">'
     +(ap.lang==="ar"?"العربية":"English")+'</span></button>'
     +'<button class="item" data-unitmode="1"><div><div>'+t("Units")+'</div>'
     +'<div class="tiny">'+t("Display only. Your history is never rewritten.")+'</div></div>'
     +'<span class="dim">'+(ap.unit==="lb"?t("Pounds (lb)"):t("Kilograms (kg)"))+'</span></button>'
     /* Only where the platform can actually vibrate. Safari has no vibration API. */
     +(("vibrate" in navigator)
       ?'<button class="item" data-toggle="haptic"><span>'+t("Haptic feedback")+'</span>'
        +'<span class="'+(ap.haptic!==false?"pill ok":"dim")+'">'
        +(ap.haptic!==false?t("On"):t("Off"))+'</span></button>'
       :'')
     +'<button class="item" data-toggle="anim"><span>'+t("Animations")+'</span>'
     +'<span class="'+(ap.anim!==false?"pill ok":"dim")+'">'
     +(ap.anim!==false?t("On"):t("Off"))+'</span></button>'
     +'<button class="item" data-toggle="compact"><span>'+t("Interface density")+'</span>'
     +'<span class="dim">'+(ap.compact?t("Compact"):t("Comfortable"))+'</span></button>'
     +'<button class="item" data-toggle="splash"><span>'+t("Opening screen")+'</span>'
     +'<span class="'+(ap.splash!==false?"pill ok":"dim")+'">'
     +(ap.splash!==false?t("On"):t("Off"))+'</span></button>'
     +'</div>';
  }
  else if(V.sheet==="set_profiles"){
    b='<h2>'+t("Profiles on this phone")+'</h2>'
     +'<p class="tiny" style="margin:2px 0 14px">'
     +t("Anyone training on your phone gets their own profile. Nothing crosses over.")+'</p>'
     +'<div class="list">';
    PROFILES.forEach(function(pp){
      b+='<button class="item" data-switch="'+pp.id+'"><div><div style="font-weight:600">'
       +esc(pp.name)+(pp.owner?' <span class="pill a">'+t("admin")+'</span>':'')+'</div>'
       +'<div class="tiny">'+(pp.id===CUR?t("in use now"):t("separate log, separate numbers"))
       +'</div></div>'
       +(pp.id===CUR?'<span class="pill a">'+t("current")+'</span>':'<span class="chev">›</span>')
       +'</button>';});
    b+='</div><div class="rowc">'
     +'<button class="btn g sm" data-addprofile="1">'+t("Add a profile")+'</button>'
     +'<button class="btn g sm" data-renameprofile="1">'+t("Rename this one")+'</button>'
     +(PROFILES.length>1&&!isOwner()
        ?'<button class="btn d sm" data-delprofile="1">'+t("Delete")+'</button>':'')
     +'</div>';
  }
  else if(V.sheet==="set_data"){
    var bAge=backupAgeDays();
    b='<h2>'+t("Backup and reset")+'</h2><div class="list mt">'
     +'<button class="item" data-export="1"><div><div>'+t("Export a backup")+'</div>'
     +'<div class="tiny">'+(bAge===null?t("Never backed up")
        :bAge===0?t("Backed up today"):t("Last backup")+' '+bAge+' '+t("days ago."))+'</div></div>'
     +'<span class="chev">›</span></button>'
     +'<button class="item" data-import="1"><span>'+t("Restore from a backup")+'</span>'
     +'<span class="chev">›</span></button>'
     +'<button class="item" data-wipe="1"><span style="color:var(--accent)">'
     +t("Delete everything")+'</span><span class="chev">›</span></button>'
     +'</div>'
     +'<p class="tiny">'+t("Everything lives on this phone only. Nothing is uploaded anywhere. Export a backup every few weeks so a cleared browser cannot cost you your history.")+'</p>';
  }
  else if(V.sheet==="plates"){
    var pw=num(V.draft.w),pbar=V.bar==null?20:V.bar;
    var plan=platePlan(pw,pbar);
    b='<h2>'+t("Plates")+'</h2>'
     +'<p class="tiny" style="margin:2px 0 14px">'+t("Per side, heaviest first.")+'</p>'
     +'<div class="card" style="text-align:center">'
     +'<div class="tiny">'+t("Target")+'</div>'
     +'<div class="metric" style="font-size:34px;margin-top:2px">'+fmtW(pw)+'</div></div>';
    b+='<div class="rowc" style="gap:var(--s2);flex-wrap:wrap;margin-bottom:var(--s3)">'
     +'<span class="tiny" style="width:100%">'+t("Bar")+'</span>'
     +[20,15,10,0].map(function(bw){
       return '<button class="pill'+(pbar===bw?" a":"")+'" data-bar="'+bw+'">'
         +(bw?toDisp(bw)+wUnit():t("No bar"))+'</button>';}).join("")
     +'</div>';
    if(plan.under){
      b+='<p class="tiny">'+t("The target is lighter than the bar.")+'</p>';
    }else if(!plan.plates.length){
      b+='<p class="tiny">'+t("Just the bar.")+'</p>';
    }else{
      b+='<div class="list">'+plan.plates.map(function(x){
        return '<div class="item"><span style="font-weight:700">'+x.w+wUnit()+'</span>'
          +'<span class="dim">× '+x.n+'</span></div>';}).join("")+'</div>';
      b+='<p class="tiny">'+t("Each side")+': '+r1(plan.perSide)+wUnit()+'.'
       +(plan.left>0?' '+t("Cannot make the last")+' '+plan.left+wUnit()+'.':'')+'</p>';
    }
  }
  else if(V.sheet==="note"){
    b='<h2>'+t("Session note")+'</h2>'
     +'<p class="tiny" style="margin:2px 0 12px">'
     +t("Saved with the workout. How you felt, what hurt, what to change next time.")+'</p>'
     +'<textarea id="snote" rows="5" placeholder="'+t("Left shoulder tight on the second set…")+'" '
     +'style="width:100%;background:var(--raised);color:var(--text);border:1px solid var(--border);'
     +'border-radius:11px;padding:12px;font-size:15px;resize:none">'
     +esc((S.active&&S.active.notes)||"")+'</textarea>'
     +'<button class="btn" data-savenote="1">'+t("Save")+'</button>';
  }
  /* One wrapper, 21 sheets. The close control is sticky so it survives long content —
     tapping outside only ever exposed a ~12vh strip, which is why sheets felt trapped. */
  /* ask and confirm already carry their own explicit Cancel, so the wrapper's
     trailing Close would be a third way to dismiss the same sheet. */
  var terse=(V.sheet==="ask"||V.sheet==="confirm");
  return '<div class="sheet" data-close="1"><div class="sheetbox" data-stop="1" role="dialog" '
        +'aria-modal="true">'
        +'<div class="sheethead"><button class="x" data-close="1" aria-label="'+t("Close")+'">✕</button></div>'
        +b+(terse?'':'<button class="btn d" data-close="1">'+t("Close")+'</button>')
        +'</div></div>';}


export {vSheet};
