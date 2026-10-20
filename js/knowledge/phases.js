/* Bunyan — knowledge: phases
   The progression model: integrated-training principles, the seven training components,
   and the three-level, five-phase model — each phase's purpose, adaptation, who it is
   for, what comes before and after, and what justifies moving on — plus chapter 21:
   periodisation, the daily template, and every phase's variables per template section
   (PHASE_VARIABLES). Leaf data. */

var meta={
  covers:"Integrated training principles and the phased progression model",
  derivedFrom:"certification curriculum",
  sections:["13.1","13.2","13.3","13.4","21.1","21.2","21.3","21.4","21.5","21.6","SG.21","H.programs","H.templates"],
  status:"model (ch 13) and per-phase variables (ch 21, cross-checked with the study guide); two goal plans missing (gap 9)",
  confidence:"high unless an entry says otherwise"
};

/* What integrated training means, and the principles beyond exercise variety. */
var PRINCIPLES={src:"13.1",
  integrated:"combines every form of exercise into one system — flexibility, cardiorespiratory, core, balance, plyometric, SAQ, resistance",
  tailoring:"swap components to fit the person — e.g. after physical therapy for a knee, replace heavy squats with core and balance drills",
  benefits:{psychological:["stress relief","improved mood","improved sleep"],
    physiological:["cardiovascular, respiratory and endocrine function"],
    bodyComposition:["fat loss","more lean mass"],
    performance:["flexibility","endurance","strength","power"]},
  evidence:"multiplanar integrated programmes improve more variables (movement quality, speed and agility, strength, endurance, flexibility, power) than isolated resistance training — isolated training still works",
  rules:[
    {id:"systematic_progressive", rule:"build a foundation first — aerobic and muscular endurance, joint mobility and stability, core strength — then progress by progressive overload",
      skipping:["higher injury risk","frustration from not performing exercises correctly","goals delayed or missed","no tracking of success","inconsistent programming"],
      following:["lower injury and overtraining risk","better adherence","goals more likely met","successes and setbacks tracked","consistent programming with progressive overload"],
      feedback:"goal setting, constant monitoring and timely reassessment are the feedback that lets the plan adjust"},
    {id:"movement_patterns", rule:"master the fundamental patterns; most exercises use at least one",
      patterns:["squat","hip hinge","pull","push","vertical press"],
      splitByPattern:"e.g. push day, pull day, squat + hinge day, vertical-press day — may add coordination and athleticism",
      splitByBodyPart:"still effective for hypertrophy"},
    {id:"optimal_posture", rule:"programmes should maintain or correct posture",
      how:["flexibility and strengthening to correct imbalances (imbalances.js)","unilateral and bilateral work for left/right symmetry","anterior and posterior work for front/back symmetry"],
      helps:["flexibility","core","balance","plyometric","resistance","cardio — via body-composition change and endurance"]},
    {id:"optimal_rom", rule:"work through the full range unless restricted",
      restricted:"a past injury's scar tissue can change joint mechanics — work within the constraint and avoid re-injury",
      unrestricted:"use all ranges to maximise adaptation",
      example:"limited hip mobility is implicated in hip, spine and lower-limb dysfunction"},
    {id:"all_planes", rule:"train sagittal, frontal and transverse planes",
      mistake:"over-emphasising the sagittal plane",
      why:["more complete muscle recruitment — e.g. squats and lunges do not fully train gluteus medius, which also abducts and externally rotates the hip","many injuries happen in the frontal and transverse planes"]},
    {id:"acute_variables", rule:"acute variables set the stress and so the adaptation — the building blocks of every programme",
      list:["repetitions","sets","intensity","tempo","rest interval","volume","frequency","duration","exercise selection","exercise order"],
      definitions:{repetition:"one complete movement",set:"a group of consecutive repetitions",
        intensity:"effort relative to maximum, usually a percentage",rest:"time between sets",
        volume:"repetitions × resistance across a session"},
      detail:"chapter 20 — acute-variables.js"},
    {id:"assessment_based", rule:"design from the assessment results gathered before the first session — baselines, imbalances, posture, health concerns (assessments.js)"}]
};

