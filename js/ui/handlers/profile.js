/* Bunyan — profile and data
   Profile: settings, profiles on this phone, sharing and friends, backup, restore and
   reset. */
import {BACKUP_SNOOZE} from "../../engine/formulas.js";
import {weekStart} from "../../engine/schedule.js";
import {friends, saveFriends} from "../../engine/share.js";
import {t} from "../../i18n/dict.js";
import {applyLang} from "../../i18n/exnames.js";
import {adoptRestored, CUR, curProfile, isOwner, migrate, normalize, S, saveDB, setS, switchProfile} from "../../state.js";
import {checkBackup} from "../../schema.js";
import {toDisp, toKg, wUnit} from "../../units.js";
import {fmtN, num, today} from "../../util.js";
import {ACT, askConfirm, askText, openSheet, val} from "../actions.js";
import {render} from "../render.js";
import {changeLook, themeOf} from "../theme.js";
import {alarmStart, keepAwake, toast, V} from "../view.js";
import {has, key} from "./registry.js";

/* The text of a backup, read and checked (js/schema.js checkBackup): {o, check}, or
   null when it is not JSON at all. A backup is ours if it carries at least one thing
   only Bunyan writes; old ones (with `splits`) still qualify, and migrate() carries
   them forward. One from a newer version of the app, or damaged, is refused. */
function parseBackup(txt){
  var o;try{o=JSON.parse(String(txt||"").trim());}catch(e){return null;}
  return {o:o,check:checkBackup(o)};
}
/* A backup as a file: the share sheet where it can take files (iPhone: Save to
   Files, AirDrop, Mail), a download elsewhere. Copying tens of kilobytes of text out
   of a textarea on a phone was the only way before. */
function downloadBackup(){
  var name="bunyan-backup-"+today()+".json";
  var blob=new Blob([JSON.stringify(S)],{type:"application/json"});
  var done=function(){S.lastBackup=Date.now();S.backupSnooze=0;saveDB();render();toast(t("Backup saved."));};
  try{
    var file=new File([blob],name,{type:"application/json"});
    if(navigator.canShare&&navigator.canShare({files:[file]})){
      navigator.share({files:[file],title:"Bunyan backup"}).then(done).catch(function(){});return;}
  }catch(e){}
  var a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;
  document.body.appendChild(a);a.click();
  setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},1000);
  done();
}

/* What this module answers. app.js calls register() once, at boot, in the order
   the branches are tried in (see registry.js). */
