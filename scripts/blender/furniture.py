"""
Furniture and decor kit. Every builder takes a Placer (local frame: +x along the
piece, +y up, +z = the side it faces) and adds real-world-scaled, bevelled geometry.

Objects tagged "prop" are small decor lit per-vertex at runtime; everything else is
"static" and receives a baked lightmap.
"""
from __future__ import annotations

import math

import bmesh
from mathutils import Vector

from bl import PI, Placer, rand

PROP = "prop"


# ---------------------------------------------------------------- seating


def legs(p: Placer, mat: str, w: float, d: float, h: float, inset=0.08, r_top=0.022, r_bot=0.016, splay=0.0):
    for sx in (-1, 1):
        for sz in (-1, 1):
            x, z = sx * (w / 2 - inset), sz * (d / 2 - inset)
            p.cyl(mat, (x, h / 2, z), r_top, r_bot, h, 16, rot=(sz * splay, 0, -sx * splay))


def sofa(p: Placer, length: float, depth: float, mat: str, leg="walnut", seats=3, seed=1, arm="track"):
    """Low modern sofa: plinth, loose seat and back cushions, rounded arms."""
    seat_h = 0.42
    base_top = 0.26
    p.box(mat, (0, 0.17, 0.02), (length, 0.18, depth - 0.04), bevel=0.025)
    legs(p, leg, length - 0.05, depth - 0.1, 0.08, inset=0.06, r_top=0.02, r_bot=0.016)
    # back frame
    p.cushion(mat, (0, 0.5, -depth / 2 + 0.1), (length, 0.52, 0.2), puff=0.05, round_=0.5, seed=seed)
    # arms
    arm_w = 0.2
    for sx in (-1, 1):
        if arm == "track":
            p.cushion(mat, (sx * (length / 2 - arm_w / 2), 0.4, 0.02), (arm_w, 0.36, depth - 0.02), puff=0.06,
                      round_=0.6, seed=seed + sx)
        else:  # rolled
            p.cushion(mat, (sx * (length / 2 - arm_w / 2), 0.36, 0.02), (arm_w, 0.28, depth - 0.02), puff=0.05,
                      round_=0.6, seed=seed + sx)
            p.cyl(mat, (sx * (length / 2 - arm_w / 2), 0.52, 0.02), 0.11, 0.11, depth - 0.02, 24, rot=(PI / 2, 0, 0))
    inner = length - 2 * arm_w
    w = inner / seats
    r = rand(seed)
    for i in range(seats):
        x = -inner / 2 + w * (i + 0.5)
        p.cushion(mat, (x, base_top + 0.09 + 0.02, 0.06), (w - 0.012, 0.19, depth - 0.3), puff=0.22,
                  round_=0.45, seed=seed * 7 + i, wrinkle=0.006)
        p.cushion(mat, (x, seat_h + 0.25, -depth / 2 + 0.26), (w - 0.02, 0.46, 0.2), puff=0.4, round_=0.5,
                  rot=(-0.16 - 0.03 * r(), 0.02 * (r() - 0.5), 0), seed=seed * 13 + i, wrinkle=0.008)


def armchair(p: Placer, mat: str, leg="walnut", w=0.84, d=0.86, seed=3):
    p.box(mat, (0, 0.22, 0.02), (w, 0.2, d - 0.04), bevel=0.03)
    legs(p, leg, w - 0.04, d - 0.08, 0.12, inset=0.06, r_top=0.022, r_bot=0.015, splay=0.06)
    p.cushion(mat, (0, 0.55, -d / 2 + 0.1), (w, 0.62, 0.2), puff=0.08, round_=0.55, rot=(-0.08, 0, 0), seed=seed)
    for sx in (-1, 1):
        p.cushion(mat, (sx * (w / 2 - 0.08), 0.44, 0.02), (0.16, 0.34, d - 0.04), puff=0.08, round_=0.6,
                  seed=seed + sx)
    p.cushion(mat, (0, 0.4, 0.07), (w - 0.3, 0.16, d - 0.3), puff=0.25, round_=0.45, seed=seed + 5)
    p.cushion(mat, (0, 0.66, -d / 2 + 0.25), (w - 0.32, 0.4, 0.16), puff=0.35, round_=0.5, rot=(-0.14, 0, 0),
              seed=seed + 7)


