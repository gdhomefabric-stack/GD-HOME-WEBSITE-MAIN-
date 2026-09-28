import {
  BLEED_CM,
  PRINT_DPI,
  PRINT_FABRIC_BY_ID,
  PRINT_SHAPE_BY_ID,
  SAFE_CM,
  TRIM_COLOURS,
  describePrint,
  printDetails,
  sizeOf,
  type PrintSpec,
} from "@/data/printPillows";
import { FILTER_CSS, backSide, type Design, type ImageLayer, type Layer, type Side, type TextLayer } from "./design";
import { imageNow, loadImage } from "./images";
import { isSingleMotif, patternTile } from "./patterns";
import { fillShape, strokeShape, type Box } from "./shapes";

export interface LayerBounds {
  id: string;
  cx: number;
  cy: number;
  w: number;
  h: number;
  rot: number;
}

const canFilter = typeof CanvasRenderingContext2D !== "undefined" && "filter" in CanvasRenderingContext2D.prototype;

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

/* ------------------------------------------------------------------ */
/* Flat artwork                                                        */
/* ------------------------------------------------------------------ */

export const fontString = (l: TextLayer, px: number) =>
  `${l.italic ? "italic " : ""}${l.weight} ${px.toFixed(2)}px "${l.font}", Georgia, serif`;

function drawBackground(ctx: CanvasRenderingContext2D, side: Side, box: Box, bleed: number) {
  const x0 = box.x - bleed;
  const y0 = box.y - bleed;
  const w0 = box.w + bleed * 2;
  const h0 = box.h + bleed * 2;
  ctx.fillStyle = side.color;
  ctx.fillRect(x0, y0, w0, h0);
  const f = side.fill;
  if (!f) return;
  ctx.save();
  if (f.type === "pattern") {
    if (f.pattern.kind === "ombre") {
      const tile = patternTile(f.pattern, 256);
      ctx.drawImage(tile, x0, y0, w0, h0);
    } else if (isSingleMotif(f.pattern.kind)) {
      const s = Math.max(box.w, box.h) * f.scale;
      const tile = patternTile(f.pattern, Math.min(3000, s));
      ctx.translate(box.x + box.w / 2, box.y + box.h / 2);
      ctx.rotate((f.rot * Math.PI) / 180);
      ctx.drawImage(tile, -s / 2, -s / 2, s, s);
    } else {
      const s = Math.max(8, box.w * f.scale);
      const tile = patternTile(f.pattern, s);
      const pat = ctx.createPattern(tile, "repeat");
      if (pat) {
        const k = s / tile.width;
        pat.setTransform(
          new DOMMatrix()
            .translate(box.x + box.w / 2, box.y + box.h / 2)
            .rotate(f.rot)
            .scale(k)
            .translate(-tile.width / 2, -tile.height / 2),
        );
        ctx.fillStyle = pat;
        ctx.fillRect(x0, y0, w0, h0);
      }
    }
  } else {
    const im = imageNow(f.src);
    if (im) {
      if (f.mode === "tile") {
        const s = Math.max(8, box.w * f.scale);
        const pat = ctx.createPattern(im, "repeat");
        if (pat) {
          const k = s / im.naturalWidth;
          pat.setTransform(new DOMMatrix().translate(box.x + box.w / 2 + f.dx * box.w, box.y + box.h / 2 + f.dy * box.h).scale(k));
          ctx.fillStyle = pat;
          ctx.fillRect(x0, y0, w0, h0);
        }
      } else {
        // cover the bleed box, then zoom and pan
        const ar = im.naturalHeight / im.naturalWidth;
        let w = w0;
        let h = w * ar;
        if (h < h0) {
          h = h0;
          w = h / ar;
        }
        w *= f.scale;
        h *= f.scale;
        ctx.drawImage(im, box.x + box.w / 2 - w / 2 + f.dx * box.w, box.y + box.h / 2 - h / 2 + f.dy * box.h, w, h);
      }
    }
  }
  ctx.restore();
}

