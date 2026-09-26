"use client";

import { useId } from "react";
import { LIGHTING, LIGHTING_ORDER } from "@/data/lighting";
import type { Lighting } from "@/store/villa";
import { LightingIcon } from "@/components/villa/ui/Icons";

/** Day / Sunset / Night switch bound to local state (used outside the villa). */
export function LightingToggleLocal({ value, onChange }: { value: Lighting; onChange: (l: Lighting) => void }) {
  const name = useId();
  return (
    <div className="lighting" role="radiogroup" aria-label="Lighting">
      {LIGHTING_ORDER.map((l) => (
        <label key={l} className={`lighting__opt${value === l ? " is-on" : ""}`}>
          <input type="radio" className="sr-only" name={name} checked={value === l} onChange={() => onChange(l)} />
          <LightingIcon id={l} />
          <span>{LIGHTING[l].label}</span>
        </label>
      ))}
    </div>
  );
}
