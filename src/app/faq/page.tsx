import type { Metadata } from "next";
import { PageShell } from "@/components/site/PageShell";
import { CtaBand, delay } from "@/components/site/Blocks";
import { FAQS } from "@/data/content";

export const metadata: Metadata = {
  title: "Questions",
  description: "Pricing, timing, swatches, measuring, blackout and more — answers to the questions we are asked most.",
  alternates: { canonical: "/faq/" },
};

export default function FaqPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
  return (
    <PageShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="page-hero">
        <div className="page-hero__inner">
          <p className="eyebrow" data-reveal="fade">
            Questions
          </p>
          <h1 className="display" data-reveal="up">
            Asked, and answered.
          </h1>
          <p className="lead" data-reveal="up" style={delay(1)}>
            The things people most want to know before they order made-to-measure curtains and pillows.
          </p>
        </div>
      </section>
      <section className="section section--tight">
        <div className="inner--narrow faq" data-reveal="up">
          {FAQS.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <div>
                <p>{f.a}</p>
              </div>
            </details>
          ))}
        </div>
      </section>
      <CtaBand eyebrow="Still wondering?" title="Ask us anything." text="Write to sales@gdhomefabric.in or book a consultation — we are happy to talk windows." />
    </PageShell>
  );
}
