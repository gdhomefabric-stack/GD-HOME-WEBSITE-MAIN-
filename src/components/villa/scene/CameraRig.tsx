"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { CameraControls, CameraControlsImpl } from "@react-three/drei";
import {
  BED_BY_ROOM,
  INTRO_VIEW,
  OVERVIEW_VIEW,
  ROOM_BY_ID,
  WINDOW_BY_ID,
  bedView,
  closeupView,
  roomView,
  windowView,
  type CameraView,
} from "@/data/villa";
import { prefersReducedMotion } from "@/lib/device";
import { useVilla, type Mode } from "@/store/villa";
import { damp } from "./sceneState";

const { ACTION } = CameraControlsImpl;

/** Vertical field of view per step, tuned for a 16:9 screen. */
const FOV: Record<Mode, number> = { overview: 38, room: 60, window: 52, closeup: 46, bed: 50 };

function viewFor(mode: Mode, roomId: string | null, windowId: string | null): CameraView {
  if (mode === "overview" || !roomId) return OVERVIEW_VIEW;
  const room = ROOM_BY_ID[roomId as keyof typeof ROOM_BY_ID];
  if ((mode === "window" || mode === "closeup") && windowId) {
    const w = WINDOW_BY_ID[windowId];
    return mode === "closeup" ? closeupView(w) : windowView(w);
  }
  if (mode === "bed") {
    const b = BED_BY_ROOM[room.id];
    if (b) return bedView(b);
  }
  return roomView(room);
}

/** Keep the horizontal field of view on tall (portrait) screens. */
function fovForAspect(vfov: number, aspect: number) {
  if (aspect >= 1.3) return vfov;
  const h = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(vfov) / 2) * 1.3);
  const v = 2 * Math.atan(Math.tan(h / 2) / aspect);
  return Math.min(88, THREE.MathUtils.radToDeg(v));
}

function relax(c: CameraControlsImpl) {
  c.minDistance = 0.05;
  c.maxDistance = Infinity;
  c.minPolarAngle = 0;
  c.maxPolarAngle = Math.PI;
  c.minAzimuthAngle = -Infinity;
  c.maxAzimuthAngle = Infinity;
}

const OVERVIEW_AZIMUTH = Math.atan2(
  OVERVIEW_VIEW.position[0] - OVERVIEW_VIEW.target[0],
  OVERVIEW_VIEW.position[2] - OVERVIEW_VIEW.target[2],
);

/** Gentle, bounded orbit for each step so the visitor can look around but never gets lost. */
function applyLimits(c: CameraControlsImpl, mode: Mode) {
  const az = c.azimuthAngle;
  const pol = c.polarAngle;
  const d = c.distance;
  const set = (azMin: number, azMax: number, pMin: number, pMax: number, dMin: number, dMax: number) => {
    c.minAzimuthAngle = azMin;
    c.maxAzimuthAngle = azMax;
    c.minPolarAngle = Math.max(0.05, pMin);
    c.maxPolarAngle = Math.min(Math.PI - 0.05, pMax);
    c.minDistance = dMin;
    c.maxDistance = dMax;
  };
  switch (mode) {
    case "overview": {
      const base = az - OVERVIEW_AZIMUTH;
      set(base - 0.95, base + 0.95, 0.42, 1.1, d * 0.6, d * 1.2);
      break;
    }
    case "room":
      set(az - 0.55, az + 0.55, pol - 0.3, pol + 0.22, Math.max(0.8, d - 2.4), d + 0.4);
      break;
    case "window":
      set(az - 0.45, az + 0.45, pol - 0.28, pol + 0.25, 0.9, d + 0.5);
      break;
    case "closeup":
      set(az - 0.4, az + 0.4, pol - 0.25, pol + 0.25, 0.35, d + 0.5);
      break;
    case "bed":
      set(az - 0.5, az + 0.5, pol - 0.3, pol + 0.22, 1.2, d + 0.5);
      break;
  }
}

