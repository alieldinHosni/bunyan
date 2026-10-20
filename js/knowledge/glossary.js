/* Bunyan — knowledge: glossary
   Definitions of terms the source uses, for the agent's explanations. Migrated from
   residual.js on 20 Oct when the "definitions" topic reached 15 entries. Terms defined
   inside other files (anatomy, phases, …) stay there; this holds the rest. Leaf data. */

var meta={
  covers:"Term definitions with no other home",
  derivedFrom:"certification curriculum",
  sections:["1.3","3.1","SG.1"],
  origin:"residual.js topic 'definitions' (15 entries)"
};

var GLOSSARY=[
  {src:"1.3", term:"exercise",
    is:"structured, planned movement aimed at a physical adaptation (fat loss, endurance, strength)",
    examples:["weight training","cycling","running","swimming"], setting:"gym or outdoors, alone or in a group"},
  {src:"1.3", term:"physical activity",
    is:"any movement that expends energy, usually unplanned, part of the day's natural movement",
    examples:["walking","yard work","recreational sport","play"], pattern:"continuous or intermittent",
    intensity:"anything from walking a dog to shovelling snow hard"},
  {src:"1.3", term:"primary prevention", is:"acting before a condition develops", preferred:true},
  {src:"1.3", term:"secondary prevention", is:"treating a condition after it has become apparent",
    note:"viable and recommended, but primary prevention is the goal"},
  {src:"1.3", term:"glucose", is:"the simplest carbohydrate; used directly by cells for energy"},
  {src:"1.3", term:"insulin", is:"hormone that moves glucose from the blood into cells"},
  {src:"1.3", term:"endorphins", is:"brain chemicals released with exercise; reduce pain, raise well-being"},
  {src:"3.1", term:"psychology",
    is:"the science of how mind and feelings shape behaviour: brain function, behaviour, and the environment's effect on behaviour",
    subfields:["clinical","developmental","social","health","sport and exercise"]},
  {src:"3.1", term:"sport and exercise psychology",
    studies:["motives for and barriers to activity","how surroundings affect exercise","social influence on exercise",
      "psychological benefits of exercise","what drives long-term adherence"]},
  {src:"3.1", term:"psychologist",
    training:"at least a master's, usually a doctorate (varies by country)", can:"assess mental illness and treat it, mostly with psychotherapy",
    cannot:"in most cases prescribe medication"},
  {src:"3.1", term:"psychiatrist",
    training:"medical degree plus a four-year psychiatry residency", can:"prescribe medication as well as give psychotherapy"},
  {src:"3.1", term:"where psychologists and psychiatrists work",
    settings:["healthcare","education","counselling","law enforcement","athletics","consulting"]},
  {src:"SG.1", term:"evidence-based practice", is:"conscientiously using the current best evidence in decisions about someone's care"},
  {src:"SG.1", term:"acute disease", is:"a sudden medical condition that can be treated and resolved in a short time"},
  {src:"SG.1", term:"chronic disease", is:"a medical condition that persists, without quickly resolving or being cured"},
];

export {meta, GLOSSARY};
