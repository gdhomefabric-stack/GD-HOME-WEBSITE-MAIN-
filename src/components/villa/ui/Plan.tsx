"use client";

import { useEffect, useRef } from "react";
import { COLLECTION_BY_ID, type CollectionId } from "@/data/catalog";
import { DOORS, GALLERY, ROOMS, ROOM_BY_ID, VILLA_BOUNDS, WINDOWS } from "@/data/villa";
import { ASSETS } from "@/lib/assets";
import { useVilla } from "@/store/villa";
import { CloseIcon } from "./Icons";

const W = VILLA_BOUNDS.x1 - VILLA_BOUNDS.x0;
const D = VILLA_BOUNDS.z1 - VILLA_BOUNDS.z0;
const px = (x: number) => ((x - VILLA_BOUNDS.x0) / W) * 1000;
const pz = (z: number) => ((z - VILLA_BOUNDS.z0) / D) * (1000 * (D / W));
const H = 1000 * (D / W);

/** An architect's plan of the villa: walls, windows, doors; rooms are the buttons. */
export function PlanDrawing({ compact = false }: { compact?: boolean }) {
  const roomId = useVilla((s) => s.roomId);
  const hover = useVilla((s) => s.hoverRoom);
  const s = useVilla.getState();
  return (
    <svg className={`plan${compact ? " plan--compact" : ""}`} viewBox={`-20 -30 1040 ${H + 70}`} role="group" aria-label="Floor plan of the villa">
      <rect x={0} y={0} width={1000} height={H} className="plan__outline" />
      <rect x={0} y={pz(GALLERY.z0)} width={1000} height={pz(GALLERY.z1) - pz(GALLERY.z0)} className="plan__gallery" />
      <text x={500} y={(pz(GALLERY.z0) + pz(GALLERY.z1)) / 2 + 5} className="plan__gallery-label" textAnchor="middle">
        Gallery
      </text>
      {ROOMS.map((r) => {
        const [x0, z0, x1, z1] = r.bounds;
        const current = r.id === roomId;
        return (
          <a
            key={r.id}
            href={`#${r.id}`}
            role="button"
            className={`plan__room${current ? " is-current" : ""}${hover === r.id ? " is-hover" : ""}`}
            aria-current={current ? "location" : undefined}
            aria-label={`${r.index}. ${r.name} — ${r.tagline}`}
            onClick={(e) => {
              e.preventDefault();
              s.enterRoom(r.id);
            }}
            onMouseEnter={() => s.setHoverRoom(r.id)}
            onMouseLeave={() => s.setHoverRoom(null)}
            onFocus={() => s.setHoverRoom(r.id)}
            onBlur={() => s.setHoverRoom(null)}
          >
            <rect x={px(x0)} y={pz(z0)} width={px(x1) - px(x0)} height={pz(z1) - pz(z0)} />
            <text x={(px(x0) + px(x1)) / 2} y={(pz(z0) + pz(z1)) / 2 - (compact ? 0 : 6)} textAnchor="middle" className="plan__name">
              {compact ? r.short : r.name}
            </text>
            {!compact && (
              <text x={(px(x0) + px(x1)) / 2} y={(pz(z0) + pz(z1)) / 2 + 18} textAnchor="middle" className="plan__index">
                {String(r.index).padStart(2, "0")}
              </text>
            )}
            {current && <circle cx={(px(x0) + px(x1)) / 2} cy={(pz(z0) + pz(z1)) / 2 + (compact ? 22 : 40)} r={7} className="plan__here" />}
          </a>
        );
      })}
      {WINDOWS.map((w) => {
        const z = w.facade === "N" ? 0 : H;
        return <line key={w.id} x1={px(w.x - w.width / 2)} x2={px(w.x + w.width / 2)} y1={z} y2={z} className="plan__window" />;
      })}
      {DOORS.filter((d) => d.wall.startsWith("gallery")).map((d, i) => {
        const z = pz(d.wall === "gallery-N" ? GALLERY.z0 : GALLERY.z1);
        return <line key={i} x1={px(d.centre - d.width / 2)} x2={px(d.centre + d.width / 2)} y1={z} y2={z} className="plan__door" />;
      })}
      <text x={1000} y={-10} textAnchor="end" className="plan__north">
        N ↑
      </text>
      {!compact && (
        <text x={500} y={H + 30} textAnchor="middle" className="plan__garden">
          Terrace, pool &amp; garden · south
        </text>
      )}
    </svg>
  );
}

/** Full floor plan with a card for every room. */
export function PlanOverlay() {
  const open = useVilla((s) => s.planOpen);
  const roomId = useVilla((s) => s.roomId);
  const ref = useRef<HTMLDivElement>(null);
  const s = useVilla.getState();
  useEffect(() => {
    if (open) ref.current?.querySelector<HTMLElement>(".plan-overlay__close")?.focus();
  }, [open]);
  if (!open) return null;
  return (
    <div className="plan-overlay" role="dialog" aria-modal="true" aria-labelledby="plan-title" ref={ref}>
      <div className="plan-overlay__inner">
        <header className="plan-overlay__head">
          <div>
            <p className="eyebrow">The Villa · eight rooms</p>
            <h2 id="plan-title">Where would you like to go?</h2>
          </div>
          <button type="button" className="icon-btn plan-overlay__close" onClick={() => s.closePlan()} aria-label="Close the floor plan">
            <CloseIcon />
          </button>
        </header>
        <PlanDrawing />
        <ul className="plan-overlay__rooms">
          {ROOMS.map((r) => (
            <li key={r.id}>
              <button type="button" className={`plan-card${r.id === roomId ? " is-current" : ""}`} onClick={() => s.enterRoom(r.id)}>
                <span className="plan-card__img" style={{ backgroundImage: `url(${ASSETS.render(r.id)})` }} aria-hidden="true" />
                <span className="plan-card__body">
                  <span className="plan-card__index">{String(r.index).padStart(2, "0")}</span>
                  <span className="plan-card__name">{r.name}</span>
                  <span className="plan-card__tag">
                    {r.featured.map((f) => (f === "pillows" ? "Goose feather pillows" : COLLECTION_BY_ID[f as CollectionId].name)).join(" · ")}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Title card that veils the swap between rooms. */
export function RoomVeil() {
  const roomId = useVilla((s) => s.roomId);
  const shown = useVilla((s) => s.roomShown);
  const ready = useVilla((s) => s.sceneReady);
  const on = ready && roomId !== shown;
  const room = ROOM_BY_ID[roomId];
  return (
    <div className={`room-veil${on ? " is-on" : ""}`} aria-hidden="true">
      <p className="room-veil__index">{String(room.index).padStart(2, "0")}</p>
      <p className="room-veil__name">{room.name}</p>
      <p className="room-veil__tag">{room.tagline}</p>
    </div>
  );
}