def lounge_chair(p: Placer, mat: str, frame="oak", seed=5):
    """Rattan/cane lounge chair with a loose cushion."""
    w, d = 0.76, 0.8
    for sx in (-1, 1):
        p.tube(frame, [(sx * w / 2, 0.0, d / 2 - 0.05), (sx * w / 2, 0.55, d / 2 - 0.02), (sx * w / 2, 0.58, 0.0),
                       (sx * w / 2, 0.6, -d / 2 + 0.05), (sx * w / 2, 0.0, -d / 2 + 0.05)], 0.018)
        p.box(frame, (sx * w / 2, 0.58, 0.02), (0.05, 0.03, d - 0.06), bevel=0.01)
    p.box("rattan", (0, 0.36, 0.03), (w - 0.06, 0.03, d - 0.12), bevel=0.008)
    p.box("rattan", (0, 0.7, -d / 2 + 0.1), (w - 0.06, 0.6, 0.03), bevel=0.008, rot=(-0.22, 0, 0))
    p.box(frame, (0, 0.34, 0.03), (w, 0.035, d - 0.08), bevel=0.01)
    p.box(frame, (0, 1.0, -d / 2 + 0.03), (w, 0.04, 0.04), bevel=0.012, rot=(-0.22, 0, 0))
    p.cushion(mat, (0, 0.42, 0.05), (w - 0.1, 0.1, d - 0.16), puff=0.3, round_=0.4, seed=seed)


def dining_chair(p: Placer, mat="linen_sand", wood="walnut", seed=7):
    for sx in (-1, 1):
        for sz in (-1, 1):
            h = 0.44 if sz > 0 else 0.44
            p.cyl(wood, (sx * 0.2, h / 2, sz * 0.19), 0.018, 0.014, h, 12, rot=(sz * 0.04, 0, -sx * 0.03))
    p.box(wood, (0, 0.44, 0.0), (0.46, 0.04, 0.44), bevel=0.01)
    p.cushion(mat, (0, 0.5, 0.01), (0.46, 0.08, 0.45), puff=0.3, round_=0.5, seed=seed)
    # curved upholstered back
    for sx in (-1, 1):
        p.cyl(wood, (sx * 0.2, 0.68, -0.205), 0.016, 0.018, 0.48, 12, rot=(-0.1, 0, 0))
    p.cushion(mat, (0, 0.8, -0.23), (0.46, 0.34, 0.07), puff=0.2, round_=0.6, rot=(-0.1, 0, 0), seed=seed + 1)


def bench(p: Placer, mat: str, length=1.5, leg="brass"):
    p.cushion(mat, (0, 0.42, 0), (length, 0.14, 0.44), puff=0.12, round_=0.5)
    p.box(leg, (0, 0.33, 0), (length - 0.06, 0.02, 0.38), bevel=0.004)
    for sx in (-1, 1):
        for sz in (-1, 1):
            p.cyl(leg, (sx * (length / 2 - 0.08), 0.17, sz * 0.16), 0.012, 0.012, 0.34, 10)


def ottoman(p: Placer, mat: str, w=1.3, d=0.5, h=0.42):
    p.cushion(mat, (0, h / 2 + 0.04, 0), (w, h - 0.04, d), puff=0.1, round_=0.55)
    legs(p, "walnut", w, d, 0.05, inset=0.07, r_top=0.018, r_bot=0.018)


def pouf(p: Placer, mat: str, r=0.3, h=0.36):
    p.cushion(mat, (0, h / 2, 0), (r * 2, h, r * 2), puff=0.3, round_=1.2, res=12)


def recliner(p: Placer, mat: str, seed=9):
    p.box(mat, (0, 0.2, 0.04), (0.84, 0.28, 0.9), bevel=0.04)
    for sx in (-1, 1):
        p.cushion(mat, (sx * 0.36, 0.44, 0.02), (0.14, 0.34, 0.9), puff=0.1, round_=0.6, seed=seed + sx)
    p.cushion(mat, (0, 0.42, 0.1), (0.58, 0.18, 0.72), puff=0.25, round_=0.45, seed=seed + 3)
    p.cushion(mat, (0, 0.72, -0.34), (0.6, 0.66, 0.22), puff=0.3, round_=0.5, rot=(-0.2, 0, 0), seed=seed + 5)
    p.cushion(mat, (0, 0.98, -0.42), (0.5, 0.18, 0.2), puff=0.4, round_=0.6, rot=(-0.2, 0, 0), seed=seed + 7)
    p.box("walnut", (0.36, 0.62, 0.08), (0.15, 0.025, 0.5), bevel=0.008)
    p.cyl("black_metal", (0.36, 0.635, 0.25), 0.035, 0.035, 0.01, 20)


# ---------------------------------------------------------------- beds


