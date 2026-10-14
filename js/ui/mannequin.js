/* Bunyan — the mannequin, live
   The 3D figure doing an exercise, drawn on the graphics card (WebGL2) and moving: the
   same model the still pictures are made from (js/data/mannequin/), so what animates
   here is exactly what the stills show. No library, no build step, nothing fetched:
   the figure is a field of rounded solids (geom.js), and one fragment shader marches a
   ray from every pixel into it, so the muscles swell out of the body the way they do
   in the stills instead of being separate pieces stuck on.

   A frame: the pose controller (motion.js) puts the body where it is at that moment of
   the repetition, the solids are packed into a small float texture (pack.js) and
   uploaded, the scene is drawn into a texture, its bright parts are blurred twice for
   the glow, and the result is put on the canvas with the motion arrow drawn over it.
   About 120 solids; each ray only tests the few clusters of them it passes near.

   What lights up is the library's own: the exercise's main muscle in full and the
   others at half (exercises.json m and x), through the record's refinements. The
   colours are the theme's: every colour here is a --mq-* token in index.html's theme
   blocks, read from the element, so a change of theme or mode repaints the figure.

   Where it cannot run (no WebGL2, a shader the driver will not build, a lost context)
   the element keeps showing the still pictures it was written with, which are the same
   figure at the start and end of the movement. It stops when it is off screen or the
   app is in the background, holds still for reduced motion until asked to play, and
   lowers its own resolution on a slow phone.

   Markup (a view writes it; this module finds it after every render):
     <div class="fig3d" data-mq="Machine Chest Press" [data-mq-turn]> canvas, the stills,
     a play/pause button </div>
   data-mq-turn lets a drag turn the figure (the exercise sheet); the workout screen
   leaves it off, because a sideways swipe there moves between exercises. */
import {phaseAt, sceneAt, framing, arrowShape} from "../data/mannequin/motion.js";
import {highlight} from "../data/mannequin/rig.js";
import {recordFor} from "../data/mannequin/records.js";
import {pack, MAXC, ROW} from "../data/mannequin/pack.js";
import {camera, project, V} from "../data/mannequin/geom.js";
import {muscleOf, secondaryOf} from "../data/exercises.js";
import {isReduced} from "./motion.js";
import {t} from "../i18n/dict.js";
import {esc} from "../util.js";

/* ---- shaders ---- */
var VS="#version 300 es\n"
 +"const vec2 P[3]=vec2[3](vec2(-1.,-1.),vec2(3.,-1.),vec2(-1.,3.));\n"
 +"out vec2 vUv;\n"
 +"void main(){vec2 p=P[gl_VertexID];vUv=p*.5+.5;gl_Position=vec4(p,0.,1.);}\n";

/* The scene: the stage, the figure and its equipment, lit as the stills are (see
   tools/figures/render.mjs, which this follows step for step). The same source, built
   with FLOOR, is the floor pass: how dark the floor is under each pixel (the figure's
   shadow and the darkening where it stands), worked out at a quarter of the size,
   because it is soft anyway and it is a fifth of the work. */
