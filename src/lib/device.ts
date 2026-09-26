import type { Quality } from "@/store/villa";

export interface DeviceInfo {
  webgl2: boolean;
  mobile: boolean;
  reducedMotion: boolean;
  saveData: boolean;
  memory: number;
  cores: number;
}

export function readDevice(): DeviceInfo {
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean; effectiveType?: string };
  };
  let webgl2 = false;
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2");
    webgl2 = !!gl;
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    webgl2 = false;
  }
  const coarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  const small = Math.min(window.innerWidth, window.innerHeight) < 700;
  return {
    webgl2,
    mobile: coarse && small,
    reducedMotion: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false,
    saveData: !!nav.connection?.saveData || /(^|-)2g$/.test(nav.connection?.effectiveType ?? ""),
    memory: nav.deviceMemory ?? 8,
    cores: nav.hardwareConcurrency ?? 8,
  };
}

/**
 * Picks the experience tier:
 *  - static: no WebGL2, data-saver, or very constrained hardware → room gallery + 2D studio
 *  - lite:   phones, tablets and modest hardware → simplified 3D (no shadows, lower resolution)
 *  - high:   desktops → full 3D with shadows and window lighting
 */
export function detectQuality(d: DeviceInfo = readDevice()): Quality {
  if (!d.webgl2) return "static";
  if (d.saveData) return "static";
  if (d.memory <= 2 && d.cores <= 4) return "static";
  if (d.mobile || d.memory <= 4 || d.cores <= 4) return "lite";
  return "high";
}

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}
