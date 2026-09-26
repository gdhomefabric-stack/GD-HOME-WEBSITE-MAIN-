"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import {
  LINING_BY_ID,
  PLEAT_BY_ID,
  PRODUCT_BY_ID,
  colourOf,
  curtainTransmission,
} from "@/data/catalog";
import { ROD_HEIGHT, facadeInnerZ, type WindowSpec } from "@/data/villa";
import { hemHeight } from "@/lib/pricing";
import { effectiveCurtain, useVilla } from "@/store/villa";
import { CurtainCloth } from "./curtainCloth";
import { COLOUR_LIFT, createFabricMaterial, createLiningMaterial, type FabricTextures } from "./fabrics";
import { curtainLive, damp, dampColor, colorDistance, lightLive, wallScale } from "./sceneState";

const brass = new THREE.MeshStandardMaterial({ color: "#c8a26a", metalness: 1, roughness: 0.3 });
const track = new THREE.MeshStandardMaterial({ color: "#2b2825", metalness: 0.5, roughness: 0.45 });
const ringGeo = new THREE.TorusGeometry(0.03, 0.0045, 6, 18).rotateY(Math.PI / 2);
const eyeletGeo = new THREE.TorusGeometry(0.026, 0.006, 6, 18).rotateY(Math.PI / 2);
const MAX_RINGS = 110;
const DEPTH = 0.15;
const _m = new THREE.Matrix4();
const _white = new THREE.Color("#ffffff");
const _gold = new THREE.Color("#c9a24b");
const _tint = new THREE.Color();

/* ---------- light patch on the floor + soft shaft ---------- */

const patchVertex = /* glsl */ `
  uniform float uWidth; uniform float uLength; uniform float uSkew; uniform float uStart;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 p = vec3((uv.x - 0.5) * uWidth + uv.y * uLength * uSkew, 0.006, uStart + uv.y * uLength);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }`;
const patchFragment = /* glsl */ `
  uniform vec3 uColor; uniform float uIntensity;
  varying vec2 vUv;
  void main() {
    float edge = smoothstep(0.0, 0.14, vUv.x) * smoothstep(1.0, 0.86, vUv.x);
    float along = smoothstep(0.0, 0.08, vUv.y) * pow(1.0 - vUv.y, 1.4);
    float a = edge * along * uIntensity;
    gl_FragColor = vec4(uColor * a, 1.0);
  }`;
const shaftVertex = /* glsl */ `
  uniform float uWidth; uniform float uLength; uniform float uSkew; uniform float uTop; uniform float uBottom;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    float x = (uv.x - 0.5) * uWidth + uv.y * uLength * uSkew;
    float y = mix(mix(uTop, uBottom, 0.5), 0.02, uv.y);
    float z = 0.05 + uv.y * uLength;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(x, y, z, 1.0);
  }`;
const shaftFragment = /* glsl */ `
  uniform vec3 uColor; uniform float uIntensity;
  varying vec2 vUv;
  void main() {
    float edge = smoothstep(0.0, 0.3, vUv.x) * smoothstep(1.0, 0.7, vUv.x);
    float a = edge * pow(1.0 - vUv.y, 2.0) * uIntensity;
    gl_FragColor = vec4(uColor * a, 1.0);
  }`;

function makeLightMaterial(vertex: string, fragment: string, extra: Record<string, THREE.IUniform> = {}) {
  return new THREE.ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    uniforms: {
      uColor: { value: new THREE.Color() },
      uIntensity: { value: 0 },
      uWidth: { value: 1 },
      uLength: { value: 2.5 },
      uSkew: { value: 0 },
      uStart: { value: 0.08 },
      ...extra,
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    toneMapped: true,
  });
}

const quad = new THREE.PlaneGeometry(1, 1, 1, 1);

interface Props {
  win: WindowSpec;
  tex: FabricTextures;
}

