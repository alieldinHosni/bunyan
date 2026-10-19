"""Bunyan — the 3D figure's body, baked from MakeHuman's CC0 assets.

    python3 tools/body/bake.py PATH/TO/makehuman/makehuman/data img/fig/body.bin js/data/mannequin/body.js

(the MakeHuman repository: github.com/makehumancommunity/makehuman). Reads the base
mesh (hm08), its body-shape targets, the default skeleton and its skin weights (all CC0,
see CREDITS.md), and writes:

    body.bin   the mesh: positions, triangles, skin (4 bones a vertex), the part of the
               outfit each vertex is (skin, shorts, shoes, eyes), the muscle each vertex
               belongs to and how deeply, and how hollow it sits
    body.js    the skeleton (names, parents, rest heads and tails) and the layout of
               body.bin

The body is an athletic adult man: MakeHuman's macro sliders at male, 25 years, muscle
0.78, weight 0.52, height 0.55, ideal proportions, the three ethnic blends equal. The
face's bones, the toes and the breasts are folded into their parents, leaving 74 bones
the figure is posed with. Units are metres. MakeHuman's figure faces +z with its left at
+x; the files are written in the app's frame, facing +x with its left at +z, y up.

Nothing here runs in the app; the app only loads the two files.
"""
import json, os, sys, struct
import numpy as np

DATA = sys.argv[1]

def smooth01(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


# ---- the base mesh ---------------------------------------------------------------
verts = []
faces = {}          # group -> list of index tuples
grp = None
for line in open(os.path.join(DATA, "3dobjs/base.obj")):
    if line.startswith("v "):
        verts.append([float(t) for t in line.split()[1:4]])
    elif line.startswith("g "):
        grp = line.split()[1]
    elif line.startswith("f "):
        faces.setdefault(grp, []).append([int(t.split("/")[0]) - 1 for t in line.split()[1:]])
V = np.array(verts, dtype=np.float64)

# ---- the body's shape: MakeHuman's macro targets, weighted as human.py weighs them ----
def target(rel):
    p = os.path.join(DATA, "targets", rel)
    rows = [l.split() for l in open(p) if l.strip() and not l.startswith("#")]
    if not rows:  # the neutral targets are empty: no offsets
        return np.zeros(0, dtype=int), np.zeros((0, 3))
    a = np.array(rows, dtype=np.float64)
    return a[:, 0].astype(int), a[:, 1:4]

gender, age, muscle, weight, height, prop = 1.0, 0.5, 0.78, 0.52, 0.55, 1.0
G = {"male": gender, "female": 1 - gender}
A = {"young": 1.0}  # age 0.5 is exactly "young"
Mu = {"maxmuscle": max(0, muscle * 2 - 1), "minmuscle": max(0, 1 - muscle * 2)}
Mu["averagemuscle"] = 1 - Mu["maxmuscle"] - Mu["minmuscle"]
We = {"maxweight": max(0, weight * 2 - 1), "minweight": max(0, 1 - weight * 2)}
We["averageweight"] = 1 - We["maxweight"] - We["minweight"]
He = {"maxheight": max(0, height * 2 - 1), "minheight": max(0, 1 - height * 2)}
Pr = {"idealproportions": max(0, prop * 2 - 1), "uncommonproportions": max(0, 1 - prop * 2)}
Race = {"african": 1 / 3, "asian": 1 / 3, "caucasian": 1 / 3}

D = np.zeros_like(V)
def apply(rel, w):
    if w <= 1e-6:
        return
    idx, d = target(rel)
    np.add.at(D, idx, d * w)

for g, gw in G.items():
    for a, aw in A.items():
        for r, rw in Race.items():
            apply("macrodetails/%s-%s-%s.target" % (r, g, a), gw * aw * rw)
        for m, mw in Mu.items():
            for w_, ww in We.items():
                base = gw * aw * mw * ww
                apply("macrodetails/universal-%s-%s-%s-%s.target" % (g, a, m, w_), base)
                for h, hw in He.items():
                    apply("macrodetails/height/%s-%s-%s-%s-%s.target" % (g, a, m, w_, h), base * hw)
                for p, pw in Pr.items():
                    apply("macrodetails/proportions/%s-%s-%s-%s-%s.target" % (g, a, m, w_, p), base * pw)
# a little more of the athlete's V: broader back, a defined chest
apply("torso/torso-vshape-incr.target", 0.35)
apply("torso/torso-muscle-dorsi-incr.target", 0.3)
apply("torso/torso-muscle-pectoral-incr.target", 0.25)
V = V + D

# ---- the skeleton --------------------------------------------------------------------
sk = json.load(open(os.path.join(DATA, "rigs/default.mhskel")))
W = json.load(open(os.path.join(DATA, "rigs/default_weights.mhw")))["weights"]
J = {n: V[ix].mean(axis=0) for n, ix in sk["joints"].items()}
bones_all = sk["bones"]

KEEP = ["root", "spine05", "spine04", "spine03", "spine02", "spine01", "neck01", "neck02", "neck03", "head"]
for s in ("L", "R"):
    KEEP += [b + "." + s for b in ("clavicle", "shoulder01", "upperarm01", "upperarm02", "lowerarm01", "lowerarm02", "wrist",
                                    "metacarpal1", "metacarpal2", "metacarpal3", "metacarpal4")]
    KEEP += ["finger%d-%d.%s" % (f, k, s) for f in range(1, 6) for k in range(1, 4)]
    KEEP += [b + "." + s for b in ("pelvis", "upperleg01", "upperleg02", "lowerleg01", "lowerleg02", "foot")]
keep = set(KEEP)
def kept(b):
    """the bone a folded-away bone's weights go to: its nearest kept ancestor"""
    while b not in keep:
        b = bones_all[b]["parent"]
    return b

# skin weights, folded onto the kept bones
nV = len(V)
acc = [dict() for _ in range(nV)]
for b, lst in W.items():
    kb = kept(b)
    for vi, wt in lst:
        acc[vi][kb] = acc[vi].get(kb, 0) + wt

# ---- which faces are drawn ---------------------------------------------------------
body_f = faces["body"]
eye_f = faces["helper-l-eye"] + faces["helper-r-eye"]

def tri(fs):
    out = []
    for f in fs:
        if len(f) == 4:
            out += [[f[0], f[1], f[2]], [f[0], f[2], f[3]]]
        elif len(f) == 3:
            out.append(f)
    return out

TRI = tri(body_f) + tri(eye_f)
used = sorted(set(i for t in TRI for i in t))
remap = {o: n for n, o in enumerate(used)}
T = np.array([[remap[i] for i in t] for t in TRI], dtype=np.uint32)
P = V[used] * 0.1  # decimetres to metres
body_set = set(i for f in body_f for i in f)
eye_set = set(i for f in eye_f for i in f)

# ---- normals (rest) ------------------------------------------------------------------
def normals(P, T):
    n = np.zeros_like(P)
    fn = np.cross(P[T[:, 1]] - P[T[:, 0]], P[T[:, 2]] - P[T[:, 0]])
    for k in range(3):
        np.add.at(n, T[:, k], fn)
    return n / np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-12)
