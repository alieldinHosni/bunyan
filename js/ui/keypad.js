/* Bunyan — the app's own number keypad
   Owner, 10 Nov: sheets with a field "struggle with the keyboard … the app bounces when it
   closes and vice versa". iOS's keyboard tells the page its height only after it has
   finished moving, so whatever makes room for it moves late or twice. A number is typed
   here instead: a keypad the app draws, at the foot of the screen, that it slides in and
   out itself, with the sheet making room in the same motion (--vvh and --kbh, the
   variables every sheet already sizes from, set here to the keypad's height and eased
   with it). The phone's keyboard does not come up for these fields at all
   (inputmode="none" while one is being typed into).

   A number field in a sheet (type=number, or inputmode decimal or numeric) takes it on a
   touch device; a mouse and a hardware keyboard keep typing as they always did. Each key
   writes into the field and sends the input event the field's own handlers listen for,
   so what saves and checks a field is unchanged. "Next" moves to the following number
   field of the sheet; "Done" puts the keypad away. Arabic: the digits are the app's
   (western), as the fields show them. */
import {t} from "../i18n/dict.js";
import {tap} from "./view.js";

var TOUCH=("ontouchstart" in window)||navigator.maxTouchPoints>0;
var pad=null,field=null,H=0,fresh=false;

function isNum(el){
  if(!el||!el.matches||el.disabled||el.readOnly)return false;
  if(!el.closest("#sheet .sheetbox"))return false;
  if(el.hasAttribute("data-im"))return true;
  var m=(el.getAttribute("inputmode")||"").toLowerCase();
  return el.matches("input")&&(el.type==="number"||m==="decimal"||m==="numeric");}
/* Marked for the keypad before the browser can bring its own keyboard up. A number field
   becomes a text field while it is: a number field throws away "12." as it is typed. */
function mark(el){
  if(!el.hasAttribute("data-im"))el.setAttribute("data-im",el.getAttribute("inputmode")||(el.type==="number"?"decimal":""));
  if(el.type==="number"){el.setAttribute("data-type","number");el.type="text";}
  if(el.getAttribute("inputmode")!=="none")el.setAttribute("inputmode","none");}
function whole(el){var m=(el.getAttribute("data-im")||el.getAttribute("inputmode")||"").toLowerCase();
  return m==="numeric"||el.getAttribute("step")==="1";}
function fields(){return [].slice.call(document.querySelectorAll("#sheet .sheetbox input")).filter(isNum);}

function build(){
  pad=document.createElement("div");pad.className="kpad";pad.setAttribute("role","group");pad.setAttribute("aria-label",t("Number keypad"));
  var k=function(v,l,cls,aria){return '<button type="button" class="kp'+(cls?" "+cls:"")+'" data-kp="'+v+'"'+(aria?' aria-label="'+aria+'"':'')+'>'+l+'</button>';};
  pad.innerHTML='<div class="kpad-g">'
   +k("1","1")+k("2","2")+k("3","3")+k("bs",'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6h11v12H9l-6-6z"/><path d="M12 10l4 4M16 10l-4 4"/></svg>',"fn",t("Delete"))
   +k("4","4")+k("5","5")+k("6","6")+k("next",t("Next"),"fn kp-next")
   +k("7","7")+k("8","8")+k("9","9")+k("done",t("Done"),"fn kp-done")
   +k(".",".","kp-dot")+k("0","0","kp-zero")
   +'</div>';
  document.body.appendChild(pad);
  /* The key presses its key on touch, not on the click after it: quick to type, and
     the field keeps the focus. */
  pad.addEventListener("pointerdown",function(ev){
    var b=ev.target.closest&&ev.target.closest("[data-kp]");ev.preventDefault();if(!b)return;
    press(b.getAttribute("data-kp"));});}

function setVal(v){
  if(!field)return;
  field.value=v;
  field.dispatchEvent(new Event("input",{bubbles:true}));}
