/* Bunyan — the mannequin, live
   The 3D figure doing an exercise, drawn on the graphics card (WebGL2) and moving: a
   real human body (MakeHuman's CC0 mesh, js/data/mannequin/body.js and img/fig/body.bin)
   on its skeleton, posed every frame by the pose controller (motion.js, skin.js), with
   its equipment as meshes (mesh.js). Triangles, not ray marching: drawn at the screen's
   own resolution, smoothed (multisampled), so its edges are as sharp as the text around
   it. No library, no build step.

   A frame: the pose at this moment of the repetition gives every bone's matrix, which
   go up as a small float texture; a shadow map is drawn from the key light; then the
   stage, the floor with the figure's shadow and its pool of light, the equipment, the
   body (its skin moved by its bones in the vertex shader), and the motion arrow over it.

   The light is a studio's, fixed to the camera so the figure is lit from any side: a
   soft key from the front and above, a fill, the theme's edge light from behind, and
   the stage's sky and floor colours round it. What lights up is the library's own: the
   exercise's main muscle in full and the others at half (exercises.json m and x), each
   muscle a region of the skin with soft edges, glowing with the effort. Every colour is
   a --mq-* token in index.html's theme blocks, read from the element, so a change of
   theme or mode repaints it.

   The camera: a drag turns the figure round (all the way round), up and down within
   limits, with the weight of a real object: it follows the finger closely, carries on a
   little when let go, and settles. Two fingers (or a wheel) bring it nearer or further;
   a double tap eases back to the exercise's own view. The framing is worked out for
   every angle, so the whole movement stays in the picture and nothing jumps as it turns.

   Where it cannot run (no WebGL2, a driver that will not build it, the body not loaded,
   a lost context) the element keeps showing its still pictures. It stops when it is off
   screen or the app is in the background, holds still for reduced motion until asked
   to play, and lowers its resolution only if a phone cannot keep up.

   Markup (a view writes it; this module finds it after every render):
     <div class="fig3d" data-mq="Machine Chest Press" [data-mq-turn]> canvas, the stills,
     a play/pause button </div>
   data-mq-turn lets a drag turn the figure (the exercise sheet); the workout screen
   leaves it off, because a sideways swipe there moves between exercises. */
import {phaseAt, sceneAt, framePoints, fitCamera, arrowShape} from "../data/mannequin/motion.js";
import {highlight} from "../data/mannequin/rig.js";
import {recordFor} from "../data/mannequin/records.js";
import {BODY} from "../data/mannequin/body.js";
import {NB} from "../data/mannequin/skin.js";
import {place, build} from "../data/mannequin/mesh.js";
import {V} from "../data/mannequin/geom.js";
import {muscleOf, secondaryOf} from "../data/exercises.js";
import {isReduced} from "./motion.js";
import {t} from "../i18n/dict.js";
import {esc} from "../util.js";

/* ---- the body's mesh, loaded once for every figure ---- */
var BODYP=null;
function loadBody(){
  if(BODYP)return BODYP;
  BODYP=fetch("img/fig/body.bin").then(function(r){if(!r.ok)throw new Error("body "+r.status);return r.arrayBuffer();})
    .then(decode).catch(function(e){BODYP=null;throw e;});
  return BODYP;}
function decode(buf){
  var L=BODY.layout,n=BODY.vertices,nt=BODY.triangles,lo=BODY.min,hi=BODY.max;
  var q=new Uint16Array(buf,L.pos.offset,n*3),pos=new Float32Array(n*3);
  for(var i=0;i<n*3;i++){var k=i%3;pos[i]=lo[k]+q[i]/65535*(hi[k]-lo[k]);}
  var idx=new Uint16Array(buf,L.idx.offset,nt*3);
  /* smooth normals from the rest shape; the bones turn them with the skin */
  var nrm=new Float32Array(n*3);
  for(var t3=0;t3<nt*3;t3+=3){
    var a=idx[t3]*3,b=idx[t3+1]*3,c=idx[t3+2]*3;
    var ux=pos[b]-pos[a],uy=pos[b+1]-pos[a+1],uz=pos[b+2]-pos[a+2],vx=pos[c]-pos[a],vy=pos[c+1]-pos[a+1],vz=pos[c+2]-pos[a+2];
    var fx=uy*vz-uz*vy,fy=uz*vx-ux*vz,fz=ux*vy-uy*vx;
    nrm[a]+=fx;nrm[a+1]+=fy;nrm[a+2]+=fz;nrm[b]+=fx;nrm[b+1]+=fy;nrm[b+2]+=fz;nrm[c]+=fx;nrm[c+1]+=fy;nrm[c+2]+=fz;}
  for(i=0;i<n;i++){var l=Math.hypot(nrm[i*3],nrm[i*3+1],nrm[i*3+2])||1;nrm[i*3]/=l;nrm[i*3+1]/=l;nrm[i*3+2]/=l;}
  var misc=new Uint8Array(buf,L.misc.offset,n*4);
  return {n:n,nt:nt,pos:pos,nrm:nrm,idx:idx,bone:new Uint8Array(buf,L.bone.offset,n*4),bw:new Uint8Array(buf,L.bw.offset,n*4),
    mus:new Uint8Array(buf,L.mus.offset,n*4),misc:misc};}
/* For the preview page: colour each muscle region on its own (setDebug({muscles:1})). */
var DEBUG={};
function setDebug(o){DEBUG=o||{};}
/* a muscle's tag (rig.js MUSCLE_TAGS) as its number in the mesh */
var MUSID={};BODY.muscles.forEach(function(m,i){MUSID[m]=i+1;});

/* ---- the theme ---- */
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
function scale(c,k){return [c[0]*k,c[1]*k,c[2]*k];}
function mixc(a,b,w){return [a[0]+(b[0]-a[0])*w,a[1]+(b[1]-a[1])*w,a[2]+(b[2]-a[2])*w];}
/* What the figure needs from the theme: the stage (top, middle, edge, the pool of light
   on the floor), the materials, the lights, the muscles' colours, the arrow. */
