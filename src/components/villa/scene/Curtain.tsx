"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import { LINING_BY_ID, PLEAT_BY_ID, PRODUCT_BY_ID, colourOf, curtainTransmission } from "@/data/catalog";
import { ROD_HEIGHT, facadeInnerZ, type WindowSpec } from "@/data/villa";
import { hemHeight } from "@/lib/pricing";
import { effectiveCurtain, useVilla, type Lighting } from "@/store/villa";
import { CurtainCloth } from "./curtainCloth";
import { COLOUR_LIFT, createFabricMaterial, createLiningMaterial, type FabricTextures } from "./fabrics";
import { colorDistance, curtainLive, damp, dampColor } from "./sceneState";

const brass = new THREE.MeshStandardMaterial({ color: "#c8a26a", metalness: 1, roughness: 0.3 });
const track = new THREE.MeshStandardMaterial({ color: "#2b2825", metalness: 0.5, roughness: 0.45 });
const ringGeo = new THREE.TorusGeometry(0.03, 0.0045, 8, 24).rotateY(Math.PI / 2);
const eyeletGeo = new THREE.TorusGeometry(0.026, 0.006, 8, 24).rotateY(Math.PI / 2);
const MAX_RINGS = 110;
const DEPTH = 0.15;
const _m = new THREE.Matrix4();
const _gold = new THREE.Color("#c9a24b");
const _sky = new THREE.Color();

/** Daylight behind the curtains per preset: glow of thin fabrics and the window light. */
const DAYLIGHT: Record<Lighting, { k: number; color: string; window: number }> = {
  day: { k: 1, color: "#fff4e4", window: 0.8 },
  sunset: { k: 0.75, color: "#ffc38a", window: 0.55 },
  night: { k: 0, color: "#8aa0c8", window: 0.05 },
};

let rectInit = false;

interface Props {
  win: WindowSpec;
  tex: FabricTextures;
  env: Record<Lighting, THREE.Texture>;
}

