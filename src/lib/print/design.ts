import { DEFAULT_SPEC, type PrintSpec } from "@/data/printPillows";
import type { PatternParams } from "./patterns";

export type FilterId = "none" | "bw" | "sepia" | "warm" | "cool" | "vivid" | "fade";
export const FILTERS: { id: FilterId; name: string; css: string }[] = [
  { id: "none", name: "Original", css: "none" },
  { id: "vivid", name: "Vivid", css: "saturate(1.35) contrast(1.08)" },
  { id: "warm", name: "Warm", css: "sepia(0.25) saturate(1.2) hue-rotate(-8deg)" },
  { id: "cool", name: "Cool", css: "saturate(0.95) hue-rotate(12deg) brightness(1.03)" },
  { id: "fade", name: "Soft fade", css: "contrast(0.85) brightness(1.08) saturate(0.8)" },
  { id: "bw", name: "Black & white", css: "grayscale(1) contrast(1.1)" },
  { id: "sepia", name: "Sepia", css: "sepia(0.85) contrast(1.05)" },
];
export const FILTER_CSS = Object.fromEntries(FILTERS.map((f) => [f.id, f.css])) as Record<FilterId, string>;

interface LayerBase {
  id: string;
  /** centre, as a fraction of the print box (0–1) */
  x: number;
  y: number;
  /** degrees */
  rot: number;
  opacity: number;
  hidden?: boolean;
}

export interface ImageLayer extends LayerBase {
  type: "image";
  /** data URL; empty = a "your photo here" placeholder */
  src: string;
  /** width as a fraction of the print box width */
  w: number;
  /** natural height / width */
  aspect: number;
  /** natural pixel width, for the print-quality check */
  px: number;
  flip: boolean;
  filter: FilterId;
  /** crop to a circle (portraits) */
  round?: boolean;
  name: string;
}

export interface TextLayer extends LayerBase {
  type: "text";
  text: string;
  font: string;
  weight: number;
  italic?: boolean;
  color: string;
  /** cap height as a fraction of the print box height */
  size: number;
  align: CanvasTextAlign;
  /** em */
  spacing: number;
  outline: number;
  outlineColor: string;
  shadow: boolean;
  /** -1 (smile) … 1 (rainbow) */
  curve: number;
  upper?: boolean;
}

export type Layer = ImageLayer | TextLayer;

export type BgFill =
  | { type: "pattern"; pattern: PatternParams; /** tile width as a fraction of box width */ scale: number; rot: number }
  | { type: "image"; src: string; mode: "cover" | "tile"; scale: number; dx: number; dy: number; aspect: number; px: number };

export interface Side {
  color: string;
  fill: BgFill | null;
  layers: Layer[];
}

export interface Design {
  spec: PrintSpec;
  front: Side;
  back: Side;
}

export type SideId = "front" | "back";

let n = 0;
export const newId = (p = "l") => `${p}${Date.now().toString(36)}${(n++).toString(36)}${Math.random().toString(36).slice(2, 5)}`;

export const emptySide = (color = "#f3ece0"): Side => ({ color, fill: null, layers: [] });

export const FONTS: { family: string; label: string; weights: number[] }[] = [
  { family: "Playfair Display", label: "Playfair — elegant serif", weights: [400, 700] },
  { family: "Cormorant Garamond", label: "Cormorant — classic serif", weights: [400, 500] },
  { family: "Great Vibes", label: "Great Vibes — wedding script", weights: [400] },
  { family: "Pacifico", label: "Pacifico — retro script", weights: [400] },
  { family: "Lobster", label: "Lobster — bold script", weights: [400] },
  { family: "Caveat", label: "Caveat — handwritten", weights: [400, 700] },
  { family: "Montserrat", label: "Montserrat — modern sans", weights: [400, 700, 800] },
  { family: "Bebas Neue", label: "Bebas Neue — tall caps", weights: [400] },
  { family: "Inter Variable", label: "Inter — clean sans", weights: [400, 600] },
];

export const textLayer = (patch: Partial<TextLayer> = {}): TextLayer => ({
  id: newId("t"),
  type: "text",
  text: "Your text",
  font: "Playfair Display",
  weight: 400,
  color: "#2e241a",
  size: 0.11,
  align: "center",
  spacing: 0,
  outline: 0,
  outlineColor: "#ffffff",
  shadow: false,
  curve: 0,
  x: 0.5,
  y: 0.5,
  rot: 0,
  opacity: 1,
  ...patch,
});

export const imageLayer = (patch: Partial<ImageLayer> = {}): ImageLayer => ({
  id: newId("i"),
  type: "image",
  src: "",
  w: 0.6,
  aspect: 1,
  px: 0,
  flip: false,
  filter: "none",
  name: "Photo",
  x: 0.5,
  y: 0.5,
  rot: 0,
  opacity: 1,
  ...patch,
});

export const initialDesign = (): Design => ({
  spec: { ...DEFAULT_SPEC },
  front: {
    color: "#f3ece0",
    fill: null,
    layers: [],
  },
  back: emptySide(),
});

/** The side actually printed on the back. */
export function backSide(d: Design): Side {
  if (d.spec.back === "same") return d.front;
  if (d.spec.back === "plain") return { color: d.spec.backColour, fill: null, layers: [] };
  return d.back;
}

export const layerLabel = (l: Layer) =>
  l.type === "text" ? `“${l.text.split("\n")[0].slice(0, 22) || "Text"}”` : l.src ? l.name : "Photo placeholder";