/* The seven components and what each is for. */
var COMPONENTS=[
  {id:"flexibility", src:"13.2", what:"stretching techniques that improve tissue extensibility and joint range",
    techniques:["self-myofascial (foam rolling)","static","active","dynamic"], use:"a variety, applied systematically",
    benefits:["more joint range","possibly less soreness","potentially lower injury risk"]},
  {id:"cardiorespiratory", src:"13.2", what:"the heart and lungs' capacity to supply muscle with oxygen during sustained or intense work",
    modes:["walking","jogging","running","cycling","swimming","rowing","sport"],
    depends:"mode, duration and intensity follow the person's goals",
    why:"heart disease is the leading cause of death worldwide",
    benefits:["lower resting HR and BP","higher stroke volume and cardiac output","better gas exchange and oxygen uptake, less airway resistance",
      "less blood-flow resistance, more blood volume","better blood lipids","better venous return"]},
  {id:"core", src:"13.2", what:"the trunk and pelvic muscles that stabilise the spine and pelvis and transfer force to the limbs",
    stability:"controlling the trunk over the pelvis and legs to produce, transfer and control force",
    misconception:"core is not only the six-pack muscle; crunches and sit-ups are not the whole of it — train all planes, obliques, low back, glutes",
    benefits:["posture and spinal health","daily and on-the-job function","balance, stabilisation, coordination","less low-back pain","skill power — e.g. swinging a racket or club"]},
  {id:"balance", src:"13.2", what:"maintaining, achieving or restoring balance without falling; trains control of the centre of gravity over the base of support",
    for:"every age and level — not only older adults",
    benefits:["fewer falls","fewer ankle sprains","better landing mechanics (may lower ACL risk)","lower-limb strength",
      "proprioception and body awareness","agility in athletes","stronger hip muscles"]},
  {id:"plyometric", src:"13.2", what:"reactive or jump training — the expression of muscular power via the stretch-shortening cycle",
    for:"many populations, not only athletes, with variations by skill and fitness",
    volume:"few exercises and low volume before a resistance session; more on a separate day",
    benefits:["bone density, fewer bone and joint injuries","stronger ligaments, tendons, cartilage","more energy expenditure for weight management",
      "strength and power","better muscle contraction and neural synchronisation","sport performance"]},
  {id:"saq", src:"13.2", what:"progressive drills for moving skilfully at higher speed and precision — accelerate, decelerate, change direction",
    for:"modifiable for most people, not only athletes; also helps prevent falls",
    format:"its own session or part of an integrated one",
    benefits:["top speed, change of direction, acceleration and deceleration","health-related fitness","reaction time","sprint and cutting technique"]},
  {id:"resistance", src:"13.2", what:"training against load for strength and hypertrophy, whatever the age or sex",
    benefits:["endurance, strength, power","hypertrophy","weight management","resting metabolic rate, resting HR and BP",
      "coordination and athleticism","fewer injuries through stronger soft tissue","bone density","rehabilitation from musculoskeletal injury"],
    with:"most effective for lean mass and fat loss combined with proper diet"}
];

/* The model: three levels, five phases. Phase 1 is the start for everyone and the
   place to return to between harder blocks. */
var LEVELS=[
  {id:"stabilization", src:"13.3", order:1, phases:[1],
    adaptations:["movement patterns","stabilisation"],
    goals:["movement patterns and technique","muscle imbalances","joint range and flexibility","core and peripheral joint stability",
      "preparing muscles, tendons, ligaments and joints for later loads","cardiorespiratory conditioning"],
    who:"crucial for every beginner",
    returnTo:"cycle back after strength and power blocks — keeps core and joint stability and gives active rest"},
  {id:"strength", src:"13.3", order:2, phases:[2,3,4],
    adaptations:["keep stabilisation endurance","increase overall strength"],
    who:"the level for hypertrophy or maximal-strength goals"},
  {id:"power", src:"13.3", order:3, phases:[5],
    adaptations:["speed","power"],
    entry:"only after completing stabilisation and strength — unless already well conditioned, with adequate joint and core stability and familiarity with power exercise"}
];

