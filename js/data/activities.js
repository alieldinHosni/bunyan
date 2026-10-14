/* Bunyan — activities
   Cardio, sports and classes: things logged as time and effort, not sets and reps.
   Pure data, importing only its icons (js/data/acticons.js), so the library, the
   logger and the formulas can all read it without a cycle.

   Each entry: name, group, MET (the Compendium of Physical Activities' figure for a
   moderate effort), whether distance means anything for it, its kind (what the
   warm-up reads to know what it asks of the body), its Arabic name. The icon is
   its own (ICON below). Calories are MET × body weight × hours, scaled by how hard
   it was. */
import {ACT_ICONS} from "./acticons.js";

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
/* Each activity's own icon, so the grid is found by shape (js/data/acticons.js). */
var ICON={Running:"run",Walking:"walk",Swimming:"swimming",Hiking:"trekking",Cycling:"bike",HIIT:"flame",
  "Spinning Class":"stationary-bike",CrossFit:"barbell",Yoga:"yoga",Pilates:"stretching-2",Dance:"music",
  Stretching:"stretching",Football:"ball-football",Basketball:"ball-basketball",Tennis:"ball-tennis",Padel:"padel",
  Squash:"squash",Badminton:"shuttlecock","Table Tennis":"ping-pong",Volleyball:"ball-volleyball",Handball:"play-handball",
  Rugby:"ball-american-football",Hockey:"hockey",Cricket:"cricket",Baseball:"ball-baseball",Golf:"golf",Boxing:"boxing",
  "Martial Arts":"karate",Climbing:"mountain",Skiing:"ski-jumping",
  "Air Bike":"air-bike",Bicycling:"bike","Bicycling, Stationary":"stationary-bike","Elliptical Trainer":"elliptical",
  "Jogging, Treadmill":"treadmill","Recumbent Bike":"recumbent-bike","Rope Jumping":"jump-rope","Rowing, Stationary":"rowing",
  "Running, Treadmill":"treadmill",Skating:"ice-skating",Stairmaster:"stairs-up","Step Mill":"stairs",
  "Trail Running/Walking":"run-sprint","Walking, Treadmill":"treadmill"};
/* Offered once: the library's "Bicycling" is the same thing as Cycling, so the grid
   shows Cycling only. Rides logged under either name still read as cardio. */
var HIDDEN={"Bicycling":1};
var BY={};
ACTS.forEach(function(a){BY[a[0]]={n:a[0],grp:a[1],met:a[2],dist:!!a[3],ico:a[4],ar:a[5]};});
Object.keys(LIB_ACTS).forEach(function(n){
  BY[n]={n:n,grp:"Cardio",met:LIB_ACTS[n][0],dist:!!LIB_ACTS[n][1],ico:"pulse",ar:LIB_ACTS[n][2],lib:true};});

/* Done outside, and tracked live with the phone's GPS when picked from Log cardio
   (js/ui/run.js). For each: how it is read (pace in min/km, or speed in km/h for a
   ride), the fastest it goes (two fixes further apart than that in the time between
   them are a GPS leap, not movement; m/s), the ground drawn under the route
   (js/ui/runmap.js), what the screen and the picker call it, and the word for one,
   for "Last run" and the like. */
var OUTDOOR={
  "Running":{read:"pace",top:9,ground:"city",title:"Running",pick:"Running, outdoor",last:"Last run"},
  "Walking":{read:"pace",top:4,ground:"park",title:"Walking",pick:"Walking, outdoor",last:"Last walk"},
  "Cycling":{read:"speed",top:20,ground:"country",title:"Cycling",pick:"Cycling, outdoor",last:"Last ride"},
  "Hiking":{read:"pace",top:4,ground:"trail",title:"Hiking",pick:"Hiking",last:"Last hike"},
  "Trail Running/Walking":{read:"pace",top:8,ground:"trail",title:"Trail run",pick:"Trail Running/Walking",last:"Last trail run"}};
function outdoorOf(n){return Object.prototype.hasOwnProperty.call(OUTDOOR,n)?OUTDOOR[n]:null;}

function actInfo(n){return BY[n]||null;}
function isActivity(n){return !!BY[n];}
/* The library's muscle filter: sports under Sports, everything else under Cardio. */
function actMuscle(n){var a=BY[n];return a?(a.grp==="Sports"?"Sports":"Cardio"):null;}
var ACT_GROUPS=["Cardio","Sports","Classes"];
function actsIn(grp){
  var out=ACTS.filter(function(a){return a[1]===grp;}).map(function(a){return a[0];});
  if(grp==="Cardio")out=out.concat(Object.keys(LIB_ACTS).filter(function(n){return !HIDDEN[n];}));
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
/* A ride is read as speed, everything else as pace: "24.3 km/h" or "5:30 /km". */
function rides(n){var o=outdoorOf(n);return o?o.read==="speed":/cycl|bicycl/i.test(n||"");}
function actRate(n,min,km){
  if(!rides(n))return actPace(min,km);
  if(!(min>0&&km>0))return "";
  return (Math.round(km/(min/60)*10)/10).toFixed(1)+" km/h";}
function actKcal(n,mins,rpe,kg){
  var a=BY[n];if(!a||!mins)return 0;
  return Math.round(a.met*(kg||70)*(mins/60)*intensityOf(rpe||6)[2]);}


function actIcon(n,size){
  var k=ACT_ICONS[ICON[n]]?ICON[n]:"heartbeat";
  return '<svg viewBox="0 0 24 24" width="'+(size||22)+'" height="'+(size||22)+'" aria-hidden="true" class="acticon">'+ACT_ICONS[k]+'</svg>';}

export {actPace, actRate, ACT_GROUPS, ACTS, actIcon, actInfo, actKcal, actMuscle, actsIn, INTENSITY, intensityOf, isActivity, OUTDOOR, outdoorOf};
