"use client";

import { create } from "zustand";
import {
  COLLECTION_BY_ID,
  DEFAULT_PILLOWS,
  PILLOW_SIZE_BY_ID,
  PRODUCT_BY_ID,
  ROOM_DEFAULTS,
  ROOM_PRODUCT_FOR_COLLECTION,
  productsInCollection,
  type CollectionId,
  type CurtainConfig,
  type PillowConfig,
  type PlacedPillow,
} from "@/data/catalog";
import { BED_BY_ROOM, ROOMS, ROOM_BY_ID, WINDOWS, WINDOW_BY_ID, windowsForRoom, type RoomId } from "@/data/villa";

export type Mode = "room" | "window" | "closeup" | "bed";
export type Lighting = "day" | "sunset" | "night";
export type Quality = "high" | "lite" | "static";
export type QualityPref = "auto" | Quality;
export type Panel = "curtains" | "pillows";

export interface CompareShot {
  productId: string;
  colourId: string;
  image: string;
}

let uidCounter = 0;
export const uid = (p = "id") => `${p}-${Date.now().toString(36)}-${(uidCounter++).toString(36)}`;

/** Maximum pillows per arrangement row, by bed width. */
export function rowCapacity(roomId: RoomId, row: 0 | 1 | 2): number {
  const bed = BED_BY_ROOM[roomId];
  if (!bed) return 0;
  if (row === 0) return bed.width >= 2 ? 3 : 2;
  if (row === 1) return 2;
  return 1;
}

function initialPillows(): Record<string, PlacedPillow[]> {
  const out: Record<string, PlacedPillow[]> = {};
  for (const [room, list] of Object.entries(DEFAULT_PILLOWS)) {
    out[room] = list.map((p) => ({ ...p, uid: uid("pillow") }));
  }
  return out;
}

function initialCurtains(): Record<string, CurtainConfig> {
  return Object.fromEntries(WINDOWS.map((w) => [w.id, { ...ROOM_DEFAULTS[w.roomId] }]));
}

function initialOpen(): Record<string, number> {
  return Object.fromEntries(WINDOWS.map((w) => [w.id, 0.82]));
}

interface VillaState {
  mode: Mode;
  roomId: RoomId;
  /** the room whose lit scene is on screen (lags roomId while the next room streams in) */
  roomShown: RoomId | null;
  /** the floor plan overlay */
  planOpen: boolean;
  windowId: string | null;
  lighting: Lighting;
  quality: Quality | null;
  qualityPref: QualityPref;
  curtains: Record<string, CurtainConfig>;
  open: Record<string, number>;
  pillows: Record<string, PlacedPillow[]>;
  pillowDraft: PillowConfig;
  panel: Panel;
  hoverRoom: RoomId | null;
  hoverWindow: string | null;
  /** Temporary override used while rendering comparison shots. */
  override: { windowId: string; config: CurtainConfig; open?: number } | null;
  instant: boolean;
  sceneReady: boolean;
  introDone: boolean;
  flying: boolean;
  compare: { status: "idle" | "running" | "done"; shots: CompareShot[] };
  announcement: string;
  lowFps: boolean;
  loadProgress: number;
  /** why the 3D experience gave way to the room gallery, if it did */
  fallbackReason: string | null;

  openPlan: () => void;
  closePlan: () => void;
  setRoomShown: (id: RoomId) => void;
  enterRoom: (id: RoomId) => void;
  selectWindow: (id: string) => void;
  closeup: () => void;
  dressBed: () => void;
  back: () => void;
  cycleRoom: (dir: 1 | -1) => void;
  setLighting: (l: Lighting) => void;
  setQuality: (q: Quality) => void;
  setQualityPref: (q: QualityPref) => void;
  setCurtain: (windowId: string, patch: Partial<CurtainConfig>) => void;
  setCollection: (windowId: string, c: CollectionId) => void;
  setOpen: (windowId: string, v: number) => void;
  toggleOpen: (windowId: string) => void;
  setPanel: (p: Panel) => void;
  setPillowDraft: (patch: Partial<PillowConfig>) => void;
  addPillow: (roomId: RoomId, cfg?: PillowConfig) => boolean;
  removePillow: (roomId: RoomId, uid: string) => void;
  clearPillows: (roomId: RoomId) => void;
  setHoverRoom: (id: RoomId | null) => void;
  setHoverWindow: (id: string | null) => void;
  setOverride: (o: VillaState["override"], instant?: boolean) => void;
  setCompare: (c: Partial<VillaState["compare"]>) => void;
  setSceneReady: () => void;
  setIntroDone: () => void;
  setFlying: (f: boolean) => void;
  setLowFps: (v: boolean) => void;
  setLoadProgress: (v: number) => void;
  fallBack: (reason: string) => void;
  announce: (msg: string) => void;
}

