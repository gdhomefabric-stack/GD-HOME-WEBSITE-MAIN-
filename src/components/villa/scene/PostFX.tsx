"use client";

import { useEffect } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { Bloom, EffectComposer, N8AO, SMAA, ToneMapping, Vignette } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";

/**
 * Desktop-only finishing: ambient occlusion grounds the furniture (the sun cannot
 * reach under a ceiling), a restrained bloom lets lamps glow at night, and a
 * neutral tone curve keeps fabric colours true to the swatch.
 */
export function PostFX() {
  const gl = useThree((s) => s.gl);
  // half-float targets need a float-renderable colour buffer; fall back to 8-bit otherwise
  const halfFloat = gl.extensions.has("EXT_color_buffer_float") || gl.extensions.has("EXT_color_buffer_half_float");
  useEffect(() => {
    const prev = gl.toneMapping;
    gl.toneMapping = THREE.NoToneMapping;
    return () => {
      gl.toneMapping = prev;
    };
  }, [gl]);
  return (
    <EffectComposer multisampling={0} frameBufferType={halfFloat ? THREE.HalfFloatType : THREE.UnsignedByteType}>
      <N8AO halfRes quality="medium" aoRadius={0.9} distanceFalloff={0.55} intensity={2.4} color="#20150c" />
      <Bloom mipmapBlur intensity={0.32} luminanceThreshold={0.92} luminanceSmoothing={0.25} />
      <ToneMapping mode={ToneMappingMode.NEUTRAL} />
      <Vignette offset={0.32} darkness={0.42} />
      <SMAA />
    </EffectComposer>
  );
}
