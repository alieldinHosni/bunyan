/* Bunyan — session
   The live session surface and rest screen. Execution, not editing. */
import {t} from "../../i18n/dict.js";
import {difficultyOf, exImg, exMedia, isUnilateral, muscleOfEntry} from "../../data/exercises.js";
import {exName} from "../../i18n/exnames.js";
import {dbTotal, inDeload, lastWeight, prevPerf, prFor, progressionHint, recommend} from "../../engine/formulas.js";
import {actIcon, actInfo, actKcal, actPace, INTENSITY, intensityOf, isActivity} from "../../data/activities.js";
import {S} from "../../state.js";
import {fmtW, inLb, toDisp, wUnit} from "../../units.js";
import {esc, fmtN, num} from "../../util.js";
import {ex_isTimed, stepperInput, V} from "../view.js";

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

function vLogger(){
  var a=S.active;
  if(V.logIdx>=a.entries.length)V.logIdx=a.entries.length-1;
  if(V.logIdx<0)V.logIdx=0;
  var e=a.entries[V.logIdx];
  if(!e){V.logIdx=0;e=a.entries[0];}
  /* A carry is timed but loaded: it keeps the weight column and counts seconds. */
  var loaded=ex_isTimed(e)&&LOADED.test(e.name);
  var timed=ex_isTimed(e)&&!loaded,rows=rowsFor(e),rpeCol=S.prefs.rpe!=="off";
  var active=e.sets.length<rows?e.sets.length:-1;
  var p=prevPerf(e.name),pr=prFor(e.name);
  var run=groupRun(a.entries,V.logIdx);

  var planTotal=0,doneAll=0;
  a.entries.forEach(function(x){planTotal+=rowsFor(x);doneAll+=x.sets.length;});
  var pct=planTotal?Math.min(100,Math.round(doneAll/planTotal*100)):0;
  var clock=sessionClock(a);

  /* --- sticky header: identity, elapsed, overall progress --- */
  var h='<div class="sess"><div class="sess-glow" aria-hidden="true"></div><div class="ss-top"><div class="ss-row">'
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
   +'</div><div class="ss-bar"><i style="width:'+pct+'%"></i></div>'
   /* The hidden rest, still counting. Tap to bring the full screen back. */
   +(V.restMin&&(V.restEnd>Date.now()||V.restPaused)
     ?'<button class="restbar" data-rest="show"><span>'+t(V.restPaused?"Rest paused":"Resting")+'</span>'
      +'<b id="restBarDig">'+mmss(V.restPaused?V.restLeft:Math.max(0,Math.ceil((V.restEnd-Date.now())/1000)))+'</b>'
      +'<i>'+t("Show")+'</i></button>':'')
   +'</div>';

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
  /* How the lifter feels today, asked once before the first set. It changes nothing
     on its own; a low answer only says, plainly, that doing less still counts. */
  if(doneAll===0&&a.ready==null){
    h+='<section class="ready"><div class="ready-h">'+t("How do you feel today?")+'</div><div class="ready-c">'
     +READY.map(function(x){return '<button data-ready="'+x[0]+'">'+t(x[1])+'</button>';}).join("")
     +'</div><button class="ready-skip" data-ready="0">'+t("Skip")+'</button></section>';
  }else if(a.ready&&a.ready<=2&&doneAll===0){
    h+='<div class="readynote">'+t("A low day. Keep the weights you know, drop a set if you need to, or stop early. It still counts.")+'</div>';
  }
  /* Pain flagged on this exercise in two of its last three sessions: say so before
     the first set, once, and point at a substitute. */
  if(!e.sets.length&&painRecent(e.name))
    h+='<div class="painnote">'+t("You flagged pain on this exercise recently. Consider a substitute, and if it keeps coming back, get it looked at.")
     +' <button class="linkbtn" data-swap="1">'+t("Replace it")+'</button></div>';
  if(isActivity(e.name))h+=actBody(a,e,rows,active);
  else{
  var med=exMedia(e.name),img0=exImg(e.name,0),img1=exImg(e.name,1);
  /* The exercise as one card over the Bunyan horse, as the other tabs set their
     heroes: what it is, how it looks, what it asks for. */
  h+='<section class="exhero"><img class="exhero-art" src="mark.png" alt="" aria-hidden="true" width="440" height="440" decoding="async">'
   +'<div class="exhero-k">'+t("Exercise")+' '+(V.logIdx+1)+' '+t("of")+' '+a.entries.length+'</div>';
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
   +(inDeload()?'<span class="pill gold">'+t("Lighter week")+'</span>':'')
   +'<span class="etag">'+esc(t(muscleOfEntry(e)))+'</span>'
   /* How to read the numbers: a dumbbell's weight is per hand unless the lifter chose
      totals, and a one-sided exercise's reps are for one side. */
   +(med&&med.e?'<span class="etag">'+esc(t(med.e))
     +(med.e==="Dumbbell"?' · '+esc(t(dbTotal()&&!isUnilateral(e.name)?"both together":"per hand")):'')+'</span>':'')
   +(isUnilateral(e.name)?'<span class="etag">'+t("Each side")+'</span>':'')
   +'<span class="etag">'+e.planned.sets+' × '+e.planned.lo
   +(e.planned.hi!==e.planned.lo?"–"+e.planned.hi:"")+'</span>'
   +(difficultyOf(e.name)?'<span class="etag hot">'+esc(t(difficultyOf(e.name)))+'</span>':'')
   +(pr.w?'<span class="pill gold">PR '+fmtW(pr.w)+'</span>':'')
   +'</div></section>';

  /* The frame's recommendation banner, above the table where it puts it. The figure is
     the recommender's own, and it only appears before the first set of the exercise —
     once you are working, the rows carry the numbers. */
  var recTop=e.sets.length?null:recommend(e);
  /* Nothing logged on this exercise before, so nothing to recommend from: say how to
     find the first weight instead. A beginner gets the fuller version. */
  if(!e.sets.length&&!p&&!timed)
    h+='<div class="recbar first"><span class="ico ico-bulb" aria-hidden="true"></span><span>'
     +esc(t(S.profile&&S.profile.level==="new"
        ?"First time on this one. Pick a weight you could lift three or four more times than the reps asked, and learn the movement before adding load."
        :"First time on this one. Use the first set to find a working weight, then settle in."))+'</span></div>';
  if(recTop&&recTop.w)
    h+='<div class="recbar"><span class="ico ico-bulb" aria-hidden="true"></span>'
     +'<span>'+t("Recommended")+': <b>'+fmtW(recTop.w)+'</b> × '+e.planned.lo
     +(e.planned.hi!==e.planned.lo?"–"+e.planned.hi:"")+' '+t("reps")
     +(recTop.note?' · '+esc(t(recTop.note)):'')+'</span></div>';

  /* --- the set grid: prescription, previous performance and entry in one row --- */
  /* Delete leads the row, log ends it. Grid columns follow the writing direction, so
     in Arabic the pair swaps sides without a second rule. */
  var cols=timed?(rpeCol?"24px 24px 1fr 78px 44px 38px":"24px 24px 1fr 90px 38px")
                :(rpeCol?"24px 24px 1fr 56px 50px 42px 38px":"24px 24px 1fr 66px 58px 38px");
  var hd=timed?["",t("Set"),t("Last"),t("Secs")]
              :["",t("Set"),t("Last"),wUnit().toUpperCase(),loaded?t("Secs"):t("Reps")];
  if(rpeCol)hd.push("RPE");
  hd.push("");
  var doneHere=e.sets.length;
  h+='<section class="setcard"><div class="setcard-h"><h2>'+t("Sets")+'</h2>'
   +'<span class="setcard-c"><b>'+Math.min(doneHere,rows)+'</b> / '+rows+' '+t("done")+'</span></div>';
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
      else if(isAct)h+='<input class="cell'+(V.draftSg?' sg':'')+'" type="number" inputmode="decimal" step="0.5" '
        +'id="in_w" value="'+toDisp(V.draft.w)+'" aria-label="Weight in '+wUnit()+(V.draftSg?', '+t("suggested"):'')+'">';
      else h+='<div class="cellmute">'+(num(V.draft.w)?toDisp(V.draft.w):"—")+'</div>';
    }
    if(done)h+='<input class="cell" type="number" inputmode="numeric" '
      +'value="'+num(st.r)+'" data-setidx="'+i+'" data-k="r" aria-label="Reps, set '+(i+1)+'">';
    else if(isAct)h+='<input class="cell'+(V.draftSg?' sg':'')+'" type="number" inputmode="numeric" '
      +'id="in_r" value="'+num(V.draft.r)+'" aria-label="Reps'+(V.draftSg?', '+t("suggested"):'')+'">';
    else h+='<div class="cellmute">'+(num(V.draft.r)||"—")+'</div>';

    if(rpeCol){
      if(!rpeWanted(i,rows))h+='<div class="cellmute">—</div>';
      else if(done)h+='<input class="cell rp" type="number" inputmode="numeric" min="1" max="10" '
        +'value="'+(st.rpe||"")+'" data-setidx="'+i+'" data-k="rpe" aria-label="RPE, set '+(i+1)+'">';
      else if(isAct)h+='<input class="cell rp" type="number" inputmode="numeric" min="1" max="10" '
        +'id="in_rpe" value="'+(V.draft.rpe||"")+'" placeholder="–" aria-label="RPE">';
      else h+='<div class="cellmute">–</div>';
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
  h+='<div class="addrow"><button class="addset2" data-addrow="1">'
   +'<span aria-hidden="true">+</span>'+t("Add a set")+'</button></div></section>';

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
    h+='<button class="btn ss-next" data-nextex="1">'
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

  }
  /* Canvas screen 4 keeps exactly two secondary actions under the table. The other
     five — how to, plates, note, finish, discard — are behind the header's overflow,
     which is also what Round 4 item 1 asks for: one primary action, everything
     infrequent collapsed. Nothing was removed, only moved. */
  h+='<div class="ss-acts">'
   +'<button class="ss-act" data-swap="1"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h13l-3-3M20 16H7l3 3"/></svg>'+t("Replace Exercise")+'</button>'
   +(V.logIdx<a.entries.length-1?'<button class="ss-act" data-nextex="1"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l10 7-10 7zM19 5v14"/></svg>'+t("Skip Exercise")+'</button>':'')
   +'<button class="ss-act'+(e.pain?' on':'')+'" data-hurt="1"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l9 16H3zM12 10v4M12 17h.01"/></svg>'+t(e.pain?"Pain noted":"Something hurts?")+'</button>'
   +'</div></div>';

  /* The rest screen is no longer part of this string; syncRest() owns it. */
  return h;}

