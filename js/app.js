/* Bunyan — app
   Entry point: event listeners, wiring and boot. */
import {ACT, addExercise, askConfirm, askText, closeSheet, finishSession, openSheet, runAct, startDay, syncDraft, val} from "./ui/actions.js";
import {t} from "./i18n/dict.js";
import {loadExDB, loadInstructions} from "./data/exercises.js";
import {applyLang} from "./i18n/exnames.js";
import {addItems, BACKUP_SNOOZE, curDate, lastWeight, macroKcal, targetKcal} from "./engine/formulas.js";
import {FOODDB, gramsFor, loadFoods, lookupBarcode, normBarcode, nutritionFor, offSearch, parseFoodInput, recalcItem, resolveItem, toLogItem, UNITS} from "./engine/nutrition.js";
import {startScan, stopScan} from "./scan.js";
import {buildPlan} from "./engine/plan.js";
import {render} from "./ui/render.js";
import {groupNext, groupRun, mmss} from "./ui/views/session.js";
import {adoptRestored, allSplits, CUR, curProfile, dayOf, dayRec, friends, initState, isOwner, loadStored, migrate, S, saveDB, saveFriends, setS, split, switchProfile} from "./state.js";
import {toDisp, toKg} from "./units.js";
import {num, r1, setStorageErrorHandler, today, uid} from "./util.js";
import {audioOn, beeped, keepAwake, lastTick, play, setBeeped, setLastTick, startRest, tap, toast, V} from "./ui/view.js";

