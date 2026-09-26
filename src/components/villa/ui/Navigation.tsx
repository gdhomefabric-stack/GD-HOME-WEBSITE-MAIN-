"use client";

import { COLLECTION_BY_ID, PRODUCT_BY_ID, type CollectionId } from "@/data/catalog";
import { LIGHTING, LIGHTING_ORDER } from "@/data/lighting";
import { GALLERY, ROOMS, ROOM_BY_ID, VILLA_BOUNDS, WINDOW_BY_ID, windowsForRoom } from "@/data/villa";
import { ASSETS } from "@/lib/assets";
import { useVilla, type Lighting } from "@/store/villa";
import { Chevron, LightingIcon } from "./Icons";

/* ---------------- lighting ---------------- */

export function LightingToggle() {
  const lighting = useVilla((s) => s.lighting);
  const set = useVilla((s) => s.setLighting);
  return (
    <div className="lighting" role="radiogroup" aria-label="Lighting">
      {LIGHTING_ORDER.map((l: Lighting) => (
        <label key={l} className={`lighting__opt${lighting === l ? " is-on" : ""}`}>
          <input type="radio" className="sr-only" name="lighting" checked={lighting === l} onChange={() => set(l)} />
          <LightingIcon id={l} />
          <span>{LIGHTING[l].label}</span>
        </label>
      ))}
    </div>
  );
}

/* ---------------- journey / breadcrumbs ---------------- */

const STEPS = ["Villa", "Room", "Window", "Collection", "Customise", "Cart"];

