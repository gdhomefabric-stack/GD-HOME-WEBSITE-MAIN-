/**
 * GD Home Fabric catalogue — curtain collections, options and the
 * Goose Feather Pillow collection. Prices are made-to-measure estimates.
 */

/** Change here to re-price the whole site (symbol + locale for formatting). */
export const CURRENCY = { code: "GBP", locale: "en-GB" };

export type CollectionId = "velvet" | "blackout" | "linen" | "sheer" | "embroidered";
/** Which texture set / shading model renders the fabric. */
export type FabricKind = CollectionId;

export interface Colour {
  id: string;
  name: string;
  hex: string;
}

export interface Product {
  id: string;
  collection: CollectionId;
  kind: FabricKind;
  name: string;
  grade: string;
  blurb: string;
  composition: string;
  weight: string;
  /** made-to-measure price per sq ft of window covered (a pair, standard fullness) */
  pricePerSqft: number;
  /** fraction of daylight passing through the face fabric, unlined */
  transmission: number;
  colours: Colour[];
  /** thread colour for embroidered fabrics */
  thread?: string;
}

export interface Collection {
  id: CollectionId;
  numeral: string;
  name: string;
  tagline: string;
  description: string;
  bestFor: string;
}

export const COLLECTIONS: Collection[] = [
  {
    id: "velvet",
    numeral: "ii.",
    name: "Velvet",
    tagline: "Depth you can feel",
    description:
      "A dense pile that drinks the light and gives it back as shadow — the most tactile expression of quiet grandeur.",
    bestFor: "Grand salons, libraries and hotel suites",
  },
  {
    id: "blackout",
    numeral: "i.",
    name: "Blackout",
    tagline: "True darkness, and silence with it",
    description:
      "For bedrooms, nurseries and the screening room — a dense, luxurious weave that returns a space to true darkness.",
    bestFor: "Bedrooms, home theatres and nurseries",
  },
  {
    id: "linen",
    numeral: "iii.",
    name: "Linen",
    tagline: "The soul of the maison",
    description:
      "A natural weave that falls with honest, relaxed elegance and warms in the afternoon sun.",
    bestFor: "Guest rooms, coastal homes and kitchens",
  },
  {
    id: "sheer",
    numeral: "iv.",
    name: "Sheer",
    tagline: "The barest veil",
    description:
      "A whisper of fabric that diffuses daylight into a soft golden glow — privacy without ever losing the light.",
    bestFor: "Layering behind velvet or linen",
  },
  {
    id: "embroidered",
    numeral: "v.",
    name: "Embroidered",
    tagline: "Heritage in thread",
    description:
      "Hand-guided gilt detailing that catches the light along its lines — the most ceremonial expression of the house.",
    bestFor: "Dining rooms and formal reception rooms",
  },
];

export const COLLECTION_BY_ID = Object.fromEntries(COLLECTIONS.map((c) => [c.id, c])) as Record<CollectionId, Collection>;

