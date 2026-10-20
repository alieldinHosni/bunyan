/* Bunyan — knowledge: corrective
   The correction sequence (inhibit → lengthen → activate → integrate) and the flexibility
   science behind it: what flexibility is, why imbalances form, and each technique's
   mechanism, prescription, precautions and contraindications. Overactive muscles come
   from imbalances.js; per-exercise cues live in cues.js. Leaf data. */

var meta={
  covers:"Flexibility science, flexibility techniques and the corrective sequence",
  derivedFrom:"certification curriculum",
  sections:["14.1","14.2","14.3","14.4","14.5","14.6","14.7","SG.14","21.2","21.3"],
  muscleNames:"anatomy.js MUSCLE_MAP",
  status:"complete — the four-stage sequence is filled from the 21.2–21.3 template",
  confidence:"high unless an entry says otherwise"
};

/* What flexibility is and what limits it. */
var FLEXIBILITY={src:"14.1",
  first:"after assessment, the flexibility portion is the first part of the programme designed — used in warm-up and cool-down",
  flexibility:"normal extensibility of all soft tissue (contractile and non-contractile) allowing a joint's full range",
  rangeSetBy:["joint type (e.g. ball-and-socket vs hinge)","extensibility of muscle and surrounding soft tissue"],
  mobility:"flexibility + joint range, with control through the whole range",
  factors:["genetics","myofascial elasticity","tendon and skin composition around the joint","joint structure","strength of opposing muscles",
    "body composition","sex","age","activity level","previous injury or medical issues","repetitive movement"],
  relativeFlexibility:{is:"altered movement — the body takes the path of least resistance",
    examples:[{seen:"squatting with feet turned far out and a wide stance", cause:"limited ankle dorsiflexion", why:"the stance cuts the dorsiflexion needed"},
      {seen:"overhead press with an arched low back", cause:"short latissimus dorsi limits shoulder flexion", why:"lumbar extension makes up the missing range"}],
    effect:"also stops the nervous system recruiting the right muscles in the right order"},
  multiplanar:{rule:"train extensibility in all three planes", examples:[
    {muscle:"latissimus dorsi", sagittal:"shoulder flexion", frontal:"shoulder abduction", transverse:"shoulder external rotation"},
    {muscle:"biceps femoris", sagittal:"hip flexion and knee extension", frontal:"hip adduction", transverse:"hip and knee internal rotation"},
    {muscle:"gastrocnemius", sagittal:"ankle dorsiflexion", frontal:"calcaneal inversion", transverse:"femoral internal rotation"}]}
};

/* How imbalance damages movement — the case for correcting it. anatomy.js MUSCULAR
   already holds reciprocal inhibition, length-tension and the receptors. */
