/* Bunyan — view
   View state V, shared components, sound, haptics, rest timer. */
import {t} from "../i18n/dict.js";
import {S} from "../state.js";
import {esc, fmtN, num, r1, today} from "../util.js";

/* ============================================================ view state */
var V={tab:"home",fdate:null,food:null,range:30,exd:null,showAll:false,restPaused:false,restLeft:0,train:"days",dayId:null,sheet:null,sd:null,exq:"",exm:"All",exe:"All",previewId:null,
       logIdx:0,draft:{w:0,r:0,rpe:8},restEnd:0,restTotal:0,chartEx:null,cal:0,fresh:-1,
       /* Date bar state. Progress and Food keep separate selected days on purpose —
          Food scopes its whole screen to one day, Progress scopes only the day-specific
          block while the range chips drive the charts. `cal` is the month-grid page
          offset and is shared, because only one of the two bars is ever on screen.
          pdate/pcal were previously created on first use and absent from this literal,
          which made the view state impossible to read off in one place. */
       pdate:null,pcal:false,fcal:false,
       /* Train's day (null follows the clock), its open month, and which way the date
          navigator last moved, so the new date slides in from the right side. */
       tdate:null,tcal:false,dnavDir:0,
       /* The Progress tab's view (overview, strength, body, nutrition) and whether
          Strength's top lifts list shows every lift or the first five. */
       ptab:"overview",pall:false,phalf:"all",
       /* The rest timer has three states, not two: counting, paused, and finished-and
          waiting to be acknowledged. The third is what makes the zero state visible. */
       restDone:false,
       /* Which meal the Food tab has opened, or null for the day's dashboard. It is
          part of the nav route, so back returns to the dashboard, not to the tab. */
       meal:null,
       bar:20};

var AC=null,beeped=true,lastTick=99,wakeLock=null;
/* One way to end the rest state, because there are ten places that end it — logging a
   set, skipping, jumping exercise, finishing, discarding, leaving. Each of them used to
   clear restEnd and restPaused by hand, and adding a third piece of state plus an alarm
   that must be silenced would have meant getting all ten right and keeping them right.
   The alarm outliving the screen that raised it is the specific failure this prevents. */
function endRest(){
  V.restEnd=0;V.restPaused=false;V.restDone=false;V.restMin=false;
  alarmStop();
}
function startRest(e){
  V.restDone=false;V.restMin=false;alarmStop();   /* a new rest replaces the last one's alert */
  audioOn();
  if(!S.prefs.autorest){V.restEnd=0;return;}
  V.restTotal=e.rest||75;
  V.restEnd=Date.now()+V.restTotal*1000;
  beeped=false;lastTick=99;}
function buzz(ms){
  try{if(navigator.vibrate)navigator.vibrate(ms||10);}catch(e){}}
function tap(kind){
  if(S.prefs.haptic!==false)buzz(kind==="heavy"?18:kind==="ok"?[12,40,12]:9);
}
function audioOn(){
  try{if(!AC)AC=new (window.AudioContext||window.webkitAudioContext)();
      if(AC.state==="suspended")AC.resume();}catch(err){}}
function tone(freq,at,dur,vol,type){
  if(!AC)return null;
  try{
    var o=AC.createOscillator(),g=AC.createGain(),t0=AC.currentTime+at;
    o.type=type||"sine";o.frequency.setValueAtTime(freq,t0);
    g.gain.setValueAtTime(0.0001,t0);
    g.gain.exponentialRampToValueAtTime(vol||0.22,t0+0.015);
    g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
    o.connect(g);g.connect(AC.destination);o.start(t0);o.stop(t0+dur+0.02);
    return o;
  }catch(err){return null;}}

/* The rest alarm. Eight seconds of a two-tone pattern rather than one beep, because it
   has to be noticed from across a gym floor by someone who is not looking at the phone.
   A single chirp is what the timer had, and it is inaudible at three metres over music.

   Every oscillator is scheduled up front against the audio clock, so the rhythm does not
   depend on setTimeout drift or on the page getting frames — the tab can be throttled
   and the pattern still plays correctly. They are kept so the whole thing can be cut
   short the moment the user acts, which is the common case: nobody waits out eight
   seconds once they have seen it.

   What this deliberately does NOT do, because it cannot: play through the iPhone's
   ring/silent switch, or play while the app is backgrounded or the phone is locked.
   iOS applies the hardware switch to all web audio and suspends the page. There is no
   workaround, so there is no setting pretending otherwise — the screen carries the
   alert on its own instead. */
