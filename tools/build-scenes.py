#!/usr/bin/env python3
"""
Draw the house and the kitchen for the homepage story, in the same axonometric
style as the rest of the site, and wire them to the paint beats in
data/story.json.

  images/scenes/house.svg     two storeys, attached garage, front door, balcony,
                              big backyard with a deck and a fence
  images/scenes/kitchen.svg   the kitchen, opened up like a doll's house
  index.html                  the beat data, between <!-- STORY-DATA:START --> and <!-- STORY-DATA:END -->

Every paintable surface is drawn twice: once unpainted (bare primer) and once in
its beat's colour. The painted copy sits behind a mask (clipPath id "w-<key>")
that js/story.js slides across the drawing: that is the paint wipe.

Run from the project folder after editing data/story.json:
    python3 tools/build-scenes.py
"""
import json
import math
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BEATS = json.load(open(os.path.join(ROOT, "data", "story.json"), encoding="utf-8"))["beats"]
PAINT = {b["key"]: b["hex"] for b in BEATS}
CLIP_OF = {k: k for k in PAINT}
_by = {b["key"]: b for b in BEATS}
# Trim is painted in the exterior beat, in its second colour (hex2)
PAINT["trim"] = _by.get("siding", {}).get("hex2", "#f7f7f5")
CLIP_OF["trim"] = "siding" if "siding" in _by else "trim"
# Deck railings are painted in the deck beat, in its second colour (hex2)
PAINT["deckrail"] = _by.get("deck", {}).get("hex2", _by.get("deck", {}).get("hex", "#232425"))
CLIP_OF["deckrail"] = "deck"
# Kitchen cabinets go white in the Interiors beat (its hex2)
_w = _by.get("walls", {})
PAINT["cabinets"] = _w.get("hex2", "#ffffff")
CLIP_OF["cabinets"] = "walls" if "walls" in _by else "cabinets"
# Front iron railings and balconettes are painted black with the exterior
PAINT["iron"] = "#141414"
CLIP_OF["iron"] = "siding" if "siding" in _by else "iron"
# The rear balcony is painted with the deck (deck's hex2), as its own wipe
PAINT["balcony"] = _by.get("deck", {}).get("hex2", "#141414")
CLIP_OF["balcony"] = "balcony"
# Colours before painting (default: bare primer)
BEFORE = {}
if _w.get("before"): BEFORE["walls"] = _w["before"]
if _w.get("before2"): BEFORE["cabinets"] = _w["before2"]
if _by.get("deck", {}).get("before"):
    BEFORE["deck"] = _by["deck"]["before"]          # green-grey, weathered
    BEFORE["deckrail"] = "#8a8f86"
    BEFORE["balcony"] = "#8a8f86"

# Prep coats wipe on, in order, before the colour (the deck: pressure washed, then sanded)
PREP = {}
for b in BEATS:
    for pr in b.get("preps", []):
        PAINT[pr["key"]] = pr["hex"]
        CLIP_OF[pr["key"]] = pr["key"]
        PREP.setdefault(b["key"], []).append(pr["key"])

# Light palette: soft neutral surroundings, so the painted colours stand out.
UNPAINTED = "#d6d3cc"     # bare primer, before a coat goes on
ROOF = "#7d828b"
GLASS = "#4d606d"
CONCRETE = "#d4d1ca"
STONE = "#e0ddd6"
LAWN = "#cad5b9"
ASPHALT = "#bebcb6"
STEEL = "#b8b9b6"
FLOOR = "#c9a77c"
QUARTZ = "#efece6"
SHRUB = "#7f9068"
CABINET = "#d9c19c"   # finished wood: cabinets are not something we paint
ISLAND = "#b89a72"

C, S = math.cos(math.radians(30)), 0.5


def hx(c):
    c = c.lstrip("#")
    return [int(c[i:i + 2], 16) for i in (0, 2, 4)]


def shade(c, n):
    r = hx(c)
    if n == "z":
        r = [int(v + (255 - v) * 0.16) for v in r]
    elif n == "x":
        r = [int(v * 0.86) for v in r]
    return "#%02x%02x%02x" % tuple(r)


def f(v):
    return f"{v:.1f}".rstrip("0").rstrip(".")


