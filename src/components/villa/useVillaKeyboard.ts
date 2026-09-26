"use client";

import { useEffect } from "react";
import { LIGHTING_ORDER } from "@/data/lighting";
import { ROOMS } from "@/data/villa";
import { useVilla } from "@/store/villa";

/** Keyboard alternatives for every 3-D interaction. */
export function useVillaKeyboard(onHelp: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || t?.isContentEditable) return;
      if (document.querySelector("dialog[open]")) return;
      const s = useVilla.getState();
      if (!s.introDone) return;
      switch (e.key) {
        case "Escape":
          if (s.mode !== "overview") {
            s.back();
            e.preventDefault();
          }
          break;
        case "ArrowRight":
        case "ArrowLeft":
          if (s.mode === "overview" || s.mode === "room") {
            s.cycleRoom(e.key === "ArrowRight" ? 1 : -1);
            e.preventDefault();
          }
          break;
        case "o":
        case "O":
          if (s.windowId && (s.mode === "window" || s.mode === "closeup")) s.toggleOpen(s.windowId);
          break;
        case "c":
        case "C":
          if (s.mode === "window") s.closeup();
          else if (s.mode === "closeup") s.back();
          break;
        case "l":
        case "L": {
          const i = LIGHTING_ORDER.indexOf(s.lighting);
          s.setLighting(LIGHTING_ORDER[(i + 1) % LIGHTING_ORDER.length]);
          break;
        }
        case "?":
          onHelp();
          break;
        default:
          if (/^[1-8]$/.test(e.key)) {
            const room = ROOMS[Number(e.key) - 1];
            if (room) s.enterRoom(room.id);
          }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onHelp]);
}
