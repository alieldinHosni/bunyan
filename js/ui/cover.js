/* Bunyan — a program's cover, drawn from the program itself
   A program you build or bring in has no photograph, and borrowing another program's
   would say something untrue about it. So its cover is its own structure: one column
   per day of the cycle, one block per exercise laid course on course like a wall, the
   top block of each training day in the accent, and a rest day as a single low course.
   Two programs look different because they are different: three full days and four
   rests read nothing like six days of five.

   No text in it (the card carries the name in either language), no colour of its own
   (classes take the palette's tokens, see "Program covers" in index.html), and nothing
   to load: it is a few rectangles, so it works offline and costs nothing. */

var MAXB=8;   /* blocks a column can hold; a longer day stops at the top */

/* sp: a program ({days:[{ex:[…]}…]}). w, h: the drawing's size in its own units; it
   scales to whatever box holds it. */
function programCover(sp,w,h){
  w=w||180;h=h||100;
  var days=(sp&&sp.days||[]).slice(0,10),n=days.length||1;
  var pad=Math.round(h*.14),gap=Math.max(1.5,h*.03);
  var cw=(w-pad*2-gap*(n-1))/n,bh=(h-pad*2-gap*(MAXB-1))/MAXB;
  var r=function(v){return Math.round(v*10)/10;};
  var out='';
  days.forEach(function(d,i){
    var x=pad+i*(cw+gap),k=Math.min(MAXB,(d.ex||[]).length);
    if(!k){out+='<rect class="pc-r" x="'+r(x)+'" y="'+r(h-pad-bh)+'" width="'+r(cw)+'" height="'+r(bh)+'"/>';return;}
    for(var j=0;j<k;j++){
      var y=h-pad-(j+1)*bh-j*gap;
      out+='<rect class="'+(j===k-1?'pc-t':'pc-b')+'" x="'+r(x)+'" y="'+r(y)+'" width="'+r(cw)+'" height="'+r(bh)+'"/>';}
  });
  return '<svg class="pcov" viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">'
   +'<path class="pc-g" d="M'+pad+' '+r(h-pad+gap*1.5)+'H'+(w-pad)+'"/>'+out+'</svg>';}

export {programCover};
