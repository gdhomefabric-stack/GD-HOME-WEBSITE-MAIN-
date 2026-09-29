"""
Room shells (walls with window/door openings, reveals, steel windows, panelled doors,
skirting, cornice, floor, ceiling) and the furnishing of each of the eight rooms.
Positions follow src/data/villa.ts (three.js frame, metres).
"""
from __future__ import annotations

import math

import furniture as F
from bl import LAYOUT, PI, H, Kit, Placer, collection

EXT = LAYOUT["extWall"]
INT = LAYOUT["intWall"]
ROOMS = {r["id"]: r for r in LAYOUT["rooms"]}
WINDOWS = LAYOUT["windows"]
DOORS = LAYOUT["doors"]
BEDS = {b["roomId"]: b for b in LAYOUT["beds"]}

STYLE = {
    "living": {"wall": "wall_warm", "floor": "floor_travertine", "trim": "trim"},
    "dining": {"wall": "wall_warm", "floor": "floor_walnut", "trim": "trim"},
    "guest": {"wall": "wall_mist", "floor": "floor_oak", "trim": "trim"},
    "nursery": {"wall": "wall_blush", "floor": "floor_oak", "trim": "trim"},
    "theatre": {"wall": "wall_dark", "floor": "carpet_theatre", "trim": "trim_dark"},
    "study": {"wall": "wall_green", "floor": "floor_walnut", "trim": "trim_green"},
    "master": {"wall": "wall_greige", "floor": "floor_oak", "trim": "trim"},
    "suite": {"wall": "wall_taupe", "floor": "floor_travertine", "trim": "trim"},
}


def thick(line: float, axis: str) -> float:
    if axis == "z":
        return EXT if abs(abs(line) - 7) < 1e-6 else INT
    return EXT if abs(abs(line) - 15) < 1e-6 else INT


def inner(room) -> tuple[float, float, float, float]:
    x0, z0, x1, z1 = room["bounds"]
    return (x0 + thick(x0, "x") / 2, z0 + thick(z0, "z") / 2, x1 - thick(x1, "x") / 2, z1 - thick(z1, "z") / 2)


def openings(room, side: str):
    """Openings on one side of a room: list of dicts (a, b, bottom, top, kind, ...).
    side: N (z0), S (z1), W (x0), E (x1)."""
    x0, z0, x1, z1 = room["bounds"]
    out = []
    if side in ("N", "S"):
        z = z0 if side == "N" else z1
        if abs(abs(z) - 7) < 1e-6:
            for w in WINDOWS:
                if w["roomId"] == room["id"]:
                    out.append({"a": w["x"] - w["width"] / 2, "b": w["x"] + w["width"] / 2, "bottom": w["sill"],
                                "top": w["head"], "kind": "window", "win": w})
        else:
            key = "gallery-N" if z == -1 else "gallery-S"
            for d in DOORS:
                if d["wall"] == key and x0 < d["centre"] < x1:
                    out.append({"a": d["centre"] - d["width"] / 2, "b": d["centre"] + d["width"] / 2, "bottom": 0,
                                "top": d["height"], "kind": "door"})
    else:
        x = x0 if side == "W" else x1
        for d in DOORS:
            if d["wall"] == f"x={x:g}" and z0 < d["centre"] < z1:
                out.append({"a": d["centre"] - d["width"] / 2, "b": d["centre"] + d["width"] / 2, "bottom": 0,
                            "top": d["height"], "kind": "door"})
    return sorted(out, key=lambda o: o["a"])


def shell(kit: Kit, room):
    rid = room["id"]
    st = STYLE[rid]
    ix0, iz0, ix1, iz1 = inner(room)
    cx, cz = (ix0 + ix1) / 2, (iz0 + iz1) / 2
    W, D = ix1 - ix0, iz1 - iz0
    P = Placer(kit, 0, 0)
    # floor & ceiling slabs (overlap the walls to seal the box)
    P.box(st["floor"], (cx, -0.05, cz), (W + 0.02, 0.1, D + 0.02))
    P.box("ceiling", (cx, H + 0.05, cz), (W + 0.02, 0.1, D + 0.02))

    sides = {
        # side: (axis along, fixed coord of inner face, outward sign, along range)
        "N": ("x", iz0, -1, (ix0, ix1)),
        "S": ("x", iz1, 1, (ix0, ix1)),
        "W": ("z", ix0, -1, (iz0, iz1)),
        "E": ("z", ix1, 1, (iz0, iz1)),
    }
    for side, (axis, face, sign, (a0, a1)) in sides.items():
        t = EXT if (side in "NS" and abs(abs(room["bounds"][1 if side == "N" else 3]) - 7) < 1e-6) or (
            side in "WE" and abs(abs(room["bounds"][0 if side == "W" else 2]) - 15) < 1e-6) else max(INT, 0.2)
        ops = openings(room, side)
        wall_slab(P, st["wall"], axis, face, sign, a0 - t, a1 + t, t, ops)
        for o in ops:
            if o["kind"] == "window":
                window(kit, o["win"], face, sign, t)
            else:
                door(kit, axis, face, sign, o, st["trim"])
        skirting(P, st["trim"], axis, face, sign, a0, a1, ops)
        cornice(P, st["trim"], axis, face, sign, a0, a1)