var PHASES=[
  {phase:1, id:"stabilization_endurance", name:"Stabilisation endurance", level:"stabilization", src:"13.3",
    purpose:"teach optimal movement patterns (push, pull, press, squat, hinge) and introduce exercise modes",
    adaptation:["muscular endurance","joint range","joint and core stability","coordination","postural control"],
    style:"slow, controlled movement; relatively light loads; meticulous posture and technique",
    early:"spend the first sessions perfecting patterns — confidence in movement raises adherence",
    progressBy:"more balance and stability challenge, not more load — e.g. push-up → push-up with hands on a stability ball",
    fatLoss:"circuits with short rest and high reps in a controlled but unstable setting may burn more energy",
    precedes:2, follows:null, returnBetween:"between any higher-intensity phases (2–5), for recovery",
    variables:"PHASE_VARIABLES"},
  {phase:2, id:"strength_endurance", name:"Strength endurance", level:"strength", src:"13.3",
    purpose:"raise prime-mover strength while keeping stabilisation endurance",
    method:"superset two exercises with similar joint actions, no rest between: a stable strength exercise, then a less stable (still controlled) stabilisation exercise",
    examples:[{part:"Chest", strength:"bench press", stability:"push-up"},
      {part:"Back", strength:"seated cable row", stability:"standing cable row"},
      {part:"Shoulders", strength:"shoulder press machine", stability:"single-leg dumbbell overhead press"},
      {part:"Legs", strength:"barbell squat", stability:"single-leg squat"}],
    adaptation:["muscular endurance","joint stability","posture","prime-mover strength"],
    precedes:3, follows:1, variables:"PHASE_VARIABLES"},
  {phase:3, id:"muscular_development", name:"Muscular development", level:"strength", src:"13.3",
    purpose:"maximal muscle growth", optional:true,
    who:["bodybuilders","people losing fat who want to keep lean mass","fitness enthusiasts after fat loss and tone"],
    notFor:"people who do not want much muscle growth — e.g. endurance athletes",
    method:"high volume (many sets), moderate to heavy loads, varied exercises and methods",
    precedes:4, follows:2, variables:"PHASE_VARIABLES"},
  {phase:4, id:"maximal_strength", name:"Maximal strength", level:"strength", src:"13.3",
    purpose:"maximal prime-mover strength by lifting heavy loads", optional:true,
    who:["powerlifters","strongman competitors","shot-putters, rugby players, American-football linemen"],
    readiness:"must already be accustomed to resistance training — advanced",
    precedes:5, follows:3, variables:"PHASE_VARIABLES"},
  {phase:5, id:"power", name:"Power", level:"power", src:"13.3",
    purpose:"raise maximal strength and rate of force production — velocity and athleticism",
    method:"complex training: a heavy strength exercise supersetted with a high-velocity exercise of similar joint actions",
    evidence:"improves sprint and vertical jump",
    examples:[{part:"Chest", strength:"bench press", power:"medicine ball chest pass"},
      {part:"Back", strength:"lat pulldown", power:"medicine ball soccer throw"},
      {part:"Shoulders", strength:"dumbbell shoulder press", power:"front medicine ball oblique throw"},
      {part:"Legs", strength:"barbell squat", power:"squat jump"}],
    examplesCheck:"the PDF table is unaligned; pairs confirmed against the study guide, which prints them row by row",
    readiness:"see LEVELS power.entry",
    precedes:null, follows:4, variables:"PHASE_VARIABLES"}
];

/* How a person moves through the model. */
var PROGRESSION={src:"13.3",
  start:"everyone begins at phase 1",
  rationale:"experience alone does not make a good programme; a structured, periodised model gives more consistent results and an integrated one lowers injury",
  optional:[3,4],
  staircase:{src:"21.2", is:"up and down the stairs, stopping at different steps, as goals, needs and abilities dictate"},
  weeksPerPhase:{src:"21.3", min:2, max:6, note:"phase 1 for 2–6 weeks depending on ability and experience; each later phase generally 2–6 weeks too (21.4, 21.5); exit is person-specific — ability and movement competency"},
  phase4Benefit:{src:"21.4", note:"maximal strength work also raises the benefit of phase 5 power training"},
  phase3Flex:{src:"21.4", note:"short rests make phase 3 metabolically demanding — useful for weight loss and conditioning; after phase 3, cycle back to 1 or 2, or move on to 4 or 5"},
  summary:{src:"13.4", claim:"a systematic progression that minimises injury while maximising results"}
};

