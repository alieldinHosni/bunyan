/* Bunyan — coach: a bad day, reconciled against the week
   When a day goes badly — a blown day of eating, a missed session — the answer to
   "how do I make up for it" is worked out against the week, never by making tomorrow
   harder. What is left of the week's budget is spread over the days that remain, and
   every day stays inside hard limits. If the gap does not fit inside them, nothing is
   forced: the honest answer is "the week is still fine" and the gap is let go.
   The limits win over the reconciliation, on both sides.

   Nutrition — reconcileNutrition({days, bmr, from})
     days  the week's days: [{date, target:{kcal,p,c,f}, eaten:{kcal,…}|null}]. The
           target is the day's normal one from the engine; cardio calories are never
           added to it (the activity multiplier already counts training).
     bmr   the profile's Mifflin-St Jeor resting energy, kcal — handed in, never
           assumed; without it nothing is computed.
     from  the first day that can still change; days before it are closed.
   The gap is the closed days' targets minus what was eaten on them. A closed day with
   nothing logged is no history: it adds nothing to the gap, and is listed in
   `unlogged`, never read as zero eaten. Each remaining day may move at most 15% from
   its normal target, either way, and never below BMR (a day whose target already sits
   at or under BMR cannot move down). The gap is spread as evenly as the limits allow,
   in steps of 10 kcal, rather than loaded onto one day. Protein holds; carbs and fat
   take the change, in proportion to their share of the day's non-protein energy.

   Training — reconcileTraining({missed, sessions, from})
     missed    the session that did not happen: {date, sets:{muscle:n}}
     sessions  the week's other sessions: [{date, sets:{muscle:n}}] — those before
               `from` as done, those on or after it as planned
   Sets per muscle are counted the app's way (full for the main muscle, half for each
   one an exercise also works); a session loads a muscle when it gives it a whole set
   or more. Whole missed sets are moved, at most one per muscle per remaining session
   (block.js's limit), only into sessions that already train that muscle, never into
   one with another session loading the same muscle the day before or after (at least
   one rest day between sessions for the same muscles: js/knowledge/acute-variables.js
   VARIABLES.frequency, source 20.3), and never past the muscle's weekly maximum
   recoverable volume (js/coach/landmarks.js — practitioner heuristics, not measured
   constants; see BASIS there). Catching up past what can be recovered from is the
   opposite of what a missed session calls for.

   What fits is moved and the rest is let go, and both numbers are said: "1 of 6 sets
   moved to Saturday, the other 5 are gone" — a partial move is not a fix, and the
   result must not read as one. Per muscle:
     {muscle, missed, moved, gone, ceiling, why}
     ceiling  "mrv", or "none" where landmarks.js has no MRV for the muscle (Forearms,
              Adductors, Neck): then the one-set-per-session limit governs alone, and
              the result says there is no recovery-ceiling data for it
     why      what stopped the rest ("" when everything moved):
       mrv          the week would pass the muscle's MRV
       no_session   no remaining session trains the muscle
       rest_days    the sessions that do sit next to another one for the same muscle
       per_session  more sets missed than sessions to take one each
   kind: "adjust" (all moved), "partial" (some), "week_fine" (none: the week is still
   fine, this one's gone).

   Both return a defined result for any input — never NaN, never undefined. */
import {BASIS, LANDMARKS} from "./landmarks.js";
import {dayNo, num} from "./util.js";

var DAY_SHIFT=0.15, STEP=10;
var ISO=/^\d{4}-\d{2}-\d{2}/;

function byDay(a,b){return dayNo(a.date)-dayNo(b.date);}

/* Spread `units` over the days' capacities (in units) as evenly as they allow.
   The caller has checked the capacities add up to at least `units`. */
function spread(units,caps){
  var give=caps.map(function(){return 0;}),left=units;
  var order=caps.map(function(c,i){return i;}).sort(function(a,b){return caps[a]-caps[b]||a-b;});
  order.forEach(function(i,k){
    var g=Math.min(caps[i],Math.floor(left/(order.length-k)));give[i]=g;left-=g;});
  for(var guard=0;left>0&&guard<units+caps.length;guard++)
    for(var i=0;i<caps.length&&left>0;i++)if(give[i]<caps[i]){give[i]++;left--;}
  return give;}