def _put(P: Placer, mat: str, axis: str, face: float, sign: int, t: float, a: float, b: float, y0: float, y1: float):
    if b - a < 1e-4 or y1 - y0 < 1e-4:
        return
    across = face + sign * t / 2
    if axis == "x":
        P.box(mat, ((a + b) / 2, (y0 + y1) / 2, across), (b - a, y1 - y0, t))
    else:
        P.box(mat, (across, (y0 + y1) / 2, (a + b) / 2), (t, y1 - y0, b - a))


def wall_slab(P: Placer, mat: str, axis: str, face: float, sign: int, a0: float, a1: float, t: float, ops):
    cursor = a0
    for o in ops:
        _put(P, mat, axis, face, sign, t, cursor, o["a"], -0.1, H + 0.1)
        _put(P, mat, axis, face, sign, t, o["a"], o["b"], -0.1, o["bottom"])
        _put(P, mat, axis, face, sign, t, o["a"], o["b"], o["top"], H + 0.1)
        cursor = o["b"]
    _put(P, mat, axis, face, sign, t, cursor, a1, -0.1, H + 0.1)


def skirting(P: Placer, mat: str, axis: str, face: float, sign: int, a0: float, a1: float, ops):
    h, d = 0.14, 0.018
    cursor = a0
    segs = []
    for o in ops:
        if o["bottom"] < h:
            segs.append((cursor, o["a"] - (0.07 if o["kind"] == "door" else 0)))
            cursor = o["b"] + (0.07 if o["kind"] == "door" else 0)
    segs.append((cursor, a1))
    for a, b in segs:
        if b - a < 0.02:
            continue
        c = face - sign * d / 2
        if axis == "x":
            P.box(mat, ((a + b) / 2, h / 2, c), (b - a, h, d), bevel=0.003, segs=2)
            P.box(mat, ((a + b) / 2, h + 0.004, c + sign * 0.004), (b - a, 0.012, d - 0.008), bevel=0.004, segs=2)
        else:
            P.box(mat, (c, h / 2, (a + b) / 2), (d, h, b - a), bevel=0.003, segs=2)
            P.box(mat, (c + sign * 0.004, h + 0.004, (a + b) / 2), (d - 0.008, 0.012, b - a), bevel=0.004, segs=2)


def cornice(P: Placer, mat: str, axis: str, face: float, sign: int, a0: float, a1: float):
    """Stepped crown moulding at the wall/ceiling junction."""
    steps = [(0.12, 0.028), (0.075, 0.055), (0.035, 0.085)]  # (height below ceiling, projection)
    for hh, pr in steps:
        c = face - sign * pr / 2
        y = H - hh / 2
        if axis == "x":
            P.box(mat, ((a0 + a1) / 2, y, c), (a1 - a0, hh, pr), bevel=0.004, segs=2)
        else:
            P.box(mat, (c, y, (a0 + a1) / 2), (pr, hh, a1 - a0), bevel=0.004, segs=2)


