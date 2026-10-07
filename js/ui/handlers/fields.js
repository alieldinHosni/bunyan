/* Bunyan — typing and choosing
   What fields do as they change: the input, change and keydown listeners, which app.js
   wires to the document. Values are captured as they are typed; redraws wait for a
   pause. */
import * as W from "../workout.js";
import {actKcal} from "../../data/activities.js";
import {lastWeight} from "../../engine/formulas.js";
import {mealName, mealSlots} from "../../engine/meals.js";
import {loadFoods, recalcItem, roundUnit, UNIT_STEP, unitGrams} from "../../engine/nutrition.js";
import {parsePlan} from "../../engine/planparse.js";
import {t} from "../../i18n/dict.js";
import {dayOf, editSplit, S, saveDB} from "../../state.js";
import {toKg} from "../../units.js";
import {fmtN, num} from "../../util.js";
import {runAct, val} from "../actions.js";
import {addPhoto} from "../photos.js";
import {render} from "../render.js";
import {mealNow, toast, V} from "../view.js";
import {fitCh, pickAmount, servs} from "../views/addfood.js";
import {builderId, chatSend, editedEx, moveRow, readTraining, requestCloseSheet, setExField, topOfResults, withNotes} from "./common.js";

/* A weekday holds one thing: a day of the program, an activity, or rest. */
function assignWd(n,val){
  var tp=V.tp;if(!tp)return;
  tp.days.forEach(function(d){d.wd=d.wd.filter(function(x){return x!==n;});});
  (tp.acts||[]).forEach(function(a){a.wd=(a.wd||[]).filter(function(x){return x!==n;});});
  var m=/^([da]):(\d+)$/.exec(val||"");if(!m)return;
  var it=m[1]==="d"?tp.days[+m[2]]:(tp.acts||[])[+m[2]];
  if(it){(it.wd=it.wd||[]).push(n);it.wd.sort();}}
/* Every keystroke used to re-render the whole screen, which meant a linear scan of 873
   exercises plus a full innerHTML rebuild per character. The value is captured
   immediately; the redraw waits for a pause in typing. */
var exqTimer=null;
function onInput(ev){
  var id=ev.target.id||"";
  if(id==="pi_text"){V.pitext=ev.target.value;return;}
  if(id==="ti_text"){V.titext=ev.target.value;return;}
  var ptk=/^pt_(kcal|p|c|f|water|steps)$/.exec(id);
  if(ptk&&V.ptargets){var pv=num(ev.target.value,0);V.ptargets[ptk[1]]=ptk[1]==="water"?Math.round(pv*1000):Math.round(pv);return;}
  var pmn=/^pm_n_(\d+)$/.exec(id);
  if(pmn&&V.pparse&&V.pparse[+pmn[1]]){var nmv=ev.target.value.trim();V.pparse[+pmn[1]].custom=nmv||null;return;}
  if(id==="ti_name"&&V.tp){V.tp.name=ev.target.value;return;}
  /* The assessment's numbers, kept as typed; weight in kilograms whatever is shown. */
  if(V.asd&&(id==="as_age"||id==="as_height")){V.asd[id.slice(3)]=num(ev.target.value,0)||"";return;}
  if(V.asd&&id==="as_weight"){V.asd.weight=toKg(num(ev.target.value,0))||"";return;}
  var dnm=/^ti_dn_(\d+)$/.exec(id);if(dnm&&V.tp&&V.tp.days[+dnm[1]]){V.tp.days[+dnm[1]].name=ev.target.value;return;}
  if(id==="exq"){
    V.exq=ev.target.value;
    clearTimeout(exqTimer);
    exqTimer=setTimeout(function(){exqTimer=null;render();topOfResults();},140);
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
    exqTimer=setTimeout(function(){exqTimer=null;render();topOfResults();},140);
    return;}
  if(id.indexOf("in_")===0){
    var k=id.slice(3),v=parseFloat(ev.target.value);
    if((k==="w"||k==="r")&&V.draftSg){V.draftSg=false;
      [].forEach.call(document.querySelectorAll("#in_w,#in_r"),function(f){f.classList.remove("sg");});}
    /* The field shows the user's unit; the draft is always kilograms. */
    if(isFinite(v))V.draft[k]=(k==="w")?toKg(v):v;
    if(k==="min"){var ak=document.getElementById("actKcal"),ae2=S.active&&S.active.entries[V.logIdx];
      if(ak&&ae2)ak.textContent=fmtN(actKcal(ae2.name,num(V.draft.min),V.draft.rpe||6,lastWeight()))+" kcal";}
    return;}}
/* Keyboard: Escape closes any sheet, Enter submits the ask sheet. Sheets were
   previously unreachable by keyboard entirely. */