N = normals(P, T)

Jm = {k: v * 0.1 for k, v in J.items()}
def jh(b):
    return Jm[bones_all[b]["head"]]
def jt(b):
    return Jm[bones_all[b]["tail"]]

# ---- the outfit ------------------------------------------------------------------------
# Shorts and trainers are drawn on the body by the shader, from how far each vertex is
# inside them (metres, positive inside, kept to +-6 cm): the line where that crosses 0
# is drawn smooth and sharp whatever the triangles under it. Shorts: below a waistband a
# little under the navel (lower in front) and above a cut a third of the way down each
# thigh, square to it. The trainers are shoes of their own, built round the feet at the
# end (the foot inside them is not drawn).
y_hip0 = jh("upperleg01.L")[1]
z_hip0 = jh("upperleg01.L")[2]
def dist_shorts(n, o):
    w = acc[o]
    p = P[n]
    s = "L" if p[0] > 0 else "R"
    arm = sum(v for b, v in w.items() if b.startswith(("upperarm", "lowerarm", "wrist", "finger", "metacarpal", "shoulder")))
    core = sum(w.get(b, 0) for b in ("root", "pelvis.L", "pelvis.R", "spine05", "spine04", "upperleg01.L", "upperleg01.R",
                                     "upperleg02.L", "upperleg02.R", "spine03"))
    if arm > 0.2 or core < 0.5:
        return -1.0
    front = float(smooth01(z_hip0 - 0.02, z_hip0 + 0.06, p[2]))
    waist = y_hip0 + 0.1 - 0.035 * front
    d_w = waist - p[1]
    h, k = jh("upperleg01." + s), jh("lowerleg01." + s)
    ax = (k - h) / np.linalg.norm(k - h)
    cut = h + (k - h) * 0.36
    d_l = float(np.dot(cut - p, ax))
    return min(d_w, d_l)
