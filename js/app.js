/* Bunyan — app
   Entry point: event listeners, wiring and boot. */
import {ACT, addExercise, askConfirm, askText, closeSheet, finishSession, openSheet, runAct, startDay, syncDraft, val} from "./ui/actions.js";
import {t} from "./i18n/dict.js";
import {loadExDB, loadInstructions, muscleOf, MUSCLES} from "./data/exercises.js";
import {applyLang} from "./i18n/exnames.js";
import {addItems, BACKUP_SNOOZE, curDate, lastWeight, macroKcal, targetKcal} from "./engine/formulas.js";
import {FOODDB, gramsFor, loadFoods, lookupBarcode, normBarcode, nutritionFor, offSearch, parseFoodInput, recalcItem, resolveItem, roundUnit, toLogItem, unitGrams, unitKey, unitLabel, UNIT_STEP, isMeasure} from "./engine/nutrition.js";
import {startScan, stopScan} from "./scan.js";
import {buildPlan} from "./engine/plan.js";
import {render, syncKeyboard} from "./ui/render.js";
import {goBack, initNav, pushNav, resetNav} from "./ui/nav.js";
import {initSheetDrag} from "./ui/sheetdrag.js";
import {leave} from "./ui/motion.js";
import {groupNext, groupRun, mmss, noteSet, paintRest, sessionClock} from "./ui/views/session.js";
import {adoptRestored, adoptSplit, allSplits, CUR, curProfile, dayOf, dayRec, friends, initState, isOwner, loadStored, migrate, S, saveDB, saveFriends, setS, split, switchProfile} from "./state.js";
import {fmtW, toDisp, toKg, wUnit} from "./units.js";
import {fmtN, num, r1, setStorageErrorHandler, today, uid} from "./util.js";
import {alarmStart, alarmStop, audioOn, beeped, endRest, keepAwake, lastTick, play, setBeeped, setLastTick, startRest, tap, toast, V} from "./ui/view.js";
import {shiftDay} from "./ui/datebar.js";
import {addPhoto, removePhoto} from "./ui/photos.js";
import {mealNow} from "./ui/views/food.js";
import {fitCh, pickAmount, servs} from "./ui/views/addfood.js";

/* Logs one food to the add-food sheet's meal and closes it. The single path for the
   servings screen, the + beside a result, an Open Food Facts result and the
   frequent-food pills — which all had, or would have had, their own copy. With no
   sheet open (the dashboard's pills) the meal is the time of day's. */
function logFood(food,grams,label){
  var meal=(V.sheet==="addfood"&&V.sd&&V.sd.meal)||mealNow(),n=nutritionFor(food,grams);
  addItems(meal,[{fid:food.id,n:food.n,label:label,grams:grams,src:food.src||"db",
    kcal:n.kcal,p:n.p,c:n.c,f:n.f,fib:n.fib}],curDate());
  if(V.sheet)closeSheet();
  V.tab="food";render();play("set");
  toast(food.n+" "+t("added to")+" "+t(meal)+".");}

/* The muscle filter a replacement should open on. muscleOf() can answer "Other",
   which is a real classification but not one the filter row offers — selecting it
   would filter the list to nothing with no pill lit to explain why. */
function pickMuscle(name){
  var m=name?muscleOf(name):null;
  return (m&&MUSCLES.indexOf(m)>=0)?m:"All";
}

/* Deleting a progress photo. Asked first: the photo is on this phone only, so there
   is nothing to undo from. */
ACT.delphoto=function(_,id){
  removePhoto(id,function(ok){
    render();toast(ok?t("Photo deleted."):t("That photo could not be deleted."));});};

