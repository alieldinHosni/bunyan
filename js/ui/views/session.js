/* Bunyan — session
   The live session surface and rest screen. Execution, not editing. */
import {t} from "../../i18n/dict.js";
import {exMedia, isBarbell, isUnilateral, thumb} from "../../data/exercises.js";
import {exName, planName} from "../../i18n/exnames.js";
import {barKg, bodyAt, bwShare, dbTotal, incrementFor, inDeload, lastWeight, prevPerf, recommend} from "../../engine/formulas.js";
import {incrementOf} from "../../engine/lifts.js";
import {actInfo, actKcal, actRate, INTENSITY, intensityOf, isActivity} from "../../data/activities.js";
import {S} from "../../state.js";
import {fmtW, inLb, toDisp, wUnit} from "../../units.js";
import {esc, fmtN, num} from "../../util.js";
import {ex_isTimed, stepperInput, V} from "../view.js";
import {vWarm, warmShown} from "./warmup.js";
import {glyph} from "../glyphs.js";

/* ============================================================ SESSION
   Execution surface, not an editor. vDay() prescribes the work; this screen only
   runs it. Every control answers one of: what am I doing, which set am I on, what
   did I do last time, am I resting, what is next. */
var LOADED=/Carry|Farmer|Yoke/i;
var READY=[[1,"Drained"],[2,"Low"],[3,"OK"],[4,"Good"],[5,"Great"]];
function painRecent(name){
  var n=0,seen=0;
  for(var i=0;i<S.sessions.length&&seen<3;i++){
    var e=S.sessions[i].entries.filter(function(x){return x.name===name;})[0];
    if(!e)continue;seen++;if(e.pain)n++;}
  return n>=2;}
function e0name(a){var e=a.entries[V.logIdx];return e?e.name:"";}

/* Rows an entry shows: the prescription plus any the user added, never fewer than
   the sets already logged. */
function rowsFor(e){
  /* An activity is one bout unless another is added. */
  if(isActivity(e.name))return Math.max(1+(e.extra||0),e.sets.length);
  return Math.max(1,(e.planned.sets||3)+(e.extra||0),e.sets.length);}

/* ---- supersets ------------------------------------------------------------
   A superset is a shared `grp` tag on exercises that sit next to each other. The
   run is recomputed from adjacency every time rather than stored, so reordering a
   day can never leave a group pointing at exercises that have moved apart — it
   just splits into smaller groups, or back into singles. */
function groupRun(list,i){
  var g=list[i]&&list[i].grp;
  if(!g)return [i];
  var s=i,e=i;
  while(s>0&&list[s-1].grp===g)s--;
  while(e<list.length-1&&list[e+1].grp===g)e++;
  var out=[];for(var k=s;k<=e;k++)out.push(k);
  return out.length>1?out:[i];}
function inSuperset(list,i){return groupRun(list,i).length>1;}
/* Where to go after logging a set inside a superset: across the round first, then
   back to the top for the next round. null once the whole group is done. */
function groupNext(list,i){
  var run=groupRun(list,i);
  if(run.length<2)return null;
  var pos=run.indexOf(i),k,j;
  for(k=pos+1;k<run.length;k++){
    j=run[k];
    if(list[j].sets.length<list[i].sets.length&&list[j].sets.length<rowsFor(list[j]))return j;}
  for(k=0;k<=pos;k++){
    j=run[k];
    if(list[j].sets.length<rowsFor(list[j]))return j;}
  return null;}
/* A1, A2, A3 … the label a lifter expects to see on the card. */
function groupLabel(list,i){
  var run=groupRun(list,i);
  if(run.length<2)return "";
  var letters="ABCDEFGH",n=0;
  for(var k=0;k<run[0];k++)
    if(groupRun(list,k)[0]===k&&groupRun(list,k).length>1)n++;
  return (letters[n]||"?")+(run.indexOf(i)+1);}
/* prefs.rpe: "every" asks on all sets, "last" only on the final one, "off" never. */
function rpeWanted(i,rows){
  if(S.prefs.rpe==="off")return false;
  if(S.prefs.rpe==="last")return i>=rows-1;
  return true;}
function mmss(s){s=Math.max(0,Math.round(s));
  return Math.floor(s/60)+":"+String(s%60).padStart(2,"0");}

/* ---- the session clock ----------------------------------------------------
   Seven minutes with no set logged is a break, not a rest. Arbitrary, and it will
   occasionally clip a genuinely long rest between heavy singles, so it is one
   constant and one line to change. */
var IDLE_PAUSE=7*60*1000;
/* Derived from timestamps, never counted by an interval. iOS suspends the page the
   moment it is backgrounded, so anything that ticks is wrong the instant the phone
   is put down; this returns the right number even after hours asleep.

   Inactivity means no set logged — not the app being backgrounded. Someone can sit
   with the session open between sets, and that time counts. */
function sessionClock(a){
  if(!a)return {ms:0,paused:false};
  var last=a.lastSet||a.started||Date.now();
  var base=a.activeMs||0;
  var since=Date.now()-last;
  if(since<IDLE_PAUSE)return {ms:base+since,paused:false};
  return {ms:base+IDLE_PAUSE,paused:true};
}
/* Wall clock, kept alongside active time. Summing only the active periods would
   throw away when the session actually happened, which cannot be recovered. */
