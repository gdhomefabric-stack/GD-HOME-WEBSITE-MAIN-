/**
 * Photographs for the website, rendered in Blender (scripts/blender/render.py).
 *
 * For every shot this writes scripts/.cache/shots/<id>.json with the camera, the
 * lighting preset and the dressings built by the website's own generators — the
 * curtain cloth (CurtainCloth) and the pillow arrangement — so the photographs show
 * exactly what the 3D villa shows.
 *
 *   npx tsx scripts/export-shots.ts
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import * as THREE from "three";
import {
  DEFAULT_PILLOWS,
  LINING_BY_ID,
  PILLOW_COVERS,
  PLEAT_BY_ID,
  PRODUCT_BY_ID,
  ROOM_DEFAULTS,
  colourOf,
  type CurtainConfig,
  type PillowConfig,
} from "../src/data/catalog";
import {
  BED_BY_ROOM,
  EYE,
  ROD_HEIGHT,
  ROOMS,
  ROOM_BY_ID,
  WINDOWS,
  facadeInnerZ,
  facadeInward,
  roomView,
  type RoomId,
  type Vec3,
  type WindowSpec,
} from "../src/data/villa";
import { hemHeight } from "../src/lib/pricing";
import { CurtainCloth } from "../src/components/villa/scene/curtainCloth";
import { arrange, cachedGeometry } from "../src/components/villa/scene/pillowGeometry";

const OUT = path.resolve(import.meta.dirname, ".cache/shots");
const DEPTH = 0.15;

type Preset = "day" | "sunset" | "night";
interface Shot {
  id: string;
  room: RoomId;
  preset: Preset;
  position: Vec3;
  target: Vec3;
  fov: number;
  size: [number, number];
  samples?: number;
  /** per-window overrides; default is the room's recommended look, 80% open */
  curtains?: Record<string, Partial<CurtainConfig> & { open?: number }>;
}

/** The frame a window's curtains hang in: x along the wall, y up, z into the room. */
function windowMatrix(w: WindowSpec) {
  return new THREE.Matrix4().makeRotationY(w.facade === "N" ? 0 : Math.PI).setPosition(w.x, 0, facadeInnerZ(w.facade));
}

/**
 * Camera on one curtain stack (side -1 = left as seen from the room), standing `dist`
 * metres off it and `angle` degrees round towards the window, so daylight rakes the folds.
 */
function stackCamera(
  w: WindowSpec,
  { dist, height, targetY, angle = 32, side = -1 }: { dist: number; height: number; targetY: number; angle?: number; side?: 1 | -1 },
): { position: Vec3; target: Vec3 } {
  const m = windowMatrix(w);
  const stack = side * ((w.width + 0.5) / 2 - 0.28);
  const a = (angle * Math.PI) / 180;
  const at = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z).applyMatrix4(m).toArray() as Vec3;
  return {
    position: at(stack - side * dist * Math.sin(a), height, DEPTH + dist * Math.cos(a)),
    target: at(stack, targetY, DEPTH),
  };
}
const DETAIL = { dist: 2.9, height: 1.6, targetY: 2.3 };
const MACRO = { dist: 1.0, height: 1.5, targetY: 1.45, angle: 40 };

const win = (id: string) => WINDOWS.find((w) => w.id === id)!;

const SHOTS: Shot[] = [
  // hero: the living room in a low evening light
  { id: "hero", room: "living", preset: "sunset", position: [-4.7, 1.45, 1.75], target: [-10.8, 1.32, 5.9], fov: 52, size: [1920, 1080], samples: 96 },
  // one photograph per room, from where the tour starts
  ...ROOMS.map((r) => {
    const v = roomView(r);
    return {
      id: r.id,
      room: r.id,
      preset: "day" as Preset,
      position: [v.position[0], 1.35, v.position[2]] as Vec3,
      target: [v.target[0], 1.25, v.target[2]] as Vec3,
      fov: 54,
      size: [1600, 1000] as [number, number],
    };
  }),
  // curtain details, one per collection: the heading, the pole and the fall of the cloth
  ...(
    [
      ["velvet", "living-1", "living", {}],
      ["blackout", "master-1", "master", { open: 0.7 }],
      ["linen", "guest-1", "guest", { open: 0.7 }],
      ["sheer", "guest-1", "guest", { productId: "voile-du-matin", colourId: "", pleat: "wave", lining: "unlined", open: 0.35 }],
      ["embroidered", "dining-1", "dining", { open: 0.7 }],
    ] as [string, string, RoomId, Partial<CurtainConfig> & { open?: number }][]
  ).flatMap(([kind, wid, room, cfg]) => [
    {
      id: `detail-${kind}`,
      room,
      preset: "day" as Preset,
      ...stackCamera(win(wid), DETAIL),
      fov: 40,
      size: [1000, 1250] as [number, number],
      curtains: { [wid]: cfg },
    },
    // and close enough to read the cloth
    {
      id: `fabric-${kind}`,
      room,
      preset: "day" as Preset,
      ...stackCamera(win(wid), MACRO),
      fov: 30,
      size: [800, 800] as [number, number],
      curtains: { [wid]: cfg },
    },
  ]),
  // pillows: the suite bed, close
  (() => {
    const b = BED_BY_ROOM.suite!;
    const px = -b.dirZ;
    const pz = b.dirX;
    return {
      id: "pillows",
      room: "suite" as RoomId,
      preset: "day" as Preset,
      position: [b.headX + b.dirX * 2.2 + px * 0.9, 1.3, b.headZ + b.dirZ * 2.2 + pz * 0.9] as Vec3,
      target: [b.headX + b.dirX * 0.3, b.mattressTop + 0.25, b.headZ + b.dirZ * 0.3] as Vec3,
      fov: 42,
      size: [1500, 1000] as [number, number],
    };
  })(),
];

