/* Bunyan — knowledge: cardio
   Cardiorespiratory training: weekly guidelines, intensity methods and formulas, the
   four training zones built from VT1/VT2, the staged progression, session structure,
   and posture cautions on cardio machines. VT1/VT2 tests and the RPE scales live in
   assessments.js; this file only points to them. Leaf data. */

var meta={
  covers:"Cardiorespiratory training guidelines, zones and progression",
  derivedFrom:"certification curriculum",
  sections:["15.1","15.2","15.3","15.4","15.5","SG.15"],
  schema:"new file — the spec has no cardio schema; chapter 15 is a whole programming system, and phases.js covers resistance phases only",
  confidence:"high unless an entry says otherwise"
};

var BASICS={src:"15.1",
  cardiorespiratoryFitness:"the heart and lungs supplying oxygen-rich blood to working muscle during sustained activity",
  healthComponents:["cardiorespiratory","muscular strength","muscular endurance","flexibility","body composition"],
  priority:"for disease prevention and quality of life, cardio fitness should be near the top of every programme",
  prognosis:"cardio fitness strongly predicts morbidity and mortality — poor fitness raises all-cause (especially cardiovascular) premature death; improving it lowers it",
  dose:"modest moderate-intensity exercise brings benefits; vigorous brings more; a mix works",
  commonError:{error:"ignoring the rate of progression", tooFast:"injury", tooSlow:"poor adherence"},
  individual:"responses vary widely even between similar people — prescribe individually with FITTE-VP"
};

/* FITTE-VP: frequency, intensity, type, time, enjoyment, volume, progression. */
var GUIDELINES={src:"15.2",
  frequency:[{intensity:"moderate (e.g. brisk walking)", daysPerWeekMin:5},{intensity:"vigorous (e.g. jogging, running)", daysPerWeekMin:3},
    {intensity:"a mix", daysPerWeek:{min:3, max:5}}],
  time:{moderateMinPerWeek:150, vigorousMinPerWeek:75, mix:"an equivalent combination",
    more:{moderateMinPerWeek:300, vigorousMinPerWeek:150, benefit:"even more health and fitness benefit beyond these"},
    any:"any amount of activity brings some benefit"},
  intensity:{health:"moderate — raises heart and breathing rate without exhaustion; can talk comfortably",
    fitness:"higher intensities are generally needed for conditioning"},
  type:{aerobicCriteria:["rhythmic","large muscle groups","continuous"],
    modes:["jogging","walking","cardio machines","swimming","cycling"]},
  enjoyment:{rule:"choose modes that fit personality, past experience and interests",
    why:"adherence drops sharply when a mode is imposed; fun, challenge and support keep people going"},
  volume:{unit:"total work per week",
    weightLoss:{minPerWeekMin:250, note:"150 min/week may bring only modest weight loss"},
    expenditure:{kcalPerWeek:{min:1200, max:2000}, for:"general health and preventing weight gain"},
    neat:{is:"energy spent outside eating, sleeping and structured exercise — fidgeting, standing, moving, chores, grooming",
      why:"usually exceeds a single exercise session's expenditure; structured exercise alone rarely reaches 1,200 kcal/week"}},
  progression:{rule:"gradually raise intensity and/or volume, matched to the person",
    weeklyVolumeIncreaseMaxPct:10, safeFor:"most apparently healthy adults",
    example:{fromMinPerWeek:150, toMinPerWeek:165},
    risk:"progressing intensity too fast risks sprains and strains",
    bonus:"feeling competent improves adherence"}
};

/* Ways to set and monitor intensity. */
var INTENSITY_METHODS=[
  {id:"vo2max", src:"15.2", is:"maximal oxygen use, mL/kg/min — the traditional gold standard",
    target:"VO2max × desired %", practical:false, why:"needs maximal effort and gas-analysis equipment; submaximal tests estimate it (assessments.js)"},
  {id:"hrmax_tanaka", src:"15.2", formula:"208 − 0.7 × age", target:"HRmax × desired %",
    example:{age:40, hrmax:180, pct:65, targetBpm:117},
    note:"more accurate than 220 − age, which its own developer said was never meant to rule training",
    caution:"never absolute — genetics, medications and stimulants such as caffeine change heart rate; a starting point only"},
  {id:"hrr_karvonen", src:"15.2", formula:"(HRmax − HRrest) × desired % + HRrest",
    example:{age:25, hrmax:191, hrRest:50, pct:85, targetBpm:170},
    note:"likely better than %HRmax because it accounts for resting heart rate",
    exampleCheck:"the source rounds 141 × 85% (119.85) to 120"},
  {id:"met", src:"15.2", is:"1 MET = 3.5 mL O2/kg/min, average adult resting metabolism",
    use:"activity cost as multiples of rest — e.g. slow jogging ≈ 4 METs", practical:"uncommon in gyms",
    bunyan:"Bunyan's MET formula (MET × 3.5 × kg / 200 × min) was verified against chapter 8"},
  {id:"rpe", src:"15.2", see:"assessments.js rpe",
    recommend:"the 1–10 scale unless the person already knows the 6–20 scale",
    why6to20:"each value × 10 ≈ heart rate (6 → 60 bpm, 12 → 120 bpm)", rating:"whole-body feeling, not one tired part"},
  {id:"talk_test", src:"15.2", see:"assessments.js talk_test_vt1",
    validity:"correlates with VO2, ventilatory threshold and heart rate on bike and treadmill; valid from athletes to cardiac patients",
    belowVT1:"can speak comfortably", atVT1:"the first point continuous talking becomes challenging"}
];

