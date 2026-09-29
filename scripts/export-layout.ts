/**
 * Writes the villa layout (src/data/villa.ts) to scripts/blender/layout.json so the
 * Blender pipeline builds, lights and bakes the rooms from the same source of truth
 * as the runtime.
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { BEDS, DOORS, EXT_WALL, INT_WALL, ROD_HEIGHT, ROOMS, VILLA_BOUNDS, WALL_HEIGHT, WINDOWS } from "../src/data/villa";

const out = path.resolve(import.meta.dirname, "blender/layout.json");
const data = {
  wallHeight: WALL_HEIGHT,
  extWall: EXT_WALL,
  intWall: INT_WALL,
  rodHeight: ROD_HEIGHT,
  bounds: VILLA_BOUNDS,
  rooms: ROOMS.map(({ id, name, bounds, row, lamps, view }) => ({ id, name, bounds, row, lamps, view })),
  windows: WINDOWS,
  beds: BEDS,
  doors: DOORS,
};
await writeFile(out, JSON.stringify(data, null, 2) + "\n");
console.log("[layout] wrote", path.relative(process.cwd(), out));
