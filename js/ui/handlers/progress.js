/* Bunyan — progress
   Progress: its views and ranges, history, records and charts, weigh-ins, steps,
   recovery and measurements, photos, and correcting a past workout. */
import {actKcal} from "../../data/activities.js";
import {lastWeight} from "../../engine/formulas.js";
import {t} from "../../i18n/dict.js";
import {dayRec, ensureSessionIds, removeSession, S, saveDB, saveSession, sessionById} from "../../state.js";
import {toKg} from "../../units.js";
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
function register(){
  ACT.delphoto=function(_,id){
    removePhoto(id,function(ok){
      render();toast(ok?t("Photo deleted."):t("That photo could not be deleted."));});};
  ACT.delsess=function(_,id){if(removeSession(id))toast(t("Workout deleted"));render();};
  /* Progress: the Simple slide or the Detailed one. */
  key("pview",function(D){V.pview=D.pview==="detail"?"detail":"simple";render();window.scrollTo(0,0);return;});
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
    /* Back to kilograms before it touches storage. */
    var w2=V.draft.bw!=null?toKg(V.draft.bw):(lastWeight()||86);
    var ex0=S.body.filter(function(b){return b.date===today();})[0];
    if(ex0)ex0.weight=w2;else S.body.push({date:today(),weight:w2});
    S.body.sort(function(a,b){return a.date<b.date?-1:1;});
    V.draft.bw=null;saveDB();closeSheet();toast(t("Weight saved."));return;});
  key("savesteps",function(){
    dayRec().steps=V.draft.st||0;V.draft.st=null;saveDB();closeSheet();return;});
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
