"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import { LIGHTING } from "@/data/lighting";
import { ROOMS, ROOM_BY_ID, facadeInnerZ, facadeInward, roomCenter, windowsForRoom } from "@/data/villa";
import { useVilla } from "@/store/villa";
import { colorDistance, curtainLive, damp, dampColor, lightLive } from "./sceneState";

let rectLibReady = false;

/** Parsed preset colours, cached so the frame loop does not allocate. */
const PRESET_COLOURS = Object.fromEntries(
  Object.entries(LIGHTING).map(([k, p]) => [
    k,
    {
      sun: new THREE.Color(p.sunColor),
      hemiSky: new THREE.Color(p.hemiSky),
      hemiGround: new THREE.Color(p.hemiGround),
      lamp: new THREE.Color(p.lampColor),
      window: new THREE.Color(p.windowColor),
      skyTop: new THREE.Color(p.skyTop),
      skyHorizon: new THREE.Color(p.skyHorizon),
      sunDir: new THREE.Vector3(...p.sunPosition).normalize(),
    },
  ]),
) as Record<keyof typeof LIGHTING, {
  sun: THREE.Color;
  hemiSky: THREE.Color;
  hemiGround: THREE.Color;
  lamp: THREE.Color;
  window: THREE.Color;
  skyTop: THREE.Color;
  skyHorizon: THREE.Color;
  sunDir: THREE.Vector3;
}>;

const skyVertex = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_Position = p.xyww;
  }`;
const skyFragment = /* glsl */ `
  uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uSun; uniform vec3 uSunColor; uniform float uGlow;
  varying vec3 vDir;
  void main() {
    float h = clamp(vDir.y, -0.2, 1.0);
    vec3 col = mix(uHorizon, uTop, pow(smoothstep(-0.02, 0.9, h), 0.7));
    float s = max(dot(normalize(vDir), normalize(uSun)), 0.0);
    col += uSunColor * (pow(s, 24.0) * 0.5 + pow(s, 4.0) * 0.12) * uGlow;
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

/** Gradient sky dome with a sun glow, plus stars at night. */
function Sky() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: skyVertex,
        fragmentShader: skyFragment,
        uniforms: {
          uTop: { value: new THREE.Color() },
          uHorizon: { value: new THREE.Color() },
          uSun: { value: new THREE.Vector3(0, 1, 0) },
          uSunColor: { value: new THREE.Color() },
          uGlow: { value: 1 },
        },
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
      }),
    [],
  );
  const stars = useMemo(() => {
    const n = 700;
    const p = new Float32Array(n * 3);
    let seed = 7;
    const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2;
      const y = 0.08 + r() * 0.92;
      const rad = Math.sqrt(1 - y * y);
      p.set([Math.cos(a) * rad * 280, y * 280, Math.sin(a) * rad * 280], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    return g;
  }, []);
  const starMat = useMemo(
    () => new THREE.PointsMaterial({ color: "#fff6e6", size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }),
    [],
  );
  const state = useRef({ top: new THREE.Color(), horizon: new THREE.Color(), sun: new THREE.Color(), stars: 0, init: false });
  useFrame((s, dt) => {
    const key = useVilla.getState().lighting;
    const preset = LIGHTING[key];
    const pc = PRESET_COLOURS[key];
    const st = state.current;
    const tTop = pc.skyTop;
    const tHor = pc.skyHorizon;
    const tSun = pc.sun;
    if (!st.init) {
      st.top.copy(tTop);
      st.horizon.copy(tHor);
      st.sun.copy(tSun);
      st.stars = preset.stars;
      st.init = true;
    }
    dampColor(st.top, tTop, 2.5, dt);
    dampColor(st.horizon, tHor, 2.5, dt);
    dampColor(st.sun, tSun, 2.5, dt);
    st.stars = damp(st.stars, preset.stars, 2.5, dt);
    mat.uniforms.uTop.value.copy(st.top);
    mat.uniforms.uHorizon.value.copy(st.horizon);
    mat.uniforms.uSunColor.value.copy(st.sun);
    mat.uniforms.uSun.value.copy(pc.sunDir);
    mat.uniforms.uGlow.value = preset.stars > 0.5 ? 0.25 : 1;
    starMat.opacity = st.stars;
    if (s.scene.fog) (s.scene.fog as THREE.Fog).color.copy(st.horizon);
    if (colorDistance(st.top, tTop) + colorDistance(st.horizon, tHor) > 0.003 || Math.abs(st.stars - preset.stars) > 0.003) s.invalidate();
  });
  return (
    <group>
      <mesh material={mat} renderOrder={-10} frustumCulled={false}>
        <sphereGeometry args={[300, 32, 16]} />
      </mesh>
      <points geometry={stars} material={starMat} frustumCulled={false} />
    </group>
  );
}

interface LiveNumbers {
  sun: number;
  hemi: number;
  env: number;
  exposure: number;
  ambient: number;
  lampFocus: number;
  fill?: number;
}

const _target = new THREE.Vector3();
const _up = new THREE.Vector3(0, 0.35, 0);

