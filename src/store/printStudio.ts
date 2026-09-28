"use client";

import { create } from "zustand";
import { normaliseSpec, type PrintSpec } from "@/data/printPillows";
import { initialDesign, type Design, type Layer, type Side, type SideId } from "@/lib/print/design";

export type StudioView = "pillow" | "print" | "room";
export type StudioStep = "shape" | "design" | "finish" | "review";

interface StudioState {
  design: Design;
  side: SideId;
  selected: string | null;
  view: StudioView;
  step: StudioStep;
  past: Design[];
  future: Design[];
  /** set once a saved draft / cart design has been restored */
  ready: boolean;
  /** replace the design; `history: false` for continuous gestures after a checkpoint() */
  update: (fn: (d: Design) => Design, opts?: { history?: boolean }) => void;
  checkpoint: () => void;
  undo: () => void;
  redo: () => void;
  load: (d: Design) => void;
  setSide: (s: SideId) => void;
  select: (id: string | null) => void;
  setView: (v: StudioView) => void;
  setStep: (s: StudioStep) => void;
}

const LIMIT = 60;

export const usePrintStudio = create<StudioState>()((set, get) => ({
  design: initialDesign(),
  side: "front",
  selected: null,
  view: "pillow",
  step: "shape",
  past: [],
  future: [],
  ready: false,
  update: (fn, opts) =>
    set((s) => {
      const next = fn(s.design);
      if (next === s.design) return {};
      return opts?.history === false
        ? { design: next }
        : { design: next, past: [...s.past, s.design].slice(-LIMIT), future: [] };
    }),
  checkpoint: () => set((s) => ({ past: [...s.past, s.design].slice(-LIMIT), future: [] })),
  undo: () =>
    set((s) => {
      const prev = s.past[s.past.length - 1];
      if (!prev) return {};
      return { design: prev, past: s.past.slice(0, -1), future: [s.design, ...s.future] };
    }),
  redo: () =>
    set((s) => {
      const next = s.future[0];
      if (!next) return {};
      return { design: next, future: s.future.slice(1), past: [...s.past, s.design] };
    }),
  load: (d) => set({ design: d, past: [], future: [], selected: null, ready: true }),
  setSide: (side) => set({ side, selected: null }),
  select: (selected) => set({ selected }),
  setView: (view) => set({ view }),
  setStep: (step) => {
    const s = get();
    set({ step, view: step === "shape" || step === "finish" || step === "review" ? (s.view === "print" ? "pillow" : s.view) : s.view });
  },
}));

/* ---------------- helpers ---------------- */

const st = () => usePrintStudio.getState();

/** The side being edited (front, or the back when it has its own design). */
export const editableSide = (d: Design, side: SideId): SideId | null => (side === "front" || d.spec.back === "custom" ? side : null);

export function updateSpec(patch: Partial<PrintSpec>) {
  st().update((d) => ({ ...d, spec: normaliseSpec({ ...d.spec, ...patch }) }));
}

export function updateSide(fn: (s: Side) => Side, opts?: { history?: boolean }) {
  const { side } = st();
  st().update((d) => {
    const id = editableSide(d, side) ?? "front";
    return { ...d, [id]: fn(d[id]) };
  }, opts);
}

export function updateLayer(id: string, patch: Partial<Layer>, opts?: { history?: boolean }) {
  updateSide((s) => ({ ...s, layers: s.layers.map((l) => (l.id === id ? ({ ...l, ...patch } as Layer) : l)) }), opts);
}

export function addLayer(l: Layer) {
  updateSide((s) => ({ ...s, layers: [...s.layers, l] }));
  st().select(l.id);
}

export function removeLayer(id: string) {
  updateSide((s) => ({ ...s, layers: s.layers.filter((l) => l.id !== id) }));
  if (st().selected === id) st().select(null);
}

export function moveLayer(id: string, dir: 1 | -1) {
  updateSide((s) => {
    const i = s.layers.findIndex((l) => l.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= s.layers.length) return s;
    const layers = [...s.layers];
    [layers[i], layers[j]] = [layers[j], layers[i]];
    return { ...s, layers };
  });
}

export function currentSide(): Side {
  const { design, side } = st();
  return design[editableSide(design, side) ?? "front"];
}

export function selectedLayer(): Layer | null {
  const { selected } = st();
  return currentSide().layers.find((l) => l.id === selected) ?? null;
}
