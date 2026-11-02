import {habits} from "../habits.js";

/* The food log read for what the person eats (js/engine/habits.js): how many days each
   food was logged, and the meals eaten again and again with their usual amounts. Only
   what the log says: a food the lookup does not know, or with no grams, is not counted. */
var FOODS={ful:{id:"ful",kcal:110},egg_boiled:{id:"egg_boiled",kcal:155},baladi:{id:"baladi",kcal:250},
  rice_egyptian:{id:"rice_egyptian",kcal:130},chicken_breast_ck:{id:"chicken_breast_ck",kcal:165},tea:{id:"tea",kcal:0}};
function find(id){return FOODS[id]||null;}
function addDays(iso,n){var d=new Date(iso+"T00:00:00Z");d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
function it(fid,g){return {fid:fid,grams:g,kcal:Math.round((FOODS[fid]?FOODS[fid].kcal:100)*g/100)};}

function run(t){
  var today="2026-11-02",days={};
  for(var i=0;i<5;i++)days[addDays(today,-i)]={meals:{Breakfast:{items:[it("ful",200+i*10),it("egg_boiled",100),it("baladi",90),it("tea",250)]}}};
  days[addDays(today,-1)].meals.Lunch={items:[it("rice_egyptian",200),it("chicken_breast_ck",150)]};
  days[addDays(today,-2)].meals.Lunch={items:[it("rice_egyptian",250),it("chicken_breast_ck",150)]};
  days[addDays(today,-40)]={meals:{Breakfast:{items:[it("rice_egyptian",100),it("egg_boiled",50)]}}};
  days[addDays(today,-3)].meals.Snack={items:[{fid:"mystery",grams:100,kcal:200},{fid:"ful",grams:0,kcal:0}]};
  var h=habits(days,today,find);
  t.eq(h.eaten.ful,5,"a food is counted once a day it was logged");
  t.eq(h.eaten.rice_egyptian,2,"four weeks back only: the old entry is not counted");
  t.ok(!h.eaten.mystery&&!h.eaten.tea,"a food the database does not know, or without energy, is not counted");
  t.eq(h.usual.Breakfast.length,1,"the breakfast eaten most days is a usual meal");
  var b=h.usual.Breakfast[0];
  t.eq(b.fids,["baladi","egg_boiled","ful"],"its foods, the ones the log can say what they are");
  t.eq([b.days,b.grams.ful,b.grams.egg_boiled,b.slot],[5,220,100,"Breakfast"],"how often, the usual amounts (the median) and the meal it is eaten at");
  t.eq(h.usual.Main.length,0,"a lunch eaten twice is not yet a habit");
  t.eq(habits({},today,find),{eaten:{},usual:{Breakfast:[],Main:[],Snack:[]}},"no log, no habits: nothing invented");
  t.clean(h,"clean");}

export {run};