function sessionWall(a){ return a&&a.started?Date.now()-a.started:0; }
/* Called when a set is logged: closes the period that just ended and starts a new
   one. Anything past the threshold was a break and does not accrue. */
function noteSet(a){
  if(!a)return;
  var now=Date.now(), last=a.lastSet||a.started||now;
  a.activeMs=(a.activeMs||0)+Math.min(now-last,IDLE_PAUSE);
  a.lastSet=now;
}

/* The weight step of an exercise at a load: the progression engine's own
   (lifts.js incrementOf, through formulas.js for the lifter's own step, the unit and
   how dumbbells are logged), so the steppers and the suggestions cannot disagree.
   Bodyweight lifts have no equipment step; their added load steps as other kit does. */
/* A barbell moves by the smallest pair of plates, one a side: 2.5 kg, or 5 lb. */
function weightStep(name,w){
  var s=incrementFor(name,w)||incrementOf("",w,{lb:inLb()});
  return isBarbell(name)?Math.max(s,inLb()?5/2.2046:2.5):s;}

/* ---- the rows of an exercise, in order --------------------------------------
   Logged sets first, then what is still to do: the warm-ups queued with + Warm-up
   (e.wuq), then the working sets. A warm-up has no number; working sets are counted
   1, 2, 3 on their own. */
function rowPlan(e){
  var rows=rowsFor(e),out=[],k=0,q=Math.max(0,num(e.wuq)),i;
  for(i=0;i<rows;i++){
    var done=i<e.sets.length,wu=done?!!e.sets[i].wu:(i-e.sets.length)<q;
    if(!wu)k++;
    out.push({i:i,done:done,wu:wu,n:wu?0:k,set:done?e.sets[i]:null});}
  return out;}
/* The working sets of an exercise, planned and done. */
function workCount(plan){return plan.filter(function(r){return !r.wu;}).length;}
/* What is next, one quiet line under the name, always in view: the next exercise, one
   tap to go there. Inside a superset it is the next one in the round. */
function nextLine(a,run){
  var nxI=run&&run.length>1?groupNext(a.entries,V.logIdx):null;
  if(nxI===null||nxI===V.logIdx)nxI=V.logIdx<a.entries.length-1?V.logIdx+1:null;
  if(nxI===null)return "";
  var nxE=a.entries[nxI],nxG=groupLabel(a.entries,nxI);
  return '<button class="wexl-nx" data-jump="'+nxI+'"><span class="wexl-nk">'+t("Next")+'</span>'
    +'<b>'+(nxG?esc(nxG)+' · ':'')+esc(exName(nxE.name))+'</b>'+IC.chev+'</button>';}
/* "6–10 reps", "40–60 s", "max": the reps half of the dose, for the set line. */
function repsText(e,timed){
  var p=e.planned||{};
  if(p.amrap)return t("Target")+" "+t("max");
  if(!p.lo&&!p.hi)return "";
  var r=p.lo+(p.hi&&p.hi!==p.lo?"–"+p.hi:"");
  return t("Target")+" "+r+" "+(timed?t("s"):t("reps"))+(p.side?" "+t("/ side"):"")
    +(p.rir!=null&&!timed?" · "+t("{n} in reserve").replace("{n}",p.rir):"");}
/* A set as the rows and the reference line say it: "60 kg × 8", "+10 kg × 6", "BW × 12",
   "45 s". */
function setText(name,x,timed){
  if(timed)return '<span class="num">'+num(x.r)+'</span> '+t("s");
  var bwl=bwShare(name)>0;
  if(num(x.w))return '<span class="num">'+(bwl?"+":"")+toDisp(x.w)+'</span> '+wUnit()+' × <span class="num">'+num(x.r)+'</span>';
  return (bwl?t("BW")+' × ':'')+'<span class="num">'+num(x.r)+'</span>'+(bwl?'':' '+t("reps"));}
function fill(s,n){return s.replace("{n}",'<span class="num">'+n+'</span>');}

/* The workout's icons, from the app's one line set (js/ui/glyphs.js). */
var IC={info:glyph("info"),swap:glyph("swap"),check:glyph("check"),chev:glyph("chev","flip"),skip:glyph("skip","flip"),
  plus:glyph("plus"),minus:glyph("minus"),down:glyph("caret","ss-caret"),pause:glyph("pause","i-pause"),play:glyph("play","i-play"),
  flame:glyph("flame"),close:glyph("close"),more:glyph("more")};
/* How long the "Set 2 logged" state holds the log control before it reads "Log set 3". */
var LOGGED_MS=2000;
function justLogged(){
  var j=V.justLogged;
  return j&&j.idx===V.logIdx&&Date.now()-j.at<LOGGED_MS?j:null;}

/* ---- the rest, in place --------------------------------------------------------
   A band above the next set, not a screen over it: the set's numbers and the check stay
   under the thumb, and the check logs from here. Time up, the band is the alert. */
