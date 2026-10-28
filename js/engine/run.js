/* Bunyan — a run, a walk, a ride or a hike, measured
   The arithmetic of live tracking (js/ui/run.js): the clock, the distance the phone's
   positions add up to, the pace or the speed, the calories, and the route as a drawing.
   Pure: a session is a plain object passed in and handed back, so
   js/engine/test/run.test.js runs it in Node with made-up positions.

   A session: {started, act, ms, since, pts:[[lat, lon, t]], dist}
     act    the activity (Running, Walking, Cycling, Hiking, Trail Running/Walking);
            one saved before there was a choice is a run
     ms     moving time banked before the current stretch (pauses are not counted)
     since  when the current stretch began, or null while paused
     pts    the positions kept, oldest first; dist the metres between them

   A phone's position wanders even standing still, and now and then leaps (owner, 28 Oct:
   sitting on a chair, a shaken phone drew a run). Each fix goes through, in turn:
   - its accuracy: worse than 25 m is not trusted ("rough"), and the route starts only
     at a fix of 20 m or better;
   - a leap: further from where we are than the activity's top speed could have gone
     (js/data/activities.js: 9 m/s for a run, 20 for a ride) plus the fix's own
     uncertainty is a jump of the GPS, not a stride ("leap");
   - smoothing: a Kalman filter on the position, each fix weighed by its accuracy, the
     route allowed to move about as fast as the activity goes (run.kf);
   - stillness: when the phone's own speed says it is not moving, a step smaller than
     twice the fix's uncertainty is the wander ("still"); so is not having got further
     in the last 15 seconds than the fixes' uncertainty, whatever the phone says;
     otherwise a step has to clear the uncertainty (at least 10 m, up to twice the
     accuracy) before it counts ("same").
   A point kept carries the moving time at that moment, for the splits and the pace now:
   [lat, lon, t, moving ms]. */

var R=6371008.8;   /* the Earth's mean radius, m */

/* Metres between two [lat, lon] points, along the surface. */
function metres(a,b){
  var toR=Math.PI/180,dLat=(b[0]-a[0])*toR,dLon=(b[1]-a[1])*toR;
  var h=Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(a[0]*toR)*Math.cos(b[0]*toR)*Math.sin(dLon/2)*Math.sin(dLon/2);
  return 2*R*Math.asin(Math.min(1,Math.sqrt(h)));}

function newRun(now,act){return {started:now,act:act||"Running",ms:0,since:now,pts:[],dist:0};}
/* Running time so far, in ms. */
function runMs(run,now){return run.ms+(run.since!=null?Math.max(0,now-run.since):0);}
function pauseRun(run,now){if(run.since!=null){run.ms=runMs(run,now);run.since=null;}return run;}
function resumeRun(run,now){if(run.since==null)run.since=now;return run;}

/* A position from the phone: {lat, lon, acc (m), t (ms), spd (m/s, or null when the
   phone does not say)}, and the activity's top speed in m/s (a run's 9 when not given).
   Returns what happened, for the screen: "kept", "same" (not far enough to count),
   "still" (the phone says it is not moving), "rough" (not accurate enough), "leap"
   (impossibly fast), "paused" (not counted while paused). */
/* The tuning, chosen by simulation (white and drifting GPS noise of 3 to 16 m, runs,
   a track, walks, and a phone left on a table for ten minutes): distance within 5% on
   every run and walk (0.7% on average); still, with the phone saying its speed, under
   20 m in ten minutes. Exported for the engine's tests. */
