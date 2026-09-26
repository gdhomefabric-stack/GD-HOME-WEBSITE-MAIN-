"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { ASSETS } from "@/lib/assets";
import { useVilla } from "@/store/villa";
import { damp, getKTX2Loader, lightLive, wallScale } from "./sceneState";

const RECEIVE_ONLY = /^(lawn|gravel|water|rug_|carpet|floor_|pool_tile)/;
const NO_SHADOW = /^(glass|emit_|screen|mirror)/;

interface WallNode {
  node: THREE.Object3D;
  key: string;
  cut: "ext" | "part";
  normal: THREE.Vector3;
}

const _dir = new THREE.Vector3();

/**
 * The villa shell and furniture (villa.glb). Handles the dollhouse cut-away:
 * in the overview, facades that face the camera fold down to a low plinth and
 * partitions drop to 70% so every room reads from above; inside a room the
 * walls rise back up and ceilings close over the camera.
 */
export function Villa() {
  const gl = useThree((s) => s.gl);
  const quality = useVilla((s) => s.quality) ?? "lite";
  const gltf = useLoader(GLTFLoader, ASSETS.villa, (loader) => {
    loader.setKTX2Loader(getKTX2Loader(gl));
    loader.setMeshoptDecoder(MeshoptDecoder);
  });

  const { walls, ceilings, emissive } = useMemo(() => {
    const walls: WallNode[] = [];
    const ceilings: THREE.Object3D[] = [];
    const emissive: Record<string, THREE.MeshStandardMaterial> = {};
    const shadows = quality === "high";
    const aniso = Math.min(8, gl.capabilities.getMaxAnisotropy());
    gltf.scene.traverse((o) => {
      const ud = o.userData as { cut?: "ext" | "part"; nx?: number; nz?: number };
      if (o.name.startsWith("wall_") && !o.name.endsWith("_mesh") && ud.cut) {
        walls.push({
          node: o,
          key: o.name.replace("wall_", ""),
          cut: ud.cut,
          normal: new THREE.Vector3(ud.nx ?? 0, 0, ud.nz ?? 0),
        });
      }
      if (o.name.startsWith("ceiling_") && !o.name.endsWith("_mesh")) {
        ceilings.push(o);
        o.visible = false;
      }
      if ((o as THREE.Mesh).isMesh) {
        const mesh = o as THREE.Mesh;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        let receiveOnly = false;
        let none = false;
        for (const m of mats as THREE.MeshStandardMaterial[]) {
          if (RECEIVE_ONLY.test(m.name)) receiveOnly = true;
          if (NO_SHADOW.test(m.name)) none = true;
          if (m.map) m.map.anisotropy = aniso;
          if (m.name.startsWith("emit_") || m.name === "screen") emissive[m.name] = m;
          if (m.name === "glass") {
            m.depthWrite = false;
            m.envMapIntensity = 1.6;
          }
          if (m.name === "water") m.envMapIntensity = 1.4;
          if (m.name === "mirror") m.envMapIntensity = 1.3;
        }
        mesh.castShadow = shadows && !receiveOnly && !none;
        mesh.receiveShadow = shadows && !none;
      }
    });
    return { walls, ceilings, emissive };
  }, [gltf, quality, gl]);

  const ceilingsOn = useRef(false);

  useFrame((state, dt) => {
    const { mode } = useVilla.getState();
    const cam = state.camera;
    const overview = mode === "overview";
    _dir.set(cam.position.x, 0, cam.position.z).normalize();
    let moving = false;
    for (const w of walls) {
      let target = 1;
      if (overview) {
        if (w.cut === "part") target = 0.7;
        else if (w.normal.dot(_dir) > 0.18) target = 0.1;
      }
      const cur = w.node.scale.y;
      const next = Math.abs(cur - target) < 0.002 ? target : damp(cur, target, 4.5, dt);
      if (next !== target) moving = true;
      w.node.scale.y = next;
      wallScale[w.key] = next;
    }
    // ceilings close over the camera once it is inside
    const inside = !overview && cam.position.y < 3.3;
    if (inside !== ceilingsOn.current) {
      ceilingsOn.current = inside;
      for (const c of ceilings) c.visible = inside;
    }
    // lamps, LED coves, fire and the cinema screen follow the lighting mode
    const lamp = lightLive.lamp;
    if (emissive.emit_lamp) emissive.emit_lamp.emissiveIntensity = 0.04 + lamp * 1.9;
    if (emissive.emit_bulb) emissive.emit_bulb.emissiveIntensity = 0.1 + lamp * 5;
    if (emissive.emit_cove) emissive.emit_cove.emissiveIntensity = lightLive.cove * 2.2;
    if (emissive.emit_fire) emissive.emit_fire.emissiveIntensity = 0.8 + lamp * 2.2;
    if (emissive.screen) emissive.screen.emissiveIntensity = 0.25 + lamp * 0.9;
    if (moving) state.invalidate();
  });

  return <primitive object={gltf.scene} />;
}
