#!/usr/bin/env python3
"""Bunyan — percentile tables for the three judged lifts, from OpenPowerlifting

A one-off build step, run on a developer machine. It is not part of the app and never
runs in the browser; the app only ships its output, js/coach/powerlifting.js.

Source: the meet results in OpenPowerlifting's opl-data repository
(https://gitlab.com/openpowerlifting/opl-data, the meet-data/ folder). The data is
public domain (opl-data's LICENSE-DATA). Their code is AGPL-3 and none of it is used
here: this reads the published CSV files directly. The source is about 1 GB and is
never committed (.gitignore keeps tools/opl-source/ out).

Fetching only what is needed, about 1 GB:

    git clone --depth 1 --filter=blob:none --sparse \\
        https://gitlab.com/openpowerlifting/opl-data.git tools/opl-source
    cd tools/opl-source
    git sparse-checkout set --no-cone '/meet-data/**/entries.csv' '/meet-data/**/meet.csv'
    cd ../..
    python3 tools/opl-percentiles.py tools/opl-source

What it keeps, and why:

  * Raw only (bare knees or knee sleeves). Wraps and supportive suits add weight a
    gym lifter does not have.
  * Squat, bench press and deadlift only: the judged lifts. Nothing else has data.
  * Adults: an entry whose age, birth date, birth year or division says under 18 is
    left out, so a teenager's first meet does not drag the scale down.
  * One number per lifter: each lifter's best for the lift within a sex and weight
    class, the way OpenPowerlifting's own rankings count. A lifter is their name and
    sex as the data writes it (the project already numbers lifters who share a name).
  * Weight classes are the IPF's, by the bodyweight at weigh-in. Entries with no
    bodyweight are left out rather than guessed from another federation's class.
  * Disqualified entries (DQ, DD) and no-shows (NS) are left out.

What it writes: for each sex, class and lift, the number of lifters and the 10th to
90th percentiles (deciles), to the nearest 0.5 kg. A few kilobytes in all.
"""
import csv
import datetime
import json
import os
import re
import subprocess
import sys

LB = 0.45359237
CLASSES = {"M": [59, 66, 74, 83, 93, 105, 120], "F": [47, 52, 57, 63, 69, 76, 84]}
LIFTS = (("squat", "Squat", "S"), ("bench", "Bench", "B"), ("deadlift", "Deadlift", "D"))
# Anything outside these is a typo in the source, not a lift.
SANE = {"squat": (20, 520), "bench": (15, 370), "deadlift": (20, 480)}
RAW = {"Raw", "Sleeves", "Bare"}
YOUTH = re.compile(r"teen|youth|sub.?jun|high ?school|school ?(boy|girl)|kids?\b|child|cadet|u1[0-7]\b|under ?1[0-7]", re.I)
PCTS = list(range(10, 100, 10))
MIN_LIFTERS = 30


def num(s):
    try:
        v = float(s)
    except (TypeError, ValueError):
        return None
    return v if v == v else None


def kg(row, name):
    """A Kg column, or its Lbs twin converted."""
    v = num(row.get(name + "Kg"))
    if v is None:
        v = num(row.get(name + "Lbs"))
        if v is not None:
            v *= LB
    return v


def age_of(row, meet_date):
    a = num(row.get("Age"))
    if a is not None:
        return a
    bd = row.get("BirthDate") or ""
    if meet_date and re.match(r"\d{4}-\d{2}-\d{2}$", bd):
        try:
            b = datetime.date.fromisoformat(bd)
            return (meet_date - b).days / 365.25
        except ValueError:
            pass
    by = num(row.get("BirthYear"))
    if by and meet_date:
        return meet_date.year - by - 0.5
    rng = re.match(r"(\d+)-(\d+)$", row.get("AgeRange") or "")
    if rng:
        return float(rng.group(2))
    return None


def class_of(sex, bw):
    for i, top in enumerate(CLASSES[sex]):
        if bw <= top:
            return i
    return len(CLASSES[sex])


def quantile(sorted_vals, p):
    """Linear interpolation between closest ranks."""
    if not sorted_vals:
        return None
    pos = (len(sorted_vals) - 1) * p / 100.0
    lo = int(pos)
    hi = min(lo + 1, len(sorted_vals) - 1)
    return sorted_vals[lo] + (sorted_vals[hi] - sorted_vals[lo]) * (pos - lo)


def meet_date_of(folder):
    try:
        with open(os.path.join(folder, "meet.csv"), newline="", encoding="utf-8") as fh:
            rows = list(csv.DictReader(fh))
        return datetime.date.fromisoformat(rows[0]["Date"]) if rows else None
    except (OSError, ValueError, KeyError):
        return None


