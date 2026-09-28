"use client";

import { useEffect, useMemo, useState } from "react";
import { sizeOf } from "@/data/printPillows";
import { FILTERS, FONTS, layerLabel, textLayer, type FilterId, type ImageLayer, type Layer, type Side, type TextLayer } from "@/lib/print/design";
import { PALETTES, PATTERNS, PATTERN_BY_ID, isSingleMotif, patternTile, type PatternKind, type PatternParams } from "@/lib/print/patterns";
import { drawSide } from "@/lib/print/render";
import { TEMPLATES } from "@/lib/print/templates";
import { addLayer, editableSide, moveLayer, removeLayer, updateLayer, updateSide, usePrintStudio } from "@/store/printStudio";
import { AiTab } from "./AiTab";
import { ColourPicker } from "./ColourPicker";
import { requestPhoto } from "./photoPicker";
import { duplicateLayer } from "./SelectionBar";

type Tab = "ai" | "patterns" | "photos" | "text" | "templates";
const TABS: { id: Tab; label: string }[] = [
  { id: "templates", label: "Templates" },
  { id: "ai", label: "✨ AI generator" },
  { id: "patterns", label: "Patterns" },
  { id: "photos", label: "Photos" },
  { id: "text", label: "Text" },
];

let lastTab: Tab = "templates";

function useSide(): Side {
  return usePrintStudio((s) => s.design[editableSide(s.design, s.side) ?? "front"]);
}

