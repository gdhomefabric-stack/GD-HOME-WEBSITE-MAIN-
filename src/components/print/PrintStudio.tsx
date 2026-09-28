"use client";

import "@fontsource/playfair-display/latin-400.css";
import "@fontsource/playfair-display/latin-700.css";
import "@fontsource/great-vibes/latin-400.css";
import "@fontsource/pacifico/latin-400.css";
import "@fontsource/lobster/latin-400.css";
import "@fontsource/caveat/latin-400.css";
import "@fontsource/caveat/latin-700.css";
import "@fontsource/montserrat/latin-400.css";
import "@fontsource/montserrat/latin-700.css";
import "@fontsource/montserrat/latin-800.css";
import "@fontsource/bebas-neue/latin-400.css";

import { useEffect, useRef, useState } from "react";
import { printUnitPrice, sizeOf } from "@/data/printPillows";
import { imageLayer } from "@/lib/print/design";
import { readPhoto } from "@/lib/print/images";
import { DRAFT, loadDesign, saveDesign } from "@/lib/print/storage";
import { money } from "@/lib/pricing";
import { addLayer, currentSide, editableSide, updateLayer, updateSide, updateSpec, usePrintStudio, type StudioStep } from "@/store/printStudio";
import { useToasts } from "@/components/villa/actions";
import { Toasts } from "@/components/villa/ui/Overlays";
import { DesignStep } from "./DesignStep";
import { FinishStep } from "./FinishStep";
import { registerPhotoPicker, type PhotoTarget } from "./photoPicker";
import { ReviewStep } from "./ReviewStep";
import { SelectionBar } from "./SelectionBar";
import { ShapeStep } from "./ShapeStep";
import { Stage } from "./Stage";

const STEPS: { id: StudioStep; label: string; short: string }[] = [
  { id: "shape", label: "Shape & size", short: "Shape" },
  { id: "design", label: "Design", short: "Design" },
  { id: "finish", label: "Fabric & finish", short: "Finish" },
  { id: "review", label: "Review & order", short: "Order" },
];

/** Put an uploaded photo where the visitor asked for it. */
async function placePhoto(file: File, target: PhotoTarget) {
  const { src, w, h } = await readPhoto(file);
  const aspect = h / w;
  const name = file.name.replace(/\.[a-z0-9]+$/i, "").slice(0, 40) || "Photo";
  if (target.kind === "background") {
    updateSide((s) => ({ ...s, fill: { type: "image", src, mode: "cover", scale: 1, dx: 0, dy: 0, aspect, px: w } }));
    return;
  }
  if (target.kind === "layer") {
    const l = currentSide().layers.find((x) => x.id === target.id);
    if (l && l.type === "image") {
      // fill the placeholder's frame, cropping the overflow
      const nw = l.round ? l.w : Math.max(l.w, (l.w * l.aspect) / aspect);
      updateLayer(l.id, { src, aspect, px: w, name, w: nw });
      usePrintStudio.getState().select(l.id);
      return;
    }
  }
  const { spec } = usePrintStudio.getState().design;
  const size = sizeOf(spec);
  const boxAspect = size.h / size.w;
  const fit = 0.72;
  const lw = aspect > boxAspect ? (fit * boxAspect) / aspect : fit;
  addLayer(imageLayer({ src, aspect, px: w, name, w: lw }));
}

