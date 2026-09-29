/**
 * Procedural texture generator.
 *
 *  - Curtain fabrics  → public/textures/fabric/<kind>-{detail,normal}.ktx2  (GPU-compressed, Basis Universal)
 *                     → public/textures/fabric/<kind>-closeup.webp          (UI fabric loupe)
 *  - Architecture     → scripts/.cache/arch/*.png  (embedded + KTX2-compressed into villa.glb by build-villa.ts)
 *  - `fabric-png`     → scripts/.cache/fabric/*.png  (the same fabrics for the Blender photographs)
 *
 * Everything is seeded and tileable, so re-running produces the same assets.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Field, fbm, fbm2, hex, mix, normalMap, rgbaFrom, smoothstep, clamp01, type RGB } from "./lib/noise";
import { rawToKTX2, rawToPNG, rawToWebP, svgToRaw } from "./lib/encode";

const ROOT = path.resolve(import.meta.dirname, "..");
const FABRIC_DIR = path.join(ROOT, "public/textures/fabric");
const ARCH_DIR = path.join(ROOT, "scripts/.cache/arch");
const FABRIC_PNG_DIR = path.join(ROOT, "scripts/.cache/fabric");
/** write PNGs for Blender instead of the web textures */
const PNG_ONLY = process.argv[2] === "fabric-png";

const log = (...a: unknown[]) => console.log("[textures]", ...a);

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

const hash1 = (i: number, seed: number) => {
  let h = Math.imul(i ^ (seed * 0x9e3779b1), 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};

/** 1-D tileable noise along a thread. */
const noise1 = (t: number, period: number, seed: number) => {
  const i = Math.floor(t);
  const f = t - i;
  const a = hash1(((i % period) + period) % period, seed);
  const b = hash1((((i + 1) % period) + period) % period, seed);
  const s = f * f * (3 - 2 * f);
  return a + (b - a) * s;
};

function greyRGBA(f: Field, alpha?: Field): Uint8Array {
  const out = new Uint8Array(f.w * f.h * 4);
  for (let i = 0; i < f.w * f.h; i++) {
    const v = Math.round(clamp01(f.data[i]) * 255);
    out[i * 4] = v;
    out[i * 4 + 1] = v;
    out[i * 4 + 2] = v;
    out[i * 4 + 3] = alpha ? Math.round(clamp01(alpha.data[i]) * 255) : 255;
  }
  return out;
}

interface FabricFields {
  height: Field;
  albedo: Field;
  alpha?: Field;
  normalStrength: number;
}

/** Woven cloth: warp/weft threads with slubs, plain or twill interlacing. */
function weave(opts: {
  size: number;
  threads: number;
  thickness: number;
  slub: number;
  twill?: boolean;
  seed: number;
}): { h: Field; density: Field } {
  const { size, threads, thickness, slub, twill, seed } = opts;
  const h = new Field(size, size);
  const density = new Field(size, size);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const tx = (x / size) * threads;
      const ty = (y / size) * threads;
      const i = Math.floor(tx);
      const j = Math.floor(ty);
      const fx = tx - i;
      const fy = ty - j;
      // slubs: thread thickness varies along its length (tileable along the thread)
      const sw = thickness * (1 - slub + slub * 2 * noise1((y / size) * 12, 12, seed + i * 7));
      const sf = thickness * (1 - slub + slub * 2 * noise1((x / size) * 12, 12, seed + 1000 + j * 7));
      const dw = Math.abs(fx - 0.5) / (0.5 * sw);
      const df = Math.abs(fy - 0.5) / (0.5 * sf);
      const pw = dw < 1 ? Math.sqrt(1 - dw * dw) : 0;
      const pf = df < 1 ? Math.sqrt(1 - df * df) : 0;
      const warpOver = twill ? (i + j) % 3 !== 0 : (i + j) % 2 === 0;
      // the thread on top arches over the crossing
      const hw = pw * (warpOver ? 0.62 + 0.38 * Math.sin(Math.PI * fy) : 0.35 + 0.2 * Math.abs(Math.cos(Math.PI * fy)));
      const hf = pf * (!warpOver ? 0.62 + 0.38 * Math.sin(Math.PI * fx) : 0.35 + 0.2 * Math.abs(Math.cos(Math.PI * fx)));
      h.data[y * size + x] = Math.max(hw, hf);
      density.data[y * size + x] = Math.max(pw, pf);
    }
  return { h, density };
}

