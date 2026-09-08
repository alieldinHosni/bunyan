/* Bunyan — patch
   A minimal DOM patcher, ~70 lines, no dependency.

   The defect this exists to remove: `container.innerHTML = html` destroys and
   recreates every node in a surface that is already on screen, even the ones whose
   content did not change. That is one bug wearing three faces —

     · a recreated <img> paints empty before it decodes, so the exercise photo
       flashes every time a set is added;
     · a recreated <input> loses focus and caret, so search jumps as you type;
     · a recreated element restarts its CSS entry animation, so the sheet replays
       its open animation when you tap the favourite star.

   Patching keeps any node whose tag and key still match, so all three stop being
   possible rather than being fixed one screen at a time.

   Identity is the tag plus `id` or `data-k`. Anything needing to survive a rebuild
   in a list should carry one; without a key, position within the parent decides,
   which is right for the fixed layouts here. */

function keyOf(el){
  if(!el.getAttribute)return null;
  return el.getAttribute("data-k")||el.id||null;
}
function sameNode(a,b){
  if(a.nodeType!==b.nodeType)return false;
  if(a.nodeType===3||a.nodeType===8)return true;   /* text and comments: patch value */
  if(a.nodeName!==b.nodeName)return false;
  return keyOf(a)===keyOf(b);
}
/* Markers written at run time rather than by a view. Stripping them would restart the
   entry animation they exist to run once, which is the whole bug this file removes. */
function runtimeAttr(name){
  return name==="data-anim"||name==="data-count"||name==="style";
}
function patchAttrs(o,n){
  var i,a;
  for(i=n.attributes.length-1;i>=0;i--){
    a=n.attributes[i];
    /* An inline style set by the view still wins; one set by motion code does not
       appear in the new markup and so is left alone below. */
    if(o.getAttribute(a.name)!==a.value)o.setAttribute(a.name,a.value);
  }
  for(i=o.attributes.length-1;i>=0;i--){
    a=o.attributes[i];
    if(!n.hasAttribute(a.name)&&!runtimeAttr(a.name))o.removeAttribute(a.name);
  }
}
/* A form field's live value is a property, not the attribute, so patching markup
   alone would leave a stale box. The field the user is typing in is left alone —
   overwriting it mid-word is the jumping-caret bug in another form. */
function patchField(o,n){
  var tag=o.nodeName;
  if(tag!=="INPUT"&&tag!=="TEXTAREA"&&tag!=="SELECT")return;
  if(document.activeElement===o)return;
  if(tag==="INPUT"&&(o.type==="checkbox"||o.type==="radio")){
    var c=n.hasAttribute("checked");
    if(o.checked!==c)o.checked=c;
    return;
  }
  var v=n.value;
  if(v!=null&&o.value!==v)o.value=v;
}
function patchNode(o,n){
  if(o.nodeType===3||o.nodeType===8){
    if(o.nodeValue!==n.nodeValue)o.nodeValue=n.nodeValue;
    return;
  }
  if(o.nodeType!==1)return;
  patchAttrs(o,n);
  patchChildren(o,n);
  patchField(o,n);
}
function patchChildren(oldP,newP){
  var o=oldP.firstChild,n=newP.firstChild;
  while(n){
    var nextN=n.nextSibling;
    if(!o){ oldP.appendChild(n); n=nextN; continue; }
    var nextO=o.nextSibling;
    if(sameNode(o,n))patchNode(o,n);
    else oldP.replaceChild(n,o);
    o=nextO; n=nextN;
  }
  while(o){ var gone=o; o=o.nextSibling; oldP.removeChild(gone); }
}

/* Bring `root` to match `html`, touching only what differs. */
function patch(root,html){
  var tmp=document.createElement("div");
  tmp.innerHTML=html;
  patchChildren(root,tmp);
}
/* For when a surface genuinely becomes a different thing — a different sheet, a
   different tab — where there is nothing to preserve and an entry animation is
   wanted. Kept here so both paths read from one place. */
function replace(root,html){ root.innerHTML=html; }

export {patch, replace};