function restOn(){return !!S.active&&(V.restEnd>Date.now()||V.restPaused||V.restDone);}
function restLeft(){return V.restPaused?V.restLeft:Math.max(0,Math.ceil((V.restEnd-Date.now())/1000));}
function restPct(){var total=Math.max(1,V.restTotal||1);return Math.max(0,Math.min(100,restLeft()/total*100));}
function vRestBand(){
  if(V.restDone)
    return '<section class="rb over" data-k="rest" role="alert"><div class="rb-l"><div class="rb-done">'+t("Rest complete")+'</div>'
     +(V.restOver?'<div class="rb-sub"><span class="num" id="restOver">'+overText()+'</span> '+t("over your rest")+'</div>':'')
     +'</div><div class="rb-ctl">'
     /* More rest, or put it away: the choice is the lifter's, not the timer's. */
     +'<button class="num rb-more" data-rest="extend" dir="ltr" aria-label="'+t("30 seconds more rest")+'">+30</button>'
     +'<button class="rb-close" data-rest="skip" aria-label="'+t("Close")+'">'+IC.close+'</button></div></section>';
  var paused=V.restPaused;
  return '<section class="rb wglass'+(paused?' paused':'')+'" data-k="rest" id="restBand" aria-label="'+t("Rest")+'"><div class="rb-top">'
   +'<div class="rb-l"><div class="rb-k">'+t("Rest")+'</div><div class="rb-t num" id="restDig">'+mmss(restLeft())+'</div></div>'
   +'<div class="rb-ctl">'
   +'<button class="num" data-rest="-30" aria-label="'+t("30 seconds less")+'">−30</button>'
   +'<button id="restMain" data-rest="'+(paused?"resume":"pause")+'" aria-label="'+t(paused?"Resume":"Pause")+'">'+IC.pause+IC.play+'</button>'
   +'<button class="num" data-rest="30" aria-label="'+t("30 seconds more")+'">+30</button></div></div>'
   +'<div class="rb-bar" aria-hidden="true"><i id="restBar" style="width:'+restPct()+'%"></i></div></section>';}

/* ---- the set being done -----------------------------------------------------------
   Its two numbers are the largest thing on the screen; the steppers move them by the
   progression engine's own step, so the buttons and the suggestions cannot disagree.
   Tapping a number types into it, for a big jump. */
/* A number box as wide as its figure, so its unit sits beside it (fields.js keeps it so
   while typing). */
function chW(v){return 'width:'+(Math.max(1,String(v).length)+0.4)+'ch';}
function vSetCard(e,row,rows,o){
  var timed=o.timed,loaded=o.loaded,bwl=bwShare(e.name)>0,small=o.small,p=o.p;
  var h='<section class="wsc wglass'+(small?' small':'')+(row.wu?' wkwu':'')+'" data-k="sc">';
  /* What the set is, and whether the numbers are still the app's suggestion: a
     suggestion is never shown as something done. */
  var top=row.wu?'<div class="sc-wu"><span class="wub" aria-hidden="true">W</span><p>'+t("Warm-up")
    +' <span>· '+t("Not counted in volume or records")+'</span></p></div>':'';
  if(V.draftSg)top+='<span class="sg-tag" id="sgTag">'+t("Suggested")+'</span>';
  if(top)h+='<div class="sc-top">'+top+'</div>';
  /* What the weight box holds: added load on a bodyweight lift, how a dumbbell's
     weight reads (per hand unless the lifter chose totals), and a barbell's total with
     the bar in it, what the plates sheet works from. */
  var med=exMedia(e.name);
  var wKey=t(bwl?"Added weight":"Weight")
    +(med&&med.e==="Dumbbell"?' · '+t(dbTotal()&&!isUnilateral(e.name)?"both together":"per hand"):'')
    +(med&&med.e==="Barbell"?' · '+t("with bar"):'');
  var wStepD=stepOf(e),rLbl=timed||loaded?t("Duration"):t("Reps"),rStep=timed||loaded?5:1,rUnit=timed||loaded?t("s"):"";
  h+='<div class="sc-g'+(timed?' one':'')+'">';
  if(!timed)
    h+='<div class="val"><label class="val-k" for="in_w">'+wKey+'<span class="val-ku"> · '+wUnit()+'</span></label>'
     +'<div class="val-nw"><input class="val-n num'+(V.draftSg?' sg':'')+(String(toDisp(V.draft.w)).length>3?' long':'')+'" id="in_w" type="number" inputmode="decimal" step="any" min="0" enterkeyhint="done" '
     +'value="'+toDisp(V.draft.w)+'" style="'+chW(toDisp(V.draft.w))+'" aria-label="'+(bwl?t("Added weight"):t("Weight"))+', '+wUnit()+(V.draftSg?', '+t("suggested"):'')+'">'
     +'<span class="val-u" aria-hidden="true">'+wUnit()+'</span></div>'
     +'<div class="wstp">'
     +'<button data-sstep="w" data-d="-1" aria-label="'+t("Less")+' '+wStepD+' '+wUnit()+'">'+IC.minus+'<span class="num">'+wStepD+'</span></button>'
     +'<button data-sstep="w" data-d="1" aria-label="'+t("More")+' '+wStepD+' '+wUnit()+'">'+IC.plus+'<span class="num">'+wStepD+'</span></button></div></div>';
  h+='<div class="val"><label class="val-k" for="in_r">'+rLbl+(rUnit?'<span class="val-ku"> · '+rUnit+'</span>':'')+'</label>'
   +'<div class="val-nw"><input class="val-n num'+(V.draftSg?' sg':'')+'" id="in_r" type="number" inputmode="numeric" step="1" min="0" enterkeyhint="done" '
   +'value="'+num(V.draft.r)+'" style="'+chW(num(V.draft.r))+'" aria-label="'+rLbl+(V.draftSg?', '+t("suggested"):'')+'">'
   +(rUnit?'<span class="val-u" aria-hidden="true">'+rUnit+'</span>':'')+'</div>'
   +'<div class="wstp">'
   +'<button data-sstep="r" data-d="-1" aria-label="'+t("Less")+' '+rStep+' '+(rUnit||rLbl)+'">'+IC.minus+(rStep>1?'<span class="num">'+rStep+'</span>':'')+'</button>'
   +'<button data-sstep="r" data-d="1" aria-label="'+t("More")+' '+rStep+' '+(rUnit||rLbl)+'">'+IC.plus+(rStep>1?'<span class="num">'+rStep+'</span>':'')+'</button></div></div>';
  h+='</div>';
  /* The plates, without opening anything (owner, 27 Oct): a barbell's total read as the
     bar and what goes on each side. A tap opens the plates sheet to change the bar. */
  if(!timed&&!row.wu&&isBarbell(e.name)&&barKg()>0){var pl=plateLine(V.draft.w);
    h+='<button class="sc-pl" id="scPl" data-plates="1" aria-label="'+esc(t("Plates"))+'"'+(pl?'':' hidden')+'>'+pl+'</button>';}
  /* How hard a set was is asked once it is done, about that set (vRpeAsk), not here
     before it (owner, 27 Oct: asked ahead, the answer went to the wrong set). */
  /* One reference line, for this set only. Before the first working set it is the
     recommendation and its reason; after it, what this set was last time. */
  var hint="";
  if(!row.wu){
    var started=e.sets.some(function(x){return !x.wu;}),ps=p&&p.sets[row.n-1];
    var rec=started?null:recommend(e),range=(e.planned.lo||"")+(e.planned.hi&&e.planned.hi!==e.planned.lo?"–"+e.planned.hi:"");
    if(!started&&!p&&!timed)
      hint='<span>'+(num(e.planned.w0)
        ?esc(t("First time on this one. Your plan starts it at"))+' <b>'+fmtW(e.planned.w0)+'</b>.'
        :esc(t(S.profile&&S.profile.level==="new"
          ?"First time on this one. Pick a weight you could lift three or four more times than the reps asked, and learn the movement before adding load."
          :"First time on this one. Use the first set to find a working weight, then settle in.")))+'</span>';
    else if(rec&&rec.amrap)
      hint='<span>'+(rec.w?t("Recommended")+' <b>'+fmtW(rec.w)+'</b> · ':'')
       +esc(t("As many clean reps as you can. Beat last time."))+(rec.last?' ('+esc(rec.last)+')':'')+'</span>';
    else if(rec&&(rec.w||rec.bw))
      hint='<span>'+t("Recommended")+' <b>'+(rec.bw?t("BW"):fmtW(rec.w))+' × <span class="num">'+range+'</span></b></span>'
       +(rec.note?'<span>'+esc(t(rec.note))+'</span>':'');
    else if(ps)hint='<span>'+t("Last time")+' <b>'+setText(e.name,ps,timed)+'</b></span>';
    /* The coach's cue for it, from an imported plan or a note of your own. */
    if(e.planned.note&&!started)hint+='<span class="sc-cue">'+esc(e.planned.note)+'</span>';
  }
  if(hint)h+='<div class="sc-h">'+hint+'</div>';
  return h+'</section>';}