/* Interval formats. */
var FORMATS=[
  {id:"interval", src:"15.2", is:"brief harder efforts alternated with easier periods",
    workRest:{commonFrom:"1:1", commonTo:"1:5", note:"varies widely with fitness and mode"},
    moderate:"complete the set intervals without maximal effort — best for beginners and deload periods",
    high:"near-maximal each repeat = HIIT"},
  {id:"hiit", src:"15.2", is:"short maximal or near-maximal bouts with recovery",
    evidence:"comparable cardio gains in less time and volume; weight, cholesterol and BP effects similar to steady state",
    caveat:"not everyone will adhere to it, and it is not needed for most health goals",
    effortVsIntensity:"effort is subjective, intensity is objective (sprint time, load); without enough recovery intensity must fall even at maximal effort"},
  {id:"tabata", src:"15.2", protocol:{workS:20, restS:10, rounds:8, totalMin:4},
    original:"elite cyclists at about 170% of VO2max — beyond most people",
    practice:"gym versions are high-intensity but completable; match intensity to the person",
    evidence:"improves aerobic power and VO2max"},
  {id:"fartlek", src:"15.2", means:"Swedish for 'speed play'",
    is:"unstructured mix of low, moderate and high efforts in one workout — running, cycling or swimming", why:"targets several systems; breaks monotony"}
];

/* Every session: warm-up, conditioning, cool-down. */
var SESSION={src:"15.3",
  basis:["starting fitness","assessment results","risk factors and health limits"],
  warmUp:{general:"not movement-specific — e.g. treadmill or bike before weights",
    specific:"mimics the activity (dynamic stretches) — e.g. bodyweight squats, lunges, push-ups before weights",
    cardioPart:{minutes:{min:5, max:10}, intensity:"low to moderate, well below conditioning intensity"},
    benefits:[{benefit:"higher heart and breathing rate", effects:["more cardiorespiratory capacity","more blood flow to muscle","more oxygen exchange"]},
      {benefit:"higher tissue temperature", effects:["faster muscle contraction","higher metabolic rate","more soft-tissue extensibility"]},
      {benefit:"psychological preparation", effects:["mental readiness"]}],
    adjust:"longer for sedentary people, those with medical limits or little experience — at first",
    flexibility:"include SMR and stretching — only on muscles found overactive",
    dose:"moderate — no undue fatigue before the workout",
    independence:"once technique and equipment are understood, the person can warm up alone before the session",
    example:[{component:"self-myofascial rolling", muscles:["calves","hip flexors","latissimus dorsi"], perMuscleS:30},
      {component:"static stretching", muscles:["calves","hip flexors","latissimus dorsi"], perMuscleS:30},
      {component:"cardio", mode:"treadmill", minutes:{min:5, max:10}}]},
  conditioning:{note:"low intensity improves health but not much conditioning compared with higher intensities",
    benefits:["stronger, more efficient heart; higher cardiac output","lower heart-disease risk","lower resting HR and HR at any workload",
      "better lung ventilation and stronger breathing muscles","thicker cartilage and bone with weight-bearing cardio","better oxygen transport and muscle oxygen use",
      "more lean mass and metabolic rate","lower cholesterol and BP","less clotting risk","better fat use, sparing glycogen",
      "mental alertness","less depression and anxiety","better relaxation and sleep","stress tolerance","lower obesity and diabetes risk"]},
  coolDown:{minutes:{min:5, max:10},
    goals:["lower heart and breathing rate","cool body temperature gradually","return muscles to resting length","prevent blood pooling in the legs (dizziness, fainting)","restore systems near baseline"],
    flexibility:"SMR and static stretching — manage soreness and joint range; focus on overactive muscles and the major muscles used",
    example:[{component:"cardio", mode:"treadmill", minutes:{min:5, max:10}, note:"gradually reduce speed"},
      {component:"self-myofascial rolling", muscles:["calves","hip flexors","latissimus dorsi"], perMuscleS:30},
      {component:"static stretching", muscles:["calves","hip flexors","latissimus dorsi"], perMuscleS:30}]},
  supervise:"watch new clients closely in warm-up and cool-down; explain why both matter"
};

