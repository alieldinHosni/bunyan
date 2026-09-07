/* Bunyan — view
   View state V, shared components, sound, haptics, rest timer. */
import {t} from "../i18n/dict.js";
import {S} from "../state.js";
import {esc, num, r1, today} from "../util.js";

/* ============================================================ view state */
var V={tab:"home",fdate:null,food:null,range:30,exd:null,showAll:false,restPaused:false,restLeft:0,train:"days",dayId:null,sheet:null,sd:null,exq:"",exm:"All",exe:"All",previewId:null,
       logIdx:0,draft:{w:0,r:0,rpe:8},restEnd:0,restTotal:0,chartEx:null,cal:0,fresh:-1,
       bar:20};

var AC=null,beeped=true,lastTick=99,wakeLock=null;
function startRest(e){
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
  if(!AC)return;
  try{
    var o=AC.createOscillator(),g=AC.createGain(),t0=AC.currentTime+at;
    o.type=type||"sine";o.frequency.setValueAtTime(freq,t0);
    g.gain.setValueAtTime(0.0001,t0);
    g.gain.exponentialRampToValueAtTime(vol||0.22,t0+0.015);
    g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
    o.connect(g);g.connect(AC.destination);o.start(t0);o.stop(t0+dur+0.02);
  }catch(err){}}
var SOUNDS={
  set:     function(){tone(660,0,0.09,0.16);},
  tick:    function(){tone(1046,0,0.05,0.10);},
  rest:    function(){tone(880,0,0.15);tone(880,0.18,0.15);},
  pr:      function(){[523,659,784,1046].forEach(function(f,i){tone(f,i*0.09,0.20,0.20);});},
  complete:function(){[392,523,659].forEach(function(f,i){tone(f,i*0.12,0.28,0.20);});}
};
function play(name){
  if(!S.prefs.sound)return;
  audioOn();
  var f=SOUNDS[name];if(f)f();}
function beep(){play("rest");}
async function keepAwake(on){
  try{
    if(on&&S.prefs.awake&&"wakeLock" in navigator&&!wakeLock){wakeLock=await navigator.wakeLock.request("screen");}
    else if(!on&&wakeLock){wakeLock.release();wakeLock=null;}
  }catch(err){}}
/* Reversible actions get an undo toast instead of a confirmation dialog. Only things
   that cannot be undone stop to ask. */
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
  setTimeout(function(){if(d.parentNode)d.remove();},undo?5200:2600);}

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
function ring(pct,color,label,value){
  var R=34,C=2*Math.PI*R,off=C*(1-Math.min(1,pct));
  return '<svg viewBox="0 0 80 80" style="width:80px;height:80px">'
   +'<circle cx="40" cy="40" r="'+R+'" stroke="var(--raised)" stroke-width="7" fill="none"/>'
   +'<circle cx="40" cy="40" r="'+R+'" stroke="'+color+'" stroke-width="7" fill="none"'
   +' stroke-linecap="round" stroke-dasharray="'+C+'" stroke-dashoffset="'+off+'"'
   +' transform="rotate(-90 40 40)"/>'
   +'<text x="40" y="38" text-anchor="middle" font-size="15" font-weight="700" fill="var(--text)">'+value+'</text>'
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
   +'<path d="'+d+'" fill="none" stroke="'+color+'" stroke-width="2.2" stroke-linejoin="round"/>'
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

function progressBar(cur,goal,color){
  var p=goal?Math.min(1,cur/goal):0;
  return '<div class="bar"><i style="width:'+(p*100)+'%;background:'+color+'"></i></div>';}

/* A settings row that carries its own value, so the hub answers most questions
   without the user having to open anything. */
function setRow(sheet,label,value,sub){
  return '<button class="item" data-sheet="'+sheet+'">'
   +'<div style="min-width:0"><div style="font-weight:600">'+esc(label)+'</div>'
   +(sub?'<div class="tiny">'+esc(sub)+'</div>':'')+'</div>'
   +(value?'<span class="rowval">'+esc(value)+'</span>':'')
   +'<span class="chev">›</span></button>';}


/* Rest-timer bookkeeping lives here with the timer it belongs to; app.js drives it
   through these rather than assigning to an imported binding. */
function setBeeped(b){beeped=b;}
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
  var b=document.body;
  if(on){
    _lockY=window.pageYOffset||document.documentElement.scrollTop||0;
    b.style.position="fixed";
    b.style.top=(-_lockY)+"px";
    b.style.left="0";b.style.right="0";b.style.width="100%";
  }else{
    b.style.position="";b.style.top="";
    b.style.left="";b.style.right="";b.style.width="";
    window.scrollTo(0,_lockY);
  }
}

export {audioOn, beeped, CUES, ex_isTimed, head, keepAwake, lastTick, lockScroll, MISTAKES, play, progressBar, recentPR, ring, setBeeped, setLastTick, setRow, sparkline, startRest, stepper, streak, tap, toast, V};
