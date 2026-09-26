"use client";

import { Suspense, useEffect, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useProgress } from "@react-three/drei";
import { WINDOWS } from "@/data/villa";
import { grabCanvas, registerCapture } from "@/lib/capture";
import { useVilla, type Quality } from "@/store/villa";
import { CameraRig } from "./scene/CameraRig";
import { WindowDressing } from "./scene/Curtain";
import { useFabricTextures } from "./scene/fabrics";
import { Interaction } from "./scene/Interaction";
import { SceneLighting } from "./scene/Lighting";
import { BedPillows } from "./scene/Pillows";
import { PostFX } from "./scene/PostFX";
import { Villa } from "./scene/Villa";

function Dressings() {
  const tex = useFabricTextures();
  return (
    <>
      {WINDOWS.map((w) => (
        <WindowDressing key={w.id} win={w} tex={tex} />
      ))}
      <BedPillows tex={tex} />
    </>
  );
}

/** Pre-compiles shaders, then tells the UI the villa is ready to reveal. */
function Ready() {
  const { gl, scene, camera, invalidate } = useThree();
  useEffect(() => {
    let alive = true;
    const done = () => {
      if (!alive) return;
      invalidate();
      requestAnimationFrame(() => requestAnimationFrame(() => alive && useVilla.getState().setSceneReady()));
    };
    const compile = (gl as THREE.WebGLRenderer & { compileAsync?: (s: THREE.Object3D, c: THREE.Camera) => Promise<unknown> }).compileAsync;
    if (compile) compile.call(gl, scene, camera).then(done, done);
    else done();
    return () => {
      alive = false;
    };
  }, [gl, scene, camera, invalidate]);
  return null;
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
  const progress = useProgress((s) => s.progress);
  useEffect(() => {
    useVilla.getState().setLoadProgress(progress);
  }, [progress]);
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
  useFrame((_, dt) => {
    if (dt > 0.25 || !useVilla.getState().introDone) return;
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
      shadows={high}
      dpr={high ? [1, 1.75] : [1, 1.4]}
      gl={{ antialias: !high, powerPreference: "high-performance", alpha: false, stencil: false, depth: true }}
      camera={{ fov: 38, near: 0.08, far: 420, position: [34, 42, 58] }}
      onCreated={(state) => {
        const { gl } = state;
        if (process.env.NODE_ENV !== "production") (window as unknown as { __r3f: unknown }).__r3f = state;
        gl.toneMapping = THREE.NeutralToneMapping;
        gl.toneMappingExposure = 1;
        gl.domElement.addEventListener("webglcontextlost", (e) => {
          e.preventDefault();
          onLost();
        });
      }}
      aria-hidden="true"
    >
      <SceneLighting />
      <Suspense fallback={null}>
        <Villa />
        <Dressings />
        <Interaction />
        <Ready />
      </Suspense>
      <CameraRig />
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
