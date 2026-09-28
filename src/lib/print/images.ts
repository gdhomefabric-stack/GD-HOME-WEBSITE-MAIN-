/** Decoded images shared by every canvas in the studio. */

const cache = new Map<string, HTMLImageElement>();
const pending = new Map<string, Promise<HTMLImageElement>>();
const listeners = new Set<() => void>();

export function onImageLoaded(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  const hit = cache.get(src);
  if (hit) return Promise.resolve(hit);
  let p = pending.get(src);
  if (p) return p;
  p = new Promise<HTMLImageElement>((resolve, reject) => {
    const im = new Image();
    im.decoding = "async";
    if (!src.startsWith("data:") && !src.startsWith("blob:")) im.crossOrigin = "anonymous";
    im.onload = () => {
      cache.set(src, im);
      pending.delete(src);
      listeners.forEach((l) => l());
      resolve(im);
    };
    im.onerror = () => {
      pending.delete(src);
      reject(new Error("image failed to load"));
    };
    im.src = src;
  });
  pending.set(src, p);
  return p;
}

/** The decoded image if it is ready; otherwise starts loading it and returns null. */
export function imageNow(src: string): HTMLImageElement | null {
  if (!src) return null;
  const hit = cache.get(src);
  if (hit) return hit;
  loadImage(src).catch(() => {});
  return null;
}

export const blobToDataUrl = (b: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(b);
  });

/**
 * Read an uploaded photo, downscaled so the longest side is at most `max`
 * pixels (plenty for a 60 cm print) and re-encoded to keep storage small.
 */
export async function readPhoto(file: File, max = 3200): Promise<{ src: string; w: number; h: number }> {
  const url = URL.createObjectURL(file);
  try {
    const im = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("Not an image we can read"));
      i.src = url;
    });
    const k = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight));
    const w = Math.round(im.naturalWidth * k);
    const h = Math.round(im.naturalHeight * k);
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(im, 0, 0, w, h);
    const png = file.type === "image/png" || file.type === "image/webp" || file.type === "image/gif";
    const src = png && hasTransparency(ctx, w, h) ? c.toDataURL("image/png") : c.toDataURL("image/jpeg", 0.9);
    return { src, w, h };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function hasTransparency(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const step = Math.max(1, Math.floor(Math.min(w, h) / 64));
  const data = ctx.getImageData(0, 0, w, h).data;
  for (let y = 0; y < h; y += step)
    for (let x = 0; x < w; x += step) if (data[(y * w + x) * 4 + 3] < 250) return true;
  return false;
}