var ALARM_MS=8000;
var alarmNodes=[],alarmTimer=0;
function alarmStop(){
  for(var i=0;i<alarmNodes.length;i++){try{alarmNodes[i].stop();}catch(e){}}
  alarmNodes=[];
  if(alarmTimer){clearTimeout(alarmTimer);alarmTimer=0;}
}
function alarmStart(){
  alarmStop();
  if(!S.prefs.sound)return;
  audioOn();
  if(!AC)return;
  for(var i=0;i<8;i++){
    var n1=tone(880,i,0.15,0.30,"square");
    var n2=tone(1175,i+0.22,0.15,0.30,"square");
    if(n1)alarmNodes.push(n1);
    if(n2)alarmNodes.push(n2);
  }
  /* Housekeeping only — the oscillators stop themselves. */
  alarmTimer=setTimeout(alarmStop,ALARM_MS+300);
}
var SOUNDS={
  set:     function(){tone(660,0,0.09,0.16);},
  tick:    function(){tone(1046,0,0.05,0.10);},
  /* No rest entry: the timer-zero alert is alarmStart(), which has to run for eight
     seconds and be cancellable — something a fire-and-forget SOUNDS entry cannot be. */
  pr:      function(){[523,659,784,1046].forEach(function(f,i){tone(f,i*0.09,0.20,0.20);});},
  complete:function(){[392,523,659].forEach(function(f,i){tone(f,i*0.12,0.28,0.20);});}
};
function play(name){
  if(!S.prefs.sound)return;
  audioOn();
  var f=SOUNDS[name];if(f)f();}
/* The browser drops the lock whenever the page is hidden (app switch, lock screen)
   and the old handle then stays set, so the lock was never taken again after the
   first time the phone left the app. The release listener clears it, and the
   visibility handler in app.js asks again. */
async function keepAwake(on){
  try{
    if(on&&S.prefs.awake&&"wakeLock" in navigator&&!wakeLock&&document.visibilityState==="visible"){
      wakeLock=await navigator.wakeLock.request("screen");
      wakeLock.addEventListener("release",function(){wakeLock=null;});}
    else if(!on&&wakeLock){var w=wakeLock;wakeLock=null;w.release();}
  }catch(err){wakeLock=null;}}
/* Reversible actions get an undo toast instead of a confirmation dialog. Only things
   that cannot be undone stop to ask. */
/* The part of the screen the keyboard leaves visible, as CSS variables the sheets size
   themselves from. iOS lays fixed elements out against the layout viewport, which the
   keyboard does not shrink, so without this a sheet ran on underneath the keyboard. */
function syncViewport(){
  var vv=window.visualViewport;if(!vv)return;
  var r=document.documentElement.style;
  r.setProperty("--vvh",Math.round(vv.height)+"px");
  r.setProperty("--vvt",Math.round(vv.offsetTop)+"px");}
function toast(msg,undo){
  var old=document.querySelector(".toast");if(old)old.remove();
  var d=document.createElement("div");d.className="toast";d.setAttribute("role","status");
  var s=document.createElement("span");s.textContent=msg;d.appendChild(s);
  if(undo){
    var b=document.createElement("button");
    b.className="toast-undo";b.type="button";b.textContent=t("Undo");
    b.onclick=function(){d.remove();undo();};
    d.appendChild(b);}
  document.body.appendChild(d);
  /* Fade out rather than vanish. The keyframes were written for this and nothing was
     adding the class, so toasts blinked out of existence. */
  setTimeout(function(){
    if(!d.parentNode)return;
    d.classList.add("leaving");
    setTimeout(function(){if(d.parentNode)d.remove();},260);
  },undo?5200:2600);}