/* ---- cardio, sports, classes ----------------------------------------------------
   Logged as what they are: how long, how far where that means anything, how hard.
   Calories come from the activity's MET and the latest weigh-in. */
var TICK='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
/* "8 × 30s / 90s" */
function ivText(iv){return iv&&iv.n?iv.n+' \u00d7 '+iv.on+'s'+(iv.off?' / '+iv.off+'s':''):"";}
function actBody(a,e,rows,active){
  var info=actInfo(e.name),kg=lastWeight()||0,last=V.logIdx>=a.entries.length-1;
  var h='<section class="exhero acthero"><img class="exhero-art" src="mark.png" alt="" aria-hidden="true" width="440" height="440" decoding="async">'
   +'<div class="exhero-k">'+t("Exercise")+' '+(V.logIdx+1)+' '+t("of")+' '+a.entries.length+'</div>'
   +'<div class="exhead acthead"><span class="actbadge">'+actIcon(e.name,28)+'</span>'
   +'<h1 class="ex-name">'+esc(exName(e.name))+'</h1></div>'
   +'<div class="ex-tags"><span class="etag">'+esc(t(info.grp))+'</span>'
   +(info.dist?'<span class="etag">'+t("Time and distance")+'</span>':'<span class="etag">'+t("Time and effort")+'</span>')
   +'</div></section>';
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
         +(actPace(num(st.min),num(st.km))?' · '+actPace(num(st.min),num(st.km)):'')+'</b>'
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
    if(S.prefs.rpe!=="off")nr=t("Target RPE")+' 8';
  }else{
    var nxe=a.entries[V.logIdx+1];
    nx=nxe?esc(exName(nxe.name)):t("Finish workout");
    nr=nxe?(nxe.planned.sets+' × '+nxe.planned.lo
      +(nxe.planned.hi!==nxe.planned.lo?'–'+nxe.planned.hi:'')+' '+t("reps")):"";
  }
  /* What the set just logged was, for the line under REST PERIOD: "Set 2 of 4
     complete · 85 kg × 8". */
  var doneTxt=lastSet?(t("Set")+' '+e.sets.length+' '+t("of")+' '+rows+' '+t("complete")
      +(timed?' · '+lastSet.r+'s':lastSet.w?' · '+toDisp(lastSet.w)+' '+wUnit()+' × '+lastSet.r
                                          :' · '+lastSet.r+' '+t("reps"))):esc(exName(e.name));
  var art='<div class="rt-art" aria-hidden="true"><img src="img/rest-swirl.jpg" alt="" decoding="async"></div>';
  var upnext='<div class="rt-next"><div class="rt-next-k">'+t("Up next")+'</div>'
     +'<div class="rt-next-v">'+nx+'</div>'+(nr?'<div class="rt-next-r">'+nr+'</div>':'')+'</div>';

  /* Time's up. Its own screen rather than a label on the countdown, because sound is
     not guaranteed to arrive — the silent switch kills it and a backgrounded tab
     suspends it — so the screen has to be the alert. And it asks what is next rather
     than offering one button: the next set, a little more rest, the next exercise, or,
     after the last set of the day, the finish. */
  if(V.restDone){
    var more=e.sets.length<rows, last=V.logIdx>=a.entries.length-1;
    var primary=more
      ?'<button class="rt-go" data-rest="skip">'+ARROW+'<span>'+t("Start next set")+'</span></button>'
      :last?'<button class="rt-go" data-finish="1">'+FLAG+'<span>'+t("Finish workout")+'</span></button>'
      :'<button class="rt-go" data-nextex="1">'+ARROW+'<span>'+t("Next exercise")+'</span></button>';
    /* Built for a glance between sets: one line of context, one large answer, then
       the alternatives as big, equal buttons — no descriptions to read. */
    var nextLine=more?t("Up next")+' · '+nx
      :last?t("That was the last set."):t("Up next")+' · '+nx;
    return '<div class="restwrap rt rt-done rt2" role="alertdialog" aria-labelledby="rtDoneH">'+art
     +'<div class="rt2-top"><div class="rt-sub">'+doneTxt+'</div>'
     +'<div class="rt-check" aria-hidden="true"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="52" class="rt-check-t"/>'
     +'<circle cx="60" cy="60" r="52" class="rt-check-r"/><path d="M40 61l13 13 27-29" class="rt-check-m"/></svg></div>'
     +'<h2 class="rt-h" id="rtDoneH" aria-live="assertive">'+t(more?"Rest complete":last?"Last set done":"Exercise complete")+'</h2>'
     +'<p class="rt2-next">'+nextLine+'</p></div>'
     +'<div class="rt2-acts">'+primary
     +'<div class="rt2-k">'+t("Add rest")+'</div>'
     +'<div class="rt2-pair"><button class="rt2-b" dir="ltr" data-rest="ext30">+30s</button>'
     +'<button class="rt2-b" dir="ltr" data-rest="ext60">+60s</button></div>'
     +(more&&!last?'<button class="rt2-b wide" data-nextex="1">'+SKIP+'<span>'+t("Skip to next exercise")+'</span></button>':'')
     +(!last||more?'<button class="rt2-end" data-finish="1">'+FLAG+'<span>'+t("End workout")+'</span></button>':'')
     +'</div></div>';
  }
  return '<div class="restwrap rt" role="dialog" aria-label="'+t("Rest")+'">'+art
   +'<button class="rt-hide" data-rest="hide"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>'+t("Hide")+'</button>'
   +'<div class="rt-k">'+t("Rest period")+'</div><div class="rt-sub">'+doneTxt+'</div>'
   +'<div class="rt-ring"><svg viewBox="0 0 180 180" aria-hidden="true">'
   +'<circle cx="90" cy="90" r="79" class="rt-ring-t"/>'
   +'<circle id="restRing" cx="90" cy="90" r="79" class="rt-ring-v" stroke-dasharray="'+C+'" stroke-dashoffset="'+off+'"/>'
   +'</svg><div class="rt-ct"><div class="rt-dig" id="restDig" aria-live="polite">'+mmss(left)+'</div>'
   +'<div class="rt-tot" id="restTot">'+t("of")+' '+mmss(total)+'</div></div></div>'
   +'<div class="rt-ctl">'
   +'<button class="rt-rnd" dir="ltr" data-rest="-30" aria-label="'+t("30 seconds less")+'">−30s</button>'
   +'<button class="rt-main" id="restMain" data-rest="'+(paused?"resume":"pause")+'" aria-label="'+(paused?t("Resume"):t("Pause"))+'">'
   +'<i class="ico ico-'+(paused?"play":"pause")+'" id="restMainIco"></i><span id="restMainTxt">'+(paused?t("Resume"):t("Pause"))+'</span></button>'
   +'<button class="rt-rnd" dir="ltr" data-rest="30" aria-label="'+t("30 seconds more")+'">+30s</button></div>'
   +upnext
   +'<button class="rt-skip" data-rest="skip">'+t("Skip rest")+'</button></div>';}

