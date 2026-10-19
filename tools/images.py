#!/usr/bin/env python3
"""Bunyan — the image pipeline.

One script turns source pictures into the files the app ships, so every picture of a
kind has the same size, crop and compression, and adding more is a re-run.

  python3 tools/images.py exercises [--src DIR]
      Thumbnails for every photographed exercise: img/ex/<id>.webp, 156 px tall
      (52 px, the largest a thumbnail is drawn, at 3x). The source is the
      free-exercise-db photo <id>/0.jpg, from DIR if given (a checkout of its
      exercises/ folder), otherwise fetched from GitHub into ~/.cache/bunyan-src.
      Exercises the app adds with a photographed twin (js/data/extra.js, PH) are
      included under that twin's id.

  python3 tools/images.py photos SRC_DIR OUT_DIR [--name-from FILE]
      Any folder of photos (foods, for one) to OUT_DIR/<name>-s.webp (132 px square,
      a list thumbnail) and OUT_DIR/<name>-l.webp (720 px wide, a screen's hero).
      <name> is the source file's name without its extension.

  python3 tools/images.py rendered SRC_DIR
      The 3D figure's stills drawn by the live renderer (tools/figures/stills.mjs:
      SRC_DIR/<id>-<n>.png, 1080x810 with their stage and arrow already drawn, and
      SRC_DIR/<id>.json, where the body is in the first frame), to img/fig/<id>-<n>.webp
      at 720x540 and the list thumbnail img/ex/<id>.webp (156 px square round the
      body). Writes js/data/figures.js, the list of which exercises have stills and how
      many frames each.

  python3 tools/images.py icons
      The app's icons, one per theme, from the mark (mark.png): the mark in the
      theme's colours on the theme's ground, as the app draws them. icon-180.png (the
      Home Screen icon and the tab's, full-bleed: the phone rounds it), icon-512.png
      (rounded) and icon-maskable-512.png (full-bleed, the mark inside the safe circle)
      in Blue, the default theme, which the manifest names; icon-red-180.png and
      icon-mono-180.png for the other two, which js/ui/theme.js swaps in.

Needs Pillow with WebP (python3 -c "from PIL import features; print(features.check('webp'))").
Existing outputs are kept unless --force; the run says what it made and what it skipped.
"""
import io, json, os, re, sys, urllib.request
from concurrent.futures import ThreadPoolExecutor
from PIL import Image, ImageDraw, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/"
CACHE = os.path.expanduser("~/.cache/bunyan-src/free-exercise-db")


def webp(im, path, quality):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.save(path, "WEBP", quality=quality, method=6)
    return os.path.getsize(path)


def fit_height(im, h):
    im = ImageOps.exif_transpose(im).convert("RGB")
    return im.resize((round(im.width * h / im.height), h), Image.LANCZOS)


def square(im, s):
    im = ImageOps.exif_transpose(im).convert("RGB")
    return ImageOps.fit(im, (s, s), Image.LANCZOS, centering=(0.5, 0.5))


def fit_width(im, w):
    im = ImageOps.exif_transpose(im).convert("RGB")
    if im.width <= w:
        return im
    return im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)


def exercise_ids():
    lib = json.load(open(os.path.join(ROOT, "exercises.json"), encoding="utf8"))
    ids = {v["i"] for v in lib.values() if v.get("i")}
    extra = open(os.path.join(ROOT, "js/data/extra.js"), encoding="utf8").read()
    m = re.search(r"var PH=\{(.*?)\};", extra, re.S)
    if m:
        ids |= set(re.findall(r':"([^"]+)"', m.group(1)))
    return sorted(ids)


def source(i, src):
    if src:
        p = os.path.join(src, i, "0.jpg")
        return open(p, "rb").read() if os.path.exists(p) else None
    p = os.path.join(CACHE, i, "0.jpg")
    if not os.path.exists(p):
        try:
            data = urllib.request.urlopen(RAW + i + "/0.jpg", timeout=30).read()
        except Exception:
            return None
        os.makedirs(os.path.dirname(p), exist_ok=True)
        open(p, "wb").write(data)
    return open(p, "rb").read()


