"use client";

import {
  BACKS,
  EDGES,
  INSERTS,
  PRINT_FABRICS,
  PRINT_SHAPE_BY_ID,
  TRIM_COLOURS,
  type BackId,
  type EdgeId,
  type InsertId,
  type PrintFabricId,
} from "@/data/printPillows";
import { updateSpec, usePrintStudio } from "@/store/printStudio";
import { ColourPicker } from "./ColourPicker";

function Cards<T extends string>({
  legend,
  step,
  value,
  items,
  onChange,
}: {
  legend: string;
  step: number;
  value: T;
  items: { id: T; name: string; note: string; disabled?: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <fieldset className="opt-group opt-group--cards">
      <legend className="opt-group__legend">
        <span className="opt-group__step">{step}</span>
        {legend}
      </legend>
      <div className="opt-group__items">
        {items.map((it) => (
          <label key={it.id} className={`opt${it.id === value ? " is-on" : ""}${it.disabled ? " is-disabled" : ""}`}>
            <input type="radio" className="sr-only" name={legend} checked={it.id === value} disabled={!!it.disabled} onChange={() => onChange(it.id)} />
            <span className="opt__text">
              <span className="opt__label">{it.name}</span>
              <span className="opt__note">{it.disabled ?? it.note}</span>
            </span>
            {it.id === value && <span className="opt__tick" aria-hidden="true">✓</span>}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function FinishStep() {
  const spec = usePrintStudio((s) => s.design.spec);
  const shape = PRINT_SHAPE_BY_ID[spec.shape];
  return (
    <div className="pstep">
      <header className="pstep__head">
        <h2>Fabric &amp; finish</h2>
        <p className="muted">The preview updates as you choose — try the sheen of satin or the depth of velvet.</p>
      </header>

      <Cards<PrintFabricId> legend="Fabric" step={1} value={spec.fabric} items={PRINT_FABRICS} onChange={(v) => updateSpec({ fabric: v })} />

      <fieldset className="opt-group">
        <legend className="opt-group__legend">
          <span className="opt-group__step">2</span>Edge
        </legend>
        <div className="opt-group__items">
          {EDGES.map((e) => {
            const off = e.needsCorners && !shape.corners;
            return (
              <label key={e.id} className={`opt${e.id === spec.edge ? " is-on" : ""}${off ? " is-disabled" : ""}`} title={off ? "Tassels need corners" : e.note}>
                <input type="radio" className="sr-only" name="edge" disabled={off} checked={e.id === spec.edge} onChange={() => updateSpec({ edge: e.id as EdgeId })} />
                <span className="opt__label">{e.name}</span>
              </label>
            );
          })}
        </div>
        {spec.edge !== "seam" && (
          <div className="trim-row">
            <span className="field__label">Trim colour</span>
            <div className="swatch-row" role="radiogroup" aria-label="Trim colour">
              {TRIM_COLOURS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={t.id === spec.trim}
                  aria-label={t.name}
                  title={t.name}
                  className={`swatch${t.id === spec.trim ? " is-on" : ""}`}
                  style={{ background: t.hex }}
                  onClick={() => updateSpec({ trim: t.id })}
                />
              ))}
            </div>
          </div>
        )}
      </fieldset>

      <Cards<BackId>
        legend="Back of the pillow"
        step={3}
        value={spec.back}
        items={BACKS}
        onChange={(v) => {
          updateSpec({ back: v });
          if (v === "custom") {
            usePrintStudio.getState().setSide("back");
            usePrintStudio.getState().setStep("design");
          }
        }}
      />
      {spec.back === "plain" && (
        <div className="trim-row">
          <span className="field__label">Back colour</span>
          <ColourPicker value={spec.backColour} onChange={(c) => updateSpec({ backColour: c })} label="Back colour" />
        </div>
      )}

      <Cards<InsertId>
        legend="Filling"
        step={4}
        value={spec.insert}
        items={INSERTS.map((i) => ({ ...i, disabled: i.zipOnly && !shape.zip ? "Shaped pillows come filled and sewn closed" : undefined }))}
        onChange={(v) => updateSpec({ insert: v })}
      />
    </div>
  );
}
