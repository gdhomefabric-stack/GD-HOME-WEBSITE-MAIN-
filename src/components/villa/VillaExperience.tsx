"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ROOM_BY_ID, type RoomId } from "@/data/villa";
import { ASSETS } from "@/lib/assets";
import { detectQuality, readDevice } from "@/lib/device";
import { useVilla, type Lighting, type Quality } from "@/store/villa";
import { SiteHeader } from "../site/SiteHeader";
import { StaticVilla } from "./StaticVilla";
import { VillaBoundary } from "./VillaBoundary";
import { Customizer } from "./ui/Customizer";
import { Journey, LightingToggle, Minimap, RoomPanel } from "./ui/Navigation";
import { CompareDialog, HelpDialog, LiveRegion, LoadingScreen, LowFpsNotice, Toasts } from "./ui/Overlays";
import { PillowStudio } from "./ui/PillowStudio";
import { PlanOverlay, RoomVeil } from "./ui/Plan";
import { useVillaKeyboard } from "./useVillaKeyboard";

// The WebGL engine and villa are streamed in after the page shell has painted.
const VillaCanvas = dynamic(() => import("./VillaCanvas"), { ssr: false });

function useMediaQuery(q: string) {
  const [match, setMatch] = useState(false);
  useEffect(() => {
    const m = window.matchMedia(q);
    const on = () => setMatch(m.matches);
    on();
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, [q]);
  return match;
}

/** Reads ?mode=, ?room=, ?light= and picks the right experience for the device. */
function useResolveExperience() {
  const [canUse3D, setCanUse3D] = useState(true);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const d = readDevice();
    setCanUse3D(d.webgl2);
    let q: Quality = detectQuality(d);
    const m = params.get("mode");
    if (m === "gallery" || m === "static") q = "static";
    else if (d.webgl2 && (m === "3d" || m === "lite")) q = q === "high" && m === "3d" ? "high" : "lite";
    else if (d.webgl2 && m === "high") q = "high";
    const s = useVilla.getState();
    const light = params.get("light") as Lighting | null;
    if (light === "day" || light === "sunset" || light === "night") useVilla.setState({ lighting: light });
    s.setQuality(q);
    // development hook for automated checks
    if (process.env.NODE_ENV !== "production") (window as unknown as { __villa: typeof useVilla }).__villa = useVilla;
    const room = params.get("room") as RoomId | null;
    if (room && ROOM_BY_ID[room]) useVilla.setState({ mode: "room", roomId: room });
    // the gallery (no 3D) opens on the list of rooms
    else if (q === "static") useVilla.setState({ planOpen: true });
  }, []);
  return canUse3D;
}

function VillaUI() {
  const mode = useVilla((s) => s.mode);
  const planOpen = useVilla((s) => s.planOpen);
  const introDone = useVilla((s) => s.introDone);
  const [help, setHelp] = useState(false);
  const openHelp = useCallback(() => setHelp(true), []);
  const narrow = useMediaQuery("(max-width: 760px)");
  useVillaKeyboard(openHelp);
  const s = useVilla.getState();
  return (
    <div className={`vui${introDone ? " is-ready" : ""}`} data-mode={mode}>
      <div className="vui__top">
        <Journey />
        <LightingToggle />
      </div>

      {mode === "room" && !planOpen && <RoomPanel />}
      {(mode === "window" || mode === "closeup") && <Customizer />}
      {mode === "bed" && <PillowStudio />}

      {!narrow && !planOpen && <Minimap />}
      <PlanOverlay />

      <div className="vui__corner">
        <Link href="/collections/" className="btn btn--sm btn--outline vui__skip">
          Skip 3D · Browse collections
        </Link>
        <button type="button" className="btn btn--sm btn--ghost" onClick={openHelp} aria-haspopup="dialog">
          <span aria-hidden="true">?</span> <span className="vui__help-label">Controls</span>
        </button>
        <Link href="/villa/?mode=gallery" className="btn btn--sm btn--ghost vui__gallery" onClick={() => s.setQuality("static")}>
          Room gallery
        </Link>
      </div>

      <HelpDialog open={help} onClose={() => setHelp(false)} />
      <CompareDialog />
      <Toasts />
      <LowFpsNotice />
    </div>
  );
}

export function VillaExperience() {
  const quality = useVilla((s) => s.quality);
  const canUse3D = useResolveExperience();
  const mode = useVilla((s) => s.mode);
  const roomId = useVilla((s) => s.roomId);

  if (quality === "static") {
    return (
      <>
        <a className="skip-link" href="#villa-main">
          Skip to content
        </a>
        <SiteHeader />
        <StaticVilla canUse3D={canUse3D} />
      </>
    );
  }

  return (
    <div className="villa" data-mode={mode}>
      <a className="skip-link" href="/collections/">
        Skip 3D experience — browse collections
      </a>
      <SiteHeader overlay />
      <main id="villa-main" className="villa__stage">
        <h1 className="sr-only">GD Home Fabric — explore the villa in 3D</h1>
        <p className="sr-only">
          An interactive 3D villa with eight rooms. Every action is also available from the panels, the floor plan and
          the keyboard; press question mark for the controls.
        </p>
        <div className="villa__poster" style={{ backgroundImage: `url(${ASSETS.render(roomId)})` }} aria-hidden="true" />
        {quality && (
          <VillaBoundary onFail={(reason) => useVilla.getState().fallBack(reason)}>
            <VillaCanvas quality={quality} onLost={() => useVilla.getState().fallBack("The graphics context was lost")} />
          </VillaBoundary>
        )}
      </main>
      <LiveRegion />
      <RoomVeil />
      {quality && <VillaUI />}
      <LoadingScreen />
    </div>
  );
}
