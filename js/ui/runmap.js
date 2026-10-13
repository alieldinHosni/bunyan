/* Bunyan — the ground under a run
   A map drawn, not fetched: city blocks on a street grid turned a few degrees, two
   avenues wider than the rest, a river crossing with its banks, a park or two with
   trees, and building footprints inside the blocks. It is not where the run was:
   map tiles need a service, and Bunyan has none. It is a ground that reads as a city
   at night, so the route on it reads as a run.

   The same seed draws the same city, so a run keeps its ground from the first second
   to the card on Training afterwards. Colours are the theme's (the .rm-* rules in
   index.html); nothing here names one. */

/* A small seeded random: the same seed, the same numbers, everywhere. */
function rng(seed){
  var a=seed>>>0||1;
  return function(){a=a+0x6D2B79F5>>>0;var t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
/* A run's seed: the second it started, or for a saved one its first point. */
function mapSeed(o){
  if(o&&o.started)return Math.floor(o.started/1000)%2147483647;
  var p=o&&o.route&&o.route[0];
  return p?(Math.floor(Math.abs(p[0])*1e5)*31+Math.floor(Math.abs(p[1])*1e5))%2147483647:7;}

var CACHE={};
/* The ground as SVG markup for a w × h box. scale shrinks the blocks for a small
   drawing (the card on Training) so it still reads as a city. */
function mapGround(w,h,seed,scale){
  scale=scale||1;
  var key=w+"x"+h+":"+seed+":"+scale;if(CACHE[key])return CACHE[key];
  var r=rng(seed),ang=r()*28-14,cx=w/2,cy=h/2,rad=ang*Math.PI/180,co=Math.cos(rad),si=Math.sin(rad);
  var D=Math.ceil(Math.sqrt(w*w+h*h)/2)+24;
  /* Streets, in the grid's own turned frame, centred on the box. */
  var xs=[],ys=[],v=-D;
  while(v<D){xs.push(v);v+=(30+Math.floor(r()*24))*scale;}xs.push(v);
  v=-D;while(v<D){ys.push(v);v+=(24+Math.floor(r()*18))*scale;}ys.push(v);
  var avX=[Math.floor(xs.length*.32),Math.floor(xs.length*.71)],avY=[Math.floor(ys.length*.55)];
  var gap=3.2*scale,avGap=6*scale;
  /* The river, in the box's frame: in at one side, out at the other, two bends. */
  var y0=h*(.18+r()*.64),y1=h*(.18+r()*.64),b1=h*(r()*1.2-.1),b2=h*(r()*1.2-.1);
  var river="M-30 "+y0.toFixed(1)+"C"+(w*.3).toFixed(1)+" "+b1.toFixed(1)+" "+(w*.62).toFixed(1)+" "+b2.toFixed(1)+" "+(w+30)+" "+y1.toFixed(1);
  var rw=(18+r()*10)*scale,rv=[];
  for(var k=0;k<=40;k++){var tt=k/40,u=1-tt;
    rv.push([u*u*u*-30+3*u*u*tt*w*.3+3*u*tt*tt*w*.62+tt*tt*tt*(w+30),u*u*u*y0+3*u*u*tt*b1+3*u*tt*tt*b2+tt*tt*tt*y1]);}
  function nearRiver(px,py,m){
    for(var q=0;q<rv.length;q++){var dx=rv[q][0]-px,dy=rv[q][1]-py;if(dx*dx+dy*dy<m*m)return true;}
    return false;}
  function toBox(x,y){return [cx+x*co-y*si,cy+x*si+y*co];}
  var blocks="",builds="",parks="",trees="";
  for(var i=0;i<xs.length-1;i++)for(var j=0;j<ys.length-1;j++){
    var gl=avX.indexOf(i)>=0?avGap:gap,gr=avX.indexOf(i+1)>=0?avGap:gap,gt=avY.indexOf(j)>=0?avGap:gap,gb=avY.indexOf(j+1)>=0?avGap:gap;
    var x=xs[i]+gl,y=ys[j]+gt,bw=xs[i+1]-gr-x,bh=ys[j+1]-gb-y;
    if(bw<6||bh<6)continue;
    var c=toBox(x+bw/2,y+bh/2);
    if(c[0]<-40||c[0]>w+40||c[1]<-40||c[1]>h+40)continue;
    var half=Math.sqrt(bw*bw+bh*bh)/2;
    if(nearRiver(c[0],c[1],rw/2+half*.8))continue;
    var rr=(2.2*scale).toFixed(1),roll=r();
    if(roll<.09){
      parks+='<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+bh.toFixed(1)+'" rx="'+(4*scale).toFixed(1)+'"/>';
      var nt=3+Math.floor(r()*5);
      for(var n=0;n<nt;n++)trees+='<circle cx="'+(x+3+r()*(bw-6)).toFixed(1)+'" cy="'+(y+3+r()*(bh-6)).toFixed(1)+'" r="'+((1.4+r()*1.6)*scale).toFixed(1)+'"/>';
      continue;}
    blocks+='<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+bh.toFixed(1)+'" rx="'+rr+'"/>';
    /* Buildings: a block split into two or three footprints along its long side, some
       left as yards. */
    var parts=bw>bh?(bw>34*scale?3:2):(bh>30*scale?2:1),along=bw>bh;
    for(var p=0;p<parts;p++){
      if(r()<.22)continue;
      var inset=2*scale,len=(along?bw:bh)/parts,
        px=along?x+p*len+inset:x+inset,py=along?y+inset:y+p*len+inset,
        pw=along?len-inset*2:bw-inset*2,ph=along?bh-inset*2:len-inset*2;
      if(pw<3||ph<3)continue;
      builds+='<rect x="'+px.toFixed(1)+'" y="'+py.toFixed(1)+'" width="'+pw.toFixed(1)+'" height="'+ph.toFixed(1)+'" rx="'+(1.2*scale).toFixed(1)+'"/>';}}
  var tr='rotate('+ang.toFixed(1)+' '+cx+' '+cy+')',T=' transform="translate('+cx+' '+cy+')"';
  /* Avenues over everything but the route: they cross the river as bridges. */
  var av="";
  avX.forEach(function(a){var xx=xs[a].toFixed(1);av+='<path d="M'+xx+' '+(-D)+'V'+D+'"/>';});
  avY.forEach(function(a){var yy=ys[a].toFixed(1);av+='<path d="M'+(-D)+' '+yy+'H'+D+'"/>';});
  var out='<rect class="rm-bg" x="-40" y="-40" width="'+(w+80)+'" height="'+(h+80)+'"/>'
   +'<g transform="'+tr+'"><g'+T+'><g class="rm-blk">'+blocks+'</g><g class="rm-bld">'+builds+'</g>'
   +'<g class="rm-park">'+parks+'</g><g class="rm-tree">'+trees+'</g></g></g>'
   +'<path class="rm-bank" d="'+river+'" style="stroke-width:'+(rw+5*scale).toFixed(1)+'px"/>'
   +'<path class="rm-river" d="'+river+'" style="stroke-width:'+rw.toFixed(1)+'px"/>'
   +'<path class="rm-ripple" d="'+river+'"/>'
   +'<g transform="'+tr+'"><g'+T+' class="rm-av" style="stroke-width:'+(avGap*1.5).toFixed(1)+'px">'+av+'</g></g>';
  CACHE[key]=out;
  return out;}

export {mapGround, mapSeed};