var DYSFUNCTION={src:"14.2",
  kineticChain:{is:"muscular + skeletal + nervous systems", regions:{upper:["shoulder","elbow","wrist and hand"], lower:["hip","knee","ankle and foot"]},
    misaligned:"a misaligned segment produces predictable dysfunction — postural distortion patterns (imbalances.js PATTERNS)"},
  distortionLeadsTo:["muscle imbalance","altered force-couples","altered osteo- and arthrokinematics"],
  imbalanceCauses:["postural distortions","repetitive movement","cumulative trauma","emotional duress","poor training technique","poor body control","biased training patterns"],
  imbalanceLeadsTo:["altered reciprocal inhibition","synergistic dominance","osteo- and arthrokinematic dysfunction","injury"],
  alteredReciprocalInhibition:{is:"an overactive agonist reduces neural drive to its functional antagonist",
    examples:[{overactive:["hip flexor complex"], inhibits:["gluteus maximus","gluteus medius"]},
      {overactive:["pectoralis major","pectoralis minor"], inhibits:["rhomboids","middle trapezius","lower trapezius"], note:"protractors inhibit retractors"}],
    leadsTo:["altered force-couples","synergistic dominance","faulty movement","poor control","joint dysfunction"]},
  synergisticDominance:{is:"synergists take over for a weak or inhibited prime mover",
    example:{overactive:"hip flexor complex", inhibited:"gluteus maximus", takesOver:"hamstring complex", movement:"hip extension"},
    leadsTo:"faulty movement, soft-tissue and joint dysfunction, injury — e.g. hamstring strains"},
  jointDysfunction:{causes:["altered length-tension","altered force-couples","poor joint-surface motion"],
    needs:"good joint-surface motion plus soft-tissue flexibility",
    example:"knee valgus on a single-leg squat → less knee range, extra stress, likely imbalances and compensation at hip or ankle",
    risk:"poor exercise form is a risk factor for injury"},
  neuromuscularEfficiency:{is:"the nervous system recruiting the right muscles to produce, reduce and stabilise force in all three planes",
    example:{exercise:"lat pulldown", agonist:"latissimus dorsi", synergist:"rhomboids (scapular downward rotation)", stabiliser:"rotator cuff"},
    needs:"proper flexibility in all three planes"},
  autogenicInhibition:{is:"prolonged Golgi tendon organ stimulation inhibits the spindles of the same muscle — it relaxes",
    when:"the tension-sensing impulses exceed the contraction impulses"},
  romGains:["mechanical — muscle and tendon compliance","neural — central inhibition relaxes the muscle","psycho-physiological — stretch tolerance"],
  lengtheningReaction:{steps:[{order:1, step:"muscle lengthened; spindle senses it"},{order:2, step:"stretch reflex — muscle contracts"},
      {order:3, step:"held long enough, spindle firing drops and the muscle relaxes"}],
    usedBy:"static stretching — held long enough to override the spindle"},
  reciprocalInhibitionInStretching:"active and dynamic stretches use agonist activation to relax the antagonist",
  protections:{stretchReflex:"guards against overstretch", lengtheningReaction:"lets the muscle lengthen", reciprocalInhibition:"synchronises opposing muscles"}
};

/* Why people need flexibility work. */
var RATIONALE={src:"14.3",
  patternOverload:{is:"repeating the same motion until it stresses the body abnormally",
    examples:["baseball pitching","distance running","the same gym routine every session","loading-dock, factory, assembly-line, construction work","long computer sitting"]},
  cumulativeInjuryCycle:{steps:[{order:1, step:"tissue trauma from repetitive movement or poor posture"},{order:2, step:"inflammation"},
      {order:3, step:"pain response → protective muscle tension and microspasm"},{order:4, step:"adhesions form in the myofascia"},
      {order:5, step:"altered length-tension and force-couples, joint dysfunction"},{order:6, step:"structural change by Davis's law"}],
    adhesions:"a weak, inelastic matrix that reduces soft-tissue mobility",
    note:"these spasms are not like a calf cramp"},
  davisLaw:{rule:"soft tissue models along the lines of stress",
    detail:"it rebuilds with randomly laid collagen, not aligned with the fibres; without movement, lengthening and broadening this blocks mobility and causes relative flexibility"},
  purposes:["correct imbalances","increase joint range","improve muscle extensibility","improve neuromuscular efficiency"],
  target:{rule:"stretch only the muscles found overactive in assessment; strengthen the underactive ones",
    example:"lower crossed: the hip flexors are stretched; the hamstrings are already lengthened, so they are not"}
};

/* The four stage labels are the build spec's. The source never uses them, but its daily
   template (21.2–21.3) fixes the same order and names each step's technique: flexibility
   on overactive muscles, then core and balance work for the underactive ones, then
   resistance training of the movement patterns. Each stage cites the section that
   supplies it. Muscles come from imbalances.js (PATTERNS / MOVEMENT_FAULTS). */
