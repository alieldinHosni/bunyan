/* Bunyan — the coach chat in motion
   A question goes somewhere and an answer arrives. Sent from the box (or tapped as a
   suggestion), the question leaves the place it was typed or tapped and flies to its
   place in the conversation; then the coach is typing, three dots in a bubble; then the
   answer comes in, its parts one after another.

   The answer is already worked out and on the page when this starts (js/ui/views/
   chat.js): this only stages how it is shown, so a redraw in the middle simply shows
   it all, and with Animations off, or the system's reduced motion, nothing waits.

   land(from, text) after the render. from is the rectangle the question left from. */
import {isReduced} from "./motion.js";

/* The pace of a conversation (owner, 27 Oct: it was too quick to read as one): the
   question flies to its place; once it lands the coach starts typing, for longer the
   more it has to say; then the answer comes in, a part at a time. */
var FLY_MS=600,TYPE_AFTER=420,TYPING_MIN=1000,TYPING_MAX=2000;
function typingFor(a){return Math.min(TYPING_MAX,TYPING_MIN+(a.textContent||"").length*4);}
var token=0;

function off(){return isReduced()||document.body.classList.contains("noanim")||typeof Element.prototype.animate!=="function";}

/* Where the question starts from: the box being typed in, or the suggestion tapped. */
function fromEl(el){
  if(!el||!el.getBoundingClientRect)return null;
  var r=el.getBoundingClientRect();
  return {left:r.left,top:r.top,width:r.width,height:r.height};}

/* The conversation brought to the new question: its top a little under the header. In
   the floating Coach the conversation scrolls inside the panel (#cpB), and that is left
   to it. */
function bringUp(q){
  if(q&&!q.closest("#cpB"))window.scrollTo(0,Math.max(0,q.getBoundingClientRect().top+window.pageYOffset-72));}
/* Keeps what just appeared in view, gliding there: as much of the exchange as fits,
   from its question down. */
function follow(x){
  var b=x&&x.closest("#cpB");if(!b)return;
  var y=0,el=x;while(el&&el!==b){y+=el.offsetTop;el=el.offsetParent;}
  var top=Math.max(0,y-12),bottom=y+x.offsetHeight+12-b.clientHeight;
  var want=Math.min(top,Math.max(b.scrollTop,bottom));
  if(Math.abs(want-b.scrollTop)>2)try{b.scrollTo({top:want,behavior:"smooth"});}catch(e){b.scrollTop=want;}}

function land(from){
  var my=++token;
  requestAnimationFrame(function(){
    var xs=document.querySelectorAll(".chat-x"),x=xs[xs.length-1];
    var q=x&&x.querySelector(".chat-q"),a=x&&x.querySelector(".chat-a");
    bringUp(q);
    if(!q||!a||off())return;
    /* The answer waits; the dots come once the question has landed. */
    a.classList.add("wait");
    var dots=document.createElement("div");
    dots.className="chat-typing";dots.setAttribute("aria-hidden","true");
    dots.innerHTML="<i></i><i></i><i></i>";
    var typing=typingFor(a);
    /* The question flies from where it was typed or tapped. */
    var to=q.getBoundingClientRect();
    if(from&&to.width){
      q.style.visibility="hidden";
      var ghost=q.cloneNode(true);
      ghost.classList.add("chat-ghost");
      ghost.style.cssText="position:fixed;left:"+to.left+"px;top:"+to.top+"px;width:"+to.width+"px;margin:0;visibility:visible";
      document.body.appendChild(ghost);
      var dx=from.left+Math.min(from.width,to.width)/2-(to.left+to.width/2),dy=from.top+from.height/2-(to.top+to.height/2);
      var fly=ghost.animate([
        {transform:"translate("+dx+"px,"+dy+"px) scale(.86)",opacity:.35},
        {transform:"translate("+(dx*.35)+"px,"+(dy*.35-10)+"px) scale(1.02)",opacity:1,offset:.6},
        {transform:"none",opacity:1}],{duration:FLY_MS,easing:"cubic-bezier(.2,.8,.2,1)"});
      var done=function(){if(ghost.parentNode)ghost.parentNode.removeChild(ghost);q.style.visibility="";};
      fly.onfinish=done;fly.oncancel=done;
      setTimeout(done,FLY_MS+400);}
    else q.classList.add("pop");
    setTimeout(function(){
      if(my!==token){a.classList.remove("wait");return;}
      if(a.isConnected){a.parentNode.insertBefore(dots,a);follow(x);}},TYPE_AFTER);
    setTimeout(function(){
      if(my!==token&&dots.parentNode){dots.parentNode.removeChild(dots);a.classList.remove("wait");return;}
      if(dots.parentNode)dots.parentNode.removeChild(dots);
      /* Each part of the answer in turn: the header, the lines, the buttons. */
      [].forEach.call(a.children,function(c,i){c.style.setProperty("--i",i);});
      a.classList.remove("wait");a.classList.add("arrive");follow(x);
      setTimeout(function(){a.classList.remove("arrive");},1800);},TYPE_AFTER+typing);});}

export {fromEl, land};
