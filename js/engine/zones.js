/* Bunyan — cardio zones and the stage to train at
   Owner, 2 Nov ("all, in order"), item 5: cardio zones and the book's staged progression.

   The book prescribes cardio from the person's own markers (js/knowledge/cardio.js
   STAGE_RULES.specificity): the heart rate at VT1, where talking first becomes hard
   (the talk test, assessments.js talk_test_vt1), and at VT2. With them the four zones
   are heart-rate bands (ZONE_CALC: zone 2 from VT1 to the midpoint, zone 3 from the
   midpoint to VT2). Without them the zones are said by feel (RPE and the talk test,
   ZONES[].feels), and the estimated maximum heart rate (Tanaka, 208 − 0.7 × age,
   INTENSITY_METHODS) is shown as the book offers it: a starting point, never absolute.
   No band of our own is put on a zone the book defines by the person's thresholds.
   With a condition whose medication blunts the heart rate (engine/conditions.js
   talkTest), no number at all: feel only.

   The stage (STAGES):
     1  steady in zone 1; ready for 2 after zone 1 for 30 min or more, three times in a
        week (the book's readiness rule, read from the last seven days of cardio logged
        easy: RPE 4 or less, or not rated)
     2  intervals just above VT1: needs VT1 measured (the book's prerequisite)
     3  zones 1–3, a low, medium and high day: needs VT1 and VT2, and not for a modest
        goal, a beginner, or anyone with a condition (the book's "skip" list)
   Stage 4 (athletes) and 5 (no pages in the source) are not offered.

   zonesFor(p) → {measured, hrmax|null, feelOnly, rows:[{zone, min|null, max|null, rpe, feel}]}
   stageFor(p, sessions, today, info) → {stage, ready, needVT1, needVT2}
   Pure. */
import {ZONES} from "../knowledge/cardio.js";
import {rulesFor} from "./conditions.js";

function n(x){x=+x;return isFinite(x)&&x>0?x:0;}

function zonesFor(p){
  p=p||{};var R=rulesFor(p),feelOnly=!!(R&&R.talkTest);
  var v1=feelOnly?0:n(p.vt1),v2=feelOnly?0:n(p.vt2),age=n(p.age);
  var mid=v1&&v2&&v2>v1?Math.round((v1+v2)/2):0;
  var rows=ZONES.map(function(z){
    var r={zone:z.zone,min:null,max:null,rpe:z.rpe10,feel:(z.feels||[]).slice(-1)[0]||""};
    if(v1){
      if(z.zone===1)r.max=v1-1;
      else if(z.zone===2){r.min=v1;r.max=mid?mid-1:null;}
      else if(z.zone===3&&mid){r.min=mid;r.max=v2-1;}
      else if(z.zone===4&&v2)r.min=v2;}
    return r;});
  return {measured:!!v1,both:!!mid,feelOnly:feelOnly,hrmax:!feelOnly&&age?Math.round(208-0.7*age):null,rows:rows};}

/* Cardio logged in the last seven days: sessions with 30 minutes or more of an
   activity done easy (zone 1 by feel). info.cardio(name) → is it cardio. */
function easyLong(sessions,today,info){
  var t=Date.parse(today+"T00:00:00Z"),k=0;
  (sessions||[]).forEach(function(s){
    var d=(t-Date.parse(s.date+"T00:00:00Z"))/864e5;if(d<0||d>=7)return;
    var mins=0;
    (s.entries||[]).forEach(function(e){if(!info.cardio(e.name))return;
      (e.sets||[]).forEach(function(x){var r=n(x.rpe);if(!r||r<=4)mins+=n(x.min);});});
    if(mins>=30)k++;});
  return k;}

function stageFor(p,sessions,today,info){
  p=p||{};
  var ready=easyLong(sessions,today,info)>=3,R=rulesFor(p),z=zonesFor(p);
  var out={stage:1,ready:ready,needVT1:false,needVT2:false};
  if(!ready)return out;
  if(!z.measured){out.needVT1=!z.feelOnly;return out;}
  out.stage=2;
  var modest=p.level==="new"||!!R||/^(lose|recomp|maintain|mobility)$/.test(p.goal||"");
  if(!modest){if(z.both)out.stage=3;else out.needVT2=true;}
  /* The book skips stage 3 for a modest goal; for an experienced lifter whose only bar is
     the goal (fat loss, keeping), it is a choice they make (p.cardio3). */
  else if(z.both&&!R&&(p.level==="experienced"||p.level==="advanced")){out.can3=true;if(p.cardio3)out.stage=3;}
  /* Stage 4, for advanced athletes after anaerobic capacity (the book's notFor: modest
     fitness, averse to high intensity): offered, never given; they choose it (p.cardio4). */
  out.can4=out.stage===3&&p.level==="advanced"&&/^(athletic|endurance|strength)$/.test(p.goal||"");
  if(out.can4&&p.cardio4)out.stage=4;
  return out;}

export {stageFor, zonesFor};
