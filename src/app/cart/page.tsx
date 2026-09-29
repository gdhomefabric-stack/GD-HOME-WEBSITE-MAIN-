import type { Metadata } from "next";
import { PageShell } from "@/components/site/PageShell";
import { CartView } from "@/components/shop/CartView";

export const metadata: Metadata = {
  title: "Cart, quotes & saved looks",
  description: "Your curtain and pillow selection, saved looks from the villa, and a no-obligation quote request.",
  alternates: { canonical: "/cart/" },
};

export default function CartPage() {
  return (
    <PageShell>
      <div className="wrap">
        <CartView />
      </div>
    </PageShell>
  );
}
