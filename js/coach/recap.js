/* Bunyan — coach: a day told in one message
   Owner, 2 Nov: "I should be able to ask things like … or kind of vent out: اتا كلت بيض
   النهاردة في ساندويتش و سكريات الصبح مش عارف قد ايه بالظبط، و كلت فراخ اخر النهار، و اتمرنت
   صدر في الجيم، ايه تاني ممكن اعمله؟ ولو ينفع تدخلي المعلومات ديه في اليوم بتاعي".

   One message, several things: what was eaten (and when, and whether the amount is
   known), what was trained, "what else can I do?" and "put it in my day". This reads the
   message into those parts, in Egyptian Arabic, Franco-free Arabic script or English;
   the chat (js/ui/views/chat.js aRecap) finds the foods, offers to log them with one tap,
   and answers the rest. Nothing here looks anything up: words in, parts out.

   recapOf(text) → null | {foods:[{q, parts, meal, guess}], muscles[], ask, log}
     q      the words for one food ("بيض في ساندويتش", "chicken")
     parts  q split where "و" is written onto the next word, or null
     meal   Breakfast | Lunch | Dinner | Snack | "" (not said)
     guess  the amount was not given, or they said they don't know it
   null when it is not a day told: a single food ("I ate 200 g chicken") is the plain
   food log's; a question about food is a question. */

