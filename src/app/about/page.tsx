import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/site/PageShell";
import { CtaBand, SectionHead, delay, img } from "@/components/site/Blocks";

export const metadata: Metadata = {
  title: "About",
  description: "GD Home Fabric makes curtains and goose feather pillows to measure — for the way light moves through a room.",
  alternates: { canonical: "/about/" },
};

const VALUES = [
  ["Light first", "We start every room by asking what the light should feel like — at dawn, in the afternoon, after dark — and choose the cloth from there."],
  ["Made by hand", "Headings set, hems weighted and linings locked in by hand, so every curtain hangs straight and lasts."],
  ["Honest pricing", "Estimates you can see change as you choose, and a fixed, itemised quote once we have measured."],
  ["Seen before it is made", "Our 3D villa lets you try every fabric, heading and length in a real room before a single cut."],
];

export default function AboutPage() {
  return (
    <PageShell header="clear">
      <section className="hero hero--short" aria-labelledby="about-title">
        <div className="hero__media" data-parallax="0.1" style={{ backgroundImage: `url(${img.room("living")})` }} role="img" aria-label="The villa's living room in afternoon light" />
        <div className="hero__shade" />
        <div className="hero__content">
          <p className="eyebrow">About GD Home Fabric</p>
          <h1 id="about-title" className="hero__title">
            <span className="hero-line">
              <span>We make the soft</span>
            </span>
            <span className="hero-line">
              <span style={{ ["--i" as string]: 1 }}>edges of a home.</span>
            </span>
          </h1>
        </div>
      </section>
      <section className="section">
        <div className="inner--narrow" style={{ display: "grid", gap: "1.4rem" }}>
          <p className="statement" style={{ textAlign: "left", maxWidth: "none" }} data-reveal="up">
            Curtains are the last thing added to a room and the first thing you notice in it.
          </p>
          <div className="prose" data-reveal="up" style={delay(1)}>
            <p>
              They decide how the morning arrives, how warm the room feels in winter, how quiet it is at night and how
              finished it looks at every hour in between. That is a lot to ask of a piece of cloth — which is why we
              make each one for a single window.
            </p>
            <p>
              GD Home Fabric makes curtains in velvet, blackout, linen, sheer and embroidered cloth, and goose feather
              pillows to dress the beds. We measure, we make, and we hang — and before any of that, we help you see the
              room finished, in our villa, so there are no surprises when the curtains go up.
            </p>
          </div>
        </div>
      </section>
      <section className="section section--dark">
        <div className="inner">
          <SectionHead eyebrow="What we believe" title="Four things we do on every window." />
          <div className="grid-4">
            {VALUES.map(([t, d], i) => (
              <div key={t} data-reveal="up" style={{ ...delay(i), display: "grid", gap: "0.6rem", borderTop: "1px solid rgba(247,244,239,.18)", paddingTop: "1.3rem" }}>
                <p className="steps-list__n">{String(i + 1).padStart(2, "0")}</p>
                <h3 style={{ fontSize: "1.6rem" }}>{t}</h3>
                <p className="muted">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="section">
        <div className="inner split">
          <div className="split__media split__media--wide" data-reveal="curtain">
            <div className="bg" style={{ backgroundImage: `url(${img.room("study")})` }} />
          </div>
          <div className="split__text">
            <p className="eyebrow" data-reveal="fade">
              The villa
            </p>
            <h2 className="h-sec" data-reveal="up">
              Why we built a house you can walk through.
            </h2>
            <p className="lead" data-reveal="up" style={delay(1)}>
              A swatch shows colour; it cannot show what a fabric does to a room. So we built eight — lit by real
              daylight, a low sunset and lamplight — where you can hang any curtain we make and watch the room change.
            </p>
            <div data-reveal="up" style={delay(2)}>
              <Link href="/villa/" className="btn">
                Step inside
              </Link>
            </div>
          </div>
        </div>
      </section>
      <CtaBand />
    </PageShell>
  );
}
