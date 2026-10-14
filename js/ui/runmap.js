/* Bunyan — the ground under a run, a walk, a ride or a hike
   A map drawn, not fetched: map tiles need a service, and Bunyan has none. It is not
   where you went; it is a ground that reads as the kind of place each one is done in,
   so the route on it reads as that:

     city     (a run) city blocks on a street grid turned a few degrees, two avenues
              wider than the rest, a river with its banks, a park or two with trees,
              building footprints inside the blocks
     park     (a walk) lawns and ponds, footpaths winding between them, trees along
              the paths, a row of houses at the edge
     country  (a ride) a patchwork of fields with hedgerows, long roads sweeping
              across with their centre lines, a river, a village or two
     trail    (a hike, a trail run) the contour lines of hills round their peaks,
              streams running down, woods in the valleys

   The same seed draws the same ground, so a session keeps it from the first second to
   the card on Training afterwards. Colours are the theme's (the .rm-* rules in
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

/* ---- the other grounds ------------------------------------------------------------ */
function f1(n){return n.toFixed(1);}
/* A closed smooth shape round (cx, cy), wandering by wob: a lawn, a pond, a contour. */
function blob(r,cx,cy,rx,ry,wob,n){
  var pts=[],ph=r()*6.28;n=n||12;
  for(var i=0;i<n;i++){var a=i/n*Math.PI*2,k=1+wob*Math.sin(a*2+ph)+wob*.7*(r()-.5);pts.push([cx+Math.cos(a)*rx*k,cy+Math.sin(a)*ry*k]);}
  return smooth(pts,true);}
/* A smooth line through points (Catmull-Rom as cubic Béziers), closed or open. */
function smooth(pts,close){
  var n=pts.length,d="M"+f1(pts[0][0])+" "+f1(pts[0][1]);
  for(var i=0;i<(close?n:n-1);i++){
    var p0=pts[close?(i-1+n)%n:Math.max(i-1,0)],p1=pts[i],p2=pts[(i+1)%n],p3=pts[close?(i+2)%n:Math.min(i+2,n-1)];
    d+="C"+f1(p1[0]+(p2[0]-p0[0])/6)+" "+f1(p1[1]+(p2[1]-p0[1])/6)+" "+f1(p2[0]-(p3[0]-p1[0])/6)+" "+f1(p2[1]-(p3[1]-p1[1])/6)+" "+f1(p2[0])+" "+f1(p2[1]);}
  return d+(close?"Z":"");}
/* A line wandering across the box from one side to the other, through k bends. */
function across(r,w,h,k,vertical){
  var pts=[];
  for(var i=0;i<=k;i++){var u=i/k;
    pts.push(vertical?[w*(.15+r()*.7),-30+u*(h+60)]:[-30+u*(w+60),h*(.12+r()*.76)]);}
  return pts;}
function bg(w,h){return '<rect class="rm-bg" x="-40" y="-40" width="'+(w+80)+'" height="'+(h+80)+'"/>';}

/* A park, for a walk. */
function parkGround(w,h,seed,scale){
  scale=scale||1;var r=rng(seed+101),out=bg(w,h),lawn="",pond="",path="",tree="",house="";
  for(var i=0;i<5;i++)lawn+='<path d="'+blob(r,w*(.1+r()*.8),h*(.1+r()*.8),w*(.16+r()*.14),h*(.14+r()*.14),.18)+'"/>';
  var px=w*(.3+r()*.4),py=h*(.3+r()*.4),prx=w*(.1+r()*.05),pry=h*(.08+r()*.05);
  pond+='<path d="'+blob(r,px,py,prx,pry,.22,10)+'"/>';
  /* paths: one round the pond, three across, each winding */
  path+='<path d="'+blob(r,px,py,prx*1.45,pry*1.6,.1,10)+'"/>';
  for(var j=0;j<3;j++){var a=across(r,w,h,4,j===1);path+='<path d="'+smooth(a,false)+'"/>';
    a.forEach(function(q,k){if(k&&k<a.length-1)for(var m=0;m<3;m++)tree+='<circle cx="'+f1(q[0]+(r()-.5)*30*scale)+'" cy="'+f1(q[1]+(r()-.5)*30*scale)+'" r="'+f1((2+r()*2.4)*scale)+'"/>';});}
  for(var t=0;t<26;t++)tree+='<circle cx="'+f1(r()*w)+'" cy="'+f1(r()*h)+'" r="'+f1((1.6+r()*2.6)*scale)+'"/>';
  /* a row of houses along one edge */
  var top=r()<.5,hw=(14+r()*6)*scale;
  for(var x=-10;x<w+10;x+=hw+5*scale)house+='<rect x="'+f1(x)+'" y="'+f1(top?6*scale:h-(6+12)*scale)+'" width="'+f1(hw)+'" height="'+f1(12*scale)+'" rx="'+f1(1.5*scale)+'"/>';
  return out+'<g class="rm-park">'+lawn+'</g><g class="rm-pond">'+pond+'</g>'
   +'<g class="rm-path" style="stroke-width:'+f1(4*scale)+'px">'+path+'</g><g class="rm-tree">'+tree+'</g><g class="rm-bld">'+house+'</g>';}

