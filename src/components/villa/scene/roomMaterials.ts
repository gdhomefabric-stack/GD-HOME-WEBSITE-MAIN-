import * as THREE from "three";
import MATERIALS from "@/data/roomMaterials.json";
import { getKTX2Loader } from "./sceneState";

/**
 * Materials for the Blender-baked rooms.
 *
 * Geometry arrives with material names only. Each material is rebuilt here from
 * src/data/roomMaterials.json (the same definitions Blender rendered with) and the
 * shared KTX2 texture sets, then patched to take its lighting from the bake:
 *
 *  - static surfaces read two lightmaps per lighting preset: `amb` (sky + bounce) and
 *    `sun` (direct sunlight). Presets cross-fade (A → B). The sun term is masked per
 *    pixel by tracing towards the sun to the window plane: where the curtains cover
 *    the opening only the fabric's transmission gets through, so the sun patch on the
 *    floor narrows as the curtains close.
 *  - props (small decor) carry the same lighting per vertex.
 *  - reflections come from the room's HDR light probe, occluded by the lightmap.
 */

export interface MatDef {
  tex?: string;
  color?: string;
  rough?: number;
  roughMean?: number;
  roughMap?: boolean;
  tile?: number;
  normal?: number;
  metal?: number;
  sheen?: { color: string; rough: number };
  emissive?: string;
  glass?: boolean;
  uv01?: boolean;
  double?: boolean;
  translucent?: number;
}

export const MATERIAL_DEFS = MATERIALS as Record<string, MatDef>;

/* ---------------------------------------------------------------- shared lighting uniforms */

export const MAX_WINDOWS = 2;

/** One set of uniforms shared by every room material; the lighting rig animates them. */
export const lmUniforms = {
  lmAmbA: { value: null as THREE.Texture | null },
  lmAmbB: { value: null as THREE.Texture | null },
  lmSunA: { value: null as THREE.Texture | null },
  lmSunB: { value: null as THREE.Texture | null },
  /** x: amb A scale, y: amb B scale, z: sun A scale, w: sun B scale */
  lmScale: { value: new THREE.Vector4(1, 1, 0, 0) },
  /** 0 = preset A, 1 = preset B */
  lmMix: { value: 0 },
  /** daylight through the windows: 1 all open, ~0.05 all closed with blackout */
  lmDaylight: { value: new THREE.Vector2(1, 1) },
  /** direction towards the sun for presets A and B (three axes) */
  sunDirA: { value: new THREE.Vector3(0, 1, 0) },
  sunDirB: { value: new THREE.Vector3(0, 1, 0) },
  /** per window: x0, x1 (track extent along x), sill, head */
  winRect: { value: Array.from({ length: MAX_WINDOWS }, () => new THREE.Vector4()) },
  /** per window: left cover, right cover (metres from each track end), transmission, glass plane z */
  winCover: { value: Array.from({ length: MAX_WINDOWS }, () => new THREE.Vector4(0, 0, 1, 0)) },
  /** tint of light passing through the fabric */
  winTint: { value: Array.from({ length: MAX_WINDOWS }, () => new THREE.Color(1, 1, 1)) },
  winCount: { value: 0 },
  /** props: vertex lighting scale per preset A/B, and which vertex set (0 day, 1 sunset, 2 night) */
  propScale: { value: new THREE.Vector2(1, 1) },
  propSet: { value: new THREE.Vector2(0, 0) },
  /** luminance at which reflections are fully unoccluded */
  specRef: { value: 0.35 },
};

/* ---------------------------------------------------------------- textures */

const texCache = new Map<string, Promise<THREE.Texture>>();
const webpLoader = new THREE.TextureLoader();

function loadTexture(gl: THREE.WebGLRenderer, url: string, srgb: boolean): Promise<THREE.Texture> {
  const key = `${url}|${srgb}`;
  let p = texCache.get(key);
  if (!p) {
    const loader = url.endsWith(".webp") ? webpLoader : getKTX2Loader(gl);
    p = loader
      .loadAsync(url)
      .then((t) => {
        // KTX2 textures are stored top-down; keep WebP the same way round
        t.flipY = false;
        t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
        return t;
      });
    texCache.set(key, p);
  }
  return p;
}

const texUrl = (set: string, map: string) => `/textures/room/${set}_${map}.${map === "normal" ? "webp" : "ktx2"}`;

interface TexSet {
  map?: THREE.Texture;
  normal?: THREE.Texture;
  rough?: THREE.Texture;
}