var CUES={
 Push:["Set your shoulder blades down and back before the first rep.",
       "Lower under control, roughly two seconds down.",
       "Stop just short of locking out to keep tension on the muscle.",
       "Drive through the middle of your hand, not the fingers."],
 Pull:["Start from a full stretch, let the shoulder blade travel.",
       "Lead with the elbow, not the hand.",
       "Pause for a second at the point of peak contraction.",
       "Control the way back rather than dropping it."],
 Hinge:["Push the hips back, do not bend the knees first.",
        "Keep the bar or weight close to your legs the whole way.",
        "Back stays flat from head to hips throughout.",
        "Stop when you feel the hamstrings stretch, not when you reach the floor."],
 Squat:["Brace your core before you descend, not after.",
        "Knees track over the toes, never collapse inward.",
        "Go to the depth you can control with a flat back.",
        "Drive the floor away rather than thinking about standing up."],
 "Elbow flexion":["Keep elbows pinned at your sides.",
        "No swinging. If the body moves, the weight is too heavy.",
        "Squeeze hard at the top, lower slowly.",
        "Full range beats extra load here."],
 "Elbow extension":["Elbows stay fixed, only the forearm moves.",
        "Keep the shoulder still throughout.",
        "Full lockout at the end of each rep.",
        "Lighter and stricter works better than heavy and loose."],
 Isolation:["Light weight, slow tempo, no momentum.",
        "Lead with the elbow or the working joint.",
        "Pause at the top of every rep.",
        "Feel the target muscle, not the joints."],
 Isometric:["Brace hard before the clock starts.",
        "Breathe normally, do not hold your breath.",
        "Keep a straight line from head to heels.",
        "Stop when form breaks, not when the time is up."],
 Core:["Move slowly. Speed makes it easier, not harder.",
       "Keep the lower back pressed down.",
       "Exhale as you contract.",
       "Quality over reps."],
 Mobility:["Ease into the position, never force it.",
       "Breathe out as you deepen the stretch.",
       "Hold, do not bounce.",
       "Mild tension is fine, sharp pain is not."],
 Conditioning:["Start easier than you think you need to.",
       "Keep the effort steady rather than sprinting and stopping.",
       "Land softly if the movement involves jumping.",
       "Stop with something left in the tank."]
};
var MISTAKES={
 Push:["Bouncing the weight off the chest","Flaring the elbows straight out","Half reps at the bottom"],
 Pull:["Yanking with the lower back","Cutting the stretch short","Curling the arms instead of driving the elbows"],
 Hinge:["Rounding the lower back","Turning it into a squat","Chasing weight before the movement is learned"],
 Squat:["Knees caving inward","Heels lifting off the floor","Cutting depth to add plates"],
 "Elbow flexion":["Swinging the torso","Elbows drifting forward","Stopping halfway down"],
 "Elbow extension":["Elbows flaring out","Moving the shoulder","Loading too heavy and losing the lockout"],
 Isolation:["Using momentum","Going too heavy","Rushing the eccentric"],
 Isometric:["Hips sagging or piking","Holding the breath","Chasing time over position"],
 Core:["Pulling with the neck","Arching the lower back","Going too fast"],
 Mobility:["Bouncing","Forcing past pain","Holding the breath"],
 Conditioning:["Starting too hard","Landing stiff-legged","Ignoring form once tired"]
};
/* The pattern's list is the fallback. Where the name says which movement it is, its
   own mistakes are listed instead — "bouncing the weight off the chest" is a bench
   press fault, not an overhead press one. First match wins, so the order matters. */
var MISTAKE_BY_NAME=[
 [/overhead|shoulder press|military|arnold|push press|landmine press/i,
  ["Arching the lower back to finish the rep","Pressing forward instead of straight up","Stopping short of lockout overhead"]],
 [/push-?up/i,["Hips sagging","Flaring the elbows straight out","Half reps at the bottom"]],
 [/\bdips?\b/i,["Sinking so deep the shoulders roll forward","Swinging the legs","Shrugging at the top"]],
 [/fly|flye|pec deck/i,["Bending and straightening the elbows until it becomes a press","Stretching past what the shoulder can control","Swinging the weight together"]],
 [/lateral raise|side raise|upright row/i,["Swinging up with the hips","Shrugging the shoulders to the ears","Raising the hands above the elbows"]],
 [/face pull|rear delt|reverse fl/i,["Pulling with the lower back","Shrugging","Going too heavy to feel the back of the shoulder"]],
 [/pulldown|pull-?up|chin-?up/i,["Leaning far back and rowing it down","Cutting the stretch at the top","Pulling with the hands instead of driving the elbows down"]],
 [/\brow/i,["Standing up out of the hinge to move the weight","Shrugging instead of pulling the elbows back","Cutting the stretch short"]],
 [/hip thrust|glute bridge|\bbridge/i,["Arching the lower back at the top","Pushing through the toes","Rushing past the squeeze at the top"]],
 [/deadlift|\brdl\b|romanian|good morning/i,["Rounding the lower back","Letting the bar drift away from the legs","Turning it into a squat"]],
 [/lunge|split squat|step-?up|bulgarian/i,["Front knee caving inward","Pushing off the back foot","Stance so narrow the balance goes"]],
 [/leg press|hack/i,["Lower back peeling off the pad","Locking the knees hard at the top","Knees caving inward"]],
 [/leg extension/i,["Kicking the weight up","Lifting the hips off the seat","Dropping it on the way down"]],
 [/leg curl/i,["Hips lifting off the pad","Swinging the weight up","Stopping short of the full curl"]],
 [/calf/i,["Bouncing at the bottom","Half range, no full stretch","Bending the knees to help"]],
 [/shrug/i,["Rolling the shoulders","Bending the elbows","A weight too heavy to hold at the top"]],
 [/curl/i,["Swinging the torso","Elbows drifting forward","Stopping halfway down"]],
 [/tricep|pushdown|skull|extension/i,["Elbows flaring out","Moving the shoulder","Losing the lockout to go heavier"]]
];
function mistakesFor(name,pattern){
  for(var i=0;i<MISTAKE_BY_NAME.length;i++)if(MISTAKE_BY_NAME[i][0].test(name||""))return MISTAKE_BY_NAME[i][1];
  return MISTAKES[pattern]||MISTAKES.Isolation;}