function sceneFS(floor){return "#version 300 es\n"
 +(floor?"#define FLOOR\n":"")
 +"precision highp float;precision highp int;precision highp sampler2D;\n"
 +"uniform sampler2D uP,uFl;\n"
 +"uniform vec4 uCB["+MAXC+"];uniform ivec4 uCI["+MAXC+"];uniform int uNC;\n"
 +"uniform ivec4 uHL[16];uniform int uNHL;\n"
 +"uniform vec3 uEye,uFwd,uRgt,uUp;uniform vec2 uTan,uRes;\n"
 +"uniform vec3 uLK,uLF,uLRL,uLRR;\n"
 +"uniform vec4 uFoot;uniform vec2 uFig;\n"
 +"uniform vec3 uTop,uMid,uEdge,uPool;\n"
 +"uniform vec3 uAlb[10];uniform vec2 uSpc[10];\n"
 +"uniform vec3 uKeyC,uFillC,uSkyC,uBncC,uRimC,uSpcC,uMarkE,uDeep,uHot;\n"
 +"uniform float uAct,uShade,uQ;\n"
 +"out vec4 oC;\n"
 /* the exact distance to solid i (pack.js gives the layout) */
 +"float sdPrim(int i,vec3 p){\n"
 +" vec4 h=texelFetch(uP,ivec2(1,i),0);int k=int(h.x+.5)&7;\n"
 +" vec4 a=texelFetch(uP,ivec2(2,i),0);\n"
 +" if(k==0)return length(p-a.xyz)-a.w;\n"
 +" vec4 b=texelFetch(uP,ivec2(3,i),0);\n"
 +" if(k==1){vec3 ba=b.xyz-a.xyz,pa=p-a.xyz;float s=clamp(dot(pa,ba)/max(dot(ba,ba),1e-9),0.,1.);return length(pa-ba*s)-mix(a.w,b.w,s);}\n"
 +" if(k==4){vec3 ba=b.xyz-a.xyz;float hh=max(length(ba),1e-6);vec3 ax=ba/hh,pa=p-a.xyz;float s=dot(pa,ax);float r=length(pa-ax*s);\n"
 +"  vec2 d=vec2(r-a.w+b.w,abs(s-hh*.5)-hh*.5+b.w);return min(max(d.x,d.y),0.)+length(max(d,0.))-b.w;}\n"
 +" vec4 c=texelFetch(uP,ivec2(4,i),0),d=texelFetch(uP,ivec2(5,i),0);\n"
 +" vec3 q=p-a.xyz,ez=cross(b.xyz,c.xyz),l=vec3(dot(q,b.xyz),dot(q,c.xyz),dot(q,ez));\n"
 +" if(k==2){vec3 x=l/d.xyz;float k0=length(x),k1=length(x/d.xyz);return k1>1e-7?k0*(k0-1.)/k1:-min(d.x,min(d.y,d.z));}\n"
 +" vec3 e=abs(l)-d.xyz;return length(max(e,0.))+min(max(e.x,max(e.y,e.z)),0.)-a.w;}\n"
 /* the scene's distance and material at p, from the clusters in the mask (two words:
    clusters 0-31 and 32-63), as geom.js makeSdf. A solid's bound radius is negative
    when it is a groove, so a solid far away costs one texture read. */
 +"bool on(uvec2 mk,int ci){return ci<32?(mk.x&(1u<<uint(ci)))!=0u:(mk.y&(1u<<uint(ci-32)))!=0u;}\n"
 +"vec2 map(vec3 p,float cut,uvec2 mk){\n"
 +" float d=1e9,m=0.;\n"
 +" for(int ci=0;ci<"+MAXC+";ci++){\n"
 +"  if(ci>=uNC)break;\n"
 +"  if(!on(mk,ci))continue;\n"
 +"  ivec4 I=uCI[ci];vec4 C=uCB[ci];float lc=length(p-C.xyz)-C.w;\n"
 +"  if(I.z==0){\n"
 +"   if(lc>cut){if(lc<d){d=lc;m=1.;}continue;}\n"
 +"   for(int j=I.x;j<I.x+I.y;j++){\n"
 +"    vec4 t0=texelFetch(uP,ivec2(0,j),0);bool gr=t0.w<0.;\n"
 +"    float lb=length(p-t0.xyz)-abs(t0.w);\n"
 +"    if(lb>cut){if(!gr&&lb<d){d=lb;m=1.;}continue;}\n"
 +"    float e=sdPrim(j,p),k=texelFetch(uP,ivec2(1,j),0).z;\n"
 +"    if(gr){float h=clamp(.5-.5*(d+e)/k,0.,1.);d=d+(-e-d)*h+k*h*(1.-h);continue;}\n"
 /* the first solid is taken as it is: blending it into 1e9 loses it in a 32-bit float */
 +"    if(d>=1e8){d=e;m=1.;continue;}\n"
 +"    if(e>d+k)continue;\n"
 +"    float h=clamp(.5+.5*(d-e)/k,0.,1.);if(h>.5)m=1.;d=d+(e-d)*h-k*h*(1.-h);}\n"
 +"  }else if(I.z==1){\n"
 +"   if(lc>=d)continue;\n"
 +"   if(lc>cut){d=lc;m=float(I.w);continue;}\n"
 +"   float gd=1e9,gm=0.;\n"
 +"   for(int j=I.x;j<I.x+I.y;j++){\n"
 +"    vec4 t1=texelFetch(uP,ivec2(1,j),0);float e=sdPrim(j,p);\n"
 +"    if(gd>=1e8){gd=e;gm=t1.y;continue;}\n"
 +"    if(e>gd+t1.z)continue;\n"
 +"    float h=clamp(.5+.5*(gd-e)/t1.z,0.,1.);if(h>.5)gm=t1.y;gd=gd+(e-gd)*h-t1.z*h*(1.-h);}\n"
 +"   if(gd<d){d=gd;m=gm;}\n"
 +"  }else{\n"
 +"   if(lc>=d)continue;\n"
 +"   for(int j=I.x;j<I.x+I.y;j++){\n"
 +"    vec4 t0=texelFetch(uP,ivec2(0,j),0);float lb=length(p-t0.xyz)-abs(t0.w);\n"
 +"    if(lb>=d)continue;\n"
 +"    float e=lb>cut?lb:sdPrim(j,p);\n"
 +"    if(e<d){d=e;m=texelFetch(uP,ivec2(1,j),0).y;}}}}\n"
 +" return vec2(d,m);}\n"
 +"const uvec2 ALL=uvec2(0xffffffffu);\n"
 /* which clusters a ray passes near, and where along it the first and last are */
 +"uvec2 rayMask(vec3 ro,vec3 rd,float pad,out float t0,out float t1){\n"
 +" uvec2 mk=uvec2(0u);t0=1e9;t1=-1.;\n"
 +" for(int ci=0;ci<"+MAXC+";ci++){\n"
 +"  if(ci>=uNC)break;\n"
 +"  vec4 C=uCB[ci];vec3 oc=ro-C.xyz;float r=C.w+pad,b=dot(oc,rd),c=dot(oc,oc)-r*r,h=b*b-c;\n"
 +"  if(h<0.)continue;h=sqrt(h);\n"
 +"  if(-b+h<0.)continue;\n"
 +"  if(ci<32)mk.x|=1u<<uint(ci);else mk.y|=1u<<uint(ci-32);\n"
 +"  t0=min(t0,max(-b-h,0.));t1=max(t1,-b+h);}\n"
 +" return mk;}\n"
 +"float shadow(vec3 p,vec3 l,float cut,int n){\n"
 +" float t0,t1;uvec2 mk=rayMask(p,l,.12,t0,t1);if(mk==uvec2(0u))return 1.;\n"
 +" float res=1.,s=max(.02,t0),e=min(t1,4.);\n"
 +" for(int i=0;i<40;i++){if(i>=n||s>e)break;float h=map(p+l*s,cut,mk).x;if(h<.0008)return 0.;res=min(res,9.*h/s);s+=clamp(h,.01,.25);}\n"
 +" return clamp(res,0.,1.);}\n"
 +"vec3 ray(vec2 s){return normalize(uFwd+uRgt*((2.*s.x-1.)*uTan.x)+uUp*((2.*s.y-1.)*uTan.y));}\n"
 +"#ifdef FLOOR\n"
 +"float floorAO(vec3 p){float o=0.,s=1.;\n"
 +" for(int i=1;i<=5;i++){float h=.04*float(i);o+=(h-map(vec3(p.x,h,p.z),.2,ALL).x)*s;s*=.55;}\n"
 +" return clamp(1.-1.6*o,0.,1.);}\n"
 +"void main(){\n"
 +" vec2 s=gl_FragCoord.xy/uRes;vec3 ro=uEye,rd=ray(s);float dark=0.;\n"
 +" if(rd.y<0.){vec3 fp=ro+rd*(-ro.y/rd.y);\n"
 +"  float s1=shadow(fp,uLK,.35,40);\n"
 +"  float o=map(vec3(fp.x,.1,fp.z),.35,ALL).x<.35?floorAO(fp):1.;\n"
 +"  dark=clamp((1.-s1)*.5+(1.-o)*.6,0.,.8);}\n"
 +" oC=vec4(dark,0.,0.,1.);}\n"
 +"#else\n"
 +"vec3 nrm(vec3 p,uvec2 mk){const vec2 e=vec2(.001,-.001);\n"
 +" return normalize(e.xyy*map(p+e.xyy,.06,mk).x+e.yyx*map(p+e.yyx,.06,mk).x+e.yxy*map(p+e.yxy,.06,mk).x+e.xxx*map(p+e.xxx,.06,mk).x);}\n"
 +"float ao(vec3 p,vec3 n){float o=0.,s=1.;\n"
 +" for(int i=1;i<=5;i++){float h=.02*float(i);o+=(h-map(p+n*h,.1,ALL).x)*s;s*=.62;}\n"
 +" return clamp(1.-3.*o,0.,1.);}\n"
 /* the worked muscles near p (geom.js glowAt) */
 +"float glowAt(vec3 p){float w=0.;\n"
 +" for(int i=0;i<64;i++){if(i>=uNHL)break;int j=uHL[i>>2][i&3];\n"
 +"  vec4 t0=texelFetch(uP,ivec2(0,j),0);if(length(p-t0.xyz)-abs(t0.w)>.04)continue;\n"
 +"  float e=sdPrim(j,p);if(e<.04)w=max(w,texelFetch(uP,ivec2(1,j),0).w*(1.-smoothstep(.004,.03,e)));}\n"
 +" return w;}\n"
 /* the stage: the theme's ground, lighter behind the figure, a pool of light on the
    floor under it, darker toward the edges (tools/images.py ground) */
 +"vec3 stage(vec2 s,vec3 ro,vec3 rd){\n"
 +" float ys=1.-s.y;vec3 c=mix(uTop,uEdge,ys);\n"
 +" vec2 dd=vec2((s.x-uFig.x)/.42,(ys-uFig.y)/.58);c=mix(c,uMid,exp(-dot(dd,dd)*1.3));\n"
 +" if(rd.y<0.){vec3 fp=ro+rd*(-ro.y/rd.y);vec2 q=(fp.xz-uFoot.xy)/uFoot.zw;float r=dot(q,q);\n"
 +"  c+=(exp(-r*1.6)*.55+exp(-r*.35)*.12)*uPool;}\n"
 +" vec2 v=vec2((s.x-.5)/.75,(s.y-.5)/.8);c*=clamp(1.12-dot(v,v)*.5,.45,1.);\n"
 +" return c;}\n"
 +"void main(){\n"
 +" vec2 s=gl_FragCoord.xy/uRes;vec3 ro=uEye,rd=ray(s);\n"
 +" float t0,t1;uvec2 mk=rayMask(ro,rd,.06,t0,t1);\n"
 +" bool hit=false;float t=t0,mat=0.;\n"
 +" if(mk!=uvec2(0u)){for(int i=0;i<160;i++){if(t>t1)break;vec2 h=map(ro+rd*t,.06,mk);if(h.x<.0005*t){hit=true;mat=h.y;break;}t+=h.x;}}\n"
 +" if(!hit){\n"
 +"  vec3 c=stage(s,ro,rd);\n"
 +"  if(rd.y<0.)c*=1.-texture(uFl,s).r*uShade;\n"
 +"  oC=vec4(c,0.);return;}\n"
 +" vec3 p=ro+rd*t,n=nrm(p,mk),v=-rd;int mi=clamp(int(mat+.5),0,9);\n"
 +" vec3 alb=uAlb[mi];vec2 sg=uSpc[mi];\n"
 +" float a=ao(p,n),s1=uQ>.5?shadow(p+n*.003,uLK,.2,30):1.;\n"
 +" float ndv=max(dot(n,v),0.),dk=max(dot(n,uLK),0.)*s1,df=max(dot(n,uLF),0.);\n"
 +" float sky=(.5+.5*n.y)*a,bn=max(-n.y,0.)*(.3+.7*a);\n"
 +" float sp=pow(max(dot(n,normalize(uLK+v)),0.),sg.y)*sg.x*s1;\n"
 +" float F=(1.-ndv)*(1.-ndv);\n"
 +" float rim=F*(max(dot(n,uLRL),0.)+max(dot(n,uLRR),0.))*(.45+.55*a),top=max(n.y,0.)*a;\n"
 +" float rs=mi==1?1.:(mi==8||mi==9)?.6:.38;\n"
 +" vec3 col=alb*(.95*dk*uKeyC+.35*top*uKeyC+.2*df*uFillC+.22*sky*uSkyC+.55*bn*uBncC)+sp*uSpcC+(rim*uRimC*1.55+F*.05*uRimC)*rs;\n"
 +" if(mi==7)col+=uMarkE*(.4+.6*a);\n"
 +" if(mi==1&&uNHL>0){float w=glowAt(p);\n"
 +"  if(w>0.){float g=pow(ndv,3.);w*=(1.-.55*F)*(.45+.55*uAct);\n"
 +"   vec3 em=mix(uDeep,uHot,g)*(.45+.55*dk+.2*top+.1*sky)+sp*uSpcC*.7+rim*uRimC*.6;\n"
 +"   col=mix(col,em,min(w*1.05,1.));}}\n"
 +" oC=vec4(pow(clamp(col,0.,1.),vec3(1./2.2)),1.);}\n"
 +"#endif\n";}

