"use client";

import { useEffect, useRef } from "react";
import {
  PILLOW_COLLECTION,
  PILLOW_COVERS,
  PILLOW_FILLS,
  PILLOW_FIRMNESS,
  PILLOW_SIZES,
  PILLOW_SIZE_BY_ID,
  describePillow,
  pillowPrice,
  type PillowFillId,
  type PillowFirmId,
  type PillowSizeId,
  type PlacedPillow,
} from "@/data/catalog";
import { ROOM_BY_ID } from "@/data/villa";
import { money } from "@/lib/pricing";
import { rowCapacity, useVilla } from "@/store/villa";
import { addBedToCart, addPillowToCart, saveCurrentLook, useToasts } from "../actions";
import { Chevron, CloseIcon, HeartIcon } from "./Icons";
import { OptionGroup } from "./OptionGroup";
import { PanelTabs } from "./PanelTabs";

const EMPTY: PlacedPillow[] = [];

export function PillowStudio() {
  const roomId = useVilla((s) => s.roomId);
  const draft = useVilla((s) => s.pillowDraft);
  const onBed = useVilla((s) => (s.roomId ? (s.pillows[s.roomId] ?? EMPTY) : EMPTY));
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus({ preventScroll: true }), []);
  if (!roomId) return null;
  const room = ROOM_BY_ID[roomId];
  const s = useVilla.getState();
  const row = PILLOW_SIZE_BY_ID[draft.size].row;
  const inRow = onBed.filter((p) => PILLOW_SIZE_BY_ID[p.size].row === row).length;
  const full = inRow >= rowCapacity(roomId, row);
  const bedTotal = onBed.reduce((n, p) => n + pillowPrice(p), 0);

  return (
    <aside className="panel customizer pillow-studio" aria-labelledby="pillow-title">
      <div className="panel__head">
        <button type="button" className="icon-btn" onClick={() => s.back()} aria-label={`Back to the ${room.name}`}>
          <Chevron />
        </button>
        <div className="panel__titles">
          <p className="eyebrow">{room.name} · The bed</p>
          <h2 id="pillow-title" ref={heading} tabIndex={-1}>
            {PILLOW_COLLECTION.name}
          </h2>
        </div>
        <button type="button" className="icon-btn" onClick={() => s.goOverview()} aria-label="Close and return to the villa overview">
          <CloseIcon />
        </button>
      </div>
      <PanelTabs active="pillows" />
      <div className="panel__body">
        <p className="panel__intro">{PILLOW_COLLECTION.description}</p>

        <OptionGroup<PillowSizeId, { id: PillowSizeId; label: string }>
          step={1}
          legend="Size"
          layout="cards"
          value={draft.size}
          options={PILLOW_SIZES.map((p) => ({ id: p.id, label: p.name }))}
          onChange={(v) => s.setPillowDraft({ size: v })}
          render={(o, selected) => {
            const size = PILLOW_SIZE_BY_ID[o.id];
            return (
              <>
                <span className="pillow-shape" style={{ aspectRatio: `${size.w} / ${size.d}` }} aria-hidden="true" />
                <span className="opt__text">
                  <span className="opt__label">{o.label}</span>
                  <span className="opt__note">
                    {size.dims} · from {money(size.price)}
                  </span>
                </span>
                {selected && <span className="opt__tick" aria-hidden="true">✓</span>}
              </>
            );
          }}
        />
        <OptionGroup<PillowFillId, { id: PillowFillId; label: string }>
          step={2}
          legend="Fill"
          layout="chips"
          value={draft.fill}
          options={PILLOW_FILLS.map((f) => ({ id: f.id, label: f.name }))}
          onChange={(v) => s.setPillowDraft({ fill: v })}
          hint={PILLOW_FILLS.find((f) => f.id === draft.fill)?.note}
        />
        <OptionGroup<PillowFirmId, { id: PillowFirmId; label: string }>
          step={3}
          legend="Support"
          layout="chips"
          value={draft.firmness}
          options={PILLOW_FIRMNESS.map((f) => ({ id: f.id, label: f.name }))}
          onChange={(v) => s.setPillowDraft({ firmness: v })}
        />
        <OptionGroup
          step={4}
          legend={`Sateen cover — ${PILLOW_COVERS.find((c) => c.id === draft.cover)?.name}`}
          layout="swatches"
          value={draft.cover}
          options={PILLOW_COVERS.map((c) => ({ id: c.id, label: c.name }))}
          onChange={(v) => s.setPillowDraft({ cover: v })}
          render={(o) => (
            <>
              <span className="swatch-dot" style={{ background: PILLOW_COVERS.find((c) => c.id === o.id)!.hex }} />
              <span className="sr-only">{o.label}</span>
            </>
          )}
        />

        <div className="pillow-add">
          <div>
            <strong className="serif">{describePillow(draft)}</strong>
            <span className="muted"> · {money(pillowPrice(draft))}</span>
          </div>
          <div className="pillow-add__actions">
            <button
              type="button"
              className="btn"
              onClick={() => s.addPillow(roomId)}
              disabled={full}
              aria-describedby={full ? "row-full" : undefined}
            >
              Add to the bed
            </button>
            <button
              type="button"
              className="btn btn--outline"
              onClick={() => {
                addPillowToCart(draft);
                useToasts.getState().push({ message: `${describePillow(draft)} added to your cart.`, href: "/cart/", linkLabel: "View cart" });
              }}
            >
              Add to cart
            </button>
          </div>
          {full && (
            <p id="row-full" className="opt-group__hint">
              That row of the bed is full — remove a pillow below to swap it.
            </p>
          )}
        </div>

        <section className="on-bed" aria-labelledby="on-bed-title">
          <div className="on-bed__head">
            <h3 id="on-bed-title">On the bed</h3>
            {onBed.length > 0 && (
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => s.clearPillows(roomId)}>
                Clear bed
              </button>
            )}
          </div>
          {onBed.length === 0 ? (
            <p className="muted">The bed is bare — add a Euro square, then sleeping pillows, then a boudoir cushion.</p>
          ) : (
            <ul className="on-bed__list">
              {onBed.map((p) => (
                <li key={p.uid}>
                  <span className="swatch-dot" style={{ background: PILLOW_COVERS.find((c) => c.id === p.cover)?.hex }} aria-hidden="true" />
                  <span>
                    {describePillow(p)}
                    <span className="muted"> · {PILLOW_COVERS.find((c) => c.id === p.cover)?.name}</span>
                  </span>
                  <span className="on-bed__price">{money(pillowPrice(p))}</span>
                  <button type="button" className="icon-btn icon-btn--sm" onClick={() => s.removePillow(roomId, p.uid)} aria-label={`Remove ${describePillow(p)}`}>
                    <CloseIcon />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {onBed.length > 0 && (
            <>
              <p className="summary__price">
                <span>The dressed bed</span>
                <strong>{money(bedTotal)}</strong>
              </p>
              <div className="summary__actions">
                <button type="button" className="btn btn--outline" onClick={saveCurrentLook}>
                  <HeartIcon /> Save look
                </button>
                <button type="button" className="btn" onClick={() => addBedToCart(roomId)}>
                  Add all to cart
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </aside>
  );
}
