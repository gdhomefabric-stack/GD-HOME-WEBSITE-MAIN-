"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cartCount, useShop } from "@/store/shop";

export const NAV = [
  { href: "/villa/", label: "The Villa" },
  { href: "/collections/", label: "Curtains" },
  { href: "/pillows/", label: "Pillows" },
  { href: "/made-to-measure/", label: "Made to Measure" },
  { href: "/journal/", label: "Journal" },
  { href: "/about/", label: "About" },
];

const MORE = [
  { href: "/fabric-guide/", label: "Fabric guide" },
  { href: "/measuring-guide/", label: "How to measure" },
  { href: "/hospitality/", label: "Hotels & designers" },
  { href: "/care/", label: "Care" },
  { href: "/faq/", label: "Questions" },
  { href: "/contact/", label: "Contact" },
];

/**
 * variant "overlay": the 3D villa (translucent, always shown)
 * variant "clear": transparent over a dark hero until the page scrolls
 */
export function SiteHeader({ overlay = false, variant }: { overlay?: boolean; variant?: "solid" | "clear" | "overlay" }) {
  const v = variant ?? (overlay ? "overlay" : "solid");
  const path = usePathname();
  const count = useShop(cartCount);
  const saved = useShop((s) => s.saved.length);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const last = useRef(0);
  const current = (href: string) => (path === href || path === href.replace(/\/$/, "") || (href !== "/" && path?.startsWith(href)) ? "page" : undefined);

  useEffect(() => {
    if (v === "overlay") return;
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 24);
      setHidden(y > 320 && y > last.current + 4);
      if (y < last.current - 4 || y < 320) setHidden(false);
      last.current = y;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [v]);

  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    document.documentElement.classList.toggle("menu-open", open);
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const cls = [
    "site-header",
    v === "overlay" ? "site-header--overlay" : "",
    v === "clear" ? "site-header--clear" : "",
    scrolled ? "is-scrolled" : "",
    hidden && !open ? "is-hidden" : "",
    open ? "is-open" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <header className={cls}>
        <Link href="/" className="brand" aria-label="GD Home Fabric — home">
          <span className="brand__mark" aria-hidden="true">
            GD
          </span>
          <span>
            <b className="brand__text-long">Home Fabric</b>
          </span>
        </Link>
        <nav className="site-nav" aria-label="Main">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} aria-current={current(n.href)} className="nav-hide-md">
              {n.label}
            </Link>
          ))}
          <Link href="/cart/#saved" aria-label={`Saved looks, ${saved}`} className="nav-hide-sm">
            Saved{saved > 0 && <span className="nav-count">{saved}</span>}
          </Link>
          <Link href="/cart/" aria-current={current("/cart/")} aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`}>
            Cart{count > 0 && <span className="nav-count">{count}</span>}
          </Link>
          <Link href="/consultation/" className="nav-cta nav-hide-sm" aria-current={current("/consultation/")}>
            Book a consultation
          </Link>
          <button
            type="button"
            className="menu-btn"
            aria-expanded={open}
            aria-controls="site-menu"
            onClick={() => setOpen((o) => !o)}
          >
            <span className="menu-btn__bars" aria-hidden="true">
              <i />
              <i />
            </span>
            <span className="sr-only">{open ? "Close menu" : "Menu"}</span>
          </button>
        </nav>
      </header>
      <div id="site-menu" className={`site-menu${open ? " is-open" : ""}`} aria-hidden={!open} inert={!open}>
        <div className="site-menu__inner">
          <nav aria-label="Menu" className="site-menu__main">
            {NAV.map((n, i) => (
              <Link key={n.href} href={n.href} style={{ ["--i" as string]: i }} aria-current={current(n.href)}>
                <span className="site-menu__n">{String(i + 1).padStart(2, "0")}</span>
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="site-menu__side">
            <p className="eyebrow">Guides &amp; service</p>
            {MORE.map((n) => (
              <Link key={n.href} href={n.href}>
                {n.label}
              </Link>
            ))}
            <Link href="/consultation/" className="btn btn--gold site-menu__cta">
              Book a consultation
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
