"use client";

import { useCallback, useEffect, useRef } from "react";
import { BLEED_CM, SAFE_CM, sizeOf } from "@/data/printPillows";
import { backSide, type Layer } from "@/lib/print/design";
import { onImageLoaded } from "@/lib/print/images";
import { drawPillow, drawRoom, drawSide, type LayerBounds } from "@/lib/print/render";
import { fillShape, strokeShape, type Box } from "@/lib/print/shapes";
import { editableSide, removeLayer, updateLayer, usePrintStudio } from "@/store/printStudio";

const checkpoint = () => usePrintStudio.getState().checkpoint();

type Mode = "move" | "scale" | "rotate";
interface Gesture {
  mode: Mode;
  id: string;
  start: { x: number; y: number };
  layer: Layer;
  bounds: LayerBounds;
  moved: boolean;
}

const HANDLE = 11;

function toLocal(b: LayerBounds, x: number, y: number) {
  const a = (-b.rot * Math.PI) / 180;
  const dx = x - b.cx;
  const dy = y - b.cy;
  return { x: dx * Math.cos(a) - dy * Math.sin(a), y: dx * Math.sin(a) + dy * Math.cos(a) };
}
function fromLocal(b: LayerBounds, x: number, y: number) {
  const a = (b.rot * Math.PI) / 180;
  return { x: b.cx + x * Math.cos(a) - y * Math.sin(a), y: b.cy + x * Math.sin(a) + y * Math.cos(a) };
}
const inside = (b: LayerBounds, x: number, y: number, pad = 0) => {
  const p = toLocal(b, x, y);
  return Math.abs(p.x) <= b.w / 2 + pad && Math.abs(p.y) <= b.h / 2 + pad;
};

/**
 * The live preview. Draws the sewn pillow, the flat print or the room, and
 * lets the visitor drag, resize and rotate layers directly on it.
 */