var T={accMax:25,accStart:20,stepMin:10,stepK:2,qK:0.8,win:15000,winK:1.5,winMin:10};
function addFix(run,f,top){
  if(run.since==null)return "paused";
  var acc=+f.acc,t=+f.t;top=top>0?top:9;
  if(!(acc<=T.accMax))return "rough";
  var kf=run.kf;
  if(!kf){
    if(acc>T.accStart)return "rough";
    kf=run.kf={lat:+f.lat,lon:+f.lon,v:acc*acc,t:t};}
  else{
    var dt=Math.max(0,(t-kf.t)/1000),raw=metres([kf.lat,kf.lon],[f.lat,f.lon]);
    if(raw>top*Math.max(dt,1)+3*acc+Math.sqrt(kf.v))return "leap";
    var q=f.spd!=null&&f.spd>=0?Math.max(1,f.spd*T.qK):top/3;kf.v+=dt*q*q;
    var k=kf.v/(kf.v+acc*acc);
    kf.lat+=k*(f.lat-kf.lat);kf.lon+=k*(f.lon-kf.lon);kf.v=(1-k)*kf.v;kf.t=t;}
  /* The last stretch of smoothed positions, to tell moving from wandering by how far
     they have got in it, whatever the phone says of its speed. */
  var rec=run.rec||(run.rec=[]);rec.push([kf.lat,kf.lon,t]);
  while(rec.length>2&&t-rec[1][2]>=T.win)rec.shift();
  var p=[+kf.lat.toFixed(6),+kf.lon.toFixed(6),t,runMs(run,t)],last=run.pts[run.pts.length-1];
  if(!last){run.pts.push(p);run.moved=t;return "kept";}
  var d=metres(last,p);
  if(f.spd!=null&&f.spd>=0&&f.spd<0.4&&d<2*acc)return "still";
  /* Over the last stretch (once it is long enough to say), not further from where it
     began than the fixes' own uncertainty: wandering, not moving. */
  if(t-rec[0][2]>=T.win*0.66&&metres(rec[0],p)<Math.max(T.winMin,T.winK*acc))return "still";
  if(d<Math.max(T.stepMin,Math.min(T.stepK*acc,T.accMax)))return "same";
  run.pts.push(p);run.dist+=d;run.moved=t;return "kept";}
/* Moving, by the fixes: the last point kept within the last 15 seconds. */
function isMoving(run,now){return run.since!=null&&run.moved!=null&&now-run.moved<15000;}
/* Each whole kilometre's time, by the moving time the points carry: [ms, …], the first
   kilometre first. Points saved before they carried it are left out. */
function splitsOf(pts){
  var out=[],done=0,next=1000,lastMs=0;
  for(var i=1;i<pts.length;i++){
    var a=pts[i-1],b=pts[i];if(a[3]==null||b[3]==null)return out;
    var d=metres(a,b);
    while(d>0&&done+d>=next){
      var at=a[3]+(b[3]-a[3])*((next-done)/d);
      out.push(Math.round(at-lastMs));lastMs=at;next+=1000;}
    done+=d;}
  return out;}
/* The pace now: over the last 30 seconds of moving (at least 40 m of it), as paceOf
   writes it; "" with too little to say. */
function paceNow(run,now){
  var w=lastStretch(run,now,30000);return w?paceOf(w.ms,Math.max(w.m,50)):"";}
/* The last points kept, back over win ms of moving: {m, ms} up to the newest point (the
   seconds since it are not yet ground covered), or null with too little (under 40 m). */
function lastStretch(run,now,win){
  var pts=run.pts;if(pts.length<2||!isMoving(run,now))return null;
  var end=pts[pts.length-1][3],m=0,from=null;
  if(end==null)return null;
  for(var i=pts.length-1;i>0;i--){
    if(pts[i-1][3]==null)break;
    m+=metres(pts[i-1],pts[i]);from=pts[i-1][3];
    if(end-from>=win)break;}
  return from==null||m<40||end<=from?null:{m:m,ms:end-from};}
function speedNow(run,now){
  var w=lastStretch(run,now,15000);return w?speedOf(w.ms,Math.max(w.m,50)):"";}

/* Minutes per kilometre as "m:ss", or "" with too little distance to say (under 50 m). */
function paceOf(ms,m){
  if(!(m>=50&&ms>0))return "";
  var s=Math.round(ms/1000/(m/1000));
  return Math.floor(s/60)+":"+String(s%60).padStart(2,"0");}
/* Kilometres an hour to one decimal, as a ride is read, or "" under 50 m. */
function speedOf(ms,m){
  if(!(m>=50&&ms>0))return "";
  return (Math.round(m/ms*3600*10)/10).toFixed(1);}

/* Energy: about 1 kcal per kilogram per kilometre run, whatever the pace, the long-
   standing rule of thumb the running research supports; with no distance (no GPS),
   running's MET of 9.8 for the time. */
function runKcal(m,ms,kg){
  kg=kg>0?kg:70;
  if(m>=200)return Math.round(kg*m/1000);
  return Math.round(9.8*kg*ms/3600000);}
