"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { CurtainConfig, PillowConfig, PlacedPillow } from "@/data/catalog";
import type { Lighting } from "./villa";
import { uid } from "./villa";

export interface CartItem {
  uid: string;
  kind: "curtain" | "pillow";
  title: string;
  subtitle: string;
  details: Record<string, string>;
  unitPrice: number;
  qty: number;
  image?: string;
  curtain?: CurtainConfig;
  pillow?: PillowConfig;
}

export interface SavedLook {
  uid: string;
  title: string;
  roomName: string;
  windowLabel?: string;
  lighting: Lighting;
  curtain?: CurtainConfig;
  pillows?: PlacedPillow[];
  details: Record<string, string>;
  price: number;
  image?: string;
  createdAt: number;
}

interface ShopState {
  cart: CartItem[];
  saved: SavedLook[];
  addToCart: (item: Omit<CartItem, "uid" | "qty"> & { qty?: number }) => void;
  setQty: (id: string, qty: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  saveLook: (look: Omit<SavedLook, "uid" | "createdAt">) => void;
  removeLook: (id: string) => void;
}

const MAX_SAVED = 24;

/** localStorage can be unavailable (private mode, blocked storage) — never throw. */
const safeStorage = createJSONStorage(() => ({
  getItem: (k: string) => {
    try {
      return window.localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  setItem: (k: string, v: string) => {
    try {
      window.localStorage.setItem(k, v);
    } catch {
      /* quota or blocked — keep in memory only */
    }
  },
  removeItem: (k: string) => {
    try {
      window.localStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  },
}));

export const useShop = create<ShopState>()(
  persist(
    (set) => ({
      cart: [],
      saved: [],
      addToCart: (item) =>
        set((s) => {
          // merge identical pillow lines
          if (item.kind === "pillow" && item.pillow) {
            const key = JSON.stringify(item.pillow);
            const hit = s.cart.find((c) => c.kind === "pillow" && JSON.stringify(c.pillow) === key);
            if (hit) {
              return { cart: s.cart.map((c) => (c === hit ? { ...c, qty: c.qty + (item.qty ?? 1) } : c)) };
            }
          }
          return { cart: [...s.cart, { ...item, qty: item.qty ?? 1, uid: uid("line") }] };
        }),
      setQty: (id, qty) =>
        set((s) => ({ cart: s.cart.map((c) => (c.uid === id ? { ...c, qty: Math.max(1, Math.min(99, qty)) } : c)) })),
      removeFromCart: (id) => set((s) => ({ cart: s.cart.filter((c) => c.uid !== id) })),
      clearCart: () => set({ cart: [] }),
      saveLook: (look) =>
        set((s) => ({ saved: [{ ...look, uid: uid("look"), createdAt: Date.now() }, ...s.saved].slice(0, MAX_SAVED) })),
      removeLook: (id) => set((s) => ({ saved: s.saved.filter((l) => l.uid !== id) })),
    }),
    { name: "gdhf-shop-v1", storage: safeStorage, skipHydration: true },
  ),
);

export const cartCount = (s: ShopState) => s.cart.reduce((n, c) => n + c.qty, 0);
export const cartTotal = (s: ShopState) => s.cart.reduce((n, c) => n + c.qty * c.unitPrice, 0);
