#!/usr/bin/env python3
"""
Draw the two map scenes for the homepage story:

  1. Toronto: a flat, stylised city map (lakefront, islands, Humber and Don
     valleys, main roads). Written into index.html between
     <!-- TORONTO:START --> and <!-- TORONTO:END -->, because it is the first
     scene and must show instantly.
  2. Forest Hill: streets, lots, houses and street trees. Written to
     images/scenes/forest-hill.svg and loaded just after the page opens.

Both are our own drawings. They are illustrative, not survey-accurate, and the
highlighted house is not a real address. The map is turned to the street grid
("grid north"), as most Toronto maps are.

Coordinates: the Toronto map is 1000 x 520 "map units" (about 43 m each).
The Forest Hill drawing covers the map rectangle FH_RECT at 10x the detail.
js/story.js uses the same numbers, so if you change FH_RECT, change it there too.

Run from the project folder:  python3 tools/build-map.py
"""
import math
import os
import random
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FH_RECT = (320, 195, 90, 130)          # x, y, width, height in Toronto map units
FH_SCALE = 10                          # Forest Hill units per map unit
random.seed(7)


def f(v):
    return f"{v:.1f}".rstrip("0").rstrip(".")


def pl(points):
    return "M" + "L".join(f"{f(x)} {f(y)}" for x, y in points)


def smooth(points):
    """Catmull-Rom through the points, as an SVG path."""
    if len(points) < 3:
        return pl(points)
    d = f"M{f(points[0][0])} {f(points[0][1])}"
    for i in range(len(points) - 1):
        p0 = points[i - 1] if i else points[0]
        p1, p2 = points[i], points[i + 1]
        p3 = points[i + 2] if i + 2 < len(points) else p2
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d += f"C{f(c1[0])} {f(c1[1])} {f(c2[0])} {f(c2[1])} {f(p2[0])} {f(p2[1])}"
    return d


# =============================================================== TORONTO
SHORE = [(-600, 480), (0, 470), (90, 455), (170, 425), (205, 410), (265, 405), (330, 400), (400, 392),
         (445, 395), (500, 385), (560, 370), (610, 352), (680, 315), (760, 270), (850, 215), (930, 170),
         (1000, 140), (1600, 100)]
HUMBER = [(205, 410), (200, 370), (186, 322), (190, 272), (166, 220), (150, 160), (130, 100), (112, 40), (102, -40)]
DON = [(472, 397), (466, 360), (472, 322), (490, 282), (505, 250)]
WEST_DON = [(505, 250), (480, 205), (455, 160), (440, 100), (428, 40), (422, -40)]
EAST_DON = [(505, 250), (530, 200), (545, 150), (552, 90), (560, -40)]
ROADS_MAJOR = {
    "401": [(-40, 178), (60, 172), (200, 160), (400, 140), (700, 128), (1040, 106)],
    "Gardiner": [(0, 448), (90, 436), (170, 410), (205, 398), (330, 386), (400, 380), (472, 382)],
    "DVP": [(472, 382), (482, 335), (500, 272), (522, 205), (540, 150), (548, 128), (552, -40)],
    "427": [(60, 452), (60, -40)],
    "400": [(172, 158), (160, 80), (150, -40)],
}
ROADS_MINOR = {
    "Yonge": [(400, 392), (400, -40)],
    "Bloor": [(40, 322), (300, 318), (400, 316), (520, 314), (620, 310)],
    "Eglinton": [(40, 252), (340, 246), (400, 246), (700, 238), (920, 230)],
    "St Clair": [(180, 286), (340, 283), (400, 283), (520, 280)],
    "Spadina": [(363, 395), (363, 246)],
    "Bathurst": [(340, 395), (340, -40)],
    "Avenue": [(389, 330), (389, 150)],
    "Kingston": [(560, 330), (700, 290), (850, 225), (980, 165)],
    "Allen": [(330, 246), (322, 160)],
}
ISLANDS = [(300, 424), (330, 436), (372, 442), (420, 443), (452, 430), (456, 418), (440, 416), (420, 426),
           (380, 430), (340, 426), (312, 416)]
