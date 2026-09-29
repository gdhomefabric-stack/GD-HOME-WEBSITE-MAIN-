import type { Metadata } from "next";
import { PageShell } from "@/components/site/PageShell";
import { ArticleCard, CtaBand, delay } from "@/components/site/Blocks";
import { ARTICLES } from "@/data/content";

export const metadata: Metadata = {
  title: "Journal",
  description: "Guides and notes from the workroom: choosing curtains by light, headings, lengths, linings and goose feather pillows.",
  alternates: { canonical: "/journal/" },
};

export default function JournalPage() {
  return (
    <PageShell>
      <section className="page-hero">
        <div className="page-hero__inner">
          <p className="eyebrow" data-reveal="fade">
            Journal
          </p>
          <h1 className="display" data-reveal="up">
            Notes from the workroom.
          </h1>
          <p className="lead" data-reveal="up" style={delay(1)}>
            How to choose, measure and live with curtains and pillows — the questions we are asked most, answered at
            length.
          </p>
        </div>
      </section>
      <section className="section section--tight">
        <div className="inner grid-3">
          {ARTICLES.map((a, i) => (
            <ArticleCard key={a.slug} a={a} i={i % 3} />
          ))}
        </div>
      </section>
      <CtaBand />
    </PageShell>
  );
}
