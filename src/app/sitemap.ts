import type { MetadataRoute } from "next";
import { COLLECTIONS } from "@/data/catalog";
import { ARTICLES } from "@/data/content";

export const dynamic = "force-static";

const SITE = "https://gdhomefabric.in";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = [
    "",
    "villa/",
    "collections/",
    ...COLLECTIONS.map((c) => `collections/${c.id}/`),
    "pillows/",
    "made-to-measure/",
    "fabric-guide/",
    "measuring-guide/",
    "care/",
    "hospitality/",
    "journal/",
    ...ARTICLES.map((a) => `journal/${a.slug}/`),
    "about/",
    "faq/",
    "contact/",
    "consultation/",
  ];
  return pages.map((p) => ({ url: `${SITE}/${p}`, priority: p === "" ? 1 : p.split("/").length > 2 ? 0.6 : 0.8 }));
}