/* Countryside, for a ride. */
function countryGround(w,h,seed,scale){
  scale=scale||1;var r=rng(seed+202),out=bg(w,h),field="",hedge="",road="",cl="",house="",tree="";
  var ang=r()*40-20,cx=w/2,cy=h/2,D=Math.ceil(Math.sqrt(w*w+h*h)/2)+30;
  /* fields: an uneven grid, turned, each a shade of the ground */
  var xs=[-D],ys=[-D];
  while(xs[xs.length-1]<D)xs.push(xs[xs.length-1]+(46+r()*60)*scale);
  while(ys[ys.length-1]<D)ys.push(ys[ys.length-1]+(38+r()*52)*scale);
  for(var i=0;i<xs.length-1;i++)for(var j=0;j<ys.length-1;j++){
    var g=1.5*scale,x=xs[i]+g,y=ys[j]+g,fw=xs[i+1]-xs[i]-2*g,fh=ys[j+1]-ys[j]-2*g;
    field+='<rect class="f'+(Math.floor(r()*3))+'" x="'+f1(x)+'" y="'+f1(y)+'" width="'+f1(fw)+'" height="'+f1(fh)+'"/>';
    if(r()<.45)hedge+='<path d="M'+f1(x)+' '+f1(y+fh)+'H'+f1(x+fw)+'"/>';
    if(r()<.18)for(var k=0;k<6;k++)tree+='<circle cx="'+f1(x+r()*fw)+'" cy="'+f1(y+fh-2*scale)+'" r="'+f1((1.6+r()*1.4)*scale)+'"/>';}
  var tr='transform="rotate('+ang.toFixed(1)+' '+cx+' '+cy+') translate('+cx+' '+cy+')"';
  /* roads: one main, two lanes, each sweeping right across */
  var roads=[across(r,w,h,3,false),across(r,w,h,3,true),across(r,w,h,4,r()<.5)];
  roads.forEach(function(a,n){var d=smooth(a,false);
    road+='<path d="'+d+'" style="stroke-width:'+f1((n?6:9)*scale)+'px"/>';if(!n)cl+='<path d="'+d+'"/>';});
  /* a village where the main road passes */
  var v=roads[0][1+Math.floor(r()*2)];
  for(var b=0;b<9;b++)house+='<rect x="'+f1(v[0]+(r()-.5)*60*scale)+'" y="'+f1(v[1]+(r()-.5)*44*scale)+'" width="'+f1((6+r()*6)*scale)+'" height="'+f1((5+r()*5)*scale)+'" rx="'+f1(1*scale)+'"/>';
  var riv=smooth(across(r,w,h,4,r()<.5),false),rw=(10+r()*6)*scale;
  return out+'<g '+tr+'><g class="rm-field">'+field+'</g><g class="rm-hedge" style="stroke-width:'+f1(1.4*scale)+'px">'+hedge+'</g><g class="rm-tree">'+tree+'</g></g>'
   +'<path class="rm-bank" d="'+riv+'" style="stroke-width:'+f1(rw+4*scale)+'px"/>'
   +'<path class="rm-river" d="'+riv+'" style="stroke-width:'+f1(rw)+'px"/>'
   +'<g class="rm-road">'+road+'</g><g class="rm-roadc">'+cl+'</g><g class="rm-bld">'+house+'</g>';}

/* Hills, for a hike or a trail run: contour lines round two or three peaks, every
   fifth one heavier, streams running down, woods low down, a mark on each summit. */
function trailGround(w,h,seed,scale){
  scale=scale||1;var r=rng(seed+303),out=bg(w,h),lines="",index="",peaks="",tree="",stream="";
  var n=2+Math.floor(r()*2);
  for(var p=0;p<n;p++){
    var cx=w*(.15+r()*.7),cy=h*(.15+r()*.7),rx0=(10+r()*8)*scale,step=(9+r()*5)*scale,ry=.7+r()*.4;
    for(var i=0;i<14;i++){
      var d='<path d="'+blob(r,cx,cy,rx0+i*step,(rx0+i*step)*ry,.13,12)+'"/>';
      if(i%5===4)index+=d;else lines+=d;}
    peaks+='<path d="M'+f1(cx)+' '+f1(cy-5*scale)+'L'+f1(cx+4.5*scale)+' '+f1(cy+3*scale)+'L'+f1(cx-4.5*scale)+' '+f1(cy+3*scale)+'Z"/>';
    /* a stream from below the summit, down and away */
    var a=r()*6.28,sp=[[cx+Math.cos(a)*rx0*2,cy+Math.sin(a)*rx0*2]];
    for(var k=1;k<6;k++){a+=(r()-.5)*.9;var q=sp[k-1];sp.push([q[0]+Math.cos(a)*42*scale,q[1]+Math.sin(a)*42*scale]);}
    stream+='<path d="'+smooth(sp,false)+'"/>';
    var last=sp[sp.length-1];
    for(var t=0;t<14;t++)tree+='<circle cx="'+f1(last[0]+(r()-.5)*70*scale)+'" cy="'+f1(last[1]+(r()-.5)*70*scale)+'" r="'+f1((1.6+r()*2)*scale)+'"/>';}
  return out+'<g class="rm-contour">'+lines+'</g><g class="rm-contour ix">'+index+'</g>'
   +'<g class="rm-stream" style="stroke-width:'+f1(2.2*scale)+'px">'+stream+'</g><g class="rm-tree">'+tree+'</g><g class="rm-peak">'+peaks+'</g>';}

/* The ground for a kind (js/data/activities.js says which is whose); a run's city
   when the kind is not known. */
var GROUNDS={park:parkGround,country:countryGround,trail:trailGround};
function groundFor(kind,w,h,seed,scale){
  var g=GROUNDS[kind];if(!g)return mapGround(w,h,seed,scale);
  var key=kind+":"+w+"x"+h+":"+seed+":"+(scale||1);if(CACHE[key])return CACHE[key];
  return (CACHE[key]=g(w,h,seed,scale));}

export {groundFor, mapGround, mapSeed};
