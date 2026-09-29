import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/site/PageShell";
import { CtaBand, SectionHead, delay, img } from "@/components/site/Blocks";
import { PillowShop } from "@/components/shop/PillowShop";
import { Toasts } from "@/components/villa/ui/Overlays";
import { PILLOW_COLLECTION, PILLOW_FILLS, PILLOW_SIZES } from "@/data/catalog";
import { money } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Goose Feather Pillows",
  description: PILLOW_COLLECTION.description,
  alternates: { canonical: "/pillows/" },
};

const SLEEP = [
  ["Side sleepers", "A firm, higher pillow fills the space between shoulder and ear and keeps the spine straight."],
  ["Back sleepers", "Medium support cradles the head without pushing the chin forward."],
  ["Front sleepers", "A soft, low pillow — or pure down — keeps the neck from arching."],
];

export default function PillowsPage() {
  return (
    <PageShell header="clear">
      <section className="hero hero--short" aria-labelledby="pillow-title">
        <div className="hero__media" data-parallax="0.1" style={{ backgroundImage: `url(/renders/pillows.webp), url(${img.room("suite")})` }} role="img" aria-label="A bed layered with goose feather pillows" />
        <div className="hero__shade" />
        <div className="hero__content">
          <p className="eyebrow">For the bedroom</p>
          <h1 id="pillow-title" className="hero__title">
            <span className="hero-line">
              <span>Goose feather</span>
            </span>
            <span className="hero-line">
              <span style={{ ["--i" as string]: 1 }}>pillows.</span>
            </span>
          </h1>
          <p className="hero__lead">{PILLOW_COLLECTION.description}</p>
          <div className="hero__actions">
            <a href="#build" className="btn btn--gold">
              Build your pillow
            </a>
            <Link href="/villa/?room=suite" className="btn btn--light">
              Dress a bed in the villa
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="inner">
          <SectionHead eyebrow="The fill" title="Feather for support, down for softness." lead="Feathers give spring and hold their shape; down — the soft clusters beneath — gives loft. Choose the balance that suits how you sleep." />
          <div className="grid-3">
            {PILLOW_FILLS.map((f, i) => (
              <div key={f.id} data-reveal="up" style={{ ...delay(i), display: "grid", gap: "0.6rem", borderTop: "1px solid var(--hair)", paddingTop: "1.4rem" }}>
                <p className="steps-list__n">{String(i + 1).padStart(2, "0")}</p>
                <h3 style={{ fontSize: "1.7rem" }}>{f.name}</h3>
                <p className="muted">{f.note}.</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--linen">
        <div className="inner split">
          <div className="split__media split__media--wide" data-reveal="curtain">
            <div className="bg" style={{ backgroundImage: `url(${img.room("master")})` }} />
          </div>
          <div className="split__text">
            <p className="eyebrow" data-reveal="fade">
              Choosing firmness
            </p>
            <h2 className="h-sec" data-reveal="up">
              It depends how you sleep.
            </h2>
            <ul className="feature-list" data-reveal="up" style={delay(1)}>
              {SLEEP.map(([t, d]) => (
                <li key={t}>
                  <span>
                    <strong>{t}.</strong> {d}
                  </span>
                </li>
              ))}
            </ul>
            <p className="muted" data-reveal="up" style={delay(2)}>
              Every pillow is filled by hand into cotton sateen with a piped edge. Plump it each morning, air it in the
              sun now and then, and it will keep its loft for years.
            </p>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="sizes-title">
        <div className="inner">
          <SectionHead eyebrow="Sizes" title={<span id="sizes-title">Build the bed in rows.</span>} lead="Euro squares stand against the headboard, sleeping pillows lean in front, and a boudoir cushion finishes the arrangement." />
          <div className="grid-4">
            {PILLOW_SIZES.map((s, i) => (
              <div key={s.id} data-reveal="up" style={{ ...delay(i), display: "grid", gap: "0.4rem" }}>
                <div style={{ aspectRatio: "1", display: "grid", placeItems: "center", background: "var(--linen)", borderRadius: 4 }} aria-hidden="true">
                  <span style={{ width: `${s.w * 90}%`, height: `${s.d * 90}%`, borderRadius: 18, background: "var(--paper-2)", boxShadow: "inset 0 -8px 18px rgba(0,0,0,.06), 0 8px 20px rgba(0,0,0,.08)" }} />
                </div>
                <h3 style={{ fontSize: "1.5rem", marginTop: "0.6rem" }}>{s.name}</h3>
                <p className="muted">
                  {s.dims} · from {money(s.price)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="build" className="section section--linen" aria-labelledby="build-title">
        <div className="inner">
          <SectionHead eyebrow="Build your pillow" title={<span id="build-title">Size, fill, support and cover.</span>} />
          <PillowShop />
        </div>
      </section>

      <CtaBand eyebrow="Hotels & guest houses" title="Dressing more than one bed?" text="We make pillows and curtains together for boutique hotels and guest houses — ask us about specification and quantities." />
      <Toasts />
    </PageShell>
  );
}
