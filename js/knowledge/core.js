/* Bunyan — knowledge: core
   Core training: what the core is, local vs global muscles, why it is trained, the
   drawing-in manoeuvre and bracing, programme variables, the three-level progression
   with its exercises, and each exercise's safety point. Muscle names per anatomy.js
   MUSCLE_MAP; per-exercise cues in cues.js. Per-phase sets and reps come with the
   programming chapter (21). Leaf data. */

var meta={
  covers:"Core training concepts, progressions and exercises",
  derivedFrom:"certification curriculum",
  sections:["16.1","16.2","16.3","16.4","SG.16"],
  muscleNames:"anatomy.js MUSCLE_MAP",
  schema:"new file — core, balance and plyometric chapters each carry their own progression system",
  confidence:"high unless an entry says otherwise"
};

var BASICS={src:"16.1",
  why:["posture","performance","injury resistance","faster rehabilitation"],
  objective:"core stability, endurance, strength and power",
  definitions:{stabilityAndEndurance:"holding spinal and hip posture while the arms and legs move",
    strength:"contracting the torso in every direction — flexion, extension, rotation",
    power:"explosive movement of the core muscles"},
  lphc:{is:"the core — the lumbo-pelvic-hip complex",
    bounds:{top:"diaphragm", front:"abdominals", sides:"abdominals", back:"lumbar spine and glutes", bottom:"pelvic floor and hip muscles"},
    simply:"the body's centre of gravity — abdominals, hips, glutes, low back"},
  needs:"optimal length-tension and force-couple relationships plus coordinated joint motion",
  local:{where:"on or near the vertebrae; short, one or two segments",
    does:"dynamic control of each segment — limits compression, shear and rotation; spares discs and ligaments",
    fibres:"mostly type I, dense in spindles — spinal proprioception",
    muscles:[{muscle:"rotatores", action:"stabilise and rotate spinal segments"},{muscle:"multifidus", action:"stabilise, extend and rotate the spine"},
      {muscle:"transversus abdominis", action:"raise intra-abdominal pressure"},{muscle:"diaphragm", action:"regulate inspiration"},
      {muscle:"pelvic floor", action:"support the pelvic contents"},{muscle:"quadratus lumborum", action:"spinal lateral flexion; pelvic elevation"}]},
  global:{where:"more superficial",
    does:"move the trunk, transfer load between upper and lower body, stabilise several segments as a unit; concentric force and eccentric deceleration",
    muscles:[{muscle:"rectus abdominis", action:"trunk flexion, rotation, lateral flexion"},
      {muscle:"external obliques", action:"spinal flexion, lateral flexion, contralateral rotation"},
      {muscle:"internal obliques", action:"spinal flexion, lateral flexion, ipsilateral rotation"},
      {muscle:"erector spinae", action:"trunk extension, rotation, lateral flexion"},
      {muscle:"latissimus dorsi", action:"trunk rotation (plus shoulder extension, adduction, internal rotation)"},
      {muscle:"psoas", action:"hip flexion (plus hip adduction and external rotation)", note:"the source names the iliopsoas (iliacus + psoas)"}],
    alsoNamed:["gluteus maximus","hip flexor complex"],
    note:"the source lists internal obliques as a global muscle in Table 16-1 although chapter 7 counts them among the deep stabilisers"},
  rules:[
    {rule:"activate the local muscles before the limbs move — limits poor spinal loading and injury", critical:true},
    {rule:"local dysfunction can coexist with strong global muscles — every core programme still trains the local muscles"},
    {rule:"global muscles alone do not stabilise the LPHC; it takes both systems together"},
    {rule:"train from the inside out — local before global; be stable to move efficiently"}]
};