const LIGHT_NAMES: Record<Lighting, string> = { day: "Daylight", sunset: "Sunset", night: "Night" };

export const useVilla = create<VillaState>()((set, get) => ({
  mode: "room",
  roomId: "living",
  roomShown: null,
  planOpen: false,
  windowId: null,
  lighting: "day",
  quality: null,
  qualityPref: "auto",
  curtains: initialCurtains(),
  open: initialOpen(),
  pillows: initialPillows(),
  pillowDraft: { size: "euro", fill: "feather-down", firmness: "medium", cover: "ivory" },
  panel: "curtains",
  hoverRoom: null,
  hoverWindow: null,
  override: null,
  instant: false,
  sceneReady: false,
  introDone: false,
  flying: false,
  compare: { status: "idle", shots: [] },
  announcement: "",
  lowFps: false,
  loadProgress: 0,
  fallbackReason: null,

  openPlan: () => {
    set({ planOpen: true });
    get().announce("Floor plan. Choose a room to walk into.");
  },
  closePlan: () => set({ planOpen: false }),
  setRoomShown: (id) => set({ roomShown: id }),
  enterRoom: (id) => {
    const room = ROOM_BY_ID[id];
    set({ mode: "room", roomId: id, windowId: null, panel: "curtains", hoverRoom: null, planOpen: false });
    const n = windowsForRoom(id).length;
    get().announce(`${room.name}. ${room.tagline}. ${n} window${n > 1 ? "s" : ""} to dress.`);
  },
  selectWindow: (id) => {
    const w = WINDOW_BY_ID[id];
    set({ mode: "window", roomId: w.roomId, windowId: id, panel: "curtains" });
    get().announce(`${ROOM_BY_ID[w.roomId].name}, ${w.label} selected. Customise the curtains.`);
  },
  closeup: () => {
    if (!get().windowId) return;
    set({ mode: "closeup" });
    get().announce("Fabric close-up.");
  },
  dressBed: () => {
    const { roomId } = get();
    if (!roomId || !BED_BY_ROOM[roomId]) return;
    set({ mode: "bed", panel: "pillows", windowId: null });
    get().announce("Goose Feather Pillow collection. Dress the bed.");
  },
  back: () => {
    const { mode, roomId } = get();
    if (mode === "closeup") set({ mode: "window" });
    else if ((mode === "window" || mode === "bed") && roomId) get().enterRoom(roomId);
    else if (mode === "room") get().openPlan();
  },
  cycleRoom: (dir) => {
    const { roomId } = get();
    const idx = ROOMS.findIndex((r) => r.id === roomId);
    const next = ROOMS[(idx + dir + ROOMS.length) % ROOMS.length];
    get().enterRoom(next.id);
  },
  setLighting: (l) => {
    set({ lighting: l });
    get().announce(`${LIGHT_NAMES[l]} lighting.`);
  },
  setQuality: (q) => set({ quality: q }),
  setQualityPref: (q) => set({ qualityPref: q }),
  setCurtain: (windowId, patch) =>
    set((s) => ({ curtains: { ...s.curtains, [windowId]: { ...s.curtains[windowId], ...patch } } })),
  setCollection: (windowId, c) => {
    const cfg = configForCollection(windowId, c, get().curtains[windowId]);
    get().setCurtain(windowId, cfg);
    const p = PRODUCT_BY_ID[cfg.productId];
    const colour = p.colours.find((col) => col.id === cfg.colourId) ?? p.colours[0];
    get().announce(`${COLLECTION_BY_ID[c].name}: ${p.name} in ${colour.name}.`);
  },
  setOpen: (windowId, v) => set((s) => ({ open: { ...s.open, [windowId]: Math.min(1, Math.max(0, v)) } })),
  toggleOpen: (windowId) => {
    const v = get().open[windowId] > 0.5 ? 0 : 1;
    get().setOpen(windowId, v);
    get().announce(v > 0.5 ? "Curtains opened — daylight fills the room." : "Curtains drawn closed.");
  },
  setPanel: (p) => set({ panel: p }),
  setPillowDraft: (patch) => set((s) => ({ pillowDraft: { ...s.pillowDraft, ...patch } })),
  addPillow: (roomId, cfg) => {
    const draft = cfg ?? get().pillowDraft;
    const row = PILLOW_SIZE_BY_ID[draft.size].row;
    const list = get().pillows[roomId] ?? [];
    const inRow = list.filter((p) => PILLOW_SIZE_BY_ID[p.size].row === row).length;
    if (inRow >= rowCapacity(roomId, row)) {
      get().announce("That row of the bed is full — remove a pillow first.");
      return false;
    }
    set((s) => ({ pillows: { ...s.pillows, [roomId]: [...list, { ...draft, uid: uid("pillow") }] } }));
    get().announce(`${PILLOW_SIZE_BY_ID[draft.size].name} pillow added to the bed.`);
    return true;
  },
  removePillow: (roomId, id) =>
    set((s) => ({ pillows: { ...s.pillows, [roomId]: (s.pillows[roomId] ?? []).filter((p) => p.uid !== id) } })),
  clearPillows: (roomId) => set((s) => ({ pillows: { ...s.pillows, [roomId]: [] } })),
  setHoverRoom: (id) => set({ hoverRoom: id }),
  setHoverWindow: (id) => set({ hoverWindow: id }),
  setOverride: (o, instant = false) => set({ override: o, instant }),
  setCompare: (c) => set((s) => ({ compare: { ...s.compare, ...c } })),
  setSceneReady: () => set({ sceneReady: true }),
  setIntroDone: () => set({ introDone: true }),
  setFlying: (f) => set({ flying: f }),
  setLowFps: (v) => set({ lowFps: v }),
  setLoadProgress: (v) => set((s) => (v > s.loadProgress ? { loadProgress: v } : s)),
  fallBack: (reason) =>
    set({ quality: "static", fallbackReason: reason, mode: "room", windowId: null, flying: false, planOpen: true }),
  announce: (msg) => set({ announcement: msg }),
}));

