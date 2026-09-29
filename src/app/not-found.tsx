import Link from "next/link";
import { PageShell } from "@/components/site/PageShell";

export default function NotFound() {
  return (
    <PageShell>
      <div className="wrap page-hero__inner" style={{ minHeight: "70vh", alignContent: "center" }}>
        <p className="eyebrow">Page not found</p>
        <h1 className="display">This door leads nowhere.</h1>
        <p className="lead">The page you were looking for isn&apos;t here. Let us show you back in.</p>
        <div className="page-hero__actions">
          <Link className="btn" href="/">
            Home
          </Link>
          <Link className="btn btn--outline" href="/villa/">
            Step inside the villa
          </Link>
          <Link className="btn btn--outline" href="/collections/">
            Browse curtains
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
