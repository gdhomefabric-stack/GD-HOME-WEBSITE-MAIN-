"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import {
  PILLOW_COVERS,
  PILLOW_FILL_BY_ID,
  PILLOW_FIRMNESS,
  PILLOW_SIZE_BY_ID,
  type PlacedPillow,
} from "@/data/catalog";
import { BEDS, type BedSpec } from "@/data/villa";
import { useVilla, type Quality } from "@/store/villa";
import type { FabricTextures } from "./fabrics";
import { damp } from "./sceneState";

/** A plump, piped pillow: a superellipsoid that thins towards its seams. */
function pillowGeometry(w: number, d: number, h: number): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(1, 40, 20);
  const p = g.getAttribute("position") as THREE.BufferAttribute;
  const uv = g.getAttribute("uv") as THREE.BufferAttribute;
  const e = 0.28;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const X = Math.sign(x) * Math.pow(Math.abs(x), e);
    const Z = Math.sign(z) * Math.pow(Math.abs(z), e);
    const edge = Math.max(0, (1 - Math.pow(Math.abs(X), 8)) * (1 - Math.pow(Math.abs(Z), 8)));
    const Y = y * (0.12 + 0.88 * Math.sqrt(edge));
    // gentle corner "ears" and a soft dent in the middle
    const dent = 1 - 0.12 * Math.exp(-(X * X + Z * Z) * 3);
    p.setXYZ(i, (X * w) / 2, (Y * h * dent) / 2, (Z * d) / 2);
    uv.setXY(i, X * 0.5 + 0.5, Z * 0.5 + 0.5);
  }
  g.computeVertexNormals();
  return g;
}

const geoCache = new Map<string, THREE.BufferGeometry>();
function cachedGeometry(p: PlacedPillow) {
  const size = PILLOW_SIZE_BY_ID[p.size];
  const loft = PILLOW_FILL_BY_ID[p.fill].loft * (PILLOW_FIRMNESS.find((f) => f.id === p.firmness)?.loft ?? 1);
  const baseH = size.row === 0 ? 0.19 : size.row === 1 ? 0.15 : 0.12;
  const key = `${p.size}-${loft.toFixed(2)}`;
  if (!geoCache.has(key)) geoCache.set(key, pillowGeometry(size.w, size.d, baseH * loft));
  return geoCache.get(key)!;
}

interface Slot {
  position: [number, number, number];
  rotation: [number, number, number];
}

/** Layered hotel-style arrangement: Euro squares upright, sleeping pillows leaning, boudoir in front. */
export function arrange(bed: BedSpec, pillows: PlacedPillow[]): Slot[] {
  const rows: PlacedPillow[][] = [[], [], []];
  pillows.forEach((p) => rows[PILLOW_SIZE_BY_ID[p.size].row].push(p));
  const top = bed.mattressTop;
  const hasEuro = rows[0].length > 0;
  const slots = new Map<string, Slot>();
  rows.forEach((list, row) => {
    const n = list.length;
    list.forEach((p, i) => {
      const size = PILLOW_SIZE_BY_ID[p.size];
      const spread = n > 1 ? Math.min(size.w + 0.03, (bed.width - size.w * 0.2) / n) : 0;
      const x = (i - (n - 1) / 2) * spread;
      let z: number;
      let tilt: number;
      if (row === 0) {
        tilt = 0.28;
        z = 0.13;
      } else if (row === 1) {
        tilt = hasEuro ? 0.72 : 0.95;
        z = hasEuro ? 0.42 : 0.26;
      } else {
        tilt = 0.95;
        z = (hasEuro ? 0.42 : 0.26) + (rows[1].length ? 0.26 : 0.12);
      }
      // stand the pillow up: its depth becomes height, leaning back by `tilt`
      const lean = Math.PI / 2 - tilt;
      const y = top + (size.d / 2) * Math.sin(lean) + 0.02 + (row === 2 && rows[1].length ? 0.05 : 0);
      slots.set(p.uid, { position: [x, y, z], rotation: [lean, 0, 0] });
    });
  });
  return pillows.map((p) => slots.get(p.uid)!);
}

function PillowMesh({ pillow, slot, material, quality }: { pillow: PlacedPillow; slot: Slot; material: THREE.Material; quality: Quality }) {
  const ref = useRef<THREE.Mesh>(null);
  const drop = useRef(0.55);
  const geometry = cachedGeometry(pillow);
  useFrame((state, dt) => {
    const m = ref.current;
    if (!m) return;
    const instant = useVilla.getState().instant;
    drop.current = instant ? 0 : damp(drop.current, 0, 5.5, dt);
    if (Math.abs(drop.current) < 0.0008) drop.current = 0;
    m.position.set(slot.position[0], slot.position[1] + drop.current, slot.position[2]);
    const settle = drop.current * 0.9;
    m.rotation.set(slot.rotation[0] + settle * 0.6, slot.rotation[1], slot.rotation[2] + settle * 0.3);
    if (drop.current !== 0) state.invalidate();
  });
  return (
    <mesh
      ref={ref}
      geometry={geometry}
      material={material}
      castShadow={quality === "high"}
      receiveShadow={quality === "high"}
    />
  );
}

export function BedPillows({ tex }: { tex: FabricTextures }) {
  const pillows = useVilla((s) => s.pillows);
  const quality = useVilla((s) => s.quality) ?? "lite";

  const materials = useMemo(() => {
    const detail = tex.blackout.detail.clone();
    const normal = tex.blackout.normal.clone();
    for (const t of [detail, normal]) {
      t.repeat.set(4, 4);
      t.needsUpdate = true;
    }
    const out: Record<string, THREE.Material> = {};
    for (const c of PILLOW_COVERS) {
      const params = {
        color: new THREE.Color(c.hex).multiplyScalar(1.08),
        map: detail,
        normalMap: normal,
        normalScale: new THREE.Vector2(0.35, 0.35),
        roughness: 0.72,
      };
      out[c.id] =
        quality === "high"
          ? new THREE.MeshPhysicalMaterial({ ...params, sheen: 0.45, sheenRoughness: 0.45, sheenColor: new THREE.Color("#ffffff") })
          : new THREE.MeshStandardMaterial(params);
    }
    return out;
  }, [tex, quality]);
  useEffect(() => () => Object.values(materials).forEach((m) => m.dispose()), [materials]);

  return (
    <>
      {BEDS.map((bed) => {
        const list = pillows[bed.roomId] ?? [];
        const slots = arrange(bed, list);
        const rot = Math.atan2(bed.dirX, bed.dirZ);
        return (
          <group key={bed.roomId} position={[bed.headX, 0, bed.headZ]} rotation={[0, rot, 0]}>
            {list.map((p, i) => (
              <PillowMesh key={p.uid} pillow={p} slot={slots[i]} material={materials[p.cover]} quality={quality} />
            ))}
          </group>
        );
      })}
    </>
  );
}
