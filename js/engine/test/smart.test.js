import {buildMessages, readReply} from "../smart.js";

/* The smart coach's words: what the on-device model is told, and what is read back. */
function run(t){
  var m=buildMessages("how long should I rest between sets?",{name:"Ali",goal:"Build muscle",targets:"2500 kcal, 150 g protein a day",
    recent:["2026-10-25 Full Body A: Barbell Squat 100 kg×5"],facts:["I work nights"]},"en",[{q:"hi",a:"Hello."}]);
  var sys=m[0].content;
  t.eq([m[0].role,m[m.length-1],m.length],["system",{role:"user",content:"how long should I rest between sets?"},4],"rules, the last exchange, then the question");
  t.eq([/talking to Ali/.test(sys),/Goal: Build muscle/.test(sys),/2500 kcal/.test(sys),/I work nights/.test(sys),/Never invent a number/.test(sys),/plain English/.test(sys)],
    [true,true,true,true,true,true],"grounded on the person's own figures, told never to invent one");
  t.eq(/Egyptian Arabic/.test(buildMessages("اريح قد ايه",{},"ar",[])[0].content),true,"an Arabic question is answered in Egyptian Arabic");
  t.eq(/Textbook notes:\n\[1\]/.test(buildMessages("how many hours of sleep do I need",{},"en",[])[0].content),true,"the textbook passages the question reaches, numbered");
  t.eq(readReply("Sure.\nDO: add face pulls to Pull day"),{text:"Sure.",act:"add face pulls to Pull day"},"a request to act, read off its last line");
  t.eq(readReply("<think>let me see</think>Rest 2–3 minutes."),{text:"Rest 2–3 minutes.",act:""},"a model's thinking is not shown");
  t.eq(readReply("<think>unfinished"),{text:"",act:""},"thinking cut off: nothing to show");}

export {run};