def window(kit: Kit, w, face: float, sign: int, t: float):
    """Slim bronze-black steel window set 2/3 into the wall, with an interior stone stool."""
    x, width, sill, head = w["x"], w["width"], w["sill"], w["head"]
    # frame plane: a local frame at the window centre on the inner face, facing into the room
    ry = 0.0 if sign > 0 else PI  # S facade (sign +1): face into room = -z  -> ry = PI? see below
    # local +z must point into the room: into-room direction is -sign along z
    ry = PI if sign > 0 else 0.0
    p = Placer(kit, x, face, ry)
    depth = t * 0.62  # frame sits this far behind the inner face (towards outside)
    fw = 0.055
    hgt = head - sill
    my = (sill + head) / 2
    fr = "window_frame"
    z = -depth
    p.box(fr, (0, head - fw / 2, z), (width, fw, 0.07), bevel=0.004)
    p.box(fr, (0, sill + fw / 2, z), (width, fw, 0.07), bevel=0.004)
    for sx in (-1, 1):
        p.box(fr, (sx * (width / 2 - fw / 2), my, z), (fw, hgt, 0.07), bevel=0.004)
    panes = max(2, round(width / 1.1))
    for i in range(1, panes):
        xx = -width / 2 + width * i / panes
        p.box(fr, (xx, my, z), (0.04, hgt - 2 * fw, 0.06), bevel=0.003)
    ty = sill + hgt * 0.78
    p.box(fr, (0, ty, z), (width - 2 * fw, 0.035, 0.055), bevel=0.003)
    # handles on the central mullion
    p.box("brass", (-width / 2 + width / panes - 0.03, sill + 1.05, z + 0.045), (0.015, 0.14, 0.02), bevel=0.004,
          tag="prop")
    p.plane("glass", (0, my, z - 0.005), width - 2 * fw, hgt - 2 * fw, uv01=False, tag="glass")
    if sill > 0.15:
        # stone stool projecting into the room
        p.box("sill", (0, sill - 0.02, -depth / 2 + 0.02), (width + 0.1, 0.04, depth + 0.04 + 0.04), bevel=0.006)


def door(kit: Kit, axis: str, face: float, sign: int, o, trim: str):
    """A closed panelled door with architrave and lever handle, seen from inside the room."""
    a, b, top = o["a"], o["b"], o["top"]
    wdt = b - a
    c = (a + b) / 2
    if axis == "x":
        ry = PI if sign > 0 else 0.0
        p = Placer(kit, c, face, ry)
    else:
        ry = -PI / 2 if sign > 0 else PI / 2
        p = Placer(kit, face, c, ry)
    leafs = 2 if wdt > 1.35 else 1
    lw = wdt / leafs
    zl = -0.06  # leaf sits back in the opening
    for i in range(leafs):
        lx = -wdt / 2 + lw * (i + 0.5)
        p.box(trim, (lx, top / 2, zl), (lw - 0.006, top - 0.005, 0.045), bevel=0.003)
        # two tall panels with raised fields
        for (py, ph) in ((top * 0.28, top * 0.42), (top * 0.73, top * 0.42)):
            p.box(trim, (lx, py, zl + 0.024), (lw - 0.22, ph, 0.008), bevel=0.006, segs=3)
        hx = lx + (lw / 2 - 0.08) * (1 if (i == 0 and leafs == 2) or leafs == 1 else -1)
        if leafs == 2:
            hx = lx + (lw / 2 - 0.08) * (1 if i == 0 else -1)
        p.cyl("brass", (hx, 1.02, zl + 0.03), 0.028, 0.028, 0.012, 24, rot=(PI / 2, 0, 0), tag="prop")
        p.box("brass", (hx - 0.06 * (1 if hx > lx else -1), 1.02, zl + 0.055), (0.12, 0.018, 0.018), bevel=0.006,
              tag="prop")
    # architrave
    aw, ad = 0.075, 0.022
    p.box(trim, (-wdt / 2 - aw / 2 + 0.01, top / 2 + 0.02, ad / 2), (aw, top + 0.04, ad), bevel=0.004)
    p.box(trim, (wdt / 2 + aw / 2 - 0.01, top / 2 + 0.02, ad / 2), (aw, top + 0.04, ad), bevel=0.004)
    p.box(trim, (0, top + aw / 2, ad / 2), (wdt + 2 * aw - 0.02, aw, ad), bevel=0.004)
    # light switch beside the door
    p.box(trim, (wdt / 2 + 0.2, 1.1, 0.005), (0.085, 0.085, 0.01), bevel=0.002, tag="prop")
    p.box("brass", (wdt / 2 + 0.2, 1.1, 0.012), (0.012, 0.02, 0.006), bevel=0.001, tag="prop")


# ---------------------------------------------------------------- furnishing

face_to = lambda dx, dz: math.atan2(dx, dz)  # noqa: E731


