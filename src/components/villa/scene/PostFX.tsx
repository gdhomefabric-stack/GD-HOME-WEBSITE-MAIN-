"use client";

import { useEffect } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { Bloom, EffectComposer, Noise, SMAA, ToneMapping, Vignette } from "@react-three/postprocessing";
import { BlendFunction, ToneMappingMode } from "postprocessing";

/**
 * Desktop finishing, tuned to match the Blender renders: the lighting is already
 * baked (so no screen-space AO), AgX tone mapping as in Blender, a soft bloom so
 * bright windows and lamps bleed a little light like a real lens, a light vignette
 * and a whisper of grain.
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
      <Bloom mipmapBlur intensity={0.28} luminanceThreshold={0.85} luminanceSmoothing={0.3} radius={0.75} />
      <ToneMapping mode={ToneMappingMode.AGX} />
      <Vignette offset={0.38} darkness={0.32} />
      <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.18} />
      <SMAA />
    </EffectComposer>
  );
}