export function Journey() {
  const mode = useVilla((s) => s.mode);
  const roomId = useVilla((s) => s.roomId);
  const windowId = useVilla((s) => s.windowId);
  const productId = useVilla((s) => (s.windowId ? s.curtains[s.windowId].productId : null));
  const s = useVilla.getState();
  const current = mode === "overview" ? 0 : mode === "room" ? 1 : mode === "bed" ? 3 : 3;
  const crumbs: { label: string; onClick?: () => void }[] = [{ label: "The Villa", onClick: mode !== "overview" ? () => s.goOverview() : undefined }];
  if (roomId) crumbs.push({ label: ROOM_BY_ID[roomId].name, onClick: mode !== "room" ? () => s.enterRoom(roomId) : undefined });
  if (windowId && (mode === "window" || mode === "closeup")) {
    const w = WINDOW_BY_ID[windowId];
    const idx = windowsForRoom(w.roomId).findIndex((x) => x.id === windowId);
    crumbs.push({ label: `Window ${idx + 1}`, onClick: mode === "closeup" ? () => s.back() : undefined });
    if (productId) crumbs.push({ label: COLLECTION_BY_ID[PRODUCT_BY_ID[productId].collection].name });
  }
  if (mode === "bed") crumbs.push({ label: "Goose feather pillows" });
  return (
    <div className="journey">
      <nav aria-label="Breadcrumb">
        <ol className="crumbs">
          {crumbs.map((c, i) => (
            <li key={i}>
              {c.onClick ? (
                <button type="button" onClick={c.onClick}>
                  {c.label}
                </button>
              ) : (
                <span aria-current={i === crumbs.length - 1 ? "location" : undefined}>{c.label}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <ol className="steps" aria-label="Your journey">
        {STEPS.map((label, i) => {
          const state = i < current ? "done" : i === current || (current === 3 && i === 4) ? "current" : "todo";
          return (
            <li key={label} className={`steps__item steps__item--${state}`} aria-current={state === "current" ? "step" : undefined}>
              <span className="steps__dot" aria-hidden="true" />
              <span className="steps__label">{mode === "bed" && i >= 2 && i <= 4 ? ["Bed", "Pillows", "Arrange"][i - 2] : label}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ---------------- minimap ---------------- */

const W = VILLA_BOUNDS.x1 - VILLA_BOUNDS.x0;
const D = VILLA_BOUNDS.z1 - VILLA_BOUNDS.z0;
const pctX = (x: number) => ((x - VILLA_BOUNDS.x0) / W) * 100;
const pctZ = (z: number) => ((z - VILLA_BOUNDS.z0) / D) * 100;

export function Minimap() {
  const roomId = useVilla((s) => s.roomId);
  const hover = useVilla((s) => s.hoverRoom);
  const s = useVilla.getState();
  return (
    <nav className="minimap" aria-label="Floor plan — jump to a room">
      <div className="minimap__head">
        <span className="eyebrow">Floor plan</span>
        <span className="minimap__north" aria-hidden="true">
          N ↑
        </span>
      </div>
      <div className="minimap__plan">
        <span
          className="minimap__gallery"
          style={{ left: 0, right: 0, top: `${pctZ(GALLERY.z0)}%`, height: `${pctZ(GALLERY.z1) - pctZ(GALLERY.z0)}%` }}
          aria-hidden="true"
        >
          Gallery
        </span>
        {ROOMS.map((r) => {
          const [x0, z0, x1, z1] = r.bounds;
          return (
            <button
              key={r.id}
              type="button"
              className={`minimap__room${roomId === r.id ? " is-current" : ""}${hover === r.id ? " is-hover" : ""}`}
              style={{ left: `${pctX(x0)}%`, width: `${pctX(x1) - pctX(x0)}%`, top: `${pctZ(z0)}%`, height: `${pctZ(z1) - pctZ(z0)}%` }}
              onClick={() => s.enterRoom(r.id)}
              onMouseEnter={() => s.setHoverRoom(r.id)}
              onMouseLeave={() => s.setHoverRoom(null)}
              onFocus={() => s.setHoverRoom(r.id)}
              onBlur={() => s.setHoverRoom(null)}
              aria-current={roomId === r.id ? "location" : undefined}
              aria-label={`${r.index}. ${r.name} — ${r.tagline}`}
            >
              <span aria-hidden="true">{r.short}</span>
            </button>
          );
        })}
      </div>
      <p className="minimap__foot" aria-hidden="true">
        Garden &amp; pool · south
      </p>
    </nav>
  );
}

/* ---------------- room cards (mobile + gallery) ---------------- */

export function RoomCards({ variant = "strip" }: { variant?: "strip" | "grid" }) {
  const roomId = useVilla((s) => s.roomId);
  const s = useVilla.getState();
  return (
    <nav className={`room-cards room-cards--${variant}`} aria-label="Rooms">
      <ul>
        {ROOMS.map((r) => (
          <li key={r.id}>
            <button type="button" className={`room-card${roomId === r.id ? " is-current" : ""}`} onClick={() => s.enterRoom(r.id)}>
              <span className="room-card__img" style={{ backgroundImage: `url(${ASSETS.render(r.id)})` }} aria-hidden="true" />
              <span className="room-card__body">
                <span className="room-card__index">{String(r.index).padStart(2, "0")}</span>
                <span className="room-card__name">{r.name}</span>
                <span className="room-card__tag">{r.tagline}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/* ---------------- room panel ---------------- */

export function RoomPanel() {
  const roomId = useVilla((s) => s.roomId);
  const curtains = useVilla((s) => s.curtains);
  if (!roomId) return null;
  const room = ROOM_BY_ID[roomId];
  const wins = windowsForRoom(roomId);
  const s = useVilla.getState();
  return (
    <section className="panel room-panel" aria-labelledby="room-title">
      <div className="room-panel__nav">
        <button type="button" className="icon-btn" onClick={() => s.cycleRoom(-1)} aria-label="Previous room">
          <Chevron />
        </button>
        <p className="eyebrow">
          Room {room.index} of {ROOMS.length}
        </p>
        <button type="button" className="icon-btn" onClick={() => s.cycleRoom(1)} aria-label="Next room">
          <Chevron dir="right" />
        </button>
      </div>
      <h2 id="room-title">{room.name}</h2>
      <p className="room-panel__tagline serif">{room.tagline}</p>
      <p className="room-panel__desc">{room.description}</p>
      <ul className="room-panel__featured" aria-label="Featured in this room">
        {room.featured.map((f) => (
          <li key={f} className="tag">
            {f === "pillows" ? "Goose Feather Pillows" : `${COLLECTION_BY_ID[f as CollectionId].name} curtains`}
          </li>
        ))}
      </ul>
      <p className="room-panel__prompt">Select a window to dress{room.pillows ? ", or the bed" : ""}:</p>
      <div className="room-panel__actions">
        {wins.map((w, i) => {
          const p = PRODUCT_BY_ID[curtains[w.id].productId];
          return (
            <button key={w.id} type="button" className="btn btn--sm" onClick={() => s.selectWindow(w.id)}>
              Window {i + 1}
              <span className="btn__meta">{COLLECTION_BY_ID[p.collection].name}</span>
            </button>
          );
        })}
        {room.pillows && (
          <button type="button" className="btn btn--sm btn--outline" onClick={() => s.dressBed()}>
            Dress the bed
          </button>
        )}
      </div>
      <button type="button" className="btn btn--ghost btn--sm room-panel__back" onClick={() => s.goOverview()}>
        <Chevron /> Back to the villa
      </button>
    </section>
  );
}

export function OverviewIntro() {
  return (
    <section className="panel overview-intro" aria-labelledby="overview-title">
      <p className="eyebrow">GD Home Fabric presents</p>
      <h2 id="overview-title">The Villa</h2>
      <p>
        Eight rooms in travertine and walnut, each dressed in the collection it suits best. Choose a room — then a window,
        a fabric, and make it your own.
      </p>
      <p className="overview-intro__hint">Drag to turn the villa · scroll or pinch to zoom · or use the floor plan.</p>
    </section>
  );
}
