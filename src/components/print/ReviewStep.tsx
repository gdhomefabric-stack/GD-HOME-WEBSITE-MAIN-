"use client";

import Link from "next/link";
import { useState } from "react";
import { BULK_TIERS, bulkDiscount, describePrint, printDetails, printUnitPrice, sizeOf } from "@/data/printPillows";
import { backSide, initialDesign, type Design, type ImageLayer } from "@/lib/print/design";
import { downloadCanvas, renderPrintFile, renderProof, renderThumb } from "@/lib/print/render";
import { DRAFT, newRef, saveDesign } from "@/lib/print/storage";
import { money } from "@/lib/pricing";
import { useShop } from "@/store/shop";
import { usePrintStudio } from "@/store/printStudio";
import { useToasts } from "@/components/villa/actions";
import { photoDpi } from "./DesignStep";

function checks(d: Design) {
  const out: string[] = [];
  const w = sizeOf(d.spec).w;
  const sides: [string, typeof d.front][] = [["front", d.front]];
  if (d.spec.back === "custom") sides.push(["back", d.back]);
  for (const [name, s] of sides) {
    const imgs = s.layers.filter((l): l is ImageLayer => l.type === "image" && !l.hidden);
    const empty = imgs.filter((l) => !l.src).length;
    if (empty) out.push(`The ${name} still has ${empty === 1 ? "an empty photo spot" : `${empty} empty photo spots`}.`);
    if (imgs.some((l) => l.src && photoDpi(l, w) < 70)) out.push(`A photo on the ${name} is low resolution for this size and may print blurry.`);
    if (!s.layers.length && !s.fill) out.push(`The ${name} is a plain colour — that's fine if intended.`);
  }
  return out;
}

export function ReviewStep() {
  const design = usePrintStudio((s) => s.design);
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState<string | null>(null);
  const [ref, setRef] = useState<string | null>(null);
  const spec = design.spec;
  const unit = printUnitPrice(spec);
  const off = bulkDiscount(qty);
  const each = Math.round(unit * (1 - off));
  const warnings = checks(design);
  const next = BULK_TIERS.slice().reverse().find((t) => qty < t.min);

  const ensureRef = async () => {
    const r = ref ?? newRef();
    await saveDesign(r, design);
    setRef(r);
    return r;
  };

  const add = async () => {
    setBusy("cart");
    try {
      const r = await ensureRef();
      const image = await renderThumb(design);
      useShop.getState().addToCart({
        kind: "print",
        title: describePrint(spec),
        subtitle: `${sizeOf(spec).label} · design ${r}`,
        details: printDetails(spec, r),
        unitPrice: each,
        basePrice: unit,
        qty,
        image,
        print: { ref: r, spec },
      });
      useToasts.getState().push({ message: `${qty} × custom pillow added to your cart.`, href: "/cart/", linkLabel: "View cart" });
      // the next add is a new design line
      setRef(null);
    } finally {
      setBusy(null);
    }
  };

  const download = async (what: "front" | "back" | "proof") => {
    setBusy(what);
    try {
      const r = await ensureRef();
      if (what === "proof") await downloadCanvas(await renderProof(design, r), `${r}-proof.png`);
      else await downloadCanvas(await renderPrintFile(design, what), `${r}-${what}-print.png`);
    } catch {
      useToasts.getState().push({ message: "Sorry — that file couldn't be made on this device." });
    } finally {
      setBusy(null);
    }
  };

  const startOver = () => {
    if (!window.confirm("Start a new pillow? Your current design will be cleared (it stays in your cart if you added it).")) return;
    const d = initialDesign();
    usePrintStudio.getState().load(d);
    usePrintStudio.getState().setStep("shape");
    void saveDesign(DRAFT, d);
  };

  const backPrinted = spec.back !== "plain" && (spec.back === "same" || backSide(design).layers.length > 0 || !!backSide(design).fill);

  return (
    <div className="pstep">
      <header className="pstep__head">
        <h2>Review &amp; order</h2>
        <p className="muted">Check both sides in the preview — tap <b>Front</b> / <b>Back</b> and <b>On a sofa</b>.</p>
      </header>

      <dl className="review">
        {Object.entries(printDetails(spec)).map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>

      {warnings.length > 0 && (
        <ul className="review__warn" aria-label="Before you order">
          {warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}

      <div className="review__buy">
        <div className="qty" role="group" aria-label="Quantity">
          <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="One fewer">
            −
          </button>
          <input type="number" min={1} max={500} value={qty} onChange={(e) => setQty(Math.max(1, Math.min(500, Number(e.target.value) || 1)))} aria-label="Quantity" />
          <button type="button" onClick={() => setQty((q) => Math.min(500, q + 1))} aria-label="One more">
            +
          </button>
        </div>
        <div className="review__price">
          <strong>{money(each * qty)}</strong>
          <span>
            {money(each)} each{off > 0 && <> · {Math.round(off * 100)}% bulk saving</>}
          </span>
        </div>
      </div>
      {next && <p className="muted small">Order {next.min}+ and save {Math.round(next.off * 100)}% — ideal for gifts, events and hotels.</p>}

      <button type="button" className="btn btn--block" onClick={() => void add()} disabled={busy !== null}>
        {busy === "cart" ? "Adding…" : "Add to cart"}
      </button>
      <p className="muted small">
        Then request a free quote from your cart. We check every file by hand and send a proof before anything is printed.
        <Link href="/cart/" className="link-btn">
          Go to cart
        </Link>
      </p>

      <section className="review__files" aria-label="Print files">
        <h3 className="layers__title">Print files</h3>
        <p className="muted small">Full-size artwork with bleed, ready for the printer — attach them to your quote email, or keep them for your records.</p>
        <div className="page-hero__actions" style={{ justifyContent: "flex-start" }}>
          <button type="button" className="btn btn--sm btn--outline" onClick={() => void download("front")} disabled={busy !== null}>
            {busy === "front" ? "Preparing…" : "Front (PNG)"}
          </button>
          {backPrinted && spec.back === "custom" && (
            <button type="button" className="btn btn--sm btn--outline" onClick={() => void download("back")} disabled={busy !== null}>
              {busy === "back" ? "Preparing…" : "Back (PNG)"}
            </button>
          )}
          <button type="button" className="btn btn--sm btn--outline" onClick={() => void download("proof")} disabled={busy !== null}>
            {busy === "proof" ? "Preparing…" : "Proof sheet"}
          </button>
        </div>
        {ref && <p className="muted small">Design reference: <b>{ref}</b></p>}
      </section>

      <button type="button" className="btn btn--ghost btn--sm" onClick={startOver}>
        Start a new pillow
      </button>
    </div>
  );
}