/* The plates line's words for a total, kg: "" when there is nothing to load. The
   field's typing updates it in place (handlers/fields.js), the rest of the card as it is. */
function plateLine(w){
  if(!(num(w)>0)||!(barKg()>0))return "";
  var pp=platePlan(w,barKg());
  if(pp.under)return esc(t("Lighter than the bar"));
  if(!pp.plates.length)return esc(t("Just the bar"));
  return esc(t("Bar"))+' + '+pp.plates.map(function(x){return '<span class="num">'+(x.n>1?x.n+'×':'')+x.w+'</span>';}).join(' + ')
    +' '+esc(t("a side"))+(pp.left>0?' <span class="sc-pl-x">· '+esc(t("not exact"))+'</span>':'');}
/* The weight step the buttons show, in the unit on screen. */
function stepOf(e){
  var s=weightStep(e.name,V.draft.w);
  return r2(toDisp(s));}
function r2(x){return Math.round(x*100)/100;}

/* How hard the set just logged was: asked about that set, by its number, once it is
   done, when the setting asks for it (every set, or the last); a tap writes it to the
   set and the question goes. Not asked again once answered or once another set is in. */
function vRpeAsk(e,workN){
  if(S.prefs.rpe==="off")return "";
  var i=e.sets.length-1,x=e.sets[i];if(!x||x.wu||x.rpe)return "";
  var k=e.sets.filter(function(s){return !s.wu;}).length;
  if(!rpeWanted(k-1,workN))return "";
  return '<section class="sc-rpe rpeask wglass" data-k="rpeask" role="group" aria-label="'+esc(t("How hard was set {n}?").replace("{n}",k))+' (RPE)">'
   +'<span class="val-k">'+esc(t("How hard was set {n}?").replace("{n}",k))+' · RPE</span><div class="sc-rpe-c">'
   +[6,7,8,9,10].map(function(v){return '<button class="num" data-rpeset="'+i+':'+v+'">'+v+'</button>';}).join("")
   +'</div></section>';}
/* ---- the one primary action -------------------------------------------------------
   The check. It logs from the rest too; for a moment after, it says the set is logged
   and offers Undo, then reads the next set. */