document.addEventListener("click",function(ev){
  /* Named el, not t: t() is the translator, and shadowing it here made every
     translated string inside this handler throw. */
  var el=ev.target.closest("button,[data-close],[data-stop]");
  if(!el)return;
  if(el.matches("button"))tap(el.classList.contains("btn")?"heavy":"light");
  var D=el.dataset;

  if(D.stop!==undefined&&!el.matches("button"))return;
  if(D.close!==undefined){requestCloseSheet();return;}
  /* Cancelling the discard prompt has to give the half-typed food back, otherwise
     "Cancel" would throw away exactly what it promised to keep. */
  if(D.restore!==undefined){var kp=(V.sd||{}).back||{};openSheet("manual",kp);return;}
  if(D.askok!==undefined){
    var ao=V.sd||{},av=val("askv");
    if(ao.required!==false&&!String(av).trim()){toast(t("Enter something first."));return;}
    runAct(ao.act,av);return;}
  if(D.confirmok!==undefined){runAct((V.sd||{}).act,true);return;}
  if(D.confirmalt!==undefined){runAct((V.sd||{}).altact,true);return;}
  /* A tab is a change of place, not a step deeper, so it starts a fresh trail. */
  if(D.tab){resetNav();V.tab=D.tab;V.train="days";V.meal=null;render();return;}
  /* Same reset as a tab tap: it is the same kind of move. Without V.train it landed
     on the Train tab still showing whatever sub-view was open, with an empty stack
     behind it — a day view whose back arrow now correctly hides, and nothing to
     return to but the tab bar. */
  if(D.go){resetNav();V.tab=D.go;V.train="days";V.meal=null;render();return;}

  /* ---- splits & days */
  if(D.train){pushNav();V.train=D.train;render();return;}
  if(D.day){pushNav();V.dayId=D.day;V.train="day";render();return;}
  /* One meal of the day, on its own screen. */
  if(D.meal){pushNav();V.meal=D.meal;render();return;}
  if(D.adopt){
    var pre=allSplits().filter(function(x){return x.id===D.adopt;})[0];
    if(!pre)return;
    askConfirm({title:t("Switch to")+" "+pre.name+"?",
      body:t("This replaces your current plan. Every session you have already logged is kept."),
      cta:t("Make it my training"),act:"adopt",data:D.adopt});return;}
  if(D.preview){pushNav();V.previewId=D.preview;V.train="preview";render();return;}
  if(D.newsplit){
    askText({title:t("New split"),label:t("Name"),ph:t("For example, Upper / Lower"),
      cta:t("Create"),act:"newsplit"});return;}
  if(D.addday){
    askText({title:t("Add a day"),label:t("Name"),ph:t("For example, Chest & Triceps"),
      cta:t("Add"),act:"addday"});return;}
  if(D.dayedit!==undefined){V.dayEdit=!V.dayEdit;render();return;}
  if(D.renameday){
    var d0=dayOf(D.renameday);if(!d0)return;
    askText({title:t("Rename day"),label:t("Name"),value:d0.name,
      act:"renameday",data:D.renameday});return;}
  if(D.delday){
    var dD=dayOf(D.delday);
    askConfirm({title:t("Delete")+" "+(dD?dD.name:t("this day"))+"?",
      body:t("The day is removed from your split. Sessions you already logged are kept."),
      cta:t("Delete the day"),act:"delday",data:D.delday});return;}

  /* ---- exercises */
  /* Opening to add starts from the whole library. The two replace entries below set
     the filters to the exercise being replaced, and without this reset the next add
     inherited them — it always had, but it used to inherit "All", so it never showed. */
  if(D.addex){V.dayId=D.addex;V.exm="All";V.exe="All";V.exq="";openSheet("exercise",{});return;}
  if(D.editex){openSheet("editex",{id:D.editex});return;}
  if(D.exm){V.exm=D.exm;render();return;}
  if(D.exe){V.exe=D.exe;render();return;}
  if(D.cleardiff){V.exd=null;render();return;}
  if(D.exsteps){V.exsteps=!V.exsteps;render();return;}
  if(D.exmiss){V.exmiss=!V.exmiss;render();return;}
  if(D.range){V.range=+D.range;render();return;}
  /* ---- Progress. The view rendered these controls with nothing listening, so its
     tabs never switched and Strength, Body and Nutrition could not be reached. */
  if(D.ptab){V.ptab=D.ptab;render();
    var pt=document.querySelector('[data-ptab="'+D.ptab+'"]');if(pt)pt.focus();
    return;}
  if(D.seeall){V.ptab="strength";render();window.scrollTo(0,0);return;}
  if(D.pall){V.pall=!V.pall;render();return;}
  /* A lift in the list is charted above it, so bring the chart into view. */
  if(D.chartex){V.chartEx=D.chartex;render();
    var pk=document.querySelector(".pgpick");
    if(pk)pk.scrollIntoView({block:"start",behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});
    return;}
  if(D.photo){openSheet("photo",{id:D.photo});return;}
  if(D.delphoto){
    askConfirm({title:t("Delete this photo?"),
      body:t("It is removed from this phone. This cannot be undone."),
      cta:t("Delete photo"),act:"delphoto",data:D.delphoto});return;}
  if(D.showall){V.showAll=!V.showAll;render();return;}
  if(D.bwsplit){pushNav();V.train="bodyweight";render();return;}
  if(D.bwcat){pushNav();V.exm=D.bwcat==="All"?"All":D.bwcat;V.exe="Bodyweight";V.exq="";
    V.train="library";render();return;}
  if(D.bwdiff){pushNav();V.exd=D.bwdiff;V.exe="Bodyweight";V.exm="All";V.exq="";V.train="library";render();return;}
  if(D.exdetail){var nm5=D.exdetail;V.exsteps=false;V.exmiss=false;
    loadInstructions(function(){openSheet("exdetail",{name:nm5});});return;}
  /* Reachable again, from the picker's empty state. It was orphaned when the picker
     was rewritten to read exercises.json: the handler survived, the button did not.
     Custom entries have no illustration, which thumb() already renders gracefully. */
  if(D.customex){
    askText({title:t("Add your own exercise"),label:t("Name"),value:V.exq||"",
      body:t("It joins your library under the muscle you have filtered to. No illustration, everything else works."),
      cta:t("Add it"),act:"customex",data:{from:V.sd}});return;}
  if(D.pickex){addExercise(D.pickex);return;}
  if(D.replaceex){
    var dR=dayOf(V.dayId),eR2=dR?dR.ex.filter(function(x){return x.id===D.replaceex;})[0]:null;
    /* The frame opens a replacement with the current exercise's muscle already
       selected — "Chest Selected". Ranking alone put like-for-like first but left the
       whole library under it; this starts where the answer almost certainly is, and
       "All" is one tap away. Only a muscle the filter row actually has. */
    V.exm=pickMuscle(eR2&&eR2.name);V.exe="All";V.exq="";
    openSheet("exercise",{replace:D.replaceex,like:eR2?eR2.name:null});return;}
  if(D.saveex){
    var dd=dayOf(V.dayId),e2=dd.ex.filter(function(x){return x.id===D.saveex;})[0];
    e2.sets=Math.max(1,num(val("e_sets"),3));e2.rest=Math.max(0,num(val("e_rest"),75));
    e2.lo=Math.max(1,num(val("e_lo"),8));e2.hi=Math.max(e2.lo,num(val("e_hi"),e2.lo));
    saveDB();closeSheet();return;}
  if(D.delex){
    var dd2=dayOf(V.dayId);dd2.ex=dd2.ex.filter(function(x){return x.id!==D.delex;});
    saveDB();closeSheet();return;}
  if(D.moveex){
    var pr=D.moveex.split("|"),dd3=dayOf(V.dayId);
    var i0=dd3.ex.findIndex(function(x){return x.id===pr[0];}),j=i0+ +pr[1];
    if(j<0||j>=dd3.ex.length)return;
    var tmp=dd3.ex[i0];dd3.ex[i0]=dd3.ex[j];dd3.ex[j]=tmp;saveDB();closeSheet();return;}

  /* ---- logger */
  if(D.startday){pushNav();startDay(D.startday);return;}
  /* Back to the exact exercise and set, not the top of the workout. V is memory only,
     so the position rides on the session itself and survives a reload. */
  if(D.continue!==undefined){
    resetNav();V.tab="train";V.train="days";
    V.logIdx=Math.min(num(S.active&&S.active.idx,0),(S.active?S.active.entries.length-1:0));
    V.fresh=-1;syncDraft();render();return;}
  if(D.jump!==undefined){
    var n2=+D.jump;
    if(!S.active||n2<0||n2>=S.active.entries.length)return;
    V.logIdx=n2;S.active.idx=n2;endRest();V.fresh=-1;syncDraft();saveDB();render();return;}
  if(D.stp){
    var id=D.stp,d1=parseFloat(D.d);
    var cur=id==="bw"?(V.draft.bw!=null?V.draft.bw:toDisp(lastWeight()||86))
           :id==="st"?(V.draft.st||dayRec().steps||0):V.draft[id];
    var min=id==="w"?0:id==="rpe"?1:id==="st"?0:1;
    var max=id==="rpe"?10:1e6;
    V.draft[id]=Math.min(max,Math.max(min,r1(num(cur)+d1)));
    render();return;}
  if(D.rpe){V.draft.rpe=+D.rpe;render();return;}
  /* Complete the active set. Reads the live inputs first so a value typed but not
     blurred is never lost. */
  if(D.logset){
    var e3=S.active.entries[V.logIdx];
    var lw=document.getElementById("in_w"),lr=document.getElementById("in_r"),
        lp=document.getElementById("in_rpe");
    if(lw&&lw.value!=="")V.draft.w=toKg(lw.value);
    if(lr&&lr.value!=="")V.draft.r=num(lr.value);
    if(lp&&lp.value!=="")V.draft.rpe=Math.min(10,Math.max(1,num(lp.value,8)));
    if(!V.draft.r){toast(t("Enter reps first."));return;}
    e3.sets.push({w:V.draft.w,r:V.draft.r,rpe:V.draft.rpe});
    /* Closes the active period and starts a new one; the clock resumes by itself. */
    noteSet(S.active);
    V.fresh=e3.sets.length-1;
    play("set");tap("ok");
    /* In a superset you move straight to the next exercise and only rest once the
       round is finished. Resting between the pair would make it two exercises. */
    var run=groupRun(S.active.entries,V.logIdx);
    if(run.length>1){
      var nxt=groupNext(S.active.entries,V.logIdx);
      if(nxt===null){startRest(e3);}
      else{
        var wrapped=run.indexOf(nxt)<=run.indexOf(V.logIdx);
        if(wrapped)startRest(e3); else endRest();
        V.logIdx=nxt;S.active.idx=nxt;V.fresh=-1;
      }
      saveDB();syncDraft();render();return;
    }
    startRest(e3);saveDB();syncDraft();render();return;}
  /* Removing a row. An empty one destroys nothing, so it goes at once; one with a
     logged set asks, and says what it is about to throw away. */
  if(D.delset!==undefined){
    var eD=S.active&&S.active.entries[V.logIdx];if(!eD)return;
    var iD=+D.delset;
    if(iD<eD.sets.length){
      var sD=eD.sets[iD];
      askConfirm({title:t("Delete set")+" "+(iD+1)+"?",
        body:(num(sD.w)?fmtW(sD.w)+" × "+num(sD.r):num(sD.r)+" "+t("reps"))
             +" "+t("will be removed."),
        cta:t("Delete"),act:"delset",data:iD,hard:true});
      return;}
    eD.extra=(eD.extra||0)-1;
    saveDB();syncDraft();render();return;}
  /* Tapping the green tick undoes that set. Reversible, so no confirm. */
  if(D.unlog!==undefined){
    var e4=S.active.entries[V.logIdx];e4.sets.splice(+D.unlog,1);
    V.fresh=-1;saveDB();syncDraft();render();
    toast(t("Set removed."));return;}
  if(D.addrow){
    var e5=S.active.entries[V.logIdx];
    e5.extra=(e5.extra||0)+1;V.fresh=-1;saveDB();render();return;}
  /* Pause, resume and ±30s change the countdown and nothing else on the screen, so
     they repaint the four live parts rather than rebuilding. A full render here was
     what flashed the previous screen and restarted the ring from zero. Only leaving
     rest entirely is a real navigation. */
  if(D.rest){
    if(D.rest==="pause"){V.restLeft=Math.max(0,Math.ceil((V.restEnd-Date.now())/1000));
      V.restPaused=true;V.restEnd=0;paintRest();return;}
    if(D.rest==="resume"){V.restPaused=false;V.restEnd=Date.now()+V.restLeft*1000;
      setBeeped(false);paintRest();return;}
    if(D.rest==="skip"){endRest();render();return;}
    if(V.restPaused){V.restLeft=Math.max(0,V.restLeft+(+D.rest));
      V.restTotal=Math.max(15,V.restTotal+(+D.rest));
      /* Trimming a paused timer to zero ends the rest, which is a real change. */
      if(!V.restLeft){V.restPaused=false;render();return;}}
    else{V.restEnd=Math.max(Date.now(),V.restEnd+(+D.rest)*1000);
         V.restTotal=Math.max(15,V.restTotal+(+D.rest));
         if(+D.rest>0)setBeeped(false);}
    paintRest();return;}
  if(D.swap){
    var eS=S.active.entries[V.logIdx];
    V.exm=pickMuscle(eS&&eS.name);V.exe="All";V.exq="";
    openSheet("exercise",{swaplive:true,like:eS?eS.name:null});return;}
  if(D.nextex){
    if(V.logIdx>=S.active.entries.length-1){finishSession();return;}
    play("set");endRest();V.fresh=-1;
    V.logIdx=V.logIdx+1;
    saveDB();syncDraft();render();return;}
  if(D.sessmore!==undefined){openSheet("sessmore");return;}
  if(D.finish){finishSession();return;}
  /* Every back affordance in the app comes through here, so none of them can drift
     to a destination of its own. Discarding a session is now part of going back
     rather than a separate link. */
  if(D.back!==undefined){goBack();return;}
  /* Throwing a workout away is only ever deliberate now: a control inside the
     session, never a question asked because you glanced at another screen. */
  if(D.discard!==undefined){
    askConfirm({title:t("Discard this session?"),
      body:t("Every set you logged in this workout is thrown away. This cannot be undone."),
      cta:t("Discard it"),act:"discard",hard:true});return;}

  /* ---- daily logs */
  if(D.water){
    /* Home writes to today explicitly; Food writes to the date it is browsing. */
    var r2=dayRec(D.wdate||curDate());r2.water=Math.max(0,r2.water+ +D.water);saveDB();render();return;}
  /* A tapped glass sets the day outright, so the glass that filled also empties it. */
  if(D.wset!==undefined){
    dayRec(curDate()).water=Math.max(0,+D.wset);saveDB();render();return;}
  if(D.sheet){openSheet(D.sheet);return;}
  if(D.saveweight){
    /* Back to kilograms before it touches storage. */
    var w2=V.draft.bw!=null?toKg(V.draft.bw):(lastWeight()||86);
    var ex0=S.body.filter(function(b){return b.date===today();})[0];
    if(ex0)ex0.weight=w2;else S.body.push({date:today(),weight:w2});
    S.body.sort(function(a,b){return a.date<b.date?-1:1;});
    V.draft.bw=null;saveDB();closeSheet();toast("Weight saved.");return;}
  if(D.savesteps){
    dayRec().steps=V.draft.st||0;V.draft.st=null;saveDB();closeSheet();return;}
  if(D.saverec){
    var r3=dayRec();r3.sleep=num(val("r_sleep"));r3.sore=num(val("r_sore"));
    r3.energy=num(val("r_energy"));r3.ankle=num(val("r_ankle"));r3.notes=val("r_notes");
    saveDB();closeSheet();return;}
  if(D.savemeasure){
    var rec={date:today()};
    [["m_chest","chest"],["m_waist","waist"],["m_hips","hips"],["m_arms","arms"],["m_thighs","thighs"],
     ["m_calves","calves"],["m_neck","neck"],["m_bf","bf"]].forEach(function(m){
      var v=num(val(m[0]));if(v>0)rec[m[1]]=v;});
    /* A percentage, not a tape reading: anything outside 2–70 is a typo. */
    if(rec.bf&&(rec.bf<2||rec.bf>70)){toast(t("Body fat should be a percentage between 2 and 70."));return;}
    if(Object.keys(rec).length<2){toast(t("Enter at least one measurement."));return;}
    var e5=S.body.filter(function(b){return b.date===today();})[0];
    if(e5)Object.assign(e5,rec);else S.body.push(rec);
    S.body.sort(function(a,b){return a.date<b.date?-1:1;});
    saveDB();closeSheet();toast("Measurements saved.");return;}

  /* ---------------- food ---------------- */
  if(D.addfood){
    loadFoods(function(){
      V.food={mode:"search",tab:"search",sq:"",q:"",items:null,edit:-1};
      openSheet("addfood",{meal:D.addfood});});
    return;}
  if(D.parse){
    var q6=val("nlq").trim();
    if(!q6){toast(t("Type what you ate first."));return;}
    /* Updated in place. This used to replace V.food outright, which was harmless while
       it held nothing else; it now holds the mode and the search tab as well. */
    V.food.q=q6;V.food.items=parseFoodInput(q6).map(resolveItem);V.food.mode="quick";
    V.food.edit=-1;V.food.busy=false;V.food.offline=false;V.food.noresult=false;
    render();return;}
  /* ---- the add-food sheet's own navigation */
  if(D.fmode){V.food.mode=D.fmode;render();return;}
  if(D.fback!==undefined){V.food.mode=(V.food.pick&&V.food.pick.from)||"search";render();return;}
  if(D.ftab){V.food.tab=D.ftab;render();return;}
  if(D.fpick||D.fpickoff!==undefined){
    var fp=D.fpick?(S.myFoods||[]).concat(FOODDB||[]).filter(function(x){return x.id===D.fpick;})[0]
                  :(V.food.off&&V.food.off.list[+D.fpickoff]);
    if(!fp)return;
    /* u/amt: a measure picked from the chooser (ml, L, oz…) and the amount in it.
       Null means the amount is a count of the serving at si. */
    V.food.pick={food:fp,si:0,n:1,u:null,amt:null,more:false,
                 from:V.food.mode==="detail"?"search":V.food.mode};
    V.food.mode="detail";render();return;}
  /* Whole servings, with a half below one — "3 eggs" is two taps, not five. A
     measure steps by its own unit's step instead: 50 ml, a quarter litre. */
  if(D.fcount){
    var pk=V.food.pick;if(!pk)return;
    var up=+D.fcount>0;
    if(pk.u){
      var stp=UNIT_STEP[pk.u];
      pk.amt=Math.max(stp,roundUnit(pk.u,(up?Math.floor:Math.ceil)(pk.amt/stp+(up?1e-9:-1e-9))*stp+(up?stp:-stp)));
    }else pk.n=up?(pk.n<1?1:pk.n+1):(pk.n>1?pk.n-1:0.5);
    render();return;}
  if(D.fmore!==undefined){V.food.pick.more=!V.food.pick.more;render();return;}
  if(D.faddpick!==undefined){
    var pk2=V.food.pick,am2=pickAmount(pk2);
    if(!(am2.g>0)){toast(t("Enter an amount first."));return;}
    logFood(pk2.food,am2.g,am2.label);return;}
  if(D.fadd1off!==undefined){
    var fo=V.food.off&&V.food.off.list[+D.fadd1off];if(!fo)return;
    var so=servs(fo)[0];logFood(fo,so[1],"1 × "+so[0]);return;}
  if(D.fedit!==undefined){V.food.edit=V.food.edit===+D.fedit?-1:+D.fedit;render();return;}
  /* Puts the cursor on the phrase that was not understood, so more can be typed about
     it and the whole line parsed again. */
  if(D.adddetail!==undefined){
    var ta=document.getElementById("nlq");if(!ta)return;
    var at=ta.value.indexOf(D.adddetail);
    ta.focus();
    if(at>=0)ta.setSelectionRange(at+D.adddetail.length,at+D.adddetail.length);
    toast(t("Add the brand, a serving size or what is in it, then Find it again."));
    return;}
  /* Open Food Facts from the search screen: its results list beside the local ones.
     The Quick Add screen has its own path (data-online), which slots a result into the
     parsed meal instead. */
  if(D.offq!==undefined){
    var oq=(V.food.sq||"").trim();if(!oq)return;
    V.food.offBusy=true;V.food.offFail=false;render();
    offSearch(oq,function(found,failed){
      V.food.offBusy=false;
      if(failed)V.food.offFail=true;
      else V.food.off={q:oq,list:found||[]};
      render();});
    return;}
  if(D.bc){onBarcode(D.bc);return;}
  if(D.fbackadd!==undefined){openSheet("addfood",{meal:(V.sd&&V.sd.meal)||mealNow()});return;}
  if(D.qty){
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
    recalcItem(it6);render();return;}
  if(D.gram){
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
      act:"grams",data:{idx:+D.gram,meal:V.sd&&V.sd.meal}});return;}
  /* The meal rides along. openSheet replaces the sheet's data, so "Change" used to
     drop the meal the user had picked, and the add went wherever the default fell. */
  if(D.swapfood){openSheet("pickfood",{idx:+D.swapfood,meal:V.sd&&V.sd.meal});return;}
  if(D.choose){
    var pr8=D.choose.split("|"),it8=V.food.items[+pr8[0]];
    it8.food=it8.alts[+pr8[1]]; it8.name=it8.food.n; it8.src=it8.food.src||"db";
    it8.status="ok"; recalcItem(it8);
    V.sheet="addfood"; render();return;}
  if(D.dropitem){
    /* Same rule as a deleted set: play it out, then remove it. */
    var di=+D.dropitem;
    leave(document.querySelector('#sheet [data-k="fi:'+di+'"]'),function(){
      V.food.items.splice(di,1);
      /* The open editor follows its item: removing one above it shifts it up one. */
      if(V.food.edit===di)V.food.edit=-1; else if(V.food.edit>di)V.food.edit--;
      render();});
    return;}
  if(D.online){
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
    return;}
  /* ---- barcodes: scanning and typing land in the same place */
  if(D.scan){
    startScan(onBarcode,function(why){
      toast(why==="denied"?t("Camera access was refused. Enter the barcode instead.")
           :why==="nocamera"?t("No camera found. Enter the barcode instead.")
           :why==="decoder"?t("The scanner could not be loaded. Enter the barcode instead.")
           :t("Scanning is not available here. Enter the barcode instead."));
      if(why!=="denied")openBarcodePrompt();
    },{hint:t("Hold the barcode inside the frame"),cancel:t("Cancel"),
       loading:t("Starting the scanner…")});
    return;}
  if(D.typecode){openBarcodePrompt();return;}
  if(D.manual!==undefined){
    openSheet("manual",{name:D.manual||"",bc:(V.sd&&V.sd.bc)||"",meal:(V.sd&&V.sd.meal)||mealNow()});
    return;}
  if(D.savemanual||D.savemyfood){
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
    addItems(mm9,[item9],curDate());
    closeSheet();V.tab="food";render();play("set");
    toast(nm9+" "+t("added to")+" "+t(mm9)+".");return;}
  if(D.commit){
    /* The meal is the one in the sheet's header. There used to be a second chooser
       at the foot, which could disagree with it. */
    var meal9=(V.sd&&V.sd.meal)||mealNow();
    var good9=V.food.items.filter(function(i){return i.status!=="unknown"&&i.status!=="suggest";});
    if(!good9.length){toast(t("Nothing to add yet."));return;}
    addItems(meal9,good9.map(toLogItem),curDate());
    closeSheet();V.tab="food";render();
    play("set");toast(t(meal9)+" "+t("updated."));return;}
  if(D.savemeal){
    askText({title:t("Save this as a meal"),label:t("Name"),value:t("My meal"),
      body:t("It goes into Saved meals so you can log the whole thing in one tap."),
      cta:t("Save"),act:"savemeal",data:{meal:V.sd&&V.sd.meal}});return;}
  if(D.addsaved){
    var sm=S.savedMeals[+D.addsaved];
    if(!sm)return;
    var ms=mealNow();
    addItems(ms,JSON.parse(JSON.stringify(sm.items)),curDate());
    render();play("set");toast(sm.name+" "+t("added to")+" "+t(ms)+".");return;}
  /* A frequent-food pill on the dashboard, or the + beside a result in the sheet.
     Both used to go to Snack whatever the meal — including from a sheet opened for
     Breakfast. logFood takes the sheet's meal, or the time of day's without one. */
  if(D.quickfood){
    var f10=(S.myFoods||[]).concat(FOODDB||[]).filter(function(x){return x.id===D.quickfood;})[0];
    if(!f10)return;
    var gq=gramsFor(f10,1,null);
    logFood(f10,gq.g,gq.label);return;}
  if(D.edititem){
    var prE=D.edititem.split("|"),rE=dayRec(curDate()),mE=rE.meals[prE[0]];
    if(!mE)return;
    var itE=mE.items[+prE[1]];
    if(!itE)return;
    askText({title:itE.n,label:t("Grams"),numeric:true,value:Math.round(itE.grams||0),
      body:t("Everything recalculates from the amount."),cta:t("Save"),act:"editgrams",
      data:{meal:prE[0],idx:+prE[1],date:curDate()}});return;}
  if(D.dropfood){
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
    return;}







  /* ---- profile */
  if(D.calc){
    var p3=S.profile;
    p3.age=num(val("p_age"),p3.age);p3.height=num(val("p_height"),p3.height);
    p3.sex=val("p_sex");p3.activity=num(val("p_act"),1.4);p3.goal=val("p_goal");
    p3.weight=toKg(num(val("p_weight"),toDisp(p3.weight)));
    if(p3.weight&&!S.body.some(function(b3){return b3.date===today();}))
      S.body.push({date:today(),weight:p3.weight});
    var kc=targetKcal(),w3=lastWeight()||p3.weight||86;
    S.goals.kcal=Math.round(kc/10)*10;
    S.goals.p=Math.round(w3*2);
    S.goals.f=Math.round(kc*0.28/9);
    S.goals.c=Math.max(50,Math.round((kc-S.goals.p*4-S.goals.f*9)/4));
    saveDB();render();toast("Targets updated.");return;}
  /* The two settings sheets save independently now that they are separate screens. */
  if(D.saveyou){
    var py=S.profile;
    py.age=num(val("p_age"),py.age);
    py.height=num(val("p_height"),py.height);
    py.sex=val("p_sex")||py.sex;
    py.weight=toKg(num(val("p_weight"),toDisp(py.weight)));
    py.activity=num(val("p_act"),py.activity);
    py.goal=val("p_goal")||py.goal;
    saveDB();render();toast(t("Saved."));return;}
  if(D.savegoals){
    S.goals.kcal=num(val("g_kcal"),S.goals.kcal);S.goals.p=num(val("g_p"),S.goals.p);
    S.goals.c=num(val("g_c"),S.goals.c);S.goals.f=num(val("g_f"),S.goals.f);
    S.goals.water=num(val("g_water"),S.goals.water);S.goals.steps=num(val("g_steps"),S.goals.steps);
    saveDB();render();toast(t("Saved."));return;}
  /* Test Sound plays the actual rest alarm, not a stand-in. A test that plays a
     different sound from the real one tests nothing the user cares about. */
  if(D.testsound){
    if(!S.prefs.sound){toast(t("Turn Sounds on first."));return;}
    alarmStart();
    setTimeout(function(){toast(t("If that was silent, the side switch on your phone is set to silent."));},500);
    return;}
  if(D.toggle){S.prefs[D.toggle]=!S.prefs[D.toggle];
    if(D.toggle==="anim")document.body.classList.toggle("noanim",S.prefs.anim===false);
    if(D.toggle==="awake")keepAwake(S.prefs.awake&&!!S.active);
    saveDB();render();return;}
  if(D.warnmode){var w4=[5,10,15];S.prefs.warn=w4[(w4.indexOf(S.prefs.warn)+1)%3];saveDB();render();return;}
  if(D.langmode){S.prefs.lang=S.prefs.lang==="ar"?"en":"ar";saveDB();applyLang();render();
    toast(S.prefs.lang==="ar"?"\u0627\u062a\u063a\u064a\u0631\u062a \u0644\u0644\u0639\u0631\u0628\u064a\u0629":"Switched to English");return;}
  if(D.unitmode){S.prefs.unit=S.prefs.unit==="kg"?"lb":"kg";saveDB();render();return;}
  if(D.viewmode){S.prefs.view=S.prefs.view==="set"?"all":"set";saveDB();render();return;}
  if(D.rpemode){
    var rm=["every","last","off"];
    S.prefs.rpe=rm[(rm.indexOf(S.prefs.rpe)+1)%3];saveDB();render();return;}
  if(D.theme){S.theme=S.theme==="dark"?"light":"dark";saveDB();render();return;}
  if(D.progmode){
    var order=["conservative","standard","aggressive"];
    S.profile.prog=order[(order.indexOf(S.profile.prog)+1)%3];saveDB();render();return;}
  if(D.setup){openSheet("setup");return;}
  /* Picking one of the offered candidates: same build, chosen split. */
  if(D.pickplan){
    var pp=S.profile;
    pp.level=val("o_level")||pp.level; pp.goal=val("o_goal")||pp.goal;
    pp.days=num(val("o_days"),pp.days);
    pp.weight=toKg(num(val("o_weight"),0))||pp.weight;
    pp.height=num(val("o_height"),0)||pp.height; pp.age=num(val("o_age"),0)||pp.age;
    if(!(num(pp.height)>0&&num(pp.weight)>0&&num(pp.age)>0)){
      toast(t("Enter your height, weight and age first."));saveDB();render();return;}
    var chosen=allSplits().filter(function(x){return x.id===D.pickplan;})[0];
    if(!chosen){toast(t("That split is no longer available."));return;}
    S.myPlan=adoptSplit(chosen);S.onboarded=true;saveDB();
    closeSheet();V.tab="train";V.train="days";render();
    toast(chosen.name+" "+t("is now your training."));return;}
  if(D.buildplan){
    var p4=S.profile;
    p4.level=val("o_level")||p4.level; p4.goal=val("o_goal")||p4.goal;
    p4.days=num(val("o_days"),3);
    p4.weight=toKg(num(val("o_weight"),0))||p4.weight;
    p4.height=num(val("o_height"),0)||p4.height; p4.age=num(val("o_age"),0)||p4.age;
    p4.sex=val("o_sex")||p4.sex;
    /* Nothing is calculated from blanks. The button is disabled without these; this
       is the second gate in case it is ever reached another way. */
    if(!(num(p4.height)>0&&num(p4.weight)>0&&num(p4.age)>0)){
      toast(t("Enter your height, weight and age first."));saveDB();render();return;}
    if(p4.weight&&!S.body.some(function(b2){return b2.date===today();}))
      S.body.push({date:today(),weight:p4.weight});
    var kc=targetKcal();
    S.goals.kcal=Math.round(kc/10)*10;
    S.goals.p=Math.round(p4.weight*2);
    S.goals.f=Math.round(kc*0.28/9);
    S.goals.c=Math.max(50,Math.round((kc-S.goals.p*4-S.goals.f*9)/4));
    buildPlan(); S.onboarded=true; saveDB();
    closeSheet(); V.tab="train"; V.train="days"; render();
    toast("Plan built. "+split().name+".");
    return;}
  if(D.fav){var i5=S.favs.indexOf(D.fav);
    if(i5>=0)S.favs.splice(i5,1);else S.favs.push(D.fav);saveDB();render();return;}
  if(D.gear){
    S.gear=S.gear||[];
    var i7=S.gear.indexOf(D.gear);
    if(i7>=0)S.gear.splice(i7,1);else S.gear.push(D.gear);
    saveDB();render();return;}
  if(D.exhist){openSheet("exhist",{name:D.exhist});return;}
  if(D.delsplit){
    var spD=(S.userSplits||[]).filter(function(x){return x.id===D.delsplit;})[0];
    askConfirm({title:t("Delete")+" "+(spD?spD.name:t("this split"))+"?",
      body:t("Your active plan and every logged session are kept."),
      cta:t("Delete the split"),act:"delsplit",data:D.delsplit});return;}
  if(D.switch){if(D.switch!==CUR){switchProfile(D.switch,render);render();}return;}
  if(D.addprofile){
    askText({title:t("Add a profile"),label:t("Name"),
      body:t("A separate log, weight and plan. Nothing crosses over."),
      cta:t("Create"),act:"newprofile"});return;}
  if(D.renameprofile){
    askText({title:t("Rename this profile"),label:t("Name"),value:curProfile().name,
      act:"renameprofile"});return;}
  if(D.delprofile){
    if(isOwner()){toast(t("The admin profile cannot be deleted."));return;}
    askConfirm({title:t("Delete")+" "+curProfile().name+"?",
      body:t("Every workout, meal and measurement on this profile goes with it. This cannot be undone."),
      cta:t("Delete the profile"),act:"delprofile"});return;}
  if(D.share){openSheet("share");return;}
  /* The complete screen's second button. The OS share sheet where there is one, the
     clipboard where there is not — both free, neither a dependency. The existing
     "share" sheet is a progress snapshot for friends, which is a different thing from
     this one workout, so it is not what this opens. */
  if(D.sharews!==undefined){
    var ws=V.sd;if(!ws)return;
    var line=ws.dayName+" · "+ws.mins+" "+t("min")+" · "
      +fmtN(toDisp(ws.vol))+" "+wUnit()+" "+t("lifted")+" · "
      +ws.sets+" "+t("sets")
      +(ws.prs.length?" · "+ws.prs.length+" "+t(ws.prs.length>1?"new records":"new record"):"")
      +" — BUNYAN";
    if(navigator.share){
      navigator.share({title:"BUNYAN",text:line}).catch(function(){});
      return;}
    /* writeText rejects asynchronously — a plain try/catch around it catches nothing,
       so a blocked clipboard answered the tap with silence. */
    var wrote=null;
    try{wrote=navigator.clipboard&&navigator.clipboard.writeText(line);}catch(e){}
    if(wrote&&wrote.then)
      wrote.then(function(){toast(t("Copied. Paste it wherever you like."));},
                 function(){toast(t("Sharing is not available here."));});
    else toast(t("Sharing is not available here."));
    return;}
  if(D.copysn){var t2=document.getElementById("sn");t2.select();
    try{document.execCommand("copy");toast("Copied. Send it on WhatsApp.");}
    catch(e){toast("Select the text and copy it.");}return;}
  if(D.coach){openSheet("coach");return;}
  if(D.addfriend){
    try{var sn=JSON.parse(val("fp"));
      if(!sn||!sn.sessions||!sn.name)throw 1;
      var F=friends();F[sn.name]=sn;saveFriends(F);render();toast(sn.name+" added.");}
    catch(e){toast("That code did not read properly. Ask them to copy all of it.");}
    return;}
  if(D.unfollow){
    var F2=friends();delete F2[D.unfollow];saveFriends(F2);render();return;}
  if(D.export){openSheet("backup");return;}
  if(D.warm!==undefined&&S.active){
    var ew=S.active.entries[V.logIdx],sw=ew&&ew.sets[+D.warm];
    if(!sw)return;
    sw.wu=!sw.wu;V.fresh=-1;saveDB();syncDraft();render();
    toast(sw.wu?t("Marked as a warm-up."):t("Counting as a working set."));return;}
  /* Pair with the exercise below. If that one is already in a group, join it, so
     tapping down the list chains A1 → A2 → A3. */
  if(D.group){
    var dg=dayOf(V.dayId);if(!dg)return;
    var gi=dg.ex.findIndex(function(x){return x.id===D.group;});
    if(gi<0||gi>=dg.ex.length-1)return;
    /* Absorb both sides into one id. Taking the current exercise's group first is what
       lets a pair grow into a triset, instead of minting a new id and orphaning the
       exercise above it. */
    var gid=dg.ex[gi].grp||dg.ex[gi+1].grp||("g"+uid());
    groupRun(dg.ex,gi).concat(groupRun(dg.ex,gi+1))
      .forEach(function(k){dg.ex[k].grp=gid;});
    saveDB();render();toast(t("Superset created."));return;}
  if(D.ungroup){
    var du=dayOf(V.dayId);if(!du)return;
    var ui=du.ex.findIndex(function(x){return x.id===D.ungroup;});
    if(ui<0)return;
    groupRun(du.ex,ui).forEach(function(k){du.ex[k].grp=null;});
    saveDB();render();toast(t("Superset broken."));return;}
  if(D.plates){openSheet("plates");return;}
  if(D.bar!==undefined){V.bar=+D.bar;render();return;}
  if(D.note){openSheet("note");return;}
  if(D.savenote){
    if(S.active){S.active.notes=val("snote");saveDB();}
    closeSheet();toast(t("Note saved."));return;}
  if(D.snoozebackup){S.backupSnooze=Date.now()+BACKUP_SNOOZE;saveDB();render();return;}
  /* Only a copy that actually succeeded counts as a backup. */
  if(D.copybk){var ta=document.getElementById("bk");ta.select();
    try{document.execCommand("copy");
      S.lastBackup=Date.now();S.backupSnooze=0;saveDB();
      toast(t("Copied. Your backup is up to date."));render();}
    catch(e){toast(t("Select the text and copy it."));}return;}
  if(D.import){openSheet("restore");return;}
  if(D.dorestore){
    try{var o=JSON.parse(val("rs"));if(!o||!o.splits)throw 1;
      setS(o);if(!S.myFoods)S.myFoods=[];if(!S.userSplits)S.userSplits=[];if(!S.sessions)S.sessions=[];
      migrate();adoptRestored(render);saveDB();closeSheet();V.tab="home";render();toast("Restored.");}
    catch(e){toast("That does not look like a backup.");}return;}
  /* The one place a typed confirmation is warranted: nothing here is recoverable
     without a backup, and the button sits in a list of harmless ones. */
  if(D.wipe){
    askText({title:t("Delete everything?"),
      body:t("Every workout, meal, measurement and setting on this profile. There is no undo. Export a backup first if you are not certain."),
      label:t("Type DELETE to confirm"),ph:"DELETE",cta:t("Delete everything"),act:"wipe"});return;}
  if(D.openday){openSheet("dayview",{date:D.openday});return;}
  if(D.jumpfood){V.fdate=(D.jumpfood===today())?null:D.jumpfood;closeSheet();V.tab="food";render();return;}

  /* ---- date bar, both screens ----------------------------------------------
     One set of handlers for the one component in js/ui/datebar.js. Progress and Food
     previously had their own, and the copies had drifted: Progress's day arithmetic
     omitted the timezone correction, so east of UTC "previous day" skipped one.
     Which day a screen owns is the only thing that differs, so that is the only thing
     these branches branch on. Food stores null for today because curDate() treats null
     as "follow the clock", which keeps the tab correct across midnight. */
  function dbGet(){ return V.tab==="food"?(V.fdate||today()):(V.pdate||today()); }
  function dbSet(iso){
    if(iso>today())return;                       /* no logging into the future */
    if(V.tab==="food")V.fdate=(iso===today())?null:iso;
    else V.pdate=iso;
  }
  if(D.dday!==undefined){
    dbSet(+D.dday===0?today():shiftDay(dbGet(),+D.dday));
    render();return;}
  if(D.dopen!==undefined){
    if(V.tab==="food")V.fcal=!V.fcal; else V.pcal=!V.pcal;
    V.cal=0;render();return;}
  if(D.dmonth!==undefined){V.cal+= +D.dmonth;render();return;}
  if(D.dpick){
    dbSet(D.dpick);
    if(V.tab==="food")V.fcal=false; else V.pcal=false;
    render();return;}
});



