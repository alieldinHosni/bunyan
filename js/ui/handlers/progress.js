/* Bunyan — progress
   Progress: its views and ranges, history, records and charts, weigh-ins, steps,
   recovery and measurements, photos, and correcting a past workout. */
import {actKcal} from "../../data/activities.js";
import {lastWeight} from "../../engine/formulas.js";
import {t} from "../../i18n/dict.js";
import {dayRec, ensureSessionIds, removeSession, S, saveDB, saveSession, sessionById} from "../../state.js";
import {toKg} from "../../units.js";
import {readInBody} from "../../engine/inbody.js";
import {num, r1, today} from "../../util.js";
import {ACT, askConfirm, closeSheet, openSheet, val} from "../actions.js";
import {pushNav} from "../nav.js";
import {removePhoto} from "../photos.js";
import {render} from "../render.js";
import {toast, V} from "../view.js";
import {has, key} from "./registry.js";

/* The edit sheet's inputs into its working copy, before anything re-renders it. */
function readSE(){
  var w=V.sd&&V.sd.work;if(!w)return;
  var dEl=document.getElementById("se_date");
  if(dEl&&/^\d{4}-\d{2}-\d{2}$/.test(dEl.value))w.date=dEl.value;
  w.entries.forEach(function(e,ei){
    e.sets.forEach(function(st,si){
      var a=document.getElementById("se_w_"+ei+"_"+si),b=document.getElementById("se_r_"+ei+"_"+si);
      if(a)st.w=a.value===""?0:toKg(a.value);
      if(b&&b.value!=="")st.r=Math.max(0,Math.round(num(b.value)));
      var m=document.getElementById("se_m_"+ei+"_"+si),k=document.getElementById("se_k_"+ei+"_"+si);
      if(m&&m.value!==""){st.min=Math.max(1,Math.round(num(m.value)));
        st.kcal=actKcal(e.name,st.min,st.rpe||6,lastWeight())||st.kcal||0;}
      if(k)st.km=k.value===""?0:Math.max(0,r1(num(k.value)));});});
}
function askDelSession(id){
  if(!id)return;
  askConfirm({title:t("Delete this workout?"),icon:"trash",
    body:t("Its sets are removed from your history and records. This cannot be undone."),
    cta:t("Delete workout"),act:"delsess",data:id,hard:true});
}

/* What this module answers. app.js calls register() once, at boot, in the order
   the branches are tried in (see registry.js). */
/* The text copied off the sheet, read: what was found fills the fields, the rest stay
   as typed, and the sheet says how many it found. */
function ibRead(text){
  var got=readInBody(text),n=Object.keys(got).length;
  if(!n){toast(t("No InBody figures found in that text. Copy the numbers with their labels."));return;}
  var cur=Object.assign({},(V.sd&&V.sd.ib)||{});
  ["date","weight","pbf","smm","fatkg","vfl","ibmr","tbw","score"].forEach(function(k){var f=document.getElementById("ib_"+k);if(f&&f.value!=="")cur[k]=k==="date"?f.value:(k==="weight"||k==="smm"||k==="fatkg"?toKg(num(f.value)):num(f.value));});
  openSheet("inbody",{img:V.sd&&V.sd.img,ib:Object.assign(cur,got)});
  toast(t(n===1?"Read 1 figure. Check it against your sheet.":"Read {n} figures. Check them against your sheet.").replace("{n}",n));}
