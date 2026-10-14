/* Bunyan — food icons
   A picture for every food, until it has a photograph: an icon chosen by what the
   food is (its id and English name, by the rules below, first match wins), else by
   its category. 24-unit grid, drawn as strokes (.fpic in index.html).

   When a food has a photograph, its id goes in FOOD_PHOTOS and the photo is shown
   instead: img/food/<id>-s.webp (132 px square) in lists, img/food/<id>-l.webp
   (720 px wide) on its own screen. tools/images.py photos makes both from any folder
   of photos named by food id.

   The icons are Tabler Icons (github.com/tabler/tabler-icons, icons/outline), MIT
   licence, reproduced below as it asks.

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

   Pure data and a lookup; imports nothing. */

var FOOD_ICONS={
  "apple":'<path d="M4 11.319c0 3.102 .444 5.319 2.222 7.978c1.351 1.797 3.156 2.247 5.08 .988c.426 -.268 .97 -.268 1.397 0c1.923 1.26 3.728 .809 5.079 -.988c1.778 -2.66 2.222 -4.876 2.222 -7.977c0 -2.661 -1.99 -5.32 -4.444 -5.32c-1.267 0 -2.41 .693 -3.22 1.44a.5 .5 0 0 1 -.672 0c-.809 -.746 -1.953 -1.44 -3.22 -1.44c-2.454 0 -4.444 2.66 -4.444 5.319"/><path d="M7 12c0 -1.47 .454 -2.34 1.5 -3"/><path d="M12 7c0 -1.2 .867 -4 3 -4"/>',
  "avocado":'<path d="M17.8 14.04a3.905 3.905 0 0 1 1.337 -2.075c1.195 -.985 1.816 -2.285 1.863 -3.902c-.047 -1.43 -.54 -2.626 -1.477 -3.586c-.96 -.938 -2.156 -1.43 -3.585 -1.477c-1.618 .047 -2.918 .668 -3.903 1.863c-.562 .68 -1.254 1.125 -2.074 1.336c-.938 .188 -1.828 .48 -2.672 .88c-.844 .398 -1.559 .878 -2.144 1.44c-1.43 1.501 -2.145 3.224 -2.145 5.169c0 1.946 .715 3.668 2.145 5.168c1.5 1.429 3.222 2.144 5.168 2.144c1.945 0 3.667 -.715 5.167 -2.145c.563 -.585 1.055 -1.3 1.477 -2.144c.398 -.844 .68 -1.723 .844 -2.637v-.035l-.001 .001"/><path d="M10.87 10.036c-.942 .112 -1.794 .538 -2.556 1.278c-.74 .762 -1.166 1.614 -1.278 2.556c-.135 .92 .112 1.704 .74 2.354c.65 .628 1.435 .875 2.354 .74c.942 -.112 1.794 -.538 2.556 -1.278c.74 -.762 1.166 -1.614 1.278 -2.556c.135 -.92 -.112 -1.704 -.74 -2.354c-.65 -.628 -1.435 -.875 -2.354 -.74"/>',
  "baguette":'<path d="M5.628 11.283l5.644 -5.637c2.665 -2.663 5.924 -3.747 8.663 -1.205l.188 .181a2.987 2.987 0 0 1 0 4.228l-11.287 11.274a3 3 0 0 1 -4.089 .135l-.143 -.135c-2.728 -2.724 -1.704 -6.117 1.024 -8.841"/><path d="M9.5 7.5l1.5 3.5"/><path d="M6.5 10.5l1.5 3.5"/><path d="M12.5 4.5l1.5 3.5"/>',
  "banana":'<path d="M20 6v-2a1 1 0 0 0 -1 -1h-2a1 1 0 0 0 -1 1v2a9.09 9.09 0 0 1 -4 8.08c-2 1.31 -5 1.57 -7 1.59a2 2 0 0 0 -2 2a2 2 0 0 0 1.16 1.81c2.69 1.2 9.46 3.44 14.35 -1.66c4.49 -4.74 1.49 -11.82 1.49 -11.82"/>',
  "bottle":'<path d="M10 5h4v-2a1 1 0 0 0 -1 -1h-2a1 1 0 0 0 -1 1v2"/><path d="M14 3.5c0 1.626 .507 3.212 1.45 4.537l.05 .07a8.093 8.093 0 0 1 1.5 4.694v6.199a2 2 0 0 1 -2 2h-6a2 2 0 0 1 -2 -2v-6.2c0 -1.682 .524 -3.322 1.5 -4.693l.05 -.07a7.823 7.823 0 0 0 1.45 -4.537"/><path d="M7 14.803a2.4 2.4 0 0 0 1 -.803a2.4 2.4 0 0 1 2 -1a2.4 2.4 0 0 1 2 1a2.4 2.4 0 0 0 2 1a2.4 2.4 0 0 0 2 -1a2.4 2.4 0 0 1 1 -.805"/>',
  "bowl":'<path d="M4 8h16a1 1 0 0 1 1 1v.5c0 1.5 -2.517 5.573 -4 6.5v1a1 1 0 0 1 -1 1h-8a1 1 0 0 1 -1 -1v-1c-1.687 -1.054 -4 -5 -4 -6.5v-.5a1 1 0 0 1 1 -1"/>',
  "bowl-chopsticks":'<path d="M4 11h16a1 1 0 0 1 1 1v.5c0 1.5 -2.517 5.573 -4 6.5v1a1 1 0 0 1 -1 1h-8a1 1 0 0 1 -1 -1v-1c-1.687 -1.054 -4 -5 -4 -6.5v-.5a1 1 0 0 1 1 -1"/><path d="M19 7l-14 1"/><path d="M19 2l-14 3"/>',
  "bowl-spoon":'<path d="M4 11h16a1 1 0 0 1 1 1v.5c0 1.5 -2.517 5.573 -4 6.5v1a1 1 0 0 1 -1 1h-8a1 1 0 0 1 -1 -1v-1c-1.687 -1.054 -4 -5 -4 -6.5v-.5a1 1 0 0 1 1 -1"/><path d="M8 7c1.657 0 3 -.895 3 -2s-1.343 -2 -3 -2s-3 .895 -3 2s1.343 2 3 2"/><path d="M11 5h9"/>',
  "bread":'<path d="M18 4a3 3 0 0 1 2 5.235v8.765a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-8.764a3 3 0 0 1 1.824 -5.231h12.176v-.005"/>',
  "burger":'<path d="M4 15h16a4 4 0 0 1 -4 4h-8a4 4 0 0 1 -4 -4"/><path d="M12 4c3.783 0 6.953 2.133 7.786 5h-15.572c.833 -2.867 4.003 -5 7.786 -5"/><path d="M5 12h14"/>',
  "cake":'<path d="M3 20h18v-8a3 3 0 0 0 -3 -3h-12a3 3 0 0 0 -3 3v8"/><path d="M3 14.803c.312 .135 .654 .204 1 .197a2.4 2.4 0 0 0 2 -1a2.4 2.4 0 0 1 2 -1a2.4 2.4 0 0 1 2 1a2.4 2.4 0 0 0 2 1a2.4 2.4 0 0 0 2 -1a2.4 2.4 0 0 1 2 -1a2.4 2.4 0 0 1 2 1a2.4 2.4 0 0 0 2 1c.35 .007 .692 -.062 1 -.197"/><path d="M12 4l1.465 1.638a2 2 0 1 1 -3.015 .099l1.55 -1.737"/>',
  "candy":'<path d="M7.05 11.293l4.243 -4.243a2 2 0 0 1 2.828 0l2.829 2.83a2 2 0 0 1 0 2.828l-4.243 4.243a2 2 0 0 1 -2.828 0l-2.829 -2.831a2 2 0 0 1 0 -2.828"/><path d="M16.243 9.172l3.086 -.772a1.5 1.5 0 0 0 .697 -2.516l-2.216 -2.217a1.5 1.5 0 0 0 -2.44 .47l-1.248 2.913"/><path d="M9.172 16.243l-.772 3.086a1.5 1.5 0 0 1 -2.516 .697l-2.217 -2.216a1.5 1.5 0 0 1 .47 -2.44l2.913 -1.248"/>',
  "carrot":'<path d="M3 21s9.834 -3.489 12.684 -6.34a4.487 4.487 0 0 0 0 -6.344a4.483 4.483 0 0 0 -6.342 0c-2.86 2.861 -6.347 12.689 -6.347 12.689l.005 -.005"/><path d="M9 13l-1.5 -1.5"/><path d="M16 14l-2 -2"/><path d="M22 8s-1.14 -2 -3 -2c-1.406 0 -3 2 -3 2s1.14 2 3 2s3 -2 3 -2"/><path d="M16 2s-2 1.14 -2 3s2 3 2 3s2 -1.577 2 -3c0 -1.86 -2 -3 -2 -3"/>',
  "cheese":'<path d="M4.519 20.008l16.481 -.008v-3.5a2 2 0 1 1 0 -4v-3.5h-16.722"/><path d="M21 9l-9.385 -4.992c-2.512 .12 -4.758 1.42 -6.327 3.425c-1.423 1.82 -2.288 4.221 -2.288 6.854c0 2.117 .56 4.085 1.519 5.721"/><path d="M15 13v.01"/><path d="M8 13v.01"/><path d="M11 16v.01"/>',
  "cherry":'<path d="M4 16.5a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0 -7 0"/><path d="M14 18a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"/><path d="M9 13c.366 -2 1.866 -3.873 4.5 -5.6"/><path d="M17 15c-1.333 -2.333 -2.333 -5.333 -1 -9"/><path d="M5 6c3.667 -2.667 7.333 -2.667 11 0c-3.667 2.667 -7.333 2.667 -11 0"/>',
  "coffee":'<path d="M3 14c.83 .642 2.077 1.017 3.5 1c1.423 .017 2.67 -.358 3.5 -1c.83 -.642 2.077 -1.017 3.5 -1c1.423 -.017 2.67 .358 3.5 1"/><path d="M8 3a2.4 2.4 0 0 0 -1 2a2.4 2.4 0 0 0 1 2"/><path d="M12 3a2.4 2.4 0 0 0 -1 2a2.4 2.4 0 0 0 1 2"/><path d="M3 10h14v5a6 6 0 0 1 -6 6h-2a6 6 0 0 1 -6 -6v-5"/><path d="M16.746 16.726a3 3 0 1 0 .252 -5.555"/>',
  "cookie":'<path d="M8 13v.01"/><path d="M12 17v.01"/><path d="M12 12v.01"/><path d="M16 14v.01"/><path d="M11 8v.01"/><path d="M13.148 3.476l2.667 1.104a4 4 0 0 0 4.656 6.14l.053 .132a3 3 0 0 1 0 2.296q -.745 1.18 -1.024 1.852q -.283 .684 -.66 2.216a3 3 0 0 1 -1.624 1.623q -1.572 .394 -2.216 .661q -.712 .295 -1.852 1.024a3 3 0 0 1 -2.296 0q -1.203 -.754 -1.852 -1.024q -.707 -.292 -2.216 -.66a3 3 0 0 1 -1.623 -1.624q -.397 -1.577 -.661 -2.216q -.298 -.718 -1.024 -1.852a3 3 0 0 1 0 -2.296q .719 -1.116 1.024 -1.852q .257 -.62 .66 -2.216a3 3 0 0 1 1.624 -1.623q 1.547 -.384 2.216 -.661q .687 -.285 1.852 -1.024a3 3 0 0 1 2.296 0"/>',
  "cup":'<path d="M5 11h14v-3h-14l0 3"/><path d="M17.5 11l-1.5 10h-8l-1.5 -10"/><path d="M6 8v-1a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v1"/><path d="M15 5v-2"/>',
  "droplet":'<path d="M7.502 19.423c2.602 2.105 6.395 2.105 8.996 0c2.602 -2.105 3.262 -5.708 1.566 -8.546l-4.89 -7.26c-.42 -.625 -1.287 -.803 -1.936 -.397a1.376 1.376 0 0 0 -.41 .397l-4.893 7.26c-1.695 2.838 -1.035 6.441 1.567 8.546"/>',
  "egg-fried":'<path d="M9 12a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"/><path d="M14 3a5 5 0 0 1 4.872 6.13a3 3 0 0 1 .178 5.681a3 3 0 1 1 -4.684 3.626a5 5 0 1 1 -8.662 -5a5 5 0 1 1 4.645 -8.856a4.982 4.982 0 0 1 3.651 -1.585l0 .004"/>',
  "eggs":'<path d="M13 22c-3 0 -4.868 -2.118 -5 -5c0 -3 2 -5 5 -5c4 0 8.01 2.5 8 5c0 2.5 -4 5 -8 5"/><path d="M8 18c-3.03 -.196 -5 -2.309 -5 -5.38c0 -4.307 2.75 -8.625 5.5 -8.62c2.614 0 5.248 3.915 5.5 8"/>',
  "fish":'<path d="M16.69 7.44a6.973 6.973 0 0 0 -1.69 4.56c0 1.747 .64 3.345 1.699 4.571"/><path d="M2 9.504c7.715 8.647 14.75 10.265 20 2.498c-5.25 -7.761 -12.285 -6.142 -20 2.504"/><path d="M18 11v.01"/><path d="M11.5 10.5c-.667 1 -.667 2 0 3"/>',
  "glass-full":'<path d="M8 21l8 0"/><path d="M12 15l0 6"/><path d="M17 3l1 7c0 3.012 -2.686 5 -6 5s-6 -1.988 -6 -5l1 -7h10"/><path d="M6 10a5 5 0 0 1 6 0a5 5 0 0 0 6 0"/>',
  "grape":'<path d="M13 3a14.5 14.5 0 0 0 -1 6"/><path d="M12 8.9s-2.77 .52 -4.1 -.8s-.8 -4 -.8 -4s2.57 -.53 3.88 .8s1.02 4 1.02 4"/><path d="M14 19a2 2 0 1 0 -4 0a2 2 0 0 0 4 0"/><path d="M14 17a2 2 0 1 1 0 -4a2 2 0 0 1 0 4"/><path d="M10 17a2 2 0 1 1 0 -4a2 2 0 0 1 0 4"/><path d="M12 13a2 2 0 1 1 0 -4a2 2 0 0 1 0 4"/><path d="M16 13a2 2 0 1 1 0 -4a2 2 0 0 1 0 4"/><path d="M8 13a2 2 0 1 1 0 -4a2 2 0 0 1 0 4"/>',
  "ice-cream":'<path d="M12 21.5v-4.5"/><path d="M8 17h8v-10a4 4 0 1 0 -8 0v10"/><path d="M8 10.5l8 -3.5"/><path d="M8 14.5l8 -3.5"/>',
  "leaf":'<path d="M5 21c.5 -4.5 2.5 -8 7 -10"/><path d="M9 18c6.218 0 10.5 -3.288 11 -12v-2h-4.014c-9 0 -11.986 4 -12 9c0 1 0 3 2 5h3l.014 0"/>',
  "lemon":'<path d="M17.536 3.393c3.905 3.906 3.905 10.237 0 14.143c-3.906 3.905 -10.237 3.905 -14.143 0l14.143 -14.143"/><path d="M5.868 15.06a6.5 6.5 0 0 0 9.193 -9.192"/><path d="M10.464 10.464l4.597 4.597"/><path d="M10.464 10.464v6.364"/><path d="M10.464 10.464h6.364"/>',
  "meat":'<path d="M13.62 8.382l1.966 -1.967a2 2 0 1 1 3.414 -1.415a2 2 0 1 1 -1.413 3.414l-1.82 1.821"/><path d="M5.904 18.596c2.733 2.734 5.9 4 7.07 2.829c1.172 -1.172 -.094 -4.338 -2.828 -7.071c-2.733 -2.734 -5.9 -4 -7.07 -2.829c-1.172 1.172 .094 4.338 2.828 7.071"/><path d="M7.5 16l1 1"/><path d="M12.975 21.425c3.905 -3.906 4.855 -9.288 2.121 -12.021c-2.733 -2.734 -8.115 -1.784 -12.02 2.121"/>',
  "melon":'<path d="M20 10c0 5.523 -4.477 10 -10 10a9.967 9.967 0 0 1 -6.984 -2.842l4.343 -4.153a4 4 0 0 0 5.76 -5.51l4.342 -4.153a9.963 9.963 0 0 1 2.539 6.658"/>',
  "milk":'<path d="M8 6h8v-2a1 1 0 0 0 -1 -1h-6a1 1 0 0 0 -1 1v2"/><path d="M16 6l1.094 1.759a6 6 0 0 1 .906 3.17v8.071a2 2 0 0 1 -2 2h-8a2 2 0 0 1 -2 -2v-8.071a6 6 0 0 1 .906 -3.17l1.094 -1.759"/><path d="M10 16a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M10 10h4"/>',
  "milkshake":'<path d="M17 10a5 5 0 0 0 -10 0"/><path d="M6 11a1 1 0 0 1 1 -1h10a1 1 0 0 1 1 1v1a1 1 0 0 1 -1 1h-10a1 1 0 0 1 -1 -1l0 -1"/><path d="M7 13l1.81 7.243a1 1 0 0 0 .97 .757h4.44a1 1 0 0 0 .97 -.757l1.81 -7.243"/><path d="M12 5v-2"/>',
  "mushroom":'<path d="M20 11.1c0 -4.474 -3.582 -8.1 -8 -8.1s-8 3.626 -8 8.1a.9 .9 0 0 0 .9 .9h14.2a.9 .9 0 0 0 .9 -.9"/><path d="M10 12v7a2 2 0 1 0 4 0v-7"/>',
  "nut":'<path d="M19 6.84a2.007 2.007 0 0 1 1 1.754v6.555c0 .728 -.394 1.4 -1.03 1.753l-6 3.844a1.995 1.995 0 0 1 -1.94 0l-6 -3.844a2.006 2.006 0 0 1 -1.03 -1.752v-6.557c0 -.728 .394 -1.399 1.03 -1.753l6 -3.582a2.049 2.049 0 0 1 2 0l6 3.582h-.03"/><path d="M9 12a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"/>',
  "pepper":'<path d="M13 11c0 2.21 -2.239 4 -5 4s-5 -1.79 -5 -4a8 8 0 1 0 16 0a3 3 0 0 0 -6 0"/><path d="M16 8c0 -2 2 -4 4 -4"/>',
  "pills":'<path d="M3 8a5 5 0 1 0 10 0a5 5 0 1 0 -10 0"/><path d="M13 17a4 4 0 1 0 8 0a4 4 0 1 0 -8 0"/><path d="M4.5 4.5l7 7"/><path d="M19.5 14.5l-5 5"/>',
  "pizza":'<path d="M12 21.5c-3.04 0 -5.952 -.714 -8.5 -1.983l8.5 -16.517l8.5 16.517a19.09 19.09 0 0 1 -8.5 1.983"/><path d="M5.38 15.866a14.94 14.94 0 0 0 6.815 1.634a14.944 14.944 0 0 0 6.502 -1.479"/><path d="M13 11.01v-.01"/><path d="M11 14v-.01"/>',
  "salad":'<path d="M4 11h16a1 1 0 0 1 1 1v.5c0 1.5 -2.517 5.573 -4 6.5v1a1 1 0 0 1 -1 1h-8a1 1 0 0 1 -1 -1v-1c-1.687 -1.054 -4 -5 -4 -6.5v-.5a1 1 0 0 1 1 -1"/><path d="M18.5 11c.351 -1.017 .426 -2.236 .5 -3.714v-1.286h-2.256c-2.83 0 -4.616 .804 -5.64 2.076"/><path d="M5.255 11.008a12.204 12.204 0 0 1 -.255 -2.008v-1h1.755c.98 0 1.801 .124 2.479 .35"/><path d="M8 8l1 -4l4 2.5"/><path d="M13 11v-.5a2.5 2.5 0 1 0 -5 0v.5"/>',
  "salt":'<path d="M12 13v.01"/><path d="M10 16v.01"/><path d="M14 16v.01"/><path d="M7.5 8h9l-.281 -2.248a2 2 0 0 0 -1.985 -1.752h-4.468a2 2 0 0 0 -1.986 1.752l-.28 2.248"/><path d="M7.5 8l-1.612 9.671a2 2 0 0 0 1.973 2.329h8.278a2 2 0 0 0 1.973 -2.329l-1.612 -9.671"/>',
  "sausage":'<path d="M5.5 5.5a2.5 2.5 0 0 0 -2.5 2.5c0 7.18 5.82 13 13 13a2.5 2.5 0 1 0 0 -5a8 8 0 0 1 -8 -8a2.5 2.5 0 0 0 -2.5 -2.5"/><path d="M5.195 5.519l-1.243 -1.989a1 1 0 0 1 .848 -1.53h1.392a1 1 0 0 1 .848 1.53l-1.245 1.99"/><path d="M18.482 18.225l1.989 -1.243a1 1 0 0 1 1.53 .848v1.392a1 1 0 0 1 -1.53 .848l-1.991 -1.245"/>',
  "soup":'<path d="M4 11h16a1 1 0 0 1 1 1v.5c0 1.5 -2.517 5.573 -4 6.5v1a1 1 0 0 1 -1 1h-8a1 1 0 0 1 -1 -1v-1c-1.687 -1.054 -4 -5 -4 -6.5v-.5a1 1 0 0 1 1 -1"/><path d="M12 4a2.4 2.4 0 0 0 -1 2a2.4 2.4 0 0 0 1 2"/><path d="M16 4a2.4 2.4 0 0 0 -1 2a2.4 2.4 0 0 0 1 2"/><path d="M8 4a2.4 2.4 0 0 0 -1 2a2.4 2.4 0 0 0 1 2"/>',
  "teapot":'<path d="M10.29 3h3.42a2 2 0 0 1 1.988 1.78l1.555 14a2 2 0 0 1 -1.988 2.22h-6.53a2 2 0 0 1 -1.988 -2.22l1.555 -14a2 2 0 0 1 1.988 -1.78"/><path d="M7.47 12.5l-4.257 -5.019a.899 .899 0 0 1 .69 -1.481h13.09a3 3 0 0 1 3.007 3v3c0 1.657 -1.346 3 -3.007 3"/><path d="M7 17h10"/>',
  "wheat":'<path d="M12.014 21.514v-3.75"/><path d="M5.93 9.504l-.43 1.604c-.712 2.659 .866 5.391 3.524 6.105c.997 .268 1.993 .535 2.99 .801v-3.44c-.164 -2.105 -1.637 -3.879 -3.676 -4.426l-2.408 -.644"/><path d="M13.744 11.164c.454 -.454 .815 -.994 1.061 -1.587c.246 -.594 .372 -1.23 .372 -1.873c0 -.643 -.126 -1.279 -.372 -1.872c-.246 -.594 -.606 -1.133 -1.061 -1.588l-1.73 -1.73l-1.73 1.73c-.454 .454 -.815 .994 -1.06 1.588c-.246 .594 -.372 1.23 -.373 1.872c0 .643 .127 1.279 .373 1.873c.246 .594 .606 1.133 1.06 1.587"/><path d="M18.099 9.504l.43 1.604c.712 2.659 -.866 5.391 -3.525 6.105c-.997 .268 -1.994 .535 -2.99 .801v-3.44c.164 -2.105 1.637 -3.879 3.677 -4.426l2.408 -.644"/>'
};

