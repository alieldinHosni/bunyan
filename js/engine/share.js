/* Bunyan — share
   What a friend hands over, and nothing more: the latest weigh-ins and a summary of
   each session (date, name, volume, and the sets as weight × reps), and what the app
   shows of a friend's snapshot. Moved out of state.js, which is storage and nothing
   else, so it no longer reaches up into the engine for session volume. */
import {sessionVolume} from "./formulas.js";
import {curProfile, S} from "../state.js";
import {num, r1, rd, today, wr} from "../util.js";

function buildSnapshot(){
  return {v:1,name:curProfile().name,at:today(),
    goals:S.goals,
    body:S.body.filter(function(b){return b.weight;}).slice(-90)
             .map(function(b){return [b.date,b.weight];}),
    sessions:S.sessions.slice(0,60).map(function(x){
      return {d:x.date,n:x.dayName,v:Math.round(sessionVolume(x)),
        e:x.entries.map(function(e){
          return {n:e.name,s:e.sets.map(function(st){return [st.w,st.r];})};})};})};}
function friends(){return rd("bunyan:friends",{});}
function saveFriends(f){wr("bunyan:friends",f);}
function snapStats(sn){
  var vol=0,prs={},last=null;
  sn.sessions.forEach(function(x){
    vol+=x.v; if(!last||x.d>last)last=x.d;
    x.e.forEach(function(e){
      e.s.forEach(function(st){
        var w=num(st[0]);if(!prs[e.n]||w>prs[e.n][0])prs[e.n]=[w,num(st[1])];});});});
  var bw=sn.body.map(function(b){return b[1];});
  var a7=bw.slice(-7);
  return {vol:vol,count:sn.sessions.length,last:last,prs:prs,
    weight:bw.length?bw[bw.length-1]:0,
    avg7:a7.length>=3?r1(a7.reduce(function(p,q){return p+q;},0)/a7.length):0,
    body:sn.body};}

export {buildSnapshot, friends, saveFriends, snapStats};
