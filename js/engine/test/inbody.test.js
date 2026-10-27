import {fatBand, readInBody} from "../inbody.js";

/* An InBody sheet's text, as a phone copies it off the photo. */
function run(t){
  var line="InBody 570\nTotal Body Water 49.8 L (42.0~51.4)\nWeight 84.2 kg (61.5~83.1)\nSkeletal Muscle Mass 38.1 kg\nBody Fat Mass 16.3 kg\n"
    +"BMI 26.0\nPBF (Percent Body Fat) 19.4 %\nVisceral Fat Level 7\nBasal Metabolic Rate 1820 kcal\nInBody Score 78 /100\nTarget Weight 78.0 kg";
  t.eq(readInBody(line),{pbf:19.4,smm:38.1,fatkg:16.3,vfl:7,ibmr:1820,tbw:49.8,score:78,weight:84.2},"each figure by its label, the printed ranges and the target weight left alone");
  t.eq(readInBody("Weight\nSkeletal Muscle Mass\nBody Fat Mass\n84.2\n38.1\n16.3"),{weight:84.2,smm:38.1,fatkg:16.3},"copied as a table: labels, then figures, paired in order");
  t.eq(readInBody("Weight\nSkeletal Muscle Mass\nBody Fat Mass\n84.2\n38.1"),{},"a table with a figure missing is not guessed at");
  t.eq(readInBody("الوزن ٨٤٫٢ كجم\nنسبة الدهون ١٩٫٤ ٪\nكتلة العضلات الهيكلية ٣٨٫١"),{pbf:19.4,smm:38.1,weight:84.2},"an Arabic sheet, Arabic digits");
  t.eq(readInBody("InBody\n51.4~42.0 49.8 ‏إجمالي مياه الجسم‎\n20.2~10.1 16.3 ‏كتلة الدهون‎\n83.1-5 84.2 ‏الوزن‎\n‎37.2-4 38.1 ‏كتلة العضلات الهيكلية‎\n20.0~10.0 19.4 ‏نسبة الدهون‎\n7 ‏مستوى الدهون الحشوية‎"),
    {pbf:19.4,smm:38.1,fatkg:16.3,vfl:7,tbw:49.8,weight:84.2},"an Arabic sheet read off its photo: range, figure, label on each line, the figure nearest the label");
  t.eq(readInBody("Weight 185.6 lb\nSkeletal Muscle Mass 84.0 lb\nPBF 19.4 %"),{pbf:19.4,smm:38.1,weight:84.2},"pounds converted");
  t.eq(readInBody("Weight 8420 kg\nPBF 194 %"),{},"figures no test can read are left out");
  t.eq(readInBody("hello"),{},"nothing in it: nothing");
  t.eq([fatBand(19.4,"m"),fatBand(22,"m"),fatBand(8,"m"),fatBand(31,"f"),fatBand(25,"f"),fatBand(20,"")],["in","over","under","over","in",null],
    "the textbook's ranges: men 10–20 %, women 20–30 %; none without a sex");}

export {run};
