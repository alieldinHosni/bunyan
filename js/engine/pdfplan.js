/* Bunyan — reading a plan out of a PDF
   A coach's plan usually arrives as a designed PDF: headings in spaced capitals, stat
   cards side by side, a meal's foods as a bulleted list with its macros in a column
   beside it, supplements in a table. Copying the text out of one loses all of that
   structure, so this reads the PDF itself — on the phone, offline, with Mozilla's
   pdf.js (js/vendor/pdfjs, Apache 2.0) — and turns it into three things:

   - the plan as text, in the form js/engine/planparse.js reads, so the import screen
     shows exactly what was understood and it can be corrected before it is used;
   - the daily targets the plan sets (calories, protein, carbs, fat, water, steps);
   - the supplements, with their doses and when to take them.

   It reads; it does not guess. Prose — the reasons, the warnings, the rules of thumb —
   is left out rather than turned into food, and a range is read as its lower end for a
   supplement (the safe side of a dose) and its middle for a target. */

var LIB=null;
function loadLib(){
  if(LIB)return Promise.resolve(LIB);
  return import("../vendor/pdfjs/pdf.min.mjs").then(function(m){
    m.GlobalWorkerOptions.workerSrc=new URL("../vendor/pdfjs/pdf.worker.min.mjs",import.meta.url).href;
    LIB=m;return m;});}

/* ---- text, with its place on the page ---------------------------------------------
   pdf.js gives runs of text and where each starts. Runs on one baseline make a line;
   a wide gap within a line starts a new segment — the next column of a table, or the
   macros printed to the right of a meal's name. */
var SPACED=/^(?:[^\s] )+[^\s][.,:;]?$/;   /* "M E A L S ,", "A T" — tracked-out capitals */
function unspace(s){return SPACED.test(s)?s.replace(/ /g,""):s;}
function linesOf(items){
  var rows=[];
  items.forEach(function(it){
    var s=String(it.str||"");if(!s.trim())return;
    var y=it.transform[5],x=it.transform[4],w=it.width||0;
    var row=null;
    for(var i=0;i<rows.length;i++)if(Math.abs(rows[i].y-y)<3){row=rows[i];break;}
    if(!row){row={y:y,runs:[]};rows.push(row);}
    row.runs.push({x:x,end:x+w,s:s,spaced:SPACED.test(s.trim())});});
  rows.sort(function(a,b){return b.y-a.y;});
  return rows.map(function(r){
    r.runs.sort(function(a,b){return a.x-b.x;});
    var segs=[],cur=null;
    r.runs.forEach(function(run){
      var t=unspace(run.s.trim());
      if(cur&&run.x-cur.end<18){cur.t+=(run.x-cur.end>1.2?" ":"")+t;cur.end=run.end;cur.spaced=cur.spaced&&run.spaced;}
      else{cur={x:run.x,end:run.end,t:t,spaced:run.spaced};segs.push(cur);}});
    segs.forEach(function(sg){sg.t=sg.t.replace(/\s+/g," ").trim();});
    return {y:r.y,segs:segs,t:segs.map(function(sg){return sg.t;}).join(" "),
      head:segs.every(function(sg){return sg.spaced;})};});}

function readPages(data,meta){
  return loadLib().then(function(lib){
    return lib.getDocument({data:data,isEvalSupported:false,disableFontFace:true}).promise;
  }).then(function(doc){
    var out=[],chain=Promise.resolve();
    /* The document's own title, when it has one worth reading. */
    if(meta)chain=chain.then(function(){return doc.getMetadata().then(function(m){
      meta.title=m&&m.info&&m.info.Title||"";},function(){});});
    for(var p=1;p<=doc.numPages;p++)(function(p){
      chain=chain.then(function(){return doc.getPage(p);})
        .then(function(pg){return pg.getTextContent();})
        .then(function(tc){out.push(linesOf(tc.items));});})(p);
    return chain.then(function(){return out;});});}
/* The lines of every page, and the title, for a reader of another kind of plan. */
function readPdfLines(file){
  var buf=file.arrayBuffer?file.arrayBuffer():Promise.resolve(file),meta={};
  return buf.then(function(ab){return readPages(new Uint8Array(ab),meta);})
    .then(function(pages){return {pages:pages,title:meta.title||""};});}

