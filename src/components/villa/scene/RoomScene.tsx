"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { suspend } from "suspend-react";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { LINING_BY_ID, PRODUCT_BY_ID, colourOf, curtainTransmission } from "@/data/catalog";
import { WINDOWS, facadeInnerZ, type RoomId } from "@/data/villa";
import { effectiveCurtain, useVilla, type Lighting, type Quality } from "@/store/villa";
import { EMISSIVE, MAX_WINDOWS, createRoomMaterial, lmUniforms } from "./roomMaterials";
import { curtainLive, damp, getKTX2Loader } from "./sceneState";

/**
 * A Blender-baked room: geometry, lightmaps, light probe and the garden panorama.
 * Everything for one room loads together (suspends), so switching rooms swaps a
 * complete, lit room behind the transition veil.
 */

export interface RoomMeta {
  room: RoomId;
  facade: "N" | "S";
  centre: [number, number, number];
  lightmaps: Record<string, number>;
  props: Record<string, number>;
  propOrder?: string[];
  sun: Partial<Record<"day" | "sunset", [number, number, number]>>;
  /** scale of each garden panorama: sRGB-curve JPEGs in the lightmaps' linear units */
  sky?: Partial<Record<Lighting, number>>;
}

/** Panoramas from before `meta.sky` were already tone-mapped: dim them to roughly match. */
const LEGACY_SKY = 0.25;

const PRESETS: Lighting[] = ["day", "sunset", "night"];
const base = (id: string) => `/rooms/${id}`;

interface RoomAssets {
  scene: THREE.Group;
  meta: RoomMeta;
  lm: Record<string, THREE.Texture>;
  env: Record<Lighting, THREE.Texture>;
  sky: Record<Lighting, THREE.Texture>;
  emissive: THREE.MeshStandardMaterial[];
}

const texLoader = new THREE.TextureLoader();
const hdrLoader = new HDRLoader();

async function loadRoom(gl: THREE.WebGLRenderer, id: RoomId, quality: Quality): Promise<RoomAssets> {
  const gltfLoader = new GLTFLoader();
  gltfLoader.setMeshoptDecoder(MeshoptDecoder);
  gltfLoader.setKTX2Loader(getKTX2Loader(gl));
  const pmrem = new THREE.PMREMGenerator(gl);

  const [gltf, meta] = await Promise.all([
    gltfLoader.loadAsync(`${base(id)}/room.glb`),
    fetch(`${base(id)}/meta.json`).then((r) => r.json() as Promise<RoomMeta>),
  ]);

  const lmNames = ["day_amb", "day_sun", "sunset_amb", "sunset_sun", "night_amb"];
  const [lmTex, envTex, skyTex] = await Promise.all([
    Promise.all(lmNames.map((n) => texLoader.loadAsync(`${base(id)}/lm_${n}.webp`))),
    Promise.all(PRESETS.map((p) => hdrLoader.loadAsync(`${base(id)}/env_${p}.hdr`))),
    Promise.all(PRESETS.map((p) => texLoader.loadAsync(`${base(id)}/sky_${p}.jpg`))),
  ]);
  const lm: Record<string, THREE.Texture> = {};
  lmNames.forEach((n, i) => {
    const t = lmTex[i];
    t.colorSpace = THREE.SRGBColorSpace;
    t.flipY = false; // glTF UV convention
    t.generateMipmaps = true;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.anisotropy = 4;
    t.needsUpdate = true;
    lm[n] = t;
  });
  const env = {} as Record<Lighting, THREE.Texture>;
  const sky = {} as Record<Lighting, THREE.Texture>;
  PRESETS.forEach((p, i) => {
    const e = envTex[i];
    e.mapping = THREE.EquirectangularReflectionMapping;
    env[p] = pmrem.fromEquirectangular(e).texture;
    e.dispose();
    const s = skyTex[i];
    s.colorSpace = THREE.SRGBColorSpace;
    s.mapping = THREE.EquirectangularReflectionMapping;
    sky[p] = s;
  });
  pmrem.dispose();

  // materials by name, shared between the meshes of this room
  const lite = quality === "high" ? "high" : "lite";
  const byKey = new Map<string, Promise<THREE.Material>>();
  const jobs: Promise<void>[] = [];
  const emissive: THREE.MeshStandardMaterial[] = [];
  gltf.scene.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const kind = /_glass/.test(mesh.name) || /_glass/.test(mesh.parent?.name ?? "") ? "glass" : /_prop/.test(mesh.name) || /_prop/.test(mesh.parent?.name ?? "") ? "prop" : "static";
    const name = (mesh.material as THREE.Material).name;
    if (kind === "prop") {
      const g = mesh.geometry;
      const order = meta.propOrder ?? ["lm_day", "lm_sunset", "lm_night"];
      const attrs = ["color", "color_1", "color_2"];
      const target: Record<string, string> = { lm_day: "lmDay", lm_sunset: "lmSunset", lm_night: "lmNight" };
      order.forEach((key, i) => {
        const a = g.getAttribute(attrs[i]);
        if (a) {
          g.setAttribute(target[key], a);
          g.deleteAttribute(attrs[i]);
        }
      });
    }
    const key = `${kind}:${name}`;
    let p = byKey.get(key);
    if (!p) {
      p = createRoomMaterial(gl, name, kind, { quality: lite, envMap: env.day });
      byKey.set(key, p);
    }
    jobs.push(
      p.then((m) => {
        mesh.material = m;
        if (EMISSIVE.has(name) && !emissive.includes(m as THREE.MeshStandardMaterial)) emissive.push(m as THREE.MeshStandardMaterial);
        if (kind === "glass") mesh.renderOrder = 5;
      }),
    );
    mesh.frustumCulled = true;
  });
  await Promise.all(jobs);
  // compile before the room is revealed
  await (gl as THREE.WebGLRenderer & { compileAsync?: (s: THREE.Object3D, c: THREE.Camera) => Promise<unknown> })
    .compileAsync?.(gltf.scene, new THREE.PerspectiveCamera());
  return { scene: gltf.scene, meta, lm, env, sky, emissive };
}

