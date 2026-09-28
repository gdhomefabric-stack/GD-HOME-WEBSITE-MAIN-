/**
 * Custom Print Pillow Studio — shapes, sizes, fabrics, finishes and prices.
 * Prices are in the site CURRENCY (see catalog.ts) and are estimates for one
 * finished pillow. Edit this file to change the offer.
 */

export type PrintShapeId =
  | "square"
  | "rectangle"
  | "round"
  | "heart"
  | "star"
  | "cloud"
  | "hexagon"
  | "moon"
  | "arch"
  | "flower"
  | "letter";

export interface PrintSize {
  id: string;
  /** width × height in cm */
  w: number;
  h: number;
  label: string;
}

export interface PrintShape {
  id: PrintShapeId;
  name: string;
  note: string;
  /**
   * SVG path of the cutting line, and the view box [x, y, w, h] it spans —
   * the box is stretched onto the chosen size. The letter shape has no path;
   * it is drawn from the chosen letter.
   */
  d?: string;
  vb: [number, number, number, number];
  /** the sewn, filled silhouette used for the mock-up (sides pinch in a little) */
  puff?: string;
  sizes: PrintSize[];
  /** extra make-up cost for shaped cutting and sewing */
  surcharge: number;
  /** can take a zip + separate insert (otherwise stuffed and stitched closed) */
  zip: boolean;
  /** corners that can take tassels */
  corners: boolean;
}

const sq = (cm: number): PrintSize => ({ id: `${cm}`, w: cm, h: cm, label: `${cm} × ${cm} cm` });
const rect = (w: number, h: number): PrintSize => ({ id: `${w}x${h}`, w, h, label: `${w} × ${h} cm` });
const dia = (cm: number): PrintSize => ({ id: `${cm}`, w: cm, h: cm, label: `Ø ${cm} cm` });

/** five-point star in a 100 × 100 box */
function starPath() {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 50 : 22;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    pts.push(`${(50 + r * Math.cos(a)).toFixed(2)} ${(54 + r * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join(" L")} Z`;
}

/** star with rounded, stuffed-looking points */
function puffyStarPath() {
  const outer: [number, number][] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 49 : 24;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    outer.push([50 + r * Math.cos(a), 54 + r * Math.sin(a)]);
  }
  let d = "";
  for (let i = 0; i < 10; i++) {
    const p = outer[i];
    const prev = outer[(i + 9) % 10];
    const next = outer[(i + 1) % 10];
    const t = i % 2 === 0 ? 0.16 : 0.1;
    const a: [number, number] = [p[0] + (prev[0] - p[0]) * t, p[1] + (prev[1] - p[1]) * t];
    const b: [number, number] = [p[0] + (next[0] - p[0]) * t, p[1] + (next[1] - p[1]) * t];
    d += `${i === 0 ? "M" : "L"}${a[0].toFixed(2)} ${a[1].toFixed(2)} Q${p[0].toFixed(2)} ${p[1].toFixed(2)} ${b[0].toFixed(2)} ${b[1].toFixed(2)} `;
  }
  return `${d}Z`;
}

function flowerPath(petals = 8) {
  let d = "";
  for (let i = 0; i < petals; i++) {
    const a0 = (Math.PI * 2 * i) / petals - Math.PI / 2;
    const a1 = (Math.PI * 2 * (i + 1)) / petals - Math.PI / 2;
    const am = (a0 + a1) / 2;
    const r0 = 34;
    const p0 = [50 + r0 * Math.cos(a0), 50 + r0 * Math.sin(a0)];
    const p1 = [50 + r0 * Math.cos(a1), 50 + r0 * Math.sin(a1)];
    const c = [50 + 66 * Math.cos(am), 50 + 66 * Math.sin(am)];
    if (i === 0) d += `M${p0[0].toFixed(2)} ${p0[1].toFixed(2)} `;
    d += `Q${c[0].toFixed(2)} ${c[1].toFixed(2)} ${p1[0].toFixed(2)} ${p1[1].toFixed(2)} `;
  }
  return `${d}Z`;
}