/* Chapter 21. Planning across time. */
var PERIODIZATION={src:"21.1",
  programDesign:"an organised structure of exercises, volume and intensity toward a goal — a road map",
  trainingPlan:"the forms of training, how long, how often it changes and which exercises; individual — no cookie-cutter plans",
  questions:["needs, goals and abilities","concerns or contraindications from injuries or conditions","assessment results — imbalances, posture, mobility",
    "exercises liked and disliked","sets, reps, rest for abilities, goals and phase","modalities suited to goals and fitness","frequency and duration"],
  icebergEffect:"visible goals (fat loss, muscle, strength) rest on unseen work — movement patterns, mobility and stability, endurance, injury prevention",
  adherence:"arguably the most important factor — programmes the person adopts and keeps",
  periodization:{is:"a systematic plan that uses GAS and specificity to vary stress for adaptation and injury prevention (acute-variables.js PRINCIPLES)",
    objectives:["divide training into periods — macrocycle, mesocycle, microcycle","train different forms of strength in each, to control volume and prevent injury"],
    aims:["repeat different training at set times for different adaptations","manage training","peak for competition","reduce injury and overtraining"]},
  cycles:[{id:"macrocycle", is:"annual plan — month by month, with evaluations and recovery periods", sport:["preparatory (pre-season)","competitive (in-season)","transition (off-season)"]},
    {id:"mesocycle", is:"monthly plan — the days and style of each workout", typicalWeeks:4, note:"not always a month — e.g. a 3-week contest fat-loss block, a 6-week off-season block"},
    {id:"microcycle", is:"weekly plan — the specific workouts", typicalDays:7, maxDays:10, note:"3–6 microcycles make a mesocycle"}],
  sportPhases:{preparatory:"build volume and intensity gradually to peak", competitive:"hold top condition, avoid overtraining and burnout", transition:"active rest, taper intensity"},
  linear:{is:"gradually raise intensity while lowering volume over a set period", for:"new or experienced exercisers — simple",
    example:[{weeks:"1–4", focus:"stability and muscular endurance", pct1RM:{min:60, max:70}},
      {weeks:"5–8", focus:"hypertrophy and strength", pct1RM:{min:70, max:85}},
      {weeks:"9–12", focus:"maximal strength", pct1RM:{min:85, max:100}}],
    alsoVaries:["exercise selection","rest","volume"], note:"matters for weight-loss and endurance goals"},
  undulating:{is:"vary volume, intensity and selection day to day or week to week", why:["less boredom","more creative","harder to plateau"],
    example:[{day:"Mon", focus:"muscular endurance"},{day:"Wed", focus:"power"},{day:"Fri", focus:"hypertrophy"}]},
  model:{src:"SG.21", uses:"both linear and undulating periodisation"}
};

/* Table 21-3. */
var PHASE_SUMMARY=[
  {phase:1, src:"21.2", adaptations:["mobility and flexibility","core and joint stabilisation","postural alignment and control","muscular and aerobic endurance"],
    progressBy:["master basic movement patterns","then add controlled instability","then more complexity"]},
  {phase:2, src:"21.2", adaptations:["core strength and joint stabilisation","muscular endurance and prime-mover strength"],
    progressBy:["shorter rest","more volume (reps + sets)","more load","more complexity"]},
  {phase:3, src:"21.2", adaptations:["core strength","muscular strength and hypertrophy"], progressBy:["more volume","more load","more complexity"]},
  {phase:4, src:"21.2", adaptations:["core strength","maximal muscular strength"], progressBy:["more load","more sets"]},
  {phase:5, src:"21.2", adaptations:["core strength","maximal muscular strength","rate of force production"], progressBy:["faster tempo","more sets"]}
];

/* The daily template — the same in every phase; only variables and exercises change. */
var TEMPLATE={src:"21.2",
  sections:[
    {order:1, id:"warm_up", is:"flexibility (by assessment) plus optional cardio 5–10 min", rule:"static stretching only on overactive tissue"},
    {order:2, id:"activation", is:"core and balance work — strengthen the underactive muscles after the flexibility work calmed the overactive ones",
      alt:"those trained in corrective exercise may substitute isolated strengthening"},
    {order:3, id:"skill_development", optional:true, is:"plyometrics and SAQ, or instruction — movement patterns, equipment, Olympic lifting or martial-arts technique",
      rule:"for learning new skills, not high-intensity work (e.g. a dowel before a barbell)", alsoCardio:"plyometrics and SAQ can replace steady-state cardio"},
    {order:4, id:"resistance_training", is:"phase-specific protocol"},
    {order:5, id:"clients_choice", is:"1–2 of the person's favourite exercises — any, if safe", why:"autonomy and self-efficacy build adherence"},
    {order:6, id:"cool_down", is:"5–10 min: optional cardio (slowing to a comfortable walk), then SMR, then static stretching of the same muscles",
      why:"reduces DOMS effects, speeds recovery, sets up the next session"}],
  cardio:{src:"SG.21", rule:"cardio can go in any section, or on its own"},
  timeShort:"not every section is needed when time is short — choose by goals, needs and abilities",
  forms:{src:"H.templates",
    session:{columns:["exercise","sets","reps","tempo","rest","notes"], rows:"the six sections, then coaching tips", header:["goal","phase","date (session n of the block)"]},
    annual:{grid:"12 months × 5 phases, grouped by level", purpose:"mark the phase for each month"},
    monthly:{grid:"4 weeks × 7 days × 5 phases", extraRows:["cardio","re-assessment"], purpose:"the day-by-day plan inside a month"},
    agentReading:"these map one-to-one onto Bunyan's plan screens: a session = TEMPLATE sections; a block = monthly grid; a year = annual grid"}
};