foot_floor0 = P[:, 1].min()
def dist_shoe(n, o):
    w = acc[o]
    p = P[n]
    s = "L" if p[0] > 0 else "R"
    if w.get("foot." + s, 0) + w.get("lowerleg02." + s, 0) + w.get("lowerleg01." + s, 0) < 0.4:
        return -1.0
    return (jh("foot." + s)[1] + 0.045) - p[1]
SH = np.full(len(P), -1.0)
SO = np.full(len(P), -1.0)
eye = np.zeros(len(P), dtype=bool)
for n, o in enumerate(used):
    if o in eye_set:
        eye[n] = True
        continue
    SH[n] = dist_shorts(n, o)
    SO[n] = dist_shoe(n, o)
SL = np.full(len(P), -1.0)
def enc(d):
    return np.clip(np.round(128 + d * 2000), 0, 255).astype(np.uint8)
MISC_SH, MISC_SO, MISC_SL = enc(SH), enc(SO), enc(SL)

# ---- skin, 4 bones a vertex -----------------------------------------------------------
BI = np.zeros((len(P), 4), dtype=np.uint8)
BW = np.zeros((len(P), 4), dtype=np.uint8)
bindex = {b: i for i, b in enumerate(KEEP)}
for n, o in enumerate(used):
    items = sorted(acc[o].items(), key=lambda kv: -kv[1])[:4]
    tot = sum(w for _, w in items) or 1
    ws = [w / tot for _, w in items]
    q = [int(round(w * 255)) for w in ws]
    q[0] += 255 - sum(q)
    for k, (b, _) in enumerate(items):
        BI[n, k] = bindex[b]
        BW[n, k] = q[k]

# ---- muscles ---------------------------------------------------------------------------
# Each muscle is a field over the skin: 1 in the muscle, falling to 0 outside it. They
# are found from the rest pose: the bone the vertex follows, and where it sits around
# that bone (front, back, inside, outside) and along it. The fields are then eased along
# the mesh, so a region's outline is a smooth curve, not the triangles' steps, and each
# vertex keeps the two muscles it is most in, with how much: where two muscles meet the
# glow passes from one to the other, and where a lit one meets an unlit one it fades.
MUS = ["chest", "frontdelt", "sidedelt", "reardelt", "lats", "traps", "lowerback", "biceps", "triceps", "forearms",
       "rf", "quads", "hams", "glutes", "gmed", "calves", "abs", "obliques", "adductors", "neck"]
mid = {m: i + 1 for i, m in enumerate(MUS)}
C = np.zeros((len(P), len(MUS)))


def dom(o):
    w = acc[o]
    return max(w.items(), key=lambda kv: kv[1])[0] if w else ""

def sumw(o, names):
    return sum(acc[o].get(b, 0) for b in names)

neck_y = jh("neck01")[1]
clav_y = max(jh("clavicle.L")[1], jh("clavicle.R")[1])
sh = {s: jh("upperarm01." + s) for s in "LR"}
el = {s: jh("lowerarm01." + s) for s in "LR"}
wr = {s: jh("wrist." + s) for s in "LR"}
hip = {s: jh("upperleg01." + s) for s in "LR"}
kn = {s: jh("lowerleg01." + s) for s in "LR"}
an = {s: jh("foot." + s) for s in "LR"}
root_h = jh("root")
sp = {k: jh(k) for k in ("spine05", "spine04", "spine03", "spine02", "spine01")}
z_mid_torso = (sp["spine03"][2] + sp["spine02"][2]) / 2
skin_ix = [n for n, o in enumerate(used) if o in body_set]

def around(p, a, b, fwd):
    """where p sits round the segment a→b: the fraction along it, and the angle from the
    front (fwd projected off the axis), in degrees, + towards the body's outside"""
    ax = b - a
    L = np.linalg.norm(ax)
    u = ax / L
    t = np.dot(p - a, u) / L
    r = p - a - u * np.dot(p - a, u)
    f = fwd - u * np.dot(fwd, u)
    f /= np.linalg.norm(f)
    side = np.cross(u, f)
    ang = np.degrees(np.arctan2(np.dot(r, side), np.dot(r, f)))
    return t, ang, np.linalg.norm(r)