export function Stage({ onRequestPhoto }: { onRequestPhoto: (layerId: string) => void }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boundsRef = useRef<LayerBounds[]>([]);
  const boxRef = useRef<Box>({ x: 0, y: 0, w: 1, h: 1 });
  const gesture = useRef<Gesture | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ d: number; a: number; layer: Layer } | null>(null);
  const guides = useRef<{ v: boolean; h: boolean }>({ v: false, h: false });
  const frame = useRef(0);

  const draw = useCallback(() => {
    const c = canvasRef.current;
    const wrap = wrapRef.current;
    if (!c || !wrap) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cw = wrap.clientWidth;
    const ch = wrap.clientHeight;
    const W = Math.round(cw * dpr);
    const H = Math.round(ch * dpr);
    if (c.width !== W || c.height !== H) {
      c.width = W;
      c.height = H;
    }
    const ctx = c.getContext("2d")!;
    const { design, side, view, selected } = usePrintStudio.getState();
    const size = sizeOf(design.spec);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);

    if (view === "room") {
      drawRoom(ctx, W, H, design, side);
      boundsRef.current = [];
      return;
    }

    let box: Box;
    let bounds: LayerBounds[];
    const editable = editableSide(design, side) !== null;
    if (view === "print") {
      const tw = size.w + BLEED_CM * 2;
      const th = size.h + BLEED_CM * 2;
      const k = Math.min((W * 0.88) / tw, (H * 0.84) / th);
      const pxcm = k;
      box = { x: (W - size.w * pxcm) / 2, y: (H - size.h * pxcm) / 2, w: size.w * pxcm, h: size.h * pxcm };
      const bleed = BLEED_CM * pxcm;
      const sideData = side === "front" ? design.front : backSide(design);
      bounds = drawSide(ctx, sideData, box, { bleed, placeholders: true });
      // veil over the parts that are cut away
      const veil = document.createElement("canvas");
      veil.width = W;
      veil.height = H;
      const v = veil.getContext("2d")!;
      v.fillStyle = "rgba(248,242,230,0.66)";
      v.fillRect(box.x - bleed, box.y - bleed, box.w + bleed * 2, box.h + bleed * 2);
      v.globalCompositeOperation = "destination-out";
      fillShape(v, design.spec, box, "cut");
      ctx.drawImage(veil, 0, 0);
      ctx.strokeStyle = "rgba(0,0,0,0.25)";
      ctx.lineWidth = 1;
      ctx.strokeRect(box.x - bleed, box.y - bleed, box.w + bleed * 2, box.h + bleed * 2);
      ctx.strokeStyle = "#d4006f";
      strokeShape(ctx, design.spec, box, Math.max(1.5, dpr * 1.5), "cut");
      ctx.save();
      ctx.strokeStyle = "#0a7cc2";
      ctx.setLineDash([6 * dpr, 5 * dpr]);
      const safe = SAFE_CM * pxcm;
      strokeShape(ctx, design.spec, { x: box.x + safe, y: box.y + safe, w: box.w - safe * 2, h: box.h - safe * 2 }, Math.max(1, dpr), "cut");
      ctx.restore();
      // dimensions
      ctx.fillStyle = "rgba(46,36,26,0.75)";
      ctx.font = `500 ${12 * dpr}px "Inter Variable", sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(`${size.w} cm`, box.x + box.w / 2, box.y - bleed - 8 * dpr);
      ctx.save();
      ctx.translate(box.x - bleed - 10 * dpr, box.y + box.h / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(`${size.h} cm`, 0, 0);
      ctx.restore();
    } else {
      const k = Math.min((W * 0.76) / size.w, (H * 0.74) / size.h);
      box = { x: (W - size.w * k) / 2, y: (H - size.h * k) / 2 - H * 0.01, w: size.w * k, h: size.h * k };
      bounds = drawPillow(ctx, design, side, box, { placeholders: editable });
    }
    boxRef.current = box;
    boundsRef.current = editable ? bounds : [];

    // selection
    const sel = editable ? boundsRef.current.find((b) => b.id === selected) : null;
    if (sel) {
      ctx.save();
      ctx.translate(sel.cx, sel.cy);
      ctx.rotate((sel.rot * Math.PI) / 180);
      ctx.strokeStyle = "#c69a3f";
      ctx.lineWidth = 1.5 * dpr;
      ctx.setLineDash([5 * dpr, 4 * dpr]);
      ctx.strokeRect(-sel.w / 2, -sel.h / 2, sel.w, sel.h);
      ctx.setLineDash([]);
      // rotate stalk
      ctx.beginPath();
      ctx.moveTo(0, -sel.h / 2);
      ctx.lineTo(0, -sel.h / 2 - 26 * dpr);
      ctx.stroke();
      const r = HANDLE * dpr * 0.5;
      ctx.fillStyle = "#fff";
      for (const [hx, hy] of [
        [sel.w / 2, sel.h / 2],
        [0, -sel.h / 2 - 26 * dpr],
      ]) {
        ctx.beginPath();
        ctx.arc(hx, hy, r + 2 * dpr, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.fillStyle = "#c69a3f";
      ctx.beginPath();
      ctx.arc(sel.w / 2, sel.h / 2, r - 1 * dpr, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // centre guides while dragging
    if (gesture.current?.mode === "move") {
      ctx.save();
      ctx.strokeStyle = "rgba(212,0,111,0.7)";
      ctx.lineWidth = dpr;
      if (guides.current.v) {
        ctx.beginPath();
        ctx.moveTo(box.x + box.w / 2, box.y - 10 * dpr);
        ctx.lineTo(box.x + box.w / 2, box.y + box.h + 10 * dpr);
        ctx.stroke();
      }
      if (guides.current.h) {
        ctx.beginPath();
        ctx.moveTo(box.x - 10 * dpr, box.y + box.h / 2);
        ctx.lineTo(box.x + box.w + 10 * dpr, box.y + box.h / 2);
        ctx.stroke();
      }
      ctx.restore();
    }
  }, []);

  const request = useCallback(() => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(draw);
  }, [draw]);

  useEffect(() => {
    const unsub = usePrintStudio.subscribe(request);
    const offImg = onImageLoaded(request);
    const ro = new ResizeObserver(request);
    if (wrapRef.current) ro.observe(wrapRef.current);
    const fonts = typeof document !== "undefined" ? document.fonts : undefined;
    fonts?.addEventListener?.("loadingdone", request);
    void fonts?.load?.('800 100px "Montserrat"').then(request, () => {});
    void fonts?.ready?.then(request);
    request();
    return () => {
      unsub();
      offImg();
      ro.disconnect();
      fonts?.removeEventListener?.("loadingdone", request);
      cancelAnimationFrame(frame.current);
    };
  }, [request]);

  /* ---------------- interaction ---------------- */

  const pos = (e: { clientX: number; clientY: number }) => {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * c.width) / r.width, y: ((e.clientY - r.top) * c.height) / r.height };
  };

  const hitHandle = (b: LayerBounds, x: number, y: number): Mode | null => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const tol = 16 * dpr;
    const corner = fromLocal(b, b.w / 2, b.h / 2);
    if (Math.hypot(x - corner.x, y - corner.y) < tol) return "scale";
    const stalk = fromLocal(b, 0, -b.h / 2 - 26 * dpr);
    if (Math.hypot(x - stalk.x, y - stalk.y) < tol) return "rotate";
    return null;
  };

  const layerAt = (x: number, y: number) => {
    const bs = boundsRef.current;
    for (let i = bs.length - 1; i >= 0; i--) if (inside(bs[i], x, y, 4)) return bs[i];
    return null;
  };

  const findLayer = (id: string) => {
    const { design, side } = usePrintStudio.getState();
    const sid = editableSide(design, side);
    return sid ? design[sid].layers.find((l) => l.id === id) ?? null : null;
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const st = usePrintStudio.getState();
    if (st.view === "room") return;
    const p = pos(e);
    pointers.current.set(e.pointerId, p);
    e.currentTarget.setPointerCapture(e.pointerId);

    if (pointers.current.size === 2 && st.selected) {
      const [a, b] = [...pointers.current.values()];
      const layer = findLayer(st.selected);
      if (layer) {
        gesture.current = null;
        checkpoint();
        pinch.current = { d: Math.hypot(b.x - a.x, b.y - a.y), a: Math.atan2(b.y - a.y, b.x - a.x), layer };
      }
      return;
    }

    const sel = boundsRef.current.find((b) => b.id === st.selected);
    const handle = sel ? hitHandle(sel, p.x, p.y) : null;
    const target = handle && sel ? sel : layerAt(p.x, p.y);
    if (!target) {
      st.select(null);
      return;
    }
    const layer = findLayer(target.id);
    if (!layer) return;
    if (st.selected !== target.id) st.select(target.id);
    gesture.current = { mode: handle ?? "move", id: target.id, start: p, layer, bounds: target, moved: false };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = pos(e);
    const c = canvasRef.current!;
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, p);

    if (pinch.current && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(b.x - a.x, b.y - a.y);
      const ang = Math.atan2(b.y - a.y, b.x - a.x);
      const k = d / Math.max(1, pinch.current.d);
      const l = pinch.current.layer;
      const rot = l.rot + ((ang - pinch.current.a) * 180) / Math.PI;
      updateLayer(l.id, l.type === "image" ? { w: clamp(l.w * k, 0.03, 4), rot } : { size: clamp(l.size * k, 0.015, 1.2), rot }, { history: false });
      return;
    }

    const g = gesture.current;
    if (!g) {
      // cursor feedback
      const st = usePrintStudio.getState();
      const sel = boundsRef.current.find((b) => b.id === st.selected);
      const h = sel ? hitHandle(sel, p.x, p.y) : null;
      c.style.cursor = h === "scale" ? "nwse-resize" : h === "rotate" ? "grab" : layerAt(p.x, p.y) ? "move" : "default";
      return;
    }
    if (!g.moved) {
      if (Math.hypot(p.x - g.start.x, p.y - g.start.y) < 3) return;
      g.moved = true;
      checkpoint();
    }
    const box = boxRef.current;
    const l = g.layer;
    if (g.mode === "move") {
      let x = l.x + (p.x - g.start.x) / box.w;
      let y = l.y + (p.y - g.start.y) / box.h;
      const snap = e.shiftKey ? 0 : 0.012;
      guides.current = { v: Math.abs(x - 0.5) < snap, h: Math.abs(y - 0.5) < snap };
      if (guides.current.v) x = 0.5;
      if (guides.current.h) y = 0.5;
      updateLayer(l.id, { x, y }, { history: false });
    } else if (g.mode === "scale") {
      const b = g.bounds;
      const d0 = Math.hypot(g.start.x - b.cx, g.start.y - b.cy);
      const d1 = Math.hypot(p.x - b.cx, p.y - b.cy);
      const k = d1 / Math.max(1, d0);
      updateLayer(l.id, l.type === "image" ? { w: clamp(l.w * k, 0.03, 4) } : { size: clamp(l.size * k, 0.015, 1.2) }, { history: false });
    } else {
      const b = g.bounds;
      const a0 = Math.atan2(g.start.y - b.cy, g.start.x - b.cx);
      const a1 = Math.atan2(p.y - b.cy, p.x - b.cx);
      let rot = l.rot + ((a1 - a0) * 180) / Math.PI;
      rot = ((rot % 360) + 540) % 360 - 180;
      if (!e.shiftKey) {
        const snapTo = Math.round(rot / 45) * 45;
        if (Math.abs(rot - snapTo) < 4) rot = snapTo;
      }
      updateLayer(l.id, { rot }, { history: false });
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    gesture.current = null;
    guides.current = { v: false, h: false };
    request();
  };

  const onDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const p = pos(e);
    const hit = layerAt(p.x, p.y);
    const l = hit && findLayer(hit.id);
    if (l && l.type === "image") onRequestPhoto(l.id);
  };

  const onWheel = (e: WheelEvent) => {
    const st = usePrintStudio.getState();
    if (!st.selected || st.view === "room") return;
    const p = pos(e);
    const sel = boundsRef.current.find((b) => b.id === st.selected);
    if (!sel || !inside(sel, p.x, p.y, 20)) return;
    const l = findLayer(st.selected);
    if (!l) return;
    e.preventDefault();
    const k = Math.exp(-e.deltaY * 0.0015);
    updateLayer(l.id, l.type === "image" ? { w: clamp(l.w * k, 0.03, 4) } : { size: clamp(l.size * k, 0.015, 1.2) }, { history: false });
  };

  const wheelRef = useRef(onWheel);
  wheelRef.current = onWheel;
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const fn = (e: WheelEvent) => wheelRef.current(e);
    c.addEventListener("wheel", fn, { passive: false });
    return () => c.removeEventListener("wheel", fn);
  }, []);

  const onKeyDown = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    const st = usePrintStudio.getState();
    const l = st.selected ? findLayer(st.selected) : null;
    if (!l) return;
    const step = e.shiftKey ? 0.05 : 0.01;
    const move: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    if (move[e.key]) {
      e.preventDefault();
      updateLayer(l.id, { x: l.x + move[e.key][0], y: l.y + move[e.key][1] });
    } else if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      removeLayer(l.id);
    } else if (e.key === "Escape") {
      st.select(null);
    }
  };

  return (
    <div ref={wrapRef} className="pstage__canvas-wrap">
      <canvas
        ref={canvasRef}
        className="pstage__canvas"
        tabIndex={0}
        role="img"
        aria-label="Live preview of your pillow. Drag a photo or text to move it, the corner handle to resize, the top handle to rotate. With a layer selected, arrow keys move it and Delete removes it."
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={onDoubleClick}
        onKeyDown={onKeyDown}
      />
    </div>
  );
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