export function useRoomAssets(id: RoomId): RoomAssets {
  const gl = useThree((s) => s.gl);
  const quality = useVilla((s) => s.quality) ?? "lite";
  return suspend(() => loadRoom(gl, id, quality), ["room", id, quality]);
}

/** Starts loading a room in the background (e.g. the next one along). */
export function prefetchRoom(id: RoomId) {
  fetch(`${base(id)}/room.glb`).catch(() => undefined);
}

/* ---------------------------------------------------------------- lighting rig */

const EMISSION: Record<Lighting, Record<string, number>> = {
  day: { shade: 0, bulb: 0, fire: 0.4, screen: 0.35 },
  sunset: { shade: 0.15, bulb: 0.4, fire: 1.2, screen: 0.5 },
  night: { shade: 1.4, bulb: 5, fire: 3, screen: 0.9 },
};

const _tint = new THREE.Color();

/** Animates the shared lightmap uniforms: preset cross-fades and curtain coverage. */
function LightRig({ a }: { a: RoomAssets }) {
  const lighting = useVilla((s) => s.lighting);
  const instant = useVilla((s) => s.instant);
  const scene = useThree((s) => s.scene);
  const state = useMemo(() => ({ from: lighting as Lighting, to: lighting as Lighting, t: 1 }), [a]); // eslint-disable-line react-hooks/exhaustive-deps

  const setPreset = (slot: "A" | "B", p: Lighting) => {
    const u = lmUniforms;
    const amb = a.lm[`${p}_amb`];
    const sun = p === "night" ? null : a.lm[`${p}_sun`];
    const ks = a.meta.lightmaps;
    if (slot === "A") {
      u.lmAmbA.value = amb;
      u.lmSunA.value = sun ?? a.lm.day_sun;
      u.lmScale.value.x = ks[`${p}_amb`] ?? 1;
      u.lmScale.value.z = sun ? ks[`${p}_sun`] ?? 1 : 0;
      u.sunDirA.value.fromArray(a.meta.sun[p as "day"] ?? [0, 1, 0]);
      u.propScale.value.x = a.meta.props[`lm_${p}`] ?? 1;
      u.propSet.value.x = PRESETS.indexOf(p);
    } else {
      u.lmAmbB.value = amb;
      u.lmSunB.value = sun ?? a.lm.day_sun;
      u.lmScale.value.y = ks[`${p}_amb`] ?? 1;
      u.lmScale.value.w = sun ? ks[`${p}_sun`] ?? 1 : 0;
      u.sunDirB.value.fromArray(a.meta.sun[p as "day"] ?? [0, 1, 0]);
      u.propScale.value.y = a.meta.props[`lm_${p}`] ?? 1;
      u.propSet.value.y = PRESETS.indexOf(p);
    }
  };

  // new room or first mount: both slots on the current preset
  useEffect(() => {
    state.from = state.to = lighting;
    state.t = 1;
    setPreset("A", lighting);
    setPreset("B", lighting);
    lmUniforms.lmMix.value = 0;
    scene.environment = null;
    scene.background = a.sky[lighting];
    scene.backgroundIntensity = a.meta.sky?.[lighting] ?? LEGACY_SKY;
    for (const m of a.emissive) m.emissiveIntensity = EMISSION[lighting][m.name] ?? 0;
    // window geometry for the sun mask
    const wins = WINDOWS.filter((w) => w.roomId === a.meta.room).slice(0, MAX_WINDOWS);
    lmUniforms.winCount.value = wins.length;
    wins.forEach((w, i) => {
      const half = (w.width + 0.5) / 2;
      lmUniforms.winRect.value[i].set(w.x - half, w.x + half, w.sill, w.head);
      const inward = w.facade === "N" ? 1 : -1;
      lmUniforms.winCover.value[i].w = facadeInnerZ(w.facade) + inward * 0.15; // curtain plane
    });
    return () => {
      if (scene.background === a.sky[lighting]) scene.background = null;
    };
  }, [a]); // eslint-disable-line react-hooks/exhaustive-deps

  // lighting change: cross-fade from what is showing now
  useEffect(() => {
    if (lighting === state.to) return;
    const showing = state.t > 0.5 ? state.to : state.from;
    state.from = showing;
    state.to = lighting;
    state.t = instant ? 1 : 0;
    setPreset("A", showing);
    setPreset("B", lighting);
  }, [lighting]); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame((st, dt) => {
    const u = lmUniforms;
    let moving = false;
    if (state.t < 1) {
      state.t = Math.min(1, state.t + dt / 1.4);
      moving = true;
    }
    const e = state.t * state.t * (3 - 2 * state.t);
    u.lmMix.value = e;
    const shown = e > 0.5 ? state.to : state.from;
    if (st.scene.background !== a.sky[shown]) {
      st.scene.background = a.sky[shown];
      st.scene.backgroundIntensity = a.meta.sky?.[shown] ?? LEGACY_SKY;
    }
    for (const m of a.emissive) {
      const v = THREE.MathUtils.lerp(EMISSION[state.from][m.name] ?? 0, EMISSION[state.to][m.name] ?? 0, e);
      m.emissiveIntensity = v;
    }
    // curtains: coverage and daylight factor per window
    const s = useVilla.getState();
    const wins = WINDOWS.filter((w) => w.roomId === a.meta.room).slice(0, MAX_WINDOWS);
    let open = 0;
    wins.forEach((w, i) => {
      const live = curtainLive[w.id];
      const cfg = effectiveCurtain(s, w.id);
      const trans = live?.transmission ?? curtainTransmission(cfg);
      const o = live?.open ?? s.open[w.id];
      const half = (w.width + 0.5) / 2;
      const stack = Math.min(half * 0.62, 0.22);
      const cover = THREE.MathUtils.lerp(half + 0.035, stack, o);
      const c = u.winCover.value[i];
      c.x = cover;
      c.y = cover;
      c.z = trans;
      _tint.set(colourOf(cfg).hex).lerp(new THREE.Color(1, 1, 1), 0.35 + 0.4 * (LINING_BY_ID[cfg.lining]?.transmission ?? 1));
      u.winTint.value[i].copy(PRODUCT_BY_ID[cfg.productId].kind === "sheer" ? _tint.lerp(new THREE.Color(1, 1, 1), 0.5) : _tint);
      open += o + (1 - o) * trans;
    });
    const f = wins.length ? open / wins.length : 1;
    const leak = 0.06;
    const day = leak + (1 - leak) * f;
    const target = new THREE.Vector2(state.from === "night" ? 1 : day, state.to === "night" ? 1 : day);
    const dl = u.lmDaylight.value;
    const nx = damp(dl.x, target.x, 5, dt);
    const ny = damp(dl.y, target.y, 5, dt);
    if (Math.abs(nx - dl.x) > 1e-4 || Math.abs(ny - dl.y) > 1e-4) moving = true;
    dl.set(nx, ny);
    if (moving) st.invalidate();
  });
  return null;
}

export function RoomScene({ id }: { id: RoomId }) {
  const a = useRoomAssets(id);
  return (
    <>
      <primitive object={a.scene} />
      <LightRig a={a} />
    </>
  );
}

/** The room's probe, for curtains and pillows (environment lighting + reflections). */
export function useRoomEnv(id: RoomId): Record<Lighting, THREE.Texture> {
  return useRoomAssets(id).env;
}