SPIT = [(470, 398), (480, 420), (492, 446), (506, 462), (512, 458), (498, 440), (486, 414), (478, 396)]
HIGH_PARK = [(246, 322), (270, 322), (276, 350), (268, 372), (248, 372), (240, 346)]


def toronto_svg():
    o = []
    land = [(-600, -600), (1600, -600)] + list(reversed(SHORE))
    o.append(f'<path class="m-land" d="{pl(land)}Z"/>')
    lake = SHORE + [(1600, 1400), (-600, 1400)]
    o.append(f'<path class="m-lake" d="{pl(lake)}Z"/>')
    # ripple lines on the lake
    rip = "".join(pl([(x, y), (x + 60, y)]) for x, y in
                  ((560, 430), (640, 452), (720, 410), (300, 470), (420, 488), (820, 330), (900, 300), (120, 500), (680, 500)))
    o.append(f'<path class="m-ripple" d="{rip}"/>')
    o.append(f'<path class="m-land m-shore" d="{pl(ISLANDS)}Z"/>')
    o.append(f'<path class="m-land m-shore" d="{pl(SPIT)}Z"/>')
    o.append(f'<path class="m-shoreline" d="{smooth(SHORE[1:-1])}"/>')
    # ravines and parks
    for river in (HUMBER, DON, WEST_DON, EAST_DON):
        o.append(f'<path class="m-ravine" d="{smooth(river)}"/>')
    o.append(f'<path class="m-park" d="{pl(HIGH_PARK)}Z"/>')
    for river in (HUMBER, DON, WEST_DON, EAST_DON):
        o.append(f'<path class="m-river" d="{smooth(river)}"/>')
    # city limits (dashed)
    o.append('<path class="m-limit" d="M0 470L0 0L1000 0L1000 140"/>')
    # roads
    for pts in ROADS_MINOR.values():
        o.append(f'<path class="m-road" d="{smooth(pts)}"/>')
    for pts in ROADS_MAJOR.values():
        o.append(f'<path class="m-hwy" d="{smooth(pts)}"/>')
    # labels and the Forest Hill box go on their own layer, so they can fade before they grow
    lab = []
    x, y, w, h = FH_RECT
    lab.append(f'<path class="m-fh" d="M{x + 14} {y + 50}L{x + 70} {y + 50}L{x + 70} {y + 88}L{x + 14} {y + 88}Z"/>')
    # labels
    labels = [
        ("m-lbl m-lbl--lake", 640, 470, "Lake Ontario"),
        ("m-lbl m-lbl--area", 95, 270, "Etobicoke"),
        ("m-lbl m-lbl--area", 470, 60, "North York"),
        ("m-lbl m-lbl--area", 790, 150, "Scarborough"),
        ("m-lbl m-lbl--area", 405, 372, "Downtown"),
        ("m-lbl m-lbl--small", 130, 205, "Humber River"),
        ("m-lbl m-lbl--small", 512, 228, "Don Valley"),
        ("m-lbl m-lbl--small", 600, 122, "Hwy 401"),
        ("m-lbl m-lbl--small", 310, 458, "Toronto Islands"),
        ("m-lbl m-lbl--fh", 344, 232, "Forest Hill"),
    ]
    for cls, lx, ly, t in labels:
        lab.append(f'<text class="{cls}" x="{lx}" y="{ly}">{t}</text>')
    # north arrow (grid north)
    lab.append('<g class="m-north" transform="translate(960 470)"><circle r="14"/><path d="M0 -10L5 7L0 3L-5 7Z"/><text y="28">N</text></g>')
    return "".join(o), "".join(lab)


# =============================================================== FOREST HILL
W, H = FH_RECT[2] * FH_SCALE, FH_RECT[3] * FH_SCALE      # 900 x 1300


