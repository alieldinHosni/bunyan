import {FORMULA_V, fromV1, retarget, v1TargetsOf, v2TargetsOf} from "../retarget.js";

var MAN={age:30,height:180,weight:80,sex:"m",activity:1.4,goal:"lose"};
var WOMAN={age:25,height:165,weight:60,sex:"f",activity:1.55,goal:"gain"};
function blob(profile,goals,body,extra){
  return Object.assign({profile:profile,goals:Object.assign({water:2750,steps:10000},goals),body:body||[]},extra||{});}

function run(t){
  /* ---- what version 1 gave, so its targets can be recognised ---- */
  t.eq(v1TargetsOf(MAN,[],null),{kcal:1990,p:160,f:62,c:198},"version 1, losing fat at 80 kg: a fifth under, 2.0 g/kg");
  t.eq(v1TargetsOf(WOMAN,[],null),{kcal:2290,p:108,f:71,c:305},"version 1, building muscle: a tenth over");
  t.eq(v1TargetsOf({age:30,height:180,sex:"m",goal:"lose"},[],null),null,"version 1 without a weight: nothing either");
  t.ok(fromV1({kcal:1990,p:160,f:62,c:198},MAN,[]),"version 1's own targets are recognised");
  t.ok(fromV1({kcal:2020,p:164,f:63,c:199},MAN,[{date:"2026-09-01",weight:82},{date:"2026-10-01",weight:80}]),
    "… and ones it made at an earlier weigh-in (82 kg)");
  t.ok(!fromV1({kcal:2222,p:160,f:62,c:198},MAN,[]),"typed targets are not");
  t.ok(!fromV1({kcal:1990,p:160,f:62,c:230},MAN,[]),"carbs moved by hand are not");
  t.ok(!fromV1({kcal:1950,p:175,c:170,f:62},MAN,[]),"the new-profile defaults are not");

  /* ---- carried forward ---- */
  var a=blob(MAN,{kcal:1990,p:160,f:62,c:198});
  var r=retarget(a);
  t.eq([r.changed,a.goals.kcal,a.goals.p,a.goals.f,a.goals.c],[true,1990,192,62,166],
    "losing fat: rebuilt on the textbook's values (500 under, 2.4 g/kg)");
  t.eq([a.goals.water,a.goals.steps],[2750,10000],"water and steps did not change formula and are left");
  t.eq(r.before,{water:2750,steps:10000,kcal:1990,p:160,f:62,c:198},"the old targets are kept for Undo");
  t.eq(a.formulaV,FORMULA_V,"marked as done");
  t.eq(retarget(a),null,"and done once");
  var b=blob(WOMAN,{kcal:2290,p:108,f:71,c:305});
  retarget(b);
  t.eq([b.goals.kcal,b.goals.p,b.goals.f,b.goals.c],[2440,108,76,331],"building muscle: 350 over");
  var c=blob(MAN,{kcal:2020,p:164,f:63,c:199},[{date:"2026-09-01",weight:82},{date:"2026-10-01",weight:80}]);
  retarget(c);
  t.eq([c.goals.kcal,c.goals.p],[1990,192],"made at an older weigh-in: rebuilt at today's");

  /* ---- left as they are ---- */
  var d=blob(MAN,{kcal:2222,p:150,f:70,c:240});
  r=retarget(d);
  t.eq([r.changed,d.goals.kcal,d.goals.p,d.formulaV],[false,2222,150,FORMULA_V],"targets the person chose are kept");
  var e=blob({age:30,height:180,sex:"m",activity:1.4,goal:"lose"},{kcal:1990,p:160,f:62,c:198});
  r=retarget(e);
  t.eq([r.changed,e.goals.p],[false,160],"no weight now: nothing to rebuild on, left as they are");
  var m=Object.assign({},MAN,{goal:"maintain"}),mt=v1TargetsOf(m,[],null),f=blob(m,mt);
  r=retarget(f);
  t.eq([r.changed,f.goals.kcal],[false,mt.kcal],"a goal whose numbers did not change: left as it is");
  t.eq(retarget(blob(MAN,{kcal:1990,p:160,f:62,c:198},[],{formulaV:3})),null,"a profile already on version 3: nothing due");
  /* Version 2 to 3: only recomposition's protein moved. */
  var rc=Object.assign({},MAN,{goal:"recomp"}),r2=v2TargetsOf(rc,[],null),b2=blob(rc,r2,[],{formulaV:2}),rr=retarget(b2);
  t.eq([rr.changed,b2.goals.p,b2.formulaV],[true,192,FORMULA_V],"recomposition's 2.2 g/kg targets are rebuilt at 2.4");
  var lz=retarget(blob(MAN,{kcal:1990,p:160,f:62,c:198},[],{formulaV:2}));
  t.eq(lz&&lz.changed,false,"a version 2 profile on another goal keeps its targets");
  t.eq(retarget(null),null,"nothing: nothing");
  t.clean(a,"no NaN or undefined");
}

export {run};