function fabricLinen(): FabricFields {
  const size = 512;
  const { h, density } = weave({ size, threads: 44, thickness: 0.92, slub: 0.35, seed: 11 });
  const albedo = new Field(size, size).fill((u, v, x, y) => {
    const i = Math.floor(u * 44);
    const tone = (hash1(i, 3) - 0.5) * 0.07 + (hash1(Math.floor(v * 44), 5) - 0.5) * 0.05;
    const mottle = (fbm(u, v, 6, 3, 21) - 0.5) * 0.12;
    const d = density.data[y * size + x];
    return 0.66 + 0.26 * h.data[y * size + x] + tone + mottle - (1 - d) * 0.12;
  });
  return { height: h, albedo, normalStrength: 2.6 };
}

function fabricBlackout(): FabricFields {
  const size = 512;
  const { h } = weave({ size, threads: 96, thickness: 0.98, slub: 0.08, twill: true, seed: 5 });
  const low = new Field(size, size).fill((u, v) => fbm(u, v, 5, 4, 8));
  const height = new Field(size, size).fill((_u, _v, x, y) => h.data[y * size + x] * 0.7 + low.data[y * size + x] * 0.3);
  const albedo = new Field(size, size).fill(
    (u, v, x, y) => 0.86 + 0.08 * h.data[y * size + x] + (fbm(u, v, 4, 3, 44) - 0.5) * 0.06,
  );
  return { height, albedo, normalStrength: 1.3 };
}

function fabricVelvet(): FabricFields {
  const size = 512;
  const grain = new Field(size, size).fill((_u, _v, x, y) => hash1(x * 7919 + y * 104729, 17)).blur(1);
  const crush = new Field(size, size).fill((u, v) => fbm2(u, v, 3, 14, 4, 29));
  const height = new Field(size, size).fill(
    (u, v, x, y) => grain.data[y * size + x] * 0.45 + crush.data[y * size + x] * 0.4 + fbm(u, v, 24, 2, 3) * 0.15,
  );
  const albedo = new Field(size, size).fill(
    (_u, _v, x, y) => 0.84 + (crush.data[y * size + x] - 0.5) * 0.28 + (grain.data[y * size + x] - 0.5) * 0.06,
  );
  return { height, albedo, normalStrength: 1.1 };
}

function fabricSheer(): FabricFields {
  const size = 512;
  const { h, density } = weave({ size, threads: 56, thickness: 0.36, slub: 0.45, seed: 77 });
  const cloud = new Field(size, size).fill((u, v) => fbm(u, v, 4, 3, 90));
  const albedo = new Field(size, size).fill((_u, _v, x, y) => 0.93 + 0.07 * h.data[y * size + x]);
  const alpha = new Field(size, size).fill(
    (_u, _v, x, y) => 0.32 + 0.68 * density.data[y * size + x] * (0.85 + 0.3 * cloud.data[y * size + x]),
  );
  return { height: h, albedo, alpha, normalStrength: 1.6 };
}

const FLEUR =
  "M0,-9 C3,-6 3,-2 0,0 C-3,-2 -3,-6 0,-9 Z M0,0 C4,-1 7,2 6,6 C3,6 1,4 0,2 C-1,4 -3,6 -6,6 C-7,2 -4,-1 0,0 Z M-1.1,2 L-1.1,9 L1.1,9 L1.1,2 Z M-4.5,6.4 L4.5,6.4 L4.5,7.8 L-4.5,7.8 Z";

