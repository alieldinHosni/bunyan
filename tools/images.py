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

Needs Pillow with WebP (python3 -c "from PIL import features; print(features.check('webp'))").
Existing outputs are kept unless --force; the run says what it made and what it skipped.
"""
import io, json, os, re, sys, urllib.request
from concurrent.futures import ThreadPoolExecutor
from PIL import Image, ImageOps

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


if __name__ == "__main__":
    a = sys.argv[1:]
    if not a or a[0] not in ("exercises", "photos"):
        sys.exit(__doc__)
    {"exercises": exercises, "photos": photos}[a[0]](a)