/**
 * All scene lighting. Values ease between Day / Sunset / Night presets, and
 * inside a room the ambient light follows how much daylight the curtains let in.
 */
export function SceneLighting() {
  const quality = useVilla((s) => s.quality) ?? "lite";
  const { gl, scene } = useThree();
  const high = quality === "high";

  if (high && !rectLibReady) {
    RectAreaLightUniformsLib.init();
    rectLibReady = true;
  }

  const sun = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const lamps = useRef<(THREE.PointLight | null)[]>([]);
  const rects = useRef<(THREE.RectAreaLight | null)[]>([]);
  const fill = useRef<THREE.PointLight>(null);

  // Image-based lighting from three's neutral RoomEnvironment (no network fetch).
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.fog = new THREE.Fog("#ece3d2", 95, 240);
    return () => {
      scene.environment = null;
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);

  const live = useRef<LiveNumbers | null>(null);
  const colours = useRef({
    sun: new THREE.Color(),
    hemiSky: new THREE.Color(),
    hemiGround: new THREE.Color(),
    lamp: new THREE.Color(),
  });

  // one warm lamp per room on desktop; a single roaming lamp on lighter tiers
  const lampSlots = high ? ROOMS.map((r) => r.lamps[0]) : [ROOMS[0].lamps[0]];
  const rectCount = high ? 2 : 0;

  useFrame((state, dt) => {
    const s = useVilla.getState();
    const preset = LIGHTING[s.lighting];
    const pc = PRESET_COLOURS[s.lighting];
    const inside = s.mode !== "overview" && !!s.roomId;
    const c = colours.current;
    const tSun = pc.sun;
    const tSky = pc.hemiSky;
    const tGround = pc.hemiGround;
    const tLamp = pc.lamp;
    const tWindow = pc.window;

    // how much daylight the focused room's curtains let in (0..1)
    let roomDaylight = 1;
    if (inside && s.roomId) {
      const wins = windowsForRoom(s.roomId);
      roomDaylight =
        wins.reduce((acc, w) => {
          const cl = curtainLive[w.id];
          return acc + (cl ? cl.open + (1 - cl.open) * cl.transmission : 1);
        }, 0) / wins.length;
    }
    // interiors are lit mostly through their windows: less sky fill, more window light
    const ambientTarget = inside ? THREE.MathUtils.lerp(0.9, 0.2 + 0.6 * roomDaylight, preset.daylight) : 1;

    if (!live.current) {
      live.current = {
        sun: preset.sunIntensity,
        hemi: preset.hemiIntensity,
        env: preset.envIntensity,
        exposure: preset.exposure,
        ambient: ambientTarget,
        lampFocus: 0,
      };
      c.sun.copy(tSun);
      c.hemiSky.copy(tSky);
      c.hemiGround.copy(tGround);
      c.lamp.copy(tLamp);
      lightLive.windowColor.copy(tWindow);
      lightLive.daylight = preset.daylight;
      lightLive.lamp = preset.lamp;
      lightLive.cove = preset.cove;
      lightLive.patchSkew = preset.patchSkew;
      lightLive.patchLength = preset.patchLength;
    }
    const L = live.current;
    const k = s.instant ? 1000 : 2.4;
    L.sun = damp(L.sun, preset.sunIntensity, k, dt);
    L.hemi = damp(L.hemi, preset.hemiIntensity, k, dt);
    L.env = damp(L.env, preset.envIntensity, k, dt);
    L.exposure = damp(L.exposure, preset.exposure, k, dt);
    L.ambient = damp(L.ambient, ambientTarget, s.instant ? 1000 : 3, dt);
    L.lampFocus = damp(L.lampFocus, inside ? 1 : 0, 2.5, dt);
    dampColor(c.sun, tSun, k, dt);
    dampColor(c.hemiSky, tSky, k, dt);
    dampColor(c.hemiGround, tGround, k, dt);
    dampColor(c.lamp, tLamp, k, dt);
    dampColor(lightLive.windowColor, tWindow, k, dt);
    lightLive.daylight = damp(lightLive.daylight, preset.daylight, k, dt);
    lightLive.lamp = damp(lightLive.lamp, preset.lamp, k, dt);
    lightLive.cove = damp(lightLive.cove, preset.cove, k, dt);
    lightLive.patchSkew = damp(lightLive.patchSkew, preset.patchSkew, k, dt);
    lightLive.patchLength = damp(lightLive.patchLength, preset.patchLength, k, dt);
    lightLive.interior = damp(lightLive.interior, inside && state.camera.position.y < 3.3 ? 1 : 0, 3, dt);

    if (sun.current) {
      const sl = sun.current;
      sl.color.copy(c.sun);
      sl.intensity = L.sun;
      // keep the shadow frustum tight around what the camera is looking at
      const focus = s.roomId ? roomCenter(ROOM_BY_ID[s.roomId]) : { x: 0, z: 0.5 };
      const dir = pc.sunDir;
      sl.position.set(focus.x + dir.x * 40, dir.y * 40, focus.z + dir.z * 40);
      sl.target.position.set(focus.x, 0, focus.z);
      sl.target.updateMatrixWorld();
      const half = inside ? 9 : 22;
      const cam = sl.shadow.camera;
      if (cam.right !== half) {
        cam.left = -half;
        cam.right = half;
        cam.top = half;
        cam.bottom = -half;
        cam.updateProjectionMatrix();
      }
    }
    if (hemi.current) {
      hemi.current.color.copy(c.hemiSky);
      hemi.current.groundColor.copy(c.hemiGround);
      hemi.current.intensity = L.hemi * L.ambient;
    }
    scene.environmentIntensity = L.env * L.ambient;
    gl.toneMappingExposure = L.exposure;

    // lamps
    lampSlots.forEach((slot, i) => {
      const light = lamps.current[i];
      if (!light) return;
      let pos = slot;
      let focusBoost = 0.65;
      if (!high) {
        pos = s.roomId ? ROOM_BY_ID[s.roomId].lamps[0] : slot;
        focusBoost = L.lampFocus;
      } else if (s.roomId && ROOMS[i].id === s.roomId) focusBoost = 0.65 + 0.35 * L.lampFocus;
      light.position.set(pos.x, pos.y, pos.z);
      light.color.copy(c.lamp);
      light.intensity = lightLive.lamp * 22 * focusBoost;
    });

    // daylight through the focused room's windows (desktop)
    if (rectCount) {
      const wins = s.roomId ? windowsForRoom(s.roomId) : [];
      for (let i = 0; i < rectCount; i++) {
        const r = rects.current[i];
        if (!r) continue;
        const w = wins[i];
        if (!w) {
          r.intensity = 0;
          continue;
        }
        const zIn = facadeInnerZ(w.facade);
        const inward = facadeInward(w.facade);
        const cl = curtainLive[w.id];
        const through = cl ? cl.open + (1 - cl.open) * cl.transmission : 1;
        r.width = w.width;
        r.height = w.head - w.sill;
        r.position.set(w.x, (w.sill + w.head) / 2, zIn + inward * 0.2);
        r.lookAt(w.x, (w.sill + w.head) / 2 - 0.6, zIn + inward * 3);
        r.color.copy(lightLive.windowColor);
        if (cl && cl.open < 0.98) r.color.lerp(cl.color, (1 - cl.open) * 0.5 * Math.min(1, cl.transmission * 3));
        r.intensity = 12 * lightLive.daylight * through * L.lampFocus;
      }
    }

    // showroom fill: a soft light from the viewer so fabrics read true to the swatch
    if (fill.current) {
      const f = fill.current;
      const mode = s.mode;
      const level = mode === "window" || mode === "closeup" || mode === "bed" ? 1 : mode === "room" ? 0.35 : 0;
      L.fill = damp(L.fill ?? 0, level * (s.lighting === "night" ? 0.55 : 1), 3, dt);
      const cam = state.camera;
      const ctrl = state.controls as unknown as { getTarget?: (v: THREE.Vector3) => THREE.Vector3 } | null;
      const target = ctrl?.getTarget ? ctrl.getTarget(_target) : _target.set(0, 1.5, 0);
      const d = cam.position.distanceTo(target);
      f.position.copy(cam.position).add(_up);
      f.intensity = L.fill * d * d * 1.1;
    }

    const settling =
      Math.abs(L.sun - preset.sunIntensity) > 0.005 ||
      Math.abs(L.ambient - ambientTarget) > 0.003 ||
      Math.abs(lightLive.lamp - preset.lamp) > 0.003 ||
      Math.abs(lightLive.daylight - preset.daylight) > 0.003 ||
      Math.abs(L.lampFocus - (inside ? 1 : 0)) > 0.003 ||
      Math.abs((L.fill ?? 0) - (s.mode === "window" || s.mode === "closeup" || s.mode === "bed" ? (s.lighting === "night" ? 0.55 : 1) : s.mode === "room" ? (s.lighting === "night" ? 0.19 : 0.35) : 0)) > 0.003 ||
      Math.abs(lightLive.interior - (inside && state.camera.position.y < 3.3 ? 1 : 0)) > 0.003 ||
      colorDistance(c.sun, tSun) > 0.003;
    if (settling) state.invalidate();
  });

  return (
    <>
      <hemisphereLight ref={hemi} />
      <directionalLight
        ref={sun}
        castShadow={high}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-radius={3}
        shadow-camera-near={1}
        shadow-camera-far={120}
      />
      {lampSlots.map((l, i) => (
        <pointLight
          key={i}
          ref={(el) => {
            lamps.current[i] = el;
          }}
          position={[l.x, l.y, l.z]}
          distance={9}
          decay={2}
          intensity={0}
        />
      ))}
      {Array.from({ length: rectCount }).map((_, i) => (
        <rectAreaLight
          key={i}
          ref={(el) => {
            rects.current[i] = el;
          }}
          intensity={0}
        />
      ))}
      <pointLight ref={fill} color="#fff3e4" decay={2} distance={0} intensity={0} />
      <Sky />
    </>
  );
}
