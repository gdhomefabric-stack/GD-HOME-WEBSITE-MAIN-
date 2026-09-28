"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cartCount, useShop } from "@/store/shop";

export function SiteHeader({ overlay = false }: { overlay?: boolean }) {
  const path = usePathname();
  const count = useShop(cartCount);
  const saved = useShop((s) => s.saved.length);
  const current = (href: string) => (path === href || path === href.replace(/\/$/, "") ? "page" : undefined);
  return (
    <header className={`site-header${overlay ? " site-header--overlay" : ""}`}>
      <Link href="/" className="brand" aria-label="GD Home Fabric — the villa">
        <span className="brand__mark" aria-hidden="true">
          ⚜
        </span>
        <span>
          GD <b className="brand__text-long">Home Fabric</b>
        </span>
      </Link>
      <nav className="site-nav" aria-label="Main">
        <Link href="/" aria-current={current("/")} className="nav-hide-sm">
          The Villa
        </Link>
        <Link href="/collections/" aria-current={current("/collections/")}>
          Collections
        </Link>
        <Link href="/custom-pillows/" aria-current={current("/custom-pillows/")}>
          <span className="nav-hide-xs">Custom </span>Print
        </Link>
        <Link href="/cart/#saved" aria-label={`Saved looks, ${saved}`} className="nav-hide-sm">
          Saved{saved > 0 && <span className="nav-count">{saved}</span>}
        </Link>
        <Link href="/cart/" aria-current={current("/cart/")} aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`}>
          Cart{count > 0 && <span className="nav-count">{count}</span>}
        </Link>
        <Link href="/consultation/" className="nav-cta nav-hide-sm" aria-current={current("/consultation/")}>
          Consultation
        </Link>
      </nav>
    </header>
  );
}
