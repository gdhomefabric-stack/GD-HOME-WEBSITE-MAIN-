"use client";

import Link from "next/link";
import { COLLECTION_BY_ID, PRODUCT_BY_ID, type CollectionId } from "@/data/catalog";
import { BED_BY_ROOM, ROOMS, ROOM_BY_ID, windowsForRoom } from "@/data/villa";
import { ASSETS } from "@/lib/assets";
import { useVilla } from "@/store/villa";
import { BedPreview2D } from "./ui/BedPreview2D";
import { CurtainPreview2D } from "./ui/CurtainPreview2D";
import { Customizer } from "./ui/Customizer";
import { Chevron } from "./ui/Icons";
import { LightingToggle } from "./ui/Navigation";
import { CompareDialog, LiveRegion, Toasts } from "./ui/Overlays";
import { PillowStudio } from "./ui/PillowStudio";

/**
 * The villa without WebGL: rendered room photographs, the same customiser, and
 * a 2-D curtain study. Used on low-powered devices, with data-saver, or on request.
 */
export function StaticVilla({ canUse3D }: { canUse3D: boolean }) {
  const mode = useVilla((s) => s.mode);
  const roomId = useVilla((s) => s.roomId);
  const windowId = useVilla((s) => s.windowId);
  const lighting = useVilla((s) => s.lighting);
  const cfg = useVilla((s) => (s.windowId ? s.curtains[s.windowId] : null));
  const open = useVilla((s) => (s.windowId ? s.open[s.windowId] : 1));
  const pillows = useVilla((s) => (s.roomId ? s.pillows[s.roomId] : undefined));
  const fallbackReason = useVilla((s) => s.fallbackReason);
  const planOpen = useVilla((s) => s.planOpen);
  const s = useVilla.getState();
  // the gallery opens on the list of rooms (the "floor plan")
  const room = planOpen ? null : ROOM_BY_ID[roomId];

  return (
    <main id="villa-main" className="gallery page">
      <LiveRegion />
      {fallbackReason && (
        <div className="fallback-note" role="status">
          <p>
            <strong>The 3D villa couldn&apos;t start on this device</strong>, so you&apos;re seeing the room gallery —
            every room, fabric and pillow is still here.
          </p>
          <div className="fallback-note__actions">
            <a className="btn btn--sm btn--outline" href="/villa/?mode=lite">
              Try 3D again
            </a>
            <details>
              <summary>Technical detail</summary>
              <code>{fallbackReason}</code>
            </details>
          </div>
        </div>
      )}
      {!room ? (
        <>
          <section className="gallery__hero">
            <div className="gallery__hero-img" style={{ backgroundImage: `url(${ASSETS.render("hero")})` }} role="img" aria-label="The villa's living room in evening light, with velvet curtains drawn back" />
            <div className="gallery__hero-copy">
              <p className="eyebrow">GD Home Fabric presents</p>
              <h1 className="display">The Villa</h1>
              <p className="lead">
                Eight rooms in travertine and walnut, each dressed in the collection it suits best. Choose a room to see it, then dress its windows — or its bed.
              </p>
              <div className="gallery__hero-actions">
                {canUse3D && (
                  <Link className="btn" href="/villa/?mode=3d" onClick={() => s.setQuality("lite")}>
                    Explore in 3D instead
                  </Link>
                )}
                <Link className="btn btn--outline" href="/collections/">
                  Browse collections
                </Link>
              </div>
            </div>
          </section>
          <section className="wrap" aria-labelledby="rooms-title">
            <div className="divider" aria-hidden="true">
              <i />⚜<i />
            </div>
            <h2 id="rooms-title" className="h-sec gallery__title">
              Choose a room
            </h2>
            <ul className="gallery__grid">
              {ROOMS.map((r) => (
                <li key={r.id}>
                  <button type="button" className="gallery-card" onClick={() => s.enterRoom(r.id)}>
                    <span className="gallery-card__img" style={{ backgroundImage: `url(${ASSETS.render(r.id)})` }} aria-hidden="true" />
                    <span className="gallery-card__body">
                      <span className="eyebrow">Room {r.index}</span>
                      <span className="gallery-card__name">{r.name}</span>
                      <span className="gallery-card__tag">{r.tagline}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : (
        <section className="wrap gallery-room" aria-labelledby="gallery-room-title">
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => s.openPlan()}>
            <Chevron /> All rooms
          </button>
          <div className="gallery-room__layout">
            <div className="gallery-room__main">
              <p className="eyebrow">Room {room.index} of 8</p>
              <h1 id="gallery-room-title" className="h-sec">
                {room.name}
              </h1>
              <p className="lead">{room.description}</p>
              <ul className="room-panel__featured">
                {room.featured.map((f) => (
                  <li key={f} className="tag">
                    {f === "pillows" ? "Goose Feather Pillows" : `${COLLECTION_BY_ID[f as CollectionId].name} curtains`}
                  </li>
                ))}
              </ul>
              <div className="gallery-room__controls">
                <LightingToggle />
              </div>
              {mode === "bed" && pillows ? (
                <BedPreview2D pillows={pillows} />
              ) : windowId && cfg ? (
                <CurtainPreview2D cfg={cfg} open={open} lighting={lighting} sill={windowsForRoom(room.id).find((w) => w.id === windowId)?.sill} />
              ) : (
                <div className="gallery-room__img" style={{ backgroundImage: `url(${ASSETS.render(room.id)})` }} role="img" aria-label={`${room.name}, rendered view`} />
              )}
              <div className="room-panel__actions">
                {windowsForRoom(room.id).map((w, i) => (
                  <button
                    key={w.id}
                    type="button"
                    className={`btn btn--sm${w.id === windowId ? "" : " btn--outline"}`}
                    aria-pressed={w.id === windowId}
                    onClick={() => s.selectWindow(w.id)}
                  >
                    Window {i + 1} · {COLLECTION_BY_ID[PRODUCT_BY_ID[useVilla.getState().curtains[w.id].productId].collection].name}
                  </button>
                ))}
                {BED_BY_ROOM[room.id] && (
                  <button type="button" className={`btn btn--sm${mode === "bed" ? "" : " btn--outline"}`} onClick={() => s.dressBed()}>
                    Dress the bed
                  </button>
                )}
              </div>
            </div>
            <div className="gallery-room__side">
              {mode === "bed" ? (
                <PillowStudio />
              ) : windowId ? (
                <Customizer variant="2d" />
              ) : (
                <div className="panel gallery-room__prompt">
                  <p className="serif">Select a window to dress it{room.pillows ? ", or dress the bed" : ""}.</p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}
      <CompareDialog />
      <Toasts />
    </main>
  );
}
