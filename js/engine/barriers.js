/* Bunyan — what got in the way, and what helps
   Owner, 2 Nov ("all, in order"), item 6: when workouts are missed, the weekly check-in
   asks what got in the way, names the barrier and gives that barrier's strategy instead
   of a generic nudge.

   The barriers and their strategies are the knowledge base's (js/knowledge/adherence.js
   BARRIERS, BARRIER_RULES), paraphrased for the screen; the action is the part of the
   app that carries the strategy out (fit the week to the time there is, train at home,
   share the plan with someone). "Ill or injured" is the book's physical barrier; its
   line says only to rest and to get anything that hurts seen, nothing more.

   ASK: [id, what the person taps]. HELP[id] → {text, act, step|null}: the strategy, and
   the button: "setup" opens the assessment at a step, "share" opens plan sharing. */
var ASK=[["time","Not enough time"],["convenience","The gym was hard to get to"],["unrealistic_goals","The goal feels out of reach"],
  ["social_physique_anxiety","Self-conscious training in front of others"],["ambivalence","I wasn't sure it was worth it"],
  ["no_social_support","No one to train with"],["ill","Ill or injured"]];

var HELP={
  time:{text:"Build the week on the time you really have: put training first, early in the morning or straight after work, around what cannot move. Fewer, shorter sessions you keep beat a plan you miss.",
    act:"setup",step:"week",btn:"Fit the week to my time"},
  convenience:{text:"Train where it is easy: at home, at lunch, or between other things. A plan for what you have at home counts as much as one for the gym.",
    act:"setup",step:"gear",btn:"Plan for home"},
  unrealistic_goals:{text:"A goal you cannot reach in time ends in quitting. Set one you can, and goals for what you do each week, not only for the result.",
    act:"setup",step:"goal",btn:"Review my goal"},
  social_physique_anxiety:{text:"Train somewhere you feel comfortable: at home, outside, or a quieter corner or time at the gym, in clothes you are at ease in.",
    act:"setup",step:"gear",btn:"Plan for home"},
  ambivalence:{text:"Weigh it honestly: what training gives back (energy, sleep, mood, health) against what it costs this week. Then name what else is in the way.",
    act:null},
  no_social_support:{text:"Someone on your side helps: a training partner, or a friend who knows your plan and asks how it went.",
    act:"share",btn:"Share my plan"},
  ill:{text:"Rest until you are well; the plan picks up after. If something hurts, get it seen by a professional.",
    act:null}};

export {ASK as BARRIERS_ASK, HELP as BARRIER_HELP};