def living(k: Kit):
    # fireplace on the west wall (x inner face ~ -14.85)
    Fp = Placer(k, -14.85, 3.8, PI / 2)
    Fp.box("travertine", (0, H / 2, 0.19), (2.6, H, 0.38), bevel=0.006)
    Fp.box("travertine", (0, 0.62, 0.45), (1.95, 1.24, 0.16), bevel=0.008)
    Fp.box("soot", (0, 0.5, 0.49), (1.05, 0.72, 0.12))
    Fp.box("travertine", (0, 1.25, 0.46), (2.3, 0.06, 0.3), bevel=0.008)
    Fp.box("travertine", (0, 0.025, 0.72), (2.4, 0.05, 0.5), bevel=0.006)
    for i in range(3):
        Fp.tube("bark", [(-0.32 + i * 0.05, 0.17 + i * 0.07, 0.45 + i * 0.01), (0.3 - i * 0.04, 0.17 + i * 0.07, 0.47)],
                0.045 - i * 0.006, seg=10, tag="prop")
    F.artwork(Fp.sub(0, 0.38, dy=2.2), "art_3", 1.1, 1.4, frame="walnut")
    F.vase(Fp, -0.85, 1.28, 0.44, "ceramic_dark", 0.8, "bottle")
    F.vase(Fp, 0.8, 1.28, 0.44, "ceramic_white", 0.7, "amphora", stems=5, seed=3)
    F.rug(Placer(k, -9.6, 3.1), 4.6, 3.4, "rug_ivory")
    F.sofa(Placer(k, -9.6, 1.62), 3.2, 1.0, "boucle", "walnut", 3, seed=4)
    S = Placer(k, -9.6, 1.62)
    for x, mat, yaw in ((-1.1, "velvet_cognac", 0.12), (1.1, "velvet_cognac", -0.12), (0.72, "linen_sand", -0.06)):
        S.cushion(mat, (x, 0.62, -0.18), (0.48, 0.46, 0.15), rot=(-0.28, yaw, 0), puff=0.45, round_=0.6,
                  seed=int(x * 10) + 40, tag="prop")
    F.round_table(Placer(k, -9.6, 3.2), 0.62, 0.36)
    F.coffee_books(Placer(k, -9.6, 3.2), -0.18, 0.36, 0.1, seed=5)
    F.vase(Placer(k, -9.6, 3.2), 0.2, 0.36, -0.12, "ceramic_sage", 0.55, "jar")
    F.armchair(Placer(k, -10.95, 4.55, PI + 0.3), "velvet_taupe", seed=6)
    F.armchair(Placer(k, -8.25, 4.55, PI - 0.3), "velvet_taupe", seed=7)
    st = Placer(k, -7.55, 1.62)
    F.side_table(st)
    F.table_lamp(st, 0, 0.55, 0, "ceramic_white", 1.0)
    F.floor_lamp(Placer(k, -11.7, 1.5), 1.62)
    F.artwork(Placer(k, -9.6, 1.08, 0, 1.95), "art_1", 2.0, 1.25)
    C = Placer(k, -4.28, 5.1, -PI / 2)
    F.sideboard(C, 1.6, 0.8, 0.42, doors=3)
    F.vase(C, -0.45, 0.8, 0, "ceramic_dark", 0.9, "amphora")
    F.coffee_books(C, 0.35, 0.8, 0, seed=8, n=2)
    F.plant(Placer(k, -4.6, 6.35), 0.27, 0.5, 1.7, "terracotta", seed=3, kind="fig")
    F.plant(Placer(k, -14.3, 6.3), 0.24, 0.46, 1.5, "stone_pot", seed=5, kind="olive")
    for x in (-13, -10.5, -8, -5.5):
        for z in (2.2, 5.0):
            F.downlight(Placer(k, 0, 0), x, z)