function withShift(d,shift){
  var T=d.target,p=num(T.p),c=num(T.c),f=num(T.f),cK=c*4,fK=f*9,nonP=cK+fK;
  var dc=nonP>0?shift*cK/nonP/4:shift/4,df=nonP>0?shift*fK/nonP/9:0;
  return {date:d.date,kcal:Math.round(num(T.kcal)+shift),p:p,c:Math.max(0,Math.round(c+dc)),
    f:Math.max(0,Math.round(f+df)),shift:shift};}

function reconcileNutrition(input){
  input=input||{};
  var out={kind:"none",gap:0,unlogged:[],days:[],why:""};
  var bmr=num(input.bmr),from=String(input.from||"");
  if(!(bmr>0)){out.why="bmr";return out;}
  if(!ISO.test(from)){out.why="from";return out;}
  var week=(Array.isArray(input.days)?input.days:[]).filter(function(d){
    return d&&ISO.test(String(d.date||""))&&d.target&&num(d.target.kcal)>0;}).slice().sort(byDay);
  if(!week.length){out.why="targets";return out;}
  var start=dayNo(from),gap=0;
  var open=week.filter(function(d){return dayNo(d.date)>=start;});
  week.forEach(function(d){
    if(dayNo(d.date)>=start)return;
    if(!d.eaten||!(num(d.eaten.kcal)>0)){out.unlogged.push(d.date);return;}
    gap+=num(d.target.kcal)-num(d.eaten.kcal);});
  out.gap=Math.round(gap);
  var units=Math.round(Math.abs(gap)/STEP),up=gap>0;
  if(!units){out.kind="on_track";out.days=open.map(function(d){return withShift(d,0);});return out;}
  if(!open.length){out.kind="week_fine";out.why="no_days_left";return out;}
  var caps=open.map(function(d){
    var T=num(d.target.kcal),most=Math.floor(T*DAY_SHIFT);
    var room=up?most:T<=bmr?0:Math.min(most,T-bmr,num(d.target.c)*4+num(d.target.f)*9);
    return Math.floor(Math.max(0,room)/STEP);});
  if(caps.reduce(function(a,b){return a+b;},0)<units){out.kind="week_fine";out.why="limits";return out;}
  var give=spread(units,caps);
  out.kind="adjust";
  out.days=open.map(function(d,i){return withShift(d,(up?1:-1)*give[i]*STEP);});
  return out;}

function loads(s,m){return num(s&&s.sets&&s.sets[m])>=1;}

function reconcileTraining(input){
  input=input||{};
  var out={kind:"none",add:[],muscles:[],missed:0,moved:0,gone:0,basis:BASIS};
  var missed=input.missed,from=String(input.from||"");
  if(!missed||!ISO.test(String(missed.date||""))||!ISO.test(from))return out;
  var sessions=(Array.isArray(input.sessions)?input.sessions:[]).filter(function(s){
    return s&&ISO.test(String(s.date||""))&&s.sets&&typeof s.sets==="object";}).slice().sort(byDay);
  var need={};
  Object.keys(missed.sets||{}).forEach(function(m){var n=Math.floor(num(missed.sets[m]));if(n>0)need[m]=n;});
  var names=Object.keys(need).sort();
  if(!names.length){out.kind="nothing_missed";return out;}
  var start=dayNo(from),add=[];
  names.forEach(function(m){
    var L=LANDMARKS[m],n=need[m];
    var week=sessions.reduce(function(a,s){return a+num(s.sets[m]);},0);
    var room=L?Math.max(0,Math.floor(L.mrv-week)):n;
    var later=sessions.filter(function(s){return dayNo(s.date)>=start&&loads(s,m);});
    var fit=later.filter(function(s){
      return !sessions.some(function(o){return o!==s&&loads(o,m)&&Math.abs(dayNo(o.date)-dayNo(s.date))<=1;});});
    var moved=Math.min(n,room,fit.length),why="";
    if(moved<n)why=L&&room<=fit.length?"mrv":!later.length?"no_session":!fit.length?"rest_days":"per_session";
    fit.slice(0,moved).forEach(function(s){add.push({date:s.date,muscle:m,sets:1});});
    out.muscles.push({muscle:m,missed:n,moved:moved,gone:n-moved,ceiling:L?"mrv":"none",why:why});
    out.missed+=n;out.moved+=moved;});
  out.gone=out.missed-out.moved;
  out.kind=!out.moved?"week_fine":out.gone?"partial":"adjust";
  out.add=add.sort(function(a,b){return byDay(a,b)||(a.muscle<b.muscle?-1:1);});
  return out;}

export {DAY_SHIFT, reconcileNutrition, reconcileTraining};
