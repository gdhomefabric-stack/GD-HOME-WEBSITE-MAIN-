"use client";

import { useState } from "react";
import {
  PILLOW_COVERS,
  PILLOW_FILLS,
  PILLOW_FIRMNESS,
  PILLOW_SIZES,
  describePillow,
  pillowPrice,
  type PillowConfig,
} from "@/data/catalog";
import { money } from "@/lib/pricing";
import { addPillowToCart, useToasts } from "@/components/villa/actions";
import { OptionGroup } from "@/components/villa/ui/OptionGroup";

/** Build a goose feather pillow and add it to the cart. */
export function PillowShop() {
  const [pillow, setPillow] = useState<PillowConfig>({ size: "king", fill: "feather-down", firmness: "medium", cover: "white" });
  const [qty, setQty] = useState(2);
  return (
    <div className="pillow-shop panel">
      <OptionGroup
        step={1}
        legend="Size"
        layout="chips"
        value={pillow.size}
        options={PILLOW_SIZES.map((s) => ({ id: s.id, label: `${s.name} · ${s.dims}` }))}
        onChange={(v) => setPillow((p) => ({ ...p, size: v }))}
      />
      <OptionGroup
        step={2}
        legend="Fill"
        layout="chips"
        value={pillow.fill}
        options={PILLOW_FILLS.map((s) => ({ id: s.id, label: s.name }))}
        onChange={(v) => setPillow((p) => ({ ...p, fill: v }))}
        hint={PILLOW_FILLS.find((f) => f.id === pillow.fill)?.note}
      />
      <OptionGroup
        step={3}
        legend="Support"
        layout="chips"
        value={pillow.firmness}
        options={PILLOW_FIRMNESS.map((s) => ({ id: s.id, label: s.name }))}
        onChange={(v) => setPillow((p) => ({ ...p, firmness: v }))}
      />
      <OptionGroup
        step={4}
        legend={`Sateen cover — ${PILLOW_COVERS.find((c) => c.id === pillow.cover)?.name}`}
        layout="swatches"
        value={pillow.cover}
        options={PILLOW_COVERS.map((c) => ({ id: c.id, label: c.name }))}
        onChange={(v) => setPillow((p) => ({ ...p, cover: v }))}
        render={(o) => (
          <>
            <span className="swatch-dot" style={{ background: PILLOW_COVERS.find((c) => c.id === o.id)!.hex }} />
            <span className="sr-only">{o.label}</span>
          </>
        )}
      />
      <div className="pillow-shop__buy">
        <div>
          <strong className="serif">{describePillow(pillow)}</strong>
          <span className="muted"> · {money(pillowPrice(pillow))} each</span>
        </div>
        <label className="qty">
          <span className="sr-only">Quantity</span>
          <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="One fewer">
            −
          </button>
          <input type="number" min={1} max={12} value={qty} onChange={(e) => setQty(Math.max(1, Math.min(12, Number(e.target.value) || 1)))} />
          <button type="button" onClick={() => setQty((q) => Math.min(12, q + 1))} aria-label="One more">
            +
          </button>
        </label>
        <button
          type="button"
          className="btn"
          onClick={() => {
            addPillowToCart(pillow, qty);
            useToasts.getState().push({ message: `${qty} × ${describePillow(pillow)} added.`, href: "/cart/", linkLabel: "View cart" });
          }}
        >
          Add {qty} to cart · {money(pillowPrice(pillow) * qty)}
        </button>
      </div>
    </div>
  );
}
