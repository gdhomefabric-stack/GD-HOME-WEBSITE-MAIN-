"use client";

import Link from "next/link";
import { useState } from "react";
import { PRODUCT_BY_ID } from "@/data/catalog";
import { money } from "@/lib/pricing";
import { cartTotal, useShop, type CartItem } from "@/store/shop";
import { FabricSwatch } from "@/components/villa/ui/FabricLoupe";
import { CloseIcon } from "@/components/villa/ui/Icons";
import { addPillowToCart } from "@/components/villa/actions";
import { buildMailto, SALES_EMAIL } from "./mailto";

function Thumb({ item }: { item: CartItem }) {
  if (item.image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="line__img" src={item.image} alt="" />;
  }
  if (item.curtain) {
    const p = PRODUCT_BY_ID[item.curtain.productId];
    const colour = p.colours.find((c) => c.id === item.curtain!.colourId) ?? p.colours[0];
    return <FabricSwatch productId={p.id} colour={colour} size={96} round={false} className="line__img" />;
  }
  return <span className="line__img line__img--pillow" aria-hidden="true" />;
}

const itemLines = (cart: CartItem[]) =>
  cart
    .map(
      (c, i) =>
        `${i + 1}. ${c.title} × ${c.qty} — ${money(c.unitPrice * c.qty)}\n   ${c.subtitle}\n   ${Object.entries(c.details)
          .map(([k, v]) => `${k}: ${v}`)
          .join(" · ")}`,
    )
    .join("\n\n");