export const PRODUCTS: Product[] = [
  {
    id: "velours-royal",
    collection: "velvet",
    kind: "velvet",
    name: "Velours Royal",
    grade: "Cotton velvet",
    blurb: "A deep, soft pile with a quiet sheen that shifts with every fold.",
    composition: "85% cotton, 15% viscose pile",
    weight: "520 gsm",
    pricePerSqft: 34,
    transmission: 0.1,
    colours: [
      { id: "champagne", name: "Champagne", hex: "#c9b089" },
      { id: "fawn", name: "Fawn", hex: "#a88d69" },
      { id: "oyster", name: "Oyster", hex: "#d8ccb8" },
      { id: "emerald", name: "Emerald", hex: "#1f4a36" },
      { id: "forest", name: "Salon Vert", hex: "#2b3d2f" },
      { id: "sapphire", name: "Sapphire", hex: "#1b3553" },
      { id: "bordeaux", name: "Bordeaux", hex: "#5c1f2a" },
      { id: "espresso", name: "Espresso", hex: "#3e2d22" },
    ],
  },
  {
    id: "le-roi-noir",
    collection: "blackout",
    kind: "blackout",
    name: "Le Roi Noir",
    grade: "Classic blackout",
    blurb: "A dense double-weave that holds a crisp, architectural fold.",
    composition: "100% polyester, triple-pass coated back",
    weight: "410 gsm",
    pricePerSqft: 26,
    transmission: 0.02,
    colours: [
      { id: "stone", name: "Stone", hex: "#b8aa93" },
      { id: "ivory", name: "Ivory", hex: "#e6dccb" },
      { id: "greige", name: "Greige", hex: "#9d9283" },
      { id: "walnut", name: "Walnut", hex: "#5d4a3c" },
      { id: "dove", name: "Dove Grey", hex: "#8a8e92" },
      { id: "charcoal", name: "Charcoal", hex: "#33302a" },
      { id: "navy", name: "Nuit Navy", hex: "#1f2a3b" },
    ],
  },
  {
    id: "nuit-absolue",
    collection: "blackout",
    kind: "blackout",
    name: "Nuit Absolue",
    grade: "Premium blackout",
    blurb: "Triple-weave, 100% light-stopping and acoustically dense — made for the screening room.",
    composition: "Triple-weave polyester with acoustic interlayer",
    weight: "560 gsm",
    pricePerSqft: 35,
    transmission: 0.0,
    colours: [
      { id: "midnight", name: "Midnight", hex: "#15171d" },
      { id: "oxblood", name: "Oxblood", hex: "#3f1a20" },
      { id: "theatre-navy", name: "Theatre Navy", hex: "#172238" },
      { id: "espresso", name: "Espresso", hex: "#2c2119" },
      { id: "graphite", name: "Graphite", hex: "#34343a" },
    ],
  },
  {
    id: "doux-sommeil",
    collection: "blackout",
    kind: "blackout",
    name: "Doux Sommeil",
    grade: "Soft blackout",
    blurb: "A brushed, cloud-soft blackout that drapes gently and dims daylight to dusk.",
    composition: "Brushed cotton-blend face, soft blackout back",
    weight: "380 gsm",
    pricePerSqft: 24,
    transmission: 0.03,
    colours: [
      { id: "cloud", name: "Cloud", hex: "#eee8df" },
      { id: "blush", name: "Blush", hex: "#e3c6bc" },
      { id: "sage-mist", name: "Sage Mist", hex: "#c3cbb5" },
      { id: "powder", name: "Powder Blue", hex: "#c6d1db" },
      { id: "oat", name: "Oat", hex: "#d8c7ac" },
      { id: "stone", name: "Stone", hex: "#c7baa7" },
    ],
  },
  {
    id: "lin-de-provence",
    collection: "linen",
    kind: "linen",
    name: "Lin de Provence",
    grade: "Stonewashed linen",
    blurb: "A breathable, slubbed weave that falls with honest, relaxed elegance.",
    composition: "100% European flax linen",
    weight: "300 gsm",
    pricePerSqft: 19,
    transmission: 0.42,
    colours: [
      { id: "soft-linen", name: "Soft Linen", hex: "#ebe3d7" },
      { id: "stone-beige", name: "Stone Beige", hex: "#d9cab7" },
      { id: "champagne", name: "Champagne", hex: "#d6c3a2" },
      { id: "sea-mist", name: "Sea Mist", hex: "#b8c8c9" },
      { id: "sage", name: "Sage", hex: "#8e9c80" },
      { id: "driftwood", name: "Driftwood", hex: "#a58a66" },
      { id: "terracotta", name: "Terracotta", hex: "#b0603f" },
      { id: "indigo", name: "Indigo", hex: "#3b4460" },
    ],
  },
  {
    id: "voile-du-matin",
    collection: "sheer",
    kind: "sheer",
    name: "Voile du Matin",
    grade: "Linen-look sheer",
    blurb: "The barest veil — daylight diffused into a soft, golden glow.",
    composition: "Fine linen-look voile",
    weight: "95 gsm",
    pricePerSqft: 14,
    transmission: 0.78,
    colours: [
      { id: "white", name: "Pure White", hex: "#f7f5f0" },
      { id: "ivory", name: "Ivory", hex: "#ede4d5" },
      { id: "sand", name: "Sand", hex: "#dccdb9" },
      { id: "champagne", name: "Champagne", hex: "#d7c5a4" },
      { id: "mist", name: "Mist Grey", hex: "#cfd0cc" },
    ],
  },
  {
    id: "fil-dor",
    collection: "embroidered",
    kind: "embroidered",
    name: "Fil d'Or",
    grade: "Gilt-thread embroidery",
    blurb: "A fleur trellis embroidered in gilt thread on a fine faille ground.",
    composition: "Silk-look faille, metallic gilt embroidery",
    weight: "340 gsm",
    pricePerSqft: 32,
    transmission: 0.2,
    thread: "#c9a24b",
    colours: [
      { id: "ivory", name: "Ivory", hex: "#e8dfcd" },
      { id: "champagne", name: "Champagne", hex: "#d4bf9b" },
      { id: "taupe", name: "Taupe", hex: "#8f7a5c" },
      { id: "walnut", name: "Walnut", hex: "#5a4632" },
      { id: "bordeaux", name: "Bordeaux", hex: "#5a1f2b" },
      { id: "emerald", name: "Emerald", hex: "#1f4032" },
    ],
  },
];

