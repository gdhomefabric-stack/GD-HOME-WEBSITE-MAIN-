/**
 * Builds public/models/villa.glb from the shared layout in src/data/villa.ts.
 *
 * Node naming contract with the runtime (src/components/villa/scene/Villa.tsx):
 *   site, floors, gallery, room_<id>          static groups
 *   wall_N / wall_S / wall_E / wall_W          exterior walls  (extras.cut = "ext", nx, nz)
 *   wall_int                                   partitions      (extras.cut = "part")
 *   ceiling_<id>                               per-space ceilings (hidden in the dollhouse overview)
 * Every group node sits at y = 0 so the runtime can fold walls down from the floor.
 *
 * Materials named emit_* are emissive and driven by the lighting mode at runtime.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { Document, NodeIO, type Material, type Texture } from "@gltf-transform/core";
import { ALL_EXTENSIONS, KHRMaterialsSheen, KHRTextureBasisu } from "@gltf-transform/extensions";
import { dedup, meshopt, prune, quantize, reorder } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";
import {
  BEDS,
  DOORS,
  EXT_WALL,
  INT_WALL,
  ROOMS,
  WALL_HEIGHT as H,
  WINDOWS,
  type BedSpec,
  type RoomId,
} from "../src/data/villa";
import { Group, Placer, hexLinear, mergedPrimitives, rng, setMaterials, type MatDef } from "./lib/builder";
import { pngToKTX2 } from "./lib/encode";

const ROOT = path.resolve(import.meta.dirname, "..");
const ARCH = path.join(ROOT, "scripts/.cache/arch");
const OUT = path.join(ROOT, "public/models/villa.glb");
const PI = Math.PI;

/* ------------------------------------------------------------------ */
/* materials                                                           */
/* ------------------------------------------------------------------ */

const plaster = (color: string): MatDef => ({ map: "plaster", tile: 3, color, rough: 0.93 });
const weave = (color: string, rough = 0.92): MatDef => ({ map: "weave", tile: 0.45, color, rough });
const velvet = (color: string, sheen: string): MatDef => ({
  map: "weave",
  tile: 0.3,
  color,
  rough: 0.78,
  sheen: { color: sheen, rough: 0.38 },
});
const rug = (color: string): MatDef => ({ map: "carpet", tile: 0.9, color, rough: 1 });

const MATERIALS: Record<string, MatDef> = {
  facade: { map: "travertine", tile: 2.2, color: "#f6efe4", rough: 0.72 },
  plaster_warm: plaster("#f2eadf"),
  plaster_mist: plaster("#dfe7e5"),
  plaster_blush: plaster("#f3ded4"),
  plaster_greige: plaster("#ddd2c3"),
  plaster_taupe: plaster("#cfbca6"),
  plaster_green: plaster("#57624c"),
  plaster_dark: plaster("#40342b"),
  ceiling: { map: "plaster", tile: 3, color: "#f8f4ee", rough: 0.96 },
  floor_travertine: { map: "travertine_tiles", tile: 2.4, rough: 0.4 },
  floor_walnut: { map: "walnut_planks", tile: 2.4, rough: 0.36 },
  floor_oak: { map: "oak_planks", tile: 2.6, color: "#eadfce", rough: 0.46 },
  carpet_theatre: rug("#4a3730"),
  travertine: { map: "travertine", tile: 1.4, rough: 0.52 },
  walnut: { map: "walnut", tile: 1.1, rough: 0.42 },
  oak: { map: "walnut", tile: 1.1, color: "#f7dcb4", rough: 0.5 },
  white_wood: { color: "#f1ece4", rough: 0.55 },
  rattan: { map: "weave", tile: 0.12, color: "#c09a6a", rough: 0.85 },
  brass: { color: "#c8a26a", metal: 1, rough: 0.28 },
  bronze: { color: "#7b5d41", metal: 1, rough: 0.4 },
  black_metal: { color: "#2b2825", metal: 0.6, rough: 0.42 },
  glass: { color: "#dce7e8", alpha: 0.14, rough: 0.03 },
  mirror: { color: "#eceae6", metal: 1, rough: 0.03 },
  marble: { map: "marble", tile: 1.4, rough: 0.16 },
  boucle: weave("#efe8dc", 0.97),
  linen_sand: weave("#cdbba0"),
  linen_stone: weave("#b8aa95"),
  velvet_cognac: velvet("#8c5634", "#f0b98f"),
  velvet_taupe: velvet("#8d7d6b", "#e2d2be"),
  velvet_emerald: velvet("#1e4a36", "#7fb898"),
  velvet_oxblood: velvet("#4b1c23", "#c07077"),
  velvet_moss: velvet("#4f5a3e", "#b9c49a"),
  leather_cognac: { color: "#7b4a2b", rough: 0.42 },
  bedding_white: weave("#f6f3ed", 0.9),
  throw_sea: weave("#a9bcc2"),
  throw_taupe: weave("#9b8771"),
  rug_ivory: rug("#e4d9c7"),
  rug_sand: rug("#cdb99b"),
  rug_jute: { map: "weave", tile: 0.25, color: "#bca175", rough: 1 },
  rug_pastel: rug("#ead6ca"),
  rug_runner: rug("#b9a385"),
  rug_study: rug("#6f5b46"),
  rug_suite: rug("#c9b8a2"),
  soot: { color: "#1c1917", rough: 0.9 },
  ceramic_white: { color: "#efe9df", rough: 0.32 },
  ceramic_sage: { color: "#9ba68d", rough: 0.38 },
  ceramic_dark: { color: "#3b3631", rough: 0.35 },
  terracotta: { color: "#b8714c", rough: 0.8 },
  stone_pot: { map: "travertine", tile: 0.7, color: "#e9e1d4", rough: 0.7 },
  leaf: { color: "#51643b", rough: 0.75 },
  olive_leaf: { color: "#7d8964", rough: 0.85 },
  cypress: { color: "#3e4f33", rough: 0.95 },
  bark: { color: "#6b5b49", rough: 0.95 },
  lawn: { map: "lawn", tile: 4, rough: 1 },
  gravel: { map: "gravel", tile: 2, rough: 1 },
  hedge: { map: "carpet", tile: 1.6, color: "#5c6b40", rough: 1 },
  water: { color: "#3a8b93", rough: 0.04, metal: 0.05 },
  pool_tile: { color: "#a9d4cf", rough: 0.3 },
  cushion_white: weave("#f1ede4"),
  canvas: { ...weave("#ebe2d2"), doubleSided: true },
  book_1: { color: "#6b3b2e", rough: 0.7 },
  book_2: { color: "#2f4a3f", rough: 0.7 },
  book_3: { color: "#cdbb9d", rough: 0.7 },
  book_4: { color: "#2d3547", rough: 0.7 },
  book_5: { color: "#8c6d4a", rough: 0.7 },
  toy_1: { color: "#e3b7a5", rough: 0.6 },
  toy_2: { color: "#b8c7cf", rough: 0.6 },
  toy_3: { color: "#e9d7a8", rough: 0.6 },
  toy_4: { color: "#b5c3a2", rough: 0.6 },
  speaker: { color: "#26231f", rough: 1 },
  screen: { map: "screen", color: "#ffffff", emissive: "#ffffff", emissiveMap: "screen", unitUV: true, rough: 0.9 },
  emit_lamp: { color: "#f3e7d3", emissive: "#ffc27a", rough: 0.9 },
  emit_bulb: { color: "#fff4df", emissive: "#ffd9a0", rough: 0.4 },
  emit_cove: { color: "#fbf4e8", emissive: "#ffdcaa", rough: 0.6 },
  emit_fire: { color: "#ff9a4a", emissive: "#ff7a2a", rough: 1 },
  art_1: { map: "art_1", unitUV: true, rough: 0.92 },
  art_2: { map: "art_2", unitUV: true, rough: 0.92 },
  art_3: { map: "art_3", unitUV: true, rough: 0.92 },
  art_4: { map: "art_4", unitUV: true, rough: 0.92 },
};
setMaterials(MATERIALS);

const ROOM_WALL: Record<string, string> = {
  living: "plaster_warm",
  dining: "plaster_warm",
  guest: "plaster_mist",
  nursery: "plaster_blush",
  theatre: "plaster_dark",
  study: "plaster_green",
  master: "plaster_greige",
  suite: "plaster_taupe",
  gallery: "plaster_warm",
};
const ROOM_FLOOR: Record<string, string> = {
  living: "floor_travertine",
  dining: "floor_walnut",
  guest: "floor_oak",
  nursery: "floor_oak",
  theatre: "carpet_theatre",
  study: "floor_walnut",
  master: "floor_oak",
  suite: "floor_travertine",
  gallery: "floor_travertine",
};

