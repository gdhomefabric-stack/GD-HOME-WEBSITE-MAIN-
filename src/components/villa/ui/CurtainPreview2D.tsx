"use client";

import {
  PLEAT_BY_ID,
  PRODUCT_BY_ID,
  colourOf,
  curtainTransmission,
  type CurtainConfig,
} from "@/data/catalog";
import { ROD_HEIGHT } from "@/data/villa";
import { ASSETS } from "@/lib/assets";
import { hemHeight } from "@/lib/pricing";
import type { Lighting } from "@/store/villa";

const SKY: Record<Lighting, string> = {
  day: "linear-gradient(180deg,#bcd0da 0%,#e9e4d6 62%,#b7aa84 63%,#9c9467 100%)",
  sunset: "linear-gradient(180deg,#5c5580 0%,#f2a878 55%,#f8cf9d 62%,#6e5a45 63%,#4a3c2e 100%)",
  night: "linear-gradient(180deg,#070b16 0%,#1c2640 60%,#202a3e 62%,#10141c 63%,#0b0d12 100%)",
};
const ROOM_LIGHT: Record<Lighting, number> = { day: 1, sunset: 0.72, night: 0.1 };

/**
 * A 2-D, CSS-only curtain study used by the room gallery (no WebGL) and the
 * collections page. It follows the same options as the 3-D curtains.
 */
export function CurtainPreview2D({
  cfg,
  open,
  lighting = "day",
  sill = 0.55,
  label,
  compact = false,
}: {
  cfg: CurtainConfig;
  open: number;
  lighting?: Lighting;
  sill?: number;
  label?: string;
  compact?: boolean;
}) {
  const p = PRODUCT_BY_ID[cfg.productId];
  const colour = colourOf(cfg);
  const pleat = PLEAT_BY_ID[cfg.pleat];
  const t = curtainTransmission(cfg);
  const hem = hemHeight(cfg.length, sill);
  // vertical scale: rod at 8%, floor at 94% of the frame
  const y = (h: number) => 94 - (h / ROD_HEIGHT) * 86;
  const panelTop = y(ROD_HEIGHT - 0.04);
  const panelBottom = Math.min(99, y(Math.max(0, hem)) + (cfg.length === "puddle" ? 3.5 : 0));
  const panelW = 50 - open * 38;
  const folds = Math.round(pleat.fullness * 5);
  const through = open + (1 - open) * t;
  const light = ROOM_LIGHT[lighting];
  const foldShade = `repeating-linear-gradient(90deg, rgba(40,28,16,0.26) 0, rgba(255,250,240,0.9) ${50 / folds}%, rgba(40,28,16,0.26) ${100 / folds}%)`;
  const texture = `url(${ASSETS.closeup(p.kind)})`;
  const panelStyle = {
    top: `${panelTop}%`,
    height: `${panelBottom - panelTop}%`,
    width: `${panelW}%`,
    backgroundColor: colour.hex,
    backgroundImage: `${foldShade}, ${texture}`,
    backgroundSize: "100% 100%, cover",
    backgroundRepeat: "no-repeat, no-repeat",
    backgroundBlendMode: "multiply, soft-light",
    opacity: p.kind === "sheer" ? 0.8 : 1,
  } as const;
  return (
    <figure className={`preview2d${compact ? " preview2d--compact" : ""}`} data-lighting={lighting}>
      <div className="preview2d__room" style={{ filter: `brightness(${0.35 + 0.65 * (lighting === "night" ? 0.55 : light * (0.35 + 0.65 * through))})` }}>
        <div className="preview2d__window" style={{ top: `${y(2.95)}%`, bottom: `${100 - y(sill)}%`, background: SKY[lighting] }}>
          <span className="preview2d__mullion" />
        </div>
        <div className="preview2d__sill" style={{ top: `${y(sill)}%` }} />
        <div
          className="preview2d__patch"
          style={{ opacity: light * through * (lighting === "night" ? 0.2 : 0.75), background: `radial-gradient(60% 100% at 50% 0%, rgba(255,240,210,0.9), transparent)` }}
        />
        <div className="preview2d__rod" style={{ top: `${y(ROD_HEIGHT)}%` }} />
        <div className="preview2d__panel preview2d__panel--l" style={panelStyle}>
          {p.kind === "embroidered" && <span className="preview2d__thread" style={{ backgroundImage: `url(${ASSETS.thread})` }} />}
        </div>
        <div className="preview2d__panel preview2d__panel--r" style={panelStyle}>
          {p.kind === "embroidered" && <span className="preview2d__thread" style={{ backgroundImage: `url(${ASSETS.thread})` }} />}
        </div>
        <div className="preview2d__floor" />
      </div>
      {label && <figcaption>{label}</figcaption>}
    </figure>
  );
}
