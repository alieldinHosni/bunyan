/* Bunyan — goals
   One list of what someone can be training for, read by everything that depends on
   it: the calorie and protein targets, the training plan and the split it is built
   on, the warm-up and cool-down, and the plan check. Before this there were two
   lists — the plan builder's four and the nutrition screen's four — and they did not
   agree: "Recomposition" built a fat-loss training plan, "Get stronger" got
   maintenance calories with no reason given.

   Each goal says, and only says, what it changes:
     kcal     which way the goal leans against maintenance (under 0 a deficit, over 0
              a surplus) and how far, as a share of it, capped (cap, kcal); the plan
              check reads it to know what the goal needs
     fixed    a set change a day in kcal, which replaces the share: the textbook's
              500 under for fat loss and 350 over for muscle (FORMULA-RECONCILIATION
              rows 2 and 3, adopted 20 Oct 2026)
     protein  g per kg of body weight (lean-adjusted above a BMI of 30 elsewhere)
     fat      share of energy from fat; carbs take the rest
     train    the training style in TRAIN below
     split    how much each split suits it (added to the days and level scores)
     steps    a daily step target, where the goal leans on daily movement
   Where the textbook gives a figure, it is the one used (docs/FORMULA-RECONCILIATION.md):
   500 kcal under maintenance for fat loss, 350 over for muscle (the low end of its
   350–500, since most of a larger surplus is stored as fat), 2.4 g/kg protein in a
   deficit (fat loss, and recomposition, which runs one: 26 Oct), and its rep ranges
   for strength and endurance. Where it gives none
   (recomposition, getting stronger), a share of maintenance, capped. They are starting
   points the plan check and the weekly review adjust from, and every one of them can
   be overridden. */

var GOALS={
  lose:     {label:"Lose fat",                 desc:"Lose fat and keep the muscle you have.",
             kcal:-0.20,fixed:-500,protein:2.4,fat:0.28,train:"hyp",steps:10000,
             split:{fb:5,ul:4,ap:3,ppl:1,bro:-4,arnold:-4,bw:3}},
  recomp:   {label:"Lose fat, build muscle",   desc:"Leaner and more muscular at once: slower, but both.",
             kcal:-0.10,cap:400,protein:2.4,fat:0.28,train:"hyp",steps:9000,
             split:{fb:3,ul:4,ap:4,ppl:2,bro:-2,arnold:-2,bw:1}},
  gain:     {label:"Build muscle",             desc:"Add size, with as little fat as possible.",
             kcal:0.10,fixed:350,protein:1.8,fat:0.28,train:"hyp",
             split:{fb:-2,ul:1,ap:2,ppl:5,bro:4,arnold:4,bw:-2}},
  strength: {label:"Get stronger",             desc:"Lift more on the big lifts.",
             kcal:0.05,cap:200,protein:1.8,fat:0.28,train:"str",
             split:{fb:3,ul:5,ap:3,ppl:0,bro:-4,arnold:-4,bw:-3}},
  athletic: {label:"Power and athleticism",    desc:"Jump higher, sprint faster, move better in sport.",
             kcal:0,protein:1.8,fat:0.25,train:"pow",
             split:{fb:4,ul:5,ap:3,ppl:0,bro:-5,arnold:-5,bw:1}},
  endurance:{label:"Endurance and fitness",    desc:"More engine: last longer, recover faster.",
             kcal:0,protein:1.6,fat:0.25,train:"end",steps:10000,
             split:{fb:5,ul:3,ap:2,ppl:-1,bro:-5,arnold:-5,bw:4}},
  mobility: {label:"Mobility and flexibility", desc:"Move freely, with less stiffness and fewer niggles.",
             kcal:0,protein:1.6,fat:0.28,train:"mob",
             split:{fb:5,ul:3,ap:3,ppl:-1,bro:-5,arnold:-5,bw:5}},
  maintain: {label:"Stay fit and healthy",     desc:"Keep what you have and feel good doing it.",
             kcal:0,protein:1.8,fat:0.28,train:"gen",
             split:{fb:2,ul:3,ap:3,ppl:1,bro:0,arnold:0,bw:2}}
};
var GOAL_ORDER=["lose","recomp","gain","strength","athletic","endurance","mobility","maintain"];

/* How a training style sets the work. Reps are the main lift's and the accessories';
   rir is reps in reserve (how many more could have been done), on the main lift
   and the rest; rest is a multiplier on the level's rest. add names what a day gets
   on top: plyometrics first, conditioning or a mobility block last. sets moves the
   accessories' set count. Strength's main lift (1–5) and endurance (12–20) are the
   textbook's ranges by adaptation (Table 20-3; js/knowledge/acute-variables.js
   BY_ADAPTATION), adopted 20 Oct 2026. */
var TRAIN={
  hyp:{main:[6,10],acc:[8,12],rir:[2,1],rest:1,  sets:0, add:null},
  str:{main:[1,5], acc:[6,10],rir:[2,2],rest:1.3,sets:0, add:null},
  pow:{main:[3,5], acc:[6,10],rir:[3,2],rest:1.3,sets:0, add:"plyo"},
  end:{main:[12,20],acc:[12,20],rir:[2,1],rest:0.6,sets:0, add:"cond"},
  mob:{main:[8,12],acc:[10,15],rir:[3,2],rest:0.8,sets:-1,add:"mob"},
  gen:{main:[8,12],acc:[10,15],rir:[2,2],rest:0.9,sets:0, add:null}
};

function goalOf(k){return GOALS[k]||GOALS.maintain;}
function trainOf(k){return TRAIN[goalOf(k).train]||TRAIN.hyp;}

export {GOAL_ORDER, GOALS, goalOf, TRAIN, trainOf};
