/* Bunyan — the coach's last check (docs/COACH-AGENT.md 2.1, 2.6, C-4)

   Run on every composed answer before it is sent. It refuses one that breaks the
   answer contract, and the chat then says it is not sure instead (an honest miss is a
   pass; a wrong answer is not):
   - a knowledge-base record or a fragment shown as prose ("Mp lunge, group: legs",
     a paragraph starting mid-sentence);
   - a question about one lift answered with another: the reading named lifts, the
     answer names a different one of the person's and none of those asked;
   - a figure in a written answer that is neither in the entry's own text (whose
     figures are grounded on the passages it cites, js/engine/test/faq.test.js) nor
     worked out from the person's data for it;
   - a figure with no source.
   Pure: an answer in, {ok, why} out. */

function nums(s){return (String(s).replace(/(\d),(\d{3})/g,"$1$2").match(/\d+(?:\.\d+)?/g)||[]).map(Number);}
var RECORD=/\b[A-Z]?[a-z]+ [\w-]+, [\w-]+: /;
function fragment(s){var x=String(s).trim();return /^[a-z]/.test(x)&&!/^(e\.g\.|i\.e\.)/.test(x);}

/* ans:  {prose:[string] (paragraphs and notes), items:[string] (list rows: checked for
          records only, since a row may start lower-case: "and 3 more"), src:[string],
          allowed:[number] or null (null: not checked)}
   lifts: {asked:[shown name], others:[shown name]}: the names as the answer would show
          them (exName), the asked ones and the person's other lifts. */
function guard(ans,lifts){
  var prose=(ans&&ans.prose||[]).map(String),src=ans&&ans.src||[];
  for(var i=0;i<prose.length;i++){
    if(RECORD.test(prose[i]))return {ok:false,why:"record"};
    if(fragment(prose[i]))return {ok:false,why:"fragment"};}
  var items=(ans&&ans.items||[]).map(String);
  for(var j=0;j<items.length;j++)if(RECORD.test(items[j]))return {ok:false,why:"record"};
  var all=prose.concat(items).join("\n"),low=all.toLowerCase();
  if(lifts&&lifts.asked&&lifts.asked.length){
    var has=function(n){return n&&low.indexOf(String(n).toLowerCase())>=0;};
    if(!lifts.asked.some(has)&&(lifts.others||[]).some(has))return {ok:false,why:"other lift"};}
  if(ans&&Array.isArray(ans.allowed)){
    var ok={};ans.allowed.forEach(function(n){ok[n]=1;});
    var bad=nums(all).filter(function(n){return !ok[n];});
    if(bad.length)return {ok:false,why:"figure "+bad[0]};}
  if(/\d/.test(all)&&!src.length)return {ok:false,why:"no source"};
  return {ok:true,why:""};}

export {guard, nums as guardNums};
