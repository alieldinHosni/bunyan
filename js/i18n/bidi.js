/* Bunyan — bidi
   Keeps figures readable inside Arabic.

   In a right-to-left paragraph the browser reorders the neutral characters around a
   number: "+1.1" comes out as "1.1+", "47 g / 150 g" as "g / 150 g 47", and "6 / 12"
   as "12 / 6". Every figure in the app is written with Latin digits and, mostly, Latin
   units, so the fix is the same everywhere: a figure — its sign, digits, unit, and any
   "/ ×  –  :" joining it to the next figure — is one left-to-right run, isolated from
   the Arabic around it.

   isolateNums() does that to a view's HTML on its way into the DOM, in Arabic only,
   with <bdi dir="ltr"> — not a span, which rules such as ".fmac2-v span" would style. It
   touches text between tags and never markup, attributes or entities, and it skips
   <svg> (its <text> cannot hold a span), <option>, <textarea>, <script> and <style>.
   A figure followed by an Arabic unit ("83.9 كجم") isolates the digits only, so the
   unit stays where Arabic puts it.

   Figures split across elements (<b>6</b><small>/ 12</small>) cannot be seen from
   here; the views wrap those in .num, which the stylesheet isolates the same way.
   Imports nothing. */

var UNIT = "(?:kcal|cal|kg|lb|ml|km|cm|min|sec|reps?|g|L|l|m|s|h|%)";
var FIG = "(?:[+\\-−±~↑↓]\\s?){0,2}\\d+(?:[.,]\\d+)*(?:\\s?" + UNIT + "(?![A-Za-z]))?";
var JOIN = "\\s?[/×x–\\-:]\\s?";
var RUN = new RegExp(FIG + "(?:" + JOIN + FIG + ")*", "g");
var SKIP = /^<(\/?)(svg|option|textarea|script|style)\b/i;

function wrapText(txt){
  /* Entities stay whole: "&#39;" has digits in it. */
  return txt.split(/(&#?\w+;)/).map(function(part, i){
    if (i % 2) return part;
    return part.replace(RUN, function(m){
      /* A bare one- or two-digit number with nothing round it cannot be reordered. */
      if (/^\d{1,2}$/.test(m)) return m;
      return '<bdi dir="ltr">' + m + '</bdi>';
    });
  }).join("");
}

function isolateNums(html){
  var out = "", depth = 0, parts = String(html).split(/(<[^>]*>)/);
  for (var i = 0; i < parts.length; i++){
    var p = parts[i];
    if (i % 2){
      var m = SKIP.exec(p);
      if (m && !/\/>$/.test(p)) depth += m[1] ? -1 : 1;
      if (depth < 0) depth = 0;
      out += p;
    } else out += depth ? p : wrapText(p);
  }
  return out;
}

export {isolateNums};
