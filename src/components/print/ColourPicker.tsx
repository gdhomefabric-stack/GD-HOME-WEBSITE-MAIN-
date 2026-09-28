"use client";

import { useId } from "react";

export const SWATCHES = [
  "#ffffff",
  "#f3ece0",
  "#e8d9bd",
  "#c69a3f",
  "#e3a9a0",
  "#c0643f",
  "#8e2f4f",
  "#9fae8a",
  "#2f7d6d",
  "#8fb8c9",
  "#2f5d7c",
  "#23324d",
  "#5e4a2e",
  "#3b3834",
  "#141312",
];

/** Swatches for the common case plus the system colour picker for anything else. */
export function ColourPicker({
  value,
  onChange,
  label,
  swatches = SWATCHES,
}: {
  value: string;
  onChange: (c: string) => void;
  label: string;
  swatches?: string[];
}) {
  const id = useId();
  const custom = !swatches.includes(value.toLowerCase());
  return (
    <div className="swatch-row" role="group" aria-label={label}>
      {swatches.map((c) => (
        <button
          key={c}
          type="button"
          aria-pressed={c === value.toLowerCase()}
          aria-label={c}
          className={`swatch${c === value.toLowerCase() ? " is-on" : ""}`}
          style={{ background: c }}
          onClick={() => onChange(c)}
        />
      ))}
      <label htmlFor={id} className={`swatch swatch--custom${custom ? " is-on" : ""}`} title="Any colour" style={custom ? { background: value } : undefined}>
        <span className="sr-only">Any colour</span>
        <input id={id} type="color" value={value} onChange={(e) => onChange(e.target.value)} />
      </label>
    </div>
  );
}