def draped_sheet(p: Placer, mat: str, w: float, length: float, top: float, z0: float, drop_side: float,
                 drop_foot: float, thick=0.03, puff=0.035, seed=11, res=(44, 40), fold_back=0.0):
    """A duvet/throw lying on a mattress (top surface at y=top) from z0 to z0+length,
    falling over both sides and the foot with soft random folds."""
    r = rand(seed)
    phases = [r() * 6.28 for _ in range(8)]
    nu, nv = res
    bm = bmesh.new()
    total_u = w + 2 * drop_side
    total_v = length + drop_foot
    grid = []
    for j in range(nv + 1):
        t = j / nv * total_v
        row = []
        for i in range(nu + 1):
            s = i / nu * total_u - total_u / 2
            # flat top + drapes
            x = s
            y = top + puff * (1 - (2 * s / w) ** 4 if abs(s) < w / 2 else 0) * min(1, t / 0.25) * min(1, (length - t) / 0.25 if t < length else 0)
            z = z0 + t
            over_side = max(0.0, abs(s) - w / 2)
            if over_side > 0:
                k = over_side
                x = math.copysign(w / 2 + 0.015 + 0.08 * (1 - math.exp(-k * 6)) * 0.4, s)
                y = top - k + 0.02
                fold = math.sin(t * 9 + phases[0] + (s > 0) * 2) * 0.5 + math.sin(t * 17 + phases[1]) * 0.25
                x += math.copysign(1, s) * 0.022 * fold * min(1, k / 0.1)
            over_foot = max(0.0, t - length)
            if over_foot > 0:
                z = z0 + length + 0.015 + 0.03 * (1 - math.exp(-over_foot * 6))
                y = min(y, top - over_foot + 0.02)
                fold = math.sin(s * 11 + phases[2]) * 0.6 + math.sin(s * 23 + phases[3]) * 0.3
                z += 0.02 * fold * min(1, over_foot / 0.1)
            # corners: fold where both drapes meet
            if over_side > 0 and over_foot > 0:
                z = z0 + length + 0.015 + min(over_foot, over_side) * 0.3
            # gentle wrinkles on top
            y += 0.004 * math.sin(s * 13 + t * 7 + phases[4]) * (over_side == 0)
            row.append(bm.verts.new((x, -z, y)))
        grid.append(row)
    for j in range(nv):
        for i in range(nu):
            bm.faces.new((grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for f in bm.faces:
        if f.normal.z < -0.3:
            f.normal_flip()
    ob = p.mesh(mat, bm, smooth=True, angle=180)
    md = ob.modifiers.new("solid", "SOLIDIFY")
    md.thickness = thick
    md.offset = -1
    sub = ob.modifiers.new("sub", "SUBSURF")
    sub.levels = 1
    sub.render_levels = 1
    return ob


def bed(p: Placer, width: float, length: float, mattress_top: float, base: str, throw: str,
        head_h=1.3, head_style="channel", seed=21):
    """Bed with its headboard face at local z=0 and the foot towards +z."""
    w, L, top = width, length, mattress_top
    base_top = top - 0.26
    # upholstered base on a recessed plinth
    p.box("black_metal", (0, 0.04, L / 2), (w - 0.2, 0.08, L - 0.2), bevel=0.005)
    p.box(base, (0, (base_top + 0.08) / 2 + 0.04, L / 2), (w + 0.06, base_top - 0.08, L + 0.02), bevel=0.03)
    # mattress
    p.cushion("percale_white", (0, base_top + 0.13, L / 2 + 0.01), (w - 0.02, 0.24, L - 0.04), puff=0.06,
              round_=0.3, seed=seed, res=12)
    # fitted sheet shows at the head; duvet covers the lower 72%, folded back
    zd = L * 0.3
    draped_sheet(p, "percale_white", w, L - zd, top + 0.012, zd, 0.3, 0.22, thick=0.035, puff=0.05, seed=seed)
    p.cushion("percale_white", (0, top + 0.07, zd + 0.1), (w + 0.1, 0.1, 0.24), puff=0.3, round_=0.8, seed=seed + 1)
    # throw across the foot
    draped_sheet(p, throw, w + 0.06, 0.55, top + 0.07, L - 0.6, 0.36, 0.26, thick=0.012, puff=0.004, seed=seed + 2,
                 res=(40, 16))
    # headboard
    hb_w = w + 0.34
    if head_style == "channel":
        p.box(base, (0, head_h / 2 + 0.05, -0.05), (hb_w, head_h, 0.08), bevel=0.02)
        n = 7
        cw = hb_w / n
        for i in range(n):
            p.cushion(base, (-hb_w / 2 + cw * (i + 0.5), head_h / 2 + 0.05, 0.01), (cw - 0.006, head_h - 0.04, 0.09),
                      puff=0.3, round_=0.18, seed=seed + 10 + i, res=8)
    elif head_style == "wing":
        p.cushion(base, (0, head_h / 2 + 0.05, -0.02), (hb_w, head_h, 0.14), puff=0.18, round_=0.45, seed=seed + 3)
        for sx in (-1, 1):
            p.cushion(base, (sx * (hb_w / 2 + 0.04), head_h / 2 + 0.03, 0.12), (0.14, head_h - 0.1, 0.38),
                      puff=0.12, round_=0.55, seed=seed + 4 + sx)
    elif head_style == "cane":
        p.box("cane_frame", (0, head_h / 2 + 0.05, -0.04), (hb_w, head_h, 0.05), bevel=0.012)
        p.box("rattan", (0, head_h / 2 + 0.1, -0.012), (hb_w - 0.16, head_h - 0.2, 0.01))
        for sx in (-1, 1):
            p.cyl("cane_frame", (sx * (hb_w / 2 - 0.03), head_h / 2 + 0.06, -0.03), 0.028, 0.028, head_h + 0.1, 16)


def nightstand(p: Placer, wood="walnut", w=0.54, d=0.42, h=0.56, pull="brass", style="drawers"):
    if style == "drawers":
        p.box(wood, (0, h / 2 + 0.06, 0), (w, h - 0.12, d), bevel=0.006)
        p.box(wood, (0, h - 0.015, 0), (w + 0.02, 0.03, d + 0.02), bevel=0.006)
        for i, y in enumerate((0.22, 0.4)):
            p.box(wood, (0, y, d / 2 + 0.004), (w - 0.04, 0.155, 0.012), bevel=0.003)
            p.cyl(pull, (0, y, d / 2 + 0.018), 0.012, 0.012, 0.02, 14, rot=(PI / 2, 0, 0))
        legs(p, wood, w - 0.02, d - 0.02, 0.07, inset=0.05, r_top=0.018, r_bot=0.015)
    elif style == "marble":
        p.box("marble", (0, h - 0.02, 0), (w, 0.04, d), bevel=0.004)
        p.box("brass", (0, 0.28, 0), (w - 0.04, 0.015, d - 0.04), bevel=0.002)
        for sx in (-1, 1):
            for sz in (-1, 1):
                p.box("brass", (sx * (w / 2 - 0.03), (h - 0.04) / 2, sz * (d / 2 - 0.03)), (0.018, h - 0.04, 0.018))


def table_lamp(p: Placer, x: float, y: float, z: float, base="ceramic_white", s=1.0, style="gourd"):
    q = p.sub(x, z, dy=y)
    if style == "gourd":
        q.lathe(base, (0, 0, 0), [(0, 0), (0.07 * s, 0), (0.075 * s, 0.01 * s), (0.12 * s, 0.1 * s), (0.11 * s, 0.2 * s),
                                  (0.05 * s, 0.29 * s), (0.02 * s, 0.33 * s), (0.02 * s, 0.35 * s), (0, 0.35 * s)],
                seg=40, tag=PROP)
    elif style == "column":
        q.cyl(base, (0, 0.012 * s, 0), 0.07 * s, 0.07 * s, 0.024 * s, 32, tag=PROP)
        q.cyl(base, (0, 0.2 * s, 0), 0.018 * s, 0.018 * s, 0.36 * s, 16, tag=PROP)
    stem_top = 0.35 * s if style == "gourd" else 0.38 * s
    q.cyl("brass", (0, stem_top + 0.05 * s, 0), 0.008, 0.008, 0.1 * s, 8, tag=PROP)
    q.sphere("bulb", (0, stem_top + 0.12 * s, 0), 0.03 * s, seg=12, tag=PROP)
    q.light((0, stem_top + 0.12 * s, 0), 32 * s, radius=0.035)
    # drum shade: open cylinder with rim thickness
    sh = q.cyl("shade", (0, stem_top + 0.16 * s, 0), 0.13 * s, 0.17 * s, 0.22 * s, 40, open_ends=True, tag=PROP)
    md = sh.modifiers.new("solid", "SOLIDIFY")
    md.thickness = 0.004
    return q


def floor_lamp(p: Placer, h=1.6, base="marble", arc=False):
    p.cyl(base, (0, 0.015, 0), 0.16, 0.17, 0.03, 40, bevel=0.004, tag=PROP)
    p.cyl("brass", (0, h / 2, 0), 0.011, 0.011, h, 10, tag=PROP)
    p.sphere("bulb", (0, h - 0.02, 0), 0.032, seg=12, tag=PROP)
    p.light((0, h - 0.02, 0), 45, radius=0.04)
    sh = p.cyl("shade", (0, h + 0.03, 0), 0.17, 0.22, 0.3, 40, open_ends=True, tag=PROP)
    md = sh.modifiers.new("solid", "SOLIDIFY")
    md.thickness = 0.004


def pendant_globe(p: Placer, y: float, drop=0.9, r=0.18):
    p.cyl("brass", (0, y - 0.01, 0), 0.06, 0.06, 0.02, 24, tag=PROP)
    p.cyl("black_metal", (0, y - drop / 2, 0), 0.003, 0.003, drop, 6, tag=PROP)
    p.sphere("shade", (0, y - drop - r, 0), r, seg=32, tag=PROP)
    p.light((0, y - drop - r, 0), 60, radius=r * 0.5)


def halo_chandelier(p: Placer, y: float, R=0.78):
    p.torus("brass", (0, y, 0), R, 0.022, rot=(PI / 2, 0, 0), seg=96, tag=PROP)
    p.torus("brass", (0, y + 0.1, 0), R * 0.64, 0.016, rot=(PI / 2, 0, 0), seg=72, tag=PROP)
    for i in range(16):
        a = i / 16 * 2 * PI
        p.sphere("bulb", (math.cos(a) * R, y + 0.035, math.sin(a) * R), 0.03, seg=10, tag=PROP)
        p.light((math.cos(a) * R, y + 0.07, math.sin(a) * R), 7, radius=0.03)
    for i in range(3):
        a = i / 3 * 2 * PI
        p.cyl("brass", (math.cos(a) * 0.3, y + 0.55, math.sin(a) * 0.3), 0.003, 0.003, 0.95, 6,
              rot=(0.3 * math.sin(a), 0, -0.3 * math.cos(a)), tag=PROP)
    p.cyl("brass", (0, H_CEIL - 0.015, 0), 0.08, 0.08, 0.03, 24, tag=PROP)


H_CEIL = 3.4


def downlight(p: Placer, x: float, z: float):
    p.cyl("trim", (x, H_CEIL - 0.004, z), 0.05, 0.05, 0.01, 24, tag=PROP)
    p.cyl("bulb", (x, H_CEIL - 0.011, z), 0.032, 0.032, 0.004, 20, tag=PROP)
    p.light((x, H_CEIL - 0.02, z), 14, radius=0.03, kind="SPOT", spot=math.radians(75), direction=(0, -1, 0))


def sconce(p: Placer, y: float):
    p.box("brass", (0, y, 0.02), (0.08, 0.22, 0.03), bevel=0.006, tag=PROP)
    sh = p.cyl("shade", (0, y + 0.02, 0.13), 0.075, 0.075, 0.2, 32, open_ends=True, tag=PROP)
    md = sh.modifiers.new("solid", "SOLIDIFY")
    md.thickness = 0.003
    p.cyl("brass", (0, y, 0.07), 0.008, 0.008, 0.1, 8, rot=(PI / 2, 0, 0), tag=PROP)
    p.light((0, y + 0.02, 0.13), 18, radius=0.03)


# ---------------------------------------------------------------- tables & storage


def round_table(p: Placer, r: float, h: float, top="travertine", base="travertine", style="drum"):
    p.cyl(top, (0, h - 0.025, 0), r, r, 0.05, 72, bevel=0.008)
    if style == "drum":
        p.lathe(base, (0, 0, 0), [(0, 0), (r * 0.52, 0), (r * 0.46, 0.04), (r * 0.4, h * 0.5), (r * 0.46, h - 0.06),
                                  (r * 0.5, h - 0.05), (0, h - 0.05)], seg=64)
    else:
        p.cyl(base, (0, (h - 0.05) / 2, 0), 0.03, 0.03, h - 0.05, 16)
        p.cyl(base, (0, 0.01, 0), r * 0.5, r * 0.52, 0.02, 48)


def coffee_books(p: Placer, x: float, y: float, z: float, seed=1, n=3):
    r = rand(seed)
    yy = y
    for i in range(n):
        w, d, t = 0.3 + 0.06 * r(), 0.22 + 0.05 * r(), 0.025 + 0.015 * r()
        p.box(f"book_{1 + int(r() * 6) % 6}", (x + 0.01 * (r() - 0.5), yy + t / 2, z), (w, t, d), bevel=0.002,
              rot=(0, 0.3 * (r() - 0.5), 0), tag=PROP)
        yy += t


def side_table(p: Placer, h=0.55, top="travertine", r=0.24):
    p.cyl(top, (0, h - 0.02, 0), r, r, 0.04, 48, bevel=0.005)
    p.cyl("brass", (0, (h - 0.04) / 2, 0), 0.018, 0.018, h - 0.04, 12)
    p.cyl("brass", (0, 0.01, 0), r * 0.7, r * 0.72, 0.02, 40)


def sideboard(p: Placer, length: float, h=0.82, d=0.46, wood="walnut", top="travertine", doors=4):
    p.box(wood, (0, h / 2 + 0.07, 0), (length, h - 0.14, d), bevel=0.005)
    p.box(top, (0, h - 0.02, 0), (length + 0.03, 0.04, d + 0.02), bevel=0.004)
    dw = (length - 0.04) / doors
    for i in range(doors):
        x = -length / 2 + 0.02 + dw * (i + 0.5)
        p.box(wood, (x, h / 2 + 0.07, d / 2 + 0.006), (dw - 0.008, h - 0.2, 0.012), bevel=0.003)
        p.box("brass", (x + (dw / 2 - 0.06) * (1 if i % 2 == 0 else -1), h / 2 + 0.07, d / 2 + 0.018),
              (0.012, 0.16, 0.012), bevel=0.003)
    for sx in (-1, 1):
        for sz in (-1, 1):
            p.box(wood, (sx * (length / 2 - 0.06), 0.035, sz * (d / 2 - 0.06)), (0.04, 0.07, 0.04), bevel=0.004)


def dresser(p: Placer, length=1.6, h=0.86, d=0.48, wood="walnut"):
    p.box(wood, (0, h / 2 + 0.06, 0), (length, h - 0.12, d), bevel=0.006)
    p.box(wood, (0, h - 0.015, 0), (length + 0.02, 0.03, d + 0.02), bevel=0.006)
    rows, cols = 3, 2
    dh = (h - 0.16) / rows
    dw = (length - 0.04) / cols
    for i in range(rows):
        for j in range(cols):
            x = -length / 2 + 0.02 + dw * (j + 0.5)
            y = 0.1 + dh * (i + 0.5)
            p.box(wood, (x, y, d / 2 + 0.006), (dw - 0.008, dh - 0.008, 0.012), bevel=0.003)
            p.box("brass", (x, y + dh * 0.28, d / 2 + 0.016), (0.14, 0.012, 0.012), bevel=0.003)
    legs(p, wood, length - 0.04, d - 0.04, 0.06, inset=0.06, r_top=0.02, r_bot=0.016)


def dining_table(p: Placer, length=3.0, width=1.1, h=0.75):
    p.box("walnut", (0, h - 0.025, 0), (length, 0.05, width), bevel=0.01)
    for x in (-length * 0.3, length * 0.3):
        p.box("travertine", (x, (h - 0.05) / 2 + 0.03, 0), (0.22, h - 0.11, width * 0.56), bevel=0.01)
        p.box("travertine", (x, 0.03, 0), (0.46, 0.06, width * 0.74), bevel=0.01)


def desk(p: Placer, length=1.9, d=0.85, h=0.75):
    p.box("walnut", (0, h - 0.025, 0), (length, 0.05, d), bevel=0.008)
    p.box("leather_cognac", (0, h + 0.002, 0.05), (0.72, 0.004, 0.5), bevel=0.002)
    for sx in (-1, 1):
        p.box("walnut", (sx * (length / 2 - 0.05), (h - 0.05) / 2, 0), (0.06, h - 0.05, d - 0.06), bevel=0.006)
    p.box("walnut", (length / 2 - 0.45, h - 0.16, 0), (0.7, 0.18, d - 0.1), bevel=0.005)
    p.box("walnut", (length / 2 - 0.45, h - 0.16, d / 2 - 0.045), (0.66, 0.14, 0.012), bevel=0.003)
    p.box("brass", (length / 2 - 0.45, h - 0.16, d / 2 - 0.035), (0.14, 0.012, 0.012), bevel=0.003)


def desk_chair(p: Placer, mat="leather_cognac"):
    p.cyl("black_metal", (0, 0.24, 0), 0.025, 0.025, 0.4, 12)
    for i in range(5):
        a = i / 5 * 2 * PI
        p.box("black_metal", (math.cos(a) * 0.16, 0.035, math.sin(a) * 0.16), (0.32, 0.03, 0.035),
              rot=(0, -a, 0), bevel=0.008)
        p.sphere("black_metal", (math.cos(a) * 0.3, 0.025, math.sin(a) * 0.3), 0.025, seg=10)
    p.cushion(mat, (0, 0.48, 0), (0.54, 0.09, 0.5), puff=0.2, round_=0.6)
    p.cushion(mat, (0, 0.82, -0.23), (0.5, 0.5, 0.08), puff=0.2, round_=0.6, rot=(-0.12, 0, 0))
    for sx in (-1, 1):
        p.box("black_metal", (sx * 0.27, 0.6, -0.05), (0.02, 0.02, 0.36), bevel=0.006)


def books_row(p: Placer, x0: float, x1: float, y: float, z: float, depth: float, seed: int):
    r = rand(seed)
    x = x0
    while x < x1 - 0.05:
        v = r()
        if v < 0.07:  # a gap with a small object
            if r() < 0.5:
                p.lathe("ceramic_white" if r() < 0.5 else "ceramic_dark", (x + 0.06, y, z),
                        [(0, 0), (0.04, 0), (0.05, 0.06), (0.03, 0.14), (0.02, 0.16), (0, 0.16)], seg=20, tag=PROP)
            x += 0.14
            continue
        if v < 0.14:  # a lying stack
            yy = y
            for i in range(2 + int(r() * 3)):
                t = 0.025 + r() * 0.02
                p.box(f"book_{1 + int(r() * 6) % 6}", (x + 0.12, yy + t / 2, z), (0.22 + 0.04 * r(), t, depth * 0.85),
                      tag=PROP)
                yy += t
            x += 0.27
            continue
        t = 0.022 + r() * 0.032
        h = 0.2 + r() * 0.11
        tilt = 0.0 if r() < 0.85 else 0.12
        p.box(f"book_{1 + int(r() * 6) % 6}", (x + t / 2, y + h / 2, z), (t, h, depth * (0.78 + 0.18 * r())),
              rot=(0, 0, -tilt), bevel=0.0015, tag=PROP)
        x += t + 0.002 + tilt * h


def bookcase(p: Placer, width: float, height: float, depth: float, shelves: int, seed: int, wood="walnut"):
    bays = max(1, round(width / 0.9))
    p.box(wood, (0, height / 2, -depth / 2 + 0.01), (width, height, 0.02))
    for sx in (-1, 1):
        p.box(wood, (sx * (width / 2 - 0.02), height / 2, 0), (0.04, height, depth), bevel=0.004)
    for b in range(1, bays):
        p.box(wood, (-width / 2 + width * b / bays, height / 2, 0), (0.03, height, depth), bevel=0.003)
    p.box(wood, (0, 0.05, 0.005), (width, 0.1, depth - 0.01), bevel=0.003)
    for i in range(shelves + 1):
        y = 0.1 + (height - 0.14) * i / shelves
        p.box(wood, (0, y, 0), (width, 0.035, depth), bevel=0.003)
        if i < shelves:
            for b in range(bays):
                bx0 = -width / 2 + width * b / bays + 0.04
                bx1 = -width / 2 + width * (b + 1) / bays - 0.03
                books_row(p, bx0, bx1, y + 0.018, 0.02, depth - 0.06, seed + i * 17 + b * 5)


# ---------------------------------------------------------------- decor


def rug(p: Placer, w: float, d: float, mat: str, round_=False):
    if round_:
        p.cyl(mat, (0, 0.007, 0), w / 2, w / 2, 0.014, 96, bevel=0.004)
    else:
        p.box(mat, (0, 0.007, 0), (w, 0.014, d), bevel=0.005)


def vase(p: Placer, x: float, y: float, z: float, mat="ceramic_white", s=1.0, style="amphora", stems=0, seed=1):
    q = p.sub(x, z, dy=y)
    prof = {
        "amphora": [(0, 0), (0.07, 0), (0.1, 0.03), (0.12, 0.12), (0.1, 0.26), (0.05, 0.34), (0.045, 0.38), (0.055, 0.4), (0, 0.395)],
        "bottle": [(0, 0), (0.07, 0), (0.08, 0.02), (0.085, 0.18), (0.05, 0.24), (0.022, 0.3), (0.022, 0.4), (0.028, 0.41), (0, 0.405)],
        "bowl": [(0, 0), (0.08, 0), (0.16, 0.05), (0.2, 0.12), (0.19, 0.125), (0, 0.06)],
        "jar": [(0, 0), (0.09, 0), (0.12, 0.05), (0.13, 0.16), (0.1, 0.24), (0.08, 0.26), (0, 0.26)],
    }[style]
    q.lathe(mat, (0, 0, 0), [(a * s, b * s) for a, b in prof], seg=40, tag=PROP)
    if stems:
        top = prof[-2][1] * s
        r = rand(seed)
        for i in range(stems):
            a = r() * 2 * PI
            lean = 0.12 + 0.2 * r()
            L = (0.45 + 0.35 * r()) * s * 1.6
            pts = [(0, top - 0.05, 0)]
            for k in range(1, 6):
                t = k / 5
                pts.append((math.cos(a) * lean * L * t ** 1.5, top + L * t, math.sin(a) * lean * L * t ** 1.5))
            q.tube("bark", pts, 0.003, seg=5, tag=PROP)
            for k in range(3, 12):
                t = k / 12
                px = math.cos(a) * lean * L * t ** 1.5
                pz = math.sin(a) * lean * L * t ** 1.5
                py = top + L * t
                side = 1 if k % 2 else -1
                leaf(q, "olive_leaf", (px, py, pz), 0.07 * s, 0.018 * s, a + side * 1.2, 0.6, seed=seed + k)


def leaf(p: Placer, mat: str, pos, length: float, width: float, yaw: float, droop: float, seed=0):
    """A curved lanceolate leaf: base at pos, pointing out along yaw."""
    bm = bmesh.new()
    n = 6
    rows = []
    for i in range(n + 1):
        t = i / n
        wdt = width * math.sin(math.pi * min(1, t * 1.05)) * (1 - 0.3 * t)
        y = -droop * length * t * t
        xs = (-wdt / 2, 0, wdt / 2)
        rows.append([bm.verts.new((length * t, x, y + (0.15 * width if x == 0 else 0))) for x in xs])
    for a, b in zip(rows, rows[1:]):
        bm.faces.new((a[0], a[1], b[1], b[0]))
        bm.faces.new((a[1], a[2], b[2], b[1]))
    ob = p.mesh(mat, bm, pos=pos, rot=(0, yaw, 0), smooth=True, angle=180, tag=PROP)
    return ob


def plant(p: Placer, pot_r=0.25, pot_h=0.46, height=1.5, pot="terracotta", seed=1, kind="fig"):
    r = rand(seed)
    p.lathe(pot, (0, 0, 0), [(0, 0), (pot_r * 0.72, 0), (pot_r * 0.78, 0.02), (pot_r, pot_h * 0.9),
                              (pot_r * 1.04, pot_h), (pot_r * 0.95, pot_h), (pot_r * 0.9, pot_h * 0.94),
                              (0, pot_h * 0.94)], seg=48, tag=PROP)
    p.cyl("soil", (0, pot_h * 0.93, 0), pot_r * 0.9, pot_r * 0.9, 0.01, 32, tag=PROP)
    if kind == "fig":
        # a few stems carrying large, glossy fiddle-leaf fig leaves
        for s_i in range(3):
            a0 = r() * 2 * PI
            lean = 0.08 + 0.12 * r()
            L = height * (0.75 + 0.25 * r())
            pts = []
            for k in range(7):
                t = k / 6
                pts.append((math.cos(a0) * lean * t * L * 0.5, pot_h * 0.9 + L * t, math.sin(a0) * lean * t * L * 0.5))
            p.tube("bark", pts, 0.012 * (1.2 - 0.3 * s_i / 2), seg=7, tag=PROP)
            for k in range(6, 22):
                t = k / 22
                px = math.cos(a0) * lean * t * L * 0.5
                pz = math.sin(a0) * lean * t * L * 0.5
                py = pot_h * 0.9 + L * t
                yaw = r() * 2 * PI
                size = 0.22 + 0.1 * r() * (1 - t * 0.4)
                leaf(p, "leaf", (px, py, pz), size, size * 0.62, yaw, 0.25 + 0.3 * r(), seed=seed + k)
    elif kind == "olive":
        trunk = [(0, pot_h * 0.9, 0), (0.03, pot_h + height * 0.3, 0.01), (-0.02, pot_h + height * 0.55, 0.02)]
        p.tube("bark", trunk, 0.03, seg=8, tag=PROP)
        for b in range(5):
            a0 = r() * 2 * PI
            base = (-0.02, pot_h + height * (0.45 + 0.1 * r()), 0.02)
            tip = (math.cos(a0) * 0.35, pot_h + height * (0.8 + 0.2 * r()), math.sin(a0) * 0.35)
            p.tube("bark", [base, ((base[0] + tip[0]) / 2, (base[1] + tip[1]) / 2 + 0.05, (base[2] + tip[2]) / 2), tip],
                   0.012, seg=6, tag=PROP)
            for k in range(26):
                t = r()
                px = base[0] + (tip[0] - base[0]) * t + 0.12 * (r() - 0.5)
                py = base[1] + (tip[1] - base[1]) * t + 0.12 * (r() - 0.5)
                pz = base[2] + (tip[2] - base[2]) * t + 0.12 * (r() - 0.5)
                leaf(p, "olive_leaf", (px, py, pz), 0.08, 0.018, r() * 2 * PI, 0.3, seed=seed + b * 31 + k)


def artwork(p: Placer, mat: str, w: float, h: float, frame="walnut", mat_border=0.0):
    """Framed canvas on a wall. p's origin is the wall face, facing +z."""
    fw = 0.035
    p.box(frame, (0, 0, 0.02), (w + 2 * fw, h + 2 * fw, 0.04), bevel=0.004)
    if mat_border:
        p.box("paper", (0, 0, 0.041), (w, h, 0.002))
        p.plane(mat, (0, 0, 0.0425), w - 2 * mat_border, h - 2 * mat_border)
    else:
        p.plane(mat, (0, 0, 0.0412), w, h)


def round_mirror(p: Placer, r=0.5, frame="brass"):
    p.torus(frame, (0, 0, 0.02), r, 0.02, seg=96, ring=12)
    p.cyl("mirror", (0, 0, 0.018), r, r, 0.006, 96, rot=(PI / 2, 0, 0))
