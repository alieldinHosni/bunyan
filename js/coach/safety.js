/* Bunyan — the coach's red flags (docs/COACH-AGENT.md 2.2)
   Run on every message before anything else reads it, so no other answer, and not the
   on-device model, can outrank it. Pure: text in, a class out. No DOM, no state.

     classify(text) → {cls, sub, lang, hit}
       cls  "stop"     stop training now; this can be an emergency
            "session"  stop this session, sit, sip water; a doctor if it does not pass
            "refer"    medicines, a diagnosed condition, pregnancy (sub "medical"), or
                       eating very little, making oneself sick, self-harm (sub "care")
            null       none of these: the coach reads the message as usual
       sub  what was matched, by kind ("chest", "faint", "dizzy", "medical", "care", …)
       lang "ar" when the message is written in Arabic script, else "en"
       hit  the words that matched, as folded

   The words are symptoms, not muscles. Soreness is training talk: "my chest is sore
   from benching", "chest day", "my legs are dead", "killer workout", "heart rate zone
   2" match nothing. Where a phrase can be either ("my chest hurts"), what the person
   said caused it decides: from a lift or a workout, it is soreness and the coach's
   usual pain answer has it; with no cause said, it is a red flag. "Chest pain" and
   "pain in my chest" are always a red flag, whatever caused them: that is not the
   coach's to judge (js/knowledge/scope.js refer_symptoms).

   A word denied just before it ("no chest pain", "not dizzy", "مش دايخ") is not said.
   English words of six letters or more are read through one typo ("dizzyness",
   "nauseus", "lightheded"); shorter ones by the misspellings people type ("dizy",
   "chets"). Arabic is folded as the rest of the coach folds it (أ إ آ → ا, ى → ي,
   ة → ه, marks dropped), and may carry the article and the joined prefixes و ف ب ل. */

