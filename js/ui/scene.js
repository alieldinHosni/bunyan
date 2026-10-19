/* Bunyan — the horseman at dusk
   The owner's picture, drawn for the ground of Training: a rider in a long cape on a rock
   beside an obelisk, looking out over palms and a river to a city under the last of the
   light, mountains behind. Drawn rather than placed as a photograph so it is sharp on any
   screen, weighs a few kilobytes, and takes each theme's own colours (the photograph came
   in red, blue and green; here Red, Blue and Sage, dark and light).

   Everything is one ink, the ground's own darkest tone (--sc-ink), at a strength that
   falls with distance, the way air pales what is far away: the rock, the obelisk and the
   rider in full, the palms a little less, the city and the mountains least. The light is
   the theme's highlight (--bga): the glow over the horizon, a rim along the edges that
   face it, the city's windows and their reflection in the water. In light mode the ink is
   the theme's deep colour, softer (index.html, #bgart). The rider is traced from the
   owner's picture; the rest is drawn here, with a small fixed random so it never changes.

   Pure: markup in, markup out (js/ui/bgart.js puts it on the ground). */
var W=390,H=844;
function rnd(seed){var x=seed;return function(){x=(x*1103515245+12345)%2147483648;return x/2147483648;};}
function f(n){return Math.round(n*10)/10;}
function smooth(pts,close){
  var n=pts.length,d="M"+f(pts[0][0])+" "+f(pts[0][1]);
  for(var i=0;i<(close?n:n-1);i++){
    var p0=pts[(i-1+n)%n],p1=pts[i],p2=pts[(i+1)%n],p3=pts[(i+2)%n];
    if(!close){p0=pts[Math.max(i-1,0)];p3=pts[Math.min(i+2,n-1)];}
    d+="C"+f(p1[0]+(p2[0]-p0[0])/6)+" "+f(p1[1]+(p2[1]-p0[1])/6)+" "+f(p2[0]-(p3[0]-p1[0])/6)+" "+f(p2[1]-(p3[1]-p1[1])/6)+" "+f(p2[0])+" "+f(p2[1]);}
  return d+(close?"Z":"");}
function el(tag,cls,attrs){return '<'+tag+(cls?' class="'+cls+'"':'')+(attrs||'')+'/>';}
function p(cls,d,extra){return el("path",cls,' d="'+d+'"'+(extra||''));}

/* The rider and horse, facing right, traced from the picture: (0,0) is the back of the
   cape's hem line at the ground, y up is negative. About 207 wide and 259 tall. */
var RIDER="124.7,-244.7 122.3,-244.7 118.3,-240.7 110,-237.3 106.7,-232.3 105,-221 103,-219.3 98.3,-219 95.7,-213.3 92,-212.3 83,-204.3 74.3,-184.7 60,-164.7 32.3,-150.7 0,-131 18,-116 25.7,-103 26.7,-96 23,-79 20.7,-59.7 20,-34.7 21.3,-25.3 23.3,-24.3 27.3,-27.3 35,-42.7 36.3,-42.3 37.3,-3 38.3,-2.3 47.3,-2.3 48.7,-3.7 48,-29.3 50.7,-46.3 53.7,-53.3 55.3,-54 56.7,-46.3 58,-3 69,-2.7 70,-4.3 70,-14 71,-14.3 72.3,0 86,-0.3 88,-2.3 88,-6.3 82.3,-27 82.7,-34 94,-50 99.3,-54 103.3,-60.3 106,-62.3 111,-62.3 116.7,-61 129.3,-61.3 131.7,-58 135,-43 134,-28.7 135,-18 130,0 149,0 148.7,-10 150,-17.3 154.7,-25.7 156.7,-38.7 166,-60 166.7,-65.3 172,-69 171.3,-74.7 175.3,-85.3 175.7,-90.7 174.3,-94.3 177,-96.7 177,-100.3 174.3,-104.3 171,-106 170,-110 172,-114 170.7,-119 172.3,-122 172.7,-130 175,-133 176,-144 177.7,-145.7 180.7,-145 186.3,-138.3 187.3,-134.3 182,-129.3 182,-127.7 190.7,-123 201.3,-125 205.7,-131 206,-139.3 200,-152.7 203,-170.3 198.7,-174.7 200.7,-177.7 198.7,-184.3 201,-191 200.7,-194.3 199,-194.3 194,-190 189.3,-191 188,-196 182.7,-192.7 175.7,-192.7 169,-191 159.3,-184.7 147.7,-171.7 144,-171.3 140,-177 140,-192.3 138.7,-199.3 132.7,-207.7 126.3,-212 129,-229 126.7,-234 126.3,-241";
function rider(x,y,s){
  var pts=RIDER.split(" ").map(function(q){var a=q.split(",");return [x+(+a[0])*s,y+(+a[1])*s];});
  return smooth(pts,true);}

/* A ridge across the page at height y, from the left to the right edge. */
function ridgePts(y,amp,seed,steps,x0,x1){
  var r=rnd(seed),pts=[];x0=x0==null?-20:x0;x1=x1==null?W+20:x1;
  for(var i=0;i<=steps;i++)pts.push([x0+i*(x1-x0)/steps,y-amp*(.25+.75*r())]);
  return pts;}