function hexPath() {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i;
    pts.push(`${(50 + 50 * Math.cos(a)).toFixed(2)} ${(43.3 + 50 * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join(" L")} Z`;
}

function puffyHexPath() {
  const pts: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i;
    pts.push([50 + 49 * Math.cos(a), 43.3 + 49 * Math.sin(a)]);
  }
  let d = "";
  pts.forEach((p, i) => {
    const n = pts[(i + 1) % 6];
    const prev = pts[(i + 5) % 6];
    const t = 0.12;
    const a = [p[0] + (prev[0] - p[0]) * t, p[1] + (prev[1] - p[1]) * t];
    const b = [p[0] + (n[0] - p[0]) * t, p[1] + (n[1] - p[1]) * t];
    d += `${i === 0 ? "M" : "L"}${a[0].toFixed(2)} ${a[1].toFixed(2)} Q${p[0].toFixed(2)} ${p[1].toFixed(2)} ${b[0].toFixed(2)} ${b[1].toFixed(2)} `;
  });
  return `${d}Z`;
}

/** a sewn square: the sides pinch in and the corners poke out */
const puffRect = (w: number, h: number, pinch: number) =>
  `M1 1 Q${w / 2} ${1 + pinch} ${w - 1} 1 Q${w - 1 - pinch} ${h / 2} ${w - 1} ${h - 1} Q${w / 2} ${h - 1 - pinch} 1 ${h - 1} Q${1 + pinch} ${h / 2} 1 1 Z`;

export const PRINT_SHAPES: PrintShape[] = [
  {
    id: "square",
    vb: [0, 0, 100, 100],
    name: "Square",
    note: "The classic sofa cushion",
    d: "M0 0 H100 V100 H0 Z",
    puff: puffRect(100, 100, 4.5),
    sizes: [sq(30), sq(40), sq(45), sq(50), sq(60)],
    surcharge: 0,
    zip: true,
    corners: true,
  },
  {
    id: "rectangle",
    vb: [0, 0, 100, 60],
    name: "Lumbar",
    note: "Long and low, for beds and chairs",
    d: "M0 0 H100 V60 H0 Z",
    puff: puffRect(100, 60, 3.5),
    sizes: [rect(50, 30), rect(60, 35), rect(60, 40), rect(80, 40)],
    surcharge: 0,
    zip: true,
    corners: true,
  },
  {
    id: "round",
    vb: [0, 0, 100, 100],
    name: "Round",
    note: "Soft and modern",
    d: "M50 0 A50 50 0 1 1 49.99 0 Z",
    sizes: [dia(35), dia(40), dia(45), dia(50)],
    surcharge: 4,
    zip: true,
    corners: false,
  },
  {
    id: "heart",
    vb: [0, 0, 100, 90],
    name: "Heart",
    note: "Weddings, anniversaries, Valentine's",
    d: "M50 90 C20 70 0 52 0 28 C0 11 13 0 27 0 C38 0 46 6 50 15 C54 6 62 0 73 0 C87 0 100 11 100 28 C100 52 80 70 50 90 Z",
    sizes: [rect(35, 32), rect(40, 36), rect(50, 45)],
    surcharge: 7,
    zip: false,
    corners: false,
  },
  {
    id: "star",
    vb: [2.4, 4, 95.2, 90.5],
    name: "Star",
    note: "Kids' rooms and festive gifts",
    d: starPath(),
    puff: puffyStarPath(),
    sizes: [sq(40), sq(50)],
    surcharge: 8,
    zip: false,
    corners: false,
  },
  {
    id: "cloud",
    vb: [0, 5, 100, 65],
    name: "Cloud",
    note: "Nursery favourite",
    d: "M18 70 C6 70 0 62 0 52 C0 41 8 33 19 33 C20 16 33 5 48 5 C61 5 71 13 75 24 C89 24 100 35 100 48 C100 61 90 70 78 70 Z",
    sizes: [rect(45, 32), rect(55, 38), rect(65, 45)],
    surcharge: 7,
    zip: false,
    corners: false,
  },
  {
    id: "hexagon",
    vb: [0, 0, 100, 86.6],
    name: "Hexagon",
    note: "Graphic and geometric",
    d: hexPath(),
    puff: puffyHexPath(),
    sizes: [rect(40, 35), rect(50, 43)],
    surcharge: 5,
    zip: true,
    corners: false,
  },
  {
    id: "moon",
    vb: [3, 2, 73, 146],
    name: "Crescent moon",
    note: "Dreamy bedroom accent",
    d: "M76 2 A73 73 0 1 0 76 148 A90 90 0 0 1 76 2 Z",
    sizes: [rect(25, 50), rect(30, 60)],
    surcharge: 8,
    zip: false,
    corners: false,
  },
  {
    id: "arch",
    vb: [0, 0, 100, 75],
    name: "Arch",
    note: "The boho rainbow",
    d: "M0 75 L0 50 A50 50 0 0 1 100 50 L100 75 L72 75 L72 50 A22 22 0 0 0 28 50 L28 75 Z",
    sizes: [rect(40, 30), rect(50, 38)],
    surcharge: 8,
    zip: false,
    corners: false,
  },
  {
    id: "flower",
    vb: [1.3, 1.3, 97.4, 97.4],
    name: "Flower",
    note: "Retro daisy",
    d: flowerPath(8),
    sizes: [sq(40), sq(50)],
    surcharge: 8,
    zip: false,
    corners: false,
  },
  {
    id: "letter",
    vb: [0, 0, 100, 125],
    name: "Letter",
    note: "An initial — any letter or number",
    sizes: [rect(32, 40), rect(40, 50)],
    surcharge: 10,
    zip: false,
    corners: false,
  },
];