var ARROW='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15M13 6l6 6-6 6"/></svg>';
var FLAG='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 21V4M5 4h11l-2 4 2 4H5"/></svg>';
var SKIP='<svg viewBox="0 0 24 24"><path d="M5 5l10 7-10 7zM19 5v14"/></svg>';

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
  var bar=document.getElementById("restBarDig");
  if(bar)bar.textContent=mmss(left);
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
    var mt=document.getElementById("restMainTxt");
    if(mt)mt.textContent=paused?t("Resume"):t("Pause");
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
  /* Hidden: the countdown carries on in a bar on the workout screen, so the set just
     logged can be corrected or the next exercise read. It comes back full screen the
     moment the rest is over. */
  if(on&&V.restMin&&!V.restDone)on=false;
  /* On another tab the rest is the workout bar above the dock, counting down there;
     the full screen is the Train tab's. Tapping the bar brings it back. */
  if(on&&V.tab!=="train")on=false;
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
  host.innerHTML=vRest(a,e,rowsFor(e),ex_isTimed(e)&&!LOADED.test(e.name));
}

export {ivText, groupLabel, groupNext, groupRun, IDLE_PAUSE, mmss, noteSet, paintRest, platePlan, rowsFor, sessionClock, sessionWall, syncRest, vLogger};
