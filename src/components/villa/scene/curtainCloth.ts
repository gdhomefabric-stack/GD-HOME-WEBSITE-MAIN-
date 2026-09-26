import * as THREE from "three";
import type { PleatId } from "@/data/catalog";

/**
 * Parametric curtain panel. Built in the window's local frame:
 *   x along the wall (+x to the right when facing the window from inside),
 *   y up, z into the room (0 = inner wall face).
 * The panel is a grid whose columns follow a pleat profile. Opening compresses the
 * folds towards the outer edge; the hem lags the heading so the drape sways.
 */
export interface ClothParams {
  side: -1 | 1;
  trackWidth: number;
  top: number;
  hem: number;
  fullness: number;
  pleat: PleatId;
  /** distance of the fabric's centre plane from the wall */
  depth: number;
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Cross-section of the fabric at a given depth below the heading. */
function profile(pleat: PleatId, theta: number, fromTop: number): number {
  const s = Math.sin(theta);
  switch (pleat) {
    case "wave":
    case "eyelet":
      return s;
    case "pinch": {
      const k = smooth(0.0, 0.34, fromTop);
      const head = s > 0 ? 1.18 * Math.pow(s, 0.42) : 0.3 * s;
      return lerp(head, s, k);
    }
    case "goblet": {
      const k = smooth(0.04, 0.32, fromTop);
      const head = s > 0 ? 1.5 * Math.pow(s, 0.3) : 0.2 * s;
      return lerp(head, s, k);
    }
    case "pencil": {
      const k = smooth(0.0, 0.24, fromTop);
      const head = 0.42 * Math.sin(theta * 3) + 0.4 * s;
      return lerp(head, s * 0.92, k);
    }
  }
}

export class CurtainCloth {
  readonly geometry = new THREE.BufferGeometry();
  readonly cols: number;
  readonly rows: number;
  readonly folds: number;
  readonly fabricWidth: number;
  private pos: Float32Array;
  /** x positions (window-local) of rings / eyelets along the heading */
  ringX: number[] = [];

  constructor(readonly p: ClothParams) {
    const half = p.trackWidth / 2;
    this.fabricWidth = half * p.fullness;
    const pitch = p.pleat === "pencil" ? 0.2 : p.pleat === "eyelet" ? 0.3 : 0.26;
    this.folds = Math.max(4, Math.round(this.fabricWidth / pitch));
    this.cols = Math.min(180, this.folds * 8) + 1;
    this.rows = 30;
    const n = this.cols * this.rows;
    this.pos = new Float32Array(n * 3);
    const uv = new Float32Array(n * 2);
    const drop = p.top - p.hem;
    for (let r = 0; r < this.rows; r++)
      for (let c = 0; c < this.cols; c++) {
        const i = r * this.cols + c;
        // UVs in metres of flat fabric, so textures keep their real-world scale
        uv[i * 2] = (c / (this.cols - 1)) * this.fabricWidth * (p.side === 1 ? -1 : 1);
        uv[i * 2 + 1] = -(r / (this.rows - 1)) * drop;
      }
    const idx: number[] = [];
    for (let r = 0; r < this.rows - 1; r++)
      for (let c = 0; c < this.cols - 1; c++) {
        const a = r * this.cols + c;
        const b = a + this.cols;
        const d = b + 1;
        const e = a + 1;
        if (p.side === -1) idx.push(a, b, e, e, b, d);
        else idx.push(a, e, b, e, d, b);
      }
    this.geometry.setIndex(idx);
    this.geometry.setAttribute("position", new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    this.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, (p.top + Math.max(0, p.hem)) / 2, 0.2), p.trackWidth);
    this.update(1, 1);
  }

  /** openTop / openBottom in [0 (closed) .. 1 (open)] */
  update(openTop: number, openBottom: number) {
    const { side, trackWidth, top, hem, pleat, depth } = this.p;
    const half = trackWidth / 2;
    const closedW = half + 0.035;
    const stackW = Math.min(half * 0.62, Math.max(0.16, this.fabricWidth * 0.085 + 0.07));
    const drop = top - hem;
    const f = this.fabricWidth / this.folds;
    const floorY = 0.012;
    const pos = this.pos;
    for (let r = 0; r < this.rows; r++) {
      const t = r / (this.rows - 1);
      const fromTop = t * drop;
      const o = lerp(openTop, openBottom, Math.pow(t, 1.4));
      const e = lerp(closedW, stackW, o) * (1 + 0.32 * o * t * t);
      const pitch = e / this.folds;
      const amp = (f / 4) * Math.sqrt(Math.max(0.03, 1 - (pitch / f) ** 2)) * (1 + 0.22 * t);
      for (let c = 0; c < this.cols; c++) {
        const s = c / (this.cols - 1);
        const theta = Math.PI * 2 * this.folds * s;
        let x = side * (half - s * e);
        let y = top - fromTop;
        let z = depth + amp * profile(pleat, theta, fromTop) + 0.004 * Math.sin(theta * 0.37 + t * 3.1);
        // leading edge settles flat against its neighbour
        if (s > 0.97) z = lerp(z, depth + amp * 0.3, (s - 0.97) / 0.03);
        if (pleat === "eyelet" && fromTop < 0.14) y -= 0.022 * (1 - Math.abs(Math.cos(theta))) * (1 - fromTop / 0.14);
        if (y < floorY) {
          // pool the extra length forward onto the floor
          const extra = floorY - y;
          y = floorY + Math.min(0.03, extra * 0.25) * Math.abs(Math.sin(theta));
          z += extra * 0.95;
          x += side * extra * 0.1 * (s - 0.5);
        }
        const i = (r * this.cols + c) * 3;
        pos[i] = x;
        pos[i + 1] = y;
        pos[i + 2] = z;
      }
    }
    const attr = this.geometry.getAttribute("position") as THREE.BufferAttribute;
    attr.needsUpdate = true;
    this.geometry.computeVertexNormals();

    // rings: eyelets sit at the zero crossings, rings at each pleat crown
    this.ringX.length = 0;
    const eTop = lerp(closedW, stackW, openTop);
    if (pleat === "eyelet") {
      for (let k = 0; k <= this.folds * 2; k += 1) this.ringX.push(side * (half - (k / (this.folds * 2)) * eTop));
    } else if (pleat !== "wave") {
      for (let k = 0; k < this.folds; k++) this.ringX.push(side * (half - ((k + 0.25) / this.folds) * eTop));
    }
  }

  dispose() {
    this.geometry.dispose();
  }
}
