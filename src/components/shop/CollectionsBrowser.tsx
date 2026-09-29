"use client";

import Link from "next/link";
import { useState } from "react";
import { COLLECTIONS, PILLOW_COLLECTION, productsInCollection } from "@/data/catalog";
import { ROOMS } from "@/data/villa";
import { money, priceForSize } from "@/lib/pricing";
import { FabricSwatch } from "@/components/villa/ui/FabricLoupe";
import { Toasts } from "@/components/villa/ui/Overlays";
import { CurtainStudio } from "./CurtainStudio";
import { PillowShop } from "./PillowShop";

/** Room in the villa that best shows a collection. */
const roomFor = (collection: string) => ROOMS.find((r) => r.featured.includes(collection)) ?? ROOMS[0];

export function CollectionsBrowser() {
  const [studio, setStudio] = useState<string | null>(null);

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
              <Link className="link-arrow" href={`/villa/?room=${room.id}`}>
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
          <Link className="link-arrow" href="/villa/?room=suite">
            Dress a bed in the villa
          </Link>
        </header>
        <PillowShop />
      </section>

      {studio && <CurtainStudio productId={studio} onClose={() => setStudio(null)} />}
      <Toasts />
    </>
  );
}
