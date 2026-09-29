import Link from "next/link";

const COLS: { title: string; links: [string, string][] }[] = [
  {
    title: "Shop",
    links: [
      ["/collections/", "Curtain collections"],
      ["/collections/velvet/", "Velvet"],
      ["/collections/blackout/", "Blackout"],
      ["/collections/linen/", "Linen"],
      ["/collections/sheer/", "Sheer"],
      ["/collections/embroidered/", "Embroidered"],
      ["/pillows/", "Goose feather pillows"],
    ],
  },
  {
    title: "Service",
    links: [
      ["/made-to-measure/", "Made to measure"],
      ["/measuring-guide/", "How to measure"],
      ["/fabric-guide/", "Fabric & lining guide"],
      ["/care/", "Caring for your curtains"],
      ["/consultation/", "Book a consultation"],
      ["/faq/", "Questions"],
    ],
  },
  {
    title: "The house",
    links: [
      ["/villa/", "The Villa in 3D"],
      ["/about/", "About us"],
      ["/hospitality/", "Hotels & designers"],
      ["/journal/", "Journal"],
      ["/contact/", "Contact"],
      ["/cart/", "Cart & quotes"],
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__brand">
          <span className="brand">
            <span className="brand__mark" aria-hidden="true">
              GD
            </span>
            <b>Home Fabric</b>
          </span>
          <p className="site-footer__pitch">
            Made-to-measure curtains and goose feather pillows — cut, sewn and hung for the way light moves through
            your rooms.
          </p>
          <a className="site-footer__mail" href="mailto:sales@gdhomefabric.in">
            sales@gdhomefabric.in
          </a>
          <Link href="/consultation/" className="btn btn--gold btn--sm">
            Book a consultation
          </Link>
        </div>
        {COLS.map((c) => (
          <div key={c.title}>
            <h4>{c.title}</h4>
            {c.links.map(([href, label]) => (
              <Link key={href} href={href}>
                {label}
              </Link>
            ))}
          </div>
        ))}
      </div>
      <div className="site-footer__legal">
        <span>© {new Date().getFullYear()} GD Home Fabric · gdhomefabric.in</span>
        <span>Prices shown are made-to-measure estimates, confirmed after measuring.</span>
      </div>
    </footer>
  );
}