FWD = np.array([0, 0, 1.0])
# Landmarks of this body (bake frame: x its left, y up, z forward), and the trunk's height
# from hip to neck, which the trunk's muscles are drawn in proportion to.
y_hip = hip["L"][1]
y_neck = neck_y
Ht = y_neck - y_hip
x_sh = abs(sh["L"][0])
y_sh = sh["L"][1]

def soft_poly(x, y, poly, soft=0.012):
    """how far inside the polygon (x, y) is, eased over soft metres: 1 well inside, 0
    outside"""
    inside = False
    dmin = 1e9
    n = len(poly)
    for i in range(n):
        x1, y1 = poly[i]
        x2, y2 = poly[(i + 1) % n]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1 + 1e-12) + x1:
            inside = not inside
        dx, dy = x2 - x1, y2 - y1
        t = max(0, min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy + 1e-12)))
        dmin = min(dmin, np.hypot(x - (x1 + t * dx), y - (y1 + t * dy)))
    sd = dmin if inside else -dmin
    return float(smooth01(-soft * 0.3, soft, sd))

def ty(f):
    """a height up the trunk: 0 at the hips, 1 at the base of the neck"""
    return y_hip + f * Ht

# The trunk's muscles, as outlines on its front and back (x from the midline, y up).
PEC = [(0.012, ty(0.5)), (0.06, ty(0.475)), (0.11, ty(0.5)), (0.15, ty(0.58)), (x_sh * 0.82, ty(0.69)),
       (x_sh * 0.8, ty(0.78)), (0.12, ty(0.85)), (0.05, ty(0.88)), (0.012, ty(0.86))]
ABS = [(0.0, ty(-0.1)), (0.045, ty(-0.08)), (0.06, ty(0.12)), (0.07, ty(0.3)), (0.072, ty(0.48)), (0.0, ty(0.5))]
OBL = [(0.065, ty(0.1)), (0.13, ty(0.16)), (0.16, ty(0.3)), (0.155, ty(0.46)), (0.1, ty(0.5)), (0.07, ty(0.46))]
TRAP = [(0.0, ty(0.3)), (0.05, ty(0.42)), (0.1, ty(0.58)), (x_sh * 0.92, ty(0.86)), (0.13, ty(0.93)), (0.07, ty(0.97)),
        (0.04, ty(1.08)), (0.0, ty(1.1))]
LAT = [(0.05, ty(0.18)), (0.1, ty(0.2)), (0.15, ty(0.32)), (0.175, ty(0.5)), (x_sh * 0.82, ty(0.66)), (0.15, ty(0.7)),
       (0.11, ty(0.58)), (0.065, ty(0.42)), (0.05, ty(0.3))]
LOW = [(0.0, ty(-0.06)), (0.06, ty(-0.06)), (0.065, ty(0.2)), (0.055, ty(0.36)), (0.0, ty(0.38))]

def spindle(t, a, b):
    """a muscle's belly along a limb: nothing before a or after b, fullest between"""
    u = np.clip((t - a) / (b - a), 0, 1)
    return float(np.sin(np.pi * u) ** 0.6)

def band(ang, c, half, soft=18):
    """how far within half degrees of c an angle is"""
    d = abs((ang - c + 180) % 360 - 180)
    return float(smooth01(half + soft * 0.5, half - soft * 0.5, d))