function readTheme(el){
  var cs=getComputedStyle(el),g=function(n){return cs.getPropertyValue(n);};
  function col(n,d){return cssRgb(g(n),d);}
  function num(n,d){var v=parseFloat(g(n));return isFinite(v)?v:d;}
  var skin=lin(col("--mq-skin",[.4,.42,.45])),metal=lin(col("--mq-metal",[.22,.24,.29]));
  var pad=lin(col("--mq-pad",[.2,.22,.26])),steel=lin(col("--mq-steel",[.58,.61,.67]));
  var rim=lin(col("--mq-rim",[.7,.84,1])),key=[1,.97,.93],light=num("--mq-shade",1)<.95;
  return {light:light,
    top:col("--mq-top",[.035,.067,.118]),mid:col("--mq-mid",[.059,.106,.18]),edge:col("--mq-edge",[.02,.04,.075]),
    pool:col("--mq-pool",[.125,.408,.769]),poolK:num("--mq-pool-k",1),
    skin:scale(skin,1.12),shorts:scale(pad,.55),shoes:scale(metal,.7),soles:scale(steel,.75),eyes:scale(skin,.85),
    /* materials by number (kit.js): 2 iron, 3 pads and grips, 4 steel, 5 wall, 6 mat,
       7 the machine's line; [albedo, specular strength, shininess, glow] */
    mats:{1:[skin,.3,22,0],2:[metal,.35,40,0],3:[scale(pad,.9),.12,10,0],4:[steel,.9,90,0],5:[scale(metal,1.15),.06,8,0],
      6:[scale(pad,.8),.04,6,0],7:[lin(col("--mq-mark",[.76,.28,.3])),.4,30,.35],8:[scale(metal,.8),.3,30,0],9:[scale(steel,.9),.2,20,0]},
    key:key,fill:scale(mixc(key,rim,.55),.62),sky:scale(mixc(key,rim,.65),light?.75:.5),
    bounce:scale(lin(col("--mq-bounce",[.38,.6,.89])),light?.55:.42),rim:rim,spec:mixc(key,rim,.25),
    deep:lin(col("--mq-deep",[.89,.3,.23])),hot:lin(col("--mq-hot",[1,.67,.48])),
    arrow:col("--mq-arrow",[.52,.73,1]),arrowGlow:col("--mq-arrow-glow",[.27,.55,1])};}

/* ---- shaders ---- */
var HEAD="#version 300 es\nprecision highp float;precision highp int;precision highp sampler2D;precision highp sampler2DShadow;\n";
/* The body's skin moved by its bones. Each vertex is in up to two muscles, with how
   much (body.js mus); how much it glows is worked out here and that is what is blended
   across a triangle. (Blending the muscles' numbers instead would pass through other
   muscles' numbers between two regions and light thin lines that belong to neither.) */
var VS_BODY=
  "layout(location=0) in vec3 aP;layout(location=1) in vec3 aN;layout(location=2) in uvec4 aB;layout(location=3) in vec4 aW;\n"
 +"layout(location=4) in vec4 aM;layout(location=5) in vec4 aX;\n"
 +"uniform sampler2D uBones;uniform mat4 uVP;uniform float uHL[21];\n"
 +"out vec3 vP;out vec3 vN;out vec2 vM;out vec4 vX;flat out int vI;\n"
 +"float lit(float m,float w){int i=int(m+.5);return i>0&&i<21?uHL[i]*smoothstep(.12,.6,w/255.):0.;}\n"
 +"mat4 bm(uint i){int y=int(i);return mat4(texelFetch(uBones,ivec2(0,y),0),texelFetch(uBones,ivec2(1,y),0),texelFetch(uBones,ivec2(2,y),0),texelFetch(uBones,ivec2(3,y),0));}\n"
 +"void main(){mat4 S=bm(aB.x)*aW.x+bm(aB.y)*aW.y+bm(aB.z)*aW.z+bm(aB.w)*aW.w;vec4 w=S*vec4(aP,1.);\n"
 +"int id=int(aM.x+.5);vM=vec2(min(lit(aM.x,aM.y)+lit(aM.z,aM.w),1.),id==31?1.:0.);vI=id;\n"
 +"vP=w.xyz;vN=mat3(S)*aN;vX=aX;gl_Position=uVP*w;}";
var VS_EQ=
  "layout(location=0) in vec3 aP;layout(location=1) in vec3 aN;uniform mat4 uVP;uniform mat4 uModel;out vec3 vP;out vec3 vN;\n"
 +"void main(){vec4 w=uModel*vec4(aP,1.);vP=w.xyz;vN=mat3(uModel)*aN;gl_Position=uVP*w;}";
/* The lighting, shared by the body and the equipment. */
var LIGHT=
  "uniform vec3 uEye,uLK,uLF,uLR,uKeyC,uFillC,uSkyC,uBncC,uRimC,uSpcC;uniform sampler2DShadow uSh;uniform mat4 uLVP;uniform float uShOn;\n"
 +"float shadowAt(vec3 p,vec3 n){if(uShOn<.5)return 1.;vec4 q=uLVP*vec4(p+n*.008,1.);vec3 s=q.xyz/q.w*.5+.5;\n"
 +" if(s.x<0.||s.x>1.||s.y<0.||s.y>1.||s.z>1.)return 1.;vec2 px=1./vec2(textureSize(uSh,0));float k=0.;\n"
 +" for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++)k+=texture(uSh,vec3(s.xy+vec2(float(x),float(y))*px*1.4,s.z-.0012));return k/9.;}\n"
 +"vec3 shade(vec3 P,vec3 N,vec3 alb,float si,float sp,float wrap,float ao){vec3 V=normalize(uEye-P);\n"
 +" float sh=shadowAt(P,N);float nl=dot(N,uLK);float d=max((nl+wrap)/(1.+wrap),0.);\n"
 +" vec3 H=normalize(uLK+V);float s=pow(max(dot(N,H),0.),sp)*si*smoothstep(-.1,.2,nl)*(sp+8.)/32.;\n"
 +" float df=max((dot(N,uLF)+.35)/1.35,0.);vec3 amb=mix(uBncC,uSkyC,N.y*.5+.5);\n"
 +" float fr=pow(1.-max(dot(N,V),0.),3.);float rim=fr*smoothstep(-.3,.5,dot(N,uLR));\n"
 +" return alb*(uKeyC*d*mix(.35,1.,sh)+uFillC*df*.42+amb*ao)+uSpcC*s*sh+uRimC*rim*.6*ao;}\n"
 +"vec3 tone(vec3 c){c*=1.05;c=c/(1.+c*.18);return pow(clamp(c,0.,1.),vec3(1./2.2));}\n";
