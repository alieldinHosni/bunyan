/* Bunyan — a run, measured
   The arithmetic of running mode (js/ui/run.js): the clock, the distance the phone's
   positions add up to, the pace, the calories, and the route as a drawing. Pure: a run
   is a plain object passed in and handed back, so js/engine/test/run.test.js runs it
   in Node with made-up positions.

   A run: {started, ms, since, pts:[[lat, lon, t]], dist}
     ms     running time banked before the current stretch (pauses are not counted)
     since  when the current stretch began, or null while paused
     pts    the positions kept, oldest first; dist the metres between them

   A phone's position wanders even standing still, and now and then leaps. So a fix is
   kept only when it is accurate to 35 m or better, when it is at least 4 m from the
   last one kept (closer is the same spot, and adding it would count the wander as
   running), and when getting there would not have needed more than 9 m/s (32 km/h,
   faster than any runner), which is a leap, not a stride. */

var R=6371008.8;   /* the Earth's mean radius, m */

/* Metres between two [lat, lon] points, along the surface. */
function metres(a,b){
  var toR=Math.PI/180,dLat=(b[0]-a[0])*toR,dLon=(b[1]-a[1])*toR;
  var h=Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(a[0]*toR)*Math.cos(b[0]*toR)*Math.sin(dLon/2)*Math.sin(dLon/2);
  return 2*R*Math.asin(Math.min(1,Math.sqrt(h)));}

function newRun(now){return {started:now,ms:0,since:now,pts:[],dist:0};}
/* Running time so far, in ms. */
function runMs(run,now){return run.ms+(run.since!=null?Math.max(0,now-run.since):0);}
function pauseRun(run,now){if(run.since!=null){run.ms=runMs(run,now);run.since=null;}return run;}
function resumeRun(run,now){if(run.since==null)run.since=now;return run;}

/* A position from the phone: {lat, lon, acc (m), t (ms)}. Returns what happened, for
   the screen: "kept", "same" (too close to count), "rough" (not accurate enough),
   "leap" (impossibly fast), "paused" (not counted while paused). */
function addFix(run,f){
  if(run.since==null)return "paused";
  if(!(f.acc<=35))return "rough";
  var p=[+f.lat.toFixed(6),+f.lon.toFixed(6),f.t],last=run.pts[run.pts.length-1];
  if(!last){run.pts.push(p);return "kept";}
  var d=metres(last,p),dt=(p[2]-last[2])/1000;
  if(d<4)return "same";
  if(dt>0&&d/dt>9)return "leap";
  run.pts.push(p);run.dist+=d;return "kept";}

/* Minutes per kilometre as "m:ss", or "" with too little distance to say (under 50 m). */
function paceOf(ms,m){
  if(!(m>=50&&ms>0))return "";
  var s=Math.round(ms/1000/(m/1000));
  return Math.floor(s/60)+":"+String(s%60).padStart(2,"0");}

/* Energy: about 1 kcal per kilogram per kilometre run, whatever the pace, the long-
   standing rule of thumb the running research supports; with no distance (no GPS),
   running's MET of 9.8 for the time. */
function runKcal(m,ms,kg){
  kg=kg>0?kg:70;
  if(m>=200)return Math.round(kg*m/1000);
  return Math.round(9.8*kg*ms/3600000);}

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

export {addFix, kmMarks, metres, newRun, paceOf, pauseRun, resumeRun, routePath, routeXY, runKcal, runMs, thin};