/* The glow: what is bright on the figure, a quarter size (tools/images.py bloom). */
var FS_HOT="#version 300 es\n"
 +"precision highp float;uniform sampler2D uT;uniform vec2 uPx;in vec2 vUv;out vec4 oC;\n"
 +"vec4 f(vec2 o){vec4 s=texture(uT,vUv+o*uPx);return vec4(max(s.rgb-.42,0.)*s.a*1.6,1.);}\n"
 +"void main(){oC=(f(vec2(-1.,-1.))+f(vec2(1.,-1.))+f(vec2(-1.,1.))+f(vec2(1.,1.)))*.25;}\n";
/* A smaller copy, for the wider glow. */
var FS_DOWN="#version 300 es\n"
 +"precision highp float;uniform sampler2D uT;uniform vec2 uPx;in vec2 vUv;out vec4 oC;\n"
 +"void main(){oC=(texture(uT,vUv+vec2(-.5,-.5)*uPx)+texture(uT,vUv+vec2(.5,-.5)*uPx)+texture(uT,vUv+vec2(-.5,.5)*uPx)+texture(uT,vUv+vec2(.5,.5)*uPx))*.25;}\n";
/* A Gaussian blur along uDir. */
var FS_BLUR="#version 300 es\n"
 +"precision highp float;uniform sampler2D uT;uniform vec2 uDir;uniform float uSig;in vec2 vUv;out vec4 oC;\n"
 +"void main(){vec4 c=vec4(0.);float ws=0.;\n"
 +" for(int i=-6;i<=6;i++){float w=exp(-float(i*i)/(2.*uSig*uSig));c+=texture(uT,vUv+uDir*float(i))*w;ws+=w;}\n"
 +" oC=c/ws;}\n";
