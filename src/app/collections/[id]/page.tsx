import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/site/PageShell";
import { CollectionCard, CtaBand, RoomCard, delay, img } from "@/components/site/Blocks";
import { COLLECTIONS, COLLECTION_BY_ID, LININGS, productsInCollection, type CollectionId } from "@/data/catalog";
import { ROOMS } from "@/data/villa";
import { curtainPrice, money } from "@/lib/pricing";

export function generateStaticParams() {
  return COLLECTIONS.map((c) => ({ id: c.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const c = COLLECTION_BY_ID[id as CollectionId];
  if (!c) return {};
  return {
    title: `${c.name} curtains`,
    description: `${c.name} curtains, made to measure — ${c.description}`,
    alternates: { canonical: `/collections/${id}/` },
  };
}

/** How much daylight passes, as five pips (more pips = darker room). */
function Darkness({ t }: { t: number }) {
  const level = t <= 0.005 ? 5 : t < 0.05 ? 4 : t < 0.2 ? 3 : t < 0.5 ? 2 : 1;
  return (
    <span className="meter" role="img" aria-label={`Light control ${level} of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <i key={i} className={i <= level ? "on" : ""} />
      ))}
    </span>
  );
}

const LIGHT_WORDS: Record<CollectionId, string> = {
  velvet: "Velvet's dense pile holds back most of the light even unlined; with a thermal interlining it is the warmest, quietest curtain we make.",
  blackout: "Woven to stop the light at the fabric itself — no separate blackout lining needed, though a cotton lining gives a softer face to the street.",
  linen: "Unlined, linen glows: the sun passes through the weave and the whole curtain becomes a soft lantern. Line it to dim the room, or add blackout for a bedroom.",
  sheer: "A veil for daylight — privacy from outside, brightness within. Pair it with a heavier curtain on a double track for evenings.",
  embroidered: "The ground cloth is lined as standard to protect the embroidery; choose thermal for a fuller drape or blackout for a bedroom.",
};

export default async function CollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = COLLECTION_BY_ID[id as CollectionId];
  if (!c) notFound();
  const products = productsInCollection(c.id);
  const rooms = ROOMS.filter((r) => r.featured.includes(c.id));
  const room = rooms[0] ?? ROOMS[0];
  const others = COLLECTIONS.filter((o) => o.id !== c.id);

  return (
    <PageShell header="clear">
      <section className="hero hero--short" aria-labelledby="coll-title">
        <div className="hero__media" data-parallax="0.1" style={{ backgroundImage: `url(${img.detail(c.id)}), url(${img.room(room.id)})` }} role="img" aria-label={`${c.name} curtains in the ${room.name}`} />
        <div className="hero__shade" />
        <div className="hero__content">
          <p className="eyebrow">Collection {c.numeral}</p>
          <h1 id="coll-title" className="hero__title">
            <span className="hero-line">
              <span>{c.name}</span>
            </span>
          </h1>
          <p className="hero__lead">{c.description}</p>
          <div className="hero__actions">
            <Link href={`/villa/?room=${room.id}`} className="btn btn--gold">
              Try it in the {room.short.toLowerCase()} room
            </Link>
            <Link href="/consultation/" className="btn btn--light">
              Request swatches
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="inner split">
          <div className="split__text">
            <nav className="crumbs-lite" aria-label="Breadcrumb">
              <Link href="/collections/">Curtains</Link>
              <span aria-hidden="true">/</span>
              <span aria-current="page">{c.name}</span>
            </nav>
            <p className="kicker" data-reveal="up">
              {c.tagline}
            </p>
            <h2 className="h-sec" data-reveal="up">
              Best for {c.bestFor.charAt(0).toLowerCase() + c.bestFor.slice(1)}.
            </h2>
            <p className="lead" data-reveal="up" style={delay(1)}>
              {LIGHT_WORDS[c.id]}
            </p>
            <ul className="pill-list" data-reveal="up" style={delay(2)}>
              <li>Made to measure</li>
              <li>Five headings</li>
              <li>Four linings</li>
              <li>Hand-finished hems</li>
            </ul>
          </div>
          <div className="split__media" data-reveal="curtain">
            <div className="bg" style={{ backgroundImage: `url(${img.closeup(c.id)})` }} />
          </div>
        </div>
      </section>

      <section className="section section--linen" aria-labelledby="fabrics-title">
        <div className="inner">
          <div className="section-head">
            <p className="eyebrow" data-reveal="fade">
              The fabrics
            </p>
            <h2 id="fabrics-title" className="h-sec" data-reveal="up">
              {products.length > 1 ? `${products.length} cloths in the collection` : "The cloth"}
            </h2>
          </div>
          <div className="spec-wrap" data-reveal="up">
            <table className="spec">
              <thead>
                <tr>
                  <th scope="col">Fabric</th>
                  <th scope="col">Composition</th>
                  <th scope="col">Weight</th>
                  <th scope="col">Light control</th>
                  <th scope="col">Colours</th>
                  <th scope="col">Pair from*</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <th scope="row">
                      {p.name}
                      <div className="muted" style={{ fontFamily: "var(--sans)", fontSize: "0.85rem", marginTop: 4 }}>
                        {p.grade} — {p.blurb}
                      </div>
                    </th>
                    <td data-label="Composition">{p.composition}</td>
                    <td data-label="Weight">{p.weight}</td>
                    <td data-label="Light control">
                      <Darkness t={p.transmission} />
                    </td>
                    <td data-label="Colours">
                      <div className="swatches">
                        {p.colours.map((col) => (
                          <span key={col.id} title={col.name} style={{ background: col.hex }} />
                        ))}
                      </div>
                    </td>
                    <td data-label="Pair from*">
                      {money(
                        curtainPrice({ productId: p.id, colourId: p.colours[0].id, pleat: "pinch", length: "floor", lining: p.kind === "sheer" ? "unlined" : "cotton" }),
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted" style={{ fontSize: "0.85rem", marginTop: "1rem" }}>
            * A pair for a 6 × 8 ft window (1.8 m track, 2.4 m drop), pinch pleat, floor length,{" "}
            {c.id === "sheer" ? "unlined" : "cotton lined"}. Your quote is fixed after we measure.
          </p>
        </div>
      </section>

      <section className="section" aria-labelledby="lining-title">
        <div className="inner">
          <div className="section-head">
            <p className="eyebrow" data-reveal="fade">
              Linings
            </p>
            <h2 id="lining-title" className="h-sec" data-reveal="up">
              The back matters as much as the front.
            </h2>
          </div>
          <div className="grid-4">
            {LININGS.map((l, i) => (
              <div key={l.id} data-reveal="up" style={{ ...delay(i), display: "grid", gap: "0.5rem" }}>
                <p className="big-number">{Math.round((1 - l.transmission) * 100)}%</p>
                <h3 style={{ fontSize: "1.5rem" }}>{l.name}</h3>
                <p className="muted">{l.note}. Holds back about {Math.round((1 - l.transmission) * 100)}% of the light that gets through the face fabric.</p>
              </div>
            ))}
          </div>
          <p style={{ marginTop: "2rem" }}>
            <Link href="/fabric-guide/" className="link-arrow">
              The full fabric &amp; lining guide
            </Link>
          </p>
        </div>
      </section>

      {rooms.length > 0 && (
        <section className="section section--linen" aria-labelledby="seen-title">
          <div className="inner">
            <div className="section-head">
              <p className="eyebrow" data-reveal="fade">
                In the villa
              </p>
              <h2 id="seen-title" className="h-sec" data-reveal="up">
                See {c.name.toLowerCase()} in a room.
              </h2>
            </div>
            <div className="grid-3">
              {rooms.map((r, i) => (
                <RoomCard key={r.id} room={r} i={i} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="section" aria-labelledby="more-title">
        <div className="inner">
          <div className="section-head">
            <p className="eyebrow" data-reveal="fade">
              The other chapters
            </p>
            <h2 id="more-title" className="h-sec" data-reveal="up">
              More from the house.
            </h2>
          </div>
          <div className="grid-4">
            {others.map((o, i) => (
              <CollectionCard key={o.id} id={o.id} i={i} />
            ))}
          </div>
        </div>
      </section>

      <CtaBand title={`Let us bring ${c.name.toLowerCase()} to your windows.`} />
    </PageShell>
  );
}
