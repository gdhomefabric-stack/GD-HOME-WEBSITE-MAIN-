"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { useLoader, useThree } from "@react-three/fiber";
import type { FabricKind } from "@/data/catalog";
import { ASSETS } from "@/lib/assets";
import type { Quality } from "@/store/villa";
import { getKTX2Loader } from "./sceneState";

export const FABRIC_KINDS: FabricKind[] = ["velvet", "blackout", "linen", "sheer", "embroidered"];

/** Real-world size (m) of one texture tile, per fabric. */
const TILE: Record<FabricKind, number> = {
  velvet: 0.22,
  blackout: 0.14,
  linen: 0.2,
  sheer: 0.16,
  embroidered: 0.5,
};

export interface FabricMaps {
  detail: THREE.Texture;
  normal: THREE.Texture;
}
export type FabricTextures = Record<FabricKind, FabricMaps> & { embroideryMask: THREE.Texture };

const URLS = [
  ...FABRIC_KINDS.flatMap((k) => [ASSETS.fabric(k, "detail"), ASSETS.fabric(k, "normal")]),
  ASSETS.fabric("embroidered", "mask"),
];

/** Loads every fabric texture set (KTX2 / Basis, ~1.7 MB total) and configures tiling. */
export function useFabricTextures(): FabricTextures {
  const gl = useThree((s) => s.gl);
  const loader = getKTX2Loader(gl);
  const list = useLoader(loader, URLS) as THREE.Texture[];
  return useMemo(() => {
    const aniso = Math.min(8, gl.capabilities.getMaxAnisotropy());
    const out = {} as FabricTextures;
    FABRIC_KINDS.forEach((k, i) => {
      const detail = list[i * 2];
      const normal = list[i * 2 + 1];
      for (const t of [detail, normal]) {
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(1 / TILE[k], 1 / TILE[k]);
        t.anisotropy = aniso;
        t.needsUpdate = true;
      }
      detail.colorSpace = THREE.SRGBColorSpace;
      normal.colorSpace = THREE.NoColorSpace;
      out[k] = { detail, normal };
    });
    const mask = list[list.length - 1];
    mask.wrapS = mask.wrapT = THREE.RepeatWrapping;
    mask.repeat.set(1 / TILE.embroidered, 1 / TILE.embroidered);
    mask.colorSpace = THREE.NoColorSpace;
    mask.anisotropy = aniso;
    out.embroideryMask = mask;
    return out;
  }, [list, gl]);
}

type FabricMaterial = THREE.MeshPhysicalMaterial | THREE.MeshStandardMaterial;

const ROUGHNESS: Record<FabricKind, number> = {
  velvet: 0.88,
  blackout: 0.8,
  linen: 0.93,
  sheer: 0.9,
  embroidered: 0.62,
};
const NORMAL_SCALE: Record<FabricKind, number> = {
  velvet: 0.55,
  blackout: 0.45,
  linen: 0.95,
  sheer: 0.6,
  embroidered: 0.9,
};

/**
 * The face-fabric material for a curtain. Velvet gets a physical sheen lobe,
 * sheer is alpha-blended, and embroidered blends gilt thread in via a mask.
 */
export function createFabricMaterial(kind: FabricKind, tex: FabricTextures, quality: Quality, thread = "#c9a24b"): FabricMaterial {
  const maps = tex[kind];
  const params: THREE.MeshStandardMaterialParameters = {
    map: maps.detail,
    normalMap: maps.normal,
    normalScale: new THREE.Vector2(NORMAL_SCALE[kind], NORMAL_SCALE[kind]),
    roughness: ROUGHNESS[kind],
    metalness: 0,
    side: THREE.FrontSide,
  };
  if (kind === "sheer") {
    Object.assign(params, { transparent: true, opacity: 0.92, depthWrite: false, side: THREE.DoubleSide });
  }
  let m: FabricMaterial;
  if (quality === "high") {
    const pm = new THREE.MeshPhysicalMaterial(params);
    if (kind === "velvet") {
      pm.sheen = 1;
      pm.sheenRoughness = 0.32;
    } else if (kind === "linen" || kind === "sheer") {
      pm.sheen = 0.25;
      pm.sheenRoughness = 0.6;
    } else if (kind === "embroidered") {
      pm.sheen = 0.35;
      pm.sheenRoughness = 0.4;
    }
    m = pm;
  } else {
    m = new THREE.MeshStandardMaterial(params);
  }
  if (kind === "embroidered") {
    const threadColor = new THREE.Color(thread);
    m.onBeforeCompile = (shader) => {
      shader.uniforms.embMask = { value: tex.embroideryMask };
      shader.uniforms.threadColor = { value: threadColor };
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          "#include <common>\nuniform sampler2D embMask;\nuniform vec3 threadColor;",
        )
        .replace(
          "#include <map_fragment>",
          `#include <map_fragment>
          vec3 embM = texture2D( embMask, vMapUv ).rgb;
          float emb = smoothstep( 0.3, 0.7, embM.r );
          diffuseColor.rgb = mix( diffuseColor.rgb, threadColor * ( 0.7 + 0.4 * embM.g ), emb );`,
        )
        .replace(
          "#include <roughnessmap_fragment>",
          "#include <roughnessmap_fragment>\nroughnessFactor = mix( roughnessFactor, 0.34, emb );",
        )
        .replace(
          "#include <metalnessmap_fragment>",
          "#include <metalnessmap_fragment>\nmetalnessFactor = mix( metalnessFactor, 0.8, emb );",
        );
    };
    m.customProgramCacheKey = () => `embroidered-${quality}`;
  }
  return m;
}

/** Lining seen from the street side / behind the folds. */
export function createLiningMaterial(hex: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: hex, roughness: 0.85, side: THREE.BackSide });
}

/** The detail maps multiply the base colour; lift it so swatches read true. */
export const COLOUR_LIFT = 1.1;