for n in skin_ix:
    o = used[n]
    p = P[n]
    nz = N[n][2]
    s = "L" if p[0] > 0 else "R"
    sg = 1 if s == "L" else -1
    w = acc[o]
    arm_up = sumw(o, ["upperarm01." + s, "upperarm02." + s])
    shoulder = sumw(o, ["shoulder01." + s])
    arm_lo = sumw(o, ["lowerarm01." + s, "lowerarm02." + s, "wrist." + s])
    leg_up = sumw(o, ["upperleg01." + s, "upperleg02." + s])
    leg_lo = sumw(o, ["lowerleg01." + s, "lowerleg02." + s])
    pel = sumw(o, ["pelvis." + s, "root"])
    torso = sumw(o, ["spine01", "spine02", "spine03", "spine04", "spine05", "clavicle." + s])
    neck = sumw(o, ["neck01", "neck02", "neck03"])
    fing = sum(v for b, v in w.items() if b.startswith(("finger", "metacarpal")))
    cand = {}
    if fing > 0.5:
        continue
    ax = abs(p[0])
    if arm_lo > 0.5:
        t, ang, _ = around(p, el[s], wr[s], FWD)
        cand["forearms"] = spindle(t, -0.05, 0.8)
    elif arm_up + shoulder > 0.45 and ax > x_sh * 0.8:
        # the upper arm: where a point sits round it, by the world's directions (the
        # rest pose's forearm runs too nearly in line with it to say where its front
        # is): the front (forward), the outside (away from the body and up, where the
        # side of the deltoid faces) and the back
        a0, a1 = sh[s], el[s]
        u = (a1 - a0) / np.linalg.norm(a1 - a0)
        t = float(np.dot(p - a0, u) / np.linalg.norm(a1 - a0))
        r = p - a0 - u * np.dot(p - a0, u)
        r = r / (np.linalg.norm(r) + 1e-9)
        def ref(v):
            v = np.asarray(v, dtype=float)
            v = v - u * np.dot(v, u)
            return v / (np.linalg.norm(v) + 1e-9)
        def deg(v):
            return float(np.degrees(np.arccos(np.clip(np.dot(r, ref(v)), -1, 1))))
        front, outside, back = deg(FWD), deg([sg * 0.6, 1.0, 0.0]), deg(-FWD)
        cap = float(smooth01(0.52, 0.3, t))
        if cap > 0:
            cand["frontdelt"] = cap * float(smooth01(62, 38, front))
            cand["sidedelt"] = cap * float(smooth01(66, 40, outside))
            cand["reardelt"] = cap * float(smooth01(62, 38, back))
        cand["biceps"] = spindle(t, 0.28, 0.98) * float(smooth01(66, 44, front))
        cand["triceps"] = spindle(t, 0.2, 1.02) * float(smooth01(80, 56, back))
    elif leg_lo > 0.5:
        t, ang, _ = around(p, kn[s], an[s], FWD)
        cand["calves"] = spindle(t, -0.02, 0.72) * band(ang, 180, 80)
    elif leg_up > 0.45:
        t, ang, _ = around(p, hip[s], kn[s], FWD)
        a = ang * sg  # positive toward the outside of the leg
        cand["rf"] = spindle(t, 0.06, 0.88) * band(a, 0, 22)
        cand["quads"] = max(spindle(t, 0.12, 1.0) * band(a, 62, 36), spindle(t, 0.45, 1.02) * band(a, -40, 22))
        cand["adductors"] = spindle(t, -0.25, 0.78) * band(a, -105, 38)
        cand["hams"] = spindle(t, 0.05, 0.98) * band(a, 165, 52)
        if t < 0.1 and nz < -0.2:
            cand["glutes"] = float(smooth01(0.1, -0.05, t))
    elif neck > 0.5 and w.get("head", 0) < 0.3:
        cand["neck"] = 0.75 * float(smooth01(y_neck - 0.02, y_neck + 0.03, p[1]))
    elif torso + pel > 0.4:
        # the front, the back and the sides, blended by the way the skin faces, so no
        # muscle stops where the surface turns
        front, back = float(smooth01(0.02, 0.22, nz)), float(smooth01(-0.02, -0.22, nz))
        side = max(0.0, 1 - front - back)
        if front:
            cand["chest"] = front * soft_poly(ax, p[1], PEC)
            cand["abs"] = front * soft_poly(ax, p[1], ABS, 0.01)
            cand["obliques"] = front * soft_poly(ax, p[1], OBL)
        if back:
            cand["traps"] = back * soft_poly(ax, p[1], TRAP)
            cand["lats"] = back * soft_poly(ax, p[1], LAT)
            cand["lowerback"] = back * soft_poly(ax, p[1], LOW, 0.01)
            # the glutes: round, behind the hips; the glute medius above and outside them
            gx, gy = (ax - 0.08) / 0.085, (p[1] - (y_hip - 0.03)) / 0.12
            cand["glutes"] = back * float(smooth01(1.0, 0.7, np.hypot(gx, gy)))
        if side:
            cand["obliques"] = max(cand.get("obliques", 0), side * soft_poly(ax, p[1], [(0.0, ty(0.12)), (0.3, ty(0.12)), (0.3, ty(0.46)), (0.0, ty(0.46))]))
            cand["lats"] = max(cand.get("lats", 0), side * soft_poly(ax, p[1], [(0.0, ty(0.5)), (0.3, ty(0.5)), (0.3, ty(0.68)), (0.0, ty(0.68))]))
        mx, my = (ax - 0.14) / 0.05, (p[1] - (y_hip + 0.075)) / 0.05
        if nz < 0.3:
            cand["gmed"] = float(smooth01(1.0, 0.6, np.hypot(mx, my)))
    for k, v in cand.items():
        C[n, mid[k] - 1] = v

