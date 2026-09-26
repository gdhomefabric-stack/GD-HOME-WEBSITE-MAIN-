import type { Metadata } from "next";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { CartView } from "@/components/shop/CartView";

export const metadata: Metadata = {
  title: "Cart, quotes & saved looks",
  description: "Your curtain and pillow selection, saved looks from the villa, and a no-obligation quote request.",
  alternates: { canonical: "/cart/" },
};

export default function CartPage() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main" className="page">
        <div className="wrap">
          <CartView />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