/* The body: skin, and the outfit drawn on it from how far inside the shorts, the
   trainers and their soles each point is (body.js), as lines sharp at any size; the
   muscles the exercise works glowing through the skin (and a little through the
   shorts). */
var FS_BODY=
  "in vec3 vP;in vec3 vN;in vec2 vM;in vec4 vX;flat in int vI;out vec4 o;\n"
 +"uniform vec3 uSkin,uShorts,uShoes,uSoles,uEyes,uDeep,uHot;uniform float uAct,uDbg;\n"+LIGHT
 +"float inside(float b){float d=(b-128.)/2000.;return clamp(d/max(fwidth(d),1e-5)+.5,0.,1.);}\n"
 +"void main(){vec3 N=normalize(vN);float cav=vX.w/255.;\n"
 +" float sh=inside(vX.x),so=inside(vX.y),sl=inside(vX.z)*so;\n"
 +" vec3 alb=mix(mix(mix(uSkin,uShorts,sh),uShoes,so),uSoles,sl);alb=mix(alb,uEyes,step(.5,vM.y));\n"
 +" float si=mix(mix(.3,.05,sh),mix(.42,.15,sl),so),sp=mix(mix(20.,8.,sh),44.,so),wrap=mix(mix(.45,.2,sh),.2,so);\n"
 +" float hem=1.-smoothstep(.0008,.0035,abs((vX.x-128.)/2000.));alb*=1.-.35*hem*step(.5,sh+hem);\n"
 +" float ao=1.-.55*smoothstep(.53,.8,cav);\n"
 +" float h=vM.x*(1.-.35*sh)*(1.-so);\n"
 +" alb=mix(alb,uDeep,h*.85);\n"
 +" vec3 c=shade(vP,N,alb,si,sp,wrap,ao);\n"
 +" vec3 V=normalize(uEye-vP);float edge=pow(1.-max(dot(N,V),0.),1.5);\n"
 +" c+=uHot*h*(.12+.3*uAct)*(.6+.8*edge);\n"
 +" if(uDbg>.5){vec3 k=fract(vec3(float(vI))*vec3(.618,.381,.789)+.1);c=(vI>0&&vI<21)?k:vec3(.08)+.04*dot(N,vec3(.3,.8,.5));}\n"
 +" o=vec4(uDbg>.5?c:tone(c),1.);}";
var FS_EQ=
  "in vec3 vP;in vec3 vN;out vec4 o;uniform vec3 uAlb;uniform vec3 uSpc;\n"+LIGHT
 +"void main(){vec3 N=normalize(vN);\n"
 +" vec3 c=shade(vP,N,uAlb,uSpc.x,uSpc.y,.15,1.)+uAlb*uSpc.z;o=vec4(tone(c),1.);}";
/* The stage behind: the theme's top colour above, its middle at the horizon, a soft
   light behind the figure. */
var VS_FULL="out vec2 vU;void main(){vec2 p=vec2(gl_VertexID==1?3.:-1.,gl_VertexID==2?3.:-1.);vU=p*.5+.5;gl_Position=vec4(p,.9999,1.);}";
var FS_BG=
  "in vec2 vU;out vec4 o;uniform vec3 uTop,uMid,uEdge;uniform vec2 uFig;uniform float uAsp;\n"
 +"void main(){vec3 c=mix(uMid,uTop,smoothstep(.25,1.,vU.y));vec2 d=(vU-uFig)*vec2(uAsp,1.);\n"
 +" c=mix(c,mix(uMid,vec3(1.),.06),.55*(1.-smoothstep(0.,.75,length(d))));\n"
 +" c=mix(c,uEdge,.45*smoothstep(.55,1.15,length((vU-.5)*vec2(uAsp,1.))));o=vec4(c,1.);}";
/* The floor: a disc of the stage's middle colour, the theme's pool of light under the
   figure, the figure's shadow, fading into the stage at its rim. */
var VS_FLOOR="layout(location=0) in vec2 aP;uniform mat4 uVP;uniform vec2 uC;uniform float uR;out vec3 vP;\n"
 +"void main(){vec3 p=vec3(uC.x+aP.x*uR,0.,uC.y+aP.y*uR);vP=p;gl_Position=uVP*vec4(p,1.);}";
var FS_FLOOR=
  "in vec3 vP;out vec4 o;uniform vec3 uMid,uEdge,uPool;uniform float uPoolK;uniform vec2 uC;uniform float uR;\n"
 +"uniform sampler2DShadow uSh;uniform mat4 uLVP;uniform float uShOn;uniform vec4 uFoot;\n"
 +"float sh(vec3 p){if(uShOn<.5)return 1.;vec4 q=uLVP*vec4(p,1.);vec3 s=q.xyz/q.w*.5+.5;if(s.x<0.||s.x>1.||s.y<0.||s.y>1.)return 1.;\n"
 +" vec2 px=1./vec2(textureSize(uSh,0));float k=0.;for(int x=-2;x<=2;x++)for(int y=-2;y<=2;y++)k+=texture(uSh,vec3(s.xy+vec2(float(x),float(y))*px*1.8,s.z-.002));return k/25.;}\n"
 +"void main(){float r=length(vP.xz-uC)/uR;vec2 f=(vP.xz-uFoot.xy)/uFoot.zw;float pool=1.-smoothstep(0.,1.,length(f));\n"
 +" vec3 c=mix(mix(uMid,uEdge,.35),uEdge,smoothstep(.2,1.,r));c+=uPool*uPoolK*.35*pool*pool;\n"
 +" float s=sh(vP);c*=mix(.5,1.,s);\n"
 +" float ao=1.-.35*(1.-smoothstep(0.,.8,length(f)))*(1.-s*.5);c*=ao;\n"
 +" o=vec4(c,1.-smoothstep(.62,1.,r));}";
