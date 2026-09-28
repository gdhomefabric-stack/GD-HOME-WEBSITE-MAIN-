/**
 * AI artwork for the print studio.
 *
 * The site is a static export, so there is no server to hide an API key on.
 * By default it uses Pollinations (free, no key, called straight from the
 * visitor's browser). To use another service, set NEXT_PUBLIC_AI_IMAGE_URL at
 * build time to a URL template with {prompt}, {width}, {height} and {seed}
 * placeholders (and {key}, filled from NEXT_PUBLIC_AI_IMAGE_KEY — only ever a
 * publishable key, because it ships to the browser).
 */

import { blobToDataUrl } from "./images";

const DEFAULT_TEMPLATE =
  "https://image.pollinations.ai/prompt/{prompt}?width={width}&height={height}&seed={seed}&nologo=true&model=flux&referrer=gdhomefabric.in";

const TEMPLATE = process.env.NEXT_PUBLIC_AI_IMAGE_URL || DEFAULT_TEMPLATE;
const KEY = process.env.NEXT_PUBLIC_AI_IMAGE_KEY || "";

export type AiKind = "pattern" | "art";

export interface AiStyle {
  id: string;
  name: string;
  prompt: string;
}

export const AI_STYLES: AiStyle[] = [
  { id: "auto", name: "Any style", prompt: "beautiful, professional textile design" },
  { id: "watercolour", name: "Watercolour", prompt: "soft watercolour painting, delicate washes, paper texture" },
  { id: "botanical", name: "Vintage botanical", prompt: "vintage botanical illustration, fine engraved line work, antique print" },
  { id: "line", name: "Line art", prompt: "minimal continuous line art, clean ink lines, lots of negative space" },
  { id: "boho", name: "Boho", prompt: "boho mid-century style, earthy tones, organic shapes, flat illustration" },
  { id: "blockprint", name: "Indian block print", prompt: "traditional Indian hand block print, Sanganeri and Bagru motifs, slightly irregular ink" },
  { id: "madhubani", name: "Madhubani", prompt: "Madhubani folk painting, bold outlines, intricate patterns, vibrant natural colours" },
  { id: "pop", name: "Pop art", prompt: "bold pop art, thick outlines, halftone dots, bright flat colours" },
  { id: "kids", name: "Kids cartoon", prompt: "cute children's book illustration, friendly cartoon, soft pastel colours" },
  { id: "oil", name: "Oil painting", prompt: "rich impressionist oil painting, visible brush strokes" },
  { id: "photo", name: "Photo-real", prompt: "photorealistic, studio lighting, sharp focus, high detail" },
  { id: "damask", name: "Damask luxe", prompt: "luxury damask, ornate baroque motifs, gold accents" },
  { id: "geometric", name: "Geometric", prompt: "modern geometric art, crisp shapes, balanced composition" },
];

export const AI_MOODS = [
  { id: "any", name: "Any colours", prompt: "" },
  { id: "pastel", name: "Pastel", prompt: "pastel colour palette" },
  { id: "earthy", name: "Earthy", prompt: "earthy terracotta, olive and cream palette" },
  { id: "jewel", name: "Jewel tones", prompt: "rich jewel tones, emerald, sapphire and gold" },
  { id: "neutral", name: "Neutral", prompt: "calm neutral beige, ivory and taupe palette" },
  { id: "bright", name: "Bright", prompt: "bright joyful saturated colours" },
  { id: "mono", name: "Black & white", prompt: "black and white monochrome" },
];

export const AI_IDEAS: { kind: AiKind; text: string }[] = [
  { kind: "pattern", text: "pink peonies and eucalyptus leaves on cream" },
  { kind: "pattern", text: "lemons and blossoms, Mediterranean summer" },
  { kind: "pattern", text: "peacocks and lotus flowers" },
  { kind: "pattern", text: "tropical monstera and banana leaves" },
  { kind: "pattern", text: "tiny golden stars and crescent moons on navy" },
  { kind: "pattern", text: "marigold garlands and diyas for Diwali" },
  { kind: "pattern", text: "Christmas holly, pine cones and red berries" },
  { kind: "pattern", text: "sea shells, starfish and coral" },
  { kind: "art", text: "a golden retriever puppy wearing a flower crown" },
  { kind: "art", text: "an elephant decorated with festive paisley patterns" },
  { kind: "art", text: "a cosy reading nook with a sleeping cat" },
  { kind: "art", text: "a hot air balloon over lavender fields at sunrise" },
  { kind: "art", text: "a wreath of wildflowers framing an empty centre" },
  { kind: "art", text: "a friendly dinosaur astronaut for a kid's room" },
  { kind: "art", text: "the Taj Mahal at dusk, dreamy and romantic" },
  { kind: "art", text: "a peacock feather close-up, jewel colours" },
];

export function buildPrompt(text: string, kind: AiKind, styleId: string, moodId: string) {
  const style = AI_STYLES.find((s) => s.id === styleId) ?? AI_STYLES[0];
  const mood = AI_MOODS.find((m) => m.id === moodId);
  const subject = text.trim() || (kind === "pattern" ? "elegant florals" : "a beautiful bouquet of flowers");
  const parts =
    kind === "pattern"
      ? [
          subject,
          style.prompt,
          mood?.prompt,
          "seamless repeating all-over pattern, flat textile print design seen straight on, evenly spread motifs, fills the whole frame",
          "no text, no watermark, no pillow, no mockup, no border",
        ]
      : [
          subject,
          style.prompt,
          mood?.prompt,
          "centred composition that fills the square, artwork for a printed cushion cover, seen straight on",
          "no text, no watermark, no pillow, no mockup, no frame",
        ];
  return parts.filter(Boolean).join(", ");
}

export function aiUrl(prompt: string, seed: number, width = 1024, height = 1024) {
  return TEMPLATE.replace("{prompt}", encodeURIComponent(prompt))
    .replace("{width}", String(width))
    .replace("{height}", String(height))
    .replace("{seed}", String(seed))
    .replace("{key}", encodeURIComponent(KEY));
}

export class AiError extends Error {
  constructor(
    message: string,
    public busy = false,
  ) {
    super(message);
  }
}

/**
 * Generate one image and return it as a data URL (so it can be saved with the
 * design, exported at print resolution and never taints the canvas).
 */
export async function generateImage(prompt: string, seed: number, signal?: AbortSignal, size = 1024) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 120_000);
  const onAbort = () => ctrl.abort();
  signal?.addEventListener("abort", onAbort);
  try {
    const res = await fetch(aiUrl(prompt, seed, size, size), { signal: ctrl.signal, mode: "cors", credentials: "omit" });
    if (res.status === 429 || res.status === 402 || res.status >= 500) throw new AiError("The image service is busy right now.", true);
    if (!res.ok) throw new AiError(`The image service answered ${res.status}.`);
    const blob = await res.blob();
    if (!blob.type.startsWith("image/")) throw new AiError("The image service sent something that isn't an image.");
    return await blobToDataUrl(blob);
  } catch (e) {
    if (e instanceof AiError) throw e;
    if (signal?.aborted) throw new AiError("Cancelled.");
    if (ctrl.signal.aborted) throw new AiError("That took too long — the service may be busy.", true);
    throw new AiError("Couldn't reach the image service. Check your connection.", true);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}

export const randomSeed = () => Math.floor(Math.random() * 2_000_000_000);