/* ---- numbers -------------------------------------------------------------------- */
function n(s){return parseFloat(String(s).replace(/,/g,""));}
/* "8-10k" → [8000, 10000]; "1,950" → [1950, 1950]; "3 to 3.5" → [3, 3.5] */
function range(s){
  var m=/(\d[\d,]*(?:\.\d+)?)\s*(?:-|–|—|to)\s*(\d[\d,]*(?:\.\d+)?)\s*(k)?/i.exec(s);
  if(m){var k=m[3]?1000:1;return [n(m[1])*k,n(m[2])*k];}
  m=/(\d[\d,]*(?:\.\d+)?)\s*(k)?/i.exec(s);
  if(!m)return null;
  var v=n(m[1])*(m[2]?1000:1);return [v,v];}
function mid(r){return r?(r[0]+r[1])/2:null;}

/* ---- the plan ------------------------------------------------------------------- */
var MEAL=/^(meal\s*(\d+)|breakfast|lunch|dinner|supper|snacks?|pre-?workout|post-?workout|before bed)\b\s*[·•:\-–—|]?\s*(.*)$/i;
var BULLET=/^\s*[–—\-•▪◦*·]\s*/;
var MACROS=/\d+\s*p\s*\/\s*\d+\s*c\b|≈\s*\d|\d\s*kcal\b/i;
/* Words in a food line that describe it rather than name it. */
function cleanItem(s){
  return s.replace(BULLET,"")
    .replace(/\(\s*optional\s*\)/gi,"")
    /* "180 g fish (tuna, cod, salmon)": the kinds are a choice, the first named food stands */
    .replace(/\s*\([^)]*\)/g,"")
    .replace(/,\s*(?:cooked|fried|grilled|baked|boiled|steamed)\s+(?:in|with)\s+/gi,", ")
    .replace(/,\s*(?:weighed|measured)\s+(?:raw|cooked|dry)\b/gi,"")
    .replace(/\ba little\b/gi,"1 tsp")
    .replace(/\b(\d{1,3}),(\d{3})\b/g,"$1$2")
    .replace(/\s+/g," ").trim();}
/* Thousands separators out, so "1,000 IU" is not read as two foods. */
function doseOf(s){
  var m=/(\d[\d,]*(?:\.\d+)?)\s*(?:(?:-|–|to)\s*\d[\d,]*(?:\.\d+)?)?\s*(mcg|µg|mg|g|iu|ml|capsules?|caps|softgels?|tablets?|tabs?|scoops?)\b/i.exec(s);
  return m?{qty:n(m[1]),unit:m[2].toLowerCase().replace(/^µg$/,"mcg").replace(/^caps$/,"capsule").replace(/^tabs?$/,"tablet")}:null;}

var TARGET={kcal:/^(?:daily\s+)?(?:calories|kcal|energy)$/i,p:/^protein$/i,c:/^(?:carbs?|carbohydrates?)$/i,f:/^fats?$/i,
  steps:/^(?:daily\s+)?steps$/i,water:/^water$/i};

