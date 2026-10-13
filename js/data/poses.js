/* Bunyan — poses
   A picture for the warm-up drills and stretches the photographed library has no
   photographs of (js/data/extra.js, own and no ph). One figure for all of them, in the
   way a pictogram is drawn: a round head, the limbs as thick rounded strokes, the far
   arm and leg fainter, the floor, and where the drill moves, an arrow saying which way.
   Each drill is the figure's joints in a 120 × 100 box, facing right, plus what it
   needs around it (a wall, a door frame, a post).

     H head  N neck (the shoulders)  P pelvis
     E1 W1 near elbow and wrist   E2 W2 far
     K1 A1 near knee and ankle    K2 A2 far   T1 T2 toes (else from the ankle)
     front  seen from the front: both sides drawn alike
     flat   lying: no toes added   above  seen from above: no floor
     x      extra marks: ["wall",x] ["door",x] ["post",x,y] ["arrow",x1,y1,x2,y2] (a curve
            through c when given: ["arrow",x1,y1,x2,y2,cx,cy]) ["lines",x,y] (speed)

   Pure data and a string: the thumbnails (js/data/exercises.js) and the exercise sheet
   draw it; the colours are the theme's (.pose in index.html). */

var POSE={
  /* Seen from above, lying on the side: knees up at hip height, the bottom arm in
     front, the top one opened across to the other side. */
  "Thoracic Rotation":{flat:1,above:1,H:[18,62],N:[30,62],P:[60,62],K1:[62,38],A1:[84,40],K2:[66,42],A2:[88,44],
    E2:[32,46],W2:[33,28],E1:[32,78],W1:[33,96],
    x:[["arrow",42,30,42,92,70,62]]},
  "Knee-to-Wall Ankle Mobilisation":{H:[62,26],N:[60,36],P:[54,64],K1:[84,68],A1:[78,90],T1:[86,90],K2:[46,90],A2:[28,90],T2:[24,90],
    E1:[74,44],W1:[93,42],E2:[73,47],W2:[93,47],x:[["wall",96],["arrow",84,58,92,58]]},
  "Spiderman Lunge":{H:[96,56],N:[86,62],P:[56,74],K1:[76,68],A1:[80,90],T1:[87,90],K2:[36,82],A2:[16,86],T2:[12,90],
    E1:[88,76],W1:[90,90],E2:[85,76],W2:[86,90],x:[["arrow",56,60,56,72]]},
  "Scapular Push-Up":{H:[95,57],N:[84,62],P:[50,72],K1:[32,79],A1:[14,85],T1:[12,90],K2:[32,80],A2:[14,86],T2:[12,90],
    E1:[86,76],W1:[88,90],E2:[83,76],W2:[85,90],x:[["arrow",74,46,74,56],["arrow",74,56,74,46]]},
  "Walking Knee Hug":{H:[59,18],N:[57,29],P:[57,55],K1:[70,40],A1:[67,58],K2:[57,72],A2:[57,86],T2:[64,90],
    E1:[64,42],W1:[72,47],E2:[62,44],W2:[71,50],x:[["arrow",70,62,70,46]]},
  "Walking Quad Pull":{H:[60,18],N:[58,29],P:[58,55],K1:[60,74],A1:[47,62],K2:[58,73],A2:[58,90],T2:[65,90],
    E1:[54,44],W1:[48,58],E2:[68,38],W2:[79,42],x:[["arrow",44,76,44,64]]},
  "Lateral Lunge":{front:1,H:[54,24],N:[54,35],P:[50,62],K1:[36,72],A1:[34,90],T1:[27,90],K2:[68,76],A2:[86,90],T2:[93,90],
    E1:[44,46],W1:[53,52],E2:[64,46],W2:[55,52],x:[["arrow",62,62,40,62,51,68]]},
  "Arm Swings":{front:1,H:[60,18],N:[60,29],P:[60,56],K1:[54,73],A1:[52,90],T1:[46,90],K2:[66,73],A2:[68,90],T2:[74,90],
    E1:[44,30],W1:[28,30],E2:[76,30],W2:[92,30],
    x:[["arrow",24,38,52,44,34,50],["arrow",96,38,68,44,86,50]]},
  "High Knees":{H:[60,18],N:[58,29],P:[58,55],K1:[75,55],A1:[73,73],T1:[79,76],K2:[58,72],A2:[58,86],T2:[64,90],
    E1:[49,40],W1:[48,29],E2:[66,41],W2:[73,33],x:[["lines",34,46],["arrow",84,72,84,56]]},
  "Pogo Hops":{H:[60,14],N:[60,25],P:[60,51],K1:[61,68],A1:[60,83],T1:[66,86],K2:[59,68],A2:[58,83],T2:[64,86],
    E1:[66,37],W1:[72,44],E2:[55,37],W2:[61,44],x:[["arrow",40,88,40,74],["arrow",80,74,80,88]]},
  "Doorway Chest Stretch":{H:[87,20],N:[82,31],P:[79,58],K1:[88,74],A1:[92,90],T1:[99,90],K2:[71,74],A2:[64,90],T2:[70,90],
    E1:[70,31],W1:[70,16],E2:[84,44],W2:[87,56],x:[["door",68],["arrow",86,44,98,44]]},
  "Overhead Lat Stretch":{H:[78,50],N:[67,52],P:[40,57],K1:[45,73],A1:[46,90],T1:[53,90],K2:[44,73],A2:[44,90],T2:[51,90],
    E1:[81,46],W1:[95,40],E2:[80,48],W2:[95,43],x:[["post",97,30],["arrow",56,40,56,52]]},
  "Standing Quad Stretch":{H:[63,18],N:[62,29],P:[62,55],K1:[64,74],A1:[50,62],K2:[62,73],A2:[62,90],T2:[69,90],
    E1:[56,44],W1:[50,59],E2:[78,34],W2:[94,36],x:[["wall",96]]},
  "Pigeon Stretch":{H:[66,40],N:[61,50],P:[52,80],K1:[73,85],A1:[56,88],T1:[52,88],K2:[32,86],A2:[12,88],T2:[8,90],
    E1:[71,66],W1:[78,89],E2:[69,66],W2:[76,89],x:[["arrow",44,62,44,76]]},
  "Figure-Four Stretch":{flat:1,H:[16,84],N:[27,86],P:[52,86],K2:[55,62],A2:[71,56],K1:[71,75],A1:[57,62],
    E1:[39,74],W1:[52,68],E2:[38,76],W2:[50,70],x:[["arrow",78,58,66,50,76,48]]},
  "Butterfly Stretch":{front:1,H:[60,44],N:[60,55],P:[60,82],K1:[38,80],A1:[57,88],T1:[61,89],K2:[82,80],A2:[63,88],T2:[59,89],
    E1:[50,70],W1:[57,85],E2:[70,70],W2:[63,85],x:[["arrow",36,64,36,74],["arrow",84,64,84,74]]},
  "Cobra Stretch":{flat:1,H:[88,56],N:[78,66],P:[50,86],K1:[31,88],A1:[12,88],T1:[8,86],K2:[31,89],A2:[12,89],T2:[8,87],
    E1:[79,78],W1:[81,90],E2:[76,78],W2:[78,90],x:[["arrow",70,78,70,64]]}
};