/* The source's fundamental patterns (Tables 21-4 to 21-8). Muscle names per MUSCLE_MAP. */
var MOVEMENT_PATTERNS=[
  {id:"squat", src:"21.3", muscles:["quadriceps","gluteus maximus","hamstring complex","gastrocnemius","soleus"], musclesNote:"the source: quadriceps, gluteal complex, hamstrings, calves",
    actions:"ankle, knee and hip flexion and extension", daily:["sit to stand","getting in and out of a car","climbing stairs"],
    exercises:["back squat","front squat","overhead squat","leg press","step-up"],
    technique:["feet straight ahead; no overpronation","knees over the second and third toes; no valgus","neutral pelvis and spine",
      "flex ankles and hips equally — torso parallel to the shins, weight shared by ankles, knees and hips","head and shoulders neutral"],
    why:"compound — endurance, hypertrophy, strength and power of quadriceps and glutes; technique protects knees and back"},
  {id:"hip_hinge", src:"21.3", muscles:["hamstring complex","gluteus maximus","lumbar extensors","abdominals"], actions:"hip flexion and extension, knees softly bent and nearly still",
    daily:["putting on trousers","lifting a box off the floor","cleaning","gardening"], exercises:["Romanian deadlift","back extension","good morning","kettlebell swing","Olympic lifts"],
    vsSquat:"the squat uses more ankle and knee motion; the hinge more hip motion", notSpinalFlexion:"the motion is at the hips, not a rounded spine",
    use:"barring orthopaedic limits, strengthens the anterior and posterior core and the hamstrings"},
  {id:"pull", src:"21.3", muscles:["latissimus dorsi","teres major","rhomboids","upper trapezius","middle trapezius","lower trapezius","biceps brachii","posterior deltoid"],
    musclesNote:"the source says trapezius (all parts)",
    actions:{shoulders:["scapular retraction","shoulder extension","horizontal abduction"], arms:["elbow flexion"]},
    daily:["opening doors","climbing","raking leaves"], exercises:["pull-up","chin-up","lat pulldown","row","cobra"],
    why:"balances front and back; can help correct rounded shoulders and forward head"},
  {id:"push", src:"21.3", muscles:["pectoralis major","anterior deltoid","triceps brachii"], roles:{prime:"chest", synergists:["triceps brachii","anterior deltoid"]},
    actions:{shoulders:["scapular protraction","shoulder flexion","horizontal adduction"], arms:["elbow extension"]},
    daily:["pushing a shopping cart","pushing a door open"], exercises:["push-up","bench press","dumbbell chest press","close-grip bench press","close-grip push-up"],
    tip:"push and pull can share a workout — alternating them is a different stimulus from separate days"},
  {id:"press", src:"21.3", muscles:["deltoids","upper trapezius","triceps brachii","rotator cuff"], musclesNote:"the source says trapezius",
    actions:"shoulder flexion with elbow extension — vertical",
    daily:["lifting objects overhead","reaching high shelves"], exercises:["dumbbell shoulder press","barbell shoulder press","push press","rotating dumbbell press"],
    note:"rotator cuff, deltoids and trapezius together control scapular motion; ensure a full, pain-free overhead range first"},
  {id:"multiplanar", src:"21.3", why:["daily life and sport use all three planes","most programmes over-favour sagittal and concentric work","many non-contact leg injuries are frontal or transverse"],
    rule:"include multiplanar exercises for transfer of training"},
  {id:"trunk_rotation", src:"SG.21", note:"the study guide adds trunk rotation to the phase 1 movement patterns"}
];

/* Per phase, per template section. RM = repetition maximum. Tempos: slow 4-2-1-1,
   moderate 2-0-2-0, explosive X-X-X-X. */
