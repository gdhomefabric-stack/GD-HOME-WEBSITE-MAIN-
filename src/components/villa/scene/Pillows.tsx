"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { PILLOW_COVERS, PILLOW_SIZE_BY_ID, type PlacedPillow } from "@/data/catalog";
import { BED_BY_ROOM, type BedSpec, type RoomId } from "@/data/villa";
import { useVilla, type Lighting, type Quality } from "@/store/villa";
import type { FabricTextures } from "./fabrics";
import { arrange, cachedGeometry, type Slot } from "./pillowGeometry";
import { damp } from "./sceneState";

/** A soft contact shadow under each pillow (pillows are not in the baked lighting). */
let shadowTex: THREE.Texture | null = null;
function contactShadowTexture() {
  if (shadowTex) return shadowTex;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const grd = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  grd.addColorStop(0, "rgba(0,0,0,0.9)");
  grd.addColorStop(0.55, "rgba(0,0,0,0.45)");
  grd.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  shadowTex = new THREE.CanvasTexture(c);
  return shadowTex;
}
const shadowMat = () =>
  new THREE.MeshBasicMaterial({ map: contactShadowTexture(), transparent: true, depthWrite: false, opacity: 0.5, toneMapped: false, color: "#000000" });

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
  void quality;
  return <mesh ref={ref} geometry={geometry} material={material} />;
}

function PillowShadow({ pillow, slot, top, material }: { pillow: PlacedPillow; slot: Slot; top: number; material: THREE.Material }) {
  const size = PILLOW_SIZE_BY_ID[pillow.size];
  return (
    <mesh position={[slot.position[0], top + 0.012, slot.position[2] + 0.04]} rotation={[-Math.PI / 2, 0, 0]} material={material} renderOrder={2}>
      <planeGeometry args={[size.w * 1.25, size.d * 0.75]} />
    </mesh>
  );
}

export function BedPillows({ tex, roomId, env }: { tex: FabricTextures; roomId: RoomId; env: Record<Lighting, THREE.Texture> }) {
  const pillows = useVilla((s) => s.pillows);
  const quality = useVilla((s) => s.quality) ?? "lite";
  const lighting = useVilla((s) => s.lighting);
  const shadow = useMemo(() => shadowMat(), []);

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
        vertexColors: true,
      };
      out[c.id] =
        quality === "high"
          ? new THREE.MeshPhysicalMaterial({ ...params, sheen: 0.45, sheenRoughness: 0.45, sheenColor: new THREE.Color("#ffffff") })
          : new THREE.MeshStandardMaterial(params);
    }
    return out;
  }, [tex, quality]);
  useEffect(() => () => Object.values(materials).forEach((m) => m.dispose()), [materials]);
  // lit by the room's light probe
  useEffect(() => {
    for (const m of Object.values(materials) as THREE.MeshStandardMaterial[]) {
      m.envMap = env[lighting];
      m.envMapIntensity = 1;
      m.needsUpdate = true;
    }
  }, [materials, env, lighting]);

  const bed = BED_BY_ROOM[roomId];
  if (!bed) return null;
  const list = pillows[bed.roomId] ?? [];
  const slots = arrange(bed, list);
  const rot = Math.atan2(bed.dirX, bed.dirZ);
  return (
    <group position={[bed.headX, 0, bed.headZ]} rotation={[0, rot, 0]}>
      {list.map((p, i) => (
        <group key={p.uid}>
          <PillowMesh pillow={p} slot={slots[i]} material={materials[p.cover]} quality={quality} />
          <PillowShadow pillow={p} slot={slots[i]} top={bed.mattressTop} material={shadow} />
        </group>
      ))}
    </group>
  );
}
