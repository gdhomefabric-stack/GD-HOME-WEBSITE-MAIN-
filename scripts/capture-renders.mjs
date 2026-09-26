/**
 * Renders the static images used by the room gallery (no-WebGL fallback), the
 * mobile room cards and the loading poster: public/renders/<room>.webp + overview.
 *
 *   npm run dev            (in another terminal, default http://localhost:3000)
 *   npm run assets:renders -- http://localhost:3000 [overview living …]
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import sharp from "sharp";

const base = process.argv[2] ?? "http://localhost:3000";
const only = process.argv.slice(3);
const out = path.resolve(import.meta.dirname, "../public/renders");
const ROOMS = ["living", "dining", "guest", "nursery", "theatre", "study", "master", "suite"];
const shots = [{ name: "overview", query: "" }, ...ROOMS.map((r) => ({ name: r, query: `&room=${r}` }))].filter(
  (s) => !only.length || only.includes(s.name),
);

await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
for (const shot of shots) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  await page.goto(`${base}/?mode=high&capture=1${shot.query}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.querySelector(".vui.is-ready"), null, { timeout: 240000 });
  // let shadows, AO and the emissive lamps settle on a software renderer
  await page.waitForTimeout(9000);
  const png = await page.screenshot({ type: "png" });
  await sharp(png).resize(1280, 800).webp({ quality: 80, effort: 6 }).toFile(path.join(out, `${shot.name}.webp`));
  if (shot.name === "overview") {
    await sharp(png).resize(1200, 630, { fit: "cover", position: "centre" }).jpeg({ quality: 82, mozjpeg: true }).toFile(path.join(out, "og.jpg"));
  }
  console.log("[renders]", shot.name);
  await page.close();
}
await browser.close();