class Scene:
    def __init__(self, k):
        self.k = k
        self.out = []
        self.pts = []
        self.bbox = {}       # beat key -> [x0, y0, x1, y1] in drawing units
        self.anchors = {}

    def P(self, x, y, z):
        sx, sy = (x - y) * C * self.k, ((x + y) * S - z) * self.k
        self.pts.append((sx, sy))
        return sx, sy

    def d(self, pts):
        return "M" + "L".join(f"{f(a)} {f(b)}" for a, b in (self.P(*p) for p in pts)) + "Z"

    def _grow(self, key, pts):
        xs = [self.P(*p)[0] for p in pts]
        ys = [self.P(*p)[1] for p in pts]
        b = self.bbox.setdefault(CLIP_OF[key], [1e9, 1e9, -1e9, -1e9])
        b[0], b[1], b[2], b[3] = min(b[0], *xs), min(b[1], *ys), max(b[2], *xs), max(b[3], *ys)

    def face(self, pts, n, key=None, fixed=None, cls="f", under="", lit=False):
        d = self.d(pts)
        if key:
            self.out.append(f'<path class="{cls} u" d="{d}" fill="{shade(BEFORE.get(key, UNPAINTED), n)}"/>{under}')
            for pk in PREP.get(key, []):                      # prep coats, before the colour
                self.out.append(f'<path class="{cls} p" clip-path="url(#w-{pk})" d="{d}" fill="{shade(PAINT[pk], n)}"/>')
                self._grow(pk, pts)
            self.out.append(f'<path class="{cls} p" clip-path="url(#w-{CLIP_OF[key]})" d="{d}" fill="{shade(PAINT[key], n)}"/>')
            self._grow(key, pts)
        else:
            self.out.append(f'<path class="{cls}" d="{d}" fill="{shade(fixed, n)}"/>')
        if lit:                                               # soft daylight: brighter at the top, darker at the base
            self.out.append(f'<path class="lit" d="{d}" fill="url(#lit-{n})"/>')

    def shadow(self, pts, opacity=0.14):
        self.out.append(f'<path class="shadow" d="{self.d(pts)}" fill="#000" fill-opacity="{opacity}"/>')

    def box(self, x0, x1, y0, y1, z0, z1, key=None, fixed=None):
        self.face(rz(z1, x0, x1, y0, y1), "z", key, fixed)
        self.face(ry(y1, x0, x1, z0, z1), "y", key, fixed)
        self.face(rx(x1, y0, y1, z0, z1), "x", key, fixed)

    def lines(self, segs, cls="dl"):
        d = "".join(f"M{f(self.P(*a)[0])} {f(self.P(*a)[1])}L{f(self.P(*b)[0])} {f(self.P(*b)[1])}" for a, b in segs)
        self.out.append(f'<path class="{cls}" d="{d}"/>')

    def paint_lines(self, segs, key, width=2.2):
        """Thin pickets and balusters: an ink line, then a painted stroke on top."""
        d = "".join(f"M{f(self.P(*a)[0])} {f(self.P(*a)[1])}L{f(self.P(*b)[0])} {f(self.P(*b)[1])}" for a, b in segs)
        self.out.append(f'<path class="bal u" style="stroke-width:{width}" stroke="{BEFORE.get(key, UNPAINTED)}" d="{d}"/>')
        self.out.append(f'<path class="bal p" style="stroke-width:{width}" clip-path="url(#w-{CLIP_OF[key]})" stroke="{PAINT[key]}" d="{d}"/>')
        self._grow(key, [p for s in segs for p in s])

    def anchor(self, name, x, y, z):
        self.anchors[name] = [round(v, 1) for v in self.P(x, y, z)]

    def window_y(self, y, x0, x1, z0, z1, cols=2, key_frame="trim"):
        self.face(ry(y, x0 - 0.45, x1 + 0.45, z0 - 0.45, z1 + 0.45), "y", key_frame)
        self.box(x0 - 0.8, x1 + 0.8, y, y + 0.45, z0 - 0.8, z0 - 0.45, key_frame)
        self.face(ry(y, x0, x1, z0, z1), "y", fixed=GLASS, cls="f glass")
        w = x1 - x0
        self.face([(x0 + w * 0.12, y, z0), (x0 + w * 0.36, y, z0), (x0 + w * 0.64, y, z1), (x0 + w * 0.4, y, z1)], "y", fixed="#9db2bd", cls="sheen")
        segs = [((x0 + w * i / cols, y, z0), (x0 + w * i / cols, y, z1)) for i in range(1, cols)]
        segs.append(((x0, y, (z0 + z1) / 2), (x1, y, (z0 + z1) / 2)))
        self.lines(segs, "ml")

    def window_x(self, x, y0, y1, z0, z1, cols=2, key_frame="trim", door=False):
        self.face(rx(x, y0 - 0.45, y1 + 0.45, z0 - 0.45, z1 + 0.45), "x", key_frame)
        if not door:
            self.box(x, x + 0.45, y0 - 0.8, y1 + 0.8, z0 - 0.8, z0 - 0.45, key_frame)
        self.face(rx(x, y0, y1, z0, z1), "x", fixed=GLASS, cls="f glass")
        h = y1 - y0
        self.face([(x, y0 + h * 0.12, z0), (x, y0 + h * 0.36, z0), (x, y0 + h * 0.64, z1), (x, y0 + h * 0.4, z1)], "x", fixed="#9db2bd", cls="sheen")
        segs = [((x, y0 + h * i / cols, z0), (x, y0 + h * i / cols, z1)) for i in range(1, cols)]
        if not door:
            segs.append(((x, y0, (z0 + z1) / 2), (x, y1, (z0 + z1) / 2)))
        self.lines(segs, "ml")

    def svg(self, pad=24, extra_defs=""):
        xs = [p[0] for p in self.pts]
        ys = [p[1] for p in self.pts]
        x0, y0 = min(xs) - pad, min(ys) - pad
        w, h = max(xs) - x0 + pad, max(ys) - y0 + pad
        clips = []
        wipes = {}
        for key, (bx0, by0, bx1, by1) in self.bbox.items():
            bx0, by0, bx1, by1 = bx0 - 4, by0 - 4, bx1 + 4, by1 + 4
            s = (by1 - by0) * 0.35
            wd = (bx1 - bx0) + 2 * s
            dpath = f"M{f(bx0 - s - wd)} {f(by0)}L{f(bx0)} {f(by0)}L{f(bx0 - s)} {f(by1)}L{f(bx0 - s - wd)} {f(by1)}Z"
            clips.append(f'<clipPath id="w-{key}" clipPathUnits="userSpaceOnUse"><path class="wipe" data-wipe="{key}" d="{dpath}"/></clipPath>')
            wipes[key] = {"bbox": [round(v, 1) for v in (bx0, by0, bx1, by1)], "travel": round((bx1 - bx0) + s, 1)}
        light = ('<linearGradient id="lit-y" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".14"/></linearGradient>'
                 '<linearGradient id="lit-x" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".08"/><stop offset=".5" stop-color="#000" stop-opacity=".04"/><stop offset="1" stop-color="#000" stop-opacity=".2"/></linearGradient>'
                 '<linearGradient id="lit-z" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".12"/><stop offset="1" stop-color="#000" stop-opacity=".08"/></linearGradient>')
        body = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{f(x0)} {f(y0)} {f(w)} {f(h)}">'
                f'<defs>{"".join(clips)}{light}{extra_defs}</defs><g class="hs">{"".join(self.out)}</g></svg>')
        return body, {"viewBox": [round(x0, 1), round(y0, 1), round(w, 1), round(h, 1)], "wipes": wipes, "anchors": self.anchors}


def ry(y, x0, x1, z0, z1): return [(x0, y, z0), (x1, y, z0), (x1, y, z1), (x0, y, z1)]
def rx(x, y0, y1, z0, z1): return [(x, y0, z0), (x, y1, z0), (x, y1, z1), (x, y0, z1)]
def rz(z, x0, x1, y0, y1): return [(x0, y0, z), (x1, y0, z), (x1, y1, z), (x0, y1, z)]


def frange(a, b, step):
    v = a
    while v < b - 1e-6:
        yield v
        v += step


# =================================================================== THE HOUSE
# Feet. x runs left to right along the street, y from the back fence to the street,
# z is up. We look from the front right, so we see the front (y = max) and the
# right side (x = max), where the backyard, deck and balcony are.
LIMESTONE = "#bdb4a5"     # natural stone base, terrace and stairs (never painted)
SLATE = "#59606b"


