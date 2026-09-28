import { sizeOf, type PrintSpec } from "@/data/printPillows";
import { imageLayer, textLayer, type Side } from "./design";
import { PALETTES } from "./patterns";

export interface Template {
  id: string;
  name: string;
  note: string;
  build: (spec: PrintSpec) => Side;
}

const pal = (id: string) => PALETTES.find((p) => p.id === id)!.colors;

export const TEMPLATES: Template[] = [
  {
    id: "photo",
    name: "Photo pillow",
    note: "One photo, edge to edge",
    build: (spec) => {
      const s = sizeOf(spec);
      return { color: "#ffffff", fill: null, layers: [imageLayer({ w: 1.06, aspect: s.h / s.w, name: "Your photo" })] };
    },
  },
  {
    id: "photo-name",
    name: "Photo + words",
    note: "A photo with a line underneath",
    build: (spec) => {
      const s = sizeOf(spec);
      const ph = 0.62;
      return {
        color: "#f3ece0",
        fill: null,
        layers: [
          imageLayer({ w: Math.min(0.78, (ph * s.h) / s.w / 0.8), aspect: 0.8, y: 0.42, name: "Your photo" }),
          textLayer({ text: "Our happy place", font: "Great Vibes", size: 0.1, y: 0.86, color: "#5e4a2e" }),
        ],
      };
    },
  },
  {
    id: "pet",
    name: "Pet portrait",
    note: "Round portrait with their name",
    build: () => ({
      color: pal("nursery")[0],
      fill: { type: "pattern", pattern: { kind: "dots", colors: ["#fdf8f1", "#f4d6c6", "#a7c7e7", "#f7dc8b", "#b5d6b2"], seed: 3 }, scale: 0.18, rot: 0 },
      layers: [
        imageLayer({ w: 0.56, aspect: 1, round: true, y: 0.5, name: "Your pet" }),
        textLayer({ text: "BRUNO", font: "Montserrat", weight: 800, size: 0.1, y: 0.13, curve: 0.3, spacing: 0.12, color: "#2f5d7c" }),
        textLayer({ text: "Good boy since 2021", font: "Caveat", weight: 700, size: 0.07, y: 0.88, color: "#2f5d7c" }),
      ],
    }),
  },
  {
    id: "monogram",
    name: "Monogram",
    note: "A grand initial",
    build: () => ({
      color: "#f3ece0",
      fill: { type: "pattern", pattern: { kind: "trellis", colors: ["#f3ece0", "#e6d7b8", "#d8c4a2", "#e6d7b8", "#e6d7b8"], seed: 1 }, scale: 0.2, rot: 0 },
      layers: [
        textLayer({ text: "S", font: "Playfair Display", weight: 400, italic: true, size: 0.5, y: 0.45, color: "#8c6a2f" }),
        textLayer({ text: "THE SHARMAS", font: "Montserrat", weight: 400, size: 0.05, spacing: 0.35, y: 0.8, color: "#5e4a2e" }),
      ],
    }),
  },
  {
    id: "family",
    name: "Family name",
    note: "Housewarming favourite",
    build: () => ({
      color: "#9fae8a",
      fill: null,
      layers: [
        textLayer({ text: "The Kapoors", font: "Great Vibes", size: 0.17, y: 0.45, color: "#ffffff" }),
        textLayer({ text: "EST. 2026", font: "Montserrat", weight: 700, size: 0.045, spacing: 0.4, y: 0.64, color: "#ffffff" }),
      ],
    }),
  },
  {
    id: "wedding",
    name: "Wedding",
    note: "Names and the date",
    build: () => ({
      color: "#fbf1ec",
      fill: { type: "pattern", pattern: { kind: "leaves", colors: ["#fbf1ec", "#c9d3bd", "#dfe5d5", "#f2cfc3", "#c9d3bd"], seed: 5 }, scale: 0.45, rot: 0 },
      layers: [
        textLayer({ text: "Priya & Arjun", font: "Great Vibes", size: 0.14, y: 0.44, color: "#8c6a2f", shadow: false }),
        textLayer({ text: "14 · 02 · 2027", font: "Cormorant Garamond", weight: 500, size: 0.07, spacing: 0.18, y: 0.6, color: "#5e4a2e" }),
      ],
    }),
  },
  {
    id: "quote",
    name: "Quote",
    note: "Words to live with",
    build: () => ({
      color: "#23324d",
      fill: { type: "pattern", pattern: { kind: "stars", colors: ["#23324d", "#e6cb91", "#39456b", "#e6cb91", "#6c7aa8"], seed: 7 }, scale: 0.42, rot: 0 },
      layers: [textLayer({ text: "Love you to the\nmoon & back", font: "Playfair Display", italic: true, size: 0.1, y: 0.5, color: "#f3ece0" })],
    }),
  },
  {
    id: "kids",
    name: "Kid's name",
    note: "Bright and bold",
    build: () => ({
      color: "#fff7e8",
      fill: { type: "pattern", pattern: { kind: "blobs", colors: pal("pop"), seed: 11 }, scale: 0.55, rot: 0 },
      layers: [textLayer({ text: "Maya", font: "Pacifico", size: 0.18, y: 0.5, color: "#3b5bdb", outline: 0.9, outlineColor: "#ffffff" })],
    }),
  },
  {
    id: "festive",
    name: "Festive",
    note: "Diwali, Eid, Christmas…",
    build: () => ({
      color: pal("festive")[0],
      fill: { type: "pattern", pattern: { kind: "mandala", colors: ["#fbeed8", "#c0643f", "#d4a017", "#a4161a", "#e9c46a"], seed: 2 }, scale: 1.05, rot: 0 },
      layers: [
        textLayer({ text: "Happy Diwali", font: "Lobster", size: 0.11, y: 0.5, color: "#fff7e8", outline: 1, outlineColor: "#a4161a", shadow: true }),
      ],
    }),
  },
];