def dining(k: Kit):
    F.rug(Placer(k, -0.5, 3.95), 4.3, 2.9, "rug_sand")
    F.dining_table(Placer(k, -0.5, 3.95))
    for x in (-1.1, 0, 1.1):
        F.dining_chair(Placer(k, -0.5 + x, 3.95 - 0.8), seed=int(x * 10) + 20)
        F.dining_chair(Placer(k, -0.5 + x, 3.95 + 0.8, PI), seed=int(x * 10) + 30)
    F.dining_chair(Placer(k, -0.5 - 1.82, 3.95, PI / 2), seed=41)
    F.dining_chair(Placer(k, -0.5 + 1.82, 3.95, -PI / 2), seed=42)
    T = Placer(k, -0.5, 3.95)
    F.vase(T, 0, 0.75, 0, "ceramic_sage", 0.55, "bowl")
    for x in (-0.8, 0.8):
        F.vase(T, x, 0.75, 0, "ceramic_white", 0.5, "bottle", stems=3, seed=int(x * 10) + 7)
    for x in (-1.1, 0, 1.1):
        for z in (-0.33, 0.33):
            T.cyl("ceramic_white", (x, 0.758, z), 0.135, 0.125, 0.016, 40, tag="prop")
    F.halo_chandelier(Placer(k, -0.5, 3.95), 2.3)
    SB = Placer(k, 2.64, 3.95, -PI / 2)
    F.sideboard(SB, 2.2, 0.84, 0.46)
    F.vase(SB, -0.6, 0.84, 0, "ceramic_dark", 1.1, "amphora", stems=4, seed=12)
    SB.cyl("brass", (0.5, 0.88, 0), 0.18, 0.12, 0.08, 32, tag="prop")
    F.artwork(Placer(k, 2.91, 3.95, -PI / 2, 1.9), "art_4", 1.4, 1.05)
    F.plant(Placer(k, -3.45, 6.35), 0.25, 0.48, 1.5, "stone_pot", seed=7, kind="fig")


def guest(k: Kit):
    b = BEDS["guest"]
    F.rug(Placer(k, 8.0, b["headZ"]), 2.6, 3.2, "rug_jute")
    F.bed(Placer(k, b["headX"], b["headZ"], face_to(b["dirX"], b["dirZ"])), b["width"], b["length"], b["mattressTop"],
          "linen_oat", "throw_sea", 1.25, "cane", seed=31)
    for dz in (-1, 1):
        N = Placer(k, 9.15, b["headZ"] + dz * (b["width"] / 2 + 0.36), -PI / 2)
        F.nightstand(N, "oak", pull="brass")
        F.table_lamp(N, 0, 0.56, -0.02, "ceramic_sage", 0.9)
    F.lounge_chair(Placer(k, 3.95, 5.55, face_to(1, -0.35)), "linen_white", "oak")
    F.artwork(Placer(k, 3.09, 3.2, PI / 2, 1.7), "art_2", 1.0, 1.25, frame="oak")
    F.plant(Placer(k, 3.5, 1.55), 0.22, 0.42, 1.2, "ceramic_white", seed=11, kind="olive")
    D = Placer(k, 4.9, 1.35)
    D.box("oak", (0, 0.76, 0), (1.1, 0.035, 0.46), bevel=0.004)
    for sx in (-1, 1):
        D.box("oak", (sx * 0.52, 0.38, 0), (0.035, 0.76, 0.42), bevel=0.004)
    F.vase(D, 0.3, 0.775, 0, "ceramic_white", 0.55, "bottle", stems=3, seed=21)
    F.coffee_books(D, -0.25, 0.775, 0, seed=22, n=2)