# the fields eased along the mesh: each pass, every vertex half itself and half the mean
# of its neighbours (about 2 cm of softening in all), kept to the skin that has muscles
nbr = [set() for _ in range(len(P))]
for a, b, c in T:
    nbr[a].update((b, c)); nbr[b].update((a, c)); nbr[c].update((a, b))
E = np.concatenate([T[:, [0, 1]], T[:, [1, 2]], T[:, [2, 0]]])
E = np.unique(np.concatenate([E, E[:, ::-1]]), axis=0)
deg = np.maximum(np.bincount(E[:, 0], minlength=len(P)), 1)[:, None]
can = np.zeros(len(P), dtype=bool)
can[skin_ix] = True
can[eye] = False
for _ in range(8):
    S_ = np.zeros_like(C)
    np.add.at(S_, E[:, 0], C[E[:, 1]])
    C = (0.5 * C + 0.5 * S_ / deg) * can[:, None]
order = np.argsort(-C, axis=1)
MA, MB = order[:, 0], order[:, 1]
WA, WB = C[np.arange(len(P)), MA], C[np.arange(len(P)), MB]
MI = np.where(WA > 0.02, MA + 1, 0).astype(np.uint8)
MI2 = np.where(WB > 0.02, MB + 1, 0).astype(np.uint8)
MWq = np.clip(np.round(WA * 255), 0, 255).astype(np.uint8)
MW2q = np.clip(np.round(WB * 255), 0, 255).astype(np.uint8)
MI[eye] = 31  # the eyes: not a muscle; the shader colours them
MWq[eye] = 255
MI2[eye] = 0
MW2q[eye] = 0

# ---- hollows: how far each vertex sits below its neighbours, for soft shading in the
# creases (the armpit, between the legs, the lines between muscles) -------------------
cav = np.zeros(len(P))
for n in range(len(P)):
    ks = list(nbr[n])
    if ks:
        c = P[ks].mean(axis=0) - P[n]
        cav[n] = np.dot(c, N[n])
cav = np.clip(cav / (np.percentile(np.abs(cav), 98) + 1e-9), -1, 1)
CAVq = np.round((cav * 0.5 + 0.5) * 255).astype(np.uint8)

# ---- the trainers ----------------------------------------------------------------------
# A trainer round each foot, carried by the foot's bone: a sole the length of the foot and
# a little over, wide at the ball and narrow at the heel, a collar that rises round the
# ankle and a toe box that falls to the front. Its cross-sections are rounded boxes (flat
# underneath, domed on top); its lowest 2.2 cm is the sole, drawn in its own colour. The
# foot inside is not drawn, so nothing pokes through.
WPROF = [(0, .056), (.1, .074), (.3, .08), (.55, .09), (.72, .104), (.85, .1), (.95, .078), (1, .04)]
HPROF = [(0, .085), (.08, .118), (.3, .128), (.45, .108), (.6, .082), (.75, .064), (.9, .052), (1, .034)]
def prof(tab, u):
    for (u0, a), (u1, b) in zip(tab, tab[1:]):
        if u <= u1:
            return a + (b - a) * (u - u0) / (u1 - u0)
    return tab[-1][1]