export const PRODUCT_BY_ID = Object.fromEntries(PRODUCTS.map((p) => [p.id, p])) as Record<string, Product>;
export const productsInCollection = (c: CollectionId) => PRODUCTS.filter((p) => p.collection === c);

export type PleatId = "pinch" | "wave" | "eyelet" | "pencil" | "goblet";
export interface Pleat {
  id: PleatId;
  name: string;
  note: string;
  /** fabric fullness ratio (fabric width / track width) */
  fullness: number;
  /** labour multiplier */
  factor: number;
}
export const PLEATS: Pleat[] = [
  { id: "pinch", name: "French Pinch", note: "Tailored triple pleats, formal and crisp", fullness: 2.2, factor: 1.0 },
  { id: "wave", name: "Wave", note: "Continuous, even S-folds on a hidden track", fullness: 2.0, factor: 1.05 },
  { id: "eyelet", name: "Gilded Eyelet", note: "Deep, relaxed folds on a brass pole", fullness: 1.8, factor: 0.92 },
  { id: "pencil", name: "Pencil", note: "Fine gathered heading, soft and casual", fullness: 2.4, factor: 0.88 },
  { id: "goblet", name: "Goblet", note: "Cupped heading for grand, ceremonial rooms", fullness: 2.3, factor: 1.15 },
];
export const PLEAT_BY_ID = Object.fromEntries(PLEATS.map((p) => [p.id, p])) as Record<PleatId, Pleat>;

export type LengthId = "sill" | "apron" | "floor" | "puddle";
export interface LengthOption {
  id: LengthId;
  name: string;
  note: string;
}
export const LENGTHS: LengthOption[] = [
  { id: "sill", name: "Sill", note: "Finishes just above the sill" },
  { id: "apron", name: "Below sill", note: "Falls 15 cm past the sill" },
  { id: "floor", name: "Floor", note: "Kisses the floor — our house standard" },
  { id: "puddle", name: "Puddle", note: "Pools 12 cm on the floor, romantic" },
];
export const LENGTH_BY_ID = Object.fromEntries(LENGTHS.map((l) => [l.id, l])) as Record<LengthId, LengthOption>;

export type LiningId = "unlined" | "cotton" | "thermal" | "blackout";
export interface Lining {
  id: LiningId;
  name: string;
  note: string;
  /** multiplies fabric transmission */
  transmission: number;
  /** price uplift */
  uplift: number;
  hex: string;
}
export const LININGS: Lining[] = [
  { id: "unlined", name: "Unlined", note: "Light and airy — lets the fabric glow", transmission: 1, uplift: 0, hex: "#f1ebe0" },
  { id: "cotton", name: "Cotton sateen", note: "Gives body and a clean face to the street", transmission: 0.62, uplift: 0.1, hex: "#efe8dc" },
  { id: "thermal", name: "Thermal interlined", note: "Insulating, heavier and more luxurious drape", transmission: 0.3, uplift: 0.18, hex: "#e9e2d6" },
  { id: "blackout", name: "Blackout lining", note: "Stops daylight completely", transmission: 0.015, uplift: 0.22, hex: "#e4ddd1" },
];
export const LINING_BY_ID = Object.fromEntries(LININGS.map((l) => [l.id, l])) as Record<LiningId, Lining>;

