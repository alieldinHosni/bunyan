/* Bunyan — reading a diet plan
   A plan arrives as text: pasted from WhatsApp or Notes, copied out of a PDF, lifted
   from a photo with the phone's Live Text, or opened from a .txt / .csv file. This
   reads it into meals, and each meal's lines into foods with amounts, using the same
   parser and matcher as typing a meal into Add Food (js/engine/nutrition.js).

     Meal 1:                       الوجبة الأولى
     - 3 eggs                      ٣ بيض
     - 2 slices toast              رغيف بلدي
     Breakfast: oats 60g, 1 banana

   A meal starts at a line naming one — "Meal 2", "Breakfast", "الغدا", "الوجبة التانية",
   or any short line ending in a colon — and runs to the next. Text with no headings is
   split at blank lines, a meal per block. Within a meal, a line can hold several foods
   ("3 eggs, 2 toast and a banana"); a line offering a choice ("chicken or fish") takes
   the first. A food that matches nothing is kept as text for the user to find by hand:
   guessing would put the wrong numbers in the plan without anyone noticing. */
import {parseFoodInput, resolveItem, toLogItem} from "./nutrition.js";

/* Arabic-Indic and Persian digits, and the Arabic decimal comma, to Latin. */
function latin(s){
  return String(s).replace(/[٠-٩]/g,function(d){return String(d.charCodeAt(0)-0x660);})
    .replace(/[۰-۹]/g,function(d){return String(d.charCodeAt(0)-0x6F0);})
    .replace(/٫/g,".").replace(/½/g," 0.5").replace(/¼/g," 0.25").replace(/¾/g," 0.75");}

var END="(?=$|[\\s:：,،\\-–—.)(])";
var NAMED=[
  ["Breakfast","breakfast|brekkie|فطار|فطور|الفطار|الفطور|افطار|الإفطار|الافطار"],
  ["Lunch","lunch|غدا|غداء|الغدا|الغداء"],
  ["Dinner","dinner|supper|عشا|عشاء|العشا|العشاء"],
  ["Snack","snacks?|سناك|سناكس|وجبة خفيفة|وجبه خفيفه"]];
var ORD={"الأولى":1,"الاولى":1,"الأولي":1,"الاولي":1,"التانية":2,"الثانية":2,"التانيه":2,"الثانيه":2,
  "التالتة":3,"الثالثة":3,"التالته":3,"الثالثه":3,"الرابعة":4,"الرابعه":4,"الخامسة":5,"الخامسه":5,
  "السادسة":6,"السادسه":6,"السابعة":7,"السابعه":7,
  first:1,second:2,third:3,fourth:4,fifth:5,sixth:6,seventh:7};
var MEAL_RE=new RegExp("^(?:meal|وجبة|وجبه|الوجبة|الوجبه)\\s*(?:#|no\\.?|رقم)?\\s*(\\d+|"+Object.keys(ORD).join("|")+")"+END,"i");
var BULLET=/^\s*(?:[-*•▪◦·–—>]+|\(?\d+[.)]|[a-z][.)])\s+/i;
/* A time after a meal's name: "(8am)", "8:30", "10 pm", "٩ ص". A bare number is not a
   time — in "Breakfast 3 eggs" it is the eggs. */
var TIME=/^\s*(?:\(\s*\d{1,2}(?:[:.]\d{2})?\s*(?:am|pm|ص|م)?\s*\)|\d{1,2}[:.]\d{2}\s*(?:am|pm|ص|م)?|\d{1,2}\s*(?:am|pm|ص|م)(?=$|[\s:：,،\-–—)]))/i;

/* A heading: which meal it names, what it is called as written, and whatever follows
   it on the same line ("Breakfast: oats 60g"). */
