import type { Metadata } from "next";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { PrintStudio } from "@/components/print/PrintStudio";

export const metadata: Metadata = {
  title: "Custom Print Pillows — design your own",
  description:
    "Design a custom printed pillow in any shape — square, round, heart, star, cloud, moon or your initial. Use your photos, words, our patterns or the AI design generator, and see it sewn and filled before you order.",
  alternates: { canonical: "/custom-pillows/" },
};

export default function CustomPillowsPage() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main" className="page page--studio">
        <div className="pintro">
          <p className="eyebrow">The print studio</p>
          <h1 className="pintro__title">Design your own pillow</h1>
          <p className="pintro__lead">Pick a shape, add your photos, words or an AI-painted design, and watch it come to life — sewn, filled and to scale.</p>
        </div>
        <PrintStudio />
      </main>
      <SiteFooter />
    </>
  );
}
