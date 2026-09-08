/* Bunyan — text
   The matcher, in one place.

   Food search got typo tolerance and Arabic folding; the exercise picker was a
   separate code path and got none of it, so the two drifted. Everything here is
   what food search was already doing — lifted out rather than rewritten, so there
   is one implementation and the two searches cannot diverge again. */

/* Arabic goes wrong by character variant, not transposition: people type ه for ة,
   ا for أ, ي for ى, and skip the marks. Folding those away before any comparison
   catches more real mistyping than edit distance does, and costs nothing. ة only
   appears at the end of a word, so folding it everywhere is the same rule stated
   more simply. */
function fold(s){
  return String(s||"")
    .replace(/[ً-ْٰـ]/g,"")
    .replace(/[أإآٱ]/g,"ا")
    .replace(/ى/g,"ي")
    .replace(/ؤ/g,"و").replace(/ئ/g,"ي")
    .replace(/ة/g,"ه");
}
function norm(s){
  return fold(String(s||"").toLowerCase()
    .replace(/[^\w\s؀-ۿ/]/g," ")
    .replace(/\s+/g," ").trim());
}
function tokens(s){ return norm(s).split(" ").filter(Boolean); }

/* Levenshtein, abandoned as soon as a whole row is past the tolerance, so sweeping
   873 names stays cheap. */
function editDist(a,b,max){
  var la=a.length,lb=b.length;
  if(Math.abs(la-lb)>max)return max+1;
  if(!la)return lb; if(!lb)return la;
  var prev=new Array(lb+1),cur=new Array(lb+1),i,j;
  for(j=0;j<=lb;j++)prev[j]=j;
  for(i=1;i<=la;i++){
    cur[0]=i;var best=i;
    for(j=1;j<=lb;j++){
      var c=a.charAt(i-1)===b.charAt(j-1)?0:1;
      cur[j]=Math.min(prev[j]+1,cur[j-1]+1,prev[j-1]+c);
      if(cur[j]<best)best=cur[j];
    }
    if(best>max)return max+1;
    var tmp=prev;prev=cur;cur=tmp;
  }
  return prev[lb];
}
/* One edit for a short word, three for a long one. A fixed threshold either misses
   "chiken" or matches half the database. */
function fuzzTol(len){ return len<=4?1:len<=7?2:3; }

/* Every word of the query has to appear somewhere in the haystack, in any order.
   Substring matching on the whole string cannot find "incline bench" inside
   "Barbell Incline Bench Press - Medium Grip" when the words are typed the other
   way round, which is how people actually search. */
function tokenMatch(q,hay){
  var qt=tokens(q); if(!qt.length)return true;
  var h=norm(hay);
  for(var i=0;i<qt.length;i++)if(h.indexOf(qt[i])<0)return false;
  return true;
}
/* How well a match scores, so exact and leading matches sort above scattered ones. */
function matchScore(q,hay){
  var nq=norm(q),h=norm(hay);
  if(!nq)return 0;
  if(h===nq)return 100;
  if(h.indexOf(nq)===0)return 85;
  if(h.indexOf(nq)>-1)return 70;
  return tokenMatch(nq,h)?55:0;
}
/* Only ever run when the ordinary search found nothing at all, so good matches are
   never diluted by near misses. `names` is a function returning the strings to try
   for one candidate. */
/* Distance from a query to one candidate name, or Infinity for "not close".
   Three ways in, because a typo lands differently depending on the query:
     whole against whole   — "chiken" against "chicken"
     whole against a word  — "chiken" against "chicken" inside "Chicken Breast"
     word against word     — "incline bnech" against "Barbell Incline Bench Press",
                             where no whole-string comparison is ever close enough */
function nameDist(nq,qt,n){
  var tol=fuzzTol(nq.length);
  var d=editDist(nq,n,tol);
  if(d<=tol)return d;
  var nw=n.split(" "),i,j;
  if(qt.length===1){
    var t1=fuzzTol(qt[0].length),b1=t1+1;
    for(j=0;j<nw.length;j++){
      if(Math.abs(nw[j].length-qt[0].length)>t1)continue;
      var d1=editDist(qt[0],nw[j],t1);
      if(d1<b1)b1=d1;
    }
    return b1<=t1?b1+0.5:Infinity;   /* a word hit is weaker than a whole-name hit */
  }
  /* Every word of the query has to land near some word of the name. */
  var total=0;
  for(i=0;i<qt.length;i++){
    var t2=fuzzTol(qt[i].length),best=t2+1;
    for(j=0;j<nw.length;j++){
      if(Math.abs(nw[j].length-qt[i].length)>t2)continue;
      var dw=editDist(qt[i],nw[j],t2);
      if(dw<best)best=dw;
    }
    if(best>t2)return Infinity;
    total+=best;
  }
  return total+0.5;
}
function fuzzyRank(q,list,namesOf,limit){
  var nq=norm(q);
  if(nq.length<3)return [];
  var qt=nq.split(" ").filter(Boolean),out=[];
  for(var i=0;i<list.length;i++){
    var names=namesOf(list[i]),best=Infinity;
    for(var j=0;j<names.length&&best>0;j++){
      var n=norm(names[j]); if(!n)continue;
      var d=nameDist(nq,qt,n);
      if(d<best)best=d;
    }
    if(best<Infinity)out.push({item:list[i],dist:best});
  }
  out.sort(function(a,b){return a.dist-b.dist;});
  return out.slice(0,limit||5);
}

export {editDist, fold, fuzzTol, fuzzyRank, matchScore, norm, tokenMatch, tokens};