function vLogControl(e,row){
  var j=justLogged();
  if(j)return '<div class="log ok" data-k="logok" role="status"><span class="log-c" aria-hidden="true">'+IC.check+'</span>'
    +'<b>'+(j.wu?t("Warm-up logged"):fill(t("Set {n} logged"),j.n))+'</b>'
    +'<button class="undo" data-undolog="1">'+t("Undo")+'</button></div>';
  if(!row){
    var last=V.logIdx>=S.active.entries.length-1;
    return '<button class="log" data-k="log" data-nextex="1"><span>'+t(last?"Finish workout":"Next exercise")+'</span>'
     +'<span class="log-c" aria-hidden="true">'+IC.chev+'</span></button>';}
  return '<button class="log" data-k="log" data-logset="1" aria-label="'+(row.wu?t("Log warm-up"):t("Complete set")+' '+row.n)+'">'
   +'<span>'+(row.wu?t("Log warm-up"):fill(t("Log set {n}"),row.n))+'</span>'
   +'<span class="log-c" aria-hidden="true">'+IC.check+'</span></button>';}

/* ---- sets so far ----------------------------------------------------------------
   Delete leads the row (settled), the tick ends it and takes the set back. Delete asks
   inside the row itself, not in a sheet. */
/* A logged set's numbers stay editable in place: fields.js saves a change through
   editLoggedSet, as before. */
function cellIn(i,k,v,label){
  return '<input class="wcell num" type="number" inputmode="'+(k==="w"?'decimal':'numeric')+'" step="any" min="0" enterkeyhint="done" '
   +'value="'+v+'" data-setidx="'+i+'" data-k="'+k+'" style="'+chW(v)+'" aria-label="'+esc(label)+'">';}
function doneVals(e,r,timed,lbl){
  var x=r.set,bwl=bwShare(e.name)>0;
  if(timed)return cellIn(r.i,"r",num(x.r),lbl+', '+t("Duration"))+' '+t("s");
  return (bwl?'+':'')+cellIn(r.i,"w",toDisp(x.w),lbl+', '+(bwl?t("Added weight"):t("Weight"))+' '+wUnit())+' '+wUnit()
    +' × '+cellIn(r.i,"r",num(x.r),lbl+', '+t("Reps"));}
function vHistory(e,plan,cur,timed){
  var h='<div class="wsl wglass" data-k="sl" role="list" aria-label="'+t("Sets")+'">';
  plan.forEach(function(r){
    var lbl=r.wu?t("Warm-up"):t("Set")+' '+r.n;
    if(r.done&&V.askDel&&V.askDel.x===V.logIdx&&V.askDel.i===r.i){
      h+='<div class="wsr ask" role="listitem" data-k="set:'+r.i+'"><span>'+(r.wu?t("Delete warm-up?"):fill(t("Delete set {n}?"),r.n))+' '+setText(e.name,r.set,timed)+'</span>'
       +'<button class="del" data-delok="'+r.i+'">'+t("Delete")+'</button>'
       +'<button class="keep" data-delno="1">'+t("Cancel")+'</button></div>';
      return;}
    var now=r.i===cur;
    var cls="wsr"+(r.done?" did":now?" on":" pend")+(r.wu?" wkwu":"")+(r.done&&V.fresh===r.i?" fresh":"");
    h+='<div class="'+cls+'" role="listitem" data-k="set:'+r.i+'">'
     /* Delete leads every row, the one being done too (owner, 27 Oct): it leaves the
        plan for today and the next one, or Next exercise, takes its place. */
     +'<button class="x" data-delset="'+r.i+'" aria-label="'+t("Delete")+' '+esc(lbl)+'">'+IC.close+'</button>'
     +'<span class="wsr-t"><span class="wsr-n">'+(r.wu?'<span class="wub" aria-hidden="true">W</span>'+t("Warm-up"):t("Set")+' <span class="num">'+r.n+'</span>')+'</span>'
     +'<span class="wsr-v">'+(now?t("now"):r.done?doneVals(e,r,timed,lbl)
       /* A row still to do shows what it is planned at, quieter than what was done. */
       :setText(e.name,V.draft,timed))+'</span></span>'
     /* Done: a filled tick that takes the set back. Now: the accent ring. To do: an empty ring. */
     +(r.done?'<button class="wtick" data-unlog="'+r.i+'" aria-label="'+t("Undo set")+' '+esc(lbl)+'">'+IC.check+'</button>'
       :'<span class="wtick '+(now?'cur':'off')+'" aria-hidden="true"></span>')
     +'</div>';});
  /* One more set, under the sets it adds to. */
  return h+'<button class="wsl-add" data-k="addrow" data-addrow="1">'+IC.plus+'<span>'+t("Add a set")+'</span></button></div>';}

