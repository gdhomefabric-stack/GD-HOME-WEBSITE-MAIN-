import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/site/PageShell";
import { ConsultationForm } from "@/components/shop/ConsultationForm";

export const metadata: Metadata = {
  title: "Book a consultation",
  description: "A private consultation — at home, by video or in the showroom — for made-to-measure curtains and pillows.",
  alternates: { canonical: "/consultation/" },
};

const STEPS = [
  ["Conversation", "We talk through the rooms, the light and how you live in them."],
  ["Swatches & measure", "Cloth in your hands, in your light — and every window measured."],
  ["Your quote", "A fixed, itemised quote for each window. No obligation."],
  ["Made & fitted", "Tailored in the atelier, then hung and dressed by our fitters."],
];

export default function ConsultationPage() {
  return (
    <PageShell>
        <div className="wrap consult-page">
          <section className="consult-page__intro">
            <p className="eyebrow">Every commission begins with a conversation</p>
            <h1 className="display">Book a consultation</h1>
            <p className="lead">
              Bring a look you saved in the villa, a photograph of your window, or simply a feeling you want the room
              to have. We will do the rest.
            </p>
            <ol className="consult-steps">
              {STEPS.map(([t, d], i) => (
                <li key={t}>
                  <span className="consult-steps__n serif">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <strong>{t}</strong>
                    <p className="muted">{d}</p>
                  </div>
                </li>
              ))}
            </ol>
            <Link className="link-arrow" href="/villa/">
              Explore the villa first
            </Link>
          </section>
          <ConsultationForm />
        </div>
    </PageShell>
  );
}
