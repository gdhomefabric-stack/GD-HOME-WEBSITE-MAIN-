"use client";

import { layerLabel, newId, type Layer } from "@/lib/print/design";
import { addLayer, editableSide, moveLayer, removeLayer, updateLayer, usePrintStudio } from "@/store/printStudio";
import { requestPhoto } from "./photoPicker";

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export function scaleLayer(l: Layer, k: number) {
  updateLayer(l.id, l.type === "image" ? { w: clamp(l.w * k, 0.03, 4) } : { size: clamp(l.size * k, 0.015, 1.2) });
}

export function duplicateLayer(l: Layer) {
  addLayer({ ...l, id: newId(l.type === "text" ? "t" : "i"), x: clamp(l.x + 0.05, 0, 1), y: clamp(l.y + 0.05, 0, 1) });
}

/** Quick actions for the selected layer, right under the preview. */
export function SelectionBar() {
  const layer = usePrintStudio((s) => {
    const sid = editableSide(s.design, s.side);
    return sid ? s.design[sid].layers.find((l) => l.id === s.selected) ?? null : null;
  });
  const view = usePrintStudio((s) => s.view);
  if (!layer || view === "room") {
    return <p className="pstage__tip">Tip: drag anything on the pillow to move it · corner handle resizes · top handle rotates</p>;
  }
  return (
    <div className="selbar" role="toolbar" aria-label={`Selected: ${layerLabel(layer)}`}>
      <span className="selbar__name">{layerLabel(layer)}</span>
      <button type="button" onClick={() => scaleLayer(layer, 1 / 1.12)} aria-label="Smaller" title="Smaller">
        −
      </button>
      <button type="button" onClick={() => scaleLayer(layer, 1.12)} aria-label="Bigger" title="Bigger">
        +
      </button>
      <button type="button" onClick={() => updateLayer(layer.id, { rot: ((layer.rot + 15 + 180) % 360) - 180 })} title="Rotate 15°">
        ⟳
      </button>
      <button type="button" onClick={() => updateLayer(layer.id, { x: 0.5, y: 0.5 })} title="Centre on the pillow">
        Centre
      </button>
      <button type="button" onClick={() => moveLayer(layer.id, 1)} title="Bring forward">
        Forward
      </button>
      <button type="button" onClick={() => moveLayer(layer.id, -1)} title="Send backward">
        Back
      </button>
      {layer.type === "image" && (
        <button type="button" onClick={() => requestPhoto({ kind: "layer", id: layer.id })}>
          {layer.src ? "Replace" : "Add photo"}
        </button>
      )}
      <button type="button" onClick={() => duplicateLayer(layer)} title="Duplicate">
        Copy
      </button>
      <button type="button" className="selbar__del" onClick={() => removeLayer(layer.id)} title="Delete">
        Delete
      </button>
    </div>
  );
}