function head(title,sub){
  return '<div class="screen"><div><h1>'+esc(title)+'</h1>'
   +(sub?'<p class="sub">'+esc(sub)+'</p>':'')+'</div>'
   +'<span class="wm">BUNYAN</span></div>';}
function streak(){
  if(!S.sessions.length)return 0;
  var days={};S.sessions.forEach(function(x){days[x.date]=1;});
  var n=0,d=new Date();
  if(!days[today()]){d.setDate(d.getDate()-1);}
  for(var i=0;i<400;i++){
    var iso=new Date(d.getTime()-d.getTimezoneOffset()*6e4).toISOString().slice(0,10);
    if(days[iso]){n++;d.setDate(d.getDate()-1);}
    else break;}
  return n;}
function recentPR(){
  for(var i=0;i<S.sessions.length;i++){
    var s2=S.sessions[i],best=null;
    for(var j=0;j<s2.entries.length;j++){
      var e=s2.entries[j];
      e.sets.forEach(function(x){
        if(num(x.w)&&(!best||num(x.w)>best.w))best={n:e.name,w:num(x.w),r:num(x.r),d:s2.date};});}
    if(best)return best;}
  return null;}
/* The ring's centre number counts up: it is the one figure on Home that the user just
   changed by logging food. data-count-to is the opt-in the painter looks for, and the
   text content is already the final value, so a reduced-motion paint is correct before
   anything animates. */
function ring(pct,color,label,value){
  var R=34,C=2*Math.PI*R,off=C*(1-Math.min(1,pct));
  return '<svg viewBox="0 0 80 80" style="width:80px;height:80px">'
   +'<circle cx="40" cy="40" r="'+R+'" stroke="var(--raised)" stroke-width="7" fill="none"/>'
   +'<circle cx="40" cy="40" r="'+R+'" stroke="'+color+'" stroke-width="7" fill="none"'
   +' stroke-linecap="round" stroke-dasharray="'+C+'" stroke-dashoffset="'+off+'"'
   +' transform="rotate(-90 40 40)"/>'
   +'<text x="40" y="38" text-anchor="middle" font-size="15" font-weight="700" fill="var(--text)" data-count-to="'+value+'">'+fmtN(value)+'</text>'
   +'<text x="40" y="52" text-anchor="middle" font-size="9" fill="var(--dim)">'+label+'</text></svg>';}