function press(k){
  if(!field||!field.isConnected){hide();return;}
  tap("light");
  var v=String(field.value||"");
  /* The first digit or point on a field just opened replaces what it held (shown selected),
     as typing over a selection does; Delete edits it instead. */
  if(fresh&&(k==="."||/^[0-9]$/.test(k)))v="";
  if(k!=="next"&&k!=="done")fresh=false;
  if(k==="bs")setVal(v.slice(0,-1));
  else if(k==="done"){field.dispatchEvent(new Event("change",{bubbles:true}));field.blur();}
  else if(k==="next"){var f=fields(),i=f.indexOf(field);field.dispatchEvent(new Event("change",{bubbles:true}));
    if(i>=0&&i<f.length-1)open(f[i+1]);else field.blur();}
  else if(k==="."){if(whole(field)||v.indexOf(".")>=0)return;setVal((v||"0")+".");}
  else{if(v==="0")v="";if(v.replace(".","").length>=7)return;setVal(v+k);}}

/* The room the keypad takes, given to the sheet in the same motion it rises in. */
var moveT=0;
function room(on){
  var r=document.documentElement,ih=window.innerHeight;
  /* The sheet eases to its new room only while the keypad moves, with the keypad. */
  r.classList.add("kpad-move");clearTimeout(moveT);moveT=setTimeout(function(){r.classList.remove("kpad-move");},700);
  r.classList.toggle("kpad-on",on);
  r.style.setProperty("--vvh",Math.round(on?ih-H:ih)+"px");
  r.style.setProperty("--kbh",(on?H:0)+"px");
  if(!on)r.style.setProperty("--vvt","0px");}
function show(){
  if(!pad)build();
  pad.querySelector(".kp-next").hidden=fields().length<2;
  pad.querySelector(".kp-dot").disabled=!!(field&&whole(field));
  if(pad.classList.contains("on"))return;
  pad.classList.add("on");
  H=pad.offsetHeight;room(true);}
function hide(){
  if(!pad||!pad.classList.contains("on"))return;
  pad.classList.remove("on");field=null;room(false);}
/* A field put in sight above the keypad, by scrolling only the sheet: clear of the
   sheet's own floating footer (its Save) and of its sticky head, once the sheet has made
   its room. */
function reveal(){
  setTimeout(function(){
    /* The field typed into now: a sheet redrawn in the meantime has put a new one in. */
    var el=field,box=el&&el.isConnected&&el.closest(".sheetbox");if(!box)return;
    var r=el.getBoundingClientRect(),limit=window.innerHeight-H,top=box.getBoundingClientRect().top;
    [].forEach.call(box.querySelectorAll(".sfoot,.wu-foot"),function(f){var fr=f.getBoundingClientRect();
      if(fr.height)limit=Math.min(limit,fr.top);});
    var hd=box.querySelector(".sheethead");if(hd)top=Math.max(top,hd.getBoundingClientRect().bottom);
    limit-=12;top+=12;
    if(r.bottom>limit)box.scrollBy({top:r.bottom-limit,behavior:"smooth"});
    else if(r.top<top)box.scrollBy({top:r.top-top,behavior:"smooth"});},460);}
function open(el){
  field=el;mark(el);
  if(document.activeElement!==el){try{el.focus({preventScroll:true});}catch(e){el.focus();}}
  /* What it holds selected: the first key types over it. */
  fresh=true;try{el.select();}catch(e){}
  show();reveal();}

function initKeypad(){
  if(!TOUCH)return;
  /* Before the browser can bring its own keyboard up: the field is marked first. */
  document.addEventListener("touchstart",function(ev){
    var el=ev.target&&ev.target.closest&&ev.target.closest("input");
    if(isNum(el))mark(el);},{passive:true,capture:true});
  document.addEventListener("focusin",function(ev){if(isNum(ev.target))open(ev.target);});
  document.addEventListener("focusout",function(ev){
    if(ev.target!==field)return;
    setTimeout(function(){if(!isNum(document.activeElement))hide();},0);});
  /* The sheet gone (closed, or redrawn without the field): the keypad goes with it. */
  /* A sheet redrawn while one is typed into puts the field back as it was written: marked
     again at once, so the phone's keyboard never takes over from the keypad. */
  new MutationObserver(function(){
    if(!field)return;
    if(!field.isConnected){var id=field.id,f=id?document.getElementById(id):null;
      if(f&&isNum(f)){field=f;mark(f);}else hide();return;}
    if(field.getAttribute("inputmode")!=="none"||field.type==="number")mark(field);})
    .observe(document.getElementById("sheet")||document.body,{childList:true,subtree:true,attributes:true,attributeFilter:["inputmode","type"]});}

/* For the tests. */
function keypadOn(){return !!(pad&&pad.classList.contains("on"));}
export {initKeypad, keypadOn};
