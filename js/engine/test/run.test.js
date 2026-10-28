import {addFix, isMoving, kmMarks, metres, newRun, outdoorKcal, paceNow, paceOf, pauseRun, resumeRun, routePath, routeXY, runKcal, runMs, speedOf, splitsOf, thin} from "../run.js";

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

  /* ---- distance: what counts as moving (owner, 28 Oct: a phone shaken on a chair drew
     a run). Fixes once a second, as a phone gives them, with GPS noise (seeded). ---- */
  var seed=7,rnd=function(){seed=(seed*16807)%2147483647;return seed/2147483647;};
  var gauss=function(){var u=rnd()||1e-9,v=rnd();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);};
  var at=function(x,y,s,acc,spd){return {lat:30+y/111195,lon:31+x/(111195*Math.cos(30*Math.PI/180)),acc:acc,t:s*1000,spd:spd};};
  var still=function(sd,spd){var r=newRun(0);for(var i=0;i<600;i++)addFix(r,at(gauss()*sd,gauss()*sd,i,sd*1.3,spd));return r;};
  [[5,0],[10,0],[15,0],[5,null],[10,null],[15,null]].forEach(function(c){
    var r=still(c[0],c[1]);
    /* Poor GPS and no speed from the phone (an iPhone gives it) is the hardest: a few
       tens of metres in ten minutes, not a run. */
    var lim=c[1]==null&&c[0]>=15?75:30;
    t.ok(r.dist<lim,"ten minutes on a table, GPS wandering "+c[0]+" m"+(c[1]==null?", no speed from the phone":"")+": "+Math.round(r.dist)+" m, not a run");});
  var line=function(sd,spd){var r=newRun(0);for(var i=0;i<=334;i++)addFix(r,at(gauss()*sd,i*3+gauss()*sd,i,sd*1.3,spd));return r;};
  [[3,3],[5,3],[8,3],[5,null]].forEach(function(c){
    var r=line(c[0],c[1]);
    t.ok(Math.abs(r.dist-1000)<40,"a kilometre run at 3 m/s, GPS noise "+c[0]+" m: "+Math.round(r.dist)+" m");});
  var r=newRun(0);
  t.eq(addFix(r,at(0,0,0,30)),"rough","a first fix of 30 m: the route waits for a better one");
  t.eq(addFix(r,at(0,0,1,8)),"kept","then starts at one of 8 m");
  t.eq(addFix(r,at(0,500,3,8)),"leap","500 m in two seconds: a leap");
  t.eq(addFix(r,at(0,3,4,8,0)),"still","3 m with the phone saying it is still: not counted");
  t.eq(addFix(r,at(0,50,6,40)),"rough","40 m accuracy: not trusted");
  pauseRun(r,10000);t.eq(addFix(r,at(0,80,12,8)),"paused","nothing counts while paused");

  /* ---- splits, the pace now, moving ---- */
  r=newRun(0);for(var i=0;i<=700;i++)addFix(r,at(0,i*3,i,5,3));
  var sp=splitsOf(r.pts);
  t.eq(sp.length,2,"2.1 km run: two whole kilometres");
  t.ok(sp.every(function(ms){return Math.abs(ms-333333)<15000;}),"each about 5:33 at 3 m/s: "+sp.join(", "));
  t.ok(/^5:[23]\d$/.test(paceNow(r,700000)),"the pace now, about 5:33: "+paceNow(r,700000));
  t.eq(isMoving(r,700000),true,"moving");
  t.eq([isMoving(r,730000),paceNow(r,730000)],[false,""],"20 s with no stride kept: not moving, no pace now");

  /* ---- pace, energy ---- */
  t.eq(paceOf(330000,1000),"5:30","5:30 a kilometre");
  t.eq(paceOf(30000,40),"","under 50 m: too little to say");
  t.eq(runKcal(5000,1800000,80),400,"5 km at 80 kg: about 400 kcal");
  t.eq(runKcal(0,1800000,80),392,"no distance: by the time, MET 9.8");
  t.eq(runKcal(5000,1800000,0),350,"no weight: 70 kg");

  /* ---- a walk, a ride, a hike: each its own ---- */
  t.eq([newRun(0).act,newRun(0,"Cycling").act],["Running","Cycling"],"a session knows what it is; a run when not told");
  var ride=newRun(0,"Cycling");addFix(ride,north(0,0));
  t.eq(addFix(ride,north(150,10),20),"kept","a ride at 15 m/s (54 km/h downhill) is kept with a ride's top speed");
  var jog=newRun(0);addFix(jog,north(0,0));
  t.eq(addFix(jog,north(150,10)),"leap","the same jump on a run is a leap");
  t.eq(speedOf(1800000,12000),"24.0","12 km in 30 min: 24.0 km/h");
  t.eq(speedOf(30000,40),"","under 50 m: too little to say");
  t.eq(outdoorKcal("Running",5000,1800000,80),runKcal(5000,1800000,80),"a run counts as before");
  t.eq(outdoorKcal("Cycling",12000,1800000,80),400,"a ride at 24 km/h, 30 min, 80 kg: MET 10, 400 kcal");
  t.eq(outdoorKcal("Cycling",5000,1800000,80),160,"at 10 km/h: MET 4, 160 kcal");
  t.eq(outdoorKcal("Cycling",0,1800000,80),300,"no distance: a moderate ride, MET 7.5");
  t.eq(outdoorKcal("Walking",2500,1800000,80),140,"a walk at 5 km/h: MET 3.5, 140 kcal");
  t.eq(outdoorKcal("Walking",3500,1800000,80),200,"at 7 km/h: MET 5, 200 kcal");
  t.eq(outdoorKcal("Hiking",3000,3600000,80),480,"an hour's hike: MET 6, 480 kcal");
  t.eq(outdoorKcal("Trail Running/Walking",5000,1800000,80),400,"a trail session at 10 km/h is a run");
  t.eq(outdoorKcal("Trail Running/Walking",2500,1800000,80),240,"and at 5 km/h a hike");

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