export function CameraRig() {
  const ref = useRef<CameraControlsImpl>(null);
  const mode = useVilla((s) => s.mode);
  const roomId = useVilla((s) => s.roomId);
  const windowId = useVilla((s) => s.windowId);
  const sceneReady = useVilla((s) => s.sceneReady);
  const invalidate = useThree((s) => s.invalidate);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const aspect = useThree((s) => s.size.width / Math.max(1, s.size.height));
  const portrait = aspect < 1;

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    c.mouseButtons.left = ACTION.ROTATE;
    c.mouseButtons.right = ACTION.NONE;
    c.mouseButtons.middle = ACTION.NONE;
    c.mouseButtons.wheel = ACTION.DOLLY;
    c.touches.one = ACTION.TOUCH_ROTATE;
    c.touches.two = ACTION.TOUCH_DOLLY;
    c.touches.three = ACTION.NONE;
    c.dollyToCursor = false;
    c.draggingSmoothTime = 0.14;
    c.restThreshold = 0.006;
    c.setLookAt(...INTRO_VIEW.position, ...INTRO_VIEW.target, false);
    c.enabled = false;
  }, []);

  useEffect(() => {
    const c = ref.current;
    if (!c || !sceneReady) return;
    let cancelled = false;
    const reduced = prefersReducedMotion() || useVilla.getState().instant;
    const v = viewFor(mode, roomId, windowId);
    let pos = v.position;
    if (mode === "overview" && portrait) {
      const k = 1.02;
      pos = [
        v.target[0] + (v.position[0] - v.target[0]) * k,
        v.target[1] + (v.position[1] - v.target[1]) * k,
        v.target[2] + (v.position[2] - v.target[2]) * k,
      ];
    }
    const first = !useVilla.getState().introDone;
    useVilla.getState().setFlying(true);
    c.enabled = false;
    relax(c);
    c.normalizeRotations();
    c.smoothTime = first ? 1.25 : 0.62;
    const p = c.setLookAt(pos[0], pos[1], pos[2], v.target[0], v.target[1], v.target[2], !reduced);
    invalidate();
    p.then(() => {
      if (cancelled) return;
      applyLimits(c, mode);
      c.smoothTime = 0.3;
      c.enabled = true;
      useVilla.getState().setFlying(false);
      if (first) useVilla.getState().setIntroDone();
      invalidate();
    });
    return () => {
      cancelled = true;
    };
  }, [mode, roomId, windowId, sceneReady, portrait, invalidate]);

  // ease the field of view between steps, and shift the lens so the subject sits
  // in the part of the screen the panels leave free (no camera move, so no clipping)
  const shift = useRef({ x: 0, y: 0 });
  useFrame((state, dt) => {
    const mode = useVilla.getState().mode;
    const target = fovForAspect(FOV[mode], aspect);
    let dirty = false;
    if (Math.abs(camera.fov - target) > 0.02) {
      camera.fov = damp(camera.fov, target, 3, dt);
      dirty = true;
    }
    const { width: W, height: H } = state.size;
    const panelMode = mode === "window" || mode === "closeup" || mode === "bed";
    let tx = 0;
    let ty = 0;
    if (W > 760) {
      if (panelMode) tx = (Math.min(400, W * 0.36) + 24) / 2;
    } else if (panelMode) ty = H * 0.26;
    else if (mode === "room") ty = Math.min(H * 0.46, 330) * 0.42;
    const sh = shift.current;
    const nx = Math.abs(sh.x - tx) < 0.5 ? tx : damp(sh.x, tx, 4, dt);
    const ny = Math.abs(sh.y - ty) < 0.5 ? ty : damp(sh.y, ty, 4, dt);
    if (nx !== sh.x || ny !== sh.y || (camera.view && (camera.view.fullWidth !== W || camera.view.fullHeight !== H))) {
      sh.x = nx;
      sh.y = ny;
      if (nx === 0 && ny === 0) camera.clearViewOffset();
      else camera.setViewOffset(W, H, nx, ny, W, H);
      dirty = true;
    }
    if (dirty) {
      camera.updateProjectionMatrix();
      if (nx !== tx || ny !== ty || Math.abs(camera.fov - target) > 0.02) state.invalidate();
    }
  });

  return <CameraControls ref={ref} makeDefault />;
}