/* ---- reading the text ---------------------------------------------------------------- */
var ARABIC=/[؀-ۿ]/;
function fold(s){
  return String(s||"").toLowerCase()
    .replace(/[ً-ْٰـ]/g,"")
    .replace(/[أإآٱ]/g,"ا").replace(/ى/g,"ي").replace(/ؤ/g,"و").replace(/ئ/g,"ي").replace(/ة/g,"ه")
    .replace(/[’'`]/g,"")
    .replace(/[^\w\s؀-ۿ]/g," ").replace(/[؟،؛_]/g," ")
    /* A letter held down ("dizzzzy", "صدرييي"): three or more of it are two. */
    .replace(/(\D)\1{2,}/g,"$1$1")
    .replace(/\s+/g," ").trim();}

/* Words typed wrong, put right before reading. Short words only by the misspellings
   people make of them: one letter off "pain" is "paint", "rain", "main". */
var FIX={dizy:"dizzy",dizzi:"dizzy",dizzey:"dizzy",dizzie:"dizzy",dissy:"dizzy",
  chets:"chest",chset:"chest",cheast:"chest",chestt:"chest",
  pian:"pain",painn:"pain",
  numm:"numb",numbb:"numb",
  faintd:"fainted",fanted:"fainted",fainetd:"fainted",
  cant:"cant",cnt:"cant",cannt:"cant",
  breth:"breath",brethe:"breathe",breahte:"breathe",  puke:"puke",naseous:"nauseous",nauseus:"nauseous",nautious:"nauseous",nauscious:"nauseous",nausious:"nauseous",nausous:"nauseous",
  lightheaded:"lightheaded",lighthead:"lightheaded",headach:"headache",hedache:"headache",haedache:"headache"};
/* Words read through one typo (six letters or more, and the first letter right). */
var VOCAB=["dizzy","dizziness","lightheaded","nauseous","nausea","nauseated","fainted","fainting","passed","breathe","breathing",
  "breathless","shortness","headache","tightness","pressure","spreading","radiating","shooting","tingling","tingles","slurred",
  "slurring","blurred","blurry","vision","racing","pounding","fluttering","palpitations","numbness","weakness","vomiting",
  "vomited","throwing","stabbing","popped","snapped","collapsed","unconscious","consciousness","drooping","squeezing",
  "crushing","heaviness","suicide","suicidal","starving","purging","bulimia","anorexia","medication","medicine",
  "diabetes","diabetic","pregnant","pregnancy","insulin","painkiller","painkillers","ibuprofen","paracetamol","asthma",
  "hypertension","epilepsy","seizure","seizures","spinning","vertigo","chest"];
function near1(a,b){
  if(a===b)return true;
  var la=a.length,lb=b.length;if(Math.abs(la-lb)>1)return false;
  if(la===lb){var d=[];for(var i=0;i<la;i++)if(a.charAt(i)!==b.charAt(i))d.push(i);
    return d.length===1||(d.length===2&&d[1]===d[0]+1&&a.charAt(d[0])===b.charAt(d[1])&&a.charAt(d[1])===b.charAt(d[0]));}
  var sh=la<lb?a:b,lo=la<lb?b:a,k=0;
  while(k<sh.length&&sh.charAt(k)===lo.charAt(k))k++;
  return sh.slice(k)===lo.slice(k+1);}
/* Real words one letter from a red-flag word, which must stay what they are. */
var KEEP={breath:1,breaths:1,passes:1,pasted:1,paused:1,parsed:1,raging:1,revision:1,breathy:1,shooter:1,passer:1,pressured:1,
  testing:1,tinting:1,shouting:1,sorting:1,blurted:1,starting:1,staring:1};
function fixWord(w){
  if(FIX[w])return FIX[w];
  if(KEEP[w]||w.length<6||/\d/.test(w)||ARABIC.test(w))return w;
  for(var i=0;i<VOCAB.length;i++){var v=VOCAB[i];
    if(v.length>=6&&v.charAt(0)===w.charAt(0)&&v!==w&&near1(w,v))return v;}
  return w;}
function prep(text){
  var f=fold(text);
  if(!ARABIC.test(f))f=f.split(" ").map(fixWord).join(" ");
  /* One spelling for the words the patterns read. */
  return " "+f.replace(/\b(can not|cannot|can t|cant|cnt)\b/g,"cant").replace(/\b(light headed|light-headed)\b/g,"lightheaded")
    .replace(/\b(don t|dont|do not)\b/g,"dont").replace(/\b(i m|im|i am)\b/g,"im").replace(/\b(it s|its|it is)\b/g,"its")
    .replace(/\b(won t|wont|will not)\b/g,"wont").replace(/\b(isn t|isnt|is not)\b/g,"isnt").replace(/\b(didn t|didnt|did not)\b/g,"didnt")
    .replace(/\b(doesn t|doesnt|does not)\b/g,"doesnt").replace(/\b(wasn t|wasnt|was not)\b/g,"wasnt")+" ";}

/* ---- the patterns -------------------------------------------------------------------- */
/* An Arabic word with the article and the joined prefixes it may carry. */
function aw(x){return "(?:و|ف|ب|ل|ال|وال|بال|فال|لل)?(?:"+x+")";}
/* An English or Arabic phrase as whole words: the text is " … " padded. */
function W(x){return new RegExp(" (?:"+x+")(?= )","g");}

var MY="(?:my |the |in my |in the |on my |on the |)";
var CHESTP="(?:pain|pains|painful|pressure|tightness|tight|squeezing|squeeze|crushing|heaviness|heavy|discomfort)";
var ARM="(?:left |right |)(?:arm|arms|jaw|neck)";
/* What made a part hurt, said with it: then it is training soreness, not a red flag. */
var CAUSE=/ (from|after|since|because of|cause of|due to) (the |my |a |doing |yesterdays |last nights |todays |)(bench|benching|press|pressing|pressed|push ?ups?|pushups|flyes|flys|fly|dips|workout|training|gym|session|lifting|chest day|push day|weights|exercise|exercises|cable|crossovers?|incline|decline|dumbbells?|reps|sets|it|that)| (doms|sore|soreness|pump|pumped)( |$)| من (ال)?(بنش|تمرين|التمرين|الجيم|البنش|الضغط|التدريب|امبارح|الحديد|الدمبل|البار|العده|الفلاي|الديبس)|(مكسر|مكسره|متكسر|متكسره|متكسرين|مكسرين)/;

var STOP=[
  /* Chest pain or pressure (refer_symptoms, 11.1). */
  ["chest",W("chest "+CHESTP+"|pain (?:in|on|across|around) (?:my |the |)(?:chest|heart)|(?:pressure|tightness|heaviness|squeezing|crushing|weight) (?:in|on|across) (?:my |the |)chest|chest (?:feels|is|went|gets|got) (?:tight|heavy|crushed|squeezed|like (?:its being )?(?:crushed|squeezed))|chest (?:hurts|is hurting|hurting|aches|is aching|aching|is killing me|burns|is burning)|heart (?:pain|hurts|hurting)|pain (?:near|by) my heart|having a heart attack|heart attack (?:right now|now)|(?:is this|think im having|am i having) a heart attack")],
  ["chest",W(aw("الم|وجع|اوجاع|ضغط|تقل|كتمه|قبضه|خنقه|نغزه|شكه")+" (?:في|على|علي|ب) ?(?:ال)?(?:صدري|صدر|قلبي|قلب)|"+aw("وجع|الم")+" (?:ال)?(?:صدر|قلب)|صدري (?:مقبوض|مكتوم|تقيل|مضغوط|بيتقبض|بيوجعني|واجعني|وجعني|بيالمني|ضاغط عليا)|قلبي (?:بيوجعني|واجعني|وجعني|بيتقبض)|(?:عندي|جالي|جاتلي|حاسس ب|حاسه ب|بتجيلي|هتجيلي|شكلها) ?(?:ازمه قلبيه|جلطه)|(?:حاسس|حاسه) (?:اني|انى) (?:هتجيلي|بتجيلي|جايالي) (?:ازمه|جلطه)")],
  /* Pain spreading to the arm, the jaw or the neck. */
  ["spread",W("(?:pain|ache|aching|it|tightness|pressure) (?:is |)(?:spreading|spreads|spread|going|goes|moving|moves|radiating|radiates|shooting|shoots|travelling|traveling) (?:down |up |into |to |through |)(?:my |the |)"+ARM+"|"+ARM+" (?:and|or) (?:my |)(?:jaw|neck|chest) (?:pain|hurts|hurt|ache)|(?:numb|tingling|tingly|weak|heavy) (?:left|right) arm|(?:left|right) arm (?:is |feels |went |)(?:numb|tingling|tingly|weak|heavy|dead)")],
  ["spread",W("(?:الوجع|الالم|وجع|الم) (?:بيروح|راح|رايح|نازل|بينزل|واصل|وصل|ماشي|بيمتد|ممتد|بيضرب|ضارب|بيجري) (?:ل|لل|في|على|علي|ناحيه|لحد) ?(?:ال)?(?:دراعي|دراع|ايدي|فكي|فك|رقبتي|رقبه|كتفي|ضهري)|(?:دراعي|ايدي) (?:الشمال|اليمين) (?:منمله|منمل|مخدره|مخدر|تقيله|بتنمل|مش حاسس بيها|ميته)|تنميل (?:في|ف) (?:دراعي|ايدي) (?:الشمال|اليمين)")],
  /* Fainting or passing out. */
  ["faint",W("fainted|fainting|passed out|blacked out|lost consciousness|lose consciousness|losing consciousness|went unconscious|was unconscious|i collapsed|i just collapsed|keep fainting")],
  ["faint",W(aw("اغمي عليا|اغمي علي|اغمي عليه|اتغمي عليا|اتغمي علي|اغماء|اغمي|فقدت الوعي|فقد الوعي|غبت عن الوعي|وقعت من طولي|دخت ووقعت|وقعت مغمي|سقطت مغمي"))],
  /* Severe shortness of breath. */
  ["breath",W("cant (?:breathe|breath|get air|get enough air|catch my breath at rest)|(?:struggling|struggle|hard|difficult|difficulty|trouble|unable) (?:to |)(?:breathe|breathing)|(?:difficulty|trouble|problem|problems) breathing|(?:severe|very|really|extremely|so) (?:short of breath|breathless)|shortness of breath (?:at rest|while resting|sitting)|gasping for air|choking|cant get my breath")],
  ["breath",W("(?:مش|مبقتش|مبقيتش) (?:قادر|قادره|عارف|عارفه|عارفة|لاقي|لاقيه) (?:اتنفس|اخد نفسي|اخد نفس)|مش لاقي نفسي|"+aw("ضيق")+" (?:تنفس|في التنفس|في النفس|نفس|في نفسي)|صعوبه (?:في )?(?:التنفس|تنفس)|نفسي (?:مكتوم|محبوس)")],
  /* A sudden, severe headache. */
  ["head",W("(?:sudden|severe|worst|terrible|splitting|thunderclap|blinding|crushing|really bad|very bad|extreme|explosive|massive) (?:sudden |severe |)headache|headache (?:came on |hit me |started |)(?:suddenly|out of nowhere|like a thunderclap|all of a sudden)|worst headache|head (?:is |feels like its |)(?:exploding|going to explode|about to explode)")],
  ["head",W(aw("صداع")+" (?:جامد جدا|جامد اوي|شديد|فظيع|مفاجئ|مفاجيء|مفاجي|رهيب|مش طبيعي|جه فجاه|جالي فجاه|فجاه)|اسوا صداع|(?:راسي|دماغي) (?:هتنفجر|بتنفجر|هتتفرتك)")],
  /* Numbness or weakness on one side, a face that droops. */
  ["side",W("(?:numb|numbness|weak|weakness|tingling|paralysed|paralyzed|droop|drooping|dropping) (?:on|in|down) (?:one|the left|the right|my left|my right|left|right) side|one side (?:of my (?:body|face) )?(?:is |feels |went |goes |)(?:numb|weak|droopy|drooping|dead|paralysed|paralyzed)|(?:left|right) side (?:of my (?:body|face) )?(?:is |feels |went |)(?:numb|weak|droopy|drooping|dead)|face (?:is |)(?:drooping|droopy|numb on one side)|(?:half|side) of my face|cant (?:move|feel) my (?:arm|leg|face) suddenly|suddenly cant (?:move|feel) my")],
  ["side",W("(?:نص|ناحيه|جنب|شق) (?:جسمي|وشي|الجسم|الوش) (?:منمل|مخدر|تقيل|ضعيف|مش حاسس بيه|نايم|مشلول|واقع|مايل)|تنميل (?:في|ف) (?:نص|ناحيه|جنب|شق) (?:جسمي|وشي)|(?:وشي|بقي) (?:مايل|معوج|واقع|اتعوج) (?:من )?(?:ناحيه|جنب)?|مش (?:حاسس|قادر احرك) (?:ب)?(?:دراعي|رجلي|وشي) (?:فجاه|مره واحده)")],
  /* Slurred speech. */
  ["speech",W("slurred|slurring|slur my words|speech (?:is |)(?:slurred|weird|strange|off)|cant (?:speak|talk) (?:properly|right|clearly)|trouble (?:speaking|talking)|words (?:are |)(?:coming out|come out) wrong")],
  ["speech",W("(?:كلامي|لساني) (?:تقيل|تقل|اتقل|بيتلخبط|متلخبط|مش مظبوط|مش مفهوم)|مش (?:قادر|عارف) (?:اتكلم|انطق) (?:كويس|عدل)")]];

var SESSION=[
  /* Dizzy, light-headed, close to fainting. */
  ["dizzy",W("dizzy|dizziness|lightheaded|woozy|vertigo|the room is spinning|room spinning|head is spinning|head spinning|spinning head|feel faint|feeling faint|felt faint|about to faint|going to faint|gonna faint|going to pass out|gonna pass out|about to pass out|nearly fainted|almost fainted|nearly passed out|almost passed out|close to fainting|seeing stars")],
  /* Short of breath, not severely. */
  ["breath",W("shortness of breath|short of breath|breathless (?:at rest|for no reason|sitting)")],
  ["dizzy",W(aw("دايخ|دايخه|دوخه|دوخا|دوخان|دخت|بدوخ|هدوخ|دايخين")+"|الدنيا (?:بتلف|لفت|بتدور|دارت)(?: بيا)?|(?:راسي|دماغي) (?:بتلف|لفت|بتدور)|هيغمي عليا|هيغمي علي|هيتغمي عليا|هيتغمي علي|قربت يغمي عليا|حاسس اني هيغمي|حاسه اني هيغمي|هيغمي")],
  /* Nauseous. */
  ["sick",W("nauseous|nausea|nauseated|queasy|want to (?:throw up|vomit|puke)|going to (?:throw up|vomit|puke)|gonna (?:throw up|vomit|puke)|about to (?:throw up|vomit|puke)|threw up|throwing up|vomited|vomiting|puked|puking|feel sick to my stomach|sick to my stomach")],
  ["sick",W(aw("غثيان|ترجيع|مترجع")+"|نفسي (?:غامه|غمانه|هتطلع|بتقلب)|(?:معدتي|بطني) (?:مقلوبه|بتقلب|اتقلبت)|(?:هاستفرغ|هستفرغ|استفرغت|بستفرغ|رجعت اللي اكلته|حاسس اني هرجع|حاسه اني هرجع|قربت ارجع)")],
  /* Blurred vision. */
  ["vision",W("blurred vision|blurry vision|vision (?:is |went |goes |)(?:blurry|blurred|blurring|dark|weird|fuzzy|tunnel)|tunnel vision|seeing double|double vision|seeing spots|everything (?:went|is) (?:blurry|black|dark)|cant see (?:properly|clearly|straight)|eyes (?:went|are) blurry|blacking out|vision blacked")],
  ["vision",W(aw("زغلله|زغلل|زغلة|غمامه")+"|(?:نظري|عيني|عينيا) (?:اتزغلل|مزغلل|زغللت|بتزغلل|اتزغللت|مش واضح|ضلم|ضلمت|بقي مش واضح)|مش شايف كويس|شايف (?:نجوم|اتنين|مزدوج|ضباب)|الدنيا ضلمت")],
  /* A heart racing or fluttering at rest. */
  ["heart",W("palpitations|palpitation|heart (?:is |keeps |)(?:fluttering|flutters|skipping|skips|skipped|irregular|jumping|flipping|beating irregularly|beating weird|beating funny|beating strangely)|irregular heartbeat|(?:heart|pulse|heart rate) (?:is |keeps |)(?:racing|pounding|very fast|really fast|so fast|beating fast|beating so fast|high) (?:at rest|while resting|when resting|sitting down|while sitting|lying down|for no reason|and wont slow|and it wont slow|and wont come down|even resting|even at rest|even sitting)|heart (?:wont|doesnt|isnt) (?:slow|slowing|come down|calm)|heart (?:is |)(?:racing|pounding) (?:and|with) (?:dizzy|chest)|resting heart rate is (?:racing|pounding|very high)")],
  ["heart",W(aw("خفقان")+"|قلبي (?:بيرفرف|بيرف|بيتنطط|بينط|مش منتظم|بيقف|بيدق غلط|بيدق بشكل غريب|بيدق مش منتظم)|(?:قلبي|نبضي) (?:بيدق|بيخبط|سريع|عالي|بيجري) (?:جامد |بسرعه |اوي |جدا )*(?:و?انا (?:قاعد|قاعده|مرتاح|مرتاحه|نايم|نايمه)|من غير سبب|ومش (?:بيهدي|راضي يهدي))|ضربات قلبي (?:مش منتظمه|غريبه|بتقف)")],
  /* Sharp or sudden pain; a pop or a snap; pain that shoots or tingles. */
  ["sharp",W("sharp (?:pain|stabbing|shooting)|stabbing pain|sudden (?:sharp |)pain|pain (?:is |was |)(?:sharp|stabbing|sudden)|(?:knee|shoulder|elbow|back|hip|ankle|wrist|neck|hamstring|calf|pec|bicep|biceps|achilles|groin|quad|tricep|triceps) (?:just |suddenly |)(?:gave out|gave way)|something (?:just |)(?:popped|snapped|tore|ripped|gave way|gave out)|(?:felt|heard) (?:a |something |it |)(?:pop|popped|snap|snapped|crack|tear|tore|rip|ripped)|(?:popped|snapped|tore|ripped) (?:something|my)|(?:knee|shoulder|elbow|back|hip|ankle|wrist|neck|hamstring|calf|pec|bicep|biceps|achilles|groin|quad|tricep|triceps|muscle) (?:just |)(?:popped|snapped)|(?:shooting|electric|burning nerve) pain|pain (?:that |)(?:shoots|shooting|shot) (?:down|up|through|into)|(?:tingling|tingles|pins and needles|electric shock|numbness|numb|tingly) (?:in|down|through|into) (?:my |)(?:arm|arms|leg|legs|hand|hands|fingers|foot|feet|back|butt)|(?:arm|arms|leg|legs|hand|hands|fingers|foot|feet) (?:is |are |go |goes |went |keep going |)(?:numb|tingling|tingly)")],
  ["sharp",W(aw("وجع|الم|نغزه|شكه")+" (?:حاد|حاده|جامد مفاجئ|مفاجئ|مفاجيء|مفاجي|زي السكينه|زي الكهربا|كهربا)|(?:سمعت|حسيت ب|حسيت) ?(?:صوت )?(?:طقه|فرقعه|قطع|حاجه طقت|حاجه اتقطعت|حاجه فرقعت|حاجه اتشدت جامد)|حاجه (?:طقت|اتقطعت|فرقعت|اتفشخت) (?:في|ف)|(?:ركبتي|كتفي|ضهري|كوعي|رجلي|عضلتي|وركي|كاحلي|رسغي) (?:طقت|اتقطعت|فرقعت|خانتني|اتلوت|قفلت)|(?:كهربا|كهربه) (?:نازله|نازل|بتنزل|بيضرب|ضاربه|في|ف) (?:في |ف )?(?:رجلي|دراعي|ايدي|صوابعي|ضهري)|"+aw("تنميل|تنمل")+"|(?:رجلي|دراعي|ايدي|صوابعي) (?:بتنمل|منمله|بيتنمل|اتنملت|بقت تنمل)")]];

var REFER=[
  /* Eating very little, making oneself sick, self-harm: a kind line and a person to talk to. */
  ["care",W("hurt myself|hurting myself|harm myself|harming myself|self harm|selfharm|cut myself|cutting myself|kill myself|killing myself|suicide|suicidal|end my life|end it all|dont want to live|dont want to be alive|i want to die|i wanna die|i just want to die|no reason to live|better off dead|make myself (?:throw up|sick|vomit|puke)|making myself (?:throw up|sick|vomit|puke)|throw up (?:after|everything i) (?:i )?eat|purge|purging|bulimia|bulimic|anorexia|anorexic|eating disorder|starving myself|starve myself|barely eat(?:ing)? (?:anything|at all)|stopped eating|not eating (?:anything|at all)|havent eaten (?:in|for) (?:days|a week|\\d+ days)|only eat (?:once|one meal) every (?:two|2|few|other) days")],
  ["care",W("(?:eat|eating|ate|having|on|living on|surviving on) (?:only |just |about |around |less than |under |)(?:[1-9]\\d{0,2}|0) (?:calories|kcal|cals|cal) (?:a|per|each|in a) day|(?:eat|eating) (?:only |just |)(?:[1-9]\\d{0,2}|0) (?:calories|kcal|cals|cal) daily")],
  ["care",W("(?:ااذي|اأذي|باذي|اذي|بأذي|هأذي|هاذي) نفسي|اموت نفسي|هموت نفسي|اقتل نفسي|هقتل نفسي|انتحر|هنتحر|انتحار|(?:عايز|عاوز|عايزه|نفسي) اموت|مش (?:عايز|عاوز|عايزه) اعيش|(?:بجرح|اجرح|هجرح) نفسي|(?:بخلي|بخلى) نفسي (?:ارجع|استفرغ)|(?:برجع|بستفرغ|بطلع) (?:الاكل|اللي باكله|اللي اكلته) (?:بايدي|بمزاجي|عن قصد|بعد الاكل)|بوليميا|انوركسيا|اضطراب (?:في )?(?:الاكل|اكل)|(?:بجوع|مجوع|هجوع) نفسي|(?:مش باكل|مبكلش|مباكلش|مش بكل) (?:خالص|اي حاجه)|بطلت (?:اكل|ااكل) خالص|مكلتش (?:بقالي|من) (?:ايام|يومين|اسبوع)")],
  ["care",W("(?:باكل|بكل|باكل بس|بكل بس) (?:[1-9]\\d{0,2}|[١-٩][٠-٩]{0,2}) (?:سعر|سعره|كالوري|كالوريز)(?: بس|) (?:في|ف|كل) (?:ال)?يوم")],
  /* Medicines, a diagnosed condition, pregnancy: the scope answer (js/knowledge/scope.js). */
  ["medical",W("medicine(?! ball)|medicines|medication|medications|meds|painkiller|painkillers|pain killer|pain killers|ibuprofen|paracetamol|panadol|aspirin|antibiotic|antibiotics|antidepressant|antidepressants|insulin|metformin|beta blocker|beta blockers|blood thinner|blood thinners|my pills|the pill|birth control|diabetes|diabetic|type (?:1|2|one|two) diabetes|high blood pressure|hypertension|blood pressure (?:is high|pills|meds|medication)|heart (?:condition|disease|problem|problems|failure|surgery)|had a heart attack|had a stroke|asthma|asthmatic|epilepsy|epileptic|seizures|thyroid|hypothyroid|hyperthyroid|kidney disease|liver disease|cancer|chemo|chemotherapy|pregnant|pregnancy|expecting a baby|breastfeeding|postpartum|gave birth|after (?:my |)(?:c section|caesarean|surgery|operation)|had (?:surgery|an operation)|pcos|(?:diabetic|diabetes|insulin|medication|meds|condition) and (?:im |)fasting|fasting (?:with|and) (?:diabetes|my diabetes|insulin|medication|meds|a condition|high blood pressure)|water fast(?:ing|)|dry fast(?:ing|) for (?:days|\\d+ days)")],
  ["medical",W(aw("دوا|دواء|ادويه|مسكن|مسكنات|برشام|انسولين|السكري|حامل|رضاعه|بارضع|ربو|صرع|الغده|غده|سرطان|كيماوي|منع الحمل|كورتيزون")+"|(?:مشكله|مرض|فشل) (?:في )?(?:ال)?كلي|(?:عندي|معايا|عنده|مريض|مريضه) (?:ال)?(?:سكر|ضغط|قلب|السكري|ربو|حساسيه صدر|غده|صرع)|(?:ل|ل?ل)?مرضي (?:ال)?(?:سكر|ضغط|قلب|السكري)|ضغط (?:ال)?دم|(?:ال)?ضغط (?:عالي|مرتفع|واطي)|سكر (?:في|ف) الدم|عملت عمليه|بعد (?:ال)?عمليه|بعد (?:ال)?ولاده|ولدت|قيصري|(?:باخد|باخد|بخد|اخد|ناخد) (?:حبوب|حباية|حبايه|برشام|حقن|حقنه|دوا)|صايم و(?:عندي|باخد)|(?:عندي|باخد) .{0,20} وصايم")]];

/* A word denied just before what matched: "no chest pain", "not dizzy", "مش دايخ". */
var NEG=/ (no|not|never|without|dont have|didnt have|doesnt have|dont feel|didnt feel|dont get|isnt|wasnt|no more|no longer|nor|zero|مش|مفيش|معنديش|معندوش|بدون|من غير|مبقتش|ماعنديش|ولا|مش حاسس|مش حاسه|مبقتش حاسس|مبقتش حاسه|مش حاسس ب|مش حاسه ب)$/;
function denied(s,at){var before=s.slice(0,at).replace(/\s+$/,"");before=" "+before.split(" ").slice(-2).join(" ");return NEG.test(before)||NEG.test(" "+before.split(" ").pop());}
/* Figures of speech that use a symptom's word. */
var FIGURATIVE=/ (dizzy|lightheaded) (with|from) (excitement|joy|happiness|love|the news|laughing|laughter|anticipation)| (dizzy|giddy) (with|from) (excitement|joy|happiness)| (دايخ|دايخه) (من|في) (الفرحه|الفرح|الحب|الضحك|المذاكره|الشغل)| (my )?heart (rate )?zone| zone (1|2|3|4|5|one|two|three|four|five)| (i could|i want to|i wanna|gonna) (pass out|faint) (from|after) (the |that |this )?(food|meal|buffet|eating)| killer | (this|that|leg day|the workout|workouts?|cardio|it) (is |was |)(killing|killed|kills) me | almost killed me | (dead|died) (legs|arms)| legs are dead| arms are dead| سمعت (اغنيه|خبر)| (collapsed|passed out|crashed) (on|onto|in|into) (the |my )?(couch|bed|sofa)/;

/* Words that keep a chest phrase a red flag whatever caused it. */
var PAINWORD=/ (pain|pains|painful|pressure|tightness|crushing|squeezing|heaviness|heart|attack|الم|والم|بالم|وجع|ضغط|كتمه|قبضه|تقل|قلب|قلبي|جلطه|ازمه|مقبوض|مكتوم)(?= )/;
function first(list,s){
  for(var i=0;i<list.length;i++){var re=list[i][1];re.lastIndex=0;var m;
    while((m=re.exec(s))){
      if(!denied(s,m.index+1))return {sub:list[i][0],hit:m[0].trim()};}}
  return null;}

function classify(text){
  var raw=String(text||""),lang=ARABIC.test(raw)?"ar":"en",s=prep(raw);
  if(s.trim()==="")return {cls:null,sub:"",lang:lang,hit:""};
  var fig=FIGURATIVE.test(s);
  var h=first(STOP,s);
  /* Chest words with the lift or the workout that made them sore are soreness, unless
     the words are pain or pressure ("chest pain from benching" still stops). */
  if(h&&h.sub==="chest"&&CAUSE.test(s)&&!PAINWORD.test(" "+h.hit+" "))h=null;
  if(h&&h.sub==="faint"&&fig)h=null;
  if(h)return {cls:"stop",sub:h.sub,lang:lang,hit:h.hit};
  h=first(SESSION,s);
  if(h&&!(fig&&/^(dizzy|heart)$/.test(h.sub)))return {cls:"session",sub:h.sub,lang:lang,hit:h.hit};
  h=first(REFER,s);
  if(h&&!(fig&&h.sub==="care"))return {cls:"refer",sub:h.sub,lang:lang,hit:h.hit};
  return {cls:null,sub:"",lang:lang,hit:""};}

export {classify, fold as safetyFold};