export function WindowDressing({ win, tex, env }: Props) {
  const cfg = useVilla((s) => effectiveCurtain(s, win.id));
  const openTarget = useVilla((s) =>
    s.override?.windowId === win.id && s.override.open !== undefined ? s.override.open : s.open[win.id],
  );
  const instant = useVilla((s) => s.instant);
  const quality = useVilla((s) => s.quality) ?? "lite";
  const lighting = useVilla((s) => s.lighting);
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
          new CurtainCloth({ side, trackWidth, top, hem, fullness: pleat.fullness, pleat: cfg.pleat, depth: DEPTH }),
      ),
    [trackWidth, top, hem, pleat.fullness, cfg.pleat],
  );
  useEffect(() => () => cloths.forEach((c) => c.dispose()), [cloths]);

  const face = useMemo(() => {
    const m = createFabricMaterial(product.kind, tex, quality, product.thread);
    m.vertexColors = true; // fold shading
    return m;
  }, [product.kind, tex, quality, product.thread]);
  const back = useMemo(() => {
    if (product.kind === "sheer") return null;
    if (cfg.lining !== "unlined") return createLiningMaterial(lining.hex);
    return new THREE.MeshStandardMaterial({ map: tex[product.kind].detail, roughness: 0.9, side: THREE.BackSide });
  }, [product.kind, cfg.lining, lining.hex, tex]);
  useEffect(() => () => face.dispose(), [face]);
  useEffect(() => () => back?.dispose(), [back]);

  // the room's light probe lights the fabric (and the brass)
  useEffect(() => {
    for (const m of [face, back, brass, track]) {
      if (!m) continue;
      (m as THREE.MeshStandardMaterial).envMap = env[lighting];
      // the probe is taken mid-room; cloth against the wall sees less of the room's light
      (m as THREE.MeshStandardMaterial).envMapIntensity = m === face ? 0.65 : 1;
      m.needsUpdate = true;
    }
  }, [face, back, env, lighting]);

  if (!rectInit) {
    RectAreaLightUniformsLib.init();
    rectInit = true;
  }
  const windowLight = useRef<THREE.RectAreaLight>(null);
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
    daylight: DAYLIGHT[lighting].k,
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
    if (a.cloths !== cloths || a.appliedTop !== a.top || a.appliedBottom !== a.bottom) {
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

    if (instant || a.face !== face) a.colour.copy(targetColour);
    else dampColor(a.colour, targetColour, 7, dt);
    a.face = face;
    if (colorDistance(a.colour, targetColour) > 0.002) moving = true;
    face.color.copy(a.colour).multiplyScalar(COLOUR_LIFT);
    if (back && cfg.lining === "unlined") (back as THREE.MeshStandardMaterial).color.copy(a.colour).multiplyScalar(0.9);
    if (face instanceof THREE.MeshPhysicalMaterial && face.sheen > 0) face.sheenColor.copy(a.colour).lerp(new THREE.Color(1, 1, 1), 0.5);

    // daylight behind thin fabric makes it glow from within
    const dl = DAYLIGHT[lighting];
    const nd = instant ? dl.k : damp(a.daylight, dl.k, 2.5, dt);
    if (Math.abs(nd - a.daylight) > 1e-3) moving = true;
    a.daylight = nd;
    const openAvg = (a.top + a.bottom) / 2;
    curtainLive[win.id] = { open: openAvg, transmission, color: a.colour };
    // soft light from the window opening models the folds that face it
    const wl = windowLight.current;
    if (wl) {
      wl.color.set(dl.color);
      wl.intensity = dl.window * (a.daylight / Math.max(dl.k, 1e-3) || 0) + (lighting === "night" ? dl.window : 0);
    }
    const glowK = product.kind === "sheer" ? 0.4 : 0.24;
    const glow = a.daylight * transmission * (1 - openAvg * 0.6) * glowK;
    face.emissive.copy(_sky.set(dl.color)).multiply(a.colour.clone().lerp(new THREE.Color(1, 1, 1), 0.4)).multiplyScalar(glow);
    if (hovered) face.emissive.lerp(_gold, 0.25).addScalar(0.03);

    if (moving) state.invalidate();
  });

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 6) return;
    e.stopPropagation();
    const s = useVilla.getState();
    if (s.windowId === win.id && (s.mode === "window" || s.mode === "closeup")) s.toggleOpen(win.id);
    else s.selectWindow(win.id);
  };
  const onOver = (e: ThreeEvent<PointerEvent>) => {
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
      {/* the window opening as a soft area light, shining into the room (lights emit along -Z) */}
      <rectAreaLight
        ref={windowLight}
        position={[0, (win.sill + win.head) / 2, -0.02]}
        rotation={[0, Math.PI, 0]}
        width={win.width}
        height={win.head - win.sill}
        intensity={0}
      />
      <group ref={group}>
        {cloths.map((c, i) => (
          <group key={i}>
            <mesh geometry={c.geometry} material={face} onClick={onClick} onPointerOver={onOver} onPointerOut={onOut} />
            {back && <mesh geometry={c.geometry} material={back} />}
          </group>
        ))}
        {isWave ? (
          <mesh position={[0, ROD_HEIGHT + 0.07, DEPTH]} material={track}>
            <boxGeometry args={[trackWidth + 0.08, 0.035, 0.06]} />
          </mesh>
        ) : (
          <group>
            <mesh position={[0, ROD_HEIGHT, DEPTH]} rotation={[0, 0, Math.PI / 2]} material={brass}>
              <cylinderGeometry args={[0.017, 0.017, rodLen, 20]} />
            </mesh>
            {[-1, 1].map((s) => (
              <group key={s}>
                <mesh position={[s * (rodLen / 2 + 0.03), ROD_HEIGHT, DEPTH]} material={brass}>
                  <sphereGeometry args={[0.038, 24, 16]} />
                </mesh>
                <mesh position={[s * (rodLen / 2 - 0.12), ROD_HEIGHT, DEPTH / 2]} material={brass}>
                  <boxGeometry args={[0.03, 0.03, DEPTH]} />
                </mesh>
                <mesh position={[s * (rodLen / 2 - 0.12), ROD_HEIGHT, 0.006]} rotation={[Math.PI / 2, 0, 0]} material={brass}>
                  <cylinderGeometry args={[0.035, 0.035, 0.012, 24]} />
                </mesh>
              </group>
            ))}
            <mesh position={[0, ROD_HEIGHT, DEPTH / 2]} material={brass}>
              <boxGeometry args={[0.03, 0.03, DEPTH]} />
            </mesh>
          </group>
        )}
        {!isWave && (
          <instancedMesh ref={rings} args={[isEyelet ? eyeletGeo : ringGeo, brass, MAX_RINGS]} frustumCulled={false} key={cfg.pleat} />
        )}
      </group>
    </group>
  );
}
