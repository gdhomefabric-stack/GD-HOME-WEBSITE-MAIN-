/**
 * Offline pattern generator. Every pattern is drawn from code as a seamless
 * tile, so it prints crisp at any size and needs no image service.
 */

export type PatternKind =
  | "florals"
  | "leaves"
  | "blobs"
  | "terrazzo"
  | "dots"
  | "hearts"
  | "stars"
  | "arches"
  | "trellis"
  | "scallops"
  | "chevron"
  | "stripes"
  | "gingham"
  | "plaid"
  | "quilt"
  | "mandala"
  | "ombre";

export interface PatternParams {
  kind: PatternKind;
  /** [background, a, b, c, d] */
  colors: string[];
  seed: number;
}

export const PATTERNS: { id: PatternKind; name: string; scale: number }[] = [
  { id: "florals", name: "Daisies", scale: 0.4 },
  { id: "leaves", name: "Botanical", scale: 0.45 },
  { id: "blobs", name: "Modern shapes", scale: 0.55 },
  { id: "terrazzo", name: "Terrazzo", scale: 0.45 },
  { id: "dots", name: "Polka dot", scale: 0.25 },
  { id: "hearts", name: "Hearts", scale: 0.35 },
  { id: "stars", name: "Stars", scale: 0.4 },
  { id: "arches", name: "Boho rainbows", scale: 0.4 },
  { id: "trellis", name: "Moroccan", scale: 0.22 },
  { id: "scallops", name: "Scallops", scale: 0.2 },
  { id: "chevron", name: "Chevron", scale: 0.3 },
  { id: "stripes", name: "Stripes", scale: 0.5 },
  { id: "gingham", name: "Gingham", scale: 0.16 },
  { id: "plaid", name: "Tartan", scale: 0.4 },
  { id: "quilt", name: "Patchwork", scale: 0.33 },
  { id: "mandala", name: "Mandala", scale: 1 },
  { id: "ombre", name: "Ombré", scale: 1 },
];
export const PATTERN_BY_ID = Object.fromEntries(PATTERNS.map((p) => [p.id, p])) as Record<PatternKind, (typeof PATTERNS)[number]>;

export const PALETTES: { id: string; name: string; colors: string[] }[] = [
  { id: "maison", name: "Maison", colors: ["#f3ece0", "#c69a3f", "#5e4a2e", "#d8c4a2", "#8c6a2f"] },
  { id: "blush", name: "Blush garden", colors: ["#fbf1ec", "#e3a9a0", "#9fae8a", "#f2cfc3", "#c0643f"] },
  { id: "sage", name: "Sage & cream", colors: ["#f4f1e6", "#9fae8a", "#5f7458", "#d9c9a5", "#e8e0c9"] },
  { id: "coastal", name: "Coastal", colors: ["#f2f5f4", "#2f5d7c", "#8fb8c9", "#e3d5b8", "#c7dde3"] },
  { id: "terracotta", name: "Terracotta", colors: ["#f5ebdd", "#c0643f", "#e0a458", "#6b4b3e", "#d9b99b"] },
  { id: "jewel", name: "Jewel tones", colors: ["#1f2a44", "#c69a3f", "#2f7d6d", "#8e2f4f", "#e6cb91"] },
  { id: "nursery", name: "Nursery", colors: ["#fdf8f1", "#f4b6b6", "#a7c7e7", "#f7dc8b", "#b5d6b2"] },
  { id: "pop", name: "Pop", colors: ["#fff7e8", "#ff5a5f", "#ffb400", "#00a699", "#3b5bdb"] },
  { id: "mono", name: "Monochrome", colors: ["#f6f5f2", "#1d1d1b", "#6d6b66", "#bdbab3", "#3a3935"] },
  { id: "festive", name: "Festive", colors: ["#f8f1e4", "#a4161a", "#1b4332", "#d4a017", "#e9c46a"] },
  { id: "indigo", name: "Indigo block print", colors: ["#f4efe4", "#2c3e7a", "#8aa0d0", "#c9a66b", "#1b2550"] },
  { id: "night", name: "Midnight", colors: ["#141a2e", "#e6cb91", "#6c7aa8", "#f3ece0", "#39456b"] },
];

