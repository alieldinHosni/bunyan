/* Bunyan — coach: volume landmarks
   The one place the app's volume ranges live. Nothing here is measured on the user.

   Per muscle, hard sets a week:
     mev  minimum effective volume: below it, a muscle is mostly maintained;
     mav  the range most people grow best in;
     mrv  maximum recoverable volume: above it, most people stop recovering.
   Source: Renaissance Periodization's published hypertrophy guidelines (Israetel and
   colleagues), rounded. These are practitioner heuristics, not physiology, with wide
   differences between people; anything that shows them has to say so. A set counts in
   full for its main muscle and half for the muscles it also works, which is how the
   app counts everywhere.

   Per experience level, the range a plan is built and checked against (the generator
   in js/engine/plan.js and the plan check use these): narrower and lower for a
   beginner, who grows from less, wider and higher for someone years in. */

var LANDMARKS={
  Chest:     {mev:6, mav:[12,20],mrv:22},
  Back:      {mev:10,mav:[14,22],mrv:25},
  Shoulders: {mev:8, mav:[16,22],mrv:26},
  Quads:     {mev:8, mav:[12,18],mrv:20},
  Hamstrings:{mev:4, mav:[10,16],mrv:20},
  Glutes:    {mev:0, mav:[4,12], mrv:16},
  Biceps:    {mev:8, mav:[14,20],mrv:26},
  Triceps:   {mev:6, mav:[10,14],mrv:18},
  Calves:    {mev:8, mav:[12,16],mrv:20},
  Core:      {mev:0, mav:[16,20],mrv:25}
};

var RANGE={new:[8,12],some:[10,16],experienced:[12,20],advanced:[14,22]};

export {LANDMARKS, RANGE};
