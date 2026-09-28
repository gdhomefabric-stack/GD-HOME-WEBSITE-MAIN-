import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div>
          <span className="brand">
            <span className="brand__mark" aria-hidden="true">
              ⚜
            </span>
            GD <b>Home Fabric</b>
          </span>
          <p style={{ marginTop: "0.9rem", maxWidth: "42ch" }}>
            Made-to-measure curtains and goose feather pillows, dressed for palaces and private homes — crafted for
            timeless living.
          </p>
        </div>
        <div>
          <h4>Explore</h4>
          <Link href="/">The Villa in 3D</Link>
          <Link href="/?mode=gallery">Room gallery</Link>
          <Link href="/collections/">Collections</Link>
          <Link href="/custom-pillows/">Custom print pillows</Link>
        </div>
        <div>
          <h4>The Maison</h4>
          <Link href="/consultation/">Book a consultation</Link>
          <Link href="/cart/">Cart &amp; quotes</Link>
          <a href="mailto:sales@gdhomefabric.in">sales@gdhomefabric.in</a>
        </div>
      </div>
      <p className="site-footer__legal">© {new Date().getFullYear()} GD Home Fabric. All prices are made-to-measure estimates, confirmed on survey.</p>
    </footer>
  );
}
