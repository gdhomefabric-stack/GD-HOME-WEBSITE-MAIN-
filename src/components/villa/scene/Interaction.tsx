"use client";

import { Html } from "@react-three/drei";
import { COLLECTION_BY_ID, PRODUCT_BY_ID } from "@/data/catalog";
import { BED_BY_ROOM, facadeInnerZ, facadeInward, windowsForRoom, type RoomId } from "@/data/villa";
import { useVilla } from "@/store/villa";

/** An invisible click target over the bed. */
function BedArea({ roomId }: { roomId: RoomId }) {
  const bed = BED_BY_ROOM[roomId];
  const mode = useVilla((s) => s.mode);
  if (!bed || (mode !== "room" && mode !== "bed")) return null;
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

/** Quiet DOM pins on the windows (and bed) of the room you are standing in. */
function Hotspots({ roomId }: { roomId: RoomId }) {
  const mode = useVilla((s) => s.mode);
  const flying = useVilla((s) => s.flying);
  const introDone = useVilla((s) => s.introDone);
  const planOpen = useVilla((s) => s.planOpen);
  const curtains = useVilla((s) => s.curtains);
  if (!introDone || flying || planOpen || mode !== "room") return null;
  const wins = windowsForRoom(roomId);
  const bed = BED_BY_ROOM[roomId];
  return (
    <>
      {wins.map((w, i) => {
        const inward = facadeInward(w.facade);
        const p = PRODUCT_BY_ID[curtains[w.id].productId];
        return (
          <Html key={w.id} position={[w.x, (w.sill + w.head) / 2 + 0.2, facadeInnerZ(w.facade) + inward * 0.5]} center zIndexRange={[30, 10]}>
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
                {w.label} · {COLLECTION_BY_ID[p.collection].name}
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

export function Interaction({ roomId }: { roomId: RoomId }) {
  return (
    <>
      <BedArea roomId={roomId} />
      <Hotspots roomId={roomId} />
    </>
  );
}
