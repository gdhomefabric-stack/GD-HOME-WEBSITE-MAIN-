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

/** Smooth 1-D value noise in [0, 1]. */
function vnoise(x: number, seed: number) {
  const i = Math.floor(x);
  const f = x - i;
  const h = (n: number) => {
    const v = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453;
    return v - Math.floor(v);
  };
  const u = f * f * (3 - 2 * f);
  return h(i) + (h(i + 1) - h(i)) * u;
}

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
  /** per-vertex fold shading: darker in the recesses between pleats */
  private ao: Float32Array;
  /** x positions (window-local) of rings / eyelets along the heading */
  ringX: number[] = [];

  /** per-panel randomness so the two panels differ */
  private readonly seed: number;

  constructor(readonly p: ClothParams) {
    this.seed = p.side === -1 ? 1.7 : 4.3;
    const half = p.trackWidth / 2;
    this.fabricWidth = half * p.fullness;
    const pitch = p.pleat === "pencil" ? 0.24 : p.pleat === "eyelet" ? 0.34 : p.pleat === "wave" ? 0.32 : 0.3;
    this.folds = Math.max(4, Math.round(this.fabricWidth / pitch));
    this.cols = Math.min(260, this.folds * 10) + 1;
    this.rows = 44;
    const n = this.cols * this.rows;
    this.pos = new Float32Array(n * 3);
    this.ao = new Float32Array(n * 3);
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
    this.geometry.setAttribute("color", new THREE.BufferAttribute(this.ao, 3).setUsage(THREE.DynamicDrawUsage));
    this.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, (p.top + Math.max(0, p.hem)) / 2, 0.2), p.trackWidth);
    this.update(1, 1);
  }

  /** openTop / openBottom in [0 (closed) .. 1 (open)] */
  update(openTop: number, openBottom: number) {
    const { side, trackWidth, top, hem, pleat, depth } = this.p;
    const half = trackWidth / 2;
    const closedW = half + 0.035;
    // a drawn-back curtain stacks to roughly a sixth of its fabric width
    const stackW = Math.min(half * 0.62, Math.max(0.2, this.fabricWidth * 0.15 + 0.06));
    const drop = top - hem;
    const f = this.fabricWidth / this.folds;
    const floorY = 0.012;
    const pos = this.pos;
    const ao = this.ao;
    for (let r = 0; r < this.rows; r++) {
      const t = r / (this.rows - 1);
      const fromTop = t * drop;
      const o = lerp(openTop, openBottom, Math.pow(t, 1.4));
      const e = lerp(closedW, stackW, o) * (1 + 0.32 * o * t * t);
      const pitch = e / this.folds;
      const amp = (f / 4) * Math.sqrt(Math.max(0.03, 1 - (pitch / f) ** 2)) * (1 + 0.22 * t);
      for (let c = 0; c < this.cols; c++) {
        const s = c / (this.cols - 1);
        const u = this.folds * s;
        // no two folds alike: each has its own depth, and they wander more towards the hem
        const ampMod = 0.62 + 0.76 * vnoise(u * 0.8, this.seed);
        const wander = (vnoise(u * 0.45 + 7.3, this.seed) - 0.5) * 1.1 * (0.25 + 0.75 * t);
        const theta = Math.PI * 2 * u + wander;
        let x = side * (half - s * e);
        let y = top - fromTop;
        const crisp = profile(pleat, theta, fromTop);
        // below the heading the pleats relax into softer, broader waves
        const relax = 0.3 * smooth(0.25, 1, t);
        const prof = crisp * (1 - relax) + relax * Math.sin(theta * 0.5 + this.seed) * Math.sign(crisp || 1) * 0.9;
        let z = depth + amp * ampMod * prof;
        // fine creases and the weight of the hem
        z += 0.0018 * Math.sin(y * 21 + u * 3.7) * Math.sin(u * 9.1 + this.seed) * (0.4 + t);
        if (fromTop > drop - 0.06) z += 0.006 * Math.sin(theta) * ((fromTop - (drop - 0.06)) / 0.06);
        // recesses (towards the wall) catch less light; deeper folds when drawn open
        const depthK = Math.min(1, (amp * ampMod) / 0.06);
        const occ = 1 - 0.2 * depthK * Math.pow(Math.max(0, (1 - prof) / 2), 1.3);
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
        // a little extra shade where the hem pools and right under the heading
        const k = occ * (y < 0.06 ? 0.82 : 1) * (fromTop < 0.05 ? 0.9 : 1);
        ao[i] = ao[i + 1] = ao[i + 2] = k;
      }
    }
    const attr = this.geometry.getAttribute("position") as THREE.BufferAttribute;
    attr.needsUpdate = true;
    (this.geometry.getAttribute("color") as THREE.BufferAttribute).needsUpdate = true;
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