/* ------------------------------------------------------------------ */
/* groups                                                              */
/* ------------------------------------------------------------------ */

const groups: Group[] = [];
const G = (name: string, extras: Record<string, unknown> = {}) => {
  const g = new Group(name, [0, 0, 0], extras);
  groups.push(g);
  return g;
};
const site = G("site");
const floors = G("floors");
const wallGroups = {
  N: G("wall_N", { cut: "ext", nx: 0, nz: -1 }),
  S: G("wall_S", { cut: "ext", nx: 0, nz: 1 }),
  W: G("wall_W", { cut: "ext", nx: -1, nz: 0 }),
  E: G("wall_E", { cut: "ext", nx: 1, nz: 0 }),
  int: G("wall_int", { cut: "part" }),
};
const roomGroups = Object.fromEntries(ROOMS.map((r) => [r.id, G(`room_${r.id}`)])) as Record<RoomId, Group>;
const gallery = G("gallery");

/* ------------------------------------------------------------------ */
/* walls                                                               */
/* ------------------------------------------------------------------ */

interface Opening {
  a: number;
  b: number;
  bottom: number;
  top: number;
}

const SPACES: { id: string; b: [number, number, number, number] }[] = [
  ...ROOMS.map((r) => ({ id: r.id, b: r.bounds })),
  { id: "gallery", b: [-15, -1, 15, 1] },
];

const tZ = (z: number) => (Math.abs(Math.abs(z) - 7) < 1e-6 ? EXT_WALL : INT_WALL);
const tX = (x: number) => (Math.abs(Math.abs(x) - 15) < 1e-6 ? EXT_WALL : INT_WALL);

const END_DOOR = { centre: 0, width: 1.5, height: 2.75 };

function openingsOnZ(z: number): Opening[] {
  if (z === -7 || z === 7)
    return WINDOWS.filter((w) => (w.facade === "N" ? -7 : 7) === z).map((w) => ({
      a: w.x - w.width / 2,
      b: w.x + w.width / 2,
      bottom: w.sill,
      top: w.head,
    }));
  const key = z === -1 ? "gallery-N" : z === 1 ? "gallery-S" : null;
  return DOORS.filter((d) => d.wall === key).map((d) => ({
    a: d.centre - d.width / 2,
    b: d.centre + d.width / 2,
    bottom: 0,
    top: d.height,
  }));
}
function openingsOnX(x: number): Opening[] {
  if (x === -15 || x === 15)
    return [{ a: END_DOOR.centre - END_DOOR.width / 2, b: END_DOOR.centre + END_DOOR.width / 2, bottom: 0, top: END_DOOR.height }];
  return DOORS.filter((d) => d.wall === `x=${x}`).map((d) => ({
    a: d.centre - d.width / 2,
    b: d.centre + d.width / 2,
    bottom: 0,
    top: d.height,
  }));
}

/** Axis-aligned wall slab from (along a0..a1, across c0..c1) with openings cut out. */
function slab(g: Group, mat: string, axis: "x" | "z", a0: number, a1: number, c0: number, c1: number, openings: Opening[]) {
  const P = new Placer(g, 0, 0);
  const put = (from: number, to: number, y0: number, y1: number) => {
    if (to - from < 1e-4 || y1 - y0 < 1e-4) return;
    const along = (from + to) / 2;
    const across = (c0 + c1) / 2;
    const size: [number, number, number] =
      axis === "x" ? [to - from, y1 - y0, c1 - c0] : [c1 - c0, y1 - y0, to - from];
    const pos: [number, number, number] = axis === "x" ? [along, (y0 + y1) / 2, across] : [across, (y0 + y1) / 2, along];
    P.box(mat, pos, size);
  };
  const ops = openings.filter((o) => o.b > a0 && o.a < a1).sort((p, q) => p.a - q.a);
  let cursor = a0;
  for (const o of ops) {
    const oa = Math.max(o.a, a0);
    const ob = Math.min(o.b, a1);
    put(cursor, oa, 0, H);
    put(oa, ob, 0, o.bottom);
    put(oa, ob, o.top, H);
    cursor = ob;
  }
  put(cursor, a1, 0, H);
}

function wallGroupFor(axis: "x" | "z", line: number): Group {
  if (axis === "x" && line === -7) return wallGroups.N;
  if (axis === "x" && line === 7) return wallGroups.S;
  if (axis === "z" && line === -15) return wallGroups.W;
  if (axis === "z" && line === 15) return wallGroups.E;
  return wallGroups.int;
}

function buildWalls() {
  for (const sp of SPACES) {
    const [x0, z0, x1, z1] = sp.b;
    const mat = ROOM_WALL[sp.id];
    const hn = tZ(z0) / 2;
    const hs = tZ(z1) / 2;
    const hw = tX(x0) / 2;
    const he = tX(x1) / 2;
    slab(wallGroupFor("x", z0), mat, "x", x0, x1, z0, z0 + hn, openingsOnZ(z0));
    slab(wallGroupFor("x", z1), mat, "x", x0, x1, z1 - hs, z1, openingsOnZ(z1));
    slab(wallGroupFor("z", x0), mat, "z", z0 + hn, z1 - hs, x0, x0 + hw, openingsOnX(x0));
    slab(wallGroupFor("z", x1), mat, "z", z0 + hn, z1 - hs, x1 - he, x1, openingsOnX(x1));

    // floor + ceiling
    new Placer(floors, 0, 0).box(ROOM_FLOOR[sp.id], [(x0 + x1) / 2, -0.03, (z0 + z1) / 2], [x1 - x0, 0.06, z1 - z0]);
    const ceil = G(`ceiling_${sp.id}`, { room: sp.id });
    const cx0 = x0 + hw;
    const cx1 = x1 - he;
    const cz0 = z0 + hn;
    const cz1 = z1 - hs;
    const C = new Placer(ceil, 0, 0);
    C.box("ceiling", [(cx0 + cx1) / 2, H - 0.05, (cz0 + cz1) / 2], [cx1 - cx0, 0.1, cz1 - cz0]);
    // recessed cove: a lowered perimeter band with a warm LED line
    const band = 0.34;
    C.box("ceiling", [(cx0 + cx1) / 2, H - 0.16, cz0 + band / 2], [cx1 - cx0, 0.12, band]);
    C.box("ceiling", [(cx0 + cx1) / 2, H - 0.16, cz1 - band / 2], [cx1 - cx0, 0.12, band]);
    C.box("ceiling", [cx0 + band / 2, H - 0.16, (cz0 + cz1) / 2], [band, 0.12, cz1 - cz0 - band * 2]);
    C.box("ceiling", [cx1 - band / 2, H - 0.16, (cz0 + cz1) / 2], [band, 0.12, cz1 - cz0 - band * 2]);
    C.box("emit_cove", [(cx0 + cx1) / 2, H - 0.225, cz0 + band + 0.01], [cx1 - cx0 - band * 2, 0.012, 0.02]);
    C.box("emit_cove", [(cx0 + cx1) / 2, H - 0.225, cz1 - band - 0.01], [cx1 - cx0 - band * 2, 0.012, 0.02]);
  }

  // exterior cladding (outer half of the exterior walls), corners owned by N/S runs
  const e = EXT_WALL / 2;
  slab(wallGroups.N, "facade", "x", -15 - e, 15 + e, -7 - e, -7, openingsOnZ(-7));
  slab(wallGroups.S, "facade", "x", -15 - e, 15 + e, 7, 7 + e, openingsOnZ(7));
  slab(wallGroups.W, "facade", "z", -7, 7, -15 - e, -15, openingsOnX(-15));
  slab(wallGroups.E, "facade", "z", -7, 7, 15, 15 + e, openingsOnX(15));

  // parapet cap: a slim walnut-toned coping keeps the dollhouse cut reading as architecture
  for (const [grp, axis, line] of [
    [wallGroups.N, "x", -7],
    [wallGroups.S, "x", 7],
    [wallGroups.W, "z", -15],
    [wallGroups.E, "z", 15],
  ] as const) {
    const P = new Placer(grp, 0, 0);
    if (axis === "x") P.box("facade", [0, H + 0.05, line], [30 + EXT_WALL + 0.08, 0.1, EXT_WALL + 0.08]);
    else P.box("facade", [line, H + 0.05, 0], [EXT_WALL + 0.08, 0.1, 14 - EXT_WALL]);
  }

  // windows: frames, mullions, glass, stone sills
  for (const w of WINDOWS) {
    const grp = w.facade === "N" ? wallGroups.N : wallGroups.S;
    const zl = w.facade === "N" ? -7 : 7;
    const inward = w.facade === "N" ? 1 : -1;
    const P = new Placer(grp, w.x, zl);
    const fw = 0.05;
    const hgt = w.head - w.sill;
    const my = (w.sill + w.head) / 2;
    P.box("black_metal", [0, w.head - fw / 2, 0], [w.width, fw, 0.1]);
    P.box("black_metal", [0, w.sill + fw / 2, 0], [w.width, fw, 0.1]);
    P.box("black_metal", [-w.width / 2 + fw / 2, my, 0], [fw, hgt, 0.1]);
    P.box("black_metal", [w.width / 2 - fw / 2, my, 0], [fw, hgt, 0.1]);
    const panes = Math.max(2, Math.round(w.width / 1.1));
    for (let i = 1; i < panes; i++) {
      const x = -w.width / 2 + (w.width * i) / panes;
      P.box("black_metal", [x, my, 0], [0.035, hgt - fw * 2, 0.08]);
    }
    P.box("black_metal", [0, w.sill + hgt * 0.8, 0], [w.width - fw * 2, 0.03, 0.07]);
    P.box("glass", [0, my, 0], [w.width - fw * 2, hgt - fw * 2, 0.012]);
    if (w.sill > 0.15) {
      P.box("travertine", [0, w.sill - 0.02, inward * 0.1], [w.width + 0.12, 0.04, 0.23]);
      P.box("travertine", [0, w.sill - 0.03, -inward * 0.2], [w.width + 0.14, 0.05, 0.14]);
    }
  }

  // glazed gallery doors at both ends
  for (const x of [-15, 15]) {
    const grp = x < 0 ? wallGroups.W : wallGroups.E;
    const P = new Placer(grp, x, 0, PI / 2);
    const w = END_DOOR.width;
    const h = END_DOOR.height;
    P.box("black_metal", [0, h - 0.03, 0], [w, 0.06, 0.1]);
    P.box("black_metal", [-w / 2 + 0.03, h / 2, 0], [0.06, h, 0.1]);
    P.box("black_metal", [w / 2 - 0.03, h / 2, 0], [0.06, h, 0.1]);
    P.box("black_metal", [0, h / 2, 0], [0.05, h, 0.08]);
    P.box("black_metal", [0, 0.06, 0], [w, 0.12, 0.08]);
    P.box("glass", [0, h / 2, 0], [w - 0.1, h - 0.1, 0.012]);
    P.box("brass", [-0.1, 1.1, 0.07], [0.025, 0.5, 0.025]);
    P.box("brass", [0.1, 1.1, 0.07], [0.025, 0.5, 0.025]);
  }
}