/* ------------------------------------------------------------------ dressings */

const arr = (a: ArrayLike<number>, digits = 4) => Array.from(a, (v) => +v.toFixed(digits));

function curtainFor(w: WindowSpec, over: Partial<CurtainConfig> & { open?: number } = {}) {
  const base = ROOM_DEFAULTS[w.roomId];
  const productId = over.productId ?? base.productId;
  const product = PRODUCT_BY_ID[productId];
  const cfg: CurtainConfig = {
    ...base,
    ...over,
    productId,
    colourId: over.colourId || (productId === base.productId ? base.colourId : product.colours[0].id),
  };
  const open = over.open ?? 0.82;
  const pleat = PLEAT_BY_ID[cfg.pleat];
  const trackWidth = w.width + 0.5;
  const top = cfg.pleat === "eyelet" ? ROD_HEIGHT + 0.04 : cfg.pleat === "wave" ? ROD_HEIGHT + 0.035 : ROD_HEIGHT - 0.05;
  const hem = hemHeight(cfg.length, w.sill);
  const m = windowMatrix(w);
  const panels = ([-1, 1] as const).map((side) => {
    const c = new CurtainCloth({ side, trackWidth, top, hem, fullness: pleat.fullness, pleat: cfg.pleat, depth: DEPTH });
    c.update(open, open);
    const g = c.geometry.clone().applyMatrix4(m);
    g.computeVertexNormals();
    const rings = c.ringX.map((x) => new THREE.Vector3(x, cfg.pleat === "eyelet" ? top - 0.045 : ROD_HEIGHT - 0.005, DEPTH).applyMatrix4(m).toArray());
    return {
      positions: arr(g.getAttribute("position").array),
      uvs: arr(g.getAttribute("uv").array),
      indices: Array.from(g.index!.array),
      rings: rings.map((r) => arr(r)),
    };
  });
  const rodLen = trackWidth + 0.26;
  const a = new THREE.Vector3(-rodLen / 2, ROD_HEIGHT, DEPTH).applyMatrix4(m);
  const b = new THREE.Vector3(rodLen / 2, ROD_HEIGHT, DEPTH).applyMatrix4(m);
  // wall brackets just inside the finials, and one at the centre of a wide window
  const bx = [-(rodLen / 2 - 0.1), rodLen / 2 - 0.1, ...(trackWidth > 2.6 ? [0] : [])];
  const brackets = bx.map((x) => [
    arr(new THREE.Vector3(x, ROD_HEIGHT, 0).applyMatrix4(m).toArray()),
    arr(new THREE.Vector3(x, ROD_HEIGHT, DEPTH).applyMatrix4(m).toArray()),
  ]);
  return {
    window: w.id,
    kind: product.kind,
    product: product.id,
    colour: colourOf(cfg).hex,
    thread: product.thread ?? null,
    lining: cfg.lining,
    liningHex: LINING_BY_ID[cfg.lining].hex,
    transmission: product.transmission * LINING_BY_ID[cfg.lining].transmission,
    pleat: cfg.pleat,
    rod: cfg.pleat === "wave" ? null : { a: arr(a.toArray()), b: arr(b.toArray()) },
    track: cfg.pleat === "wave" ? { a: arr(a.toArray()), b: arr(b.toArray()) } : null,
    brackets,
    panels,
  };
}

function pillowsFor(room: RoomId) {
  const bed = BED_BY_ROOM[room];
  const list = DEFAULT_PILLOWS[room];
  if (!bed || !list) return [];
  const placed = list.map((p: PillowConfig, i: number) => ({ ...p, uid: `p${i}` }));
  const slots = arrange(bed, placed);
  const rot = Math.atan2(bed.dirX, bed.dirZ);
  const bedM = new THREE.Matrix4().makeRotationY(rot).setPosition(bed.headX, 0, bed.headZ);
  return placed.map((p, i) => {
    const s = slots[i];
    const local = new THREE.Matrix4().compose(
      new THREE.Vector3(...s.position),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...s.rotation)),
      new THREE.Vector3(1, 1, 1),
    );
    const g = cachedGeometry(p).clone().applyMatrix4(bedM.clone().multiply(local));
    return {
      cover: p.cover,
      coverHex: PILLOW_COVERS.find((c) => c.id === p.cover)?.hex ?? "#f4f1ea",
      positions: arr(g.getAttribute("position").array),
      uvs: arr(g.getAttribute("uv").array),
      indices: Array.from(g.index!.array),
    };
  });
}

await mkdir(OUT, { recursive: true });
for (const s of SHOTS) {
  const room = ROOM_BY_ID[s.room];
  const curtains = WINDOWS.filter((w) => w.roomId === room.id).map((w) => curtainFor(w, s.curtains?.[w.id]));
  const data = { ...s, eye: EYE, curtains, pillows: pillowsFor(s.room) };
  await writeFile(path.join(OUT, `${s.id}.json`), JSON.stringify(data));
  console.log("[shots]", s.id, s.room, s.preset);
}