function sparkline(vals,labels,color){
  if(vals.length<2)return '<p class="tiny">'+t("Log at least two entries to see a chart.")+'</p>';
  var w=320,h=110,pad=6;
  var mn=Math.min.apply(null,vals),mx=Math.max.apply(null,vals);
  if(mx===mn){mx=mn+1;mn=mn-1;}
  var pts=vals.map(function(v,i){
    var x=pad+i*(w-2*pad)/(vals.length-1);
    var y=pad+(h-2*pad)*(1-(v-mn)/(mx-mn));
    return [r1(x),r1(y)];});
  var d=pts.map(function(p,i){return (i?"L":"M")+p[0]+" "+p[1];}).join(" ");
  var area=d+" L"+pts[pts.length-1][0]+" "+h+" L"+pts[0][0]+" "+h+" Z";
  return '<svg viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none" style="width:100%;height:110px">'
   +'<path d="'+area+'" fill="'+color+'" opacity=".13"/>'
   +'<path class="line" d="'+d+'" fill="none" stroke="'+color+'" stroke-width="2.2" stroke-linejoin="round"/>'
   +pts.map(function(p){return '<circle cx="'+p[0]+'" cy="'+p[1]+'" r="2.6" fill="'+color+'"/>';}).join("")
   +'</svg><div class="row tiny" style="margin-top:2px"><span>'+esc(labels[0])
   +'</span><span>'+esc(labels[labels.length-1])+'</span></div>';}

function ex_isTimed(e){
  return /Hold|Plank|Wall Sit|Balance|Isometric|Stretch|Dead Hang|L-Sit|Carry|Farmer/i.test(e.name);}
function stepperInput(id,val,step,unit){
  return '<div class="steps"><button class="stp" data-stp="'+id+'" data-d="-'+step+'"'
   +' aria-label="'+t("Less")+' '+esc(unit)+'">&minus;</button>'
   +'<div class="stv"><input class="stn" id="in_'+id+'" type="number" inputmode="decimal" '
   +'value="'+val+'" aria-label="'+esc(unit)+'"><div class="stu">'+unit+'</div></div>'
   +'<button class="stp" data-stp="'+id+'" data-d="'+step+'"'
   +' aria-label="'+t("More")+' '+esc(unit)+'">+</button></div>';}
function stepper(id,val,step,unit){
  return '<div class="steps"><button class="stp" data-stp="'+id+'" data-d="-'+step+'"'
   +' aria-label="'+t("Less")+' '+esc(unit)+'">&minus;</button>'
   +'<div class="stv"><div class="stn" aria-live="polite">'+val+'</div>'
   +'<div class="stu">'+unit+'</div></div>'
   +'<button class="stp" data-stp="'+id+'" data-d="'+step+'"'
   +' aria-label="'+t("More")+' '+esc(unit)+'">+</button></div>';}

/* The segmented control: the dock's sliding indicator, for any row of equal choices
   that picks one view of the same thing — Progress's sections and ranges, the
   add-food tabs, a filter. One element slides between the cells by transform, so
   the choice moves rather than blinking from one place to another, and the row never
   changes size.

   o.items   [[value, label, accessible name?], …]
   o.value   the selected value
   o.attr    the data attribute each button carries (the click handler's key)
   o.label   the group's accessible name
   o.tabs    true for a tablist (it switches what is shown below), else a button group
   o.soft    a secondary control: tinted indicator rather than the solid accent
   o.key     a stable data-k, so the patcher keeps the element and the slide can run */
function seg(o){
  var items=o.items||[],idx=0;
  items.forEach(function(it,i){if(String(it[0])===String(o.value))idx=i;});
  return '<div class="seg'+(o.soft?' soft':'')+(o.cls?' '+o.cls:'')+'" data-k="'+esc(o.key||o.attr)+'"'
   +' role="'+(o.tabs?'tablist':'group')+'" aria-label="'+esc(o.label||"")+'"'
   +' style="--n:'+items.length+';--i:'+idx+'">'
   +'<span class="seg-ind" aria-hidden="true"></span>'
   +items.map(function(it,i){
     var on=i===idx;
     return '<button type="button" class="seg-b'+(on?' on':'')+'" data-'+o.attr+'="'+esc(it[0])+'"'
      +(o.tabs?' role="tab" aria-selected="'+on+'" tabindex="'+(on?0:-1)+'"':' aria-pressed="'+on+'"')
      +(it[2]?' aria-label="'+esc(it[2])+'"':'')+'>'+esc(it[1])+'</button>';}).join("")
   +'</div>';}

function progressBar(cur,goal,color){
  var p=goal?Math.min(1,cur/goal):0;
  return '<div class="bar"><i style="width:'+(p*100)+'%;background:'+color+'"></i></div>';}



/* Rest-timer bookkeeping lives here with the timer it belongs to; app.js drives it
   through these rather than assigning to an imported binding. */
