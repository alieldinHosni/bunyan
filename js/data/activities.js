/* Bunyan — activities
   Cardio, sports and classes: things logged as time and effort, not sets and reps.
   Pure data with no imports, so the library, the logger and the formulas can all
   read it without a cycle.

   Each entry: name, group, MET (the Compendium of Physical Activities' figure for a
   moderate effort), whether distance means anything for it, an icon, its Arabic
   name. Calories are MET × body weight × hours, scaled by how hard it was. */
var ACTS=[
  /* Cardio the library has no photographed entry for. Treadmill running, the bikes,
     the rower, the stair machines and rope jumping already exist there and are
     picked up by LIB_ACTS below instead of being listed twice. */
  ["Running","Cardio",9.8,1,"run","جري"],
  ["Walking","Cardio",3.5,1,"walk","مشي"],
  ["Swimming","Cardio",7,1,"swim","سباحة"],
  ["Hiking","Cardio",6,1,"hike","هايكنج"],
  ["Cycling","Cardio",7.5,1,"bike","عجلة"],
  ["HIIT","Classes",8,0,"pulse","تمرين عالي الشدة"],
  ["Spinning Class","Classes",8.5,0,"bike","كلاس سبينينج"],
  ["CrossFit","Classes",8,0,"pulse","كروس فيت"],
  ["Yoga","Classes",2.5,0,"flex","يوجا"],
  ["Pilates","Classes",3,0,"flex","بيلاتس"],
  ["Dance","Classes",5,0,"flex","رقص"],
  ["Stretching","Classes",2.3,0,"flex","إطالات"],
  ["Football","Sports",7,0,"ball","كورة قدم"],
  ["Basketball","Sports",6.5,0,"ball","كورة سلة"],
  ["Tennis","Sports",7.3,0,"racket","تنس"],
  ["Padel","Sports",6,0,"racket","بادل"],
  ["Squash","Sports",7.3,0,"racket","اسكواش"],
  ["Badminton","Sports",5.5,0,"racket","ريشة"],
  ["Table Tennis","Sports",4,0,"racket","تنس طاولة"],
  ["Volleyball","Sports",4,0,"ball","كورة طايرة"],
  ["Handball","Sports",8,0,"ball","كورة يد"],
  ["Rugby","Sports",8.3,0,"ball","رجبي"],
  ["Hockey","Sports",8,0,"ball","هوكي"],
  ["Cricket","Sports",4.8,0,"ball","كريكيت"],
  ["Baseball","Sports",5,0,"ball","بيسبول"],
  ["Golf","Sports",4.8,0,"ball","جولف"],
  ["Boxing","Sports",7.8,0,"fight","ملاكمة"],
  ["Martial Arts","Sports",10,0,"fight","فنون قتالية"],
  ["Climbing","Sports",8,0,"hike","تسلق"],
  ["Skiing","Sports",7,1,"hike","تزلج"]
];
/* Library exercises that are really cardio: logged the same way, and filed under
   Cardio instead of Quads. [MET, has distance] */
var LIB_ACTS={
  "Air Bike":[8,0,"إير بايك"],"Bicycling":[7.5,1,"دراجة"],"Bicycling, Stationary":[7,0,"دراجة ثابتة"],
  "Elliptical Trainer":[5,0,"جهاز الإليبتكال"],"Jogging, Treadmill":[7,1,"هرولة على المشاية"],
  "Recumbent Bike":[5.5,0,"دراجة بمسند"],"Rope Jumping":[11,0,"نط الحبل"],"Rowing, Stationary":[7,1,"جهاز التجديف"],
  "Running, Treadmill":[9.8,1,"جري على المشاية"],"Skating":[7,0,"تزحلق"],"Stairmaster":[9,0,"جهاز السلالم"],
  "Step Mill":[9,0,"ستيب ميل"],"Trail Running/Walking":[6,1,"جري أو مشي في الطبيعة"],"Walking, Treadmill":[3.5,1,"مشي على المشاية"]
};
var BY={};
ACTS.forEach(function(a){BY[a[0]]={n:a[0],grp:a[1],met:a[2],dist:!!a[3],ico:a[4],ar:a[5]};});
Object.keys(LIB_ACTS).forEach(function(n){
  BY[n]={n:n,grp:"Cardio",met:LIB_ACTS[n][0],dist:!!LIB_ACTS[n][1],ico:"pulse",ar:LIB_ACTS[n][2],lib:true};});

