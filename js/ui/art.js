/* Bunyan — art
   The drawings. One hand, one pen: the single red stroke of the horse-and-sword mark,
   round caps, a fainter second line for depth, and a few embers. Each is a small
   inline SVG, so it costs no request, works offline, takes the theme's accent in
   light mode and dark, and draws itself in once when its screen opens (not when
   Animations is off).

   Where they go is a rule, not taste: at most one per screen, at the edge of the top
   card or in an empty state, and never behind a number that has to be read.

   A drawing is a list of strokes — [d, kind] where kind "a" is the main line and "b"
   the faint one — and embers as [x, y, r]. */

var ART={
  /* Home, morning: the sun clearing the horizon, the mane's strands running into it,
     and its light on the water below. */
  sunrise:{vb:"0 0 240 140",s:[
    ["M10 104C70 97 170 97 230 104","a"],
    ["M120 100A30 30 0 0 1 180 100","a"],
    ["M131 100A19 19 0 0 1 169 100","b"],
    ["M117 81L108 76M131 67L126 58M150 62V52M169 67L174 58M183 81L192 76","a"],
    ["M8 30C48 22 74 60 112 94","b"],["M4 50C42 44 66 74 98 99","b"],["M22 14C66 6 92 50 124 88","b"],
    ["M120 114H180M132 122H168M142 130H158","b"]],
    e:[[204,58,1.8],[218,76,1.3],[92,34,1.5],[60,20,1.1]]},
  /* Home, afternoon: the sun high, a ring of heat around it. */
  sun:{vb:"0 0 240 140",s:[
    ["M134 60A26 26 0 1 0 186 60A26 26 0 1 0 134 60","a"],
    ["M124 60A36 36 0 1 0 196 60A36 36 0 1 0 124 60","b"],
    ["M160 14V6M160 114V106M114 60H106M214 60H206M127 27L121 21M193 93L199 99M193 27L199 21M127 93L121 99","a"],
    ["M6 118C58 96 98 128 150 112S214 96 236 106","b"],["M14 130C66 110 104 138 156 124S216 110 232 118","b"]],
    e:[[70,40,1.6],[48,64,1.2],[226,30,1.3]]},
  /* Home, evening: a crescent and the stars over the strands. */
  moon:{vb:"0 0 240 140",s:[
    ["M178 28A32 32 0 1 0 196 86A26 26 0 1 1 178 28","a"],
    ["M60 30L62 37L69 39L62 41L60 48L58 41L51 39L58 37Z","a"],
    ["M104 16L105 20L109 21L105 22L104 26L103 22L99 21L103 20Z","b"],
    ["M28 66L29 70L33 71L29 72L28 76L27 72L23 71L27 70Z","b"],
    ["M6 116C58 96 98 126 150 110S214 94 236 104","b"],["M16 128C68 110 106 136 158 122S218 108 232 116","b"]],
    e:[[124,52,1.2],[86,74,1],[214,20,1.4]]},
  /* Food: a round baladi loaf and a palm frond. */
  loaf:{vb:"0 0 200 140",s:[
    ["M22 100C16 74 52 56 86 56C120 56 156 74 150 100C146 116 26 116 22 100Z","a"],
    ["M34 94C44 76 64 68 86 68C108 68 128 76 138 94","b"],
    ["M40 108C66 114 106 114 132 108","b"],
    ["M160 136C154 94 144 54 118 16","a"],
    ["M156 114Q138 104 122 110M156 114Q170 102 186 100M151 94Q132 86 116 90M151 94Q166 80 182 76M145 74Q126 66 112 70M145 74Q158 58 172 54M137 56Q120 48 108 52M137 56Q148 40 160 36M128 38Q116 30 106 32M128 38Q136 24 146 20","b"]],
    e:[[60,80,1.2],[76,74,1],[96,74,1.2],[114,80,1],[70,88,.9],[88,84,1.1],[106,88,.9],[124,88,1]]},
  /* Food, empty My Foods: a ful pot, its steam in the swirl's strands. */
  idra:{vb:"0 0 160 160",s:[
    ["M54 134C30 124 30 86 56 74L60 62C62 58 98 58 100 62L104 74C130 86 130 124 106 134Z","a"],
    ["M56 62C60 54 100 54 104 62","b"],
    ["M104 80C124 74 134 92 118 104","b"],
    ["M38 106C62 114 98 114 122 106","b"],
    ["M70 48C60 36 80 30 70 16","b"],["M82 50C94 36 72 26 86 8","a"],["M94 48C104 38 90 30 98 20","b"]],
    e:[[120,30,1.4],[40,40,1.1],[130,56,1]]},
  /* Food, the water card: three strands; the bright one is the day's water. */
  wave:{vb:"0 0 300 40",s:[
    ["M0 18C20 8 45 6 70 18S120 30 145 18S195 6 220 18S270 30 300 18","b"],
    ["M0 26C30 16 55 14 80 26S130 36 155 26S205 14 230 26S280 36 300 26","b"]],e:[]},
  /* Food, Targets: a gauge whose needle is the sword. */
  gauge:{vb:"0 0 200 124",s:[
    ["M20 104A80 80 0 0 1 180 104","b"],
    ["M14 104H6M194 104H186M100 18V10M43 47L38 42M157 47L162 42M25 71L18 68M175 71L182 68M69 25L67 18M131 25L133 18","b"]],e:[]},
  /* Progress: a trend that climbs and runs out into the mane. */
  mane:{vb:"0 0 240 120",s:[
    ["M10 112H230","b"],
    ["M10 102L48 90L80 96L116 70L148 76L184 44","a"],
    ["M184 44C198 30 214 26 232 30","a"],["M184 44C194 22 212 10 234 12","b"],
    ["M184 44C204 38 220 44 236 54","b"],["M184 44C192 18 204 6 220 2","b"]],
    e:[[48,90,2],[80,96,2],[116,70,2],[148,76,2],[184,44,2.6]]},
  /* Progress, empty Strength. */
  barbell:{vb:"0 0 200 100",s:[
    ["M16 50H184","a"],
    ["M38 26H48V74H38Z","a"],["M50 34H57V66H50Z","b"],
    ["M152 26H162V74H152Z","a"],["M143 34H150V66H143Z","b"],
    ["M62 44V56M138 44V56","b"]],
    e:[[100,20,1.8],[86,28,1.2],[116,26,1.3],[72,16,1],[128,14,1.1]]},
  /* Progress, empty Body: a standing figure and the tape at chest and waist. */
  body:{vb:"0 0 120 200",s:[
    ["M48 24A12 12 0 1 0 72 24A12 12 0 1 0 48 24","a"],
    ["M52 38C46 44 32 44 28 54L20 100M68 38C74 44 88 44 92 54L100 100","a"],
    ["M36 54C38 78 44 94 44 110C40 130 42 160 46 192M84 54C82 78 76 94 76 110C80 130 78 160 74 192M60 122C58 146 58 170 56 192M60 122C62 146 62 170 64 192","a"],
    ["M18 68H102M26 96H94","b"],["M18 64V72M102 64V72M26 92V100M94 92V100","b"]],
    e:[[106,40,1.2],[12,120,1]]},
  /* History, empty: the month, one day glowing. */
  calendar:{vb:"0 0 140 130",s:[
    ["M20 26H120A8 8 0 0 1 128 34V112A8 8 0 0 1 120 120H20A8 8 0 0 1 12 112V34A8 8 0 0 1 20 26Z","a"],
    ["M12 46H128","b"],["M44 16V32M96 16V32","a"]],
    e:[[32,62,1.3],[52,62,1.3],[72,62,1.3],[92,62,1.3],[112,62,1.3],[32,82,1.3],[52,82,1.3],[92,82,1.3],[112,82,1.3],[32,102,1.3],[52,102,1.3],[72,102,1.3],[72,82,3.4]]},
  /* Profile: the swirl as a ring around the initials. */
  ring:{vb:"0 0 160 160",s:[
    ["M12 80A68 56 0 1 0 148 80A68 56 0 1 0 12 80","a"],
    ["M12 80A68 56 0 1 0 148 80A68 56 0 1 0 12 80","b",60],
    ["M12 80A68 56 0 1 0 148 80A68 56 0 1 0 12 80","b",120],
    ["M20 80A60 52 0 1 0 140 80A60 52 0 1 0 20 80","b",30],
    ["M20 80A60 52 0 1 0 140 80A60 52 0 1 0 20 80","b",150]],
    e:[[148,62,1.6],[18,108,1.2]]}
};
var CX={ring:[80,80]};

