import Link from "next/link";
import { SiteHeader } from "@/components/site/SiteHeader";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="page">
        <div className="wrap page-hero__inner" style={{ minHeight: "70vh", alignContent: "center" }}>
          <p className="eyebrow">Page not found</p>
          <h1 className="display">This door leads nowhere.</h1>
          <p className="lead">The room you were looking for isn&apos;t part of the villa. Let us show you back in.</p>
          <div className="page-hero__actions">
            <Link className="btn" href="/">
              Return to the villa
            </Link>
            <Link className="btn btn--outline" href="/collections/">
              Browse collections
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
