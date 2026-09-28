"use client";

import Link from "next/link";
import { useState } from "react";
import {
  COLLECTIONS,
  PILLOW_COLLECTION,
  PILLOW_COVERS,
  PILLOW_FILLS,
  PILLOW_FIRMNESS,
  PILLOW_SIZES,
  describePillow,
  pillowPrice,
  productsInCollection,
  type PillowConfig,
} from "@/data/catalog";
import { ROOMS } from "@/data/villa";
import { money, priceForSize } from "@/lib/pricing";
import { addPillowToCart, useToasts } from "@/components/villa/actions";
import { FabricSwatch } from "@/components/villa/ui/FabricLoupe";
import { OptionGroup } from "@/components/villa/ui/OptionGroup";
import { Toasts } from "@/components/villa/ui/Overlays";
import { CurtainStudio } from "./CurtainStudio";

/** Room in the villa that best shows a collection. */
const roomFor = (collection: string) => ROOMS.find((r) => r.featured.includes(collection)) ?? ROOMS[0];

export function CollectionsBrowser() {
  const [studio, setStudio] = useState<string | null>(null);
  const [pillow, setPillow] = useState<PillowConfig>({ size: "king", fill: "feather-down", firmness: "medium", cover: "white" });
  const [qty, setQty] = useState(2);

  return (
    <>
      <nav className="coll-nav" aria-label="Collections">
        {COLLECTIONS.map((c) => (
          <a key={c.id} href={`#${c.id}`}>
            {c.name}
          </a>
        ))}
        <a href="#pillows">Goose Feather Pillows</a>
      </nav>

      {COLLECTIONS.map((c) => {
        const room = roomFor(c.id);
        return (
          <section key={c.id} id={c.id} className="coll" aria-labelledby={`${c.id}-title`}>
            <header className="coll__head">
              <p className="coll__numeral serif">Collection {c.numeral}</p>
              <h2 id={`${c.id}-title`} className="h-sec">
                {c.name}
              </h2>
              <p className="lead">{c.description}</p>
              <p className="coll__best">
                <span className="eyebrow">Best for</span> {c.bestFor}
              </p>
              <Link className="link-arrow" href={`/?room=${room.id}`}>
                See it in the {room.name}
              </Link>
            </header>
            <ul className="product-grid">
              {productsInCollection(c.id).map((p) => {
                const from = priceForSize(
                  { productId: p.id, colourId: p.colours[0].id, pleat: "pencil", length: "floor", lining: c.id === "sheer" ? "unlined" : "cotton" },
                  1.83,
                  2.44,
                );
                return (
                  <li key={p.id} className="product-card">
                    <FabricSwatch productId={p.id} colour={p.colours[0]} size="100%" round={false} className="product-card__swatch" />
                    <div className="product-card__body">
                      <p className="eyebrow">{p.grade}</p>
                      <h3>{p.name}</h3>
                      <p>{p.blurb}</p>
                      <p className="product-card__meta">
                        {p.composition} · {p.weight}
                      </p>
                      <ul className="product-card__colours" aria-label={`${p.colours.length} colours`}>
                        {p.colours.map((col) => (
                          <li key={col.id} title={col.name} style={{ background: col.hex }}>
                            <span className="sr-only">{col.name}</span>
                          </li>
                        ))}
                      </ul>
                      <p className="product-card__price">
                        From <strong>{money(from)}</strong> <span className="muted">a 6 × 8 ft pair</span>
                      </p>
                      <button type="button" className="btn btn--block" onClick={() => setStudio(p.id)}>
                        Customise &amp; add to cart
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      <section id="pillows" className="coll coll--pillows" aria-labelledby="pillows-title">
        <header className="coll__head">
          <p className="coll__numeral serif">For the bedroom</p>
          <h2 id="pillows-title" className="h-sec">
            {PILLOW_COLLECTION.name}
          </h2>
          <p className="lead">{PILLOW_COLLECTION.description}</p>
          <Link className="link-arrow" href="/?room=suite">
            Dress a bed in the villa
          </Link>
        </header>
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
        <Link href="/custom-pillows/" className="print-promo">
          <span className="eyebrow">New · The print studio</span>
          <strong className="serif">Custom print pillows, in any shape</strong>
          <span className="muted">Hearts, stars, clouds, your initial… with your photos, words, our patterns or AI-painted designs.</span>
          <span className="link-arrow">Design yours</span>
        </Link>
      </section>

      {studio && <CurtainStudio productId={studio} onClose={() => setStudio(null)} />}
      <Toasts />
    </>
  );
}