shoe_v, shoe_t, shoe_bone, shoe_sole = [], [], [], []
inside_shoe = np.zeros(len(P), dtype=bool)
for s_ in "LR":
    fb = KEEP.index("foot." + s_)
    fv = np.array([n for n, o in enumerate(used) if o in body_set and acc[o].get("foot." + s_, 0) > 0.5])
    pts = P[fv]
    floor = pts[:, 1].min()
    c0 = pts[:, [0, 2]].mean(axis=0)
    cov = np.cov((pts[:, [0, 2]] - c0).T)
    ev, evec = np.linalg.eigh(cov)
    d2 = evec[:, np.argmax(ev)]
    if d2[1] < 0:
        d2 = -d2
    d = np.array([d2[0], 0, d2[1]])
    l = np.cross([0, 1, 0], d)
    proj = (pts[:, [0, 2]] - c0) @ d2
    heel, toe = proj.min() - 0.012, proj.max() + 0.016
    L = toe - heel
    # the leg goes into the collar: the body's faces wholly inside the trainer are dropped
    for n in range(len(P)):
        q = P[n]
        if abs(q[0]) < 0.02 or (q[0] > 0) != (s_ == "L"):
            continue
        u = (np.dot(q[[0, 2]] - c0, d2) - heel) / L
        lat = np.dot(q - np.array([c0[0], 0, c0[1]]), l)
        if 0 <= u <= 1 and q[1] < floor + prof(HPROF, u) - 0.012 and abs(lat) < prof(WPROF, u) * .5:
            inside_shoe[n] = True
    NU, NS = 40, 28
    base = len(P) + len(shoe_v)
    for i in range(NU + 1):
        u = i / NU
        uu = 0.5 - 0.5 * np.cos(np.pi * u)  # more sections at the ends, where it curves
        w = prof(WPROF, uu) * 1.06 / 2
        h = prof(HPROF, uu)
        # the ends rounded off: the sections shrink into the heel and the toe
        k = min(1.0, np.sqrt(max(0.0, 1 - ((0.06 - min(uu, 0.06)) / 0.06) ** 2)) + 0.25,
                np.sqrt(max(0.0, 1 - ((max(uu, 0.92) - 0.92) / 0.08) ** 2)) + 0.12)
        ctr = np.array([c0[0], floor, c0[1]]) + d * (heel + L * uu)
        for j in range(NS):
            th = 2 * np.pi * j / NS
            cs, sn = np.cos(th), np.sin(th)
            e = 2 / 4.0 if sn < 0 else 2 / 2.4
            x = w * k * np.sign(cs) * abs(cs) ** e
            y = h / 2 + h / 2 * np.sign(sn) * abs(sn) ** e
            if sn < 0:
                y = h / 2 - (h / 2) * abs(sn) ** (2 / 4.0)
            y = y * (0.55 + 0.45 * k) if sn > 0 else y
            v = ctr + l * x + np.array([0, max(y, 0.0), 0])
            shoe_v.append(v)
            shoe_bone.append(fb)
            shoe_sole.append(floor + 0.022 - v[1])
    for i in range(NU):
        for j in range(NS):
            a = base + i * NS + j
            b = base + i * NS + (j + 1) % NS
            c = base + (i + 1) * NS + j
            e = base + (i + 1) * NS + (j + 1) % NS
            shoe_t += [[a, c, b], [b, c, e]]
    # the two ends closed with a fan to their middles
    for ring, sgn in ((0, -1), (NU, 1)):
        cidx = len(P) + len(shoe_v)
        rv = np.array(shoe_v[base - len(P) + ring * NS: base - len(P) + ring * NS + NS])
        shoe_v.append(rv.mean(axis=0) + d * 0.004 * sgn)
        shoe_bone.append(fb)
        shoe_sole.append(floor + 0.022 - shoe_v[-1][1])
        for j in range(NS):
            a = base + ring * NS + j
            b = base + ring * NS + (j + 1) % NS
            shoe_t.append([a, b, cidx] if sgn < 0 else [b, a, cidx])
SV = np.array(shoe_v)
ST = np.array(shoe_t)
T = T[~inside_shoe[T].all(axis=1)]
nb = len(P)
P = np.vstack([P, SV])
T = np.vstack([T, ST])
N = normals(P, T)
# a shoe whose triangles face in would show its inside: flip them if most do
c_all = P[nb:]
mid_l = c_all[c_all[:, 0] > 0].mean(axis=0)
mid_r = c_all[c_all[:, 0] <= 0].mean(axis=0)
facing = 0
for k in range(len(ST)):
    v = P[ST[k][0]]
    m = mid_l if v[0] > 0 else mid_r
    facing += 1 if np.dot(N[ST[k][0]], v - m) > 0 else -1
if facing < 0:
    T[-len(ST):] = T[-len(ST):][:, [0, 2, 1]]
    N = normals(P, T)
