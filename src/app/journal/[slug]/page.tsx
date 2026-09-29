import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/site/PageShell";
import { ArticleBody, ArticleCard, CtaBand, delay } from "@/components/site/Blocks";
import { ARTICLES, ARTICLE_BY_SLUG } from "@/data/content";

export function generateStaticParams() {
  return ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const a = ARTICLE_BY_SLUG[slug];
  if (!a) return {};
  return { title: a.title, description: a.dek, alternates: { canonical: `/journal/${slug}/` } };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = ARTICLE_BY_SLUG[slug];
  if (!a) notFound();
  const more = ARTICLES.filter((x) => x.slug !== slug).slice(0, 3);
  return (
    <PageShell>
      <article>
        <header className="page-hero">
          <div className="page-hero__inner">
            <nav className="crumbs-lite" aria-label="Breadcrumb">
              <Link href="/journal/">Journal</Link>
              <span aria-hidden="true">/</span>
              <span>{a.category}</span>
            </nav>
            <h1 className="display" data-reveal="up" style={{ fontSize: "clamp(2.4rem, 5.4vw, 4.6rem)" }}>
              {a.title}
            </h1>
            <p className="lead" data-reveal="up" style={delay(1)}>
              {a.dek}
            </p>
            <p className="article-meta">{a.minutes} min read</p>
          </div>
        </header>
        <div className="inner" style={{ padding: "0 var(--gutter)" }}>
          <div
            data-reveal="curtain"
            style={{ aspectRatio: "21 / 9", borderRadius: 4, backgroundImage: `url(${a.image}), url(/renders/living.webp)`, backgroundSize: "cover", backgroundPosition: "center" }}
            aria-hidden="true"
          />
        </div>
        <div className="section">
          <div className="inner--narrow">
            <ArticleBody blocks={a.body} />
            <p style={{ marginTop: "3rem" }}>
              <Link href="/villa/" className="btn">
                Try it in the villa
              </Link>
            </p>
          </div>
        </div>
      </article>
      <section className="section section--linen" aria-labelledby="more-title">
        <div className="inner">
          <h2 id="more-title" className="h-sec" style={{ marginBottom: "2rem" }}>
            Keep reading
          </h2>
          <div className="grid-3">
            {more.map((m, i) => (
              <ArticleCard key={m.slug} a={m} i={i} />
            ))}
          </div>
        </div>
      </section>
      <CtaBand />
    </PageShell>
  );
}