async function embroideryMask(size: number): Promise<Field> {
  // A fleur-de-lis trellis — diamonds with a fleur at each centre and small florets at the crossings.
  const s = size;
  const cells = 2;
  const c = s / cells;
  let body = "";
  for (let i = -1; i <= cells; i++)
    for (let j = -1; j <= cells; j++) {
      const cx = i * c + c / 2;
      const cy = j * c + c / 2;
      body += `<path d="${FLEUR}" transform="translate(${cx} ${cy}) scale(${c / 42})" fill="#fff"/>`;
      body += `<circle cx="${i * c}" cy="${j * c}" r="${c * 0.035}" fill="#fff"/>`;
      for (let k = 0; k < 4; k++) {
        const a = (k * Math.PI) / 2 + Math.PI / 4;
        body += `<ellipse cx="${i * c + Math.cos(a) * c * 0.075}" cy="${j * c + Math.sin(a) * c * 0.075}" rx="${c * 0.045}" ry="${c * 0.018}" transform="rotate(${(a * 180) / Math.PI} ${i * c + Math.cos(a) * c * 0.075} ${j * c + Math.sin(a) * c * 0.075})" fill="#fff"/>`;
      }
    }
  // trellis lines
  let lines = "";
  for (let k = -cells; k <= cells * 2; k++) {
    lines += `<line x1="${k * c}" y1="0" x2="${k * c + s}" y2="${s}" stroke="#fff" stroke-width="${c * 0.012}"/>`;
    lines += `<line x1="${k * c + s}" y1="0" x2="${k * c}" y2="${s}" stroke="#fff" stroke-width="${c * 0.012}"/>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}"><rect width="${s}" height="${s}" fill="#000"/>${lines}${body}</svg>`;
  const raw = await svgToRaw(svg, s, s);
  const f = new Field(s, s);
  for (let i = 0; i < s * s; i++) f.data[i] = raw[i * 4] / 255;
  return f;
}

async function fabricEmbroidered(): Promise<FabricFields & { mask: Field; stitch: Field }> {
  const size = 1024;
  const mask = await embroideryMask(size);
  const raised = new Field(size, size);
  raised.data.set(mask.data);
  raised.blur(2);
  const stitch = new Field(size, size).fill((u, v) => 0.78 + 0.22 * Math.abs(Math.sin((u + v) * Math.PI * 160)));
  const height = new Field(size, size).fill((u, v, x, y) => {
    const rib = 0.5 + 0.5 * Math.sin(v * Math.PI * 2 * 150 + fbm(u, v, 8, 2, 4) * 2);
    const m = raised.data[y * size + x];
    return rib * 0.16 * (1 - m) + m * (0.75 + 0.25 * stitch.data[y * size + x]);
  });
  const albedo = new Field(size, size).fill((u, v) => {
    const rib = 0.5 + 0.5 * Math.sin(v * Math.PI * 2 * 150);
    return 0.86 + rib * 0.06 + (fbm(u, v, 6, 3, 61) - 0.5) * 0.06;
  });
  return { height, albedo, normalStrength: 2.2, mask, stitch };
}

/** Macro close-up for the UI loupe: grey-scale, shaded, with gentle drape folds. */
function closeup(f: FabricFields, kind: string, px = 640): Uint8Array {
  const { height, albedo } = f;
  const n = normalMap(height, f.normalStrength * 1.3);
  const L = [-0.45, 0.55, 0.7];
  const ll = Math.hypot(L[0], L[1], L[2]);
  const scale = kind === "embroidered" ? 1.1 : 1.0;
  return rgbaFrom(px, px, (u, v) => {
    const sx = Math.floor((u * px * scale) % height.w);
    const sy = Math.floor((v * px * scale) % height.h);
    const i = (sy * height.w + sx) * 4;
    const nx = n[i] / 127.5 - 1;
    const ny = -(n[i + 1] / 127.5 - 1);
    const nz = n[i + 2] / 127.5 - 1;
    const ndl = Math.max(0, (nx * L[0] + ny * L[1] + nz * L[2]) / ll);
    const fold = 0.8 + 0.2 * Math.sin(u * Math.PI * 2 * 1.6 + 0.6);
    const lightFall = 1.08 - 0.22 * Math.hypot(u - 0.25, v - 0.2);
    let lum = albedo.data[sy * albedo.w + sx] * (0.42 + 0.72 * ndl) * fold * lightFall;
    if (kind === "velvet") lum += 0.22 * Math.pow(1 - Math.abs(nz), 1.2) + 0.12 * Math.max(0, Math.sin(u * Math.PI * 2 * 1.6 + 2.1));
    if (f.alpha) {
      const a = f.alpha.data[sy * f.alpha.w + sx];
      lum = lum * a + 1.02 * (1 - a);
    }
    const g = clamp01(lum) * 255;
    return [g, g, g];
  });
}

async function writeFabric(kind: string, f: FabricFields) {
  const { w, h } = f.height;
  const detail = greyRGBA(f.albedo, f.alpha);
  const normal = normalMap(f.height, f.normalStrength);
  if (PNG_ONLY) {
    await writeFile(path.join(FABRIC_PNG_DIR, `${kind}-detail.png`), await rawToPNG(detail, w, h));
    await writeFile(path.join(FABRIC_PNG_DIR, `${kind}-normal.png`), await rawToPNG(normal, w, h));
    log("fabric png", kind);
    return;
  }
  await writeFile(path.join(FABRIC_DIR, `${kind}-detail.ktx2`), await rawToKTX2(detail, w, h, { srgb: true, quality: 200 }));
  await writeFile(
    path.join(FABRIC_DIR, `${kind}-normal.ktx2`),
    await rawToKTX2(normal, w, h, { srgb: false, uastc: true, normalMap: true }),
  );
  await writeFile(path.join(FABRIC_DIR, `${kind}-closeup.webp`), await rawToWebP(closeup(f, kind), 640, 640, 84));
  log("fabric", kind);
}

/* ------------------------------------------------------------------ */
/* architecture textures                                               */
/* ------------------------------------------------------------------ */

async function png(name: string, w: number, h: number, rgba: Uint8Array) {
  await writeFile(path.join(ARCH_DIR, `${name}.png`), await rawToPNG(rgba, w, h));
  log("arch", name);
}

function travertineColour(u: number, v: number, seed = 0): RGB {
  const band = fbm2(u, v, 2, 14, 5, 3 + seed);
  const warp = fbm2(u, v, 3, 20, 3, 9 + seed);
  let c = mix(hex("#f1e7d4"), hex("#d3c0a0"), Math.pow(band, 1.6));
  c = mix(c, hex("#c8b38f"), smoothstep(0.62, 0.8, warp) * 0.45);
  const pit = fbm2(u, v, 40, 90, 2, 31 + seed);
  c = mix(c, hex("#a8946f"), smoothstep(0.7, 0.82, pit) * 0.7);
  const vein = Math.abs(fbm2(u, v, 3, 18, 4, 41 + seed) - 0.5);
  c = mix(c, hex("#bda884"), (1 - smoothstep(0.0, 0.012, vein)) * 0.5);
  return c;
}

function walnutColour(u: number, v: number, seed = 0, palette: [string, string, string] = ["#3a271a", "#5b3e29", "#7c5a3c"]): RGB {
  const warp = fbm2(u, v, 2, 3, 4, 50 + seed) * 2.2;
  const ring = 0.5 + 0.5 * Math.sin((v * 26 + warp) * Math.PI * 2);
  const figure = fbm2(u, v, 2, 12, 4, 60 + seed);
  const pores = smoothstep(0.62, 0.75, fbm2(u, v, 64, 700, 2, 70 + seed));
  let c = mix(hex(palette[0]), hex(palette[1]), Math.pow(ring, 0.8));
  c = mix(c, hex(palette[2]), figure * 0.55);
  c = mix(c, hex(palette[0]), pores * 0.35);
  return c;
}

function planks(
  size: number,
  plankPx: number,
  palette: [string, string, string],
  seed: number,
): Uint8Array {
  const rows = Math.round(size / plankPx);
  const bounds: number[][] = [];
  for (let r = 0; r < rows; r++) {
    const cuts: number[] = [];
    let x = Math.floor(hash1(r, seed) * size * 0.5);
    const start = x;
    while (x < start + size) {
      cuts.push(x % size);
      x += Math.floor(size * (0.35 + 0.4 * hash1(r * 31 + cuts.length, seed + 1)));
    }
    bounds.push(cuts.sort((a, b) => a - b));
  }
  return rgbaFrom(size, size, (u, v, x, y) => {
    const r = Math.floor(y / plankPx) % rows;
    const cuts = bounds[r];
    let k = cuts.findIndex((c) => c > x);
    if (k === -1) k = cuts.length;
    const id = r * 97 + k;
    const ou = hash1(id, seed + 7);
    const ov = hash1(id, seed + 9);
    let c = walnutColour((u + ou) % 1, (v * 0.25 + ov) % 1, seed, palette);
    const tone = 0.92 + 0.16 * hash1(id, seed + 13);
    c = [c[0] * tone, c[1] * tone, c[2] * tone];
    const yin = y % plankPx;
    const seamY = yin < 1.5 || yin > plankPx - 1.5;
    const seamX = cuts.some((cx) => Math.abs(x - cx) < 1.2);
    if (seamY || seamX) c = mix(c, [30, 20, 14], 0.55);
    return c;
  });
}

async function art(name: string, palette: string[], variant: number) {
  const w = 384;
  const h = 480;
  const [bg, a, b, c, d] = palette;
  const shapes = [
    `<rect x="40" y="60" width="304" height="360" fill="${a}"/><circle cx="192" cy="200" r="110" fill="${b}"/><rect x="40" y="300" width="304" height="120" fill="${c}"/><path d="M40 300 Q192 230 344 300" fill="none" stroke="${d}" stroke-width="5"/>`,
    `<path d="M70 420 L70 180 A122 122 0 0 1 314 180 L314 420 Z" fill="${a}"/><path d="M110 420 L110 200 A82 82 0 0 1 274 200 L274 420 Z" fill="${b}"/><circle cx="192" cy="130" r="26" fill="${d}"/><rect x="0" y="390" width="384" height="90" fill="${c}"/>`,
    `<rect x="0" y="0" width="384" height="480" fill="${a}"/><path d="M0 330 C90 250 170 380 260 290 S384 260 384 260 L384 480 L0 480Z" fill="${b}"/><path d="M0 380 C120 330 210 430 384 350 L384 480 L0 480Z" fill="${c}"/><circle cx="280" cy="120" r="46" fill="${d}"/>`,
    `<g stroke="${a}" stroke-width="30" stroke-linecap="round" fill="none"><path d="M70 110 C160 60 250 170 320 110"/><path d="M60 240 C150 190 260 300 330 230" stroke="${b}"/><path d="M70 370 C170 320 240 420 320 360" stroke="${c}"/></g><circle cx="300" cy="80" r="18" fill="${d}"/>`,
  ];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="${bg}"/>${shapes[variant]}</svg>`;
  const raw = await svgToRaw(svg, w, h);
  // canvas grain
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const g = (fbm(x / w, y / h, 64, 2, variant) - 0.5) * 22 + (((x + y) % 3) - 1) * 2;
      raw[i] = Math.max(0, Math.min(255, raw[i] + g));
      raw[i + 1] = Math.max(0, Math.min(255, raw[i + 1] + g));
      raw[i + 2] = Math.max(0, Math.min(255, raw[i + 2] + g));
    }
  await png(name, w, h, raw);
}

async function buildArch() {
  await png(
    "travertine",
    1024,
    1024,
    rgbaFrom(1024, 1024, (u, v) => travertineColour(u, v)),
  );
  // honed floor tiles 60×120 cm, 1024 px = 2.4 m
  await png(
    "travertine_tiles",
    1024,
    1024,
    rgbaFrom(1024, 1024, (u, v, x, y) => {
      const tw = 512;
      const th = 256;
      const row = Math.floor(y / th);
      const xo = (x + (row % 2) * (tw / 2)) % 1024;
      const col = Math.floor(xo / tw);
      const id = row * 13 + col;
      const ou = hash1(id, 4);
      const ov = hash1(id, 6);
      let c = travertineColour((u * 0.9 + ou) % 1, (v * 0.9 + ov) % 1, (id % 3) * 7);
      const tone = 0.96 + 0.06 * hash1(id, 8);
      c = [c[0] * tone, c[1] * tone, c[2] * tone];
      const gx = xo % tw;
      const gy = y % th;
      if (gx < 1.5 || gx > tw - 1.5 || gy < 1.5 || gy > th - 1.5) c = mix(c, hex("#a8977a"), 0.6);
      return c;
    }),
  );
  await png("walnut", 1024, 1024, rgbaFrom(1024, 1024, (u, v) => walnutColour(u, v)));
  await png("walnut_planks", 1024, 1024, planks(1024, 86, ["#3b281b", "#5c3f2a", "#7a583a"], 3));
  await png("oak_planks", 1024, 1024, planks(1024, 88, ["#a98559", "#c4a47a", "#d8bf98"], 9));
  await png(
    "plaster",
    512,
    512,
    rgbaFrom(512, 512, (u, v) => {
      const cloud = fbm(u, v, 3, 5, 12);
      const fine = fbm(u, v, 48, 2, 13);
      const g = 232 + (cloud - 0.5) * 26 + (fine - 0.5) * 8;
      return [g, g, g];
    }),
  );
  await png(
    "weave",
    512,
    512,
    (() => {
      const { h } = weave({ size: 512, threads: 64, thickness: 0.95, slub: 0.3, seed: 123 });
      return rgbaFrom(512, 512, (u, v, x, y) => {
        const loops = fbm(u, v, 32, 3, 91);
        const g = 196 + h.data[y * 512 + x] * 40 + (loops - 0.5) * 40;
        return [g, g, g];
      });
    })(),
  );
  await png(
    "carpet",
    512,
    512,
    rgbaFrom(512, 512, (u, v) => {
      const g = 200 + (fbm(u, v, 96, 2, 5) - 0.5) * 70 + (fbm(u, v, 4, 3, 6) - 0.5) * 24;
      return [g, g, g];
    }),
  );
  await png(
    "marble",
    1024,
    1024,
    rgbaFrom(1024, 1024, (u, v) => {
      const t = fbm(u, v, 3, 5, 17);
      const vein = Math.abs(Math.sin((u * 2 + v + t * 3.2) * Math.PI * 2));
      const thin = 1 - smoothstep(0, 0.05, vein);
      const soft = 1 - smoothstep(0, 0.28, vein);
      let c = mix(hex("#f3f0ea"), hex("#e3ddd3"), fbm(u, v, 6, 3, 33));
      c = mix(c, hex("#b8b1a6"), soft * 0.35);
      c = mix(c, hex("#8a8177"), thin * 0.6);
      c = mix(c, hex("#c9a86a"), thin * smoothstep(0.55, 0.7, t) * 0.5);
      return c;
    }),
  );
  await png(
    "lawn",
    512,
    512,
    rgbaFrom(512, 512, (u, v) => {
      const a = fbm(u, v, 8, 4, 40);
      const b = fbm(u, v, 64, 2, 41);
      let c = mix(hex("#6d7a46"), hex("#8c9656"), a);
      c = mix(c, hex("#5a6639"), b * 0.5);
      return c;
    }),
  );
  await png(
    "gravel",
    512,
    512,
    rgbaFrom(512, 512, (u, v) => {
      const a = fbm(u, v, 80, 2, 50);
      const b = fbm(u, v, 6, 3, 51);
      let c = mix(hex("#d9ccb2"), hex("#b9a988"), a);
      c = mix(c, hex("#cdbd9d"), b * 0.4);
      return c;
    }),
  );
  // cinema screen still — a quiet coastal dusk
  await png(
    "screen",
    512,
    288,
    rgbaFrom(512, 288, (u, v) => {
      let c = mix(hex("#f2b27a"), hex("#35415e"), smoothstep(0.0, 0.62, 1 - v));
      const sea = v > 0.62;
      if (sea) c = mix(hex("#2f3a52"), hex("#161b28"), (v - 0.62) / 0.38);
      const sun = Math.hypot((u - 0.62) * 1.7, v - 0.56);
      c = mix(c, hex("#ffe2b0"), (1 - smoothstep(0.02, 0.07, sun)) * 0.95);
      if (sea) c = mix(c, hex("#f6c48a"), (1 - smoothstep(0, 0.035, Math.abs(u - 0.62))) * 0.5 * (1 - (v - 0.62) * 2));
      const hill = 0.6 - 0.06 * Math.sin(u * 5 + 1) - 0.03 * Math.sin(u * 13);
      if (v > hill && v < 0.63) c = mix(c, hex("#1d2233"), 0.85);
      return c;
    }),
  );
  await art("art_1", ["#efe6d6", "#c9a37a", "#e6cfae", "#8a6a4a", "#3e2d22"], 0);
  await art("art_2", ["#f2ece2", "#9fb3b5", "#d9e2df", "#c8b79c", "#5b6e70"], 1);
  await art("art_3", ["#e9dccb", "#d8b48e", "#a47a57", "#5c3f2a", "#c19a5b"], 2);
  await art("art_4", ["#f4efe6", "#5e6b52", "#b08e52", "#8a4b3a", "#2f2a24"], 3);
}

async function main() {
  await mkdir(FABRIC_DIR, { recursive: true });
  await mkdir(ARCH_DIR, { recursive: true });
  await mkdir(FABRIC_PNG_DIR, { recursive: true });
  const only = process.argv[2];
  if (!only || only === "fabric" || PNG_ONLY) {
    await writeFabric("linen", fabricLinen());
    await writeFabric("blackout", fabricBlackout());
    await writeFabric("velvet", fabricVelvet());
    await writeFabric("sheer", fabricSheer());
    const emb = await fabricEmbroidered();
    await writeFabric("embroidered", emb);
    // embroidery mask (R = motif coverage, G = satin stitch shading) — linear data
    const size = emb.mask.w;
    const maskRGBA = rgbaFrom(size, size, (_u, _v, x, y) => [
      emb.mask.data[y * size + x] * 255,
      emb.stitch.data[y * size + x] * 255,
      0,
    ]);
    if (PNG_ONLY) {
      await writeFile(path.join(FABRIC_PNG_DIR, "embroidered-mask.png"), await rawToPNG(maskRGBA, size, size));
      log("done");
      return;
    }
    await writeFile(path.join(FABRIC_DIR, "embroidered-mask.ktx2"), await rawToKTX2(maskRGBA, size, size, { srgb: false, quality: 220 }));
    // gilt thread overlay for the UI loupe (alpha = motif)
    const n = normalMap(emb.height, 2.6);
    const px = 640;
    const thread = rgbaFrom(px, px, (u, v) => {
      const sx = Math.floor((u * px * 1.1) % size);
      const sy = Math.floor((v * px * 1.1) % size);
      const i = (sy * size + sx) * 4;
      const nx = n[i] / 127.5 - 1;
      const ny = -(n[i + 1] / 127.5 - 1);
      const nz = n[i + 2] / 127.5 - 1;
      const ndl = Math.max(0, -0.45 * nx + 0.55 * ny + 0.7 * nz);
      const st = emb.stitch.data[sy * size + sx];
      const base = hex("#c9a24b");
      const k = (0.45 + 0.85 * ndl) * st;
      const spec = Math.pow(ndl, 12) * 120;
      const a = emb.mask.data[sy * size + sx];
      return [base[0] * k + spec, base[1] * k + spec, base[2] * k + spec * 0.8, a * 255];
    });
    await writeFile(path.join(FABRIC_DIR, "embroidered-thread.webp"), await rawToWebP(thread, px, px, 86, true));
  }
  if (!only || only === "arch") await buildArch();
  log("done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
