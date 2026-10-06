/* Bunyan — coach: weekly volume from the log
   What was actually done, not what was planned: hard sets per muscle for each of the
   last few weeks, counted the app's way (a set in full for its main muscle, half for
   each muscle it also works; warm-ups and cardio do not count), then read against the
   landmarks in js/coach/landmarks.js.

   Status per muscle, on the average of the complete weeks:
     under     below the minimum effective volume
     ok        between it and the top of the adaptive range
     high      above the adaptive range, under the recoverable maximum
     over      above the recoverable maximum
     none      not trained in the window (counted, not judged)
   Fewer than two complete weeks logged: "insufficient", and nothing is judged. */
import {LANDMARKS} from "./landmarks.js";
import {byDate, dayNo, infoOf, isoOf, r1, weekOf, workSets} from "./util.js";

function weeklyVolume(sessions,info,opts){
  var I=infoOf(info);opts=opts||{};
  var today=opts.today||new Date().toISOString().slice(0,10),n=opts.weeks||4;
  var thisWeek=weekOf(today),weeks=[];
  for(var k=n;k>=0;k--)weeks.push({start:isoOf(dayNo(thisWeek)-7*k),sets:{},sessions:0});
  var at={};weeks.forEach(function(w,i){at[w.start]=i;});
  byDate(sessions).forEach(function(s){
    var i=at[weekOf(s.date)];if(i==null)return;
    var w=weeks[i],any=false;
    s.entries.forEach(function(e){
      if(!e||!e.name||I.activity(e.name))return;
      var n2=workSets(e).length;if(!n2)return;
      any=true;
      var m=I.muscle(e.name);w.sets[m]=(w.sets[m]||0)+n2;
      (I.secondary(e.name)||[]).forEach(function(x){if(x!==m)w.sets[x]=(w.sets[x]||0)+n2/2;});});
    if(any)w.sessions++;});
  /* Complete weeks are every week before this one that had a lifting session. */
  var done=weeks.slice(0,-1).filter(function(w){return w.sessions>0;});
  var out={weeks:weeks.map(function(w){var o={};Object.keys(w.sets).forEach(function(m){o[m]=r1(w.sets[m]);});
            return {start:w.start,sets:o,sessions:w.sessions};}),
           complete:done.length,muscles:{},status:done.length>=2?"ok":"insufficient"};
  if(done.length<2)return out;
  Object.keys(LANDMARKS).forEach(function(m){
    var L=LANDMARKS[m],tot=0;
    done.forEach(function(w){tot+=w.sets[m]||0;});
    var avg=r1(tot/done.length);
    out.muscles[m]={avg:avg,mev:L.mev,mav:L.mav,mrv:L.mrv,
      status:!avg?"none":avg<L.mev?"under":avg>L.mrv?"over":avg>L.mav[1]?"high":"ok"};});
  return out;}

export {weeklyVolume};