/* The dock steps aside while the keyboard is up (see syncKeyboard in render.js). The
   same test decides both directions, and render() re-checks it, so the flag cannot be
   left behind by a field that was destroyed rather than blurred. */
document.addEventListener("focusin",syncKeyboard);
document.addEventListener("focusout",function(){setTimeout(syncKeyboard,60);});
/* Every keystroke used to re-render the whole screen, which meant a linear scan of 873
   exercises plus a full innerHTML rebuild per character. The value is captured
   immediately; the redraw waits for a pause in typing. */
var exqTimer=null;
document.addEventListener("input",function(ev){
  var id=ev.target.id||"";
  if(id==="exq"){
    V.exq=ev.target.value;
    clearTimeout(exqTimer);
    exqTimer=setTimeout(function(){exqTimer=null;render();},140);
    return;}
  /* The number tiles are sized to their content so the unit stays beside the figure;
     this keeps them sized as it changes. */
  if(ev.target.closest&&ev.target.closest(".aftile-v,.ngbig,.afamt")){
    ev.target.style.width=fitCh(ev.target.value,ev.target.placeholder)+"ch";}
  /* The servings screen's typed amount. Captured now, drawn after a pause; the
     patcher leaves the focused field's value alone, so the caret stays put. */
  if(id==="afamt"&&V.food&&V.food.pick){
    /* A cleared field is zero, not the last amount: adding then asks for one rather
       than logging a figure no longer on screen. */
    var a0=parseFloat(ev.target.value);
    V.food.pick.amt=isFinite(a0)&&a0>0?a0:0;
    clearTimeout(exqTimer);
    exqTimer=setTimeout(function(){exqTimer=null;render();},140);
    return;}
  /* Food search, the same way: captured now, drawn after a pause. Typing on another
     tab means searching, so it moves to Search. */
  if(id==="fq"&&V.food){
    V.food.sq=ev.target.value;V.food.tab="search";
    clearTimeout(exqTimer);
    exqTimer=setTimeout(function(){exqTimer=null;render();},140);
    return;}
  if(id.indexOf("in_")===0){
    var k=id.slice(3),v=parseFloat(ev.target.value);
    /* The field shows the user's unit; the draft is always kilograms. */
    if(isFinite(v))V.draft[k]=(k==="w")?toKg(v):v;
    return;}});
