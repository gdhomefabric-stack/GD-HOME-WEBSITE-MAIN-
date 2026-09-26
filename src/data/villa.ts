/**
 * Villa layout — the single source of truth shared by the asset generator
 * (scripts/build-villa.ts builds villa.glb from it) and the runtime scene
 * (curtains, pillows, camera views and hit areas are placed from it).
 *
 * Units are metres. +x = east, +z = south (towards the default camera), +y = up.
 * The villa footprint is x ∈ [-15, 15], z ∈ [-7, 7], split by a central gallery
 * (z ∈ [-1, 1]) into a north row and a south row of rooms.
 */

export type RoomId =
  | "living"
  | "dining"
  | "guest"
  | "nursery"
  | "theatre"
  | "study"
  | "master"
  | "suite";

export type Facade = "N" | "S";

export interface WindowSpec {
  id: string;
  roomId: RoomId;
  label: string;
  facade: Facade;
  /** centre of the opening along x */
  x: number;
  width: number;
  sill: number;
  head: number;
}

export interface BedSpec {
  roomId: RoomId;
  /** centre of the headboard face (where pillows rest against) */
  headX: number;
  headZ: number;
  /** unit direction from headboard towards the foot of the bed */
  dirX: number;
  dirZ: number;
  width: number;
  length: number;
  /** height of the mattress top surface */
  mattressTop: number;
}

export interface LampSpec {
  x: number;
  y: number;
  z: number;
}

export interface RoomSpec {
  id: RoomId;
  index: number;
  name: string;
  short: string;
  /** x0, z0, x1, z1 (grid lines, walls are centred on them) */
  bounds: [number, number, number, number];
  row: Facade;
  tagline: string;
  description: string;
  /** Curtain collections this room showcases (collection ids from catalog) */
  featured: string[];
  /** true if the room has a bed that can be dressed with goose feather pillows */
  pillows: boolean;
  lamps: LampSpec[];
  /** hand-framed view from a corner, looking across the room to its windows */
  view: CameraView;
}

export const WALL_HEIGHT = 3.4;
export const EXT_WALL = 0.3;
export const INT_WALL = 0.16;
export const ROD_HEIGHT = 3.18;
export const VILLA_BOUNDS = { x0: -15, x1: 15, z0: -7, z1: 7 };
export const GALLERY = { z0: -1, z1: 1 };

export const ROOMS: RoomSpec[] = [
  {
    id: "living",
    index: 1,
    name: "Grand Living Room",
    short: "Living",
    bounds: [-15, 1, -4, 7],
    row: "S",
    tagline: "Velvet, dressed for evening",
    description:
      "A double-width salon in honed travertine and walnut, where floor-to-ceiling velvet drinks the afternoon light and returns it as shadow.",
    featured: ["velvet"],
    pillows: false,
    lamps: [
      { x: -11.7, y: 1.6, z: 1.55 },
      { x: -7.55, y: 0.95, z: 1.7 },
    ],
    view: { position: [-4.9, 2.05, 1.6], target: [-10.6, 1.1, 5.7] },
  },
  {
    id: "dining",
    index: 2,
    name: "Dining Room",
    short: "Dining",
    bounds: [-4, 1, 3, 7],
    row: "S",
    tagline: "Embroidered, for ceremony",
    description:
      "A walnut table for ten beneath a brushed-brass halo. Gilt-thread embroidery catches the candlelight along every line.",
    featured: ["embroidered"],
    pillows: false,
    lamps: [{ x: -0.5, y: 2.3, z: 3.9 }],
    view: { position: [2.4, 2.05, 1.55], target: [-1.3, 1.05, 5.5] },
  },
  {
    id: "guest",
    index: 3,
    name: "Coastal Guest Bedroom",
    short: "Guest",
    bounds: [3, 1, 9.5, 7],
    row: "S",
    tagline: "Linen, sun-washed and easy",
    description:
      "Sea-mist walls, pale oak and rattan. Relaxed linen lets the morning in softly, the way a house by the sea should.",
    featured: ["linen"],
    pillows: true,
    lamps: [
      { x: 9.15, y: 0.95, z: 3.12 },
      { x: 9.15, y: 0.95, z: 5.48 },
    ],
    view: { position: [3.65, 2.05, 1.55], target: [7.0, 0.95, 5.3] },
  },
  {
    id: "nursery",
    index: 4,
    name: "Nursery",
    short: "Nursery",
    bounds: [9.5, 1, 15, 7],
    row: "S",
    tagline: "Soft blackout for gentle naps",
    description:
      "Blush plaster, a cloud mobile and a rocking chair by the window. Soft blackout draws a daytime nap into quiet dusk.",
    featured: ["blackout"],
    pillows: false,
    lamps: [{ x: 14.4, y: 1.45, z: 6.2 }],
    view: { position: [10.1, 2.0, 1.55], target: [13.2, 0.95, 5.4] },
  },
  {
    id: "theatre",
    index: 5,
    name: "Home Theatre",
    short: "Theatre",
    bounds: [-15, -7, -8, -1],
    row: "N",
    tagline: "Premium blackout, absolute dark",
    description:
      "Fluted walnut, deep recliners and a cinema screen. Triple-weave blackout returns the room to true darkness at noon.",
    featured: ["blackout"],
    pillows: false,
    lamps: [{ x: -11.5, y: 2.2, z: -1.5 }],
    view: { position: [-8.6, 2.1, -1.55], target: [-12.2, 1.05, -5.3] },
  },
  {
    id: "study",
    index: 6,
    name: "Study",
    short: "Study",
    bounds: [-8, -7, -2, -1],
    row: "N",
    tagline: "Library velvet in forest green",
    description:
      "Walnut shelving, a leather reading chair and library-green walls — a stately velvet keeps the afternoon glare off the page.",
    featured: ["velvet"],
    pillows: false,
    lamps: [{ x: -7.35, y: 1.5, z: -1.6 }],
    view: { position: [-2.6, 2.05, -1.55], target: [-5.9, 1.05, -5.5] },
  },
  {
    id: "master",
    index: 7,
    name: "Master Bedroom",
    short: "Master",
    bounds: [-2, -7, 6, -1],
    row: "N",
    tagline: "Blackout & goose feather pillows",
    description:
      "Greige plaster, oak and an upholstered headboard. Blackout for deep sleep, and a bed dressed in goose feather pillows.",
    featured: ["blackout", "pillows"],
    pillows: true,
    lamps: [
      { x: -1.62, y: 0.95, z: -5.32 },
      { x: -1.62, y: 0.95, z: -2.68 },
    ],
    view: { position: [5.4, 2.05, -1.55], target: [0.9, 0.85, -5.1] },
  },
  {
    id: "suite",
    index: 8,
    name: "Boutique Hotel Suite",
    short: "Suite",
    bounds: [6, -7, 15, -1],
    row: "N",
    tagline: "Velvet & layered pillows",
    description:
      "Fluted panelling, a freestanding stone bath and a bed layered like a five-star suite. Velvet frames it all in quiet grandeur.",
    featured: ["velvet", "pillows"],
    pillows: true,
    lamps: [
      { x: 14.45, y: 0.97, z: -5.65 },
      { x: 8.2, y: 2.3, z: -5.35 },
    ],
    view: { position: [6.65, 2.05, -1.55], target: [11.4, 0.95, -5.0] },
  },
];