/* The other activities, by MET × kg × hours. Walking and cycling cost more the faster
   they go, so their MET is read off the speed measured (the Compendium of Physical
   Activities, 2011: [km/h below which, MET]); with no distance, a moderate effort.
   A hike is 6 whatever its pace (the climb, not the speed, is what it costs), and a
   trail session is a run at a runner's speed (8 km/h and up) and a hike below it. */
var WALK=[[3.2,2.0],[4.0,2.8],[4.8,3.0],[5.6,3.5],[6.4,4.3],[7.2,5.0],[Infinity,7.0]];
var RIDE=[[16,4.0],[19.3,6.8],[22.5,8.0],[25.7,10.0],[32,12.0],[Infinity,15.8]];
function metAt(tbl,kmh){for(var i=0;i<tbl.length;i++)if(kmh<tbl[i][0])return tbl[i][1];return tbl[tbl.length-1][1];}
function outdoorKcal(act,m,ms,kg){
  kg=kg>0?kg:70;
  var h=ms/3600000,kmh=ms>0&&m>=200?m/ms*3600:0;
  if(!act||act==="Running")return runKcal(m,ms,kg);
  if(act==="Trail Running/Walking")return kmh>=8?runKcal(m,ms,kg):Math.round(6*kg*h);
  if(act==="Walking")return Math.round((kmh?metAt(WALK,kmh):3.5)*kg*h);
  if(act==="Cycling")return Math.round((kmh?metAt(RIDE,kmh):7.5)*kg*h);
  return Math.round(6*kg*h);}

/* The route as an SVG path in a w × h box with pad around it: flat projection (a run
   is far too small for the Earth's curve to show), north up, the same scale both ways
   so a loop stays a loop. "" for fewer than two points. routeXY is the same as
   points, [x, y]. */
function routeXY(pts,w,h,pad){
  if(!pts||pts.length<2)return [];
  var lat0=pts[0][0]*Math.PI/180,k=Math.cos(lat0);
  var xy=pts.map(function(p){return [p[1]*k,-p[0]];});
  var mnx=Infinity,mny=Infinity,mxx=-Infinity,mxy=-Infinity;
  xy.forEach(function(q){mnx=Math.min(mnx,q[0]);mxx=Math.max(mxx,q[0]);mny=Math.min(mny,q[1]);mxy=Math.max(mxy,q[1]);});
  var sw=Math.max(mxx-mnx,1e-9),sh=Math.max(mxy-mny,1e-9),sc=Math.min((w-2*pad)/sw,(h-2*pad)/sh);
  var ox=(w-sw*sc)/2,oy=(h-sh*sc)/2;
  return xy.map(function(q){return [+(ox+(q[0]-mnx)*sc).toFixed(1),+(oy+(q[1]-mny)*sc).toFixed(1)];});}
function routePath(pts,w,h,pad){
  return routeXY(pts,w,h,pad).map(function(q,i){return (i?"L":"M")+q[0].toFixed(1)+" "+q[1].toFixed(1);}).join("");}
/* Where each whole kilometre falls along the route, in the same box: [{km, x, y}],
   placed between the two points it falls between. For the markers on the map. */
function kmMarks(pts,w,h,pad){
  var xy=routeXY(pts,w,h,pad),out=[],done=0,next=1000;
  for(var i=1;i<xy.length;i++){
    var d=metres(pts[i-1],pts[i]);
    while(d>0&&done+d>=next){
      var f=(next-done)/d;
      out.push({km:next/1000,x:+(xy[i-1][0]+(xy[i][0]-xy[i-1][0])*f).toFixed(1),y:+(xy[i-1][1]+(xy[i][1]-xy[i-1][1])*f).toFixed(1)});
      next+=1000;}
    done+=d;}
  return out;}

/* At most n points, evenly picked and always with the last: what is kept with the
   saved run, so a long one does not bloat the history. */
function thin(pts,n){
  if(pts.length<=n)return pts.slice();
  var out=[],step=(pts.length-1)/(n-1);
  for(var i=0;i<n;i++)out.push(pts[Math.round(i*step)]);
  return out;}

export {addFix, isMoving, kmMarks, metres, newRun, outdoorKcal, paceNow, paceOf, pauseRun, resumeRun, routePath, routeXY, runKcal, runMs, speedNow, speedOf, splitsOf, T as RUNTUNE, thin};
