/* Bunyan — maintenance, learned from the log
   A formula (Mifflin–St Jeor × an activity factor) guesses how many calories a body uses
   a day, and for a given person it is often 10–15% off. The log can measure it instead:
   over a few weeks, what was eaten, minus the energy the weight change stored or
   released, is what the body used.

     maintenance ≈ average intake − (weight change per day × 7,700 kcal per kg)

   7,700 kcal per kg is the usual figure for body-weight change (Wishnofsky's 3,500 kcal
   per pound). It is a simplification: early in a diet, water and glycogen move the scale
   more than fat does, which is why this waits for weeks of data, not days.

   Three things make the measurement honest:
   - A day only counts if it looks fully logged. A day with breakfast and nothing else
     would make the body look like it runs on less than it does, so days far under the
     person's usual logged intake are left out, and the share of days that count is said.
   - The weight change is the slope of a line through every weigh-in in the window, not
     the first against the last, so one salty dinner does not swing it. Its uncertainty
     comes from how far the weigh-ins scatter around that line.
   - The result is combined with the formula by how sure each is (a normal–normal update:
     each weighted by one over its variance). With a few noisy weeks the answer stays
     near the formula; with a long, clean log it is the log's. The formula is taken as
     ±15%, the spread published comparisons find for it.

   Pure: plain data in, a plain answer out. No DOM, no storage, no network. */

var KCAL_PER_KG=7700;
var FORMULA_SD=0.15;          /* the formula's own uncertainty, as a share of it */
var MIN_DAYS=14, WINDOW=28, MIN_FOOD_DAYS=10, MIN_WEIGHINS=4, MIN_SPAN=10;

function dayNo(iso){return Math.round(Date.parse(iso+"T00:00:00Z")/864e5);}
function median(a){var b=a.slice().sort(function(x,y){return x-y;}),n=b.length;
  return n?(n%2?b[(n-1)/2]:(b[n/2-1]+b[n/2])/2):0;}

/* days:     [{date, kcal}] — what was logged each day (any order; days with nothing
             logged may be absent or have kcal 0)
   weighIns: [{date, weight}] in kg
   opts:     {today, formula} — the formula's maintenance, in kcal
   Returns {kind:"none"|"insufficient"|"ok", ...}; never NaN or undefined. */
function learnMaintenance(days,weighIns,opts){
  opts=opts||{};
  var today=opts.today,formula=+opts.formula||0;
  if(!today)return {kind:"none",why:"no date"};
  var end=dayNo(today),start=end-WINDOW+1;
  var inWin=function(d){var n=dayNo(d);return n>=start&&n<=end;};
  /* Today is still being eaten; it never counts as a full day. */
  var food=(days||[]).filter(function(x){return x&&x.date&&x.date<today&&inWin(x.date)&&+x.kcal>0;})
    .map(function(x){return {date:x.date,kcal:+x.kcal};});
  var w=(weighIns||[]).filter(function(x){return x&&x.date&&inWin(x.date)&&+x.weight>0;})
    .map(function(x){return {d:dayNo(x.date),kg:+x.weight};}).sort(function(a,b){return a.d-b.d;});
  var span=w.length?w[w.length-1].d-w[0].d:0;
  /* Partly logged days: under 60% of the person's own usual logged day. */
  var usual=median(food.map(function(x){return x.kcal;}));
  var full=food.filter(function(x){return x.kcal>=usual*0.6;});
  var base={formula:Math.round(formula),window:WINDOW,foodDays:full.length,skipped:food.length-full.length,
    weighIns:w.length,span:span};
  if(!food.length&&!w.length)return Object.assign({kind:"none",why:"nothing logged"},base);
  if(full.length<MIN_FOOD_DAYS)return Object.assign({kind:"insufficient",why:"food",need:MIN_FOOD_DAYS},base);
  if(w.length<MIN_WEIGHINS)return Object.assign({kind:"insufficient",why:"weighins",need:MIN_WEIGHINS},base);
  if(span<MIN_SPAN)return Object.assign({kind:"insufficient",why:"span",need:MIN_SPAN},base);
  var intake=full.reduce(function(a,x){return a+x.kcal;},0)/full.length;
  /* The weight's slope, kg per day, by least squares, and its standard error. */
  var n=w.length,mx=0,my=0;w.forEach(function(p){mx+=p.d;my+=p.kg;});mx/=n;my/=n;
  var sxx=0,sxy=0;w.forEach(function(p){sxx+=(p.d-mx)*(p.d-mx);sxy+=(p.d-mx)*(p.kg-my);});
  var slope=sxx?sxy/sxx:0,res=0;
  w.forEach(function(p){var e=p.kg-(my+slope*(p.d-mx));res+=e*e;});
  /* Never claim more certainty than daily weight noise allows: at least ±0.3 kg a day. */
  var sd=Math.max(n>2?Math.sqrt(res/(n-2)):0.3,0.3),seSlope=sxx?sd/Math.sqrt(sxx):1;
  var data=intake-slope*KCAL_PER_KG;
  /* Uncertainty of the measurement: the slope's, and the intake's from the days counted. */
  var intakeSd=Math.sqrt(full.reduce(function(a,x){return a+(x.kcal-intake)*(x.kcal-intake);},0)/Math.max(1,full.length-1));
  var seData=Math.sqrt(Math.pow(seSlope*KCAL_PER_KG,2)+Math.pow(intakeSd/Math.sqrt(full.length),2));
  /* A measurement far outside what bodies do says the log is incomplete, not the body. */
  if(data<1000||data>6000)return Object.assign({kind:"insufficient",why:"implausible",measured:Math.round(data)},base);
  var est=data,se=seData;
  if(formula>0){
    var fs=formula*FORMULA_SD,wd=1/(seData*seData),wf=1/(fs*fs);
    est=(data*wd+formula*wf)/(wd+wf);se=Math.sqrt(1/(wd+wf));}
  var r10=function(x){return Math.round(x/10)*10;};
  return Object.assign({kind:"ok",
    kcal:r10(est),low:r10(est-1.96*se),high:r10(est+1.96*se),
    measured:r10(data),intake:Math.round(intake),
    perWeek:Math.round(slope*7*100)/100,
    /* How much the answer is the log's own rather than the formula's, 0–1. */
    share:formula>0?Math.round((1/(seData*seData))/((1/(seData*seData))+1/Math.pow(formula*FORMULA_SD,2))*100)/100:1},base);}

export {KCAL_PER_KG, learnMaintenance};