var PHASE_VARIABLES=[
  {phase:1, src:"21.3",
    warmUp:{smr:{muscleGroups:{min:1, max:3}, holdS:{min:30}}, static:{stretches:{min:1, max:3}, holdS:{min:30}, note:"usually the same muscles as SMR"},
      dynamic:{optional:true, sets:1, exercises:{min:3, max:10}, reps:{min:10, max:15}}, cardio:{optional:true, minutes:{min:5, max:10}, note:"unnecessary after a dynamic circuit"}},
    activation:{core:{exercises:{min:1, max:4}, reps:{min:12, max:20}, sets:{min:1, max:3}, tempo:"slow (4-2-1-1) or isometric", focus:"local core, little spinal motion — activate, not exhaust"},
      balance:{exercises:{min:1, max:4}, reps:{min:12, max:20}, repsPerLeg:{min:6, max:10}, sets:{min:1, max:3}, tempo:"slow", note:"balance equipment not required; an option for advanced clients"},
      textNote:"the balance paragraph says 'one and four core exercises' — read as balance exercises"},
    skill:{optional:true, plyometric:{exercises:{min:1, max:3}, reps:{min:5, max:8}, sets:{min:1, max:3}, holdLandingS:{min:3, max:5}},
      saq:{exercises:{min:1, max:3}, reps:{min:1, max:3}, sets:{min:1, max:3}, examples:["ladder drills","5-10-5","T-drill","box drill","modified box drill","LEFT drill"]}},
    resistance:{sets:{min:1, max:3}, reps:{min:12, max:20}, tempo:"slow (4-2-1-1)",
      rest:{src:"SG.21", s:{min:0, max:90}}, intensity:{src:"SG.21", rm:{min:12, max:20}},
      environment:"controlled, progressively unstable — standing or single-leg instead of bench or machine; instability client-specific"},
    progress:["more proprioceptive demand (machines → free weights; seated → standing → single-leg)","more volume (sets, reps)","more intensity (load, selection, planes)","less rest — by RPE"],
    clientsChoice:{exercises:{min:1, max:2}},
    coolDown:{minutes:{min:5, max:10}, order:["optional cardio","SMR — 1–3 muscle groups, at least 30 s per tender spot","static stretches — the same muscles"]}},
  {phase:2, src:"21.4",
    warmUp:{smr:{muscleGroups:{min:1, max:3}, holdS:{min:30}}, active:{stretches:{min:1, max:3}, reps:{min:5, max:10}, holdS:{min:1, max:2}},
      dynamic:{optional:true, sets:1, exercises:{min:3, max:10}, reps:{min:10, max:15}}, cardio:{optional:true, intensity:"low", minutes:{min:5, max:10}}},
    activation:{core:{exercises:{min:1, max:4}, reps:{min:8, max:12}, sets:{min:2, max:4}, tempo:"moderate (2-0-2-0)", focus:"dynamic flexion, extension, rotation"},
      balance:{exercises:{min:1, max:4}, reps:{min:8, max:12}, sets:{min:2, max:4}, tempo:"moderate", focus:"full-range movement of the balance leg"},
      discretion:"phase 1 core or balance exercises may stay if needed"},
    skill:{optional:true, plyometric:{exercises:{min:1, max:4}, reps:{min:8, max:12}, sets:{min:2, max:4}, style:"repeating — no landing hold"},
      saq:{exercises:{min:1, max:4}, reps:{min:3, max:5}, sets:{min:2, max:4}}, alt:"instruction in Olympic lifting, powerlifting or martial arts"},
    resistance:{supersetsPerBodyPart:{min:1, max:2}, reps:{min:8, max:12}, sets:{min:2, max:4},
      tempo:{strengthExercise:"moderate (2-0-2-0)", stabilityExercise:"slow (4-2-1-1)"}, tempoNote:"the text prints the slow tempo as '4-21-1' — a typo for 4-2-1-1",
      rest:{src:"SG.21", s:{min:0, max:60}, after:"each superset"}, intensity:{src:"SG.21", rm:{min:8, max:12}},
      supersets:[{strength:"bench press", stability:"push-up"},{strength:"machine chest press", stability:"single-leg cable press"},
        {strength:"machine lat pulldown", stability:"standing lat pulldown"},{strength:"machine cable row", stability:"standing cable row"},
        {strength:"machine shoulder press", stability:"standing kettlebell press held bottom-up"},{strength:"seated dumbbell shoulder press", stability:"single-leg dumbbell shoulder press"},
        {strength:"barbell squat", stability:"single-leg squat"},{strength:"Romanian deadlift", stability:"single-leg Romanian deadlift"},
        {strength:"machine calf raise", stability:"single-leg calf raise"}]},
    progress:["more instability","more volume","more intensity","less rest"],
    clientsChoice:{exercises:{min:1, max:2}}, coolDown:"as phase 1 — identical in all five phases"},
  {phase:3, src:"21.4", warmUp:"as phase 2", activation:"as phase 2", skill:"as phase 2",
    resistance:{sets:{min:3, max:6}, reps:{min:6, max:12}, repsOption:{min:12, max:20, when:"extra muscular endurance wanted"}, tempo:"moderate (2-0-2-0)",
      exercisesPerBodyPart:{min:2, max:4}, rest:{src:"SG.21", s:{min:0, max:180}}, intensity:{src:"SG.21", note:"not specified"}},
    use:"also preserves lean mass during weight loss",
    clientsChoice:{exercises:{min:1, max:2}}, coolDown:"as phase 1"},
  {phase:4, src:"21.4", warmUp:"as phase 2", activation:"as phase 2", skill:"as phase 2",
    resistance:{sets:{min:4, max:6, note:"more for advanced clients who need volume"}, reps:{min:1, max:5}, tempo:"explosive (X-X-X-X)",
      exercisesPerBodyPart:{min:2, max:4}, rest:{src:"SG.21", s:{min:0, max:180}}, intensity:{src:"SG.21", rm:{min:1, max:5}},
      note:"heavier loads → fewer reps and likely longer rest for ATP restoration"},
    for:"experienced lifters only — strength athletes and those seeking hypertrophy",
    clientsChoice:{exercises:{min:1, max:2}}, coolDown:"as phase 1"},
  {phase:5, src:"21.5",
    warmUp:{smr:{muscleGroups:{min:1, max:3}, holdS:{min:30}}, dynamic:{exercises:{min:3, max:10}, reps:{min:10, max:15}},
      cardio:"not needed — dynamic stretching is the specific warm-up", staticOrActive:"only if mobility is limited or imbalances exist, before the dynamic stretches"},
    activation:{optional:true, core:{exercises:{min:1, max:2}, reps:{min:8, max:12}, sets:{min:1, max:3}, tempo:"explosive"},
      balance:{style:"hop to a single-leg landing", holdLandingS:{min:3, max:5}}, why:"most of this work happens in the resistance section"},
    skill:{optional:true, plyometric:{exercises:{min:1, max:4}, reps:{min:8, max:12}, sets:{min:3, max:5}, style:"explosive"}},
    resistance:{src:"SG.21", method:"superset a heavy strength exercise with an explosive exercise of similar motion",
      sets:{min:3, max:5}, reps:{strength:{min:1, max:5}, power:{min:8, max:10}}, tempo:"explosive",
      rest:{betweenPairsS:{min:60, max:120}, betweenCircuitsS:{min:180, max:300}},
      intensity:{strength:{rm:{min:1, max:5}, pct1RM:{min:85, max:100}}, power:{rm:{min:8, max:10}, pct1RM:{min:30, max:45}}},
      intensityAlsoIn:"21.5 text — heavy 85–100% (1–5RM) and light 30–45% (8–10RM) at high speed",
      strengthExercises:["bench press","machine chest press","machine lat pulldown","machine cable row","machine shoulder press","seated dumbbell shoulder press","barbell squat","Romanian deadlift"],
      powerExercises:["medicine ball chest pass","plyometric push-up","medicine ball soccer throw","medicine ball pullover throw","front medicine ball oblique throw","overhead medicine ball throw","squat jump","tuck jump"],
      pairingNote:"the study guide's two columns are not aligned row by row, so they are kept as lists; the 13.3 examples give confirmed pairs",
      gap:"the textbook's own phase 5 resistance paragraph and its synopsis table are absent (gap 9); these values come from the study guide"},
    clientsChoice:{exercises:{min:1, max:2}}, coolDown:"as phase 1"}
];
var PHASE_VARIABLES_NOTE={src:"21.3",
  synopsisTables:"Tables 21-9 and 21-11 to 21-14 (one per phase) are not in the textbook PDF (gap 9); the textbook's text values were cross-checked against the study guide's copies, which agree",
  cardioAnywhere:"cardio is not in the synopses — it can go anywhere in a workout or separately"
};