/* ------------------------------------------------------------------ */
/* furniture kit (local frame: +x along the piece, +z = facing)         */
/* ------------------------------------------------------------------ */

type P = Placer;

function sofa(p: P, len: number, depth: number, mat: string, leg = "brass", seats = 3) {
  p.box(mat, [0, 0.27, 0], [len, 0.3, depth], 0.05);
  const inner = len - 0.4;
  const w = inner / seats;
  for (let i = 0; i < seats; i++) {
    p.box(mat, [-inner / 2 + w * (i + 0.5), 0.49, 0.1], [w - 0.02, 0.17, depth - 0.26], 0.07);
    p.box(mat, [-inner / 2 + w * (i + 0.5), 0.7, -depth / 2 + 0.2], [w - 0.03, 0.42, 0.2], 0.08, [-0.12, 0, 0]);
  }
  p.box(mat, [0, 0.58, -depth / 2 + 0.07], [len, 0.5, 0.14], 0.05);
  p.box(mat, [-len / 2 + 0.1, 0.44, 0], [0.2, 0.5, depth], 0.07);
  p.box(mat, [len / 2 - 0.1, 0.44, 0], [0.2, 0.5, depth], 0.07);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) p.cyl(leg, [sx * (len / 2 - 0.12), 0.06, sz * (depth / 2 - 0.12)], 0.022, 0.018, 0.12, 10);
}

function throwPillow(p: P, x: number, y: number, z: number, mat: string, rotY = 0, size = 0.45) {
  p.box(mat, [x, y, z], [size, size * 0.95, 0.14], 0.065, [-0.35, rotY, 0]);
}

function armchair(p: P, mat: string, leg = "walnut", w = 0.82) {
  p.box(mat, [0, 0.3, 0], [w, 0.28, 0.82], 0.06);
  p.box(mat, [0, 0.48, 0.06], [w - 0.26, 0.14, 0.62], 0.06);
  p.box(mat, [0, 0.66, -0.33], [w, 0.56, 0.16], 0.07, [-0.1, 0, 0]);
  p.box(mat, [-w / 2 + 0.08, 0.5, 0], [0.16, 0.4, 0.82], 0.06);
  p.box(mat, [w / 2 - 0.08, 0.5, 0], [0.16, 0.4, 0.82], 0.06);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) p.cyl(leg, [sx * (w / 2 - 0.1), 0.08, sz * 0.3], 0.025, 0.02, 0.16, 10);
}

function roundTable(p: P, r: number, h: number, top: string, base: string) {
  p.cyl(top, [0, h - 0.03, 0], r, r, 0.06, 40);
  p.cyl(base, [0, (h - 0.06) / 2, 0], r * 0.42, r * 0.5, h - 0.06, 32);
}

function sideTable(p: P, h = 0.55, top = "travertine") {
  p.cyl(top, [0, h - 0.02, 0], 0.25, 0.25, 0.04, 28);
  p.cyl("brass", [0, (h - 0.04) / 2, 0], 0.02, 0.02, h - 0.04, 10);
  p.cyl("brass", [0, 0.01, 0], 0.18, 0.18, 0.02, 24);
}

function tableLamp(p: P, x: number, y: number, z: number, base = "ceramic_white", scale = 1) {
  p.lathe(base, [x, y, z], [
    [0.0, 0],
    [0.08 * scale, 0],
    [0.11 * scale, 0.1 * scale],
    [0.1 * scale, 0.2 * scale],
    [0.04 * scale, 0.28 * scale],
    [0.015 * scale, 0.32 * scale],
    [0, 0.32 * scale],
  ]);
  p.cyl("emit_bulb", [x, y + 0.36 * scale, z], 0.03, 0.03, 0.05, 10);
  p.cyl("emit_lamp", [x, y + 0.42 * scale, z], 0.14 * scale, 0.19 * scale, 0.24 * scale, 28, undefined, true);
}

function floorLamp(p: P, h = 1.6) {
  p.cyl("marble", [0, 0.015, 0], 0.17, 0.17, 0.03, 28);
  p.cyl("brass", [0, h / 2, 0], 0.012, 0.012, h, 8);
  p.cyl("emit_bulb", [0, h - 0.05, 0], 0.03, 0.03, 0.05, 10);
  p.cyl("emit_lamp", [0, h + 0.02, 0], 0.17, 0.22, 0.3, 28, undefined, true);
}

function rugRect(p: P, w: number, d: number, mat: string) {
  p.box(mat, [0, 0.008, 0], [w, 0.016, d], 0.006);
}

function plant(p: P, potR = 0.26, potH = 0.5, spread = 0.55, height = 1.5, pot = "stone_pot", seed = 1) {
  p.lathe(pot, [0, 0, 0], [
    [0, 0],
    [potR * 0.75, 0],
    [potR, potH * 0.85],
    [potR * 0.96, potH],
    [0, potH],
  ]);
  p.cyl("bark", [0, potH + height * 0.3, 0], 0.025, 0.035, height * 0.6, 8);
  const r = rng(seed);
  for (let i = 0; i < 7; i++) {
    const a = r() * PI * 2;
    const d = r() * spread * 0.55;
    p.ico("leaf", [Math.cos(a) * d, potH + height * (0.55 + r() * 0.45), Math.sin(a) * d], spread * (0.35 + r() * 0.2), [1, 0.8, 1]);
  }
}

function artwork(p: P, mat: string, w: number, h: number, frame = "walnut") {
  p.box(frame, [0, 0, 0.02], [w + 0.08, h + 0.08, 0.04]);
  p.plane(mat, [0, 0, 0.042], w, h);
}