def arc(y, x0, x1, zs, n=12):
    """Points of a semicircular arch top, right to left, on the plane y."""
    r, xc = (x1 - x0) / 2, (x0 + x1) / 2
    return [(xc + r * math.cos(math.pi * i / n), y, zs + r * math.sin(math.pi * i / n)) for i in range(n + 1)]


def build_house():
    """A three-storey stone house in the French style: built-in garage at street level,
    a raised main floor with an arched door and arched windows, iron balconettes,
    and a slate mansard roof with dormers and a chimney."""
    h = Scene(10)
    F, R = h.face, h.box
    W, Y0, Y1 = 46, 8, 46          # main block: x 0..46, y 8..46; floors at 0, 10 and 20; roof from 30
    P0 = 53                        # front of the stone base (garage level), terrace on top at z 10

    def ashlar(y, x0, x1, z0, z1):                           # stone courses on a wall that faces the street
        segs = [((x0, y, z), (x1, y, z)) for z in frange(z0 + 1.1, z1, 1.1)]
        for i, z in enumerate(frange(z0, z1 - 0.2, 1.1)):
            off = 0 if i % 2 else 1.3
            segs += [((x, y, z), (x, y, min(z + 1.1, z1))) for x in frange(x0 + off + 0.5, x1, 2.6)]
        h.lines(segs)

    def ashlar_x(x, y0, y1, z0, z1):
        segs = [((x, y0, z), (x, y1, z)) for z in frange(z0 + 1.1, z1, 1.1)]
        for i, z in enumerate(frange(z0, z1 - 0.2, 1.1)):
            off = 0 if i % 2 else 1.3
            segs += [((x, y, z), (x, y, min(z + 1.1, z1))) for y in frange(y0 + off + 0.5, y1, 2.6)]
        h.lines(segs)

    def arch_window(y, x0, x1, z0, zs):
        F([(x0 - 0.5, y, z0 - 0.5), (x1 + 0.5, y, z0 - 0.5)] + arc(y, x0 - 0.5, x1 + 0.5, zs), "y", "trim")
        R(x0 - 0.8, x1 + 0.8, y, y + 0.45, z0 - 0.8, z0 - 0.45, "trim")
        F([(x0, y, z0), (x1, y, z0)] + arc(y, x0, x1, zs), "y", fixed=GLASS, cls="f glass")
        w = x1 - x0
        F([(x0 + w * 0.15, y, z0), (x0 + w * 0.38, y, z0), (x0 + w * 0.62, y, zs), (x0 + w * 0.4, y, zs)], "y", fixed="#9db2bd", cls="sheen")
        xc = (x0 + x1) / 2
        h.lines([((xc, y, z0), (xc, y, zs + w / 2)), ((x0, y, zs), (x1, y, zs)), ((x0, y, (z0 + zs) / 2), (x1, y, (z0 + zs) / 2))], "ml")

    def iron(y, x0, x1, z0, z1, key="iron", step=0.55):   # wrought-iron railing on the plane y
        h.paint_lines([((x, y, z0), (x, y, z1)) for x in frange(x0 + 0.3, x1, step)], key, 2.2)
        R(x0, x1, y - 0.15, y + 0.15, z1, z1 + 0.25, key)
        h.paint_lines([((x0, y, z0 + 0.5), (x1, y, z0 + 0.5))], key, 1.6)

    # ---- ground: lawn, sidewalk, street, driveway down to the built-in garage
    F(rz(0, -14, 98, -9, 66), "z", fixed=LAWN, cls="f ground")
    for i, y in enumerate(frange(-9, 66, 3.4)):
        if i % 2:
            h.out.append(f'<path class="stripe" d="{h.d(rz(0.01, -14, 98, y, min(y + 3.4, 66)))}"/>')
    F(rz(0, -14, 98, 66, 69), "z", fixed=STONE)
    F(rz(0, -14, 98, 69, 80), "z", fixed=ASPHALT)
    h.lines([((-14, 75, 0), (98, 75, 0))], "lane")
    F(rz(0.02, 21, 43, P0, 66), "z", fixed=CONCRETE)
    F(rz(0.02, 52, 56, 40, 66), "z", fixed=STONE)                  # path to the side gate

    # ---- back and side fences, with a big backyard tree
    F(ry(-7, 49, 96, 0, 6), "y", "fence")
    h.paint_lines([((x, -7, 0), (x, -7, 6)) for x in frange(50, 96, 1.0)], "fence", 0.9)
    R(49, 96, -7.4, -6.8, 6, 6.35, "fence")
    F(rx(96, -7, 59, 0, 6), "x", "fence")
    h.paint_lines([((96, y, 0), (96, y, 6)) for y in frange(-6, 59, 1.0)], "fence", 0.9)
    R(95.6, 96.2, -7, 59, 6, 6.35, "fence")
    for y in (-7, 9, 25, 41, 59):
        R(95.5, 96.4, y - 0.45, y + 0.45, 0, 6.8, "fence")
    h.anchor("fence", 96, 25, 3)
    h.shadow(rz(0.01, 78, 90, 0, 9), 0.1)
    R(82.5, 83.8, 2.5, 3.8, 0, 12, fixed="#6f5a48")
    for (cx, cy, cz, r, col) in ((83, 3, 22, 7.5, "#6f8560"), (79, 6, 18, 5.5, "#7f9068"), (87, 1, 18, 5.5, "#768a64"), (83, 6, 15, 4.5, "#8a9b72")):
        sx, sy = h.P(cx, cy, cz)
        h.out.append(f'<circle class="f tree" cx="{f(sx)}" cy="{f(sy)}" r="{f(r * h.k)}" fill="{col}"/>')

    h.shadow([(W, Y0 - 1, 0.01), (W + 15, Y0 - 8, 0.01), (W + 15, Y1 - 8, 0.01), (W, Y1, 0.01)], 0.14)

    # ---- walls: the side runs full height (the lower level walks out to the yard); the front starts at the main floor
    F(ry(Y1, 0, W, 10, 30), "y", "siding", lit=True)
    ashlar(Y1, 0, W, 10, 30)
    F(rx(W, Y0, Y1, 0, 30), "x", "siding", lit=True)
    ashlar_x(W, Y0, Y1, 0, 30)
    h.anchor("siding", 23, Y1, 20)
    F(rx(W, Y0, Y1, 0, 1), "x", fixed=LIMESTONE)
    # corner quoins, floor band, and the central bay
    F(ry(Y1, 0, 1.1, 10, 30), "y", "trim")
    F(ry(Y1, W - 1.1, W, 10, 30), "y", "trim")
    F(rx(W, Y0, Y0 + 1.1, 0, 30), "x", "trim")
    F(rx(W, Y1 - 1.1, Y1, 0, 30), "x", "trim")
    F(ry(Y1, 0, W, 20, 20.7), "y", "trim")
    F(rx(W, Y0, Y1, 20, 20.7), "x", "trim")
    R(17, 29, Y1, Y1 + 1, 10, 30, "siding")                     # central bay, one foot proud of the wall
    ashlar(Y1 + 1, 17, 29, 10, 30)
    R(17, 29, Y1, Y1 + 1.2, 20, 20.7, "trim")

    # ---- main floor: arched windows either side, arched front door between columns
    for x0, x1 in ((3, 8), (10, 15)):
        arch_window(Y1, x0, x1, 11.4, 16.5)
    for x0, x1 in ((32, 37), (39, 44)):
        arch_window(Y1, x0, x1, 11.4, 16.5)
    h.anchor("kitchen", 34.5, Y1, 14.5)                            # the camera goes inside through this window
    F([(19.6, Y1 + 1, 10), (26.4, Y1 + 1, 10)] + arc(Y1 + 1, 19.6, 26.4, 16.6), "y", "trim")
    F([(20.2, Y1 + 1, 10.2), (25.8, Y1 + 1, 10.2)] + arc(Y1 + 1, 20.2, 25.8, 16.6), "y", "door")
    h.lines([((23, Y1 + 1, 10.2), (23, Y1 + 1, 19.4)), ((20.2, Y1 + 1, 16.6), (25.8, Y1 + 1, 16.6))]
            + [((x, Y1 + 1, 11), (x, Y1 + 1, 16)) for x in (21.4, 24.6)], "ml")
    h.lines([((22.5, Y1 + 1, 13), (22.5, Y1 + 1, 14.4)), ((23.5, Y1 + 1, 13), (23.5, Y1 + 1, 14.4))], "handle")
    h.anchor("door", 23, Y1 + 1, 14)
    for x0 in (18, 27.2):                                            # columns
        R(x0, x0 + 0.9, Y1 + 1, Y1 + 1.9, 10, 20, "trim")

    # ---- upper floor: tall windows with iron balconettes
    for x0, x1, yy in ((3, 8, Y1), (10, 15, Y1), (20.5, 25.5, Y1 + 1), (32, 37, Y1), (39, 44, Y1)):
        h.window_y(yy, x0, x1, 22, 28.4)
    for x0, x1, yy in ((20, 26, Y1 + 1), (31.6, 37.4, Y1), (38.6, 44.4, Y1)):
        iron(yy + 0.8, x0, x1, 21.4, 23.8)
    # side windows
    for z0, z1 in ((2, 7.5), (12, 18.5), (22, 28.4)):
        for y0, y1 in ((12, 17), (22, 27), (36, 41)):
            if z0 == 2 and y0 == 22:
                h.window_x(W, 22, 28, 0.4, 8, cols=2, door=True)     # walk-out patio door to the deck
            else:
                h.window_x(W, y0, y1, z0, z1)

    # ---- cornice, then the slate mansard roof with a chimney and three dormers
    R(-0.6, W + 0.6, Y0 - 0.6, Y1 + 0.6, 29.3, 30.6, "trim")
    F(rz(39.4, 2.6, W - 2.6, Y0 + 2.4, Y1 - 2.4), "z", fixed=SLATE)
    R(37, 41.4, 13, 17, 30, 45, fixed=LIMESTONE)                    # chimney
    R(36.6, 41.8, 12.6, 17.4, 45, 45.6, fixed="#a59c8d")
    R(39.4, 39.6, 14.4, 15.6, 45.6, 47, fixed="#a4583e")
    F([(W + 0.6, Y0 - 0.6, 30.6), (W + 0.6, Y1 + 0.6, 30.6), (W - 2.6, Y1 - 2.4, 39.4), (W - 2.6, Y0 + 2.4, 39.4)], "x", fixed=SLATE, lit=True)
    h.lines([((W + 0.6 - t * 3.2 / 8.8, Y0 - 0.6 + t * 2.6 / 8.8, 30.6 + t), (W + 0.6 - t * 3.2 / 8.8, Y1 + 0.6 - t * 2.6 / 8.8, 30.6 + t)) for t in frange(0.9, 8.8, 0.9)], "rl")
    F([(-0.6, Y1 + 0.6, 30.6), (W + 0.6, Y1 + 0.6, 30.6), (W - 2.6, Y1 - 2.4, 39.4), (2.6, Y1 - 2.4, 39.4)], "y", fixed=SLATE, lit=True)
    h.lines([((-0.6 + t * 3.2 / 8.8, Y1 + 0.6 - t * 2.6 / 8.8, 30.6 + t), (W + 0.6 - t * 3.2 / 8.8, Y1 + 0.6 - t * 2.6 / 8.8, 30.6 + t)) for t in frange(0.9, 8.8, 0.9)], "rl")
    for x0 in (6, 20, 34):
        R(x0, x0 + 6, Y1 - 3.2, Y1 + 0.2, 31, 36.8, "trim")
        h.window_y(Y1 + 0.2, x0 + 1.3, x0 + 4.7, 32, 36, cols=2)
        R(x0 - 0.5, x0 + 6.5, Y1 - 3.4, Y1 + 0.8, 36.8, 37.6, fixed=SLATE)
    ped = [(23 + 6.6 * math.cos(math.pi * i / 16), Y1 + 1.3, 30.6 + 2.6 * math.sin(math.pi * i / 16)) for i in range(17)]
    F([(16.4, Y1 + 1.3, 30.6), (29.6, Y1 + 1.3, 30.6)] + ped, "y", "trim")   # shallow segmental pediment over the bay

    # ---- stone base at street level with the built-in garage, terrace on top
    R(0, W, Y1, P0, 0, 10, fixed=LIMESTONE)
    ashlar(P0, 0, W, 0, 10)
    F(ry(P0, 21.4, 42.6, 0, 9.2), "y", "trim")
    F(ry(P0, 22, 42, 0.1, 8.6), "y", "garage")
    h.lines([((22, P0, z), (42, P0, z)) for z in (2.2, 4.4, 6.5)] + [((x, P0, 0.1), (x, P0, 8.6)) for x in (27, 32, 37)], "ml")
    h.anchor("garage", 32, P0, 4.4)
    F(rz(10.02, 0.4, W - 0.4, Y1 + 0.2, P0 - 0.2), "z", fixed="#cbc3b5")      # terrace paving
    iron(P0 - 0.3, 12, W, 10, 13.2)                                           # terrace railing
    iron(Y1 + 0.6, 0.6, 16.6, 10, 13.2)
    # front stairs down to the street, with a stone wall and an iron rail
    for i in range(10):
        R(1, 11, P0 + i, P0 + i + 1, 0, 10 - i, fixed=LIMESTONE)
    R(11, 12.2, P0, P0 + 10.5, 0, 3, fixed="#a59c8d")
    h.paint_lines([((11.6, P0 + i + 0.5, 10 - i), (11.6, P0 + i + 0.5, 13 - i)) for i in range(10)], "iron", 1.4)
    h.paint_lines([((11.6, P0, 13.2), (11.6, P0 + 10, 3.2))], "iron", 2.2)

    # ---- deck off the walk-out lower level, on the right
    D0, D1 = W, W + 24
    h.shadow(rz(0.01, D0, D1 + 1, 4, 43), 0.12)
    for x, y in ((D0 + 0.5, 4.5), (D0 + 12, 4.5), (D1 - 1, 4.5), (D1 - 1, 23), (D1 - 1, 41), (D0 + 12, 41)):
        R(x, x + 0.8, y, y + 0.8, 0, 1.6, "deck")
    R(D0, D1, 4, 42, 1.6, 2.4, "deck")
    h.lines([((D0, y, 2.4), (D1, y, 2.4)) for y in frange(4.8, 42, 0.8)])
    h.anchor("deck", D0 + 12, 23, 2.4)

    # ---- rear balcony off the main floor, over the deck (painted with the deck)
    B1 = W + 7
    for y in (18, 33.4):
        R(B1 - 0.9, B1 - 0.2, y, y + 0.6, 2.4, 9.6, "balcony")                       # posts
    R(W, B1 + 0.3, 17.8, 34.2, 9.6, 10.4, "deck")                                   # balcony floor, stained with the deck
    h.paint_lines([((x, 18, 10.4), (x, 18, 13.4)) for x in frange(W + 0.8, B1, 0.7)], "balcony", 1.6)
    h.paint_lines([((B1, y, 10.4), (B1, y, 13.4)) for y in frange(18.6, 34, 0.7)], "balcony", 1.6)
    h.paint_lines([((x, 34, 10.4), (x, 34, 13.4)) for x in frange(W + 0.6, B1, 0.7)], "balcony", 1.6)
    R(W, B1 + 0.3, 17.7, 18.3, 13.4, 13.8, "balcony")
    R(B1 - 0.3, B1 + 0.3, 17.8, 34.2, 13.4, 13.8, "balcony")
    R(W, B1 + 0.3, 33.7, 34.3, 13.4, 13.8, "balcony")
    h.anchor("balcony", W + 3.5, 26, 11.5)
    h.paint_lines([((D1, y, 2.4), (D1, y, 5.4)) for y in list(frange(4.6, 18, 0.75)) + list(frange(26.6, 42, 0.75))], "deckrail", 1.8)
    R(D1 - 0.4, D1 + 0.2, 4, 18, 5.4, 5.8, "deckrail")
    R(D1 - 0.4, D1 + 0.2, 26, 42, 5.4, 5.8, "deckrail")
    h.paint_lines([((x, 42, 2.4), (x, 42, 5.4)) for x in frange(D0 + 0.6, D1, 0.75)], "deckrail", 1.8)
    R(D0, D1 + 0.2, 41.6, 42.2, 5.4, 5.8, "deckrail")
    for y in (17.6, 25.6):
        R(D1 - 0.4, D1 + 0.4, y, y + 0.8, 1.6, 6.4, "deckrail")
    for i, x0 in enumerate((D1 + 0.2, D1 + 1.4, D1 + 2.6)):
        R(x0, x0 + 1.2, 18, 26, 0, 1.8 - i * 0.6, "deck")

    # ---- front garden: hedges and two young street trees, like a Forest Hill front yard
    R(-12, 0.6, P0 + 1, P0 + 3, 0, 2.6, fixed="#6f8560")
    for (x, y) in ((-6, 61), (16, 61)):
        R(x - 0.3, x + 0.3, y - 0.3, y + 0.3, 0, 9, fixed="#6f5a48")
        for (dx, dz, r, col) in ((0, 13, 3.6, "#7f9068"), (-1.2, 11, 2.6, "#6f8560"), (1.2, 11.5, 2.6, "#8a9b72")):
            sx, sy = h.P(x + dx, y, dz)
            h.out.append(f'<circle class="f tree" cx="{f(sx)}" cy="{f(sy)}" r="{f(r * h.k)}" fill="{col}"/>')

    # ---- yard fence with a gate, beside the driveway
    F(rx(50, Y1, 60, 0, 5), "x", "fence")
    h.paint_lines([((50, y, 0), (50, y, 5)) for y in frange(Y1 + 0.8, 60, 0.9)], "fence", 0.9)
    F(ry(60, 50, 52, 0, 5), "y", "fence")
    F(ry(60, 56, 96, 0, 5), "y", "fence")
    h.paint_lines([((x, 60, 0), (x, 60, 5)) for x in list(frange(50.6, 52, 0.9)) + list(frange(56.6, 96, 0.9))], "fence", 0.9)
    F(ry(60, 52.2, 55.8, 0.3, 4.6), "y", "fence")                   # gate
    h.lines([((52.2, 60, 0.3), (55.8, 60, 4.6)), ((52.2, 60, 2.45), (55.8, 60, 2.45))], "ml")
    R(50, 96, 59.7, 60.3, 5, 5.3, "fence")
    for x in (49.6, 51.8, 55.9, 76, 95.4):
        R(x, x + 0.9, 59.8, 60.7, 0, 5.8, "fence")
    return h


