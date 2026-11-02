import {correctiveFor, FAULTS_ASK} from "../corrective.js";

/* The squat check (js/knowledge/imbalances.js MOVEMENT_FAULTS) to the corrective warm-up:
   roll and stretch the overactive muscles, wake the underactive ones, three of each at most. */
function run(t){
  t.eq(correctiveFor([],{}),null,"nothing ticked: nothing added");
  var k=correctiveFor(["ohsa_knees_in"],{});
  t.eq([k.over.slice(0,2),k.under.slice(0,2)],[["tensor fasciae latae","adductors"],["gluteus maximus","gluteus medius"]],"knees in: TFL and adductors tight, glutes weak, as the book lists");
  t.eq([k.inhibit[0].name,k.lengthen.map(function(x){return x.name;}),k.activate.map(function(x){return x.name;}).slice(0,2)],
    ["Iliotibial Tract-SMR",["IT Band and Glute Stretch","Butterfly Stretch"],["Glute Bridge Hold","Monster Walk"]],"rolled, stretched, woken");
  var floor=correctiveFor(["ohsa_knees_in","ohsa_low_back_arch"],{avoid:function(n){return /SMR|Bridge|Dead Bug|Child|Ball Leg Curl/.test(n);}});
  t.eq([floor.inhibit.length,floor.activate.map(function(x){return x.name;}).indexOf("Hip Extension with Bands")>=0],[0,true],"nothing on the floor: a standing version");
  var all=correctiveFor(FAULTS_ASK.map(function(x){return x[0];}),{});
  t.eq([all.inhibit.length<=2,all.lengthen.length<=2,all.activate.length<=2],[true,true,true],"two of each at most");
  t.eq(JSON.stringify(all).indexOf("Lower Back-SMR")<0&&JSON.stringify(all).indexOf("Neck-SMR")<0,true,"never rolled over the lower back or the neck");}

export {run};