function f1(n){return Math.round(n*10)/10;}
function seg(a,b,c){return '<path class="'+c+'" d="M'+f1(a[0])+' '+f1(a[1])+'L'+f1(b[0])+' '+f1(b[1])+'"/>';}
function limb(a,b,c,cls){return a&&b?'<path class="'+cls+'" d="M'+f1(a[0])+' '+f1(a[1])+'L'+f1(b[0])+' '+f1(b[1])+(c?'L'+f1(c[0])+' '+f1(c[1]):'')+'"/>':'';}
/* An arrow: a line or a curve, and a chevron at its tip turned along it. */
function arrow(x1,y1,x2,y2,cx,cy){
  var d=cx!=null?'M'+x1+' '+y1+'Q'+cx+' '+cy+' '+x2+' '+y2:'M'+x1+' '+y1+'L'+x2+' '+y2;
  var fx=cx!=null?cx:x1,fy=cy!=null?cy:y1,ang=Math.atan2(y2-fy,x2-fx),k=4.2;
  var l=[x2-k*Math.cos(ang-0.6),y2-k*Math.sin(ang-0.6)],r=[x2-k*Math.cos(ang+0.6),y2-k*Math.sin(ang+0.6)];
  return '<path class="mv" d="'+d+'"/><path class="mvh" d="M'+f1(l[0])+' '+f1(l[1])+'L'+x2+' '+y2+'L'+f1(r[0])+' '+f1(r[1])+'"/>';}
function extra(x){
  if(x[0]==="wall")return '<path class="prop" d="M'+x[1]+' 10V92"/>';
  if(x[0]==="door")return '<path class="prop" d="M'+x[1]+' 6V92M'+(x[1]-6)+' 6V92"/>';
  if(x[0]==="post")return '<path class="prop" d="M'+x[1]+' '+x[2]+'V92"/>';
  if(x[0]==="lines")return '<path class="mv" d="M'+x[1]+' '+x[2]+'h10M'+(x[1]-4)+' '+(x[2]+8)+'h10M'+x[1]+' '+(x[2]+16)+'h10"/>';
  if(x[0]==="arrow")return arrow(x[1],x[2],x[3],x[4],x[5],x[6]);
  return "";}

/* The drawing for a drill, or "" when it has none. */
function poseSvg(name,cls){
  var p=POSE[name];if(!p)return "";
  var far=p.front?"lb":"lb far",toe=function(a,t){return t||(p.flat?null:[a[0]+6,a[1]+1]);};
  var h='<svg class="pose'+(cls?' '+cls:'')+'" viewBox="0 0 120 100" aria-hidden="true" focusable="false">'
   +(p.above?'':'<path class="fl" d="M4 92H116"/>')
   +(p.x||[]).filter(function(x){return x[0]==="wall"||x[0]==="door"||x[0]==="post";}).map(extra).join("")
   /* far side first, then the body, then the near side over it */
   +limb(p.P,p.K2,p.A2,far)+limb(p.A2,toe(p.A2,p.T2),null,far+" ft")
   +limb(p.N,p.E2,p.W2,far)
   +seg(p.N,p.P,"tr")+'<circle class="hd" cx="'+p.H[0]+'" cy="'+p.H[1]+'" r="6.6"/>'
   +limb(p.P,p.K1,p.A1,"lb")+limb(p.A1,toe(p.A1,p.T1),null,"lb ft")
   +limb(p.N,p.E1,p.W1,"lb")
   +(p.x||[]).filter(function(x){return x[0]==="arrow"||x[0]==="lines";}).map(extra).join("")
   +'</svg>';
  return h;}
function hasPose(name){return !!POSE[name];}

export {hasPose, poseSvg, POSE};
