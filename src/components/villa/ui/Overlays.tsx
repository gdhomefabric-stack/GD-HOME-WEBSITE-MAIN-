"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { COLLECTION_BY_ID, PRODUCT_BY_ID } from "@/data/catalog";
import { useVilla } from "@/store/villa";
import { applyCompareShot, useToasts } from "../actions";
import { CurtainPreview2D } from "./CurtainPreview2D";
import { CloseIcon } from "./Icons";

/* ---------------- loading screen: the curtains part when the villa is ready ---------------- */

const STAGES = ["Laying the travertine", "Oiling the walnut", "Pressing the linen", "Hanging the curtains", "Plumping the pillows"];

export function LoadingScreen() {
  const ready = useVilla((s) => s.sceneReady);
  const progress = useVilla((s) => s.loadProgress);
  const [gone, setGone] = useState(false);
  const [shown, setShown] = useState(0);
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 40000);
    return () => clearTimeout(t);
  }, []);
  // ease the counter so it never jumps backwards when new files join the queue
  useEffect(() => {
    // the 3D engine itself streams in first, so creep up while it arrives
    const target = ready ? 100 : Math.max(12, Math.min(96, 12 + progress * 0.84));
    const id = setInterval(() => setShown((v) => (v >= target ? v : Math.min(target, v + Math.max(0.6, (target - v) * 0.12)))), 40);
    return () => clearInterval(id);
  }, [progress, ready]);
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => setGone(true), 2600);
    return () => clearTimeout(t);
  }, [ready]);
  if (gone) return null;
  const pct = Math.round(shown);
  const stage = STAGES[Math.min(STAGES.length - 1, Math.floor((pct / 100) * STAGES.length))];
  return (
    <div className={`loader${ready ? " is-done" : ""}`} role="status" aria-live="polite" aria-busy={!ready}>
      <div className="loader__rod" aria-hidden="true" />
      <div className="loader__curtain loader__curtain--l" aria-hidden="true" />
      <div className="loader__curtain loader__curtain--r" aria-hidden="true" />
      <div className="loader__center">
        <span className="loader__crest" aria-hidden="true">
          ⚜
        </span>
        <p className="loader__brand">
          GD <b>Home Fabric</b>
        </p>
        <p className="eyebrow">The Villa</p>
        <div className="loader__meter" aria-hidden="true">
          <span style={{ width: `${pct}%` }} />
        </div>
        <p className="loader__stage">
          {ready ? "Welcome in" : `${stage}…`} <span className="loader__pct">{pct}%</span>
        </p>
        <span className="sr-only">{ready ? "The villa has loaded." : `Loading the 3D villa, ${pct} percent.`}</span>
        {slow && !ready && (
          <p className="loader__slow">
            This is taking longer than usual on this connection or device.{" "}
            <Link href="/villa/?mode=gallery" onClick={() => useVilla.getState().fallBack("Loading took longer than 40 seconds")}>
              Open the room gallery instead
            </Link>
          </p>
        )}
        <div className="loader__skip">
          <Link href="/collections/" className="link-arrow">
            Skip 3D — browse collections
          </Link>
          <Link href="/villa/?mode=gallery" className="loader__gallery">
            Room gallery (no 3D)
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ---------------- toasts & live region ---------------- */

export function Toasts() {
  const toasts = useToasts((s) => s.toasts);
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="toast">
          <span>{t.message}</span>
          {t.href && (
            <Link href={t.href} className="toast__link">
              {t.linkLabel}
            </Link>
          )}
          <button type="button" className="icon-btn icon-btn--sm" onClick={() => useToasts.getState().dismiss(t.id)} aria-label="Dismiss">
            <CloseIcon />
          </button>
        </div>
      ))}
    </div>
  );
}

export function LiveRegion() {
  const msg = useVilla((s) => s.announcement);
  return (
    <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
      {msg}
    </div>
  );
}

/* ---------------- native <dialog> wrapper (focus trap + Esc for free) ---------------- */

function Dialog({
  open,
  onClose,
  labelledBy,
  className = "",
  children,
}: {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className={`dialog ${className}`}
      aria-labelledby={labelledBy}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      {children}
    </dialog>
  );
}

