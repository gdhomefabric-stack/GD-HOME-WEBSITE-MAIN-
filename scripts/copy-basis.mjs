// Copies three.js' Basis Universal transcoder next to the site so KTX2 textures
// decode without any third-party CDN.
import { cpSync, mkdirSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const src = path.join(root, "node_modules/three/examples/jsm/libs/basis");
const dst = path.join(root, "public/basis");
mkdirSync(dst, { recursive: true });
for (const f of ["basis_transcoder.js", "basis_transcoder.wasm"]) cpSync(path.join(src, f), path.join(dst, f));
console.log("[basis] transcoder copied to public/basis");
