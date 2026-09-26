import sharp from "sharp";
import { encodeToKTX2 } from "ktx2-encoder";

export interface KTXOptions {
  /** UASTC (higher quality, used for normal maps) vs ETC1S (small, used for colour) */
  uastc?: boolean;
  /** colour data (sRGB) vs linear data (normals, masks) */
  srgb?: boolean;
  normalMap?: boolean;
  quality?: number;
}

const decoder = async (buf: Uint8Array) => {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { width: info.width, height: info.height, data: new Uint8Array(data) };
};

export async function rawToPNG(rgba: Uint8Array, w: number, h: number): Promise<Buffer> {
  return sharp(Buffer.from(rgba), { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
}

export async function rawToWebP(rgba: Uint8Array, w: number, h: number, quality = 82, alpha = false): Promise<Buffer> {
  let img = sharp(Buffer.from(rgba), { raw: { width: w, height: h, channels: 4 } });
  if (!alpha) img = img.removeAlpha();
  return img.webp({ quality, effort: 5, alphaQuality: 90 }).toBuffer();
}

export async function pngToKTX2(png: Uint8Array, o: KTXOptions = {}): Promise<Uint8Array> {
  const srgb = o.srgb ?? true;
  return encodeToKTX2(new Uint8Array(png), {
    isUASTC: o.uastc ?? false,
    isKTX2File: true,
    generateMipmap: true,
    isPerceptual: srgb,
    isSetKTX2SRGBTransferFunc: srgb,
    isNormalMap: o.normalMap ?? false,
    qualityLevel: o.quality ?? 160,
    compressionLevel: 3,
    needSupercompression: o.uastc ?? false,
    enableRDO: o.uastc ?? false,
    rdoQualityLevel: 1.5,
    imageDecoder: decoder,
  });
}

export async function rawToKTX2(rgba: Uint8Array, w: number, h: number, o: KTXOptions = {}) {
  return pngToKTX2(await rawToPNG(rgba, w, h), o);
}

export async function svgToRaw(svg: string, w: number, h: number): Promise<Uint8Array> {
  const { data } = await sharp(Buffer.from(svg), { density: 96 })
    .resize(w, h)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return new Uint8Array(data);
}