/* Worked phase-1 sessions from the sample-programme handouts — how PHASE_VARIABLES turn
   into real sessions and progress. Client details and layout omitted. Activation and
   resistance are each done as a mini circuit: no rest inside, about 90 s after. */
var SAMPLE_SESSIONS={src:"H.programs",
  confidence:"medium on exact rest placement — the handout columns are unaligned; the circuit rule is stated on every sheet",
  common:{warmUp:["SMR calves, adductors, latissimus dorsi — 1 × 30 s per tender spot","static stretch, same muscles — 1 × 30 s","cardio 5 min brisk walk or slow jog"],
    coolDown:["cardio 5 min, gradually slowing","SMR, same muscles","static stretch, same muscles"], circuits:"activation and resistance as two mini circuits"},
  fatLoss:[
    {session:1, of:12, activation:{exercises:["floor bridge","floor cobra","single-leg balance reach (frontal plane, 8 each leg)"], sets:1, reps:{core:15, balance:16}, tempo:"slow"},
      resistance:{byPattern:{squat:"ball squat", hinge:"bodyweight good morning", push:"incline push-up (wall, bench or chair)", pull:"standing tubing row", press:"standing tubing shoulder press"}, sets:1, reps:20, tempo:"slow"},
      clientsChoice:"plank, 30 s hold"},
    {session:2, of:12, activation:{exercises:["ball bridge","ball cobra","single-leg hip rotation (8 each leg)"], sets:1, reps:{core:15, balance:16}, tempo:"slow"},
      resistance:{byPattern:{squat:"bodyweight squat", hinge:"Romanian deadlift (light or bodyweight)", push:"standing tubing chest press", pull:"inverted row (Smith machine or another sturdy bar)", press:"standing dumbbell shoulder press"}, sets:1, reps:20, tempo:"slow"},
      clientsChoice:"side plank, 30 s each side"},
    {session:3, of:12, activation:{exercises:["bird dog (8 each side)","Pallof press (8 each side)","single-leg lift and chop (8 each leg)"], sets:1, reps:16, tempo:"slow"},
      skill:{plyometric:"squat jump with stabilisation", sets:1, reps:8, holdLandingS:{min:3, max:5}},
      resistance:{byPart:{totalBody:"ball squat, curl to press", chest:"standing cable chest press", back:"standing cable row", shoulders:"standing dumbbell scaption", legs:"step-up to balance"}, sets:2, reps:15, tempo:"slow"},
      clientsChoice:"floor bridge"},
    {session:4, of:12, activation:{exercises:["plank","side plank","single-leg arm and leg motion (8 each leg)"], sets:2, tempo:"slow"},
      skill:{plyometric:{exercise:"box jump-up with stabilisation", sets:2, reps:8}, saq:{exercise:"speed ladder — one-ins, two-ins, side shuffle", sets:2, tempo:"moderate"}},
      resistance:{byPart:{totalBody:"step-up, balance, curl to press", chest:"push-up (modified if needed)", back:"ball cobra", shoulders:"single-leg dumbbell scaption", legs:"lunge to balance"}, sets:2, reps:15, tempo:"slow"},
      clientsChoice:"elliptical, moderate, about 10 min"}],
  fatLossProgression:["sessions 1–2: one set of 20 by movement pattern; 3–4: two sets of 15 by body part",
    "activation moves from floor to ball to anti-rotation to planks","skill work enters at session 3 (plyometric) and 4 (plyometric + SAQ)"],
  performance:[
    {session:1, of:12, warmUp:{smrAndStatic:["calves","adductors","tensor fasciae latae","latissimus dorsi"], dynamic:{exercises:["leg swings side to side","leg swings front to back","tube walking side to side"], sets:1, reps:10, tempo:"moderate"}, cardio:"none"},
      activation:{exercises:["ball bridge","ball cobra","single-leg hip rotation"], sets:1, reps:{core:15, balance:16}, tempo:"slow"},
      skill:{plyometric:{exercise:"squat jump with stabilisation", sets:1, reps:8}, saq:{exercises:["5-10-5 drill","box drill"], sets:1, tempo:"moderate"}},
      resistance:{byPattern:{squat:"ball squat", hinge:"single-leg Romanian deadlift", push:"push-up with rotation", pull:"single-leg cable row", press:"single-leg dumbbell shoulder press"}, sets:2, reps:15, tempo:"slow"},
      clientsChoice:"plank", coolDown:"SMR and static stretch, same four muscles — no cardio"}],
  performanceNote:"more instability from session 1 (single-leg pull, press and hinge) and dynamic warm-up — the athlete starts higher in phase 1"
};