def exercises(args):
    src = args[args.index("--src") + 1] if "--src" in args else None
    force = "--force" in args
    ids = exercise_ids()
    out = os.path.join(ROOT, "img/ex")
    made, kept, missing, total = 0, 0, [], 0

    def one(i):
        path = os.path.join(out, i + ".webp")
        if os.path.exists(path) and not force:
            return ("kept", i, os.path.getsize(path))
        data = source(i, src)
        if not data:
            return ("missing", i, 0)
        return ("made", i, webp(fit_height(Image.open(io.BytesIO(data)), 156), path, 70))

    with ThreadPoolExecutor(8) as pool:
        for kind, i, size in pool.map(one, ids):
            total += size
            if kind == "made": made += 1
            elif kind == "kept": kept += 1
            else: missing.append(i)
    print(f"{len(ids)} exercises: {made} made, {kept} kept, {len(missing)} without a photo; "
          f"img/ex is {total // 1024} KB")
    if missing:
        print("no photo:", ", ".join(missing))


def photos(args):
    if len(args) < 3:
        sys.exit(__doc__)
    src, out = args[1], args[2]
    force = "--force" in args
    n = 0
    for f in sorted(os.listdir(src)):
        name, ext = os.path.splitext(f)
        if ext.lower() not in (".jpg", ".jpeg", ".png", ".webp"):
            continue
        s, l = os.path.join(out, name + "-s.webp"), os.path.join(out, name + "-l.webp")
        if os.path.exists(s) and os.path.exists(l) and not force:
            continue
        im = Image.open(os.path.join(src, f))
        webp(square(im, 132), s, 72)
        webp(fit_width(im, 720), l, 74)
        n += 1
    print(f"{n} photos written to {out}")


def rendered(args):
    if len(args) < 2:
        sys.exit(__doc__)
    src = args[1]
    frames = {}
    for f in sorted(os.listdir(src)):
        m = re.match(r"(.+)-(\d+)\.png$", f)
        if m:
            frames.setdefault(m.group(1), []).append(int(m.group(2)))
    total = 0
    for i, ns in sorted(frames.items()):
        meta = json.load(open(os.path.join(src, i + ".json")))
        for n in sorted(ns):
            im = Image.open(os.path.join(src, f"{i}-{n}.png")).convert("RGB")
            total += webp(im.resize((720, 540), Image.LANCZOS), os.path.join(ROOT, "img/fig", f"{i}-{n}.webp"), 84)
            if n == 0:
                x0, y0, x1, y1 = meta["box"]
                side = max(x1 - x0, y1 - y0) * 1.08
                cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
                box = [cx - side / 2, cy - side / 2, cx + side / 2, cy + side / 2]
                total += webp(im.crop(tuple(round(v) for v in box)).resize((156, 156), Image.LANCZOS),
                              os.path.join(ROOT, "img/ex", i + ".webp"), 82)
    lines = ",\n".join(f'  "{i}":{len(ns)}' for i, ns in sorted(frames.items()))
    open(os.path.join(ROOT, "js/data/figures.js"), "w", encoding="utf8").write(
        "/* Bunyan — the 3D figure's stills (generated by tools/images.py rendered; do not edit)\n"
        "   Exercises drawn by the live 3D figure, as its start and end pictures (tools/figures/\n"
        "   stills.mjs): exercise id -> frames. The frames are img/fig/<id>-<n>.webp, the list\n"
        "   thumbnail img/ex/<id>.webp. A phone without WebGL2 shows these instead. */\n"
        "var FIGS={\n" + lines + "\n};\nexport {FIGS};\n")
    print(f"{len(frames)} figures, {sum(len(v) for v in frames.values())} frames; {total // 1024} KB written")


# ---- the icons: the mark in each theme's colours, on its ground ----

# ground top, ground bottom, the glow behind the mark, and the mark's light, middle and
# deep (top to bottom), from the theme blocks in index.html
ICONS = {
    "blue": dict(top=(13, 22, 50), bottom=(7, 11, 26), glow=(92, 127, 181),
                 mark=((222, 233, 252), (138, 176, 236), (92, 127, 181))),
    "red": dict(top=(34, 11, 18), bottom=(13, 7, 9), glow=(255, 46, 58),
                mark=((255, 132, 138), (255, 46, 58), (168, 14, 25))),
    # Sage: the reference's ground, deep teal on the left into the lighter slate, and
    # the mark in its white
    "mono": dict(top=(66, 88, 89), bottom=(124, 143, 144), glow=(30, 56, 58), left=(36, 62, 63),
                 mark=((250, 252, 251), (226, 235, 232), (190, 207, 203))),
}