export const PRINT_SHAPE_BY_ID = Object.fromEntries(PRINT_SHAPES.map((s) => [s.id, s])) as Record<PrintShapeId, PrintShape>;

/* ------------------------------------------------------------------ */
/* Fabrics, finishes, inserts                                          */
/* ------------------------------------------------------------------ */

export type PrintFabricId = "peachskin" | "satin" | "velvet" | "linen" | "canvas";
export interface PrintFabric {
  id: PrintFabricId;
  name: string;
  note: string;
  factor: number;
  /** how the print looks on it, for the preview */
  sheen: number;
  texture: "smooth" | "pile" | "weave" | "canvas";
  saturation: number;
}
export const PRINT_FABRICS: PrintFabric[] = [
  { id: "peachskin", name: "Soft-touch peach skin", note: "Brightest colours, silky-soft, machine washable", factor: 1, sheen: 0.12, texture: "smooth", saturation: 1 },
  { id: "satin", name: "Satin", note: "Liquid sheen for photos and glam prints", factor: 1.15, sheen: 0.38, texture: "smooth", saturation: 1.05 },
  { id: "velvet", name: "Short-pile velvet", note: "Deep, rich colour with a plush hand", factor: 1.35, sheen: 0.2, texture: "pile", saturation: 1.08 },
  { id: "linen", name: "Linen look", note: "Natural slub weave, softly muted print", factor: 1.25, sheen: 0.04, texture: "weave", saturation: 0.86 },
  { id: "canvas", name: "Cotton canvas", note: "Sturdy and matte, for outdoor and kids", factor: 1.2, sheen: 0.02, texture: "canvas", saturation: 0.92 },
];
export const PRINT_FABRIC_BY_ID = Object.fromEntries(PRINT_FABRICS.map((f) => [f.id, f])) as Record<PrintFabricId, PrintFabric>;

export type EdgeId = "seam" | "piping" | "flange" | "pompom" | "tassel";
export const EDGES: { id: EdgeId; name: string; note: string; price: number; needsCorners?: boolean }[] = [
  { id: "seam", name: "Clean seam", note: "Invisible knife edge", price: 0 },
  { id: "piping", name: "Piping", note: "A crisp corded edge", price: 6 },
  { id: "flange", name: "Flat flange", note: "A 2 cm border", price: 8 },
  { id: "pompom", name: "Pom-pom trim", note: "Playful bobbles", price: 10 },
  { id: "tassel", name: "Corner tassels", note: "Four hand-knotted tassels", price: 9, needsCorners: true },
];

export type BackId = "same" | "plain" | "custom";
export const BACKS: { id: BackId; name: string; note: string }[] = [
  { id: "same", name: "Same as front", note: "Printed both sides" },
  { id: "plain", name: "Plain colour", note: "Solid fabric back" },
  { id: "custom", name: "Its own design", note: "Design the back too" },
];

export type InsertId = "cover" | "fibre" | "feather";
export const INSERTS: { id: InsertId; name: string; note: string; base: number; perM2: number; zipOnly?: boolean }[] = [
  { id: "cover", name: "Cover only", note: "Zipped cover, use your own insert", base: 0, perM2: 0, zipOnly: true },
  { id: "fibre", name: "Hollow-fibre filled", note: "Plump, washable, hypoallergenic", base: 5, perM2: 22 },
  { id: "feather", name: "Goose feather insert", note: "Our signature luxurious squish", base: 12, perM2: 55, zipOnly: true },
];

