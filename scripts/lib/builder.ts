/**
 * Tiny scene-building kit on top of three.js geometry, exported to glTF with gltf-transform.
 * Geometry is authored in world space, merged per (group, material), and given
 * world-scale box-projected UVs so tiled textures stay continuous across pieces.
 */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export type V3 = [number, number, number];

export interface MatDef {
  color?: string;
  map?: string;
  /** world size (m) covered by one texture tile */
  tile?: number;
  rough?: number;
  metal?: number;
  emissive?: string;
  emissiveMap?: string;
  alpha?: number;
  doubleSided?: boolean;
  /** keep geometry UVs (0..1 per face) instead of world projection */
  unitUV?: boolean;
  sheen?: { color: string; rough: number };
}

export class Group {
  geos = new Map<string, THREE.BufferGeometry[]>();
  constructor(
    public name: string,
    public origin: V3 = [0, 0, 0],
    public extras: Record<string, unknown> = {},
  ) {}
  add(mat: string, g: THREE.BufferGeometry) {
    if (!this.geos.has(mat)) this.geos.set(mat, []);
    this.geos.get(mat)!.push(g);
  }
}

let MATS: Record<string, MatDef> = {};
export const setMaterials = (m: Record<string, MatDef>) => {
  MATS = m;
};

/** Box-projected UVs from world positions, chosen per vertex by dominant normal axis. */
export function worldUV(g: THREE.BufferGeometry, tile: number) {
  const pos = g.getAttribute("position");
  const nor = g.getAttribute("normal");
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const ax = Math.abs(nor.getX(i));
    const ay = Math.abs(nor.getY(i));
    const az = Math.abs(nor.getZ(i));
    let u: number;
    let v: number;
    if (ay >= ax && ay >= az) {
      u = x;
      v = z;
    } else if (ax >= az) {
      u = z;
      v = y;
    } else {
      u = x;
      v = y;
    }
    uv[i * 2] = u / tile;
    uv[i * 2 + 1] = v / tile;
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
}

function finish(group: Group, mat: string, g: THREE.BufferGeometry, m: THREE.Matrix4) {
  let geo = g.index ? g.toNonIndexed() : g;
  geo.applyMatrix4(m);
  geo.deleteAttribute("uv1");
  if (!geo.getAttribute("normal")) geo.computeVertexNormals();
  const def = MATS[mat];
  if (!def) throw new Error(`Unknown material ${mat}`);
  if (!def.unitUV) worldUV(geo, def.tile ?? 1);
  else if (!geo.getAttribute("uv")) worldUV(geo, 1);
  // keep only the attributes we export
  for (const k of Object.keys(geo.attributes)) if (!["position", "normal", "uv"].includes(k)) geo.deleteAttribute(k);
  geo = geo.index ? geo.toNonIndexed() : geo;
  group.add(mat, geo);
}

/** Places parts in a local frame: +x along the piece, +z = the direction it faces. */
export class Placer {
  base: THREE.Matrix4;
  constructor(
    public group: Group,
    x: number,
    z: number,
    rotY = 0,
    y = 0,
  ) {
    this.base = new THREE.Matrix4().makeTranslation(x, y, z).multiply(new THREE.Matrix4().makeRotationY(rotY));
  }
  private m(p: V3, rot?: V3): THREE.Matrix4 {
    const local = new THREE.Matrix4().makeTranslation(p[0], p[1], p[2]);
    if (rot) local.multiply(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rot[0], rot[1], rot[2], "YXZ")));
    return this.base.clone().multiply(local);
  }
  box(mat: string, p: V3, s: V3, r = 0, rot?: V3) {
    const g =
      r > 0
        ? new RoundedBoxGeometry(s[0], s[1], s[2], 2, Math.min(r, Math.min(...s) / 2 - 1e-4))
        : new THREE.BoxGeometry(s[0], s[1], s[2]);
    finish(this.group, mat, g, this.m(p, rot));
    return this;
  }
  cyl(mat: string, p: V3, rTop: number, rBot: number, h: number, seg = 20, rot?: V3, open = false) {
    finish(this.group, mat, new THREE.CylinderGeometry(rTop, rBot, h, seg, 1, open), this.m(p, rot));
    return this;
  }
  sphere(mat: string, p: V3, r: number, scale: V3 = [1, 1, 1], detail = 12, rot?: V3) {
    const g = new THREE.SphereGeometry(r, detail * 2, detail);
    g.scale(scale[0], scale[1], scale[2]);
    finish(this.group, mat, g, this.m(p, rot));
    return this;
  }
  ico(mat: string, p: V3, r: number, scale: V3 = [1, 1, 1], detail = 1) {
    const g = new THREE.IcosahedronGeometry(r, detail);
    g.scale(scale[0], scale[1], scale[2]);
    finish(this.group, mat, g, this.m(p));
    return this;
  }
  torus(mat: string, p: V3, R: number, t: number, rot?: V3, arc = Math.PI * 2, seg = 32) {
    finish(this.group, mat, new THREE.TorusGeometry(R, t, 8, seg, arc), this.m(p, rot));
    return this;
  }
  lathe(mat: string, p: V3, pts: [number, number][], seg = 28, scale: V3 = [1, 1, 1]) {
    const g = new THREE.LatheGeometry(
      pts.map(([r, y]) => new THREE.Vector2(r, y)),
      seg,
    );
    g.scale(scale[0], scale[1], scale[2]);
    finish(this.group, mat, g, this.m(p));
    return this;
  }
  /** A plane facing local +z with 0..1 UVs (for artworks, screens). */
  plane(mat: string, p: V3, w: number, h: number, rot?: V3) {
    finish(this.group, mat, new THREE.PlaneGeometry(w, h), this.m(p, rot));
    return this;
  }
}

/** Merge a group's geometries per material (positions relative to the group origin). */
export function mergedPrimitives(group: Group) {
  const out: { mat: string; geo: THREE.BufferGeometry }[] = [];
  for (const [mat, list] of group.geos) {
    let g = mergeGeometries(list, false);
    if (!g) throw new Error(`merge failed for ${group.name}/${mat}`);
    g.translate(-group.origin[0], -group.origin[1], -group.origin[2]);
    g = mergeVertices(g, 1e-4);
    out.push({ mat, geo: g });
  }
  return out;
}

export const srgbToLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
export function hexLinear(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [srgbToLinear(((n >> 16) & 255) / 255), srgbToLinear(((n >> 8) & 255) / 255), srgbToLinear((n & 255) / 255)];
}

/** Deterministic PRNG for layout jitter. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
