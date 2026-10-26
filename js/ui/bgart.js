/* Bunyan — the ground's drawings
   Behind the glass, a drawing for each page, still and quiet, in the same paint as the
   app's other drawings (js/ui/art.js): a main line that runs from the theme's highlight
   into its accent, a fainter second line, closed shapes filled with the accent's glass,
   a few embers. They are made of the brand's own subjects and each page's own:

     train     the owner's horseman at dusk over the river: the owner's own picture,
               one per theme (img/ground-red, -blue, -sage), not a drawing
     food      the harvest: wheat rising from the ground, an olive branch reaching in
     coach     the guide: a compass whose needle is the mark's sword, under a
               constellation
     progress  the ground climbed: contour lines round two rises, and the line that
               climbs to the summit
     profile   the mane: the horse's long strokes swept across the page

   They lie on the ground layer and under everything else (#bgart in index.html), so
   the frosted cards show them softened. Their colours are CSS variables (--bga, --bgb,
   set on #bgart from the theme), so a change of theme or mode repaints them for free.
   Built once per page from a few generators, then kept; nothing here runs per frame. */

var W=390,H=844;
/* a small fixed random, so the same page always draws the same */
function rnd(seed){var x=seed;return function(){x=(x*1103515245+12345)%2147483648;return x/2147483648;};}
function f(n){return Math.round(n*10)/10;}
function path(cls,d,extra){return '<path class="'+cls+'" d="'+d+'"'+(extra||'')+'/>';}
function ember(x,y,r){return '<circle class="e" cx="'+f(x)+'" cy="'+f(y)+'" r="'+f(r)+'"/>';}
/* a circle as a path, so it takes the path classes */
function circle(cx,cy,r){return "M"+f(cx-r)+" "+f(cy)+"A"+f(r)+" "+f(r)+" 0 1 0 "+f(cx+r)+" "+f(cy)+"A"+f(r)+" "+f(r)+" 0 1 0 "+f(cx-r)+" "+f(cy);}

/* A smooth line through points (Catmull-Rom as cubic Béziers). */
function smoothPath(pts,close){
  var n=pts.length,d="M"+f(pts[0][0])+" "+f(pts[0][1]);
  for(var i=0;i<(close?n:n-1);i++){
    var p0=pts[(i-1+n)%n],p1=pts[i],p2=pts[(i+1)%n],p3=pts[(i+2)%n];
    if(!close){p0=pts[Math.max(i-1,0)];p3=pts[Math.min(i+2,n-1)];}
    d+="C"+f(p1[0]+(p2[0]-p0[0])/6)+" "+f(p1[1]+(p2[1]-p0[1])/6)+" "+f(p2[0]-(p3[0]-p1[0])/6)+" "+f(p2[1]-(p3[1]-p1[1])/6)+" "+f(p2[0])+" "+f(p2[1]);}
  return d+(close?"Z":"");}
/* An organic ring around (cx, cy): a circle that wanders by wob. */
function ring(cx,cy,rx,ry,wob,seed,n){
  var r=rnd(seed),pts=[];n=n||10;
  var ph=r()*6.28;
  for(var i=0;i<n;i++){
    var a=i/n*Math.PI*2,k=1+wob*Math.sin(a*2+ph)+wob*.6*(r()-.5);
    pts.push([cx+Math.cos(a)*rx*k,cy+Math.sin(a)*ry*k]);}
  return smoothPath(pts,true);}
/* A wheat stalk from its foot, leaning by lean, with its ear of grains and awns. */
function wheat(x,y,h,lean,seed){
  var r=rnd(seed),out="",top=[x+lean,y-h];
  out+=path("a","M"+f(x)+" "+f(y)+"Q"+f(x+lean*.2)+" "+f(y-h*.55)+" "+f(top[0])+" "+f(top[1]));
  /* the leaf, a long blade off the stalk */
  out+=path("b","M"+f(x+lean*.08)+" "+f(y-h*.28)+"Q"+f(x-lean*.9-18)+" "+f(y-h*.42)+" "+f(x-lean*.5-30)+" "+f(y-h*.62));
  for(var i=0;i<7;i++){
    var t=.62+i*.055,gx=x+lean*t*t*1.05,gy=y-h*t,side=i%2?1:-1,s=6.5-i*.35;
    var cx=gx+side*5.5,cy=gy+1;
    out+=path("a c","M"+f(gx)+" "+f(gy+3)+"Q"+f(cx+side*3)+" "+f(cy-1)+" "+f(cx+side*1.5)+" "+f(cy-s-2)
      +"Q"+f(gx+side*.5)+" "+f(gy-2)+" "+f(gx)+" "+f(gy+3)+"Z");
    out+=path("b","M"+f(cx+side*1.5)+" "+f(cy-s-2)+"L"+f(cx+side*(6+r()*4))+" "+f(cy-s-14-r()*6));}
  return out;}
