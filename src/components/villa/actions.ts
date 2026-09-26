"use client";

import { create } from "zustand";
import {
  COLLECTION_BY_ID,
  PRODUCT_BY_ID,
  colourOf,
  curtainDetails,
  describeCurtain,
  describePillow,
  pillowDetails,
  pillowPrice,
  type CollectionId,
  type PillowConfig,
} from "@/data/catalog";
import { ROOM_BY_ID, WINDOW_BY_ID, type RoomId } from "@/data/villa";
import { captureView, nextFrames } from "@/lib/capture";
import { curtainPrice, curtainSize, feet } from "@/lib/pricing";
import { useShop } from "@/store/shop";
import { configForCollection, useVilla, type CompareShot } from "@/store/villa";

/* ---------------- toasts ---------------- */

export interface Toast {
  id: number;
  message: string;
  href?: string;
  linkLabel?: string;
}
interface ToastState {
  toasts: Toast[];
  push: (t: Omit<Toast, "id">) => void;
  dismiss: (id: number) => void;
}
let toastId = 0;
export const useToasts = create<ToastState>()((set, get) => ({
  toasts: [],
  push: (t) => {
    const id = ++toastId;
    set((s) => ({ toasts: [...s.toasts.slice(-2), { ...t, id }] }));
    setTimeout(() => get().dismiss(id), 5200);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

const snapshot = async () => (useVilla.getState().quality === "static" ? undefined : ((await captureView(520)) ?? undefined));

/* ---------------- looks & cart ---------------- */

export async function saveCurrentLook() {
  const s = useVilla.getState();
  if (!s.roomId) return;
  const room = ROOM_BY_ID[s.roomId];
  const image = await snapshot();
  if (s.mode === "bed") {
    const pillows = s.pillows[s.roomId] ?? [];
    useShop.getState().saveLook({
      title: `${room.name} — dressed bed`,
      roomName: room.name,
      lighting: s.lighting,
      pillows,
      details: { Pillows: `${pillows.length} goose feather pillow${pillows.length === 1 ? "" : "s"}` },
      price: pillows.reduce((n, p) => n + pillowPrice(p), 0),
      image,
    });
  } else if (s.windowId) {
    const w = WINDOW_BY_ID[s.windowId];
    const cfg = s.curtains[s.windowId];
    useShop.getState().saveLook({
      title: describeCurtain(cfg),
      roomName: room.name,
      windowLabel: w.label,
      lighting: s.lighting,
      curtain: cfg,
      details: curtainDetails(cfg),
      price: curtainPrice(cfg, w),
      image,
    });
  }
  useToasts.getState().push({ message: "Look saved to your collection.", href: "/cart/#saved", linkLabel: "View saved" });
  s.announce("Look saved.");
}

export async function addWindowToCart(windowId: string) {
  const s = useVilla.getState();
  const w = WINDOW_BY_ID[windowId];
  const cfg = s.curtains[windowId];
  const room = ROOM_BY_ID[w.roomId];
  const size = curtainSize(w, cfg.length);
  const image = await snapshot();
  useShop.getState().addToCart({
    kind: "curtain",
    title: describeCurtain(cfg),
    subtitle: `${room.name} · ${w.label} · ${feet(size.trackWidth)} × ${feet(size.drop)} (pair)`,
    details: curtainDetails(cfg),
    unitPrice: curtainPrice(cfg, w),
    image,
    curtain: cfg,
  });
  useToasts.getState().push({ message: `${describeCurtain(cfg)} added to your cart.`, href: "/cart/", linkLabel: "View cart" });
  s.announce("Curtains added to cart.");
}

export function addPillowToCart(cfg: PillowConfig, qty = 1) {
  useShop.getState().addToCart({
    kind: "pillow",
    title: describePillow(cfg),
    subtitle: "Goose Feather Pillow Collection",
    details: pillowDetails(cfg),
    unitPrice: pillowPrice(cfg),
    qty,
    pillow: { size: cfg.size, fill: cfg.fill, firmness: cfg.firmness, cover: cfg.cover },
  });
}

export function addBedToCart(roomId: RoomId) {
  const pillows = useVilla.getState().pillows[roomId] ?? [];
  if (!pillows.length) return;
  for (const p of pillows) addPillowToCart(p);
  useToasts.getState().push({
    message: `${pillows.length} pillow${pillows.length === 1 ? "" : "s"} added to your cart.`,
    href: "/cart/",
    linkLabel: "View cart",
  });
  useVilla.getState().announce("Pillows added to cart.");
}

/* ---------------- side-by-side comparison ---------------- */

export const COMPARE_COLLECTIONS: CollectionId[] = ["velvet", "blackout", "linen", "embroidered"];

/**
 * Renders the same window four times — velvet, blackout, linen, embroidered —
 * with the curtains drawn, so the visitor can compare fabric and light directly.
 */
export async function runCompare(windowId: string) {
  const s = useVilla.getState();
  if (s.compare.status === "running") return;
  const base = s.curtains[windowId];
  s.setCompare({ status: "running", shots: [] });
  const shots: CompareShot[] = [];
  const live3D = s.quality !== "static";
  for (const c of COMPARE_COLLECTIONS) {
    const cfg = configForCollection(windowId, c, base);
    let image = "";
    if (live3D) {
      s.setOverride({ windowId, config: cfg, open: 0.1 }, true);
      await nextFrames(4);
      image = (await captureView(560)) ?? "";
    }
    shots.push({ productId: cfg.productId, colourId: cfg.colourId, image });
  }
  if (live3D) {
    s.setOverride(null, true);
    await nextFrames(2);
    useVilla.setState({ instant: false });
  }
  useVilla.getState().setCompare({ status: "done", shots });
  useVilla.getState().announce("Comparison ready: velvet, blackout, linen and embroidered in the same room.");
}

export function applyCompareShot(windowId: string, shot: CompareShot) {
  const s = useVilla.getState();
  const p = PRODUCT_BY_ID[shot.productId];
  s.setCurtain(windowId, { productId: shot.productId, colourId: shot.colourId });
  s.setCompare({ status: "idle", shots: [] });
  s.announce(`${COLLECTION_BY_ID[p.collection].name} chosen: ${p.name} in ${colourOf({ ...s.curtains[windowId], ...shot }).name}.`);
}
