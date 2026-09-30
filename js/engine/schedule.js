/* Bunyan — schedule
   Weekday helpers for programs scheduled "by weekday": each day of the program is
   pinned to one or more weekdays (day.wd, Monday = 1 … Sunday = 7), and a weekday
   with nothing pinned is a rest day. Rotation lives in train.js with planOn(). */
import {S} from "../state.js";

function isoWeekday(iso){var d=new Date(iso+"T00:00:00").getDay();return d===0?7:d;}
function addDays(iso,n){var d=new Date(iso+"T00:00:00");d.setDate(d.getDate()+n);
  return new Date(d.getTime()-d.getTimezoneOffset()*6e4).toISOString().slice(0,10);}

/* A sensible week for n training days: spread out, never three in a row when it can
   be helped. */
var SPREAD={1:[1],2:[1,4],3:[1,3,5],4:[1,2,4,5],5:[1,2,3,5,6],6:[1,2,3,4,5,6],7:[1,2,3,4,5,6,7]};
function spreadWd(n){return (SPREAD[Math.max(1,Math.min(7,n))]||[]).slice();}

/* The training day pinned to this date's weekday, or null for a rest day. */
function pinnedOn(sp,iso){
  var wd=isoWeekday(iso);
  return sp.days.filter(function(d){return d.ex.length&&(d.wd||[]).indexOf(wd)>=0;})[0]||null;}
/* The next pinned training day from this date on (this date included). */
function nextPinned(sp,iso){
  for(var k=0;k<7;k++){var d=pinnedOn(sp,addDays(iso,k));if(d)return {day:d,iso:addDays(iso,k)};}
  return null;}

/* Weekdays for a program that has been running in rotation, read from when each of
   its days was actually trained over the last eight weeks: each day gets the weekday
   it was trained on most often that is still free. Days with no history, and any
   left over, fill the remaining slots of an even spread. */
function suggestWd(sp){
  var train=sp.days.filter(function(d){return d.ex.length;}),taken={},out={};
  var cut=addDays(new Date(Date.now()-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,10),-56);
  var hist={};
  S.sessions.forEach(function(s){
    if(!s.dayId||s.date<cut)return;
    var c=hist[s.dayId]||(hist[s.dayId]={});var w=isoWeekday(s.date);c[w]=(c[w]||0)+1;});
  train.forEach(function(d){
    var c=hist[d.id];if(!c)return;
    var best=Object.keys(c).map(Number).filter(function(w){return !taken[w];})
      .sort(function(a,b){return c[b]-c[a]||a-b;})[0];
    if(best){out[d.id]=[best];taken[best]=1;}});
  var free=spreadWd(train.length).filter(function(w){return !taken[w];});
  var rest=[1,2,3,4,5,6,7].filter(function(w){return !taken[w]&&free.indexOf(w)<0;});
  free=free.concat(rest);
  train.forEach(function(d){if(!out[d.id]){var w=free.shift();if(w){out[d.id]=[w];taken[w]=1;}}});
  return out;}

export {addDays, isoWeekday, nextPinned, pinnedOn, spreadWd, suggestWd};