function actInfo(n){return BY[n]||null;}
function isActivity(n){return !!BY[n];}
/* The library's muscle filter: sports under Sports, everything else under Cardio. */
function actMuscle(n){var a=BY[n];return a?(a.grp==="Sports"?"Sports":"Cardio"):null;}
var ACT_GROUPS=["Cardio","Sports","Classes"];
function actsIn(grp){
  var out=ACTS.filter(function(a){return a[1]===grp;}).map(function(a){return a[0];});
  if(grp==="Cardio")out=out.concat(Object.keys(LIB_ACTS));
  return out;}

/* How hard it was, as the four choices the logger offers, stored as an RPE so the
   rest of the app (averages, the edit sheet) reads it like any other effort. */
var INTENSITY=[[4,"Easy",0.8],[6,"Moderate",1],[8,"Hard",1.2],[10,"All-out",1.4]];
function intensityOf(rpe){
  var best=INTENSITY[1];
  INTENSITY.forEach(function(x){if(Math.abs(x[0]-rpe)<Math.abs(best[0]-rpe))best=x;});
  return best;}
/* Pace as runners read it: minutes per kilometre, from what was logged. Nothing is
   asked for that a watch would have measured — it falls out of duration and distance. */
function actPace(min,km){
  if(!(min>0&&km>0))return "";
  var s=Math.round(min*60/km);
  return Math.floor(s/60)+":"+String(s%60).padStart(2,"0")+" /km";}
function actKcal(n,mins,rpe,kg){
  var a=BY[n];if(!a||!mins)return 0;
  return Math.round(a.met*(kg||70)*(mins/60)*intensityOf(rpe||6)[2]);}

var ICO={
  run:'<path d="M13.5 5.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM9 20l2.5-5 2.5 2v4M7 12l2-4 4 1 2 3 3 1M11.5 15l-1-4"/>',
  walk:'<path d="M12.5 5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM10 21l1.5-6 2.5 2.5V21M9 12.5l1.5-5 3 1 1.5 3M11.5 15l-1-4.5"/>',
  swim:'<path d="M2 17c2 0 2-1.5 4-1.5s2 1.5 4 1.5 2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5M2 21c2 0 2-1.5 4-1.5s2 1.5 4 1.5 2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5M16 8.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM6 14l4-5 4 2.5"/>',
  hike:'<path d="M3 20l6-10 4 6 3-4 5 8zM9 10l2-3"/>',
  bike:'<circle cx="6" cy="16" r="3.5"/><circle cx="18" cy="16" r="3.5"/><path d="M6 16l4-7h5l3 7M10 9l3 7M14 5h2"/>',
  pulse:'<path d="M3 12h4l2-6 4 12 2-6h6"/>',
  flex:'<path d="M12 5.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM5 10c3 1 5 1 7 1s4 0 7-1M12 11v4l-4 6M12 15l4 6"/>',
  ball:'<circle cx="12" cy="12" r="9"/><path d="M12 7l4 3-1.5 4.5h-5L8 10zM12 3v4M16 10l4.5-1.5M14.5 14.5l2.5 4M9.5 14.5l-2.5 4M8 10L3.5 8.5"/>',
  racket:'<ellipse cx="14" cy="9" rx="6" ry="6.5" transform="rotate(35 14 9)"/><path d="M9.5 13.5L3 20M11 8l6 2M12 5l4 7"/>',
  fight:'<path d="M7 11V7a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v6a5 5 0 0 1-5 5h-1a4 4 0 0 1-4-4zM7 11h6M10 18v3h5v-3"/>'
};
function actIcon(n,size){
  var a=BY[n],k=a?a.ico:"pulse";
  return '<svg viewBox="0 0 24 24" width="'+(size||22)+'" height="'+(size||22)+'" aria-hidden="true" class="acticon">'+ICO[k]+'</svg>';}

export {actPace, ACT_GROUPS, ACTS, actIcon, actInfo, actKcal, actMuscle, actsIn, INTENSITY, intensityOf, isActivity};
