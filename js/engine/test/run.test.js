import {addFix, kmMarks, metres, newRun, paceOf, pauseRun, resumeRun, routePath, routeXY, runKcal, runMs, thin} from "../run.js";

/* A point d metres north of 30°N 31°E (Cairo), at time s seconds. One degree of
   latitude is 111.2 km. */
function north(d,s,acc){return {lat:30+d/111195,lon:31,acc:acc==null?8:acc,t:s*1000};}

function run(t){
  marks(t);
  t.ok(Math.abs(metres([30,31],[30+1000/111195,31])-1000)<1,"a kilometre north is a kilometre");
  t.ok(Math.abs(metres([30,31],[30,31+1000/(111195*Math.cos(30*Math.PI/180))])-1000)<1,"and east, at 30°");

  /* ---- the clock ---- */
  var r=newRun(0);
  t.eq(runMs(r,60000),60000,"a minute in");
  pauseRun(r,60000);t.eq(runMs(r,300000),60000,"paused: the clock stops");
  resumeRun(r,300000);t.eq(runMs(r,330000),90000,"resumed: it goes on from where it was");
  pauseRun(r,330000);pauseRun(r,400000);t.eq(r.ms,90000,"pausing twice changes nothing");

  /* ---- distance ---- */
  r=newRun(0);
  t.eq(addFix(r,north(0,0)),"kept","the first fix");
  for(var i=1;i<=10;i++)addFix(r,north(i*30,i*10));   /* 3 m/s for 100 s */
  t.ok(Math.abs(r.dist-300)<1,"300 m at a jog: "+r.dist.toFixed(1));
  t.eq(addFix(r,north(302,111)),"same","2 m on: the same spot, not counted");
  t.eq(addFix(r,north(330,112,80)),"rough","80 m accuracy: not trusted");
  t.eq(addFix(r,north(800,113)),"leap","500 m in a few seconds: a leap");
  t.eq(addFix(r,north(330,120)),"kept","and the run goes on from the last good fix");
  t.ok(Math.abs(r.dist-330)<1,"330 m in all");
  pauseRun(r,120000);t.eq(addFix(r,north(400,130)),"paused","nothing counts while paused");

  /* ---- pace, energy ---- */
  t.eq(paceOf(330000,1000),"5:30","5:30 a kilometre");
  t.eq(paceOf(30000,40),"","under 50 m: too little to say");
  t.eq(runKcal(5000,1800000,80),400,"5 km at 80 kg: about 400 kcal");
  t.eq(runKcal(0,1800000,80),392,"no distance: by the time, MET 9.8");
  t.eq(runKcal(5000,1800000,0),350,"no weight: 70 kg");

  /* ---- the route ---- */
  t.eq(routePath([[30,31,0]],100,100,10),"","one point: nothing to draw");
  var sq=[[30,31],[30,31.001],[30.001,31.001],[30.001,31]].map(function(p){return [p[0],p[1],0];});
  var d=routePath(sq,200,200,20);
  t.ok(/^M[\d.]+ [\d.]+(L[\d.]+ [\d.]+){3}$/.test(d),"a path, M then L: "+d);
  var nums=d.match(/[\d.]+/g).map(Number);
  t.ok(nums.every(function(v){return v>=19.9&&v<=180.1;}),"inside the padding");
  t.ok(nums[1]>nums[5],"north is up: the third point (further north) is higher");

  t.eq(thin([1,2,3],5),[1,2,3],"short: kept whole");
  var th=thin(Array.from({length:1000},function(_,i){return i;}),100);
  t.eq([th.length,th[0],th[99]],[100,0,999],"a long one: 100 points, first and last kept");
}
/* ---- kilometre marks ---- */
function marks(t){
  var pts=[];for(var i=0;i<=25;i++)pts.push([30+i*100/111195,31,i]);   /* 2.5 km due north, 100 m apart */
  var m=kmMarks(pts,100,300,10),xy=routeXY(pts,100,300,10);
  t.eq(m.map(function(x){return x.km;}),[1,2],"a mark at each whole kilometre, none at 2.5");
  t.ok(Math.abs(m[0].y-(xy[10][1]))<0.2&&Math.abs(m[1].y-xy[20][1])<0.2,"at the point the kilometre falls on");
  t.eq(kmMarks(pts.slice(0,5),100,300,10),[],"under a kilometre: none");
  t.eq(routePath(pts.slice(0,2),100,300,10).indexOf("M"),0,"the path is still drawn from the points");}
export {run};
