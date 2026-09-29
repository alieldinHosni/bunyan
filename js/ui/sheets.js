/* Bunyan — sheets
   Every bottom sheet, dispatched by vSheet(). */
import {t} from "../i18n/dict.js";
import {difficultyOf, empty, EQUIP, EXDB, exImg, exMedia, exSteps, exVariant, isFav, LIB, libFind, loadable, muscleOf, muscleOfEntry, MUSCLES, patternOf, pickable, secondaryOf, thumb} from "../data/exercises.js";
import {exName} from "../i18n/exnames.js";
import {MEALS} from "./views/food.js";
import {myDaysList, planOn} from "./views/train.js";
import {ACT_GROUPS, actIcon, actInfo, actsIn, INTENSITY, intensityOf, isActivity} from "../data/activities.js";
import {backupAgeDays, bestE1RM, eatenToday, lastWeight, macroKcal, prevPerf, prFor, sessionVolume, targetKcal, tdee, volume} from "../engine/formulas.js";
import {sumNutrition} from "../engine/nutrition.js";
import {fuzzyRank, tokenMatch} from "../engine/text.js";
import {GOALS, LEVELS, splitCandidates} from "../engine/plan.js";
import {groupLabel, groupRun, mmss, platePlan} from "./views/session.js";
import {ensureSessionIds, buildSnapshot, CUR, dayOf, dayRec, friends, isOwner, PROFILES, S, snapStats, split} from "../state.js";
import {fmtW, inLb, toDisp, wUnit} from "../units.js";
import {esc, fmtN, num, pretty, r1, shortd, today} from "../util.js";
import {CUES, MISTAKES, progressBar, sparkline, stepper, V} from "./view.js";
import {photoById} from "./photos.js";
import {afHead, afTile, fitCh, vAddFood, vManual} from "./views/addfood.js";

/* ============================================================ sheets */
var SHEET_KICK={weigh:"Body",measure:"Body",photo:"Body",steps:"Activity",recovery:"Recovery",
  gear:"Training",likes:"Training",exercise:"Training",exhist:"History",share:"Sharing",coach:"Sharing",
  backup:"Your data",restore:"Your data",set_you:"Settings",set_training:"Settings",set_app:"Settings",
  set_profiles:"Settings",set_data:"Settings",plates:"Workout",note:"Workout",text:"Nutrition",exdetail:"Exercise"};
