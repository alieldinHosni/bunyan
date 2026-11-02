/* Bunyan — coach: a missed day, rebalanced
   Owner, 2 Nov (from the coach's suggestions): "if you skip a day, the coach moves its
   key work into the rest of the week instead of dropping it."

   Only a program on weekdays loses a day by missing it; one that rotates simply carries
   on from what was trained, so nothing is lost there and nothing is offered.

   For the latest planned day this week that went by without a session:
   1. move:  a free day still ahead this week, with no session on its main muscles the
             day before or the day after (the textbook's rest day between sessions on the
             same muscles, acute-variables · frequency): the whole day goes there.
   2. fold:  else its key work joins the days left: for each muscle it trained most that
             the rest of the week will not train (as its exercises' main muscle) at half
             what the missed day gave it, the
             day's first multi-joint lift for that muscle, KEY_SETS sets, on the first day
             left whose neighbours do not train that muscle and that has the time.
   3. covered: the days left already train those muscles at half or more: nothing to
             carry, and it says so.
   4. none:  else nothing fits without breaking a rest day: let it go, and the plan
             carries on (said plainly, not forced).
   KEY_SETS is a modelling choice (enough to keep the lift moving, small enough to fit
   another session), not a figure from a source.

   rebalanceWeek(o) → null | {missed:{date,dayId,name}, kind:"move"|"fold"|"covered"|"none", to?, adds[], left[]}
   o: {today, days:[{date, dayId, name, ex[], done, load:{muscle:sets}, mins}] — the week,
       with a day either side for the neighbours; handled:{date:1}; budget (minutes);
       addMin(name, sets) → minutes; info (muscle, secondary, activity, compound)}
   Pure: plain data in, a plain answer out. */
import {infoOf, num} from "./util.js";

var KEY_SETS=2,MAIN_SHARE=0.25,CLASH=2;

function rebalanceWeek(o){
  var I=infoOf(o.info),comp=(o.info&&o.info.compound)||function(){return true;};
  var days=(o.days||[]).map(function(d){return Object.assign({},d,{load:Object.assign({},d.load||{}),mins:num(d.mins)});});
  var at={};days.forEach(function(d,i){at[d.date]=i;});
  var handled=o.handled||{};
  /* The latest planned day before today, this week (the first and last entries are the
     neighbours, outside it), with nothing logged and not already dealt with. */
  var missed=null;
  for(var i=days.length-2;i>=1;i--){var d=days[i];
    if(d.date<o.today&&d.dayId&&!d.done&&!handled[d.date]&&(d.ex||[]).length){missed=d;break;}}
  if(!missed)return null;
  /* It did not happen, so it tires nothing: its own load is not a neighbour's. */
  missed.load={};
  /* Its main muscles: what its exercises mainly train (not the half-sets a row gives the
     biceps), a quarter of its sets or more. */
  var pm={},tot=0;
  (missed.ex||[]).forEach(function(e){if(I.activity(e.name))return;var m=e.muscle||I.muscle(e.name),s=Math.max(1,num(e.sets)||3);pm[m]=(pm[m]||0)+s;tot+=s;});
  var mains=Object.keys(pm).filter(function(m){return pm[m]>=tot*MAIN_SHARE;});
  function clash(idx,ms){var d=days[idx];if(!d)return false;
    return ms.some(function(m){return num(d.load[m])>=CLASH;});}
  var out={missed:{date:missed.date,dayId:missed.dayId,name:missed.name},kind:"none",adds:[],left:[]};
  /* 1. A free day ahead, a rest day either side of it for those muscles. */
  for(var j=1;j<days.length-1;j++){var c=days[j];
    if(c.date<o.today||c.dayId||c.done)continue;
    if(!clash(j-1,mains)&&!clash(j+1,mains)){out.kind="move";out.to=c.date;return out;}}
  /* 2. The key lifts into the days left. */
  var left=days.filter(function(d,k){return k>0&&k<days.length-1&&d.date>=o.today&&d.dayId&&!d.done;});
  /* What the days left train, by their exercises' main muscles. */
  var ahead={};left.forEach(function(d){(d.ex||[]).forEach(function(e){if(I.activity(e.name))return;
    var m=e.muscle||I.muscle(e.name);ahead[m]=(ahead[m]||0)+Math.max(1,num(e.sets)||3);});});
  var seen={};
  (missed.ex||[]).forEach(function(e){
    if(I.activity(e.name)||!comp(e.name))return;
    var m=e.muscle||I.muscle(e.name);
    if(seen[m]||mains.indexOf(m)<0||num(ahead[m])>=pm[m]*0.5)return;
    seen[m]=1;
    var placed=false;
    for(var q=0;q<left.length&&!placed;q++){
      var d=left[q],idx=at[d.date],add=num(o.addMin?o.addMin(e.name,KEY_SETS):KEY_SETS*2.5);
      if(clash(idx-1,[m])||clash(idx+1,[m]))continue;
      if(o.budget&&d.mins+add>o.budget+5)continue;
      d.mins+=add;d.load[m]=(d.load[m]||0)+KEY_SETS;
      out.adds.push({date:d.date,dayId:d.dayId,dayName:d.name,name:e.name,muscle:m,sets:KEY_SETS});placed=true;}
    if(!placed)out.left.push(m);});
  if(out.adds.length)out.kind="fold";
  /* Nothing to carry: the days left train those muscles anyway. */
  else if(!out.left.length)out.kind="covered";
  return out;}

export {KEY_SETS, rebalanceWeek};
