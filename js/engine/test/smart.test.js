import {buildMessages, grounded, lockFigures, readReply, rewordMessages, unlockReword} from "../smart.js";

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
  var hw=buildMessages("how do I add a second session",{program:"PPL, by weekday: Push (Mon) 6 exercises"},"en",[])[0].content;
  t.eq([/How the app works:\n- Training tab/.test(hw),/Add another session today/.test(hw),/- Program: PPL, by weekday/.test(hw),/No filler/.test(hw)],[true,true,true,true],
    "how the app works and the person's program are in front of it, and it is told to answer for them, not in general");
  t.eq(readReply("Sure.\nDO: add face pulls to Pull day"),{text:"Sure.",act:"add face pulls to Pull day"},"a request to act, read off its last line");
  t.eq(readReply("<think>let me see</think>Rest 2–3 minutes."),{text:"Rest 2–3 minutes.",act:""},"a model's thinking is not shown");
  t.eq(readReply("<think>unfinished"),{text:"",act:""},"thinking cut off: nothing to show");
  /* C-9: rewording, with the figures locked. A stub model that keeps the tokens, and
     stubs that try to change, drop, double or add a figure. */
  var orig="Aim for 150 g of protein a day, about 1.8 g per kg. Rest 2-3 minutes between heavy sets.";
  var R=rewordMessages(orig,"en"),lk=R.lock;
  t.eq([lk.figs,/⟦1⟧ g of protein/.test(R.msgs[1].content),/\d/.test(R.msgs[1].content.replace(/⟦\d+⟧/g,"")),/Copy every token exactly once/.test(R.msgs[0].content)],
    [["150","1.8","2","3"],true,false,true],"the figures leave the text as locked tokens");
  var stub=function(f){return f(R.msgs[1].content);};
  t.eq(unlockReword(stub(function(x){return "Try to get "+x.replace("Aim for ","").replace("Rest","And rest");}),lk,orig),
    "Try to get 150 g of protein a day, about 1.8 g per kg. And rest 2-3 minutes between heavy sets.","a rewrite that keeps every token: shown, the figures the coach's");
  t.eq(unlockReword("Get ⟦1⟧ g protein, about ⟦2⟧ g per kg; rest ⟦3⟧-⟦4⟧ min. Or 160 g if you can.",lk,orig),null,"a number of its own: refused");
  t.eq(unlockReword("Get ⟦1⟧ g protein, about ⟦2⟧ g per kg; rest ⟦3⟧ min.",lk,orig),null,"a figure dropped: refused");
  t.eq(unlockReword("Get ⟦1⟧ g, ⟦1⟧ g, about ⟦2⟧ g per kg; rest ⟦3⟧-⟦4⟧ min.",lk,orig),null,"a figure doubled: refused");
  t.eq(unlockReword("Get ⟦1⟧ g, about ⟦2⟧ g per kg; rest ⟦3⟧-⟦5⟧ min.",lk,orig),null,"a token made up: refused");
  t.eq(unlockReword("Get ⟦2⟧ g, about ⟦1⟧ g per kg; rest ⟦3⟧-⟦4⟧ min.",lk,orig),null,"figures swapped (the same numbers, a different meaning): refused");
  t.eq(unlockReword("Get ⟦1⟧ g, about ⟦2⟧ g per kg, twice a day; rest ⟦3⟧-⟦4⟧ min.",lk,orig),null,"a number word of its own: refused");
  t.eq(unlockReword("Get ⟦1⟧ g, about ⟦2⟧ g per kg; rest ⟦3⟧-⟦4⟧ min.\nDO: log 80 kg for 8",lk,orig)!==null&&!/80/.test(unlockReword("Get ⟦1⟧ g, about ⟦2⟧ g per kg; rest ⟦3⟧-⟦4⟧ min.\nDO: log 80 kg for 8",lk,orig)),true,"no request to act from a rewrite");
  var ar=lockFigures("محتاج ١٥٠ جرام بروتين");
  t.eq([ar.figs,unlockReword("كُل ⟦1⟧ جرام بروتين في اليوم",ar,"محتاج ١٥٠ جرام بروتين")],[["١٥٠"],"كُل ١٥٠ جرام بروتين في اليوم"],"Arabic digits, the same");
  t.eq(unlockReword("كُل ⟦1⟧ جرام بروتين، تلاتة وجبات",ar,"محتاج ١٥٠ جرام بروتين"),null,"an Arabic number word of its own: refused");
  /* A free answer: no figure the model was not given. */
  var g=buildMessages("what's a good song for leg day",{targets:"2500 kcal, 150 g protein a day"},"en",[]);
  t.eq([grounded("Something upbeat helps.",g),grounded("Keep protein at 150 g.",g),grounded("Do 4 sets of 12 at 75%.",g)],[true,true,false],"a free answer's figures: the person's own pass, one of its own does not");}

export {run};