/* ---------------- seeded randomness ---------------- */

function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rng = () => number;
const pick = <T>(r: Rng, arr: T[]) => arr[Math.floor(r() * arr.length) % arr.length];

/** Draw `fn` at every wrap offset so items crossing the edge tile seamlessly. */
function wrap(T: number, x: number, y: number, reach: number, fn: (x: number, y: number) => void) {
  for (const dx of [-T, 0, T]) {
    for (const dy of [-T, 0, T]) {
      const px = x + dx;
      const py = y + dy;
      if (px + reach < 0 || py + reach < 0 || px - reach > T || py - reach > T) continue;
      fn(px, py);
    }
  }
}

/** Jittered grid of points, one per cell — even coverage that still looks scattered. */
function scatter(r: Rng, T: number, cells: number, jitter = 0.8) {
  const out: { x: number; y: number }[] = [];
  const c = T / cells;
  for (let i = 0; i < cells; i++) {
    for (let j = 0; j < cells; j++) {
      const off = j % 2 ? 0.5 : 0;
      out.push({
        x: (i + 0.5 + off + (r() - 0.5) * jitter) * c,
        y: (j + 0.5 + (r() - 0.5) * jitter) * c,
      });
    }
  }
  return out;
}

function heart(ctx: CanvasRenderingContext2D, s: number) {
  ctx.beginPath();
  ctx.moveTo(0, s * 0.35);
  ctx.bezierCurveTo(-s * 0.9, -s * 0.2, -s * 0.45, -s * 0.85, 0, -s * 0.38);
  ctx.bezierCurveTo(s * 0.45, -s * 0.85, s * 0.9, -s * 0.2, 0, s * 0.35);
  ctx.fill();
}

function star(ctx: CanvasRenderingContext2D, s: number, points = 5, inner = 0.45) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 ? s * inner : s;
    const a = (Math.PI / points) * i - Math.PI / 2;
    ctx.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  ctx.closePath();
  ctx.fill();
}

function leaf(ctx: CanvasRenderingContext2D, len: number, wid: number, fill: string, vein: string) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(wid, len * 0.45, 0, len);
  ctx.quadraticCurveTo(-wid, len * 0.45, 0, 0);
  ctx.fill();
  ctx.strokeStyle = vein;
  ctx.lineWidth = Math.max(1, wid * 0.08);
  ctx.beginPath();
  ctx.moveTo(0, len * 0.05);
  ctx.lineTo(0, len * 0.92);
  ctx.stroke();
}

function blob(ctx: CanvasRenderingContext2D, r: Rng, s: number) {
  const n = 6 + Math.floor(r() * 3);
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (Math.PI * 2 * i) / n;
    const rad = s * (0.65 + r() * 0.45);
    return [Math.cos(a) * rad, Math.sin(a) * rad];
  });
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % n];
    const mx = (p[0] + q[0]) / 2;
    const my = (p[1] + q[1]) / 2;
    if (i === 0) ctx.moveTo((pts[n - 1][0] + p[0]) / 2, (pts[n - 1][1] + p[1]) / 2);
    ctx.quadraticCurveTo(p[0], p[1], mx, my);
  }
  ctx.closePath();
  ctx.fill();
}

