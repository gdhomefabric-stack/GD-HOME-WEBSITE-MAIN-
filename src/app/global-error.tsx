"use client";

/** Last-resort error page (replaces the root layout, so it carries its own styles). */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", background: "#f4ecdd", color: "#2e241a", fontFamily: "Georgia, serif", textAlign: "center", padding: 24 }}>
        <div>
          <p style={{ letterSpacing: "0.3em", fontSize: 12, textTransform: "uppercase", color: "#8a6612" }}>GD Home Fabric</p>
          <h1 style={{ fontWeight: 400, fontSize: 40, margin: "12px 0" }}>This page didn&apos;t load properly.</h1>
          <p>
            <button type="button" onClick={reset} style={{ padding: "12px 22px", borderRadius: 999, border: 0, background: "#8c6a2f", color: "#fff", cursor: "pointer" }}>
              Try again
            </button>{" "}
            <a href="/villa/?mode=gallery" style={{ color: "#5e4a2e", marginLeft: 12 }}>
              Room gallery
            </a>{" "}
            <a href="/collections/" style={{ color: "#5e4a2e", marginLeft: 12 }}>
              Collections
            </a>
          </p>
        </div>
      </body>
    </html>
  );
}
