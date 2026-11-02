/* Bunyan — what the person actually eats, read from the food log (owner, 2 Nov: "the
   food and workout plan are not customised based on each person … everything should
   be tailored").

   The meal plan used to be written from the app's own plates alone. This reads the
   last four weeks of the log so it can be written from the person's food instead:
   1. eaten: how many days each food was logged on. The plan's plates take the food
      the person eats when one fits a slot (their rice, their bread, their cheese)
      before the app's own choice.
   2. usual: meals they eat again and again, the same foods together on USUAL days or
      more in the window (a breakfast of ful, eggs and bread most mornings). Each comes
      with the amounts they usually have, so the plan can serve that meal again,
      scaled to their targets, before it reaches for a plate of its own.
   Nothing is guessed: a food counts only when the log says what it was (a food id the
   database or their own foods know) and how much (grams).

   habits(days, today, find) → {eaten:{fid:days}, usual:{Breakfast|Main|Snack:[Usual]}}
     days: S.days; today: "YYYY-MM-DD"; find(fid) → the food or null.
     Usual: {fids[], grams:{fid:g}, days, slot}
   Pure: the log and a lookup in, a summary out. */

var WINDOW=28,USUAL=3,MAX_USUAL=2;

function dayNo(iso){return Math.round(Date.parse(iso+"T00:00:00Z")/864e5);}
function median(a){var s=a.slice().sort(function(x,y){return x-y;}),m=s.length>>1;return s.length%2?s[m]:(s[m-1]+s[m])/2;}

/* Which kind of meal a logged slot is: the four named ones by name, a meal of the
   person's own by how much it was. */
function kindOf(slot,kcal){
  if(/^breakfast$/i.test(slot))return "Breakfast";
  if(/^(lunch|dinner)$/i.test(slot))return "Main";
  if(/^snack$/i.test(slot))return "Snack";
  return kcal>=350?"Main":"Snack";}

function habits(days,today,find){
  var t=dayNo(today),eaten={},groups={};
  Object.keys(days||{}).forEach(function(d){
    var ago=t-dayNo(d);
    if(!(ago>=0&&ago<WINDOW))return;
    var meals=(days[d]&&days[d].meals)||{},seen={};
    Object.keys(meals).forEach(function(slot){
      var items=(meals[slot]&&meals[slot].items)||[],fids=[],grams={},kcal=0;
      items.forEach(function(it){
        if(!it||!it.fid||!(+it.grams>0))return;
        var f=find(it.fid);
        if(!f||!(+f.kcal>0))return;
        if(!seen[it.fid]){seen[it.fid]=1;eaten[it.fid]=(eaten[it.fid]||0)+1;}
        if(grams[it.fid]==null)fids.push(it.fid);
        grams[it.fid]=(grams[it.fid]||0)+(+it.grams);
        kcal+=+it.kcal||0;});
      /* A meal is two foods at least: one food on its own is a snack, not a habit. */
      if(fids.length<2)return;
      fids.sort();
      var key=kindOf(slot,kcal)+"|"+fids.join(",");
      var g=groups[key]||(groups[key]={kind:kindOf(slot,kcal),fids:fids,days:{},grams:{},slot:{}});
      if(g.days[d])return;
      g.days[d]=1;g.slot[slot]=(g.slot[slot]||0)+1;
      fids.forEach(function(id){(g.grams[id]=g.grams[id]||[]).push(grams[id]);});});});
  var usual={Breakfast:[],Main:[],Snack:[]};
  Object.keys(groups).map(function(k){return groups[k];})
    .filter(function(g){return Object.keys(g.days).length>=USUAL;})
    .sort(function(a,b){return Object.keys(b.days).length-Object.keys(a.days).length||(a.fids.join()<b.fids.join()?-1:1);})
    .forEach(function(g){
      var list=usual[g.kind];
      if(list.length>=MAX_USUAL)return;
      var gr={};g.fids.forEach(function(id){gr[id]=Math.round(median(g.grams[id]));});
      var slot=Object.keys(g.slot).sort(function(a,b){return g.slot[b]-g.slot[a];})[0];
      list.push({fids:g.fids.slice(),grams:gr,days:Object.keys(g.days).length,slot:slot});});
  return {eaten:eaten,usual:usual};}

export {habits, kindOf as mealKindOf, USUAL, WINDOW};
