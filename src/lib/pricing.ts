import {
  CURRENCY,
  LINING_BY_ID,
  PLEAT_BY_ID,
  PRODUCT_BY_ID,
  type CurtainConfig,
  type LengthId,
} from "@/data/catalog";
import { ROD_HEIGHT, type WindowSpec } from "@/data/villa";

const SQFT_PER_M2 = 10.7639;
/** Curtains stack back 25 cm beyond each side of the opening. */
const STACK_BACK = 0.25;

/** y of the hem for a length option (negative = extra fabric pooled on the floor). */
export function hemHeight(length: LengthId, sill: number): number {
  switch (length) {
    case "sill":
      return sill + 0.015;
    case "apron":
      return Math.max(0.02, sill - 0.15);
    case "floor":
      return 0.012;
    case "puddle":
      return -0.12;
  }
}

export interface CurtainSize {
  trackWidth: number;
  drop: number;
}

export function curtainSize(w: Pick<WindowSpec, "width" | "sill">, length: LengthId): CurtainSize {
  return { trackWidth: w.width + STACK_BACK * 2, drop: ROD_HEIGHT - hemHeight(length, w.sill) };
}

/** Reference window used when pricing outside the villa (6 × 8 ft, the house standard). */
export const REFERENCE_WINDOW = { width: 1.83 - STACK_BACK * 2, sill: 0.9 };

export function curtainPrice(cfg: CurtainConfig, w: Pick<WindowSpec, "width" | "sill"> = REFERENCE_WINDOW): number {
  const { trackWidth, drop } = curtainSize(w, cfg.length);
  return priceForSize(cfg, trackWidth, drop);
}

/** Price of a made-to-measure pair for a given track width and drop (metres). */
export function priceForSize(cfg: CurtainConfig, trackWidth: number, drop: number): number {
  const p = PRODUCT_BY_ID[cfg.productId];
  const pleat = PLEAT_BY_ID[cfg.pleat];
  const lining = LINING_BY_ID[cfg.lining];
  const sqft = trackWidth * drop * SQFT_PER_M2;
  const price = sqft * p.pricePerSqft * (pleat.fullness / 2.2) * pleat.factor * (1 + lining.uplift);
  return Math.round(price / 5) * 5;
}

const fmt = new Intl.NumberFormat(CURRENCY.locale, {
  style: "currency",
  currency: CURRENCY.code,
  maximumFractionDigits: 0,
});

export const money = (n: number) => fmt.format(n);

export const metres = (m: number) => `${m.toFixed(2)} m`;
export const feet = (m: number) => `${(m * 3.28084).toFixed(1)} ft`;