def to_fh(x, y):
    return ((x - FH_RECT[0]) * FH_SCALE, (y - FH_RECT[1]) * FH_SCALE)


# streets: (id, label or None, width, points, smooth?)
STREETS = [
    ("eglinton", "Eglinton Ave W", 16, [(-40, 510), (940, 495)], False),
    ("stclair", "St Clair Ave W", 16, [(-40, 882), (940, 876)], False),
    ("dupont", "Dupont St", 14, [(-40, 1170), (940, 1160)], False),
    ("bathurst", "Bathurst St", 16, [(200, -40), (200, 1340)], False),
    ("avenue", "Avenue Rd", 16, [(690, -40), (690, 1340)], False),
    ("yonge", "Yonge St", 16, [(800, -40), (800, 1340)], False),
    ("spadina", "Spadina Rd", 11, [(430, 330), (430, 1340)], False),
    ("fhr", "Forest Hill Rd", 11, [(612, 880), (600, 800), (570, 720), (552, 640), (566, 560), (590, 500), (604, 420), (614, 300), (622, 180), (630, -40)], True),
    ("lonsdale", "Lonsdale Rd", 10, [(430, 720), (690, 712)], False),
    # unnamed residential streets (drawn, not real names)
    ("r1", None, 8, [(200, 625), (270, 604), (340, 612), (430, 640)], True),
    ("r2", None, 8, [(200, 770), (300, 748), (370, 756), (430, 778)], True),
    ("r3", None, 8, [(318, 510), (326, 590), (312, 690), (320, 770)], True),
    ("r4", None, 8, [(200, 400), (690, 392)], False),
    ("r5", None, 8, [(200, 285), (690, 278)], False),
    ("r6", None, 8, [(200, 170), (690, 165)], False),
    ("r7", None, 8, [(330, -40), (332, 510)], False),
    ("r8", None, 8, [(520, -40), (518, 495)], False),
    ("r9", None, 8, [(430, 330), (430, -40)], False),
    ("r10", None, 8, [(612, 800), (690, 790)], False),
    ("r11", None, 8, [(570, 620), (690, 610)], False),
    ("r12", None, 8, [(520, 876), (500, 960), (510, 1060), (530, 1160)], True),
    ("r13", None, 8, [(200, 1010), (690, 1000)], False),
    ("r14", None, 8, [(320, 876), (322, 1165)], False),
    ("r15", None, 8, [(690, 330), (800, 326)], False),
    ("r16", None, 8, [(690, 620), (800, 616)], False),
    ("r17", None, 8, [(690, 1020), (800, 1018)], False),
    ("r18", None, 8, [(-40, 320), (200, 315)], False),
    ("r19", None, 8, [(-40, 1050), (200, 1046)], False),
    ("r20", None, 8, [(90, 1170), (95, 1340)], False),
]
RAVINE = [(-40, 560), (40, 610), (110, 700), (160, 790), (196, 860), (196, 900), (150, 880), (90, 790), (30, 700), (-40, 650)]
PARKS = [
    [(450, 820), (520, 818), (520, 866), (450, 868)],
    [(600, 640), (684, 636), (684, 704), (606, 708)],
    [(214, 1060), (300, 1058), (300, 1150), (214, 1152)],
]


def sample(points, step=6):
    """Points along a polyline (straightened curve) every `step` units."""
    out = []
    for (x0, y0), (x1, y1) in zip(points, points[1:]):
        L = math.hypot(x1 - x0, y1 - y0)
        n = max(1, int(L / step))
        for i in range(n):
            t = i / n
            out.append((x0 + (x1 - x0) * t, y0 + (y1 - y0) * t))
    out.append(points[-1])
    return out


SAMPLED = [(sid, w, sample(pts, 4)) for sid, _, w, pts, _ in STREETS]


def dist_to_streets(x, y, skip=None):
    best = 1e9
    for sid, w, pts in SAMPLED:
        if sid == skip:
            continue
        for px, py in pts:
            d = math.hypot(px - x, py - y) - w / 2
            if d < best:
                best = d
    return best