/* A date palm: a slim trunk leaning by lean, and a crown of fronds, each a stem that
   rises, arcs over and droops, feathered with leaflets that hang from both sides. The
   trunk is filled; the fronds are drawn as fine strokes (.sc-frond). */
function palm(x,y,h,lean,seed,cls){
  var r=rnd(seed),tx=x+lean,ty=y-h,w0=h*.016+.9,w1=h*.009+.6;
  var out=p(cls,"M"+f(x-w0)+" "+f(y)+"Q"+f(x+lean*.15-w0)+" "+f(y-h*.55)+" "+f(tx-w1)+" "+f(ty)
    +"L"+f(tx+w1)+" "+f(ty)+"Q"+f(x+lean*.15+w0)+" "+f(y-h*.55)+" "+f(x+w0)+" "+f(y)+"Z");
  var stems="",leaves="",n=13;
  for(var i=0;i<n;i++){
    var a=-Math.PI+.2+i*((Math.PI-.4)/(n-1))+(r()-.5)*.16;
    var up=-Math.sin(a),len=h*(.3+r()*.12)*(1-.18*up);
    var c1x=tx+Math.cos(a)*len*.55,c1y=ty-len*(.18+.42*up);
    var ex=tx+Math.cos(a)*len,ey=ty-len*(.05+.25*up)+len*(.42-.2*up)*(.7+r()*.5);
    stems+="M"+f(tx)+" "+f(ty)+"Q"+f(c1x)+" "+f(c1y)+" "+f(ex)+" "+f(ey);
    for(var j=2;j<=14;j++){
      var t=j/15,u=1-t;
      var bx=u*u*tx+2*u*t*c1x+t*t*ex,by=u*u*ty+2*u*t*c1y+t*t*ey;
      var dx=2*u*(c1x-tx)+2*t*(ex-c1x),dy=2*u*(c1y-ty)+2*t*(ey-c1y),dl=Math.hypot(dx,dy)||1;
      dx/=dl;dy/=dl;
      var L=len*.2*Math.pow(Math.sin(Math.PI*Math.min(t*1.15,1)),.6)+1;
      [1,-1].forEach(function(sd){
        /* forward along the stem, out to the side, and down with their weight */
        var vx=dx*.55-dy*sd*.8,vy=dy*.55+dx*sd*.8+.9,vl=Math.hypot(vx,vy);
        leaves+="M"+f(bx)+" "+f(by)+"l"+f(vx/vl*L)+" "+f(vy/vl*L);});}}
  out+=p("sc-frond "+cls,stems,' stroke-width="'+f(h*.012+.6)+'"')+p("sc-frond "+cls,leaves,' stroke-width=".7"');
  return out;}

/* The city on the far bank: blocks of different heights, a slender tower with its lit
   head, and windows lit at random. */
function city(x0,x1,y,seed){
  var r=rnd(seed),d="M"+f(x0)+" "+f(y),lights="",x=x0;
  while(x<x1){
    var w=6+r()*14,h=4+Math.pow(r(),2.2)*34;
    if(x>x0+(x1-x0)*.62&&x<x0+(x1-x0)*.7)h+=10;
    d+="V"+f(y-h)+"H"+f(x+w);
    var nl=Math.floor(h*w/90);
    for(var i=0;i<nl;i++)if(r()<.55)lights+=el("rect","sc-win",' x="'+f(x+1+r()*(w-3))+'" y="'+f(y-h+2+r()*(h-4))+'" width="1.3" height="1.3"');
    x+=w+(r()<.25?r()*6:0);
    if(x<x1)d+="V"+f(y-1-r()*3);}
  d+="V"+f(y)+"Z";
  /* the tower: a tall shaft and a flared head */
  var tx=x0+(x1-x0)*.78,ty=y-62;
  var tower="M"+f(tx-2.6)+" "+f(y)+"L"+f(tx-1.6)+" "+f(ty+10)+"L"+f(tx-4.2)+" "+f(ty+4)+"L"+f(tx-3.4)+" "+f(ty)
    +"H"+f(tx+3.4)+"L"+f(tx+4.2)+" "+f(ty+4)+"L"+f(tx+1.6)+" "+f(ty+10)+"L"+f(tx+2.6)+" "+f(y)+"Z"
    +"M"+f(tx-.6)+" "+f(ty)+"V"+f(ty-9)+"H"+f(tx+.6)+"V"+f(ty)+"Z";
  lights+=el("rect","sc-win",' x="'+f(tx-3)+'" y="'+f(ty+2)+'" width="6" height="1.4"');
  return {d:d+tower,lights:lights};}

