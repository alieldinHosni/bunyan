#!/usr/bin/env python3
"""Bunyan — review sheets: the 3D figure beside the library's photographs.

    python3 tools/figures/review.py OUT_DIR [per_sheet]

Reads what tools/figures/review.mjs wrote (OUT_DIR/names.json, <k>-0.png, <k>-1.png)
and the library's photographs of each exercise (free-exercise-db, <id>/0.jpg and
1.jpg, fetched once into ~/.cache/bunyan-src), and writes OUT_DIR/sheet-<n>.jpg: a row
an exercise, the start photo, the figure's start, the end photo, the figure's end.
"""
import json, os, sys, urllib.request
from PIL import Image, ImageDraw

RAW = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/"
CACHE = os.path.expanduser("~/.cache/bunyan-src/free-exercise-db")
H = 240


def photo(i, n):
    p = os.path.join(CACHE, i, f"{n}.jpg")
    if not os.path.exists(p):
        try:
            data = urllib.request.urlopen(RAW + i + f"/{n}.jpg", timeout=30).read()
        except Exception:
            return None
        os.makedirs(os.path.dirname(p), exist_ok=True)
        open(p, "wb").write(data)
    return Image.open(p).convert("RGB")


def fit(im):
    return im.resize((round(im.width * H / im.height), H), Image.LANCZOS)


def main():
    out = sys.argv[1]
    per = int(sys.argv[2]) if len(sys.argv) > 2 else 5
    names = json.load(open(os.path.join(out, "names.json")))
    rows = []
    for e in names:
        cells = []
        for u in (0, 1):
            ph = photo(e["id"], u) if e["id"] else None
            cells.append(fit(ph) if ph else Image.new("RGB", (H * 4 // 3, H), (40, 40, 40)))
            cells.append(fit(Image.open(os.path.join(out, f"{e['k']}-{u}.png")).convert("RGB")))
        w = sum(c.width for c in cells) + 6 * len(cells)
        row = Image.new("RGB", (w, H + 26), (18, 18, 20))
        x = 0
        for c in cells:
            row.paste(c, (x, 26))
            x += c.width + 6
        ImageDraw.Draw(row).text((6, 6), e["name"], fill=(235, 235, 235))
        rows.append(row)
    for n in range(0, len(rows), per):
        chunk = rows[n:n + per]
        sheet = Image.new("RGB", (max(r.width for r in chunk), sum(r.height + 8 for r in chunk)), (10, 10, 12))
        y = 0
        for r in chunk:
            sheet.paste(r, (0, y))
            y += r.height + 8
        sheet.save(os.path.join(out, f"sheet-{n // per}.jpg"), quality=86)
    print(len(rows), "exercises,", (len(rows) + per - 1) // per, "sheets in", out)


main()
