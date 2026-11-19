/* Bunyan — the coach's live reading (C-4a, docs/COACH-AGENT.md)
   As the person types in the coach's field (#chatq), what it understood is drawn above
   the field, 120 ms after the last key: up to three chips, what · which · when
   (views/chat.js liveChips). A chip with alternatives opens them under the row; one
   tapped rewrites the field's words and reads again. Nothing understood: the three
   nearest questions, as the buttons the chat already has (data-chatq). Send is never
   held back (owner, 19 Nov). Only #chatread is redrawn, never the panel. Until the chat
   module is in (chatload.js) there is nothing to read with, and nothing is drawn. */
import {chat} from "./chatload.js";
import {t} from "../i18n/dict.js";
import {esc} from "../util.js";

var timer=null,cur=null,openI=null;
function box(){return typeof document!=="undefined"?document.getElementById("chatread"):null;}
function clearRead(){clearTimeout(timer);timer=null;cur=null;openI=null;var b=box();if(b){b.innerHTML="";b.hidden=true;}}
function onType(el){clearTimeout(timer);timer=setTimeout(function(){timer=null;draw(el.value);},120);}
function draw(text){
  var b=box(),C=chat();if(!b)return;
  if(!C||!C.liveChips||!String(text||"").trim()){clearRead();return;}
  var r=C.liveChips(text);cur={text:text,r:r};openI=null;
  if(!r.chips.length&&!r.near.length){b.innerHTML="";b.hidden=true;return;}
  var h;
  if(r.chips.length){
    h='<span class="rd-h">'+esc(t("I read:"))+'</span>'+r.chips.map(function(c,i){
      return '<button class="chat-chip rd-chip" data-readchip="'+i+'" data-rk="'+c.k+'"'+(c.alts.length?' aria-expanded="false"':' aria-disabled="true"')+'>'+esc(c.l)+'</button>';}).join("")
     +'<div class="rd-alts" hidden></div>';}
  else h='<span class="rd-h">'+esc(t("Not sure what you mean. Nearest:"))+'</span>'+r.near.map(function(id){
      return '<button class="chat-chip rd-near" data-chatq="'+esc(id)+'">'+esc(t(C.ASK[id]))+'</button>';}).join("");
  b.innerHTML=h;b.hidden=false;}
/* A chip: its alternatives open under the row (again: they close). */
function openChip(i){
  var b=box(),c=cur&&cur.r.chips[+i];if(!b||!c||!c.alts.length)return;
  var list=b.querySelector(".rd-alts"),btns=b.querySelectorAll("[data-readchip]"),was=list&&!list.hidden&&list.dataset.i===String(i);
  for(var k=0;k<btns.length;k++)btns[k].setAttribute("aria-expanded",String(!was&&k===+i&&!!c.alts.length));
  if(!list)return;
  if(was){list.hidden=true;list.innerHTML="";openI=null;return;}
  list.dataset.i=String(i);openI=+i;
  list.innerHTML=c.alts.map(function(a,j){return '<button class="chat-chip rd-alt" data-readalt="'+i+'|'+j+'">'+esc(a.l)+'</button>';}).join("");
  list.hidden=false;}
/* After a render (the panel is patched to its markup, where the row is empty): the
   reading drawn again, an open chip still open, if the field still says what was read. */
function keepRead(){
  var b=box(),el=document.getElementById("chatq");if(!b||!cur)return;
  if(!el||el.value!==cur.text){clearRead();return;}
  if(!b.hidden&&b.childNodes.length)return;
  var o=openI;draw(cur.text);if(o!=null)openChip(o);}
/* An alternative: the field says it, and is read again. */
function pickAlt(v){
  var p=String(v).split("|"),c=cur&&cur.r.chips[+p[0]],a=c&&c.alts[+p[1]],el=document.getElementById("chatq");
  if(!a||!el)return;
  el.value=a.text;draw(a.text);
  try{el.focus({preventScroll:true});}catch(e){el.focus();}}
export {clearRead, draw, keepRead, onType, openChip, pickAlt};
