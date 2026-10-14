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

  python3 tools/images.py figures SRC_DIR
      The instructional figures rendered by tools/figures/run.mjs (SRC_DIR/<id>-<n>.png,
      1080x810 with a transparent ground, and SRC_DIR/<id>.json, the path the movement
      takes) set on the navy stage with the glow and the arrow, to
      img/fig/<id>-<n>.webp at 720x540, and the first frame, cropped to the figure and
      its shadow and made square, to the list thumbnail img/ex/<id>.webp (156 px).
      Writes js/data/figures.js, the list of which exercises have figures and how many
      frames each. Needs numpy as well.

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


def figures(args):
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
        figs = [Image.open(os.path.join(src, f"{i}-{n}.png")).convert("RGBA").resize((720, 540), Image.LANCZOS)
                for n in sorted(ns)]
        meta = os.path.join(src, i + ".json")
        arrows = place_arrows(json.load(open(meta))["paths"], figs) if os.path.exists(meta) else []
        for n, fig in zip(sorted(ns), figs):
            im = stage(fig, arrows)
            total += webp(im, os.path.join(ROOT, "img/fig", f"{i}-{n}.webp"), 82)
            if n == 0:
                total += webp(thumb_of(im, fig), os.path.join(ROOT, "img/ex", i + ".webp"), 80)
    lines = ",\n".join(f'  "{i}":{len(ns)}' for i, ns in sorted(frames.items()))
    open(os.path.join(ROOT, "js/data/figures.js"), "w", encoding="utf8").write(
        "/* Bunyan — the instructional figures (generated by tools/images.py figures; do not edit)\n"
        "   Exercises the photographed library has no photographs of, drawn as one figure in\n"
        "   one style (tools/figures): exercise id -> frames, 2 for a start and an end, 1 for a\n"
        "   hold. The frames are img/fig/<id>-<n>.webp, the list thumbnail img/ex/<id>.webp. */\n"
        "var FIGS={\n" + lines + "\n};\nexport {FIGS};\n")
    print(f"{len(frames)} figures, {sum(len(v) for v in frames.values())} frames; {total // 1024} KB written")


# ---- the stage: what the figure stands on, and what is drawn over it ----

NAVY_TOP, NAVY_MID, NAVY_EDGE = (9, 17, 30), (15, 27, 46), (5, 10, 19)
GLOW = (32, 104, 196)
ARROW, ARROW_GLOW = (132, 186, 255), (70, 140, 255)


def solid_box(fig, a=128):
    return fig.getchannel("A").point(lambda v: 255 if v > a else 0).getbbox() or (0, 0) + fig.size


def ground(w, h, box):
    """Deep navy, a little lighter behind the figure, and a pool of blue light on the
    floor under it, as a studio lit from below; dark at the edges."""
    import numpy as np
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    top, mid, edge = (np.array(c, np.float32) for c in (NAVY_TOP, NAVY_MID, NAVY_EDGE))
    cx, cy = (box[0] + box[2]) / 2, box[1] + (box[3] - box[1]) * 0.45
    r = ((x - cx) / (w * 0.42)) ** 2 + ((y - cy) / (h * 0.58)) ** 2
    lift = np.exp(-r * 1.3)[..., None]
    rgb = top + (edge - top) * (y / h)[..., None]
    rgb = rgb + (mid - rgb) * lift
    fy = box[3] - (box[3] - box[1]) * 0.015
    rf = ((x - cx) / (max(box[2] - box[0], w * 0.3) * 0.62)) ** 2 + ((y - fy) / (h * 0.055)) ** 2
    pool = np.exp(-rf * 1.6) * 0.55 + np.exp(-rf * 0.35) * 0.12
    rgb += pool[..., None] * np.array(GLOW, np.float32)
    v = ((x - w / 2) / (w * 0.75)) ** 2 + ((y - h / 2) / (h * 0.8)) ** 2
    rgb *= np.clip(1.12 - v * 0.5, 0.45, 1)[..., None]
    return Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8), "RGB").convert("RGBA")


def bloom(im, fig):
    """A soft glow around what is lit: the worked muscles, the blue edges."""
    import numpy as np
    from PIL import ImageFilter
    a = np.asarray(im.convert("RGB"), np.float32) / 255
    m = np.asarray(fig.getchannel("A"), np.float32)[..., None] / 255
    hot = np.clip(a - 0.42, 0, 1) * m * 1.6
    g = Image.fromarray(np.clip(hot * 255, 0, 255).astype(np.uint8), "RGB")
    g1 = np.asarray(g.filter(ImageFilter.GaussianBlur(6)), np.float32) / 255
    g2 = np.asarray(g.filter(ImageFilter.GaussianBlur(18)), np.float32) / 255
    out = 1 - (1 - a) * (1 - np.clip(g1 * 0.55 + g2 * 0.45, 0, 1))
    return Image.fromarray(np.clip(out * 255, 0, 255).astype(np.uint8), "RGB").convert("RGBA")