function bed(p: P, spec: BedSpec, base: string, throwMat: string, headH = 1.3) {
  const w = spec.width;
  const L = spec.length;
  const top = spec.mattressTop;
  const baseTop = top - 0.22;
  p.box(base, [0, baseTop / 2 + 0.04, L / 2], [w + 0.1, baseTop - 0.08, L], 0.04);
  p.box("walnut", [0, 0.03, L / 2], [w - 0.1, 0.06, L - 0.15]);
  p.box("bedding_white", [0, baseTop + 0.11, L / 2 + 0.01], [w - 0.02, 0.22, L - 0.06], 0.06);
  // duvet folded back at the top third
  p.box("bedding_white", [0, top + 0.03, L * 0.64], [w + 0.08, 0.08, L * 0.72], 0.04);
  p.box("bedding_white", [0, top - 0.12, L * 0.64], [w + 0.12, 0.3, L * 0.72 - 0.05], 0.03);
  p.box("bedding_white", [0, top + 0.06, L * 0.3], [w + 0.1, 0.1, 0.24], 0.05);
  p.box(throwMat, [0, top + 0.085, L - 0.33], [w + 0.18, 0.025, 0.55], 0.01);
  p.box(throwMat, [0, top - 0.1, L - 0.33], [w + 0.2, 0.36, 0.55], 0.01);
  // headboard
  p.box(base, [0, headH / 2 + 0.1, -0.03], [w + 0.34, headH, 0.1], 0.05);
  p.box(base, [0, headH + 0.12, 0.0], [w + 0.4, 0.08, 0.16], 0.04);
}

function nightstand(p: P, mat = "walnut", lamp = true, lampBase = "ceramic_white") {
  p.box(mat, [0, 0.3, 0], [0.52, 0.52, 0.42], 0.015);
  p.box("brass", [0, 0.39, 0.212], [0.16, 0.012, 0.012]);
  p.box(mat, [0, 0.025, 0], [0.46, 0.05, 0.36]);
  if (lamp) tableLamp(p, 0, 0.56, -0.02, lampBase, 0.9);
}

function diningChair(p: P) {
  p.box("linen_sand", [0, 0.47, 0.02], [0.48, 0.1, 0.48], 0.04);
  p.box("linen_sand", [0, 0.78, -0.21], [0.46, 0.5, 0.07], 0.035, [0.08, 0, 0]);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) p.box("walnut", [sx * 0.2, 0.21, sz * 0.2], [0.035, 0.42, 0.035]);
}

function sideboard(p: P, len: number, h = 0.82, d = 0.46, mat = "walnut") {
  p.box(mat, [0, h / 2 + 0.08, 0], [len, h - 0.16, d], 0.01);
  p.box("travertine", [0, h - 0.02, 0], [len + 0.04, 0.04, d + 0.03]);
  for (let i = 1; i < 4; i++) p.box(mat, [-len / 2 + (len * i) / 4, h / 2 + 0.08, d / 2 + 0.002], [0.008, h - 0.2, 0.004]);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) p.box("brass", [sx * (len / 2 - 0.08), 0.04, sz * (d / 2 - 0.06)], [0.03, 0.08, 0.03]);
}

function vase(p: P, x: number, y: number, z: number, mat = "ceramic_white", s = 1) {
  p.lathe(mat, [x, y, z], [
    [0, 0],
    [0.08 * s, 0],
    [0.12 * s, 0.12 * s],
    [0.09 * s, 0.3 * s],
    [0.05 * s, 0.36 * s],
    [0.06 * s, 0.4 * s],
    [0, 0.4 * s],
  ]);
}

function books(p: P, x0: number, x1: number, y: number, z: number, depth: number, seed: number) {
  const r = rng(seed);
  let x = x0;
  while (x < x1 - 0.04) {
    if (r() < 0.08) {
      x += 0.12;
      continue;
    }
    const t = 0.022 + r() * 0.03;
    const h = 0.2 + r() * 0.1;
    const mat = `book_${1 + Math.floor(r() * 5)}`;
    p.box(mat, [x + t / 2, y + h / 2, z], [t, h, depth * (0.75 + r() * 0.2)]);
    x += t + 0.003;
  }
}

function bookcase(p: P, width: number, height: number, depth: number, shelves: number, seed: number) {
  p.box("walnut", [-width / 2 + 0.02, height / 2, 0], [0.04, height, depth]);
  p.box("walnut", [width / 2 - 0.02, height / 2, 0], [0.04, height, depth]);
  p.box("walnut", [0, height / 2, -depth / 2 + 0.01], [width, height, 0.02]);
  const bays = Math.max(1, Math.round(width / 0.9));
  for (let b = 1; b < bays; b++) p.box("walnut", [-width / 2 + (width * b) / bays, height / 2, 0], [0.03, height, depth]);
  for (let i = 0; i <= shelves; i++) {
    const y = 0.08 + ((height - 0.1) * i) / shelves;
    p.box("walnut", [0, y, 0], [width, 0.035, depth]);
    if (i < shelves) {
      for (let b = 0; b < bays; b++) {
        const bx0 = -width / 2 + (width * b) / bays + 0.04;
        const bx1 = -width / 2 + (width * (b + 1)) / bays - 0.03;
        books(p, bx0, bx1, y + 0.018, 0.02, depth - 0.06, seed + i * 17 + b * 5);
      }
    }
  }
}

function recliner(p: P, mat: string) {
  p.box(mat, [0, 0.25, 0.05], [0.86, 0.34, 0.9], 0.06);
  p.box(mat, [0, 0.47, 0.1], [0.58, 0.14, 0.7], 0.06);
  p.box(mat, [0, 0.72, -0.38], [0.62, 0.66, 0.2], 0.08, [-0.18, 0, 0]);
  p.box(mat, [-0.37, 0.5, 0.02], [0.13, 0.36, 0.86], 0.05);
  p.box(mat, [0.37, 0.5, 0.02], [0.13, 0.36, 0.86], 0.05);
  p.box("walnut", [0.37, 0.69, 0.05], [0.15, 0.03, 0.5], 0.01);
}

/* ------------------------------------------------------------------ */
/* rooms                                                               */
/* ------------------------------------------------------------------ */

const bedOf = (id: RoomId) => BEDS.find((b) => b.roomId === id)!;
const facing = (dx: number, dz: number) => Math.atan2(dx, dz);

function living() {
  const g = roomGroups.living;
  // fireplace on the west wall
  const F = new Placer(g, -14.85, 3.8, PI / 2);
  F.box("travertine", [0, H / 2, 0.2], [2.5, H, 0.4]);
  F.box("travertine", [0, 0.6, 0.47], [1.9, 1.2, 0.16]);
  F.box("soot", [0, 0.52, 0.5], [1.1, 0.72, 0.14]);
  F.box("travertine", [0, 1.21, 0.49], [2.3, 0.07, 0.3]);
  F.box("travertine", [0, 0.03, 0.75], [2.4, 0.06, 0.5]);
  for (let i = 0; i < 5; i++) F.sphere("emit_fire", [-0.3 + i * 0.15, 0.24 + (i % 2) * 0.04, 0.52], 0.07, [1, 1.6, 0.6], 8);
  F.box("bark", [0, 0.2, 0.52], [0.7, 0.07, 0.08]);
  artwork(new Placer(g, -14.44, 3.8, PI / 2, 2.15), "art_3", 1.2, 1.5);
  vase(new Placer(g, -14.5, 3.0, 0), 0, 1.25, 0, "ceramic_dark", 0.8);
  vase(new Placer(g, -14.5, 4.55, 0), 0, 1.25, 0, "ceramic_white", 0.6);

  rugRect(new Placer(g, -9.6, 3.05), 4.6, 3.5, "rug_ivory");
  sofa(new Placer(g, -9.6, 1.8, 0), 3.3, 1.02, "boucle", "brass", 3);
  const S = new Placer(g, -9.6, 1.8, 0);
  throwPillow(S, -1.2, 0.72, -0.18, "velvet_cognac", 0.15);
  throwPillow(S, 1.2, 0.72, -0.18, "velvet_cognac", -0.15);
  throwPillow(S, 0.85, 0.7, -0.14, "linen_sand", -0.1, 0.4);
  roundTable(new Placer(g, -9.6, 3.2), 0.62, 0.36, "travertine", "travertine");
  vase(new Placer(g, -9.45, 3.1), 0, 0.36, 0, "ceramic_sage", 0.5);
  new Placer(g, -9.85, 3.3).box("walnut", [0, 0.4, 0], [0.32, 0.05, 0.24]);
  armchair(new Placer(g, -10.95, 4.45, PI + 0.25), "velvet_taupe");
  armchair(new Placer(g, -8.25, 4.45, PI - 0.25), "velvet_taupe");
  const st = new Placer(g, -7.55, 1.7);
  sideTable(st);
  tableLamp(st, 0, 0.55, 0, "ceramic_white");
  floorLamp(new Placer(g, -11.7, 1.55), 1.62);
  artwork(new Placer(g, -9.6, 1.08, 0, 1.95), "art_1", 2.0, 1.25);
  // console on the east wall
  const C = new Placer(g, -4.3, 5.15, -PI / 2);
  sideboard(C, 1.5, 0.8, 0.4);
  vase(C, -0.4, 0.8, 0, "ceramic_dark", 0.9);
  C.box("book_3", [0.3, 0.84, 0], [0.34, 0.06, 0.24]);
  C.box("book_1", [0.3, 0.9, 0], [0.3, 0.05, 0.22]);
  plant(new Placer(g, -4.55, 6.35), 0.28, 0.55, 0.6, 1.5, "terracotta", 3);
}