/**
 * The config a window gets when the visitor picks a collection: the room's
 * recommended product for that collection, keeping the colour when it exists.
 */
export function configForCollection(windowId: string, c: CollectionId, current: CurtainConfig): CurtainConfig {
  const w = WINDOW_BY_ID[windowId];
  const roomPick = ROOM_PRODUCT_FOR_COLLECTION[w.roomId]?.[c];
  const defaultForRoom = ROOM_DEFAULTS[w.roomId];
  const product =
    (roomPick && PRODUCT_BY_ID[roomPick]) ||
    (PRODUCT_BY_ID[defaultForRoom.productId].collection === c ? PRODUCT_BY_ID[defaultForRoom.productId] : null) ||
    productsInCollection(c)[0];
  const colour =
    product.colours.find((col) => col.id === current.colourId) ??
    (product.id === defaultForRoom.productId ? product.colours.find((col) => col.id === defaultForRoom.colourId) : undefined) ??
    product.colours[0];
  const lining = c === "sheer" ? "unlined" : current.lining === "unlined" && c === "blackout" ? "cotton" : current.lining;
  return { ...current, productId: product.id, colourId: colour.id, lining };
}

/** Curtain config for a window, honouring any comparison override. */
export function effectiveCurtain(s: Pick<VillaState, "curtains" | "override">, windowId: string): CurtainConfig {
  return s.override && s.override.windowId === windowId ? s.override.config : s.curtains[windowId];
}