def inside(poly, x, y):
    c = False
    j = len(poly) - 1
    for i in range(len(poly)):
        xi, yi = poly[i]
        xj, yj = poly[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi + 1e-9) + xi:
            c = not c
        j = i
    return c


def fh_svg():
    lots, foot, trees, comm = [], [], [], []
    placed = []
    target = None
    for sid, label, w, pts, _ in STREETS:
        major = w >= 14
        front, depth = (9, 9) if major else (8.5, 22)
        for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
            L = math.hypot(x1 - x0, y1 - y0)
            dx, dy = (x1 - x0) / L, (y1 - y0) / L
            nx, ny = -dy, dx
            t = front * 0.8
            while t < L - front * 0.8:
                px, py = x0 + dx * t, y0 + dy * t
                for side in (1, -1):
                    off = w / 2 + 1.5
                    cx = px + nx * side * (off + depth / 2)
                    cy = py + ny * side * (off + depth / 2)
                    corners = []
                    for a, b in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
                        corners.append((cx + dx * a * front / 2 + nx * side * b * depth / 2,
                                        cy + dy * a * front / 2 + ny * side * b * depth / 2))
                    test = corners + [(cx, cy)]
                    if any(not (0 <= qx <= W and 0 <= qy <= H) for qx, qy in test):
                        continue
                    if any(dist_to_streets(qx, qy, sid) < 1.0 for qx, qy in test):
                        continue
                    if inside(RAVINE, cx, cy) or any(inside(p, cx, cy) for p in PARKS):
                        continue
                    if any(inside(q, cx, cy) or any(inside(q, a, b) for a, b in corners) for q in placed):
                        continue
                    placed.append(corners)
                    if major:
                        comm.append(corners)
                        continue
                    lots.append(corners)
                    # house footprint, set back from the street
                    fw, fd, sb = front * 0.62, depth * 0.36, 3.2 + random.random() * 1.5
                    fc = (px + nx * side * (off + sb + fd / 2), py + ny * side * (off + sb + fd / 2))
                    fp = []
                    for a, b in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
                        fp.append((fc[0] + dx * a * fw / 2 + nx * side * b * fd / 2,
                                   fc[1] + dy * a * fw / 2 + ny * side * b * fd / 2))
                    foot.append(fp)
                    # street tree in front, sometimes a backyard tree
                    if random.random() < 0.8:
                        tx, ty = px + nx * side * (w / 2 + 0.6) + dx * (random.random() - 0.5) * 4, py + ny * side * (w / 2 + 0.6)
                        trees.append((tx, ty, 2.2 + random.random() * 1.6))
                    if random.random() < 0.6:
                        bx = cx + nx * side * depth * 0.28 + dx * (random.random() - 0.5) * 4
                        by = cy + ny * side * depth * 0.28 + dy * (random.random() - 0.5) * 4
                        trees.append((bx, by, 2.6 + random.random() * 2))
                    if sid == "r2" and side == -1 and target is None and 330 < cx < 380:
                        target = (corners, (cx, cy), (dx, dy), (nx * side, ny * side))
                t += front
    def quads(qs):
        return "".join(pl(q) + "Z" for q in qs)

    def circles(cs):
        return "".join(f"M{f(x - r)} {f(y)}a{f(r)} {f(r)} 0 1 0 {f(2 * r)} 0a{f(r)} {f(r)} 0 1 0 {f(-2 * r)} 0" for x, y, r in cs)

    o = [f'<defs><radialGradient id="fh-fade" cx="50%" cy="50%" r="50%"><stop offset="62%" stop-color="#fff"/><stop offset="100%" stop-color="#000"/></radialGradient>'
         f'<mask id="fh-mask" maskUnits="userSpaceOnUse" x="-40" y="-40" width="{W + 80}" height="{H + 80}"><rect x="-40" y="-40" width="{W + 80}" height="{H + 80}" fill="url(#fh-fade)"/></mask></defs>',
         '<g mask="url(#fh-mask)">',
         f'<rect class="fh-land" x="-40" y="-40" width="{W + 80}" height="{H + 80}"/>',
         f'<path class="fh-ravine" d="{pl(RAVINE)}Z"/>',
         f'<path class="fh-park" d="{quads(PARKS)}"/>',
         f'<path class="fh-lot" d="{quads(lots)}"/>',
        ]
    for sid, label, w, pts, sm in STREETS:              # shop strips along the main roads
        if w >= 14:
            o.append(f'<path class="fh-comm" style="stroke-width:{w + 20}" d="{pl(pts)}"/>')
    for sid, label, w, pts, sm in STREETS:
        d = smooth(pts) if sm else pl(pts)
        o.append(f'<path class="fh-casing" style="stroke-width:{w + 1.6}" d="{d}"/>')
    for sid, label, w, pts, sm in STREETS:
        d = smooth(pts) if sm else pl(pts)
        o.append(f'<path class="fh-street" id="st-{sid}" style="stroke-width:{w}" d="{d}"/>')
    o.append(f'<path class="fh-foot" d="{quads(foot)}"/>')
    o.append(f'<path class="fh-tree" d="{circles(trees)}"/>')
    for sid, label, w, pts, sm in STREETS:
        if label:
            o.append(f'<text class="fh-lbl"><textPath href="#st-{sid}" startOffset="{18 if sid in ("bathurst", "avenue", "yonge") else 30}%">{label}</textPath></text>')
    o.append('<text class="fh-lbl fh-lbl--park" x="40" y="740" transform="rotate(52 40 740)">Cedarvale Ravine</text>')
    o.append("</g>")

    # the house we paint
    corners, (cx, cy), d, n = target
    o.append(f'<path class="fh-target" d="{pl(corners)}Z"/>')
    o.append(f'<g class="fh-pin" transform="translate({f(cx)} {f(cy - 14)})"><path d="M0 12C-6 4 -8 0 -8 -4A8 8 0 0 1 8 -4C8 0 6 4 0 12Z"/><circle cy="-4" r="3"/></g>')
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-40 -40 {W + 80} {H + 80}">'
           f'<g class="fh">{"".join(o)}</g></svg>')
    return svg, (cx, cy), corners