var SEQUENCE=[
  {stage:1, id:"inhibit", src:"21.3", template:"warm_up", targets:"overactive muscles",
    technique:"self_myofascial", dose:"1–3 muscle groups, at least 30 s per tender spot (all phases)",
    why:"autogenic inhibition (14.4)", order:"before stretching — may make static stretching more effective (14.4)"},
  {stage:2, id:"lengthen", src:"21.3", template:"warm_up", targets:"the same overactive muscles",
    technique:{phase1:"static_stretch", phases2to4:"active_stretch", phase5:"dynamic_stretch (static or active first only if mobility is limited)"},
    dose:{static:"1–3 stretches × 30 s", active:"1–3 stretches × 5–10 reps, 1–2 s holds", dynamic:"3–10 drills × 10–15 reps"},
    why:"lengthening reaction (static) or reciprocal inhibition (active, dynamic) — 14.5–14.7"},
  {stage:3, id:"activate", src:"21.2", template:"activation", targets:"underactive muscles",
    technique:"core and balance exercises at the person's phase level (core.js, balance.js PROGRESSION)",
    dose:"phases.js PHASE_VARIABLES[phase].activation — e.g. phase 1: 1–4 exercises × 12–20 reps × 1–3 sets, slow",
    why:"re-establish joint alignment, stability and control after the overactive muscles are calmed",
    alt:"isolated strengthening may substitute for those trained in corrective exercise (21.2)"},
  {stage:4, id:"integrate", src:"21.2", template:"resistance_training", targets:"the whole movement pattern",
    technique:"resistance exercise of the five fundamental patterns at the person's phase (phases.js MOVEMENT_PATTERNS, PHASE_VARIABLES[phase].resistance)",
    why:"train the corrected pattern under load — stabilisation-focused first (20.6)"}
];
var SEQUENCE_NOTE={agentReading:"mapping the spec's four labels onto the source's template sections is Bunyan's reading; the order and techniques are the source's",
  confidence:"high on order and technique, medium on the labels",
  coolDown:"the cool-down repeats SMR and static stretching on the same overactive muscles (21.3)"};
var SEQUENCE_RULES=[
  {src:"14.4", rule:"self-myofascial rolling before stretching — it may make static stretching more effective"},
  {src:"14.4", rule:"self-myofascial rolling can also be used in the cool-down"}
];