function register(){
  ACT.delphoto=function(_,id){
    removePhoto(id,function(ok){
      render();toast(ok?t("Photo deleted."):t("That photo could not be deleted."));});};
  ACT.delsess=function(_,id){if(removeSession(id))toast(t("Workout deleted"));render();};
  /* Progress: the Simple slide or the Detailed one. */
  /* Progress → History, level two; its month steps back from this one. */
  key("phist",function(){pushNav();V.phist=true;V.hmonth=0;render();window.scrollTo(0,0);return;});
  key("hmonth",function(D){V.hmonth=Math.min(0,(+V.hmonth||0)+ +D.hmonth);render();return;});
  key("range",function(D){V.range=+D.range;render();return;});
  /* ---- Progress. The view rendered these controls with nothing listening, so its
     tabs never switched and Strength, Body and Nutrition could not be reached. */
  key("ptab",function(D){V.ptab=D.ptab;render();
    var pt=document.querySelector('[data-ptab="'+D.ptab+'"]');if(pt)pt.focus();
    return;});
  key("seeall",function(){V.ptab="strength";render();window.scrollTo(0,0);return;});
  key("pall",function(){V.pall=!V.pall;render();return;});
  key("phalf",function(D){V.phalf=D.phalf;V.pall=false;render();return;});
  /* A lift in the list is charted above it, so bring the chart into view. */
  key("chartex",function(D){V.chartEx=D.chartex;render();
    var pk=document.querySelector(".pgpick");
    if(pk)pk.scrollIntoView({block:"start",behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});
    return;});
  key("photo",function(D){openSheet("photo",{id:D.photo});return;});
  key("delphoto",function(D){
    askConfirm({title:t("Delete this photo?"),icon:"trash",
      body:t("It is removed from this phone. This cannot be undone."),
      cta:t("Delete photo"),act:"delphoto",data:D.delphoto});return;});
  key("saveweight",function(){
    /* Back to kilograms before it touches storage. What is saved is what is on screen:
       the stepper's figure, or the one typed. Nothing typed is nothing saved, never a
       stand-in weight. */
    var w2=V.draft.bw!=null?toKg(V.draft.bw):(lastWeight()||num(S.profile.weight));
    if(!(w2>0)){toast(t("Type your weight first."));var bwf=document.getElementById("in_bw");if(bwf)bwf.focus();return;}
    if(w2<30||w2>300){toast(t("That does not look like a body weight. Check it and save again."));return;}
    var ex0=S.body.filter(function(b){return b.date===today();})[0];
    if(ex0)ex0.weight=w2;else S.body.push({date:today(),weight:w2});
    S.body.sort(function(a,b){return a.date<b.date?-1:1;});
    V.draft.bw=null;saveDB();closeSheet();toast(t("Weight saved."));return;});
  key("savesteps",function(){
    var sv=V.draft.st!=null?V.draft.st:(dayRec().steps||0);
    dayRec().steps=Math.max(0,Math.round(num(sv)));V.draft.st=null;saveDB();closeSheet();return;});
  key("saverec",function(){
    var r3=dayRec();r3.sleep=num(val("r_sleep"));r3.sore=num(val("r_sore"));
    r3.energy=num(val("r_energy"));r3.ankle=num(val("r_ankle"));r3.notes=val("r_notes");
    saveDB();closeSheet();return;});
  key("savemeasure",function(){
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
    saveDB();closeSheet();toast(t("Measurements saved."));return;});
  /* ---- an InBody result (js/engine/inbody.js) ---- */
  key("ibpaste",function(){var f=document.getElementById("ib_text");
    try{navigator.clipboard.readText().then(function(x){if(f)f.value=x;ibRead(x);},function(){toast(t("Paste it into the box, then Read the numbers."));});}
    catch(e){toast(t("Paste it into the box, then Read the numbers."));}
    return;});
  key("ibread",function(){ibRead(val("ib_text"));return;});
  key("ibsave",function(){
    var date=val("ib_date")||today(),rec={},bad=false;
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||date>today())date=today();
    [["weight",25,300,1],["pbf",2,70],["smm",5,80,1],["fatkg",1,150,1],["vfl",1,30],["ibmr",600,4000],["tbw",10,90],["score",20,120]].forEach(function(f){
      var raw=val("ib_"+f[0]);if(raw===""||raw==null)return;
      var v=num(raw);if(f[3])v=toKg(v);
      if(!(v>=f[1]&&v<=f[2])){bad=true;return;}
      rec[f[0]]=Math.round(v*10)/10;});
    if(bad){toast(t("One of the figures is outside what a test can read. Check it against your sheet."));return;}
    if(!rec.weight&&!rec.pbf&&!rec.smm){toast(t("Enter at least the weight or the body fat."));return;}
    /* The day's body entry: weight and body fat where the rest of the app reads them,
       the InBody figures beside them, marked as from InBody. */
    var e=S.body.filter(function(b){return b.date===date;})[0],before=e?JSON.parse(JSON.stringify(e)):null;
    var add={src:"inbody"};if(rec.weight)add.weight=rec.weight;if(rec.pbf)add.bf=rec.pbf;
    ["smm","fatkg","vfl","ibmr","tbw"].forEach(function(k){if(rec[k]!=null)add[k]=rec[k];});if(rec.score!=null)add.ibscore=rec.score;
    if(e)Object.assign(e,add);else{e=Object.assign({date:date},add);S.body.push(e);}
    S.body.sort(function(a,b){return a.date<b.date?-1:1;});
    saveDB();closeSheet();render();
    toast(t("InBody result saved. The coach reads it from now on."),function(){
      var i=S.body.indexOf(e);if(i<0)return;if(before)S.body[i]=before;else S.body.splice(i,1);saveDB();render();});
    return;});
  key("sessedit",function(D){
    ensureSessionIds();
    var se0=sessionById(D.sessedit);if(!se0)return;
    openSheet("sessedit",{id:se0.id,work:JSON.parse(JSON.stringify(se0))});return;});
  key("ssetdel",function(D){
    readSE();var sp2=D.ssetdel.split(":"),en2=V.sd.work.entries[+sp2[0]];
    if(en2)en2.sets.splice(+sp2[1],1);render();return;});
  has("sexdel",function(D){
    readSE();var en3=V.sd.work.entries[+D.sexdel];if(en3)en3.sets=[];render();return;});
  key("sesssave",function(){
    readSE();var wk2=V.sd.work;
    wk2.entries=wk2.entries.filter(function(e){return e.sets.length||e.pain;});
    if(!wk2.entries.some(function(e){return e.sets.length;})){askDelSession(V.sd.id);return;}
    var ix=S.sessions.findIndex(function(x){return x.id===V.sd.id;});
    if(ix<0){closeSheet();return;}
    S.sessions[ix]=wk2;
    /* Keep history newest-first by date, as loading it does. */
    S.sessions.sort(function(x,y){return x.date<y.date?1:x.date>y.date?-1:0;});
    saveSession(wk2);closeSheet();toast(t("Workout updated"));return;});
  key("sessdel",function(){askDelSession(V.sd&&V.sd.id);return;});
  key("openday",function(D){openSheet("dayview",{date:D.openday});return;});}

export {register};
