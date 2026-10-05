/* Bunyan — more as you scroll
   A long list draws its first rows and a marker after them, [data-more="<list>"].
   When the marker comes within a screen of view, the list is given more rows and the
   screen is patched: the rows already there are kept, the new ones are added under
   them. The exercise library drew 120 rows with their photos on every keystroke and
   every filter tap, most of them never scrolled to; now it draws 40 and grows.

   How far each list has grown lives here, by name. A view asks for its count with
   shown(list, filterKey, step): a change of filters starts the list over. */

var COUNT={},KEY={},render=null,io=null;

function shown(list,key,step){
  if(KEY[list]!==key){KEY[list]=key;COUNT[list]=step;}
  return COUNT[list]||step;}

function grow(list,step){COUNT[list]=(COUNT[list]||0)+step;}

function onSeen(entries){
  entries.forEach(function(e){
    if(!e.isIntersecting)return;
    var el=e.target;io.unobserve(el);
    var list=el.getAttribute("data-more"),step=+el.getAttribute("data-step")||40;
    /* The marker is replaced by the render that grows the list; a second sighting of
       the same element before then would count twice. */
    if(el._more)return;el._more=true;
    grow(list,step);
    if(render)render();});}

/* After each render: watch whichever markers are on screen now. */
function bindMore(fn){
  render=fn;
  if(typeof IntersectionObserver==="undefined")return;
  if(!io)io=new IntersectionObserver(onSeen,{rootMargin:"0px 0px 100% 0px"});
  var els=document.querySelectorAll("#app [data-more]");
  for(var i=0;i<els.length;i++)if(!els[i]._moreSeen){els[i]._moreSeen=true;io.observe(els[i]);}}

export {bindMore, grow, shown};