function setBeeped(b){beeped=b;}
/* ---- the live workout's position and rest, kept with the workout ----------------
   V is memory only, so the exercise you were on and a running rest used to vanish on
   a reload or when iOS reclaimed the tab. They are written onto S.active whenever
   they change, and read back when the app starts. Returns true when something
   changed, so the caller knows to save. */
function syncWorkoutState(){
  var a=S.active;if(!a)return false;
  var changed=false;
  if(a.idx!==V.logIdx){a.idx=V.logIdx;changed=true;}
  var r=(V.restEnd||V.restPaused||V.restDone)
    ?{end:V.restEnd,total:V.restTotal,paused:!!V.restPaused,left:V.restLeft||0,done:!!V.restDone}:null;
  var was=a.rest?JSON.stringify(a.rest):"null",now=r?JSON.stringify(r):"null";
  if(was!==now){a.rest=r;changed=true;}
  return changed;
}
/* On start-up: put the workout back where it was. A rest that ran out while the app
   was closed comes back as finished, silently — the moment for the alarm has passed. */
function restoreWorkoutState(){
  var a=S.active;if(!a)return;
  V.logIdx=Math.max(0,Math.min(a.entries.length-1,Math.round(num(a.idx,0))));
  var r=a.rest;
  if(r){
    V.restTotal=num(r.total,75);
    if(r.paused){V.restPaused=true;V.restLeft=num(r.left,0);V.restEnd=0;}
    else if(r.done||num(r.end)<=Date.now()){V.restEnd=0;V.restDone=true;beeped=true;}
    else{V.restEnd=num(r.end);beeped=false;lastTick=99;}
  }
}
function setLastTick(v){lastTick=v;}

/* Pinning the page while a sheet is open. overscroll-behavior stops a scroll that
   starts inside the sheet from chaining outwards, but it does nothing about a drag
   beginning on the backdrop or on a part of the sheet that does not scroll — that
   still moves the page underneath. On iOS, overflow:hidden on the body does not hold
   either. Fixing the body and putting the offset back afterwards is what works. */
var _lockY=0,_locked=false;
function lockScroll(on){
  on=!!on;
  /* Re-locking would read a scroll position of zero, because the body is already
     pinned, and the page would jump to the top when the sheet closed. */
  if(on===_locked)return;
  _locked=on;
  var b=document.body,d=document.documentElement;
  if(on){
    /* Taking the body out of flow empties the document, so its scroll height drops to
       one viewport and the page stops being scrollable. Safari reads that as "nothing
       to scroll", brings its collapsed toolbar back, and the visual viewport shrinks —
       which moves everything pinned to the bottom of it, the nav included. Closing the
       sheet makes the page scrollable again, but the toolbar stays out until something
       scrolls, so the nav is still displaced afterwards. That is the "shifted again
       after a sheet closes" report, and it is why tapping another tab fixes it.

       Holding the height the document had keeps it exactly as scrollable as it was, so
       the toolbar never changes state and nothing pinned to the viewport moves. */
    _lockY=window.pageYOffset||d.scrollTop||0;
    d.style.height=d.scrollHeight+"px";
    b.style.position="fixed";
    b.style.top=(-_lockY)+"px";
    b.style.left="0";b.style.right="0";b.style.width="100%";
  }else{
    b.style.position="";b.style.top="";
    b.style.left="";b.style.right="";b.style.width="";
    d.style.height="";
    window.scrollTo(0,_lockY);
  }
}


/* Reordering is a mode you turn on. The grips used to sit on every row, at the right
   edge where a thumb scrolls, and took the touch outright — so a scroll that began on
   one moved the row. Now a list shows its grips only after Reorder; the ✕s step aside
   while it is on, and Done puts the list back. Train's days and exercises and Food's
   meals all use it. */
function reorderBtn(key,on){
  return '<button class="tlink dreorder'+(on?' on':'')+'" data-reorder="'+key+'" aria-pressed="'+on+'">'
   +esc(t(on?"Done":"Reorder"))+'</button>';}
var GRIPSVG='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/>'
  +'<circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>';
export {GRIPSVG, reorderBtn, mistakesFor, syncViewport, syncWorkoutState, restoreWorkoutState, alarmStart, alarmStop, audioOn, beeped, CUES, endRest, ex_isTimed, head, keepAwake, lastTick, lockScroll, MISTAKES, play, progressBar, recentPR, ring, seg, setBeeped, setLastTick, sparkline, startRest, stepper, stepperInput, streak, tap, toast, V};