/* Folded as the coach folds: alef forms, ta marbuta, alef maqsura, no diacritics. */
function fold(s){return String(s||"").toLowerCase().replace(/[أإآ]/g,"ا").replace(/ة/g,"ه").replace(/ى/g,"ي").replace(/[ً-ْ]/g,"")
  .replace(/[“”"'`]/g,"").replace(/ساندويتش|سندويتش|سندوتش|ساندوتش|ساندويش/g,"ساندوتش");}

var EAT="كلت|اكلت|فطرت|اتغديت|اتعشيت|تغديت|تعشيت|شربت|i ate|ate|i had|had|eaten|drank|i drank";
var TRAIN="اتمرنت|تمرنت|لعبت|دربت|trained|i trained|worked out|i worked out|hit|did";
var EAT_RE=new RegExp("(^| )("+EAT+")( |$)"),TRAIN_RE=new RegExp("(^| )("+TRAIN+")( |$)");
var VERB_AFTER_WA=new RegExp("(^| )و ?(?=("+EAT.split("|").filter(function(w){return /[؀-ۿ]/.test(w);}).join("|")+"|"
  +TRAIN.split("|").filter(function(w){return /[؀-ۿ]/.test(w);}).join("|")+"))","g");
var MEALS=[["Breakfast",/(^| )(الصبح|الصباح|الفطار|الفطور|فطار|فطور|morning|breakfast|this morning)( |$)/],
  ["Lunch",/(^| )(الضهر|الظهر|الغدا|الغداء|غدا|lunch|noon|midday|afternoon)( |$)/],
  ["Dinner",/(^| )(اخر النهار|بالليل|الليل|العشا|العشاء|عشا|المسا|بليل|evening|tonight|night|dinner|end of the day)( |$)/],
  ["Snack",/(^| )(سناك|snack)( |$)/]];
var MUSCLES=[["Chest",/(^| )(صدر|chest|pecs?)( |$)/],["Back",/(^| )(ضهر|ظهر|back|lats?)( |$)/],["Legs",/(^| )(رجل|رجلين|ارجل|legs?|quads|hamstrings)( |$)/],
  ["Shoulders",/(^| )(كتف|اكتاف|كتاف|shoulders?|delts)( |$)/],["Arms",/(^| )(دراع|دراعات|باي|تراي|بايسبس|ترايسبس|arms?|biceps|triceps)( |$)/],
  ["Glutes",/(^| )(مؤخره|glutes?)( |$)/],["Core",/(^| )(بطن|core|abs)( |$)/]];
var UNSURE=/(مش عارف|معرفش|مش متاكد|مش فاكر|not sure|don ?t know|no idea|dunno)/;
var ASK=/(ايه تاني|اعمل ايه|اعمله|المفروض اعمل|انصحني|what else|what should i do|what can i do|anything else|what now|advice)/;
var LOG=/((دخل|تدخل|تدخلي|دخلي|سجل|تسجل|سجلي|ضيف|ضيفي|تضيف|حط|حطي) .*(يوم|اليوم))|((add|log|put|enter|record) (it|them|this|these|that|all|everything))|(to my day|in my day|into my day)/;
/* Words that are not a food: when, how much they know, where, the asking. */
var NOISE=/(^| )(انا|اتا|انه|i|for|for my|النهارده|انهارده|النهاردة|النهاردا|today|بالظبط|بالضبط|exactly|قد|ايه|كام|حوالي|تقريبا|about|some|a|an|the|my|in the|at the|في الجيم|الجيم|gym|كمان|برضو|برضه|also|too|بس|just)( |$)/g;

/* A clause starts at each verb: "… الضهر وكمان اتمرنت ضهر" is a meal, then a workout. */
var AR_VERBS=EAT.split("|").concat(TRAIN.split("|")).filter(function(w){return /[؀-ۿ]/.test(w);}).join("|");
var VERB_START=new RegExp(" (و ?)?((كمان|برضه|برضو|وبعدين|بعدين) )?(?=("+AR_VERBS+")( |$))","g");
function clausesOf(f){
  return f.replace(VERB_AFTER_WA,"$1، ").replace(VERB_START,"، ").split(/[،,.؟?!؛;:\n]+| ثم | بعدين | and then | then /).map(function(x){return x.trim();}).filter(Boolean);}

function recapOf(text){
  var f=" "+fold(text)+" ";
  var parts=clausesOf(f),foods=[],muscles=[],ask=ASK.test(f),log=LOG.test(f),lastEat=false;
  parts.forEach(function(c){
    var cc=" "+c+" ";
    /* "…, log it": the request to put it in the day, not a food. */
    if(/^ *(please |)(log|add|save|record|put) (it|them|that|those|this)( in| to| into)?( my day| today| the day)? *$|^ *(سجله|سجلها|سجلهم|سجلي|ضيفه|ضيفها|ضيفهم) *$/.test(c))return;
    if(TRAIN_RE.test(cc)){MUSCLES.forEach(function(m){if(m[1].test(cc)&&muscles.indexOf(m[0])<0)muscles.push(m[0]);});lastEat=false;return;}
    var eating=EAT_RE.test(cc);
    /* "… و سكريات الصبح": a food after one, without its own verb, is still eating. */
    if(!eating&&!lastEat)return;
    if(ASK.test(cc)&&!eating)return;
    lastEat=true;
    var meal="";MEALS.forEach(function(m){if(!meal&&m[1].test(cc))meal=m[0];});
    var guess=UNSURE.test(cc);
    var body=cc.replace(EAT_RE," ").replace(UNSURE," ");
    MEALS.forEach(function(m){body=body.replace(m[1]," ");});
    body=body.replace(/(قد ايه|how much|how many)/g," ");
    /* One food per "and": "eggs and sweets", "بيض و سكريات". A food "in a sandwich" stays
       one: the chat tries it as the sandwich first. */
    body.split(/ و | and | with | مع |\+/).forEach(function(x){
      var q=x.replace(NOISE," ").replace(NOISE," ").replace(/^و /," ").replace(/\s+/g," ").trim();
      if(!q||q.length<2||/^\d+$/.test(q))return;
      /* "فول وعيش": the "and" written onto the next word. Kept whole (a food may begin
         with و, ورق عنب), with its pieces for the chat to try when the whole is no food. */
      var parts=q.split(/ و(?=[؀-ۿ]{2})/);
      foods.push({q:q,parts:parts.length>1?parts:null,meal:meal,guess:guess||!/\d/.test(q)});});});
  /* A day told: more than one thing, or a request to put it in the day. A single food is
     the plain food log's. */
  var things=foods.length+(muscles.length?1:0);
  if(!(things>=2||(things>=1&&(log||ask&&muscles.length))))return null;
  return {foods:foods,muscles:muscles,ask:ask,log:log};}

export {recapOf, fold as recapFold};
