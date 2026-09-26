/** Small, dependency-free tileable noise toolkit for procedural textures. */

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash2(x: number, y: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
const mod = (a: number, n: number) => ((a % n) + n) % n;

/** Value noise that tiles with integer period (in lattice cells). */
export function tileValue(x: number, y: number, period: number, seed = 0): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = fade(x - xi);
  const yf = fade(y - yi);
  const x0 = mod(xi, period);
  const y0 = mod(yi, period);
  const x1 = mod(xi + 1, period);
  const y1 = mod(yi + 1, period);
  const a = hash2(x0, y0, seed);
  const b = hash2(x1, y0, seed);
  const c = hash2(x0, y1, seed);
  const d = hash2(x1, y1, seed);
  return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
}

/**
 * Tileable fractal noise over a unit square [0,1)^2.
 * `base` is the lattice frequency of the first octave (integer).
 */
export function fbm(u: number, v: number, base: number, octaves = 4, seed = 0, gain = 0.5): number {
  let sum = 0;
  let amp = 0.5;
  let freq = base;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += amp * tileValue(u * freq, v * freq, freq, seed + o * 17);
    norm += amp;
    amp *= gain;
    freq *= 2;
  }
  return sum / norm;
}

/** Anisotropic tileable fbm (different lattice frequency on each axis). */
export function fbm2(u: number, v: number, bx: number, by: number, octaves = 4, seed = 0): number {
  let sum = 0;
  let amp = 0.5;
  let fx = bx;
  let fy = by;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    // lattice uses per-axis period; emulate by scaling coords and using lcm-free hash per axis
    const x = u * fx;
    const y = v * fy;
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = fade(x - xi);
    const yf = fade(y - yi);
    const h = (i: number, j: number) => hash2(mod(i, fx), mod(j, fy), seed + o * 31);
    const a = h(xi, yi);
    const b = h(xi + 1, yi);
    const c = h(xi, yi + 1);
    const d = h(xi + 1, yi + 1);
    sum += amp * (a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf);
    norm += amp;
    amp *= 0.5;
    fx *= 2;
    fy *= 2;
  }
  return sum / norm;
}

export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** A float image with helpers. */
export class Field {
  data: Float32Array;
  constructor(
    public w: number,
    public h: number,
  ) {
    this.data = new Float32Array(w * h);
  }
  fill(fn: (u: number, v: number, x: number, y: number) => number) {
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) this.data[y * this.w + x] = fn(x / this.w, y / this.h, x, y);
    return this;
  }
  at(x: number, y: number) {
    return this.data[mod(y, this.h) * this.w + mod(x, this.w)];
  }
  /** wrap-around box blur */
  blur(r: number) {
    const tmp = new Float32Array(this.data.length);
    const { w, h } = this;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        let s = 0;
        for (let k = -r; k <= r; k++) s += this.at(x + k, y);
        tmp[y * w + x] = s / (2 * r + 1);
      }
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        let s = 0;
        for (let k = -r; k <= r; k++) s += tmp[mod(y + k, h) * w + x];
        this.data[y * w + x] = s / (2 * r + 1);
      }
    return this;
  }
  normalize() {
    let mn = Infinity;
    let mx = -Infinity;
    for (const v of this.data) {
      if (v < mn) mn = v;
      if (v > mx) mx = v;
    }
    const d = mx - mn || 1;
    for (let i = 0; i < this.data.length; i++) this.data[i] = (this.data[i] - mn) / d;
    return this;
  }
}

/** Tangent-space normal map (RGBA8) from a height field, with wrap-around. */
export function normalMap(hf: Field, strength: number): Uint8Array {
  const { w, h } = hf;
  const out = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const dx = (hf.at(x + 1, y) - hf.at(x - 1, y)) * strength;
      const dy = (hf.at(x, y + 1) - hf.at(x, y - 1)) * strength;
      let nx = -dx;
      let ny = dy; // glTF / three: +Y up in tangent space, image rows go down
      let nz = 1;
      const l = Math.hypot(nx, ny, nz);
      nx /= l;
      ny /= l;
      nz /= l;
      const i = (y * w + x) * 4;
      out[i] = Math.round((nx * 0.5 + 0.5) * 255);
      out[i + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      out[i + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      out[i + 3] = 255;
    }
  return out;
}

export type RGB = [number, number, number];
export const hex = (s: string): RGB => {
  const n = parseInt(s.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
export const mix = (a: RGB, b: RGB, t: number): RGB => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

export function rgbaFrom(w: number, h: number, fn: (u: number, v: number, x: number, y: number) => [number, number, number, number?]) {
  const out = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const c = fn(x / w, y / h, x, y);
      const i = (y * w + x) * 4;
      out[i] = Math.max(0, Math.min(255, Math.round(c[0])));
      out[i + 1] = Math.max(0, Math.min(255, Math.round(c[1])));
      out[i + 2] = Math.max(0, Math.min(255, Math.round(c[2])));
      out[i + 3] = c[3] === undefined ? 255 : Math.max(0, Math.min(255, Math.round(c[3])));
    }
  return out;
}
