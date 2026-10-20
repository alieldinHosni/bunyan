/* Bunyan — knowledge: plyometrics
   Plyometric (reactive) training: what it is, the three phases of the stretch-shortening
   cycle, why and for whom, readiness and safety, programme variables (intensity, volume,
   frequency, recovery), the three-level progression and each exercise's key point.
   The stretch-shortening mechanism itself is in anatomy.js; per-phase sets and reps come
   with chapter 21. Leaf data. */

var meta={
  covers:"Plyometric training concepts, guidelines, progressions and exercises",
  derivedFrom:"certification curriculum",
  sections:["18.1","18.2","18.3","SG.18"],
  schema:"new file — like core.js and balance.js",
  confidence:"high unless an entry says otherwise"
};

var BASICS={src:"18.1",
  is:"explosive movements — bounding, jumping, forceful upper-body work — to develop power",
  alsoCalled:["jump training","reactive training — the ground is the reaction stimulus"],
  develops:"control and production of ground reaction forces, to move the body faster",
  rateOfForceProduction:"generating force as quickly as possible — daily life and sport depend on it",
  evidence:"resistance plus plyometric training markedly raises force production, strength and power",
  pattern:"an eccentric loading ('cocking') action that decelerates, followed immediately by an explosive concentric contraction",
  example:"rebounding: a shallow dip at ankles, knees and hips (arms drop), then rapid extension upward; jump height depends on take-off velocity",
  integratedPerformance:"to move precisely, force is loaded eccentrically, stabilised isometrically, then accelerated concentrically",
  phases:[
    {order:1, id:"eccentric", also:"loading, deceleration", action:"agonist stretched",
      event:"elastic energy stored; spindles stimulated and signal the spinal cord",
      variables:["magnitude of stretch","rate of stretch","duration of stretch"], note:"changing these can raise the stored energy"},
    {order:2, id:"amortization", also:"transition, electromechanical delay", action:"time between eccentric and concentric",
      event:"nerves synapse in the spinal cord and signal the stretched muscle",
      rule:"shorter is more powerful; if prolonged, energy is lost as heat and the stretch reflex is not used — much less force",
      objective:"a primary aim of plyometric training is to shorten this phase"},
    {order:3, id:"concentric", also:"unloading", action:"agonist shortens",
      event:"elastic energy released — more force, or dissipated as heat"}],
  stretchShortening:"see anatomy.js FORCE.stretchShortening",
  readiness:["adequate core strength","joint stability","range of motion","efficient balance"],
  caution:"may not suit some chronic diseases or functional limitations",
  rehab:"often used in later stages of physical rehabilitation — many injuries come from failing to control deceleration"
};

var RATIONALE={src:"18.1",
  effects:["rate of force production (power)","motor-unit recruitment","neuromuscular efficiency; widens the speed range set by the nervous system",
    "strengthens muscle and connective tissue at functional speeds","speed of movement"],
  prerequisite:"a strength base, core stability and balance first",
  why:"isometric stabilisation strength from core, balance and resistance work shortens ground contact — less tissue overload and injury",
  function:"cutting and change of direction are chains of stretch-shortening cycles",
  safety:"not inherently dangerous — a systematic progression starts easy; too-advanced exercises cause compensation and injury as with any training",
  everyone:"older adults and athletes both need to produce force quickly — to avoid a fall or an opponent",
  findings:["12 weeks improved lower-limb mechanics in female volleyball players — supports ACL-prevention use",
    "6 weeks raised muscle size and power similarly in young and older people — counters sarcopenia",
    "10 weeks improved sprint, jumps, peak power and kicking speed in elite female soccer players",
    "a systematic review of 18 papers: feasible and safe for older adults' performance, function and health"]
};

