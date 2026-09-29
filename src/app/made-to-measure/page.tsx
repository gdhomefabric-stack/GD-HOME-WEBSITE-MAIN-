import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/site/PageShell";
import { CtaBand, SectionHead, delay, img } from "@/components/site/Blocks";
import { LENGTHS, LININGS, PLEATS } from "@/data/catalog";
import { PROCESS } from "@/data/content";

export const metadata: Metadata = {
  title: "Made to measure",
  description:
    "How GD Home Fabric makes curtains: consultation, swatches, measuring, making and hanging — and how your price is worked out.",
  alternates: { canonical: "/made-to-measure/" },
};

export default function MadeToMeasurePage() {
  return (
    <PageShell>
      <section className="page-hero">
        <div className="page-hero__inner">
          <p className="eyebrow" data-reveal="fade">
            Made to measure
          </p>
          <h1 className="display" data-reveal="up">
            Nothing off the roll.
          </h1>
          <p className="lead" data-reveal="up" style={delay(1)}>
            A ready-made curtain is a guess about your window. Ours start with a tape measure and end with a fitter
            dressing each fold by hand — so they hang straight, clear the floor exactly, and stack neatly when open.
          </p>
        </div>
      </section>

      <section className="section section--dark" aria-labelledby="how-title">
        <div className="inner">
          <SectionHead eyebrow="How it works" title={<span id="how-title">Four steps, one conversation.</span>} />
          <ol className="steps-list">
            {PROCESS.map((p, i) => (
              <li key={p.title} data-reveal="up" style={delay(i)}>
                <span className="steps-list__n">{String(i + 1).padStart(2, "0")}</span>
                <h3>{p.title}</h3>
                <p className="muted">{p.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section">
        <div className="inner split">
          <div className="split__text">
            <p className="eyebrow" data-reveal="fade">
              In the workroom
            </p>
            <h2 className="h-sec" data-reveal="up">
              The details you feel, not see.
            </h2>
            <ul className="feature-list" data-reveal="up" style={delay(1)}>
              <li>
                <span>
                  <strong>Pattern matched across widths</strong> so seams disappear into the folds.
                </span>
              </li>
              <li>
                <span>
                  <strong>Deep double hems with corner weights</strong> — curtains hang straight and settle quickly.
                </span>
              </li>
              <li>
                <span>
                  <strong>Headings set by hand</strong> to the fullness each fabric needs.
                </span>
              </li>
              <li>
                <span>
                  <strong>Linings cut separately</strong> and locked in, so face and back move as one.
                </span>
              </li>
              <li>
                <span>
                  <strong>Dressed after hanging</strong> — folds trained so they fall correctly from day one.
                </span>
              </li>
            </ul>
          </div>
          <div className="split__media" data-reveal="curtain">
            <div className="bg" style={{ backgroundImage: `url(${img.detail("velvet")}), url(${img.closeup("velvet")})` }} />
          </div>
        </div>
      </section>

      <section className="section section--linen" aria-labelledby="price-title">
        <div className="inner">
          <SectionHead
            eyebrow="How the price is worked out"
            title={<span id="price-title">Transparent, window by window.</span>}
            lead="Your quote is built from four things. You can see every one change live in the villa's customiser."
          />
          <div className="grid-4">
            {[
              ["Size", "The width of the track and the drop to your chosen length — the area of fabric the window needs."],
              ["Fabric", "Each cloth has its own price per square foot, from airy sheers to triple-weave blackout and embroidery."],
              ["Heading", `Fullness and making time: ${PLEATS.map((p) => p.name).join(", ")}.`],
              ["Lining", `${LININGS.map((l) => l.name).join(", ")} — each adds body, warmth or darkness.`],
            ].map(([t, d], i) => (
              <div key={t} data-reveal="up" style={{ ...delay(i), display: "grid", gap: "0.5rem", borderTop: "1px solid var(--hair)", paddingTop: "1.2rem" }}>
                <h3 style={{ fontSize: "1.6rem" }}>{t}</h3>
                <p className="muted">{d}</p>
              </div>
            ))}
          </div>
          <p style={{ marginTop: "2.2rem" }} data-reveal="fade">
            <Link href="/villa/" className="btn">
              Price a window in the villa
            </Link>
          </p>
        </div>
      </section>

      <section className="section" aria-labelledby="len-title">
        <div className="inner">
          <SectionHead eyebrow="Lengths" title={<span id="len-title">Where the hem meets the floor.</span>} aside={<Link href="/journal/curtain-length/" className="link-arrow">Read the guide</Link>} />
          <div className="grid-4">
            {LENGTHS.map((l, i) => (
              <div key={l.id} data-reveal="up" style={{ ...delay(i), display: "grid", gap: "0.4rem" }}>
                <svg viewBox="0 0 120 150" className="diagram" aria-hidden="true">
                  <rect x="20" y="10" width="80" height="4" fill="#b08a54" />
                  <rect x="30" y="30" width="60" height="70" fill="#dfe6e8" stroke="#1b1a18" strokeWidth="1.5" />
                  <line x1="0" y1="140" x2="120" y2="140" stroke="#1b1a18" strokeWidth="1.5" />
                  {(() => {
                    const hem = l.id === "sill" ? 99 : l.id === "apron" ? 112 : l.id === "floor" ? 139 : 139;
                    return (
                      <>
                        <path d={`M22 14 L22 ${hem} L38 ${hem} L38 14`} fill="#1d3a34" opacity="0.85" />
                        <path d={`M82 14 L82 ${hem} L98 ${hem} L98 14`} fill="#1d3a34" opacity="0.85" />
                        {l.id === "puddle" && (
                          <>
                            <ellipse cx="30" cy="140" rx="14" ry="4" fill="#1d3a34" opacity="0.85" />
                            <ellipse cx="90" cy="140" rx="14" ry="4" fill="#1d3a34" opacity="0.85" />
                          </>
                        )}
                      </>
                    );
                  })()}
                </svg>
                <h3 style={{ fontSize: "1.5rem", marginTop: "0.5rem" }}>{l.name}</h3>
                <p className="muted">{l.note}.</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CtaBand />
    </PageShell>
  );
}
