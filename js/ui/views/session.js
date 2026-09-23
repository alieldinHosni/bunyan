/* Bunyan — session
   The live session surface and rest screen. Execution, not editing. */
import {t} from "../../i18n/dict.js";
import {difficultyOf, exImg, exMedia, muscleOfEntry} from "../../data/exercises.js";
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
function rowsFor(e){return Math.max(1,(e.planned.sets||3)+(e.extra||0),e.sets.length);}

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
  var clock=sessionClock(a);

  /* --- sticky header: identity, elapsed, overall progress --- */
  var h='<div class="ss-top"><div class="ss-row">'
   /* A close, not a back: the edge-swipe is held off while a session is live, so this
      is the way out and it should say so. Same data-back handler, so the leave
      confirmation and everything behind it are untouched. */
   +'<button class="ss-back" data-back="1" aria-label="'+t("Close workout")+'">✕</button>'
   +'<div class="ss-title"><div class="ss-name">'+esc(a.dayName)+'</div>'
   +'<div class="ss-meta"><span class="mseg">'+t("Exercise")
   +' <span class="num">'+(V.logIdx+1)+'</span> '+t("of")
   +' <span class="num">'+a.entries.length+'</span></span><span class="sep">\u00b7</span>'
   +'<span class="mseg"><span class="num">'+doneAll+'</span> '
   +t("sets logged")+'</span></div></div>'
   /* A stopped clock with nothing to explain it reads as a bug, so the paused state
      says so rather than just freezing. */
   +'<div class="ss-clock"><span class="ico ico-clock" aria-hidden="true"></span>'
   +'<span class="num" id="sessClock">'+mmss(clock.ms/1000)+'</span>'
   +'<span class="ss-paused" id="sessPaused"'+(clock.paused?'':' hidden')+'>'
   +t("Paused")+'</span></div>'
   +'<button class="ss-more" data-sessmore="1" aria-label="'+t("More")+'">⋯</button>'
   +'</div><div class="ss-bar"><i style="width:'+pct+'%"></i></div></div>';

  /* --- one segment per exercise; members of a superset are tied together --- */
  h+='<div class="ss-seg">';
  a.entries.forEach(function(x,i){
    var cls=i===V.logIdx?"on":(x.sets.length>=rowsFor(x)?"did":"");
    var srun=groupRun(a.entries,i);
    if(srun.length>1)cls+=" gp"+(i===srun[0]?" gp1":"")+(i===srun[srun.length-1]?" gpN":"");
    h+='<button class="'+cls+'" data-jump="'+i+'" aria-label="'+esc(exName(x.name))+'"><span></span></button>';});
  h+='</div>';

  /* --- what am I doing: canvas screen 3 (Figma node 2:1008) ---
     Title with an info control, the two form frames, the tag row, then the
     recommendation. The frame's START/END panels are placeholder rectangles standing in
     for artwork; the library ships a real photograph of each position, so those are used
     instead — closer to the design's intent than copying its stand-in would be. */
  var med=exMedia(e.name),img0=exImg(e.name,0),img1=exImg(e.name,1);
  h+='<div class="exhead">'
   +'<h1 class="ex-name">'+esc(exName(e.name))+'</h1>'
   +'<button class="infobtn" data-exdetail="'+esc(e.name)+'" aria-label="'+t("How to do it")+'">i</button>'
   +'</div>';
  if(img0&&img1)
    h+='<div class="formvis">'
     +'<figure><img src="'+img0+'" alt="" loading="lazy" decoding="async">'
     +'<figcaption>'+t("Start")+'</figcaption></figure>'
     +'<figure><img src="'+img1+'" alt="" loading="lazy" decoding="async">'
     +'<figcaption>'+t("End")+'</figcaption></figure></div>';
  h+='<div class="ex-tags">'
   +(run.length>1?'<span class="pill sup">'+t("Superset")+' '+groupLabel(a.entries,V.logIdx)
       +' · '+t("round")+' '+Math.min(rows,e.sets.length+1)+'/'+rows+'</span>':'')
   +'<span class="etag">'+esc(t(muscleOfEntry(e)))+'</span>'
   +(med&&med.e?'<span class="etag">'+esc(t(med.e))+'</span>':'')
   +'<span class="etag">'+e.planned.sets+' × '+e.planned.lo
   +(e.planned.hi!==e.planned.lo?"–"+e.planned.hi:"")+'</span>'
   +(difficultyOf(e.name)?'<span class="etag hot">'+esc(t(difficultyOf(e.name)))+'</span>':'')
   +(pr.w?'<span class="pill gold">PR '+fmtW(pr.w)+'</span>':'')
   +'</div>';

  /* The frame's recommendation banner, above the table where it puts it. The figure is
     the recommender's own, and it only appears before the first set of the exercise —
     once you are working, the rows carry the numbers. */
  var recTop=e.sets.length?null:recommend(e);
  if(recTop&&recTop.w)
    h+='<div class="recbar"><span class="ico ico-bulb" aria-hidden="true"></span>'
     +'<span>'+t("Recommended")+': <b>'+fmtW(recTop.w)+'</b> × '+e.planned.lo
     +(e.planned.hi!==e.planned.lo?"–"+e.planned.hi:"")+' '+t("reps")
     +(recTop.note?' · '+esc(recTop.note):'')+'</span></div>';

  /* --- the set grid: prescription, previous performance and entry in one row --- */
  /* Delete leads the row, log ends it. Grid columns follow the writing direction, so
     in Arabic the pair swaps sides without a second rule. */
  var cols=timed?(rpeCol?"24px 24px 1fr 78px 44px 38px":"24px 24px 1fr 90px 38px")
                :(rpeCol?"24px 24px 1fr 56px 50px 42px 38px":"24px 24px 1fr 66px 58px 38px");
  var hd=timed?["",t("Set"),t("Last"),t("Secs")]
              :["",t("Set"),t("Last"),wUnit().toUpperCase(),t("Reps")];
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
    h+='<div class="'+cls2+'" data-k="set:'+i+'" style="grid-template-columns:'+cols+'">'
     +'<button class="delset" data-delset="'+i+'" aria-label="'+t("Delete set")+' '+(i+1)+'">✕</button>'
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

    /* One control logs a set, and its colour is the state: red until it is done,
       green after, with a short pop on the change. */
    if(done)h+='<button class="logbtn done'+(V.fresh===i?" fresh":"")+'" data-unlog="'+i+'" '
      +'aria-label="'+t("Undo set")+' '+(i+1)+'">✓</button>';
    else if(isAct)h+='<button class="logbtn go" data-logset="1" aria-label="'
      +t("Complete set")+' '+(i+1)+'">✓</button>';
    else h+='<button class="logbtn off" disabled aria-hidden="true">✓</button>';
    h+='</div>';
  }
  h+='</div>';
  /* Adds a set beyond the prescription, and sits under whatever the last row is. */
  h+='<div class="addrow"><button class="addset" data-addrow="1" aria-label="'
   +t("Add a set")+'">+</button></div>';

  /* The recommendation now sits above the table, in the frame's banner. */
  var hint=progressionHint(e);
  if(hint)h+='<div class="card mt" style="border-color:var(--gold);margin-bottom:0">'
    +'<h3 style="color:var(--gold);font-size:14px">'+t("Progression earned")+'</h3>'
    +'<p class="tiny" style="margin:5px 0 0">'+t("Top of the range on every set. Try")+' '
    +fmtW(hint.next)+' '+t("next session")+'.</p></div>';
  if(pr.w&&e.sets.some(function(x){return num(x.w)>=pr.w&&num(x.w)>0;}))
    h+='<div class="card mt" style="border-color:var(--gold);margin-bottom:0">'
     +'<h3 style="color:var(--gold);font-size:14px">'+t("New personal record")+'</h3></div>';

  /* The row's own check logs the set now, so the button that duplicated it is gone.
     What remains is the one thing the row cannot say: where you go when the
     exercise is finished. */
  if(active<0){
    h+='<button class="btn ok" data-nextex="1">'
     +(V.logIdx>=a.entries.length-1?t("Finish workout"):t("Next exercise"))+'</button>';
  }else if(run.length>1){
    /* Inside a superset the next set is on a different exercise, which the row
       cannot show on its own. */
    var nxtG=groupNext(a.entries,V.logIdx);
    if(nxtG!==null&&run.indexOf(nxtG)>run.indexOf(V.logIdx))
      h+='<p class="tiny" style="margin:10px 2px 0;text-align:center">'
       +t("Next")+': '+esc(groupLabel(a.entries,nxtG))+' · '
       +esc(exName(a.entries[nxtG].name))+'</p>';
  }

  /* Canvas screen 4 keeps exactly two secondary actions under the table. The other
     five — how to, plates, note, finish, discard — are behind the header's overflow,
     which is also what Round 4 item 1 asks for: one primary action, everything
     infrequent collapsed. Nothing was removed, only moved. */
  h+='<div class="ss-links">'
   +'<button data-swap="1">'+t("Replace Exercise")+'</button>'
   +(V.logIdx<a.entries.length-1?'<button data-nextex="1">'+t("Skip Exercise")+'</button>':'')
   +'</div>';

  /* The rest screen is no longer part of this string; syncRest() owns it. */
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
  var C=REST_C,off=C*(1-Math.max(0,Math.min(1,left/total)));
  var lastSet=e.sets[e.sets.length-1];
  /* The frame's "Set 2: 30kg × 10 @ RPE 7". "of 4" is kept because the banner above
     now carries the confirmation, which is what that clause used to be doing here. */
  var didTxt=lastSet
    ?(t("Set")+' '+e.sets.length+' '+t("of")+' '+rows+': '
      +(timed?lastSet.r+'s':(lastSet.w?toDisp(lastSet.w)+wUnit()+' × '+lastSet.r
                                     :lastSet.r+' '+t("reps")))
      +(S.prefs.rpe!=="off"&&lastSet.rpe?' @ '+t("RPE")+' '+lastSet.rpe:''))
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
  /* Time's up. A separate screen rather than a label on the countdown, because sound is
     not guaranteed to arrive — the silent switch kills it outright and a backgrounded
     tab suspends it — so the screen has to be the alert on its own. Full-bleed accent,
     the ring gone, one control. Nothing here is subtle. */
  if(V.restDone){
    return '<div class="restwrap done" role="alertdialog" aria-label="'+t("Rest over")+'">'
     +'<div class="restlabel">'+t("Rest period")+'</div>'
     +'<div class="restdone-big" aria-live="assertive">'+t("Rest over")+'</div>'
     +'<div class="upnext"><div class="ul">'+t("Up next")+'</div>'
     +'<div class="uv">'+nx+'</div>'+(nr?'<div class="ur">'+nr+'</div>':'')+'</div>'
     +'<button class="rbtn main restdone-go" data-rest="skip">'+t("I am ready")+'</button></div>';
  }
  return '<div class="restwrap" role="dialog" aria-label="'+t("Rest")+'">'
   /* The receipt for the set just logged. The frame puts it at the top edge, where it
      confirms without competing with the clock. */
   /* The frame carries a tick glyph in the text as well as the icon beside it. One
      tick is the mark; two read as a typo. */
   +(lastSet?'<div class="restbanner"><i class="ico ico-check"></i>'
     +t("Set")+' '+e.sets.length+' '+t("complete")+'</div>':'')
   +'<div class="restlabel">'+t("Rest period")+'</div>'
   +'<div class="restsub">'+didTxt+'</div>'
   +'<div class="ringwrap"><svg viewBox="0 0 180 180" aria-hidden="true">'
   +'<circle cx="90" cy="90" r="79" fill="none" stroke="var(--raised)" stroke-width="12"/>'
   +'<circle id="restRing" cx="90" cy="90" r="79" fill="none" stroke="var(--accent)" '
   +'stroke-width="12" stroke-linecap="round" stroke-dasharray="'+C+'" stroke-dashoffset="'+off+'"/>'
   +'</svg><div class="ct"><div class="restdig" id="restDig" aria-live="polite">'+mmss(left)+'</div>'
   /* The frame labels this "SECONDS LEFT", which is wrong the moment the clock reads
      1:30. The total it replaces is the figure that is always true. */
   +'<div class="resttot" id="restTot">'+t("of")+' '+mmss(total)+'</div></div></div>'
   +'<div class="restctl">'
   +'<button class="rbtn" data-rest="-30">−30s</button>'
   +'<button class="rbtn main" id="restMain" data-rest="'+(paused?"resume":"pause")+'"'
   +' aria-label="'+(paused?t("Resume"):t("Pause"))+'">'
   +'<i class="ico ico-'+(paused?"play":"pause")+'" id="restMainIco"></i></button>'
   +'<button class="rbtn" data-rest="30">+30s</button></div>'
   +'<div class="upnext"><div class="ul">'+t("Up next")+'</div>'
   +'<div class="uv">'+nx+'</div>'+(nr?'<div class="ur">'+nr+'</div>':'')+'</div>'
   +'<div class="restfoot"><button class="restskip" data-rest="skip">'
   +t("Skip rest and continue")+'</button></div></div>';}

