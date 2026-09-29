"""
Procedural, tileable PBR textures for the villa (numpy, no network).

Every texture tiles seamlessly: noise is synthesised in the frequency domain, and
layouts (planks, tiles, weaves) are laid out on a torus. Each set writes
<name>_albedo.png (sRGB), <name>_normal.png (OpenGL, +Y up) and <name>_rough.png
into scripts/.cache/tex. Albedo maps are near-neutral detail maps where a material
tints them (plaster, fabrics); woods and stones carry their own colour.

Run: python3 scripts/blender/tex.py [names...]
"""
from __future__ import annotations

import math
import os
import sys

import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT = os.path.join(ROOT, "scripts", ".cache", "tex")


# ---------------------------------------------------------------- utilities


def rng(seed: int) -> np.random.Generator:
    return np.random.default_rng(seed)


def fnoise(n: int, beta: float = 2.0, seed: int = 0, aniso=(1.0, 1.0), lo: float = 0.0, hi: float = 1e9, m: int | None = None) -> np.ndarray:
    """Tileable fractal noise (n x m), normalised to zero mean / unit std.
    beta: spectral falloff (1 = pink, 2 = brown). aniso stretches features along x/y
    (a larger value makes features longer along that axis)."""
    m = m or n
    r = rng(seed)
    white = r.standard_normal((m, n))
    fy = np.fft.fftfreq(m)[:, None] * m
    fx = np.fft.fftfreq(n)[None, :] * n
    f = np.sqrt((fx * aniso[0]) ** 2 + (fy * aniso[1]) ** 2)
    f[0, 0] = 1.0
    amp = 1.0 / f ** (beta / 2.0)
    amp[(f < lo) | (f > hi)] = 0.0
    amp[0, 0] = 0.0
    out = np.real(np.fft.ifft2(np.fft.fft2(white) * amp))
    out -= out.mean()
    s = out.std()
    return out / (s if s > 0 else 1.0)


def blur(a: np.ndarray, sigma: float) -> np.ndarray:
    """Tileable gaussian blur via FFT."""
    m, n = a.shape
    fy = np.fft.fftfreq(m)[:, None]
    fx = np.fft.fftfreq(n)[None, :]
    g = np.exp(-2 * (math.pi * sigma) ** 2 * (fx ** 2 + fy ** 2))
    if a.ndim == 2:
        return np.real(np.fft.ifft2(np.fft.fft2(a) * g))
    return np.stack([np.real(np.fft.ifft2(np.fft.fft2(a[..., c]) * g)) for c in range(a.shape[2])], -1)


def norm01(a: np.ndarray) -> np.ndarray:
    lo, hi = np.percentile(a, 0.5), np.percentile(a, 99.5)
    return np.clip((a - lo) / (hi - lo + 1e-9), 0, 1)


def smooth(e0: float, e1: float, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def hexrgb(h: str) -> np.ndarray:
    h = h.lstrip("#")
    return np.array([int(h[i : i + 2], 16) / 255.0 for i in (0, 2, 4)])


def srgb_to_lin(c):
    c = np.asarray(c, dtype=np.float64)
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def lin_to_srgb(c):
    c = np.clip(c, 0, 1)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * np.power(c, 1 / 2.4) - 0.055)


def palette(t: np.ndarray, stops: list[tuple[float, str]]) -> np.ndarray:
    """Map t in [0,1] through colour stops (interpolated in linear light)."""
    xs = np.array([s[0] for s in stops])
    cols = srgb_to_lin(np.array([hexrgb(s[1]) for s in stops]))
    out = np.empty(t.shape + (3,))
    for c in range(3):
        out[..., c] = np.interp(t, xs, cols[:, c])
    return out  # linear


def height_to_normal(h: np.ndarray, strength: float) -> np.ndarray:
    """h in metres-ish units per pixel scale; returns OpenGL normal map in [0,1]."""
    dx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * 0.5
    dy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * 0.5
    nx = -dx * strength
    ny = dy * strength  # image rows go down; OpenGL +Y is up
    nz = np.ones_like(h)
    l = np.sqrt(nx * nx + ny * ny + nz * nz)
    return np.stack([nx / l, ny / l, nz / l], -1) * 0.5 + 0.5


def save_rgb_linear(name: str, lin: np.ndarray):
    img = (lin_to_srgb(lin) * 255 + 0.5).astype(np.uint8)
    Image.fromarray(img, "RGB").save(os.path.join(OUT, f"{name}_albedo.png"), optimize=True)