function dining() {
  const g = roomGroups.dining;
  rugRect(new Placer(g, -0.5, 3.9), 4.3, 2.9, "rug_sand");
  const T = new Placer(g, -0.5, 3.9, 0);
  T.box("walnut", [0, 0.745, 0], [3.0, 0.05, 1.1], 0.015);
  for (const x of [-0.9, 0.9]) {
    T.box("travertine", [x, 0.36, 0], [0.24, 0.72, 0.62]);
    T.box("travertine", [x, 0.03, 0], [0.5, 0.06, 0.8]);
  }
  for (const x of [-1.1, 0, 1.1]) {
    diningChair(new Placer(g, -0.5 + x, 3.9 - 0.82, 0));
    diningChair(new Placer(g, -0.5 + x, 3.9 + 0.82, PI));
  }
  diningChair(new Placer(g, -0.5 - 1.82, 3.9, PI / 2));
  diningChair(new Placer(g, -0.5 + 1.82, 3.9, -PI / 2));
  // table styling
  for (const x of [-0.7, 0, 0.7]) vase(T, x, 0.77, 0, x === 0 ? "ceramic_sage" : "ceramic_white", 0.45);
  for (const x of [-1.1, 0, 1.1])
    for (const z of [-0.33, 0.33]) T.cyl("ceramic_white", [x, 0.78, z], 0.13, 0.12, 0.015, 24);
  // brass halo chandelier
  const L = new Placer(g, -0.5, 3.9, 0, 2.35);
  L.torus("brass", [0, 0, 0], 0.78, 0.025, [PI / 2, 0, 0], PI * 2, 64);
  L.torus("brass", [0, 0.12, 0], 0.5, 0.018, [PI / 2, 0, 0], PI * 2, 48);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * PI * 2;
    L.sphere("emit_bulb", [Math.cos(a) * 0.78, 0.04, Math.sin(a) * 0.78], 0.035, [1, 1, 1], 8);
  }
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * PI * 2;
    L.cyl("brass", [Math.cos(a) * 0.4, 0.55, Math.sin(a) * 0.4], 0.004, 0.004, 1.0, 4);
  }
  const SB = new Placer(g, 2.65, 3.9, -PI / 2);
  sideboard(SB, 2.2, 0.84, 0.46);
  vase(SB, -0.6, 0.84, 0, "ceramic_dark", 1.1);
  SB.cyl("brass", [0.5, 0.88, 0], 0.18, 0.12, 0.08, 24);
  artwork(new Placer(g, 2.91, 3.9, -PI / 2, 1.85), "art_4", 1.4, 1.1);
  plant(new Placer(g, -3.45, 6.35), 0.26, 0.5, 0.55, 1.4, "stone_pot", 7);
}

function guest() {
  const g = roomGroups.guest;
  const b = bedOf("guest");
  rugRect(new Placer(g, 8.0, b.headZ), 2.6, 3.2, "rug_jute");
  bed(new Placer(g, b.headX, b.headZ, facing(b.dirX, b.dirZ)), b, "rattan", "throw_sea", 1.2);
  for (const dz of [-1, 1]) nightstand(new Placer(g, 9.15, b.headZ + dz * (b.width / 2 + 0.36), -PI / 2), "oak", true, "ceramic_sage");
  armchair(new Placer(g, 3.85, 5.6, facing(1, -0.35)), "rattan", "oak", 0.78);
  throwPillow(new Placer(g, 3.85, 5.6, facing(1, -0.35)), 0, 0.62, -0.15, "throw_sea");
  artwork(new Placer(g, 3.09, 3.2, PI / 2, 1.7), "art_2", 1.0, 1.25, "oak");
  plant(new Placer(g, 3.5, 1.55), 0.22, 0.42, 0.45, 1.1, "ceramic_white", 11);
  const D = new Placer(g, 4.9, 1.34, 0);
  D.box("oak", [0, 0.76, 0], [1.1, 0.04, 0.46]);
  for (const sx of [-1, 1]) D.box("oak", [sx * 0.52, 0.38, 0], [0.04, 0.76, 0.42]);
  vase(D, 0.3, 0.78, 0, "ceramic_white", 0.55);
}

function nursery() {
  const g = roomGroups.nursery;
  const Cr = new Placer(g, 14.43, 2.85, PI / 2);
  const len = 1.32;
  const wid = 0.72;
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) Cr.box("white_wood", [sx * (len / 2 - 0.025), 0.46, sz * (wid / 2 - 0.025)], [0.05, 0.92, 0.05]);
  for (const sz of [-1, 1]) {
    Cr.box("white_wood", [0, 0.88, sz * (wid / 2 - 0.025)], [len, 0.04, 0.04]);
    Cr.box("white_wood", [0, 0.3, sz * (wid / 2 - 0.025)], [len, 0.04, 0.04]);
    for (let i = 1; i < 14; i++) Cr.box("white_wood", [-len / 2 + (len * i) / 14, 0.59, sz * (wid / 2 - 0.025)], [0.018, 0.56, 0.018]);
  }
  for (const sx of [-1, 1]) Cr.box("white_wood", [sx * (len / 2 - 0.025), 0.62, 0], [0.03, 0.56, wid - 0.05]);
  Cr.box("bedding_white", [0, 0.36, 0], [len - 0.08, 0.1, wid - 0.08], 0.03);
  Cr.box("toy_1", [0.1, 0.42, 0], [0.7, 0.03, 0.55], 0.01);
  // cloud mobile on a wall arm
  const M = new Placer(g, 14.6, 2.85, 0, 0);
  M.box("white_wood", [0.1, 1.75, 0], [0.04, 0.04, 0.04]);
  M.cyl("white_wood", [-0.2, 1.75, 0], 0.01, 0.01, 0.6, 6, [0, 0, PI / 2]);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * PI * 2;
    M.cyl("white_wood", [-0.45 + Math.cos(a) * 0.14, 1.62, Math.sin(a) * 0.14], 0.002, 0.002, 0.25, 4);
    M.sphere(i % 2 ? "toy_2" : "cushion_white", [-0.45 + Math.cos(a) * 0.14, 1.48, Math.sin(a) * 0.14], 0.05, [1.6, 0.9, 0.8], 8);
  }
  const rug = new Placer(g, 12.2, 3.9);
  rug.cyl("rug_pastel", [0, 0.008, 0], 1.25, 1.25, 0.016, 48);
  // rocking chair
  const R = new Placer(g, 13.75, 5.25, facing(-1.3, -1.1));
  R.box("white_wood", [0, 0.44, 0.02], [0.52, 0.05, 0.5], 0.015);
  R.box("cushion_white", [0, 0.49, 0.03], [0.46, 0.06, 0.44], 0.025);
  for (let i = 0; i < 5; i++) R.box("white_wood", [-0.2 + i * 0.1, 0.8, -0.24], [0.03, 0.68, 0.025], 0, [-0.12, 0, 0]);
  R.box("white_wood", [0, 1.14, -0.28], [0.56, 0.05, 0.04], 0.01, [-0.12, 0, 0]);
  for (const sx of [-1, 1]) {
    R.torus("white_wood", [sx * 0.24, 1.2, 0.02], 1.2, 0.018, [0, PI / 2, 0], 0, 16);
    R.box("white_wood", [sx * 0.24, 0.22, 0], [0.03, 0.42, 0.03]);
    R.box("white_wood", [sx * 0.24, 0.66, 0.12], [0.04, 0.03, 0.4]);
  }
  for (const sx of [-1, 1]) {
    const arc = new Placer(g, 13.75, 5.25, facing(-1.3, -1.1));
    arc.torus("white_wood", [sx * 0.24, 1.25, 0], 1.25, 0.02, [0, PI / 2, PI / 2 - 0.3], 0.6, 16);
  }
  throwPillow(R, 0, 0.66, -0.16, "toy_1", 0, 0.34);
  floorLamp(new Placer(g, 14.4, 6.2), 1.5);
  // toy shelf
  const T = new Placer(g, 9.78, 5.0, PI / 2);
  T.box("white_wood", [0, 0.45, 0], [1.5, 0.9, 0.36], 0.01);
  T.box("toy_3", [-0.55, 0.3, 0.19], [0.3, 0.3, 0.01]);
  T.box("toy_2", [0, 0.3, 0.19], [0.3, 0.3, 0.01]);
  T.box("toy_4", [0.55, 0.3, 0.19], [0.3, 0.3, 0.01]);
  T.sphere("toy_3", [-0.5, 0.97, 0], 0.07, [1, 1, 1], 10);
  T.box("toy_2", [-0.25, 0.96, 0], [0.12, 0.12, 0.12], 0.02);
  T.box("toy_1", [-0.25, 1.07, 0], [0.1, 0.1, 0.1], 0.02, [0, 0.4, 0]);
  T.sphere("cushion_white", [0.35, 1.0, 0], 0.1, [1, 1.1, 0.9], 10);
  T.sphere("cushion_white", [0.35, 1.14, 0], 0.07, [1, 1, 1], 10);
  T.sphere("cushion_white", [0.3, 1.2, 0], 0.03, [1, 1, 1], 6);
  T.sphere("cushion_white", [0.4, 1.2, 0], 0.03, [1, 1, 1], 6);
  artwork(new Placer(g, 9.59, 5.0, PI / 2, 1.8), "art_2", 0.8, 1.0, "white_wood");
  new Placer(g, 11.4, 3.3).sphere("velvet_taupe", [0, 0.2, 0], 0.3, [1, 0.62, 1], 14);
  plant(new Placer(g, 10.0, 1.55), 0.2, 0.36, 0.4, 0.9, "ceramic_white", 13);
}

