import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/site/PageShell";
import { CtaBand, SectionHead, delay, img } from "@/components/site/Blocks";

export const metadata: Metadata = {
  title: "Hotels & interior designers",
  description:
    "Made-to-measure curtains and goose feather pillows for boutique hotels, serviced residences and interior design studios — specification, samples and larger orders.",
  alternates: { canonical: "/hospitality/" },
};

const OFFER = [
  ["Specification support", "Fabric, lining and heading recommendations room by room, with light control, acoustics and maintenance in mind."],
  ["Sampling", "Swatches and headed samples so you can sign off the look — and the drape — before production."],
  ["Room-type schedules", "Repeatable specifications for each room type, measured per window, so every room in a property matches."],
  ["Bedding to match", "Goose feather pillows in coordinated covers, sized for your beds and dressed to your standard."],
  ["Installation", "Measured, made and hung by our team, and dressed so each room is ready for guests."],
  ["Aftercare", "Advice on cleaning cycles and a record of every specification for re-orders."],
];

export default function HospitalityPage() {
  return (
    <PageShell header="clear">
      <section className="hero hero--short" aria-labelledby="hosp-title">
        <div className="hero__media" data-parallax="0.1" style={{ backgroundImage: `url(${img.room("suite")})` }} role="img" aria-label="A boutique hotel suite with velvet curtains" />
        <div className="hero__shade" />
        <div className="hero__content">
          <p className="eyebrow">Hotels · residences · design studios</p>
          <h1 id="hosp-title" className="hero__title">
            <span className="hero-line">
              <span>Every room,</span>
            </span>
            <span className="hero-line">
              <span style={{ ["--i" as string]: 1 }}>as good as the first.</span>
            </span>
          </h1>
          <p className="hero__lead">
            We make curtains and pillows for boutique hotels and designers — the same handwork as a private home,
            specified to repeat across a whole property.
          </p>
          <div className="hero__actions">
            <Link href="/contact/" className="btn btn--gold">
              Start a project
            </Link>
            <Link href="/villa/?room=suite" className="btn btn--light">
              See the hotel suite in 3D
            </Link>
          </div>
        </div>
      </section>
      <section className="section">
        <div className="inner">
          <SectionHead eyebrow="What we offer" title="From sample to the last guest room." />
          <div className="grid-3">
            {OFFER.map(([t, d], i) => (
              <div key={t} data-reveal="up" style={{ ...delay(i % 3), borderTop: "1px solid var(--hair)", paddingTop: "1.3rem", display: "grid", gap: "0.5rem" }}>
                <h3 style={{ fontSize: "1.6rem" }}>{t}</h3>
                <p className="muted">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="section section--linen">
        <div className="inner split split--rev">
          <div className="split__text">
            <p className="eyebrow" data-reveal="fade">
              For designers
            </p>
            <h2 className="h-sec" data-reveal="up">
              Share a look in minutes.
            </h2>
            <p className="lead" data-reveal="up" style={delay(1)}>
              Compose a window in the villa — fabric, colour, heading, length and lining — save it, and send the
              saved look with your brief. We quote from exactly what you chose.
            </p>
            <div data-reveal="up" style={delay(2)}>
              <Link href="/villa/" className="btn">
                Open the villa
              </Link>
            </div>
          </div>
          <div className="split__media split__media--wide" data-reveal="curtain">
            <div className="bg" style={{ backgroundImage: `url(${img.room("dining")})` }} />
          </div>
        </div>
      </section>
      <CtaBand eyebrow="Tell us about the project" title="Let us specify your rooms." text="Send us the property, the number of rooms and your timeline — we will come back with samples and a plan." />
    </PageShell>
  );
}
