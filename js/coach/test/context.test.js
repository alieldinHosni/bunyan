import {addFact, emptyContext, KINDS, listFacts, readContext, relation, removeFact} from "../context.js";

var TODAY="2026-10-20";

function run(t){
  /* Absent or damaged data is no history, never a crash. */
  t.eq(listFacts(undefined),[],"absent store: nothing kept");
  t.eq(listFacts(null),[],"null store: nothing kept");
  t.eq(listFacts({items:"nonsense"}),[],"damaged store: nothing kept");
  t.eq(readContext(undefined),emptyContext(),"absent store reads as empty");
  t.clean(readContext({v:1,next:"x",items:[{id:"c4",kind:"schedule",text:"a",by:"user"}]}),"damaged counter: no NaN or undefined");

  /* The person's own words go in, as said. */
  var a=addFact(null,{kind:"schedule",text:"  Works 13-hour days  ",by:"user"},{today:TODAY});
  t.eq([a.ok,a.id],[true,"c1"],"a statement from the person is kept");
  t.eq(listFacts(a.store),[{id:"c1",kind:"schedule",text:"Works 13-hour days",at:TODAY,by:"user"}],"kept in their words, trimmed, with the day");
  t.clean(a,"add: no NaN or undefined");

  /* An inference is never kept. */
  var inf=addFact(a.store,{kind:"obstacle",text:"Low motivation",by:"coach"},{today:TODAY});
  t.eq([inf.ok,inf.why,listFacts(inf.store).length],[false,"not_user",1],"a coach inference is refused");
  t.eq(addFact(a.store,{kind:"obstacle",text:"Low motivation"}).why,"not_user","no origin given: refused");
  t.eq(addFact(a.store,{kind:"mood",text:"x",by:"user"}).why,"kind","an unknown kind is refused");
  t.eq(addFact(a.store,{kind:"obstacle",text:"   ",by:"user"}).why,"empty","nothing said: refused");
  t.eq(addFact(a.store,{kind:"schedule",text:"Works 13-hour days",by:"user"}).why,"duplicate","the same thing twice is kept once");
  t.eq(KINDS,["schedule","obstacle","constraint","preference"],"four kinds, picked by the person");

  /* Stored entries that did not come from the person are dropped on read. */
  var planted={v:1,next:3,items:[{id:"c1",kind:"obstacle",text:"Low motivation",by:"coach"},{id:"c2",kind:"constraint",text:"Bad knee",by:"user",guess:0.8}]};
  t.eq(listFacts(planted),[{id:"c2",kind:"constraint",text:"Bad knee",at:"",by:"user"}],"an inferred entry in storage is not shown or kept; extra fields are dropped");

  /* Visible and deletable. */
  var b=addFact(a.store,{kind:"constraint",text:"No gym on Fridays",by:"user"},{today:TODAY});
  t.eq(listFacts(b.store,"constraint").map(function(x){return x.text;}),["No gym on Fridays"],"listed by kind");
  var r=removeFact(b.store,"c1");
  t.eq([r.ok,listFacts(r.store).map(function(x){return x.id;})],[true,["c2"]],"deleted for good");
  t.eq(removeFact(r.store,"c9").ok,false,"deleting what is not there changes nothing");
  var c=addFact(r.store,{kind:"preference",text:"Prefers mornings",by:"user"},{today:TODAY});
  t.eq(c.id,"c3","a deleted id is not reused");

  /* Pure: the store handed in is not changed. */
  var before=JSON.stringify(b.store);
  addFact(b.store,{kind:"obstacle",text:"Night shifts",by:"user"});removeFact(b.store,"c2");
  t.eq(JSON.stringify(b.store),before,"the store handed in is left alone");
  var shown=listFacts(b.store);shown[0].text="edited";
  t.eq(listFacts(b.store)[0].text,"Works 13-hour days","editing what was listed does not change the store");
  /* Near the same, or the opposite (agent-zero's memory: a near duplicate is not kept
     twice; a contradiction is not kept beside what it contradicts). */
  t.eq([relation("I eat pork","I don't eat pork"),relation("I can do squats","I can't do squats"),relation("بحب الجري","مبحبش الجري"),
    relation("I work 13-hour days","I work 12-hour days"),relation("I don't eat pork","I do not eat pork"),relation("I hate running","I love cycling")],
    ["opposite","opposite","opposite","opposite","same",""],"opposites by a negation or a changed figure; the same in other words; unrelated is neither");
  var pk=addFact(null,{kind:"preference",text:"I eat pork",by:"user"},{today:TODAY});
  t.eq(addFact(pk.store,{kind:"preference",text:"I do eat pork",by:"user"},{today:TODAY}).why,"duplicate","near the same: kept once");
  var cx=addFact(pk.store,{kind:"constraint",text:"I don't eat pork",by:"user"},{today:TODAY});
  t.eq([cx.ok,cx.why,cx.id,cx.was,listFacts(cx.store).length],[false,"contradicts","c1","I eat pork",1],"the opposite of a kept entry, of any kind: asked, nothing changed");
  var rp=addFact(pk.store,{kind:"constraint",text:"I don't eat pork",by:"user"},{today:TODAY,replace:"c1"});
  t.eq(listFacts(rp.store).map(function(x){return x.text;}),["I don't eat pork"],"replace: the old one out, the new one in");
  var bo=addFact(pk.store,{kind:"constraint",text:"I don't eat pork",by:"user"},{today:TODAY,both:true});
  t.eq(listFacts(bo.store).length,2,"keep both, when the person says both stand");
}

export {run};