var FS_DEPTH="out vec4 o;void main(){o=vec4(1.);}";
/* The arrow, on the picture: pixels in, its colour by alpha. */
var VS_ARROW="layout(location=0) in vec2 aP;layout(location=1) in float aA;uniform vec2 uRes;out float vA;\n"
 +"void main(){vA=aA;gl_Position=vec4(aP/uRes*2.-1.,0.,1.);}";
var FS_ARROW="in float vA;out vec4 o;uniform vec3 uC;uniform float uK;void main(){float a=vA*uK;o=vec4(uC*a,a);}";

/* ---- GL ---- */
var GL2=null;
function supported(){
  if(GL2!==null)return GL2;
  try{var c=document.createElement("canvas");GL2=!!(window.WebGL2RenderingContext&&c.getContext("webgl2"));}catch(e){GL2=false;}
  return GL2;}
function shader(gl,type,src){
  var s=gl.createShader(type);gl.shaderSource(s,HEAD+src);gl.compileShader(s);
  if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)&&!gl.isContextLost())throw new Error(gl.getShaderInfoLog(s)||"shader");
  return s;}
function program(gl,vs,fs){
  var p=gl.createProgram();
  gl.attachShader(p,shader(gl,gl.VERTEX_SHADER,vs));gl.attachShader(p,shader(gl,gl.FRAGMENT_SHADER,fs));
  gl.linkProgram(p);
  if(!gl.getProgramParameter(p,gl.LINK_STATUS)&&!gl.isContextLost())throw new Error(gl.getProgramInfoLog(p)||"link");
  var u={},n=gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS);
  for(var i=0;i<n;i++){var a=gl.getActiveUniform(p,i),nm=a.name.replace(/\[0\]$/,"");u[nm]=gl.getUniformLocation(p,a.name);}
  return {p:p,u:u};}

/* ---- 4×4 matrices, column major ---- */
function mul4(a,b){var o=new Float32Array(16);
  for(var c=0;c<4;c++)for(var r=0;r<4;r++)o[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];return o;}
function lookAt(eye,f,r,u){
  return new Float32Array([r[0],u[0],-f[0],0,r[1],u[1],-f[1],0,r[2],u[2],-f[2],0,
    -V.dot(r,eye),-V.dot(u,eye),V.dot(f,eye),1]);}
function persp(ty,asp,n,fr){var f=1/ty,nf=1/(n-fr);
  return new Float32Array([f/asp,0,0,0,0,f,0,0,0,0,(fr+n)*nf,-1,0,0,2*fr*n*nf,0]);}
function ortho(r,n,fr){return new Float32Array([1/r,0,0,0,0,1/r,0,0,0,0,-2/(fr-n),0,0,0,-(fr+n)/(fr-n),1]);}

/* The camera's lights: the key from the front, left and above, a fill from the right,
   the edge light from behind. */
function lights(cam){
  function L(a,b,c){return V.norm(V.add(V.add(V.mul(cam.f,a),V.mul(cam.r,b)),V.mul(cam.u,c)));}
  return {key:L(-.5,-.42,.76),fill:L(-.62,.7,.18),rim:L(.85,.25,.45)};}