export const ROOM_BY_ID = Object.fromEntries(ROOMS.map((r) => [r.id, r])) as Record<RoomId, RoomSpec>;

export const WINDOWS: WindowSpec[] = [
  { id: "living-1", roomId: "living", label: "West window", facade: "S", x: -12.3, width: 3.2, sill: 0.3, head: 3.0 },
  { id: "living-2", roomId: "living", label: "East window", facade: "S", x: -6.9, width: 3.2, sill: 0.3, head: 3.0 },
  { id: "dining-1", roomId: "dining", label: "Garden window", facade: "S", x: -0.5, width: 3.6, sill: 0.45, head: 3.0 },
  { id: "guest-1", roomId: "guest", label: "Sea window", facade: "S", x: 5.9, width: 2.8, sill: 0.55, head: 2.95 },
  { id: "nursery-1", roomId: "nursery", label: "Garden window", facade: "S", x: 12.1, width: 2.4, sill: 0.65, head: 2.9 },
  { id: "theatre-1", roomId: "theatre", label: "Screen-side window", facade: "N", x: -10.2, width: 2.6, sill: 0.7, head: 2.9 },
  { id: "study-1", roomId: "study", label: "Library window", facade: "N", x: -5.0, width: 2.8, sill: 0.75, head: 2.95 },
  { id: "master-1", roomId: "master", label: "West window", facade: "N", x: 0.9, width: 2.2, sill: 0.5, head: 2.95 },
  { id: "master-2", roomId: "master", label: "East window", facade: "N", x: 4.1, width: 2.2, sill: 0.5, head: 2.95 },
  { id: "suite-1", roomId: "suite", label: "Bath window", facade: "N", x: 8.2, width: 2.4, sill: 0.5, head: 2.95 },
  { id: "suite-2", roomId: "suite", label: "Lounge window", facade: "N", x: 11.6, width: 2.4, sill: 0.5, head: 2.95 },
];

export const WINDOW_BY_ID = Object.fromEntries(WINDOWS.map((w) => [w.id, w])) as Record<string, WindowSpec>;

export const windowsForRoom = (roomId: RoomId) => WINDOWS.filter((w) => w.roomId === roomId);

