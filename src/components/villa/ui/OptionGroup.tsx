"use client";

import { useId, type ReactNode } from "react";

export interface Option<T extends string> {
  id: T;
  label: string;
}

/**
 * Accessible radio group rendered as cards/chips. Native radios give arrow-key
 * navigation and screen-reader semantics for free.
 */
export function OptionGroup<T extends string, O extends Option<T>>({
  legend,
  hint,
  value,
  options,
  onChange,
  onPreview,
  render,
  layout = "chips",
  step,
}: {
  legend: string;
  hint?: ReactNode;
  value: T;
  options: O[];
  onChange: (v: T) => void;
  onPreview?: (v: T | null) => void;
  render?: (o: O, selected: boolean) => ReactNode;
  layout?: "chips" | "cards" | "swatches" | "icons";
  step?: number;
}) {
  const name = useId();
  return (
    <fieldset className={`opt-group opt-group--${layout}`}>
      <legend className="opt-group__legend">
        {step !== undefined && <span className="opt-group__step">{step}</span>}
        {legend}
      </legend>
      {hint && <p className="opt-group__hint">{hint}</p>}
      <div className="opt-group__items">
        {options.map((o) => {
          const selected = o.id === value;
          return (
            <label
              key={o.id}
              className={`opt${selected ? " is-on" : ""}`}
              onMouseEnter={onPreview ? () => onPreview(o.id) : undefined}
              onMouseLeave={onPreview ? () => onPreview(null) : undefined}
              title={layout === "swatches" ? o.label : undefined}
            >
              <input
                type="radio"
                className="sr-only"
                name={name}
                value={o.id}
                checked={selected}
                onChange={() => onChange(o.id)}
                onFocus={onPreview ? () => onPreview(o.id) : undefined}
                onBlur={onPreview ? () => onPreview(null) : undefined}
              />
              {render ? render(o, selected) : <span className="opt__label">{o.label}</span>}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
