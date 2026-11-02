import {recapOf} from "../recap.js";

/* A day told in one message (js/coach/recap.js): the foods with their meals and whether
   the amount was a guess, the muscles trained, "what else" and "put it in my day"; and
   what is not a day told is left to the rest of the coach. */
var OWNER="اتا كلت بيض النهاردة في ساندويتش و سكريات الصبح مش عارف قد ايه بالظبط، و كلت فراخ اخر النهار، و اتمرنت صدر في الجيم، ايه تاني ممكن اعمله؟ ولو ينفع تدخلي المعلومات ديه في اليوم بتاعي";
function run(t){
  var r=recapOf(OWNER);
  t.eq(r.foods.map(function(f){return [f.q,f.meal,f.guess];}),[["بيض في ساندوتش","Breakfast",true],["سكريات","Breakfast",true],["فراخ","Dinner",true]],"the owner's day: the foods, each with its meal");
  t.eq([r.muscles,r.ask,r.log],[["Chest"],true,true],"chest trained, what else, and put it in my day");
  var e=recapOf("I had eggs and toast for breakfast, chicken and rice for lunch, and trained legs. What else can I do?");
  t.eq(e.foods.map(function(f){return f.q+"/"+f.meal;}),["eggs/Breakfast","toast/Breakfast","chicken/Lunch","rice/Lunch"],"in English");
  t.eq(e.muscles,["Legs"],"legs");
  var w=recapOf("كلت بيض في ساندويتش الصبح وكلت تونة الضهر وكمان اتمرنت ضهر");
  t.eq([w.foods.map(function(f){return f.q+"/"+f.meal;}),w.muscles],[["بيض في ساندوتش/Breakfast","تونه/Lunch"],["Back"]],"a meal then a workout, with no comma between");
  t.eq(recapOf("كلت فول وعيش الصبح وكلت كشري الضهر").foods[0].parts,["فول","عيش"],"an and written onto the next word: its pieces kept to try");
  t.eq(recapOf("log it: I ate oats and banana this morning").foods.map(function(f){return f.q;}),["oats","banana"],"log it: the foods");
  t.eq(recapOf("I ate 200 g chicken"),null,"a single food is the plain food log's");
  t.eq(recapOf("how much protein do I need"),null,"a question is a question");
  t.eq(recapOf("I had a bad day"),null,"a bad day is not a meal");
  t.eq(recapOf("اتمرنت صدر النهارده"),null,"a workout alone, with nothing asked, is not a day to log");}

export {run};