export const BEDS: BedSpec[] = [
  // Master: headboard on the west partition (x = -2), bed runs east.
  { roomId: "master", headX: -1.86, headZ: -4.0, dirX: 1, dirZ: 0, width: 2.0, length: 2.15, mattressTop: 0.66 },
  // Suite: headboard on the east exterior wall (x = 15), bed runs west.
  { roomId: "suite", headX: 14.72, headZ: -4.2, dirX: -1, dirZ: 0, width: 2.2, length: 2.2, mattressTop: 0.68 },
  // Guest: headboard on the east partition (x = 9.5), bed runs west.
  { roomId: "guest", headX: 9.36, headZ: 4.3, dirX: -1, dirZ: 0, width: 1.65, length: 2.05, mattressTop: 0.62 },
];

export const BED_BY_ROOM = Object.fromEntries(BEDS.map((b) => [b.roomId, b])) as Partial<Record<RoomId, BedSpec>>;

/** Door openings in partitions: [wall key, centre, width] */
export interface DoorSpec {
  wall: "gallery-N" | "gallery-S" | "x=-4" | "x=-8" | "x=-2" | "x=6" | "x=3" | "x=9.5";
  centre: number;
  width: number;
  height: number;
}

export const DOORS: DoorSpec[] = [
  { wall: "gallery-N", centre: -9.3, width: 1.2, height: 2.6 },
  { wall: "gallery-N", centre: -3.2, width: 1.2, height: 2.6 },
  { wall: "gallery-N", centre: 4.8, width: 1.4, height: 2.6 },
  { wall: "gallery-N", centre: 7.4, width: 1.4, height: 2.6 },
  { wall: "gallery-S", centre: -13.0, width: 1.6, height: 2.7 },
  { wall: "gallery-S", centre: -2.6, width: 1.6, height: 2.6 },
  { wall: "gallery-S", centre: 4.4, width: 1.2, height: 2.6 },
  { wall: "gallery-S", centre: 10.6, width: 1.2, height: 2.6 },
  { wall: "x=-4", centre: 2.6, width: 2.6, height: 2.9 },
];

export const roomCenter = (r: RoomSpec) => ({
  x: (r.bounds[0] + r.bounds[2]) / 2,
  z: (r.bounds[1] + r.bounds[3]) / 2,
});

/** z of the inner face of the facade a window sits in */
export const facadeInnerZ = (f: Facade) => (f === "N" ? VILLA_BOUNDS.z0 + EXT_WALL / 2 : VILLA_BOUNDS.z1 - EXT_WALL / 2);
/** unit vector pointing from the window into the room */
export const facadeInward = (f: Facade) => (f === "N" ? 1 : -1);

export type Vec3 = [number, number, number];
export interface CameraView {
  position: Vec3;
  target: Vec3;
}

export const OVERVIEW_VIEW: CameraView = {
  position: [11.5, 27, 30],
  target: [0, 0, 0.6],
};

export const INTRO_VIEW: CameraView = {
  position: [34, 42, 58],
  target: [0, 0, 0],
};

/** Camera view looking across a room towards its windows. */
export function roomView(room: RoomSpec): CameraView {
  if (room.view) return room.view;
  const c = roomCenter(room);
  const wins = windowsForRoom(room.id);
  const f = room.row;
  const inward = facadeInward(f);
  const wz = facadeInnerZ(f);
  const tx = wins.reduce((s, w) => s + w.x, 0) / wins.length;
  const backZ = f === "N" ? room.bounds[3] : room.bounds[1];
  const camZ = backZ - inward * 0.9; // 0.9 m in front of the back wall
  const camX = c.x + (tx - c.x) * 0.35;
  return {
    position: [camX, 1.75, camZ],
    target: [tx, 1.35, wz + inward * 0.2],
  };
}

/** Camera view framing a single window and its curtains. */
export function windowView(w: WindowSpec): CameraView {
  const inward = facadeInward(w.facade);
  const wz = facadeInnerZ(w.facade);
  const room = ROOM_BY_ID[w.roomId];
  const c = roomCenter(room);
  const side = Math.sign(c.x - w.x) || 1;
  const dist = Math.max(3.7, w.width * 1.3);
  const midY = (ROD_HEIGHT + 0.2) / 2 + 0.1;
  return {
    position: [w.x + side * 0.75, 1.7, wz + inward * dist],
    target: [w.x, midY, wz],
  };
}

/** Close-up on the left panel's fabric. */
export function closeupView(w: WindowSpec): CameraView {
  const inward = facadeInward(w.facade);
  const wz = facadeInnerZ(w.facade);
  const px = w.x - w.width / 2 - 0.05;
  return {
    position: [px + 0.55, 1.5, wz + inward * 1.05],
    target: [px, 1.45, wz + inward * 0.12],
  };
}

/** View of a bed for dressing it with pillows. */
export function bedView(b: BedSpec): CameraView {
  const px = -b.dirZ;
  const pz = b.dirX;
  return {
    position: [
      b.headX + b.dirX * 3.2 + px * 1.3,
      1.85,
      b.headZ + b.dirZ * 3.2 + pz * 1.3,
    ],
    target: [b.headX + b.dirX * 0.35, b.mattressTop + 0.15, b.headZ + b.dirZ * 0.35],
  };
}