export function DesignStep() {
  const [tab, setTab] = useState<Tab>(lastTab);
  const side = usePrintStudio((s) => s.side);
  const locked = usePrintStudio((s) => !editableSide(s.design, s.side));
  const selected = usePrintStudio((s) => s.selected);
  useEffect(() => {
    lastTab = tab;
  }, [tab]);

  if (locked) {
    return (
      <div className="pstep">
        <header className="pstep__head">
          <h2>The back</h2>
          <p className="muted">Right now the back is set to follow your choice in Fabric &amp; finish.</p>
        </header>
        <div className="page-hero__actions" style={{ justifyContent: "flex-start" }}>
          <button type="button" className="btn" onClick={() => usePrintStudio.getState().update((d) => ({ ...d, spec: { ...d.spec, back: "custom" } }))}>
            Design the back
          </button>
          <button type="button" className="btn btn--outline" onClick={() => usePrintStudio.getState().setSide("front")}>
            Edit the front
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pstep">
      <header className="pstep__head">
        <h2>Design the {side}</h2>
        <p className="muted">Start from a template, let AI paint something new, pick a pattern, or add your own photos and words — mix them freely.</p>
      </header>
      <div className="dtabs" role="tablist" aria-label="Design tools">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={`dtabs__btn${tab === t.id ? " is-on" : ""}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="dtabs__panel" role="tabpanel">
        {tab === "ai" && <AiTab />}
        {tab === "patterns" && <PatternTab />}
        {tab === "photos" && <PhotoTab />}
        {tab === "text" && <TextTab />}
        {tab === "templates" && <TemplateTab />}
      </div>
      {selected && <Inspector />}
      <LayerList />
      <BackgroundCard />
    </div>
  );
}

/* ---------------- templates ---------------- */

function TemplateTab() {
  const spec = usePrintStudio((s) => s.design.spec);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  useEffect(() => {
    let alive = true;
    const make = () => {
      const size = sizeOf(spec);
      const out: Record<string, string> = {};
      for (const t of TEMPLATES) {
        const c = document.createElement("canvas");
        const W = 180;
        const H = Math.round((W * size.h) / size.w);
        c.width = W;
        c.height = H;
        drawSide(c.getContext("2d")!, t.build(spec), { x: 0, y: 0, w: W, h: H }, { placeholders: true });
        out[t.id] = c.toDataURL("image/png");
      }
      if (alive) setThumbs(out);
    };
    make();
    void document.fonts?.ready.then(() => alive && make());
    return () => {
      alive = false;
    };
  }, [spec]);

  const apply = (id: string) => {
    const t = TEMPLATES.find((x) => x.id === id)!;
    const st = usePrintStudio.getState();
    const sid = editableSide(st.design, st.side) ?? "front";
    const cur = st.design[sid];
    if ((cur.layers.length || cur.fill) && !window.confirm("Replace this side's current design with the template? You can undo this.")) return;
    updateSide(() => t.build(st.design.spec));
    st.select(null);
  };

  return (
    <div>
      <p className="muted small">Pick one, then tap the photo spot to add your picture and change any words.</p>
      <ul className="tpl-grid">
        {TEMPLATES.map((t) => (
          <li key={t.id}>
            <button type="button" className="tpl" onClick={() => apply(t.id)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {thumbs[t.id] ? <img src={thumbs[t.id]} alt="" /> : <span className="tpl__ph" />}
              <span className="tpl__name">{t.name}</span>
              <span className="tpl__note">{t.note}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------------- patterns ---------------- */

function PatternTab() {
  const fill = useSide().fill;
  const current = fill?.type === "pattern" ? fill.pattern : null;
  const [colors, setColors] = useState<string[]>(current?.colors ?? PALETTES[0].colors);
  const [seed, setSeed] = useState(current?.seed ?? 1);

  const thumbs = useMemo(() => {
    const out: Record<string, string> = {};
    for (const p of PATTERNS) out[p.id] = patternTile({ kind: p.id, colors, seed }, 112).toDataURL();
    return out;
  }, [colors, seed]);

  const apply = (kind: PatternKind, c = colors, s = seed) => {
    const pattern: PatternParams = { kind, colors: c, seed: s };
    updateSide((side) => ({
      ...side,
      color: c[0],
      fill: {
        type: "pattern",
        pattern,
        scale: side.fill?.type === "pattern" && side.fill.pattern.kind === kind ? side.fill.scale : PATTERN_BY_ID[kind].scale,
        rot: side.fill?.type === "pattern" ? side.fill.rot : 0,
      },
    }));
  };

  const setPalette = (c: string[]) => {
    setColors(c);
    if (current) apply(current.kind, c);
  };

  return (
    <div className="pat">
      <div className="field">
        <span className="field__label">Colour palette</span>
        <div className="palettes">
          {PALETTES.map((p) => (
            <button key={p.id} type="button" className={`palette${p.colors.join() === colors.join() ? " is-on" : ""}`} onClick={() => setPalette(p.colors)} title={p.name}>
              {p.colors.map((c, i) => (
                <i key={i} style={{ background: c }} />
              ))}
              <span className="sr-only">{p.name}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="pat__colours" role="group" aria-label="Edit the palette colours">
        {colors.map((c, i) => (
          <label key={i} className="pat__colour" title={i === 0 ? "Background" : `Colour ${i}`}>
            <input
              type="color"
              value={c}
              onChange={(e) => {
                const next = [...colors];
                next[i] = e.target.value;
                setPalette(next);
              }}
            />
            <span>{i === 0 ? "Base" : i}</span>
          </label>
        ))}
        <button
          type="button"
          className="btn btn--sm btn--outline"
          onClick={() => {
            const s = seed + 1;
            setSeed(s);
            if (current) apply(current.kind, colors, s);
          }}
        >
          ↻ Shuffle
        </button>
      </div>
      <ul className="pat__grid">
        {PATTERNS.map((p) => (
          <li key={p.id}>
            <button type="button" className={`pat__item${current?.kind === p.id ? " is-on" : ""}`} onClick={() => apply(p.id)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={thumbs[p.id]} alt="" />
              <span>{p.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------------- photos ---------------- */

function PhotoTab() {
  const layers = useSide().layers;
  const placeholders = layers.filter((l): l is ImageLayer => l.type === "image" && !l.src);
  return (
    <div className="photos">
      <button type="button" className="dropzone" onClick={() => requestPhoto({ kind: "new" })}>
        <span className="dropzone__icon" aria-hidden="true">
          ⊕
        </span>
        <b>Upload photos</b>
        <span className="muted">or drag them onto the preview · JPG, PNG or WebP</span>
      </button>
      {placeholders.length > 0 && (
        <div className="photos__ph">
          <p>Your template has {placeholders.length === 1 ? "a photo spot" : `${placeholders.length} photo spots`} waiting:</p>
          {placeholders.map((l) => (
            <button key={l.id} type="button" className="btn btn--sm" onClick={() => requestPhoto({ kind: "layer", id: l.id })}>
              Add photo to “{l.name}”
            </button>
          ))}
        </div>
      )}
      <div className="photos__more">
        <button type="button" className="btn btn--sm btn--outline" onClick={() => requestPhoto({ kind: "background" })}>
          Use a photo as the whole background
        </button>
      </div>
      <p className="muted small">
        For a sharp print, use the original photo from your phone or camera rather than a screenshot or a photo sent by
        messaging apps. We&apos;ll warn you if a photo is too small for the size you&apos;ve chosen.
      </p>
    </div>
  );
}

/* ---------------- text ---------------- */

const TEXT_PRESETS: { name: string; patch: Partial<TextLayer> }[] = [
  { name: "Elegant", patch: { text: "Home Sweet Home", font: "Playfair Display", weight: 400, italic: true, size: 0.1 } },
  { name: "Script", patch: { text: "Forever & Always", font: "Great Vibes", size: 0.14 } },
  { name: "Modern", patch: { text: "HELLO", font: "Montserrat", weight: 800, size: 0.12, spacing: 0.2 } },
  { name: "Tall caps", patch: { text: "GOOD VIBES", font: "Bebas Neue", size: 0.16, spacing: 0.06 } },
  { name: "Handwritten", patch: { text: "Sweet dreams", font: "Caveat", weight: 700, size: 0.13 } },
  { name: "Retro", patch: { text: "Let's stay in", font: "Pacifico", size: 0.1 } },
];

function TextTab() {
  const side = useSide();
  const add = (patch: Partial<TextLayer>) => {
    // readable on the current background
    const dark = isDark(side.color);
    addLayer(textLayer({ ...patch, color: dark ? "#f8f2e6" : "#2e241a", y: 0.5 }));
  };
  return (
    <div>
      <p className="muted small">Tap a style to add it, then type your own words in the box that appears below.</p>
      <div className="text-presets">
        {TEXT_PRESETS.map((p) => (
          <button
            key={p.name}
            type="button"
            className="text-preset"
            onClick={() => add(p.patch)}
            style={{ fontFamily: `"${p.patch.font}"`, fontWeight: p.patch.weight ?? 400, fontStyle: p.patch.italic ? "italic" : undefined, letterSpacing: p.patch.spacing ? `${p.patch.spacing}em` : undefined }}
          >
            {p.patch.text}
            <span className="text-preset__name">{p.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function isDark(hex: string) {
  const m = hex.replace("#", "");
  if (m.length < 6) return false;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(m.slice(i, i + 2), 16));
  return 0.299 * r + 0.587 * g + 0.114 * b < 128;
}

/* ---------------- selected layer ---------------- */

function Range({ label, value, min, max, step = 0.01, fmt, onChange }: { label: string; value: number; min: number; max: number; step?: number; fmt?: (v: number) => string; onChange: (v: number) => void }) {
  return (
    <label className="range prange">
      <span className="range__label">
        {label} <b>{fmt ? fmt(value) : Math.round(value * 100)}</b>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onPointerDown={() => usePrintStudio.getState().checkpoint()}
        onKeyDown={() => usePrintStudio.getState().checkpoint()}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

function Inspector() {
  const side = useSide();
  const spec = usePrintStudio((s) => s.design.spec);
  const selected = usePrintStudio((s) => s.selected);
  const layer = side.layers.find((l) => l.id === selected);
  if (!layer) return null;
  const set = (p: Partial<Layer>) => updateLayer(layer.id, p, { history: false });
  const setNow = (p: Partial<Layer>) => updateLayer(layer.id, p);
  const size = sizeOf(spec);

  return (
    <section className="inspector" aria-label="Selected layer">
      <div className="inspector__head">
        <h3>{layer.type === "text" ? "Edit text" : "Edit photo"}</h3>
        <button type="button" className="btn btn--sm btn--ghost" onClick={() => usePrintStudio.getState().select(null)}>
          Done
        </button>
      </div>

      {layer.type === "text" ? (
        <>
          <div className="field">
            <label htmlFor="t-text">Your words</label>
            <textarea
              id="t-text"
              rows={2}
              value={layer.text}
              onFocus={() => usePrintStudio.getState().checkpoint()}
              onChange={(e) => set({ text: e.target.value })}
            />
          </div>
          <div className="inspector__row">
            <label className="field">
              <span className="field__label">Font</span>
              <select
                value={layer.font}
                style={{ fontFamily: `"${layer.font}"` }}
                onChange={(e) => {
                  const f = FONTS.find((x) => x.family === e.target.value)!;
                  setNow({ font: f.family, weight: f.weights.includes(layer.weight) ? layer.weight : f.weights[f.weights.length > 1 ? 1 : 0] });
                }}
              >
                {FONTS.map((f) => (
                  <option key={f.family} value={f.family} style={{ fontFamily: `"${f.family}"` }}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="toggles" role="group" aria-label="Style">
              {(FONTS.find((f) => f.family === layer.font)?.weights.length ?? 1) > 1 && (
                <button
                  type="button"
                  aria-pressed={layer.weight >= 600}
                  onClick={() => {
                    const ws = FONTS.find((f) => f.family === layer.font)!.weights;
                    setNow({ weight: layer.weight >= 600 ? ws[0] : ws[ws.length - 1] });
                  }}
                  style={{ fontWeight: 700 }}
                >
                  B
                </button>
              )}
              <button type="button" aria-pressed={!!layer.italic} onClick={() => setNow({ italic: !layer.italic })} style={{ fontStyle: "italic" }}>
                I
              </button>
              <button type="button" aria-pressed={!!layer.upper} onClick={() => setNow({ upper: !layer.upper })} title="Capitals">
                AA
              </button>
              <button type="button" aria-pressed={layer.shadow} onClick={() => setNow({ shadow: !layer.shadow })} title="Shadow">
                Shadow
              </button>
            </div>
          </div>
          <div className="field">
            <span className="field__label">Colour</span>
            <ColourPicker value={layer.color} onChange={(c) => setNow({ color: c })} label="Text colour" />
          </div>
          <Range label="Size" value={layer.size} min={0.02} max={0.6} step={0.005} fmt={(v) => `${Math.round(v * size.h)} cm`} onChange={(v) => set({ size: v })} />
          <Range label="Curve" value={layer.curve} min={-1} max={1} step={0.02} fmt={(v) => (Math.abs(v) < 0.03 ? "straight" : v > 0 ? "arch" : "smile")} onChange={(v) => set({ curve: Math.abs(v) < 0.03 ? 0 : v })} />
          <Range label="Letter spacing" value={layer.spacing} min={-0.05} max={0.6} step={0.01} onChange={(v) => set({ spacing: v })} />
          <Range label="Outline" value={layer.outline} min={0} max={2} step={0.05} fmt={(v) => (v === 0 ? "none" : v.toFixed(1))} onChange={(v) => set({ outline: v })} />
          {layer.outline > 0 && (
            <div className="field">
              <span className="field__label">Outline colour</span>
              <ColourPicker value={layer.outlineColor} onChange={(c) => setNow({ outlineColor: c })} label="Outline colour" />
            </div>
          )}
          {layer.text.includes("\n") && (
            <div className="toggles" role="group" aria-label="Alignment">
              {(["left", "center", "right"] as const).map((a) => (
                <button key={a} type="button" aria-pressed={layer.align === a} onClick={() => setNow({ align: a })}>
                  {a === "center" ? "Centre" : a[0].toUpperCase() + a.slice(1)}
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <PhotoQuality layer={layer} />
          <div className="page-hero__actions" style={{ justifyContent: "flex-start" }}>
            <button type="button" className="btn btn--sm" onClick={() => requestPhoto({ kind: "layer", id: layer.id })}>
              {layer.src ? "Replace photo" : "Add photo"}
            </button>
            <button
              type="button"
              className="btn btn--sm btn--outline"
              onClick={() => {
                const boxAspect = size.h / size.w;
                const a = layer.round ? 1 : layer.aspect;
                setNow({ x: 0.5, y: 0.5, rot: 0, w: a > boxAspect ? 1.04 : (1.04 * boxAspect) / a });
              }}
            >
              Fill pillow
            </button>
            <button
              type="button"
              className="btn btn--sm btn--outline"
              onClick={() => {
                const boxAspect = size.h / size.w;
                const a = layer.round ? 1 : layer.aspect;
                setNow({ x: 0.5, y: 0.5, rot: 0, w: a > boxAspect ? (0.86 * boxAspect) / a : 0.86 });
              }}
            >
              Fit inside
            </button>
          </div>
          {layer.src && (
            <div className="field">
              <span className="field__label">Filter</span>
              <div className="toggles toggles--wrap" role="group" aria-label="Filter">
                {FILTERS.map((f) => (
                  <button key={f.id} type="button" aria-pressed={layer.filter === f.id} onClick={() => setNow({ filter: f.id as FilterId })}>
                    {f.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <Range label="Size" value={layer.w} min={0.05} max={2} step={0.005} fmt={(v) => `${Math.round(v * size.w)} cm wide`} onChange={(v) => set({ w: v })} />
          <div className="toggles" role="group" aria-label="Photo options">
            <button type="button" aria-pressed={layer.flip} onClick={() => setNow({ flip: !layer.flip })}>
              Mirror
            </button>
            <button type="button" aria-pressed={!!layer.round} onClick={() => setNow({ round: !layer.round })}>
              Circle crop
            </button>
            {layer.src && (
              <button
                type="button"
                onClick={() => {
                  updateSide((s) => ({
                    ...s,
                    fill: { type: "image", src: layer.src, mode: "cover", scale: 1, dx: 0, dy: 0, aspect: layer.aspect, px: layer.px },
                    layers: s.layers.filter((l) => l.id !== layer.id),
                  }));
                  usePrintStudio.getState().select(null);
                }}
              >
                Make background
              </button>
            )}
          </div>
        </>
      )}
      <Range label="Rotate" value={layer.rot} min={-180} max={180} step={1} fmt={(v) => `${Math.round(v)}°`} onChange={(v) => set({ rot: v })} />
      <Range label="Opacity" value={layer.opacity} min={0.1} max={1} step={0.01} fmt={(v) => `${Math.round(v * 100)}%`} onChange={(v) => set({ opacity: v })} />
    </section>
  );
}

/** Effective print resolution of a photo at its printed size. */
export function photoDpi(l: ImageLayer, widthCm: number) {
  if (!l.px) return Infinity;
  const printedCm = l.w * widthCm;
  const shown = l.round ? l.px * Math.min(1, 1 / l.aspect) : l.px;
  return shown / (printedCm / 2.54);
}

function PhotoQuality({ layer }: { layer: ImageLayer }) {
  const spec = usePrintStudio((s) => s.design.spec);
  if (!layer.src) return <p className="quality quality--warn">This is an empty photo spot — add a photo to it.</p>;
  const dpi = photoDpi(layer, sizeOf(spec).w);
  if (dpi >= 110) return <p className="quality quality--ok">✓ Great quality for this size</p>;
  if (dpi >= 70) return <p className="quality quality--mid">Good — will print slightly soft up close</p>;
  return <p className="quality quality--warn">Low resolution at this size — it may print blurry. Make it smaller or use the original photo.</p>;
}

/* ---------------- layers ---------------- */

function LayerList() {
  const layers = useSide().layers;
  const selected = usePrintStudio((s) => s.selected);
  if (!layers.length) return null;
  return (
    <section className="layers" aria-label="Layers">
      <h3 className="layers__title">Layers <span className="muted">(top first)</span></h3>
      <ul>
        {[...layers].reverse().map((l, i) => (
          <li key={l.id} className={`layer${l.id === selected ? " is-on" : ""}`}>
            <button type="button" className="layer__main" onClick={() => usePrintStudio.getState().select(l.id)} aria-pressed={l.id === selected}>
              <span className="layer__icon" aria-hidden="true">
                {l.type === "text" ? "T" : l.src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={l.src} alt="" />
                ) : (
                  "▢"
                )}
              </span>
              <span className="layer__name">{layerLabel(l)}</span>
            </button>
            <span className="layer__tools">
              <button type="button" onClick={() => updateLayer(l.id, { hidden: !l.hidden })} aria-label={l.hidden ? "Show" : "Hide"} title={l.hidden ? "Show" : "Hide"}>
                {l.hidden ? "◌" : "●"}
              </button>
              <button type="button" onClick={() => moveLayer(l.id, 1)} disabled={i === 0} aria-label="Move up" title="Move up">
                ↑
              </button>
              <button type="button" onClick={() => moveLayer(l.id, -1)} disabled={i === layers.length - 1} aria-label="Move down" title="Move down">
                ↓
              </button>
              <button type="button" onClick={() => duplicateLayer(l)} aria-label="Duplicate" title="Duplicate">
                ⧉
              </button>
              <button type="button" onClick={() => removeLayer(l.id)} aria-label="Delete" title="Delete">
                ✕
              </button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------------- background ---------------- */

function BackgroundCard() {
  const side = useSide();
  const f = side.fill;
  const setFill = (p: Record<string, number>, history = false) =>
    updateSide((s) => (s.fill ? { ...s, fill: { ...s.fill, ...p } as Side["fill"] } : s), { history });
  return (
    <section className="bgcard" aria-label="Background">
      <h3 className="layers__title">Background</h3>
      <ColourPicker value={side.color} onChange={(c) => updateSide((s) => ({ ...s, color: c }))} label="Background colour" />
      {f && (
        <div className="bgcard__fill">
          <p>
            {f.type === "pattern" ? `${PATTERN_BY_ID[f.pattern.kind].name} pattern` : f.mode === "tile" ? "Repeating image" : "Full photo / artwork"}
            <button type="button" className="link-btn" onClick={() => updateSide((s) => ({ ...s, fill: null }))}>
              Remove
            </button>
          </p>
          {f.type === "pattern" ? (
            <>
              {f.pattern.kind !== "ombre" && (
                <Range
                  label={isSingleMotif(f.pattern.kind) ? "Size" : "Pattern scale"}
                  value={f.scale}
                  min={isSingleMotif(f.pattern.kind) ? 0.4 : 0.08}
                  max={isSingleMotif(f.pattern.kind) ? 1.6 : 1.2}
                  fmt={(v) => `${Math.round(v * 100)}%`}
                  onChange={(v) => setFill({ scale: v })}
                />
              )}
              <Range label="Rotate" value={f.rot} min={-90} max={90} step={1} fmt={(v) => `${v}°`} onChange={(v) => setFill({ rot: v })} />
            </>
          ) : (
            <>
              <div className="toggles" role="group" aria-label="Image mode">
                <button type="button" aria-pressed={f.mode === "cover"} onClick={() => updateSide((s) => ({ ...s, fill: { ...(s.fill as Extract<Side["fill"], { type: "image" }>), mode: "cover", scale: 1 } }))}>
                  Fill once
                </button>
                <button type="button" aria-pressed={f.mode === "tile"} onClick={() => updateSide((s) => ({ ...s, fill: { ...(s.fill as Extract<Side["fill"], { type: "image" }>), mode: "tile", scale: 0.5 } }))}>
                  Repeat
                </button>
              </div>
              <Range label={f.mode === "tile" ? "Tile size" : "Zoom"} value={f.scale} min={f.mode === "tile" ? 0.1 : 1} max={f.mode === "tile" ? 1.2 : 3} fmt={(v) => `${Math.round(v * 100)}%`} onChange={(v) => setFill({ scale: v })} />
              <Range label="Move left / right" value={f.dx} min={-0.5} max={0.5} fmt={(v) => `${Math.round(v * 100)}`} onChange={(v) => setFill({ dx: v })} />
              <Range label="Move up / down" value={f.dy} min={-0.5} max={0.5} fmt={(v) => `${Math.round(v * 100)}`} onChange={(v) => setFill({ dy: v })} />
            </>
          )}
        </div>
      )}
    </section>
  );
}
