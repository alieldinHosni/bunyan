/* Bunyan — knowledge: epidemiology
   Population statistics the source cites — for the agent's "why this matters"
   explanations, never as personal predictions. Migrated from residual.js on 20 Oct when
   the topic reached 17 entries. Figures are as the source gives them, with their year
   where stated; they date. Leaf data. */

var meta={
  covers:"Population health and activity statistics",
  derivedFrom:"certification curriculum",
  sections:["1.3","3.4","10.1"],
  origin:"residual.js topic 'epidemiology' (17 entries)",
  caution:"statistics age; treat as context for education, not current fact"
};

var STATS=[
  {src:"1.3", stat:"adults not meeting activity guidelines", value:"about 3 in 4"},
  {src:"1.3", stat:"adolescents not meeting activity guidelines", value:"more than 80%"},
  {src:"1.3", stat:"best single predictor of death, disability and disease", value:"aerobic fitness / regular physical activity", confidence:"medium — stated as 'perhaps'"},
  {src:"1.3", stat:"heart disease risk for people who keep cardiovascular fitness across life", value:"2 to 4 times less likely to develop it or die early from it"},
  {src:"1.3", stat:"leading cause of death", value:"heart disease"},
  {src:"1.3", stat:"diabetes rank among causes of death worldwide", value:"7th"},
  {src:"1.3", stat:"COPD projected rank among causes of death by 2030", value:"3rd"},
  {src:"1.3", stat:"cancers diagnosed at age 55+", value:"about 76%"},
  {src:"1.3", stat:"obesity trend 1980-2015", value:"more than doubled in over 70 countries; 600M+ adults and 100M+ children obese; still rising yearly in most developing regions"},
  {src:"1.3", stat:"public-health response", value:"programmes partner with governments to build activity-friendly places: parks, bike lanes, walking trails"},
  {src:"1.3", stat:"workers reporting rising workplace stress", value:"6 in 10, across major economies"},
  {src:"1.3", stat:"US healthcare cost", value:"over $3 trillion a year; 90% spent on chronic and mental health conditions"},
  {src:"1.3", stat:"US yearly healthcare cost attributed to inactivity", value:"about $117 billion, rising"},
  {src:"1.3", stat:"projected global economic loss from chronic disease by 2030", value:"about $47 trillion"},
  {src:"3.4", stat:"people with depression worldwide", value:"about 300 million"},
  {src:"3.4", stat:"research on exercise for depression and anxiety", value:"decades of it, by physicians, psychologists and exercise scientists; much of the interest is exercise as a treatment option"},
  {src:"10.1", stat:"global dietary-supplement revenue, 2018", value:"$115 billion, mostly vitamins and minerals"}
];

export {meta, STATS};