/* The picture: the scene, its glow laid over it, and the arrow. */
var FS_OUT="#version 300 es\n"
 +"precision highp float;uniform sampler2D uS,uG1,uG2;\n"
 +"uniform vec2 uA[24];uniform int uNA;uniform vec2 uH[3];uniform vec3 uArC,uArG;uniform float uArK,uSc;\n"
 +"in vec2 vUv;out vec4 oC;\n"
 +"float seg(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/max(dot(ba,ba),1e-6),0.,1.);return length(pa-ba*h);}\n"
 +"float tri(vec2 p,vec2 a,vec2 b,vec2 c){\n"
 +" float d=min(seg(p,a,b),min(seg(p,b,c),seg(p,c,a)));\n"
 +" float s1=(b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x),s2=(c.x-b.x)*(p.y-b.y)-(c.y-b.y)*(p.x-b.x),s3=(a.x-c.x)*(p.y-c.y)-(a.y-c.y)*(p.x-c.x);\n"
 +" bool inside=(s1>=0.&&s2>=0.&&s3>=0.)||(s1<=0.&&s2<=0.&&s3<=0.);return inside?-d:d;}\n"
 +"void main(){\n"
 +" vec3 c=texture(uS,vUv).rgb;\n"
 +" vec3 g=texture(uG1,vUv).rgb*.55+texture(uG2,vUv).rgb*.45;\n"
 +" c=1.-(1.-c)*(1.-clamp(g,0.,1.));\n"
 +" if(uNA>1){vec2 p=gl_FragCoord.xy;float d=1e9;\n"
 +"  for(int i=0;i<23;i++){if(i>=uNA-1)break;d=min(d,seg(p,uA[i],uA[i+1]));}\n"
 +"  d=min(d-1.6*uSc,tri(p,uH[0],uH[1],uH[2]));\n"
 +"  float glow=exp(-pow(max(d+1.6*uSc,0.)/(4.6*uSc),2.))*.62*uArK,core=clamp(.5-d,0.,1.)*uArK;\n"
 +"  c=mix(c,uArG,glow);c=mix(c,uArC,core);}\n"
 +" c+=(fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)-.5)/255.;\n"
 +" oC=vec4(c,1.);}\n";

/* ---- the theme ---- */
/* Every colour comes from the element's --mq-* tokens (index.html). A token is read as
   a CSS colour by a 2D canvas, so any colour syntax works. */
var probeCtx=null;
function cssRgb(s,fallback){
  s=(s||"").trim();if(!s)return fallback;
  try{
    if(!probeCtx)probeCtx=document.createElement("canvas").getContext("2d");
    probeCtx.fillStyle="#000";probeCtx.fillStyle=s;
    var v=probeCtx.fillStyle;
    if(v[0]==="#")return [parseInt(v.slice(1,3),16)/255,parseInt(v.slice(3,5),16)/255,parseInt(v.slice(5,7),16)/255];
    var m=v.match(/[\d.]+/g);if(m)return [m[0]/255,m[1]/255,m[2]/255];
  }catch(e){}
  return fallback;}