def nursery(k: Kit):
    Cr = Placer(k, 14.43, 2.85, PI / 2)
    ln, wd = 1.32, 0.72
    for sx in (-1, 1):
        for sz in (-1, 1):
            Cr.box("white_wood", (sx * (ln / 2 - 0.025), 0.46, sz * (wd / 2 - 0.025)), (0.05, 0.92, 0.05), bevel=0.006)
    for sz in (-1, 1):
        Cr.box("white_wood", (0, 0.88, sz * (wd / 2 - 0.025)), (ln, 0.04, 0.045), bevel=0.008)
        Cr.box("white_wood", (0, 0.3, sz * (wd / 2 - 0.025)), (ln, 0.04, 0.045), bevel=0.006)
        for i in range(1, 14):
            Cr.cyl("white_wood", (-ln / 2 + ln * i / 14, 0.59, sz * (wd / 2 - 0.025)), 0.011, 0.011, 0.56, 10)
    for sx in (-1, 1):
        Cr.box("white_wood", (sx * (ln / 2 - 0.025), 0.62, 0), (0.03, 0.56, wd - 0.05), bevel=0.004)
    Cr.cushion("percale_white", (0, 0.37, 0), (ln - 0.08, 0.1, wd - 0.08), puff=0.1, round_=0.3)
    F.draped_sheet(Cr, "throw_blush", 0.6, 0.5, 0.42, 0.05, 0.04, 0.03, thick=0.01, puff=0.01, seed=5, res=(20, 16))
    M = Placer(k, 14.55, 2.85)
    M.box("white_wood", (0.08, 1.75, 0), (0.04, 0.04, 0.04), bevel=0.005, tag="prop")
    M.cyl("white_wood", (-0.2, 1.75, 0), 0.01, 0.01, 0.6, 8, rot=(0, 0, PI / 2), tag="prop")
    for i in range(4):
        a = i / 4 * 2 * PI
        M.cyl("white_wood", (-0.45 + math.cos(a) * 0.14, 1.62, math.sin(a) * 0.14), 0.0015, 0.0015, 0.25, 4, tag="prop")
        M.sphere("toy_2" if i % 2 else "linen_white", (-0.45 + math.cos(a) * 0.14, 1.48, math.sin(a) * 0.14), 0.05,
                 scale=(1.6, 0.9, 0.8), seg=16, tag="prop")
    F.rug(Placer(k, 12.2, 3.9), 2.5, 2.5, "rug_pastel", round_=True)
    R = Placer(k, 13.75, 5.25, face_to(-1.3, -1.1))
    F.lounge_chair(R, "linen_white", "white_wood", seed=8)
    F.floor_lamp(Placer(k, 14.4, 6.2), 1.5)
    T = Placer(k, 9.78, 5.0, PI / 2)
    T.box("white_wood", (0, 0.45, 0), (1.5, 0.9, 0.36), bevel=0.008)
    for i, m in enumerate(("toy_3", "toy_2", "toy_4")):
        T.box(m, (-0.5 + i * 0.5, 0.3, 0.185), (0.42, 0.3, 0.01), bevel=0.003)
        T.cyl("white_wood", (-0.5 + i * 0.5, 0.3, 0.195), 0.015, 0.015, 0.02, 16, rot=(PI / 2, 0, 0), tag="prop")
    T.sphere("toy_3", (-0.5, 0.97, 0), 0.07, seg=20, tag="prop")
    T.box("toy_2", (-0.25, 0.96, 0), (0.12, 0.12, 0.12), bevel=0.02, tag="prop")
    T.box("toy_1", (-0.25, 1.07, 0), (0.1, 0.1, 0.1), bevel=0.02, rot=(0, 0.4, 0), tag="prop")
    T.sphere("linen_white", (0.35, 1.0, 0), 0.1, scale=(1, 1.1, 0.9), seg=20, tag="prop")
    T.sphere("linen_white", (0.35, 1.15, 0), 0.07, seg=20, tag="prop")
    for sx in (-1, 1):
        T.sphere("linen_white", (0.35 + sx * 0.05, 1.21, 0), 0.03, seg=12, tag="prop")
    F.artwork(Placer(k, 9.59, 5.0, PI / 2, 1.8), "art_2", 0.8, 1.0, frame="white_wood")
    F.pouf(Placer(k, 11.4, 3.3), "velvet_blush", 0.3, 0.36)
    F.plant(Placer(k, 10.0, 1.55), 0.2, 0.36, 1.0, "ceramic_white", seed=13, kind="fig")
    F.pendant_globe(Placer(k, 12.2, 3.9), H, 1.2, 0.2)


def theatre(k: Kit):
    S = Placer(k, -14.85, -4.0, PI / 2)
    S.box("speaker", (0, 1.7, 0.03), (3.8, 2.3, 0.06), bevel=0.01)
    S.box("black_metal", (0, 1.7, 0.08), (3.5, 1.98, 0.04), bevel=0.004)
    S.plane("screen", (0, 1.7, 0.101), 3.36, 1.89)
    for x in (-2.25, 2.25):
        S.box("speaker", (x, 0.6, 0.2), (0.34, 1.2, 0.36), bevel=0.01)
        S.cyl("black_metal", (x, 0.9, 0.385), 0.09, 0.09, 0.012, 32, rot=(PI / 2, 0, 0))
        S.cyl("black_metal", (x, 0.45, 0.385), 0.12, 0.12, 0.012, 32, rot=(PI / 2, 0, 0))
    S.box("walnut", (0, 0.2, 0.25), (2.6, 0.4, 0.45), bevel=0.006)
    Fl = Placer(k, -8.08, -4.0, -PI / 2)
    Fl.box("walnut", (0, H / 2, 0.01), (5.8, H - 0.02, 0.02))
    for i in range(56):
        Fl.cyl("walnut", (-2.75 + i * 0.1, H / 2, 0.022), 0.036, 0.036, H - 0.28, 12)
    Rs = Placer(k, -9.35, -3.95)
    Rs.box("carpet_theatre", (0, 0.125, 0), (2.4, 0.25, 4.8), bevel=0.01)
    for z in (-5.1, -3.95, -2.8):
        F.recliner(Placer(k, -11.7, z, -PI / 2), "velvet_oxblood", seed=int(-z * 10))
        F.recliner(Placer(k, -9.55, z, -PI / 2, 0.25), "velvet_oxblood", seed=int(-z * 10) + 50)
    for x in (-13.6, -11.2, -9.2):
        F.sconce(Placer(k, x, -1.08, PI), 2.1)