def place_arrows(paths, figs):
    """Each path (the way a hand, foot or knee travels, in pixels) as an arrow beside
    it: along the middle of the path, pushed out to the side, or set just ahead of where
    the movement ends or behind where it starts, whichever covers the least of the
    figure in either frame. Two sides moving together and seen as one get one arrow."""
    import numpy as np
    mask = np.zeros((figs[0].height, figs[0].width), bool)
    for f in figs:
        mask |= np.asarray(f.getchannel("A")) > 140
    H, W = mask.shape
    ys, xs = np.nonzero(mask)
    cx, cy = (xs.mean(), ys.mean()) if len(xs) else (W / 2, H / 2)
    P = [np.array(p, np.float32) for p in paths]
    if len(P) == 2 and np.hypot(*(P[0] - P[1]).T).mean() < 80:
        P = P[:1]
    out = []
    for p in P:
        seg = np.hypot(*np.diff(p, axis=0).T)
        L = seg.sum()
        if L < 18:
            continue
        s = np.concatenate([[0], np.cumsum(seg)])
        span = min(L * 0.76, 92) if L > 70 else L
        mid = L / 2
        ts = np.linspace(mid - span / 2, mid + span / 2, 24)
        q = np.stack([np.interp(ts, s, p[:, 0]), np.interp(ts, s, p[:, 1])], 1)
        if span < 46:  # too short to read: stretch it about its middle
            c = q.mean(0)
            q = c + (q - c) * (46 / max(span, 1))
        t = np.gradient(q, axis=0)
        t /= np.maximum(np.hypot(t[:, 0], t[:, 1]), 1e-6)[:, None]
        n = np.stack([-t[:, 1], t[:, 0]], 1)
        chord = q[-1] - q[0]
        straight = np.hypot(*chord) / max(span, 1) > 0.85
        cands = [(q + n * d, abs(d) * 0.08) for d in (26, 38, 52, 68, -26, -38, -52, -68)]
        if straight:
            u = chord / max(np.hypot(*chord), 1)
            ahead = (p[-1] - q[0]) @ u + 16
            behind = (q[-1] - p[0]) @ u + 16
            cands += [(q + u * ahead, 1.0), (q - u * behind, 1.4)]
        best = None
        for r, cost in cands:
            inside = (r[:, 0] > 14) & (r[:, 0] < W - 14) & (r[:, 1] > 14) & (r[:, 1] < H - 14)
            ri = np.clip(r.astype(int), 0, [W - 1, H - 1])
            cover = mask[ri[:, 1], ri[:, 0]].sum() + (~inside).sum() * 3
            away = -np.sign(((r.mean(0) - [cx, cy]) * (r.mean(0) - q.mean(0))).sum())
            score = cover * 10 + cost + away * 0.5
            if best is None or score < best[0]:
                best = (score, r)
        out.append(best[1].tolist())
    return out


def draw_arrows(im, arrows):
    from PIL import ImageFilter
    if not arrows:
        return im
    S = 3
    w, h = im.size
    glow = Image.new("RGBA", (w * S, h * S), (0, 0, 0, 0))
    core = Image.new("RGBA", (w * S, h * S), (0, 0, 0, 0))
    for pts in arrows:
        P = [(x * S, y * S) for x, y in pts]
        (x1, y1), (x0, y0) = P[-1], P[-3]
        tx, ty = x1 - x0, y1 - y0
        k = (tx * tx + ty * ty) ** 0.5 or 1
        tx, ty = tx / k, ty / k
        nx, ny = -ty, tx
        body = P[:-1] + [(x1 - tx * 9 * S, y1 - ty * 9 * S)]
        head = [(x1 + tx * 3 * S, y1 + ty * 3 * S), (x1 - tx * 11 * S + nx * 7 * S, y1 - ty * 11 * S + ny * 7 * S),
                (x1 - tx * 11 * S - nx * 7 * S, y1 - ty * 11 * S - ny * 7 * S)]
        for layer, col, wd in ((glow, ARROW_GLOW + (150,), 9), (core, ARROW + (255,), 3.2)):
            d = ImageDraw.Draw(layer)
            d.line(body, fill=col, width=int(wd * S), joint="curve")
            r = wd * S / 2
            d.ellipse((body[0][0] - r, body[0][1] - r, body[0][0] + r, body[0][1] + r), fill=col)
            d.polygon(head, fill=col)
    glow = glow.resize((w, h), Image.LANCZOS).filter(ImageFilter.GaussianBlur(4))
    core = core.resize((w, h), Image.LANCZOS)
    return Image.alpha_composite(Image.alpha_composite(im, glow), core)


def stage(fig, arrows=()):
    im = Image.alpha_composite(ground(fig.width, fig.height, solid_box(fig)), fig)
    return draw_arrows(bloom(im, fig), arrows).convert("RGB")


def thumb_of(im, fig, s=156):
    """The list thumbnail: the figure, square, with a little room around it."""
    b = solid_box(fig, 24)
    side = max(b[2] - b[0], b[3] - b[1]) * 1.12
    cx, cy = (b[0] + b[2]) / 2, (b[1] + b[3]) / 2
    box = [cx - side / 2, cy - side / 2, cx + side / 2, cy + side / 2]
    return im.crop(tuple(round(v) for v in box)).resize((s, s), Image.LANCZOS)


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
    if not a or a[0] not in ("exercises", "photos", "figures", "icons"):
        sys.exit(__doc__)
    {"exercises": exercises, "photos": photos, "figures": figures, "icons": icons}[a[0]](a)
