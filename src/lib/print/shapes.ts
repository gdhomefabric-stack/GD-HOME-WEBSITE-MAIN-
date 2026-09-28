import { PRINT_SHAPE_BY_ID, type PrintSpec } from "@/data/printPillows";

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type ShapeVariant = "cut" | "puff";

/** The typeface letter pillows are cut from. */
export const LETTER_FONT = '800 100px "Montserrat", "Arial Black", sans-serif';

const pathCache = new Map<string, Path2D>();
function basePath(d: string) {
  let p = pathCache.get(d);
  if (!p) {
    p = new Path2D(d);
    pathCache.set(d, p);
  }
  return p;
}

/** Shape outline mapped onto `box`, or null for the letter shape (drawn as text). */
export function shapePath(spec: Pick<PrintSpec, "shape">, box: Box, variant: ShapeVariant): Path2D | null {
  const s = PRINT_SHAPE_BY_ID[spec.shape];
  const d = variant === "puff" && s.puff ? s.puff : s.d;
  if (!d) return null;
  const [vx, vy, vw, vh] = s.vb;
  const sx = box.w / vw;
  const sy = box.h / vh;
  const m = new DOMMatrix([sx, 0, 0, sy, box.x - vx * sx, box.y - vy * sy]);
  const p = new Path2D();
  p.addPath(basePath(d), m);
  return p;
}

let measureCtx: CanvasRenderingContext2D | null = null;
const letterMetrics = new Map<string, { l: number; r: number; a: number; d: number }>();
function measureLetter(ch: string) {
  const key = ch;
  const hit = letterMetrics.get(key);
  if (hit) return hit;
  if (!measureCtx) measureCtx = document.createElement("canvas").getContext("2d");
  const ctx = measureCtx!;
  ctx.font = LETTER_FONT;
  const m = ctx.measureText(ch);
  const res = {
    l: m.actualBoundingBoxLeft,
    r: m.actualBoundingBoxRight,
    a: m.actualBoundingBoxAscent,
    d: m.actualBoundingBoxDescent,
  };
  // only cache once the web font is in (fallback metrics differ)
  if (document.fonts?.check?.(LETTER_FONT)) letterMetrics.set(key, res);
  return res;
}

/** Transform the context so the 100px letter fills `box`. */
function letterTransform(ctx: CanvasRenderingContext2D, ch: string, box: Box) {
  const m = measureLetter(ch);
  const w = Math.max(1, m.l + m.r);
  const h = Math.max(1, m.a + m.d);
  ctx.translate(box.x, box.y);
  ctx.scale(box.w / w, box.h / h);
  ctx.translate(m.l, m.a);
  ctx.font = LETTER_FONT;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  return (box.w / w + box.h / h) / 2;
}

const letterOf = (spec: Pick<PrintSpec, "letter">) => (spec.letter || "A").slice(0, 1);

export function fillShape(ctx: CanvasRenderingContext2D, spec: Pick<PrintSpec, "shape" | "letter">, box: Box, variant: ShapeVariant = "puff") {
  const p = shapePath(spec, box, variant);
  if (p) {
    ctx.fill(p);
    return;
  }
  ctx.save();
  letterTransform(ctx, letterOf(spec), box);
  ctx.fillText(letterOf(spec), 0, 0);
  ctx.restore();
}

export function strokeShape(
  ctx: CanvasRenderingContext2D,
  spec: Pick<PrintSpec, "shape" | "letter">,
  box: Box,
  lineWidth: number,
  variant: ShapeVariant = "puff",
) {
  const p = shapePath(spec, box, variant);
  ctx.lineJoin = "round";
  if (p) {
    ctx.lineWidth = lineWidth;
    ctx.stroke(p);
    return;
  }
  ctx.save();
  const k = letterTransform(ctx, letterOf(spec), box);
  ctx.lineWidth = lineWidth / k;
  const dash = ctx.getLineDash();
  if (dash.length) ctx.setLineDash(dash.map((v) => v / k));
  ctx.strokeText(letterOf(spec), 0, 0);
  ctx.restore();
}

/** Small SVG icon for a shape picker. */
export function shapeIconPath(id: PrintSpec["shape"]) {
  const s = PRINT_SHAPE_BY_ID[id];
  return { d: s.d ?? "", viewBox: s.vb.join(" ") };
}