export const TRIM_COLOURS = [
  { id: "ivory", name: "Ivory", hex: "#efe6d4" },
  { id: "gold", name: "Antique gold", hex: "#c69a3f" },
  { id: "blush", name: "Blush", hex: "#e3b9ad" },
  { id: "sage", name: "Sage", hex: "#9fae8a" },
  { id: "navy", name: "Navy", hex: "#23324d" },
  { id: "terracotta", name: "Terracotta", hex: "#c0643f" },
  { id: "charcoal", name: "Charcoal", hex: "#3b3834" },
  { id: "black", name: "Black", hex: "#141312" },
];

/* ------------------------------------------------------------------ */
/* Pricing                                                             */
/* ------------------------------------------------------------------ */

/** print + cut + sew, per side, before fabric factor */
const COVER_BASE = 12;
const PRINT_PER_M2 = 95;

export const BULK_TIERS = [
  { min: 25, off: 0.15 },
  { min: 10, off: 0.1 },
  { min: 5, off: 0.05 },
];
export const bulkDiscount = (qty: number) => BULK_TIERS.find((t) => qty >= t.min)?.off ?? 0;

export interface PrintSpec {
  shape: PrintShapeId;
  sizeId: string;
  letter: string;
  fabric: PrintFabricId;
  edge: EdgeId;
  trim: string;
  back: BackId;
  backColour: string;
  insert: InsertId;
}

export const sizeOf = (spec: Pick<PrintSpec, "shape" | "sizeId">): PrintSize => {
  const s = PRINT_SHAPE_BY_ID[spec.shape];
  return s.sizes.find((z) => z.id === spec.sizeId) ?? s.sizes[0];
};

export function printUnitPrice(spec: PrintSpec): number {
  const shape = PRINT_SHAPE_BY_ID[spec.shape];
  const size = sizeOf(spec);
  const area = (size.w * size.h) / 10000;
  const fabric = PRINT_FABRIC_BY_ID[spec.fabric];
  const print = PRINT_PER_M2 * area;
  const sides = spec.back === "plain" ? print * 0.35 : print;
  const cover = (COVER_BASE + print + sides) * fabric.factor;
  const edge = EDGES.find((e) => e.id === spec.edge)?.price ?? 0;
  const ins = INSERTS.find((i) => i.id === spec.insert) ?? INSERTS[1];
  const insert = ins.base + ins.perM2 * area;
  return Math.round(cover + edge + insert + shape.surcharge);
}

/** Options that are not possible with a shape fall back to one that is. */
export function normaliseSpec(spec: PrintSpec): PrintSpec {
  const shape = PRINT_SHAPE_BY_ID[spec.shape];
  const next = { ...spec };
  if (!shape.sizes.some((z) => z.id === spec.sizeId)) next.sizeId = shape.sizes[Math.min(1, shape.sizes.length - 1)].id;
  if (!shape.zip && INSERTS.find((i) => i.id === spec.insert)?.zipOnly) next.insert = "fibre";
  if (!shape.corners && spec.edge === "tassel") next.edge = "piping";
  return next;
}

export function describePrint(spec: PrintSpec): string {
  const shape = PRINT_SHAPE_BY_ID[spec.shape];
  const name = spec.shape === "letter" ? `Letter “${spec.letter}”` : shape.name;
  return `Custom print ${name.toLowerCase().startsWith("letter") ? name : name.toLowerCase()} pillow`;
}

export function printDetails(spec: PrintSpec, ref?: string): Record<string, string> {
  const shape = PRINT_SHAPE_BY_ID[spec.shape];
  const edge = EDGES.find((e) => e.id === spec.edge)!;
  const trim = TRIM_COLOURS.find((t) => t.id === spec.trim);
  const out: Record<string, string> = {
    Shape: spec.shape === "letter" ? `Letter ${spec.letter}` : shape.name,
    Size: sizeOf(spec).label,
    Fabric: PRINT_FABRIC_BY_ID[spec.fabric].name,
    Edge: edge.id === "seam" || !trim ? edge.name : `${edge.name}, ${trim.name}`,
    Back: BACKS.find((b) => b.id === spec.back)!.name,
    Filling: INSERTS.find((i) => i.id === spec.insert)!.name,
  };
  if (ref) out["Design ref"] = ref;
  return out;
}

export const DEFAULT_SPEC: PrintSpec = {
  shape: "square",
  sizeId: "45",
  letter: "A",
  fabric: "peachskin",
  edge: "piping",
  trim: "gold",
  back: "plain",
  backColour: "#efe6d4",
  insert: "fibre",
};

/** Print files: resolution and bleed added around the cutting line. */
export const PRINT_DPI = 150;
export const BLEED_CM = 1.5;
/** keep text and faces this far inside the cutting line */
export const SAFE_CM = 2.5;