/* Zones from the person's own VT1 and VT2 heart rates. midpoint = halfway VT1→VT2. */
var ZONES=[
  {zone:1, src:"15.4", from:null, to:"VT1", rpe10:{min:3, max:4}, rpe20:{min:12, max:13},
    feels:["light to moderate","starting to sweat; conversation effortless"]},
  {zone:2, src:"15.4", from:"VT1", to:"midpoint", rpe10:{min:5, max:6}, rpe20:{min:14, max:15},
    feels:["challenging to hard","noticeable sweating, bigger breaths","continuous talking getting hard"]},
  {zone:3, src:"15.4", from:"midpoint", to:"VT2", rpe10:{min:7, max:8}, rpe20:{min:16, max:17},
    feels:["vigorous to very hard","profuse sweating","talk limited to short phrases"]},
  {zone:4, src:"15.4", from:"VT2", to:null, rpe10:{min:9, max:10}, rpe20:{min:18, max:20},
    feels:["very hard to maximal","breathing as hard as possible","speech impossible or single words"]}
];
var ZONE_CALC={src:"15.4",
  needs:"VT1 heart rate (all stages from 2); VT1 and VT2 (stages 3 and 4) — assessments.js talk tests",
  example:{vt1:145, vt2:165, zones:[{zone:1, below:145},{zone:2, min:145, max:154},{zone:3, min:155, max:164},{zone:4, min:165}]},
  agentReading:"midpoint = round((VT1 + VT2) / 2); zone 2 runs VT1 to midpoint − 1, zone 3 midpoint to VT2 − 1 — matches the worked example"
};

/* Staged progression. Stages 1–4 from the textbook; stage 5 from the study guide only,
   because its textbook pages are absent (gap 7). */