def save_normal(name: str, n: np.ndarray):
    img = (np.clip(n, 0, 1) * 255 + 0.5).astype(np.uint8)
    Image.fromarray(img, "RGB").save(os.path.join(OUT, f"{name}_normal.png"), optimize=True)


def save_gray(name: str, suffix: str, g: np.ndarray):
    img = (np.clip(g, 0, 1) * 255 + 0.5).astype(np.uint8)
    Image.fromarray(img, "L").save(os.path.join(OUT, f"{name}_{suffix}.png"), optimize=True)


def save_set(name: str, albedo_lin: np.ndarray, height: np.ndarray, strength: float, rough: np.ndarray):
    save_rgb_linear(name, albedo_lin)
    save_normal(name, height_to_normal(height, strength))
    save_gray(name, "rough", rough)
    print(f"[tex] {name} {albedo_lin.shape[1]}px")


def downsample(a: np.ndarray, f: int) -> np.ndarray:
    if f == 1:
        return a
    m, n = a.shape[:2]
    return a.reshape(m // f, f, n // f, f, *a.shape[2:]).mean(axis=(1, 3))


# ---------------------------------------------------------------- woods


WOODS = {
    # light European oak, matt oiled
    "oak": [(0.0, "#b58a5c"), (0.35, "#c9a174"), (0.7, "#d8b58b"), (1.0, "#e4c9a3")],
    # American black walnut
    "walnut": [(0.0, "#3e2717"), (0.4, "#5a3a24"), (0.75, "#6f4a2f"), (1.0, "#86603f")],
    # smoked / fumed oak for darker floors
    "smoked": [(0.0, "#5b4330"), (0.4, "#735640"), (0.8, "#8a6b50"), (1.0, "#9c7d60")],
}


def wood_field(n: int, seed: int, ring_freq: float, figure: float):
    """Flat-sawn grain running along x: growth rings warped into cathedral arches,
    fine streaks and pore dashes. Returns (tone 0..1, pores 0..1, height)."""
    y = np.arange(n)[:, None] / n
    # slow, strongly elongated warp bends the rings into arches along the board
    warp = fnoise(n, 3.4, seed + 1, aniso=(7, 1)) * figure + fnoise(n, 2.6, seed + 2, aniso=(4, 1)) * figure * 0.25
    d = y * ring_freq + warp
    ring = d - np.floor(d)
    # earlywood fades into a crisp latewood line
    late = smooth(0.62, 0.93, ring) * (1 - smooth(0.93, 1.0, ring))
    streak = fnoise(n, 1.5, seed + 3, aniso=(50, 1))
    fine = fnoise(n, 0.9, seed + 4, aniso=(28, 1))
    pores = smooth(1.2, 2.4, fine)
    tone = np.clip(0.62 - 0.42 * late + 0.1 * streak - 0.14 * pores + 0.08 * fnoise(n, 2.8, seed + 5), 0, 1)
    height = -0.7 * late - 0.6 * pores + 0.12 * streak
    return tone, pores, height


def gen_wood(name: str, pal: str, n=1024, seed=1, ring_freq=70.0):
    tone, pores, h = wood_field(n, seed, ring_freq, 5.0)
    alb = palette(tone, WOODS[pal])
    rough = 0.42 + 0.18 * pores + 0.06 * fnoise(n, 1.5, seed + 9)
    save_set(name, alb, h * 0.8, 1.6, rough)


def gen_planks(name: str, pal: str, n=2048, tile_m=2.4, plank_w=0.2, seed=7, varnish=0.4):
    """Floorboards running along x, staggered joints, bevelled edges."""
    r = rng(seed)
    px_per_m = n / tile_m
    rows = int(round(tile_m / plank_w))
    row_h = n / rows
    tone = np.zeros((n, n))
    pores = np.zeros((n, n))
    height = np.zeros((n, n))
    plank_shift = np.zeros((n, n))
    rough_off = np.zeros((n, n))
    ys = np.arange(n)
    xs = np.arange(n)
    # one big grain field reused with per-plank offsets (cheap, varied)
    grain_tone, grain_pores, grain_h = wood_field(n, seed, 150.0, 7.0)
    for ri in range(rows):
        y0 = int(round(ri * row_h))
        y1 = int(round((ri + 1) * row_h))
        # joints along the row (cyclic)
        joints = []
        x = r.uniform(0, n)
        total = 0
        while total < n:
            L = r.uniform(0.9, 2.2) * px_per_m
            joints.append(x % n)
            x += L
            total += L
        joints = sorted(joints)
        if len(joints) == 1:
            joints.append((joints[0] + n / 2) % n)
        # assign plank ids across the row
        seg_id = np.zeros(n, dtype=int)
        for j, jx in enumerate(joints):
            nxt = joints[(j + 1) % len(joints)]
            if nxt > jx:
                seg_id[int(jx) : int(nxt)] = j
            else:
                seg_id[int(jx) :] = j
                seg_id[: int(nxt)] = j
        offsets = r.uniform(0, n, size=(len(joints), 2)).astype(int)
        shades = r.normal(0, 0.09, size=len(joints))
        rvar = r.normal(0, 0.04, size=len(joints))
        for j in range(len(joints)):
            cols = np.where(seg_id == j)[0]
            if cols.size == 0:
                continue
            oy, ox = offsets[j]
            src_r = (ys[y0:y1] + oy) % n
            src_c = (cols + ox) % n
            block = np.ix_(src_r, src_c)
            dst = np.ix_(ys[y0:y1], cols)
            tone[dst] = grain_tone[block] + shades[j]
            pores[dst] = grain_pores[block]
            height[dst] = grain_h[block]
            rough_off[dst] = rvar[j]
        # bevel / gap along the long edges
        yy = ys[y0:y1] - y0
        dist_edge = np.minimum(yy, (y1 - y0 - 1) - yy)[:, None]
        bevel = smooth(0, 3.0, dist_edge)
        height[y0:y1] += (bevel - 1) * 2.5
        tone[y0:y1] -= (1 - bevel) * 0.25
        # end joints
        for jx in joints:
            d = np.abs(((xs - jx + n / 2) % n) - n / 2)[None, :]
            b = smooth(0, 2.5, d)
            height[y0:y1] += (b - 1) * 2.0
            tone[y0:y1] -= (1 - b) * 0.22
    tone = np.clip(tone, 0, 1)
    alb = palette(tone, WOODS[pal])
    # subtle large-scale variation (sun fade, oil)
    alb *= (1 + 0.05 * fnoise(n, 3.0, seed + 11))[..., None]
    rough = np.clip(varnish + 0.16 * pores + rough_off + 0.05 * fnoise(n, 2.0, seed + 12), 0.15, 1)
    save_rgb_linear(name, alb)
    save_normal(name, height_to_normal(downsample(height, 2), 1.3))
    save_gray(name, "rough", downsample(rough, 2))
    print(f"[tex] {name} {n}px")


# ---------------------------------------------------------------- stone


def travertine_field(n: int, seed: int):
    band = fnoise(n, 2.6, seed, aniso=(12, 1))  # horizontal bedding
    mott = fnoise(n, 2.0, seed + 1)
    tone = norm01(0.7 * band + 0.35 * mott)
    # pits: elongated voids
    pit_n = fnoise(n, 0.8, seed + 2, aniso=(4, 1))
    pits = smooth(2.1, 2.8, pit_n)
    return tone, pits


def gen_travertine(name: str, n=1024, seed=21, tiles=None, tile_m=2.4):
    tone, pits = travertine_field(n, seed)
    alb = palette(tone, [(0.0, "#cbb89b"), (0.4, "#dccbb0"), (0.8, "#e9ddc8"), (1.0, "#f1e8d8")])
    alb = alb * (1 - 0.35 * pits[..., None]) + srgb_to_lin(hexrgb("#b9a283")) * 0.35 * pits[..., None]
    h = -pits * 3.0 + 0.2 * fnoise(n, 1.2, seed + 3)
    rough = 0.45 + 0.3 * pits + 0.04 * fnoise(n, 1.5, seed + 4)
    if tiles:
        tw, th = tiles  # metres
        px = n / tile_m
        yy, xx = np.mgrid[0:n, 0:n]
        row = (yy / (th * px)).astype(int)
        xoff = (row % 2) * (tw * px / 2)
        gx = ((xx + xoff) % (tw * px))
        gy = yy % (th * px)
        d = np.minimum(np.minimum(gx, tw * px - gx), np.minimum(gy, th * px - gy))
        grout = 1 - smooth(0.8, 2.2, d)
        # per-tile tone shift
        tid = (row * 7 + ((xx + xoff) // (tw * px)).astype(int) * 13) % 97
        shift = (np.sin(tid * 12.9898) * 43758.5453) % 1.0
        alb *= (0.96 + 0.08 * shift)[..., None]
        g = srgb_to_lin(hexrgb("#cfc4b3"))
        alb = alb * (1 - grout[..., None]) + g * grout[..., None]
        h = h - grout * 2.5
        rough = rough * (1 - grout) + 0.9 * grout
    save_set(name, alb, h, 1.2, rough)


def gen_marble(name: str, n=1024, seed=31):
    t1 = fnoise(n, 3.4, seed, aniso=(1.6, 1))
    t2 = fnoise(n, 2.6, seed + 1)
    x = np.arange(n)[None, :] / n
    y = np.arange(n)[:, None] / n
    # integer wave numbers keep the pattern tileable
    v = np.sin((x * 1 + y * 1) * 2 * math.pi + t1 * 0.9 + t2 * 0.15)
    v2 = np.sin((x * 2 - y * 1) * 2 * math.pi + t1 * 1.4 + t2 * 0.4)
    veins = np.exp(-np.abs(v) * 22) * (0.6 + 0.4 * norm01(t2)) + 0.45 * np.exp(-np.abs(v2) * 45)
    cloud = norm01(fnoise(n, 2.4, seed + 3))
    alb = palette(np.clip(1 - 0.12 * cloud - 0.75 * np.clip(veins, 0, 1), 0, 1),
                  [(0.0, "#6d6861"), (0.35, "#a39c92"), (0.8, "#e4e0d9"), (1.0, "#f4f2ee")])
    rough = 0.12 + 0.05 * cloud + 0.06 * np.clip(veins, 0, 1)
    save_set(name, alb, 0.2 * fnoise(n, 1.0, seed + 5), 0.5, rough)


# ---------------------------------------------------------------- walls


def gen_plaster(name: str, n=1024, seed=41):
    mott = fnoise(n, 2.8, seed)
    mid = fnoise(n, 2.0, seed + 1)
    trowel = fnoise(n, 2.2, seed + 2, aniso=(2.5, 1))
    alb_l = 0.93 + 0.012 * mott + 0.006 * mid
    alb = np.repeat(alb_l[..., None], 3, -1)
    h = 0.9 * trowel + 0.3 * mid + 0.15 * fnoise(n, 0.8, seed + 3)
    rough = 0.86 + 0.06 * mid
    save_set(name, srgb_to_lin(alb), h, 0.9, rough)


# ---------------------------------------------------------------- textiles


def weave_pattern(n: int, threads: int, over=1):
    """Plain weave: returns (height, warp mask)."""
    yy, xx = np.mgrid[0:n, 0:n] / n * threads
    fx = xx % 1.0
    fy = yy % 1.0
    ix = xx.astype(int)
    iy = yy.astype(int)
    warp_on_top = ((ix // over + iy // over) % 2) == 0
    # thread cross-section profiles
    pw = np.sin(fx * math.pi) ** 0.6  # warp thread (runs along y)
    pf = np.sin(fy * math.pi) ** 0.6  # weft thread (runs along x)
    # arch of the thread along its length
    aw = 0.6 + 0.4 * np.sin(fy * math.pi)
    af = 0.6 + 0.4 * np.sin(fx * math.pi)
    h = np.where(warp_on_top, pw * aw + 0.3 * pf, pf * af + 0.3 * pw)
    return h, warp_on_top


def gen_linen(name: str, n=1024, seed=51, threads=110, slub=0.35, base=0.88):
    h, top = weave_pattern(n, threads)
    slubs_x = fnoise(n, 1.4, seed, aniso=(1, 30))  # along warp (y)
    slubs_y = fnoise(n, 1.4, seed + 1, aniso=(30, 1))
    thick = np.where(top, slubs_x, slubs_y) * slub
    h = h * (1 + 0.35 * thick)
    tone = base + 0.05 * thick + 0.04 * fnoise(n, 2.2, seed + 2) - 0.07 * (1 - h)
    alb = srgb_to_lin(np.repeat(np.clip(tone, 0, 1)[..., None], 3, -1))
    rough = 0.9 + 0.05 * (1 - h)
    save_set(name, alb, h * 1.0, 2.2, rough)


def gen_boucle(name: str, n=1024, seed=61):
    loops = fnoise(n, 0.6, seed, hi=n / 6)
    loops = norm01(loops)
    bumps = smooth(0.35, 0.9, loops)
    tone = 0.86 + 0.08 * bumps - 0.06 * (1 - bumps) + 0.02 * fnoise(n, 2.0, seed + 1)
    alb = srgb_to_lin(np.repeat(np.clip(tone, 0, 1)[..., None], 3, -1))
    save_set(name, alb, bumps * 3.0, 1.4, 0.95 - 0.03 * bumps)


def gen_velvet(name: str, n=1024, seed=71):
    crush = fnoise(n, 2.6, seed, aniso=(1.5, 1))
    pile = fnoise(n, 0.9, seed + 1)
    tone = 0.9 + 0.05 * crush + 0.02 * pile
    alb = srgb_to_lin(np.repeat(np.clip(tone, 0, 1)[..., None], 3, -1))
    save_set(name, alb, 0.6 * crush + 0.2 * pile, 0.8, 0.72 + 0.08 * crush)


def gen_leather(name: str, n=1024, seed=81):
    cells = fnoise(n, 0.4, seed, hi=n / 5)
    creases = np.abs(fnoise(n, 1.8, seed + 1))
    grain = -np.abs(cells) * 0.8 - smooth(0.0, 0.25, 0.25 - creases) * 1.2
    tone = 0.9 + 0.06 * fnoise(n, 2.4, seed + 2) + 0.04 * grain
    alb = srgb_to_lin(np.repeat(np.clip(tone, 0, 1)[..., None], 3, -1))
    save_set(name, alb, grain, 1.4, 0.48 + 0.12 * norm01(-grain))


def gen_carpet(name: str, n=1024, seed=91, scale=1.0):
    tuft = fnoise(n, 0.5, seed, hi=n / (3 * scale))
    wear = fnoise(n, 2.8, seed + 1)
    tone = 0.88 + 0.06 * norm01(tuft) + 0.03 * wear
    alb = srgb_to_lin(np.repeat(np.clip(tone, 0, 1)[..., None], 3, -1))
    save_set(name, alb, norm01(tuft) * 2.0, 1.6, 0.98 * np.ones((n, n)))


def gen_jute(name: str, n=1024, seed=101):
    h, top = weave_pattern(n, 28, over=2)
    fib = fnoise(n, 1.2, seed, aniso=(1, 12))
    tone = 0.8 + 0.12 * h + 0.06 * fib
    alb = palette(np.clip(tone, 0, 1), [(0.0, "#7a6040"), (0.6, "#b59668"), (1.0, "#d8c095")])
    save_set(name, alb, h * 2 + 0.3 * fib, 2.0, 0.95 * np.ones((n, n)))


def gen_rattan(name: str, n=1024, seed=111):
    # open cane webbing: two diagonal + one horizontal set of strands
    yy, xx = np.mgrid[0:n, 0:n] / n
    k = 14
    s1 = np.abs(np.sin((xx + yy) * k * math.pi))
    s2 = np.abs(np.sin((xx - yy) * k * math.pi))
    s3 = np.abs(np.sin(yy * k * 2 * math.pi))
    strand = np.maximum.reduce([smooth(0.82, 0.97, s1), smooth(0.82, 0.97, s2), smooth(0.86, 0.98, s3)])
    fib = fnoise(n, 1.4, seed, aniso=(6, 6))
    tone = np.where(strand > 0.02, 0.65 + 0.3 * strand + 0.05 * fib, 0.25)
    alb = palette(np.clip(tone, 0, 1), [(0.0, "#4a3a28"), (0.3, "#6e5334"), (0.7, "#b99461"), (1.0, "#d9bb87")])
    save_set(name, alb, strand * 2.5, 2.0, 0.6 + 0.3 * (1 - strand))


def gen_percale(name: str, n=512, seed=121):
    h, _ = weave_pattern(n, 160)
    wr = fnoise(n, 2.4, seed)
    tone = 0.95 + 0.02 * wr - 0.03 * (1 - h)
    alb = srgb_to_lin(np.repeat(np.clip(tone, 0, 1)[..., None], 3, -1))
    save_set(name, alb, h * 0.6 + wr * 0.8, 1.2, 0.9 * np.ones((n, n)))


def gen_brushed(name: str, n=512, seed=131):
    streak = fnoise(n, 1.0, seed, aniso=(60, 1))
    alb = srgb_to_lin(np.repeat((0.95 + 0.03 * streak)[..., None], 3, -1))
    save_set(name, alb, streak * 0.4, 0.6, 0.3 + 0.08 * streak)


def gen_ceramic(name: str, n=512, seed=141):
    glaze = fnoise(n, 2.6, seed)
    alb = srgb_to_lin(np.repeat((0.93 + 0.04 * glaze)[..., None], 3, -1))
    save_set(name, alb, 0.3 * glaze + 0.1 * fnoise(n, 1.0, seed + 1), 0.8, 0.28 + 0.1 * norm01(glaze))


def gen_terracotta(name: str, n=512, seed=151):
    m = fnoise(n, 2.2, seed)
    alb = palette(norm01(m + 0.3 * fnoise(n, 1.0, seed + 1)), [(0, "#8f4d31"), (0.5, "#b26a47"), (1, "#c9855f")])
    save_set(name, alb, 0.5 * fnoise(n, 1.2, seed + 2), 1.0, 0.85 * np.ones((n, n)))


def gen_grass(name: str, n=1024, seed=161):
    blades = fnoise(n, 0.6, seed, aniso=(1, 3))
    patches = fnoise(n, 2.8, seed + 1)
    alb = palette(norm01(0.6 * blades + 0.6 * patches), [(0, "#34431f"), (0.5, "#56682e"), (1, "#7e8f45")])
    save_set(name, alb, blades, 1.0, 0.95 * np.ones((n, n)))


def gen_gravel(name: str, n=1024, seed=171):
    stones = norm01(fnoise(n, 0.3, seed, hi=n / 8))
    alb = palette(norm01(stones + 0.3 * fnoise(n, 1.0, seed + 1)), [(0, "#8f8779"), (0.5, "#bdb3a1"), (1, "#e0d8c8")])
    save_set(name, alb, stones * 3, 1.5, 0.9 * np.ones((n, n)))


def gen_leaf(name: str, n=512, seed=181):
    v = fnoise(n, 2.0, seed)
    alb = palette(norm01(v), [(0, "#2e3d1f"), (0.5, "#48602c"), (1, "#6f8744")])
    save_set(name, alb, 0.3 * v, 0.6, 0.55 * np.ones((n, n)))


def copy_prints():
    """Artworks and the cinema screen image come from the original art generator."""
    src = os.path.join(ROOT, "scripts", ".cache", "arch")
    for n in ("art_1", "art_2", "art_3", "art_4", "screen"):
        Image.open(os.path.join(src, f"{n}.png")).convert("RGB").save(os.path.join(OUT, f"{n}_albedo.png"))
    print("[tex] prints")


GENERATORS = {
    "prints": copy_prints,
    "plaster": lambda: gen_plaster("plaster"),
    "oak_planks": lambda: gen_planks("oak_planks", "oak", seed=7, varnish=0.42),
    "walnut_planks": lambda: gen_planks("walnut_planks", "walnut", seed=9, plank_w=0.18, varnish=0.36),
    "smoked_planks": lambda: gen_planks("smoked_planks", "smoked", seed=13, plank_w=0.22, varnish=0.4),
    "travertine_tiles": lambda: gen_travertine("travertine_tiles", n=2048, tiles=(1.2, 0.6)),
    "travertine": lambda: gen_travertine("travertine", seed=23),
    "marble": lambda: gen_marble("marble"),
    "oak": lambda: gen_wood("oak", "oak", seed=3),
    "walnut": lambda: gen_wood("walnut", "walnut", seed=5),
    "linen": lambda: gen_linen("linen"),
    "boucle": lambda: gen_boucle("boucle"),
    "velvet": lambda: gen_velvet("velvet"),
    "leather": lambda: gen_leather("leather"),
    "carpet": lambda: gen_carpet("carpet"),
    "jute": lambda: gen_jute("jute"),
    "rattan": lambda: gen_rattan("rattan"),
    "percale": lambda: gen_percale("percale"),
    "brushed": lambda: gen_brushed("brushed"),
    "ceramic": lambda: gen_ceramic("ceramic"),
    "terracotta": lambda: gen_terracotta("terracotta"),
    "grass": lambda: gen_grass("grass"),
    "gravel": lambda: gen_gravel("gravel"),
    "leaf": lambda: gen_leaf("leaf"),
}


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    names = sys.argv[1:] or list(GENERATORS)
    for nm in names:
        GENERATORS[nm]()
