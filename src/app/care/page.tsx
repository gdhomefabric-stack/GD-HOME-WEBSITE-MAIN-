import type { Metadata } from "next";
import { PageShell } from "@/components/site/PageShell";
import { CtaBand, delay } from "@/components/site/Blocks";
import { CARE } from "@/data/content";

export const metadata: Metadata = {
  title: "Caring for your curtains & pillows",
  description: "How to keep velvet deep, linen soft and embroidery bright — care for curtains and goose feather pillows, fabric by fabric.",
  alternates: { canonical: "/care/" },
};

export default function CarePage() {
  return (
    <PageShell>
      <section className="page-hero">
        <div className="page-hero__inner">
          <p className="eyebrow" data-reveal="fade">
            Care
          </p>
          <h1 className="display" data-reveal="up">
            Made to last, cared for simply.
          </h1>
          <p className="lead" data-reveal="up" style={delay(1)}>
            Good curtains need little more than a soft brush and a little steam. Here is how to look after each fabric
            — and your pillows.
          </p>
        </div>
      </section>
      <section className="section section--tight">
        <div className="inner grid-2">
          {CARE.map((c, i) => (
            <article key={c.title} data-reveal="up" style={{ ...delay(i % 2), borderTop: "1px solid var(--hair)", paddingTop: "1.4rem", display: "grid", gap: "0.8rem", alignContent: "start" }}>
              <h2 style={{ fontSize: "2rem" }}>{c.title}</h2>
              <ul className="feature-list">
                {c.items.map((it) => (
                  <li key={it}>
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
      <CtaBand eyebrow="Need a hand?" title="We clean, re-hang and alter too." text="Moving house, a new window, or curtains that need refreshing — tell us what you have and we will advise." />
    </PageShell>
  );
}