function theatre() {
  const g = roomGroups.theatre;
  // screen wall (west)
  const S = new Placer(g, -14.85, -4.0, PI / 2);
  S.box("speaker", [0, 1.7, 0.03], [3.8, 2.3, 0.06]);
  S.box("black_metal", [0, 1.7, 0.08], [3.5, 1.98, 0.04]);
  S.plane("screen", [0, 1.7, 0.101], 3.36, 1.89);
  for (const x of [-2.25, 2.25]) {
    S.box("speaker", [x, 0.6, 0.2], [0.34, 1.2, 0.36], 0.01);
    S.cyl("black_metal", [x, 0.9, 0.385], 0.09, 0.09, 0.01, 20, [PI / 2, 0, 0]);
    S.cyl("black_metal", [x, 0.45, 0.385], 0.12, 0.12, 0.01, 20, [PI / 2, 0, 0]);
  }
  S.box("walnut", [0, 0.2, 0.25], [2.6, 0.4, 0.45], 0.01);
  // fluted walnut on the east wall
  const Fl = new Placer(g, -8.08, -4.0, -PI / 2);
  Fl.box("walnut", [0, H / 2, 0.01], [5.8, H - 0.02, 0.02]);
  for (let i = 0; i < 56; i++) Fl.cyl("walnut", [-2.75 + i * 0.1, H / 2, 0.025], 0.038, 0.038, H - 0.3, 8);
  // riser + recliners
  const Rs = new Placer(g, -9.35, -3.95);
  Rs.box("carpet_theatre", [0, 0.125, 0], [2.4, 0.25, 4.8]);
  Rs.box("emit_cove", [-1.205, 0.12, 0], [0.012, 0.02, 4.7]);
  for (const z of [-5.1, -3.95, -2.8]) {
    recliner(new Placer(g, -11.7, z, -PI / 2), "velvet_oxblood");
    recliner(new Placer(g, -9.55, z, -PI / 2, 0.25), "velvet_oxblood");
  }
  // sconces on the gallery wall
  for (const x of [-13.6, -11.2]) {
    const W = new Placer(g, x, -1.08, PI, 2.1);
    W.box("brass", [0, 0, 0.03], [0.1, 0.34, 0.06], 0.01);
    W.cyl("emit_lamp", [0, 0.02, 0.1], 0.07, 0.07, 0.3, 16, undefined, true);
  }
}

function study() {
  const g = roomGroups.study;
  bookcase(new Placer(g, -7.73, -3.95, PI / 2), 4.6, 3.05, 0.38, 6, 21);
  rugRect(new Placer(g, -4.9, -3.9), 3.2, 2.3, "rug_study");
  const D = new Placer(g, -4.9, -4.0, 0);
  D.box("walnut", [0, 0.745, 0], [1.9, 0.05, 0.85], 0.012);
  D.box("walnut", [-0.85, 0.37, 0], [0.06, 0.74, 0.8]);
  D.box("walnut", [0.85, 0.37, 0], [0.06, 0.74, 0.8]);
  D.box("walnut", [0.45, 0.6, -0.05], [0.72, 0.24, 0.7]);
  D.box("leather_cognac", [0, 0.775, 0.05], [0.7, 0.008, 0.5]);
  D.box("book_2", [-0.55, 0.79, -0.1], [0.24, 0.035, 0.32]);
  D.box("book_1", [-0.55, 0.82, -0.1], [0.22, 0.03, 0.3], 0, [0, 0.2, 0]);
  // brass desk lamp
  D.cyl("brass", [0.7, 0.785, -0.2], 0.09, 0.09, 0.02, 20);
  D.cyl("brass", [0.7, 1.0, -0.2], 0.01, 0.01, 0.42, 6);
  D.cyl("emit_lamp", [0.7, 1.2, -0.12], 0.05, 0.13, 0.12, 20, [0.35, 0, 0], true);
  const Ch = new Placer(g, -4.9, -3.35, PI);
  Ch.box("leather_cognac", [0, 0.5, 0], [0.56, 0.1, 0.52], 0.04);
  Ch.box("leather_cognac", [0, 0.82, 0.24], [0.54, 0.56, 0.08], 0.04, [0.1, 0, 0]);
  Ch.cyl("black_metal", [0, 0.25, 0], 0.025, 0.025, 0.45, 8);
  Ch.cyl("black_metal", [0, 0.03, 0], 0.3, 0.3, 0.04, 5);
  armchair(new Placer(g, -6.8, -2.0, facing(1, -0.6)), "leather_cognac", "walnut", 0.86);
  floorLamp(new Placer(g, -7.35, -1.55), 1.5);
  // globe
  const Gl = new Placer(g, -2.6, -6.25);
  Gl.cyl("walnut", [0, 0.3, 0], 0.03, 0.06, 0.6, 10);
  Gl.sphere("ceramic_sage", [0, 0.86, 0], 0.24, [1, 1, 1], 16);
  Gl.torus("brass", [0, 0.86, 0], 0.27, 0.01, [0, 0, 0.4], PI * 2, 32);
  artwork(new Placer(g, -2.09, -4.0, -PI / 2, 1.75), "art_4", 1.1, 1.4);
}

function master() {
  const g = roomGroups.master;
  const b = bedOf("master");
  rugRect(new Placer(g, 0.1, b.headZ), 3.6, 3.4, "rug_ivory");
  bed(new Placer(g, b.headX, b.headZ, facing(b.dirX, b.dirZ)), b, "linen_sand", "throw_taupe", 1.35);
  for (const dz of [-1, 1]) nightstand(new Placer(g, -1.62, b.headZ + dz * (b.width / 2 + 0.32), PI / 2), "walnut", true, "brass");
  const Be = new Placer(g, 0.72, b.headZ, PI / 2);
  Be.box("velvet_taupe", [0, 0.4, 0], [1.6, 0.14, 0.46], 0.05);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) Be.cyl("brass", [sx * 0.72, 0.17, sz * 0.18], 0.015, 0.015, 0.34, 8);
  const Dr = new Placer(g, 5.68, -4.0, -PI / 2);
  sideboard(Dr, 1.8, 0.86, 0.46);
  vase(Dr, 0.55, 0.86, 0, "ceramic_white", 0.8);
  const Mi = new Placer(g, 5.91, -4.0, -PI / 2, 1.75);
  Mi.cyl("brass", [0, 0, 0.02], 0.52, 0.52, 0.03, 48, [PI / 2, 0, 0]);
  Mi.cyl("mirror", [0, 0, 0.038], 0.48, 0.48, 0.005, 48, [PI / 2, 0, 0]);
  armchair(new Placer(g, 3.15, -1.95, PI + 0.3), "boucle", "walnut");
  const st = new Placer(g, 2.25, -1.8);
  sideTable(st, 0.5);
  plant(new Placer(g, -1.5, -6.45), 0.24, 0.48, 0.5, 1.3, "ceramic_white", 17);
}