var RATIONALE={src:"16.2",
  posture:{curves:{lordotic:["cervical","lumbar"], kyphotic:["thoracic","sacral"], why:"distribute energy through the spine; core balance keeps them"},
    anteriorTilt:{overactive:["hip flexor complex","erector spinae"], underactive:["abdominals"], leadsTo:"more lumbar lordosis", note:"the source says superficial erector spinae"},
    posteriorTilt:{overactive:["hamstring complex","rectus abdominis"], underactive:["erector spinae"]},
    scoliosis:{structural:"altered bone shape", functional:"left/right muscle imbalance — core strengthening improves alignment"},
    pelvis:"gluteus medius keeps the pelvis level; its weakness is common in low-back pain and should be addressed",
    lbpLink:"it is unclear whether bad posture causes low-back pain or the reverse",
    form:"keep good form in exercise and daily life",
    findings:["core work can improve trunk and low-back posture and body awareness","with cervical stability work it can relieve neck pain and build strength and endurance",
      "position matters — the deep abdominals were most active standing (vs sitting, kneeling) in breathing tasks","single-leg stance with elastic resistance gave the highest core activation",
      "core training improves abdominal and back strength and low-back motor control"]},
  performance:{role:"a base for transmitting force to the legs and generating it for the arms",
    findings:["core muscles fire before leg movement","core stability and strength go with leg strength, vertical-jump take-off velocity and maximal squat",
      "linked to speed, kicking, dynamic balance, jump distance","core fatigue alters cycling mechanics and lowers shoulder strength",
      "trunk movement precedes arm movement; core strength raises shoulder strength","glute strength and sling-based core work improve throwing",
      "core work improved 50 m swim sprints"]},
  injury:{findings:["low postural control, hip strength and core endurance predicted overuse injuries over 1.5 years","core work improves balance and helps prevent falls",
      "core stability is part of ACL-prevention programmes; trunk control on landing protects the knee",
      "4 weeks of core stability cut knee landing forces as much as 4 weeks of plyometrics"]},
  rehabilitation:{lbp:"one of the leading causes of disability worldwide",
    underactiveInChronicLbp:["transversus abdominis","internal obliques","pelvic floor","multifidus","diaphragm","gluteus maximus","erector spinae"],
    underactiveNote:"the source says gluteal complex and deep erector spinae",
    evidence:["core exercise improves outcomes in low-back pain (meta-analysis, over 2,400 people)","stabilisation restores multifidus size, activation and endurance",
      "adding core stability to usual rehab improves pain"],
    scope:"trainers do not diagnose or rehabilitate — work alongside healthcare providers (scope.js)",
    hyperextensionRisk:"hyperextension exercises without lumbar stabilisation raise disc pressure dangerously and can damage spinal ligaments and narrow the nerve openings",
    rule:"strengthen the local stabilisers before or alongside the global movers"}
};

var ACTIVATION=[
  {id:"drawing_in", src:"16.2", name:"Drawing-in manoeuvre",
    how:["pull the area just below the navel toward the spine","keep the neck neutral"],
    effect:["more transversus abdominis and pelvic-stabiliser activity when done before movement","tenses the thoracolumbar fascia (spinal stiffness)","compresses the sacroiliac joint (stability)"],
    evidence:"transversus abdominis activation improves within 4 weeks, with or without low-back pain",
    fault:{sign:"head pokes forward", meaning:"sternocleidomastoid takes over; its upper-neck extension makes the pelvis tilt forward to level the eyes → imbalance, less pelvic stability"},
    neutralSpine:"keeping the natural curves during core work helps posture, balance and stabilisation"},
  {id:"bracing", src:"16.2", name:"Abdominal bracing",
    how:"consciously co-contract the global muscles — 'bearing down'", muscles:["rectus abdominis","external obliques"],
    effect:"global trunk stability, not just segmental",
    evidence:"endurance of local and global muscles contracted together helps low-back pain more than range-of-motion training alone; bracing raised global abdominal activity in a single-leg squat more than hollowing"},
  {id:"both", src:"16.2", rule:"use drawing-in and bracing together to retrain strength, endurance and motor control of both systems"}
];