ns = len(SV)
BI = np.vstack([BI, np.array([[b, 0, 0, 0] for b in shoe_bone], dtype=np.uint8)])
BW = np.vstack([BW, np.tile(np.array([255, 0, 0, 0], dtype=np.uint8), (ns, 1))])
MI = np.concatenate([MI, np.zeros(ns, dtype=np.uint8)])
MWq = np.concatenate([MWq, np.zeros(ns, dtype=np.uint8)])
MI2 = np.concatenate([MI2, np.zeros(ns, dtype=np.uint8)])
MW2q = np.concatenate([MW2q, np.zeros(ns, dtype=np.uint8)])
CAVq = np.concatenate([CAVq, np.full(ns, 128, dtype=np.uint8)])
MISC_SH = np.concatenate([MISC_SH, enc(np.full(ns, -1.0))])
MISC_SO = np.concatenate([MISC_SO, enc(np.full(ns, 0.06))])
MISC_SL = np.concatenate([MISC_SL, enc(np.array(shoe_sole))])

# ---- into the figure's frame -------------------------------------------------------------
# The app's figure faces +x with y up and its left side at +z (js/data/mannequin), so the
# mesh's x and z are swapped (MakeHuman faces +z with its left at +x). A swap mirrors, so
# each triangle is turned round to keep its outside out. The soles are put on the floor
# (y 0) and the hips over the origin.
def world(a):
    return np.stack([a[..., 2], a[..., 1], a[..., 0]], -1)
floor = P[:, 1].min()
hipmid = (jh("upperleg01.L") + jh("upperleg01.R")) / 2
shift = np.array([hipmid[0], floor, hipmid[2]])
P = world(P - shift)
T = T[:, [0, 2, 1]]
def wj(v):
    return [round(float(x), 5) for x in world(np.asarray(v) - shift)]

# ---- write ------------------------------------------------------------------------------
lo, hi = P.min(axis=0), P.max(axis=0)
Q = np.round((P - lo) / (hi - lo) * 65535).astype(np.uint16)
parts = [("pos", Q.tobytes(), "u16x3"), ("idx", T.astype(np.uint16).tobytes(), "u16x3"),
         ("bone", BI.tobytes(), "u8x4"), ("bw", BW.tobytes(), "u8x4"),
         ("mus", np.stack([MI, MWq, MI2, MW2q], 1).astype(np.uint8).tobytes(), "u8x4"),
         ("misc", np.stack([MISC_SH, MISC_SO, MISC_SL, CAVq], 1).astype(np.uint8).tobytes(), "u8x4")]
layout, blob, off = {}, b"", 0
for name, data, fmt in parts:
    pad = (-off) % 4
    blob += b"\0" * pad
    off += pad
    layout[name] = {"offset": off, "bytes": len(data), "format": fmt}
    blob += data
    off += len(data)
BIN, JS = sys.argv[2], sys.argv[3]
open(BIN, "wb").write(blob)
meta = {
    "source": "MakeHuman hm08 base mesh, default skeleton and weights (CC0), baked by tools/body/bake.py",
    "vertices": len(P), "triangles": len(T), "min": lo.round(5).tolist(), "max": hi.round(5).tolist(),
    "layout": layout, "muscles": MUS, "outfit": "misc: shorts, shoe, sole (128 + metres inside x 2000), hollow; mus: the two muscles a vertex is most in and how much (1-20, an index into muscles + 1), 31 = the eyes",
    "bones": [{"name": b, "parent": (KEEP.index(kept(bones_all[b]["parent"])) if bones_all[b]["parent"] else -1),
               "head": wj(jh(b)), "tail": wj(jt(b))} for b in KEEP],
}
open(JS, "w").write("""/* Bunyan — the 3D figure's body: its skeleton and the layout of its mesh
   Made by tools/body/bake.py from MakeHuman's CC0 base mesh, skeleton and weights; do not
   edit by hand. The mesh itself is img/fig/body.bin. Metres; the figure faces +x, y up,
   its left side at +z, standing on y 0 with its hips over the origin. */
var BODY=""" + json.dumps(meta, separators=(",", ":")) + """;
export {BODY};
""")
print("vertices", len(P), "triangles", len(T), "bytes", len(blob), "height", round(hi[1] - lo[1], 3))
print("muscle vertices", {m: int((MI == mid[m]).sum()) for m in MUS})
