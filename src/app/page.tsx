import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/site/PageShell";
import {
  ArticleCard,
  CollectionCard,
  CtaBand,
  HeroTitle,
  Marquee,
  PillowCard,
  RoomStrip,
  SectionHead,
  delay,
  img,
} from "@/components/site/Blocks";
import { COLLECTIONS } from "@/data/catalog";
import { ARTICLES, PROCESS } from "@/data/content";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function Home() {
  return (
    <PageShell header="clear">
      {/* hero */}
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero__media" data-parallax="0.12" style={{ backgroundImage: "url(/renders/hero.webp), url(/renders/living.webp)" }} role="img" aria-label="A sunlit living room with velvet curtains drawn back from tall windows" />
        <div className="hero__shade" />
        <div className="hero__content">
          <p className="eyebrow">Made-to-measure curtains · Goose feather pillows</p>
          <div id="hero-title">
            <HeroTitle lines={["Rooms,", "dressed in light."]} />
          </div>
          <p className="hero__lead">
            Velvet, blackout, linen, sheer and embroidered curtains, cut and sewn for your windows. Walk through our
            villa, draw the curtains, change the cloth — and see the room change with it.
          </p>
          <div className="hero__actions">
            <Link href="/villa/" className="btn btn--gold">
              Step inside the villa
            </Link>
            <Link href="/collections/" className="btn btn--light">
              Explore the curtains
            </Link>
          </div>
        </div>
        <span className="hero__scroll" aria-hidden="true">
          Scroll
        </span>
      </section>

      {/* statement */}
      <section className="section">
        <div className="inner--narrow" style={{ display: "grid", gap: "1.6rem", justifyItems: "center", textAlign: "center" }}>
          <p className="eyebrow" data-reveal="fade">
            The house of GD Home Fabric
          </p>
          <p className="statement" data-reveal="up">
            We make curtains the way a tailor makes a coat — <em>for one window, one room,</em> one way of living.
          </p>
          <p className="lead muted" data-reveal="up" style={delay(1)}>
            Every pair is measured, cut, pleated and weighted by hand, then hung and dressed in your home. Nothing comes
            off a roll in a standard size.
          </p>
        </div>
      </section>

      {/* the villa */}
      <section className="section section--linen" aria-labelledby="villa-title">
        <div className="inner split">
          <Link href="/villa/" className="split__media split__media--wide" data-reveal="curtain" aria-label="Step inside the villa in 3D">
            <div className="bg" data-parallax="0.06" style={{ backgroundImage: `url(${img.room("master")})` }} />
          </Link>
          <div className="split__text">
            <p className="eyebrow" data-reveal="fade">
              The Villa · in 3D
            </p>
            <h2 id="villa-title" className="h-sec" data-reveal="up">
              See it in the room before it is made.
            </h2>
            <p className="lead" data-reveal="up" style={delay(1)}>
              Eight rooms, lit the way real rooms are — by the sun through the windows, a low evening light, and lamps
              at night. Stand in each one, look around, and dress every window.
            </p>
            <ul className="feature-list" data-reveal="up" style={delay(2)}>
              <li>
                <span>
                  <strong>Open and close the curtains</strong> and watch the sunlight on the floor narrow as they draw.
                </span>
              </li>
              <li>
                <span>
                  <strong>Change fabric, colour, heading, length and lining</strong> — the drape rebuilds as you choose.
                </span>
              </li>
              <li>
                <span>
                  <strong>Compare velvet, blackout, linen and embroidery</strong> side by side in the same window.
                </span>
              </li>
              <li>
                <span>
                  <strong>Dress the beds</strong> with goose feather pillows, then save the look or ask for a quote.
                </span>
              </li>
            </ul>
            <div data-reveal="up" style={delay(3)}>
              <Link href="/villa/" className="btn">
                Step inside
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* rooms */}
      <section className="section" aria-labelledby="rooms-title">
        <div className="inner">
          <SectionHead
            eyebrow="Eight rooms"
            title={<span id="rooms-title">Each room, its best cloth.</span>}
            lead="From the blackout of the home theatre to the sun-washed linen of the guest room — every room shows the collection that suits it most."
            aside={
              <Link href="/villa/" className="link-arrow">
                Enter the villa
              </Link>
            }
          />
          <RoomStrip />
        </div>
      </section>

      <Marquee items={["Velours Royal", "Lin de Provence", "Nuit Absolue", "Voile du Matin", "Fil d'Or", "Doux Sommeil", "Le Roi Noir"]} />

      {/* collections */}
      <section className="section" aria-labelledby="coll-title">
        <div className="inner">
          <SectionHead
            eyebrow="The collections"
            title={<span id="coll-title">Five chapters, told in cloth.</span>}
            lead="Darkness to the barest veil. Every curtain is made to measure in your choice of colour, heading, length and lining."
            aside={
              <Link href="/collections/" className="link-arrow">
                All curtains
              </Link>
            }
          />
          <div className="grid-3">
            {COLLECTIONS.map((c, i) => (
              <CollectionCard key={c.id} id={c.id} i={i} />
            ))}
            <PillowCard i={5} />
          </div>
        </div>
      </section>

      {/* process */}
      <section className="section section--dark" aria-labelledby="process-title">
        <div className="inner">
          <SectionHead
            eyebrow="Made to measure"
            title={<span id="process-title">From a conversation to curtains that fall just so.</span>}
            aside={
              <Link href="/made-to-measure/" className="link-arrow">
                How it works
              </Link>
            }
          />
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

      {/* guides */}
      <section className="section" aria-labelledby="guides-title">
        <div className="inner">
          <SectionHead eyebrow="Before you choose" title={<span id="guides-title">Everything worth knowing.</span>} />
          <div className="grid-3">
            {[
              ["/fabric-guide/", "Fabric & lining guide", "How each cloth behaves in light, which lining to choose, and what every heading does.", img.closeup("velvet")],
              ["/measuring-guide/", "How to measure", "Where to hang the pole, how to take a drop, and the finish at the floor.", img.closeup("linen")],
              ["/care/", "Caring for your curtains", "Fabric by fabric — so velvet stays deep and linen stays soft.", img.closeup("embroidered")],
            ].map(([href, title, text, image], i) => (
              <Link key={href} href={href} className="card" data-reveal="up" style={delay(i)}>
                <div className="card__media card__media--land">
                  <div className="bg" style={{ backgroundImage: `url(${image})` }} />
                </div>
                <div className="card__body">
                  <h3 className="card__title">{title}</h3>
                  <p className="card__text">{text}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* journal */}
      <section className="section section--linen" aria-labelledby="journal-title">
        <div className="inner">
          <SectionHead
            eyebrow="Journal"
            title={<span id="journal-title">Notes from the workroom.</span>}
            aside={
              <Link href="/journal/" className="link-arrow">
                All articles
              </Link>
            }
          />
          <div className="grid-3">
            {ARTICLES.slice(0, 3).map((a, i) => (
              <ArticleCard key={a.slug} a={a} i={i} />
            ))}
          </div>
        </div>
      </section>

      <CtaBand />
    </PageShell>
  );
}
