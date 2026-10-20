/* Bunyan — knowledge: imbalances
   Posture and movement distortion patterns → which muscles are typically overactive
   (to calm and lengthen) and underactive (to activate), and what can be seen. Muscles
   are named exactly as in anatomy.js MUSCLE_MAP, which alone maps them to the exercise
   library's tags — one muscle vocabulary, never two. Leaf data. */

var meta={
  covers:"Distortion patterns and the muscles behind them",
  derivedFrom:"certification curriculum",
  sections:["7.5","11.1","12.1","12.2","12.3","16.2"],
  muscleNames:"anatomy.js MUSCLE_MAP",
  status:"seeded from 7.5's worked examples; chapter 12 (posture and movement assessment) completes each pattern"
};

/* What the terms mean, and why patterns exist. */
var BASICS={src:"12.1",
  imbalance:"altered lengths of the muscles around a joint — some overactive (forcing the compensation), some underactive (allowing it)",
  causes:["repetitive movement","sedentary lifestyle","trauma"],
  overactive:"elevated neural activity relative to its antagonist; held in chronic contraction",
  underactive:"inhibited neural drive relative to its antagonist; may be pulled into chronic lengthening",
  relative:"both terms are relative to the opposing muscle, not to the muscle's own normal capacity",
  posture:"optimal posture lowers stress on tissues and joints sitting, standing or lying; poor awareness and long sitting make poor posture common",
  roadmap:"static stance is a roadmap of how the body has been used; it compensates in observable, predictable patterns",
  carryOver:"deviations seen in static posture usually reappear in movement assessments — e.g. flat feet show as altered foot mechanics",
  priority:"an impairment seen across several assessments should be addressed in the programme",
  historicBasis:"basic compensation patterns described by a physician-researcher in the 1970s; the pes planus pattern was added by the certifying body"
};

/* complete:false = only what the source has stated so far; do not treat as a full pattern.
   complete:true  = the source's full pattern (static positions + over/underactive). */
var PATTERNS=[
  {id:"pes_planus_distortion", src:"12.2", complete:true,
    static:["ankles: pes planus (collapsed arch)","knees: valgus and internally rotated","hips: adducted and internally rotated"],
    overactive:["gastrocnemius","soleus","adductors","hip flexor complex"],
    underactive:["tibialis anterior","tibialis posterior","gluteus maximus","gluteus medius"]},
  {id:"lower_crossed", src:"12.2", complete:true,
    static:["hips flexed","pelvis: anterior tilt","lumbar spine: excessive lordosis (extension)"],
    overactive:["hip flexor complex","lumbar extensors"],
    underactive:["gluteus maximus","gluteus medius","hamstring complex","abdominals"],
    note:"the source table prints the gluteal line twice — a print artefact, recorded once",
    supersedes:"anterior_pelvic_tilt (7.5 seed)"},
  {id:"upper_crossed", src:"12.2", complete:true,
    static:["thoracic spine: excessive kyphosis","shoulders: protracted and internally rotated","head and neck: jutted forward"],
    overactive:["pectoralis major","pectoralis minor","levator scapulae","sternocleidomastoid","upper trapezius"],
    underactive:["middle trapezius","lower trapezius","rhomboids","deep cervical flexors"]},
  {id:"posterior_pelvic_tilt", src:"16.2", complete:false,
    seen:["pelvis rotated backward"],
    overactive:["hamstring complex","rectus abdominis"],
    underactive:["erector spinae"],
    note:"stated in the core chapter only — no static checkpoints or full pattern given"},
  {id:"knees_in", src:"7.5", complete:false,
    seen:["knock-kneed posture","knees collapsing inward during a squat"],
    overactive:["adductors"],
    underactive:["gluteus medius"],
    why:"short, contracted adductors and a lengthened gluteus medius hold the knee in a suboptimal position",
    risk:"unnecessary joint stress, discomfort, higher injury risk",
    subsystem:"lateral subsystem not working properly (anatomy.js FORCE.systems.global)"},
  {id:"anterior_pelvic_tilt", src:"7.5", complete:false,
    seen:["pelvis tilted forward","low-back arch"],
    overactive:["hip flexor complex"],
    underactive:["transversus abdominis","internal obliques"],
    note:"the source calls these intrinsic core stabilisers often underactive alongside overactive hip flexors; only the two it names are listed",
    linked:"delayed feed-forward activation of the same two muscles in people with low-back pain",
    seeAlso:"lower_crossed (12.2) is the full pattern; this seed adds the two named deep core muscles"}
];

/* Movement-assessment findings → muscles. Overactive muscles are stretched (calmed);
   underactive muscles are strengthened (activated). Muscle names as in MUSCLE_MAP.
   This is the join the ERD needs: assessment finding → pattern → corrective work. */
