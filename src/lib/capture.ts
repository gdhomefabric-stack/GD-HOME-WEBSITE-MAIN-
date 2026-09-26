/** Bridge so DOM UI can snapshot the WebGL view (saved looks, comparisons). */
type CaptureFn = (width: number, cropRight: number) => Promise<string | null>;

let captureFn: CaptureFn | null = null;

export const registerCapture = (fn: CaptureFn | null) => {
  captureFn = fn;
};

/** Snapshot of the 3-D view, leaving out the strip covered by a side panel. */
export const captureView = async (width = 640): Promise<string | null> => {
  try {
    const panel = document.querySelector(".customizer");
    const cropRight = panel && window.innerWidth > 760 ? window.innerWidth - panel.getBoundingClientRect().left : 0;
    return captureFn ? await captureFn(width, cropRight / window.innerWidth) : null;
  } catch {
    return null;
  }
};

/** Scale the WebGL canvas into a compact JPEG. */
export function grabCanvas(src: HTMLCanvasElement, width: number, cropRight = 0): string | null {
  const sw = Math.round(src.width * (1 - Math.min(0.6, Math.max(0, cropRight))));
  const c = document.createElement("canvas");
  c.width = width;
  c.height = Math.round((width * src.height) / sw);
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(src, 0, 0, sw, src.height, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.84);
}

/** Resolve after `n` animation frames (lets React commit and the scene re-render). */
export const nextFrames = (n = 2) =>
  new Promise<void>((resolve) => {
    let i = 0;
    const tick = () => (++i >= n ? resolve() : requestAnimationFrame(tick));
    requestAnimationFrame(tick);
  });