var TECHNIQUES=[
  {id:"self_myofascial", name:"Self-myofascial rolling", src:"14.4", selfAdministrable:true,
    tools:["foam roller (most popular; many shapes, sizes, densities)","handheld roller","massage ball"],
    mechanism:"autogenic inhibition",
    effects:{mechanical:"compression may raise local blood flow and reduce myofascial restriction and adhesions",
      neural:"stimulating mechanoreceptors and pain receptors sends inhibitory signals — relaxation and pain blocking locally and nearby",
      knots:"gentle pressure on an adhesion realigns bundled fibres with the muscle or fascia"},
    prescription:{sets:{min:1, max:3}, holdTenderSpotS:{min:30}, note:"may take longer, depending on the person's ability to relax"},
    how:"find a tender spot and hold pressure on it",
    doms:{onset:{min:24, max:72, unit:"h"}, after:"strenuous exercise, especially heavy eccentric work",
      cause:"mild muscle-cell damage, like a grade 1 strain",
      signs:["pain","restricted movement","stiffness","less force","compensation at other joints"],
      rolling:"may override the soreness signal with other sensory input (a hypothesis)"},
    avoidRollingOver:["joints (knee, hip)","bony prominences (hip bone)","the lumbar spine","the cervical spine"],
    regions:[
      {region:"calves", note:"crossing the other leg on top adds pressure; roll the length of the muscle"},
      {region:"peroneals", note:"stacking the legs adds pressure; avoid the knee"},
      {region:"hamstrings", note:"seated, target leg straight, other knee bent; a massage ball is the progression"},
      {region:"quadriceps", note:"plank position; one or both legs; avoid the knee"},
      {region:"adductors", note:"roller perpendicular to the inner thigh; avoid the knee"},
      {region:"lateral thigh", note:"side-lying, top foot flat on the floor; can be too painful — use a handheld roller"},
      {region:"tensor fasciae latae", note:"small muscle, little movement; front-outside of the upper thigh below the pelvis"},
      {region:"piriformis", note:"sit on the roller, cross one foot over the other knee, lean into that hip"},
      {region:"thoracic spine", note:"bridge position, hands behind the head or arms crossed; for thoracic extension"},
      {region:"latissimus dorsi", note:"side-lying, bottom arm outstretched thumb up, roller under the armpit"}],
    precautions:{rule:"possibly unsafe — may be modified; get clearance from the supervising medical professional",
      example:"osteopenia → risk of bone injury → teach low-intensity static stretching instead",
      list:["hypertension (controlled)","osteopenia","pregnancy","diabetes","varicose veins","bony prominences","abnormal sensation (e.g. numbness)",
        "sensitivity to pressure","recent injury or surgery","unable to position the body or do the exercise correctly","young children","elderly",
        "scoliosis or spinal deformity","medications that alter sensation","fibromyalgia"],
      notExhaustive:"an unlisted condition → consult a physician first"},
    contraindications:{rule:"do not do it; consult a medical professional",
      either:"pregnancy, diabetes, varicose veins, recent injury or surgery and hypertension can be a precaution or a contraindication depending on status",
      list:["skin rash, open wounds, blisters, local inflammation, bruises, tumours","deep vein thrombosis","osteomyelitis","osteoporosis",
        "bone fracture or myositis ossificans","cancer or malignancy","uncontrolled hypertension","acute or severe heart, liver or kidney disease",
        "acute infection, fever or contagious condition","neurological loss or altered sensation","bleeding disorders","systemic conditions (e.g. diabetes)",
        "recent surgery or injury","connective-tissue disorders","peripheral vascular disease","blood-thinning or sensation-altering medication",
        "pressure over a surgical site or hardware","chronic conditions (e.g. rheumatoid arthritis)","pressure over face, eyes, arteries, veins or nerves",
        "pregnancy (consult a physician)","severe scoliosis or spinal deformity","extreme discomfort or pain"]}},
  {id:"static_stretch", name:"Static stretching", src:"14.5", selfAdministrable:true,
    what:"passively take a muscle to tension and hold — low force, long duration",
    mechanism:["stretch tolerance","reciprocal inhibition — if the antagonist is contracted during the hold"],
    howItWorks:"a long hold inhibits the spindle, the muscle relaxes and lengthens better (DYSFUNCTION.lengtheningReaction)",
    antagonistTrick:[{stretch:"kneeling hip flexor", contract:"gluteus maximus", relaxes:["psoas","rectus femoris"]},
      {stretch:"hamstring", contract:"quadriceps", relaxes:["hamstring complex"]}],
    prescription:{sets:{min:1, max:3}, holdS:30},
    use:"calm overactive muscles before and after activity",
    rules:["hold 30 seconds","only muscles found overactive in assessment","follow with more warm-up — low-intensity core and balance work or dynamic stretching — to restore motor-neuron excitability"],
    performance:{impairs:"acute, isolated holds — especially 2 minutes or longer — done now and then as the only thing before maximal sprinting or jumping temporarily reduce power",
      fine:"holds of 30 s or less done habitually before every workout and followed by dynamic activity do not impair performance",
      recommend:"especially for limited joint range or muscle imbalances"},
    overstretching:{cause:"taking muscle and joint past physiological limits; aggressive stretching can injure tissue and joints",
      signs:["joint pain or muscle soreness lasting more than 24 hours after stretching","swelling or inflammation of the area","excessive pain during the stretch"],
      caution:"current or past joint or muscle injury",
      intensity:"a mild stretch; never pain or extreme discomfort"},
    stretches:[
      {id:"static_gastrocnemius", target:["gastrocnemius"], points:["lunge stance, both feet straight ahead","rear heel stays down","shift forward until the rear calf stretches"]},
      {id:"static_soleus", target:["soleus"], points:["as the gastrocnemius stretch, but the back knee slightly bent"]},
      {id:"static_90_90_hamstring", target:["hamstring complex"], points:["supine, target hip at 90°, other leg flat","straighten the target knee to a mild stretch","a rope or band helps"]},
      {id:"static_supine_biceps_femoris", target:["biceps femoris"], points:["supine, hip at 90°, bring the leg across the body and straighten the knee","both shoulders stay down; no torso rotation toward the leg"]},
      {id:"static_standing_biceps_femoris", target:["biceps femoris"], points:["one foot on a low box, leg adducted and internally rotated","hands together, rotate the torso the opposite way","no need to go above hip height"]},
      {id:"static_seated_ball_adductor", target:["adductors"], points:["on a stability ball in a lateral-lunge position","tuck the pelvis (posterior tilt) and draw in"]},
      {id:"static_standing_adductor", target:["adductors"], points:["wide stance, shift to one side","tuck the pelvis and draw in"]},
      {id:"static_adductor_magnus", target:["adductor magnus"], points:["one foot on a bench or box, reach down","no excessive spinal rounding"]},
      {id:"static_standing_tfl", target:["tensor fasciae latae"], points:["staggered stance, front knee soft, rear leg straight and foot turned out","draw in, tuck the pelvis, squeeze the glute on the stretched side"],
        progression:"reach the same-side arm up and over to the opposite side, keeping the pelvis still"},
      {id:"static_kneeling_hip_flexor", target:["hip flexor complex"], points:["half-kneeling, both knees at 90°","draw in, tuck the pelvis, squeeze the glute on the stretched side"],
        progression:"arm up and over, then rotate slowly backward",
        emphasis:{"tensor fasciae latae":"turn the rear leg out", psoas:"turn the rear leg in"}},
      {id:"static_supine_piriformis", target:["piriformis"], points:["supine, cross one leg over the straight one","low back neutral; knee toward the opposite shoulder"]},
      {id:"static_erector_spinae", target:["erector spinae"], points:["seated, one leg crossed over the straight one","rotate toward the crossed leg's side"]},
      {id:"static_ball_lat", target:["latissimus dorsi"], points:["kneeling on all fours, one arm on a stability ball, roll forward","tuck the pelvis, thumb up, draw in"]},
      {id:"static_pectoral", target:["pectoralis major","pectoralis minor"], points:["arm in a 90/90 position, lean forward","no shrugging"]},
      {id:"static_upper_trap_scalene", target:["upper trapezius","scalenes"], points:["hand on top of the head, tilt the ear toward the same shoulder","chin not forward, no shrug"]},
      {id:"static_levator_scapulae", target:["levator scapulae"], points:["as the upper-trap stretch, then turn to look into the armpit","chin not forward, no shrug"]},
      {id:"static_sternocleidomastoid", target:["sternocleidomastoid"], points:["as the upper-trap stretch, then rotate the head up and away","mild tension only; chin not forward, no shrug"]}]},
  {id:"active_stretch", name:"Active stretching", src:"14.6", selfAdministrable:true,
    what:"agonists and synergists actively move the joint into its range",
    mechanism:"reciprocal inhibition — raises motor-neuron excitability",
    example:{stretch:"active supine hamstring", contract:"quadriceps", effect:["lengthens the hamstrings","reciprocally inhibits the hamstring complex so it elongates"]},
    prescription:{sets:{min:1, max:3}, holdS:{min:1, max:2}, reps:{min:5, max:10}},
    use:"pre-activity warm-up — before sport or high-intensity exercise",
    order:"with imbalances: after self-myofascial rolling and static stretching of the overactive muscles",
    progressionOf:"static_stretch — same positions, short holds repeated",
    posture:{rule:"keep ideal posture in static and active stretches", how:["chin tuck, head over the shoulders, no forward head","drawing-in manoeuvre — pull the navel slightly in (chapter 16)"]},
    stretches:[
      {id:"active_gastrocnemius", target:["gastrocnemius"], points:["back leg straight (the target)","swing the other leg back and forth across the body — rotates the back knee and rolls the foot in and out"]},
      {id:"active_soleus", target:["soleus"], points:["as the active gastrocnemius stretch with the back knee slightly bent"]}],
    sameAsStatic:["static_90_90_hamstring","static_supine_biceps_femoris","static_standing_adductor","static_seated_ball_adductor","static_adductor_magnus",
      "static_standing_tfl","static_kneeling_hip_flexor","static_ball_lat","static_pectoral","static_upper_trap_scalene","static_levator_scapulae","static_sternocleidomastoid"],
    sameAsStaticNote:"positions as the static versions, done for reps with 1–2 s holds"},
  {id:"dynamic_stretch", name:"Dynamic stretching", src:"14.7", selfAdministrable:true,
    what:"muscle force and momentum take a joint through its full available range",
    mechanism:"reciprocal inhibition",
    prescription:{sets:1, reps:{min:10, max:15}, exercises:{min:3, max:10}},
    prescriptionConflict:"the text says one set of 10 reps; the summary table says 1 set of 10–15; the study guide says 1–3 sets of 5–10 — all three recorded, the table used",
    studyGuide:{src:"SG.14", sets:{min:1, max:3}, reps:{min:5, max:10}, exercises:{min:3, max:10}},
    confidence:"medium on reps",
    use:"warm-up before athletic activity; mimic the session's movements — e.g. push-ups before bench press, leg swings before squats",
    order:"with imbalances: self-myofascial rolling and static stretching of the overactive muscles first",
    readiness:"good tissue extensibility, core stability and balance before an aggressive dynamic programme",
    dose:"prepare without undue fatigue — no breathlessness or exhaustion",
    stretches:[
      {id:"prisoner_squat", points:["hands behind the head, feet about shoulder width, bodyweight squat"], progression:"add a calf raise at the top"},
      {id:"multiplanar_lunge_reach", points:["lunge forward, to the side and turning — all three planes"]},
      {id:"lunge_rotation", points:["forward lunge, rotate the trunk toward the front leg's outside"], load:"optional medicine ball"},
      {id:"tube_walk_side", target:["gluteus medius"], points:["band around the knees, quarter squat, side-step","knees over the second and third toes; no caving in"], progression:"band at the ankles"},
      {id:"leg_swing_front_back", points:["controlled pendulum swing, only as high as you can control","tall posture, abdominals drawn in"]},
      {id:"leg_swing_side", points:["controlled side-to-side pendulum swing","tall posture, abdominals drawn in"]},
      {id:"frankenstein_walk", target:["hamstring complex"], points:["walk forward, arms out in front; kick each leg only as high as controlled","neutral back, no leaning sideways"]},
      {id:"high_knee_walk", points:["walk, pulling each knee up with both hands","pause at the top; switch legs each step"]},
      {id:"push_up_rotation", points:["push-up, rotate the trunk at the top","draw in, chin tucked, spine neutral"]},
      {id:"ball_russian_twist", target:["internal obliques","external obliques","gluteus maximus"], points:["bridge on a stability ball and rotate the trunk"], load:"optional medicine ball"},
      {id:"arm_circles", points:["both directions, slow to moderate speed"]},
      {id:"jumping_jacks", points:["only enough to raise heart rate and breathing slightly"]},
      {id:"jump_rope", points:["movements the person can do safely","low to moderate intensity in a warm-up"]}]}
];