var STAGES=[
  {stage:1, src:"15.4", for:"new exercisers improving health markers; also recovery after hard sessions",
    zones:[1], format:"steady state below VT1",
    build:{startExample:"15 min × 3 days/week", addEachWeek:"a few minutes per session", weeklyIncreaseMaxPct:10},
    readiness:{next:2, rule:"zone 1 for at least 30 min, 3 times a week", note:"a deconditioned person may need 2–3 months"},
    goal:"aerobic base; an achievable challenge that supports adherence"},
  {stage:2, src:"15.4", for:"intermediate fitness — regular exercisers, recreational sport, more endurance or weight loss",
    zones:[1,2], prerequisite:"talk test to find heart rate at VT1",
    format:"aerobic intervals: work just above VT1, recovery just below",
    intervals:{workS:{min:30, max:60}, ratios:["1:3","1:2","1:1"], progress:"longer work (1 → 2–3 min), ratios 1:3 → 1:2 → 1:1, per ability and willingness"},
    example:[{order:1, step:"warm up 5–10 min"},{order:2, step:"1 min in zone 2 just above VT1"},{order:3, step:"3 min in zone 1"},
      {order:4, step:"repeat for the session"},{order:5, step:"cool down 5–10 min"}],
    newToIntervals:"alternate stage 1 and 2 days (e.g. Mon 1, Wed 2, Fri 1; next week start with 2) — adjust for sleep, recovery, stress",
    steadyStateOption:{when:"after adapting to intervals, if preferred", how:"warm up 5–10 min in zone 1, rise to just above VT1, hold, cool down 5–10 min in zone 1", required:false}},
  {stage:3, src:"15.4", for:"moderately advanced, with a solid base, seeking more capacity",
    zones:[1,2,3], never:"zone 4", prerequisite:"VT1 and VT2 measured",
    skip:["modest goals","new to exercise","averse to high intensity"],
    format:"mostly zone 1, brief zone 2 and 3 intervals; zone 2 intervals longer than zone 3",
    intervals:{workS:{min:30, max:60}, progress:"as stage 2 — tighter ratios, longer high-intensity intervals; slow, gradual volume"},
    example:[{order:1, step:"warm up 5–10 min in zone 1"},{order:2, step:"raise the workload every 60 s through zone 2 into zone 3"},
      {order:3, step:"one more minute in zone 3, then back to zone 2"},{order:4, step:"another zone 3 interval"},{order:5, step:"repeat as planned"},{order:6, step:"cool down 5–10 min"}],
    rotate:"a low (stage 1), medium (stage 2) and high (stage 3) day; stage 1 as recovery after stage 3"},
  {stage:4, src:"15.4", for:"advanced — high-level athletes and fitness competitors seeking anaerobic capacity and power",
    zones:[1,2,3,4], prerequisite:"VT1 and VT2 measured", notFor:["modest fitness","averse to high intensity"],
    format:"most time in zone 1, brief intervals in zones 2–4, aiming at maximal performance not maximal effort",
    example:[{order:1, step:"warm up 5–10 min in zone 1"},{order:2, step:"raise the workload every 60 s through zones 2 and 3 into zone 4"},
      {order:3, step:"10 s in zone 4, then 1 min back in zone 1 — the gauge of recovery"},
      {order:4, step:"heart rate falling faster over weeks = getting fitter"},
      {order:5, step:"if it does not fall to the expected rate in that minute: tired and near overtraining — stay in zone 1 for the rest of the session"},
      {order:6, step:"if it does: another zone 4 interval"},{order:7, step:"then 5–10 min in zone 1; repeat if wanted"}],
    overtraining:{signs:["disturbed sleep","excessive fatigue","impaired performance","loss of appetite","mood swings"], action:"cut stage 4 volume and intensity; more recovery between sessions"}},
  {stage:5, src:"SG.15", summaryOnly:true,
    focus:"conditioning drills — linear, multidirectional and sport-specific",
    format:"often HIIT combined with small-sided games and agility drills",
    gap:"the textbook PDF has no stage 5 pages (gap 7); only the study guide's one-line summary is recorded — no zones, prerequisites or examples invented"}
];
var STAGE_RULES={src:"15.4",
  specificity:"the body adapts to the stress applied, then needs more or different stress — so prescribe from the person's own markers (VT1, VT2)",
  purpose:"organised progression for continued adaptation with less overtraining and injury",
  mostPeople:"stages 1 and 2 suit most weight-loss clients and new exercisers — top priority for the average gym-goer",
  advanced:"stages 3–4 are for athletes and advanced enthusiasts willing to train hard; not everyone needs every stage",
  performanceVsEffort:{performance:"peak ability, consistent across intervals, full rest between (e.g. 100 m repeats chasing a best time)",
    effort:"100% effort but output falls with fatigue (e.g. 100 m repeats on 30 s rest) — conditioning, not speed"},
  stageCount:{stages:5, textbookPages:4, note:"the textbook says five stages but its PDF describes four; the study guide confirms a stage 5 (gap 7)"}
};

/* Watching posture on cardio equipment. Muscle names per MUSCLE_MAP. */
var POSTURE=[
  {id:"forward_head_rounded_shoulders", src:"15.5", pattern:"upper_crossed",
    why:"may limit lifting the ribcage and contracting the diaphragm — worse ventilation and oxygen delivery",
    watch:["shoulders rounding and head poking forward on bikes, treadmills and ellipticals — cue shoulder and head retraction",
      "gripping stepper or treadmill handles (over-supinated or over-pronated) → elevated, protracted shoulders and forward head",
      "neck extension or rotation to watch a TV"],
    fix:"use the machine hands-free where possible — more core demand, energy use and balance"},
  {id:"anterior_pelvic_tilt", src:"15.5", pattern:"lower_crossed",
    why:"may impair ventilation and performance; may cause low-back pain",
    watch:["bikes and steppers keep the hips flexed — limit them at first; if used, stretch the hip flexor complex before and after",
      "treadmill speed controllable, to avoid overstriding that arches the low back"],
    alsoDo:{lengthen:["hip flexor complex"], strengthen:["abdominals","gluteus maximus"]}},
  {id:"knees_in_pronated_feet", src:"15.5", pattern:"pes_planus_distortion",
    why:"avoid feeding knee valgus — a predictor of knee injury",
    needs:"good ankle mobility for lower-body cardio",
    alsoDo:{inhibitAndLengthen:["gastrocnemius","soleus","adductors","hip flexor complex"], strengthen:["gluteus medius","gluteus maximus"]},
    watch:["climbing treadmills and steppers may be too much at first, especially holding the rails and speeding up — keep a controllable pace until corrected"]}
];
var POSTURE_RULE={src:"15.5", rule:"assess posture continuously during cardio and correct alignment"};

export {meta, BASICS, GUIDELINES, INTENSITY_METHODS, FORMATS, SESSION, ZONES, ZONE_CALC, STAGES, STAGE_RULES, POSTURE, POSTURE_RULE};
