/* Bunyan — the instructional figure: a renderer
   The figure and its equipment, rendered offline as signed distance fields, sphere-
   traced. The body is a sculpted figure: a core of smooth-joined volumes with the
   muscles laid over it, each muscle blended in with a small radius so the edges between
   them read, the way an anatomical model's do. Equipment is hard-edged beside it.

   The look is a studio at night: a satin dark-slate figure, a cool blue light from
   behind drawing its edges, a key from the front and above, a blue bounce from the
   floor, and the muscles an exercise works lit from within in red and orange. The
   floor is never drawn; it only catches the shadow (as alpha), and tools/images.py
   puts the picture on its navy ground, with the glow, the bloom and the arrows.

   render(prims, cam, w, h, y0, y1, opt) shades every opt.step-th row from y0 into RGBA.
   The solids and the distance field are the app's own (js/data/mannequin/geom.js), so
   the still pictures and the live figure in the app are the same model; this file
   only lights it, slowly and carefully, for print-quality stills. */

import {V, clamp, smooth, sdOne, makeSdf, camera, project} from "../../js/data/mannequin/geom.js";
export {V, camera, project};
const {add,sub,mul,dot,len,norm}=V;

/* Materials: albedo, specular, gloss. 1 skin, 2 iron (frames, plates), 3 pads, 4 steel
   (bars, handles), 5 wall, 6 mat, 7 the red accent on a machine, 8 a shoe, 9 its sole. */
export const MAT={1:[.13,.145,.172, .42,38],2:[.034,.044,.064, .38,50],3:[.03,.037,.052, .2,16],4:[.30,.34,.42, .85,80],
  5:[.07,.09,.13, .08,10],6:[.028,.036,.054, .1,12],7:[.55,.06,.07, .4,40],8:[.16,.175,.2, .3,28],9:[.3,.32,.36, .2,18]};

/* The light, set from the camera so every picture is lit alike whatever the angle. */
const KEYC=[1,.98,.95],FILLC=[.5,.62,.85],SKYC=[.42,.52,.75],BOUNCEC=[.12,.32,.78],RIMC=[.45,.68,1],SPECC=[.85,.9,1];
const RED_DEEP=[.78,.07,.04],RED_HOT=[1,.42,.2];
export function lights(cam){
  const L=(a,b,c)=>norm(add(add(mul(cam.f,a),mul(cam.r,b)),mul(cam.u,c)));
  return {key:L(-.55,-.45,.75),fill:L(-.7,.6,.1),rimL:L(.9,-.8,.4),rimR:L(.9,.8,.4),top:norm([0,1,0])};}

