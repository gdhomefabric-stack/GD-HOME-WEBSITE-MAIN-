import * as THREE from "three";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";
import { ASSETS } from "@/lib/assets";

/**
 * Mutable per-frame state shared between scene components. Animated values live
 * here (not in React state) so they can change every frame without re-rendering.
 */

/** Current fold-down scale of each wall group (1 = full height). */
export const wallScale: Record<string, number> = { N: 1, S: 1, E: 1, W: 1, int: 1 };

export interface CurtainLive {
  open: number;
  transmission: number;
  color: THREE.Color;
}
/** Animated curtain state per window, read by the lighting. */
export const curtainLive: Record<string, CurtainLive> = {};

/** Animated lighting values, read by curtains, patches and emissive materials. */
export const lightLive = {
  daylight: 1,
  windowColor: new THREE.Color("#fff5e6"),
  lamp: 0,
  cove: 0.1,
  patchSkew: 0.3,
  patchLength: 2.5,
  /** 1 = inside a room (light patches / shafts visible) */
  interior: 0,
};

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
