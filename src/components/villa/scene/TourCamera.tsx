"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { CameraControls, CameraControlsImpl } from "@react-three/drei";
import { BED_BY_ROOM, ROOM_BY_ID, WINDOW_BY_ID, bedView, closeupView, roomView, windowView, type CameraView, type RoomId } from "@/data/villa";
import { prefersReducedMotion } from "@/lib/device";
import { useVilla, type Mode } from "@/store/villa";
import { damp } from "./sceneState";

const { ACTION } = CameraControlsImpl;

/**
 * Standing in the room: the camera stays at eye height and turns in place, like
 * looking around a real room. The orbit target sits 10 cm in front of the eye, so
 * dragging turns the head and scrolling/pinching narrows the lens. Moving between
 * spots (room corner → window → close-up) is a short, eased walk.
 */

/** Vertical field of view per step, tuned for 16:9. */
const FOV: Record<Mode, number> = { room: 54, window: 50, closeup: 44, bed: 48 };
/** How far you may turn from each spot (radians): left/right and down/up. */
const LOOK: Record<Mode, [number, number, number]> = {
  room: [1.9, 0.62, 0.42],
  window: [1.1, 0.5, 0.35],
  closeup: [0.8, 0.45, 0.35],
  bed: [1.1, 0.55, 0.35],
};
const EYE_REACH = 0.1;

export function viewFor(mode: Mode, roomId: RoomId, windowId: string | null): CameraView {
  const room = ROOM_BY_ID[roomId];
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
  return Math.min(80, THREE.MathUtils.radToDeg(v));
}

function relax(c: CameraControlsImpl) {
  c.minAzimuthAngle = -Infinity;
  c.maxAzimuthAngle = Infinity;
  c.minPolarAngle = 0.05;
  c.maxPolarAngle = Math.PI - 0.05;
}

const _end = new THREE.Spherical();

function applyLimits(c: CameraControlsImpl, mode: Mode) {
  const end = c.getSpherical(_end, true);
  const [yaw, down, up] = LOOK[mode];
  c.minAzimuthAngle = end.theta - yaw;
  c.maxAzimuthAngle = end.theta + yaw;
  // polar < 90° looks down (the camera is above its target)
  c.minPolarAngle = Math.max(0.2, Math.PI / 2 - down);
  c.maxPolarAngle = Math.min(Math.PI - 0.2, Math.PI / 2 + up);
}

const _p = new THREE.Vector3();
const _t = new THREE.Vector3();

/** Position + a target just in front of the eye, looking at the view's subject. */
function eyeLookAt(v: CameraView): [number, number, number, number, number, number] {
  _p.fromArray(v.position);
  _t.fromArray(v.target).sub(_p).normalize().multiplyScalar(EYE_REACH).add(_p);
  return [_p.x, _p.y, _p.z, _t.x, _t.y, _t.z];
}

export function TourCamera() {
  const ref = useRef<CameraControlsImpl>(null);
  const mode = useVilla((s) => s.mode);
  const roomId = useVilla((s) => s.roomId);
  const roomShown = useVilla((s) => s.roomShown);
  const windowId = useVilla((s) => s.windowId);
  const invalidate = useThree((s) => s.invalidate);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const aspect = useThree((s) => s.size.width / Math.max(1, s.size.height));
  const lastRoom = useRef<RoomId | null>(null);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    c.mouseButtons.left = ACTION.ROTATE;
    c.mouseButtons.right = ACTION.NONE;
    c.mouseButtons.middle = ACTION.NONE;
    c.mouseButtons.wheel = ACTION.ZOOM;
    c.touches.one = ACTION.TOUCH_ROTATE;
    c.touches.two = ACTION.TOUCH_ZOOM;
    c.touches.three = ACTION.NONE;
    // turning in place: drag the room the way you would turn your head
    c.azimuthRotateSpeed = -0.28;
    c.polarRotateSpeed = -0.28;
    c.minZoom = 1;
    c.maxZoom = 2.2;
    c.dollyToCursor = false;
    c.draggingSmoothTime = 0.1;
    c.restThreshold = 0.004;
    c.enabled = false;
  }, []);

  useEffect(() => {
    const c = ref.current;
    // hold still behind the veil until the room being entered is lit and on screen
    if (!c || roomShown !== roomId) return;
    let cancelled = false;
    const reduced = prefersReducedMotion() || useVilla.getState().instant;
    const newRoom = lastRoom.current !== roomId;
    lastRoom.current = roomId;
    const v = viewFor(mode, roomId, windowId);
    const first = !useVilla.getState().introDone;
    useVilla.getState().setFlying(true);
    c.enabled = false;
    relax(c);
    c.normalizeRotations();
    // arriving in a room: start a step back and settle in, like walking through the door
    if (newRoom) {
      const la = eyeLookAt(v);
      const back = new THREE.Vector3(la[0] - la[3], 0, la[2] - la[5]).normalize().multiplyScalar(reduced ? 0 : 0.6);
      c.setLookAt(la[0] + back.x, la[1], la[2] + back.z, la[3] + back.x, la[4], la[5] + back.z, false);
      c.zoomTo(1, false);
    }
    c.smoothTime = newRoom ? (first ? 1.6 : 1.1) : 0.7;
    const p = c.setLookAt(...eyeLookAt(v), !reduced);
    c.zoomTo(1, !reduced);
    invalidate();
    let finished = false;
    const finish = () => {
      if (cancelled || finished) return;
      finished = true;
      applyLimits(c, mode);
      c.smoothTime = 0.25;
      c.enabled = true;
      useVilla.getState().setFlying(false);
      if (first) useVilla.getState().setIntroDone();
      invalidate();
    };
    void p.then(finish);
    const settle = setTimeout(finish, reduced ? 0 : c.smoothTime * 2400);
    return () => {
      cancelled = true;
      clearTimeout(settle);
    };
  }, [mode, roomId, roomShown, windowId, invalidate]);

  // ease the field of view between steps, and shift the lens so the subject sits in
  // the part of the screen the panels leave free
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