/* Ordered: the first rule whose words match the food's id or English name wins. */
var RULES=[
  ["milkshake",/milkshake|smoothie/],
  ["coffee",/coffee|espresso|\blatte\b|cappuccino|nescafe|mocha|americano/],
  ["teapot",/\btea\b|karkade|hibiscus|anise|sahlab|herbal|chamomile|cinnamon drink|ginger drink/],
  ["glass-full",/juice|sugarcane|asab|lemonade|tamarind|sobia|carob drink|kombucha|liquorice|erk sous/],
  ["cup",/hot chocolate|cocoa drink|sports drink/],
  ["pills",/whey|protein powder|casein|creatine|vitamin|omega|fish oil|capsule|bcaa|glutamine|collagen|electrolyte|\bzinc\b|magnesium|\biron\b|calcium|supplement|mass gainer|pre.?workout/],
  ["egg-fried",/omelette|omelet|shakshuka|fried egg|eggs with/],
  ["bowl-spoon",/\bful\b|foul|medames|bessara|besara|edamame/],
  ["eggs",/\beggs?\b|egg white|egg yolk/],
  ["burger",/burger|hawawshi/],
  ["pizza",/pizza|feteer|fiteer/],
  ["sausage",/sausage|hot ?dog|sujuk|sogo|luncheon|basterma|pastirma|salami|pepperoni|frankfurter|mortadella|bacon/],
  ["fish",/fish|tuna|salmon|sardine|shrimp|prawn|seafood|mackerel|feseekh|fesikh|renga|herring|tilapia|bolti|calamari|squid|crab|anchov|\bcod\b|sea ?bass|bouri|mullet/],
  ["meat",/chicken|turkey|beef|steak|meat|kofta|kebab|kabab|liver|lamb|veal|mutton|duck|pigeon|hamam|goose|rabbit|shawarma|nugget|camel|mince|kibbeh|fatta|torli|mombar|sharkaseya|grill/],
  ["bowl-chopsticks",/pasta|macaron|spaghetti|noodle|lasagn|penne|bechamel|indomie/],
  ["baguette",/baguette|croissant|fino|\broll\b|\bbun\b|bagel/],
  ["bread",/bread|\baish\b|baladi bread|pita|toast|loaf|sandwich|wrap|tortilla|shami|simit|semit|rusk|manakish|manaeesh/],
  ["soup",/soup|shorba|molokhia|broth|lesan asfour/],
  ["ice-cream",/ice ?cream|gelato|sorbet|frozen yog/],
  ["carrot",/sweet potato|carrot|beet|radish|turnip/],
  ["apple",/custard apple|prickly pear/],
  ["lemon",/lemon|\blime\b|orange|mandarin|tangerine|grapefruit|citrus/],
  ["droplet",/\boil\b|ghee|samna/],
  ["wheat",/sweet corn|\bcorn\b|wheat|flour|semolina|barley|quinoa|grain|millet|popcorn/],
  ["candy",/chocolate(?! biscuit)|candy|sugar\b|toffee|marshmallow|lollipop|\bgum\b|turkish delight|cocoa/],
  ["cookie",/cookie|biscuit|cracker|rice cake|protein bar|granola bar|cereal bar|wafer|\bbar\b|maamoul/],
  ["cake",/cake|basbousa|kunafa|konafa|baklava|om ali|umm ali|qatayef|atayef|zalabia|zalabya|luqaimat|meshabek|ghorayeba|kahk|petit four|pastry|donut|doughnut|muffin|brownie|\bpie\b|tart|halawa|halva|pudding|mahallabia|mahalabia|roz bel laban|custard|caramel|creme|jelly|dessert|\bsweet\b|waffle|pancake|crepe|mille feuille|sambousek/],
  ["cheese",/cheese|gebna|feta|mozzarella|cottage|halloumi|cheddar|\bedam\b|gouda|parmesan|labneh|\bmish\b|\bmesh\b|rumi|areesh|ricotta|skyr/],
  ["milk",/milk|laban|yogh?urt|zabadi|kefir|\brayeb\b|\bcream\b|ayran|eshta/],
  ["candy",/chocolate|candy|sugar|toffee|marshmallow|lollipop|\bgum\b|turkish delight|cocoa/],
  ["bottle",/\bcola\b|soda|pepsi|sprite|energy drink|soft drink|ketchup|sauce|dressing|vinegar|syrup|\bhoney\b|molasses|\bjam\b|spread/],
  ["droplet",/\boil\b|ghee|samna|margarine|mayonnaise|\bmayo\b|\blard\b/],
  ["nut",/\bnuts?\b|almond|peanut|walnut|pistachio|cashew|hazelnut|pecan|seed|sesame|tahini|flax|chia|lupin|termes|coconut/],
  ["droplet",/butter/],
  ["salt",/salt|spice|cumin|seasoning|dukkah|za.?atar|mustard|yeast/],
  ["salad",/salad|tabbouleh|fattoush|baba ganoush|mutabbal|pickle|torshi|coleslaw/],
  ["bowl-spoon",/lentil|chickpea|hummus|beans?\b|koshari|kushari|fava|freekeh|bulgur|couscous|\boats?\b|porridge|cereal|muesli|granola|flakes|\bbran\b|\brice\b|\broz\b|mahshi|stuffed|moussaka|musaqaa|okra|bamya|potato|taro|qolqas|stew|tagine|saloona|curry|biryani|kabsa|mandi|maqluba|fatteh|ta.?meya|taameya|falafel|belila|vermicelli/],
  ["banana",/banana|plantain/],
  ["grape",/grape|raisin/],
  ["melon",/melon|cantaloupe|kharbouz/],
  ["cherry",/cherr|berr|\bdates?\b|tamr|\bfigs?\b|plum|prune|olive|pomegranate|apricot|guava|lychee/],
  ["avocado",/avocado/],
  ["apple",/apple|pear|peach|nectarine|mango|kiwi|pineapple|papaya|quince|persimmon|passion fruit|fruit/],
  ["mushroom",/mushroom/],
  ["pepper",/pepper|chil+i|capsicum/],
  ["leaf",/spinach|lettuce|kale|arugula|rocket|gargir|watercress|parsley|dill|coriander|cilantro|\bmint\b|basil|herb|cabbage|leaves|chard|broccoli|cauliflower|zucchini|courgette|kousa|cucumber|tomato|eggplant|aubergine|onion|garlic|celery|asparagus|leek|\bpeas?\b|artichoke|vegetable|pumpkin|marrow|fennel|ginger/],
  ["droplet",/water/]
];
/* What a food not named by any rule falls back to: its category. */
var BYCAT={"Protein":"meat","Dairy":"milk","Grains":"wheat","Vegetables":"leaf","Fruits":"apple","Fats":"droplet","Sweets":"candy",
  "Beverages":"cup","Supplements":"pills","Fast Food":"burger","Condiments":"salt","Egyptian":"bowl-spoon","Middle Eastern":"bowl"};