# =================================================================== THE INTERIOR
# An open-plan kitchen and living room, opened like a doll's house: two walls and
# the floor. Kitchen on the left, living room on the right. Only the walls are
# painted in the story; furniture and wood cabinets are drawn finished.
SOFA, PILLOW_A, PILLOW_B = "#7d8b7a", "#d4a23a", "#b5583a"
RUG, WALNUT, CAMEL, BLACK = "#e4d9c6", "#6b4a33", "#b98b5e", "#232425"
POT, LEAF = "#efece6", "#6f8f5a"


def build_kitchen():
    k = Scene(20)
    F, R = k.face, k.box
    W, D, H = 36, 20, 9            # room width (x), depth (y), wall height

    def wall(pts, n, seams):
        d = "".join(f"M{f(k.P(*a)[0])} {f(k.P(*a)[1])}L{f(k.P(*b)[0])} {f(k.P(*b)[1])}" for a, b in seams)
        F(pts, n, "walls", under=f'<path class="seam" d="{d}"/>', lit=True)

    wall(rx(0, 0, D, 0, H), "x", [((0, y, 0), (0, y, H)) for y in (4, 8, 12, 16)])
    wall(ry(0, 0, W, 0, H), "y", [((x, 0, 0), (x, 0, H)) for x in range(4, W, 4)])
    F(rz(0, 0, W, 0, D), "z", fixed=FLOOR)
    k.lines([((0, y, 0), (W, y, 0)) for y in frange(0.8, D, 0.8)])
    # rug in the living room
    F(rz(0.02, 18, 34, 6.5, 17), "z", fixed=RUG)
    k.lines([((18.6, 7.1, 0.02), (33.4, 7.1, 0.02)), ((33.4, 7.1, 0.02), (33.4, 16.4, 0.02)),
             ((33.4, 16.4, 0.02), (18.6, 16.4, 0.02)), ((18.6, 16.4, 0.02), (18.6, 7.1, 0.02))], "ml")

    # windows: one over the sink, two big ones in the living room
    k.window_y(0, 7, 10, 4.3, 7.6, cols=2, key_frame="walls")
    k.window_y(0, 20, 25.6, 3.6, 7.8, cols=2, key_frame="walls")
    k.window_y(0, 27.4, 33, 3.6, 7.8, cols=2, key_frame="walls")
    k.anchor("walls", 18, 0, 6)

    # ---- kitchen
    R(2, 6.4, 0, 1.2, 5.4, 8.4, "cabinets")              # upper cabinets
    R(10.6, 14, 0, 1.2, 5.4, 8.4, "cabinets")
    k.lines([((4.2, 1.2, 5.4), (4.2, 1.2, 8.4)), ((12.3, 1.2, 5.4), (12.3, 1.2, 8.4))], "ml")
    R(0, 1.5, 4.4, 7.4, 6.9, 8.6, fixed=STEEL)              # range hood
    R(0, 2, 0, 4.4, 0, 0.4, fixed="#2b2a27")                 # lower run on the side wall, with the range
    R(0, 2, 0, 4.4, 0.4, 3.0, "cabinets")
    k.lines([((2, 2.2, 0.4), (2, 2.2, 3.0)), ((2, 0, 2.3), (2, 4.4, 2.3))], "ml")
    R(0, 2.2, 0, 4.4, 3.0, 3.25, fixed=QUARTZ)
    R(0, 2, 4.4, 7.4, 0, 3.0, fixed=STEEL)
    k.lines([((2, 4.8, 2.2), (2, 7.0, 2.2)), ((2, 4.8, 0.6), (2, 7.0, 0.6))], "ml")
    R(0, 2, 7.4, 9.4, 0, 0.4, fixed="#2b2a27")
    R(0, 2, 7.4, 9.4, 0.4, 3.0, "cabinets")
    R(0, 2.2, 7.4, 9.4, 3.0, 3.25, fixed=QUARTZ)
    R(0, 2.4, 9.4, 12, 0, 8.4, fixed=STEEL)                 # fridge
    k.lines([((2.4, 9.4, 5.2), (2.4, 12, 5.2)), ((2.4, 11.6, 3.2), (2.4, 11.6, 4.6)), ((2.4, 11.6, 5.8), (2.4, 11.6, 7.4))], "ml")
    R(2, 14.2, 0, 2, 0, 0.4, fixed="#2b2a27")                # lower run on the back wall, with the sink
    R(2, 14.2, 0, 2, 0.4, 3.0, "cabinets")
    k.lines([((x, 2, 0.4), (x, 2, 3.0)) for x in (5, 8, 11)] + [((2, 2, 2.3), (14.2, 2, 2.3))], "ml")
    R(2, 14.4, 0, 2.2, 3.0, 3.25, fixed=QUARTZ)
    k.face(rz(3.26, 7.4, 9.6, 0.5, 1.7), "z", fixed=STEEL)
    k.lines([((8.5, 0.3, 3.25), (8.5, 0.3, 4.3)), ((8.5, 0.3, 4.3), (8.5, 0.9, 4.3))], "ml")

    # ---- living room, along the back wall: plant, sofa with cushions, floor lamp
    R(16.6, 18, 0.6, 2, 0, 1.6, fixed=POT)
    for (cx, cy, cz, r) in ((17.3, 1.3, 3.2, 1.3), (16.7, 1.6, 2.5, 0.9), (17.9, 1.1, 2.6, 0.9)):
        sx, sy = k.P(cx, cy, cz)
        k.out.append(f'<circle class="f tree" cx="{f(sx)}" cy="{f(sy)}" r="{f(r * k.k)}" fill="{LEAF}"/>')
    R(20, 32.6, 0.4, 1.5, 1.3, 3.0, fixed=SOFA)              # sofa back
    R(19.4, 20.1, 0.6, 4.6, 0, 2.1, fixed=SOFA)              # left arm
    R(20.1, 32, 1.5, 4.6, 0, 1.4, fixed=SOFA)                # seat
    k.lines([((26, 1.5, 1.4), (26, 4.6, 1.4))], "ml")
    R(21, 23.2, 1.5, 2.3, 1.4, 2.7, fixed=PILLOW_A)
    R(29, 31.2, 1.5, 2.3, 1.4, 2.7, fixed=PILLOW_B)
    R(32, 32.7, 0.6, 4.6, 0, 2.1, fixed=SOFA)                # right arm
    k.lines([((34, 1.4, 0), (34, 1.4, 5.4))], "ml")          # floor lamp
    R(33.4, 34.6, 0.8, 2, 5.4, 6.4, fixed=BLACK)

    # ---- island with stools and pendant lights
    R(5, 12.5, 7, 10.4, 0, 0.4, fixed="#2b2a27")
    R(5, 12.5, 7, 10.4, 0.4, 3.0, "cabinets")
    k.lines([((x, 10.4, 0.4), (x, 10.4, 3.0)) for x in (7.5, 10)], "ml")
    R(4.7, 12.8, 6.7, 10.7, 3.0, 3.3, fixed=QUARTZ)
    for x in (6.4, 8.8, 11.2):
        k.lines([((x - 0.5, 11.3, 0), (x - 0.5, 11.3, 2.2)), ((x + 0.5, 11.3, 0), (x + 0.5, 11.3, 2.2)),
                 ((x - 0.5, 12.3, 0), (x - 0.5, 12.3, 2.2)), ((x + 0.5, 12.3, 0), (x + 0.5, 12.3, 2.2))], "leg")
        R(x - 0.7, x + 0.7, 11, 12.6, 2.2, 2.5, fixed="#3a3330")
    for x in (7, 10.5):
        k.lines([((x, 8.7, H), (x, 8.7, 6.3))], "ml")
        R(x - 0.5, x + 0.5, 8.2, 9.2, 5.7, 6.3, fixed=BLACK)

    # ---- coffee table with books, and an armchair
    for (x, y) in ((22.4, 8.9), (27.6, 8.9), (22.4, 11.1), (27.6, 11.1)):
        k.lines([((x, y, 0), (x, y, 1.1))], "leg")
    R(22, 28, 8.5, 11.5, 1.1, 1.4, fixed=WALNUT)
    R(23, 25, 9.2, 10.6, 1.4, 1.65, fixed="#d6cfc2")
    R(23.2, 24.8, 9.4, 10.4, 1.65, 1.85, fixed="#3f6189")
    R(32, 35.2, 8.8, 9.6, 1.2, 3.2, fixed=CAMEL)             # armchair back
    R(31.6, 32.2, 9.6, 12.8, 0, 2.0, fixed=CAMEL)            # arm
    R(32.2, 34.8, 9.6, 12.8, 0, 1.2, fixed=CAMEL)            # seat
    R(34.8, 35.4, 9.6, 12.8, 0, 2.0, fixed=CAMEL)            # arm

    # cut edges: wall tops and floor slab, drawn solid like a section
    for pts in (rz(H, -0.6, W, -0.6, 0), rz(H, -0.6, 0, 0, D), rx(W, -0.6, 0, 0, H), ry(D, -0.6, 0, 0, H),
                ry(D, -0.6, W, -0.8, 0), rx(W, 0, D, -0.8, 0)):
        k.out.append(f'<path class="poche" d="{k.d(pts)}"/>')
    return k