document.addEventListener("click",function(ev){
  /* Named el, not t: t() is the translator, and shadowing it here made every
     translated string inside this handler throw. */
  var el=ev.target.closest("button,[data-close],[data-stop]");
  if(!el)return;
  if(el.matches("button"))tap(el.classList.contains("btn")?"heavy":"light");
  var D=el.dataset;

  if(D.stop!==undefined&&!el.matches("button"))return;
  if(D.close!==undefined){closeSheet();return;}
  if(D.askok!==undefined){
    var ao=V.sd||{},av=val("askv");
    if(ao.required!==false&&!String(av).trim()){toast(t("Enter something first."));return;}
    runAct(ao.act,av);return;}
  if(D.confirmok!==undefined){runAct((V.sd||{}).act,true);return;}
  if(D.tab){V.tab=D.tab;V.train="days";render();return;}
  if(D.go){V.tab=D.go;render();return;}

  /* ---- splits & days */
  if(D.train){V.train=D.train;render();return;}
  if(D.day){V.dayId=D.day;V.train="day";render();return;}
  if(D.adopt){
    var pre=allSplits().filter(function(x){return x.id===D.adopt;})[0];
    if(!pre)return;
    askConfirm({title:t("Switch to")+" "+pre.name+"?",
      body:t("This replaces your current plan. Every session you have already logged is kept."),
      cta:t("Make it my training"),act:"adopt",data:D.adopt});return;}
  if(D.preview){V.previewId=D.preview;V.train="preview";render();return;}
  if(D.newsplit){
    askText({title:t("New split"),label:t("Name"),ph:t("For example, Upper / Lower"),
      cta:t("Create"),act:"newsplit"});return;}
  if(D.addday){
    askText({title:t("Add a day"),label:t("Name"),ph:t("For example, Chest & Triceps"),
      cta:t("Add"),act:"addday"});return;}
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
  if(D.addex){V.dayId=D.addex;openSheet("exercise",{});return;}
  if(D.editex){openSheet("editex",{id:D.editex});return;}
  if(D.exm){V.exm=D.exm;render();return;}
  if(D.exe){V.exe=D.exe;render();return;}
  if(D.cleardiff){V.exd=null;render();return;}
  if(D.range){V.range=+D.range;render();return;}
  if(D.showall){V.showAll=!V.showAll;render();return;}
  if(D.bwsplit){V.train="bodyweight";render();return;}
  if(D.bwcat){V.exm=D.bwcat==="All"?"All":D.bwcat;V.exe="Bodyweight";V.exq="";
    V.train="library";render();return;}
  if(D.bwdiff){V.exd=D.bwdiff;V.exe="Bodyweight";V.exm="All";V.exq="";V.train="library";render();return;}
  if(D.exdetail){var nm5=D.exdetail;loadInstructions(function(){openSheet("exdetail",{name:nm5});});return;}
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
    V.exm="All";V.exe="All";V.exq="";
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
  if(D.startday){startDay(D.startday);return;}
  if(D.jump!==undefined){
    var n2=+D.jump;
    if(!S.active||n2<0||n2>=S.active.entries.length)return;
    V.logIdx=n2;V.restEnd=0;V.restPaused=false;V.fresh=-1;syncDraft();render();return;}
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
        if(wrapped)startRest(e3); else V.restEnd=0;
        V.logIdx=nxt;V.fresh=-1;
      }
      saveDB();syncDraft();render();return;
    }
    startRest(e3);saveDB();syncDraft();render();return;}
  /* Tapping the green tick undoes that set. Reversible, so no confirm. */
  if(D.unlog!==undefined){
    var e4=S.active.entries[V.logIdx];e4.sets.splice(+D.unlog,1);
    V.fresh=-1;saveDB();syncDraft();render();
    toast(t("Set removed."));return;}
  if(D.addrow){
    var e5=S.active.entries[V.logIdx];
    e5.extra=(e5.extra||0)+1;V.fresh=-1;saveDB();render();return;}
  if(D.rest){
    if(D.rest==="pause"){V.restLeft=Math.max(0,Math.ceil((V.restEnd-Date.now())/1000));
      V.restPaused=true;V.restEnd=0;render();return;}
    if(D.rest==="resume"){V.restPaused=false;V.restEnd=Date.now()+V.restLeft*1000;
      setBeeped(false);render();return;}
    if(D.rest==="skip"){V.restEnd=0;V.restPaused=false;}
    else if(V.restPaused){V.restLeft=Math.max(0,V.restLeft+(+D.rest));
      V.restTotal=Math.max(15,V.restTotal+(+D.rest));
      if(!V.restLeft){V.restPaused=false;}}
    else{V.restEnd=Math.max(Date.now(),V.restEnd+(+D.rest)*1000);
         V.restTotal=Math.max(15,V.restTotal+(+D.rest));
         if(+D.rest>0)setBeeped(false);}
    render();return;}
  if(D.swap){
    var eS=S.active.entries[V.logIdx];
    V.exm="All";V.exe="All";V.exq="";
    openSheet("exercise",{swaplive:true,like:eS?eS.name:null});return;}
  if(D.nextex){
    if(V.logIdx>=S.active.entries.length-1){finishSession();return;}
    play("set");V.restEnd=0;V.restPaused=false;V.fresh=-1;
    V.logIdx=V.logIdx+1;
    saveDB();syncDraft();render();return;}
  if(D.finish){finishSession();return;}
  if(D.quit){V.tab="home";render();return;}
  if(D.discard){
    askConfirm({title:t("Discard this session?"),
      body:t("Every set you logged in this workout is thrown away. This cannot be undone."),
      cta:t("Discard it"),act:"discard"});return;}

  /* ---- daily logs */
  if(D.water){
    /* Home writes to today explicitly; Food writes to the date it is browsing. */
    var r2=dayRec(D.wdate||curDate());r2.water=Math.max(0,r2.water+ +D.water);saveDB();render();return;}
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
    [["m_chest","chest"],["m_waist","waist"],["m_arms","arms"],["m_thighs","thighs"],
     ["m_calves","calves"],["m_neck","neck"]].forEach(function(m){
      var v=num(val(m[0]));if(v)rec[m[1]]=v;});
    var e5=S.body.filter(function(b){return b.date===today();})[0];
    if(e5)Object.assign(e5,rec);else S.body.push(rec);
    S.body.sort(function(a,b){return a.date<b.date?-1:1;});
    saveDB();closeSheet();toast("Measurements saved.");return;}

  /* ---------------- food ---------------- */
  if(D.addfood){
    loadFoods(function(){V.food={q:"",items:null};openSheet("addfood",{meal:D.addfood});});
    return;}
  if(D.parse){
    var q6=val("nlq").trim();
    if(!q6){toast("Type what you ate first.");return;}
    V.food={q:q6,items:parseFoodInput(q6).map(resolveItem)};
    render();return;}
  if(D.qty){
    var pr6=D.qty.split("|"),it6=V.food.items[+pr6[0]];
    var step=(it6.parsed.unit&&UNITS[it6.parsed.unit])?
      (UNITS[it6.parsed.unit]>=100?50:UNITS[it6.parsed.unit]>=15?1:10):1;
    var cur6=it6.parsed.qty==null?1:it6.parsed.qty;
    it6.parsed.qty=Math.max(step<1?0.5:0.5,r1(cur6+(+pr6[1])*(step<1?0.5:1)));
    recalcItem(it6);render();return;}
  if(D.gram){
    var it7=V.food.items[+D.gram];if(!it7)return;
    askText({title:it7.name,label:t("Grams"),numeric:true,
      value:Math.round(it7.grams),cta:t("Set grams"),
      act:"grams",data:{idx:+D.gram,meal:V.sd&&V.sd.meal}});return;}
  if(D.swapfood){openSheet("pickfood",{idx:+D.swapfood});return;}
  if(D.choose){
    var pr8=D.choose.split("|"),it8=V.food.items[+pr8[0]];
    it8.food=it8.alts[+pr8[1]]; it8.name=it8.food.n; it8.src=it8.food.src||"db";
    it8.status="ok"; recalcItem(it8);
    V.sheet="addfood"; render();return;}
  if(D.dropitem){V.food.items.splice(+D.dropitem,1);render();return;}
  if(D.online){
    var q9=D.online;
    V.food.busy=true;render();
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
  if(D.manual!==undefined){openSheet("manual",{name:D.manual||"",bc:(V.sd&&V.sd.bc)||""});return;}
  if(D.savemanual||D.savemyfood){
    var nm9=val("mf_n").trim()||"Manual entry";
    var p9=num(val("mf_p")),c9=num(val("mf_c")),f9b=num(val("mf_f"));
    var k9=num(val("mf_k"))||macroKcal(p9,c9,f9b);
    if(!k9&&!p9&&!c9&&!f9b){toast("Enter at least one number.");return;}
    var item9={fid:"manual_"+uid(),n:nm9,label:"1 serving",grams:0,src:"you",
      kcal:k9,p:p9,c:c9,f:f9b,fib:0};
    if(D.savemyfood){
      /* Carrying the barcode through means the next scan of this packet resolves
         locally, with no network and no second trip through manual entry. */
      var bc9=normBarcode((V.sd&&V.sd.bc)||"");
      S.myFoods.push({id:"my_"+uid(),n:nm9,cat:"My Foods",per:100,
        kcal:k9,p:p9,c:c9,f:f9b,fib:0,s:[["1 serving",100]],a:[],src:"you",
        bc:bc9||undefined});}
    addItems(val("mf_meal")||"Snack",[item9],curDate());
    closeSheet();V.tab="food";render();toast(nm9+" added.");return;}
  if(D.commit){
    var meal9=val("mealsel")||(V.sd&&V.sd.meal)||"Snack";
    var good9=V.food.items.filter(function(i){return i.status!=="unknown";});
    if(!good9.length){toast("Nothing to add yet.");return;}
    addItems(meal9,good9.map(toLogItem),curDate());
    closeSheet();V.tab="food";render();
    play("set");toast(meal9+" updated.");return;}
  if(D.savemeal){
    askText({title:t("Save this as a meal"),label:t("Name"),value:t("My meal"),
      body:t("It goes into Saved meals so you can log the whole thing in one tap."),
      cta:t("Save"),act:"savemeal",data:{meal:V.sd&&V.sd.meal}});return;}
  if(D.addsaved){
    var sm=S.savedMeals[+D.addsaved];
    if(!sm)return;
    addItems("Snack",JSON.parse(JSON.stringify(sm.items)),curDate());
    render();play("set");toast(sm.name+" added.");return;}
  if(D.quickfood){
    var pool9=(S.myFoods||[]).concat(FOODDB||[]);
    var f10=pool9.filter(function(x){return x.id===D.quickfood;})[0];
    if(!f10)return;
    var gq=gramsFor(f10,1,null);
    addItems("Snack",[{fid:f10.id,n:f10.n,label:gq.label,grams:gq.g,src:f10.src||"db",
      kcal:nutritionFor(f10,gq.g).kcal,p:nutritionFor(f10,gq.g).p,
      c:nutritionFor(f10,gq.g).c,f:nutritionFor(f10,gq.g).f,fib:nutritionFor(f10,gq.g).fib}],curDate());
    if(V.sheet)closeSheet();
    V.tab="food";render();play("set");toast(f10.n+" added.");return;}
  if(D.fday){
    if(D.fday==="0"){V.fdate=null;render();return;}
    var base=new Date((V.fdate||today())+"T00:00:00");
    base.setDate(base.getDate()+(+D.fday));
    var iso=new Date(base-base.getTimezoneOffset()*6e4).toISOString().slice(0,10);
    if(iso>today())return;
    V.fdate=(iso===today())?null:iso;render();return;}
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
  if(D.testsound){audioOn();play("pr");
    setTimeout(function(){toast("If that was silent, your phone\u2019s ring switch is off.");},400);
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
  if(D.buildplan){
    var p4=S.profile;
    p4.level=val("o_level")||p4.level; p4.goal=val("o_goal")||p4.goal;
    p4.days=num(val("o_days"),3);
    p4.weight=toKg(num(val("o_weight"),toDisp(p4.weight)));
    p4.height=num(val("o_height"),p4.height); p4.age=num(val("o_age"),p4.age);
    p4.sex=val("o_sex")||p4.sex;
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
  if(D.skipex){var i6=S.skip.indexOf(D.skipex);
    if(i6>=0)S.skip.splice(i6,1);else S.skip.push(D.skipex);saveDB();render();return;}
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
  if(D.cal!==undefined){V.cal+= +D.cal;render();return;}
});



document.addEventListener("focusin",function(ev){
  if(ev.target.matches("input,select,textarea"))document.body.classList.add("kb");});
document.addEventListener("focusout",function(){
  setTimeout(function(){
    var a=document.activeElement;
    if(!a||!a.matches||!a.matches("input,select,textarea"))document.body.classList.remove("kb");
  },60);});
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
  if(id.indexOf("in_")===0){
    var k=id.slice(3),v=parseFloat(ev.target.value);
    /* The field shows the user's unit; the draft is always kilograms. */
    if(isFinite(v))V.draft[k]=(k==="w")?toKg(v):v;
    return;}});