function lin(c){return c.map(function(x){return Math.pow(x,2.2);});}
function scale(c,k){return [c[0]*k[0],c[1]*k[1],c[2]*k[2]];}
function mixc(a,b,w){return [a[0]+(b[0]-a[0])*w,a[1]+(b[1]-a[1])*w,a[2]+(b[2]-a[2])*w];}
/* What the shader needs from the theme. */
function readTheme(el){
  var cs=getComputedStyle(el),g=function(n){return cs.getPropertyValue(n);};
  function col(n,d){return cssRgb(g(n),d);}
  function num(n,d){var v=parseFloat(g(n));return isFinite(v)?v:d;}
  var skin=lin(col("--mq-skin",[.4,.42,.45])),metal=lin(col("--mq-metal",[.22,.24,.29]));
  var pad=lin(col("--mq-pad",[.2,.22,.26])),steel=lin(col("--mq-steel",[.58,.61,.67]));
  var rim=lin(col("--mq-rim",[.7,.84,1])),key=[1,.98,.95];
  var alb=[skin,skin,metal,pad,steel,scale(metal,[2,2,2]),scale(pad,[.9,.9,.9]),lin(col("--mq-mark",[.76,.28,.3])),
    scale(skin,[1.2,1.2,1.16]),scale(skin,[2.3,2.2,2.1])];
  return {
    top:col("--mq-top",[.035,.067,.118]),mid:col("--mq-mid",[.059,.106,.18]),edge:col("--mq-edge",[.02,.04,.075]),
    pool:col("--mq-pool",[.125,.408,.769]).map(function(x){return x*num("--mq-pool-k",1);}),
    alb:alb,spc:[[.42,38],[.42,38],[.38,50],[.2,16],[.85,80],[.08,10],[.1,12],[.4,40],[.3,28],[.2,18]],
    key:key,fill:scale(mixc(key,rim,.6),[.7,.7,.7]),sky:scale(mixc(key,rim,.7),[.62,.62,.62]),
    bounce:lin(col("--mq-bounce",[.38,.6,.89])),rim:rim,spec:mixc(key,rim,.3),
    markE:scale(lin(col("--mq-mark",[.76,.28,.3])),[.4,.06,.06]),
    deep:lin(col("--mq-deep",[.89,.3,.23])),hot:lin(col("--mq-hot",[1,.67,.48])),
    shade:num("--mq-shade",1),
    arrow:col("--mq-arrow",[.52,.73,1]),arrowGlow:col("--mq-arrow-glow",[.27,.55,1])};}

/* ---- GL ---- */
var GL2=null;
function supported(){
  if(GL2!==null)return GL2;
  try{var c=document.createElement("canvas");GL2=!!(window.WebGL2RenderingContext&&c.getContext("webgl2"));}catch(e){GL2=false;}
  return GL2;}
function shader(gl,type,src){
  var s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);
  if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)&&!gl.isContextLost())throw new Error(gl.getShaderInfoLog(s)||"shader");
  return s;}
function program(gl,fs){
  var p=gl.createProgram();
  gl.attachShader(p,shader(gl,gl.VERTEX_SHADER,VS));gl.attachShader(p,shader(gl,gl.FRAGMENT_SHADER,fs));
  gl.linkProgram(p);
  if(!gl.getProgramParameter(p,gl.LINK_STATUS)&&!gl.isContextLost())throw new Error(gl.getProgramInfoLog(p)||"link");
  var u={},n=gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS);
  for(var i=0;i<n;i++){var a=gl.getActiveUniform(p,i),nm=a.name.replace(/\[0\]$/,"");u[nm]=gl.getUniformLocation(p,a.name);}
  return {p:p,u:u};}
function target(gl,w,h){
  var tx=gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D,tx);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  var fb=gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER,fb);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,tx,0);
  return {fb:fb,tx:tx,w:w,h:h};}
function drop(gl,tg){if(tg){gl.deleteFramebuffer(tg.fb);gl.deleteTexture(tg.tx);}}

/* The camera's lights, as the stills set them: a key from the front and above, a
   fill, two blue edge lights from behind, the sky. */
function lights(cam){
  function L(a,b,c){return V.norm(V.add(V.add(V.mul(cam.f,a),V.mul(cam.r,b)),V.mul(cam.u,c)));}
  return {key:L(-.55,-.45,.75),fill:L(-.7,.6,.1),rimL:L(.9,-.8,.4),rimR:L(.9,.8,.4)};}

