/* Bunyan — knowledge: residual
   Append-only. Facts from the source with no field in any other knowledge file yet.
   A fact goes here the moment it has nowhere else to go, so it is never dropped.
   Six or more on one topic is a missing schema: propose a file and migrate them.
   No shape is enforced beyond {topic, src, fact}. Leaf data. */

var meta={
  covers:"Facts awaiting a schema",
  derivedFrom:"certification curriculum",
  appendOnly:true
};

var RESIDUAL=[
  /* ---------------------------------------------------------- 1.3 */

  /* chronic-conditions (12 entries, 1.3) migrated to conditions.js OVERVIEW on 20 Oct — the topic reached the six-entry schema threshold. */

  {topic:"weight-management", src:"1.3", fact:{finding:"long-term weight-loss maintainers",
    detail:"in the largest registry of successful maintainers, 90% exercised about 1 hour a day on average and kept a significant loss for several years"}},


  /* ---------------------------------------------------------- 1.4 */

  /* ---------------------------------------------------------- 1.6 */
  /* Trainer-business obligations with no use in the app. Kept so nothing is dropped. */

  /* ---------------------------------------------------------- 3.1 */

  /* ---------------------------------------------------------- 3.4 */

  /* ---------------------------------------------------------- 4.5 */
  /* Numbers that appear inside 4.5's goal examples. Kept for nutrition-principles.js
     (chapter 9) to confirm or contradict; not prescriptions on their own. */
  {topic:"nutrition", src:"4.5", fact:{item:"daily sodium ceiling used in a blood-pressure goal example", value:2300, unit:"mg/day",
    confidence:"low — appears in an example, not stated as guidance"}},
  {topic:"nutrition", src:"4.5", fact:{item:"food-intake diary for weight loss", rule:"record intake to monitor daily calories objectively"}},

  /* ---------------------------------------------------------- study-guide checklist, ch 1 */
  /* Found by checking the study guide's chapter-1 recap against the knowledge base. They
     come from 1.1/1.2, which were approved skips, but they are facts worth keeping. */

  /* ---------------------------------------------------------- 6.1 */
  {topic:"safety-cautions", src:"6.1", fact:{who:"people taking daily aspirin, blood thinners or anticoagulants",
    risk:"clot less well, so bruise more easily from interventions such as foam rolling or massage"}},
  {topic:"safety-cautions", src:"6.1", fact:{who:"people with venous pooling — blood collecting in the limbs from slow or backward venous flow, e.g. failing vein valves",
    signs:["swelling in the limbs","more visible leg veins"],
    risk:"less venous return lowers cardiac output and can cause light-headedness, especially rising quickly from lying to standing"}},

  /* ---------------------------------------------------------- 6.2 */
  {topic:"safety-cautions", src:"6.2", fact:{who:"people with diagnosed hypertension",
    risk:"breath-holding under load (Valsalva) temporarily raises blood pressure", rule:"minimise it; breathe through every rep"}},
  {topic:"safety-cautions", src:"6.2", fact:{who:"people with asthma",
    risk:"cool, dry air makes breathing harder; asthma brings temporary breathlessness, coughing and wheezing",
    rule:"always carry the emergency inhaler during physical activity, especially moderate-to-intense exercise"}},

  /* ---------------------------------------------------------- 10.1 */
  {topic:"supplement-history", src:"10.1", fact:{item:"Ayurvedic medicine", detail:"practised in India from as early as 6,000 BC"}},
  {topic:"supplement-history", src:"10.1", fact:{item:"Roman gladiators", detail:"may have taken a plant-ash recovery drink, from about 300 BC"}},
  {topic:"supplement-history", src:"10.1", fact:{item:"first multivitamin", detail:"1940s era; its developer observed deficiencies in China and started the company in California in 1939, also inventing multilevel marketing to sell it"}},
];

export {meta, RESIDUAL};