def icon(theme, size, fill=0.654, rounded=False):
    """One icon: the theme's ground, a glow, and the mark filled top to bottom with the
    theme's colours, keeping the drawing's own engraving (its darker strokes)."""
    import numpy as np
    from PIL import ImageFilter
    t, S = ICONS[theme], 1024
    y, x = np.mgrid[0:S, 0:S].astype(np.float32) / S
    top, bot = (np.array(c, np.float32) for c in (t["top"], t["bottom"]))
    rgb = top + (bot - top) * y[..., None]
    if "left" in t:
        d = np.exp(-(((x - 0.0) / 0.62) ** 2 + ((y - 0.32) / 0.5) ** 2) * 1.6)[..., None]
        rgb += (np.array(t["left"], np.float32) - rgb) * d * 0.85
    g = np.exp(-(((x - 0.72) / 0.55) ** 2 + ((y - 0.18) / 0.5) ** 2) * 1.4)[..., None]
    rgb += (np.array(t["glow"], np.float32) - rgb) * g * 0.42
    im = Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8), "RGB").convert("RGBA")
    m = Image.open(os.path.join(ROOT, "mark.png")).convert("RGBA")
    m = m.crop(m.getchannel("A").getbbox())
    k = fill * S / m.height
    m = m.resize((round(m.width * k), round(m.height * k)), Image.LANCZOS)
    ox, oy = (S - m.width) // 2, (S - m.height) // 2
    a = np.asarray(m.getchannel("A"), np.float32) / 255
    shade = np.clip(np.asarray(m.getchannel("R"), np.float32) / 208, 0.72, 1.08)[..., None]
    v = np.linspace(0, 1, m.height, dtype=np.float32)[:, None, None]
    lo, mid, hi = (np.array(c, np.float32) for c in t["mark"])
    col = np.where(v < 0.5, lo + (mid - lo) * (v / 0.5), mid + (hi - mid) * ((v - 0.5) / 0.5))
    col = np.broadcast_to(col, (m.height, m.width, 3)) * shade
    mk = Image.fromarray(np.dstack([np.clip(col, 0, 255), a * 255]).astype(np.uint8), "RGBA")
    glow = Image.new("RGBA", (S, S), t["glow"] + (0,))
    ga = Image.new("L", (S, S), 0)
    ga.paste(m.getchannel("A").point(lambda q: q * 0.55), (ox, oy))
    glow.putalpha(ga.filter(ImageFilter.GaussianBlur(S * 0.03)))
    im = Image.alpha_composite(im, glow)
    im.alpha_composite(mk, (ox, oy))
    if rounded:
        r = Image.new("L", (S, S), 0)
        ImageDraw.Draw(r).rounded_rectangle((0, 0, S - 1, S - 1), radius=round(S * 0.2237), fill=255)
        im.putalpha(r)
    else:
        im = im.convert("RGB")
    return im.resize((size, size), Image.LANCZOS)


def icons(args):
    out = [("icon-180.png", "blue", 180, {}), ("icon-512.png", "blue", 512, {"rounded": True}),
           ("icon-maskable-512.png", "blue", 512, {"fill": 0.5}),
           ("icon-red-180.png", "red", 180, {}), ("icon-mono-180.png", "mono", 180, {})]
    for name, theme, size, kw in out:
        path = os.path.join(ROOT, name)
        icon(theme, size, **kw).save(path, "PNG", optimize=True)
        print(f"{name}: {os.path.getsize(path) // 1024} KB")


if __name__ == "__main__":
    a = sys.argv[1:]
    if not a or a[0] not in ("exercises", "photos", "rendered", "icons"):
        sys.exit(__doc__)
    {"exercises": exercises, "photos": photos, "rendered": rendered, "icons": icons}[a[0]](a)