/* Keyboard: Escape closes any sheet, Enter submits the ask sheet. Sheets were
   previously unreachable by keyboard entirely. */
document.addEventListener("keydown",function(ev){
  if(ev.key==="Escape"&&V.sheet){ev.preventDefault();requestCloseSheet();return;}
  /* Arrow keys move along any tablist (the segmented controls), as they do natively. */
  var tlist=(ev.key==="ArrowRight"||ev.key==="ArrowLeft")&&ev.target.closest&&ev.target.getAttribute("role")==="tab"
    &&ev.target.closest('[role="tablist"]');
  if(tlist){
    var tl=[].slice.call(tlist.querySelectorAll('[role="tab"]')),ti=tl.indexOf(ev.target);
    var fw=(ev.key==="ArrowRight")!==(document.documentElement.dir==="rtl");
    var nx=tl[(ti+(fw?1:-1)+tl.length)%tl.length];
    if(nx){ev.preventDefault();nx.click();}
    return;}
  if(ev.key==="Enter"&&V.sheet==="ask"&&ev.target.id==="askv"){
    ev.preventDefault();
    var ao=V.sd||{},av2=val("askv");
    if(ao.required!==false&&!String(av2).trim()){toast(t("Enter something first."));return;}
    runAct(ao.act,av2);}});