/* Goal plans (21.6). Only fat loss is in the PDF. */
var GOAL_PLANS=[
  {goal:"body_fat_reduction", src:"21.6", phases:[1,2,3], why:"no maximal strength or power needed",
    rationale:"spend more energy than eaten; resistance training keeps or adds lean mass, so more is burned in and out of sessions; plus strength",
    annual:[{months:"Jan", phase:1, note:"about 4 weeks — muscle balance and stabiliser endurance"},{months:"Feb", phase:2},{months:"Mar", phase:3},
      {months:"Apr–Jun", note:"the same 1 → 2 → 3 pattern repeats"},{months:"Jul–Dec", note:"undulating — all three phases each month, against boredom and to improve all three adaptations together"}]},
  {goal:"lean_body_mass", src:"21.6", missing:true, gap:"announced but absent from the PDF (gap 9) — not filled"},
  {goal:"general_performance", src:"21.6", missing:true, gap:"announced but absent from the PDF (gap 9) — not filled"}
];

export {meta, PRINCIPLES, COMPONENTS, LEVELS, PHASES, PROGRESSION, PERIODIZATION, PHASE_SUMMARY, TEMPLATE, MOVEMENT_PATTERNS, PHASE_VARIABLES, PHASE_VARIABLES_NOTE, SAMPLE_SESSIONS, GOAL_PLANS};
