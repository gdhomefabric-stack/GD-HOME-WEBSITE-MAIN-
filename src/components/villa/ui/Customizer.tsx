"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  COLLECTIONS,
  COLLECTION_BY_ID,
  LENGTHS,
  LININGS,
  PLEATS,
  PRODUCT_BY_ID,
  colourOf,
  curtainTransmission,
  productsInCollection,
  type CollectionId,
  type LengthId,
  type LiningId,
  type PleatId,
} from "@/data/catalog";
import { ROOM_BY_ID, WINDOW_BY_ID, windowsForRoom } from "@/data/villa";
import { curtainPrice, curtainSize, feet, metres, money } from "@/lib/pricing";
import { useVilla } from "@/store/villa";
import { addWindowToCart, runCompare, saveCurrentLook } from "../actions";
import { FabricLoupe, FabricSwatch, lightLabel } from "./FabricLoupe";
import { Chevron, CloseIcon, HeartIcon, LengthIcon, PleatIcon } from "./Icons";
import { OptionGroup } from "./OptionGroup";
import { PanelTabs } from "./PanelTabs";

export function Customizer({ variant = "3d" }: { variant?: "3d" | "2d" }) {
  const windowId = useVilla((s) => s.windowId);
  const cfg = useVilla((s) => (s.windowId ? s.curtains[s.windowId] : null));
  const open = useVilla((s) => (s.windowId ? s.open[s.windowId] : 1));
  const mode = useVilla((s) => s.mode);
  const lighting = useVilla((s) => s.lighting);
  const comparing = useVilla((s) => s.compare.status === "running");
  const [preview, setPreview] = useState<{ productId: string; colourId: string } | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [windowId]);

  if (!windowId || !cfg) return null;
  const w = WINDOW_BY_ID[windowId];
  const room = ROOM_BY_ID[w.roomId];
  const wins = windowsForRoom(room.id);
  const product = PRODUCT_BY_ID[cfg.productId];
  const collection = product.collection;
  const colour = colourOf(cfg);
  const shownProduct = preview ? PRODUCT_BY_ID[preview.productId] : product;
  const shownColour = preview ? (shownProduct.colours.find((c) => c.id === preview.colourId) ?? colour) : colour;
  const transmission = curtainTransmission(cfg);
  const size = curtainSize(w, cfg.length);
  const price = curtainPrice(cfg, w);
  const s = useVilla.getState();
  const grades = productsInCollection(collection);
  const through = open + (1 - open) * transmission;

  return (
    <aside className="panel customizer" aria-labelledby="customizer-title">
      <div className="panel__head">
        <button type="button" className="icon-btn" onClick={() => s.back()} aria-label={`Back to the ${room.name}`}>
          <Chevron />
        </button>
        <div className="panel__titles">
          <p className="eyebrow">
            {room.name} · {w.label}
          </p>
          <h2 id="customizer-title" ref={heading} tabIndex={-1}>
            Dress this window
          </h2>
        </div>
        <button type="button" className="icon-btn" onClick={() => s.enterRoom(s.roomId)} aria-label="Close and step back into the room">
          <CloseIcon />
        </button>
      </div>

      {room.pillows && <PanelTabs active="curtains" />}

      <div className="panel__body">
        {wins.length > 1 && (
          <div className="window-switch" role="group" aria-label="Choose window">
            {wins.map((x, i) => (
              <button
                key={x.id}
                type="button"
                className={`chip${x.id === windowId ? " is-on" : ""}`}
                aria-pressed={x.id === windowId}
                onClick={() => s.selectWindow(x.id)}
              >
                Window {i + 1}
              </button>
            ))}
          </div>
        )}

        <section className="curtain-control" aria-label="Open and close the curtains">
          <div className="curtain-control__row">
            <button
              type="button"
              className="btn btn--sm"
              onClick={() => s.toggleOpen(windowId)}
              aria-pressed={open < 0.5}
            >
              {open > 0.5 ? "Draw curtains closed" : "Open curtains"}
            </button>
            <span className="curtain-control__light" aria-live="polite">
              {lighting === "night" ? "Night — lamps lit" : `Daylight: ${lightLabel(through).toLowerCase()}`}
            </span>
          </div>
          <label className="range">
            <span className="range__label">
              Opening <b>{Math.round(open * 100)}%</b>
            </span>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={Math.round(open * 100)}
              onChange={(e) => s.setOpen(windowId, Number(e.target.value) / 100)}
              aria-valuetext={`${Math.round(open * 100)} percent open`}
            />
          </label>
        </section>

        <OptionGroup<CollectionId, { id: CollectionId; label: string }>
          step={1}
          legend="Curtain collection"
          layout="cards"
          value={collection}
          options={COLLECTIONS.map((c) => ({ id: c.id, label: c.name }))}
          onChange={(c) => s.setCollection(windowId, c)}
          render={(o, selected) => {
            const p = productsInCollection(o.id)[0];
            const pick = o.id === collection ? product : p;
            const col = o.id === collection ? colour : pick.colours[0];
            return (
              <>
                <FabricSwatch productId={pick.id} colour={col} size={44} />
                <span className="opt__text">
                  <span className="opt__label">{o.label}</span>
                  {room.featured.includes(o.id) ? (
                    <span className="tag">Signature for this room</span>
                  ) : (
                    <span className="opt__note">{COLLECTION_BY_ID[o.id].tagline}</span>
                  )}
                </span>
                {selected && <span className="opt__tick" aria-hidden="true">✓</span>}
              </>
            );
          }}
        />

        {grades.length > 1 && (
          <OptionGroup
            legend="Grade"
            layout="chips"
            value={product.id}
            options={grades.map((g) => ({ id: g.id, label: g.grade }))}
            onChange={(id) => {
              const np = PRODUCT_BY_ID[id];
              const keep = np.colours.find((c) => c.id === cfg.colourId);
              s.setCurtain(windowId, { productId: id, colourId: keep ? keep.id : np.colours[0].id });
            }}
            render={(o) => (
              <span className="opt__label">
                {PRODUCT_BY_ID[o.id].name} <em>· {o.label}</em>
              </span>
            )}
          />
        )}

        <OptionGroup
          step={2}
          legend={`Colour — ${shownColour.name}`}
          layout="swatches"
          value={cfg.colourId}
          options={product.colours.map((c) => ({ id: c.id, label: c.name }))}
          onChange={(id) => s.setCurtain(windowId, { colourId: id })}
          onPreview={(id) => setPreview(id ? { productId: product.id, colourId: id } : null)}
          render={(o) => (
            <>
              <span className="swatch-dot" style={{ background: product.colours.find((c) => c.id === o.id)!.hex }} />
              <span className="sr-only">{o.label}</span>
            </>
          )}
        />

        <div className="loupe-row">
          <FabricLoupe productId={shownProduct.id} colour={shownColour} transmission={transmission} />
          {variant === "3d" && (
            <button
              type="button"
              className="btn btn--outline btn--sm"
              onClick={() => (mode === "closeup" ? s.back() : s.closeup())}
              aria-pressed={mode === "closeup"}
            >
              {mode === "closeup" ? "Step back" : "View close-up in 3D"}
            </button>
          )}
        </div>

        <OptionGroup<PleatId, { id: PleatId; label: string }>
          step={3}
          legend="Pleat & heading"
          layout="icons"
          value={cfg.pleat}
          options={PLEATS.map((p) => ({ id: p.id, label: p.name }))}
          onChange={(v) => s.setCurtain(windowId, { pleat: v })}
          render={(o) => (
            <>
              <PleatIcon id={o.id} />
              <span className="opt__label">{o.label}</span>
            </>
          )}
          hint={PLEATS.find((p) => p.id === cfg.pleat)?.note}
        />

        <OptionGroup<LengthId, { id: LengthId; label: string }>
          step={4}
          legend="Length"
          layout="icons"
          value={cfg.length}
          options={LENGTHS.map((l) => ({ id: l.id, label: l.name }))}
          onChange={(v) => s.setCurtain(windowId, { length: v })}
          render={(o) => (
            <>
              <LengthIcon id={o.id} />
              <span className="opt__label">{o.label}</span>
            </>
          )}
          hint={LENGTHS.find((l) => l.id === cfg.length)?.note}
        />

        <OptionGroup<LiningId, { id: LiningId; label: string }>
          step={5}
          legend="Lining"
          layout="chips"
          value={cfg.lining}
          options={LININGS.map((l) => ({ id: l.id, label: l.name }))}
          onChange={(v) => s.setCurtain(windowId, { lining: v })}
          hint={
            <>
              {LININGS.find((l) => l.id === cfg.lining)?.note}. Drawn, this curtain lets through about{" "}
              <b>{Math.round(transmission * 100)}%</b> of daylight.
            </>
          }
        />

        <button
          type="button"
          className="btn btn--outline btn--block compare-btn"
          onClick={() => runCompare(windowId)}
          disabled={comparing}
        >
          {comparing ? "Preparing comparison…" : "Compare velvet, blackout, linen & embroidered here"}
        </button>

        <section className="summary" aria-label="Your selection">
          <p className="eyebrow">Your look</p>
          <h3>
            {product.name} <span className="muted">in {colour.name}</span>
          </h3>
          <dl className="summary__list">
            <div>
              <dt>Heading</dt>
              <dd>{PLEATS.find((p) => p.id === cfg.pleat)?.name}</dd>
            </div>
            <div>
              <dt>Length</dt>
              <dd>{LENGTHS.find((l) => l.id === cfg.length)?.name}</dd>
            </div>
            <div>
              <dt>Lining</dt>
              <dd>{LININGS.find((l) => l.id === cfg.lining)?.name}</dd>
            </div>
            <div>
              <dt>Made to</dt>
              <dd>
                {metres(size.trackWidth)} × {metres(size.drop)} <span className="muted">({feet(size.trackWidth)} × {feet(size.drop)})</span>
              </dd>
            </div>
          </dl>
          <p className="summary__price">
            <span>Estimate for this window, a pair</span>
            <strong>{money(price)}</strong>
          </p>
          <div className="summary__actions">
            <button type="button" className="btn btn--outline" onClick={saveCurrentLook}>
              <HeartIcon /> Save look
            </button>
            <button type="button" className="btn" onClick={() => addWindowToCart(windowId)}>
              Add to cart
            </button>
          </div>
          <div className="summary__links">
            <Link className="link-arrow" href="/cart/#quote" onClick={() => addWindowToCart(windowId)}>
              Request a quote
            </Link>
            <Link className="link-arrow" href={`/consultation/?room=${room.id}&look=${encodeURIComponent(`${product.name} in ${colour.name}`)}`}>
              Book a consultation
            </Link>
          </div>
        </section>
      </div>
    </aside>
  );
}
