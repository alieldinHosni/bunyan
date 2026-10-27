import {cleanPlan, packPlan, planSummary} from "../planshare.js";

/* A plan handed to another Bunyan: what is sent, and what is accepted on arrival. The
   code itself (compression, base64) is browser work and is tested in tests/regression.mjs. */
function run(t){
  var sp={id:"p1",name:"Arnold 2",schedule:"cycle",from:null,days:[
    {id:"d1",name:"Chest & Back",wd:[1],ex:[{id:"e1",name:"Barbell Bench Press - Medium Grip",sets:4,lo:6,hi:10,rest:120,note:"pause",grp:"a"},
      {id:"e2",name:"Arnold special",sets:3,lo:8,hi:12,rest:75,exId:"u_1"}]},{id:"d2",name:"Rest",wd:[],ex:[]}]};
  var slots=[{id:"Breakfast",plan:[{fid:"f1",n:"Oats",label:"80 g",grams:80,kcal:300,p:10,c:54,f:6,fib:8,src:"plan"}]},{id:"Lunch"}];
  var p=packPlan({program:sp,slots:slots,own:[{id:"u_1",n:"Arnold special",m:"Chest"},{id:"u_2",n:"Unused own",m:"Back"}],from:"Ali"});
  t.eq([p.k,p.v,p.from,p.program.name,p.program.days[0].ex.length,p.ex,p.meals.length],["bunyan-plan",1,"Ali","Arnold 2",2,[{n:"Arnold special",m:"Chest"}],1],
    "packed: the program, only the own exercises it uses, only meals with food");
  t.eq([p.program.id,p.program.days[0].id,p.program.days[0].ex[0].id,p.program.days[0].ex[1].exId],[undefined,undefined,undefined,undefined],"no ids travel; the receiver makes its own");
  var c=cleanPlan(JSON.parse(JSON.stringify(p)));
  t.eq([c.program.days[0].ex[0],c.meals[0].plan[0].kcal,c.meals[0].id],[{name:"Barbell Bench Press - Medium Grip",sets:4,lo:6,hi:10,rest:120,grp:"a",note:"pause"},300,"Breakfast"],"accepted as sent");
  t.eq(planSummary(c),{program:"Arnold 2",days:1,ex:2,meals:1,kcal:300},"its size, said before adding");
  t.eq([cleanPlan(null),cleanPlan({k:"x",v:1}),cleanPlan({k:"bunyan-plan",v:2,program:p.program}),cleanPlan({k:"bunyan-plan",v:1})],[null,null,null,null],"anything else is refused");
  var bad=cleanPlan({k:"bunyan-plan",v:1,program:{name:"<b>x",days:[{name:"D",ex:[{name:"Squat",sets:999,lo:-5,hi:"a",rest:1e9,evil:"y"},{sets:3}]}]},
    ex:[{n:"Mine",m:"Nonsense"}],meals:[{id:"M",plan:[{n:"Rice",kcal:-50,grams:1e9}]}]});
  t.eq([bad.program.days[0].ex,bad.ex[0].m,bad.meals[0].plan[0].kcal,bad.meals[0].plan[0].grams],
    [[{name:"Squat",sets:20,lo:0,hi:12,rest:900}],"Other",0,5000],"out-of-range numbers clamped, unknown fields and nameless exercises dropped");}

export {run};