function register(){
  ACT.restore=function(_,o){
    setS(normalize(JSON.parse(JSON.stringify(o))));
    migrate();saveDB();V.tab="train";V.train="days";
    adoptRestored(function(){render();toast(t("Restored."));});
  };
  /* The two settings sheets save independently now that they are separate screens. */
  key("saveyou",function(){
    var py=S.profile;
    py.age=num(val("p_age"),py.age);
    py.height=num(val("p_height"),py.height);
    py.sex=val("p_sex")||py.sex;
    py.weight=toKg(num(val("p_weight"),toDisp(py.weight)));
    py.activity=num(val("p_act"),py.activity);
    py.goal=val("p_goal")||py.goal;
    saveDB();render();toast(t("Saved."));return;});
  /* Test Sound plays the actual rest alarm, not a stand-in. A test that plays a
     different sound from the real one tests nothing the user cares about. */
  key("testsound",function(){
    if(!S.prefs.sound){toast(t("Turn Sounds on first."));return;}
    alarmStart();
    setTimeout(function(){toast(t("If that was silent, the side switch on your phone is set to silent."));},500);
    return;});
  /* Saturday, Sunday or Monday: the three a week is commonly started on. */
  key("wkstart",function(){var wo=[6,7,1];S.prefs.wkstart=wo[(wo.indexOf(weekStart())+1)%wo.length];saveDB();render();return;});
  key("toggle",function(D){S.prefs[D.toggle]=!S.prefs[D.toggle];
    if(D.toggle==="anim")document.body.classList.toggle("noanim",S.prefs.anim===false);
    if(D.toggle==="awake")keepAwake(S.prefs.awake&&!!S.active);
    /* Turned off, the block is forgotten: turned on again, the next workout starts a
       fresh one rather than landing mid-block on old dates. */
    if(D.toggle==="noblocks"&&S.prefs.noblocks)delete S.block;
    saveDB();render();return;});
  key("warnmode",function(){var w4=[5,10,15];S.prefs.warn=w4[(w4.indexOf(S.prefs.warn)+1)%3];saveDB();render();return;});
  key("langmode",function(){S.prefs.lang=S.prefs.lang==="ar"?"en":"ar";saveDB();applyLang();render();
    toast(S.prefs.lang==="ar"?"\u0627\u062a\u063a\u064a\u0631\u062a \u0644\u0644\u0639\u0631\u0628\u064a\u0629":"Switched to English");return;});
  key("unitmode",function(){S.prefs.unit=S.prefs.unit==="kg"?"lb":"kg";saveDB();render();return;});
  key("viewmode",function(){S.prefs.view=S.prefs.view==="set"?"all":"set";saveDB();render();return;});
  key("rpemode",function(){
    var rm=["every","last","off"];
    S.prefs.rpe=rm[(rm.indexOf(S.prefs.rpe)+1)%3];saveDB();render();return;});
  key("theme",function(){changeLook(function(){S.theme=S.theme==="dark"?"light":"dark";saveDB();render();});return;});
  /* Settings → Theme and Mode. The whole screen cross-fades into the new look. */
  key("settheme",function(D){if(D.settheme===themeOf())return;
    changeLook(function(){S.prefs.palette=D.settheme;saveDB();render();});return;});
  key("lookmode",function(D){if(D.lookmode===S.theme)return;
    changeLook(function(){S.theme=D.lookmode;saveDB();render();});return;});
  key("progmode",function(){
    var order=["conservative","standard","aggressive"];
    S.profile.prog=order[(order.indexOf(S.profile.prog)+1)%3];saveDB();render();return;});
  key("switch",function(D){if(D.switch!==CUR){switchProfile(D.switch,render);render();}return;});
  key("addprofile",function(){
    askText({title:t("Add a profile"),
      body:t("A separate log, weight and plan. Nothing crosses over."),
      cta:t("Create"),act:"newprofile"});return;});
  key("renameprofile",function(){
    askText({title:t("Rename this profile"),value:curProfile().name,
      act:"renameprofile"});return;});
  key("delprofile",function(){
    if(isOwner()){toast(t("The admin profile cannot be deleted."));return;}
    askConfirm({title:t("Delete")+" "+curProfile().name+"?",icon:"trash",
      body:t("Every workout, meal and measurement on this profile goes with it. This cannot be undone."),
      cta:t("Delete the profile"),act:"delprofile"});return;});
  key("share",function(){openSheet("share");return;});
  /* The complete screen's second button. The OS share sheet where there is one, the
     clipboard where there is not — both free, neither a dependency. The existing
     "share" sheet is a progress snapshot for friends, which is a different thing from
     this one workout, so it is not what this opens. */
  has("sharews",function(){
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
    return;});
  key("copysn",function(){var t2=document.getElementById("sn");t2.select();
    try{document.execCommand("copy");toast(t("Copied. Send it on WhatsApp."));}
    catch(e){toast(t("Select the text and copy it."));}return;});
  key("coach",function(){openSheet("coach");return;});
  key("addfriend",function(){
    try{var sn=JSON.parse(val("fp"));
      if(!sn||!sn.sessions||!sn.name)throw 1;
      var F=friends();F[sn.name]=sn;saveFriends(F);render();toast(sn.name+" added.");}
    catch(e){toast(t("That code did not read properly. Ask them to copy all of it."));}
    return;});
  key("unfollow",function(D){
    var F2=friends();delete F2[D.unfollow];saveFriends(F2);render();return;});
  key("export",function(){openSheet("backup");return;});
  key("snoozebackup",function(){S.backupSnooze=Date.now()+BACKUP_SNOOZE;saveDB();render();return;});
  /* Only a copy that actually succeeded counts as a backup. */
  key("copybk",function(){var ta=document.getElementById("bk");ta.select();
    try{document.execCommand("copy");
      S.lastBackup=Date.now();S.backupSnooze=0;saveDB();
      toast(t("Copied. Your backup is up to date."));render();}
    catch(e){toast(t("Select the text and copy it."));}return;});
  key("import",function(){openSheet("restore");return;});
  /* Restore: read, check it is one of ours, say what is in it, and only then replace.
     It used to insist on a `splits` key that migrate() deletes on every start, so no
     backup this version wrote could ever be restored. */
  key("dorestore",function(){
    var parsed=parseBackup(val("rs")),ck=parsed&&parsed.check;
    if(!ck||!ck.ok){
      toast(t(ck&&ck.why==="newer"?"This backup is from a newer version of Bunyan. Update the app, then restore it."
        :ck&&ck.why==="damaged"?"This backup is damaged and can't be restored."
        :"That does not look like a Bunyan backup."));return;}
    askConfirm({title:t("Replace everything with this backup?"),icon:"leave",danger:true,
      body:ck.sessions+" "+t("workouts")+", "+ck.days+" "+t("food days")+". "
        +(ck.dropped?ck.dropped+" "+t(ck.dropped===1?"damaged workout is left out.":"damaged workouts are left out.")+" ":"")
        +t("Everything currently on this profile is replaced."),
      cta:t("Restore"),act:"restore",data:parsed.o,hard:true});return;});
  has("bkfile",function(){downloadBackup();return;});
  /* The one place a typed confirmation is warranted: nothing here is recoverable
     without a backup, and the button sits in a list of harmless ones. */
  key("wipe",function(){
    askText({title:t("Delete everything?"),
      body:t("Every workout, meal, measurement and setting on this profile. There is no undo. Export a backup first if you are not certain."),
      label:t("Type DELETE to confirm"),ph:"DELETE",cta:t("Delete everything"),act:"wipe"});return;});}

export {register};
