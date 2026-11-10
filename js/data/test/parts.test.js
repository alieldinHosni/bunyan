import {focusMuscles, focusParts, partOf, works} from "../parts.js";
import {dayGoals, goalsOf, proteinOf} from "../goals.js";

/* The parts of a muscle, read from what the movement is (js/data/parts.js), and more
   than one goal: the main one first, the others on days of their own (js/data/goals.js). */
function run(t){
  t.eq([partOf("Side Lateral Raise","Shoulders"),partOf("Reverse Flyes","Shoulders"),partOf("Face Pull","Shoulders"),
        partOf("Standing Military Press","Shoulders"),partOf("Seated Dumbbell Press","Shoulders")],
    ["Shoulders.side","Shoulders.rear","Shoulders.rear","Shoulders.front","Shoulders.front"],"the three heads of the shoulder");
  t.eq([partOf("Incline Dumbbell Press","Chest"),partOf("Decline Barbell Bench Press","Chest"),partOf("Barbell Bench Press - Medium Grip","Chest")],
    ["Chest.upper","Chest.lower","Chest.mid"],"incline is upper chest before it is a bench press");
  t.eq([partOf("Wide-Grip Lat Pulldown","Back"),partOf("Bent Over Barbell Row","Back"),partOf("Hyperextensions (Back Extensions)","Back")],
    ["Back.lats","Back.upper","Back.lower"],"width, thickness, lower back");
  t.eq([partOf("Hammer Curls","Biceps"),partOf("Barbell Curl","Biceps"),partOf("Triceps Pushdown","Triceps"),partOf("Standing Dumbbell Triceps Extension","Triceps")],
    ["Biceps.brach","Biceps.biceps","Triceps.outer",null],"arms; an exercise the patterns do not name is no part");
  t.eq([partOf("Leg Extensions","Quads"),partOf("Weighted Sissy Squat","Quads"),partOf("Barbell Squat","Quads"),partOf("Leg Press","Quads")],
    ["Quads.rf","Quads.rf","Quads.vasti","Quads.vasti"],"the quads: an extension and a sissy squat for the rectus femoris, squats and presses for the vasti");
  t.eq([partOf("Romanian Deadlift","Hamstrings"),partOf("Kettlebell One-Legged Deadlift","Hamstrings"),partOf("Lying Leg Curls","Hamstrings"),partOf("Glute Ham Raise","Hamstrings")],
    ["Hamstrings.hinge","Hamstrings.hinge","Hamstrings.curl","Hamstrings.curl"],"the hamstrings at the hip and at the knee");
  t.eq([partOf("Smith Machine Reverse Calf Raises","Calves"),partOf("Seated Calf Raise","Calves"),partOf("Standing Calf Raises","Calves")],
    ["Calves.tib","Calves.seated","Calves.standing"],"the front of the shin before any calf raise");
  t.eq([partOf("Palms-Down Wrist Curl Over A Bench","Forearms"),partOf("Palms-Up Barbell Wrist Curl Over A Bench","Forearms"),partOf("Plate Pinch","Forearms")],
    ["Forearms.ext","Forearms.flex","Forearms.grip"],"the forearms: extensors, flexors, grip");
  t.eq([partOf("Low Cable Crossover","Chest"),partOf("Cable Crossover","Chest"),partOf("Side Bridge","Core")],["Chest.upper","Chest.lower","Core.obl"],"low-to-high is upper chest, high-to-low lower; a side bridge is the obliques");
  t.ok(works("Reverse Flyes","Shoulders.rear")&&!works("Incline Cable Flye","Chest.mid"),"works: the first part that matches, whichever muscle the library says");
  t.eq([focusMuscles(["Shoulders.side","Shoulders.rear","Chest"]),focusParts(["Shoulders.side","Chest"])],[["Shoulders","Chest"],["Shoulders.side"]],"a part counts for its muscle");

  t.eq(goalsOf({goal:"gain",goals2:["strength","lose","gain","endurance","mobility"]}),["gain","strength","endurance"],
    "the main goal, then at most two more; a goal about calories is a main goal only");
  t.eq(dayGoals({goal:"gain",goals2:["strength"]},3),["gain","strength","gain"],"three days, one more goal: the main one either side");
  t.eq(dayGoals({goal:"lose",goals2:["strength","endurance"]},4),["lose","strength","lose","endurance"],"four days, two more: each its own day");
  t.eq(dayGoals({goal:"gain",goals2:["strength","athletic"]},3),["gain","strength","athletic"],"as many days as goals: one each");
  t.eq(dayGoals({goal:"gain"},3),["gain","gain","gain"],"one goal: every day");
  t.eq([proteinOf({goal:"endurance",goals2:["gain"]}),proteinOf({goal:"lose",goals2:["strength"]})],[1.8,2.4],"protein: the most any goal asks for");}

export {run};
