import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { COLLECTION_BY_ID, productsInCollection, type CollectionId } from "@/data/catalog";
import type { Article, Block } from "@/data/content";
import { ROOMS, type RoomSpec } from "@/data/villa";

export const img = {
  room: (id: string) => `/renders/${id}.webp`,
  detail: (id: string) => `/renders/detail-${id}.webp`,
  /** a macro photograph of the draped cloth */
  closeup: (kind: string) => `/renders/fabric-${kind}.webp`,
};

const d = (i: number, step = 0.08): CSSProperties => ({ ["--d" as string]: `${(i * step).toFixed(2)}s` });
export const delay = d;

/** A display title that rises in line by line. */
export function HeroTitle({ lines, as: Tag = "h1", className = "hero__title" }: { lines: string[]; as?: "h1" | "h2"; className?: string }) {
  return (
    <Tag className={className}>
      {lines.map((l, i) => (
        <span className="hero-line" key={i}>
          <span style={{ ["--i" as string]: i }}>{l}</span>
        </span>
      ))}
    </Tag>
  );
}

export function SectionHead({
  eyebrow,
  title,
  lead,
  center = false,
  aside,
}: {
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
  center?: boolean;
  aside?: ReactNode;
}) {
  return (
    <div className={`section-head${center ? " section-head--center" : ""}${aside ? " section-head--row" : ""}`}>
      <div style={{ display: "grid", gap: "1rem" }}>
        {eyebrow && (
          <p className="eyebrow" data-reveal="fade">
            {eyebrow}
          </p>
        )}
        <h2 className="h-sec" data-reveal="up">
          {title}
        </h2>
        {lead && (
          <p className="lead" data-reveal="up" style={d(1)}>
            {lead}
          </p>
        )}
      </div>
      {aside && <div data-reveal="fade">{aside}</div>}
    </div>
  );
}

export function RoomCard({ room, i = 0 }: { room: RoomSpec; i?: number }) {
  return (
    <Link href={`/villa/?room=${room.id}`} className="card" data-reveal="up" style={d(i)}>
      <div className="card__media card__media--land">
        <div className="bg" style={{ backgroundImage: `url(${img.room(room.id)})` }} />
        <span className="card__tag">Room {String(room.index).padStart(2, "0")}</span>
      </div>
      <div className="card__body">
        <h3 className="card__title">{room.name}</h3>
        <p className="card__text">{room.tagline}</p>
      </div>
    </Link>
  );
}

export function RoomStrip() {
  return (
    <div className="room-strip">
      {ROOMS.map((r, i) => (
        <RoomCard key={r.id} room={r} i={i} />
      ))}
    </div>
  );
}

export function CollectionCard({ id, i = 0 }: { id: CollectionId; i?: number }) {
  const c = COLLECTION_BY_ID[id];
  const colours = productsInCollection(id).flatMap((p) => p.colours).slice(0, 7);
  return (
    <Link href={`/collections/${id}/`} className="card" data-reveal="up" style={d(i)}>
      <div className="card__media">
        <div className="bg" style={{ backgroundImage: `url(${img.detail(id)}), url(${img.closeup(id)})` }} />
        <span className="card__tag">{c.numeral} Collection</span>
      </div>
      <div className="card__body">
        <h3 className="card__title">{c.name}</h3>
        <p className="card__text">{c.tagline}</p>
        <div className="swatches" aria-hidden="true">
          {colours.map((col) => (
            <span key={col.id + col.hex} style={{ background: col.hex }} />
          ))}
        </div>
      </div>
    </Link>
  );
}

export function PillowCard({ i = 0 }: { i?: number }) {
  return (
    <Link href="/pillows/" className="card" data-reveal="up" style={d(i)}>
      <div className="card__media">
        <div className="bg" style={{ backgroundImage: `url(/renders/pillows.webp), url(${img.room("master")})` }} />
        <span className="card__tag">Bedroom</span>
      </div>
      <div className="card__body">
        <h3 className="card__title">Goose Feather Pillows</h3>
        <p className="card__text">Cloud-soft support, dressed like a five-star bed</p>
      </div>
    </Link>
  );
}

export function ArticleCard({ a, i = 0 }: { a: Article; i?: number }) {
  return (
    <Link href={`/journal/${a.slug}/`} className="card" data-reveal="up" style={d(i)}>
      <div className="card__media card__media--land">
        <div className="bg" style={{ backgroundImage: `url(${a.image}), url(${img.room("living")})` }} />
        <span className="card__tag">{a.category}</span>
      </div>
      <div className="card__body">
        <h3 className="card__title">{a.title}</h3>
        <p className="card__text">{a.dek}</p>
        <p className="article-meta">{a.minutes} min read</p>
      </div>
    </Link>
  );
}

export function CtaBand({
  eyebrow = "Every commission begins with a conversation",
  title = "Let us dress your windows.",
  text = "At home, by video, or starting from a look you saved in the villa — a consultation costs nothing and commits you to nothing.",
}: {
  eyebrow?: string;
  title?: string;
  text?: string;
}) {
  return (
    <section className="cta-band" aria-labelledby="cta-title">
      <p className="eyebrow" data-reveal="fade">
        {eyebrow}
      </p>
      <h2 id="cta-title" data-reveal="up">
        {title}
      </h2>
      <p data-reveal="up" style={d(1)}>
        {text}
      </p>
      <div className="cta-band__actions" data-reveal="up" style={d(2)}>
        <Link href="/consultation/" className="btn btn--gold">
          Book a consultation
        </Link>
        <Link href="/villa/" className="btn btn--light">
          Explore the villa
        </Link>
      </div>
    </section>
  );
}

export function Marquee({ items }: { items: string[] }) {
  const all = [...items, ...items];
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee__track">
        {all.map((t, i) => (
          <span key={i}>{t}</span>
        ))}
      </div>
    </div>
  );
}

export function ArticleBody({ blocks }: { blocks: Block[] }) {
  return (
    <div className="prose">
      {blocks.map((b, i) => {
        if ("h2" in b) return <h2 key={i}>{b.h2}</h2>;
        if ("h3" in b) return <h3 key={i}>{b.h3}</h3>;
        if ("p" in b) return <p key={i}>{b.p}</p>;
        if ("ul" in b)
          return (
            <ul key={i}>
              {b.ul.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          );
        if ("ol" in b)
          return (
            <ol key={i}>
              {b.ol.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ol>
          );
        if ("quote" in b) return <blockquote key={i}>{b.quote}</blockquote>;
        return (
          <p key={i} className="note">
            {b.note}
          </p>
        );
      })}
    </div>
  );
}