/* An olive branch from (x, y), bending along bend, with its leaves and a few olives. */
function olive(x,y,len,ang,bend,seed){
  var r=rnd(seed),out="",pts=[];
  for(var i=0;i<=6;i++){var t=i/6,a=ang+bend*t;pts.push([x+Math.cos(a)*len*t,y+Math.sin(a)*len*t]);}
  out+=path("a",smoothPath(pts));
  for(var j=1;j<11;j++){
    var t=j/11,k=Math.floor(t*6),p=pts[k],q=pts[Math.min(k+1,6)],u=t*6-k;
    var px=p[0]+(q[0]-p[0])*u,py=p[1]+(q[1]-p[1])*u,a2=Math.atan2(q[1]-p[1],q[0]-p[0])+(j%2?1:-1)*(.7+r()*.3);
    var L=22+r()*9,tx=px+Math.cos(a2)*L,ty=py+Math.sin(a2)*L,nx=-Math.sin(a2)*5.5,ny=Math.cos(a2)*5.5;
    var mx=(px+tx)/2,my=(py+ty)/2;
    out+=path(j%3?"a c":"b","M"+f(px)+" "+f(py)+"Q"+f(mx+nx)+" "+f(my+ny)+" "+f(tx)+" "+f(ty)+"Q"+f(mx-nx)+" "+f(my-ny)+" "+f(px)+" "+f(py)+"Z");
    if(j%4===2){var ox=px+Math.cos(a2+Math.PI)*9,oy=py+Math.sin(a2+Math.PI)*9;
      out+=path("a c","M"+f(ox-5)+" "+f(oy)+"A5 6 0 1 0 "+f(ox+5)+" "+f(oy)+"A5 6 0 1 0 "+f(ox-5)+" "+f(oy));}}
  return out;}
var BUILD={
  food:function(){
    var out="";
    out+=path("dsk",circle(70,760,130));
    out+=wheat(52,860,330,30,3)+wheat(96,872,380,64,8)+wheat(14,880,270,-6,13)+wheat(138,890,250,86,21);
    out+=olive(420,96,300,Math.PI*.82,.55,5);
    out+=olive(408,300,150,Math.PI*.92,-.35,9);
    out+=path("b","M-10 640C70 600 150 610 230 650S360 700 400 660");
    [[210,360,1.3],[250,420,1.1],[180,470,1.4],[300,520,1.1],[330,600,1.3],[230,560,1]].forEach(function(e){out+=ember(e[0],e[1],e[2]);});
    return out;},
  coach:function(){
    var out="",cx=300,cy=170,R=86;
    out+=path("dsk",circle(cx,cy,R*1.6));
    [R,R*.78,R*1.18].forEach(function(r,i){out+=path(i?"b":"a",circle(cx,cy,r));});
    /* the rose: four long points and four short */
    var pts=[];for(var i=0;i<16;i++){var a=i/16*Math.PI*2-Math.PI/2,rr=i%4===0?R*.95:i%2===0?R*.5:R*.22;pts.push([cx+Math.cos(a)*rr,cy+Math.sin(a)*rr]);}
    out+=path("a c","M"+pts.map(function(p){return f(p[0])+" "+f(p[1]);}).join("L")+"Z");
    /* the sword as the needle, pointing north-east */
    out+='<g transform="rotate(38 '+cx+' '+cy+')">'+path("a","M"+cx+" "+(cy-R*1.05)+"L"+(cx+5)+" "+(cy-R*.9)+"V"+(cy+R*.55)+"H"+(cx-5)+"V"+(cy-R*.9)+"Z")
      +path("a","M"+(cx-16)+" "+(cy+R*.58)+"Q"+cx+" "+(cy+R*.5)+" "+(cx+16)+" "+(cy+R*.58)+"M"+cx+" "+(cy+R*.56)+"V"+(cy+R*.8))
      +path("a c",circle(cx,cy+R*.86,6))+'</g>';
    /* a constellation across the top left, and one low */
    var st=[[30,90],[78,60],[128,96],[112,150],[170,128]],st2=[[40,620],[96,580],[150,612],[210,570],[262,640]];
    out+=path("b","M"+st.map(function(p){return p.join(" ");}).join("L"));
    out+=path("b","M"+st2.map(function(p){return p.join(" ");}).join("L"));
    st.concat(st2).forEach(function(p,i){out+=ember(p[0],p[1],i%3?1.4:2);});
    /* the orbit of the path ahead */
    out+=path("b","M-40 760C80 700 200 720 300 780S420 860 440 820");
    out+=path("b","M-40 800C90 740 210 760 310 820");
    return out;},
  progress:function(){
    var out="";
    out+=path("dsk",circle(300,640,140));
    /* contour lines of the ground climbed, round a summit low on the right */
    for(var i=0;i<8;i++)out+=path(i<2?"a":"b",ring(300,640,22+i*30,17+i*24,.12,40+i,11));
    /* and a second, smaller rise high on the left */
    for(var k=0;k<4;k++)out+=path("b",ring(40,190,24+k*26,20+k*20,.14,70+k,10));
    /* the rising line, climbing to the summit, with its steps marked */
    out+=path("a","M-10 470C50 462 84 436 126 428S196 392 232 372S288 338 300 330");
    out+=path("b","M300 330C320 318 356 300 400 292");
    [[126,428,2],[232,372,2],[300,330,2.4],[60,90,1.2],[200,70,1],[330,130,1.3],[360,500,1.1]].forEach(function(e){out+=ember(e[0],e[1],e[2]);});
    return out;},
  profile:function(){
    var out="";
    /* the mane: long strokes swept from the top right down across the page */
    for(var i=0;i<9;i++){
      var y0=-40+i*34,sw=i*16;
      out+=path(i%3===0?"a":"b","M"+(420)+" "+y0+"C"+(300-sw*.2)+" "+(y0+90+sw*.3)+" "+(200-sw*.3)+" "+(y0+120+sw)+" "+(60-sw*.4)+" "+(y0+260+sw*1.2));}
    out+=path("dsk",circle(320,120,100));
    [[330,90,1.6],[270,170,1.2],[120,300,1.1],[60,420,1.4],[200,520,1]].forEach(function(e){out+=ember(e[0],e[1],e[2]);});
    return out;}};
