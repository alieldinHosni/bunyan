/* Bunyan — training plans
   Planning training: the week and its days on Train, lighter weeks, programs and
   templates, the builder and its days, the exercise library and its sheets, a coach's
   program brought in, supersets, favourites and equipment. */
import * as W from "../workout.js";
import {LIB, loadInstructions} from "../../data/exercises.js";
import {day} from "../../data/splits.js";
import {addDaysISO} from "../../engine/dayplan.js";
import {spreadWd, suggestWd, weekOrder} from "../../engine/schedule.js";
import {t} from "../../i18n/dict.js";
import {exName, planName} from "../../i18n/exnames.js";
import {addProgram, allSplits, dayOf, editSplit, makeProgram, S, saveDB, split} from "../../state.js";
import {toKg} from "../../units.js";
import {num, r1, today, uid} from "../../util.js";
import {addExercise, askConfirm, askText, closeSheet, openSheet, val} from "../actions.js";
import {grow} from "../more.js";
import {pushNav} from "../nav.js";
import {render} from "../render.js";
import {toast, V} from "../view.js";
import {groupRun} from "../views/session.js";
import {newNames, programFromDraft} from "../views/timport.js";
import {builderId, editedEx, pcAfter, readTraining, requestCloseSheet, setExField, tidyGroups, toCoach, topOfResults} from "./common.js";
import {has, key, NEXT, on} from "./registry.js";

/* Moving a program to weekdays: the empty "Rest" days that spaced out a rotation
   mean nothing once any unpinned weekday is a rest day, so they go, and each training
   day is pinned to the weekday it is usually trained on. */
function toWeekdays(sp){
  if(sp.days.some(function(d){return d.ex.length;}))sp.days=sp.days.filter(function(d){return d.ex.length;});
  if(!sp.days.some(function(d){return (d.wd||[]).length;})){
    var sg=suggestWd(sp);sp.days.forEach(function(d){d.wd=sg[d.id]||[];});}}
function removeDayEx(id){
  var d=dayOf(V.dayId);if(!d)return;
  var i=d.ex.findIndex(function(x){return x.id===id;});if(i<0)return;
  var before=d.ex.map(function(x){return Object.assign({},x);});
  var gone=d.ex.splice(i,1)[0];tidyGroups(d.ex);saveDB();render();
  toast(exName(gone.name)+" "+t("removed."),function(){
    var d2=dayOf(d.id);if(!d2)return;d2.ex=before;saveDB();render();});}
/* The open exercise editor's fields into its working copy (V.sd.e). */
function tieRead(){
  var e=V.sd&&V.sd.e;if(!e)return;
  var g=function(k){var el=document.getElementById("tie_"+k);return el?String(el.value).trim():null;};
  var n=function(k){var v=g(k);return v===null||v===""?null:num(v);};
  if(n("sets")!=null)e.sets=Math.max(1,Math.min(12,Math.round(n("sets"))));
  if(n("rest")!=null)e.rest=Math.max(0,Math.min(900,Math.round(n("rest"))));
  if(n("lo")!=null)e.lo=Math.max(0,Math.round(n("lo")));
  if(n("hi")!=null)e.hi=Math.max(e.lo||0,Math.round(n("hi")));
  if(n("min")!=null)e.min=Math.max(1,Math.round(n("min")));
  var w=g("w0");
  if(w!==null){if(w===""||!(num(w)>0))delete e.w0;else e.w0=r1(toKg(num(w)));}
  if(g("wk0")!==null){var a=n("wk0"),b=n("wk1");
    if(a>0)e.wk=[Math.round(a),b>=a?Math.round(b):99];else delete e.wk;}
  var nt=g("note");if(nt!==null)e.note=nt;
  e.check=false;}
/* The draft becomes a program, the active one, with Undo. Names the library does not
   know join it as the lifter's own exercises, as the plan wrote them. */
