import * as THREE from "three";
import { PILLOW_FILL_BY_ID, PILLOW_FIRMNESS, PILLOW_SIZE_BY_ID, type PlacedPillow } from "@/data/catalog";
import type { BedSpec } from "@/data/villa";

/** A plump, piped pillow: a superellipsoid that thins towards its seams. */
export function pillowGeometry(w: number, d: number, h: number): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(1, 56, 28);
  const p = g.getAttribute("position") as THREE.BufferAttribute;
  const uv = g.getAttribute("uv") as THREE.BufferAttribute;
  const ao = new Float32Array(p.count * 3);
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
    // the underside and the pinched seam catch less light
    const under = 0.62 + 0.38 * THREE.MathUtils.smoothstep(y, -0.9, 0.6);
    const seam = 0.86 + 0.14 * Math.sqrt(edge);
    ao[i * 3] = ao[i * 3 + 1] = ao[i * 3 + 2] = under * seam;
  }
  g.setAttribute("color", new THREE.BufferAttribute(ao, 3));
  g.computeVertexNormals();
  return g;
}

const geoCache = new Map<string, THREE.BufferGeometry>();
export function cachedGeometry(p: PlacedPillow) {
  const size = PILLOW_SIZE_BY_ID[p.size];
  const loft = PILLOW_FILL_BY_ID[p.fill].loft * (PILLOW_FIRMNESS.find((f) => f.id === p.firmness)?.loft ?? 1);
  const baseH = size.row === 0 ? 0.19 : size.row === 1 ? 0.15 : 0.12;
  const key = `${p.size}-${loft.toFixed(2)}`;
  if (!geoCache.has(key)) geoCache.set(key, pillowGeometry(size.w, size.d, baseH * loft));
  return geoCache.get(key)!;
}

export interface Slot {
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