function drawTile(ctx: CanvasRenderingContext2D, T: number, p: PatternParams) {
  const r = mulberry32(p.seed * 9973 + 17);
  const [bg, a, b, c, d] = p.colors;
  const inks = [a, b, c, d];
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, T, T);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  switch (p.kind) {
    case "dots": {
      const n = 4;
      const s = T / n;
      const rad = s * (0.16 + r() * 0.1);
      ctx.fillStyle = a;
      for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++) {
          const x = (i + (j % 2 ? 0.5 : 0) + 0.25) * s;
          const y = (j + 0.5) * s;
          wrap(T, x, y, rad, (px, py) => {
            ctx.beginPath();
            ctx.arc(px, py, rad, 0, Math.PI * 2);
            ctx.fill();
          });
        }
      break;
    }
    case "hearts":
    case "stars": {
      const pts = scatter(r, T, 4, 0.7);
      for (const pt of pts) {
        const s = T * (0.045 + r() * 0.04);
        const rot = (r() - 0.5) * 0.8;
        ctx.fillStyle = pick(r, inks);
        wrap(T, pt.x, pt.y, s * 1.2, (x, y) => {
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(rot);
          if (p.kind === "hearts") heart(ctx, s * 1.2);
          else star(ctx, s);
          ctx.restore();
        });
      }
      if (p.kind === "stars") {
        ctx.fillStyle = a;
        for (const pt of scatter(r, T, 7, 1)) {
          const rad = T * 0.006 * (0.6 + r());
          wrap(T, pt.x, pt.y, rad, (x, y) => {
            ctx.beginPath();
            ctx.arc(x, y, rad, 0, Math.PI * 2);
            ctx.fill();
          });
        }
      }
      break;
    }
    case "florals": {
      for (const pt of scatter(r, T, 4, 0.75)) {
        const s = T * (0.06 + r() * 0.045);
        const petals = 5 + Math.floor(r() * 4);
        const col = pick(r, [a, b, d]);
        const rot = r() * Math.PI;
        wrap(T, pt.x, pt.y, s * 2.2, (x, y) => {
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(rot);
          ctx.fillStyle = col;
          for (let i = 0; i < petals; i++) {
            ctx.rotate((Math.PI * 2) / petals);
            ctx.beginPath();
            ctx.ellipse(0, -s, s * 0.42, s * 0.85, 0, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStyle = c;
          ctx.beginPath();
          ctx.arc(0, 0, s * 0.45, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });
      }
      // sprigs between flowers
      for (const pt of scatter(r, T, 5, 0.9)) {
        const len = T * 0.05;
        const rot = r() * Math.PI * 2;
        wrap(T, pt.x, pt.y, len, (x, y) => {
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(rot);
          leaf(ctx, len, len * 0.3, b, b);
          ctx.restore();
        });
      }
      break;
    }
    case "leaves": {
      for (const pt of scatter(r, T, 4, 0.9)) {
        const len = T * (0.14 + r() * 0.1);
        const rot = r() * Math.PI * 2;
        const fill = pick(r, [a, b, d]);
        const count = 3 + Math.floor(r() * 3);
        wrap(T, pt.x, pt.y, len * 1.6, (x, y) => {
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(rot);
          // a stem with leaves
          ctx.strokeStyle = fill;
          ctx.lineWidth = Math.max(1.2, T * 0.004);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(len * 0.15, len * 0.6, 0, len * 1.3);
          ctx.stroke();
          for (let i = 0; i < count; i++) {
            const t = (i + 0.5) / count;
            ctx.save();
            ctx.translate(len * 0.08 * Math.sin(t * 3), len * 1.2 * t);
            ctx.rotate((i % 2 ? 1 : -1) * (0.7 + t * 0.3));
            leaf(ctx, len * 0.5, len * 0.17, fill, bg);
            ctx.restore();
          }
          ctx.restore();
        });
      }
      break;
    }
    case "blobs": {
      for (const pt of scatter(r, T, 3, 0.8)) {
        const s = T * (0.08 + r() * 0.07);
        const col = pick(r, inks);
        const kind = r();
        const seed = r() * 1e6;
        const rot = r() * Math.PI;
        wrap(T, pt.x, pt.y, s * 2, (x, y) => {
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(rot);
          ctx.fillStyle = col;
          ctx.strokeStyle = col;
          if (kind < 0.45) blob(ctx, mulberry32(seed), s);
          else if (kind < 0.7) {
            // arc stroke
            ctx.lineWidth = s * 0.35;
            ctx.beginPath();
            ctx.arc(0, 0, s, Math.PI, Math.PI * 2);
            ctx.stroke();
          } else {
            // squiggle
            ctx.lineWidth = s * 0.18;
            ctx.beginPath();
            for (let i = 0; i <= 24; i++) {
              const t = i / 24;
              ctx.lineTo((t - 0.5) * s * 2.4, Math.sin(t * Math.PI * 3) * s * 0.3);
            }
            ctx.stroke();
          }
          ctx.restore();
        });
      }
      break;
    }
    case "terrazzo": {
      for (const pt of scatter(r, T, 9, 1)) {
        const s = T * (0.01 + r() * 0.03);
        const col = pick(r, inks);
        const seed = r() * 1e6;
        wrap(T, pt.x, pt.y, s * 1.6, (x, y) => {
          ctx.save();
          ctx.translate(x, y);
          ctx.fillStyle = col;
          blob(ctx, mulberry32(seed), s);
          ctx.restore();
        });
      }
      break;
    }
    case "arches": {
      for (const pt of scatter(r, T, 3, 0.7)) {
        const s = T * (0.07 + r() * 0.04);
        const cols = [pick(r, inks), pick(r, inks), pick(r, inks)];
        wrap(T, pt.x, pt.y, s * 1.3, (x, y) => {
          ctx.save();
          ctx.translate(x, y + s * 0.4);
          const band = s / 3.4;
          cols.forEach((col, i) => {
            ctx.strokeStyle = col;
            ctx.lineWidth = band * 0.9;
            ctx.lineCap = "butt";
            ctx.beginPath();
            ctx.arc(0, 0, s - band * i - band / 2, Math.PI, Math.PI * 2);
            ctx.stroke();
          });
          ctx.restore();
        });
      }
      break;
    }
    case "trellis": {
      const s = T / 2;
      ctx.strokeStyle = a;
      ctx.lineWidth = T * 0.022;
      for (let i = 0; i <= 2; i++)
        for (let j = 0; j <= 2; j++) {
          for (const [ox, oy] of [
            [0, 0],
            [0.5, 0.5],
          ]) {
            ctx.beginPath();
            ctx.arc((i + ox) * s, (j + oy) * s, s * 0.5, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
      ctx.fillStyle = b;
      for (let i = 0; i <= 2; i++)
        for (let j = 0; j <= 2; j++) {
          ctx.beginPath();
          ctx.arc((i + 0.5) * s, j * s, T * 0.018, 0, Math.PI * 2);
          ctx.arc(i * s, (j + 0.5) * s, T * 0.018, 0, Math.PI * 2);
          ctx.fill();
        }
      break;
    }
    case "scallops": {
      const n = 4;
      const s = T / n;
      for (let j = n * 2; j >= -1; j--) {
        for (let i = -1; i <= n; i++) {
          const x = (i + (j % 2 ? 0.5 : 0)) * s + s / 2;
          const y = (j * s) / 2;
          ctx.fillStyle = inks[(i + j * 3 + 400) % 2 === 0 ? 0 : 3] ?? a;
          ctx.beginPath();
          ctx.arc(x, y, s / 2, 0, Math.PI);
          ctx.fill();
          ctx.strokeStyle = bg;
          ctx.lineWidth = T * 0.008;
          ctx.beginPath();
          ctx.arc(x, y, s / 2, 0, Math.PI);
          ctx.stroke();
          ctx.fillStyle = b;
          ctx.beginPath();
          ctx.arc(x, y + s * 0.12, s * 0.06, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }
    case "chevron": {
      const n = 4;
      const h = T / n;
      for (let j = -1; j <= n; j++) {
        ctx.strokeStyle = inks[((j % 4) + 4) % 4];
        ctx.lineWidth = h * 0.36;
        ctx.lineCap = "butt";
        ctx.lineJoin = "miter";
        ctx.beginPath();
        for (let i = 0; i <= 4; i++) ctx.lineTo((i * T) / 4, j * h + (i % 2 ? h * 0.35 : -h * 0.05));
        ctx.stroke();
      }
      break;
    }
    case "stripes": {
      let x = 0;
      const widths = [0.12, 0.03, 0.06, 0.02, 0.1, 0.04];
      let k = Math.floor(r() * 4);
      while (x < T) {
        const w = pick(r, widths) * T;
        const col = r() < 0.4 ? bg : inks[k++ % 4];
        ctx.fillStyle = col;
        ctx.fillRect(x, 0, Math.min(w, T - x), T);
        x += w;
      }
      break;
    }
    case "gingham": {
      const n = 4;
      const s = T / n;
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = a;
      for (let i = 0; i < n; i++) {
        ctx.fillRect(i * s, 0, s / 2, T);
        ctx.fillRect(0, i * s, T, s / 2);
      }
      ctx.globalAlpha = 1;
      break;
    }
    case "plaid": {
      const bands = [
        { o: 0, w: 0.3, c: a, al: 0.55 },
        { o: 0.42, w: 0.06, c: b, al: 0.8 },
        { o: 0.6, w: 0.18, c: c, al: 0.45 },
        { o: 0.86, w: 0.02, c: d, al: 0.9 },
      ];
      for (const bd of bands) {
        ctx.globalAlpha = bd.al;
        ctx.fillStyle = bd.c;
        ctx.fillRect(bd.o * T, 0, bd.w * T, T);
        ctx.fillRect(0, bd.o * T, T, bd.w * T);
      }
      ctx.globalAlpha = 1;
      break;
    }
    case "quilt": {
      const n = 3;
      const s = T / n;
      for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++) {
          const x = i * s;
          const y = j * s;
          const [c1, c2] = [pick(r, [bg, ...inks]), pick(r, inks)];
          ctx.fillStyle = c1;
          ctx.fillRect(x, y, s, s);
          ctx.fillStyle = c2;
          ctx.beginPath();
          const q = Math.floor(r() * 4);
          const corners = [
            [x, y],
            [x + s, y],
            [x + s, y + s],
            [x, y + s],
          ];
          ctx.moveTo(corners[q][0], corners[q][1]);
          ctx.lineTo(corners[(q + 1) % 4][0], corners[(q + 1) % 4][1]);
          ctx.lineTo(corners[(q + 2) % 4][0], corners[(q + 2) % 4][1]);
          ctx.closePath();
          ctx.fill();
          if (r() < 0.35) {
            ctx.fillStyle = pick(r, inks);
            ctx.beginPath();
            ctx.arc(x + s / 2, y + s / 2, s * 0.18, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      break;
    }
    case "mandala": {
      const cx = T / 2;
      const rings = 6;
      for (let k = rings; k >= 1; k--) {
        const rad = (T * 0.48 * k) / rings;
        const petals = 8 + k * 4;
        const col = inks[k % 4];
        ctx.fillStyle = col;
        for (let i = 0; i < petals; i++) {
          const ang = (Math.PI * 2 * i) / petals + (k % 2 ? Math.PI / petals : 0);
          ctx.save();
          ctx.translate(cx, cx);
          ctx.rotate(ang);
          ctx.beginPath();
          const pw = (Math.PI * rad) / petals;
          ctx.moveTo(0, -rad + T * 0.05);
          ctx.quadraticCurveTo(pw, -rad + T * 0.02, 0, -rad - T * 0.015);
          ctx.quadraticCurveTo(-pw, -rad + T * 0.02, 0, -rad + T * 0.05);
          ctx.fill();
          ctx.restore();
        }
        ctx.fillStyle = k % 2 ? bg : inks[(k + 1) % 4];
        ctx.beginPath();
        ctx.arc(cx, cx, rad - T * 0.045, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = col;
        ctx.lineWidth = T * 0.004;
        ctx.setLineDash([T * 0.004, T * 0.012]);
        ctx.beginPath();
        ctx.arc(cx, cx, rad - T * 0.055, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.fillStyle = a;
      ctx.save();
      ctx.translate(cx, cx);
      star(ctx, T * 0.05, 8, 0.5);
      ctx.restore();
      break;
    }
    case "ombre": {
      const g = ctx.createLinearGradient(0, 0, 0, T);
      g.addColorStop(0, a);
      g.addColorStop(0.55, c);
      g.addColorStop(1, bg);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, T, T);
      break;
    }
  }
}

const tileCache = new Map<string, HTMLCanvasElement>();

/** A seamless tile of the pattern, `px` pixels square (cached). */
export function patternTile(p: PatternParams, px: number): HTMLCanvasElement {
  const size = Math.max(32, Math.min(4096, Math.round(px)));
  const key = `${p.kind}|${p.colors.join(",")}|${p.seed}|${size}`;
  let c = tileCache.get(key);
  if (c) return c;
  c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  drawTile(ctx, size, p);
  if (tileCache.size > 40) tileCache.delete(tileCache.keys().next().value!);
  tileCache.set(key, c);
  return c;
}

/** Patterns that are one motif across the whole pillow rather than a repeat. */
export const isSingleMotif = (k: PatternKind) => k === "mandala" || k === "ombre";
