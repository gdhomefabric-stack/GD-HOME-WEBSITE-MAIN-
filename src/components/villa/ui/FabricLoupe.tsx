"use client";

import { COLLECTION_BY_ID, PRODUCT_BY_ID, type Colour } from "@/data/catalog";
import { ASSETS } from "@/lib/assets";

/**
 * Macro view of the woven fabric, tinted to the chosen colour. The grey-scale
 * close-up is multiplied over the colour; embroidered fabrics add the gilt thread.
 */
export function FabricSwatch({
  productId,
  colour,
  size = 120,
  round = true,
  className = "",
}: {
  productId: string;
  colour: Colour;
  size?: number | string;
  round?: boolean;
  className?: string;
}) {
  const p = PRODUCT_BY_ID[productId];
  return (
    <span
      className={`swatch-img${round ? " swatch-img--round" : ""} ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: colour.hex,
        backgroundImage: `url(${ASSETS.closeup(p.kind)})`,
      }}
      aria-hidden="true"
    >
      {p.kind === "embroidered" && <span className="swatch-img__thread" style={{ backgroundImage: `url(${ASSETS.thread})` }} />}
      {p.kind === "velvet" && <span className="swatch-img__sheen" />}
    </span>
  );
}

export function FabricLoupe({ productId, colour, transmission }: { productId: string; colour: Colour; transmission: number }) {
  const p = PRODUCT_BY_ID[productId];
  return (
    <figure className="loupe">
      <FabricSwatch productId={productId} colour={colour} size={132} className="loupe__img" />
      <figcaption className="loupe__caption">
        <span className="eyebrow">Fabric close-up</span>
        <strong className="serif">
          {p.name} · {colour.name}
        </strong>
        <span>
          {COLLECTION_BY_ID[p.collection].name} — {p.grade}
        </span>
        <span className="muted">
          {p.composition} · {p.weight}
        </span>
        <span className="light-meter" aria-label={`Lets through about ${Math.round(transmission * 100)} percent of daylight when drawn`}>
          <span className="light-meter__bar">
            <span style={{ width: `${Math.max(2, Math.round(transmission * 100))}%` }} />
          </span>
          <span className="light-meter__label">{lightLabel(transmission)}</span>
        </span>
      </figcaption>
    </figure>
  );
}

export function lightLabel(t: number) {
  if (t < 0.02) return "Blocks all daylight";
  if (t < 0.08) return "Near-total darkness";
  if (t < 0.2) return "Dims to dusk";
  if (t < 0.4) return "Softly filtered";
  if (t < 0.6) return "Light-filtering";
  return "Diffuses into a glow";
}