# =================================================================== STILL FRAMES
# For visitors who prefer reduced motion, and for browsers without JavaScript,
# the story is shown as a list of still frames. Each frame is a standalone SVG
# (with its own styles, so it works as an <img>) written to images/scenes/steps/.
def page_css(prefixes):
    """Copy the drawing styles from the stylesheets, with colour tokens filled in."""
    css = open(os.path.join(ROOT, "css", "styles.css"), encoding="utf-8").read() + open(os.path.join(ROOT, "css", "home.css"), encoding="utf-8").read()
    css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)  # drop comments so they don't hide the rule after them
    tokens = {}
    for name, value in re.findall(r"--([\w-]+):\s*([^;]+);", css):
        tokens.setdefault(name, value.strip())
    def fill(v):
        for _ in range(3):
            v = re.sub(r"var\(--([\w-]+)(?:,[^)]*)?\)", lambda m: tokens.get(m.group(1), "#000"), v)
        return v
    out = []
    for sel, body in re.findall(r"([^{}]+)\{([^{}]*)\}", css):
        sel = sel.strip()
        parts = [x.strip() for x in sel.split(",")]
        if parts and all(any(x.startswith(pf) for pf in prefixes) for x in parts):
            out.append(f"{sel}{{{fill(body.strip())}}}")
    return "".join(out)