export function render(prims,cam,W,H,y0,y1,opt){
  opt=opt||{};
  const K=.04,sdf=makeSdf(prims,K);
  const hl=prims.filter(q=>q.g===1&&q.hl>0);
  /* One bounding sphere for the whole scene: a ray that misses it only needs the floor. */
  let bc=[0,0,0];prims.forEach(q=>{bc=add(bc,q.c);});bc=mul(bc,1/prims.length);
  let br=0;prims.forEach(q=>{br=Math.max(br,len(sub(q.c,bc))+q.r);});
  const Ls=lights(cam),L1=Ls.key;
  const step=opt.step||1,rows=[];for(let y=y0;y<y1;y+=step)rows.push(y);
  const out=new Uint8ClampedArray(W*rows.length*4);
  const nrm=p=>{const e=.001;const a=sdf([p[0]+e,p[1]-e,p[2]-e],9)[0],b=sdf([p[0]-e,p[1]-e,p[2]+e],9)[0],
    c=sdf([p[0]-e,p[1]+e,p[2]-e],9)[0],d=sdf([p[0]+e,p[1]+e,p[2]+e],9)[0];
    return norm([a-b-c+d,-a-b+c+d,-a+b-c+d]);};
  const shadow=(p,l,maxt)=>{let res=1,t=.02;for(let i=0;i<40&&t<maxt;i++){const h=sdf(add(p,mul(l,t)),.35)[0];if(h<.0008)return 0;res=Math.min(res,9*h/t);t+=clamp(h,.01,.25);}return clamp(res,0,1);};
  const ao=(p,n)=>{let o=0,s=1;for(let i=1;i<=5;i++){const h=.02*i;o+=(h-sdf(add(p,mul(n,h)),9)[0])*s;s*=.62;}return clamp(1-3*o,0,1);};
  for(let ri=0;ri<rows.length;ri++)for(let x=0;x<W;x++){
    const y=rows[ri];
    const u=(2*(x+.5)/W-1)*cam.tx,v=(1-2*(y+.5)/H)*cam.ty;
    const rd=norm(add(add(cam.f,mul(cam.r,u)),mul(cam.u,v))),ro=cam.p;
    let hit=false,t=0,m=0,col=[0,0,0],alpha=0;
    const oc=sub(ro,bc),bb=dot(oc,rd),cc=dot(oc,oc)-br*br,disc=bb*bb-cc;
    if(disc>0){
      let t0=Math.max(0,-bb-Math.sqrt(disc)),t1=-bb+Math.sqrt(disc);t=t0;
      for(let i=0;i<220&&t<t1;i++){const [d,mm]=sdf(add(ro,mul(rd,t)),.06);if(d<.0005*t){hit=true;m=mm;break;}t+=d;}}
    if(hit){
      const p=add(ro,mul(rd,t)),n=nrm(p),vv=mul(rd,-1);
      const [ar,ag,ab,ks,gl]=MAT[m]||MAT[1],alb=[ar,ag,ab];
      const a=ao(p,n),s1=shadow(add(p,mul(n,.003)),L1,4);
      const ndv=Math.max(dot(n,vv),0);
      const dk=Math.max(dot(n,L1),0)*s1,df=Math.max(dot(n,Ls.fill),0);
      const sky=(.5+.5*n[1])*a,bounce=Math.max(-n[1],0)*(.3+.7*a);
      const hv=norm(add(L1,vv)),sp=Math.pow(Math.max(dot(n,hv),0),gl)*ks*s1;
      const F=Math.pow(1-ndv,2);
      const rim=F*(Math.max(dot(n,Ls.rimL),0)+Math.max(dot(n,Ls.rimR),0))*(.45+.55*a);
      const top=Math.max(dot(n,Ls.top),0)*a;
      /* the blue edge light belongs to the figure; equipment only catches a little of it */
      const rs=m===1?1:m===8||m===9?.6:.38;
      const lit=k=>alb[k]*(.95*dk*KEYC[k]+.35*top*KEYC[k]+.2*df*FILLC[k]+.22*sky*SKYC[k]+.55*bounce*BOUNCEC[k])
        +sp*SPECC[k]+(rim*RIMC[k]*1.55+F*.05*RIMC[k])*rs;
      col=[lit(0),lit(1),lit(2)];
      if(m===7)col=col.map((c,k)=>c+[.22,.02,.02][k]*(.4+.6*a));
      /* the worked muscles, lit from within: hotter where they face the viewer */
      if(m===1&&hl.length){
        let w=0;for(const q of hl){const e=sdOne(q,p);if(e<.04)w=Math.max(w,q.hl*(1-smooth(.004,.03,e)));}
        if(w>0){const g=Math.pow(ndv,3);w*=1-.55*F;
          const em=[0,1,2].map(k=>(RED_DEEP[k]+(RED_HOT[k]-RED_DEEP[k])*g)*(.2+.62*dk+.22*top+.1*sky)+sp*SPECC[k]*.7+rim*RIMC[k]*.6);
          col=col.map((c,k)=>c+(em[k]-c)*w*.9);}}
      alpha=1;
    }else if(rd[1]<0){
      /* the floor: only a shadow, as alpha */
      const tf=-ro[1]/rd[1],p=add(ro,mul(rd,tf));
      if(len(sub([p[0],0,p[2]],[bc[0],0,bc[2]]))<br+1.2){
        const oc2=sub(p,bc),b2=dot(oc2,L1),c2=dot(oc2,oc2)-br*br;
        const s1=(b2*b2-c2>0&&-b2+Math.sqrt(b2*b2-c2)>0)?shadow(p,L1,4):1;
        const o=sdf([p[0],.1,p[2]],9)[0]<.35?floorAO(sdf,p):1;
        const dark=clamp((1-s1)*.5+(1-o)*.6,0,.8);
        col=[0,0,0];alpha=dark;}}
    const i=(ri*W+x)*4;
    /* gamma */
    out[i]=255*Math.pow(clamp(col[0],0,1),1/2.2);out[i+1]=255*Math.pow(clamp(col[1],0,1),1/2.2);out[i+2]=255*Math.pow(clamp(col[2],0,1),1/2.2);
    out[i+3]=255*alpha;}
  return out;}
function floorAO(sdf,p){let o=0,s=1;for(let i=1;i<=5;i++){const h=.04*i;o+=(h-sdf([p[0],h,p[2]],9)[0])*s;s*=.55;}return clamp(1-1.6*o,0,1);}