function vLogger(){
  var a=S.active;
  if(V.logIdx>=a.entries.length)V.logIdx=a.entries.length-1;
  if(V.logIdx<0)V.logIdx=0;
  var e=a.entries[V.logIdx];
  if(!e){V.logIdx=0;e=a.entries[0];}
  /* A carry is timed but loaded: it keeps the weight and counts seconds. */
  var loaded=ex_isTimed(e)&&LOADED.test(e.name);
  var timed=ex_isTimed(e)&&!loaded,rows=rowsFor(e);
  var active=e.sets.length<rows?e.sets.length:-1;
  var p=prevPerf(e.name);
  var run=groupRun(a.entries,V.logIdx);

  var planTotal=0,doneAll=0;
  a.entries.forEach(function(x){planTotal+=rowsFor(x);doneAll+=x.sets.length;});
  var pct=planTotal?Math.min(100,Math.round(doneAll/planTotal*100)):0;
  var clock=sessionClock(a);

  /* --- the header: the only glass on this screen. The bar says how much is done, so
     the count of sets logged and the hidden-rest bar are gone. --- */
  var h='<div class="sess"><div class="ss-top"><div class="ss-row">'
   /* A close, not a back: the edge-swipe is held off while a session is live, so this
      is the way out and it should say so. */
   +'<button class="ss-back" data-back="1" aria-label="'+t("Close workout")+'">'+IC.close+'</button>'
   /* The title opens today's exercises as a list: the overview, and a way to go
      straight to any of them. */
   +'<button class="ss-title" data-exlist="1" aria-haspopup="dialog" aria-label="'+t("Today's exercises")+'">'
   +'<span class="ss-name">'+esc(planName(a.dayName))+'</span>'
   +'<span class="ss-meta"><span class="ss-mw">'+t("Exercise")+' </span><span class="num">'+(V.logIdx+1)+'</span> '+t("of")
   +' <span class="num">'+a.entries.length+'</span>'+IC.down+'</span></button>'
   /* A stopped clock with nothing to explain it reads as a bug, so the paused state
      says so rather than just freezing. */
   +'<div class="ss-clock"><span class="num" id="sessClock">'+mmss(clock.ms/1000)+'</span>'
   +'<span class="ss-paused" id="sessPaused"'+(clock.paused?'':' hidden')+'>'+t("Paused")+'</span></div>'
   /* The coach, one tap away mid-workout (owner, 27 Oct): a machine taken, a set that
      felt off, how to do this one. The floating button stays off the workout. */
   +'<button class="ss-coach" data-coachopen="1" aria-label="'+t("Ask Coach")+'">'
   +'<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 5.5h16v10.5H11l-4.5 3.5V16H4z"/><path d="M8.5 10.75h7"/></svg></button>'
   +'<button class="ss-more" data-sessmore="1" aria-label="'+t("More")+'">'+IC.more+'</button>'
   +'</div><div class="ss-bar"><i style="width:'+pct+'%"></i></div></div>';

  /* The warm-up routine comes first, in place of the first exercise, until it is done
     or skipped (js/ui/views/warmup.js). */
  if(warmShown(a))return h+vWarm(a)+'</div>';

  /* Everything about this exercise, as one pane the swipe moves (js/ui/exswipe.js). */
  h+='<div class="ex-pane wb" data-exswipe="1">';
  var act=isActivity(e.name);
  var plan=act?null:rowPlan(e),row=!act&&active>=0?plan[active]:null;
  var workN=plan?workCount(plan):0;

  /* --- what this is: the name, how to do it, swap it; the set line and the two adds. --- */
  var line;
  if(act)line=esc(t(actInfo(e.name).grp));
  else if(row&&row.wu)line=t("Warm-up");
  else line=t("Set")+' <span class="num">'+Math.min(workN,row?row.n:workN)+'</span> '+t("of")+' <span class="num">'+workN+'</span>'
    +(repsText(e,timed)?' · '+esc(repsText(e,timed)):'');
  if(!act&&isUnilateral(e.name)&&!e.planned.side)line+=' · '+t("Each side");
  /* Inside a training block: how many sets the answers after earlier workouts moved it by. */
  var pd=!act&&e.planned&&e.planned.plan!=null?num(e.planned.sets)-num(e.planned.plan):0;
  if(pd)line+=' · '+t(pd>0?"{n} more than the plan":"{n} fewer than the plan").replace("{n}",Math.abs(pd));
  if(run.length>1)line+=' · '+t("Superset")+' '+groupLabel(a.entries,V.logIdx);
  if(inDeload())line+=' · <span class="ex-light">'+t("Lighter week")+'</span>';
  h+='<div class="wexl"><h1 class="ex-name">'+esc(exName(e.name))+'</h1>'
   +(act?'<span></span>':'<button class="ib" data-exdetail="'+esc(e.name)+'" aria-label="'+t("How to do it")+'">'+IC.info+'</button>')
   +'<button class="ib" data-swap="1" aria-label="'+t("Replace this exercise")+'">'+IC.swap+'</button>'
   +'<p class="wexl-s"><span>'+line+'</span>'
   +'</p>'
   +nextLine(a,run)
   +'</div>';

  if(act){h+=actBody(a,e,rows,active);}
  else{
    if(restOn())h+=vRestBand();
    h+=vRpeAsk(e,workN);
    if(row)h+=vSetCard(e,row,rows,{timed:timed,loaded:loaded,p:p,small:restOn()});
    h+=vLogControl(e,row);
  }

  /* --- before the first set only, under the check so it no longer pushes the numbers
     down: how you feel, the day's notes, a pain flag, the plan's other choice. --- */
  if(doneAll===0&&a.ready==null){
    h+='<section class="ready"><div class="ready-h"><span>'+t("How do you feel today?")+'</span>'
     +'<button class="ready-skip" data-ready="0">'+t("Skip")+'</button></div><div class="ready-c">'
     +READY.map(function(x){return '<button data-ready="'+x[0]+'">'+t(x[1])+'</button>';}).join("")
     +'</div></section>';
  }else if(a.ready&&a.ready<=2&&doneAll===0){
    /* Today's suggestions are already lighter (see recommend()); fewer sets is offered. */
    h+='<div class="readynote">'+t("A low day. Today's suggestions are lighter; drop a set if you need to, or stop early. It still counts.")
     +(a.lighter?'':'<button class="btn g sm readyless" data-readyless="1">'+t("One set fewer on each exercise")+'</button>')+'</div>';
  }
  if(doneAll===0&&a.dayNotes&&a.dayNotes.length)
    h+='<details class="daynotes"><summary>'+t("Notes for today")+'</summary>'
     +a.dayNotes.map(function(l){return '<p>'+esc(l)+'</p>';}).join("")+'</details>';
  /* Pain flagged on this exercise in two of its last three sessions: say so before
     the first set, once, and point at a substitute. */
  if(!e.sets.length&&painRecent(e.name))
    h+='<div class="painnote">'+t("You flagged pain on this exercise recently. Consider a substitute, and if it keeps coming back, get it looked at.")
     +' <button class="linkbtn" data-swap="1">'+t("Replace it")+'</button></div>';
  /* The plan's other choice for this slot ("Pull-Ups or Seated Row"), one tap away
     until a set is logged. */
  if(e.alt&&!e.sets.length)
    h+='<button class="linkbtn exalt" data-swapalt="1">'+esc(t(e.altWhy==="gear"?"Don't have the kit?":"Or"))+' '+esc(exName(e.alt))+'</button>';

  if(!act){
    h+=vHistory(e,plan,active,timed);
    /* Said once, under the sets, so +KG is never a guess. */
    if(bwShare(e.name)>0&&!timed){
      var bwNow=bodyAt(null);
      h+='<p class="bwnote">'+(bwNow
        ?t("+KG is weight added to you, like a belt or vest; leave it at 0 for bodyweight. Your {w} is counted in volume and records.").replace("{w}",fmtW(bwNow))
        :t("+KG is weight added to you, like a belt or vest; leave it at 0 for bodyweight. Log your weight and it is counted in volume and records."))+'</p>';}
  }

  /* --- what can happen to today's workout. Skip and Add are tiles; Remove and
     Something hurts? are quiet links under them, lower in the hierarchy. Today only:
     the program keeps its plan. --- */
  h+='<div class="tools">'
   +(V.logIdx<a.entries.length-1?'<button data-nextex="1">'+IC.skip+'<span>'+t("Skip exercise")+'</span></button>':'')
   +'<button data-addlive="1">'+IC.plus+'<span>'+t("Add exercise")+'</span></button></div>';
  return h+'</div></div>';}