var GUIDELINES={src:"18.2",
  screen:["training history","age","injury history","movement assessments (assessments.js)"],
  prerequisites:["basic total-body strength","core strength","balance"],
  shoes:"supportive shoes",
  surfaces:["grass field","basketball court","tartan track","rubber track"],
  supervision:"proper supervision",
  landing:{src:"SG.18", rule:"teach landing and rebounding mechanics — essential with jumping and bounding"},
  progress:{from:["simple","low intensity","two feet"], to:["advanced","high intensity","one foot"],
    axes:["easy → hard","low → high amplitude","simple → complex","known → unknown","bodyweight → loaded","activity-specific"]},
  planes:["sagittal","frontal","transverse"],
  speed:["slow","medium","fast","explosive"],
  intensity:{is:"distance covered and the stress on muscles, tissues and joints",
    rule:"set by the ability to keep technique; if technique slips, lower it",
    start:"conservatively — confidence matters; too-hard drills can shame people and hurt adherence"},
  volume:{unit:"foot contacts, throws or catches", example:{sets:3, reps:5, contacts:15, exercise:"squat jump"},
    rule:"higher intensity goes with lower volume"},
  frequency:{sessionsPerWeek:{min:1, max:3}, for:"most apparently healthy people",
    setBy:["fitness","current programme","training history","injury history","goals"]},
  recovery:{betweenSessionsH:{min:24}, novicesH:{min:48, max:72}, betweenDrillsS:{min:60, max:120},
    rule:"the harder the drill, the more rest between sets; too little recovery cancels the benefit"}
};

var PROGRESSION=[
  {level:1, id:"stabilization", src:"18.2", focus:"small, low-amplitude jumps — landing mechanics, alignment, eccentric strength",
    holdLandingS:{min:3, max:5}, onLanding:"correct any faulty posture before the next jump",
    exercises:["squat jump with stabilisation","box jump-up with stabilisation","box jump-down with stabilisation","multiplanar jump with stabilisation"]},
  {level:2, id:"strength", src:"18.2", focus:"more amplitude and speed — dynamic stability, eccentric strength, rate of force, coordination",
    tempo:"repeating, moderate — no hold; short ground contact",
    exercises:["squat jump","tuck jump","butt kick","power step-up"]},
  {level:3, id:"power", src:"18.2", focus:"as fast and explosive as possible — rate of force, eccentric strength, reactive stability",
    exercises:["ice skaters (skater jumps)","single-leg power step-up","proprioceptive plyometrics","depth jump"]}
];

var EXERCISES=[
  {id:"squat_jump_stabilization", src:"18.3", level:1, point:"knees in line with the toes before and on landing; feet not turned out, knees not caving"},
  {id:"box_jump_up_stabilization", src:"18.3", level:1, safety:"box height matched to ability"},
  {id:"box_jump_down_stabilization", src:"18.3", level:1, point:"step off and drop at first — jumping off is a progression; land softly and quietly, never straight-legged"},
  {id:"multiplanar_jump_stabilization", src:"18.3", level:1, why:"injuries often happen rotating or moving sideways — learn to accelerate, decelerate and stabilise in every plane"},
  {id:"squat_jump", src:"18.3", level:2, point:"land with ankles, knees and hips bent and pointing ahead — that is also the take-off position; repeating tempo"},
  {id:"lunge_jump", src:"18.3", level:2, point:"front foot and knee point straight ahead; the knee must not cave on landing"},
  {id:"tuck_jump", src:"18.3", level:2, safety:"alignment and landing mechanics matter more as drills get dynamic"},
  {id:"butt_kick", src:"18.3", level:2, prerequisite:"enough quadriceps flexibility — tight quads make the low back arch"},
  {id:"repeat_box_jumps", src:"18.3", level:2, safety:"suitable box height; tripping is a hazard"},
  {id:"power_step_up", src:"18.3", level:2, point:"knees in line with the toes on take-off and landing"},
  {id:"ice_skaters", src:"18.3", level:3, progression:"hop side to side foot to foot as fast as possible, then add the opposite-hand reach"},
  {id:"single_leg_power_step_up", src:"18.3", level:3, point:"one foot lands on the box and the other on the ground — prepare to absorb an offset landing"},
  {id:"depth_jump", src:"18.3", level:3, point:"land softly, knees straight ahead, then jump; advanced — precise technique"},
  {id:"plyometric_push_up", src:"18.3", safety:"avoid with hand or wrist pain"}
];

export {meta, BASICS, RATIONALE, GUIDELINES, PROGRESSION, EXERCISES};