document.addEventListener("change",function(ev){
  if(ev.target.id==="chartsel"){V.chartEx=ev.target.value;render();return;}
  /* A progress photo, picked from the camera or the library. Shrunk and stored on
     this phone by js/ui/photos.js; the Body view re-reads the list once it lands. */
  if(ev.target.id==="pg_photo"){
    var file=ev.target.files&&ev.target.files[0];
    ev.target.value="";
    if(!file)return;
    toast(t("Saving photo…"));
    addPhoto(file,function(ok){
      render();
      toast(ok?t("Photo saved on this phone."):t("That photo could not be saved."));});
    return;}
  /* The meal in the add-food header. */
  if(ev.target.id==="afmeal"&&V.sd){V.sd.meal=ev.target.value;render();return;}
  /* The chooser holds servings ("s2") and measures ("uml"). Moving between them keeps
     the amount: a mug (250 g) becomes 250 ml, 0.25 L, or back to one mug. */
  if(ev.target.id==="afsrv"&&V.food&&V.food.pick){
    var pk3=V.food.pick,v3=ev.target.value,g3=pickAmount(pk3).g;
    if(v3.charAt(0)==="u"){
      var k3=v3.slice(1),per3=unitGrams(pk3.food,k3);
      pk3.u=k3;pk3.amt=per3?Math.max(UNIT_STEP[k3]/10,roundUnit(k3,g3/per3)):UNIT_STEP[k3];
    }else{
      var si3=+v3.slice(1),sv3=servs(pk3.food),s3=sv3[si3]||sv3[0];
      /* From a measure back to a serving: the nearest half serving. Serving to
         serving keeps the count, as it always has. */
      if(pk3.u)pk3.n=Math.max(0.5,Math.round(g3/s3[1]*2)/2);
      pk3.u=null;pk3.amt=null;pk3.si=si3;}
    render();return;}
  /* Quick Add's unit chooser: the same conversion, on a parsed item. */
  if(ev.target.dataset&&ev.target.dataset.qunit!==undefined&&V.food&&V.food.items){
    var it9=V.food.items[+ev.target.dataset.qunit];if(!it9||!it9.food)return;
    var k9=ev.target.value,per9=k9?unitGrams(it9.food,k9):0;
    if(k9&&per9){it9.parsed.unit=k9;it9.parsed.qty=Math.max(UNIT_STEP[k9]/10,roundUnit(k9,it9.grams/per9));}
    else{var s9=servs(it9.food)[0];
      it9.parsed.unit=null;it9.parsed.qty=Math.max(0.5,Math.round(it9.grams/s9[1]*2)/2);}
    recalcItem(it9);render();return;}
  /* The manual sheet's button says what it will do. Changed in place rather than by
     re-rendering, which would put the typed values back to what the sheet opened with. */
  if(ev.target.id==="mf_save"){
    var go=document.getElementById("mf_go");
    if(go)go.textContent=t(ev.target.checked?"Save and add to":"Add to")+" "
      +t((V.sd&&V.sd.meal)||mealNow());
    return;}
  /* Editing a set that is already logged, in place. Previously the only way to fix
     a typo was to delete the set and re-enter it. */
  var si=ev.target.dataset?ev.target.dataset.setidx:undefined;
  if(si!==undefined&&S.active){
    var en=S.active.entries[V.logIdx];
    if(!en||!en.sets[+si])return;
    var k=ev.target.dataset.k,v=num(ev.target.value,0);
    if(k==="rpe")v=v?Math.min(10,Math.max(1,v)):0;
    else if(k==="w")v=Math.max(0,toKg(v));
    else v=Math.max(0,v);
    en.sets[+si][k]=v;
    V.fresh=-1;saveDB();syncDraft();render();}});