/* ---- cardio, sports, classes ----------------------------------------------------
   Logged as what they are: how long, how far where that means anything, how hard.
   Calories come from the activity's MET and the latest weigh-in. */
var TICK='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
/* "8 × 30s / 90s" */
function ivText(iv){return iv&&iv.n?iv.n+' \u00d7 '+iv.on+'s'+(iv.off?' / '+iv.off+'s':''):"";}
function actBody(a,e,rows,active){
  var info=actInfo(e.name),kg=lastWeight()||0,last=V.logIdx>=a.entries.length-1;
  var h='<div class="act-tags"><span class="etag">'+(info.dist?t("Time and distance"):t("Time and effort"))+'</span></div>';
  h+='<section class="setcard actcard">';
  if(active>=0){
    var mins=num(V.draft.min)||30,rpe=V.draft.rpe||6,cur=intensityOf(rpe)[0];
    h+='<div class="setcard-h"><h2>'+t("Log activity")+'</h2>'
     +(e.sets.length?'<span class="setcard-c">'+t("Bout")+' '+(e.sets.length+1)+'</span>':'')+'</div>'
     +'<div class="act-lbl">'+t("Duration")+'</div>'
     +stepperInput("min",mins,5,t("min"))
     +(info.dist?'<div class="act-lbl">'+t("Distance")+' <i>'+t("optional")+'</i></div>'
       +'<div class="act-km"><input id="in_km" type="number" inputmode="decimal" step="0.1" min="0" value="'
       +(num(V.draft.km)?V.draft.km:"")+'" placeholder="0.0" aria-label="'+t("Distance")+' km"><span>km</span></div>':'')
     /* Intervals are optional and folded away: rounds × work / rest, in seconds. */
     +(V.actIv||num(V.draft.ivn)
       ?'<div class="act-lbl">'+t("Intervals")+' <i>'+t("optional")+'</i></div>'
         +'<div class="act-iv"><input id="in_ivn" type="number" inputmode="numeric" min="1" max="99" value="'+(num(V.draft.ivn)||"")+'" placeholder="8" aria-label="'+t("Rounds")+'">'
         +'<span>\u00d7</span><input id="in_ivon" type="number" inputmode="numeric" min="1" max="3600" value="'+(num(V.draft.ivon)||"")+'" placeholder="30" aria-label="'+t("Work, seconds")+'">'
         +'<span>/</span><input id="in_ivoff" type="number" inputmode="numeric" min="0" max="3600" value="'+(num(V.draft.ivoff)||"")+'" placeholder="90" aria-label="'+t("Rest, seconds")+'"><i>'+t("sec")+'</i></div>'
       :'<button class="linkbtn act-ivon" data-activ="1">+ '+t("Intervals")+'</button>')
     +'<div class="act-lbl">'+t("Avg heart rate")+' <i>'+t("optional")+'</i></div>'
     +'<div class="act-km"><input id="in_hr" type="number" inputmode="numeric" min="30" max="240" value="'
     +(num(V.draft.hr)?V.draft.hr:"")+'" placeholder="—" aria-label="'+t("Avg heart rate")+'"><span>bpm</span></div>'
     +'<div class="act-lbl">'+t("Intensity")+'</div><div class="act-int" role="group" aria-label="'+t("Intensity")+'">'
     +INTENSITY.map(function(x){
        return '<button class="'+(cur===x[0]?'on':'')+'" data-actint="'+x[0]+'" aria-pressed="'+(cur===x[0])+'">'+t(x[1])+'</button>';}).join("")
     +'</div>'
     +(kg?'<div class="act-kcal"><span>'+t("Estimated burn")+'</span><b id="actKcal">'+fmtN(actKcal(e.name,mins,rpe,kg))+' kcal</b></div>'
        :'<p class="act-note">'+t("Log a weigh-in and Bunyan estimates the calories burned.")+'</p>')
     +'<button class="btn act-log" data-logact="1">'+TICK+t("Log activity")+'</button>';
  }
  if(e.sets.length){
    h+='<div class="act-done">';
    e.sets.forEach(function(st,i){
      h+='<div class="act-row'+(V.fresh===i?' fresh':'')+'" data-k="act:'+i+'"><span class="act-ok" aria-hidden="true">'+TICK+'</span>'
       +'<span class="act-t"><b>'+num(st.min)+' '+t("min")+(num(st.km)?' · '+st.km+' km':'')
         +(actRate(e.name,num(st.min),num(st.km))?' · '+actRate(e.name,num(st.min),num(st.km)):'')+'</b>'
       +'<span>'+t(intensityOf(st.rpe||6)[1])+(st.iv?' · '+ivText(st.iv):'')+(num(st.hr)?' · '+num(st.hr)+' bpm':'')+(st.kcal?' · '+fmtN(st.kcal)+' kcal':'')+'</span></span>'
       +'<button class="delset" data-delset="'+i+'" aria-label="'+t("Delete")+' '+(i+1)+'">✕</button></div>';});
    h+='</div>';
    if(active<0)h+='<div class="addrow"><button class="addset2" data-addrow="1"><span aria-hidden="true">+</span>'+t("Add another bout")+'</button></div>';
  }
  h+='</section>';
  if(active<0)h+='<button class="btn ss-next" data-nextex="1">'+(last?t("Finish workout"):t("Next exercise"))+'</button>';
  return h;}

