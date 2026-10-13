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

/* The three greeting scenes' ground: three ranges of hills, far to near, each deeper
   in the accent's glass, with a line along the two far ridges. */
var HILLS=[
  ["M0 100C18 92 36 86 56 90S92 80 112 88S146 100 170 98S212 84 240 92V140H0Z","h1"],
  ["M0 112C30 101 58 98 84 106S132 116 160 108S212 97 240 106V140H0Z","h2"],
  ["M0 126C40 116 90 117 130 124S200 132 240 121V140H0Z","h3"],
  ["M0 100C18 92 36 86 56 90S92 80 112 88S146 100 170 98S212 84 240 92","ridge"],
  ["M0 112C30 101 58 98 84 106S132 116 160 108S212 97 240 106","ridge"]];
var ART={
  /* Home, morning: the sun clearing the hills, its glow behind them, three ranges
     of hills in the accent's glass, nearer ones deeper, and two birds. */
  sunrise:{vb:"0 0 240 140",s:[
    ["M112 94A50 50 0 1 0 212 94A50 50 0 1 0 112 94","dsk"],
    ["M136 98A26 26 0 0 1 188 98Z","a"],
    ["M162 62V53M141 70L135 64M183 70L189 64M128 86L120 83M196 86L204 83","a"],
    ["M66 50q4-4 8 0q4-4 8 0M90 38q3-3 6 0q3-3 6 0","b"]].concat(HILLS),
    e:[[214,52,1.6],[226,70,1.2],[40,30,1.3],[20,52,1]]},
  /* Home, afternoon: the sun high in its glow, its rays, a cloud, the hills. */
  sun:{vb:"0 0 240 140",s:[
    ["M118 46A46 46 0 1 0 210 46A46 46 0 1 0 118 46","dsk"],
    ["M146 46A18 18 0 1 0 182 46A18 18 0 1 0 146 46","a"],
    ["M164 18V12M164 80V74M136 46H130M198 46H192M144 26L140 22M184 66L188 70M184 26L188 22M144 66L140 70","a"],
    ["M44 64C44 56 54 52 60 57C63 49 76 48 80 57C88 56 92 64 86 69H48C44 69 42 66 44 64Z","a"],
    ["M18 34q3-3 6 0q3-3 6 0","b"]].concat(HILLS),
    e:[[216,96,1.2],[100,28,1.4],[226,24,1.1]]},
  /* Home, evening: a crescent in its glow, stars, the hills gone dark. */
  moon:{vb:"0 0 240 140",s:[
    ["M134 54A44 44 0 1 0 222 54A44 44 0 1 0 134 54","dsk"],
    ["M178 26A30 30 0 1 0 202 82A24 24 0 1 1 178 26Z","a"],
    ["M60 30L62 37L69 39L62 41L60 48L58 41L51 39L58 37Z","a"],
    ["M104 16L105 20L109 21L105 22L104 26L103 22L99 21L103 20Z","b"],
    ["M28 60L29 64L33 65L29 66L28 70L27 66L23 65L27 64Z","b"]].concat(HILLS),
    e:[[124,48,1.2],[86,66,1],[216,18,1.4],[140,22,1],[40,14,1.1],[232,60,1]]},
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
  /* ---- On buttons. One per big tile or build button, at its far edge, faint: it
     says what is behind the button and never sits behind a figure. */
  /* Build a program: a wall going up course by course, which is what the name means.
     The laid courses are the faint line; the new course and the stone going on are the
     main one. */
  wall:{vb:"0 0 160 100",s:[
    ["M12 78H40A4 4 0 0 1 44 82V90A4 4 0 0 1 40 94H12A4 4 0 0 1 8 90V82A4 4 0 0 1 12 78ZM52 78H80A4 4 0 0 1 84 82V90A4 4 0 0 1 80 94H52A4 4 0 0 1 48 90V82A4 4 0 0 1 52 78ZM92 78H120A4 4 0 0 1 124 82V90A4 4 0 0 1 120 94H92A4 4 0 0 1 88 90V82A4 4 0 0 1 92 78ZM132 78H148A4 4 0 0 1 152 82V90A4 4 0 0 1 148 94H132A4 4 0 0 1 128 90V82A4 4 0 0 1 132 78Z","b"],
    ["M12 58H20A4 4 0 0 1 24 62V70A4 4 0 0 1 20 74H12A4 4 0 0 1 8 70V62A4 4 0 0 1 12 58ZM32 58H60A4 4 0 0 1 64 62V70A4 4 0 0 1 60 74H32A4 4 0 0 1 28 70V62A4 4 0 0 1 32 58ZM72 58H100A4 4 0 0 1 104 62V70A4 4 0 0 1 100 74H72A4 4 0 0 1 68 70V62A4 4 0 0 1 72 58ZM112 58H140A4 4 0 0 1 144 62V70A4 4 0 0 1 140 74H112A4 4 0 0 1 108 70V62A4 4 0 0 1 112 58Z","b"],
    ["M52 38H80A4 4 0 0 1 84 42V50A4 4 0 0 1 80 54H52A4 4 0 0 1 48 50V42A4 4 0 0 1 52 38ZM92 38H120A4 4 0 0 1 124 42V50A4 4 0 0 1 120 54H92A4 4 0 0 1 88 50V42A4 4 0 0 1 92 38ZM132 38H148A4 4 0 0 1 152 42V50A4 4 0 0 1 148 54H132A4 4 0 0 1 128 50V42A4 4 0 0 1 132 38Z","a"],
    ["M112 16H140A4 4 0 0 1 144 20V28A4 4 0 0 1 140 32H112A4 4 0 0 1 108 28V20A4 4 0 0 1 112 16Z","a"],
    ["M126 10V4","b"]],
    e:[[100,14,1.4],[152,22,1.2],[88,28,1]]},
  /* Cardio & sports: the lanes of a track, and a pulse running along them. */
  track:{vb:"0 0 200 100",s:[
    ["M6 54H58L68 32L80 76L90 46L98 54H194","a"],
    ["M6 80C70 64 130 64 194 80","b"],["M6 92C70 74 130 74 194 92","b"],
    ["M100 66V72M120 66V71","b"]],
    e:[[150,40,1.5],[172,30,1.1],[128,26,1]]},
  /* Favourites: a star, the same five points as the sheet's ★. */
  star:{vb:"0 0 120 110",s:[
    ["M60 20L70.6 47.4L99.9 49L77.1 67.6L84.7 96L60 80L35.3 96L42.9 67.6L20.1 49L49.4 47.4Z","a"],
    ["M60 38L65.9 53.9L82.8 54.6L69.5 65.1L74.1 81.4L60 72L45.9 81.4L50.5 65.1L37.2 54.6L54.1 53.9Z","b"]],
    e:[[100,22,1.6],[16,30,1.2],[106,90,1]]},
  /* Build a meal: a plate between a fork and a knife, steam over it. */
  plate:{vb:"0 0 160 120",s:[
    ["M40 70A40 40 0 1 0 120 70A40 40 0 1 0 40 70","a"],
    ["M52 70A28 28 0 1 0 108 70A28 28 0 1 0 52 70","b"],
    ["M20 34V110M14 34V52M26 34V52M14 52Q20 60 26 52","a"],
    ["M140 34C150 50 150 66 140 72V110","a"],
    ["M74 26C68 18 80 12 74 4M86 28C92 20 80 14 86 6","b"]],
    e:[[60,14,1.2],[100,12,1],[132,24,1.1]]},
  /* Food, the body diagram: a figure standing square to the reader, the pen's main line
     for the outline and the faint one for chest and knees. Drawn on the left and
     mirrored exactly on the right. */
  figure:{vb:"0 0 120 232",s:[
    ["M48 20A12 13 0 1 0 72 20A12 13 0 1 0 48 20","a"],
    ["M54 32V42M66 32V42","a"],
    ["M54 42C48 45 41 46 38 50M66 42C72 45 79 46 82 50","a"],
    ["M38 50C32 58 30 72 29 86C28 98 26 108 24 120M82 50C88 58 90 72 91 86C92 98 94 108 96 120","a"],
    ["M42 64C41 76 39 88 37 98C35 108 33 114 32 120M78 64C79 76 81 88 83 98C85 108 87 114 88 120","a"],
    ["M24 120C22 126 24 132 28 132C32 132 33 126 32 120M96 120C98 126 96 132 92 132C88 132 87 126 88 120","a"],
    ["M42 64C43 76 44 86 45 96C45 104 43 110 43 116M78 64C77 76 76 86 75 96C75 104 77 110 77 116","a"],
    ["M43 116C42 134 43 152 45 168C46 184 46 200 47 216M77 116C78 134 77 152 75 168C74 184 74 200 73 216","a"],
    ["M60 128C58 144 57 160 56 174C55 188 55 202 54 216M60 128C62 144 63 160 64 174C65 188 65 202 66 216","a"],
    ["M47 216C45 222 43 226 49 227C54 227 55 222 54 216M73 216C75 222 77 226 71 227C66 227 65 222 66 216","a"],
    ["M48 62C53 67 57 67 60 65M72 62C67 67 63 67 60 65","b"],["M60 72V104M52 110C56 114 64 114 68 110","b"],
    ["M47 168C49 171 52 171 54 169M73 168C71 171 68 171 66 169","b"]],
    e:[]},
  /* Food suggestions, one each, at plate size: a bowl (rim, body, foot) under what is in
     it, or the food itself. */
  yogurt:{vb:"0 0 120 90",s:[["M20 44A40 10 0 1 0 100 44A40 10 0 1 0 20 44","a"],["M20 44C22 64 38 76 60 76C82 76 98 64 100 44","a"],["M48 76V80H72V76","b"],
    ["M55 39A5 5 0 1 1 45 39A5 5 0 1 1 55 39M67 36A5 5 0 1 1 57 36A5 5 0 1 1 67 36M76 41A4.5 4.5 0 1 1 67 41A4.5 4.5 0 1 1 76 41","a"],
    ["M30 45C40 40 50 47 60 43S80 42 90 46","b"]],e:[[84,22,1.4],[36,24,1.1]]},
  cottage:{vb:"0 0 120 90",s:[["M20 44A40 10 0 1 0 100 44A40 10 0 1 0 20 44","a"],["M20 44C22 64 38 76 60 76C82 76 98 64 100 44","a"],["M48 76V80H72V76","b"],
    ["M30 42C34 34 42 36 44 40C48 32 58 34 60 38C64 31 74 33 76 38C82 33 90 37 90 43","a"],
    ["M40 44A3 3 0 1 0 46 44M56 46A3 3 0 1 0 62 46M72 44A3 3 0 1 0 78 44","b"]],e:[[60,22,1.3]]},
  ful:{vb:"0 0 120 90",s:[["M20 44A40 10 0 1 0 100 44A40 10 0 1 0 20 44","a"],["M20 44C22 64 38 76 60 76C82 76 98 64 100 44","a"],["M48 76V80H72V76","b"],
    ["M36 42A5 3 0 1 0 46 42A5 3 0 1 0 36 42M52 46A5 3 0 1 0 62 46A5 3 0 1 0 52 46M66 41A5 3 0 1 0 76 41A5 3 0 1 0 66 41M80 45A5 3 0 1 0 90 45A5 3 0 1 0 80 45","a"],
    ["M46 36C56 32 66 38 74 34","b"],["M88 30L96 22M92 30L100 26","b"]],e:[[58,24,1.3],[70,20,1]]},
  lentils:{vb:"0 0 120 90",s:[["M20 44A40 10 0 1 0 100 44A40 10 0 1 0 20 44","a"],["M20 44C22 64 38 76 60 76C82 76 98 64 100 44","a"],["M48 76V80H72V76","b"],
    ["M50 30C46 24 54 20 50 12M62 30C58 24 66 20 62 12M74 30C70 24 78 20 74 10","b"],
    ["M30 46C46 42 74 42 90 46","b"]],e:[[42,44,1.2],[56,45,1.2],[70,45,1.2],[82,44,1.2]]},
  oats:{vb:"0 0 120 90",s:[["M20 44A40 10 0 1 0 100 44A40 10 0 1 0 20 44","a"],["M20 44C22 64 38 76 60 76C82 76 98 64 100 44","a"],["M48 76V80H72V76","b"],
    ["M84 40L104 14","a"],["M101 10A5 7 30 1 0 107 18A5 7 30 1 0 101 10","a"],
    ["M30 45C40 38 52 46 62 40S78 40 88 45","b"]],e:[[44,40,1.2],[56,38,1.1],[70,41,1.2]]},
  rice:{vb:"0 0 120 90",s:[["M20 44A40 10 0 1 0 100 44A40 10 0 1 0 20 44","a"],["M20 44C22 64 38 76 60 76C82 76 98 64 100 44","a"],["M48 76V80H72V76","b"],
    ["M28 44C36 24 84 24 92 44","a"],["M40 34L44 32M52 28L56 27M66 28L70 30M78 34L81 37M58 36L62 35","b"]],e:[[60,18,1.2]]},
  labneh:{vb:"0 0 120 90",s:[["M20 44A40 10 0 1 0 100 44A40 10 0 1 0 20 44","a"],["M20 44C22 64 38 76 60 76C82 76 98 64 100 44","a"],["M48 76V80H72V76","b"],
    ["M60 44C50 44 46 36 54 34C62 32 70 38 66 44C62 50 46 48 42 40","a"],["M84 26C80 32 84 36 88 34C92 32 90 26 84 26Z","b"]],e:[[76,42,1.4],[48,44,1.1]]},
  eggs:{vb:"0 0 120 90",s:[
    ["M14 50C10 38 22 28 34 32C44 24 58 32 56 44C62 54 50 64 38 60C26 66 16 60 14 50Z","a"],
    ["M42 46A7 7 0 1 1 28 46A7 7 0 1 1 42 46","a"],
    ["M60 54C56 42 68 32 80 36C90 28 104 36 102 48C108 58 96 68 84 64C72 70 62 64 60 54Z","a"],
    ["M88 50A7 7 0 1 1 74 50A7 7 0 1 1 88 50","a"],["M33 42A3 3 0 0 0 30 45M79 46A3 3 0 0 0 76 49","b"]],e:[]},
  chicken:{vb:"0 0 120 90",s:[
    ["M16 52C16 36 40 28 62 30C86 32 104 40 102 52C100 64 78 70 56 68C34 66 16 64 16 52Z","a"],
    ["M36 38L48 64M54 34L66 66M72 36L82 62","b"],["M88 24C92 18 100 18 102 24","b"]],e:[[96,14,1.2]]},
  tuna:{vb:"0 0 120 90",s:[
    ["M28 32A32 9 0 1 0 92 32A32 9 0 1 0 28 32","a"],["M28 32V62M92 32V62M28 62A32 9 0 0 0 92 62","a"],
    ["M52 30A8 4 0 1 0 68 30A8 4 0 1 0 52 30","b"],
    ["M42 52C50 44 64 44 72 52C64 60 50 60 42 52ZM72 52L80 46V58Z","b"]],e:[]},
  banana:{vb:"0 0 120 90",s:[
    ["M18 36C28 64 70 74 102 50C100 46 98 44 96 44C74 62 40 58 26 32Z","a"],
    ["M96 44L102 36M18 36L16 30","a"],["M28 42C42 56 68 60 90 50","b"]],e:[]},
  bread:{vb:"0 0 120 90",s:[
    ["M14 52C14 36 36 28 60 28C84 28 106 36 106 52C106 64 84 70 60 70C36 70 14 64 14 52Z","a"],
    ["M30 46C44 38 76 38 90 46","b"],["M24 56C40 62 80 62 96 56","b"]],e:[[44,36,1.1],[62,34,1.2],[78,37,1.1]]},
  dates:{vb:"0 0 120 90",s:[
    ["M24 56C18 44 26 32 36 34C46 36 48 52 40 62C34 68 28 66 24 56Z","a"],
    ["M50 54C46 40 56 30 66 32C76 34 76 50 68 60C62 66 54 64 50 54Z","a"],
    ["M78 58C74 46 82 36 92 38C102 40 102 54 94 62C88 68 82 66 78 58Z","a"],
    ["M34 34L38 26M64 32L66 24M92 38L96 30","b"]],e:[]},
  potato:{vb:"0 0 120 90",s:[
    ["M16 52C18 40 40 32 64 34C88 36 106 44 104 54C102 64 80 66 58 64C36 62 14 62 16 52Z","a"],
    ["M104 54L112 50M16 52L8 50","a"],["M40 46L42 48M62 42L64 44M80 50L82 52M54 56L56 58","b"]],e:[]},
  almonds:{vb:"0 0 120 90",s:[
    ["M30 66C20 54 24 36 36 30C46 40 46 56 30 66Z","a"],["M56 60C46 48 50 30 62 24C72 34 72 50 56 60Z","a"],
    ["M84 68C74 56 78 38 90 32C100 42 100 58 84 68Z","a"],
    ["M33 38C34 48 33 56 31 62M59 32C60 42 59 50 57 56M87 40C88 50 87 58 85 64","b"]],e:[]},
  avocado:{vb:"0 0 120 90",s:[
    ["M60 6C44 6 40 24 36 38C30 56 42 72 60 72C78 72 90 56 84 38C80 24 76 6 60 6Z","a"],
    ["M60 14C48 14 46 28 43 40C39 54 48 64 60 64C72 64 81 54 77 40C74 28 72 14 60 14Z","b"],
    ["M71 48A11 11 0 1 1 49 48A11 11 0 1 1 71 48","a"]],e:[]},
  pb:{vb:"0 0 120 90",s:[
    ["M34 30H86V74C86 78 82 80 78 80H42C38 80 34 78 34 74Z","a"],["M32 18H88V30H32Z","a"],
    ["M34 44H86M34 66H86","b"],["M52 55C52 50 58 49 60 52C62 49 68 50 68 55C68 60 62 61 60 58C58 61 52 60 52 55Z","b"]],e:[]},
};
/* Profile: the orbit around the picture. An ellipse and two copies of it turned a third
   of the way round, a ring inside, and embers on the paths; the embers travel and the
   whole of it turns slowly (CSS), after it has drawn itself in. */