var MOVEMENT_FAULTS=[
  {id:"ohsa_feet_turn_out", src:"12.3", assessment:"overhead_squat", view:"anterior", checkpoint:"feet and ankles", fault:"feet turn out",
    overactive:["gastrocnemius","soleus","hamstring complex"], underactive:["tibialis anterior","tibialis posterior","gluteus maximus","gluteus medius"]},
  {id:"ohsa_knees_in", src:"12.3", assessment:"overhead_squat", view:"anterior", checkpoint:"knees", fault:"knees cave in (valgus)",
    overactive:["tensor fasciae latae","adductors"], underactive:["gluteus maximus","gluteus medius","tibialis anterior","tibialis posterior"]},
  {id:"ohsa_low_back_arch", src:"12.3", assessment:"overhead_squat", view:"lateral", checkpoint:"LPHC", fault:"low back arches",
    overactive:["hip flexor complex","rectus femoris","psoas","tensor fasciae latae","lumbar extensors","latissimus dorsi"],
    underactive:["gluteus maximus","hamstring complex","abdominals"],
    note:"the source lists the hip flexors as rectus femoris, psoas and TFL"},
  {id:"ohsa_forward_lean", src:"12.3", assessment:"overhead_squat", view:"lateral", checkpoint:"LPHC", fault:"excessive forward trunk lean",
    overactive:["hip flexor complex","gastrocnemius","soleus","rectus abdominis","external obliques"],
    underactive:["gluteus maximus","hamstring complex","lumbar extensors"]},
  {id:"ohsa_arms_forward", src:"12.3", assessment:"overhead_squat", view:"lateral", checkpoint:"shoulders", fault:"arms fall forward",
    overactive:["latissimus dorsi","pectoralis major","pectoralis minor","teres major"],
    underactive:["middle trapezius","lower trapezius","rhomboids","posterior deltoid","rotator cuff"],
    note:"the source says 'portions of' the rotator cuff"},
  {id:"single_leg_knee_in", src:"12.3", assessment:"single_leg_squat", view:"anterior", checkpoint:"knee", fault:"knee caves in (valgus)",
    overactive:["tensor fasciae latae","adductors"], underactive:["gluteus maximus","gluteus medius","tibialis anterior","tibialis posterior"],
    record:"right, left or both — by stance leg"},
  {id:"push_low_back_arch", src:"12.3", assessment:"pushing", view:"lateral", checkpoint:"LPHC", fault:"low back arches",
    overactive:["hip flexor complex","rectus femoris","psoas","tensor fasciae latae","lumbar extensors"], underactive:["gluteus maximus","hamstring complex","abdominals"]},
  {id:"push_shoulders_elevate", src:"12.3", assessment:"pushing", view:"lateral", checkpoint:"shoulders", fault:"shoulders elevate",
    overactive:["levator scapulae","upper trapezius"], underactive:["lower trapezius"]},
  {id:"push_head_forward", src:"12.3", assessment:"pushing", view:"lateral", checkpoint:"head and neck", fault:"head juts forward",
    overactive:["levator scapulae","sternocleidomastoid"], underactive:["deep cervical flexors"]},
  {id:"pull_low_back_arch", src:"12.3", assessment:"pulling", view:"lateral", checkpoint:"LPHC", fault:"low back arches",
    overactive:["hip flexor complex","rectus femoris","psoas","tensor fasciae latae","lumbar extensors"], underactive:["gluteus maximus","hamstring complex","abdominals"]},
  {id:"pull_shoulders_elevate", src:"12.3", assessment:"pulling", view:"lateral", checkpoint:"shoulders", fault:"shoulders elevate",
    overactive:["levator scapulae","upper trapezius"], underactive:["lower trapezius"]},
  {id:"pull_head_forward", src:"12.3", assessment:"pulling", view:"lateral", checkpoint:"head and neck", fault:"head juts forward",
    overactive:["levator scapulae","sternocleidomastoid"], underactive:["deep cervical flexors"]}
];

/* Lifestyle causes that push toward a pattern. Muscle names as in MUSCLE_MAP. */
var CAUSES=[
  {id:"prolonged_sitting", src:"11.1",
    effects:[{overactive:["hip flexor complex"], leadsTo:"low-back pain", why:"hips held flexed for long periods"},
      {posture:["rounded shoulders","forward head"], why:"shoulders and head fatigue under gravity at a computer"},
      {other:"low daily energy expenditure and potentially poor cardiorespiratory conditioning"}],
    links:["anterior_pelvic_tilt"]},
  {id:"high_heels", src:"11.1",
    effects:[{tight:["gastrocnemius","soleus"], tissue:"Achilles tendon", why:"ankle held plantarflexed for long periods"},
      {posture:["decreased dorsiflexion","overpronation at the foot and ankle","flattened arch"]},
      {pain:["feet","knees","hips","low back"]}]}
];

/* What a past injury does to muscle activation. Previous musculoskeletal injury is a
   strong predictor of future injury. */
var INJURY_EFFECTS=[
  {injury:"ankle sprain", src:"11.1", reduces:["gluteus medius","gluteus maximus"],
    consequence:"poor lower-limb control in functional activities, which can lead to injury"},
  {injury:"knee ligament injury", src:"11.1", reduces:["patellar stabilisers"],
    note:"non-contact knee injuries often come from ankle or hip dysfunction — the knee is caught between them, so altered ankle or hip function alters knee movement and force"},
  {injury:"low-back injury", src:"11.1", reduces:["core stabilisers"], consequence:"poor spinal stabilisation, dysfunction and pain"},
  {injury:"shoulder injury", src:"11.1", alters:["rotator cuff"], consequence:"shoulder instability in functional activities"},
  {injury:"others", src:"11.1", list:["repeated hamstring strains","groin strains","patellar tendonitis (jumper's knee)","plantar fasciitis",
    "shin splints","biceps tendonitis","headaches"]}
];

export {meta, BASICS, PATTERNS, MOVEMENT_FAULTS, CAUSES, INJURY_EFFECTS};