function onKeydown(ev){
  if(ev.key==="Escape"&&V.sheet){ev.preventDefault();requestCloseSheet();return;}
  /* Arrow keys move along any tablist (the segmented controls), as they do natively. */
  /* The grip moves its row with the arrow keys too, so reordering never needs a drag. */
  var gp=(ev.key==="ArrowUp"||ev.key==="ArrowDown")&&ev.target.closest&&ev.target.closest("[data-grip]");
  if(gp){
    ev.preventDefault();
    var gid=gp.getAttribute("data-grip"),gl=V.tab==="coach"&&V.reorder==="ms"?mealSlots()
      :builderId()?(editSplit(builderId())||{days:[]}).days:((dayOf(V.dayId)||{ex:[]}).ex);
    var gi=gl.findIndex(function(x){return x.id===gid;});
    if(gi<0)return;
    moveRow(gid,gi+(ev.key==="ArrowUp"?-1:1));
    var ng=document.querySelector('[data-grip="'+gid+'"]');if(ng)ng.focus();
    return;}
  var tlist=(ev.key==="ArrowRight"||ev.key==="ArrowLeft")&&ev.target.closest&&ev.target.getAttribute("role")==="tab"
    &&ev.target.closest('[role="tablist"]');
  if(tlist){
    var tl=[].slice.call(tlist.querySelectorAll('[role="tab"]')),ti=tl.indexOf(ev.target);
    var fw=(ev.key==="ArrowRight")!==(document.documentElement.dir==="rtl");
    var nx=tl[(ti+(fw?1:-1)+tl.length)%tl.length];
    if(nx){ev.preventDefault();nx.click();}
    return;}
  if(ev.key==="Enter"&&ev.target.id==="chatq"){ev.preventDefault();chatSend();return;}
  if(ev.key==="Enter"&&V.sheet==="ask"&&ev.target.id==="askv"){
    ev.preventDefault();
    var ao=V.sd||{},av2=val("askv");
    if(ao.required!==false&&!String(av2).trim()){toast(t("Enter something first."));return;}
    runAct(ao.act,av2);}}
function onChange(ev){
  if(ev.target.id==="chartsel"){V.chartEx=ev.target.value;render();return;}
  var ek=/^e_(sets|rest|lo|hi|min|km)$/.exec(ev.target.id||"");
  if(ek){var ee=editedEx();if(ee){setExField(ee,ek[1],ev.target.value);saveDB();render();}return;}
  /* A progress photo, picked from the camera or the library. Shrunk and stored on
     this phone by js/ui/photos.js; the Body view re-reads the list once it lands. */
  /* A plan from a file: read as text into the box, then read as a plan straight away. */
  var wdm=/^ti_wd_(\d)$/.exec(ev.target.id||"");
  if(wdm&&V.tp){assignWd(+wdm[1],ev.target.value);render();return;}
  /* A training program from a file: a PDF is read on the phone, a text file as text. */
  if(ev.target.id==="ti_file"){
    var tf=ev.target.files&&ev.target.files[0];ev.target.value="";if(!tf)return;
    if(tf.type==="application/pdf"||/\.pdf$/i.test(tf.name||"")){
      V.tibusy=true;V.tierr="";render();
      import("../../engine/pdfplan.js").then(function(m){return m.readPdfLines(tf);})
        .then(function(src){V.tibusy=false;readTraining(src);})
        .catch(function(){V.tibusy=false;V.tierr="That PDF could not be read. Copy its text and paste it instead.";render();});
      return;}
    var tfr=new FileReader();
    tfr.onload=function(){V.titext=String(tfr.result||"");readTraining(V.titext);};
    tfr.readAsText(tf);return;}
  if(ev.target.id==="pi_file"){
    var pfile=ev.target.files&&ev.target.files[0];if(!pfile)return;
    /* A PDF is read on the phone (js/engine/pdfplan.js, loaded only when one is opened):
       its meals become the text in the box, and its targets and supplements ride along
       for the review below it. */
    if(pfile.type==="application/pdf"||/\.pdf$/i.test(pfile.name||"")){
      ev.target.value="";V.pibusy=true;V.pparse=null;render();
      import("../../engine/pdfplan.js").then(function(m){return m.readPdfPlan(pfile);}).then(function(r){
        V.pibusy=false;V.pitext=r.text;V.ptargets=r.targets;V.psupps=r.supps;V.papplyT=true;
        var box=document.getElementById("pi_text");
        if(!r.text&&!Object.keys(r.targets||{}).length){render();if(box)box.value="";
          toast(t("No meals were found in that PDF. If it is a training program, import it under Coach → Training → Programs."));return;}
        loadFoods(function(){V.pparse=withNotes(parsePlan(V.pitext));render();
          var b2=document.getElementById("pi_text");if(b2)b2.value=V.pitext;
          var res=document.querySelector(".pitg,.picard");if(res)res.scrollIntoView({behavior:"smooth",block:"start"});});
      }).catch(function(){V.pibusy=false;render();
        toast(t("That PDF could not be read. Copy its text and paste it instead."));});
      return;}
    V.ptargets=null;V.psupps=null;
    var pfr=new FileReader();
    pfr.onload=function(){V.pitext=String(pfr.result||"");
      loadFoods(function(){V.pparse=withNotes(parsePlan(V.pitext));render();});};
    pfr.readAsText(pfile);ev.target.value="";return;}
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
  /* A backup file picked on the Restore sheet fills the text box; Restore then checks
     it like pasted text. */
  if(ev.target.id==="rsfile"&&ev.target.files&&ev.target.files[0]){
    var fr=new FileReader();
    fr.onload=function(){var ta=document.getElementById("rs");if(ta)ta.value=String(fr.result||"");
      toast(t("Backup loaded. Tap Restore to continue."));};
    fr.readAsText(ev.target.files[0]);return;}
  /* The manual sheet's button says what it will do. Changed in place rather than by
     re-rendering, which would put the typed values back to what the sheet opened with. */
  if(ev.target.id==="mf_save"){
    var go=document.getElementById("mf_go");
    if(go)go.textContent=t(ev.target.checked?"Save and add to":"Add to")+" "
      +mealName((V.sd&&V.sd.meal)||mealNow());
    return;}
  var si=ev.target.dataset?ev.target.dataset.setidx:undefined;
  if(si!==undefined&&S.active)W.editLoggedSet(+si,ev.target.dataset.k,ev.target.value);}

export {onChange, onInput, onKeydown};
