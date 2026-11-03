/* Bunyan — the tick in the hand
   Safari on an iPhone has no vibration API. The one real tick a web page can give is a
   native switch (<input type="checkbox" switch>) toggled by the person's own tap, and a
   tap on its <label> counts (tests/haptics.html on the owner's iPhone, 3 Nov: a plain
   button nothing; a hidden switch in a label, felt; the switch itself, felt; a switch
   clicked from code, nothing). So nothing here can tick on its own, from a timer or
   from code: only where a finger lands.

   hb(html) takes one control written as a <button> and, with haptics on, returns it as a
   <label> with the same attributes and content around a visually hidden switch. The look
   is the class's (index.html writes the rules for button and label.hap alike); the
   behaviour stays the button's:
   - app.js ignores the label's own click and acts on the switch's, with the label's
     data-*, so a tap, Space or VoiceOver's activate does one thing once;
   - the switch is the one focusable control: announced as a button with the button's
     own name (aria-label moves to it, else the label's text names it), Enter wired in
     handlers/fields.js, its focus ring drawn on the label;
   - a button that is a toggle (role="switch" aria-checked) becomes the native switch it
     was imitating, checked as it was;
   - after the tap the switch goes back to what the markup says (off for a button).
   A disabled button, or one with any other role (a tab, an option), is left a button.
   With haptics off in Settings every control is the plain button.

   Where it is used (owner, 3 Nov: "go through the whole app and see what makes sense"):
   a tap that commits something or picks among choices — logging a set, the set's effort,
   the steppers, the rest controls, the next exercise, starting or resuming a workout, the
   day picked on the week and in Change workout, water and food added, the settings'
   switches, confirming a delete, saving a weigh-in or steps. Not on navigation, scrolling
   lists, opening sheets or text links: a tick on every tap stops meaning anything. */
import {S} from "../state.js";

var MOVE=/\s(aria-label|aria-pressed|aria-expanded|aria-controls|aria-describedby)="([^"]*)"/g;
function hapOn(){return !(S.prefs&&S.prefs.haptic===false);}

function hb(html){
  if(!hapOn())return html;
  var m=/^<button\b([^>]*)>([\s\S]*)<\/button>$/.exec(html);
  if(!m)return html;
  var attrs=m[1],inner=m[2],aria="",sw=false,on=false;
  if(/\sdisabled\b/.test(attrs))return html;
  var role=/\srole="([^"]*)"/.exec(attrs);
  if(role&&role[1]!=="switch")return html;
  if(role){sw=true;on=/\saria-checked="true"/.test(attrs);
    attrs=attrs.replace(/\srole="switch"/,"").replace(/\saria-checked="[^"]*"/,"");}
  attrs=attrs.replace(MOVE,function(all,k,v){aria+=' '+k+'="'+v+'"';return "";}).replace(/\stype="button"/,"");
  attrs=/\sclass="/.test(attrs)?attrs.replace(/\sclass="([^"]*)"/,' class="$1 hap"'):attrs+' class="hap"';
  /* The switch goes last, so the content's own :first-child rules still find it. */
  return '<label'+attrs+'>'+inner+'<input type="checkbox" switch class="vh hapt-in"'
    +(sw?(on?' checked':''):' role="button"')+aria+'></label>';}

export {hapOn, hb};