def study(k: Kit):
    F.bookcase(Placer(k, -7.73, -3.95, PI / 2), 4.6, 3.05, 0.38, 6, 21)
    F.rug(Placer(k, -4.9, -3.9), 3.2, 2.3, "rug_study")
    F.desk(Placer(k, -4.9, -4.0))
    D = Placer(k, -4.9, -4.0)
    F.coffee_books(D, -0.6, 0.75, -0.1, seed=31, n=3)
    D.cyl("brass", (0.72, 0.76, -0.22), 0.08, 0.085, 0.02, 32, tag="prop")
    D.tube("brass", [(0.72, 0.77, -0.22), (0.72, 1.12, -0.25), (0.6, 1.2, -0.12)], 0.009, tag="prop")
    D.cyl("black_metal", (0.56, 1.16, -0.08), 0.05, 0.1, 0.14, 32, rot=(0.5, 0, 0.3), open_ends=True, tag="prop")
    D.light((0.56, 1.14, -0.07), 25, radius=0.03)
    F.desk_chair(Placer(k, -4.9, -3.35, PI))
    F.armchair(Placer(k, -6.8, -2.05, face_to(1, -0.6)), "leather_cognac", seed=9)
    F.floor_lamp(Placer(k, -7.35, -1.55), 1.5, base="bronze")
    G = Placer(k, -2.6, -6.25)
    G.cyl("walnut", (0, 0.3, 0), 0.03, 0.06, 0.6, 16, tag="prop")
    G.sphere("ceramic_sage", (0, 0.86, 0), 0.24, seg=40, tag="prop")
    G.torus("brass", (0, 0.86, 0), 0.27, 0.01, rot=(0, 0, 0.4), seg=64, tag="prop")
    F.artwork(Placer(k, -2.09, -4.0, -PI / 2, 1.75), "art_4", 1.1, 1.4)
    for x in (-6.5, -4.0):
        for z in (-5.5, -2.5):
            F.downlight(Placer(k, 0, 0), x, z)


def master(k: Kit):
    b = BEDS["master"]
    F.rug(Placer(k, 0.1, b["headZ"]), 3.6, 3.4, "rug_ivory")
    F.bed(Placer(k, b["headX"], b["headZ"], face_to(b["dirX"], b["dirZ"])), b["width"], b["length"], b["mattressTop"],
          "linen_sand", "throw_taupe", 1.35, "channel", seed=41)
    for dz in (-1, 1):
        N = Placer(k, -1.62, b["headZ"] + dz * (b["width"] / 2 + 0.34), PI / 2)
        F.nightstand(N, "walnut", pull="brass")
        F.table_lamp(N, 0, 0.56, -0.02, "brass", 0.95, style="column")
    F.bench(Placer(k, 0.72, b["headZ"], PI / 2), "velvet_taupe", 1.6)
    Dr = Placer(k, 5.66, -4.0, -PI / 2)
    F.dresser(Dr, 1.8, 0.86, 0.48)
    F.vase(Dr, 0.55, 0.86, 0, "ceramic_white", 0.8, "amphora", stems=5, seed=17)
    F.coffee_books(Dr, -0.45, 0.86, 0, seed=18, n=2)
    F.round_mirror(Placer(k, 5.91, -4.0, -PI / 2, 1.78), 0.52)
    F.armchair(Placer(k, 3.15, -1.95, PI + 0.3), "boucle", seed=19)
    F.side_table(Placer(k, 2.25, -1.8), 0.5)
    F.plant(Placer(k, -1.5, -6.45), 0.24, 0.46, 1.45, "ceramic_white", seed=17, kind="fig")
    F.pendant_globe(Placer(k, 0.4, -4.0), H, 0.95, 0.22)


