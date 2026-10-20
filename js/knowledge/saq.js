/* Bunyan — knowledge: saq
   Speed, agility and quickness training: definitions, sprint mechanics and running
   checkpoints, use for non-athletes (youth, weight loss, older adults), programme
   design by experience level, and the named drills. Several drills the text refers to
   have no description in the source PDF (gap 8) and carry only their names. Leaf data. */

var meta={
  covers:"Speed, agility and quickness training",
  derivedFrom:"certification curriculum",
  sections:["19.1","19.2","19.3","SG.19"],
  schema:"new file — like core.js, balance.js and plyometrics.js",
  confidence:"high unless an entry says otherwise"
};

var BASICS={src:"19.1",
  adaptations:["muscular","neurological","connective tissue","cardiovascular"],
  improves:"accelerating, decelerating and stabilising the whole body at high speed in every plane; nervous-system efficiency, recruitment and coordination with good mechanics",
  speed:{is:"straight-ahead velocity — distance ÷ time; moving one direction as fast as possible",
    product:["stride rate (strides per time or distance)","stride length (distance per stride)"],
    learnable:"partly genetic but trainable",
    why:"sprint drills stimulate muscle and nerve in ways other training does not — useful for non-athletes too"},
  agility:{is:"start, stop and change direction with postural control — usually reacting to a stimulus",
    vsChangeOfDirection:{agility:"react to a signal and change direction (e.g. a coach pointing; tag)", cod:"pre-planned changes, no signal (e.g. an obstacle course, set cone drills)",
      rule:"agility drills should include a response to a signal, not only COD",
      conflict:{src:"SG.19", note:"the study guide lists an obstacle course as an agility example — the textbook calls that change of direction; the textbook distinction is kept", confidence:"medium"}},
    benefits:["deceleration","dynamic flexibility","postural control","core strength","proprioception","injury resistance via eccentric control and stronger tendons and ligaments"]},
  quickness:{is:"reacting and changing body position with maximal rate of force, from any position",
    stimuli:["visual","auditory","kinesthetic"], examples:["hitting a baseball","returning a tennis serve","swerving to avoid a car"],
    vsAgility:"quickness need not involve running — e.g. a hockey goalkeeper facing a penalty shot"},
  sprintMechanics:{frontside:{is:"triple flexion of the lead leg — ankle dorsiflexion, knee flexion, hip flexion",
      gives:["stability","less braking force","more forward drive"]},
    backside:{is:"triple extension of the rear leg — ankle plantarflexion, knee extension, hip extension",
      gives:"a stronger push — hip-knee extension, glute contraction, backside arm drive"},
    pelvis:"neutral in both, for range and force"},
  runningCheckpoints:[
    {point:"foot and ankle", ideal:"straight ahead and dorsiflexed at contact in forward sprinting; slight turn-out is expected in multidirectional running and shuffles",
      fault:"excessive flattening or turn-out stresses the whole chain and lowers performance"},
    {point:"knee", ideal:"straight ahead; no excessive valgus", fault:"femoral adduction and internal rotation in stance — less force, overuse injury"},
    {point:"LPHC", ideal:"slight forward lean in acceleration; fairly neutral at maximal velocity unless reaching"},
    {point:"head", ideal:"in line with the LPHC, which is in line with the legs",
      fault:"jutting forward (except to track a ball) shifts the LPHC — the pelvo-ocular reflex"}]
};

