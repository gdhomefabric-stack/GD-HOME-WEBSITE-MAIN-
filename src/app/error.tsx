"use client";

import Link from "next/link";
import { useEffect } from "react";

/** Branded error page — never leave a visitor on a blank or black screen. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="page">
      <div className="wrap page-hero__inner" style={{ minHeight: "80vh", alignContent: "center" }}>
        <p className="eyebrow">Something went wrong</p>
        <h1 className="display">This page didn&apos;t load properly.</h1>
        <p className="lead">You can try again, or carry on browsing — every room and fabric is still here.</p>
        <div className="page-hero__actions">
          <button type="button" className="btn" onClick={reset}>
            Try again
          </button>
          <Link className="btn btn--outline" href="/villa/?mode=gallery">
            Room gallery
          </Link>
          <Link className="btn btn--outline" href="/collections/">
            Browse collections
          </Link>
        </div>
      </div>
    </main>
  );
}
