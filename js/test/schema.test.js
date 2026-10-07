import {checkBackup, DEF, migrateDB, normalize, VERSION} from "../schema.js";

/* What a migration is handed: a template list and an id maker that counts, so ids
   are predictable. */
var TPL={fb:{id:"fb",name:"Full Body",days:[{id:"t1",name:"A",ex:[{id:"x",name:"Barbell Squat",sets:3,lo:5,hi:8}]}]},
  ppl:{id:"ppl",name:"Push Pull Legs",days:[{id:"t2",name:"Push",ex:[]}]}};
function env(){var n=0;return {uid:function(){return "id"+(++n);},template:function(id){return TPL[id]||null;}};}
function copy(o){return JSON.parse(JSON.stringify(o));}
function day(id,name,ex){return {id:id,name:name,ex:ex||[]};}

function run(t){
  t.eq(VERSION,3,"the current version");
  t.eq(DEF.v,VERSION,"a new profile starts at it");

  /* ---- v1: one list of splits and the current one ---- */
  var v1={splits:[{id:"ppl",name:"Push Pull Legs",days:[day("d1","Push")]},
    {id:"mine",name:"Mine",custom:true,days:[day("d2","Arms")]}],currentSplit:"ppl",sessions:[]};
  var a=copy(v1),ran=migrateDB(a,env());
  t.eq(ran,[3],"a v1 blob runs step 3");
  t.eq(a.programs.map(function(p){return [p.name,p.from,p.schedule];}),[["Push Pull Legs","ppl","cycle"],["Mine",null,"cycle"]],
    "the current split becomes the first program, a custom one is kept");
  t.eq(a.programs[0].days[0].id,"d1","the active copy keeps its day ids: history is keyed on them");
  t.eq(a.activeProgram,a.programs[0].id,"and is the active one");
  t.eq(["splits","currentSplit","myPlan","userSplits"].filter(function(k){return k in a;}),[],"the old keys are gone");
  t.eq(a.v,3,"and the blob says v3");
  t.eq(a.programs[1].custom,undefined,"old flags dropped from programs");

  /* ---- v2: an active copy beside the splits saved from it ---- */
  var v2={v:2,myPlan:{name:"My PPL",source:"u1",days:[day("d9","Push day")]},
    userSplits:[{id:"u1",name:"PPL",days:[day("old","Old push")]},{id:"u2",name:"Upper Lower",schedule:"week",days:[day("d5","Upper")]}]};
  var b=copy(v2);migrateDB(b,env());
  t.eq(b.programs.map(function(p){return p.name;}),["My PPL","Upper Lower"],"the saved split it was a copy of is merged into it");
  t.eq(b.programs[0].days[0].id,"d9","with the active copy's days");
  t.eq([b.programs[1].schedule,b.activeProgram],["week","u1"],"a weekday schedule is kept; the merged one is active");
  var b2=copy({v:2,myPlan:{name:"From template",source:"ppl",days:[day("d7","Push")]}});migrateDB(b2,env());
  t.eq([b2.programs.length,b2.programs[0].from,b2.programs[0].id],[1,"ppl","id1"],"an active copy of a template becomes a program from it");

  /* ---- v2 that already has programs: tidied, not rebuilt ---- */
  var c={v:2,programs:[{id:"p1",name:"Mine",schedule:"odd",source:"x",days:[{id:"d1",name:"A"}]}],activeProgram:"gone",splits:[1]};
  migrateDB(c,env());
  t.eq([c.programs.length,c.programs[0].schedule,c.programs[0].days[0].ex,c.programs[0].days[0].wd,c.activeProgram,"splits" in c,c.v],
    [1,"cycle",[],[],"p1",false,3],"programs kept, put in shape, a missing active one fixed, old keys gone");

  /* ---- says v3, still has the old fields: they are carried forward anyway ---- */
  var h=copy(v2);h.v=3;migrateDB(h,env());
  t.eq([h.programs.map(function(p){return p.name;}),"myPlan" in h,"userSplits" in h],[["My PPL","Upper Lower"],false,false],
    "the old fields decide, not a version number older versions did not keep");

  /* ---- current: nothing to run ---- */
  var d=copy(c);t.eq(migrateDB(d,env()),[],"a v3 blob runs nothing");
  t.eq(d,c,"and is unchanged");
  var e=copy(v1);migrateDB(e,env());var e2=copy(e);migrateDB(e2,env());
  t.eq(e2,e,"running it twice is the same as once");

  /* ---- nothing at all ---- */
  var f={};migrateDB(f,env());
  t.eq([f.programs.length,f.programs[0].from,f.programs[0].name,f.activeProgram,f.v],[1,"fb","Full Body","id1",3],
    "no programs anywhere: the full-body template, as your own copy");
  t.eq(f.programs[0].days[0].ex[0].id,"id3","with fresh ids throughout");
  var g={v:99,programs:[]};t.eq(migrateDB(g,env()),[],"a newer blob is left alone");
  t.eq(g.v,99,"and keeps its version");

  /* ---- normalize ---- */
  var n=normalize({goals:"x",sessions:{},body:[{date:"2026-01-01",weight:80},null,{weight:1}],incr:{A:2.5,B:-1,C:"x"},
    block:{start:"nope"},energy:{kcal:99999},chat:"hi",active:{entries:[{name:"Squat"}]}});
  t.eq([n.goals.kcal,n.sessions,n.body.length,n.incr,n.block,n.energy,n.chat],[1950,[],1,{A:2.5},undefined,undefined,undefined],
    "wrong types replaced by defaults, junk dropped");
  t.eq(n.active.entries[0].sets,[],"a live workout's entries get their lists");
  t.eq("v" in normalize({}),false,"no version is invented: migrateDB has to see it was missing");
  t.ok(normalize({block:{start:"2026-10-05"}}).block.start==="2026-10-05","a real block start is kept");
  t.clean(normalize(null),"nothing at all: every section, no NaN or undefined");

  /* ---- a backup: one of ours? ---- */
  t.eq(checkBackup(null).why,"notours","nothing");
  t.eq(checkBackup([1,2]).why,"notours","a list");
  t.eq(checkBackup({name:"Someone",items:[1]}).why,"notours","someone else's JSON");
  t.eq(checkBackup({v:7,sessions:[]}).why,"newer","from a newer version of the app");
  t.eq(checkBackup({prefs:{},sessions:{a:1}}).why,"damaged","ours, with a history that is not a list");
  t.eq(checkBackup({sessions:{a:1}}).why,"notours","nothing marks it as ours");
  t.eq(checkBackup({profile:"x",prefs:{}}).why,"damaged","a profile that is not one");
  var ok=checkBackup({v:3,profile:{},sessions:[{date:"2026-10-01",entries:[]},{date:"2026-10-02",entries:[]},{date:5}],days:{"2026-10-01":{},"2026-10-02":{}}});
  t.eq([ok.ok,ok.sessions,ok.dropped,ok.days],[true,2,1,2],"ours: what it holds, and a damaged workout counted to be left out");
  t.eq(checkBackup({splits:[{id:"ppl"}],currentSplit:"ppl"}).ok,true,"a v1 backup is still ours: it is migrated on restore");
}

export {run};