/* ---- one live figure ---- */
var LIVE=[];
function Mannequin(el){
  var name=el.getAttribute("data-mq"),rec=recordFor(name);
  var canvas=el.querySelector("canvas"),btn=el.querySelector(".fig3d-play");
  var gl=null,P={},body=null,boneTex=null,shadow=null,shapes={},vaoBody=null,vaoFloor=null,vaoArrow=null,bufArrow=null;
  var hl=highlight(muscleOf(name),secondaryOf(name),rec&&rec.refine),hlv=new Float32Array(21);
  var theme=null,look="",pts=null;
  /* the view: where it is, where it is going, and how fast it is turning */
  var view0={yaw:(rec&&rec.cam&&rec.cam.yaw!=null)?rec.cam.yaw:60,pitch:(rec&&rec.cam&&rec.cam.pitch!=null)?rec.cam.pitch:8,zoom:1};
  var view={yaw:view0.yaw,pitch:view0.pitch,zoom:1},goal={yaw:view0.yaw,pitch:view0.pitch,zoom:1},spin=0,held=false;
  var playing=!isReduced(),visible=true,raf=0,clock=0,last=0,ema=16,slow=0,frames=0;
  var dpr=Math.min(window.devicePixelRatio||1,3),W=0,H=0,dead=false,err="",stillU=1,io=null,ro=null,cam=null;
  function nothing(){}
  var self={el:el,name:name,sync:nothing,wake:nothing,toggle:nothing,setU:nothing,setHL:nothing,
    probe:function(){return null;},
    dispose:function(){dead=true;},
    state:function(){return {live:!!gl&&!dead&&!!body,playing:playing,frames:frames,q:dpr,err:err,w:W,h:H,yaw:view.yaw,look:look};}};
  function fail(e){
    err=String(e&&e.message||e);dead=true;el.removeAttribute("data-live");stop();
    try{var lc=gl&&gl.getExtension("WEBGL_lose_context");if(lc)lc.loseContext();}catch(x){}
    gl=null;}
  if(!rec||!canvas){err="no record";dead=true;return self;}
  try{
    gl=canvas.getContext("webgl2",{antialias:true,alpha:false,depth:true,stencil:false,premultipliedAlpha:true,powerPreference:"default"});
    if(!gl)throw new Error("no WebGL2");
    P.body=program(gl,VS_BODY,FS_BODY);P.eq=program(gl,VS_EQ,FS_EQ);P.bg=program(gl,VS_FULL,FS_BG);
    P.floor=program(gl,VS_FLOOR,FS_FLOOR);P.sBody=program(gl,VS_BODY,FS_DEPTH);P.sEq=program(gl,VS_EQ,FS_DEPTH);
    P.arrow=program(gl,VS_ARROW,FS_ARROW);
    /* the bones' matrices: four texels a bone */
    boneTex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,boneTex);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,4,NB,0,gl.RGBA,gl.FLOAT,null);
    /* the shadow map, from the key light */
    var st=gl.createTexture(),SZ=1024;gl.bindTexture(gl.TEXTURE_2D,st);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.DEPTH_COMPONENT24,SZ,SZ,0,gl.DEPTH_COMPONENT,gl.UNSIGNED_INT,null);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_COMPARE_MODE,gl.COMPARE_REF_TO_TEXTURE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_COMPARE_FUNC,gl.LEQUAL);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    var sf=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,sf);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,st,0);
    shadow={tx:st,fb:sf,size:SZ,ok:gl.checkFramebufferStatus(gl.FRAMEBUFFER)===gl.FRAMEBUFFER_COMPLETE};
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);
    /* the floor: a disc */
    var ring=[0,0],N=64;for(var i=0;i<=N;i++){var a=i/N*Math.PI*2;ring.push(Math.cos(a),Math.sin(a));}
    vaoFloor=gl.createVertexArray();gl.bindVertexArray(vaoFloor);
    var fb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,fb);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(ring),gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
    vaoArrow=gl.createVertexArray();gl.bindVertexArray(vaoArrow);
    bufArrow=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,bufArrow);
    gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,12,0);
    gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,1,gl.FLOAT,false,12,8);
    gl.bindVertexArray(null);
  }catch(e){fail(e);return self;}
  canvas.addEventListener("webglcontextlost",function(ev){ev.preventDefault();fail("context lost");});

  /* the body's buffers, once it has loaded */
  function upload(B){
    vaoBody=gl.createVertexArray();gl.bindVertexArray(vaoBody);
    function attr(loc,data,size,type,norm,integer){
      var b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
      gl.enableVertexAttribArray(loc);
      if(integer)gl.vertexAttribIPointer(loc,size,type,0,0);else gl.vertexAttribPointer(loc,size,type,norm,0,0);}
    attr(0,B.pos,3,gl.FLOAT,false);attr(1,B.nrm,3,gl.FLOAT,false);
    attr(2,B.bone,4,gl.UNSIGNED_BYTE,false,true);attr(3,B.bw,4,gl.UNSIGNED_BYTE,true);
    attr(4,B.mus,4,gl.UNSIGNED_BYTE,false);attr(5,B.misc,4,gl.UNSIGNED_BYTE,false);
    var ib=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,B.idx,gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    body=B;}
  /* an equipment shape's buffers, made the first time it is drawn */
  function shapeOf(key){
    if(shapes[key])return shapes[key];
    var m=build(key);if(!m)return null;
    var vao=gl.createVertexArray();gl.bindVertexArray(vao);
    [m.p,m.n].forEach(function(d,loc){var b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,d,gl.STATIC_DRAW);
      gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,3,gl.FLOAT,false,0,0);});
    var ib=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,m.i,gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    shapes[key]={vao:vao,n:m.i.length};return shapes[key];}

  /* ---- size ---- */
  function resize(){
    if(dead)return false;
    var w=Math.max(2,Math.round(canvas.clientWidth*dpr)),h=Math.max(2,Math.round(canvas.clientHeight*dpr));
    if(w===W&&h===H)return false;
    W=w;H=h;canvas.width=W;canvas.height=H;return true;}

  /* ---- the camera ---- */
  function camNow(){
    if(!pts)pts=framePoints(rec);
    cam=fitCamera(rec,pts,W/H,view.yaw,view.pitch,view.zoom);
    return cam;}
  /* the view eases toward where the finger put it; let go, it carries on and settles */
  function settle(dt){
    var k=1-Math.exp(-dt/(held?.045:.11));
    if(!held&&Math.abs(spin)>.5){goal.yaw+=spin*dt;spin*=Math.exp(-dt/.32);}else if(!held)spin=0;
    var moved=Math.abs(goal.yaw-view.yaw)+Math.abs(goal.pitch-view.pitch)+Math.abs(goal.zoom-view.zoom)*40;
    view.yaw+=(goal.yaw-view.yaw)*k;view.pitch+=(goal.pitch-view.pitch)*k;view.zoom+=(goal.zoom-view.zoom)*k;
    return moved>.02||Math.abs(spin)>.5;}

  /* ---- a frame ---- */
  function draw(s){
    if(dead||!body)return;
    try{
      resize();
      if(!theme)retheme();
      var ph=playing?phaseAt(rec,s):{u:stillU,act:1},sc=sceneAt(rec,ph.u),c=camNow(),Ls=lights(c),th=theme;
      gl.bindTexture(gl.TEXTURE_2D,boneTex);
      gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,4,NB,gl.RGBA,gl.FLOAT,sc.M);
      var near=Math.max(.05,c.dist-4),far=c.dist+6;
      var VP=mul4(persp(c.ty,W/H,near,far),lookAt(c.p,c.f,c.r,c.u));
      /* the light's view: an orthographic box round everything, looking along the key */
      var ctr=pts.center,rad=pts.radius*1.15,lp=V.add(ctr,V.mul(Ls.key,rad*3));
      var lf=V.mul(Ls.key,-1),lr=V.norm(V.cross(lf,Math.abs(lf[1])>.95?[1,0,0]:[0,1,0])),lu=V.cross(lr,lf);
      var LVP=mul4(ortho(rad,rad*.5,rad*5.5),lookAt(lp,lf,lr,lu));
      var parts=sc.solids.map(place).filter(Boolean);
      /* ---- the shadow map ---- */
      var shOn=shadow.ok?1:0;
      if(shOn){
        gl.bindFramebuffer(gl.FRAMEBUFFER,shadow.fb);gl.viewport(0,0,shadow.size,shadow.size);
        gl.enable(gl.DEPTH_TEST);gl.depthMask(true);gl.clear(gl.DEPTH_BUFFER_BIT);gl.disable(gl.BLEND);
        gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(1.5,3);
        gl.useProgram(P.sBody.p);bindBones(P.sBody.u);gl.uniformMatrix4fv(P.sBody.u.uVP,false,LVP);
        gl.bindVertexArray(vaoBody);gl.drawElements(gl.TRIANGLES,body.nt*3,gl.UNSIGNED_SHORT,0);
        gl.useProgram(P.sEq.p);gl.uniformMatrix4fv(P.sEq.u.uVP,false,LVP);
        parts.forEach(function(pt){var sh=shapeOf(pt.key);if(!sh)return;
          gl.uniformMatrix4fv(P.sEq.u.uModel,false,pt.mat);gl.bindVertexArray(sh.vao);gl.drawElements(gl.TRIANGLES,sh.n,gl.UNSIGNED_SHORT,0);});
        gl.disable(gl.POLYGON_OFFSET_FILL);}
      /* ---- the picture ---- */
      gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,W,H);
      gl.clearColor(th.edge[0],th.edge[1],th.edge[2],1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      /* the stage */
      var mid=project3(VP,ctr);
      gl.disable(gl.DEPTH_TEST);gl.useProgram(P.bg.p);gl.bindVertexArray(null);
      gl.uniform3fv(P.bg.u.uTop,th.top);gl.uniform3fv(P.bg.u.uMid,th.mid);gl.uniform3fv(P.bg.u.uEdge,th.edge);
      gl.uniform2f(P.bg.u.uFig,mid[0]*.5+.5,mid[1]*.5+.5);gl.uniform1f(P.bg.u.uAsp,W/H);
      gl.drawArrays(gl.TRIANGLES,0,3);
      /* the floor */
      gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
      var fu=P.floor.u,foot=pts.foot;gl.useProgram(P.floor.p);
      gl.uniformMatrix4fv(fu.uVP,false,VP);gl.uniform2f(fu.uC,ctr[0],ctr[2]);gl.uniform1f(fu.uR,Math.max(2.2,rad*2.2));
      gl.uniform3fv(fu.uMid,th.mid);gl.uniform3fv(fu.uEdge,th.edge);gl.uniform3fv(fu.uPool,th.pool);gl.uniform1f(fu.uPoolK,th.poolK);
      gl.uniform4f(fu.uFoot,foot[0],foot[1],foot[2],foot[3]);
      shadowUniforms(fu,LVP,shOn);
      gl.bindVertexArray(vaoFloor);gl.drawArrays(gl.TRIANGLE_FAN,0,66);
      gl.disable(gl.BLEND);
      /* the equipment, then the body */
      gl.enable(gl.DEPTH_TEST);gl.depthMask(true);
      var eu=P.eq.u;gl.useProgram(P.eq.p);gl.uniformMatrix4fv(eu.uVP,false,VP);lightUniforms(eu,c,Ls,th);shadowUniforms(eu,LVP,shOn);
      parts.forEach(function(pt){var sh=shapeOf(pt.key);if(!sh)return;
        var mt=th.mats[pt.m]||th.mats[2];
        gl.uniformMatrix4fv(eu.uModel,false,pt.mat);gl.uniform3fv(eu.uAlb,mt[0]);gl.uniform3f(eu.uSpc,mt[1],mt[2],mt[3]);
        gl.bindVertexArray(sh.vao);gl.drawElements(gl.TRIANGLES,sh.n,gl.UNSIGNED_SHORT,0);});
      var bu=P.body.u;gl.useProgram(P.body.p);bindBones(bu);gl.uniformMatrix4fv(bu.uVP,false,VP);
      lightUniforms(bu,c,Ls,th);shadowUniforms(bu,LVP,shOn);
      gl.uniform1fv(bu.uHL,hlv);gl.uniform1f(bu.uAct,ph.act);
      gl.uniform3fv(bu.uSkin,th.skin);gl.uniform3fv(bu.uShorts,th.shorts);gl.uniform3fv(bu.uShoes,th.shoes);gl.uniform3fv(bu.uSoles,th.soles);gl.uniform3fv(bu.uEyes,th.eyes);
      gl.uniform1f(bu.uDbg,DEBUG.muscles?1:0);
      gl.uniform3fv(bu.uDeep,th.deep);gl.uniform3fv(bu.uHot,th.hot);
      gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK);
      gl.bindVertexArray(vaoBody);gl.drawElements(gl.TRIANGLES,body.nt*3,gl.UNSIGNED_SHORT,0);
      gl.disable(gl.CULL_FACE);
      /* the arrow */
      drawArrow(c,ph);
      gl.bindVertexArray(null);
      if(!el.hasAttribute("data-live"))el.setAttribute("data-live","1");
      frames++;
    }catch(e){fail(e);}}
  function project3(M,p){var x=M[0]*p[0]+M[4]*p[1]+M[8]*p[2]+M[12],y=M[1]*p[0]+M[5]*p[1]+M[9]*p[2]+M[13],w=M[3]*p[0]+M[7]*p[1]+M[11]*p[2]+M[15];
    return [x/w,y/w];}
  function bindBones(u){gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,boneTex);gl.uniform1i(u.uBones,0);}
  function shadowUniforms(u,LVP,on){
    gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,shadow.tx);gl.uniform1i(u.uSh,1);
    gl.uniformMatrix4fv(u.uLVP,false,LVP);gl.uniform1f(u.uShOn,on);}
  function lightUniforms(u,c,Ls,th){
    gl.uniform3fv(u.uEye,c.p);gl.uniform3fv(u.uLK,Ls.key);gl.uniform3fv(u.uLF,Ls.fill);gl.uniform3fv(u.uLR,Ls.rim);
    gl.uniform3fv(u.uKeyC,th.key);gl.uniform3fv(u.uFillC,th.fill);gl.uniform3fv(u.uSkyC,th.sky);gl.uniform3fv(u.uBncC,th.bounce);
    gl.uniform3fv(u.uRimC,th.rim);gl.uniform3fv(u.uSpcC,th.spec);}
  /* the arrow: a soft glow under a solid line, and its head */
  var arrowKey="",arrowVerts=null;
  function drawArrow(c,ph){
    var key=[c.yaw.toFixed(1),c.pitch.toFixed(1),c.dist.toFixed(3),W,H].join("|");
    if(key!==arrowKey){arrowKey=key;arrowVerts=arrowMesh(arrowShape(rec,c,W,H),W/720);}
    if(!arrowVerts||!arrowVerts.n)return;
    gl.disable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(P.arrow.p);gl.bindVertexArray(vaoArrow);gl.bindBuffer(gl.ARRAY_BUFFER,bufArrow);
    gl.bufferData(gl.ARRAY_BUFFER,arrowVerts.d,gl.DYNAMIC_DRAW);gl.uniform2f(P.arrow.u.uRes,W,H);
    var k=ph.u===stillU&&!playing?1:(ph.act>.95?1:.72);
    gl.uniform3fv(P.arrow.u.uC,theme.arrowGlow);gl.uniform1f(P.arrow.u.uK,.5*k);gl.drawArrays(gl.TRIANGLES,0,arrowVerts.glow);
    gl.uniform3fv(P.arrow.u.uC,theme.arrow);gl.uniform1f(P.arrow.u.uK,k);gl.drawArrays(gl.TRIANGLES,arrowVerts.glow,arrowVerts.n-arrowVerts.glow);
    gl.disable(gl.BLEND);}

  /* ---- time ---- */
  function tick(now){
    raf=0;if(dead)return;
    var dt=last?Math.min(now-last,100):16;
    if(last){if(playing)clock+=dt;ema=ema*.92+dt*.08;adapt();}
    last=now;
    var turning=settle(dt/1000);
    draw(clock/1000);
    if((playing||turning||held)&&visible&&!document.hidden)raf=requestAnimationFrame(tick);
    else last=0;}
  /* a phone that cannot keep up gets fewer pixels (never fewer than one a point), then
     a still figure */
  function adapt(){
    if(ema>30)slow++;else slow=Math.max(0,slow-1);
    if(slow>40){slow=0;
      if(dpr>1.01){dpr=Math.max(1,dpr-.5);resize();}
      else if(ema>55&&playing){playing=false;syncBtn();}}}
  function start(){if(!raf&&!dead&&visible&&!document.hidden){last=0;raf=requestAnimationFrame(tick);}}
  function stop(){if(raf){cancelAnimationFrame(raf);raf=0;}last=0;}
  function once(){if(!dead&&!raf)requestAnimationFrame(function(){if(!raf)draw(clock/1000);});}
  function syncBtn(){
    if(!btn)return;
    btn.setAttribute("aria-label",t(playing?"Pause":"Play"));
    btn.setAttribute("aria-pressed",playing?"false":"true");
    el.toggleAttribute("data-paused",!playing);}
  function toggle(){
    playing=!playing;
    if(!playing){var ph=phaseAt(rec,clock/1000);stillU=ph.u;}
    syncBtn();if(playing)start();else{stop();once();}}
  self.toggle=toggle;

  /* ---- the theme ---- */
  function lookOf(){var de=document.documentElement;
    return (el.closest("[data-palette]")||de).getAttribute("data-palette")+"|"+(el.closest("[data-theme]")||de).getAttribute("data-theme");}
  function retheme(){look=lookOf();theme=readTheme(el);}
  function setHL(h){hl=h||{};hlv=new Float32Array(21);for(var k in hl)if(MUSID[k])hlv[MUSID[k]]=hl[k];}
  setHL(hl);
  self.sync=function(){
    if(dead)return;
    if(body)el.setAttribute("data-live","1");
    syncBtn();
    if(lookOf()!==look){retheme();once();}
    if(resize())once();};

  /* ---- turning it ---- */
  if(el.hasAttribute("data-mq-turn")){
    var ptrs={},drag=null,pinch=null,lastTap=0;
    canvas.addEventListener("pointerdown",function(ev){
      ptrs[ev.pointerId]={x:ev.clientX,y:ev.clientY};
      var ids=Object.keys(ptrs);
      if(ids.length===2){var a=ptrs[ids[0]],b=ptrs[ids[1]];pinch={d:Math.hypot(a.x-b.x,a.y-b.y),zoom:goal.zoom};drag=null;return;}
      drag={x:ev.clientX,y:ev.clientY,yaw:goal.yaw,pitch:goal.pitch,moved:false,id:ev.pointerId,hist:[[ev.clientX,performance.now()]]};
      spin=0;});
    canvas.addEventListener("pointermove",function(ev){
      if(ptrs[ev.pointerId])ptrs[ev.pointerId]={x:ev.clientX,y:ev.clientY};
      if(pinch){var ids=Object.keys(ptrs);if(ids.length<2)return;var a=ptrs[ids[0]],b=ptrs[ids[1]];
        goal.zoom=Math.max(.7,Math.min(1.6,pinch.zoom*pinch.d/Math.max(Math.hypot(a.x-b.x,a.y-b.y),1)));held=true;start();return;}
      if(!drag||ev.pointerId!==drag.id)return;
      var dx=ev.clientX-drag.x,dy=ev.clientY-drag.y;
      if(!drag.moved&&Math.hypot(dx,dy)<6)return;
      if(!drag.moved){drag.moved=true;held=true;try{canvas.setPointerCapture(ev.pointerId);}catch(e){}}
      goal.yaw=drag.yaw-dx*.5;
      goal.pitch=Math.max(-6,Math.min(48,drag.pitch+dy*.25));
      drag.hist.push([ev.clientX,performance.now()]);if(drag.hist.length>6)drag.hist.shift();
      start();});
    function up(ev){
      delete ptrs[ev.pointerId];
      if(pinch){if(Object.keys(ptrs).length<2){pinch=null;held=false;}return;}
      if(!drag||ev.pointerId!==drag.id)return;
      var d=drag;drag=null;held=false;
      if(!d.moved){
        var now=performance.now();
        if(now-lastTap<320){lastTap=0;goal.yaw=view0.yaw+Math.round((view.yaw-view0.yaw)/360)*360;goal.pitch=view0.pitch;goal.zoom=1;spin=0;start();return;}
        lastTap=now;
        setTimeout(function(){if(lastTap===now)toggle();},330);return;}
      /* let go while turning: it carries on, slowing */
      var h=d.hist,a0=h[0],a1=h[h.length-1],dtm=(a1[1]-a0[1])/1000;
      spin=dtm>0&&performance.now()-a1[1]<80?Math.max(-720,Math.min(720,-(a1[0]-a0[0])*.5/dtm)):0;
      start();}
    canvas.addEventListener("pointerup",up);canvas.addEventListener("pointercancel",up);
    canvas.addEventListener("wheel",function(ev){ev.preventDefault();goal.zoom=Math.max(.7,Math.min(1.6,goal.zoom*Math.exp(ev.deltaY*.0015)));start();},{passive:false});}
  if(btn)btn.addEventListener("click",function(ev){ev.stopPropagation();toggle();});

  /* ---- on screen or not, and its size ---- */
  if(window.IntersectionObserver){
    io=new IntersectionObserver(function(es){visible=es[es.length-1].isIntersecting;if(visible){if(playing)start();else once();}else stop();});
    io.observe(el);}
  if(window.ResizeObserver){ro=new ResizeObserver(function(){if(resize())once();});ro.observe(canvas);}
  self.wake=function(){if(document.hidden)stop();else if(playing)start();};
  self.dispose=function(){
    stop();dead=true;if(io)io.disconnect();if(ro)ro.disconnect();
    try{var lc=gl&&gl.getExtension("WEBGL_lose_context");if(lc)lc.loseContext();}catch(e){}
    gl=null;};
  /* for the tests: draw now and say what came out */
  self.probe=function(){
    if(dead||!gl||!body)return null;
    draw(clock/1000);
    var px=new Uint8Array(W*H*4);gl.readPixels(0,0,W,H,gl.RGBA,gl.UNSIGNED_BYTE,px);
    var n=W*H,sum=[0,0,0],red=0,lit=0;
    for(var i=0;i<n;i++){var r=px[i*4],g=px[i*4+1],b=px[i*4+2];sum[0]+=r;sum[1]+=g;sum[2]+=b;
      if(r>120&&r>g*1.5&&r>b*1.5)red++;if(r+g+b>360)lit++;}
    return {w:W,h:H,mean:sum.map(function(x){return Math.round(x/n);}),red:red/n,lit:lit/n,corner:[px[0],px[1],px[2]]};};
  self.setU=function(u){playing=false;stillU=u;stop();syncBtn();draw(0);};
  self.setHL=function(h){setHL(h);if(!playing)draw(clock/1000);};
  /* turn it from code (the preview page and the tests): degrees, eased like a finger */
  self.turn=function(dy,dp){goal.yaw+=dy||0;goal.pitch=Math.max(-6,Math.min(48,goal.pitch+(dp||0)));start();};
  self.view=function(){return {yaw:view.yaw,pitch:view.pitch,zoom:view.zoom,cam:cam};};
  /* put the view somewhere at once (the preview page, the offline stills) */
  self.setView=function(v){
    ["yaw","pitch","zoom"].forEach(function(k){if(v&&v[k]!=null)view[k]=goal[k]=v[k];});spin=0;
    if(!raf)draw(clock/1000);};
  syncBtn();resize();retheme();
  loadBody().then(function(B){if(dead)return;try{upload(B);}catch(e){fail(e);return;}
    if(playing)start();else draw(0);}).catch(function(e){err=String(e&&e.message||e);});
  return self;}