var CFICON={
  leave:'<path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M9 16l-4-4 4-4M5 12h11"/>',
  trash:'<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>'
};
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
    /* An optional second action, between the primary and Cancel. One sheet asks three
       questions rather than two — used by the leave-workout prompt, where keeping the
       workout is the primary and discarding it is a real but secondary choice. It is
       styled .danger rather than .btn so the two cannot be confused at a glance. */
    /* Centred, with an optional icon, pill buttons in sentence case. The secondary
       action is a quiet red text button under the other two, so it reads as the real
       but rarer choice it is; Cancel can be renamed ("Keep training") where plain
       Cancel would be ambiguous. */
    b='<div class="cf">'
     +(c.icon&&CFICON[c.icon]?'<span class="cf-i'+(c.icon==="trash"?' bad':'')+'" aria-hidden="true"><svg viewBox="0 0 24 24">'+CFICON[c.icon]+'</svg></span>':'')
     +'<h2>'+esc(c.title||"")+'</h2>'
     +(c.body?'<p class="cf-b">'+esc(c.body)+'</p>':'')
     +'<div class="cf-acts">'
     +'<button class="btn cf-ok" data-confirmok="1">'+esc(c.cta||t("Delete"))+'</button>'
     +'<button class="btn g cf-no" '+(c.back?'data-restore="1"':'data-close="1"')+'>'+esc(c.cancel||t("Cancel"))+'</button>'
     +(c.alt?'<button class="cf-alt" data-confirmalt="1">'+esc(c.alt)+'</button>':'')
     +'</div></div>';
  }
  else if(V.sheet==="exercise"){
    var q=V.exq.toLowerCase();
    var target=(V.sd&&V.sd.like)||null;
    /* Token matching, not substring: names carry qualifiers, so "incline bench" has
       to find "Barbell Incline Bench Press - Medium Grip" whichever order the words
       are typed in. Same matcher the food search uses. */
    var list=LIB.filter(function(l){
      /* The exercise being replaced is not one of its own alternatives. It ranked
         near the top of its own list, because it scores full marks against itself. */
      if(V.sd&&(V.sd.replace||V.sd.swaplive)&&l[0]===target)return false;
      if(V.exm!=="All"&&l[1]!==V.exm)return false;
      if(V.exe&&V.exe!=="All"&&l[2]!==V.exe)return false;
      if(q&&!tokenMatch(q,l[0]))return false;
      if(!V.showAll&&!pickable(l[0]))return false;
      return true;});
    /* Zero hits only, exactly as in the food search: a near miss is offered under
       "Did you mean…", never chosen for you. */
    var guess=[];
    if(q&&!list.length){
      var pool=LIB.filter(function(l){return V.showAll||pickable(l[0]);});
      guess=fuzzyRank(q,pool,function(l){return [l[0]];},6)
        .map(function(r){return r.item;});
    }
    if(target){
      var tp=patternOf(target),tm=muscleOf(target),te=(EXDB[target]||{}).e;
      list.sort(function(a,b){
        function sc(l){var s2=0;
          if(l[1]===tm)s2+=4; if(patternOf(l[0])===tp)s2+=3;
          if(l[2]===te)s2+=2; if(isFav(l[0]))s2+=2; return -s2;}
        return sc(a)-sc(b);});}
    else list.sort(function(a,b){return (isFav(b[0])?1:0)-(isFav(a[0])?1:0);});
    list=list.slice(0,80);
    /* Swapping the live exercise is a replacement too — it titled itself "Add
       exercise", which is what the sheet does in its other mode, not this one. */
    var swapping=!!(V.sd&&(V.sd.replace||V.sd.swaplive));
    b='<h2>'+t(swapping?"Replace Exercise":"Add exercise")+'</h2>';
    /* The frame names what is being replaced before listing what could replace it.
       The picker never did, so the title was the only thing on screen that said a
       replacement was in progress — and it did not say of what. */
    if(swapping&&target)
      b+='<div class="exswapfrom"><div style="min-width:0">'
       +'<div class="exswapfrom-k">'+t("Current exercise")+'</div>'
       +'<div class="exswapfrom-n">'+esc(exName(target))+'</div></div>'
       +'<span class="exswapfrom-b">'+t("SWAPPING")+'</span></div>';
    b+='<p class="tiny" style="margin:2px 0 12px">'
     +(target?t("Best alternatives first.")+' ':'')
     +list.length+' '+t("shown")+(S.gear&&S.gear.length?', '+t("matched to your equipment"):'')+'.</p>';
    /* The field and the filters stay put while you type; only the results below
       change. Letting the field scroll away was half of why search felt like it
       was jumping. */
    b+='<div class="exqbar">'
     +'<input id="exq" placeholder="'+t("Search")+'" value="'+esc(V.exq)+'" '
     +'autocapitalize="none" autocorrect="off" enterkeyhint="search">'
     +'<div class="exfilters">';
    ["All"].concat(MUSCLES).forEach(function(m){
      b+='<button class="pill'+(V.exm===m?" a":"")+'" data-exm="'+m+'" style="border:none;flex-shrink:0">'+t(m)+'</button>';});
    b+='</div>';
    /* Equipment, which the frame puts beside the muscle pills. V.exe already filtered
       the list above — it simply had no control in this sheet, so it could only be set
       by arriving from the bodyweight entry and never cleared from here. */
    b+='<div class="exfilters">';
    ["All"].concat(EQUIP).forEach(function(q2){
      b+='<button class="pill'+(V.exe===q2?" a":"")+'" data-exe="'+q2+'" style="border:none;flex-shrink:0">'+t(q2)+'</button>';});
    b+='</div></div>';
    /* A floor under the results. Without it the container collapses to nothing on a
       no-match and springs back on the next character, which moves the whole screen
       under the user's finger — a separate cause from the re-render. */
    /* The frame's result row: name, then equipment · difficulty, then the action. The
       muscle is only worth a slot when the muscle filter is not already showing it. */
    function exRow(l,k){
      var meta=[exVariant(l[0])?esc(exVariant(l[0])):"",
                V.exm==="All"?t(l[1]):"",
                t(l[2]),t(difficultyOf(l[0]))].filter(Boolean).join(" · ");
      return '<button class="item" data-k="'+k+':'+esc(l[0])+'" data-pickex="'+esc(l[0])+'">'
       +'<div style="min-width:0"><div style="font-weight:600">'+esc(exName(l[0]))+'</div>'
       +'<div class="tiny">'+meta+'</div></div>'
       /* Styled as the frame's Swap button rather than being one: a button inside the
          row button is invalid, and two targets on one row is worse to hit than one. */
       +'<span class="exswap">'+t(swapping?"Swap":"Add")+'</span></button>';}
    b+='<div class="exresults"><div class="list">';
    list.forEach(function(l){b+=exRow(l,"ex");});
    b+='</div>';
    if(!list.length&&guess.length){
      b+='<div class="overline" style="margin-top:var(--s4)">'+t("Did you mean")+'…</div><div class="list">';
      guess.forEach(function(l){b+=exRow(l,"gs");});
      b+='</div>';
    }
    if(!list.length&&!guess.length)b+=empty("search",
      V.exq?t("Nothing matches")+" “"+V.exq+"”":t("Nothing matches those filters"),
      S.gear&&S.gear.length&&!V.showAll
        ?t("You may have filtered it out with your equipment, or it may not be in the library.")
        :t("Your gym may call it something else, or it may not be in the library at all."),
      '<button class="btn" data-customex="1">'+t("Add it yourself")+'</button>');
    b+='</div>';
    b+='<button class="btn g" data-showall="1">'
     +t(V.showAll?"Only what I can do":"Show everything, including gear I lack")+'</button>';
  }
  /* The session's overflow. Canvas screen 4 leaves two links under the set table and
     nothing else, so the five infrequent actions live here instead of in a six-button
     row competing with the set you are trying to log. Nothing was dropped. */
  else if(V.sheet==="sessmore"){
    var sm=S.active,smE=sm&&sm.entries[V.logIdx];
    if(!smE)return "";
    b='<h2>'+t("Session")+'</h2>'
     +'<p class="sub" style="margin:2px 0 16px">'+esc(exName(smE.name))+'</p>'
     +'<div class="list">'
     +'<button class="item" data-exdetail="'+esc(smE.name)+'"><span>'+t("How to do it")+'</span>'
     +'<span class="chev">›</span></button>'
     +(loadable(smE.name)?'<button class="item" data-plates="1"><span>'+t("Plates")+'</span>'
       +'<span class="chev">›</span></button>':'')
     +'<button class="item" data-note="1"><span>'+t("Session note")+'</span>'
     +(sm.notes?'<span class="pill a">'+t("Saved")+'</span>':'<span class="chev">›</span>')+'</button>'
     +'</div>'
     +'<button class="btn" data-finish="1">'+t("Finish workout")+'</button>'
     +'<button class="btn danger" data-discard="1">'+t("Discard workout")+'</button>';
  }
  else if(V.sheet==="editex"){
    var d=dayOf(V.dayId),e=null;
    if(d)e=d.ex.filter(function(x){return x.id===V.sd.id;})[0];
    if(!e)return "";
    if(isActivity(e.name)){
      /* A match or a run: planned as how long, how hard, and how far where that
         applies — the same three things the session logs. */
      var aiE=actInfo(e.name),rpeE=V.sd.rpe||e.rpe||6,curE=intensityOf(rpeE)[0];
      b='<h2>'+esc(exName(e.name))+'</h2><p class="tiny">'+esc(t(aiE.grp))+'</p>'
       +'<div class="act-lbl">'+t("Planned duration")+'</div>'
       +'<div class="act-km"><input id="e_min" type="number" inputmode="numeric" min="1" value="'+(e.min||(aiE.grp==="Sports"?60:30))+'" aria-label="'+t("Planned duration")+'"><span>'+t("min")+'</span></div>'
       +(aiE.dist?'<div class="act-lbl">'+t("Target distance")+' <i>'+t("optional")+'</i></div>'
         +'<div class="act-km"><input id="e_km" type="number" inputmode="decimal" step="0.1" min="0" value="'+(e.km||"")+'" placeholder="0.0" aria-label="'+t("Target distance")+'"><span>km</span></div>':'')
       +'<div class="act-lbl">'+t("Intensity")+'</div><div class="act-int">'
       +INTENSITY.map(function(x){return '<button class="'+(curE===x[0]?'on':'')+'" data-exint="'+x[0]+'" aria-pressed="'+(curE===x[0])+'">'+t(x[1])+'</button>';}).join("")
       +'</div>'
       +'<button class="btn" data-saveex="'+e.id+'" style="margin-top:18px">'+t("Save")+'</button>'
       +'<div class="rowc mt"><button class="btn g sm" data-moveex="'+e.id+'|-1">'+t("Move up")+'</button>'
       +'<button class="btn g sm" data-moveex="'+e.id+'|1">'+t("Move down")+'</button>'
       +'<button class="btn g sm" data-replaceex="'+e.id+'">'+t("Replace")+'</button></div>'
       +'<button class="btn g" data-exhist="'+esc(e.name)+'" style="margin-top:10px">'+t("See my history")+'</button>'
       +'<button class="btn d" data-delex="'+e.id+'">'+t("Remove from this day")+'</button>';
    }else{
    b='<h2>'+esc(exName(e.name))+'</h2><p class="tiny" style="margin:2px 0 14px">'+esc(t(muscleOfEntry(e)))+'</p>'
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
     +t("Raw inputs only. No score, no verdict. You decide what to do with them.")+'</p>'
     +'<div class="grid2"><div><label class="tiny">'+t("Sleep (hours)")+'</label><input id="r_sleep" type="number" step="0.25" value="'+(r.sleep||"")+'"></div>'
     +'<div><label class="tiny">'+t("Soreness 0-10")+'</label><input id="r_sore" type="number" value="'+(r.sore||"")+'"></div>'
     +'<div><label class="tiny">'+t("Energy 0-10")+'</label><input id="r_energy" type="number" value="'+(r.energy||"")+'"></div>'
     +'<div><label class="tiny">'+t("Pain or discomfort 0-10")+'</label><input id="r_ankle" type="number" value="'+(r.ankle||"")+'"></div></div>'
     +'<div class="mt"><label class="tiny">Notes</label><input id="r_notes" value="'+esc(r.notes||"")+'"></div>'
     +'<button class="btn" data-saverec="1">Save</button>';
  }
  else if(V.sheet==="measure"){
    /* Each field shows its own last reading as a hint, not as a value. Prefilled
       values were saved again as today's reading, so measuring only the waist also
       logged an unchanged chest, and Progress reported "±0" against it.

       Hips and body fat are here because Progress reads both (engine/stats.js):
       hips for the circumference body-fat estimate, which needs them for women, and
       an entered body-fat figure from a scale or scan, which it prefers. Neither
       could be entered before, so a woman never got an estimate at all. */
    var lastOf=function(k){var r=S.body.filter(function(x){return num(x[k])>0;}).slice(-1)[0];return r?r[k]:"";};
    b='<h2>'+t("Measurements")+'</h2><p class="tiny" style="margin:2px 0 14px">'+t("In centimetres. Leave blank to skip.")+'</p>'
     +'<div class="grid2">'
     +[["Chest","m_chest","chest"],["Waist","m_waist","waist"],["Hips","m_hips","hips"],["Arms","m_arms","arms"],
       ["Thighs","m_thighs","thighs"],["Calves","m_calves","calves"],["Neck","m_neck","neck"],["Body fat %","m_bf","bf"]]
      .map(function(m){return '<div><label class="tiny" for="'+m[1]+'">'+esc(t(m[0]))+'</label>'
        +'<input id="'+m[1]+'" type="number" inputmode="decimal" step="0.1" placeholder="'+esc(lastOf(m[2]))+'"></div>';}).join("")
     +'</div><button class="btn" data-savemeasure="1">'+t("Save for today")+'</button>';
  }
  else if(V.sheet==="photo"){
    /* One progress photo, large, with its date and the way to delete it. */
    var ph=photoById(V.sd&&V.sd.id);
    if(!ph)b='<h2>'+t("Progress photo")+'</h2><p class="sub">'+t("This photo is no longer on this phone.")+'</p>';
    else b='<h2>'+t("Progress photo")+'</h2><p class="tiny" style="margin:2px 0 12px">'+esc(pretty(ph.d))+'</p>'
     +'<img class="pgphoto-img" src="'+ph.url+'" alt="'+esc(t("Progress photo")+", "+pretty(ph.d))+'"'
     +' width="'+(ph.w||300)+'" height="'+(ph.h||400)+'">'
     +'<button class="btn danger" data-delphoto="'+esc(ph.id)+'">'+t("Delete photo")+'</button>';
  }
  else if(V.sheet==="text"){
    b='<h2>'+esc(V.sd.title)+'</h2><p class="tiny" style="margin:2px 0 12px">'+esc(V.sd.note||"")+'</p>'
     +'<input id="txt" value="'+esc(V.sd.value||"")+'" placeholder="'+esc(V.sd.ph||"")+'">'
     +'<button class="btn" data-savetext="1">Save</button>';
  }
  /* The food group's sheets live in views/addfood.js — three modes and the manual
     entry are more than belongs inline among twenty others. */
  else if(V.sheet==="addfood"){b=vAddFood();}
  else if(V.sheet==="manual"){b=vManual();}
  else if(V.sheet==="pickfood"){
    var pi=V.sd.idx, cur=V.food.items[pi];
    b=afHead(t("Which one?"),{sub:'<span class="afsub">'+esc(t("You typed"))+' “'
       +esc(cur.parsed.raw)+'”</span>'})
     +'<div class="afresults">';
    cur.alts.forEach(function(f,i){
      var on=f.id===cur.food.id;
      b+='<div class="afres"><button class="afres-b" data-choose="'+pi+'|'+i+'">'
       +'<span class="afres-n">'+esc(f.n)+'</span>'
       +'<span class="afres-m">'+fmtN(f.kcal)+' kcal / 100 g'+(f.cat?' · '+esc(t(f.cat)):'')+'</span></button>'
       +(on?'<span class="afcur">'+esc(t("Current"))+'</span>':'')+'</div>';});
    b+='</div><button class="btn g" data-online="'+esc(cur.parsed.query)+'">'+esc(t("Search online instead"))+'</button>';
  }
  else if(V.sheet==="dayview"){
    ensureSessionIds();
    var dv=V.sd.date, rv2=S.days[dv]||{meals:{}}, sess=S.sessions.filter(function(x){return x.date===dv;});
    var et=eatenToday(dv);
    /* One day at a glance, in the same order as the tabs: food, then training. */
    b='<div class="se-top"><span class="se-k">'+t("Day details")+'</span><h2>'+pretty(dv)+'</h2></div>';
    b+='<div class="wc2-stats dv-stats">'
     +'<div><b>'+fmtN(et.kcal||0)+'</b><span>kcal</span></div>'
     +'<div><b>'+(et.p||0)+'<small>g</small></b><span>'+t("Protein")+'</span></div>'
     +'<div><b>'+(et.c||0)+'<small>g</small></b><span>'+t("Carbs")+'</span></div>'
     +'<div><b>'+(et.f||0)+'<small>g</small></b><span>'+t("Fat")+'</span></div></div>';
    b+='<h3 class="dv-h">'+t("Meals")+'</h3>';
    var anyMeal=false;
    MEALS.forEach(function(mn){
      var mm=rv2.meals[mn];
      if(!mm||!(mm.items||[]).length)return;anyMeal=true;
      b+='<div class="dv-card"><div class="dv-row"><b>'+esc(t(mn))+'</b>'
       +'<span class="dv-k">'+fmtN(sumNutrition(mm.items).kcal)+' kcal</span></div>';
      mm.items.forEach(function(it){
        b+='<div class="dv-row dv-it"><span>'+esc(it.n)+'</span><span>'+fmtN(it.kcal)+'</span></div>';});
      b+='</div>';});
    if(!anyMeal)b+='<p class="dv-none">'+t("No food logged.")+'</p>';
    b+='<h3 class="dv-h">'+t("Training")+'</h3>';
    if(!sess.length)b+='<p class="dv-none">'+t("No session logged.")+'</p>';
    sess.forEach(function(x){
      var n=x.entries.filter(function(e){return e.sets.length;}).length;
      b+='<button class="dv-card dv-sess" data-sessedit="'+esc(x.id)+'" aria-label="'+esc(t("Edit workout")+": "+x.dayName)+'">'
       +'<span class="dv-row"><b>'+esc(x.dayName)+'</b><span class="dv-k">'+fmtW(Math.round(sessionVolume(x)))+'</span></span>'
       +'<span class="dv-row dv-it"><span>'+n+' '+t(n===1?"exercise":"exercises")+'</span>'
       +'<span class="dv-edit">'+t("Edit")+' ›</span></span></button>';});
    if(rv2.steps)b+='<div class="dv-card dv-row"><b>'+t("Steps")+'</b><span class="dv-k">'+fmtN(rv2.steps)+'</span></div>';
    b+='<div class="cf-acts se-acts"><button class="btn g cf-no" data-jumpfood="'+dv+'">'+t("Open this day in Food")+'</button></div>';
  }
  else if(V.sheet==="acts"){
    /* A run, a match, a class: pick one and it opens straight into logging it. */
    b='<div class="se-top"><span class="se-k">'+t("Training")+'</span><h2>'+t("Cardio & Sports")+'</h2>'
     +'<p class="shsub">'+t("Log time, distance and effort instead of sets.")+'</p></div>';
    ACT_GROUPS.forEach(function(g){
      b+='<div class="exd-h">'+t(g)+'</div><div class="actgrid">';
      actsIn(g).forEach(function(n){
        b+='<button class="actbtn" data-quickact="'+esc(n)+'">'+actIcon(n,24)+'<span>'+esc(exName(n))+'</span></button>';});
      b+='</div>';});
  }
  else if(V.sheet==="swapday"){
    /* Which day of the plan this date runs. The rotation's own pick is marked, and
       choosing it again clears the swap. */
    var sd2=V.sd.date,spx=split(),cur=planOn(spx,sd2);
    var auto=(S.daySwap||{})[sd2]?null:(cur.day||{}).id;
    b='<div class="se-top"><span class="se-k">'+esc(pretty(sd2))+'</span><h2>'+t("Change workout")+'</h2>'
     +'<p class="shsub">'+t("Pick what you want to do on this day. The rest of the plan moves on from what you actually train.")+'</p></div>'
     +'<div class="card tdays">';
    spx.days.forEach(function(d){
      var on=cur.day&&cur.day.id===d.id;
      b+='<button class="trow'+(on?' on':'')+'" data-swapto="'+d.id+'" aria-pressed="'+(on?"true":"false")+'">'
       +'<span><span class="trow-n">'+esc(d.name)+'</span>'
       +'<span class="trow-s">'+(d.ex.length?d.ex.length+' '+t("exercises"):t("rest day"))+'</span></span>'
       +(on?'<span class="tnext">'+t("Selected")+'</span>':'')+'</button>';});
    b+='</div>';
    if((S.daySwap||{})[sd2])b+='<button class="btn g" data-swapto="">'+t("Back to the plan")+'</button>';
  }
  else if(V.sheet==="mydays"){
    b='<div class="se-top"><span class="se-k">'+esc(split().name)+'</span><h2>'+t("My Training")+'</h2></div>'
     +myDaysList()
     +'<button class="btn g" data-train="splits">'+t("Change program")+'</button>';
  }
  else if(V.sheet==="sessedit"){
    /* A logged workout, correctable after the fact: the date, every set's load and
       reps, a set or a whole exercise removed — or the session thrown away. It edits a
       working copy (V.sd.work) and writes only on Save, so backing out changes nothing. */
    var ws2=V.sd.work;
    b='<div class="se">'
     +'<div class="se-top"><span class="se-k">'+t("Edit workout")+'</span>'
     +'<h2>'+esc(ws2.dayName||t("Workout"))+'</h2>'
     +'<label class="se-date"><span>'+t("Date")+'</span>'
     +'<input type="date" id="se_date" value="'+esc(ws2.date)+'" max="'+today()+'"></label></div>';
    var any=false;
    ws2.entries.forEach(function(en,ei){
      if(!en.sets.length)return;any=true;
      var isA=isActivity(en.name);
      b+='<section class="se-ex"><div class="se-exh"><h3>'+esc(exName(en.name))+'</h3>'
       +'<button class="se-rm" data-sexdel="'+ei+'" aria-label="'+esc(t("Remove exercise"))+'">'
       +'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg></button></div>'
       +'<div class="se-hd" aria-hidden="true"><span>'+t(isA?"Bout":"Set")+'</span><span>'+(isA?t("min"):wUnit())+'</span><span></span><span>'+(isA?"km":t("Reps"))+'</span><span></span></div>';
      en.sets.forEach(function(st,si){
        if(isA){
          b+='<div class="se-row"><span class="se-n">'+(si+1)+'</span>'
           +'<input id="se_m_'+ei+'_'+si+'" type="number" inputmode="numeric" min="1" value="'+num(st.min)+'" aria-label="'+esc(t("Duration"))+'">'
           +'<span class="se-x" aria-hidden="true">·</span>'
           +'<input id="se_k_'+ei+'_'+si+'" type="number" inputmode="decimal" step="0.1" min="0" value="'+(num(st.km)||"")+'" placeholder="—" aria-label="'+esc(t("Distance"))+'">'
           +'<button class="se-del" data-ssetdel="'+ei+':'+si+'" aria-label="'+esc(t("Delete")+" "+(si+1))+'">✕</button></div>';
          return;}
        b+='<div class="se-row"><span class="se-n">'+(si+1)+'</span>'
         +'<input id="se_w_'+ei+'_'+si+'" type="number" inputmode="decimal" step="any" min="0" value="'+(st.w?toDisp(st.w):"")+'" placeholder="—" aria-label="'+esc(t("Set")+" "+(si+1)+" "+wUnit())+'">'
         +'<span class="se-x" aria-hidden="true">×</span>'
         +'<input id="se_r_'+ei+'_'+si+'" type="number" inputmode="numeric" min="0" value="'+(st.r||"")+'" aria-label="'+esc(t("Set")+" "+(si+1)+" "+t("Reps"))+'">'
         +'<button class="se-del" data-ssetdel="'+ei+':'+si+'" aria-label="'+esc(t("Delete set")+" "+(si+1))+'">✕</button></div>';});
      b+='</section>';});
    if(!any)b+='<p class="se-empty">'+t("No sets left in this workout.")+'</p>';
    b+='<div class="cf-acts se-acts">'
     +'<button class="btn cf-ok" data-sesssave="1">'+t("Save changes")+'</button>'
     +'<button class="btn g cf-no" data-close="1">'+t("Cancel")+'</button>'
     +'<button class="cf-alt" data-sessdel="1">'+t("Delete workout")+'</button></div></div>';
  }
  else if(V.sheet==="exdetail"){
    var nD=V.sd.name, mD=muscleOf(nD), pD=patternOf(nD), secD=secondaryOf(nD), lD=libFind(nD);
    var prD=prFor(nD), pvD=prevPerf(nD);
    b='<h2>'+esc(exName(nD))+'</h2>';
    var subD=[t(pD),exVariant(nD)?esc(exVariant(nD)):""].filter(Boolean).join(" \u00b7 ");
    b+='<p class="tiny">'+subD+'</p>';
    /* The two positions first — what the movement looks like is what someone opening
       this between sets wants — then the four facts as one even grid. */
    var med=exMedia(nD);
    if(med)
      b+='<div class="exd-form2">'
       +'<figure><img src="'+exImg(nD,0)+'" alt="" decoding="async"><figcaption>'+t("Start")+'</figcaption></figure>'
       +'<figure><img src="'+exImg(nD,1)+'" alt="" decoding="async"><figcaption>'+t("End")+'</figcaption></figure></div>';
    b+='<div class="exd-facts">'
     +'<div><span>'+t("Primary")+'</span><b>'+t(mD)+'</b></div>'
     +'<div><span>'+t("Secondary")+'</span><b>'+(secD.length?secD.map(function(s){return t(s);}).join(" \u00b7 "):"—")+'</b></div>'
     +'<div><span>'+t("Equipment")+'</span><b>'+t(lD?lD[2]:"Other")+'</b></div>'
     +'<div><span>'+t("Difficulty")+'</span><b>'+t(difficultyOf(nD))+'</b></div></div>';
    /* Three steps by default. Nobody reads five paragraphs between sets, and the
       rest is one tap away for anyone who wants them. */
    b+='<div class="exd-h">'+t("How to Perform")+'</div><div class="exd-steps exd-card">';
    var steps=exSteps(nD)||(CUES[pD]||CUES.Isolation);
    var allSteps=!!V.exsteps,shown=allSteps?steps:steps.slice(0,3);
    shown.forEach(function(c,i){
      b+='<div class="exd-step"><span class="exd-num">'+(i+1)+'</span>'
       +'<p>'+esc(c)+'</p></div>';});
    b+='</div>';
    if(steps.length>3)
      b+='<button class="btn g sm" data-exsteps="1">'
       +(allSteps?t("Show fewer"):t("Show all")+' '+steps.length+' '+t("steps"))+'</button>';
    /* Mistakes are generated from the movement pattern, so every push exercise shows
       the same three lines. Worth keeping for a beginner; not worth the vertical space
       by default. The frame folds them into one ruled row, which is what this is \u2014
       the grey button it replaces said the same thing with less of the screen. */
    b+='<button class="exd-tips" data-exmiss="1" aria-expanded="'+(V.exmiss?"true":"false")+'">'
     +'<span class="exd-tips-l"><i aria-hidden="true">\u24d8</i>'+t("Tips & Common Mistakes")+'</span>'
     +'<span class="ico ico-cdown" aria-hidden="true"></span></button>';
    if(V.exmiss){
      b+='<div class="exd-miss">';
      (MISTAKES[pD]||MISTAKES.Isolation).forEach(function(c){
        b+='<div><b>\u00d7</b><span>'+esc(c)+'</span></div>';});
      b+='</div>';}
    /* The frame pins ADD TO WORKOUT to the foot of the screen. It shows only when
       there is a day open to put the exercise in and no workout running. V.dayId
       survives into a live session, so the day test alone would offer "add" from the
       ⓘ mid-set — and it would add to the plan, not to the workout in front of you. */
    if(!S.active&&dayOf(V.dayId))
      b+='<button class="btn exd-add" data-pickex="'+esc(nD)+'">'+t("Add to workout")+'</button>';
    if(prD.w)b+='<div class="exd-h">'+t("Your record")+'</div><div class="wc2-stats">'
     +'<div><b>'+fmtW(prD.w)+'</b><span>'+t("Heaviest")+'</span></div>'
     +'<div><b>'+(prD.e?fmtW(prD.e):"\u2014")+'</b><span>'+t("Best 1RM")+'</span></div>'
     +'<div><b>'+fmtN(prD.vol)+'</b><span>'+t("Best set")+'</span></div></div>';
    /* The star lives in the sheet header now, beside the \u2715, where a long exercise
       name wrapping to two lines cannot push it around. "Never suggest" is gone
       entirely: it hid results with nothing on screen to say why. */
    if(pvD)b+='<button class="btn g" data-exhist="'+esc(nD)+'">'+t("See every session")+'</button>';
    var simD=LIB.filter(function(l){return l[1]===mD&&l[0]!==nD&&patternOf(l[0])===pD;}).slice(0,6);
    if(simD.length){
      b+='<div class="exd-h">'+t("Similar exercises")+'</div><div class="card tdays">';
      simD.forEach(function(l){
        b+='<button class="trow libtrow" data-exdetail="'+esc(l[0])+'">'+thumb(l[0],44)
         +'<span><span class="trow-n">'+esc(exName(l[0]))+'</span>'
         +'<span class="trow-s">'+t(l[2])+' \u00b7 '+t(difficultyOf(l[0]))+'</span></span>'
         +'<span class="ico ico-chev" aria-hidden="true"></span></button>';});
      b+='</div>';}
  }
  else if(V.sheet==="done"){
    var w=V.sd;
    /* Kept to what matters straight after a workout: that it is done, three figures,
       a record if there was one — and what to do next. Everything else lives in
       Progress. */
    var wsecs=w.secs||w.mins*60;
    b='<div class="wc2">'
     +'<img class="wc2-art" src="mark.png" alt="" aria-hidden="true" width="440" height="440" decoding="async">'
     +'<div class="wc2-medal" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="9" r="6"/><path d="M8.5 13.9 7 22l5-3 5 3-1.5-8.1"/></svg></div>'
     +'<h1 class="wc2-h">'+t("Workout complete")+'</h1>'
     +'<p class="wc2-sub">'+esc(w.dayName)+' · '+pretty(w.date)+'</p>'
     +'<div class="wc2-stats">'
     +'<div><b>'+(wsecs>=3600?Math.floor(wsecs/3600)+'<small>h</small> '+Math.round(wsecs%3600/60)+'<small>m</small>':mmss(wsecs))+'</b><span>'+t("Time")+'</span></div>'
     /* A lifting day shows its tonnage; a run or a match shows what it burned. */
     +(w.vol||!w.actKcal
       ?'<div><b><span data-count-to="'+Math.round(toDisp(w.vol))+'">'+fmtN(toDisp(w.vol))+'</span><small>'+wUnit()+'</small></b><span>'+t("Volume")+'</span></div>'
       :'<div><b><span data-count-to="'+w.actKcal+'">'+fmtN(w.actKcal)+'</span><small>kcal</small></b><span>'+t("Burned")+'</span></div>')
     +(w.actKm&&!w.vol
       ?'<div><b>'+w.actKm+'<small>km</small></b><span>'+t("Distance")+'</span></div>'
       :'<div><b><span data-count-to="'+w.sets+'">'+w.sets+'</span></b><span>'+t("Sets")+'</span></div>')
     +'</div>';
    /* One highlight line at most: a record beats a volume gain. */
    var prs=w.prs.slice().sort(function(x,y){return y.w-x.w;});
    if(prs.length)
      b+='<div class="wc2-hl"><span aria-hidden="true">🏆</span><span>'
       +(prs.length>1?prs.length+' '+t("new records")+' · ':t("New record")+' · ')
       +esc(exName(prs[0].n))+' '+fmtW(prs[0].w)+' × '+prs[0].r+'</span></div>';
    else if(w.prevVol&&w.delta>0)
      b+='<div class="wc2-hl"><span aria-hidden="true">↑</span><span>'+t("Volume up")+' '
       +Math.round(w.delta/w.prevVol*100)+'% '+t("on last session")+'</span></div>';
    b+='</div><div class="cf-acts wc2-acts">'
     +'<button class="btn cf-ok" data-close="1">'+t("Done")+'</button>'
     +'<div class="wc2-row">'
     +(w.id?'<button class="btn g cf-no" data-sessedit="'+esc(w.id)+'"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>'+t("Edit")+'</button>':'')
     +'<button class="btn g cf-no" data-sharews="1"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"/></svg>'+t("Share")+'</button>'
     +'</div></div>';
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
    b='<h2>'+t("Favourites")+'</h2>';
    b+='<div class="sec">'+t("Favourites")+'</div>';
    if(!S.favs.length)b+='<p class="tiny">None yet. Star an exercise from its detail page and it '
      +'will be suggested first.</p>';
    else{b+='<div class="list">';
      S.favs.forEach(function(n){b+='<button class="item" data-fav="'+esc(n)+'">'+thumb(n,36)
        +'<span style="flex:1">'+esc(n)+'</span><span class="pill a">'+t("Remove")+'</span></button>';});
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
    /* Empty, not pre-filled. These fields used to arrive carrying one person's real
       measurements, so everyone else was handed someone else's body and a macro
       target that looked calculated before anything had been entered. */
    var lw2=lastWeight();
    var wv=lw2?toDisp(lw2):(num(p.weight)?toDisp(p.weight):"");
    b+='<div class="grid2 mt"><div><div class="tiny">'+t("Weight")+' ('+wUnit()+')</div>'
     +'<input id="o_weight" type="number" step="0.1" inputmode="decimal" placeholder="—" value="'+wv+'"></div>'
     +'<div><div class="tiny">'+t("Height (cm)")+'</div><input id="o_height" type="number" '
     +'inputmode="numeric" placeholder="—" value="'+(num(p.height)?p.height:"")+'"></div>'
     +'<div><div class="tiny">'+t("Age")+'</div><input id="o_age" type="number" '
     +'inputmode="numeric" placeholder="—" value="'+(num(p.age)?p.age:"")+'"></div>'
     +'<div><div class="tiny">'+t("Sex")+'</div><select id="o_sex">'
     +'<option value="m"'+(p.sex==="m"?" selected":"")+'>'+t("Male")+'</option>'
     +'<option value="f"'+(p.sex==="f"?" selected":"")+'>'+t("Female")+'</option></select></div></div>';
    /* The reasoning, and the runners-up. A silent verdict reads as arbitrary even
       when it is sound, and the choice should stay the user's. */
    var cands=[];
    try{ cands=splitCandidates(num(p.days,3),p.level,p.goal,S.gear); }catch(e){ cands=[]; }
    if(cands.length){
      b+='<div class="sec">'+t("What I would give you")+'</div><div class="list">';
      cands.forEach(function(c,i){
        b+='<button class="item" data-pickplan="'+esc(c.id)+'">'
         +'<div style="flex:1;min-width:0"><div style="font-weight:600">'+esc(c.name)
         +(i===0?' <span class="pill a" style="margin-inline-start:6px">'+t("Recommended")+'</span>':'')
         +'</div><div class="tiny">'+esc(c.why)+'</div></div></button>';});
      b+='</div>';
    }
    b+='<div class="plan mt"><div class="tiny">This replaces your current split with a generated one. '
     +'Splits you already have are kept.</div></div>';
    /* Nothing is built from blanks. */
    var ready=num(p.height)>0&&num(p.weight)>0&&num(p.age)>0;
    b+='<p class="tiny" style="margin:12px 0 0">'+t("Bunyan is a training log, not medical advice. If you have an injury or a health condition, check with a professional first, and stop any exercise that causes sharp pain.")+'</p>'
    b+='<button class="btn" data-buildplan="1"'+(ready?'':' disabled')+'>'+t("Build it")+'</button>'
     +(ready?'':'<p class="tiny" style="margin:8px 2px 0;text-align:center">'
       +t("Enter your height, weight and age first.")+'</p>');
  }
  else if(V.sheet==="exhist"){
    var nm3=V.sd.name,rows=[];
    S.sessions.forEach(function(ss){ss.entries.forEach(function(en){
      if(en.name===nm3&&en.sets.length)rows.push({d:ss.date,s:en.sets});});});
    b='<h2>'+esc(exName(nm3))+'</h2><p class="tiny" style="margin:2px 0 14px">'+rows.length+' '+t("sessions logged")+'</p>';
    if(!rows.length)b+='<p class="tiny">'+t("Nothing recorded yet.")+'</p>';
    var hA=isActivity(nm3);
    rows.forEach(function(r){
      if(hA){
        b+='<div class="card"><div class="row"><span class="tiny">'+pretty(r.d)+'</span></div>'
         +'<div class="num mt" style="font-size:15px">'+r.s.map(function(x){
            return num(x.min)+' '+t("min")+(num(x.km)?' · '+x.km+' km':'')+' · '+t(intensityOf(x.rpe||6)[1])+(x.kcal?' · '+fmtN(x.kcal)+' kcal':'');}).join('<br>')+'</div></div>';
        return;}
      b+='<div class="card"><div class="row"><span class="tiny">'+pretty(r.d)+'</span>'
       +'<span class="tiny">'+fmtW(volume(r.s))+' \u00b7 1RM '
       +(bestE1RM(r.s)?toDisp(bestE1RM(r.s)):"\u2014")+'</span></div>'
       +'<div class="num mt" style="font-size:15px">'+r.s.map(function(x){
          return x.w?toDisp(x.w)+' \u00d7 '+x.r+(x.rpe?' <span class="tiny">@'+x.rpe+'</span>':''):x.r;
         }).join(' &nbsp; ')+'</div></div>';});
  }
  else if(V.sheet==="share"){
    b='<h2>'+t("Share your progress")+'</h2><p class="tiny" style="margin:2px 0 12px">'
     +t("Copy all of this and send it. It contains your sessions, lifts and weight.")+' '
     +t("It does not contain your meals or anything else.")+'</p>'
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
     +t("Save it as a file, or copy the text, and keep it somewhere safe. Restore brings everything back.")+'</p>'
     +'<textarea id="bk" style="width:100%;height:220px;background:var(--raised);color:var(--text);'
     +'border:1px solid var(--border);border-radius:11px;padding:12px;font-size:12px">'
     +esc(JSON.stringify(S))+'</textarea>'
     +'<button class="btn" data-bkfile="1">'+t("Save backup file")+'</button>'
     +'<button class="btn g" data-copybk="1">'+t("Copy as text")+'</button>'
     +'<p class="tiny" style="margin-top:10px">'+t("Photos are not included. They stay on this phone.")+'</p>';
  }
  else if(V.sheet==="restore"){
    b='<h2>'+t("Restore")+'</h2><p class="tiny" style="margin:2px 0 12px">'+t("Paste a backup. This replaces everything currently in the app.")+'</p>'
     +'<label class="btn g" style="cursor:pointer">'+t("Choose backup file")
     +'<input type="file" id="rsfile" accept="application/json,.json,text/plain" style="display:none"></label>'
     +'<textarea id="rs" placeholder="'+esc(t("…or paste the backup text here"))+'" style="width:100%;height:160px;margin-top:10px;background:var(--raised);color:var(--text);'
     +'border:1px solid var(--border);border-radius:11px;padding:12px;font-size:16px"></textarea>'
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
     +'<p class="tiny mt">'+t("Maintenance estimate")+' '+fmtN(tdee())+' kcal. '
     +t("Suggested target")+' '+fmtN(targetKcal())+' kcal.</p>'
     +'<p class="tiny" style="margin-top:6px">'+t("This already counts your activity level, training included, so workouts you log are not added on top. Every figure here is an estimate; your weight trend over a few weeks is the real test.")+'</p>'
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
     +'<div class="tiny">'+t("Plays the 8-second rest alarm.")+'</div></div>'
     +'<span class="pill a">'+t("Play")+'</span></button>'
     /* Said plainly, once, where the sound settings are — so it is learned here rather
        than in a gym when the timer runs out in silence. Stated as a limit of the
        phone, not of the app, because that is what it is: iOS applies the hardware
        switch to all web audio and suspends the page when it is not in front. */
     +'<p class="tiny" style="margin:6px 2px 0;line-height:1.5;color:var(--faint)">'
     +t("On iPhone the side switch silences this alarm, and it cannot play while the app is in the background or the phone is locked. The screen turns red when the rest is over, so you can see it with the sound off.")
     +'</p>'
     +'<button class="item" data-toggle="awake"><span>'+t("Keep screen awake")+'</span>'
     +'<span class="'+(tp.awake?"pill ok":"dim")+'">'+(tp.awake?t("On"):t("Off"))+'</span></button>'
     +'<button class="item" data-sheet="gear"><span>'+t("My equipment")+'</span><span class="dim">'
     +(S.gear&&S.gear.length?S.gear.length+" "+t("selected"):t("Everything"))+'</span></button>'
     +'<button class="item" data-sheet="likes"><span>'+t("Favourites")+'</span>'
     +'<span class="dim">'+S.favs.length+" ★"+'</span></button>'
     +'</div>'
     +'<p class="tiny">'+t("Conservative adds 2.5 kg. Standard adds 2.5 on isolation and 5 on the big lifts. Aggressive adds 5 and 10.")+'</p>';
  }
  else if(V.sheet==="set_nutrition"){
    /* Nutrition Goals, frame 13:531. "Tap any value to customize" is literally true:
       every figure on the card is its own input, so there is no separate edit mode. */
    var ng=S.goals, eN=eatenToday(today());
    /* The share of calories from each macro, rounded so the three always sum to
       exactly 100. The frame's own figures — 26, 44 and 25 — summed to 95. */
    var kc=[ng.p*4,ng.c*4,ng.f*9], kt=kc[0]+kc[1]+kc[2], pc=[0,0,0];
    if(kt){
      var raw=kc.map(function(x){return x/kt*100;});
      pc=raw.map(Math.floor);
      var rest=100-pc[0]-pc[1]-pc[2];
      raw.map(function(x,i){return [x-Math.floor(x),i];})
        .sort(function(a,c){return c[0]-a[0];}).slice(0,rest)
        .forEach(function(r){pc[r[1]]++;});}
    /* Remaining is goal minus eaten, the same arithmetic as the Food ring. */
    function remRow(label,eaten,goal,isKcal){
      var d=goal-eaten, over=d<0;
      return '<div class="ngrem-r"><b>'+esc(label)+'</b><span'+(over?' class="over"':'')+'>'
       +fmtN(Math.abs(d))+(isKcal?' '+t(over?"kcal over":"kcal left"):t(over?"g over":"g left"))
       +'</span></div>'+progressBar(eaten,goal,over?"var(--gold)":"var(--accent)");}
    b=afHead(t("Nutrition Goals"),{sub:'<span class="afsub">'+esc(t("Daily targets & macros"))+'</span>'})
     +'<div class="aflbl">'+esc(t("Daily targets"))+'</div>'
     +'<label class="ngcard ngenergy" for="g_kcal"><span class="ngenergy-t">'
     +'<span class="aflbl">'+esc(t("Daily energy goal"))+'</span>'
     +'<span class="ngbig"><input id="g_kcal" type="number" inputmode="numeric" style="width:'+fitCh(ng.kcal,"")+'ch" value="'+ng.kcal+'"><i>kcal</i></span></span>'
     +'<span class="ico ico-edit" aria-hidden="true"></span></label>'
     +'<div class="ngcard"><div class="aflbl">'+esc(t("Macronutrient split"))+'</div>'
     +'<div class="ngsplit" role="img" aria-label="'
     +esc(t("Protein")+" "+pc[0]+"%, "+t("Carbs")+" "+pc[1]+"%, "+t("Fat")+" "+pc[2]+"%")+'">'
     +(pc[0]?'<i class="p" style="flex-grow:'+pc[0]+'"></i>':'')
     +(pc[1]?'<i class="c" style="flex-grow:'+pc[1]+'"></i>':'')
     +(pc[2]?'<i class="f" style="flex-grow:'+pc[2]+'"></i>':'')+'</div>'
     +'<div class="nglegend"><span>'+esc(t("Protein"))+': '+pc[0]+'%</span>'
     +'<span>'+esc(t("Carbs"))+': '+pc[1]+'%</span><span>'+esc(t("Fat"))+': '+pc[2]+'%</span></div>'
     +'<div class="aftiles ng3">'
     +afTile("g_p",t("Protein"),"g",ng.p,"0","numeric")
     +afTile("g_c",t("Carbs"),"g",ng.c,"0","numeric")
     +afTile("g_f",t("Fat"),"g",ng.f,"0","numeric")+'</div>'
     +'<p class="afnote">'+esc(t("Your macros add up to"))+' '+fmtN(macroKcal(ng.p,ng.c,ng.f))+' kcal.</p></div>'
     +'<div class="ngcard ngrem"><div class="aflbl">'+esc(t("Remaining today"))+'</div>'
     +remRow(t("Calories"),eN.kcal,ng.kcal,true)
     +remRow(t("Protein"),eN.p,ng.p,false)+'</div>'
     /* Not in the frame, and still targets the app measures against. */
     +'<div class="ngcard"><div class="aflbl">'+esc(t("Other targets"))+'</div><div class="aftiles">'
     +afTile("g_water",t("Water"),"ml",ng.water,"0","numeric")
     +afTile("g_steps",t("Steps"),"",ng.steps,"0","numeric")+'</div></div>'
     +'<p class="afnote">'+esc(t("Your daily targets. The rings on Home and Food measure against these."))+'</p>'
     +'<button class="btn afcta" data-savegoals="1">'+esc(t("Save targets"))+'</button>';
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
    /* With no weight entered the target is 0, which is not a bar problem — saying so
       sent people looking for a fault that was not there. */
    if(!pw){
      b+='<p class="tiny">'+t("Enter a weight for this set first.")+'</p>';
    }else if(plan.under){
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
     +'border-radius:11px;padding:12px;font-size:16px;resize:none">'
     +esc((S.active&&S.active.notes)||"")+'</textarea>'
     +'<button class="btn" data-savenote="1">'+t("Save")+'</button>';
  }
  /* One wrapper, 21 sheets. The close control is sticky so it survives long content —
     tapping outside only ever exposed a ~12vh strip, which is why sheets felt trapped. */
  /* ask and confirm already carry their own explicit Cancel, so the wrapper's
     trailing Close would be a third way to dismiss the same sheet. */
  /* A destructive confirmation is the one sheet a stray tap must not dismiss: an
     ambiguous dismiss on a prompt like that is unsafe. It keeps the ✕ and Cancel. */
  var hard=(V.sheet==="confirm"&&V.sd&&V.sd.hard);
  /* Exercise names run long and wrap; a star sitting inline beside one gets shoved
     around by the wrap, so it belongs in the header where its position is fixed. */
  var favName=(V.sheet==="exdetail"&&V.sd&&V.sd.name)?V.sd.name:null;
  var star=favName
    ?'<button class="favstar'+(isFav(favName)?" on":"")+'" data-fav="'+esc(favName)+'" '
      +'aria-pressed="'+(isFav(favName)?"true":"false")+'" aria-label="'
      +(isFav(favName)?t("Remove from favourites"):t("Add to favourites"))+'">'
      +(isFav(favName)?"★":"☆")+'</button>'
    :'';
  /* Every sheet opens the same way as My Training: a red kicker naming where it
     belongs, a large title, then its subtitle. The sheets write a plain <h2> and a
     p.tiny; this lifts that pair into the shared header rather than editing thirty
     templates that would then drift apart again. */
  var kick=SHEET_KICK[V.sheet];
  if(kick)b=b.replace(/^\s*<h2([^>]*)>([\s\S]*?)<\/h2>(\s*<p class="(?:tiny|sub)"[^>]*>[\s\S]*?<\/p>)?/,
    function(m,at,title,sub){
      return '<div class="shh"><span class="shk">'+esc(t(kick))+'</span><h2'+at+'>'+title+'</h2>'
        +(sub?sub.replace(/<p class="(?:tiny|sub)"[^>]*>/,'<p class="shsub">'):'')+'</div>';});
  var cf=V.sheet==="confirm"||V.sheet==="done";
  return '<div class="sheet"'+(hard?'':' data-close="1"')+'>'
        +'<div class="sheetbox'+(cf?' cfbox':'')+'" data-stop="1" role="dialog" aria-modal="true">'
        +'<div class="sheethead">'
        +(hard?'':'<span class="grab" aria-hidden="true"></span>')
        +star
        +'<button class="x" data-close="1" aria-label="'+t("Close")+'">✕</button></div>'
        /* The ✕, a tap outside and a drag down all close this. A fourth control at
           the end of the scroll was noise. */
        +b+'</div></div>';}


export {vSheet};