export interface CurtainConfig {
  productId: string;
  colourId: string;
  pleat: PleatId;
  length: LengthId;
  lining: LiningId;
}

export function colourOf(cfg: CurtainConfig): Colour {
  const p = PRODUCT_BY_ID[cfg.productId];
  return p.colours.find((c) => c.id === cfg.colourId) ?? p.colours[0];
}

/** Effective daylight transmission of a closed curtain. */
export function curtainTransmission(cfg: CurtainConfig): number {
  return PRODUCT_BY_ID[cfg.productId].transmission * LINING_BY_ID[cfg.lining].transmission;
}

export function describeCurtain(cfg: CurtainConfig): string {
  const p = PRODUCT_BY_ID[cfg.productId];
  return `${p.name} in ${colourOf(cfg).name}`;
}

export function curtainDetails(cfg: CurtainConfig): Record<string, string> {
  const p = PRODUCT_BY_ID[cfg.productId];
  return {
    Collection: `${COLLECTION_BY_ID[p.collection].name} · ${p.grade}`,
    Colour: colourOf(cfg).name,
    Heading: PLEAT_BY_ID[cfg.pleat].name,
    Length: LENGTH_BY_ID[cfg.length].name,
    Lining: LINING_BY_ID[cfg.lining].name,
  };
}

/** Recommended starting look for each window, by room. */
export const ROOM_DEFAULTS: Record<string, CurtainConfig> = {
  living: { productId: "velours-royal", colourId: "champagne", pleat: "pinch", length: "puddle", lining: "cotton" },
  dining: { productId: "fil-dor", colourId: "ivory", pleat: "goblet", length: "floor", lining: "cotton" },
  guest: { productId: "lin-de-provence", colourId: "sea-mist", pleat: "eyelet", length: "floor", lining: "unlined" },
  nursery: { productId: "doux-sommeil", colourId: "blush", pleat: "pencil", length: "floor", lining: "thermal" },
  theatre: { productId: "nuit-absolue", colourId: "oxblood", pleat: "wave", length: "floor", lining: "blackout" },
  study: { productId: "velours-royal", colourId: "forest", pleat: "pinch", length: "floor", lining: "thermal" },
  master: { productId: "le-roi-noir", colourId: "stone", pleat: "wave", length: "floor", lining: "cotton" },
  suite: { productId: "velours-royal", colourId: "emerald", pleat: "goblet", length: "puddle", lining: "thermal" },
};

/** Which product a room recommends when the visitor picks a collection. */
export const ROOM_PRODUCT_FOR_COLLECTION: Record<string, Partial<Record<CollectionId, string>>> = {
  theatre: { blackout: "nuit-absolue" },
  nursery: { blackout: "doux-sommeil" },
};

/* ------------------------------------------------------------------ */
/* Goose Feather Pillow collection                                     */
/* ------------------------------------------------------------------ */

export type PillowSizeId = "euro" | "king" | "standard" | "boudoir";
export interface PillowSize {
  id: PillowSizeId;
  name: string;
  dims: string;
  /** width, depth (m) as laid on the bed */
  w: number;
  d: number;
  price: number;
  /** arrangement row: 0 back (upright), 1 sleeping, 2 front */
  row: 0 | 1 | 2;
}
export const PILLOW_SIZES: PillowSize[] = [
  { id: "euro", name: "Euro square", dims: "65 × 65 cm", w: 0.65, d: 0.65, price: 110, row: 0 },
  { id: "king", name: "King", dims: "50 × 90 cm", w: 0.9, d: 0.5, price: 120, row: 1 },
  { id: "standard", name: "Standard", dims: "50 × 75 cm", w: 0.75, d: 0.5, price: 95, row: 1 },
  { id: "boudoir", name: "Boudoir", dims: "30 × 50 cm", w: 0.5, d: 0.3, price: 65, row: 2 },
];
export const PILLOW_SIZE_BY_ID = Object.fromEntries(PILLOW_SIZES.map((p) => [p.id, p])) as Record<PillowSizeId, PillowSize>;

