/* Bunyan — glyphs
   The line icons the Coach chat, Profile and the top of Training use, drawn for them on the 24px grid the
   rest of the icon set uses: a 1.75 stroke in the current text colour, square caps and
   mitred joins, nothing filled. Inline SVG rather than the CSS-mask icons in
   index.html, because these sit inside tinted tiles and take their colour from them.

   glyph(name) is the markup, aria-hidden: every one sits next to words that say what
   it means. An unknown name draws nothing. */
var P={
  dumbbell:"M3 9v6M6.5 6v12M17.5 6v12M21 9v6M6.5 12h11",
  bowl:"M3 11h18a9 9 0 0 1-18 0zM9.5 3.5c-1 1.2-1 2.3 0 3.5M14.5 3.5c-1 1.2-1 2.3 0 3.5",
  bars:"M3 20h18M5 20v-6h3.5v6M10.25 20V9h3.5v11M15.5 20V4H19v16",
  scale:"M5 4h14l1.5 16h-17zM8.5 10a3.5 3.5 0 0 1 7 0M12 10l1.8-1.8",
  shaker:"M9 3h6v3.5H9zM7.5 6.5h9l-1 14.5h-7zM8.2 11.5h7.6",
  flame:"M12 21a6 6 0 0 0 6-6c0-3.8-2.6-5.6-4-9.5-1.9 1.6-3 3.6-3 5.8-1-.6-1.7-1.6-2-2.8C7.4 10 6 12.2 6 15a6 6 0 0 0 6 6z",
  moon:"M19.5 14.5A8 8 0 1 1 9.5 4.5a6.5 6.5 0 0 0 10 10z",
  clock:"M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18zM12 7.5V12l3 2",
  balance:"M12 4v16M7.5 20h9M5 7h14M5 7l-3 7h6zM19 7l-3 7h6z",
  medal:"M12 3a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11zM9 13.2 8 21l4-2.2 4 2.2-1-7.8",
  target:"M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18zM12 7.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9zM12 11.25v1.5",
  clipboard:"M8.5 3.5h7v3h-7zM8.5 5H5v16h14V5h-3.5M8.5 11h7M8.5 15h4.5",
  drop:"M12 3.5l5.6 8.2a6.6 6.6 0 1 1-11.2 0z",
  route:"M6 19.5h4a3.25 3.25 0 0 0 0-6.5H8a3.25 3.25 0 0 1 0-6.5h10M4 19.5h1M19 6.5h1",
  question:"M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18zM9.6 9.4a2.5 2.5 0 1 1 3.6 2.3c-.7.4-1.2.9-1.2 1.8v.6M12 16.6v.9",
  person:"M12 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8zM4.5 21c.9-4.4 3.9-6.5 7.5-6.5s6.6 2.1 7.5 6.5",
  people:"M9 5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7zM2.5 20c.8-3.8 3.3-5.5 6.5-5.5s5.7 1.7 6.5 5.5M15.5 5.3a3.5 3.5 0 0 1 0 6.4M17.5 14.8c2.1.6 3.5 2.3 4 5.2",
  sliders:"M4 7h9M18 7h2M4 17h2M11 17h9M15.5 4.5v5M8.5 14.5v5",
  share:"M12 3v12M7.5 7.5 12 3l4.5 4.5M5 13v8h14v-8",
  eye:"M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zM12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6z",
  archive:"M3 4h18v5H3zM5 9v11h14V9M9.5 13h5",
  info:"M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18zM12 10.5v6M12 7v1",
  send:"M12 20V5M5.5 11.5 12 5l6.5 6.5",
  trash:"M4 6.5h16M9.5 3.5h5v3h-5zM6 6.5l1 14.5h10l1-14.5M10 10.5v7M14 10.5v7",
  check:"M5 12.5l4.5 4.5L19 7.5",
  lock:"M5 10.5h14V21H5zM8 10.5V7a4 4 0 0 1 8 0v3.5",
  restore:"M4 12a8 8 0 1 0 2.4-5.7M4 4v4.5h4.5",
  sound:"M4 9h4l5-4v14l-5-4H4zM16.5 9a4 4 0 0 1 0 6M19 6.5a7.5 7.5 0 0 1 0 11",
  bell:"M6 16.5V10.5a6 6 0 0 1 12 0v6l1.5 2h-15zM10 21.5h4",
  whistle:"M9 7h12.5v4.75h-6.9A6.25 6.25 0 1 1 9 7zM10.9 13.25a1.9 1.9 0 1 1-3.8 0 1.9 1.9 0 0 1 3.8 0z"};

function glyph(name,cls){
  var d=P[name];if(!d)return "";
  return '<svg class="gl'+(cls?' '+cls:'')+'" viewBox="0 0 24 24" aria-hidden="true" focusable="false">'
   +'<path d="'+d+'"/></svg>';}

export {glyph};
