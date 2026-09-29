import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

/** Header, main landmark and footer for the content pages. */
export function PageShell({
  children,
  header = "solid",
  className = "",
}: {
  children: React.ReactNode;
  header?: "solid" | "clear";
  className?: string;
}) {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <SiteHeader variant={header} />
      <main id="main" className={`page ${header === "clear" ? "page--flush" : ""} ${className}`.trim()}>
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