var POPULATIONS={src:"19.2",
  nonAthletes:{why:["recreational sports need coordination, power, reaction and agility","these decline with age and inactivity",
      "improves athleticism, movement and injury prevention","fun — better compliance and adherence","more system integration than steady-state cardio"],
    before:["extensive assessment — experience, movement quality, health history, injuries","a comprehensive warm-up every time",
      "a base of flexibility (ankle, hip and thoracic mobility), muscular and cardio endurance, and strength"],
    progress:"slow and simple → fast and complex over a long period; technique before speed"},
  youth:{why:["varied physiological, neuromuscular and biomechanical exposure","most youth now get little unstructured play","fewer athletic injuries",
      "more exercise participation later in life","better fitness"],
    method:"play-style activities",
    prescription:{sessionsPerWeek:{min:1, max:3}, drills:{min:4, max:8}, sets:{min:1, max:4}, reps:{min:3, max:5}, restS:{min:15, max:60}},
    start:"the low end, focused on technique; build over many months; adjust to fitness and maturity",
    tip:"teach technique first; from 4–5 simple drills once or twice a week, progress over a few months to more drills 2–3 times a week; shorten rest only if speed and technique hold",
    drills:[{id:"red_light_green_light", steps:["line up across a field of 20 yd (18 m) or more","one person is the stop light at the far end, back turned, calling 'green light'",
        "everyone moves fast toward them","on 'red light' the stop light turns; everyone freezes with perfect posture and control",
        "anyone seen moving restarts","first to touch the stop light becomes the next one"]},
      {id:"follow_the_snake", steps:["lay 5–10 jump ropes (or one long rope) in a random S","a foot each side of the rope, follow it forward to the end and back","can be timed"]}]},
  weightLoss:{why:["short high-intensity intervals match or beat long moderate work for capacity, power, fat loss and metabolism","variety keeps it engaging",
      "high-intensity intervals may burn more subcutaneous fat than long low-to-moderate endurance work"],
    focus:"keep heart and breathing rates elevated for energy expenditure",
    must:["thorough fitness assessment","intensity matched to ability","only if the person can do the drills safely and hard enough for a whole workout"],
    start:{workoutsPerWeek:{min:1, max:2}, rule:"introduce gradually — avoid excess impact, soreness and joint stress; master technique at a comfortable speed"},
    later:{workoutsPerWeek:{min:2, max:3}, sets:{min:3, max:4}, reps:{min:3, max:5}, restS:{min:15, max:60},
      note:"less rest raises the metabolic demand — but not at the cost of execution"},
    circuits:[
      {id:"circuit_1", stations:[{drill:"jump rope (various foot patterns)", workS:30},{rest:{min:20, max:60}, note:"by ability to keep intensity"},
        {drill:"cone shuffles", workS:30, setup:"8 cones in a line about 30 in (76 cm) apart; low centre of gravity, shuffle in and out without touching; face forward then backward; other patterns: forward, backward, stepping over"},
        {rest:20},{drill:"any three ladder drills", workS:30}]},
      {id:"circuit_2", stations:[{drill:"5-10-5 drill", workS:30},{rest:20},{drill:"modified box drill", workS:30},{rest:20},
        {drill:"partner mirror drill", workS:30, setup:"two cones 10 yd apart; partners face each other between them; the leader shuffles, jumps, drops, turns; the mirror copies without falling behind; swap each time"}]}]},
  olderAdults:{why:["may slow age-related loss of bone density, coordination and power","weight-bearing loading can slow and possibly reverse osteopenia",
      "better coordination and movement confidence — fewer falls","speed and rate-of-force work help slow and reverse sarcopenia"],
    facts:[{fact:"a 10% loss of hip bone density brings a 2.5 times higher risk of hip fracture"},
      {fact:"osteopenia (low bone density, a precursor to osteoporosis) is common with age, especially in women"},
      {fact:"movement abilities decline mainly from disuse; vision tracking and vestibular function also fall, raising misstep and fall risk"}],
    readiness:["rising from a chair","balance while walking and manoeuvring","stairs comfortably","squatting","lunging","bending"],
    must:["consider fall risk first","a base of strength and flexibility","drills based on daily life (standing from a chair, stepping over obstacles)"],
    progress:"over several months, simple → complex",
    start:{sets:{min:1, max:2}, drills:{min:1, max:2}, rule:"no big week-to-week volume jumps"},
    drills:[{id:"cone_hurdle_step_overs", steps:["a 10–15 yd (9–14 m) line of varied cones, hurdles and objects about 24 in (61 cm) apart","stand side-on and step over each down the line and back","can be timed"]},
      {id:"stand_up_figure_8", steps:["start seated","cones straight ahead at 10–15 ft (3–4.5 m) and 20–25 ft (6–7.6 m)","on command, stand up as fast as possible",
        "go left of the first cone, right of the second while turning, back to the chair — a figure 8","repeat the other way and sit","timed"]}]}
};

/* Apparently healthy adults. */
var PROGRAM={src:"19.3",
  rule:"suggestions only — weigh against the session's total volume across all components; risk rises with speed and reactivity; precise technique",
  levels:[
    {level:"beginner", drills:{min:4, max:6}, type:"limited inertia and unpredictability — e.g. cone shuffles, ladder drills", sets:{min:1, max:2}, reps:{min:2, max:3}, restS:{min:15, max:60}},
    {level:"intermediate", drills:{min:6, max:8}, type:"more horizontal inertia, limited unpredictability — e.g. 5-10-5, T-drill, box drill, stand-up to figure 8", sets:{min:3, max:4}, reps:{min:3, max:5}, restS:{min:0, max:60}},
    {level:"advanced", drills:{min:6, max:10}, type:"maximal inertia and unpredictability — e.g. modified box drill, partner mirror, timed drills", sets:{min:3, max:5}, reps:{min:3, max:5}, restS:{min:0, max:90}}],
  tableNote:"Table 19-3's columns were mixed in plain text; recovered from a layout extraction",
  ladderDrills:["one-ins","two-ins","in-in-out-out","in-in-out (zig zag)","side shuffle","Ali shuffle"],
  ladderNote:"named only — the PDF shows them as photos and video links",
  undescribed:["5-10-5 drill","T-drill","box drill","modified box drill"],
  gap:"the text says 'see' these drills, but their descriptions are not in the PDF (gap 8) — not filled"
};

export {meta, BASICS, POPULATIONS, PROGRAM};