/* The clock and the rest ring are the only things that change every second, so they
   are patched directly. Re-rendering the whole screen on a timer threw away scroll
   position and stole focus from the set inputs mid-entry. */
function tickSession(){
  if(!S.active)return;
  /* Computed from the last logged set, so a suspended page comes back with the right
     number rather than a counter that stopped when iOS froze the tab. */
  var ck=sessionClock(S.active);
  var c=document.getElementById("sessClock");
  if(c)c.textContent=mmss(ck.ms/1000);
  var pz=document.getElementById("sessPaused");
  if(pz)pz.hidden=!ck.paused;
  if(!V.restEnd||V.restPaused)return;
  var left=Math.ceil((V.restEnd-Date.now())/1000);
  /* Running out is the one tick that changes the screen rather than the numbers. The
     rest surface does not disappear at zero any more — it turns into the alert, and
     stays until the user acknowledges it. Sound cannot be relied on (silent switch,
     backgrounded tab), so the screen has to carry it. */
  if(left<=0){V.restEnd=0;V.restPaused=false;V.restDone=true;
    if(V.tab==="train"&&!V.sheet)render();return;}
  paintRest();
}
setInterval(function(){
  if(V.restEnd&&!V.restPaused&&!beeped){
    var left=Math.ceil((V.restEnd-Date.now())/1000);
    var warn=S.prefs.warn||10;
    if(left<=Math.min(3,warn)&&left>0&&left!==lastTick){setLastTick(left);play("tick");}
    if(left===warn&&lastTick!==warn){setLastTick(warn);play("tick");}
    if(left<=0){setBeeped(true);alarmStart();tap("ok");}}
  tickSession();},1000);