export type PillowFillId = "feather" | "feather-down" | "down";
export interface PillowFill {
  id: PillowFillId;
  name: string;
  note: string;
  factor: number;
  /** loft multiplier for rendering */
  loft: number;
}
export const PILLOW_FILLS: PillowFill[] = [
  { id: "feather", name: "Goose Feather", note: "Supportive, sculptable, holds its shape", factor: 1, loft: 0.9 },
  { id: "feather-down", name: "Feather & Down 70/30", note: "The hotel favourite — plump yet yielding", factor: 1.3, loft: 1.05 },
  { id: "down", name: "Pure Goose Down", note: "Cloud-light, the most luxurious loft", factor: 1.75, loft: 1.2 },
];
export const PILLOW_FILL_BY_ID = Object.fromEntries(PILLOW_FILLS.map((p) => [p.id, p])) as Record<PillowFillId, PillowFill>;

export type PillowFirmId = "soft" | "medium" | "firm";
export const PILLOW_FIRMNESS: { id: PillowFirmId; name: string; loft: number }[] = [
  { id: "soft", name: "Soft", loft: 0.85 },
  { id: "medium", name: "Medium", loft: 1 },
  { id: "firm", name: "Firm", loft: 1.18 },
];

export const PILLOW_COVERS: Colour[] = [
  { id: "white", name: "Pure White", hex: "#f6f4ef" },
  { id: "ivory", name: "Ivory", hex: "#eee6d6" },
  { id: "oyster", name: "Oyster", hex: "#dcd2c1" },
  { id: "champagne", name: "Champagne", hex: "#d8c6a5" },
  { id: "stone", name: "Stone", hex: "#c4b7a2" },
  { id: "sage", name: "Sage", hex: "#b0b89f" },
  { id: "blush", name: "Blush", hex: "#e0c7bd" },
  { id: "dove", name: "Dove", hex: "#b7b6b1" },
  { id: "charcoal", name: "Charcoal", hex: "#4a4743" },
];

export interface PillowConfig {
  size: PillowSizeId;
  fill: PillowFillId;
  firmness: PillowFirmId;
  cover: string;
}

export interface PlacedPillow extends PillowConfig {
  uid: string;
}

export const PILLOW_COLLECTION = {
  name: "Goose Feather Pillow Collection",
  tagline: "Dressed like a five-star suite",
  description:
    "Ethically sourced goose feather and down, hand-filled in 400-thread-count cotton sateen with a piped edge. Layer Euro squares, sleeping pillows and a boudoir cushion for a bed that looks as good as it sleeps.",
};

export function pillowPrice(p: PillowConfig): number {
  return Math.round(PILLOW_SIZE_BY_ID[p.size].price * PILLOW_FILL_BY_ID[p.fill].factor);
}

export function describePillow(p: PillowConfig): string {
  return `${PILLOW_FILL_BY_ID[p.fill].name} ${PILLOW_SIZE_BY_ID[p.size].name} pillow`;
}

export function pillowDetails(p: PillowConfig): Record<string, string> {
  return {
    Size: `${PILLOW_SIZE_BY_ID[p.size].name} · ${PILLOW_SIZE_BY_ID[p.size].dims}`,
    Fill: PILLOW_FILL_BY_ID[p.fill].name,
    Firmness: PILLOW_FIRMNESS.find((f) => f.id === p.firmness)?.name ?? "",
    Cover: PILLOW_COVERS.find((c) => c.id === p.cover)?.name ?? "",
  };
}

/** Default bed dressing per bedroom. */
export const DEFAULT_PILLOWS: Record<string, PillowConfig[]> = {
  master: [
    { size: "king", fill: "feather", firmness: "medium", cover: "white" },
    { size: "king", fill: "feather", firmness: "medium", cover: "white" },
  ],
  guest: [
    { size: "standard", fill: "feather", firmness: "medium", cover: "white" },
    { size: "standard", fill: "feather", firmness: "medium", cover: "white" },
  ],
  suite: [
    { size: "euro", fill: "feather-down", firmness: "firm", cover: "champagne" },
    { size: "euro", fill: "feather-down", firmness: "firm", cover: "champagne" },
    { size: "euro", fill: "feather-down", firmness: "firm", cover: "champagne" },
    { size: "king", fill: "down", firmness: "medium", cover: "ivory" },
    { size: "king", fill: "down", firmness: "medium", cover: "ivory" },
    { size: "boudoir", fill: "feather-down", firmness: "medium", cover: "oyster" },
  ],
};