function suite() {
  const g = roomGroups.suite;
  const b = bedOf("suite");
  // fluted walnut behind the bed
  const Fl = new Placer(g, 14.85, b.headZ, -PI / 2);
  Fl.box("walnut", [0, H / 2, 0.01], [3.6, H - 0.02, 0.02]);
  for (let i = 0; i < 36; i++) Fl.cyl("walnut", [-1.75 + i * 0.1, H / 2, 0.025], 0.038, 0.038, H - 0.3, 8);
  rugRect(new Placer(g, 12.9, b.headZ), 3.4, 3.6, "rug_suite");
  bed(new Placer(g, b.headX, b.headZ, facing(b.dirX, b.dirZ)), b, "velvet_taupe", "velvet_emerald", 1.4);
  for (const dz of [-1, 1]) {
    const N = new Placer(g, 14.45, b.headZ + dz * (b.width / 2 + 0.36), -PI / 2);
    N.box("marble", [0, 0.56, 0], [0.55, 0.04, 0.42]);
    N.box("brass", [0, 0.3, 0], [0.5, 0.02, 0.38]);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) N.box("brass", [sx * 0.25, 0.29, sz * 0.18], [0.02, 0.58, 0.02]);
    tableLamp(N, 0, 0.58, 0, "brass", 0.95);
  }
  const Ot = new Placer(g, 12.08, b.headZ, -PI / 2);
  Ot.box("velvet_emerald", [0, 0.24, 0], [1.4, 0.4, 0.5], 0.08);
  // freestanding stone bath + brass filler
  const Tb = new Placer(g, 8.2, -5.4);
  Tb.lathe(
    "marble",
    [0, 0, 0],
    [
      [0, 0],
      [0.62, 0],
      [0.78, 0.18],
      [0.84, 0.5],
      [0.86, 0.6],
      [0.8, 0.62],
      [0.76, 0.52],
      [0.7, 0.2],
      [0, 0.16],
    ],
    40,
    [1.05, 1, 0.5],
  );
  Tb.lathe("water", [0, 0.45, 0], [
    [0, 0],
    [0.7, 0],
    [0.7, 0.01],
    [0, 0.01],
  ], 40, [1.05, 1, 0.5]);
  const Fi = new Placer(g, 7.05, -5.4);
  Fi.cyl("brass", [0, 0.5, 0], 0.02, 0.02, 1.0, 8);
  Fi.torus("brass", [0.12, 1.0, 0], 0.12, 0.018, [0, 0, 0], PI, 16);
  const Pd = new Placer(g, 8.2, -5.4, 0, 2.2);
  Pd.cyl("brass", [0, 0.6, 0], 0.004, 0.004, 1.2, 4);
  Pd.lathe("brass", [0, -0.05, 0], [
    [0.02, 0.2],
    [0.14, 0.14],
    [0.28, 0.0],
    [0.27, -0.01],
    [0.13, 0.12],
    [0.01, 0.18],
  ]);
  Pd.sphere("emit_bulb", [0, 0.02, 0], 0.06, [1, 1, 1], 10);
  // lounge
  rugRect(new Placer(g, 10.6, -2.55), 3.0, 2.2, "rug_ivory");
  sofa(new Placer(g, 10.6, -1.72, PI), 2.3, 0.95, "velvet_cognac", "brass", 2);
  const So = new Placer(g, 10.6, -1.72, PI);
  throwPillow(So, -0.72, 0.72, -0.16, "velvet_emerald", 0.15);
  throwPillow(So, 0.72, 0.72, -0.16, "boucle", -0.15);
  roundTable(new Placer(g, 10.6, -2.95), 0.45, 0.38, "marble", "brass");
  vase(new Placer(g, 10.6, -2.95), 0, 0.38, 0, "ceramic_dark", 0.5);
  // bar cart
  const Bc = new Placer(g, 6.42, -3.6, PI / 2);
  for (const y of [0.25, 0.72]) Bc.box("mirror", [0, y, 0], [0.8, 0.02, 0.42]);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) Bc.cyl("brass", [sx * 0.38, 0.4, sz * 0.19], 0.012, 0.012, 0.8, 6);
  for (let i = 0; i < 4; i++) Bc.lathe(i % 2 ? "glass" : "ceramic_dark", [-0.25 + i * 0.15, 0.73, 0], [
    [0, 0],
    [0.04, 0],
    [0.04, 0.18],
    [0.015, 0.24],
    [0.015, 0.3],
    [0, 0.3],
  ], 12);
  artwork(new Placer(g, 10.6, -1.09, PI, 1.85), "art_3", 1.3, 0.95);
  plant(new Placer(g, 6.5, -6.4), 0.24, 0.5, 0.5, 1.4, "stone_pot", 19);
}

function galleryDecor() {
  const g = gallery;
  rugRect(new Placer(g, 0, 0), 26, 1.1, "rug_runner");
  const art: [number, number, string][] = [
    [-12.2, -1, "art_1"],
    [-6.3, -1, "art_2"],
    [1.2, -1, "art_3"],
    [11.2, -1, "art_4"],
    [-6.2, 1, "art_4"],
    [1.0, 1, "art_1"],
    [7.6, 1, "art_2"],
    [13.3, 1, "art_3"],
  ];
  for (const [x, side, mat] of art) artwork(new Placer(g, x, side * 0.91, side < 0 ? 0 : PI, 1.75), mat, 0.9, 1.15);
  for (const [x, z, kind] of [
    [-1.4, -0.62, 0],
    [8.9, 0.62, 1],
    [-11.4, 0.62, 2],
  ] as const) {
    const S = new Placer(g, x, z);
    S.box("travertine", [0, 0.45, 0], [0.42, 0.9, 0.42]);
    if (kind === 0) S.sphere("bronze", [0, 1.12, 0], 0.2, [1, 1, 1], 20);
    else if (kind === 1) S.torus("bronze", [0, 1.18, 0], 0.2, 0.06, [0, 0.4, 0], PI * 2, 32);
    else {
      S.box("bronze", [0, 1.12, 0], [0.12, 0.44, 0.12], 0.03, [0, 0.3, 0.2]);
      S.sphere("bronze", [0.05, 1.4, 0], 0.08, [1, 1, 1], 10);
    }
  }
  new Placer(g, 5.9, -0.66).box("travertine", [0, 0.23, 0], [1.6, 0.46, 0.4], 0.02);
  for (const x of [-14.2, 14.2]) plant(new Placer(g, x, 0.62), 0.28, 0.55, 0.6, 1.6, "terracotta", x > 0 ? 23 : 29);
}

/* ------------------------------------------------------------------ */
/* site                                                                */
/* ------------------------------------------------------------------ */

function oliveTree(p: P, seed: number, s = 1) {
  const r = rng(seed);
  p.cyl("bark", [0, 0.7 * s, 0], 0.09 * s, 0.16 * s, 1.4 * s, 8, [0.12, 0, 0.08]);
  p.cyl("bark", [0.18 * s, 1.6 * s, 0], 0.05 * s, 0.09 * s, 0.9 * s, 7, [0, 0, -0.5]);
  p.cyl("bark", [-0.16 * s, 1.55 * s, 0.1 * s], 0.05 * s, 0.08 * s, 0.8 * s, 7, [0.3, 0, 0.5]);
  for (let i = 0; i < 9; i++) {
    const a = r() * PI * 2;
    const d = (0.4 + r() * 0.9) * s;
    p.ico("olive_leaf", [Math.cos(a) * d, (2.0 + r() * 0.9) * s, Math.sin(a) * d], (0.55 + r() * 0.35) * s, [1.2, 0.72, 1.2], 1);
  }
}

function cypress(p: P, h = 5.5) {
  p.cyl("bark", [0, 0.3, 0], 0.08, 0.1, 0.6, 6);
  p.sphere("cypress", [0, 0.5 + h / 2, 0], 0.55, [1, h / 1.1, 1], 10);
}

function lounger(p: P) {
  p.box("walnut", [0, 0.26, 0.15], [0.7, 0.06, 1.55], 0.01);
  p.box("cushion_white", [0, 0.33, 0.15], [0.66, 0.08, 1.5], 0.03);
  p.box("walnut", [0, 0.48, -0.78], [0.7, 0.05, 0.62], 0.01, [0.85, 0, 0]);
  p.box("cushion_white", [0, 0.52, -0.74], [0.64, 0.07, 0.58], 0.03, [0.85, 0, 0]);
  for (const sx of [-1, 1]) for (const sz of [-0.5, 0.8]) p.box("walnut", [sx * 0.3, 0.12, sz], [0.05, 0.24, 0.05]);
}

function umbrella(p: P) {
  p.cyl("walnut", [0, 1.25, 0], 0.025, 0.025, 2.5, 8);
  p.cyl("canvas", [0, 2.35, 0], 0.05, 1.45, 0.42, 24, undefined, true);
  p.cyl("travertine", [0, 0.05, 0], 0.28, 0.3, 0.1, 20);
}