document.addEventListener("visibilitychange",function(){
  if(document.visibilityState==="visible"&&S.active)keepAwake(true);});

/* The intro is skippable — a tap ends it immediately. It also runs short when the
   user has asked for less motion, either in the OS or in App settings. */
function endSplash(){var sp=document.getElementById("splash");if(sp)sp.remove();}
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
/* ---- closing a sheet ------------------------------------------------------ */
/* Most sheets show what is already stored, so closing them costs nothing. The ones
   holding typed input that has not been saved anywhere ask first. */
var MF=["mf_n","mf_s","mf_k","mf_p","mf_c","mf_f"];
function sheetDirty(){
  if(V.sheet!=="manual")return false;
  return MF.some(function(id){var el=document.getElementById(id);
    return el&&String(el.value).trim()!=="";});
}
/* Every way out of a sheet goes through here: the ✕, a tap outside, a drag down and
   Escape. One of them skipping the check would make the guard pointless. */
function requestCloseSheet(){
  if(sheetDirty()){
    askConfirm({title:t("Discard what you typed?"),
      body:t("This food has not been added to your log yet."),
      cta:t("Discard"),act:"dropsheet",
      back:{name:val("mf_n"),s:val("mf_s"),k:val("mf_k"),p:val("mf_p"),c:val("mf_c"),f:val("mf_f"),
            meal:(V.sd&&V.sd.meal)||"",bc:(V.sd&&V.sd.bc)||""}});
    return;}
  closeSheet();
}
ACT.dropsheet=function(){closeSheet();};