def main(src):
    meets = os.path.join(src, "meet-data")
    if not os.path.isdir(meets):
        sys.exit("No meet-data folder under " + src)
    best = {}  # (sex, class, lift, lifter) -> kg
    seen = {"files": 0, "rows": 0, "raw": 0, "adult": 0, "kept": 0}
    for folder, _dirs, files in os.walk(meets):
        if "entries.csv" not in files:
            continue
        seen["files"] += 1
        when = meet_date_of(folder)
        with open(os.path.join(folder, "entries.csv"), newline="", encoding="utf-8") as fh:
            for row in csv.DictReader(fh):
                seen["rows"] += 1
                sex = row.get("Sex")
                if sex not in CLASSES or row.get("Equipment") not in RAW:
                    continue
                if (row.get("Place") or "").strip() in ("DQ", "DD", "NS"):
                    continue
                seen["raw"] += 1
                age = age_of(row, when)
                if (age is not None and age < 18) or YOUTH.search(row.get("Division") or ""):
                    continue
                seen["adult"] += 1
                bw = kg(row, "Bodyweight")
                if bw is None or not 30 <= bw <= 250:
                    continue
                cls = class_of(sex, bw)
                event = row.get("Event") or ""
                who = (row.get("Name") or "").strip()
                if not who:
                    continue
                for lift, col, letter in LIFTS:
                    if letter not in event:
                        continue
                    v = kg(row, "Best3" + col)
                    lo, hi = SANE[lift]
                    if v is None or not lo <= v <= hi:
                        continue
                    k = (sex, cls, lift, who)
                    if v > best.get(k, 0):
                        best[k] = v
                        seen["kept"] += 1
    buckets = {}
    for (sex, cls, lift, _who), v in best.items():
        buckets.setdefault((sex, cls, lift), []).append(v)
    table = {}
    lifters = 0
    for sex in ("M", "F"):
        for lift, _col, _l in LIFTS:
            rows = []
            for cls in range(len(CLASSES[sex]) + 1):
                vals = sorted(buckets.get((sex, cls, lift), []))
                lifters += len(vals)
                if len(vals) < MIN_LIFTERS:
                    rows.append([len(vals)])
                    continue
                rows.append([len(vals)] + [round(quantile(vals, p) * 2) / 2 for p in PCTS])
            table.setdefault(sex.lower(), {})[lift] = rows
    return table, seen, lifters


def source_rev(src):
    try:
        out = subprocess.run(["git", "-C", src, "log", "-1", "--format=%h %cs"], capture_output=True, text=True, check=True)
        return out.stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        return "unknown"


def write_js(path, table, rev, lifters):
    def js(v):
        if isinstance(v, float) and v.is_integer():
            v = int(v)
        return str(v)

    lines = []
    for sex in ("m", "f"):
        lines.append("    " + sex + ":{")
        for lift, _c, _l in LIFTS:
            rows = ",".join("[" + ",".join(js(x) for x in r) + "]" for r in table[sex][lift])
            lines.append("      " + lift + ":[" + rows + "],")
        lines[-1] = lines[-1].rstrip(",")
        lines.append("    },")
    lines[-1] = lines[-1].rstrip(",")
    body = "\n".join(lines)
    text = f"""/* Bunyan — where a lift sits among raw powerlifting competitors
   GENERATED by tools/opl-percentiles.py — do not edit by hand; run the script again.

   From OpenPowerlifting meet results (opl-data {rev}), public domain:
   https://www.openpowerlifting.org · https://gitlab.com/openpowerlifting/opl-data

   Carried with the numbers, not added by a screen later:
     POPULATION  these are competitors, people who train for these lifts and enter
                 meets, not gym-goers. The 40th percentile here is strong by any
                 ordinary standard.
     LIFTS       squat, bench press and deadlift only, the judged lifts. There is no
                 data for anything else, and no table is made up for it.
     EQUIPMENT   raw only: bare knees or knee sleeves.

   T[sex][lift][class] = [lifters, p10, p20 … p90] in kg. A class with too few lifters
   has only its count. Classes are the IPF's, by bodyweight (the last is "over"). */
var OPL={{
  source:"OpenPowerlifting",rev:"{rev}",lifters:{lifters},
  population:"raw-competitors",equipment:"raw",
  lifts:["squat","bench","deadlift"],
  classes:{{m:{json.dumps(CLASSES['M'],separators=(",",":"))},f:{json.dumps(CLASSES['F'],separators=(",",":"))}}},
  pcts:{json.dumps(PCTS,separators=(",",":"))},
  T:{{
{body}
  }}
}};

export {{OPL}};
"""
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(text)


if __name__ == "__main__":
    src = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), "opl-source")
    out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(__file__), "..", "js", "coach", "powerlifting.js")
    table, seen, lifters = main(src)
    write_js(out, table, source_rev(src), lifters)
    print("meets", seen["files"], "entries", seen["rows"], "raw", seen["raw"], "adult raw", seen["adult"])
    print("lifter-lift results", lifters, "→", os.path.relpath(out), os.path.getsize(out), "bytes")
