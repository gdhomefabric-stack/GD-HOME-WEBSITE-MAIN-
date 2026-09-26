"use client";

import { useEffect, useRef, useState } from "react";
import {
  LENGTHS,
  LININGS,
  PLEATS,
  PRODUCT_BY_ID,
  curtainDetails,
  curtainTransmission,
  describeCurtain,
  type CurtainConfig,
  type LengthId,
  type LiningId,
  type PleatId,
} from "@/data/catalog";
import { feet, money, priceForSize } from "@/lib/pricing";
import { useShop } from "@/store/shop";
import { useToasts } from "@/components/villa/actions";
import { CurtainPreview2D } from "@/components/villa/ui/CurtainPreview2D";
import { FabricLoupe } from "@/components/villa/ui/FabricLoupe";
import { CloseIcon, LengthIcon, PleatIcon } from "@/components/villa/ui/Icons";
import { OptionGroup } from "@/components/villa/ui/OptionGroup";
import { LightingToggleLocal } from "./LightingToggleLocal";
import type { Lighting } from "@/store/villa";

/**
 * Stand-alone curtain studio for the Collections page — the same options as the
 * villa, with the visitor's own window measurements, in a 2-D study.
 */
export function CurtainStudio({ productId, onClose }: { productId: string; onClose: () => void }) {
  const product = PRODUCT_BY_ID[productId];
  const [cfg, setCfg] = useState<CurtainConfig>({
    productId,
    colourId: product.colours[0].id,
    pleat: "pinch",
    length: "floor",
    lining: product.collection === "sheer" ? "unlined" : "cotton",
  });
  const [width, setWidth] = useState(1.8);
  const [drop, setDrop] = useState(2.6);
  const [open, setOpen] = useState(0.35);
  const [lighting, setLighting] = useState<Lighting>("day");
  const [hover, setHover] = useState<string | null>(null);
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  const set = (patch: Partial<CurtainConfig>) => setCfg((c) => ({ ...c, ...patch }));
  const colour = product.colours.find((c) => c.id === (hover ?? cfg.colourId)) ?? product.colours[0];
  const price = priceForSize(cfg, width, drop);
  const add = () => {
    useShop.getState().addToCart({
      kind: "curtain",
      title: describeCurtain(cfg),
      subtitle: `Your window · ${feet(width)} × ${feet(drop)} (pair)`,
      details: { ...curtainDetails(cfg), Size: `${width.toFixed(2)} m × ${drop.toFixed(2)} m` },
      unitPrice: price,
      curtain: cfg,
    });
    useToasts.getState().push({ message: `${describeCurtain(cfg)} added to your cart.`, href: "/cart/", linkLabel: "View cart" });
  };
  return (
    <dialog ref={ref} className="dialog dialog--wide studio" aria-labelledby="studio-title" onClose={onClose}>
      <div className="dialog__head">
        <div>
          <p className="eyebrow">The fabric studio</p>
          <h2 id="studio-title">{product.name}</h2>
        </div>
        <button type="button" className="icon-btn" onClick={() => ref.current?.close()} aria-label="Close the studio">
          <CloseIcon />
        </button>
      </div>
      <div className="studio__layout">
        <div className="studio__preview">
          <CurtainPreview2D cfg={{ ...cfg, colourId: colour.id }} open={open} lighting={lighting} sill={0.8} />
          <div className="studio__preview-controls">
            <label className="range">
              <span className="range__label">
                Opening <b>{Math.round(open * 100)}%</b>
              </span>
              <input type="range" min={0} max={100} value={Math.round(open * 100)} onChange={(e) => setOpen(Number(e.target.value) / 100)} />
            </label>
            <LightingToggleLocal value={lighting} onChange={setLighting} />
          </div>
          <FabricLoupe productId={productId} colour={colour} transmission={curtainTransmission(cfg)} />
        </div>
        <div className="studio__options">
          <OptionGroup
            step={1}
            legend={`Colour — ${colour.name}`}
            layout="swatches"
            value={cfg.colourId}
            options={product.colours.map((c) => ({ id: c.id, label: c.name }))}
            onChange={(v) => set({ colourId: v })}
            onPreview={setHover}
            render={(o) => (
              <>
                <span className="swatch-dot" style={{ background: product.colours.find((c) => c.id === o.id)!.hex }} />
                <span className="sr-only">{o.label}</span>
              </>
            )}
          />
          <OptionGroup<PleatId, { id: PleatId; label: string }>
            step={2}
            legend="Pleat & heading"
            layout="icons"
            value={cfg.pleat}
            options={PLEATS.map((p) => ({ id: p.id, label: p.name }))}
            onChange={(v) => set({ pleat: v })}
            render={(o) => (
              <>
                <PleatIcon id={o.id} />
                <span className="opt__label">{o.label}</span>
              </>
            )}
          />
          <OptionGroup<LengthId, { id: LengthId; label: string }>
            step={3}
            legend="Length"
            layout="icons"
            value={cfg.length}
            options={LENGTHS.map((l) => ({ id: l.id, label: l.name }))}
            onChange={(v) => set({ length: v })}
            render={(o) => (
              <>
                <LengthIcon id={o.id} />
                <span className="opt__label">{o.label}</span>
              </>
            )}
          />
          <OptionGroup<LiningId, { id: LiningId; label: string }>
            step={4}
            legend="Lining"
            layout="chips"
            value={cfg.lining}
            options={LININGS.map((l) => ({ id: l.id, label: l.name }))}
            onChange={(v) => set({ lining: v })}
          />
          <fieldset className="opt-group">
            <legend className="opt-group__legend">
              <span className="opt-group__step">5</span>Your window
            </legend>
            <div className="size-row">
              <label className="field">
                <span className="field__label">Track width (m)</span>
                <input type="number" min={0.6} max={8} step={0.05} value={width} onChange={(e) => setWidth(Math.min(8, Math.max(0.6, Number(e.target.value) || 0.6)))} />
              </label>
              <label className="field">
                <span className="field__label">Drop (m)</span>
                <input type="number" min={0.6} max={5} step={0.05} value={drop} onChange={(e) => setDrop(Math.min(5, Math.max(0.6, Number(e.target.value) || 0.6)))} />
              </label>
            </div>
            <p className="opt-group__hint">
              {feet(width)} × {feet(drop)}. We confirm every measurement on a free survey.
            </p>
          </fieldset>
          <div className="studio__total">
            <span>Estimate, a made-to-measure pair</span>
            <strong>{money(price)}</strong>
          </div>
          <div className="summary__actions">
            <button type="button" className="btn" onClick={add}>
              Add to cart
            </button>
            <a className="btn btn--outline" href={`/consultation/?look=${encodeURIComponent(`${product.name} in ${colour.name}`)}`}>
              Consultation
            </a>
          </div>
        </div>
      </div>
    </dialog>
  );
}
