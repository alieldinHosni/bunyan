/* Bunyan — an InBody result, read
   Owner, 27 Oct: an InBody (bioimpedance) sheet given to the coach. The textbook counts
   bioimpedance as a self-administered body-composition test (js/knowledge/assessments.js,
   11.4), its readings moved by anything that changes body water.

   The photo is read on the phone (js/engine/ocr.js); its text can also be copied off it
   (Live Text on iPhone) and pasted. readInBody finds the figures in either by their
   labels, English or Arabic, whatever order the text put them in. Every
   figure is shown to be checked before anything is saved, and a figure outside what a
   person can measure is left out rather than guessed.

   readInBody(text) → {weight, pbf, smm, fatkg, vfl, ibmr, tbw, score}, each present only
   when read. Weights in kilograms; a sheet in pounds is converted when it says lb. */

/* Each figure: its labels, and the range a real reading falls in. */
var FIELDS=[
  ["pbf",/(percent body fat|body fat percentage|pbf|% ?body fat|نسبه الدهون|نسبة الدهون|نسبه دهون الجسم)/,2,70],
  ["smm",/(skeletal muscle mass|smm|كتله العضلات الهيكليه|كتلة العضلات الهيكلية|العضلات الهيكليه)/,5,80],
  ["fatkg",/(body fat mass|bfm|fat mass|كتله الدهون|كتلة الدهون)/,1,150],
  ["vfl",/(visceral fat level|visceral fat|vfl|الدهون الحشويه|مستوى الدهون الحشوية)/,1,30],
  ["ibmr",/(basal metabolic rate|bmr|معدل الايض الاساسي|معدل الأيض الأساسي)/,600,4000],
  ["tbw",/(total body water|tbw|اجمالي مياه الجسم|ماء الجسم الكلي|مياه الجسم)/,10,90],
  ["score",/(inbody score|fitness score|درجه انبودي|درجة إنبودي)/,20,120],
  ["weight",/(^|[^a-z])(weight|body weight|الوزن)(?![a-z])/,25,300]];

function readInBody(text){
  var s=String(text||"").toLowerCase().replace(/[٠-٩]/g,function(d){return "٠١٢٣٤٥٦٧٨٩".indexOf(d);})
    .replace(/(\d)[٫,](\d)/g,"$1.$2").replace(/[\r‎‏؜⁦-⁩]/g,"").replace(/[أإآ]/g,"ا").replace(/ة/g,"ه").replace(/ى/g,"ي");
  var lb=/\blbs?\b/.test(s)&&!/\bkg\b/.test(s),out={},taken=[],labels=[];
  var conv=function(k,v){return (k==="weight"||k==="smm"||k==="fatkg")&&lb?Math.round(v/2.2046*10)/10:v;};
  var fits=function(f,v){return v>=f[2]&&v<=f[3];};
  FIELDS.forEach(function(f){
    var re=new RegExp(f[1].source,"g"),m;
    while((m=re.exec(s))){
      var at=m.index+m[0].length;
      if(labels.every(function(l){return l.at!==m.index;}))labels.push({f:f,at:m.index,end:at});
      if(out[f[0]]!=null)continue;
      /* A label's figure is the first number after it on its own line; ranges printed
         beside it ("42.0~51.4") come after the reading on InBody sheets. */
      var line=s.slice(at).split("\n")[0].slice(0,40),n=line.match(/-?\d+(?:\.\d+)?/),pos;
      if(n)pos=at+n.index;
      else{
        /* A right-to-left sheet read off its photo comes out as "range, figure, label"
           on a line: the figure is the number nearest the label that is not part of a
           range ("42.0~51.4", "83.1-5"). */
        var ls=s.lastIndexOf("\n",m.index-1)+1,before=s.slice(ls,m.index),nm,last=null;
        var nre=/\d+(?:\.\d+)?/g;
        while((nm=nre.exec(before))){
          var pc=before.charAt(nm.index-1),nc=before.charAt(nm.index+nm[0].length);
          if(/[~\-–]/.test(pc)||/[~\-–]/.test(nc))continue;
          last=nm;}
        if(!last)continue;
        n=last;pos=ls+last.index;}
      if(taken.indexOf(pos)>=0)continue;
      var v=conv(f[0],+n[0]);
      if(!fits(f,v))continue;
      out[f[0]]=Math.round(v*10)/10;taken.push(pos);}});
  /* Copied as a table: the labels in one column, the figures in the next. Paired in
     order, and only when there are exactly as many figures as labels, each in range. */
  if(Object.keys(out).length<2&&labels.length>=2){
    labels.sort(function(a,b){return a.at-b.at;});
    var after=s.slice(labels[labels.length-1].end),nums=(after.match(/-?\d+(?:\.\d+)?/g)||[]).map(Number);
    if(nums.length===labels.length&&labels.every(function(l,i){return fits(l.f,conv(l.f[0],nums[i]));})){
      out={};labels.forEach(function(l,i){out[l.f[0]]=Math.round(conv(l.f[0],nums[i])*10)/10;});}}
  /* A body-fat percentage and fat mass that disagree with the weight by more than a
     rounding are not both right: the percentage is kept, the mass dropped. */
  if(out.pbf&&out.fatkg&&out.weight&&Math.abs(out.weight*out.pbf/100-out.fatkg)>3)delete out.fatkg;
  return out;}

/* The textbook's ranges (11.4): no single healthy figure for everyone; about 10–20 % for
   men and 20–30 % for women, varying with age and ethnicity. → "under", "in", "over" or
   null when the sex is unknown. */
function fatBand(pbf,sex){
  if(!(pbf>0)||(sex!=="m"&&sex!=="f"))return null;
  var r=sex==="f"?[20,30]:[10,20];
  return pbf<r[0]?"under":pbf>r[1]?"over":"in";}
var FAT_RANGE={m:[10,20],f:[20,30]};

export {FAT_RANGE, fatBand, readInBody};
