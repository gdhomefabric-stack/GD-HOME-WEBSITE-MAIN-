import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/site/PageShell";
import { CtaBand, SectionHead, delay, img } from "@/components/site/Blocks";
import { COLLECTIONS } from "@/data/catalog";
import { LINING_GUIDE, PLEAT_GUIDE } from "@/data/content";

export const metadata: Metadata = {
  title: "Fabric, lining & heading guide",
  description:
    "Velvet, blackout, linen, sheer and embroidered curtains compared — how each behaves in light, which lining to choose, and what every heading does.",
  alternates: { canonical: "/fabric-guide/" },
};

const TRAITS: Record<string, [number, number, number, string]> = {
  // light control, warmth, drape formality (1-5), character
  velvet: [4, 5, 5, "Deep, soft pile that absorbs sound and glows with a low sheen."],
  blackout: [5, 4, 3, "Dense weaves that stop the light at the cloth; crisp, architectural folds."],
  linen: [2, 2, 2, "Natural, slubbed and relaxed — softens and warms the daylight."],
  sheer: [1, 1, 1, "A veil: privacy by day with the light barely changed."],
  embroidered: [3, 3, 5, "Gilt thread on a fine ground — ceremonial, catching every light."],
};

function Pips({ n, label }: { n: number; label: string }) {
  return (
    <span className="meter" role="img" aria-label={`${label}: ${n} of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <i key={i} className={i <= n ? "on" : ""} />
      ))}
    </span>
  );
}

export default function FabricGuidePage() {
  return (
    <PageShell>
      <section className="page-hero">
        <div className="page-hero__inner">
          <p className="eyebrow" data-reveal="fade">
            Fabric guide
          </p>
          <h1 className="display" data-reveal="up">
            Know your cloth.
          </h1>
          <p className="lead" data-reveal="up" style={delay(1)}>
            Five fabrics, four linings and five headings — here is how each one behaves, so you can choose by the room
            you want rather than the swatch alone.
          </p>
        </div>
      </section>

      <section className="section section--tight" aria-labelledby="compare-title">
        <div className="inner">
          <h2 id="compare-title" className="sr-only">
            Fabrics compared
          </h2>
          <div className="spec-wrap" data-reveal="up">
            <table className="spec">
              <thead>
                <tr>
                  <th scope="col">Fabric</th>
                  <th scope="col">Light control</th>
                  <th scope="col">Warmth</th>
                  <th scope="col">Formality</th>
                  <th scope="col">Character</th>
                  <th scope="col">Best for</th>
                </tr>
              </thead>
              <tbody>
                {COLLECTIONS.map((c) => {
                  const [l, w, f, text] = TRAITS[c.id];
                  return (
                    <tr key={c.id}>
                      <th scope="row">
                        <Link href={`/collections/${c.id}/`}>{c.name}</Link>
                      </th>
                      <td>
                        <Pips n={l} label="Light control" />
                      </td>
                      <td>
                        <Pips n={w} label="Warmth" />
                      </td>
                      <td>
                        <Pips n={f} label="Formality" />
                      </td>
                      <td>{text}</td>
                      <td className="muted">{c.bestFor}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="section section--linen" aria-labelledby="lining-title">
        <div className="inner">
          <SectionHead eyebrow="Linings" title={<span id="lining-title">What goes behind the face.</span>} aside={<Link href="/journal/linings-explained/" className="link-arrow">Why linings matter</Link>} />
          <div className="grid-4">
            {LINING_GUIDE.map((l, i) => (
              <article key={l.name} data-reveal="up" style={{ ...delay(i), display: "grid", gap: "0.6rem", alignContent: "start", background: "var(--paper-2)", padding: "1.5rem", borderRadius: 6 }}>
                <h3 style={{ fontSize: "1.55rem" }}>{l.name}</h3>
                <p>{l.what}</p>
                <p className="muted">
                  <strong>Light:</strong> {l.light}
                </p>
                <p className="muted">
                  <strong>Best for:</strong> {l.best}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="head-title">
        <div className="inner split">
          <div className="split__text">
            <SectionHead eyebrow="Headings" title={<span id="head-title">How the curtain folds.</span>} />
            <dl style={{ display: "grid", gap: "1.2rem" }}>
              {PLEAT_GUIDE.map((p, i) => (
                <div key={p.name} data-reveal="up" style={{ ...delay(i), borderTop: "1px solid var(--hair)", paddingTop: "1rem" }}>
                  <dt className="serif" style={{ fontSize: "1.5rem" }}>
                    {p.name}
                  </dt>
                  <dd className="muted">{p.text}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="split__media" data-reveal="curtain">
            <div className="bg" style={{ backgroundImage: `url(${img.detail("linen")}), url(${img.closeup("linen")})` }} />
          </div>
        </div>
      </section>

      <CtaBand title="Feel the cloth before you choose." text="We bring swatches to your window so you can see each fabric in your own light, morning and evening." />
    </PageShell>
  );
}
