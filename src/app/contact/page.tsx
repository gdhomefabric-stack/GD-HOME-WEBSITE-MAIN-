import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/site/PageShell";
import { delay } from "@/components/site/Blocks";
import { ConsultationForm } from "@/components/shop/ConsultationForm";

export const metadata: Metadata = {
  title: "Contact",
  description: "Write to GD Home Fabric, send a quote request, or book a consultation for made-to-measure curtains and pillows.",
  alternates: { canonical: "/contact/" },
};

export default function ContactPage() {
  return (
    <PageShell>
      <div className="wrap consult-page">
        <section className="consult-page__intro">
          <p className="eyebrow" data-reveal="fade">
            Contact
          </p>
          <h1 className="display" data-reveal="up">
            Let&apos;s talk windows.
          </h1>
          <p className="lead" data-reveal="up" style={delay(1)}>
            Tell us about your rooms — or send a look you saved in the villa — and we will reply with ideas, swatches
            and a quote.
          </p>
          <div data-reveal="up" style={{ ...delay(2), display: "grid", gap: "1.2rem", marginTop: "0.5rem" }}>
            <div>
              <p className="eyebrow">Email</p>
              <a className="serif" style={{ fontSize: "1.7rem", textDecoration: "none" }} href="mailto:sales@gdhomefabric.in">
                sales@gdhomefabric.in
              </a>
            </div>
            <div>
              <p className="eyebrow">Consultations</p>
              <p className="muted">At your home, by video, or starting from a saved look.</p>
            </div>
            <Link className="link-arrow" href="/villa/">
              Dress a window in the villa first
            </Link>
          </div>
        </section>
        <ConsultationForm />
      </div>
    </PageShell>
  );
}
