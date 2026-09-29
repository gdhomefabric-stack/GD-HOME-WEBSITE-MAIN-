/**
 * Packs the Blender-baked rooms for the web.
 *
 *  scripts/.cache/bake/<room>.glb  → public/rooms/<room>/room.glb   (meshopt, quantised positions/normals)
 *  scripts/.cache/tex/<set>_*.png  → public/textures/room/<set>_{albedo,normal,rough}.ktx2
 *
 * Materials in the GLBs carry only their names; the runtime builds them from
 * src/data/roomMaterials.json with the shared KTX2 texture sets, so textures used
 * in several rooms download once.
 *
 *   npx tsx scripts/pack-rooms.ts [--rooms master,living] [--textures]
 */
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, meshopt, prune, quantize, reorder, weld } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";
import sharp from "sharp";
import { pngToKTX2 } from "./lib/encode";

const ROOT = path.resolve(import.meta.dirname, "..");
const BAKE = path.join(ROOT, "scripts/.cache/bake");
const TEX = path.join(ROOT, "scripts/.cache/tex");
const OUT_ROOMS = path.join(ROOT, "public/rooms");
const OUT_TEX = path.join(ROOT, "public/textures/room");
const ROOMS = ["living", "dining", "guest", "nursery", "theatre", "study", "master", "suite"];

const arg = (name: string) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const log = (...a: unknown[]) => console.log("[pack]", ...a);

async function packRoom(id: string) {
  const src = path.join(BAKE, `${id}.glb`);
  if (!existsSync(src)) return log(id, "not baked yet, skipped");
  await MeshoptEncoder.ready;
  await MeshoptDecoder.ready;
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
    "meshopt.encoder": MeshoptEncoder,
    "meshopt.decoder": MeshoptDecoder,
  });
  const doc = await io.read(src);
  // texture UVs are in metres and the lightmap UVs need full precision: only quantise
  // positions and normals (the vertex lighting is already 16-bit)
  await doc.transform(
    weld(),
    dedup(),
    prune({ keepExtras: true, keepAttributes: true }),
    reorder({ encoder: MeshoptEncoder }),
    quantize({ pattern: /^(POSITION|NORMAL)$/, quantizePosition: 14, quantizeNormal: 10 }),
    meshopt({ encoder: MeshoptEncoder, level: "medium" }),
  );
  const out = path.join(OUT_ROOMS, id, "room.glb");
  await mkdir(path.dirname(out), { recursive: true });
  await writeFile(out, await io.writeBinary(doc));
  const tris = doc
    .getRoot()
    .listMeshes()
    .flatMap((m) => m.listPrimitives())
    .reduce((s, p) => s + (p.getIndices()?.getCount() ?? 0) / 3, 0);
  log(id, `${Math.round(tris / 1000)}k tris`, `${((await stat(out)).size / 1024 / 1024).toFixed(2)} MB`);
}

async function packTextures() {
  const mats = JSON.parse(await readFile(path.join(ROOT, "src/data/roomMaterials.json"), "utf8")) as Record<
    string,
    { tex?: string; uv01?: boolean }
  >;
  await rm(OUT_TEX, { recursive: true, force: true });
  await mkdir(OUT_TEX, { recursive: true });
  const sets = new Map<string, boolean>();
  for (const m of Object.values(mats)) if (m.tex) sets.set(m.tex, !!m.uv01 || sets.get(m.tex) === true);
  const exterior = new Set(["grass", "gravel"]);
  for (const [set, single] of sets) {
    if (exterior.has(set)) continue;
    const floor = /_planks$|^travertine_tiles$/.test(set);
    const png = (map: string) => readFile(path.join(TEX, `${set}_${map}.png`));
    // colour: Basis ETC1S (small on the GPU)
    const albedo = await pngToKTX2(new Uint8Array(await png("albedo")), { srgb: true, quality: 180 });
    await writeFile(path.join(OUT_TEX, `${set}_albedo.ktx2`), albedo);
    if (single) {
      log("texture", set, `albedo ${(albedo.length / 1024).toFixed(0)} KB`);
      continue;
    }
    // normals: lossy WebP stays smooth where ETC1S would block them up
    const nSize = floor ? 1024 : 512;
    const normal = await sharp(await png("normal"))
      .resize(nSize, nSize, { kernel: "lanczos3" })
      .webp({ quality: 88, effort: 6 })
      .toBuffer();
    await writeFile(path.join(OUT_TEX, `${set}_normal.webp`), normal);
    // roughness: small ETC1S
    const roughPng = await sharp(await png("rough")).resize(512, 512, { kernel: "lanczos3" }).png().toBuffer();
    const rough = await pngToKTX2(new Uint8Array(roughPng), { srgb: false, quality: 150 });
    await writeFile(path.join(OUT_TEX, `${set}_rough.ktx2`), rough);
    log(
      "texture",
      set,
      `albedo ${(albedo.length / 1024).toFixed(0)} KB, normal ${(normal.length / 1024).toFixed(0)} KB, rough ${(rough.length / 1024).toFixed(0)} KB`,
    );
  }
}

const only = arg("--rooms")?.split(",") ?? ROOMS;
if (process.argv.includes("--textures")) await packTextures();
for (const id of only) await packRoom(id);
