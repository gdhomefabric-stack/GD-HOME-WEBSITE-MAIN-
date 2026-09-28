"use client";

import { PRINT_SHAPES, printUnitPrice, normaliseSpec, sizeOf } from "@/data/printPillows";
import { money } from "@/lib/pricing";
import { updateSpec, usePrintStudio } from "@/store/printStudio";

export function ShapeIcon({ id, letter }: { id: string; letter?: string }) {
  const shape = PRINT_SHAPES.find((s) => s.id === id)!;
  if (!shape.d) {
    return (
      <svg viewBox="0 0 100 100" className="shape-icon" aria-hidden="true">
        <text x="50" y="84" textAnchor="middle" fontSize="96" fontWeight="800" fontFamily="Montserrat, Arial Black, sans-serif">
          {letter || "A"}
        </text>
      </svg>
    );
  }
  return (
    <svg viewBox={shape.vb.join(" ")} className="shape-icon" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
      <path d={shape.d} />
    </svg>
  );
}

export function ShapeStep() {
  const spec = usePrintStudio((s) => s.design.spec);
  const shape = PRINT_SHAPES.find((s) => s.id === spec.shape)!;
  return (
    <div className="pstep">
      <header className="pstep__head">
        <h2>Choose a shape</h2>
        <p className="muted">Every shape is cut and sewn by hand around your print. You can change it at any time.</p>
      </header>

      <fieldset className="shape-grid">
        <legend className="sr-only">Shape</legend>
        {PRINT_SHAPES.map((s) => {
          const from = printUnitPrice(normaliseSpec({ ...spec, shape: s.id, sizeId: s.sizes[0].id }));
          return (
            <label key={s.id} className={`shape-card${s.id === spec.shape ? " is-on" : ""}`}>
              <input type="radio" name="shape" className="sr-only" checked={s.id === spec.shape} onChange={() => updateSpec({ shape: s.id })} />
              <ShapeIcon id={s.id} letter={spec.letter} />
              <span className="shape-card__name">{s.name}</span>
              <span className="shape-card__from">from {money(from)}</span>
            </label>
          );
        })}
      </fieldset>
      <p className="pstep__note">
        <b>{shape.name}.</b> {shape.note}.{" "}
        {shape.zip ? "Hidden zip, so the cover comes off for washing." : "Filled and sewn closed, like a soft toy."}
      </p>

      {spec.shape === "letter" && (
        <div className="field pfield">
          <label htmlFor="p-letter">Which letter or number?</label>
          <input
            id="p-letter"
            className="letter-input"
            value={spec.letter}
            maxLength={1}
            autoComplete="off"
            onChange={(e) => {
              const v = e.target.value.toUpperCase().replace(/[^A-Z0-9&]/g, "").slice(-1);
              if (v) updateSpec({ letter: v });
            }}
          />
        </div>
      )}

      <fieldset className="opt-group">
        <legend className="opt-group__legend">Size</legend>
        <div className="opt-group__items">
          {shape.sizes.map((z) => (
            <label key={z.id} className={`opt${z.id === sizeOf(spec).id ? " is-on" : ""}`}>
              <input type="radio" name="size" className="sr-only" checked={z.id === sizeOf(spec).id} onChange={() => updateSpec({ sizeId: z.id })} />
              <span className="opt__label">
                {z.label} <em>· {money(printUnitPrice({ ...spec, sizeId: z.id }))}</em>
              </span>
            </label>
          ))}
        </div>
        <p className="opt-group__hint">
          Not sure? Open <b>On a sofa</b> above the preview to see the pillow to scale. 45 cm is the most popular sofa size.
        </p>
      </fieldset>
    </div>
  );
}
