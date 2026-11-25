/* Bunyan — the answer bank's "Eating before training" entry, on its own (road map step
   3: a lighter start). The Today card's line before a session (js/engine/dayfuel.js)
   says its paragraphs, and is drawn at start; the whole bank (js/data/faq.js, 134 KB)
   is the coach's and loads with it. faq.js puts this entry back in its place, so the
   bank, its order and its Arabic are as they were: one entry, written once. */
var PRE_WORKOUT={id:"pre-workout",group:"food",title:["Eating before training","الأكل قبل التمرين"],glyph:"bowl",
 ex:["what to eat before workout","pre workout meal","should i eat before the gym","training on an empty stomach","how long before training should i eat","fasted training",
   "اكل ايه قبل التمرين","اتمرن على معده فاضيه","قبل الجيم اكل ايه","اكل قبل التمرين بقد ايه"],
 need:/before|pre|empty|fasted|قبل|فاضي|صايم/,
 beats:["eat","rest","today"],
 a:[["Before long or hard training, carbs refill the stores used overnight; quick, easy-to-digest carbs suit the last bit before you start.",
     "قبل التمرين الطويل أو الجامد، الكارب بيعوض المخزون اللي اتصرف بالليل؛ والكارب السريع السهل الهضم مناسب في آخر وقت قبل ما تبدأ."],
    ["Drink too: about 400 to 600 ml in the 20 to 30 minutes before you start.","واشرب كمان: حوالي 400 لـ 600 مل في الـ 20 لـ 30 دقيقة قبل ما تبدأ."],
    {n:["The textbooks give no exact time to eat before training, so I won't set one.","الكتب مش بتحدد وقت معين للأكل قبل التمرين، فمش هحدد."]},
    {mine:1}],
 src:["nutrition-principles:carbohydrate · timing","nutrition-principles:carbohydrate · blood sugar","nutrition-principles:hydration · protocol"]};
export {PRE_WORKOUT};
