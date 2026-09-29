/* Bunyan — reorder
   Drag a row by its grip ([data-grip]) to move it within its list. The row lifts and
   follows the finger; the rows it passes slide aside to show where it will land; on
   release the new position is handed to the app, which saves it and re-renders.

   Pointer events, so one path serves touch, mouse and pen. The grip carries
   touch-action:none, which is what stops iOS reading the same drag as a scroll. The
   page scrolls itself while a row is held near the top or bottom edge, so a row can
   be carried past what fits on screen. */

var drag=null, onDrop=null, onLift=null;
function initReorder(drop,lift){ onDrop=drop; onLift=lift; }

function rowsOf(list){
  return [].slice.call(list.children).filter(function(r){return r.hasAttribute("data-rowid");});}

/* Where the held row's centre is now, measured against where every row started. */
function target(){
  var c=drag.r0.top+drag.r0.height/2+drag.dy, to=drag.from;
  drag.rects.forEach(function(r,i){
    var mid=r.top+r.height/2;
    if(i<drag.from&&c<mid)to=Math.min(to,i);
    if(i>drag.from&&c>mid)to=Math.max(to,i);});
  return to;}

function paint(){
  var d=drag, step=d.r0.height+d.gap;
  d.row.style.transform="translateY("+d.dy+"px) scale(1.02)";
  d.rows.forEach(function(r,i){
    if(i===d.from)return;
    var s=0;
    if(d.from<d.to&&i>d.from&&i<=d.to)s=-step;
    if(d.to<d.from&&i>=d.to&&i<d.from)s=step;
    r.style.transform=s?"translateY("+s+"px)":"";});}

/* Held near an edge, the page scrolls under the row and the row keeps pace with it. */
function edgeScroll(){
  if(!drag)return;
  var y=drag.y, h=window.innerHeight, v=0;
  if(y<90)v=-Math.ceil((90-y)/6);
  else if(y>h-150)v=Math.ceil((y-(h-150))/6);
  if(v){
    var before=window.scrollY;
    window.scrollBy(0,v);
    var moved=window.scrollY-before;
    if(moved){drag.dy+=moved;drag.scrolled+=moved;drag.to=target();paint();}}
  drag.raf=requestAnimationFrame(edgeScroll);}

document.addEventListener("pointerdown",function(ev){
  if(drag||ev.button>0)return;
  var g=ev.target.closest&&ev.target.closest("[data-grip]");
  if(!g)return;
  var row=g.closest("[data-rowid]"),list=row&&row.parentNode;
  if(!list)return;
  ev.preventDefault();
  var rows=rowsOf(list),rects=rows.map(function(r){return r.getBoundingClientRect();});
  var from=rows.indexOf(row);
  var gap=rects.length>1?Math.max(0,(from+1<rects.length?rects[from+1].top-rects[from].bottom:rects[from].top-rects[from-1].bottom)):0;
  drag={id:row.getAttribute("data-rowid"),row:row,list:list,rows:rows,rects:rects,r0:rects[from],
    from:from,to:from,gap:gap,y0:ev.clientY,y:ev.clientY,dy:0,scrolled:0,pid:ev.pointerId,grip:g,moved:false};
  try{g.setPointerCapture(ev.pointerId);}catch(e){}
  row.classList.add("lifted");list.classList.add("sorting");
  if(onLift)onLift();
  drag.raf=requestAnimationFrame(edgeScroll);
},{passive:false});

document.addEventListener("pointermove",function(ev){
  if(!drag||ev.pointerId!==drag.pid)return;
  ev.preventDefault();
  drag.y=ev.clientY;
  drag.dy=ev.clientY-drag.y0+drag.scrolled;
  if(Math.abs(drag.dy)>4)drag.moved=true;
  drag.to=target();
  paint();
},{passive:false});

function finish(commit){
  if(!drag)return;
  var d=drag;drag=null;
  cancelAnimationFrame(d.raf);
  try{d.grip.releasePointerCapture(d.pid);}catch(e){}
  d.rows.forEach(function(r){r.style.transform="";});
  d.row.classList.remove("lifted");d.list.classList.remove("sorting");
  if(commit&&d.to!==d.from&&onDrop)onDrop(d.id,d.to);}
document.addEventListener("pointerup",function(ev){if(drag&&ev.pointerId===drag.pid)finish(true);});
document.addEventListener("pointercancel",function(ev){if(drag&&ev.pointerId===drag.pid)finish(false);});
/* A long press on iOS would otherwise open the text-selection loupe over the list. */
document.addEventListener("contextmenu",function(ev){
  if(ev.target.closest&&ev.target.closest("[data-grip]"))ev.preventDefault();});

export {initReorder};
