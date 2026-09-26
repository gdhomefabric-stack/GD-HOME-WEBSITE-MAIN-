import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { CollectionsBrowser } from "@/components/shop/CollectionsBrowser";

export const metadata: Metadata = {
  title: "Collections",
  description:
    "Velvet, blackout, linen, sheer and embroidered curtains, made to measure — and the Goose Feather Pillow Collection.",
  alternates: { canonical: "/collections/" },
};

export default function CollectionsPage() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main" className="page">
        <section className="page-hero">
          <div className="wrap page-hero__inner">
            <p className="eyebrow">The house catalogue</p>
            <h1 className="display">Five chapters, told in cloth.</h1>
            <p className="lead">
              From absolute darkness to the barest veil — every curtain is made to measure, in your colour, heading,
              length and lining. Prefer to see it in a room first?
            </p>
            <div className="page-hero__actions">
              <Link className="btn" href="/">
                Explore the villa in 3D
              </Link>
              <Link className="btn btn--outline" href="/?mode=gallery">
                Room gallery
              </Link>
            </div>
          </div>
        </section>
        <div className="wrap">
          <CollectionsBrowser />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