ART.orbit={vb:"0 0 160 160",nofill:1,s:[
  ["M8 80A72 56 0 1 0 152 80A72 56 0 1 0 8 80","a"],
  ["M8 80A72 56 0 1 0 152 80A72 56 0 1 0 8 80","b",60],
  ["M8 80A72 56 0 1 0 152 80A72 56 0 1 0 8 80","b",120],
  ["M22 80A58 58 0 1 0 138 80A58 58 0 1 0 22 80","b"]],
  e:[[152,80,2.2],[44,128,1.6],[96,25,1.3],[30,52,1.1]]};
/* Profile, behind it all and still: contour lines, a map of ground climbed. */
ART.topo={vb:"0 0 360 200",nofill:1,s:[
  ["M252 44C274 43 290 57 288 74S266 103 245 101 214 87 216 69 230 45 252 44Z","a"],
  ["M254 26C289 24 315 46 313 75S284 124 243 121 194 100 196 71 216 28 254 26Z","b"],
  ["M256 8C305 4 341 38 339 78S299 147 241 143 172 112 175 71 204 12 256 8Z","b"],
  ["M262 -12C327 -16 372 32 368 84S318 172 236 166 148 124 152 72 192 -6 262 -12Z","b"],
  ["M78 150C94 142 114 148 116 162S100 186 82 184 60 168 64 158 72 153 78 150Z","a"],
  ["M74 128C102 118 136 132 138 160S112 206 78 204 38 178 42 156 54 134 74 128Z","b"],
  ["M-10 96C40 74 98 84 132 112S176 170 160 210","b"],
  ["M-10 58C46 34 120 46 160 84S212 160 200 214","b"]],
  e:[[252,72,1.6],[84,166,1.4]]};
/* The point a stroke's rotation (its third field) turns about, per drawing; the
   origin where a drawing has none. */
var CX={orbit:[80,80]};

/* A main line that closes on itself (a bowl's rim, the sun, a star) is a shape, and
   takes the glass fill (.c). */
function closed(d){
  if(/z\s*$/i.test(d))return true;
  var n=d.match(/-?[\d.]+/g);if(!n||n.length<4)return false;
  return Math.abs(+n[0]-+n[n.length-2])<0.6&&Math.abs(+n[1]-+n[n.length-1])<0.6&&/[AaCcQqSs]/.test(d);}
function strokes(name){
  var a=ART[name],c=CX[name]||[0,0],fill=!a.nofill;
  return a.s.map(function(s){
    return '<path class="'+s[1]+(fill&&s[1]==="a"&&closed(s[0])?' c':'')+'" d="'+s[0]+'" pathLength="1"'
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
