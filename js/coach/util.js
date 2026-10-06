/* Bunyan — coach: shared helpers
   Everything in js/coach/ is a pure function: plain data in, plain data out. No DOM,
   no state, no network, no imports from the app. The app passes in what the coach
   needs to know about an exercise through one small object, `info`:
     muscle(name)        the exercise's main muscle
     secondary(name)     the muscles it also works
     activity(name)      true for cardio, sport and classes (not lifting)
     load(name,w,date)   the load a set moved, body weight included where it counts
   Missing pieces fall back to safe defaults, so the tests can pass a few fakes. */

function infoOf(info){
  info=info||{};
  return {
    muscle:info.muscle||function(){return "Other";},
    secondary:info.secondary||function(){return [];},
    activity:info.activity||function(){return false;},
    load:info.load||function(n,w){return +w||0;}};}

function num(v){v=+v;return isFinite(v)?v:0;}
function r1(v){return Math.round(v*10)/10;}

/* Days since the epoch, from "YYYY-MM-DD". NaN-free: a bad date is day 0. */
function dayNo(iso){
  var m=/^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso||""));
  if(!m)return 0;
  return Math.floor(Date.UTC(+m[1],+m[2]-1,+m[3])/864e5);}
function isoOf(day){return new Date(day*864e5).toISOString().slice(0,10);}
/* The Monday a date's week starts on. */
function weekOf(iso){var d=dayNo(iso),dow=(d+3)%7;return isoOf(d-dow);}

/* The working sets of an entry: not warm-ups, with reps or seconds logged. */
function workSets(e){return ((e&&e.sets)||[]).filter(function(x){return x&&!x.wu&&num(x.r)>0;});}

/* The estimated one-rep max: Epley, counting the reps left in reserve. A set of 8 at
   RPE 8 stopped two short of failure, so it is worth 10 reps of effort, not 8; reading
   it as 8 made an easy set and a grinder look the same. Reps in reserve come from the
   RIR-based RPE scale (Zourdos et al. 2016, Helms et al. 2016): RPE 10 is none left,
   9 one, 8 two, and so on, trusted down to RPE 6 (four left) and no further, since
   people misjudge sets that far from failure. With no RPE logged the set counts as
   taken to failure, as before. Capped at 12 reps of effort, where Epley degrades badly.
   A single at RPE 10, or with no RPE, is a max already. */
function rirOf(rpe){rpe=num(rpe);return rpe>=6&&rpe<=10?Math.min(4,10-rpe):0;}
function e1rm(w,r,rpe){
  w=num(w);r=num(r);if(!w||!r)return 0;
  var eff=r+rirOf(rpe);
  if(eff>12)return 0;
  return eff===1?r1(w):r1(w*(1+eff/30));}

/* Sessions in date order, oldest first, whatever order they came in. */
function byDate(sessions){
  return (sessions||[]).filter(function(s){return s&&s.date&&Array.isArray(s.entries);})
    .slice().sort(function(a,b){return dayNo(a.date)-dayNo(b.date);});}

export {byDate, dayNo, e1rm, infoOf, isoOf, num, r1, rirOf, weekOf, workSets};
