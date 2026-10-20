/* Bunyan — knowledge: balance
   Balance training: definitions, the three sensory systems, why it is trained
   (performance, injury resistance, rehabilitation — including ankle sprains), the
   progression variables, the three-level progression with its exercises, and each
   exercise's key point. Per-phase sets and reps come with chapter 21. Leaf data. */

var meta={
  covers:"Balance training concepts, progressions and exercises",
  derivedFrom:"certification curriculum",
  sections:["17.1","17.2","17.3","17.4","SG.17"],
  muscleNames:"anatomy.js MUSCLE_MAP",
  schema:"new file — like core.js, a self-contained progression system",
  confidence:"high unless an entry says otherwise"
};

var BASICS={src:"17.1",
  balance:"keeping the centre of gravity within the base of support",
  centreOfGravity:"the body's approximate midpoint — usually mid-trunk",
  baseOfSupport:"the area under the body bounded by every contact point with the surface",
  limitsOfStability:"how far the centre of gravity can move without changing the base of support and without falling",
  types:[{id:"static", is:"holding posture while stationary", example:"standing on one foot"},
    {id:"semi_dynamic", is:"stationary limits of stability on a moving base", example:"riding a skateboard"},
    {id:"dynamic", is:"keeping the centre of mass over constantly changing limits", example:"running on uneven ground"}],
  senses:[{id:"vision", gives:"the body's location in space; foot placement on unstable ground", harderWhen:"eyes closed"},
    {id:"vestibular", gives:"head orientation and movement (inner-ear receptors)", mattersFor:["bending over","hopping","squatting"]},
    {id:"somatosensory", gives:"skin pressure, muscle length and joint angle", mattersFor:["unstable surfaces","dynamic balance"]}],
  integration:"vision, vestibular and somatosensory input plus well-timed muscle contraction",
  senseBias:"people may rely on one sense over the others — train all three",
  impairedBy:["musculoskeletal injury (e.g. a ligament sprain, muscle pull)","altered sensorimotor function (e.g. concussion, ageing)"]
};

var RATIONALE={src:"17.2",
  performance:{benefits:["static and dynamic balance","lower-limb neuromuscular control","balance after injury",
      "lower-limb strength — especially combined with resistance training","daily-living function and less self-reported disability in older adults","agility in athletes"],
    findings:["10-minute programmes, 3 times a week for 4 weeks, improved children's static and dynamic balance",
      "improves neuromuscular control, especially after chronic ankle sprains","adding balance to resistance training enhanced leg-strength gains",
      "balance beat isometric strength training for vertical jump in youth basketball","balance with agility work improved eyes-open and eyes-closed balance, agility and reaction time"]},
  injury:{benefits:["landing mechanics — may reduce ACL injury and ankle sprains","athletic performance such as vertical jump","fewer falls in older adults","physical performance and confidence in older adults"],
    findings:[{finding:"balance training cut ankle-sprain risk", relativeReductionPct:46, population:"athletes, vs no balance training"},
      {finding:"exercise including balance reduced falls", relativeReductionPctMax:20, population:"healthy older adults"},
      {finding:"poor landing balance was linked to ACL rupture", population:"collegiate athletes"},
      {finding:"a 9-week prevention programme improved time-to-stabilisation and vertical jump", population:"youth soccer"},
      {finding:"5 weeks improved single-leg landing mechanics and muscle activation (more knee flexion and hamstring activity)", population:"female basketball"},
      {finding:"prevention with stretching and balance cut shoulder and elbow injuries", population:"youth baseball"},
      {finding:"integrated prevention with balance reduced overuse and severe injuries", population:"adolescent female soccer"}],
    preventionPrograms:["stretching","strength","plyometrics","balance"],
    sportSpecific:"e.g. balancing on one leg while passing a basketball; minimal equipment helps season-long adherence",
    olderAdults:{multifactorial:"balance with stretching and strengthening for over-65s with a history of falls",
      ask:"unsteadiness or fear of falling — these people fall more",
      critical:"thorough pre-participation screening; some need healthcare-provider clearance; know conditions that affect balance"}},
  rehabilitation:{benefits:["single-limb performance","proprioception and self-reported function with ankle instability",
      "outcomes in both limbs after one-sided ACL injury and surgery","falls-focused rehab in older adults"],
    ankleInstability:{findings:["4 weeks of balance training in rehab improved static and dynamic single-leg balance",
        "either a traditional single-leg programme or a progressive hop-to-stabilisation programme improved function, semi-dynamic balance and joint position sense"],
      traditional:["single-leg stance","single-leg stance with ball toss and kicking","step-down to single-leg stance"],
      hopToStabilisation:"various single-leg hops landing and holding"},
    persists:"after ACL reconstruction, semi-dynamic balance was worse on both legs up to a year later — train both limbs",
    perturbation:{is:"a disturbance added to a task, e.g. a light push on the shoulders while balancing", evidence:"perturbation training in a safe setting reduced falls in older adults"},
    scope:"trainers do not diagnose or rehabilitate; after clearance by a physician or physical therapist, help restore function, with clear communication (scope.js)"},
  principles:["challenge the limit of stability — multiplanar, proprioceptively enriched, functional patterns",
    "use varied equipment, correct technique and varied speeds for maximal sensory input",
    "prepares for real scenarios — landing a jump, stepping off a curb",
    "strength-only programmes give incomplete results; balance restores the muscle-firing synergy for coordinated movement"],
  heavyLoads:{rule:"never combine balance equipment (foam pad, balance disc, wobble board) with maximal or near-maximal lifts", why:"safety"}
};