/* What to hang on each side of the bar. Greedy from the heaviest plate down, which is
   how anyone actually loads one. Returns null when the target cannot be made from the
   plates on hand, because a wrong answer here is worse than no answer. */
var PLATES_KG=[25,20,15,10,5,2.5,1.25],
    PLATES_LB=[45,35,25,10,5,2.5];
function platePlan(totalKg,barKg){
  var total=toDisp(totalKg),bar=toDisp(barKg);
  if(total<bar)return {under:true};
  var perSide=(total-bar)/2;
  var sizes=inLb()?PLATES_LB:PLATES_KG, out=[], left=perSide;
  sizes.forEach(function(s){
    var n=Math.floor((left+1e-9)/s);
    if(n>0){out.push({w:s,n:n});left=Math.round((left-n*s)*1000)/1000;}});
  return {perSide:perSide,plates:out,left:Math.round(left*100)/100,bar:bar};}

/* ---- the rest band, kept still ---------------------------------------------------
   A tick changes the digits, the bar and the pause control, and nothing else, so only
   those are touched; the band itself is part of the workout and is patched with it. */
function paintRest(){
  var paused=V.restPaused;
  var d=document.getElementById("restDig");
  if(d){var s=mmss(restLeft());if(d.textContent!==s)d.textContent=s;}
  var bar=document.getElementById("restBar");
  if(bar)bar.style.width=restPct()+"%";
  var band=document.getElementById("restBand");
  if(band)band.classList.toggle("paused",!!paused);
  var main=document.getElementById("restMain");
  if(main){
    main.setAttribute("aria-label",paused?t("Resume"):t("Pause"));
    main.setAttribute("data-rest",paused?"resume":"pause");}
}
/* Time since the rest ran out, as "+m:ss". Empty when it is not known. */
function overText(){
  if(!V.restOver)return "";
  return "+"+mmss(Math.max(0,Math.floor((Date.now()-V.restOver)/1000)));}
/* The count-up on the time-up band, repainted each second by tickSession. */
function paintOver(){
  var el=document.getElementById("restOver");
  if(!el)return;
  var s=overText();
  if(el.textContent!==s)el.textContent=s;}
/* The rest used to own a full-screen container outside #app. It is a band on the
   workout now (workout-spec.md, RestBand), so the container stays empty. */
function syncRest(){
  var host=document.getElementById("rest");
  if(host&&host.firstChild)host.textContent="";}

export {ivText, groupLabel, groupNext, groupRun, IDLE_PAUSE, LOGGED_MS, mmss, noteSet, overText, paintOver, paintRest, plateLine, platePlan, rowPlan, rowsFor, sessionClock, sessionWall, syncRest, vLogger, weightStep};