/* ---- leaving an active workout ------------------------------------------- */
/* One prompt, reached by every exit. nav.js routes the back arrow, Safari's edge
   swipe and the OS gesture through this same guard, so no control hardcodes a
   destination and none of them can behave differently from the others.

   The protocol: return true to cancel this back and take responsibility for it. The
   guard is handed the function that finishes the job and calls it once the user has
   chosen, so "Keep workout and exit" leaves exactly where the gesture was going.

   Leaving has not ended a session since Round 2 — the session is saved and resumable
   either way. The sheet is not there to prevent loss; it is there to say so, because
   a user who does not know their sets are safe will not risk the gesture. That is why
   keeping is the primary and discarding is the secondary, outlined rather than filled:
   the dangerous option should be reachable, not inviting. */
var leaveResume=null;
/* While the logger is the screen you are looking at, the back gesture is held off and
   the ✕ is the way out. Same condition as navGuard below, because it has to be the
   same screen: anywhere else in the app the gesture keeps working normally.

   Pure. canBack() consults it on every render to decide whether to draw a back arrow,
   so anything with a side effect here would fire on every repaint. */
function sessionLocked(){
  return !!(S.active&&V.tab==="train"&&!V.sheet);
}
/* A gesture answered by nothing at all reads as a frozen app, so it says what to do
   instead — once per workout, not per swipe, which would be its own annoyance. Only
   the session has anything to explain: a swipe at a tab root does nothing because
   there is nowhere to go, which needs no telling. */
var lockSaid=false;
function backBlocked(){
  if(!S.active){lockSaid=false;return;}         /* armed again for the next workout */
  if(!sessionLocked()||lockSaid)return;
  lockSaid=true;toast(t("Tap the close button to leave this workout."));
}

function navGuard(resume){
  /* Only when the workout is the thing you are actually looking at. vTrain() returns
     the logger for as long as a session is live, so "the Train tab" and "the workout"
     are the same screen and that is the whole condition. Without the tab test, every
     back gesture anywhere in the app — on Food, on Progress — would stop to ask about
     a workout the user is not currently in. */
  if(!S.active||V.tab!=="train")return false;
  leaveResume=resume||null;
  askConfirm({title:t("Leave workout?"),
    body:t("Your completed sets are saved. You can resume this workout later."),
    cta:t("Keep workout and exit"),act:"leavekeep",
    alt:t("Discard workout"),altact:"leavediscard"});
  return true;
}
/* Cancel needs no handler: closing the sheet without choosing leaves the session and
   the screen exactly as they were, which is what Cancel means.

   Both outcomes land on Home rather than calling the resume the gesture was carrying.
   That is not a shortcut — back inside Train resolves to a Train route, and a Train
   route with a live session renders the logger, so honouring the gesture's own
   destination would put the user straight back in the workout they just left. Home is
   also the screen that carries the Resume card, so leaving and returning are adjacent.
   The destination is decided here, once, for the arrow and the swipe alike. */
function leaveTo(){
  leaveResume=null;
  V.tab="home";V.train="days";render();
}
ACT.leavekeep=leaveTo;
ACT.leavediscard=function(){
  S.active=null;endRest();V.fresh=-1;
  keepAwake(false);saveDB();
  leaveTo();
};

function openBarcodePrompt(){
  askText({title:t("Enter barcode"),label:t("Barcode"),
    body:t("The digits printed under the bars on the packet."),
    ph:"5000112637922",numeric:true,cta:t("Look it up"),act:"barcode"});
}
ACT.barcode=function(v){ onBarcode(v); };

/* Boot. Nothing above ran on import, so this is the whole startup sequence
   in the order it actually happens. */
initState();
setStorageErrorHandler(toast);
/* One back path for the arrow, the edge swipe and the OS gesture. */
initNav({render:render,guard:navGuard,closeSheet:requestCloseSheet,
         locked:sessionLocked,onBlocked:backBlocked});
initSheetDrag(requestCloseSheet);
/* History comes from IndexedDB, so it arrives a tick later than everything else.
   Painting first and repainting when it lands keeps a slow or wedged IndexedDB from
   holding the whole app behind the intro; in practice it resolves well inside it. */
loadStored(function(){ render(); });
/* The intro belongs to a cold start, not to every document load. A reload for any
   reason — a service worker taking over, a crash recovery, the OS reclaiming the
   tab — used to replay it, which reads as the app restarting. */
var coldStart=true;
try{ coldStart=!sessionStorage.getItem("bunyan:seen"); sessionStorage.setItem("bunyan:seen","1"); }
catch(e){ coldStart=true; }
if(!coldStart||(S.prefs&&S.prefs.splash===false))document.body.classList.add("nosplash");
else{
  var reduced=false;
  try{reduced=window.matchMedia("(prefers-reduced-motion:reduce)").matches;}catch(e){}
  var brief=reduced||(S.prefs&&S.prefs.anim===false);
  setTimeout(endSplash,brief?2150:3750);
  var spEl=document.getElementById("splash");
  if(spEl)spEl.addEventListener("click",endSplash);
}
loadExDB(function(){render();});
if(S.active)syncDraft();
if(!S.onboarded){V.tab="home";V.sheet="setup";}
render();

if("serviceWorker" in navigator){
  window.addEventListener("load",function(){
    navigator.serviceWorker.register("sw.js").then(function(reg){
      reg.update();
      reg.addEventListener("updatefound",function(){
        var nw=reg.installing;
        if(!nw)return;
        nw.addEventListener("statechange",function(){
          if(nw.state==="installed"&&navigator.serviceWorker.controller){
            nw.postMessage("skipWaiting");
            toast("Updated. Reopen the app to finish.");
          }});});
    }).catch(function(){});
  });
  /* No automatic reload. controllerchange fires on the first install as well as on
     an update, so this reloaded the page at an arbitrary moment — which replayed the
     intro and looked exactly like the app restarting under a back gesture. Reloading
     mid-workout is hostile anyway; the toast above already says what to do, and the
     new version is picked up on the next open. */
}