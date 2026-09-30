/* Bunyan — splits
   Built-in split presets and the helpers that build them. */
import {isCompound, muscleOf} from "./exercises.js";
import {uid} from "../util.js";

/* ============================================================ split presets */
function ex(n,s,lo,hi,rest){
  return {id:uid(),name:n,muscle:muscleOf(n),sets:s,lo:lo,hi:hi,
          rest:rest||(isCompound(n)?120:75)};
}
function day(name,list){return {id:uid(),name:name,ex:list};}
function rest(name){return {id:uid(),name:name||"Rest",ex:[]};}

function PRESETS(){return [
{id:"ap",name:"Anterior / Posterior",tag:"3 days · built for you",days:[
  day("Day A — Anterior",[ex("Barbell Incline Bench Press - Medium Grip",3,6,8),ex("Machine Shoulder (Military) Press",3,8,10),
    ex("Hack Squat",3,8,10),ex("Butterfly",2,10,12),ex("Side Lateral Raise",3,12,15),
    ex("Triceps Pushdown - Rope Attachment",2,10,12),ex("Weighted Sissy Squat",2,10,15,60)]),
  day("Day B — Posterior",[ex("Romanian Deadlift",3,8,10),ex("V-Bar Pulldown",3,8,10),
    ex("Lying T-Bar Row",3,8,10),ex("Seated Leg Curl",3,10,12),ex("Reverse Flyes",3,12,15),
    ex("Standing Biceps Cable Curl",2,10,12),ex("Butt Lift (Bridge)",3,12,15,60)]),
  day("Day C — Full Body",[ex("Machine Bench Press",3,8,10),ex("Pullups",3,6,12),
    ex("Split Squat with Dumbbells",3,10,12),ex("Standing Calf Raises",3,12,15),ex("Plank",3,40,40,45)]),
  rest()]},

{id:"arnold",name:"Arnold Split",tag:"6 days · advanced",days:[
  day("Chest & Back",[ex("Barbell Incline Bench Press - Medium Grip",4,8,10),ex("Pullups",4,6,10),
    ex("Dumbbell Bench Press",3,8,12),ex("Bent Over Barbell Row",3,8,10),ex("Reverse Flyes",3,12,15),
    ex("Straight-Arm Pulldown",3,12,15)]),
  day("Shoulders & Arms",[ex("Standing Military Press",4,6,8),ex("Side Lateral Raise",4,12,15),
    ex("Reverse Flyes",3,12,15),ex("EZ-Bar Curl",3,8,10),ex("Lying Triceps Press",3,10,12),
    ex("Hammer Curls",3,10,12),ex("Triceps Pushdown - Rope Attachment",3,12,15)]),
  day("Legs",[ex("Barbell Squat",4,6,10),ex("Romanian Deadlift",3,8,10),ex("Leg Press",3,10,12),
    ex("Lying Leg Curls",3,10,12),ex("Standing Calf Raises",4,15,20)]),
  day("Chest & Back",[ex("Machine Bench Press",4,8,12),ex("Wide-Grip Lat Pulldown",4,8,12),
    ex("Incline Dumbbell Press",3,10,12),ex("Seated Cable Rows",3,10,12),ex("Butterfly",3,12,15)]),
  day("Shoulders & Arms",[ex("Seated Dumbbell Press",4,8,10),ex("Cable Seated Lateral Raise",4,12,15),
    ex("Face Pull",3,12,15),ex("Preacher Curl",3,10,12),ex("Cable Rope Overhead Triceps Extension",3,10,12),
    ex("Standing Biceps Cable Curl",3,12,15)]),
  day("Legs",[ex("Hack Squat",4,8,12),ex("Split Squat with Dumbbells",3,10,12),
    ex("Seated Leg Curl",3,12,15),ex("Leg Extensions",3,12,15),ex("Seated Calf Raise",4,15,20)]),
  rest()]},

{id:"ppl",name:"Push / Pull / Legs",tag:"6 days · intermediate",days:[
  day("Push",[ex("Barbell Bench Press - Medium Grip",4,6,8),ex("Machine Shoulder (Military) Press",3,8,10),
    ex("Incline Dumbbell Press",3,10,12),ex("Side Lateral Raise",3,12,15),
    ex("Triceps Pushdown - Rope Attachment",3,10,12),ex("Cable Rope Overhead Triceps Extension",2,12,15)]),
  day("Pull",[ex("Barbell Deadlift",3,5,6),ex("Pullups",4,6,10),ex("Seated Cable Rows",3,10,12),
    ex("Face Pull",3,12,15),ex("EZ-Bar Curl",3,8,10),ex("Hammer Curls",3,10,12)]),
  day("Legs",[ex("Barbell Squat",4,6,8),ex("Romanian Deadlift",3,8,10),ex("Leg Press",3,10,12),
    ex("Seated Leg Curl",3,10,12),ex("Calf Press On The Leg Press Machine",4,15,20),ex("Hanging Leg Raise",3,12,15)]),
  day("Push",[ex("Barbell Incline Bench Press - Medium Grip",4,8,10),ex("Seated Dumbbell Press",3,8,12),
    ex("Reverse Flyes",3,12,15),ex("Cable Seated Lateral Raise",3,12,15),ex("Close-Grip Barbell Bench Press",3,8,10),
    ex("Bench Dips",2,12,15)]),
  day("Pull",[ex("Bent Over Barbell Row",4,8,10),ex("Wide-Grip Lat Pulldown",3,10,12),ex("Seated Cable Rows",3,10,12),
    ex("Reverse Flyes",3,12,15),ex("Preacher Curl",3,10,12),ex("Standing Biceps Cable Curl",3,12,15)]),
  day("Legs",[ex("Hack Squat",4,8,12),ex("Barbell Walking Lunge",3,10,12),ex("Leg Extensions",3,12,15),
    ex("Lying Leg Curls",3,12,15),ex("Standing Calf Raises",4,15,20)]),
  rest()]},

{id:"ul",name:"Upper / Lower",tag:"4 days · beginner friendly",days:[
  day("Upper A",[ex("Barbell Bench Press - Medium Grip",4,6,8),ex("Bent Over Barbell Row",4,6,8),
    ex("Machine Shoulder (Military) Press",3,8,10),ex("Wide-Grip Lat Pulldown",3,10,12),
    ex("Side Lateral Raise",3,12,15),ex("EZ-Bar Curl",3,10,12),ex("Triceps Pushdown - Rope Attachment",3,10,12)]),
  day("Lower A",[ex("Barbell Squat",4,6,8),ex("Romanian Deadlift",3,8,10),ex("Leg Press",3,10,12),
    ex("Seated Leg Curl",3,10,12),ex("Calf Press On The Leg Press Machine",4,15,20),ex("Plank",3,45,45,45)]),
  rest(),
  day("Upper B",[ex("Incline Dumbbell Press",4,8,10),ex("Pullups",4,6,10),
    ex("Seated Cable Rows",3,10,12),ex("Reverse Flyes",3,12,15),ex("Face Pull",3,12,15),
    ex("Hammer Curls",3,10,12),ex("Cable Rope Overhead Triceps Extension",3,10,12)]),
  day("Lower B",[ex("Hack Squat",4,8,12),ex("Barbell Hip Thrust",3,8,12),ex("Split Squat with Dumbbells",3,10,12),
    ex("Leg Extensions",3,12,15),ex("Seated Calf Raise",4,15,20),ex("Hanging Leg Raise",3,12,15)]),
  rest(),rest()]},

{id:"fb",name:"Full Body",tag:"3 days · best for beginners",level:"new",goal:"gain",days:[
  day("Full Body A",[ex("Barbell Bench Press - Medium Grip",3,6,10),ex("Wide-Grip Lat Pulldown",3,8,12),
    ex("Leg Press",3,10,12),ex("Machine Shoulder (Military) Press",2,8,12),ex("Standing Biceps Cable Curl",2,10,12),
    ex("Plank",3,40,40,45)]),
  rest(),
  day("Full Body B",[ex("Romanian Deadlift",3,8,10),ex("Incline Dumbbell Press",3,8,12),
    ex("Seated Cable Rows",3,10,12),ex("Leg Extensions",2,12,15),ex("Triceps Pushdown - Rope Attachment",2,10,12),
    ex("Standing Calf Raises",3,15,20)]),
  rest(),
  day("Full Body C",[ex("Hack Squat",3,8,12),ex("Pullups",3,5,10),
    ex("Machine Bench Press",3,8,12),ex("Seated Leg Curl",3,10,12),
    ex("Side Lateral Raise",2,12,15),ex("Hanging Leg Raise",3,12,15)]),
  rest(),rest()]},

{id:"bw",name:"Bodyweight",tag:"4 days · a pull-up bar and the floor",level:"new",goal:"gain",days:[
  day("Push",[ex("Pushups",4,8,20,75),ex("Bent Press",3,6,12,75),
    ex("Incline Push-Up Close-Grip",3,6,15,60),ex("Bench Dips",3,10,20,60),ex("Plank",3,45,45,45)]),
  day("Pull",[ex("Pullups",4,3,10,90),ex("Inverted Row",3,8,15,75),
    ex("Chin-Up",3,3,10,90),ex("Hanging Leg Raise",3,20,40,60),ex("Superman",3,10,10,45)]),
  rest(),
  day("Legs",[ex("Bodyweight Squat",4,15,25,60),ex("Split Squats",3,10,15,75),
    ex("Butt Lift (Bridge)",3,10,15,60),ex("Standing Calf Raises",3,12,20,45),
    ex("Bodyweight Walking Lunge",2,10,15,60)]),
  day("Core & Conditioning",[ex("Butt-Ups",3,20,40,45),ex("Hanging Leg Raise",3,8,15,60),
    ex("Mountain Climbers",3,20,30,45),ex("Freehand Jump Squat",3,8,15,60),ex("Side Bridge",3,30,45,45)]),
  rest(),rest()]},

{id:"bro",name:"Bro Split",tag:"5 days · one muscle a day",days:[
  day("Chest",[ex("Barbell Bench Press - Medium Grip",4,6,8),ex("Incline Dumbbell Press",4,8,10),
    ex("Butterfly",3,10,12),ex("Dips - Chest Version",3,8,12),ex("Pushups",2,15,25,60)]),
  day("Back",[ex("Barbell Deadlift",4,5,7),ex("Pullups",4,6,10),ex("Bent Over Barbell Row",3,8,10),
    ex("Wide-Grip Lat Pulldown",3,10,12),ex("Seated Cable Rows",3,10,12),ex("Dumbbell Shrug",3,12,15)]),
  day("Shoulders",[ex("Standing Military Press",4,6,8),ex("Side Lateral Raise",4,12,15),
    ex("Reverse Flyes",3,12,15),ex("Face Pull",3,12,15),ex("Front Cable Raise",3,12,15)]),
  day("Arms",[ex("Barbell Curl",4,8,10),ex("Close-Grip Barbell Bench Press",4,8,10),
    ex("Preacher Curl",3,10,12),ex("Lying Triceps Press",3,10,12),ex("Hammer Curls",3,12,15),
    ex("Triceps Pushdown - Rope Attachment",3,12,15)]),
  day("Legs",[ex("Barbell Squat",4,6,10),ex("Leg Press",4,10,12),ex("Romanian Deadlift",3,8,10),
    ex("Leg Extensions",3,12,15),ex("Seated Leg Curl",3,12,15),ex("Standing Calf Raises",4,15,20)]),
  rest(),rest()]},

{id:"sl5",name:"Strength 5×5",tag:"3 days · the big lifts, simple",days:[
  day("Workout A",[ex("Barbell Squat",5,5,5,180),ex("Barbell Bench Press - Medium Grip",5,5,5,180),
    ex("Bent Over Barbell Row",5,5,5,150),ex("Plank",3,40,40,45)]),
  rest(),
  day("Workout B",[ex("Barbell Squat",5,5,5,180),ex("Standing Military Press",5,5,5,180),
    ex("Barbell Deadlift",1,5,5,240),ex("Hanging Knee Raise",3,10,15,60)]),
  rest(),rest()]},

{id:"db",name:"Home Dumbbells",tag:"3 days · a pair of dumbbells and a bench",days:[
  day("Full Body A",[ex("Goblet Squat",3,10,12),ex("Dumbbell Bench Press",3,8,12),
    ex("One-Arm Dumbbell Row",3,10,12),ex("Dumbbell Romanian Deadlift",3,10,12),ex("Hammer Curls",2,10,12,60)]),
  rest(),
  day("Full Body B",[ex("Bulgarian Split Squat",3,8,12),ex("Seated Dumbbell Press",3,8,12),
    ex("Chest-Supported Dumbbell Row",3,10,12),ex("Dumbbell Hip Thrust",3,10,15),ex("Tricep Dumbbell Kickback",2,12,15,60)]),
  rest(),
  day("Full Body C",[ex("Dumbbell Reverse Lunge",3,10,12),ex("Incline Dumbbell Press",3,8,12),
    ex("One-Arm Dumbbell Row",3,10,12),ex("Dumbbell Arnold Press",2,10,12),ex("Plank",3,40,40,45)]),
  rest(),rest()]},

{id:"glute",name:"Glutes & Legs Focus",tag:"4 days · lower-body emphasis",days:[
  day("Lower A — Glutes",[ex("Barbell Hip Thrust",4,8,12),ex("Romanian Deadlift",3,8,10),
    ex("Bulgarian Split Squat",3,10,12),ex("Seated Leg Curl",3,10,12),ex("Thigh Abductor",3,15,20,60)]),
  day("Upper A",[ex("Machine Chest Press",3,8,12),ex("Seated Machine Row",3,10,12),
    ex("Cable Lateral Raise",3,12,15,60),ex("Triceps Pushdown - Rope Attachment",2,10,12,60),ex("Standing Biceps Cable Curl",2,10,12,60)]),
  rest(),
  day("Lower B — Legs",[ex("Hack Squat",4,8,12),ex("Hip Thrust Machine",3,10,12),
    ex("Leg Extensions",3,12,15),ex("Dumbbell Walking Lunge",3,10,12),ex("Standing Calf Raises",3,12,15,60)]),
  day("Upper B",[ex("Wide-Grip Lat Pulldown",3,8,12),ex("Incline Dumbbell Press",3,8,12),
    ex("Face Pull",3,12,15,60),ex("Dumbbell Arnold Press",2,10,12),ex("Hammer Curls",2,10,12,60)]),
  rest(),rest()]},

{id:"ppl3",name:"Push / Pull / Legs × 3",tag:"3 days · each muscle once a week",days:[
  day("Push",[ex("Barbell Bench Press - Medium Grip",4,6,10),ex("Seated Dumbbell Press",3,8,12),
    ex("Incline Dumbbell Press",3,8,12),ex("Side Lateral Raise",3,12,15,60),ex("Triceps Pushdown - Rope Attachment",3,10,12,60)]),
  rest(),
  day("Pull",[ex("Pullups",4,6,10),ex("Bent Over Barbell Row",3,8,10),ex("Seated Cable Rows",3,10,12),
    ex("Face Pull",3,12,15,60),ex("Barbell Curl",3,8,12,60)]),
  rest(),
  day("Legs",[ex("Barbell Squat",4,6,10),ex("Romanian Deadlift",3,8,10),ex("Leg Press",3,10,12),
    ex("Seated Leg Curl",3,10,12),ex("Standing Calf Raises",3,12,15,60)]),
  rest(),rest()]},

{id:"foot",name:"Footballer: Strength & Conditioning",tag:"3 days · stronger and faster on the pitch",days:[
  day("Strength",[ex("Trap Bar Deadlift",4,4,6,180),ex("Bulgarian Split Squat",3,6,8),
    ex("Nordic Hamstring Curl",3,4,6),ex("Pallof Press",3,10,12,60),ex("Copenhagen Plank",3,20,30,45)]),
  rest(),
  day("Power & Upper",[ex("Front Box Jump",4,4,5,90),ex("Kettlebell Swing",3,10,12,90),
    ex("Pushups",3,12,20,60),ex("Pullups",3,6,10),ex("Dead Bug",3,10,12,45)]),
  rest(),
  day("Conditioning",[act("Running",20,8),ex("Burpee",4,10,12,60),
    ex("Mountain Climbers",3,30,30,45),ex("World's Greatest Stretch",2,30,30,30)]),
  rest(),rest()]},

{id:"fl",name:"Fat Loss: Lift + Cardio",tag:"4 days · strength twice, cardio twice",days:[
  day("Full Body A",[ex("Goblet Squat",3,10,12),ex("Machine Chest Press",3,10,12),
    ex("Seated Machine Row",3,10,12),ex("Dumbbell Romanian Deadlift",3,10,12),ex("Plank",3,40,40,45)]),
  day("Cardio",[act("Walking, Treadmill",40,6)]),
  rest(),
  day("Full Body B",[ex("Leg Press",3,10,12),ex("Incline Dumbbell Press",3,10,12),
    ex("Wide-Grip Lat Pulldown",3,10,12),ex("Dumbbell Hip Thrust",3,10,15),ex("Cable Woodchopper",3,12,12,45)]),
  day("Cardio",[act("Jogging, Treadmill",25,7)]),
  rest(),rest()]}
];}
/* A planned bout of cardio: how long and how hard, no sets or reps. */
function act(n,min,rpe){return {id:uid(),name:n,muscle:"Cardio",sets:1,lo:0,hi:0,rest:0,min:min,rpe:rpe};}


export {day, ex, PRESETS};
