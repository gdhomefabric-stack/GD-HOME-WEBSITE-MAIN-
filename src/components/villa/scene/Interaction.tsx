"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { COLLECTION_BY_ID, PRODUCT_BY_ID } from "@/data/catalog";
import {
  BED_BY_ROOM,
  ROOMS,
  WALL_HEIGHT,
  facadeInnerZ,
  facadeInward,
  roomCenter,
  windowsForRoom,
  type RoomSpec,
} from "@/data/villa";
import { useVilla } from "@/store/villa";
import { damp } from "./sceneState";

const glowGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);

function RoomArea({ room }: { room: RoomSpec }) {
  const [x0, z0, x1, z1] = room.bounds;
  const c = roomCenter(room);
  const glow = useRef<THREE.Mesh>(null);
  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#e3bd74",
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [],
  );
  useFrame((state, dt) => {
    const s = useVilla.getState();
    const target = s.mode === "overview" && s.hoverRoom === room.id ? 0.22 : 0;
    const next = damp(mat.opacity, target, 8, dt);
    mat.opacity = Math.abs(next - target) < 0.002 ? target : next;
    if (glow.current) glow.current.visible = mat.opacity > 0.002;
    if (mat.opacity !== target) state.invalidate();
  });

  const onMove = (e: ThreeEvent<PointerEvent>) => {
    const s = useVilla.getState();
    if (s.mode !== "overview" || s.flying) return;
    e.stopPropagation();
    if (s.hoverRoom !== room.id) s.setHoverRoom(room.id);
    document.body.style.cursor = "pointer";
  };
  const onOut = () => {
    const s = useVilla.getState();
    if (s.hoverRoom === room.id) s.setHoverRoom(null);
    document.body.style.cursor = "";
  };
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    const s = useVilla.getState();
    if (s.mode !== "overview" || s.flying || e.delta > 6) return;
    e.stopPropagation();
    document.body.style.cursor = "";
    s.enterRoom(room.id);
  };

  const mode = useVilla((s) => s.mode);
  return (
    <group>
      <mesh ref={glow} geometry={glowGeo} material={mat} position={[c.x, 0.03, c.z]} scale={[x1 - x0 - 0.2, 1, z1 - z0 - 0.2]} renderOrder={4} />
      {mode === "overview" && (
        <mesh
          position={[c.x, WALL_HEIGHT / 2, c.z]}
          visible={false}
          onPointerMove={onMove}
          onPointerOut={onOut}
          onClick={onClick}
        >
          <boxGeometry args={[x1 - x0, WALL_HEIGHT, z1 - z0]} />
          <meshBasicMaterial />
        </mesh>
      )}
    </group>
  );
}

function BedArea({ roomId }: { roomId: RoomSpec["id"] }) {
  const bed = BED_BY_ROOM[roomId];
  const mode = useVilla((s) => s.mode);
  const current = useVilla((s) => s.roomId);
  if (!bed || current !== roomId || (mode !== "room" && mode !== "bed")) return null;
  const rot = Math.atan2(bed.dirX, bed.dirZ);
  return (
    <mesh
      position={[bed.headX + (bed.dirX * bed.length) / 2, bed.mattressTop / 2 + 0.2, bed.headZ + (bed.dirZ * bed.length) / 2]}
      rotation={[0, rot, 0]}
      visible={false}
      onClick={(e) => {
        if (e.delta > 6) return;
        e.stopPropagation();
        useVilla.getState().dressBed();
      }}
      onPointerOver={() => (document.body.style.cursor = "pointer")}
      onPointerOut={() => (document.body.style.cursor = "")}
    >
      <boxGeometry args={[bed.width, bed.mattressTop + 0.5, bed.length]} />
      <meshBasicMaterial />
    </mesh>
  );
}

/** Minimal DOM hotspots: room pins in the overview, window/bed pins inside a room. */
function Hotspots() {
  const mode = useVilla((s) => s.mode);
  const roomId = useVilla((s) => s.roomId);
  const flying = useVilla((s) => s.flying);
  const introDone = useVilla((s) => s.introDone);
  const hoverRoom = useVilla((s) => s.hoverRoom);
  const curtains = useVilla((s) => s.curtains);
  if (!introDone || flying) return null;

  if (mode === "overview") {
    return (
      <>
        {ROOMS.map((r) => {
          const c = roomCenter(r);
          return (
            <Html key={r.id} position={[c.x, WALL_HEIGHT + 0.6, c.z]} center zIndexRange={[30, 10]}>
              <button
                type="button"
                className={`hotspot hotspot--room${hoverRoom === r.id ? " is-active" : ""}`}
                onClick={() => useVilla.getState().enterRoom(r.id)}
                onPointerEnter={() => useVilla.getState().setHoverRoom(r.id)}
                onPointerLeave={() => useVilla.getState().setHoverRoom(null)}
                onFocus={() => useVilla.getState().setHoverRoom(r.id)}
                onBlur={() => useVilla.getState().setHoverRoom(null)}
                aria-label={`Enter the ${r.name}`}
              >
                <span className="hotspot__dot" aria-hidden="true">
                  {r.index}
                </span>
                <span className="hotspot__label">{r.name}</span>
              </button>
            </Html>
          );
        })}
      </>
    );
  }

  if (mode === "room" && roomId) {
    const wins = windowsForRoom(roomId);
    const bed = BED_BY_ROOM[roomId];
    return (
      <>
        {wins.map((w, i) => {
          const inward = facadeInward(w.facade);
          const p = PRODUCT_BY_ID[curtains[w.id].productId];
          return (
            <Html
              key={w.id}
              position={[w.x, (w.sill + w.head) / 2 + 0.2, facadeInnerZ(w.facade) + inward * 0.5]}
              center
              zIndexRange={[30, 10]}
            >
              <button
                type="button"
                className="hotspot hotspot--window"
                onClick={() => useVilla.getState().selectWindow(w.id)}
                aria-label={`Dress window ${i + 1}, ${w.label}. Currently ${p.name} ${COLLECTION_BY_ID[p.collection].name}.`}
              >
                <span className="hotspot__dot" aria-hidden="true">
                  +
                </span>
                <span className="hotspot__label">
                  Window {i + 1} · {COLLECTION_BY_ID[p.collection].name}
                </span>
              </button>
            </Html>
          );
        })}
        {bed && (
          <Html position={[bed.headX + bed.dirX * 1.1, bed.mattressTop + 0.7, bed.headZ + bed.dirZ * 1.1]} center zIndexRange={[30, 10]}>
            <button type="button" className="hotspot hotspot--bed" onClick={() => useVilla.getState().dressBed()} aria-label="Dress the bed with goose feather pillows">
              <span className="hotspot__dot" aria-hidden="true">
                ✦
              </span>
              <span className="hotspot__label">Goose feather pillows</span>
            </button>
          </Html>
        )}
      </>
    );
  }
  return null;
}

export function Interaction() {
  return (
    <>
      {ROOMS.map((r) => (
        <RoomArea key={r.id} room={r} />
      ))}
      {ROOMS.filter((r) => r.pillows).map((r) => (
        <BedArea key={r.id} roomId={r.id} />
      ))}
      <Hotspots />
    </>
  );
}