var GUIDELINES={src:"16.3",
  programme:["systematic","progressive","functional","the full muscle-action spectrum — concentric, eccentric, isometric"],
  vary:{planes:["sagittal","frontal","transverse"], volume:{sets:["low","moderate","high"], reps:["low","moderate","high"]},
    range:["full","partial","end range"], progression:["little or no spinal motion","controlled spinal flexion, extension, rotation","explosive trunk movement"],
    speed:["slow","medium","fast","explosive"], resistance:["bodyweight","light","medium","heavy"],
    equipment:["tubing","cables","medicine balls","free weights","balance equipment (foam pad, wobble board, balance disc)"]},
  environment:{rule:"start in a proprioceptively enriched, controlled but unstable setting", evidence:"unstable surfaces (e.g. stability ball) raise local and global activation",
    exercises:"safe, challenging, multiplanar, multisensory, built on the activity's fundamental movements"},
  weightBelts:{rule:"not recommended for healthy adults in moderate programmes",
    why:["may raise heart rate and systolic BP","false security and the belief heavier loads are safe"], instead:"teach technique and the body's own belt — the core"},
  design:{goal:"stability, endurance, strength, power",
    priorities:["proprioceptive demand and varied tools over external load","quality over quantity","coordinated movement across the chain","neural adaptation over absolute strength"],
    start:"at the highest level the person can hold stability and coordinated movement",
    progressWhen:"the level is mastered with intervertebral and lumbopelvic stability",
    tests:{intervertebral:"holds the drawing-in position during exercises", lumbopelvic:"squats, lunges and step-ups without excess spinal motion"},
    outcomes:[{order:1, outcome:"intervertebral stability"},{order:2, outcome:"lumbopelvic stability"},{order:3, outcome:"movement efficiency"}]},
  oneAtATime:{src:"SG.16", rule:"do not change too many variables at once when progressing, so mastery is shown at each stage"},
  findings:["core training helps patellofemoral pain rehab","improves landing mechanics in jumpers","with mobility and posture guidance it reduced low-back pain and disability",
    "core plus non-dominant-arm strength improved golf drive distance"]
};

/* Three levels. Exercise ids are the source's names; library ids are in cues.js. */
var PROGRESSION=[
  {level:1, id:"stabilization", src:"16.3", focus:"stabilise spine and pelvis without gross trunk movement — neuromuscular efficiency, intervertebral stability",
    activation:"draw in, then brace", targets:"mostly the local muscles",
    exercises:["marching","floor bridge","ball bridge","floor cobra","ball cobra","fire hydrant","plank","side plank","dead bug","bird dog","Pallof press","farmer's carry"]},
  {level:2, id:"strength", src:"16.3", focus:"dynamic concentric and eccentric spinal flexion, extension and rotation through full range — lumbopelvic stability, strength, coordination",
    tempo:"moderate to fast", check:"ask the healthcare provider about conditions that rule out certain exercises",
    exercises:["floor crunch","ball crunch","back extension","reverse crunch","knee-up","cable rotation","cable lift","cable chop"]},
  {level:3, id:"power", src:"16.3", focus:"rate of force production and efficiency at explosive, functional speeds",
    exercises:["medicine ball rotation chest pass","ball medicine ball pullover throw","front medicine ball oblique throw","side medicine ball oblique throw",
      "medicine ball soccer throw","medicine ball woodchop throw","medicine ball overhead throw"],
    exercisesNote:"the exercise pages show a back-extension throw where the list names an overhead throw — both recorded"}
];

/* Monitored in every exercise. */
var CHECKPOINTS={src:"16.3",
  rule:"master form before adding quantity or load; attention to technique matters more as exercises get explosive",
  list:[{order:1, point:"feet", ideal:"about shoulder width, pointing straight ahead (when appropriate)"},
    {order:2, point:"knees", ideal:"over the second and third toes — no caving in"},
    {order:3, point:"hips", ideal:"level and neutral"},
    {order:4, point:"shoulders", ideal:"neutral — not protracted or elevated"},
    {order:5, point:"head", ideal:"neck neutral (chin tuck)"}]
};