async function textureSet(gl: THREE.WebGLRenderer, d: MatDef): Promise<TexSet> {
  if (!d.tex) return {};
  const tile = d.uv01 ? 1 : d.tile ?? 1;
  const tiled = (t: THREE.Texture) => {
    if (tile === 1) return t;
    const c = t.clone();
    c.repeat.set(1 / tile, 1 / tile);
    c.needsUpdate = true;
    return c;
  };
  if (d.uv01) return { map: await loadTexture(gl, texUrl(d.tex, "albedo"), true) };
  const [map, normal, rough] = await Promise.all([
    loadTexture(gl, texUrl(d.tex, "albedo"), true),
    loadTexture(gl, texUrl(d.tex, "normal"), false),
    d.roughMap === false ? Promise.resolve(undefined) : loadTexture(gl, texUrl(d.tex, "rough"), false),
  ]);
  return { map: tiled(map), normal: tiled(normal), rough: rough && tiled(rough) };
}

/** Preloads the texture sets of a list of materials (called while a room streams in). */
export function preloadMaterials(gl: THREE.WebGLRenderer, names: Iterable<string>) {
  return Promise.all([...names].map((n) => (MATERIAL_DEFS[n] ? textureSet(gl, MATERIAL_DEFS[n]) : null)));
}

/* ---------------------------------------------------------------- shader patches */

const COMMON = /* glsl */ `
uniform sampler2D lmAmbA;
uniform sampler2D lmAmbB;
uniform sampler2D lmSunA;
uniform sampler2D lmSunB;
uniform vec4 lmScale;
uniform float lmMix;
uniform vec2 lmDaylight;
uniform vec3 sunDirA;
uniform vec3 sunDirB;
uniform vec4 winRect[${MAX_WINDOWS}];
uniform vec4 winCover[${MAX_WINDOWS}];
uniform vec3 winTint[${MAX_WINDOWS}];
uniform int winCount;
uniform float specRef;
varying vec3 vLmWorld;

// How much direct sun reaches this point through the curtains, tracing towards the sun.
vec3 sunThrough( vec3 p, vec3 d ) {
	vec3 through = vec3( 1.0 );
	for ( int i = 0; i < ${MAX_WINDOWS}; i ++ ) {
		if ( i >= winCount ) break;
		vec4 r = winRect[ i ];
		vec4 c = winCover[ i ];
		float t = ( c.w - p.z ) / ( abs( d.z ) > 1e-4 ? d.z : 1e-4 );
		if ( t <= 0.0 ) continue;
		vec3 q = p + d * t;
		float inside = step( r.z - 0.05, q.y ) * step( q.y, r.w + 0.05 ) * step( r.x - 0.05, q.x ) * step( q.x, r.y + 0.05 );
		if ( inside < 0.5 ) continue;
		// covered from the left track end up to x0 + c.x, and from x1 - c.y to the right end
		float coverL = 1.0 - smoothstep( r.x + c.x - 0.03, r.x + c.x + 0.03, q.x );
		float coverR = smoothstep( r.y - c.y - 0.03, r.y - c.y + 0.03, q.x );
		float cover = max( coverL, coverR );
		through = mix( vec3( 1.0 ), winTint[ i ] * c.z, cover );
	}
	return through;
}
`;

const VERT_DECL = /* glsl */ `
attribute vec2 uv1;
varying vec2 vLmUv;
varying vec3 vLmWorld;
`;
const VERT_BODY = /* glsl */ `
vLmUv = uv1;
vLmWorld = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;
`;

// baked surfaces take all their light from the bake: drop any real-time direct light
// (the window area lights exist only to model the curtain folds)
const NO_DIRECT = /* glsl */ `
reflectedLight.directDiffuse = vec3( 0.0 );
reflectedLight.directSpecular = vec3( 0.0 );
`;

const FRAG_STATIC = /* glsl */ `
#if defined( RE_IndirectDiffuse )
	vec3 lmAmb = mix( texture2D( lmAmbA, vLmUv ).rgb * lmScale.x * lmDaylight.x, texture2D( lmAmbB, vLmUv ).rgb * lmScale.y * lmDaylight.y, lmMix );
	vec3 lmSun = mix(
		texture2D( lmSunA, vLmUv ).rgb * lmScale.z * sunThrough( vLmWorld, sunDirA ),
		texture2D( lmSunB, vLmUv ).rgb * lmScale.w * sunThrough( vLmWorld, sunDirB ),
		lmMix );
	vec3 lmIrr = ( lmAmb + lmSun ) * PI;
	iblIrradiance += lmIrr;
	float specOcc = clamp( dot( lmIrr, vec3( 0.2126, 0.7152, 0.0722 ) ) / ( specRef * PI ), 0.12, 1.0 );
#else
	float specOcc = 1.0;
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness ) * specOcc;
#endif
`;