def framed(inner, box, css, width=800):
    x, y, w, h = box
    height = round(width * h / w)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{f(x)} {f(y)} {f(w)} {f(h)}" width="{width}" height="{height}">'
            f'<style>{css}</style>{inner}</svg>'), height


def inner_of(svg):
    return re.sub(r"^<svg[^>]*>|</svg>$", "", svg)


def painted(svg_inner, scene_data, keys):
    for k in keys:
        travel = scene_data["wipes"][k]["travel"]
        svg_inner = svg_inner.replace(f'data-wipe="{k}" d=', f'data-wipe="{k}" transform="translate({travel} 0)" d=')
    return svg_inner


def focus(scene_data, key, scene):
    if scene == "kitchen":                     # the interior is shown as a whole room
        x, y, w, h = scene_data["viewBox"]
        return (x, y, w, h)
    x0, y0, x1, y1 = scene_data["wipes"][key]["bbox"]
    mw, mh = (300, 220) if scene == "house" else (700, 480)
    w, h = max((x1 - x0) * 1.12, mw), max((y1 - y0) * 1.12, mh)
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    return (cx - w / 2, cy - h / 2, w, h)


def esc(t):
    return t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")


def build_steps(hsvg, hdata, ksvg, kdata, html):
    d = os.path.join(ROOT, "images", "scenes", "steps")
    os.makedirs(d, exist_ok=True)
    for old in os.listdir(d):
        if old.endswith(".svg"):
            os.remove(os.path.join(d, old))
    map_css, hs_css = page_css((".m-",)), page_css((".fh", ".hs"))
    steps = []  # (file, svg, height, fig, title, text, alt, beat)

    def add(name, svg_h, fig, title, text, alt, beat=None):
        svg, h = svg_h
        open(os.path.join(d, name), "w", encoding="utf-8").write(svg)
        steps.append((name, h, fig, title, text, alt, beat))

    tmap = open(os.path.join(ROOT, "tools", "toronto-map.html"), encoding="utf-8").read()  # the map left the homepage with the hero film
    tor = re.search(r"<!-- TORONTO:START -->(.*?)<!-- TORONTO:END -->", tmap, re.S).group(1)
    lab = re.search(r"<!-- TORONTO-LABELS:START -->(.*?)<!-- TORONTO-LABELS:END -->", tmap, re.S).group(1)
    add("01-toronto.svg", framed(tor + lab, (60, 20, 900, 500), map_css), "Located in", "Toronto", "Lake Ontario to Steeles",
        "Map of Toronto from Lake Ontario to Steeles Avenue, with the Humber and Don valleys, the main highways and Forest Hill marked.")
    fh = inner_of(open(os.path.join(ROOT, "images", "scenes", "forest-hill.svg"), encoding="utf-8").read())
    add("02-forest-hill.svg", framed(fh, (134, 535, 400, 400), hs_css), "Where we work", "Forest Hill", "and surrounding areas",
        "Street map of part of Forest Hill: curving streets, large lots with houses and street trees, and one lot marked with a red pin.")
    hv = hdata["viewBox"]
    frame = (hv[0] + hv[2] * 0.14, hv[1], hv[2] * 0.82, hv[3] * 0.86)
    hin, kin = inner_of(hsvg), inner_of(ksvg)
    add("03-house.svg", framed(hin, frame, hs_css), "Before", "Residential or Commercial", "Three floors, a built-in garage, a big backyard. Nothing painted yet.",
        "Drawing of the unpainted house: three floors, a garage built into the ground floor, a balcony over a big deck, and a fenced backyard.")
    done = {"house": [], "kitchen": []}
    for i, b in enumerate(BEATS):
        sc = b["scene"]
        data, src = (hdata, hin) if sc == "house" else (kdata, kin)
        box = focus(data, b["key"], sc)
        if b.get("stages"):
            # one still per stage: weathered, then each prep, then the colour (with anything painted alongside)
            keys = [pr["key"] for pr in b.get("preps", [])] + [b["key"]] + b.get("alsoPaint", [])
            cuts = [0] + list(range(1, len(b.get("preps", [])) + 1)) + [len(keys)]
            for j, (label, cut) in enumerate(zip(b["stages"], cuts)):
                inner = painted(src, data, done[sc] + [k for k in keys[:cut] if k in data["wipes"]])
                chip = {"label": f'{j + 1}. {label}', "colour": "", "hex": None}
                add(f"{i + 4:02d}-{b['key']}-{j + 1}.svg", framed(inner, box, hs_css), "", f'{b["label"]}: {label}', b["caption"],
                    f'{b["label"]}, stage {j + 1} of {len(b["stages"])}: {label.lower()}.', chip)
            done[sc] += [k for k in keys if k in data["wipes"]]
            continue
        done[sc].append(b["key"])
        inner = painted(src, data, done[sc])
        alt = f'{b["label"]} painted {b["colour"].lower()}.'
        add(f"{i + 4:02d}-{b['key']}.svg", framed(inner, box, hs_css), "", b["label"], "", alt, None)
    add("99-finished.svg", framed(painted(hin, hdata, done["house"]), frame, hs_css), "", "ForestHill Student Painters", "",
        "The finished house: " + ", ".join(f'{b["label"].lower()} in {b["colour"].lower()}' for b in BEATS if b["scene"] == "house") + ".")

    items = []
    for name, h, fig, title, text, alt, beat in steps:
        chip = ""
        if beat:
            if beat.get("hex"):
                bg = f'linear-gradient(135deg, {beat["hex"]} 50%, {beat["hex2"]} 50%)' if beat.get("hex2") else beat["hex"]
                chip = f'<p class="hud__chip is-on"><i style="background:{bg}"></i><span>{esc(beat["label"])} · {esc(beat["colour"])}</span></p>'
            else:
                chip = f'<p class="hud__chip is-on"><span>{esc(beat["label"])}</span></p>'
        items.append(
            f'<li class="sstep"><figure><img src="images/scenes/steps/{name}" width="800" height="{h}" loading="lazy" decoding="async" alt="{esc(alt)}">'
            f'<figcaption><h3>{esc(title)}</h3>{chip}</figcaption></figure></li>')
    items.append('<li class="sstep sstep--end"><a class="button button--big button--cta" href="#book">Book a quote</a></li>')
    return "".join(items)