/* Each exercise's key point, in Bunyan's words. */
var EXERCISES=[
  {id:"marching", src:"16.4", level:1, point:"keep drawn in throughout — a bulging belly means the local core is not working"},
  {id:"floor_bridge", src:"16.4", level:1, targets:["gluteus maximus"], targetsNote:"the source says the glutes are fully contracted at the top", safety:"do not lift so high the low back hyperextends", end:"knees, hips and shoulders in line, glutes fully contracted"},
  {id:"ball_bridge", src:"16.4", level:1, point:"head and shoulders rest on the ball", safety:"no low-back hyperextension"},
  {id:"floor_cobra", src:"16.4", level:1, agentReading:"the stated focus (retract and depress the shoulder blades) is the work of the middle and lower trapezius and rhomboids — Bunyan's reading, not a source statement; used to pick activation work for the upper-crossed and shoulders-elevate findings", safety:"do not come up so far the low back hyperextends", point:"retract and depress the shoulder blades; arms externally rotated, thumbs up"},
  {id:"ball_cobra", src:"16.4", level:1, point:"as the floor cobra; feet against something sturdy"},
  {id:"fire_hydrant", src:"16.4", level:1, point:"drawn in, head neutral", targets:["hip external rotators"]},
  {id:"plank", src:"16.4", level:1, regressions:["push-up position","push-up position on the knees","hands on a bench, feet on the floor"]},
  {id:"side_plank", src:"16.4", level:1, point:"checkpoints aligned; the pelvis must not sag", targets:["transversus abdominis"]},
  {id:"dead_bug", src:"16.4", level:1, point:"neutral spine and core on throughout; coordination takes practice", targets:["local core"]},
  {id:"bird_dog", src:"16.4", level:1, point:"neutral spine, thumbs up; no low-back arch"},
  {id:"pallof_press", src:"16.4", level:1, point:"anti-rotation — hips and shoulders square, all five checkpoints", targets:["local core"]},
  {id:"farmers_carry", src:"16.4", level:1, point:"brace; no rotation or side-bending; stay upright", note:"advanced, depending on load"},
  {id:"floor_crunch", src:"16.4", level:2, point:"lift only the shoulder blades — not a full sit-up; less hip flexor, likely safer for the low back"},
  {id:"ball_crunch", src:"16.4", level:2, safety:"chin tucked to unload the neck"},
  {id:"back_extension", src:"16.4", level:2, safety:"end with ankles, knees, hips, shoulders and ears in line; no low-back hyperextension"},
  {id:"reverse_crunch", src:"16.4", level:2, point:"no leg swing — the legs stay fixed; momentum adds risk and removes effect"},
  {id:"knee_up", src:"16.4", level:2, point:"like the reverse crunch with straight legs — lift the hips to drive the feet up, lower slowly"},
  {id:"cable_rotation", src:"16.4", level:2, point:"pivot the back leg into triple extension (hip, knee, ankle) to spare the low back", muscles:["gluteus maximus","quadriceps","gastrocnemius","soleus"]},
  {id:"cable_lift", src:"16.4", level:2, safety:"no low-back hyperextension at the top; back leg pivots into triple extension"},
  {id:"cable_chop", src:"16.4", level:2, point:"the reverse of the lift — the back leg ends in flexion"},
  {id:"mb_rotation_chest_pass", src:"16.4", level:3, safety:"only with proper stabilisation and strength — otherwise compensation, imbalance, injury"},
  {id:"mb_pullover_throw", src:"16.4", level:3, prerequisite:"adequate latissimus dorsi extensibility, to protect the low back and shoulders"},
  {id:"mb_front_oblique_throw", src:"16.4", level:3, point:"athletic stance, ball to one hip, throw explosively forward; hips and feet stay pointing ahead; both sides"},
  {id:"mb_side_oblique_throw", src:"16.4", level:3, point:"back leg pivots into triple extension after the throw"},
  {id:"mb_soccer_throw", src:"16.4", level:3, tip:"a non-bouncing ball or a nearby wall makes it easier"},
  {id:"mb_woodchop_throw", src:"16.4", level:3, point:"not too heavy — the aim is rate of force, not absolute strength"},
  {id:"mb_back_extension_throw", src:"16.4", level:3, safety:"rotation from the thoracic spine, not the lumbar"}
];

export {meta, BASICS, RATIONALE, ACTIVATION, GUIDELINES, PROGRESSION, CHECKPOINTS, EXERCISES};