const VERT_PROP_DECL = /* glsl */ `
attribute vec3 lmDay;
attribute vec3 lmSunset;
attribute vec3 lmNight;
uniform vec2 propSet;
varying vec3 vPropA;
varying vec3 vPropB;
varying vec3 vLmWorld;
vec3 propPick( float s ) { return s < 0.5 ? lmDay : ( s < 1.5 ? lmSunset : lmNight ); }
`;
const VERT_PROP_BODY = /* glsl */ `
vPropA = propPick( propSet.x );
vPropB = propPick( propSet.y );
vLmWorld = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;
`;
const FRAG_PROP = /* glsl */ `
#if defined( RE_IndirectDiffuse )
	vec3 pIrr = mix( vPropA * propScale.x * lmDaylight.x, vPropB * propScale.y * lmDaylight.y, lmMix ) * PI;
	iblIrradiance += pIrr;
	float specOcc = clamp( dot( pIrr, vec3( 0.2126, 0.7152, 0.0722 ) ) / ( specRef * PI ), 0.15, 1.0 );
#else
	float specOcc = 1.0;
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness ) * specOcc;
#endif
`;

type Kind = "static" | "prop";

function patch(m: THREE.MeshStandardMaterial, kind: Kind) {
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, lmUniforms);
    if (kind === "prop") shader.uniforms.propScale = lmUniforms.propScale;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${kind === "static" ? VERT_DECL : VERT_PROP_DECL}`)
      .replace("#include <fog_vertex>", `#include <fog_vertex>\n${kind === "static" ? VERT_BODY : VERT_PROP_BODY}`);
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>\n${COMMON}\n${kind === "static" ? "varying vec2 vLmUv;" : "varying vec3 vPropA;\nvarying vec3 vPropB;\nuniform vec2 propScale;"}`,
      )
      .replace("#include <lights_fragment_maps>", NO_DIRECT + (kind === "static" ? FRAG_STATIC : FRAG_PROP));
  };
  m.customProgramCacheKey = () => `room-${kind}-${m.type}`;
}

/* ---------------------------------------------------------------- factory */

const lin = (hex: string) => new THREE.Color(hex);

export interface RoomMaterialOptions {
  quality: "high" | "lite";
  envMap: THREE.Texture | null;
}

/** Emissive materials driven by the lighting preset (lamp shades, bulbs, fire, screen). */
export const EMISSIVE = new Set(["shade", "bulb", "fire", "screen"]);

export async function createRoomMaterial(
  gl: THREE.WebGLRenderer,
  name: string,
  kind: Kind | "glass",
  o: RoomMaterialOptions,
): Promise<THREE.Material> {
  const d = MATERIAL_DEFS[name] ?? { color: "#cccccc", rough: 0.8 };
  if (d.glass || kind === "glass") {
    return new THREE.MeshPhysicalMaterial({
      name,
      color: lin(d.color ?? "#ffffff"),
      roughness: d.rough ?? 0.02,
      metalness: 0,
      transparent: true,
      opacity: name === "water" ? 0.35 : 0.08,
      envMap: o.envMap,
      envMapIntensity: 1.2,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
  }
  const t = await textureSet(gl, d);
  const params: THREE.MeshPhysicalMaterialParameters = {
    name,
    color: lin(d.color ?? "#ffffff"),
    map: t.map ?? null,
    normalMap: t.normal ?? null,
    normalScale: new THREE.Vector2(d.normal ?? 1, d.normal ?? 1),
    roughnessMap: t.rough ?? null,
    // rough maps average roughMean; scale so the material averages its roughness
    roughness: t.rough ? (d.rough ?? 0.8) / (d.roughMean ?? 0.85) : d.rough ?? 0.8,
    metalness: d.metal ?? 0,
    envMap: o.envMap,
    envMapIntensity: 1,
    side: d.double ? THREE.DoubleSide : THREE.FrontSide,
  };
  if (d.emissive) {
    params.emissive = lin(d.emissive);
    params.emissiveIntensity = 0;
    if (d.uv01 && t.map) params.emissiveMap = t.map;
  }
  let m: THREE.MeshStandardMaterial;
  if (o.quality === "high" && d.sheen) {
    const pm = new THREE.MeshPhysicalMaterial(params);
    pm.sheen = 1;
    pm.sheenColor = lin(d.sheen.color);
    pm.sheenRoughness = d.sheen.rough;
    m = pm;
  } else {
    delete params.sheen;
    m = new THREE.MeshStandardMaterial(params as THREE.MeshStandardMaterialParameters);
  }
  patch(m, kind);
  return m;
}