export function WindowDressing({ win, tex }: Props) {
  const cfg = useVilla((s) => effectiveCurtain(s, win.id));
  const openTarget = useVilla((s) =>
    s.override?.windowId === win.id && s.override.open !== undefined ? s.override.open : s.open[win.id],
  );
  const instant = useVilla((s) => s.instant);
  const quality = useVilla((s) => s.quality) ?? "lite";
  const mode = useVilla((s) => s.mode);
  const roomId = useVilla((s) => s.roomId);
  const selected = useVilla((s) => s.windowId === win.id);
  const hovered = useVilla((s) => s.hoverWindow === win.id);

  const product = PRODUCT_BY_ID[cfg.productId];
  const pleat = PLEAT_BY_ID[cfg.pleat];
  const lining = LINING_BY_ID[cfg.lining];
  const targetColour = useMemo(() => new THREE.Color(colourOf(cfg).hex), [cfg]);
  const transmission = curtainTransmission(cfg);

  const trackWidth = win.width + 0.5;
  const top = cfg.pleat === "eyelet" ? ROD_HEIGHT + 0.04 : cfg.pleat === "wave" ? ROD_HEIGHT + 0.035 : ROD_HEIGHT - 0.05;
  const hem = hemHeight(cfg.length, win.sill);

  const cloths = useMemo(
    () =>
      ([-1, 1] as const).map(
        (side) =>
          new CurtainCloth({
            side,
            trackWidth,
            top,
            hem,
            fullness: pleat.fullness,
            pleat: cfg.pleat,
            depth: DEPTH,
          }),
      ),
    [trackWidth, top, hem, pleat.fullness, cfg.pleat],
  );
  useEffect(() => () => cloths.forEach((c) => c.dispose()), [cloths]);

  const face = useMemo(
    () => createFabricMaterial(product.kind, tex, quality, product.thread),
    [product.kind, tex, quality, product.thread],
  );
  const back = useMemo(() => {
    if (product.kind === "sheer") return null;
    if (cfg.lining !== "unlined") return createLiningMaterial(lining.hex);
    const b = new THREE.MeshStandardMaterial({
      map: tex[product.kind].detail,
      roughness: 0.9,
      side: THREE.BackSide,
    });
    return b;
  }, [product.kind, cfg.lining, lining.hex, tex]);
  useEffect(() => () => face.dispose(), [face]);
  useEffect(() => () => back?.dispose(), [back]);

  const patchMat = useMemo(() => makeLightMaterial(patchVertex, patchFragment), []);
  const shaftMat = useMemo(
    () => makeLightMaterial(shaftVertex, shaftFragment, { uTop: { value: win.head }, uBottom: { value: win.sill } }),
    [win.head, win.sill],
  );

  const group = useRef<THREE.Group>(null);
  const rings = useRef<THREE.InstancedMesh>(null);
  const anim = useRef({
    top: openTarget,
    bottom: openTarget,
    colour: targetColour.clone(),
    cloths: null as CurtainCloth[] | null,
    face: null as THREE.Material | null,
    appliedTop: -1,
    appliedBottom: -1,
  });

  const zInner = facadeInnerZ(win.facade);
  const rotY = win.facade === "N" ? 0 : Math.PI;
  const isEyelet = cfg.pleat === "eyelet";
  const isWave = cfg.pleat === "wave";

  useFrame((state, dt) => {
    const a = anim.current;
    let moving = false;
    if (instant) {
      a.top = openTarget;
      a.bottom = openTarget;
    } else {
      a.top = damp(a.top, openTarget, 3.4, dt);
      a.bottom = damp(a.bottom, openTarget, 2.3, dt);
    }
    if (Math.abs(a.top - openTarget) > 0.0015 || Math.abs(a.bottom - openTarget) > 0.0015) moving = true;
    else {
      a.top = openTarget;
      a.bottom = openTarget;
    }
    const clothChanged = a.cloths !== cloths || a.appliedTop !== a.top || a.appliedBottom !== a.bottom;
    if (clothChanged) {
      a.cloths = cloths;
      a.appliedTop = a.top;
      a.appliedBottom = a.bottom;
      cloths.forEach((c) => c.update(a.top, a.bottom));
      const r = rings.current;
      if (r) {
        let n = 0;
        const y = isEyelet ? top - 0.045 : ROD_HEIGHT - 0.005;
        for (const c of cloths)
          for (const x of c.ringX) {
            if (n >= MAX_RINGS) break;
            _m.makeTranslation(x, y, DEPTH);
            r.setMatrixAt(n++, _m);
          }
        r.count = n;
        r.instanceMatrix.needsUpdate = true;
      }
    }

    // colour
    if (instant || a.face !== face) a.colour.copy(targetColour);
    else dampColor(a.colour, targetColour, 7, dt);
    a.face = face;
    if (colorDistance(a.colour, targetColour) > 0.002) moving = true;
    face.color.copy(a.colour).multiplyScalar(COLOUR_LIFT);
    if (back && cfg.lining === "unlined") (back as THREE.MeshStandardMaterial).color.copy(a.colour).multiplyScalar(0.9);
    if (face instanceof THREE.MeshPhysicalMaterial && face.sheen > 0) face.sheenColor.copy(a.colour).lerp(_white, 0.5);

    // transmitted daylight makes thin fabrics glow from within
    const openAvg = (a.top + a.bottom) / 2;
    curtainLive[win.id] = { open: openAvg, transmission, color: a.colour };
    const glowK = product.kind === "sheer" ? 0.55 : 0.4;
    const glow = lightLive.daylight * transmission * (1 - openAvg * 0.55) * glowK;
    face.emissive.copy(lightLive.windowColor).multiplyScalar(glow);
    const highlight = hovered && mode !== "overview" ? 0.05 : 0;
    if (highlight) face.emissive.lerp(_gold, 0.35).addScalar(highlight);

    // follow the wall when the dollhouse folds the facade down
    const ws = wallScale[win.facade];
    if (group.current) {
      group.current.scale.y = ws;
      group.current.visible = ws > 0.22;
    }

    // floor patch + shaft: daylight let through by the opening and the fabric
    const through = openAvg + (1 - openAvg) * transmission;
    const inRoom = lightLive.interior * (roomId === win.roomId ? 1 : 0.55);
    const tint = _tint.copy(lightLive.windowColor).lerp(a.colour, (1 - openAvg) * 0.55 * Math.min(1, transmission * 3));
    const pu = patchMat.uniforms;
    pu.uColor.value.copy(tint);
    pu.uIntensity.value = 0.5 * lightLive.daylight * through * inRoom * ws;
    pu.uWidth.value = win.width * (0.55 + 0.45 * openAvg + 0.35 * (1 - openAvg) * transmission);
    pu.uLength.value = lightLive.patchLength * (win.head - win.sill) / 2.6;
    pu.uSkew.value = lightLive.patchSkew * (win.facade === "N" ? 1 : -1);
    const su = shaftMat.uniforms;
    su.uColor.value.copy(tint);
    su.uIntensity.value = 0.07 * lightLive.daylight * through * inRoom * (quality === "high" ? 1 : 0.6);
    su.uWidth.value = pu.uWidth.value;
    su.uLength.value = pu.uLength.value;
    su.uSkew.value = pu.uSkew.value;

    if (moving) state.invalidate();
  });

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 6) return;
    e.stopPropagation();
    const s = useVilla.getState();
    if (s.mode === "overview") s.enterRoom(win.roomId);
    else if (s.windowId === win.id && (s.mode === "window" || s.mode === "closeup")) s.toggleOpen(win.id);
    else s.selectWindow(win.id);
  };
  const onOver = (e: ThreeEvent<PointerEvent>) => {
    if (useVilla.getState().mode === "overview") return;
    e.stopPropagation();
    useVilla.getState().setHoverWindow(win.id);
    document.body.style.cursor = "pointer";
  };
  const onOut = () => {
    if (useVilla.getState().hoverWindow === win.id) useVilla.getState().setHoverWindow(null);
    document.body.style.cursor = "";
  };

  const rodLen = trackWidth + 0.26;
  return (
    <group position={[win.x, 0, zInner]} rotation={[0, rotY, 0]}>
      <group ref={group}>
        {cloths.map((c, i) => (
          <group key={i}>
            <mesh
              geometry={c.geometry}
              material={face}
              castShadow={quality === "high" && product.kind !== "sheer"}
              receiveShadow={quality === "high"}
              onClick={onClick}
              onPointerOver={onOver}
              onPointerOut={onOut}
            />
            {back && <mesh geometry={c.geometry} material={back} castShadow={false} />}
          </group>
        ))}
        {isWave ? (
          <mesh position={[0, ROD_HEIGHT + 0.07, DEPTH]} material={track}>
            <boxGeometry args={[trackWidth + 0.08, 0.035, 0.06]} />
          </mesh>
        ) : (
          <group>
            <mesh position={[0, ROD_HEIGHT, DEPTH]} rotation={[0, 0, Math.PI / 2]} material={brass}>
              <cylinderGeometry args={[0.017, 0.017, rodLen, 12]} />
            </mesh>
            {[-1, 1].map((s) => (
              <group key={s}>
                <mesh position={[s * (rodLen / 2 + 0.03), ROD_HEIGHT, DEPTH]} material={brass}>
                  <sphereGeometry args={[0.038, 16, 12]} />
                </mesh>
                <mesh position={[s * (rodLen / 2 - 0.12), ROD_HEIGHT, DEPTH / 2]} material={brass}>
                  <boxGeometry args={[0.03, 0.03, DEPTH]} />
                </mesh>
              </group>
            ))}
            <mesh position={[0, ROD_HEIGHT, DEPTH / 2]} material={brass}>
              <boxGeometry args={[0.03, 0.03, DEPTH]} />
            </mesh>
          </group>
        )}
        {!isWave && (
          <instancedMesh
            ref={rings}
            args={[isEyelet ? eyeletGeo : ringGeo, brass, MAX_RINGS]}
            frustumCulled={false}
            key={cfg.pleat}
          />
        )}
      </group>
      {/* daylight on the floor and a faint shaft through the air */}
      <mesh geometry={quad} material={patchMat} frustumCulled={false} renderOrder={2} />
      {(quality === "high" || selected) && (
        <mesh geometry={quad} material={shaftMat} frustumCulled={false} renderOrder={3} />
      )}
    </group>
  );
}