if __name__ == "__main__":
    house = build_house()
    hsvg, hdata = house.svg()
    kitchen = build_kitchen()
    ksvg, kdata = kitchen.svg(pad=30)
    os.makedirs(os.path.join(ROOT, "images", "scenes"), exist_ok=True)
    open(os.path.join(ROOT, "images", "scenes", "house.svg"), "w", encoding="utf-8").write(hsvg)
    open(os.path.join(ROOT, "images", "scenes", "kitchen.svg"), "w", encoding="utf-8").write(ksvg)
    data = {"beats": [{k: v for k, v in b.items()} for b in BEATS], "house": hdata, "kitchen": kdata}
    blob = json.dumps(data, separators=(",", ":"))
    index = os.path.join(ROOT, "index.html")
    html = open(index, encoding="utf-8").read()
    html, n = re.subn(r"(<!-- STORY-DATA:START -->).*?(<!-- STORY-DATA:END -->)",
                      lambda m: m.group(1) + f'<script type="application/json" id="story-data">{blob}</script>' + m.group(2), html, flags=re.S)
    if not n:
        print("index.html has no drawn story any more (the hero film replaced it): only the pictures are updated")
    steps = build_steps(hsvg, hdata, ksvg, kdata, html)
    html, n = re.subn(r"(<!-- STEPS:START -->).*?(<!-- STEPS:END -->)", lambda m: m.group(1) + steps + m.group(2), html, flags=re.S)
    # (no STEPS list on the homepage now; the step pictures are still written to images/scenes/steps/)
    open(index, "w", encoding="utf-8").write(html)
    print(f"house.svg {len(hsvg) // 1024} KB, kitchen.svg {len(ksvg) // 1024} KB, story data {len(blob) // 1024} KB")
    print("house viewBox", hdata["viewBox"], "kitchen viewBox", kdata["viewBox"])