/* The arrow's triangles, from its path on the picture: a wide soft glow and a narrow
   line over it, each a strip with round-ish joins, and the head. [x, y, alpha] each. */
function arrowMesh(ar,S){
  if(!ar)return null;
  var d=[];
  function strip(pts,w,soft){
    for(var i=0;i<pts.length-1;i++){
      var a=pts[i],b=pts[i+1],tx=b[0]-a[0],ty=b[1]-a[1],l=Math.hypot(tx,ty)||1,nx=-ty/l*w,ny=tx/l*w;
      if(soft){
        /* the glow: bright on its line, nothing at its edges */
        d.push(a[0],a[1],1,a[0]+nx,a[1]+ny,0,b[0],b[1],1, b[0],b[1],1,a[0]+nx,a[1]+ny,0,b[0]+nx,b[1]+ny,0);
        d.push(a[0],a[1],1,b[0],b[1],1,a[0]-nx,a[1]-ny,0, b[0],b[1],1,b[0]-nx,b[1]-ny,0,a[0]-nx,a[1]-ny,0);}
      else d.push(a[0]+nx,a[1]+ny,1,a[0]-nx,a[1]-ny,1,b[0]+nx,b[1]+ny,1, b[0]+nx,b[1]+ny,1,a[0]-nx,a[1]-ny,1,b[0]-nx,b[1]-ny,1);}}
  function tri(h,g){
    var c=[(h[0][0]+h[1][0]+h[2][0])/3,(h[0][1]+h[1][1]+h[2][1])/3];
    var p=h.map(function(q){return [c[0]+(q[0]-c[0])*g,c[1]+(q[1]-c[1])*g];});
    d.push(p[0][0],p[0][1],1,p[1][0],p[1][1],1,p[2][0],p[2][1],1);}
  strip(ar.body,9*S,true);tri(ar.head,1.6);
  var glow=d.length/3;
  strip(ar.body,2.1*S,false);tri(ar.head,1);
  return {d:new Float32Array(d),n:d.length/3,glow:glow};}

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

export {syncMannequins, hasMannequin, mannequins, supported, readTheme, fig3dHtml, loadBody, setDebug};
