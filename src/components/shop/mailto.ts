/**
 * The site is static (GitHub Pages), so enquiries are composed in the visitor's
 * email app. Swap this for a form endpoint (e.g. Formspree) to receive them directly.
 */
export const SALES_EMAIL = "sales@gdhomefabric.in";

export function buildMailto(subject: string, body: string) {
  return `mailto:${SALES_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