if __name__ == "__main__":
    tor, tor_labels = toronto_svg()
    fh, (tx, ty), corners = fh_svg()
    open(os.path.join(ROOT, "images", "scenes", "forest-hill.svg"), "w", encoding="utf-8").write(fh)
    index = os.path.join(ROOT, "index.html")
    html = open(index, encoding="utf-8").read()
    html, n = re.subn(r"(<!-- TORONTO:START -->).*?(<!-- TORONTO:END -->)", lambda m: m.group(1) + tor + m.group(2), html, flags=re.S)
    if not n:
        raise SystemExit("TORONTO markers not found in index.html")
    html, n = re.subn(r"(<!-- TORONTO-LABELS:START -->).*?(<!-- TORONTO-LABELS:END -->)", lambda m: m.group(1) + tor_labels + m.group(2), html, flags=re.S)
    if not n:
        raise SystemExit("TORONTO-LABELS markers not found in index.html")
    open(index, "w", encoding="utf-8").write(html)
    gx, gy = FH_RECT[0] + tx / FH_SCALE, FH_RECT[1] + ty / FH_SCALE
    print(f"toronto: {len(tor) // 1024} KB inline; forest-hill.svg: {len(fh) // 1024} KB")
    print(f"target house lot centre, Toronto map units: {gx:.2f}, {gy:.2f}  (copy into js/story.js HOUSE_AT)")
    xs = [FH_RECT[0] + c[0] / FH_SCALE for c in corners]
    ys = [FH_RECT[1] + c[1] / FH_SCALE for c in corners]
    print(f"target lot bounds: x {min(xs):.2f}..{max(xs):.2f}  y {min(ys):.2f}..{max(ys):.2f}")