export function PrintStudio() {
  const step = usePrintStudio((s) => s.step);
  const spec = usePrintStudio((s) => s.design.spec);
  const view = usePrintStudio((s) => s.view);
  const side = usePrintStudio((s) => s.side);
  const back = usePrintStudio((s) => s.design.spec.back);
  const canUndo = usePrintStudio((s) => s.past.length > 0);
  const canRedo = usePrintStudio((s) => s.future.length > 0);
  const ready = usePrintStudio((s) => s.ready);
  const fileRef = useRef<HTMLInputElement>(null);
  const target = useRef<PhotoTarget>({ kind: "new" });
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const stepIndex = STEPS.findIndex((s) => s.id === step);
  const price = printUnitPrice(spec);

  // restore a design from the cart (?ref=) or the last draft
  useEffect(() => {
    let cancelled = false;
    const ref = new URLSearchParams(window.location.search).get("ref");
    void (async () => {
      const d = (ref && (await loadDesign(ref))) || (await loadDesign(DRAFT));
      if (cancelled) return;
      if (d && d.spec && d.front) {
        usePrintStudio.getState().load(d);
        if (ref) usePrintStudio.getState().setStep("design");
      } else usePrintStudio.setState({ ready: true });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // autosave
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    const unsub = usePrintStudio.subscribe((s, prev) => {
      if (!s.ready || s.design === prev.design) return;
      clearTimeout(t);
      t = setTimeout(() => void saveDesign(DRAFT, usePrintStudio.getState().design), 700);
    });
    return () => {
      clearTimeout(t);
      unsub();
    };
  }, []);

  // photo picker
  useEffect(() => {
    registerPhotoPicker((t) => {
      target.current = t;
      fileRef.current?.click();
    });
    return () => registerPhotoPicker(null);
  }, []);

  // undo / redo shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest("input, textarea, select, [contenteditable]")) return;
      if (!(e.metaKey || e.ctrlKey)) return;
      const k = e.key.toLowerCase();
      if (k === "z" && !e.shiftKey) {
        e.preventDefault();
        usePrintStudio.getState().undo();
      } else if ((k === "z" && e.shiftKey) || k === "y") {
        e.preventDefault();
        usePrintStudio.getState().redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const addFiles = async (files: FileList | File[], t: PhotoTarget) => {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!list.length) {
      useToasts.getState().push({ message: "Please choose a JPG, PNG or WebP image." });
      return;
    }
    setBusy(true);
    try {
      // only the first file can fill a placeholder or the background
      await placePhoto(list[0], t);
      for (const f of list.slice(1)) await placePhoto(f, { kind: "new" });
      const st = usePrintStudio.getState();
      if (st.step !== "design") st.setStep("design");
    } catch {
      useToasts.getState().push({ message: "That photo couldn't be opened. Try a JPG or PNG." });
    } finally {
      setBusy(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const st = usePrintStudio.getState();
    if (!editableSide(st.design, st.side)) st.setSide("front");
    if (e.dataTransfer.files.length) void addFiles(e.dataTransfer.files, { kind: "new" });
  };

  const backLocked = side === "back" && back !== "custom";

  return (
    <div className="pstudio">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files?.length) void addFiles(e.target.files, target.current);
          e.target.value = "";
        }}
      />

      <section
        className={`pstage${dragging ? " is-drop" : ""}`}
        aria-label="Preview"
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("Files")) {
            e.preventDefault();
            setDragging(true);
          }
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <div className="pstage__bar">
          <div className="seg" role="group" aria-label="Side">
            {(["front", "back"] as const).map((s) => (
              <button key={s} type="button" aria-pressed={side === s} onClick={() => usePrintStudio.getState().setSide(s)}>
                {s === "front" ? "Front" : "Back"}
              </button>
            ))}
          </div>
          <div className="seg" role="group" aria-label="View">
            {(
              [
                ["pillow", "Pillow"],
                ["print", "Print file"],
                ["room", "On a sofa"],
              ] as const
            ).map(([v, label]) => (
              <button key={v} type="button" aria-pressed={view === v} onClick={() => usePrintStudio.getState().setView(v)}>
                {label}
              </button>
            ))}
          </div>
          <div className="pstage__history">
            <button type="button" className="icon-btn" onClick={() => usePrintStudio.getState().undo()} disabled={!canUndo} aria-label="Undo" title="Undo (Ctrl+Z)">
              <UndoIcon />
            </button>
            <button type="button" className="icon-btn" onClick={() => usePrintStudio.getState().redo()} disabled={!canRedo} aria-label="Redo" title="Redo (Ctrl+Shift+Z)">
              <UndoIcon flip />
            </button>
          </div>
        </div>

        <div className="pstage__view">
          {ready ? <Stage
              onRequestPhoto={(id) => {
                target.current = { kind: "layer", id };
                fileRef.current?.click();
              }}
            /> : <div className="pstage__loading">Opening your studio…</div>}
          {backLocked && (
            <div className="pstage__notice">
              {back === "same" ? "The back repeats the front." : "The back is plain fabric."}{" "}
              <button
                type="button"
                className="link-btn"
                onClick={() => {
                  updateSpec({ back: "custom" });
                }}
              >
                Design the back instead
              </button>
            </div>
          )}
          {view === "print" && !backLocked && (
            <p className="pstage__legend">
              <span className="k k--cut" /> cutting line <span className="k k--safe" /> keep text &amp; faces inside · the pale area is cut away
            </p>
          )}
          {busy && <div className="pstage__busy">Adding your photo…</div>}
          {dragging && <div className="pstage__drop">Drop photos to add them</div>}
        </div>
        <SelectionBar />
      </section>

      <section className="ppanel" aria-label="Design your pillow">
        <ol className="psteps">
          {STEPS.map((s, i) => (
            <li key={s.id}>
              <button
                type="button"
                className={`psteps__btn${s.id === step ? " is-on" : ""}${i < stepIndex ? " is-done" : ""}`}
                aria-current={s.id === step ? "step" : undefined}
                onClick={() => usePrintStudio.getState().setStep(s.id)}
              >
                <span className="psteps__n">{i + 1}</span>
                <span className="psteps__label">{s.label}</span>
                <span className="psteps__short">{s.short}</span>
              </button>
            </li>
          ))}
        </ol>

        <div className="ppanel__body">
          {step === "shape" && <ShapeStep />}
          {step === "design" && <DesignStep />}
          {step === "finish" && <FinishStep />}
          {step === "review" && <ReviewStep />}
        </div>

        <div className="ppanel__foot">
          <div className="ppanel__price">
            <span>{sizeOf(spec).label}</span>
            <strong>{money(price)}</strong>
          </div>
          <div className="ppanel__nav">
            {stepIndex > 0 && (
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => usePrintStudio.getState().setStep(STEPS[stepIndex - 1].id)}>
                Back
              </button>
            )}
            {stepIndex < STEPS.length - 1 && (
              <button type="button" className="btn btn--sm" onClick={() => usePrintStudio.getState().setStep(STEPS[stepIndex + 1].id)}>
                Next: {STEPS[stepIndex + 1].short}
              </button>
            )}
          </div>
        </div>
      </section>
      <Toasts />
    </div>
  );
}

function UndoIcon({ flip }: { flip?: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={flip ? { transform: "scaleX(-1)" } : undefined}>
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
    </svg>
  );
}