function heading(line){
  var s=line.replace(/^[\s#*•\-–—]+/,"").trim(),low=s.toLowerCase(),m,len=-1,named=null,n=null;
  if((m=MEAL_RE.exec(low))){n=+m[1]||ORD[m[1]]||null;len=m[0].length;}
  else for(var i=0;i<NAMED.length&&len<0;i++){
    /* "Snack 2" is a second snack, so a number after the name stays with it. */
    var mm=new RegExp("^(?:"+NAMED[i][1]+")(?:\\s*\\d+"+END+")?"+END,"i").exec(low);
    if(mm){named=NAMED[i][0];len=mm[0].length;}}
  if(len<0){
    /* "Pre-workout:" — a short line that ends in a colon, with no amount in it. */
    var c=/^([^:：\d]{2,32})[:：]\s*$/.exec(s);
    return c?{named:null,n:null,name:c[1].trim(),rest:""}:null;}
  var rest=s.slice(len).replace(TIME,"").replace(/^\s*\([^)]*\)/,"").replace(/^\s*[:：,،\-–—.]\s*/,"").trim();
  return {named:named,n:n,name:s.slice(0,len).trim(),rest:rest};}

/* Arabic amounts people write in words, and its spoon, cup and loaf, made into what
   the food parser reads. The dual ("بيضتين", two eggs) is common enough to spell out. */
var AR_WORDS=[[/(^|\s)(?:نص|نصف)(?=\s)/g,"$10.5"],[/(^|\s)ربع(?=\s)/g,"$10.25"],
  [/(^|\s)(?:واحد|واحدة|واحده)(?=\s)/g,"$11"],[/(^|\s)(?:اتنين|اثنين|إتنين|إثنين)(?=\s)/g,"$12"],
  [/(^|\s)(?:تلاتة|ثلاثة|تلاته|ثلاثه|تلات|ثلاث)(?=\s)/g,"$13"],[/(^|\s)(?:أربعة|اربعة|أربعه|اربعه|أربع|اربع)(?=\s)/g,"$14"],
  [/(^|\s)(?:خمسة|خمسه|خمس)(?=\s)/g,"$15"],[/(^|\s)(?:ستة|سته)(?=\s)/g,"$16"]];
var AR_DUAL=[[/بيضتين/g,"2 بيض"],[/رغيفين/g,"2 رغيف"],[/كوبايتين|كوبين/g,"2 كوب"],[/معلقتين|ملعقتين/g,"2 tbsp"],
  [/حبتين/g,"2 piece"],[/شريحتين/g,"2 slice"],[/علبتين/g,"2 can"]];
var AR_UNITS=[[/(\d)\s*(?:معلقة|ملعقة|معلقه|ملعقه)\s*(?:صغيرة|صغيره|شاي)/g,"$1 tsp"],
  [/(\d)\s*(?:معلقة|ملعقة|معلقه|ملعقه)\s*(?:كبيرة|كبيره|أكل|اكل)?/g,"$1 tbsp"],
  [/(\d)\s*(?:كوباية|كوبايه|كوب)/g,"$1 cup"],[/(\d)\s*(?:شرائح|شريحة|شريحه)/g,"$1 slice"],
  [/(\d)\s*(?:حبات|حبة|حبه|قطع|قطعة|قطعه)/g,"$1 piece"],[/(\d)\s*(?:سكوب|سكوبات)/g,"$1 scoop"],
  [/(\d)\s*(?:جرام|جم|ج)(?=\s|$)/g,"$1 g"]];
function arabicAmounts(s){
  s=" "+s+" ";
  AR_DUAL.forEach(function(r){s=s.replace(r[0],r[1]);});
  AR_WORDS.forEach(function(r){s=s.replace(r[0],r[1]);});
  AR_UNITS.forEach(function(r){s=s.replace(r[0],r[1]);});
  return s.trim();}

/* One line of a meal: its first choice, its amounts readable, each food matched. */
function readLine(line,meal){
  var s=line.replace(BULLET,"").trim();
  s=s.split(/\s+(?:or|أو|او|ولا)\s+|\s*\/\/\s*/i)[0];
  s=arabicAmounts(s);
  if(!s)return;
  parseFoodInput(s).forEach(function(p){
    var r=resolveItem(p);
    if(r.status==="ok"||r.status==="ambiguous")meal.items.push(toLogItem(r));
    else meal.todo.push(p.raw);});}

/* text → [{named, n, name, items, todo}] in the order they came. */
function parsePlan(text){
  var lines=latin(text||"").replace(/\r/g,"").split("\n");
  var meals=[],cur=null,sawHead=false;
  lines.forEach(function(raw){
    var line=raw.trim();
    if(!line)return;
    var h=heading(line);
    if(h){sawHead=true;cur={named:h.named||null,n:h.n,name:h.name,items:[],todo:[]};meals.push(cur);
      if(h.rest)readLine(h.rest,cur);return;}
    if(!cur){cur={named:null,n:null,name:"",items:[],todo:[]};meals.push(cur);}
    readLine(line,cur);});
  /* No headings at all: a meal per block of lines. */
  if(!sawHead){
    meals=[];
    latin(text||"").replace(/\r/g,"").split(/\n\s*\n/).forEach(function(block){
      if(!block.trim())return;
      var m={named:null,n:null,name:"",items:[],todo:[]};
      block.split("\n").forEach(function(l){if(l.trim())readLine(l.trim(),m);});
      meals.push(m);});}
  return meals.filter(function(m){return m.items.length||m.todo.length;});}

export {parsePlan};
