"use client";

import { Suspense, useEffect, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ROOMS, windowsForRoom, type RoomId } from "@/data/villa";
import { grabCanvas, registerCapture } from "@/lib/capture";
import { useVilla, type Quality } from "@/store/villa";
import { WindowDressing } from "./scene/Curtain";
import { useFabricTextures } from "./scene/fabrics";
import { Interaction } from "./scene/Interaction";
import { BedPillows } from "./scene/Pillows";
import { PostFX } from "./scene/PostFX";
import { RoomScene, prefetchRoom, useRoomAssets } from "./scene/RoomScene";
import { TourCamera } from "./scene/TourCamera";

/** Exposure matching the Blender renders (+2 stops). */
export const EXPOSURE = 4;
/** How long the veil takes to close before a room swap (keep in sync with villa.css). */
const VEIL_MS = 380;

function Dressings({ roomId }: { roomId: RoomId }) {
  const tex = useFabricTextures();
  const { env } = useRoomAssets(roomId);
  return (
    <>
      {windowsForRoom(roomId).map((w) => (
        <WindowDressing key={w.id} win={w} tex={tex} env={env} />
      ))}
      <BedPillows tex={tex} roomId={roomId} env={env} />
    </>
  );
}

/** The room on screen. */
function RoomStage({ id }: { id: RoomId }) {
  useEffect(() => {
    const s = useVilla.getState();
    if (!s.sceneReady) requestAnimationFrame(() => requestAnimationFrame(() => useVilla.getState().setSceneReady()));
    // warm the neighbours so walking on feels instant
    const i = ROOMS.findIndex((r) => r.id === id);
    prefetchRoom(ROOMS[(i + 1) % ROOMS.length].id);
    prefetchRoom(ROOMS[(i + ROOMS.length - 1) % ROOMS.length].id);
  }, [id]);
  return (
    <>
      <RoomScene id={id} />
      <Dressings roomId={id} />
      <Interaction roomId={id} />
    </>
  );
}

/** Loads the next room off-screen, then swaps it in once the veil has closed. */
function NextRoom({ id }: { id: RoomId }) {
  useRoomAssets(id);
  useEffect(() => {
    const t = setTimeout(() => useVilla.getState().setRoomShown(id), useVilla.getState().roomShown ? VEIL_MS : 0);
    return () => clearTimeout(t);
  }, [id]);
  return null;
}

function Stage() {
  const roomId = useVilla((s) => s.roomId);
  const shown = useVilla((s) => s.roomShown);
  return (
    <>
      {shown && (
        <Suspense fallback={null}>
          <RoomStage id={shown} />
        </Suspense>
      )}
      {roomId !== shown && (
        <Suspense fallback={null}>
          <NextRoom id={roomId} />
        </Suspense>
      )}
    </>
  );
}

/**
 * The canvas renders on demand. Any change to the experience state (curtain
 * opened, lighting switched, fabric changed…) requests a frame; components then
 * keep requesting frames while their animations settle.
 */
function InvalidateOnChange() {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => useVilla.subscribe(() => invalidate()), [invalidate]);
  return null;
}

/** Reports asset streaming progress to the (DOM) loading screen. */
function ProgressReporter() {
  useEffect(() => {
    const m = THREE.DefaultLoadingManager;
    let raf = 0;
    // loaders start inside React's render (useLoader), so report on the next frame, never mid-render
    const report = (loaded: number, total: number) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => useVilla.getState().setLoadProgress(total ? (loaded / total) * 100 : 100));
    };
    m.onProgress = (_url, loaded, total) => report(loaded, total);
    m.onLoad = () => report(1, 1);
    return () => {
      cancelAnimationFrame(raf);
      m.onProgress = () => {};
      m.onLoad = () => {};
    };
  }, []);
  return null;
}

type Pending = { width: number; crop: number; resolve: (v: string | null) => void } | null;
const pendingCapture: { current: Pending } = { current: null };

/** Snapshots for saved looks and comparisons. */
function CaptureBridge({ post }: { post: boolean }) {
  const { gl, scene, camera, invalidate } = useThree();
  useEffect(() => {
    registerCapture(
      (width, crop) =>
        new Promise((resolve) => {
          if (!post) {
            gl.render(scene, camera);
            resolve(grabCanvas(gl.domElement, width, crop));
            return;
          }
          // with post-processing, read the canvas right after the composer has drawn
          pendingCapture.current = { width, crop, resolve };
          invalidate();
        }),
    );
    return () => registerCapture(null);
  }, [gl, scene, camera, invalidate, post]);
  return null;
}

function CaptureAfterComposer() {
  const gl = useThree((s) => s.gl);
  useFrame(() => {
    const p = pendingCapture.current;
    if (!p) return;
    pendingCapture.current = null;
    p.resolve(grabCanvas(gl.domElement, p.width, p.crop));
  }, 2);
  return null;
}

/**
 * Watches frame times while the scene is animating (idle frames are skipped by the
 * on-demand loop) and steps resolution down, then offers the lighter experience.
 */
function FrameBudget({ quality }: { quality: Quality }) {
  const setDpr = useThree((s) => s.setDpr);
  const stats = useRef({ n: 0, sum: 0, step: 0 });
  // automated browsers (render capture, tests) run on software GL: never degrade them
  const automated = typeof navigator !== "undefined" && navigator.webdriver;
  useFrame((_, dt) => {
    if (automated || dt > 0.25 || !useVilla.getState().introDone) return;
    const s = stats.current;
    s.n++;
    s.sum += dt;
    if (s.n < 90) return;
    const fps = s.n / s.sum;
    s.n = 0;
    s.sum = 0;
    if (fps < 28) {
      s.step++;
      if (s.step === 1) setDpr(quality === "high" ? 1.25 : 1);
      else if (s.step === 2) setDpr(0.85);
      else if (s.step >= 3) useVilla.getState().setLowFps(true);
    }
  });
  return null;
}

export default function VillaCanvas({ quality, onLost }: { quality: Quality; onLost: () => void }) {
  const high = quality === "high";
  return (
    <Canvas
      className="villa-canvas"
      frameloop="demand"
      dpr={high ? [1, 1.75] : [1, 1.4]}
      gl={{ antialias: !high, powerPreference: "high-performance", alpha: false, stencil: false, depth: true }}
      camera={{ fov: 54, near: 0.05, far: 400, position: [0, 1.55, 0] }}
      onCreated={(state) => {
        const { gl } = state;
        if (process.env.NODE_ENV !== "production") (window as unknown as { __r3f: unknown }).__r3f = state;
        gl.toneMapping = THREE.AgXToneMapping;
        gl.toneMappingExposure = EXPOSURE;
        // warm stone, not black, behind the scene while it streams in
        gl.setClearColor("#e9dfcc");
        gl.domElement.addEventListener("webglcontextlost", (e) => {
          e.preventDefault();
          onLost();
        });
      }}
      aria-hidden="true"
    >
      <Stage />
      <TourCamera />
      <CaptureBridge post={high} />
      {high && (
        <>
          <PostFX />
          <CaptureAfterComposer />
        </>
      )}
      <InvalidateOnChange />
      <ProgressReporter />
      <FrameBudget quality={quality} />
    </Canvas>
  );
}