def suite(k: Kit):
    b = BEDS["suite"]
    Fl = Placer(k, 14.85, b["headZ"], -PI / 2)
    Fl.box("walnut", (0, H / 2, 0.01), (3.6, H - 0.02, 0.02))
    for i in range(36):
        Fl.cyl("walnut", (-1.75 + i * 0.1, H / 2, 0.022), 0.036, 0.036, H - 0.28, 12)
    F.rug(Placer(k, 12.9, b["headZ"]), 3.4, 3.6, "rug_suite")
    F.bed(Placer(k, b["headX"], b["headZ"], face_to(b["dirX"], b["dirZ"])), b["width"], b["length"], b["mattressTop"],
          "velvet_taupe", "velvet_emerald", 1.4, "wing", seed=51)
    for dz in (-1, 1):
        N = Placer(k, 14.45, b["headZ"] + dz * (b["width"] / 2 + 0.38), -PI / 2)
        F.nightstand(N, style="marble")
        F.table_lamp(N, 0, 0.58, 0, "brass", 0.95, style="gourd")
    F.ottoman(Placer(k, 12.1, b["headZ"], -PI / 2), "velvet_emerald", 1.4, 0.5)
    Tb = Placer(k, 8.2, -5.4)
    Tb.lathe("marble", (0, 0, 0), [(0, 0), (0.6, 0), (0.76, 0.16), (0.83, 0.48), (0.86, 0.6), (0.82, 0.625), (0.78, 0.6),
                                   (0.74, 0.5), (0.68, 0.2), (0, 0.15)], seg=64, scale=(1.05, 1, 0.5))
    Tb.lathe("water", (0, 0.47, 0), [(0, 0), (0.72, 0), (0.72, 0.004), (0, 0.004)], seg=48, scale=(1.05, 1, 0.5),
             tag="glass")
    Fi = Placer(k, 7.1, -5.4)
    Fi.cyl("brass", (0, 0.5, 0), 0.02, 0.022, 1.0, 16, tag="prop")
    Fi.torus("brass", (0.12, 1.0, 0), 0.12, 0.016, arc=PI, seg=24, tag="prop")
    F.pendant_globe(Placer(k, 8.2, -5.4), H, 1.0, 0.16)
    F.rug(Placer(k, 10.6, -2.6), 3.0, 2.2, "rug_ivory")
    F.sofa(Placer(k, 10.6, -1.72, PI), 2.3, 0.95, "velvet_cognac", "brass", 2, seed=53, arm="rolled")
    So = Placer(k, 10.6, -1.72, PI)
    for x, mat, yaw in ((-0.72, "velvet_emerald", 0.12), (0.72, "boucle", -0.12)):
        So.cushion(mat, (x, 0.62, -0.16), (0.46, 0.44, 0.15), rot=(-0.28, yaw, 0), puff=0.45, round_=0.6,
                   seed=int(x * 10) + 60, tag="prop")
    F.round_table(Placer(k, 10.6, -2.95), 0.45, 0.38, "marble", "brass", style="pedestal")
    F.vase(Placer(k, 10.6, -2.95), 0, 0.38, 0, "ceramic_dark", 0.5, "jar")
    Bc = Placer(k, 6.42, -3.6, PI / 2)
    for y in (0.25, 0.72):
        Bc.box("mirror", (0, y, 0), (0.8, 0.012, 0.42), bevel=0.002)
    for sx in (-1, 1):
        for sz in (-1, 1):
            Bc.cyl("brass", (sx * 0.38, 0.4, sz * 0.19), 0.011, 0.011, 0.8, 10)
    for i in range(4):
        F.vase(Bc, -0.25 + i * 0.15, 0.73, 0, "glass" if i % 2 else "ceramic_dark", 0.7, "bottle")
    F.artwork(Placer(k, 10.6, -1.09, PI, 1.9), "art_3", 1.3, 0.95)
    F.plant(Placer(k, 6.5, -6.4), 0.24, 0.5, 1.4, "stone_pot", seed=19, kind="olive")


FURNISH = {
    "living": living,
    "dining": dining,
    "guest": guest,
    "nursery": nursery,
    "theatre": theatre,
    "study": study,
    "master": master,
    "suite": suite,
}


def build_room(rid: str):
    """Build one room into collection room_<id>; returns the collection."""
    coll = collection(f"room_{rid}")
    kit = Kit(coll, "static")
    shell(kit, ROOMS[rid])
    FURNISH[rid](kit)
    return coll