export function CartView() {
  const cart = useShop((s) => s.cart);
  const saved = useShop((s) => s.saved);
  const total = useShop(cartTotal);
  const shop = useShop.getState();
  const [sent, setSent] = useState(false);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const body = [
      `Name: ${f.get("name")}`,
      `Email: ${f.get("email")}`,
      `Telephone: ${f.get("phone") || "—"}`,
      `Town / postcode: ${f.get("city") || "—"}`,
      `Preferred contact: ${f.get("contact")}`,
      "",
      cart.length ? `SELECTION (${cart.length} line${cart.length === 1 ? "" : "s"}, estimate ${money(total)})` : "No items selected yet.",
      "",
      itemLines(cart),
      "",
      `Notes: ${f.get("notes") || "—"}`,
    ].join("\n");
    window.location.href = buildMailto(`Quote request — ${f.get("name")}`, body);
    setSent(true);
  };

  return (
    <div className="cart">
      <section aria-labelledby="cart-title" className="cart__lines">
        <h1 id="cart-title" className="h-sec">
          Your selection
        </h1>
        {cart.length === 0 ? (
          <div className="empty panel">
            <p className="serif">Your cart is empty.</p>
            <p className="muted">Dress a window in the villa or browse the collections — everything you add appears here.</p>
            <div className="page-hero__actions">
              <Link className="btn" href="/">
                Explore the villa
              </Link>
              <Link className="btn btn--outline" href="/collections/">
                Browse collections
              </Link>
            </div>
          </div>
        ) : (
          <>
            <ul className="lines">
              {cart.map((item) => (
                <li key={item.uid} className="line">
                  <Thumb item={item} />
                  <div className="line__body">
                    <h2 className="line__title">{item.title}</h2>
                    <p className="line__sub">{item.subtitle}</p>
                    <dl className="line__details">
                      {Object.entries(item.details).map(([k, v]) => (
                        <div key={k}>
                          <dt>{k}</dt>
                          <dd>{v}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                  <div className="line__side">
                    <div className="qty" role="group" aria-label={`Quantity of ${item.title}`}>
                      <button type="button" onClick={() => shop.setQty(item.uid, item.qty - 1)} aria-label="One fewer">
                        −
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={99}
                        value={item.qty}
                        onChange={(e) => shop.setQty(item.uid, Number(e.target.value) || 1)}
                        aria-label="Quantity"
                      />
                      <button type="button" onClick={() => shop.setQty(item.uid, item.qty + 1)} aria-label="One more">
                        +
                      </button>
                    </div>
                    <strong className="line__price">{money(item.unitPrice * item.qty)}</strong>
                    <button type="button" className="icon-btn icon-btn--sm" onClick={() => shop.removeFromCart(item.uid)} aria-label={`Remove ${item.title}`}>
                      <CloseIcon />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="cart__total">
              <span>Estimated total</span>
              <strong>{money(total)}</strong>
            </div>
            <p className="muted cart__note">
              Made-to-measure estimates. Your final price is confirmed after a free measuring visit — nothing is charged
              until you approve it.
            </p>
          </>
        )}
      </section>

      <section id="quote" className="panel quote" aria-labelledby="quote-title">
        <p className="eyebrow">No obligation</p>
        <h2 id="quote-title">Request a quote</h2>
        {sent ? (
          <div className="quote__sent" role="status">
            <p className="serif">Thank you — your email app should now be open with your selection.</p>
            <p className="muted">
              If nothing opened, write to <a href={`mailto:${SALES_EMAIL}`}>{SALES_EMAIL}</a> and we will reply within
              two working days.
            </p>
            <button type="button" className="btn btn--outline btn--sm" onClick={() => setSent(false)}>
              Edit request
            </button>
          </div>
        ) : (
          <form className="quote__form" onSubmit={onSubmit}>
            <div className="field">
              <label htmlFor="q-name">Full name</label>
              <input id="q-name" name="name" autoComplete="name" required />
            </div>
            <div className="field">
              <label htmlFor="q-email">Email</label>
              <input id="q-email" name="email" type="email" autoComplete="email" required />
            </div>
            <div className="field">
              <label htmlFor="q-phone">Telephone (optional)</label>
              <input id="q-phone" name="phone" type="tel" autoComplete="tel" />
            </div>
            <div className="field">
              <label htmlFor="q-city">Town or postcode</label>
              <input id="q-city" name="city" autoComplete="postal-code" />
            </div>
            <div className="field">
              <label htmlFor="q-contact">Preferred contact</label>
              <select id="q-contact" name="contact" defaultValue="Email">
                <option>Email</option>
                <option>Telephone</option>
                <option>WhatsApp</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="q-notes">Anything we should know?</label>
              <textarea id="q-notes" name="notes" placeholder="Window sizes, deadlines, a room you're redecorating…" />
            </div>
            <button type="submit" className="btn btn--block">
              Send quote request
            </button>
            <p className="muted quote__fine">
              Opens your email app with your selection addressed to {SALES_EMAIL}.
            </p>
          </form>
        )}
        <Link className="link-arrow" href="/consultation/">
          Prefer to talk? Book a consultation
        </Link>
      </section>

      <section id="saved" className="saved" aria-labelledby="saved-title">
        <h2 id="saved-title" className="h-sec">
          Saved looks
        </h2>
        {saved.length === 0 ? (
          <p className="muted">
            Nothing saved yet. In the villa, press <em>Save look</em> on any window or bed to keep it here.
          </p>
        ) : (
          <ul className="saved__grid">
            {saved.map((look) => (
              <li key={look.uid} className="look">
                {look.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={look.image} alt={`${look.title}, ${look.roomName}`} className="look__img" />
                ) : look.curtain ? (
                  <FabricSwatch
                    productId={look.curtain.productId}
                    colour={PRODUCT_BY_ID[look.curtain.productId].colours.find((c) => c.id === look.curtain!.colourId) ?? PRODUCT_BY_ID[look.curtain.productId].colours[0]}
                    size="100%"
                    round={false}
                    className="look__img"
                  />
                ) : (
                  <span className="look__img line__img--pillow" aria-hidden="true" />
                )}
                <div className="look__body">
                  <p className="eyebrow">
                    {look.roomName}
                    {look.windowLabel ? ` · ${look.windowLabel}` : ""} · {look.lighting}
                  </p>
                  <h3>{look.title}</h3>
                  <p className="muted">{Object.values(look.details).join(" · ")}</p>
                  <p className="look__price">{money(look.price)}</p>
                  <div className="look__actions">
                    {look.curtain && (
                      <button
                        type="button"
                        className="btn btn--sm"
                        onClick={() =>
                          shop.addToCart({
                            kind: "curtain",
                            title: look.title,
                            subtitle: `${look.roomName}${look.windowLabel ? ` · ${look.windowLabel}` : ""}`,
                            details: look.details,
                            unitPrice: look.price,
                            image: look.image,
                            curtain: look.curtain,
                          })
                        }
                      >
                        Add to cart
                      </button>
                    )}
                    {look.pillows && look.pillows.length > 0 && (
                      <button type="button" className="btn btn--sm" onClick={() => look.pillows!.forEach((p) => addPillowToCart(p))}>
                        Add {look.pillows.length} pillows to cart
                      </button>
                    )}
                    <button type="button" className="btn btn--sm btn--ghost" onClick={() => shop.removeLook(look.uid)}>
                      Remove
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
