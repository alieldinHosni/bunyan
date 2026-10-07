import {movementLabel, movementOf, MOVES} from "../movement.js";

/* lib: the whole library, {name: {m, p}}, read from exercises.json by the runner and
   merged with the app's own additions (js/data/extra.js). */
function run(t,lib){
  /* ---- what the library's own field gets wrong ---- */
  t.eq(movementOf("3/4 Sit-Up","Core","Pull"),"core","a sit-up is core, not a pull");
  t.eq(movementOf("Lying Leg Curls","Hamstrings","Elbow flexion"),"kneeflex","a leg curl bends the knee, not the elbow");
  t.eq(movementOf("Exercise Ball Pull-In","Core","Pull"),"core","a pull-in is core");

  /* ---- one word, three meanings: the muscle decides ---- */
  t.eq([movementOf("Leg Extensions","Quads"),movementOf("Cable Lying Triceps Extension","Triceps"),
        movementOf("Hyperextensions (Back Extensions)","Back")],["kneeext","ext","hinge"],
    "an extension: of the knee, of the elbow, of the back");
  t.eq([movementOf("Barbell Curl","Biceps"),movementOf("Seated Leg Curl","Hamstrings"),movementOf("Cable Wrist Curl","Forearms")],
    ["curl","kneeflex","grip"],"a curl: biceps, hamstrings, forearms");
  t.eq([movementOf("Standing Calf Raises","Calves"),movementOf("Hanging Leg Raise","Core"),movementOf("Side Lateral Raise","Shoulders"),
        movementOf("Dumbbell Lying Rear Lateral Raise","Shoulders")],["calf","core","raise","hpull"],
    "a raise: calves, core, side delts — and rear delts with the pulls");
  t.eq([movementOf("Glute Kickback","Glutes"),movementOf("Tricep Dumbbell Kickback","Triceps")],["thrust","ext"],"a kickback: hips or triceps");

  /* ---- the big patterns ---- */
  t.eq([movementOf("Barbell Squat","Quads"),movementOf("Leg Press","Quads"),movementOf("Goblet Squat","Quads")],["squat","squat","squat"],"squats and the leg press");
  t.eq([movementOf("Bulgarian Split Squat","Quads"),movementOf("Dumbbell Lunges","Quads"),movementOf("Dumbbell Step Ups","Quads")],["lunge","lunge","lunge"],"single-leg work");
  t.eq([movementOf("Romanian Deadlift","Hamstrings"),movementOf("Barbell Deadlift","Back"),movementOf("Kettlebell Swing","Hamstrings"),movementOf("Good Morning","Hamstrings")],
    ["hinge","hinge","hinge","hinge"],"hinges");
  t.eq([movementOf("Barbell Hip Thrust","Glutes"),movementOf("Barbell Glute Bridge","Glutes")],["thrust","thrust"],"hip thrusts and bridges");
  t.eq([movementOf("Barbell Bench Press - Medium Grip","Chest"),movementOf("Pushups","Chest"),movementOf("Dips - Chest Version","Chest"),movementOf("Close-Grip Barbell Bench Press","Triceps")],
    ["hpush","hpush","hpush","hpush"],"horizontal pushes, on the chest or the triceps");
  t.eq([movementOf("Standing Military Press","Shoulders"),movementOf("Seated Dumbbell Press","Shoulders"),movementOf("Push Press","Shoulders"),movementOf("Handstand Push-Ups","Shoulders")],
    ["vpush","vpush","vpush","vpush"],"vertical pushes");
  t.eq([movementOf("Bent Over Barbell Row","Back"),movementOf("Seated Cable Rows","Back"),movementOf("Face Pull","Shoulders"),movementOf("Inverted Row","Back")],
    ["hpull","hpull","hpull","hpull"],"horizontal pulls");
  t.eq([movementOf("Pullups","Back"),movementOf("Wide-Grip Lat Pulldown","Back"),movementOf("Chin-Up","Back")],["vpull","vpull","vpull"],"vertical pulls");
  t.eq([movementOf("Upright Barbell Row","Shoulders"),movementOf("Barbell Shrug","Back")],["raise","shrug"],"an upright row is a raise; a shrug is a shrug");
  t.eq([movementOf("Farmer's Walk","Forearms"),movementOf("Power Clean","Hamstrings"),movementOf("Box Jump (Multiple Response)","Hamstrings")],
    ["carry","power","jump"],"carries, explosive lifts, jumps");
  t.eq([movementOf("Running","Cardio"),movementOf("Walking","Cardio"),movementOf("Hamstring Stretch","Hamstrings","Mobility")],["cardio","cardio","mobility"],
    "cardio and sport, and mobility");
  t.eq(movementOf("Clean Deadlift","Hamstrings"),"hinge","a clean deadlift is a hinge, not the clean");
  t.eq(movementOf("Front Squat (Clean Grip)","Quads"),"squat","a front squat with a clean grip is a squat");

  /* ---- unknown names ---- */
  t.eq(movementOf("My Own Thing","Chest"),"fly","an unknown chest exercise: from the muscle");
  t.eq(movementOf("My Own Thing","Other"),"","nothing to go on: no pattern, rather than a wrong one");
  t.eq([movementLabel("hinge"),movementLabel("nope")],["Hinge",""],"labels");

  /* ---- the whole library ---- */
  var names=Object.keys(lib||{}),none=[],unknown=[];
  names.forEach(function(n){
    var v=lib[n],m=movementOf(n,v.m,v.p);
    if(!m)none.push(n);else if(!MOVES[m])unknown.push(n+": "+m);});
  t.ok(names.length>800,"the library is loaded: "+names.length+" exercises");
  t.eq(none,[],"every exercise in the library has a movement pattern");
  t.eq(unknown,[],"and every pattern is one of the known ones");
}

export {run};