function interpret(pages){
  var meals=[],supps=[],targets={},cur=null,mode=null,cols=null;
  pages.forEach(function(lines){
    /* Stat cards: a spaced label with its figure straight under it. */
    lines.forEach(function(L,li){
      L.segs.forEach(function(sg){
        if(!sg.spaced)return;
        Object.keys(TARGET).forEach(function(k){
          if(targets[k]!=null||!TARGET[k].test(sg.t))return;
          for(var j=li+1;j<lines.length&&lines[j].y>L.y-50;j++){
            var v=lines[j].segs.filter(function(o){return Math.abs(o.x-sg.x)<8&&!o.spaced;})[0];
            if(!v)continue;
            var r=range(v.t);
            if(!r)break;
            var x=mid(r);
            if(k==="water")x=/l\b|litre|liter/i.test(v.t)?x*1000:x;
            targets[k]=Math.round(x);
            break;}});});});
    lines.forEach(function(L){
      var t=L.t,m;
      if(L.head||(t.length<48&&t===t.toUpperCase()&&/[A-Z]/.test(t)&&!/\d\s*(g|kcal)\b/i.test(t)&&MEAL.test(t))){
        cols=null;
        if((m=MEAL.exec(t))){
          var label=m[3]?m[3].replace(/\b\w/g,function(c){return c;}).toLowerCase():"";
          cur={n:m[2]?+m[2]:null,kind:m[2]?"meal":m[1].toLowerCase().replace(/s$/,""),label:label,title:"",items:[]};
          meals.push(cur);mode="meal";return;}
        cur=null;
        if(/^water$/i.test(t)){mode="water";return;}
        /* The supplements table's header row: its columns place each cell. */
        if(/^supplements?\b/i.test(L.segs[0].t)&&L.segs.length>=2){
          mode="supps";cols=L.segs.map(function(sg){return {x:sg.x,k:sg.t.toLowerCase()};});return;}
        mode=null;return;}
      if(mode==="meal"&&cur){
        if(MACROS.test(t)&&!BULLET.test(t)){var kc=/(\d[\d,]*)\s*kcal/i.exec(t);if(kc)cur.kcal=n(kc[1]);return;}
        var first=L.segs[0].t;
        if(BULLET.test(first)){cur.items.push(cleanItem(first));
          var mk=L.segs.slice(1).map(function(s){return s.t;}).join(" "),kk=/(\d[\d,]*)\s*kcal/i.exec(mk);if(kk)cur.kcal=n(kk[1]);return;}
        if(!cur.items.length&&!cur.title){cur.title=first;
          var rest=L.segs.slice(1).map(function(s){return s.t;}).join(" "),k2=/(\d[\d,]*)\s*kcal/i.exec(rest);if(k2)cur.kcal=n(k2[1]);return;}
        return;}
      if(mode==="water"&&targets.water==null){
        var w=/(\d+(?:\.\d+)?)\s*(?:(?:-|–|to)\s*(\d+(?:\.\d+)?))?\s*(l\b|litres?|liters?)/i.exec(t);
        if(w)targets.water=Math.round(((+w[1])+(+(w[2]||w[1])))/2*1000);
        return;}
      if(mode==="supps"&&cols){
        if(L.segs.length<2)return;
        var cell=function(name){
          var c=cols.filter(function(x){return x.k.indexOf(name)===0;})[0];if(!c)return "";
          var best=null;L.segs.forEach(function(sg){if(Math.abs(sg.x-c.x)<30)best=sg;});
          return best?best.t:"";};
        var nm=L.segs[0].t,dose=doseOf(cell("dose")||L.segs[1].t);
        if(nm&&dose)supps.push({name:nm,dose:dose,when:cell("when"),note:cell("note")});}});});
  return {meals:meals.filter(function(m){return m.items.length;}),supps:supps,targets:targets};}

/* The plan as the text importer reads it, supplements last. */
function planText(r){
  var out=[];
  r.meals.forEach(function(m){
    var label=m.label?" ("+m.label.charAt(0).toUpperCase()+m.label.slice(1)+")":"";
    var head=m.n?"Meal "+m.n:m.kind==="snack"?"Snack":m.kind.charAt(0).toUpperCase()+m.kind.slice(1);
    out.push(head+label+":");
    m.items.forEach(function(it){out.push("- "+it);});
    out.push("");});
  if(r.supps.length){
    out.push("Supplements:");
    r.supps.forEach(function(s){out.push("- "+s.dose.qty+" "+s.dose.unit+" "+s.name);});}
  return out.join("\n").trim();}

/* A File (or ArrayBuffer) → {text, targets, supps, pages}. */
function readPdfPlan(file){
  var buf=file.arrayBuffer?file.arrayBuffer():Promise.resolve(file);
  return buf.then(function(ab){return readPages(new Uint8Array(ab));}).then(function(pages){
    var r=interpret(pages);
    return {text:planText(r),targets:r.targets,supps:r.supps,meals:r.meals,pages:pages.length};});}

export {interpret, linesOf, planText, readPdfLines, readPdfPlan};