/* Foods that have a photograph (see above). Empty until photographs are added. */
var FOOD_PHOTOS={};

/* The icon's name for a food ({id, n, cat}); custom and quick-added foods, which
   may have neither id nor category, are matched by name alone. */
function foodIconOf(f){
  if(!f)return "bowl";
  var hay=(String(f.id||f.fid||"").replace(/_/g," ")+" | "+String(f.n||"")).toLowerCase();
  for(var i=0;i<RULES.length;i++)if(RULES[i][1].test(hay))return RULES[i][0];
  return BYCAT[f.cat]||"bowl";}
function foodPhoto(f,large){
  var id=f&&(f.id||f.fid);
  return id&&FOOD_PHOTOS[id]?"img/food/"+id+(large?"-l":"-s")+".webp":null;}
/* The picture as markup: the photograph when there is one, else the icon. */
function foodPic(f,cls){
  var ph=foodPhoto(f,false);
  if(ph)return '<span class="fpic ph'+(cls?" "+cls:"")+'"><img src="'+ph+'" alt="" loading="lazy" decoding="async"></span>';
  return '<span class="fpic'+(cls?" "+cls:"")+'" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false">'+FOOD_ICONS[foodIconOf(f)]+'</svg></span>';}

export {FOOD_ICONS, FOOD_PHOTOS, foodIconOf, foodPhoto, foodPic};