/* ---- one live figure ---- */
var LIVE=[];
function Mannequin(el){
  var name=el.getAttribute("data-mq"),rec=recordFor(name);
  var canvas=el.querySelector("canvas"),btn=el.querySelector(".fig3d-play");
  var gl=null,P={},tex=null,texRows=0,T={},vao=null;
  var hl=highlight(muscleOf(name),secondaryOf(name),rec&&rec.refine);
  var theme=null,look="",cam=null,camKey="",yaw0=(rec&&rec.cam&&rec.cam.yaw!=null)?rec.cam.yaw:60,yaw=yaw0;
  var pitch0=(rec&&rec.cam&&rec.cam.pitch!=null)?rec.cam.pitch:8,pitch=pitch0,fits={};
  var playing=!isReduced(),visible=true,raf=0,clock=0,last=0,ema=16,slow=0,fast=0,frames=0;
  var q=1,qMax=1,W=0,H=0,dead=false,err="",paths={},stillU=1,io=null,ro=null;
  function nothing(){}
  /* what syncMannequins and the tests call; a figure that never started answers them too */
  var self={el:el,name:name,sync:nothing,wake:nothing,toggle:nothing,setU:nothing,setHL:nothing,
    probe:function(){return null;},
    dispose:function(){dead=true;},
    state:function(){return {live:!!gl&&!dead,playing:playing,frames:frames,q:q,err:err,w:W,h:H,yaw:yaw,look:look};}};
  function fail(e){
    err=String(e&&e.message||e);dead=true;el.removeAttribute("data-live");stop();
    try{var lc=gl&&gl.getExtension("WEBGL_lose_context");if(lc)lc.loseContext();}catch(x){}
    gl=null;}
  if(!rec||!canvas){err="no record";dead=true;return self;}
  try{
    gl=canvas.getContext("webgl2",{antialias:false,alpha:false,depth:false,stencil:false,premultipliedAlpha:false,powerPreference:"default"});
    if(!gl)throw new Error("no WebGL2");
    P.scene=program(gl,sceneFS(false));P.floor=program(gl,sceneFS(true));P.hot=program(gl,FS_HOT);P.down=program(gl,FS_DOWN);
    P.blur=program(gl,FS_BLUR);P.out=program(gl,FS_OUT);
    vao=gl.createVertexArray();gl.bindVertexArray(vao);
    tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
  }catch(e){fail(e);return self;}
  canvas.addEventListener("webglcontextlost",function(ev){ev.preventDefault();fail("context lost");});
  el.setAttribute("data-live","1");

  /* ---- size and camera ---- */
  /* the canvas's laid-out size (not its box on screen, which a sheet sliding in scales) */
  function resize(){
    if(dead)return false;
    var dpr=Math.min(window.devicePixelRatio||1,2);
    var w=Math.max(2,Math.round(canvas.clientWidth*dpr)),h=Math.max(2,Math.round(canvas.clientHeight*dpr));
    if(w===W&&h===H&&T.s)return false;
    W=w;H=h;canvas.width=W;canvas.height=H;
    /* the scene is marched at no more than about 200 000 pixels, and less on a slow phone */
    qMax=Math.min(1,Math.sqrt(200000/(W*H)));if(q>qMax||!T.s)q=qMax;
    build();fits={};camKey="";paths={};return true;}
  function build(){
    ["s","fl","g1","g1b","g2","g2b"].forEach(function(k){drop(gl,T[k]);});
    var sw=Math.max(2,Math.round(W*q)),sh=Math.max(2,Math.round(H*q));
    T.s=target(gl,sw,sh);T.fl=target(gl,Math.max(2,Math.round(sw/4)),Math.max(2,Math.round(sh/4)));
    var w1=Math.max(2,Math.round(W/4)),h1=Math.max(2,Math.round(H/4)),w2=Math.max(2,Math.round(W/8)),h2=Math.max(2,Math.round(H/8));
    T.g1=target(gl,w1,h1);T.g1b=target(gl,w1,h1);T.g2=target(gl,w2,h2);T.g2b=target(gl,w2,h2);}
  /* one framing per few degrees of turn, so the whole movement stays in the picture */
  function fitAt(y){
    var k=Math.round(y/5)*5+"|"+Math.round(pitch/5)*5;
    if(!fits[k])fits[k]=framing(rec,W/H,Math.round(y/5)*5,Math.round(pitch/5)*5,{margin:.98});
    return fits[k];}
  function camNow(){
    var key=yaw.toFixed(1)+"|"+pitch.toFixed(1)+"|"+W+"x"+H;
    if(key===camKey)return cam;
    var f=fitAt(yaw);
    cam=camera(f.target,f.dist,yaw,pitch,f.fov,W/H);camKey=key;return cam;}
  /* the arrow, placed again whenever the camera moves */
  function arrow(){
    if(paths.key===camKey)return paths.v;
    paths={key:camKey,v:arrowShape(rec,camNow(),W,H)};
    return paths.v;}

  /* ---- a frame ---- */
  function draw(s){
    if(dead)return;
    try{
      if(!T.s)resize();
      if(!theme)retheme();
      var ph=playing?phaseAt(rec,s):{u:stillU,act:1};
      var sc=sceneAt(rec,ph.u,hl),pk=pack(sc.prims),c=camNow(),Ls=lights(c),th=theme;
      /* the solids */
      gl.bindTexture(gl.TEXTURE_2D,tex);
      if(pk.n!==texRows){gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,ROW,pk.n,0,gl.RGBA,gl.FLOAT,pk.tex);texRows=pk.n;}
      else gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,ROW,pk.n,gl.RGBA,gl.FLOAT,pk.tex);
      var cb=new Float32Array(MAXC*4),ci=new Int32Array(MAXC*4),hv=new Int32Array(64),lo=[1e9,1e9],hi=[-1e9,-1e9];
      pk.clusters.forEach(function(C,i){cb.set([C.c[0],C.c[1],C.c[2],C.r],i*4);ci.set([C.start,C.count,C.type,C.m],i*4);});
      pk.hl.slice(0,64).forEach(function(j,i){hv[i]=j;});
      sc.prims.forEach(function(q3){lo[0]=Math.min(lo[0],q3.c[0]-q3.r*.5);hi[0]=Math.max(hi[0],q3.c[0]+q3.r*.5);
        lo[1]=Math.min(lo[1],q3.c[2]-q3.r*.5);hi[1]=Math.max(hi[1],q3.c[2]+q3.r*.5);});
      /* where the figure sits on the screen, for the light behind it */
      var mid=project(c,c.target),fig=[(mid[0]+1)/2,1-(mid[1]+1)/2];
      /* ---- the floor's shadow, a quarter size, then the scene ---- */
      [[P.floor,T.fl],[P.scene,T.s]].forEach(function(st){
        var u=st[0].u,tg=st[1];
        gl.bindFramebuffer(gl.FRAMEBUFFER,tg.fb);gl.viewport(0,0,tg.w,tg.h);gl.useProgram(st[0].p);
        bindTex(0,tex,u.uP);
        if(u.uFl)bindTex(1,T.fl.tx,u.uFl);
        gl.uniform4fv(u.uCB,cb);gl.uniform4iv(u.uCI,ci);gl.uniform1i(u.uNC,pk.clusters.length);
        if(u.uHL){gl.uniform4iv(u.uHL,hv);gl.uniform1i(u.uNHL,Math.min(pk.hl.length,64));}
        gl.uniform3fv(u.uEye,c.p);gl.uniform3fv(u.uFwd,c.f);gl.uniform3fv(u.uRgt,c.r);gl.uniform3fv(u.uUp,c.u);
        gl.uniform2f(u.uTan,c.tx,c.ty);gl.uniform2f(u.uRes,tg.w,tg.h);gl.uniform3fv(u.uLK,Ls.key);
        if(u.uLF){
          gl.uniform3fv(u.uLF,Ls.fill);gl.uniform3fv(u.uLRL,Ls.rimL);gl.uniform3fv(u.uLRR,Ls.rimR);
          gl.uniform4f(u.uFoot,(lo[0]+hi[0])/2,(lo[1]+hi[1])/2,Math.max((hi[0]-lo[0])*.62,.5),Math.max((hi[1]-lo[1])*.62,.45));
          gl.uniform2f(u.uFig,fig[0],fig[1]);
          gl.uniform3fv(u.uTop,th.top);gl.uniform3fv(u.uMid,th.mid);gl.uniform3fv(u.uEdge,th.edge);gl.uniform3fv(u.uPool,th.pool);
          gl.uniform3fv(u.uAlb,[].concat.apply([],th.alb));gl.uniform2fv(u.uSpc,[].concat.apply([],th.spc));
          gl.uniform3fv(u.uKeyC,th.key);gl.uniform3fv(u.uFillC,th.fill);gl.uniform3fv(u.uSkyC,th.sky);
          gl.uniform3fv(u.uBncC,th.bounce);gl.uniform3fv(u.uRimC,th.rim);gl.uniform3fv(u.uSpcC,th.spec);
          gl.uniform3fv(u.uMarkE,th.markE);gl.uniform3fv(u.uDeep,th.deep);gl.uniform3fv(u.uHot,th.hot);
          gl.uniform1f(u.uAct,ph.act);gl.uniform1f(u.uShade,th.shade);gl.uniform1f(u.uQ,q>.45?1:0);}
        gl.drawArrays(gl.TRIANGLES,0,3);});
      /* ---- the glow ---- */
      pass(P.hot,T.g1,T.s,{uPx:[1/T.s.w,1/T.s.h]});
      blur(T.g1,T.g1b,W/4*6/720);
      pass(P.down,T.g2,T.g1,{uPx:[1/T.g1.w,1/T.g1.h]});
      blur(T.g2,T.g2b,W/8*18/720);
      /* ---- the picture ---- */
      var O=P.out,ou=O.u,ar=arrow(),A=new Float32Array(48),Hd=new Float32Array(6),na=0;
      if(ar){ar.body.slice(0,24).forEach(function(p,i){A[i*2]=p[0];A[i*2+1]=p[1];});na=Math.min(ar.body.length,24);
        ar.head.forEach(function(p,i){Hd[i*2]=p[0];Hd[i*2+1]=p[1];});}
      gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,W,H);gl.useProgram(O.p);
      bindTex(0,T.s.tx,ou.uS);bindTex(1,T.g1.tx,ou.uG1);bindTex(2,T.g2.tx,ou.uG2);
      gl.uniform2fv(ou.uA,A);gl.uniform1i(ou.uNA,na);gl.uniform2fv(ou.uH,Hd);
      gl.uniform3fv(ou.uArC,th.arrow);gl.uniform3fv(ou.uArG,th.arrowGlow);
      gl.uniform1f(ou.uArK,ph.u===stillU&&!playing?1:(ph.act>.95?1:.72));gl.uniform1f(ou.uSc,W/720);
      gl.drawArrays(gl.TRIANGLES,0,3);
      frames++;
    }catch(e){fail(e);}}
  function bindTex(unit,tx,loc){gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,tx);gl.uniform1i(loc,unit);}
  function pass(pr,dst,src,un){
    gl.bindFramebuffer(gl.FRAMEBUFFER,dst.fb);gl.viewport(0,0,dst.w,dst.h);gl.useProgram(pr.p);
    bindTex(0,src.tx,pr.u.uT);
    for(var k in un)if(pr.u[k])gl.uniform2fv(pr.u[k],un[k]);
    gl.drawArrays(gl.TRIANGLES,0,3);}
  function blur(a,b,sig){
    var B=P.blur;sig=Math.max(sig,.6);
    [[a,b,[1/a.w,0]],[b,a,[0,1/a.h]]].forEach(function(st){
      gl.bindFramebuffer(gl.FRAMEBUFFER,st[1].fb);gl.viewport(0,0,st[1].w,st[1].h);gl.useProgram(B.p);
      bindTex(0,st[0].tx,B.u.uT);gl.uniform2fv(B.u.uDir,st[2]);gl.uniform1f(B.u.uSig,sig);
      gl.drawArrays(gl.TRIANGLES,0,3);});}

  /* ---- time ---- */
  function tick(now){
    raf=0;if(dead)return;
    if(last){var dt=now-last;clock+=Math.min(dt,100);ema=ema*.9+dt*.1;adapt();}
    last=now;draw(clock/1000);
    if(playing&&visible&&!document.hidden)raf=requestAnimationFrame(tick);
    else last=0;}
  /* a phone that cannot keep up gets fewer pixels, then a still figure */
  function adapt(){
    if(ema>30){slow++;fast=0;}else if(ema<18){fast++;slow=0;}else{slow=0;fast=0;}
    if(slow>20){slow=0;
      if(q>.32){q=Math.max(.3,q*.8);build();}
      else if(ema>55){playing=false;syncBtn();}}
    if(fast>90&&q<qMax){fast=0;q=Math.min(qMax,q*1.12);build();}}
  function start(){if(!raf&&!dead&&playing&&visible&&!document.hidden){last=0;raf=requestAnimationFrame(tick);}}
  function stop(){if(raf){cancelAnimationFrame(raf);raf=0;}last=0;}
  function once(){if(!dead&&!raf)requestAnimationFrame(function(){if(!raf)draw(clock/1000);});}
  function syncBtn(){
    if(!btn)return;
    btn.setAttribute("aria-label",t(playing?"Pause":"Play"));
    btn.setAttribute("aria-pressed",playing?"false":"true");
    el.toggleAttribute("data-paused",!playing);}
  function toggle(){
    playing=!playing;
    /* paused, it holds where it was; started again, it carries on from there */
    if(!playing){var ph=phaseAt(rec,clock/1000);stillU=ph.u;}
    syncBtn();if(playing)start();else{stop();once();}}
  self.toggle=toggle;

  /* ---- the theme ---- */
  function retheme(){
    var de=document.documentElement;
    look=(el.closest("[data-palette]")||de).getAttribute("data-palette")+"|"+(el.closest("[data-theme]")||de).getAttribute("data-theme");
    theme=readTheme(el);}
  self.sync=function(){
    if(dead)return;
    /* what the patcher put back from the markup, set to how the figure really is */
    el.setAttribute("data-live","1");syncBtn();
    var de=document.documentElement;
    var lk=(el.closest("[data-palette]")||de).getAttribute("data-palette")+"|"+(el.closest("[data-theme]")||de).getAttribute("data-theme");
    if(lk!==look){retheme();once();}
    if(resize())once();};

  /* ---- turning it with a finger (the exercise sheet only) ---- */
  if(el.hasAttribute("data-mq-turn")){
    var drag=null;
    canvas.addEventListener("pointerdown",function(ev){
      drag={x:ev.clientX,y:ev.clientY,yaw:yaw,pitch:pitch,moved:false,id:ev.pointerId};});
    canvas.addEventListener("pointermove",function(ev){
      if(!drag||ev.pointerId!==drag.id)return;
      var dx=ev.clientX-drag.x,dy=ev.clientY-drag.y;
      if(!drag.moved&&Math.abs(dx)<6)return;
      if(!drag.moved){drag.moved=true;try{canvas.setPointerCapture(ev.pointerId);}catch(e){}}
      yaw=Math.max(yaw0-85,Math.min(yaw0+85,drag.yaw-dx*.45));
      pitch=Math.max(-2,Math.min(30,drag.pitch+dy*.12));
      if(!playing)once();});
    function up(ev){
      if(!drag||ev.pointerId!==drag.id)return;
      var tap=!drag.moved;drag=null;
      if(tap)toggle();}
    canvas.addEventListener("pointerup",up);canvas.addEventListener("pointercancel",function(){drag=null;});
    canvas.addEventListener("dblclick",function(){yaw=yaw0;pitch=pitch0;once();});}
  if(btn)btn.addEventListener("click",function(ev){ev.stopPropagation();toggle();});

  /* ---- on screen or not, and its size ---- */
  if(window.IntersectionObserver){
    io=new IntersectionObserver(function(es){visible=es[es.length-1].isIntersecting;if(visible)start();else stop();});
    io.observe(el);}
  if(window.ResizeObserver){ro=new ResizeObserver(function(){if(resize())once();});ro.observe(canvas);}
  self.wake=function(){if(document.hidden)stop();else start();};
  self.dispose=function(){
    stop();dead=true;if(io)io.disconnect();if(ro)ro.disconnect();
    try{var lc=gl&&gl.getExtension("WEBGL_lose_context");if(lc)lc.loseContext();}catch(e){}
    gl=null;};
  /* for the tests: draw now and say what came out */
  self.probe=function(){
    if(dead||!gl)return null;
    draw(clock/1000);
    var px=new Uint8Array(W*H*4);gl.readPixels(0,0,W,H,gl.RGBA,gl.UNSIGNED_BYTE,px);
    var n=W*H,sum=[0,0,0],red=0,lit=0;
    for(var i=0;i<n;i++){var r=px[i*4],g=px[i*4+1],b=px[i*4+2];sum[0]+=r;sum[1]+=g;sum[2]+=b;
      if(r>120&&r>g*1.5&&r>b*1.5)red++;if(r+g+b>360)lit++;}
    return {w:W,h:H,mean:sum.map(function(x){return Math.round(x/n);}),red:red/n,lit:lit/n,corner:[px[0],px[1],px[2]]};};
  self.setU=function(u){playing=false;stillU=u;stop();syncBtn();draw(0);};
  /* which muscles are lit, by tag (rig.js); for the preview page and the tests */
  self.setHL=function(h){hl=h||{};if(!playing)draw(clock/1000);};
  syncBtn();resize();retheme();
  if(playing)start();else draw(0);
  return self;}