function buildSite() {
  const S = new Placer(site, 0, 0);
  S.cyl("lawn", [0, -0.6, 0], 95, 95, 0.08, 72);
  S.box("travertine", [0, -0.3, -0.35], [31.8, 0.5, 15.3]);
  // terrace with pool cut-out
  const tz0 = 7.15;
  const tz1 = 14.6;
  const px0 = -12.5;
  const px1 = 3.5;
  const pz0 = 8.9;
  const pz1 = 12.6;
  const deck = (x0: number, x1: number, z0: number, z1: number) =>
    S.box("travertine", [(x0 + x1) / 2, -0.33, (z0 + z1) / 2], [x1 - x0, 0.48, z1 - z0]);
  deck(-16.8, 16.8, tz0, pz0);
  deck(-16.8, 16.8, pz1, tz1);
  deck(-16.8, px0, pz0, pz1);
  deck(px1, 16.8, pz0, pz1);
  S.box("pool_tile", [(px0 + px1) / 2, -1.25, (pz0 + pz1) / 2], [px1 - px0, 0.1, pz1 - pz0]);
  S.box("pool_tile", [px0 + 0.05, -0.68, (pz0 + pz1) / 2], [0.1, 1.05, pz1 - pz0]);
  S.box("pool_tile", [px1 - 0.05, -0.68, (pz0 + pz1) / 2], [0.1, 1.05, pz1 - pz0]);
  S.box("pool_tile", [(px0 + px1) / 2, -0.68, pz0 + 0.05], [px1 - px0, 1.05, 0.1]);
  S.box("pool_tile", [(px0 + px1) / 2, -0.68, pz1 - 0.05], [px1 - px0, 1.05, 0.1]);
  S.plane("water", [(px0 + px1) / 2, -0.2, (pz0 + pz1) / 2], px1 - px0, pz1 - pz0, [-PI / 2, 0, 0]);
  // entrance paths
  S.plane("gravel", [21, -0.555, 0], 12, 2.2, [-PI / 2, 0, 0]);
  S.plane("gravel", [-21, -0.555, 0], 12, 2.2, [-PI / 2, 0, 0]);
  // hedges
  S.box("hedge", [0, -0.1, -9.4], [30, 1.0, 0.9], 0.2);
  S.box("hedge", [-17.3, -0.25, 10.8], [0.8, 0.7, 7], 0.2);
  S.box("hedge", [17.3, -0.25, 10.8], [0.8, 0.7, 7], 0.2);
  for (let i = 0; i < 4; i++) lounger(new Placer(site, -10.8 + i * 2.3, 13.55, 0, -0.09));
  umbrella(new Placer(site, -1.6, 13.5, 0, -0.09));
  // outdoor dining
  const Od = new Placer(site, 9.5, 10.8, 0, -0.09);
  roundTable(Od, 0.75, 0.74, "walnut", "walnut");
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * PI * 2 + PI / 4;
    diningChair(new Placer(site, 9.5 + Math.sin(a) * 1.05, 10.8 + Math.cos(a) * 1.05, a + PI, -0.09));
  }
  umbrella(new Placer(site, 9.5, 10.8, 0, -0.09));
  for (const [x, z] of [
    [-16.2, 7.8],
    [16.2, 7.8],
    [-16.2, 14.0],
    [16.2, 14.0],
  ])
    plant(new Placer(site, x, z, 0, -0.09), 0.38, 0.6, 0.7, 1.2, "stone_pot", Math.round(x * 3 + z));
  const trees: [number, number, number][] = [
    [-20.5, 10.5, 1.2],
    [20.4, 11.8, 1.1],
    [-22, -3.5, 1.3],
    [21.8, -5.6, 1.2],
    [-8, -11.8, 1.15],
    [10, -12.2, 1.25],
    [-18.8, -11.2, 1.0],
    [2.5, 18.5, 1.1],
    [-12, 19, 1.0],
    [14, 18, 0.95],
  ];
  trees.forEach(([x, z, s], i) => oliveTree(new Placer(site, x, z, i, -0.56), 101 + i * 7, s));
  for (const [x, z] of [
    [17.2, -2.6],
    [17.2, 2.6],
    [-17.2, -2.6],
    [-17.2, 2.6],
    [-16.9, -8.6],
    [16.9, -8.6],
  ])
    cypress(new Placer(site, x, z, 0, -0.56), 5.2);
}

/* ------------------------------------------------------------------ */
/* export                                                              */
/* ------------------------------------------------------------------ */

async function main() {
  buildWalls();
  living();
  dining();
  guest();
  nursery();
  theatre();
  study();
  master();
  suite();
  galleryDecor();
  buildSite();

  const doc = new Document();
  doc.createBuffer();
  const basisu = doc.createExtension(KHRTextureBasisu).setRequired(true);
  void basisu;
  const sheenExt = doc.createExtension(KHRMaterialsSheen);
  const scene = doc.createScene("villa");
  doc.getRoot().setDefaultScene(scene);

  const texCache = new Map<string, Texture>();
  const texture = async (name: string, srgb = true) => {
    if (texCache.has(name)) return texCache.get(name)!;
    const png = await readFile(path.join(ARCH, `${name}.png`));
    const ktx = await pngToKTX2(new Uint8Array(png), { srgb, quality: 150 });
    const t = doc.createTexture(name).setImage(ktx).setMimeType("image/ktx2").setURI(`${name}.ktx2`);
    texCache.set(name, t);
    console.log("[villa] texture", name, (ktx.length / 1024).toFixed(0), "KB");
    return t;
  };

  const matCache = new Map<string, Material>();
  const material = async (name: string) => {
    if (matCache.has(name)) return matCache.get(name)!;
    const d = MATERIALS[name];
    const [r, g, b] = hexLinear(d.color ?? "#ffffff");
    const m = doc
      .createMaterial(name)
      .setBaseColorFactor([r, g, b, d.alpha ?? 1])
      .setRoughnessFactor(d.rough ?? 0.8)
      .setMetallicFactor(d.metal ?? 0)
      .setDoubleSided(!!d.doubleSided);
    if (d.alpha !== undefined) m.setAlphaMode("BLEND");
    if (d.map) m.setBaseColorTexture(await texture(d.map));
    if (d.emissive) m.setEmissiveFactor(hexLinear(d.emissive));
    if (d.emissiveMap) m.setEmissiveTexture(await texture(d.emissiveMap));
    if (d.sheen) {
      const s = sheenExt.createSheen().setSheenColorFactor(hexLinear(d.sheen.color)).setSheenRoughnessFactor(d.sheen.rough);
      m.setExtension("KHR_materials_sheen", s);
    }
    matCache.set(name, m);
    return m;
  };

  let tris = 0;
  for (const g of groups) {
    if (g.geos.size === 0) continue;
    const parent = doc.createNode(g.name).setTranslation(g.origin).setExtras(g.extras);
    const meshNode = doc.createNode(`${g.name}_mesh`);
    const mesh = doc.createMesh(g.name);
    for (const { mat, geo } of mergedPrimitives(g)) {
      const pos = geo.getAttribute("position").array as Float32Array;
      const nor = geo.getAttribute("normal").array as Float32Array;
      const uv = geo.getAttribute("uv").array as Float32Array;
      const idx = geo.index!.array;
      const indices = pos.length / 3 > 65535 ? new Uint32Array(idx) : new Uint16Array(idx);
      tris += indices.length / 3;
      const prim = doc
        .createPrimitive()
        .setAttribute("POSITION", doc.createAccessor().setType("VEC3").setArray(new Float32Array(pos)))
        .setAttribute("NORMAL", doc.createAccessor().setType("VEC3").setArray(new Float32Array(nor)))
        .setAttribute("TEXCOORD_0", doc.createAccessor().setType("VEC2").setArray(new Float32Array(uv)))
        .setIndices(doc.createAccessor().setType("SCALAR").setArray(indices))
        .setMaterial(await material(mat));
      mesh.addPrimitive(prim);
    }
    meshNode.setMesh(mesh);
    parent.addChild(meshNode);
    scene.addChild(parent);
  }
  console.log("[villa] triangles", tris);

  await MeshoptEncoder.ready;
  await MeshoptDecoder.ready;
  await doc.transform(
    dedup(),
    prune({ keepExtras: true }),
    reorder({ encoder: MeshoptEncoder }),
    quantize({ quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 14 }),
    meshopt({ encoder: MeshoptEncoder, level: "medium" }),
  );

  await mkdir(path.dirname(OUT), { recursive: true });
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
    "meshopt.encoder": MeshoptEncoder,
    "meshopt.decoder": MeshoptDecoder,
  });
  const glb = await io.writeBinary(doc);
  await writeFile(OUT, glb);
  console.log("[villa] wrote", OUT, (glb.byteLength / 1024 / 1024).toFixed(2), "MB");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
