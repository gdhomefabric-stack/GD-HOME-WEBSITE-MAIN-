import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/site/PageShell";
import { CollectionCard, CtaBand, PillowCard } from "@/components/site/Blocks";
import { COLLECTIONS } from "@/data/catalog";
import { CollectionsBrowser } from "@/components/shop/CollectionsBrowser";

export const metadata: Metadata = {
  title: "Collections",
  description:
    "Velvet, blackout, linen, sheer and embroidered curtains, made to measure — and the Goose Feather Pillow Collection.",
  alternates: { canonical: "/collections/" },
};

export default function CollectionsPage() {
  return (
    <PageShell>
        <section className="page-hero">
          <div className="wrap page-hero__inner">
            <p className="eyebrow" data-reveal="fade">
              The house catalogue
            </p>
            <h1 className="display" data-reveal="up">
              Five chapters, told in cloth.
            </h1>
            <p className="lead" data-reveal="up">
              From absolute darkness to the barest veil — every curtain is made to measure, in your colour, heading,
              length and lining. Prefer to see it in a room first?
            </p>
            <div className="page-hero__actions">
              <Link className="btn" href="/villa/">
                Explore the villa in 3D
              </Link>
              <Link className="btn btn--outline" href="/villa/?mode=gallery">
                Room gallery
              </Link>
            </div>
          </div>
        </section>
        <section className="section section--tight">
          <div className="inner grid-3">
            {COLLECTIONS.map((c, i) => (
              <CollectionCard key={c.id} id={c.id} i={i % 3} />
            ))}
            <PillowCard i={2} />
          </div>
        </section>
        <div className="wrap">
          <p className="eyebrow" style={{ marginBottom: "1rem" }}>
            Shop every fabric
          </p>
          <CollectionsBrowser />
        </div>
        <CtaBand />
    </PageShell>
  );
}
