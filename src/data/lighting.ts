import type { Lighting } from "@/store/villa";

export interface LightPreset {
  label: string;
  skyTop: string;
  skyHorizon: string;
  fog: string;
  sunColor: string;
  sunIntensity: number;
  sunPosition: [number, number, number];
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
  envIntensity: number;
  exposure: number;
  /** strength of light coming in through the windows */
  daylight: number;
  windowColor: string;
  /** interior lamps 0..1 */
  lamp: number;
  lampColor: string;
  cove: number;
  /** lateral skew of the light patch on the floor (m per m of depth) */
  patchSkew: number;
  patchLength: number;
  stars: number;
}

export const LIGHTING: Record<Lighting, LightPreset> = {
  day: {
    label: "Day",
    skyTop: "#b8c9d2",
    skyHorizon: "#f1e8d8",
    fog: "#ece3d2",
    sunColor: "#fff0da",
    sunIntensity: 3.1,
    sunPosition: [24, 36, 30],
    hemiSky: "#fbf5ea",
    hemiGround: "#b7a586",
    hemiIntensity: 0.6,
    envIntensity: 0.5,
    exposure: 1.0,
    daylight: 1,
    windowColor: "#fff5e6",
    lamp: 0,
    lampColor: "#ffd2a1",
    cove: 0.12,
    patchSkew: 0.3,
    patchLength: 2.5,
    stars: 0,
  },
  sunset: {
    label: "Sunset",
    skyTop: "#57507a",
    skyHorizon: "#f5b98a",
    fog: "#dca887",
    sunColor: "#ffa566",
    sunIntensity: 2.6,
    sunPosition: [-38, 9, 18],
    hemiSky: "#ffcb9a",
    hemiGround: "#6b4a37",
    hemiIntensity: 0.55,
    envIntensity: 0.45,
    exposure: 1.06,
    daylight: 0.7,
    windowColor: "#ffbf85",
    lamp: 0.55,
    lampColor: "#ffcb95",
    cove: 0.55,
    patchSkew: -1.1,
    patchLength: 3.6,
    stars: 0.08,
  },
  night: {
    label: "Night",
    skyTop: "#070b16",
    skyHorizon: "#243049",
    fog: "#141b2b",
    sunColor: "#a9bbe2",
    sunIntensity: 0.5,
    sunPosition: [16, 30, -22],
    hemiSky: "#34405f",
    hemiGround: "#0e0b09",
    hemiIntensity: 0.22,
    envIntensity: 0.12,
    exposure: 1.12,
    daylight: 0.1,
    windowColor: "#9db2da",
    lamp: 1,
    lampColor: "#ffc98c",
    cove: 1,
    patchSkew: 0.15,
    patchLength: 1.8,
    stars: 1,
  },
};

export const LIGHTING_ORDER: Lighting[] = ["day", "sunset", "night"];
