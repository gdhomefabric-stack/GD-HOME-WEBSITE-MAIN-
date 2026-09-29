import * as THREE from "three";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";
import { ASSETS } from "@/lib/assets";

/**
 * Mutable per-frame state shared between scene components. Animated values live
 * here (not in React state) so they can change every frame without re-rendering.
 */

export interface CurtainLive {
  open: number;
  transmission: number;
  color: THREE.Color;
}
/** Animated curtain state per window, read by the lighting. */
export const curtainLive: Record<string, CurtainLive> = {};

let ktx2: KTX2Loader | null = null;
/** One shared KTX2 loader (Basis transcoder workers are expensive). */
export function getKTX2Loader(gl: THREE.WebGLRenderer): KTX2Loader {
  if (!ktx2) {
    ktx2 = new KTX2Loader().setTranscoderPath(ASSETS.basis).detectSupport(gl);
  }
  return ktx2;
}

/** Frame-rate independent exponential smoothing. */
export const damp = (current: number, target: number, lambda: number, dt: number) =>
  THREE.MathUtils.damp(current, target, lambda, Math.min(dt, 0.25));

export const dampColor = (c: THREE.Color, target: THREE.Color, lambda: number, dt: number) =>
  c.lerp(target, 1 - Math.exp(-lambda * Math.min(dt, 0.25)));

export const colorDistance = (a: THREE.Color, b: THREE.Color) => Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b);