/* ---- keeping the rest screen still -------------------------------------------
   The rest screen lives in its own container outside #app, for the same reason the
   barcode scanner does: render() replaces innerHTML wholesale, and rebuilding this
   one restarts the ring's transition from zero, which is the stutter that made
   every −30s tap flash. Only four things ever change while resting, so only those
   four are touched. */
/* 2π × 79 — the frame's 170px ring inside its 180px box, stroke 12. */
var REST_C=496.37;
function paintRest(){
  var paused=V.restPaused;
  var left=paused?V.restLeft:Math.max(0,Math.ceil((V.restEnd-Date.now())/1000));
  var total=Math.max(1,V.restTotal||1);
  var d=document.getElementById("restDig");
  if(d)d.textContent=mmss(left);
  var tot=document.getElementById("restTot");
  if(tot)tot.textContent=t("of")+" "+mmss(total);
  var ring=document.getElementById("restRing");
  if(ring)ring.setAttribute("stroke-dashoffset",
    String(REST_C*(1-Math.max(0,Math.min(1,left/total)))));
  var main=document.getElementById("restMain");
  if(main){
    /* The control is an icon now, so the label moves to aria-label and the glyph is
       swapped by class. Writing textContent here would delete the icon. */
    main.setAttribute("aria-label",paused?t("Resume"):t("Pause"));
    main.setAttribute("data-rest",paused?"resume":"pause");
    var mi=document.getElementById("restMainIco");
    if(mi)mi.className="ico ico-"+(paused?"play":"pause");
  }
}
/* Rebuilds only when the screen is genuinely a different one — a new exercise, a
   new set, or a language change. A tick or a ±30s tap keeps the same DOM. */
function syncRest(){
  var host=document.getElementById("rest");
  if(!host)return;
  var a=S.active;
  /* Three states now, not two. restDone keeps the surface up after the clock reaches
     zero so the alert has somewhere to live — the sound may never arrive. */
  var on=!!a&&(V.restEnd>Date.now()||V.restPaused||V.restDone);
  if(!on){
    if(host.firstChild)host.textContent="";
    host.removeAttribute("data-k");
    return;
  }
  var e=a.entries[V.logIdx];
  if(!e){host.textContent="";host.removeAttribute("data-k");return;}
  /* The done state is a different screen, so it belongs in the key — otherwise the
     countdown's DOM is kept and only the digits get repainted. */
  var key=V.logIdx+"|"+e.sets.length+"|"+(V.restDone?"done":"run")+"|"+(S.prefs&&S.prefs.lang||"en");
  if(host.getAttribute("data-k")===key){paintRest();return;}
  host.setAttribute("data-k",key);
  host.innerHTML=vRest(a,e,rowsFor(e),ex_isTimed(e.name));
}

export {groupLabel, groupNext, groupRun, IDLE_PAUSE, mmss, noteSet, paintRest, platePlan, rowsFor, sessionClock, sessionWall, syncRest, vLogger};
