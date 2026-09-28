/**
 * Designs hold photos, so they live in IndexedDB (localStorage is far too
 * small). Everything fails soft: private windows and blocked storage just
 * mean nothing is remembered.
 */
import type { Design } from "./design";

const DB = "gdhf-print";
const STORE = "designs";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("no IndexedDB"));
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | undefined> {
  try {
    const db = await open();
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return undefined;
  }
}

export const DRAFT = "draft";

export const saveDesign = (key: string, d: Design) => run("readwrite", (s) => s.put(d, key));
export const loadDesign = (key: string) => run<Design>("readonly", (s) => s.get(key));
export const deleteDesign = (key: string) => run("readwrite", (s) => s.delete(key));

export const newRef = () => {
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += a[Math.floor(Math.random() * a.length)];
  return `GD-${s}`;
};
