/* Bunyan — knowledge: injuries
   Common injury regions — what goes wrong, why, what helps prevent it, what to watch.
   Migrated from residual.js on 20 Oct when "injury-regions" reached 6 entries. How a
   past injury changes muscle activation is in imbalances.js INJURY_EFFECTS; ankle
   instability rehab evidence in balance.js RATIONALE.rehabilitation. Bunyan never
   diagnoses or treats an injury (scope.js). Leaf data. */

var meta={
  covers:"Common injury regions and prevention",
  derivedFrom:"certification curriculum",
  sections:["1.4"],
  origin:"residual.js topic 'injury-regions' (6 entries)",
  seeAlso:["imbalances.js INJURY_EFFECTS","balance.js RATIONALE.rehabilitation.ankleInstability","scope.js no_diagnosis, no_treatment"]
};

var REGIONS=[
  {src:"1.4", general:true,
    skeletalMuscle:"a large share of body mass; building and keeping it matters for health across life and for free movement",
    cause:"too much sitting and inactivity cause muscle and skeletal dysfunction, not only chronic disease",
    leadsTo:["higher injury risk","low-back pain","shoulder pain","neck pain"]},
  {src:"1.4", region:"foot_ankle",
    impact:"injuries here can severely limit daily activities",
    commonest:[
      {injury:"ankle sprain", is:"ankle rolled, twisted or turned, stretching or tearing the ligaments joining the ankle bones to the foot and lower leg"},
      {injury:"plantar fasciitis", is:"inflamed plantar fascia (tissue under the foot linking heel bone to toes); often chronic heel pain"}],
    knockOn:"the foot and ankle carry the whole body, so problems here can cause dysfunction at the knee, hip or low back",
    reinjury:"a previously injured ankle is far more likely to be injured again unless it is reconditioned to strong and stable",
    watch:"foot and ankle posture during exercise, to build proper movement patterns"},
  {src:"1.4", region:"knee",
    who:"anyone, at any age or activity level",
    causes:["arthritis","acute (sudden) injury","overuse (repetitive) injury"],
    commonest:["patellar tendonitis","ACL tear","MCL tear"],
    linkedTo:"some chronic knee pain is associated with overweight/obesity and lack of regular activity",
    prevention:["proper exercise technique","supportive footwear","modifying exercise and activity when needed",
      "regular flexibility and strength training with a thorough warm-up — significantly reduces knee injuries"],
    watch:"knee alignment and posture, and exercise technique"},
  {src:"1.4", region:"lphc",
    is:"lumbo-pelvic-hip complex — lumbar spine, pelvis, abdomen and hip structures; 'the core'; links upper and lower body",
    whyTrain:"strength and stability here improve health and performance and prevent injury",
    ifUnstable:["limbs cannot produce force properly","predisposes to back or hip pain"],
    prevalence:"nearly 80% of adults have low-back pain at least once in life",
    programme:"programmes should build core stability and strength"},
  {src:"1.4", region:"shoulder",
    when:"common, more so with age; routine reaching and overhead tasks hurt when the shoulder is deconditioned; common in sport and weight training, especially overhead lifting",
    causes:["shoulder joint instability","shoulder impingement syndrome (soft tissue or bone impinged)"],
    prevention:["regular upper-body flexibility work","properly implemented strength training",
      "high-intensity exercises done correctly, and only programmes suited to the person's ability and goals"],
    caution:"aggressive swinging (kipping) pull-ups and hammer swings are dangerous without advanced shoulder fitness"},
  {src:"1.4", region:"head_neck",
    complaints:["headache","neck pain"], commonCause:"poor head and neck posture",
    patterns:[
      {name:"text neck", is:"head held in sustained flexion (looking down at a phone); loads many neck muscles and may cause soreness",
        confidence:"medium — still under investigation"},
      {name:"forward head posture", is:"head jutting forward, raising the work of the muscles stabilising the head on the cervical spine; over time the neck adapts dysfunctionally",
        seenIn:"office and computer workers, who drift the head toward the screen to focus"}],
    exercise:"beneficial for forward head posture, especially for lingering neck discomfort",
    watch:"head and neck position during exercise; many clients are heavy phone users or desk workers"},
];

export {meta, REGIONS};