/* How the techniques combine. */
var COMBINING={src:"14.7",
  findings:["static plus dynamic stretching reduces muscle-injury risk and raises flexibility without harming performance — suits warm-up and cool-down",
    "short bouts of self-myofascial rolling raise flexibility and pre-exercise performance and reduce post-exercise soreness and fatigue"],
  order:"self-myofascial rolling and static stretching before active or dynamic stretching, to address restricted range first",
  rule:"combine interventions to meet the person's needs"
};

/* Stretches with an injury risk. Most clients have safer alternatives. */
var CONTROVERSIAL={src:"14.7",
  rule:"most stretches are safe with good posture and technique; these few carry risk — use safer positions for the same muscles",
  exception:"some athletes need the position for their sport (hurdling, martial arts, gymnastics, yoga)",
  educate:"teach stretching technique and posture; choose the safest exercise that meets the goal",
  list:[
    {id:"inverted_hurdler", stress:["medial collateral ligament","patella"], avoid:["history of knee or low-back pain or injury"], general:"not for most patients or general-wellness clients"},
    {id:"plow", stress:["neck","spine"], why:"inverted — head below hips; risky without exact technique", avoid:["history of neck or back injury","hypertension"]},
    {id:"shoulder_stand", stress:["neck","shoulders","spine"], why:"inverted", avoid:["hypertension","history of neck or spine injury","inexact technique"]},
    {id:"straight_leg_toe_touch", stress:["lumbar vertebrae and discs","knee ligaments if the knees hyperextend"], avoid:["history of herniated discs","nerve pain down the back of the leg"]},
    {id:"arching_quadriceps", stress:["patella and front-of-knee tissues — compression may damage cartilage"], avoid:["history of knee injury"], general:"most healthcare professionals discourage it for everyone"}],
  agentReading:"Bunyan never suggests these. The library's 'Standing Toe Touches' matches the straight-leg toe touch — flagged in open question 15"
};

export {meta, FLEXIBILITY, DYSFUNCTION, RATIONALE, SEQUENCE, SEQUENCE_NOTE, SEQUENCE_RULES, TECHNIQUES, COMBINING, CONTROVERSIAL};
