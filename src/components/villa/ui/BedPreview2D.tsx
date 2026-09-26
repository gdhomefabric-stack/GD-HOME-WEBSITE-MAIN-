"use client";

import { PILLOW_COVERS, PILLOW_SIZE_BY_ID, type PlacedPillow } from "@/data/catalog";

/** Front elevation of the bed with the layered pillows (room gallery, no WebGL). */
export function BedPreview2D({ pillows }: { pillows: PlacedPillow[] }) {
  const rows: PlacedPillow[][] = [[], [], []];
  pillows.forEach((p) => rows[PILLOW_SIZE_BY_ID[p.size].row].push(p));
  return (
    <figure className="bed2d" aria-label={`Bed dressed with ${pillows.length} pillows`}>
      <div className="bed2d__headboard" />
      <div className="bed2d__stack">
        {rows.map((row, r) => (
          <div key={r} className={`bed2d__row bed2d__row--${r}`}>
            {row.map((p) => {
              const size = PILLOW_SIZE_BY_ID[p.size];
              return (
                <span
                  key={p.uid}
                  className="bed2d__pillow"
                  style={{
                    width: `${size.w * 26}%`,
                    aspectRatio: r === 0 ? "1 / 1" : `${size.w} / ${size.d * (r === 1 ? 0.8 : 0.9)}`,
                    background: PILLOW_COVERS.find((c) => c.id === p.cover)?.hex,
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="bed2d__mattress" />
      <div className="bed2d__base" />
    </figure>
  );
}
