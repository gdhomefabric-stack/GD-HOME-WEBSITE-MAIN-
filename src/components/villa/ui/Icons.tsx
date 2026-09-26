import type { LengthId, PleatId } from "@/data/catalog";
import type { Lighting } from "@/store/villa";

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.4, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export function PleatIcon({ id }: { id: PleatId }) {
  return (
    <svg viewBox="0 0 40 30" width="40" height="30" aria-hidden="true">
      {id !== "wave" && <line x1="2" y1="5" x2="38" y2="5" {...stroke} />}
      {id === "wave" && <line x1="2" y1="3" x2="38" y2="3" {...stroke} strokeWidth={2.4} />}
      {id === "pinch" &&
        [8, 20, 32].map((x) => (
          <g key={x}>
            <path d={`M${x - 3} 7 L${x} 11 L${x + 3} 7`} {...stroke} />
            <path d={`M${x} 11 L${x - 3} 28 M${x} 11 L${x + 3} 28`} {...stroke} />
          </g>
        ))}
      {id === "wave" && <path d="M4 8 C8 4 10 12 14 8 S20 4 24 8 S30 12 34 8" {...stroke} />}
      {id === "wave" && [6, 14, 22, 30].map((x) => <line key={x} x1={x} y1="10" x2={x} y2="28" {...stroke} />)}
      {id === "eyelet" && [6, 14, 22, 30].map((x) => <circle key={x} cx={x + 2} cy="5" r="2.4" {...stroke} />)}
      {id === "eyelet" && <path d="M4 9 C8 6 12 12 16 9 S24 6 28 9 S34 12 36 9 M6 12 L4 28 M16 12 L16 28 M28 12 L30 28" {...stroke} />}
      {id === "pencil" && <path d="M4 8 L6 11 L8 8 L10 11 L12 8 L14 11 L16 8 L18 11 L20 8 L22 11 L24 8 L26 11 L28 8 L30 11 L32 8 L34 11 L36 8" {...stroke} />}
      {id === "pencil" && [8, 16, 24, 32].map((x) => <line key={x} x1={x} y1="12" x2={x} y2="28" {...stroke} />)}
      {id === "goblet" &&
        [9, 20, 31].map((x) => (
          <g key={x}>
            <path d={`M${x - 3.5} 7 C${x - 3.5} 14 ${x + 3.5} 14 ${x + 3.5} 7 Z`} {...stroke} />
            <path d={`M${x} 13 L${x - 3} 28 M${x} 13 L${x + 3} 28`} {...stroke} />
          </g>
        ))}
    </svg>
  );
}

export function LengthIcon({ id }: { id: LengthId }) {
  const hem = { sill: 17, apron: 21, floor: 27, puddle: 27 }[id];
  return (
    <svg viewBox="0 0 40 30" width="40" height="30" aria-hidden="true">
      <rect x="12" y="4" width="16" height="13" rx="0.5" {...stroke} strokeWidth={1} opacity={0.55} />
      <line x1="10" y1="17" x2="30" y2="17" {...stroke} strokeWidth={1.8} opacity={0.55} />
      <line x1="2" y1="28" x2="38" y2="28" {...stroke} strokeWidth={1} opacity={0.5} />
      <line x1="5" y1="2.5" x2="35" y2="2.5" {...stroke} />
      <path d={`M6 3 L6 ${hem} L12 ${hem} L12 3`} {...stroke} />
      <path d={`M28 3 L28 ${hem} L34 ${hem} L34 3`} {...stroke} />
      {id === "puddle" && <path d="M4 27.5 C5 25 7 29 13 27.5 M27 27.5 C31 29 35 25 36 27.5" {...stroke} />}
    </svg>
  );
}

export function LightingIcon({ id }: { id: Lighting }) {
  if (id === "day")
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <circle cx="12" cy="12" r="4.2" {...stroke} />
        {Array.from({ length: 8 }).map((_, i) => {
          const a = (i * Math.PI) / 4;
          return (
            <line
              key={i}
              x1={12 + Math.cos(a) * 7}
              y1={12 + Math.sin(a) * 7}
              x2={12 + Math.cos(a) * 9.5}
              y2={12 + Math.sin(a) * 9.5}
              {...stroke}
            />
          );
        })}
      </svg>
    );
  if (id === "sunset")
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path d="M6 16 A6 6 0 0 1 18 16" {...stroke} />
        <line x1="3" y1="16" x2="21" y2="16" {...stroke} />
        <line x1="6" y1="19.5" x2="18" y2="19.5" {...stroke} opacity={0.6} />
        <line x1="12" y1="4" x2="12" y2="7" {...stroke} />
        <line x1="5" y1="8" x2="7" y2="10" {...stroke} />
        <line x1="19" y1="8" x2="17" y2="10" {...stroke} />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M16.5 15.8 A7 7 0 0 1 9.2 4.5 A7.6 7.6 0 1 0 19.4 14.2 A7 7 0 0 1 16.5 15.8 Z" {...stroke} />
      <circle cx="18" cy="6" r="0.6" fill="currentColor" />
      <circle cx="15" cy="3.5" r="0.5" fill="currentColor" />
    </svg>
  );
}

export function Chevron({ dir = "left" }: { dir?: "left" | "right" | "down" | "up" }) {
  const r = { left: 0, right: 180, up: 90, down: -90 }[dir];
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" style={{ transform: `rotate(${r}deg)` }}>
      <path d="M10 3 L5 8 L10 13" {...stroke} strokeWidth={1.6} />
    </svg>
  );
}

export function CloseIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path d="M3.5 3.5 L12.5 12.5 M12.5 3.5 L3.5 12.5" {...stroke} strokeWidth={1.6} />
    </svg>
  );
}

export function HeartIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        d="M12 20 C5 15 3 12 3 8.6 A4.6 4.6 0 0 1 12 6.6 A4.6 4.6 0 0 1 21 8.6 C21 12 19 15 12 20 Z"
        {...stroke}
        fill={filled ? "currentColor" : "none"}
      />
    </svg>
  );
}