function scene(){
  var r=rnd(29),out="",hz=676;
  out+='<defs>'
    +'<linearGradient id="scSky" x1="0" y1="0" x2="0" y2="1">'
    +'<stop offset="0" class="sc-s0"/><stop offset="'+f(hz/H-.3)+'" class="sc-s0"/><stop offset="'+f(hz/H-.08)+'" class="sc-s1"/><stop offset="'+(hz/H).toFixed(3)+'" class="sc-s2"/><stop offset="'+(hz/H+.03).toFixed(3)+'" class="sc-s1"/><stop offset="1" class="sc-s0"/></linearGradient>'
    +'<radialGradient id="scSun" cx="310" cy="'+(hz-6)+'" r="340" gradientUnits="userSpaceOnUse">'
    +'<stop offset="0" class="sc-g0"/><stop offset=".35" class="sc-g1"/><stop offset="1" class="sc-g2"/></radialGradient>'
    +'<linearGradient id="scWater" x1="0" y1="0" x2="0" y2="1">'
    +'<stop offset="0" class="sc-w0"/><stop offset="1" class="sc-w1"/></linearGradient>'
    +'<radialGradient id="scCloud"><stop offset="0" class="sc-c0"/><stop offset="1" class="sc-c1"/></radialGradient>'
    +'</defs>';
  /* the sky: the ground's own colours above, the light low over the horizon */
  out+=el("rect","sc-sky",' x="-20" y="0" width="'+(W+40)+'" height="'+H+'"');
  out+=el("rect","sc-sun",' x="-20" y="0" width="'+(W+40)+'" height="'+H+'"');
  /* banks of cloud, long and low, brightest towards the light */
  for(var k=0;k<22;k++){
    var cy=hz-300+Math.pow(r(),.8)*280,cx=-40+r()*470,rx=30+r()*120*(.6+(cy-(hz-300))/360),ry=3+r()*9;
    var near=1-Math.min(Math.hypot(cx-310,(cy-hz)*2.2)/420,1);
    out+=el("ellipse","sc-cloud",' cx="'+f(cx)+'" cy="'+f(cy)+'" rx="'+f(rx)+'" ry="'+f(ry)+'" fill-opacity="'+f(.35+.65*near)+'"');}
  /* everything standing in the light is one ink; in light mode the whole of it is
     softened at once (.sc-ink's opacity), so the nearer layers still hide the farther */
  out+='<g class="sc-ink">';
  /* the mountains, far and pale */
  out+=p("sc-far",smooth(ridgePts(hz-8,34,11,9))+"V"+(hz+2)+"H-20Z");
  out+=p("sc-far2",smooth(ridgePts(hz-2,18,23,12))+"V"+(hz+2)+"H-20Z");
  /* the city on the far bank */
  var c=city(150,W+10,hz,41);
  out+=p("sc-city",c.d)+'<g class="sc-lights">'+c.lights+'</g>';
  /* the river, with the light and the windows in it */
  out+=p("sc-water","M-20 "+hz+"H"+(W+20)+"V"+(H+10)+"H-20Z");
  var refl="";
  for(var i=0;i<34;i++){var y=hz+3+Math.pow(r(),1.5)*80,x=120+r()*270,w=3+r()*24*(1-(y-hz)/110);
    refl+="M"+f(x)+" "+f(y)+"h"+f(w);}
  out+=p("sc-refl",refl);
  /* the near bank on the right, under the palms */
  out+=p("sc-bank","M150 "+(hz+66)+"C190 "+(hz+56)+" 240 "+(hz+50)+" 290 "+(hz+45)+"S370 "+(hz+35)+" 410 "+(hz+33)+"V"+(H+10)+"H150Z");
  out+=palm(334,hz+52,100,-8,5,"sc-palm")+palm(296,hz+56,74,9,9,"sc-palm")+palm(374,hz+46,124,-16,13,"sc-palm")
    +palm(252,hz+56,50,5,17,"sc-palm2")+palm(404,hz+40,90,-24,21,"sc-palm2");
  /* the obelisk, tall at the left edge, its point catching the light */
  var ox=-14,ow=50,ot=hz-150,ob=H;
  out+=p("sc-near","M"+ox+" "+ob+"L"+(ox+5)+" "+(ot+34)+"L"+(ox+ow/2)+" "+ot+"L"+(ox+ow-5)+" "+(ot+34)+"L"+(ox+ow)+" "+ob+"Z");
  out+=p("sc-rim","M"+(ox+ow/2)+" "+ot+"L"+(ox+ow-5)+" "+(ot+34));
  out+=p("sc-rim2","M"+(ox+ow-5)+" "+(ot+34)+"L"+(ox+ow)+" "+ob);
  /* the rock the rider stands on, its top broken into ledges, lit along the edge */
  var ry=hz+96,rx=34,s=.56;
  var rock=[[-20,ry+6],[20,ry-2],[60,ry+1],[104,ry-3],[150,ry],[186,ry+4],[214,ry+2],[238,ry+14],[262,ry+34],[296,ry+56],[340,ry+74],[410,ry+84]];
  /* the rider, looking out over the river; a lit copy behind gives the rim of light */
  out+=p("sc-rimfill",rider(rx+1.4,ry+1,s));
  out+=p("sc-near",rider(rx,ry+1,s));
  out+=p("sc-near",smooth(rock)+"V"+(H+10)+"H-20Z");
  out+=p("sc-rim",smooth(rock.slice(2)));
  out+='</g>';
  return out;}

export {scene};