function drawPlaceholder(ctx: CanvasRenderingContext2D, w: number, h: number, round?: boolean) {
  const s = Math.min(w, h);
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.strokeStyle = "rgba(94,74,46,0.75)";
  ctx.lineWidth = Math.max(1.5, s * 0.012);
  ctx.setLineDash([s * 0.04, s * 0.03]);
  ctx.beginPath();
  if (round) ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
  else ctx.roundRect(-w / 2, -h / 2, w, h, s * 0.06);
  ctx.fill();
  ctx.stroke();
  ctx.setLineDash([]);
  // camera glyph
  ctx.fillStyle = "rgba(94,74,46,0.8)";
  const g = s * 0.16;
  ctx.beginPath();
  ctx.roundRect(-g, -g * 0.9, g * 2, g * 1.4, g * 0.2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.beginPath();
  ctx.arc(0, -g * 0.2, g * 0.42, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(94,74,46,0.9)";
  ctx.font = `500 ${Math.max(10, s * 0.075)}px "Inter Variable", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("Add your photo", 0, g * 0.75);
}

function drawImageLayer(ctx: CanvasRenderingContext2D, l: ImageLayer, box: Box, placeholders: boolean): LayerBounds {
  const w = l.w * box.w;
  const h = l.round ? w : w * l.aspect;
  const cx = box.x + l.x * box.w;
  const cy = box.y + l.y * box.h;
  const bounds = { id: l.id, cx, cy, w, h, rot: l.rot };
  const im = l.src ? imageNow(l.src) : null;
  if (!im && !placeholders) return bounds;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((l.rot * Math.PI) / 180);
  ctx.globalAlpha = l.opacity;
  if (!im) {
    drawPlaceholder(ctx, w, h, l.round);
    ctx.restore();
    return bounds;
  }
  if (l.flip) ctx.scale(-1, 1);
  if (canFilter && l.filter !== "none") ctx.filter = FILTER_CSS[l.filter];
  if (l.round) {
    // a circular portrait: crop the photo's centre square
    ctx.beginPath();
    ctx.arc(0, 0, w / 2, 0, Math.PI * 2);
    ctx.clip();
    const s = Math.min(im.naturalWidth, im.naturalHeight);
    ctx.drawImage(im, (im.naturalWidth - s) / 2, (im.naturalHeight - s) / 2, s, s, -w / 2, -w / 2, w, w);
  } else {
    ctx.drawImage(im, -w / 2, -h / 2, w, h);
  }
  ctx.restore();
  return bounds;
}

let measure: CanvasRenderingContext2D | null = null;
const mctx = () => (measure ??= canvas(8, 8).getContext("2d")!);

function textLines(l: TextLayer) {
  const t = l.upper ? l.text.toUpperCase() : l.text;
  return t.split("\n");
}

function setSpacing(ctx: CanvasRenderingContext2D, px: number) {
  if ("letterSpacing" in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${px}px`;
}

function drawTextLayer(ctx: CanvasRenderingContext2D, l: TextLayer, box: Box): LayerBounds {
  const px = l.size * box.h;
  const lines = textLines(l);
  const lh = px * 1.12;
  const m = mctx();
  m.font = fontString(l, px);
  setSpacing(m, l.spacing * px);
  const widths = lines.map((s) => m.measureText(s).width);
  const tw = Math.max(1, ...widths);
  const cx = box.x + l.x * box.w;
  const cy = box.y + l.y * box.h;
  const curved = Math.abs(l.curve) > 0.02;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((l.rot * Math.PI) / 180);
  ctx.globalAlpha = l.opacity;
  ctx.font = fontString(l, px);
  setSpacing(ctx, l.spacing * px);
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.fillStyle = l.color;
  ctx.strokeStyle = l.outlineColor;
  ctx.lineWidth = l.outline * px * 0.16;

  const paint = (s: string, x: number, y: number) => {
    if (l.shadow) {
      ctx.save();
      ctx.shadowColor = "rgba(20,12,4,0.38)";
      ctx.shadowBlur = px * 0.12;
      ctx.shadowOffsetY = px * 0.05;
      ctx.fillText(s, x, y);
      ctx.restore();
    }
    if (l.outline > 0) ctx.strokeText(s, x, y);
    ctx.fillText(s, x, y);
  };

  let bw = tw;
  let bh = lh * lines.length;
  if (curved) {
    // each line on its own arc, stacked
    const theta = Math.abs(l.curve) * Math.PI;
    const dir = l.curve > 0 ? 1 : -1;
    ctx.textAlign = "center";
    const radius = tw / theta;
    lines.forEach((line, li) => {
      const R = radius + (dir > 0 ? -1 : 1) * li * lh;
      const chars = Array.from(line);
      const cw = chars.map((ch) => m.measureText(ch).width);
      const total = cw.reduce((a, b) => a + b, 0);
      let s = -total / 2;
      const y0 = (li - (lines.length - 1) / 2) * lh;
      chars.forEach((ch, i) => {
        const mid = s + cw[i] / 2;
        s += cw[i];
        const a = mid / Math.max(1, R);
        ctx.save();
        ctx.translate(R * Math.sin(a), y0 + dir * R * (1 - Math.cos(a)));
        ctx.rotate(dir * a);
        paint(ch, 0, 0);
        ctx.restore();
      });
    });
    const sag = radius * (1 - Math.cos(Math.min(Math.PI / 2, theta / 2)));
    bw = theta > Math.PI ? radius * 2 : 2 * radius * Math.sin(Math.min(Math.PI / 2, theta / 2));
    bw = Math.max(bw, px);
    bh = bh + sag;
  } else {
    ctx.textAlign = l.align;
    const x = l.align === "left" ? -tw / 2 : l.align === "right" ? tw / 2 : 0;
    lines.forEach((line, i) => paint(line, x, (i - (lines.length - 1) / 2) * lh));
  }
  ctx.restore();
  return { id: l.id, cx, cy: cy + (curved ? (l.curve > 0 ? 1 : -1) * (bh - lh * lines.length) * 0.5 : 0), w: bw + px * 0.2, h: bh, rot: l.rot };
}

/**
 * Paint one side of the pillow: background (extended by `bleed` pixels) and
 * layers, relative to `box`, the cutting line's bounding box.
 */
export function drawSide(
  ctx: CanvasRenderingContext2D,
  side: Side,
  box: Box,
  opts: { bleed?: number; placeholders?: boolean } = {},
): LayerBounds[] {
  drawBackground(ctx, side, box, opts.bleed ?? 0);
  const out: LayerBounds[] = [];
  for (const l of side.layers) {
    if (l.hidden) continue;
    out.push(l.type === "image" ? drawImageLayer(ctx, l, box, opts.placeholders ?? false) : drawTextLayer(ctx, l, box));
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* The sewn pillow                                                     */
/* ------------------------------------------------------------------ */

const OFF = 20000;

const textureCache = new Map<string, HTMLCanvasElement>();
function fabricTexture(kind: string): HTMLCanvasElement {
  let c = textureCache.get(kind);
  if (c) return c;
  const T = 192;
  c = canvas(T, T);
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(T, T);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const slubX = Array.from({ length: T }, () => (rnd() - 0.5) * (kind === "weave" ? 26 : 8));
  const slubY = Array.from({ length: T }, () => (rnd() - 0.5) * (kind === "weave" ? 22 : 6));
  for (let y = 0; y < T; y++)
    for (let x = 0; x < T; x++) {
      let v = 255;
      const n = (rnd() - 0.5) * 2;
      switch (kind) {
        case "smooth":
          v = 246 + n * 8;
          break;
        case "pile":
          v = 242 + n * 9 + slubY[y] * 0.3;
          break;
        case "weave":
          v = 236 + slubX[x] + slubY[y] + ((x + y) % 2 ? -5 : 5) + n * 6;
          break;
        case "canvas":
          v = 238 + (x % 3 === 0 ? -12 : 0) + (y % 3 === 0 ? -10 : 0) + slubX[x] * 0.4 + n * 6;
          break;
      }
      const i = (y * T + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.max(0, Math.min(255, v));
      img.data[i + 3] = 255;
    }
  ctx.putImageData(img, 0, 0);
  textureCache.set(kind, c);
  return c;
}

/** Soft shading that makes a flat print look filled and sewn (cached per shape & size). */
const shadeCache = new Map<string, { shade: HTMLCanvasElement; light: HTMLCanvasElement }>();
function shading(spec: PrintSpec, W: number, H: number, box: Box) {
  const fabric = PRINT_FABRIC_BY_ID[spec.fabric];
  const key = `${spec.shape}|${spec.letter}|${spec.fabric}|${W}x${H}|${box.x},${box.y},${box.w},${box.h}`;
  const hit = shadeCache.get(key);
  if (hit) return hit;
  const S = Math.max(box.w, box.h);

  // outside of the silhouette, used to cast soft shadows inwards
  const outside = canvas(W, H);
  const o = outside.getContext("2d")!;
  o.fillStyle = "#000";
  o.fillRect(0, 0, W, H);
  o.globalCompositeOperation = "destination-out";
  fillShape(o, spec, box, "puff");

  const shade = canvas(W, H);
  const s = shade.getContext("2d")!;
  const deep = fabric.texture === "pile" ? 0.62 : 0.5;
  const passes: [number, number, number][] = [
    [0.1, deep, 0.025],
    [0.035, 0.32, 0.01],
    [0.008, 0.28, 0.002],
  ];
  for (const [blur, alpha, dy] of passes) {
    s.save();
    s.shadowColor = `rgba(38,24,10,${alpha})`;
    s.shadowBlur = blur * S;
    s.shadowOffsetX = OFF;
    s.shadowOffsetY = dy * S;
    s.drawImage(outside, -OFF, 0);
    s.restore();
  }
  // creases at the corners of sewn squares
  const shape = PRINT_SHAPE_BY_ID[spec.shape];
  if (shape.corners && canFilter) {
    s.save();
    s.filter = `blur(${(S * 0.006).toFixed(1)}px)`;
    s.strokeStyle = "rgba(40,26,12,0.22)";
    s.lineCap = "round";
    const corners: [number, number][] = [
      [box.x, box.y],
      [box.x + box.w, box.y],
      [box.x + box.w, box.y + box.h],
      [box.x, box.y + box.h],
    ];
    const cx = box.x + box.w / 2;
    const cy = box.y + box.h / 2;
    corners.forEach(([x, y], i) => {
      for (let k = -1; k <= 1; k++) {
        const ang = Math.atan2(cy - y, cx - x) + k * 0.2 + (i % 2 ? 0.04 : -0.04);
        const len = S * (0.12 + (k === 0 ? 0.06 : 0));
        s.lineWidth = S * (k === 0 ? 0.01 : 0.006);
        s.beginPath();
        s.moveTo(x + Math.cos(ang) * S * 0.02, y + Math.sin(ang) * S * 0.02);
        s.quadraticCurveTo(
          x + Math.cos(ang + 0.1) * len * 0.5,
          y + Math.sin(ang + 0.1) * len * 0.5,
          x + Math.cos(ang) * len,
          y + Math.sin(ang) * len,
        );
        s.stroke();
      }
    });
    s.restore();
  }

  // the dome of the filling catches the light
  const light = canvas(W, H);
  const l = light.getContext("2d")!;
  const g = l.createRadialGradient(
    box.x + box.w * 0.42,
    box.y + box.h * 0.36,
    0,
    box.x + box.w * 0.5,
    box.y + box.h * 0.5,
    S * 0.62,
  );
  g.addColorStop(0, `rgba(255,255,255,${0.2 + fabric.sheen * 0.25})`);
  g.addColorStop(0.55, "rgba(255,255,255,0.06)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  l.fillStyle = g;
  l.fillRect(0, 0, W, H);
  if (fabric.sheen > 0.1) {
    const band = l.createLinearGradient(box.x, box.y, box.x + box.w, box.y + box.h);
    band.addColorStop(0.25, "rgba(255,255,255,0)");
    band.addColorStop(0.4, `rgba(255,255,255,${fabric.sheen * 0.55})`);
    band.addColorStop(0.5, "rgba(255,255,255,0)");
    band.addColorStop(0.68, `rgba(255,255,255,${fabric.sheen * 0.25})`);
    band.addColorStop(0.78, "rgba(255,255,255,0)");
    l.fillStyle = band;
    l.fillRect(0, 0, W, H);
  }
  const res = { shade, light };
  if (shadeCache.size > 12) shadeCache.delete(shadeCache.keys().next().value!);
  shadeCache.set(key, res);
  return res;
}

const trimHex = (spec: PrintSpec) => TRIM_COLOURS.find((t) => t.id === spec.trim)?.hex ?? "#c69a3f";

function drawTassel(ctx: CanvasRenderingContext2D, x: number, y: number, ang: number, S: number, col: string) {
  const len = S * 0.1;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.lineCap = "round";
  for (let i = -7; i <= 7; i++) {
    ctx.strokeStyle = i % 3 === 0 ? "rgba(0,0,0,0.25)" : col;
    ctx.lineWidth = S * 0.0045;
    ctx.beginPath();
    ctx.moveTo(S * 0.03, 0);
    ctx.quadraticCurveTo(len * 0.6, i * S * 0.0016, len, i * S * 0.0028);
    ctx.stroke();
  }
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.ellipse(S * 0.028, 0, S * 0.02, S * 0.014, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.beginPath();
  ctx.ellipse(S * 0.024, -S * 0.005, S * 0.009, S * 0.005, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Room around the pillow's box needed for trims and shadow. */
export const pillowMargin = (box: Box) => Math.max(box.w, box.h) * 0.16;

/**
 * Draw the finished, filled pillow for one side of the design into `ctx`
 * (device pixels, identity transform). Returns the layer bounds for editing.
 */
export function drawPillow(
  ctx: CanvasRenderingContext2D,
  design: Design,
  sideId: "front" | "back",
  box: Box,
  opts: { placeholders?: boolean; shadow?: boolean } = {},
): LayerBounds[] {
  const spec = design.spec;
  const side = sideId === "front" ? design.front : backSide(design);
  const fabric = PRINT_FABRIC_BY_ID[spec.fabric];
  const S = Math.max(box.w, box.h);
  const m = pillowMargin(box);
  const W = Math.ceil(box.w + m * 2);
  const H = Math.ceil(box.h + m * 2);
  const local: Box = { x: m, y: m, w: box.w, h: box.h };
  const ox = box.x - m;
  const oy = box.y - m;
  const trim = trimHex(spec);
  const size = sizeOf(spec);
  const cm = box.w / size.w;

  // 1 — the fabric body
  const body = canvas(W, H);
  const b = body.getContext("2d")!;
  const bounds = drawSide(b, side, local, { bleed: m, placeholders: opts.placeholders });
  if (fabric.saturation < 1) {
    b.save();
    b.globalCompositeOperation = "saturation";
    b.globalAlpha = 1 - fabric.saturation;
    b.fillStyle = "hsl(0,0%,50%)";
    b.fillRect(0, 0, W, H);
    b.restore();
  }
  const pat = b.createPattern(fabricTexture(fabric.texture), "repeat");
  if (pat) {
    b.save();
    b.globalCompositeOperation = "multiply";
    b.globalAlpha = fabric.texture === "smooth" ? 0.6 : 0.9;
    const k = Math.max(0.35, cm / 9);
    pat.setTransform(new DOMMatrix().scale(k));
    b.fillStyle = pat;
    b.fillRect(0, 0, W, H);
    b.restore();
  }
  const { shade, light } = shading(spec, W, H, local);
  b.drawImage(shade, 0, 0);
  b.save();
  b.globalCompositeOperation = "screen";
  b.drawImage(light, 0, 0);
  b.restore();
  b.globalCompositeOperation = "destination-in";
  b.fillStyle = "#000";
  fillShape(b, spec, local, "puff");
  b.globalCompositeOperation = "source-over";

  // 2 — under the body: cast shadow, flange, pom-poms
  ctx.save();
  if (opts.shadow !== false) {
    ctx.save();
    ctx.shadowColor = "rgba(46,30,12,0.38)";
    ctx.shadowBlur = S * 0.07;
    ctx.shadowOffsetY = S * 0.035;
    ctx.fillStyle = side.color;
    ctx.strokeStyle = trim;
    fillShape(ctx, spec, box, "puff");
    if (spec.edge === "flange") strokeShape(ctx, spec, box, cm * 4, "puff");
    ctx.restore();
  }
  if (spec.edge === "flange") {
    ctx.strokeStyle = trim;
    strokeShape(ctx, spec, box, cm * 4, "puff");
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.setLineDash([cm * 0.5, cm * 0.35]);
    strokeShape(ctx, spec, box, Math.max(1, cm * 0.08), "puff");
    ctx.restore();
  }
  if (spec.edge === "pompom") {
    const d = cm * 2.2;
    ctx.save();
    ctx.lineCap = "round";
    ctx.setLineDash([0, d * 1.55]);
    ctx.translate(0, d * 0.12);
    ctx.strokeStyle = "rgba(0,0,0,0.3)";
    strokeShape(ctx, spec, box, d, "puff");
    ctx.translate(0, -d * 0.12);
    ctx.strokeStyle = trim;
    strokeShape(ctx, spec, box, d, "puff");
    ctx.translate(-d * 0.12, -d * 0.14);
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    strokeShape(ctx, spec, box, d * 0.45, "puff");
    ctx.restore();
  }

  // 3 — the body
  ctx.drawImage(body, ox, oy);

  // 4 — seams and trims on top
  if (spec.edge === "piping") {
    const pw = cm * 0.9;
    ctx.save();
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.translate(0, pw * 0.2);
    strokeShape(ctx, spec, box, pw, "puff");
    ctx.translate(0, -pw * 0.2);
    ctx.strokeStyle = trim;
    strokeShape(ctx, spec, box, pw, "puff");
    ctx.translate(-pw * 0.12, -pw * 0.16);
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    strokeShape(ctx, spec, box, pw * 0.3, "puff");
    ctx.restore();
  } else {
    ctx.save();
    ctx.strokeStyle = "rgba(30,20,8,0.22)";
    strokeShape(ctx, spec, box, Math.max(1, cm * 0.12), "puff");
    ctx.restore();
  }
  if (spec.edge === "tassel" && PRINT_SHAPE_BY_ID[spec.shape].corners) {
    const k = 100 / PRINT_SHAPE_BY_ID[spec.shape].vb[2];
    const inset = box.w * 0.01 * k;
    const cx = box.x + box.w / 2;
    const cy = box.y + box.h / 2;
    for (const [x, y] of [
      [box.x + inset, box.y + inset],
      [box.x + box.w - inset, box.y + inset],
      [box.x + box.w - inset, box.y + box.h - inset],
      [box.x + inset, box.y + box.h - inset],
    ]) {
      drawTassel(ctx, x, y, Math.atan2(y - cy, x - cx), S, trim);
    }
  }
  ctx.restore();

  return bounds.map((bd) => ({ ...bd, cx: bd.cx + ox, cy: bd.cy + oy }));
}

/* ------------------------------------------------------------------ */
/* Room scene                                                          */
/* ------------------------------------------------------------------ */

/** A sofa, drawn to scale, with the pillow on it. */
export function drawRoom(ctx: CanvasRenderingContext2D, W: number, H: number, design: Design, sideId: "front" | "back") {
  const size = sizeOf(design.spec);
  // the scene is 260 cm wide
  const pxcm = Math.min(W / 250, H / 170);
  const floorY = H * 0.86;
  const wall = ctx.createLinearGradient(0, 0, 0, floorY);
  wall.addColorStop(0, "#e9dfcd");
  wall.addColorStop(1, "#d9cab1");
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, W, floorY);
  const floor = ctx.createLinearGradient(0, floorY, 0, H);
  floor.addColorStop(0, "#9c7a55");
  floor.addColorStop(1, "#7a5b3b");
  ctx.fillStyle = floor;
  ctx.fillRect(0, floorY, W, H - floorY);
  // wainscot line
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.fillRect(0, floorY - pxcm * 10, W, pxcm * 1.2);

  const cx = W / 2;
  const sw = 210 * pxcm;
  const left = cx - sw / 2;
  const seatY = floorY - 44 * pxcm;
  const backTop = floorY - 88 * pxcm;
  const sofa = "#6f7d74";
  const sofaDk = "#56635b";
  // shadow
  ctx.save();
  ctx.fillStyle = "rgba(40,28,14,0.3)";
  ctx.filter = canFilter ? `blur(${(pxcm * 4).toFixed(1)}px)` : "none";
  ctx.beginPath();
  ctx.ellipse(cx, floorY + pxcm * 2, sw * 0.55, pxcm * 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // legs
  ctx.fillStyle = "#3a2a1a";
  for (const x of [left + 12 * pxcm, left + sw - 16 * pxcm]) ctx.fillRect(x, floorY - 10 * pxcm, 4 * pxcm, 10 * pxcm);
  // back
  const g = ctx.createLinearGradient(0, backTop, 0, seatY);
  g.addColorStop(0, "#7d8b82");
  g.addColorStop(1, sofaDk);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(left + 8 * pxcm, backTop, sw - 16 * pxcm, seatY - backTop + 10 * pxcm, 10 * pxcm);
  ctx.fill();
  // seat
  const sg = ctx.createLinearGradient(0, seatY, 0, floorY - 10 * pxcm);
  sg.addColorStop(0, "#86948a");
  sg.addColorStop(1, sofa);
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.roundRect(left + 6 * pxcm, seatY - 4 * pxcm, sw - 12 * pxcm, 34 * pxcm, 8 * pxcm);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.15)";
  ctx.lineWidth = Math.max(1, pxcm * 0.4);
  ctx.beginPath();
  ctx.moveTo(cx, seatY);
  ctx.lineTo(cx, seatY + 26 * pxcm);
  ctx.stroke();
  // arms
  for (const x of [left, left + sw - 22 * pxcm]) {
    const ag = ctx.createLinearGradient(x, 0, x + 22 * pxcm, 0);
    ag.addColorStop(0, sofaDk);
    ag.addColorStop(0.5, "#7a877f");
    ag.addColorStop(1, sofaDk);
    ctx.fillStyle = ag;
    ctx.beginPath();
    ctx.roundRect(x, seatY - 20 * pxcm, 22 * pxcm, 50 * pxcm, [11 * pxcm, 11 * pxcm, 4 * pxcm, 4 * pxcm]);
    ctx.fill();
  }

  // the pillow, leaning on the back cushion
  const bw = size.w * pxcm;
  const bh = size.h * pxcm;
  const pad = pillowMargin({ x: 0, y: 0, w: bw, h: bh });
  const off = canvas(bw + pad * 2, bh + pad * 2);
  drawPillow(off.getContext("2d")!, design, sideId, { x: pad, y: pad, w: bw, h: bh });
  ctx.save();
  ctx.translate(cx + 28 * pxcm, seatY + 2 * pxcm - bh / 2);
  ctx.rotate(-0.06);
  ctx.drawImage(off, -bw / 2 - pad, -bh / 2 - pad);
  ctx.restore();

  // scale note
  ctx.fillStyle = "rgba(46,36,26,0.7)";
  ctx.font = `500 ${Math.max(11, pxcm * 3.2)}px "Inter Variable", sans-serif`;
  ctx.textAlign = "left";
  ctx.fillText(`Shown to scale on a 210 cm sofa · ${size.label}`, pxcm * 6, pxcm * 8);
}

/* ------------------------------------------------------------------ */
/* Print files                                                         */
/* ------------------------------------------------------------------ */

/** Wait for every image a design uses to decode. */
export async function preloadDesign(design: Design) {
  const srcs = new Set<string>();
  for (const side of [design.front, design.back]) {
    if (side.fill?.type === "image") srcs.add(side.fill.src);
    side.layers.forEach((l: Layer) => l.type === "image" && l.src && srcs.add(l.src));
  }
  await Promise.all([...srcs].map((s) => loadImage(s).catch(() => null)));
  if (typeof document !== "undefined" && document.fonts) {
    const fams = new Set<string>();
    for (const side of [design.front, design.back]) side.layers.forEach((l) => l.type === "text" && fams.add(fontString(l, 40)));
    fams.add('800 100px "Montserrat"');
    await Promise.all([...fams].map((f) => document.fonts.load(f).catch(() => null)));
  }
}

/** Full-resolution print artwork for one side, with bleed, ready for the printer. */
export async function renderPrintFile(design: Design, sideId: "front" | "back", dpi = PRINT_DPI) {
  await preloadDesign(design);
  const size = sizeOf(design.spec);
  const pxcm = dpi / 2.54;
  const bleed = BLEED_CM * pxcm;
  const c = canvas((size.w + BLEED_CM * 2) * pxcm, (size.h + BLEED_CM * 2) * pxcm);
  const ctx = c.getContext("2d")!;
  const side = sideId === "front" ? design.front : backSide(design);
  drawSide(ctx, side, { x: bleed, y: bleed, w: size.w * pxcm, h: size.h * pxcm }, { bleed });
  return c;
}

/**
 * A one-page proof for the workroom and the customer: both sides flat with the
 * cutting line, the safe area, the specification and a mock-up.
 */
export async function renderProof(design: Design, ref: string) {
  await preloadDesign(design);
  const spec = design.spec;
  const size = sizeOf(spec);
  const W = 2400;
  const H = 1120;
  const c = canvas(W, H);
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#fbf8f2";
  ctx.fillRect(0, 0, W, H);

  const cell = 700;
  const pxcm = Math.min(cell / (size.w + BLEED_CM * 2), cell / (size.h + BLEED_CM * 2));
  const sides: ["front" | "back", string][] = [
    ["front", "FRONT"],
    ["back", "BACK"],
  ];
  sides.forEach(([sid, label], i) => {
    const bx = 90 + i * (cell + 90) + (cell - size.w * pxcm) / 2;
    const by = 190 + (cell - size.h * pxcm) / 2;
    const box = { x: bx, y: by, w: size.w * pxcm, h: size.h * pxcm };
    const bleed = BLEED_CM * pxcm;
    ctx.save();
    ctx.beginPath();
    ctx.rect(box.x - bleed, box.y - bleed, box.w + bleed * 2, box.h + bleed * 2);
    ctx.clip();
    drawSide(ctx, sid === "front" ? design.front : backSide(design), box, { bleed });
    // dim what will be cut away
    ctx.fillStyle = "rgba(251,248,242,0.62)";
    ctx.beginPath();
    ctx.rect(box.x - bleed, box.y - bleed, box.w + bleed * 2, box.h + bleed * 2);
    ctx.fill();
    ctx.restore();
    // redraw the kept part crisply
    const keep = canvas(W, H);
    const k = keep.getContext("2d")!;
    drawSide(k, sid === "front" ? design.front : backSide(design), box, { bleed });
    k.globalCompositeOperation = "destination-in";
    fillShape(k, spec, box, "cut");
    ctx.drawImage(keep, 0, 0);
    // lines
    ctx.strokeStyle = "#e0007a";
    ctx.lineWidth = 3;
    strokeShape(ctx, spec, box, 3, "cut");
    ctx.save();
    ctx.strokeStyle = "#0a7cc2";
    ctx.setLineDash([10, 8]);
    const safe = SAFE_CM * pxcm;
    strokeShape(ctx, spec, { x: box.x + safe, y: box.y + safe, w: box.w - safe * 2, h: box.h - safe * 2 }, 2, "cut");
    ctx.restore();
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.lineWidth = 1;
    ctx.strokeRect(box.x - bleed, box.y - bleed, box.w + bleed * 2, box.h + bleed * 2);
    ctx.fillStyle = "#2e241a";
    ctx.font = '600 30px "Inter Variable", sans-serif';
    ctx.textAlign = "center";
    ctx.fillText(label, 90 + i * (cell + 90) + cell / 2, 160);
  });

  // mock-up
  const mb = { x: 1780, y: 260, w: 480, h: (480 * size.h) / size.w };
  if (mb.h > 480) {
    mb.w = (480 * size.w) / size.h;
    mb.h = 480;
    mb.x = 1780 + (480 - mb.w) / 2;
  }
  drawPillow(ctx, design, "front", mb);

  ctx.textAlign = "left";
  ctx.fillStyle = "#2e241a";
  ctx.font = '400 64px "Cormorant Garamond", Georgia, serif';
  ctx.fillText("GD Home Fabric — print proof", 90, 100);
  ctx.font = '500 28px "Inter Variable", sans-serif';
  ctx.fillStyle = "#8a6612";
  ctx.fillText(ref, W - 90 - ctx.measureText(ref).width, 100);

  ctx.fillStyle = "#2e241a";
  ctx.font = '500 26px "Inter Variable", sans-serif';
  let y = 820;
  ctx.fillText(describePrint(spec), 1730, y);
  ctx.font = '400 24px "Inter Variable", sans-serif';
  for (const [k, v] of Object.entries(printDetails(spec))) {
    y += 40;
    ctx.fillStyle = "#6f5f48";
    ctx.fillText(k, 1730, y);
    ctx.fillStyle = "#2e241a";
    ctx.fillText(v, 1880, y);
  }
  ctx.font = '400 22px "Inter Variable", sans-serif';
  ctx.fillStyle = "#e0007a";
  ctx.fillText("━ cutting line", 90, 960);
  ctx.fillStyle = "#0a7cc2";
  ctx.fillText("┅ keep text & faces inside", 330, 960);
  ctx.fillStyle = "#6f5f48";
  ctx.fillText(`Outer frame = ${BLEED_CM} cm bleed. Print file at ${PRINT_DPI} dpi.`, 690, 960);
  return c;
}

/** Small JPEG of the finished pillow, for the cart. */
export async function renderThumb(design: Design, px = 320) {
  await preloadDesign(design);
  const size = sizeOf(design.spec);
  const c = canvas(px, px);
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#efe6d6";
  ctx.fillRect(0, 0, px, px);
  const k = (px * 0.7) / Math.max(size.w, size.h);
  const w = size.w * k;
  const h = size.h * k;
  drawPillow(ctx, design, "front", { x: (px - w) / 2, y: (px - h) / 2, w, h });
  return c.toDataURL("image/jpeg", 0.85);
}

export const canvasToBlob = (c: HTMLCanvasElement, type = "image/png", q?: number) =>
  new Promise<Blob>((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error("export failed"))), type, q));

export async function downloadCanvas(c: HTMLCanvasElement, name: string, type = "image/png") {
  const blob = await canvasToBlob(c, type, 0.95);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
