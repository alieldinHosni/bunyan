# Arabic exercise names — audit

Design session, 20 Oct. Requested by the owner after the Ask panel found two bugs (a name
collision and a doubled word). **Every exercise the app knows** was run through
`exName()` in the browser with the app in Arabic, and again in English: 949 names, the
876 in `exercises.json` plus 73 added in code (`EXTRA` in `js/data/exercises.js`).

**Proposals only.** Nothing in `js/` has been changed; the owner reviews the names as a
batch, and the app session applies them.

## Counts

| Problem | Groups / entries |
|---|---|
| Arabic collisions: two or more exercises, one Arabic name | **17 groups, 37 exercises** |
| ... of which also collide in **English** display | 15 groups (13 wholly, 2 partly) |
| ... the other 2: the **same exercise listed twice** | 2 pairs |
| Doubled word, side by side ("جانبي جانبي") | **6** |
| A word repeated elsewhere in the name | **7** (5 wrong, 2 acceptable) |
| No Arabic at all | **13** |
| Partly untranslated (Arabic with Latin words left in) | **99** (listed at the end) |

## Two classes, not one-offs

1. **Collisions come mostly from the display name, not the Arabic.** 15 of the 17 groups
   collide in English too: `exShort()` drops *every* trailing qualifier ("- Rope
   Attachment", "- Below the Knees", "(Lunge style)", "- Chest Version"), not only the grip
   qualifier the owner asked to drop ("- Medium Grip"). In English, "Triceps Pushdown"
   already appears three times in the picker. **Root-cause fix: drop only grip
   qualifiers**; keep a qualifier that tells two library entries apart. Then the Arabic
   names below follow from the same rule.
2. **Doubled and repeated words come from overlapping terms.** "side" and "lateral" are
   both جانبي; "front" and "lat pulldown" both contain أمامي; "parallel" and "dip" both
   متوازي; "pronated" and "grip" both قبضة. **Root-cause fix:** after composing, drop a
   word already present in the name, and give "side to side" its own term
   (من جنب لجنب).

## 1. Collisions — every group, with proposed names

| Exercise (data key) | Arabic today | Proposed | Note |
|---|---|---|---|
| Arnold Dumbbell Press | أرنولد بريس بالدمبل | **أرنولد بريس بالدمبل** | Same exercise as Dumbbell Arnold Press (an added name, not in the library file). **Merge, not rename.** |
| Dumbbell Arnold Press | أرنولد بريس بالدمبل | **— merge into Arnold Dumbbell Press** | Duplicate |
| Band Good Morning | جود مورنينج بالأستك | **جود مورنينج بالأستك** |  |
| Band Good Morning (Pull Through) | جود مورنينج بالأستك | **جود مورنينج بالأستك (بول ثرو)** |  |
| Barbell Ab Rollout | بطن رول أوت بالبار | **رول أوت بطن بالبار** | Also fixes the word order (بطن first today). |
| Barbell Ab Rollout - On Knees | بطن رول أوت بالبار | **رول أوت بطن بالبار على الركب** |  |
| Bench Press - Powerlifting | بنش بريس | **بنش بريس باورليفتنج** |  |
| Bench Press - With Bands | بنش بريس | **بنش بريس بالأستك** |  |
| Chest Push (multiple response) | صدر دفع | **دفع صدر بتكرار متتالي** | Medicine-ball throw done as continuous reps. |
| Chest Push (single response) | صدر دفع | **دفع صدر بتكرار واحد** | One rep, reset, repeat. |
| Crunch - Hands Overhead | كرانش | **كرانش بإيدين فوق الراس** |  |
| Crunch - Legs On Exercise Ball | كرانش | **كرانش برجلين على كرة التوازن** |  |
| Crunches | كرانش | **كرانش** | Stays as it is. |
| Decline Smith Press | بريس منحدر بالسميث | **بريس منحدر بالسميث** | Same exercise as Smith Machine Decline Press. **Merge, not rename.** |
| Smith Machine Decline Press | بريس منحدر بالسميث | **— merge into Decline Smith Press** | Duplicate |
| Dips - Chest Version | متوازي | **متوازي للصدر** |  |
| Dips - Triceps Version | متوازي | **متوازي للترايسبس** |  |
| Hang Clean | هانج كلين | **هانج كلين** | Stays. |
| Hang Clean - Below the Knees | هانج كلين | **هانج كلين من تحت الركبة** |  |
| Hang Snatch | معلق سناتش | **هانج سناتش** | Also makes it match هانج كلين (today: معلق سناتش). |
| Hang Snatch - Below Knees | معلق سناتش | **هانج سناتش من تحت الركبة** |  |
| Incline Dumbbell Flyes | فلاي مائل بالدمبل | **فلاي مائل بالدمبل** | Stays. |
| Incline Dumbbell Flyes - With A Twist | فلاي مائل بالدمبل | **فلاي مائل بالدمبل مع لف** |  |
| Isometric Neck Exercise - Front And Back | رقبة تمرين ثبات | **ثبات رقبة أمامي وخلفي** | Also fixes the order (today: رقبة تمرين ثبات). |
| Isometric Neck Exercise - Sides | رقبة تمرين ثبات | **ثبات رقبة جانبي** |  |
| Kettlebell Turkish Get-Up (Lunge style) | توركيش جيت أب بالكتل بيل | **توركيش جيت أب بالكتل بيل بطريقة اللانج** |  |
| Kettlebell Turkish Get-Up (Squat style) | توركيش جيت أب بالكتل بيل | **توركيش جيت أب بالكتل بيل بطريقة السكوات** |  |
| Oblique Crunches | جانبية البطن كرانش | **كرانش جانبي** | Also fixes the order (today: جانبية البطن كرانش). |
| Oblique Crunches - On The Floor | جانبية البطن كرانش | **كرانش جانبي على الأرض** |  |
| Push-Ups - Close Triceps Position | ضغط | **ضغط ضيق للترايسبس** |  |
| Pushups | ضغط | **ضغط** | Stays. |
| Pushups (Close and Wide Hand Positions) | ضغط | **ضغط بقبضة ضيقة وواسعة** |  |
| Push Press | بوش بريس | **بوش بريس** | Stays. |
| Push Press - Behind the Neck | بوش بريس | **بوش بريس خلف الرقبة** |  |
| Triceps Pushdown | ترايسبس بوش داون | **ترايسبس بوش داون** | Stays. |
| Triceps Pushdown - Rope Attachment | ترايسبس بوش داون | **ترايسبس بوش داون بالحبل** | **The name used in the Ask panel prototype.** "بالحبل" is already the app's word for rope (EX_EQUIP). |
| Triceps Pushdown - V-Bar Attachment | ترايسبس بوش داون | **ترايسبس بوش داون بمقبض V** |  |

## 2. Doubled words — every one

| Exercise | Arabic today | Proposed |
|---|---|---|
| Bent Over Low-Pulley Side Lateral | بكرة منحني منخفض جانبي جانبي | **رفرفة جانبي منحني بالكابل المنخفض** |
| One-Arm Side Laterals | بذراع واحدة جانبي جانبي | **رفرفة جانبي بذراع واحدة** |
| Side Lateral Raise | رفرفة جانبي جانبي | **رفرفة جانبي** |
| Side Laterals to Front Raise | رفرفة أمامي جانبي جانبي | **رفرفة جانبي ثم أمامي** |
| Side To Side Chins | ذقن جانبي جانبي | **عقلة من جنب لجنب** |
| Side to Side Box Shuffle | صندوق Shuffle جانبي جانبي | **شافل على الصندوق من جنب لجنب** |

## 3. A word repeated elsewhere in the name

| Exercise | Arabic today | Proposed | Note |
|---|---|---|---|
| Calf Press On The Leg Press Machine | بريس سمانة على ليج بريس بالجهاز | **بريس سمانة على جهاز الليج بريس** | Repeats بريس, but correctly: it is a calf press on the leg-press machine. Proposed only for word order. |
| Close-Grip Front Lat Pulldown | سحب أمامي قبضة ضيقة أمامي | **سحب أمامي قبضة ضيقة** | "front" and "lat pulldown" both give أمامي. |
| Dumbbell Tricep Extension -Pronated Grip | ترايسبس إكستينشن قبضة علوية قبضة بالدمبل | **ترايسبس إكستينشن بالدمبل قبضة علوية** | "pronated" and "grip" both give قبضة. |
| Hyperextensions With No Hyperextension Bench | فرد الظهر بـ No فرد الظهر بنش | **فرد الظهر من غير بنش** | Also has untranslated "No". |
| Intermediate Hip Flexor and Quad Stretch | إطالة ثني الورك و أمامية الفخذ إطالة متوسط | **إطالة ثني الورك وأمامية الفخذ (متوسط)** | "stretch" placed twice. |
| Parallel Bar Dip | متوازي بار متوازي | **متوازي** | "parallel" and "dip" both give متوازي. |
| Seated Side Lateral Raise | رفرفة جانبي جالس جانبي | **رفرفة جانبي جالس** | "side" and "lateral" both give جانبي. |

## 4. No Arabic at all

`exnames.js` keeps a name in Latin when it knows none of its words ("Anything unknown stays
in Latin script"). These 13 have no Arabic word at all. Named drills and strongman events
could stay in Latin by that rule; the descriptive ones should not.

| Exercise | Today | Proposed | Note |
|---|---|---|---|
| Circus Bell | Circus Bell | **سيركس بيل** | Equipment name; transliterate. |
| Cocoons | Cocoons | **كرانش الشرنقة** | Ab exercise: knees and arms drawn in together. |
| Conan's Wheel | Conan's Wheel | **عجلة كونان** | Strongman event; keep the name. |
| Crucifix | Crucifix | **كروسيفكس** | Strongman hold; transliterate. |
| Fast Skipping | Fast Skipping | **نط سريع** |  |
| Groiners | Groiners | **جروينرز** | Transliterate; a lunge-to-twist drill. |
| Heavy Bag Thrust | Heavy Bag Thrust | **دفع كيس الملاكمة** |  |
| Looking At Ceiling | Looking At Ceiling | **إطالة الرقبة لفوق** | Neck stretch. |
| Moving Claw Series | Moving Claw Series | **سلسلة المخلب المتحرك** | Flexibility drill; or keep in Latin as a named drill. |
| Pyramid | Pyramid | **إطالة الهرم** | Hamstring stretch. |
| Spell Caster | Spell Caster | **سبيل كاستر** | Named kettlebell/dumbbell drill; transliterate. |
| Stomach Vacuum | Stomach Vacuum | **شفط البطن** |  |
| The Straddle | Straddle | **إطالة فتح الرجلين** | Adductor stretch. |

## 5. Partly untranslated (for information, not proposed here)

Arabic names with Latin words left in, because a term is missing from `EX_TERMS`. Most
are rare words (Carioca, Gironda, JM, Janda); a few are gaps worth a term (Handstand,
Flexion, Pronation, Supination, Dead, Figure). Listed so the app session can decide which
terms to add.

| Exercise | Arabic today |
|---|---|
| Bosu Ball Cable Crunch With Side Bends | Cable كرانش بـ ثني جانبي بالبوسو |
| Carioca Quick Step | Carioca خطوة سريع |
| Cat Stretch | Cat إطالة |
| Catch and Overhead Throw | Catch و رمي علوي |
| Clock Push-Up | Clock ضغط |
| Dancer's Stretch | Dancer's إطالة |
| Donkey Calf Raises | Donkey رفع سمانة |
| Downward Facing Balance | Downward توازن مواجه |
| Dumbbell Lying Pronation | Pronation راقد بالدمبل |
| Dumbbell Lying Supination | Supination راقد بالدمبل |
| Dumbbell Scaption | Scaption بالدمبل |
| Farmer's Walk | Farmer's مشي |
| Flexor Incline Dumbbell Curls | Flexor كيرل مائل بالدمبل |
| Frankenstein Squat | Frankenstein سكوات |
| Freehand Jump Squat | Freehand قفز سكوات |
| Full Range-Of-Motion Lat Pulldown | مدى Motion سحب أمامي كامل |
| Gironda Sternum Chins | Gironda Sternum ذقن |
| Gorilla Chin/Crunch | Gorilla ذقن كرانش |
| Hammer Grip Incline DB Bench Press | هامر DB بنش بريس قبضة مائل |
| Handstand Push-Ups | Handstand ضغط |
| Heaving Snatch Balance | Heaving سناتش توازن |
| Hip Flexion with Band | ورك Flexion بـ بالأستك |
| Hyperextensions With No Hyperextension Bench | فرد الظهر بـ No فرد الظهر بنش |
| IT Band and Glute Stretch | IT و مؤخرة إطالة بالأستك |
| Iliotibial Tract-SMR | Iliotibial Tract تدليك عضلي |
| Inverted Row with Straps | تجديف مقلوب بـ Straps |
| Iron Crosses (stretch) | حديد Crosses |
| Isometric Chest Squeezes | صدر Squeezes ثبات |
| Isometric Wipers | Wipers ثبات |
| JM Press | JM بريس |
| Janda Sit-Up | Janda تمرين بطن |
| Keg Load | Keg حمل |
| Kettlebell Dead Clean | Dead كلين بالكتل بيل |
| Kettlebell Figure 8 | Figure 8 بالكتل بيل |
| Kettlebell Pass Between The Legs | تمرير Between رجلين بالكتل بيل |
| Kettlebell Pirate Ships | Pirate Ships بالكتل بيل |
| Kettlebell Seesaw Press | Seesaw بريس بالكتل بيل |
| Kipping Muscle Up | Kipping عضلة لأعلى |
| Knee Across The Body | ركبة Across جسم |
| Landmine 180's | 180's باللاند ماين |
| Latissimus Dorsi-SMR | Latissimus Dorsi تدليك عضلي |
| Linear 3-Part Start Technique | خطي 3 Part Start Technique |
| Linear Acceleration Wall Drill | خطي Acceleration حائط تدريب |
| Log Lift | Log رفع |
| London Bridges | London جسر |
| Lunge Pass Through | لانج تمرير Through |
| Lying Cambered Barbell Row | Cambered تجديف راقد بالبار |
| Medicine Ball Scoop Throw | Scoop رمي بالكرة الطبية |
| Natural Glute Ham Raise | Natural مؤخرة خلفية الفخذ رفع |
| One-Arm Kettlebell Para Press | Para بريس بذراع واحدة بالكتل بيل |
| One Half Locust | واحد Locust نصف |
| One Handed Hang | واحد Handed معلق |
| Otis-Up | Otis لأعلى |
| Pelvic Tilt Into Bridge | حوض إمالة Into جسر |
| Physioball Hip Bridge | Physioball ورك جسر |
| Plate Pinch | Pinch بالوزن |
| Platform Hamstring Slides | Platform خلفية الفخذ Slides |
| Plie Dumbbell Squat | Plie سكوات بالدمبل |
| Power Stairs | قوة Stairs |
| Preacher Hammer Dumbbell Curl | Preacher هامر كيرل بالدمبل |
| Prone Manual Hamstring | Manual خلفية الفخذ منبطح |
| Prowler Sprint | Prowler عدو |
| Rack Delivery | راك Delivery |
| Return Push from Stance | Return دفع من وقفة |
| Ring Dips | Ring متوازي |
| Rocket Jump | Rocket قفز |
| Rocking Standing Calf Raise | Rocking رفع سمانة واقف |
| Rope Climb | Climb بالحبل |
| Round The World Shoulder Stretch | Round العالم كتف إطالة |
| Runner's Stretch | Runner's إطالة |
| Sandbag Load | Sandbag حمل |
| Scissors Jump | Scissors قفز |
| See-Saw Press (Alternating Side Press) | See Saw بريس |
| Shotgun Row | Shotgun تجديف |
| Side to Side Box Shuffle | صندوق Shuffle جانبي جانبي |
| Single-Leg Hop Progression | قفزة Progression برجل واحدة |
| Sit Squats | Sit سكوات |
| Spinal Stretch | Spinal إطالة |
| Squat with Plate Movers | سكوات بـ Movers بالوزن |
| Standing Cable Wood Chop | Wood Chop واقف بالكابل |
| Standing Dumbbell Straight-Arm Front Delt Raise Above Head | ذراع دالية رفع Above رأس واقف مفرود أمامي بالدمبل |
| Standing Olympic Plate Hand Squeeze | أولمبي يد Squeeze واقف بالوزن |
| Standing Soleus And Achilles Stretch | نعلية و Achilles إطالة واقف |
| Standing Toe Touches | أصابع Touches واقف |
| Standing Towel Triceps Extension | Towel ترايسبس إكستينشن واقف |
| Star Jump | Star قفز |
| Suspended Fallout | Fallout معلق |
| Svend Press | Svend بريس |
| Tate Press | Tate بريس |
| Torso Rotation | Torso دوران |
| Upper Back-Leg Grab | علوي ظهر رجل Grab |
| Upward Stretch | Upward إطالة |
| V-Bar Pulldown | V بار بول داون |
| V-Bar Pullup | V بار عقلة |
| Vertical Swing | Vertical سوينج |
| Wind Sprints | Wind عدو |
| Yoke Walk | Yoke مشي |
| Cable Y-Raise | رفرفة Y بالكابل |
| L-Sit Hold | ثبات L |