/* Called after every render: starts the figures that have appeared, keeps the ones that
   stay (the patcher keeps their elements), and lets go of the ones that left. */
function syncMannequins(){
  for(var i=LIVE.length-1;i>=0;i--)
    if(!LIVE[i].el.isConnected){LIVE[i].dispose();LIVE[i].el._mq=null;LIVE.splice(i,1);}
  var els=document.querySelectorAll(".fig3d[data-mq]");
  for(var j=0;j<els.length;j++){
    var el=els[j];
    if(el._mq){el._mq.sync&&el._mq.sync();continue;}
    if(!supported())continue;
    el._mq=Mannequin(el);LIVE.push(el._mq);}}
document.addEventListener("visibilitychange",function(){LIVE.forEach(function(m){m.wake&&m.wake();});});

/* Whether an exercise is drawn live: it has a record (the phone may still fall back to
   the stills). */
function hasMannequin(name){return !!recordFor(name);}
function mannequins(){return LIVE.slice();}

/* The markup a view writes for it. stills: the start and end pictures, shown until the
   figure is live and wherever it cannot be; turn: a drag turns it; label: what it is,
   for a screen reader. Keyed by the exercise, so the patcher keeps one figure running
   while the screen around it changes, and a different exercise gets a fresh one. */
var ICONS='<svg class="i-pause" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2h3v12H4zM9 2h3v12H9z"/></svg>'
  +'<svg class="i-play" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2l10 6-10 6z"/></svg>';
function fig3dHtml(name,o){
  o=o||{};
  if(!recordFor(name))return "";
  return '<div class="fig3d" data-mq="'+esc(name)+'" data-k="mq:'+esc(name)+'"'+(o.turn?' data-mq-turn':'')+'>'
    +'<canvas role="img" aria-label="'+esc(o.label||name)+'"></canvas>'
    +'<div class="fig3d-still">'+(o.stills||[]).slice(0,2).map(function(src,i){
      return src?'<figure><img src="'+esc(src)+'" alt="" decoding="async"><figcaption>'+t(i?"End":"Start")+'</figcaption></figure>':"";}).join("")+'</div>'
    +(o.turn?'<span class="fig3d-tag" aria-hidden="true">'+t("Drag to turn")+'</span>':'')
    +'<button class="fig3d-play" type="button" aria-label="'+t("Pause")+'">'+ICONS+'</button></div>';}

export {syncMannequins, hasMannequin, mannequins, supported, readTheme, fig3dHtml};
