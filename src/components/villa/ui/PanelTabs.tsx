"use client";

import { windowsForRoom } from "@/data/villa";
import { useVilla } from "@/store/villa";

/** Switch between dressing the windows and dressing the bed in bedrooms. */
export function PanelTabs({ active }: { active: "curtains" | "pillows" }) {
  const roomId = useVilla((s) => s.roomId);
  const lastWindow = useVilla((s) => s.windowId);
  if (!roomId) return null;
  const s = useVilla.getState();
  return (
    <div className="panel-tabs" role="tablist" aria-label="What to dress">
      <button
        type="button"
        role="tab"
        aria-selected={active === "curtains"}
        className={active === "curtains" ? "is-on" : ""}
        onClick={() => active !== "curtains" && s.selectWindow(lastWindow ?? windowsForRoom(roomId)[0].id)}
      >
        Curtains
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={active === "pillows"}
        className={active === "pillows" ? "is-on" : ""}
        onClick={() => active !== "pillows" && s.dressBed()}
      >
        Goose feather pillows
      </button>
    </div>
  );
}