function strokes(name){
  var a=ART[name],c=CX[name]||[0,0];
  return a.s.map(function(s){
    return '<path class="'+s[1]+'" d="'+s[0]+'" pathLength="1"'
      +(s[2]?' transform="rotate('+s[2]+' '+c[0]+' '+c[1]+')"':'')+'/>';}).join("")
   +a.e.map(function(e){return '<circle class="e" cx="'+e[0]+'" cy="'+e[1]+'" r="'+e[2]+'"/>';}).join("");}

/* A drawing by name. o.cls adds classes (placement is the caller's CSS); o.still
   skips the draw-in, for a drawing that repaints often. */
function art(name,o){
  o=o||{};var a=ART[name];if(!a)return "";
  return '<svg class="art art-'+name+(o.still?'':' draw')+(o.cls?' '+o.cls:'')+'" viewBox="'+a.vb+'" aria-hidden="true" focusable="false">'
   +strokes(name)+(o.extra||"")+'</svg>';}

/* The water strands, with the bright one run out to the day's share of the goal. */
function waterArt(frac,o){
  var f=Math.max(0,Math.min(1,frac||0));
  return art("wave",Object.assign({},o,{extra:
    '<path class="lvl" d="M0 22C25 10 50 10 75 22S125 34 150 22S200 10 225 22S275 34 300 22" pathLength="1" style="stroke-dasharray:'+f.toFixed(3)+' 1"/>'}));}

/* The gauge with its sword at a share of the target: empty points left, the target
   straight up — so a day on target stands the sword upright — and double points right. */
function gaugeArt(frac,o){
  var f=Math.max(0,Math.min(2,frac||0)),deg=(f/2*180-90).toFixed(1);
  var arc=Math.min(1,f/2);
  var ang=Math.PI*(1-arc),x=(100+80*Math.cos(ang)).toFixed(1),y=(104-80*Math.sin(ang)).toFixed(1);
  return art("gauge",Object.assign({},o,{extra:
    (arc>0?'<path class="a" d="M20 104A80 80 0 0 1 '+x+' '+y+'" pathLength="1"/>':'')
    +'<g class="sword" transform="rotate('+deg+' 100 104)">'
    +'<path class="a" d="M100 30L104 40V84H96V40Z" pathLength="1"/>'
    +'<path class="a" d="M86 88Q100 82 114 88M100 86V97" pathLength="1"/>'
    +'<path class="a" d="M95 104A5 5 0 1 0 105 104A5 5 0 1 0 95 104" pathLength="1"/></g>'}));}

export {art, gaugeArt, waterArt};