export function CompareDialog() {
  const compare = useVilla((s) => s.compare);
  const windowId = useVilla((s) => s.windowId);
  const lighting = useVilla((s) => s.lighting);
  const base = useVilla((s) => (s.windowId ? s.curtains[s.windowId] : null));
  const open = compare.status === "done" && !!windowId;
  const close = () => useVilla.getState().setCompare({ status: "idle", shots: [] });
  return (
    <Dialog open={open} onClose={close} labelledBy="compare-title" className="dialog--wide">
      <div className="dialog__head">
        <div>
          <p className="eyebrow">Same room, same light</p>
          <h2 id="compare-title">Four fabrics, side by side</h2>
        </div>
        <button type="button" className="icon-btn" onClick={close} aria-label="Close comparison">
          <CloseIcon />
        </button>
      </div>
      <p className="dialog__intro">
        The curtains are drawn so you can see how each cloth handles the daylight. Choose one to carry on customising.
      </p>
      <div className="compare-grid">
        {compare.shots.map((shot) => {
          const p = PRODUCT_BY_ID[shot.productId];
          const colour = p.colours.find((c) => c.id === shot.colourId) ?? p.colours[0];
          return (
            <figure key={shot.productId} className="compare-card">
              {shot.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={shot.image} alt={`${p.name} in ${colour.name}, curtains drawn`} />
              ) : (
                base && (
                  <CurtainPreview2D
                    cfg={{ ...base, productId: shot.productId, colourId: shot.colourId }}
                    open={0.1}
                    lighting={lighting}
                    compact
                  />
                )
              )}
              <figcaption>
                <span className="eyebrow">{COLLECTION_BY_ID[p.collection].name}</span>
                <strong className="serif">
                  {p.name} · {colour.name}
                </strong>
                <button type="button" className="btn btn--sm" onClick={() => windowId && applyCompareShot(windowId, shot)}>
                  Choose {COLLECTION_BY_ID[p.collection].name.toLowerCase()}
                </button>
              </figcaption>
            </figure>
          );
        })}
      </div>
    </Dialog>
  );
}

export function HelpDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const rows: [string, string][] = [
    ["← / →", "Previous / next room"],
    ["1 – 8", "Jump to a room"],
    ["Esc", "Step back (close-up → window → room → floor plan)"],
    ["P", "Open or close the floor plan"],
    ["O", "Open or close the selected curtains"],
    ["C", "Fabric close-up"],
    ["L", "Cycle Day · Sunset · Night"],
    ["?", "Show this help"],
  ];
  return (
    <Dialog open={open} onClose={onClose} labelledBy="help-title">
      <div className="dialog__head">
        <div>
          <p className="eyebrow">Getting around</p>
          <h2 id="help-title">Keyboard &amp; controls</h2>
        </div>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close help">
          <CloseIcon />
        </button>
      </div>
      <dl className="keys">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt>
              <kbd>{k}</kbd>
            </dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <p className="dialog__intro">
        With a mouse: drag to look around the room, scroll to zoom gently, and click a window, the curtains or the bed.
        On touch screens: swipe to look around and pinch to zoom. Every step can also be reached with the panels and the
        floor plan.
      </p>
    </Dialog>
  );
}

export function LowFpsNotice() {
  const low = useVilla((s) => s.lowFps);
  const quality = useVilla((s) => s.quality);
  const [dismissed, setDismissed] = useState(false);
  if (!low || dismissed) return null;
  return (
    <div className="notice" role="alert">
      <p>This device is finding the 3D villa heavy going.</p>
      <div className="notice__actions">
        {quality === "high" && (
          <button type="button" className="btn btn--sm" onClick={() => useVilla.setState({ quality: "lite", lowFps: false })}>
            Use lighter 3D
          </button>
        )}
        <Link href="/villa/?mode=gallery" className="btn btn--sm btn--outline" onClick={() => useVilla.getState().setQuality("static")}>
          Room gallery
        </Link>
        <button type="button" className="btn btn--sm btn--ghost" onClick={() => setDismissed(true)}>
          Keep going
        </button>
      </div>
    </div>
  );
}
