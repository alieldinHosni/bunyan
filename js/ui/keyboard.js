/* Bunyan — the keyboard over a sheet (iPhone)
   A sheet is pinned to what the keyboard leaves visible (--vvt and --vvh, view.js), so
   it ends where the keys begin. Tapping a field in it, Safari also scrolls the whole page
   to bring the field above the keyboard, and the sheet, following what is visible, moved
   back against it: on every field tapped (Protein, Carbs, Fat, the keyboard's own up and
   down arrows) the sheet jumped up and down.

   So for a field in a sheet Safari is not let scroll. For the moment it takes the focus
   the field is lifted far up (a transform Safari reads as "already in view", the way
   react-aria's usePreventScroll does it), and once the keyboard is up the sheet scrolls
   the field into its own visible part. The page behind never moves, so nothing pinned to
   it does either. Only on iOS; other browsers already leave a fixed sheet alone. */

var IOS=/iP(hone|ad|od)/.test(navigator.userAgent)
  ||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);

/* Fields that bring the keyboard up. A select, a date or a switch opens its own picker. */
function opensKeyboard(el){
  if(!el||!el.matches||el.disabled||el.readOnly)return false;
  if(el.matches("textarea,[contenteditable=true]"))return true;
  return el.matches("input")&&!el.matches("[type=checkbox],[type=radio],[type=range],[type=file],[type=button],"
    +"[type=submit],[type=reset],[type=color],[type=date],[type=time],[type=datetime-local],[type=month],[type=week],[type=hidden]");}
/* A sheet, or the coach's panel: both are pinned to what the keyboard leaves, so both
   jumped when Safari scrolled the page under them to show the field. */
function inSheet(el){return !!(el&&el.closest&&el.closest("#sheet .sheetbox,#cpanel .cp"));}

/* The nearest box that scrolls, short of the page. */
function scrollBox(el){
  for(var p=el.parentElement;p&&p!==document.body&&p!==document.documentElement;p=p.parentElement){
    var o=getComputedStyle(p).overflowY;
    if((o==="auto"||o==="scroll")&&p.scrollHeight>p.clientHeight+1)return p;}
  return null;}

/* The field into the part of its box the keyboard leaves, a third of the way down, by
   scrolling that box and nothing else. A field already in sight stays where it is. */
function reveal(el){
  if(!el||!el.isConnected)return;
  var sc=scrollBox(el);if(!sc)return;
  var vv=window.visualViewport,seen=vv?vv.height:window.innerHeight;
  var sr=sc.getBoundingClientRect(),r=el.getBoundingClientRect();
  var top=Math.max(sr.top,0),bot=Math.min(sr.bottom,seen);
  if(bot-top<r.height+16)return;
  if(r.top>=top+8&&r.bottom<=bot-8)return;
  sc.scrollTop+=Math.round(r.top-(top+(bot-top-r.height)/3));}

/* Lifted for one frame, while Safari decides whether to scroll; then back in place. */
var lifted=null;
function lift(el){
  if(lifted===el)return;
  lifted=el;el.style.transform="translateY(-2000px)";
  requestAnimationFrame(function(){el.style.transform="";if(lifted===el)lifted=null;});}

/* After the keyboard is up: at once if it already is, otherwise when the visible part
   shrinks (with a fallback, should it never say so). */
function afterKeyboard(el){
  var vv=window.visualViewport,done=false;
  function go(){if(done)return;done=true;
    requestAnimationFrame(function(){requestAnimationFrame(function(){if(document.activeElement===el)reveal(el);});});}
  if(!vv||vv.height<window.innerHeight-80){go();return;}
  vv.addEventListener("resize",go,{once:true});
  setTimeout(go,700);}

/* Only a tap: a finger that moved was scrolling the sheet, and one held down is asking
   for the paste menu, and both are left to the browser. */
var t0=null;
function onTouchStart(ev){
  var p=ev.touches&&ev.touches.length===1?ev.touches[0]:null;
  t0=p?{x:p.clientX,y:p.clientY,at:Date.now()}:null;}
function isTap(ev){
  var p=ev.changedTouches&&ev.changedTouches[0];
  return !!(t0&&p&&Math.abs(p.clientX-t0.x)<10&&Math.abs(p.clientY-t0.y)<10&&Date.now()-t0.at<500);}

function onTouchEnd(ev){
  if(!isTap(ev))return;
  var t=ev.target,lab=t&&t.closest&&t.closest("label");
  var el=opensKeyboard(t)?t:(lab&&lab.control&&opensKeyboard(lab.control)?lab.control:null);
  if(!el||el===document.activeElement||!inSheet(el))return;
  /* Focused here rather than by the browser: the lift has to be in place before the
     focus, or Safari has already decided to scroll. */
  ev.preventDefault();
  lift(el);
  try{el.focus({preventScroll:true});}catch(e){el.focus();}
  afterKeyboard(el);}

/* Focus that does not come from a tap: the keyboard's up and down arrows. */
function onFocusIn(ev){
  var el=ev.target;
  if(!opensKeyboard(el)||!inSheet(el)||lifted===el)return;
  lift(el);afterKeyboard(el);}

function initKeyboard(){
  if(!IOS)return;
  document.addEventListener("touchstart",onTouchStart,{passive:true});
  document.addEventListener("touchend",onTouchEnd,{passive:false});
  document.addEventListener("focusin",onFocusIn);}

export {initKeyboard, opensKeyboard, reveal};
