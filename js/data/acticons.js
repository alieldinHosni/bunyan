/* Bunyan — activity icons
   One icon per activity, so the Cardio & Sports grid is found by shape. 24-unit grid,
   drawn as strokes (.acticon in index.html sets the width and caps).

   Most are Tabler Icons (github.com/tabler/tabler-icons, icons/outline), MIT licence,
   reproduced below as it asks; the rest were drawn for Bunyan to match them.

   MIT License

   Copyright (c) 2020-2026 Paweł Kuna

   Permission is hereby granted, free of charge, to any person obtaining a copy
   of this software and associated documentation files (the "Software"), to deal
   in the Software without restriction, including without limitation the rights
   to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
   copies of the Software, and to permit persons to whom the Software is
   furnished to do so, subject to the following conditions:

   The above copyright notice and this permission notice shall be included in all
   copies or substantial portions of the Software.

   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
   IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
   FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
   AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
   LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
   OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
   SOFTWARE.

   Pure data; imports nothing. */

var ACT_ICONS={
  "run":'<path d="M11.007 5a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M4 17l5 1l.75 -1.5"/><path d="M15 21v-4l-4 -3l1 -6"/><path d="M7 12v-3l5 -1l3 3l3 1"/>',
  "walk":'<path d="M12 4a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"/><path d="M7 21l3 -4"/><path d="M16 21l-2 -4l-3 -3l1 -6"/><path d="M6 12l2 -3l4 -1l3 3l3 1"/>',
  "swimming":'<path d="M15 9a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"/><path d="M6 11l4 -2l3.5 3l-1.5 2"/><path d="M3 16.75a2.4 2.4 0 0 0 1 .25a2.4 2.4 0 0 0 2 -1a2.4 2.4 0 0 1 2 -1a2.4 2.4 0 0 1 2 1a2.4 2.4 0 0 0 2 1a2.4 2.4 0 0 0 2 -1a2.4 2.4 0 0 1 2 -1a2.4 2.4 0 0 1 2 1a2.4 2.4 0 0 0 2 1a2.4 2.4 0 0 0 1 -.25"/>',
  "trekking":'<path d="M11 4a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"/><path d="M7 21l2 -4"/><path d="M13 21v-4l-3 -3l1 -6l3 4l3 2"/><path d="M10 14l-1.827 -1.218a2 2 0 0 1 -.831 -2.15l.28 -1.117a2 2 0 0 1 1.939 -1.515h1.439l4 1l3 -2"/><path d="M17 12v9"/><path d="M16 20h2"/>',
  "bike":'<path d="M2 18a3 3 0 1 0 6 0a3 3 0 0 0 -6 0"/><path d="M16 18a3 3 0 1 0 6 0a3 3 0 0 0 -6 0"/><path d="M12 19v-4l-3 -3l5 -4l2 3h3"/><path d="M13.007 5a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/>',
  "flame":'<path d="M12 10.941c2.333 -3.308 .167 -7.823 -1 -8.941c0 3.395 -2.235 5.299 -3.667 6.706c-1.43 1.408 -2.333 3.294 -2.333 5.588c0 3.704 3.134 6.706 7 6.706c3.866 0 7 -3.002 7 -6.706c0 -1.712 -1.232 -4.403 -2.333 -5.588c-2.084 3.353 -3.257 3.353 -4.667 2.235"/>',
  "barbell":'<path d="M2 12h1"/><path d="M6 8h-2a1 1 0 0 0 -1 1v6a1 1 0 0 0 1 1h2"/><path d="M6 7v10a1 1 0 0 0 1 1h1a1 1 0 0 0 1 -1v-10a1 1 0 0 0 -1 -1h-1a1 1 0 0 0 -1 1"/><path d="M9 12h6"/><path d="M15 7v10a1 1 0 0 0 1 1h1a1 1 0 0 0 1 -1v-10a1 1 0 0 0 -1 -1h-1a1 1 0 0 0 -1 1"/><path d="M18 8h2a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-2"/><path d="M22 12h-1"/>',
  "yoga":'<path d="M4 20h4l1.5 -3"/><path d="M17 20l-1 -5h-5l1 -7"/><path d="M4 10l4 -1l4 -1l4 1.5l4 1.5"/><path d="M10.007 5a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/>',
  "stretching-2":'<path d="M6.5 21l3.5 -5"/><path d="M5 11l7 -2"/><path d="M16 21l-4 -7v-5l7 -4"/><path d="M9.007 6a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/>',
  "music":'<path d="M3 17a3 3 0 1 0 6 0a3 3 0 0 0 -6 0"/><path d="M13 17a3 3 0 1 0 6 0a3 3 0 0 0 -6 0"/><path d="M9 17v-13h10v13"/><path d="M9 8h10"/>',
  "stretching":'<path d="M15 5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"/><path d="M5 20l5 -.5l1 -2"/><path d="M18 20v-5h-5.5l2.5 -6.5l-5.5 1l1.5 2"/>',
  "ball-football":'<path d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0"/><path d="M12 7l4.76 3.45l-1.76 5.55h-6l-1.76 -5.55l4.76 -3.45"/><path d="M12 7v-4m3 13l2.5 3m-.74 -8.55l3.74 -1.45m-11.44 7.05l-2.56 2.95m.74 -8.55l-3.74 -1.45"/>',
  "ball-basketball":'<path d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0"/><path d="M5.65 5.65l12.7 12.7"/><path d="M5.65 18.35l12.7 -12.7"/><path d="M12 3a9 9 0 0 0 9 9"/><path d="M3 12a9 9 0 0 1 9 9"/>',
  "ball-tennis":'<path d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0"/><path d="M6 5.3a9 9 0 0 1 0 13.4"/><path d="M18 5.3a9 9 0 0 0 0 13.4"/>',
  "ping-pong":'<path d="M12.718 20.713a7.64 7.64 0 0 1 -7.48 -12.755l.72 -.72a7.643 7.643 0 0 1 9.105 -1.283l2.387 -2.345a2.08 2.08 0 0 1 3.057 2.815l-.116 .126l-2.346 2.387a7.644 7.644 0 0 1 -1.052 8.864"/><path d="M11 18a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"/><path d="M9.3 5.3l9.4 9.4"/>',
  "ball-volleyball":'<path d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0"/><path d="M12 12a8 8 0 0 0 8 4"/><path d="M7.5 13.5a12 12 0 0 0 8.5 6.5"/><path d="M12 12a8 8 0 0 0 -7.464 4.928"/><path d="M12.951 7.353a12 12 0 0 0 -9.88 4.111"/><path d="M12 12a8 8 0 0 0 -.536 -8.928"/><path d="M15.549 15.147a12 12 0 0 0 1.38 -10.611"/>',
  "play-handball":'<path d="M13 21l3.5 -2l-4.5 -4l2 -4.5"/><path d="M5 7l4 3l5 .5l4 2.5l2.5 3"/><path d="M4 20l5 -1l1.5 -2"/><path d="M13.007 8a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M6.007 3.5a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0"/>',
  "ball-american-football":'<path d="M15 9l-6 6"/><path d="M10 12l2 2"/><path d="M12 10l2 2"/><path d="M8 21a5 5 0 0 0 -5 -5"/><path d="M16 3c-7.18 0 -13 5.82 -13 13a5 5 0 0 0 5 5c7.18 0 13 -5.82 13 -13a5 5 0 0 0 -5 -5"/><path d="M16 3a5 5 0 0 0 5 5"/>',
  "cricket":'<path d="M11.105 18.79l-1 .992a4.159 4.159 0 0 1 -6.038 -5.715l.157 -.166l8.282 -8.401l1.5 1.5l3.45 -3.391a2.08 2.08 0 0 1 3.057 2.815l-.116 .126l-3.391 3.45l1.5 1.5l-3.668 3.617"/><path d="M10.5 7.5l6 6"/><path d="M11 18a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"/>',
  "ball-baseball":'<path d="M5.636 18.364a9 9 0 1 0 12.728 -12.728a9 9 0 0 0 -12.728 12.728"/><path d="M12.495 3.02a9 9 0 0 1 -9.475 9.475"/><path d="M20.98 11.505a9 9 0 0 0 -9.475 9.475"/><path d="M9 9l2 2"/><path d="M13 13l2 2"/><path d="M11 7l2 1"/><path d="M7 11l1 2"/><path d="M16 11l1 2"/><path d="M11 16l2 1"/>',
  "golf":'<path d="M12 18v-15l7 4l-7 4"/><path d="M9 17.67c-.62 .36 -1 .82 -1 1.33c0 1.1 1.8 2 4 2s4 -.9 4 -2c0 -.5 -.38 -.97 -1 -1.33"/>',
  "karate":'<path d="M3 9l4.5 1l3 2.5"/><path d="M13 21v-8l3 -5.5"/><path d="M8 4.5l4 2l4 1l4 3.5l-2 3.5"/><path d="M15.007 5a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/>',
  "mountain":'<path d="M3 20h18l-6.921 -14.612a2.3 2.3 0 0 0 -4.158 0l-6.921 14.612"/><path d="M7.5 11l2 2.5l2.5 -2.5l2 3l2.5 -2"/>',
  "ski-jumping":'<path d="M17 17.5l-5 -4.5v-6l5 4"/><path d="M7 17.5l5 -4.5"/><path d="M15.103 21.58l6.762 -14.502a2 2 0 0 0 -.968 -2.657"/><path d="M8.897 21.58l-6.762 -14.503a2 2 0 0 1 .968 -2.657"/><path d="M7 11l5 -4"/><path d="M10.007 4a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/>',
  "treadmill":'<path d="M10 3a1 1 0 1 0 2 0a1 1 0 0 0 -2 0"/><path d="M3 14l4 1l.5 -.5"/><path d="M12 18v-3l-3 -2.923l.75 -5.077"/><path d="M6 10v-2l4 -1l2.5 2.5l2.5 .5"/><path d="M21 22a1 1 0 0 0 -1 -1h-16a1 1 0 0 0 -1 1"/><path d="M18 21l1 -11l2 -1"/>',
  "jump-rope":'<path d="M6 14v-6a3 3 0 1 1 6 0v8a3 3 0 0 0 6 0v-6"/><path d="M16 5a2 2 0 0 1 2 -2a2 2 0 0 1 2 2v3a2 2 0 0 1 -2 2a2 2 0 0 1 -2 -2l0 -3"/><path d="M4 16a2 2 0 0 1 2 -2a2 2 0 0 1 2 2v3a2 2 0 0 1 -2 2a2 2 0 0 1 -2 -2l0 -3"/>',
  "ice-skating":'<path d="M5.905 5h3.418a1 1 0 0 1 .928 .629l1.143 2.856a3 3 0 0 0 2.207 1.83l4.717 .926a2.084 2.084 0 0 1 1.682 2.045v.714a1 1 0 0 1 -1 1h-13.895a1 1 0 0 1 -1 -1.1l.8 -8a1 1 0 0 1 1 -.9"/><path d="M3 19h17a1 1 0 0 0 1 -1"/><path d="M9 15v4"/><path d="M15 15v4"/>',
  "stairs-up":'<path d="M22 6h-5v5h-5v5h-5v5h-5"/><path d="M6 10v-7"/><path d="M3 6l3 -3l3 3"/>',
  "stairs":'<path d="M22 5h-5v5h-5v5h-5v5h-5"/>',
  "run-sprint":'<path d="M14.007 5a2 2 0 1 0 4 0a2 2 0 0 0 -4 0"/><path d="M7 17l5 1l.75 -1.5"/><path d="M18 21v-4l-4 -3l1 -6"/><path d="M10 12v-3l5 -1l3 3l3 1"/><path d="M10 5h-4"/><path d="M6 10h-4"/>',
  "heartbeat":'<path d="M19.5 13.572l-7.5 7.428l-2.896 -2.868m-6.117 -8.104a5 5 0 0 1 9.013 -3.022a5 5 0 1 1 7.5 6.572"/><path d="M3 13h2l2 3l2 -6l1 3h3"/>',
  /* Drawn for Bunyan in the same grid, stroke and caps: the machines, and the sports Tabler has no icon for. */
  "stationary-bike":'<path d="M5 20h14"/><path d="M9.5 20l1.5 -10"/><path d="M8.5 10h4"/><path d="M10.6 14h3"/><path d="M13 15.5a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"/><path d="M16 12.5l-1 -6.5"/><path d="M13.5 6h3"/>',
  "air-bike":'<path d="M5 20h14"/><path d="M8 20l1.5 -9"/><path d="M7.5 11h3.5"/><path d="M12 14a4 4 0 1 0 8 0a4 4 0 1 0 -8 0"/><path d="M14.6 11.4l2.8 5.2"/><path d="M18.6 12.4l-5.2 3.2"/><path d="M9.2 15h2.8"/><path d="M16 10l-2.5 -6"/><path d="M12 4h3"/>',
  "recumbent-bike":'<path d="M4 20h16"/><path d="M5.5 8l2.5 6"/><path d="M8 14h5"/><path d="M10 14v6"/><path d="M13 14h1.5"/><path d="M14.5 14a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0 -5 0"/><path d="M7.5 12h3"/>',
  "elliptical":'<path d="M4 20h16"/><path d="M4 15.5a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0 -5 0"/><path d="M6.5 15.5l9.5 -2.5"/><path d="M10 14.6l2.5 -.6"/><path d="M16 20l-1 -7l1 -9"/><path d="M14 4h4"/>',
  "rowing":'<path d="M3 19h18"/><path d="M15 15a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"/><path d="M5 17h4"/><path d="M7 17v2"/><path d="M13 19l1 -4"/><path d="M15.5 11h-3.5"/><path d="M10 6a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0"/><path d="M8 15.5l2 -6.5l2.5 2"/>',
  "boxing":'<path d="M7 13v-5a5 5 0 0 1 5 -5h1a5 5 0 0 1 5 5v4a5 5 0 0 1 -5 5h-4a2 2 0 0 1 -2 -2z"/><path d="M7 11h3a2 2 0 0 1 2 2"/><path d="M9 17v4h7v-4"/>',
  "hockey":'<path d="M7 3l6 16a1.5 1.5 0 0 0 1.4 1h4.6"/><path d="M3 19.5a2.5 1 0 1 0 5 0a2.5 1 0 1 0 -5 0"/>',
  "shuttlecock":'<path d="M10 19a2 2 0 1 0 4 0"/><path d="M10 19h4"/><path d="M10 19l-3 -15h10l-3 15"/><path d="M11.3 4l.3 15"/><path d="M12.7 4l-.3 15"/><path d="M8.2 10h7.6"/>',
  "padel":'<path d="M12 3c3.3 0 6 2.5 6 6c0 3.2 -2.4 5.3 -4.5 6.2l-.5 1.8h-2l-.5 -1.8c-2.1 -.9 -4.5 -3 -4.5 -6.2c0 -3.5 2.7 -6 6 -6z"/><path d="M11 17h2v4h-2z"/><path d="M10 8h.01"/><path d="M12 6.5h.01"/><path d="M14 8h.01"/><path d="M12 10h.01"/><path d="M10 11.5h.01"/><path d="M14 11.5h.01"/>',
  "squash":'<ellipse cx="14.5" cy="8.5" rx="4" ry="5.5" transform="rotate(45 14.5 8.5)"/><path d="M11.6 12.3l-7.6 7.7"/><path d="M12.5 6.5l4 4"/><path d="M4 6a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0"/>'
};

export {ACT_ICONS};
