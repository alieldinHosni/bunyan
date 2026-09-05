/* Bunyan — session
   The live session surface and rest screen. Execution, not editing. */
import {t} from "../../i18n/dict.js";
import {thumb} from "../../data/exercises.js";
import {exName} from "../../i18n/exnames.js";
import {prevPerf, prFor, progressionHint, recommend} from "../../engine/formulas.js";
import {S} from "../../state.js";
import {fmtW, inLb, toDisp, wUnit} from "../../units.js";
import {esc, num} from "../../util.js";
import {ex_isTimed, V} from "../view.js";

/* ============================================================ SESSION
   Execution surface, not an editor. vDay() prescribes the work; this screen only
   runs it. Every control answers one of: what am I doing, which set am I on, what
   did I do last time, am I resting, what is next. */
function e0name(a){var e=a.entries[V.logIdx];return e?e.name:"";}

/* Rows an entry shows: the prescription plus any the user added, never fewer than
   the sets already logged. */
function rowsFor(e){return Math.max((e.planned.sets||3)+(e.extra||0),e.sets.length);}

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

function vLogger(){
  var a=S.active;
  if(V.logIdx>=a.entries.length)V.logIdx=a.entries.length-1;
  if(V.logIdx<0)V.logIdx=0;
  var e=a.entries[V.logIdx];
  if(!e){V.logIdx=0;e=a.entries[0];}
  var timed=ex_isTimed(e),rows=rowsFor(e),rpeCol=S.prefs.rpe!=="off";
  var active=e.sets.length<rows?e.sets.length:-1;
  var p=prevPerf(e.name),pr=prFor(e.name);
  var run=groupRun(a.entries,V.logIdx);

  var planTotal=0,doneAll=0;
  a.entries.forEach(function(x){planTotal+=rowsFor(x);doneAll+=x.sets.length;});
  var pct=planTotal?Math.min(100,Math.round(doneAll/planTotal*100)):0;
  var el=a.started?Math.floor((Date.now()-a.started)/1000):0;

  /* --- sticky header: identity, elapsed, overall progress --- */
  var h='<div class="ss-top"><div class="ss-row">'
   +'<button class="ss-back" data-quit="1" aria-label="'+t("Back")+'">←</button>'
   +'<div class="ss-title"><div class="ss-name">'+esc(a.dayName)+'</div>'
   +'<div class="ss-meta"><span class="mseg">'+t("Exercise")
   +' <span class="num">'+(V.logIdx+1)+'</span> '+t("of")
   +' <span class="num">'+a.entries.length+'</span></span><span class="sep">\u00b7</span>'
   +'<span class="mseg"><span class="num">'+doneAll+'</span> '
   +t("sets logged")+'</span></div></div>'
   +'</div><div class="ss-bar"><i style="width:'+pct+'%"></i></div></div>';

  /* --- one segment per exercise; members of a superset are tied together --- */
  h+='<div class="ss-seg">';
  a.entries.forEach(function(x,i){
    var cls=i===V.logIdx?"on":(x.sets.length>=rowsFor(x)?"did":"");
    var srun=groupRun(a.entries,i);
    if(srun.length>1)cls+=" gp"+(i===srun[0]?" gp1":"")+(i===srun[srun.length-1]?" gpN":"");
    h+='<button class="'+cls+'" data-jump="'+i+'" aria-label="'+esc(exName(x.name))+'"><span></span></button>';});
  h+='</div>';

  /* --- what am I doing --- */
  h+='<div class="ex-head">'
   +'<button class="exth" data-exdetail="'+esc(e.name)+'" aria-label="'+t("How to do it")+'">'
   +thumb(e.name,56)+'</button>'
   +'<div style="flex:1;min-width:0"><h1 class="ex-name">'+esc(exName(e.name))+'</h1>'
   +'<div class="ex-tags">'
   +(run.length>1?'<span class="pill sup">'+t("Superset")+' '+groupLabel(a.entries,V.logIdx)
       +' · '+t("round")+' '+Math.min(rows,e.sets.length+1)+'/'+rows+'</span>':'')
   +'<span class="pill">'+esc(t(e.muscle))+'</span>'
   +'<span class="pill">'+e.planned.sets+' × '+e.planned.lo
   +(e.planned.hi!==e.planned.lo?"–"+e.planned.hi:"")+'</span>'
   +(pr.w?'<span class="pill gold">PR '+fmtW(pr.w)+'</span>':'')
   +'</div></div></div>';

  /* --- the set grid: prescription, previous performance and entry in one row --- */
  var cols=timed?(rpeCol?"26px 1fr 84px 46px 40px":"26px 1fr 96px 40px")
                :(rpeCol?"26px 1fr 60px 54px 44px 40px":"26px 1fr 70px 62px 40px");
  var hd=timed?[t("Set"),t("Last"),t("Secs")]
              :[t("Set"),t("Last"),wUnit().toUpperCase(),t("Reps")];
  if(rpeCol)hd.push("RPE");
  hd.push("");
  h+='<div class="setgrid"><div class="setrow hd" style="grid-template-columns:'+cols+'">'
   +hd.map(function(x){return '<span>'+x+'</span>';}).join("")+'</div>';

  for(var i=0;i<rows;i++){
    var done=i<e.sets.length,st=done?e.sets[i]:null,isAct=(i===active);
    var cls2="setrow "+(done?"did":isAct?"on":"pend");
    var pv="—";
    if(p&&p.sets[i])pv=timed?(p.sets[i].r+"s")
      :((p.sets[i].w?toDisp(p.sets[i].w)+wUnit()+" × ":"")+p.sets[i].r);
    /* The set number doubles as the warm-up toggle: tap it and the row stops counting
       toward volume, records and progression. No extra column for it. */
    var warm=done&&st.wu;
    if(warm)cls2+=" warm";
    h+='<div class="'+cls2+'" style="grid-template-columns:'+cols+'">'
     +(done?'<button class="setnum wtog" data-warm="'+i+'" aria-label="'+t("Mark as warm-up")
        +' '+(i+1)+'" aria-pressed="'+(warm?"true":"false")+'">'+(warm?"W":(i+1))+'</button>'
       :'<div class="setnum">'+(i+1)+'</div>')
     +'<div class="setprev">'+pv+'</div>';

    if(!timed){
      if(done)h+='<input class="cell" type="number" inputmode="decimal" step="0.5" '
        +'value="'+toDisp(st.w)+'" data-setidx="'+i+'" data-k="w" '
        +'aria-label="Weight in '+wUnit()+', set '+(i+1)+'">';
      else if(isAct)h+='<input class="cell" type="number" inputmode="decimal" step="0.5" '
        +'id="in_w" value="'+toDisp(V.draft.w)+'" aria-label="Weight in '+wUnit()+'">';
      else h+='<div class="cellmute">'+(num(V.draft.w)?toDisp(V.draft.w):"—")+'</div>';
    }
    if(done)h+='<input class="cell" type="number" inputmode="numeric" '
      +'value="'+num(st.r)+'" data-setidx="'+i+'" data-k="r" aria-label="Reps, set '+(i+1)+'">';
    else if(isAct)h+='<input class="cell" type="number" inputmode="numeric" '
      +'id="in_r" value="'+num(V.draft.r)+'" aria-label="Reps">';
    else h+='<div class="cellmute">'+(num(V.draft.r)||"—")+'</div>';

    if(rpeCol){
      if(!rpeWanted(i,rows))h+='<div class="cellmute">—</div>';
      else if(done)h+='<input class="cell rp" type="number" inputmode="numeric" min="1" max="10" '
        +'value="'+(st.rpe||"")+'" data-setidx="'+i+'" data-k="rpe" aria-label="RPE, set '+(i+1)+'">';
      else if(isAct)h+='<input class="cell rp" type="number" inputmode="numeric" min="1" max="10" '
        +'id="in_rpe" value="'+(V.draft.rpe||8)+'" aria-label="RPE">';
      else h+='<div class="cellmute">'+(V.draft.rpe||8)+'</div>';
    }

    if(done)h+='<button class="logbtn done'+(V.fresh===i?" fresh":"")+'" data-unlog="'+i+'" '
      +'aria-label="'+t("Undo set")+' '+(i+1)+'">✓</button>';
    else if(isAct)h+='<button class="logbtn go" data-logset="1" aria-label="'
      +t("Complete set")+' '+(i+1)+'">+</button>';
    else h+='<button class="logbtn off" disabled aria-hidden="true">+</button>';
    h+='</div>';
  }
  h+='</div>';

  /* --- the prescription, restated as a number to hit --- */
  var tv=timed?(e.planned.hi+"s")
    :((num(V.draft.w)?fmtW(V.draft.w)+" × ":"")
      +(e.planned.lo===e.planned.hi?e.planned.lo:e.planned.lo+"–"+e.planned.hi)+" "+t("reps"));
  if(rpeCol&&active>=0&&rpeWanted(active,rows))tv+=" @ RPE "+(V.draft.rpe||8);
  h+='<div class="target"><span class="tl">'+t("Bunyan target")+'</span>'
   +'<span class="tv">'+tv+'</span></div>';

  var rec=e.sets.length?null:recommend(e);
  if(rec&&rec.note)h+='<p class="tiny" style="margin:8px 2px 0">'+esc(rec.note)+'</p>';

  var hint=progressionHint(e);
  if(hint)h+='<div class="card mt" style="border-color:var(--gold);margin-bottom:0">'
    +'<h3 style="color:var(--gold);font-size:14px">'+t("Progression earned")+'</h3>'
    +'<p class="tiny" style="margin:5px 0 0">'+t("Top of the range on every set. Try")+' '
    +fmtW(hint.next)+' '+t("next session")+'.</p></div>';
  if(pr.w&&e.sets.some(function(x){return num(x.w)>=pr.w&&num(x.w)>0;}))
    h+='<div class="card mt" style="border-color:var(--gold);margin-bottom:0">'
     +'<h3 style="color:var(--gold);font-size:14px">'+t("New personal record")+'</h3></div>';

  /* --- one obvious primary action, always --- */
  if(active>=0){
    /* Inside a superset the button says where it is taking you, because it is not
       staying on this exercise. */
    var nxtG=run.length>1?groupNext(a.entries,V.logIdx):null;
    var wrapsG=nxtG!==null&&run.indexOf(nxtG)<=run.indexOf(V.logIdx);
    h+='<button class="btn" data-logset="1">'+t("Complete set")+' '+(active+1)
     +(nxtG!==null&&!wrapsG?' → '+groupLabel(a.entries,nxtG):'')+'</button>';
  }else{
    h+='<button class="btn ok" data-nextex="1">'
     +(V.logIdx>=a.entries.length-1?t("Finish workout"):t("Next exercise"))+'</button>';
  }
  h+='<button class="btn g" data-addrow="1">+ '+t("Add a set")+'</button>';

  h+='<div class="ss-foot">'
   +'<button data-exdetail="'+esc(e.name)+'">'+t("How to")+'</button>'
   +'<button data-swap="1">'+t("Replace")+'</button>'
   +(timed?'':'<button data-plates="1">'+t("Plates")+'</button>')
   +'<button data-note="1">'+t("Note")+(a.notes?' •':'')+'</button>'
   +'<button data-finish="1">'+t("Finish")+'</button></div>';
  h+='<button class="btn d" data-discard="1">'+t("Discard this session")+'</button>';

  if(V.restEnd>Date.now()||V.restPaused)h+=vRest(a,e,rows,timed);
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

/* Rest is a mode, not a card. Nothing else on screen competes with it. */
function vRest(a,e,rows,timed){
  var paused=V.restPaused;
  var left=paused?V.restLeft:Math.max(0,Math.ceil((V.restEnd-Date.now())/1000));
  var total=Math.max(1,V.restTotal||1);
  var C=653.45,off=C*(1-Math.max(0,Math.min(1,left/total)));
  var lastSet=e.sets[e.sets.length-1];
  var didTxt=lastSet
    ?(t("Set")+' '+e.sets.length+' '+t("of")+' '+rows+' '+t("complete")+' · '
      +(timed?lastSet.r+'s':(lastSet.w?toDisp(lastSet.w)+wUnit()+' × '+lastSet.r
                                     :lastSet.r+' '+t("reps"))))
    :esc(exName(e.name));
  var nx,nr="";
  /* After a superset round the next thing is a different exercise, so say which. */
  var restRun=groupRun(a.entries,V.logIdx);
  if(restRun.length>1&&e.sets.length<rows){
    nx=groupLabel(a.entries,V.logIdx)+' · '+e.name;
    nr=t("Set")+' '+(e.sets.length+1)+' '+t("of")+' '+rows;
  }else if(e.sets.length<rows){
    nx=t("Set")+' '+(e.sets.length+1)+': '
      +(timed?num(V.draft.r)+'s'
        :(num(V.draft.w)?fmtW(V.draft.w)+' × '+num(V.draft.r)+' '+t("reps")
                        :num(V.draft.r)+' '+t("reps")));
    if(S.prefs.rpe!=="off")nr=t("Target RPE")+' '+(V.draft.rpe||8);
  }else{
    var nxe=a.entries[V.logIdx+1];
    nx=nxe?esc(exName(nxe.name)):t("Finish workout");
    nr=nxe?(nxe.planned.sets+' × '+nxe.planned.lo
      +(nxe.planned.hi!==nxe.planned.lo?'–'+nxe.planned.hi:'')+' '+t("reps")):"";
  }
  return '<div class="restwrap" role="dialog" aria-label="'+t("Rest")+'">'
   +'<div class="restlabel">'+t("Rest period")+'</div>'
   +'<div class="restsub">'+didTxt+'</div>'
   +'<div class="ringwrap"><svg viewBox="0 0 236 236" aria-hidden="true">'
   +'<circle cx="118" cy="118" r="104" fill="none" stroke="var(--raised)" stroke-width="12"/>'
   +'<circle id="restRing" cx="118" cy="118" r="104" fill="none" stroke="var(--accent)" '
   +'stroke-width="12" stroke-linecap="round" stroke-dasharray="'+C+'" stroke-dashoffset="'+off+'"/>'
   +'</svg><div class="ct"><div class="restdig" id="restDig" aria-live="polite">'+mmss(left)+'</div>'
   +'<div class="resttot">'+t("of")+' '+mmss(total)+'</div></div></div>'
   +'<div class="restctl">'
   +'<button class="rbtn" data-rest="-30">−30s</button>'
   +'<button class="rbtn main" data-rest="'+(paused?"resume":"pause")+'">'
   +(paused?t("Resume"):t("Pause"))+'</button>'
   +'<button class="rbtn" data-rest="30">+30s</button></div>'
   +'<div class="upnext"><div class="ul">'+t("Up next")+'</div>'
   +'<div class="uv">'+nx+'</div>'+(nr?'<div class="ur">'+nr+'</div>':'')+'</div>'
   +'<button class="restskip" data-rest="skip">'+t("Skip rest and continue")+'</button></div>';}


export {groupLabel, groupNext, groupRun, mmss, platePlan, vLogger};
