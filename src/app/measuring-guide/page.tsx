import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/site/PageShell";
import { CtaBand, delay } from "@/components/site/Blocks";
import { MEASURE_STEPS } from "@/data/content";

export const metadata: Metadata = {
  title: "How to measure for curtains",
  description:
    "Where to hang the pole, how to measure width and drop, and how to choose the finish at the floor — a step-by-step guide for made-to-measure curtains.",
  alternates: { canonical: "/measuring-guide/" },
};

/** Elevation of a window with pole, stack-back, width and drop annotated. */
function Diagram() {
  const ink = "#1b1a18";
  const gold = "#b08a54";
  const green = "#1d3a34";
  return (
    <svg viewBox="0 0 640 520" className="diagram" role="img" aria-labelledby="dg-title dg-desc">
      <title id="dg-title">Measuring a window for curtains</title>
      <desc id="dg-desc">
        The pole sits 10 to 15 centimetres above the frame and extends 15 to 25 centimetres beyond each side. Width is
        the length of the pole; the drop runs from the pole to the floor.
      </desc>
      <line x1="40" y1="470" x2="600" y2="470" stroke={ink} strokeWidth="2" />
      <text x="600" y="495" textAnchor="end" fontSize="13" fill="#6b645a">
        floor
      </text>
      {/* window frame */}
      <rect x="200" y="140" width="240" height="250" fill="#e6ecee" stroke={ink} strokeWidth="2" />
      <line x1="320" y1="140" x2="320" y2="390" stroke={ink} strokeWidth="1.5" />
      <rect x="190" y="390" width="260" height="10" fill="#d8cdbb" stroke={ink} strokeWidth="1.2" />
      {/* pole */}
      <line x1="130" y1="100" x2="510" y2="100" stroke={gold} strokeWidth="6" strokeLinecap="round" />
      <circle cx="124" cy="100" r="9" fill={gold} />
      <circle cx="516" cy="100" r="9" fill={gold} />
      {/* curtains stacked */}
      <path d="M135 104 L135 468 L195 468 L195 104 Z" fill={green} opacity="0.82" />
      <path d="M445 104 L445 468 L505 468 L505 104 Z" fill={green} opacity="0.82" />
      {[150, 165, 180].map((x) => (
        <line key={x} x1={x} y1="106" x2={x} y2="466" stroke="#0f231f" strokeWidth="1" opacity="0.5" />
      ))}
      {[460, 475, 490].map((x) => (
        <line key={x} x1={x} y1="106" x2={x} y2="466" stroke="#0f231f" strokeWidth="1" opacity="0.5" />
      ))}
      {/* width */}
      <line x1="130" y1="60" x2="510" y2="60" stroke={ink} strokeWidth="1.2" markerStart="url(#a)" markerEnd="url(#a)" />
      <text x="320" y="50" textAnchor="middle" fontSize="15" fill={ink}>
        Width = length of the pole
      </text>
      {/* drop */}
      <line x1="560" y1="100" x2="560" y2="468" stroke={ink} strokeWidth="1.2" markerStart="url(#a)" markerEnd="url(#a)" />
      <text x="572" y="290" fontSize="15" fill={ink} transform="rotate(90 572 290)" textAnchor="middle">
        Drop: pole to floor
      </text>
      {/* above frame */}
      <line x1="470" y1="100" x2="470" y2="140" stroke={gold} strokeWidth="1.2" strokeDasharray="4 3" />
      <text x="478" y="126" fontSize="12" fill="#7c5b28">
        10–15 cm
      </text>
      {/* stack back */}
      <line x1="130" y1="420" x2="200" y2="420" stroke={gold} strokeWidth="1.2" strokeDasharray="4 3" />
      <text x="165" y="440" fontSize="12" fill="#7c5b28" textAnchor="middle">
        15–25 cm
      </text>
      <defs>
        <marker id="a" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 Z" fill={ink} />
        </marker>
      </defs>
    </svg>
  );
}

export default function MeasuringGuidePage() {
  return (
    <PageShell>
      <section className="page-hero">
        <div className="page-hero__inner">
          <p className="eyebrow" data-reveal="fade">
            How to measure
          </p>
          <h1 className="display" data-reveal="up">
            Measure once, hang beautifully.
          </h1>
          <p className="lead" data-reveal="up" style={delay(1)}>
            We measure every window ourselves before we make — but if you would like a quote first, these five steps
            give us everything we need.
          </p>
        </div>
      </section>
      <section className="section section--tight">
        <div className="inner split">
          <div data-reveal="zoom">
            <Diagram />
          </div>
          <ol className="steps-list" style={{ gridTemplateColumns: "1fr" }}>
            {MEASURE_STEPS.map((s, i) => (
              <li key={s.title} data-reveal="up" style={delay(i)}>
                <span className="steps-list__n">{String(i + 1).padStart(2, "0")}</span>
                <h3>{s.title}</h3>
                <p className="muted">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <section className="section section--linen">
        <div className="inner--narrow prose" data-reveal="up">
          <h2>Tips from our fitters</h2>
          <ul>
            <li>Use a steel tape, not a fabric one — and have someone hold the other end.</li>
            <li>Measure in centimetres and write down every number, even the ones that look the same.</li>
            <li>Hanging the pole higher and wider than the frame makes a window look larger and lets more light in when the curtains are open.</li>
            <li>For bedrooms, extra width either side and a heading that overlaps in the middle keep light from creeping round the edges.</li>
          </ul>
          <p>
            Not sure? <Link href="/consultation/">Book a consultation</Link> and we will measure for you.
          </p>
        </div>
      </section>
      <CtaBand />
    </PageShell>
  );
}