/* The drawing's own paint. The app's art paint (#artStroke and the rest, in index.html)
   takes its colours where it is defined, at the top of the page; these sit inside the
   drawing, so they take the ground's own pair, --bga (the line) and --bgb (where it
   fades to), which a theme can set apart from its accent (Sage light draws in white).
   The line runs down the whole page, light at the top into the deeper colour below. */
var DEFS='<defs>'
  +'<linearGradient id="bgaStroke" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="'+H+'">'
  +'<stop offset="0" style="stop-color:var(--bga)"/><stop offset=".45" style="stop-color:var(--bga)"/><stop offset="1" style="stop-color:var(--bgb)"/></linearGradient>'
  +'<linearGradient id="bgaFill" x1="0" y1="0" x2="0" y2="1">'
  +'<stop offset="0" style="stop-color:var(--bga);stop-opacity:.32"/><stop offset=".6" style="stop-color:var(--bgb);stop-opacity:.1"/><stop offset="1" style="stop-color:var(--bgb);stop-opacity:0"/></linearGradient>'
  +'<linearGradient id="bgaHill" x1="0" y1="0" x2="0" y2="1">'
  +'<stop offset="0" style="stop-color:var(--bga);stop-opacity:.34"/><stop offset="1" style="stop-color:var(--bgb);stop-opacity:0"/></linearGradient>'
  +'<radialGradient id="bgaGlow">'
  +'<stop offset="0" style="stop-color:var(--bga);stop-opacity:.6"/><stop offset=".4" style="stop-color:var(--bga);stop-opacity:.2"/><stop offset="1" style="stop-color:var(--bgb);stop-opacity:0"/></radialGradient>'
  +'</defs>';
var CACHE={},shown="";
/* The drawing for a page, as markup. */
function bgArt(key){
  /* Training's ground is the owner's horseman at dusk: the picture itself, rendered in
     depth, not redrawn flat. Which one is the theme's (index.html, #bgart .photo), so a
     change of theme swaps it without a rebuild. */
  if(key==="train")return '<div class="art photo bgart-train" aria-hidden="true"></div>';
  if(!BUILD[key])return "";
  if(!CACHE[key])CACHE[key]='<svg class="art bgart-'+key+'" viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">'+DEFS+BUILD[key]()+'</svg>';
  return CACHE[key];}
/* Called by every render: puts the page's drawing on the ground when the page changes. */
function syncBgArt(key){
  var el=document.getElementById("bgart");
  if(!el||key===shown)return;
  shown=key;el.innerHTML=bgArt(key);
  el.setAttribute("data-page",key||"");}
/* For the tests. */
function bgArtKey(){return shown;}
export {bgArt, syncBgArt, bgArtKey};