/* Keyboard: Escape closes any sheet, Enter submits the ask sheet. Sheets were
   previously unreachable by keyboard entirely. */
document.addEventListener("keydown",function(ev){
  if(ev.key==="Escape"&&V.sheet){ev.preventDefault();closeSheet();return;}
  if(ev.key==="Enter"&&V.sheet==="ask"&&ev.target.id==="askv"){
    ev.preventDefault();
    var ao=V.sd||{},av2=val("askv");
    if(ao.required!==false&&!String(av2).trim()){toast(t("Enter something first."));return;}
    runAct(ao.act,av2);}});
document.addEventListener("change",function(ev){
  if(ev.target.id==="chartsel"){V.chartEx=ev.target.value;render();return;}
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
var REST_C=653.45;
function tickSession(){
  if(!S.active)return;
  var c=document.getElementById("sessClock");
  if(c)c.textContent=mmss(S.active.started?(Date.now()-S.active.started)/1000:0);
  if(!V.restEnd||V.restPaused)return;
  var left=Math.ceil((V.restEnd-Date.now())/1000);
  if(left<=0){V.restEnd=0;V.restPaused=false;if(V.tab==="train"&&!V.sheet)render();return;}
  var d=document.getElementById("restDig");
  if(d)d.textContent=mmss(left);
  var ringEl=document.getElementById("restRing");
  if(ringEl)ringEl.setAttribute("stroke-dashoffset",
    String(REST_C*(1-Math.max(0,Math.min(1,left/Math.max(1,V.restTotal))))));
}
setInterval(function(){
  if(V.restEnd&&!V.restPaused&&!beeped){
    var left=Math.ceil((V.restEnd-Date.now())/1000);
    var warn=S.prefs.warn||10;
    if(left<=Math.min(3,warn)&&left>0&&left!==lastTick){setLastTick(left);play("tick");}
    if(left===warn&&lastTick!==warn){setLastTick(warn);play("tick");}
    if(left<=0){setBeeped(true);play("rest");tap("ok");}}
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
  if(V.sheet!=="addfood")openSheet("addfood",{meal:(V.sd&&V.sd.meal)||"Snack"});
  if(!V.food)V.food={q:"",items:[]};
  if(!V.food.items)V.food.items=[];
  V.food.busy=true;V.food.offline=false;V.food.noresult=false;render();
  lookupBarcode(code,function(food,failed,local){
    V.food.busy=false;
    if(failed){
      V.food.offline=code;render();
      toast(t("Could not reach the food database."));return;}
    if(!food){
      /* Not a failure of the scan: the product simply is not in the database. Hand
         the barcode to manual entry so saving it teaches this device. */
      render();
      toast(t("That product is not in the database yet."));
      openSheet("manual",{name:"",bc:code,meal:(V.sd&&V.sd.meal)||"Snack"});return;}
    var g=gramsFor(food,100,"g");
    V.food.items.push({status:"ok",parsed:{raw:code,query:food.n,qty:100,unit:"g"},
      food:food,alts:[food],grams:g,label:"100 g",src:food.src||"off",
      n:nutritionFor(food,100),name:food.n});
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
ACT.barcode=function(v){ onBarcode(v); };

/* Boot. Nothing above ran on import, so this is the whole startup sequence
   in the order it actually happens. */
initState();
setStorageErrorHandler(toast);
/* History comes from IndexedDB, so it arrives a tick later than everything else.
   Painting first and repainting when it lands keeps a slow or wedged IndexedDB from
   holding the whole app behind the intro; in practice it resolves well inside it. */
loadStored(function(){ render(); });
if(S.prefs&&S.prefs.splash===false)document.body.classList.add("nosplash");
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
  var reloaded=false;
  navigator.serviceWorker.addEventListener("controllerchange",function(){
    if(reloaded)return;reloaded=true;location.reload();});
}