var GUIDELINES={src:"17.3",
  goal:"keep raising awareness of the limit of stability by increasing proprioceptive demand",
  enrichedEnvironment:{src:"SG.17", is:"an unstable but controllable setting that makes the body use its own balance and stabilisation mechanisms"},
  example:{easy:"a 65-year-old in tandem stance on the floor", hard:"a 25-year-old athlete on one foot on a balance disc"},
  selection:["safe","progressive"],
  progress:["easy → hard","simple → complex","stable → unstable","static → dynamic","slow → fast","eyes open → eyes closed",
    "known → unknown (cognitive task)","single task → dual task"],
  equipment:{order:["floor","balance beam","half-foam roll","foam pad","balance disc"], wobbleBoard:"can be added; its design sets where it fits",
    note:"these come in many shapes and sizes that dictate the progression",
    warning:"skipping the order causes compensation, poor execution and injury"},
  planes:["sagittal","frontal","transverse"],
  stance:[{order:1, stance:"two legs, stable — wide"},{order:2, stance:"two legs, stable — narrow"},{order:3, stance:"tandem (heel to toe)"},
    {order:4, stance:"single leg, stable"},{order:5, stance:"two legs, unstable"},{order:6, stance:"single leg, unstable"}],
  perturbation:"mild to moderate — a gentle push in one direction, then several",
  harderBy:["unstable surface","eyes closed (vision)","moving the head to look around (vestibular)","a cognitive task (dual task)","moving the other leg, trunk or arms"],
  easierBy:["two legs instead of one"],
  oneAtATime:"change only one variable at a time; client-specific progressions",
  checkpoints:"the five kinetic chain checkpoints (core.js CHECKPOINTS) — feet straight ahead in balance work; quality before quantity or load"
};

var PROGRESSION=[
  {level:1, id:"stabilization", src:"17.3", focus:"little joint motion of the balance leg — reflexive contractions for joint stability",
    masterFirst:true,
    exercises:["tandem stance","single-leg balance","single-leg balance reach","single-leg hip internal and external rotation","single-leg lift and chop",
      "single-leg arm and leg motion","single-leg windmill","single-leg throw and catch"],
    harder:["balance equipment","cognitive dual task (e.g. naming the months)","eyes closed","head or eye movement"]},
  {level:2, id:"strength", src:"17.3", focus:"dynamic eccentric and concentric movement of the balance leg through full range — mid-range control, isometric hold at end range",
    exercises:["single-leg squat","single-leg squat touchdown","single-leg Romanian deadlift","multiplanar step-up to balance","multiplanar lunge to balance"],
    harder:["balance equipment","cognitive dual task","eyes closed","head or eye movement"]},
  {level:3, id:"power", src:"17.3", focus:"deceleration — hop and land on one leg, from moving to still",
    holdLandingS:{min:3, max:5},
    exercises:["multiplanar hop with stabilisation","multiplanar single-leg box hop-up with stabilisation","multiplanar single-leg box hop-down with stabilisation"]}
];

var EXERCISES=[
  {id:"single_leg_balance", src:"17.4", level:1, targets:["gluteus maximus","gluteus medius"], targetsNote:"the source says the stance-leg gluteal muscles stay contracted (in every balance exercise)", point:"keep the stance-leg glutes contracted — in every balance exercise"},
  {id:"single_leg_balance_reach", src:"17.4", level:1, point:"hips level — better balance, less low-back stress"},
  {id:"single_leg_hip_rotation", src:"17.4", level:1, point:"rotate through the stance hip, not the spine"},
  {id:"single_leg_lift_chop", src:"17.4", level:1, point:"stance knee stays in line with the toes"},
  {id:"single_leg_arm_leg_motion", src:"17.4", level:1, point:"move the other limbs only as far as posture holds"},
  {id:"single_leg_windmill", src:"17.4", level:1, point:"trunk moves only as far as posture holds; needs core stability as well as balance"},
  {id:"single_leg_throw_catch", src:"17.4", level:1, harder:["throw at different heights and across the body","more distance between partners","faster throws"]},
  {id:"single_leg_squat", src:"17.4", level:2, point:"knee over the second and third toes, never inside or outside — less knee stress"},
  {id:"single_leg_squat_touchdown", src:"17.4", level:2, reachProgression:["knee","shin","foot"]},
  {id:"single_leg_rdl", src:"17.4", level:2, targets:["hamstring complex","gluteus maximus","erector spinae"], targetsFrom:"20.13", reachProgression:["knee","shin","foot"]},
  {id:"mp_step_up_balance", src:"17.4", level:2, targets:["gluteus maximus"], targetsNote:"the source says full stance-hip extension gives maximal glute recruitment", point:"finish with the stance hip fully extended — maximal glute recruitment"},
  {id:"mp_lunge_balance", src:"17.4", level:2, point:"not too long a stride, especially with tight hip flexors — it forces the low back into extension"},
  {id:"mp_hop_stabilization", src:"17.4", level:3, point:"soft, quiet landing; knee over the second and third toes"},
  {id:"mp_box_hop_up", src:"17.4", level:3, safety:"box height suited to ability"},
  {id:"mp_box_hop_down", src:"17.4", level:3, point:"knee in line with the toes; land as softly as possible"}
];

export {meta, BASICS, RATIONALE, GUIDELINES, PROGRESSION, EXERCISES};