function useDraft(){
  var tp=V.tp;if(!tp||!tp.days.length)return;
  var added=newNames(tp);
  added.forEach(function(x){LIB.push([x.n,x.m,"Other",0]);(S.myEx=S.myEx||[]).push({id:"u_"+uid(),n:x.n,m:x.m});});
  var p=makeProgram(programFromDraft(tp,today())),before=S.activeProgram;
  addProgram(p,true);saveDB();
  V.tp=null;V.titext="";
  toCoach("train","program");
  toast(t("{name} is your program now.").replace("{name}",p.name),function(){
    S.programs=(S.programs||[]).filter(function(q){return q.id!==p.id;});
    if(before)S.activeProgram=before;saveDB();render();});
  pcAfter();}

/* What this module answers. app.js calls register() once, at boot, in the order
   the branches are tried in (see registry.js). */
function register(){
  key("tweek",function(D){V.tdate=D.tweek===today()?null:D.tweek;render();return;});
  /* A lighter week: started, put off for a week, or ended early. */
  key("deload",function(D){
    var dl=S.deload=S.deload||{};
    if(D.deload==="start"){dl.until=addDaysISO(today(),6);dl.last=today();delete dl.snooze;
      toast(t("Lighter week on. Your next workouts have fewer sets and lighter suggestions."));}
    else if(D.deload==="later"){dl.snooze=addDaysISO(today(),7);}
    else if(D.deload==="end"){dl.until=addDaysISO(today(),-1);}
    saveDB();render();return;});
  key("clearexq",function(){V.exq="";render();topOfResults();var qq=document.getElementById("exq");if(qq)qq.focus();return;});
  key("swapday",function(D){openSheet("swapday",{date:D.swapday});return;});
  on(function(D){return D.swapto!==undefined&&V.sheet==="swapday";},function(D){
    var swd=V.sd.date;S.daySwap=S.daySwap||{};
    /* Old swaps are dropped as they pass; only dates still ahead mean anything. */
    Object.keys(S.daySwap).forEach(function(k){if(k<today())delete S.daySwap[k];});
    if(D.swapto)S.daySwap[swd]=D.swapto;else delete S.daySwap[swd];
    saveDB();closeSheet();toast(t("Workout changed"));return;});
  /* From the My Training sheet, a day or the programs list replaces the sheet. */
  on(function(D){return (D.train||D.day)&&V.sheet;},function(){V.sheet=null;V.sd=null;return NEXT;});
  key("train",function(D){pushNav();V.tab="coach";V.train=D.train;render();window.scrollTo(0,0);return;});
  key("day",function(D){pushNav();V.dayId=D.day;V.train="day";render();return;});
  /* A template asks whether to start on it now (the default) or only add your copy
     to My programs; one of yours asks only whether to switch. */
  key("adopt",function(D){
    var own=editSplit(D.adopt),pre=own||allSplits().filter(function(x){return x.id===D.adopt;})[0];
    if(!pre)return;
    if(own)askConfirm({title:t("Switch to")+" "+pre.name+"?",
      body:t("It becomes the program you train on. Your other programs and every logged session are kept."),
      cta:t("Make it active"),act:"adopt",data:D.adopt});
    else askConfirm({title:t("Use")+" "+pre.name+"?",
      body:t("You get your own copy to change as you like. Every session you have already logged is kept."),
      cta:t("Use it now"),act:"adopt",data:D.adopt,alt:t("Just add it to My programs"),altact:"addprog"});
    return;});
  key("preview",function(D){pushNav();V.tab="coach";V.previewId=D.preview;V.train="preview";render();window.scrollTo(0,0);return;});
  key("editsplit",function(D){pushNav();V.tab="coach";V.previewId=D.editsplit;V.train="builder";render();window.scrollTo(0,0);return;});
  key("renamesplit",function(D){var rs=editSplit(D.renamesplit);if(!rs)return;
    askText({title:t("Rename program"),value:planName(rs.name),act:"renamesplit",data:D.renamesplit});return;});
  has("bday",function(){var bs=editSplit(builderId());if(!bs)return;
    var nd0=day(t("Day")+" "+(bs.days.length+1),[]);nd0.wd=[];
    /* By weekday, a new day takes the first weekday no other day has. */
    if(bs.schedule==="week"){var used={};bs.days.forEach(function(d){(d.wd||[]).forEach(function(w){used[w]=1;});});
      var fw=spreadWd(bs.days.length+1).concat(weekOrder()).filter(function(w){return !used[w];})[0];if(fw)nd0.wd=[fw];}
    bs.days.push(nd0);saveDB();render();return;});
  key("bdays",function(D){var bn=editSplit(builderId());if(!bn)return;var want=+D.bdays;
    while(bn.days.length<want){var nd1=day(t("Day")+" "+(bn.days.length+1),[]);nd1.wd=[];bn.days.push(nd1);}
    while(bn.days.length>want&&!bn.days[bn.days.length-1].ex.length)bn.days.pop();
    if(bn.schedule==="week"){var sp1=spreadWd(bn.days.length);bn.days.forEach(function(d,i){d.wd=sp1[i]?[sp1[i]]:[];});}
    saveDB();render();return;});
  /* Weekdays or rotation. Moving to weekdays pins each training day to the weekday it
     is usually trained on (or an even spread); moving back keeps the order. */
  key("sched",function(D){var sc=editSplit(builderId());if(!sc||sc.schedule===D.sched)return;
    sc.schedule=D.sched==="week"?"week":"cycle";
    if(sc.schedule==="week"){toWeekdays(sc);}
    saveDB();render();
    toast(t(sc.schedule==="week"?"Scheduled by weekday. Tap the weekdays under each day to change them.":"Scheduled in rotation: the next day comes up whenever you train."));return;});
  /* A weekday is one day's at a time: pinning it here takes it from any other day. */
  key("wd",function(D){var pw=D.wd.split("|"),ws=editSplit(builderId()),wday=ws&&ws.days.filter(function(d){return d.id===pw[0];})[0];
    if(!wday)return;var wn=+pw[1];
    if((wday.wd||[]).indexOf(wn)>=0)wday.wd=wday.wd.filter(function(x){return x!==wn;});
    else{ws.days.forEach(function(d){d.wd=(d.wd||[]).filter(function(x){return x!==wn;});});
      wday.wd=(wday.wd||[]).concat(wn).sort();}
    saveDB();render();return;});
  key("wdoffer",function(D){var wo=split();S.wdOffered=true;
    if(D.wdoffer==="yes"){wo.schedule="week";toWeekdays(wo);
      toast(t("Now by weekday. Change the days any time in the program."));}
    saveDB();render();return;});
  /* A day's ✕ in the builder: gone at once, with Undo, like an exercise's. */
  key("rmday",function(D){var rd=editSplit(builderId());if(!rd)return;
    var ri=rd.days.findIndex(function(x){return x.id===D.rmday;});if(ri<0)return;
    var rgone=rd.days.splice(ri,1)[0];saveDB();render();
    toast(rgone.name+" "+t("removed."),function(){var r2=editSplit(builderId())||rd;r2.days.splice(Math.min(ri,r2.days.length),0,rgone);saveDB();render();});
    return;});
  key("newsplit",function(){
    askText({title:t("New program"),ph:t("For example, Push / Pull / Legs"),
      cta:t("Create"),act:"newsplit"});return;});
  key("addday",function(){
    askText({title:t("Add a day"),ph:t("For example, Chest & Triceps"),
      cta:t("Add"),act:"addday"});return;});
  key("renameday",function(D){
    var d0=dayOf(D.renameday);if(!d0)return;
    askText({title:t("Rename day"),value:planName(d0.name),
      act:"renameday",data:D.renameday});return;});
  key("delday",function(D){
    var dD=dayOf(D.delday);
    askConfirm({title:t("Delete")+" "+(dD?dD.name:t("this day"))+"?",icon:"trash",
      body:t("The day is removed from your program. Sessions you already logged are kept."),
      cta:t("Delete the day"),act:"delday",data:D.delday});return;});
  /* Opening to add starts from the whole library. The two replace entries below set
     the filters to the exercise being replaced, and without this reset the next add
     inherited them — it always had, but it used to inherit "All", so it never showed. */
  key("addex",function(D){V.dayId=D.addex;V.exm="All";V.exe="All";V.exq="";openSheet("exercise",{});return;});
  key("editex",function(D){openSheet("editex",{id:D.editex});return;});
  /* The marker at the end of a long list, if it is ever tapped before it is seen. */
  key("more",function(D){grow(D.more,+D.step||40);render();return;});
  key("exm",function(D){V.exm=D.exm;render();topOfResults();return;});
  key("exe",function(D){V.exe=D.exe;render();topOfResults();return;});
  key("cleardiff",function(){V.exd=null;render();return;});
  key("exsteps",function(){V.exsteps=!V.exsteps;render();return;});
  key("exmiss",function(){V.exmiss=!V.exmiss;render();return;});
  key("showall",function(){V.showAll=!V.showAll;render();return;});
  key("bwsplit",function(){pushNav();V.tab="coach";V.train="bodyweight";render();return;});
  key("bwcat",function(D){pushNav();V.tab="coach";V.exm=D.bwcat==="All"?"All":D.bwcat;V.exe="Bodyweight";V.exq="";
    V.train="library";render();return;});
  key("bwdiff",function(D){pushNav();V.tab="coach";V.exd=D.bwdiff;V.exe="Bodyweight";V.exm="All";V.exq="";V.train="library";render();return;});
  key("exdetail",function(D){var nm5=D.exdetail;V.exsteps=false;V.exmiss=false;
    /* Opened from inside the sheet (a similar exercise): remember the trail, so back
       returns to the exercise this one was reached from instead of closing. */
    var trail=(V.sheet==="exdetail"&&V.sd&&V.sd.name&&V.sd.name!==nm5)
      ?((V.sd.prev||[]).concat(V.sd.name)).slice(-8):null;
    /* From the Workout complete sheet (a cool-down stretch), back returns to it. */
    var ret5=V.sheet==="done"?{s:"done",d:V.sd}:V.sheet==="exdetail"&&V.sd&&V.sd.ret||null;
    loadInstructions(function(){var o={name:nm5};if(trail)o.prev=trail;if(ret5)o.ret=ret5;openSheet("exdetail",o);});return;});
  has("exback",function(){
    var tr=(V.sd&&V.sd.prev||[]).slice(),rt=V.sd&&V.sd.ret;
    if(!tr.length){if(rt){openSheet(rt.s,rt.d);return;}requestCloseSheet();return;}
    var back5=tr.pop();V.exsteps=false;V.exmiss=false;
    var o5={name:back5};if(tr.length)o5.prev=tr;if(rt)o5.ret=rt;
    openSheet("exdetail",o5);return;});
  /* Reachable again, from the picker's empty state. It was orphaned when the picker
     was rewritten to read exercises.json: the handler survived, the button did not.
     Custom entries have no illustration, which thumb() already renders gracefully. */
  key("customex",function(){
    askText({title:t("Add your own exercise"),value:V.exq||"",
      body:t("It joins your library under the muscle you have filtered to. No illustration, everything else works."),
      cta:t("Add it"),act:"customex",data:{from:V.sd}});return;});
  key("pickex",function(D){addExercise(D.pickex);return;});
  key("replaceex",function(D){
    var dR=dayOf(V.dayId),eR2=dR?dR.ex.filter(function(x){return x.id===D.replaceex;})[0]:null;
    /* The frame opens a replacement with the current exercise's muscle already
       selected — "Chest Selected". Ranking alone put like-for-like first but left the
       whole library under it; this starts where the answer almost certainly is, and
       "All" is one tap away. Only a muscle the filter row actually has. */
    V.exm=W.pickMuscle(eR2&&eR2.name);V.exe="All";V.exq="";
    openSheet("exercise",{replace:D.replaceex,like:eR2?eR2.name:null});return;});
  key("exint",function(D){var ei=editedEx();if(!ei)return;ei.rpe=+D.exint;saveDB();render();return;});
  key("exstp",function(D){
    var es=editedEx();if(!es)return;
    var stepBy={sets:1,lo:1,hi:1,rest:15,min:5}[D.exstp]||1;
    setExField(es,D.exstp,num(es[D.exstp],0)+stepBy*(+D.d));
    saveDB();render();return;});
  key("exincr",function(D){
    var ec=editedEx();if(!ec)return;
    var lbU=S.prefs.unit==="lb";
    var steps=lbU?[0,1,2.5,5,10,20].map(function(x){return x/2.2046;}):[0,0.5,1,1.25,2,2.5,4,5,10];
    var cur=num(S.incr[ec.name],0),at=0;
    steps.forEach(function(x,i){if(Math.abs(x-cur)<Math.abs(steps[at]-cur))at=i;});
    at=Math.max(0,Math.min(steps.length-1,at+(+D.exincr)));
    if(steps[at])S.incr[ec.name]=Math.round(steps[at]*1000)/1000;else delete S.incr[ec.name];
    saveDB();render();return;});
  key("dbload",function(){S.prefs.dbLoad=S.prefs.dbLoad==="total"?"hand":"total";saveDB();render();return;});
  key("saveex",function(){
    var e2=editedEx();
    if(e2)["sets","rest","lo","hi","min","km"].forEach(function(k){
      var f=document.getElementById("e_"+k);if(f)setExField(e2,k,f.value);});
    saveDB();closeSheet();return;});
  key("delex",function(D){if(V.sheet)closeSheet();removeDayEx(D.delex);return;});
  /* The ✕ on the row: gone at once, with Undo rather than a question. */
  key("rmex",function(D){removeDayEx(D.rmex);return;});
  key("grip",function(){return;});
  key("timport",function(){pushNav();V.tab="coach";V.train="import";V.tp=null;V.tierr="";render();window.scrollTo(0,0);return;});
  key("tiread",function(){var tt=val("ti_text");V.titext=tt;
    if(!tt.trim()){toast(t("Paste your program first."));return;}
    readTraining(tt);return;});
  key("tirestart",function(){V.tp=null;V.tierr="";render();window.scrollTo(0,0);return;});
  key("tiex",function(D){var tx=D.tiex.split("|"),tdy=V.tp&&V.tp.days[+tx[0]],te=tdy&&tdy.ex[+tx[1]];if(!te)return;
    openSheet("tiex",{d:+tx[0],j:+tx[1],e:JSON.parse(JSON.stringify(te))});return;});
  key("titgl",function(D){tieRead();var tg2=V.sd&&V.sd.e;if(!tg2)return;
    tg2[D.titgl]=!tg2[D.titgl];
    /* Switching between reps and seconds carries a sensible figure across. */
    if(D.titgl==="timed"){if(tg2.timed&&tg2.lo<15){tg2.lo=30;tg2.hi=45;}else if(!tg2.timed&&tg2.lo>=20){tg2.lo=8;tg2.hi=12;}}
    if(D.titgl==="amrap"&&!tg2.amrap&&!tg2.lo){tg2.lo=8;tg2.hi=12;}
    render();return;});
  key("tiswap",function(){tieRead();var sw0=V.sd;if(!sw0||!sw0.e)return;
    V.exm=sw0.e.name?W.pickMuscle(sw0.e.name):"All";V.exe="All";V.exq=sw0.e.name?"":(sw0.e.raw||"");
    openSheet("exercise",{timp:{d:sw0.d,j:sw0.j,e:sw0.e}});return;});
  key("tiexsave",function(){tieRead();var sv0=V.sd,dS=sv0&&V.tp&&V.tp.days[sv0.d];
    if(dS&&dS.ex[sv0.j])dS.ex[sv0.j]=sv0.e;
    closeSheet();return;});
  key("tiexrm",function(){var sr0=V.sd,dR0=sr0&&V.tp&&V.tp.days[sr0.d];if(!dR0)return;
    var goneE=dR0.ex.splice(sr0.j,1)[0];closeSheet();
    toast(t("Removed from the day."),function(){dR0.ex.splice(Math.min(sr0.j,dR0.ex.length),0,goneE);render();});return;});
  on(function(D){return D.tiadd!==undefined&&V.tp;},function(D){V.exm="All";V.exe="All";V.exq="";openSheet("exercise",{timp:{d:+D.tiadd}});return;});
  on(function(D){return D.tirmday!==undefined&&V.tp;},function(D){var rdi=+D.tirmday,gd=V.tp.days.splice(rdi,1)[0];if(!gd)return;render();
    toast(gd.name+" "+t("removed."),function(){V.tp.days.splice(Math.min(rdi,V.tp.days.length),0,gd);render();});return;});
  on(function(D){return D.tirmact!==undefined&&V.tp;},function(D){var rai=+D.tirmact,ga=(V.tp.acts||[]).splice(rai,1)[0];if(!ga)return;render();
    toast(exName(ga.name)+" "+t("removed."),function(){V.tp.acts.splice(Math.min(rai,V.tp.acts.length),0,ga);render();});return;});
  key("tiuse",function(){useDraft();return;});
  key("fav",function(D){var i5=S.favs.indexOf(D.fav);
    if(i5>=0)S.favs.splice(i5,1);else S.favs.push(D.fav);saveDB();render();return;});
  key("gear",function(D){
    S.gear=S.gear||[];
    var i7=S.gear.indexOf(D.gear);
    if(i7>=0)S.gear.splice(i7,1);else S.gear.push(D.gear);
    saveDB();render();return;});
  key("exhist",function(D){openSheet("exhist",{name:D.exhist});return;});
  key("delsplit",function(D){
    if(D.delsplit===S.activeProgram){toast(t("This is the program you train on. Switch to another one first."));return;}
    var spD=editSplit(D.delsplit);
    askConfirm({title:t("Delete")+" "+(spD?spD.name:t("this program"))+"?",icon:"trash",
      body:t("The program is removed. Every session you logged with it is kept."),
      cta:t("Delete the program"),act:"delsplit",data:D.delsplit});return;});
  /* Pair with the exercise below. If that one is already in a group, join it, so
     tapping down the list chains A1 → A2 → A3. */
  key("group",function(D){
    var dg=dayOf(V.dayId);if(!dg)return;
    var gi=dg.ex.findIndex(function(x){return x.id===D.group;});
    if(gi<0||gi>=dg.ex.length-1)return;
    /* Absorb both sides into one id. Taking the current exercise's group first is what
       lets a pair grow into a triset, instead of minting a new id and orphaning the
       exercise above it. */
    var gid=dg.ex[gi].grp||dg.ex[gi+1].grp||("g"+uid());
    groupRun(dg.ex,gi).concat(groupRun(dg.ex,gi+1))
      .forEach(function(k){dg.ex[k].grp=gid;});
    saveDB();render();toast(t("Superset created."));return;});
  key("ungroup",function(D){
    var du=dayOf(V.dayId);if(!du)return;
    var ui=du.ex.findIndex(function(x){return x.id===D.ungroup;});
    if(ui<0)return;
    groupRun(du.ex,ui).forEach(function(k){du.ex[k].grp=null;});
    saveDB();render();toast(t("Superset broken."));return;});}

export {register};
