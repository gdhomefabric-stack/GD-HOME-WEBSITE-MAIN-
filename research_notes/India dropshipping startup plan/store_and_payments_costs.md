# Store + Payments Cost Sheet: India-only Shopify Dropshipping Store (as of Oct 2026, INR)

Method note: direct page fetches (shopify.com, razorpay.com, cashfree.com, developers.facebook.com) were blocked from this research environment. All figures below come from web-search snapshots of the official pages where available, otherwise from 2025–2026 secondary blogs. Each finding says which kind of source it is. **Confirm every price on the live checkout or pricing page before paying.**

FX used for USD-only prices: **₹96.5 = US$1**, from [Pluang USD/INR converter](https://pluang.com/en/tools/currency-converter/usd-inr), which showed 96.515 and a 52-week range of 86.25–96.96. The page has no visible date, so treat the rate as approximate. Other pages showing ₹82–83 looked stale or templated and were ignored. "Incl. GST" means ×1.18.

---

## 1. Shopify plans for India: price, offers, GST, and third-party transaction fees

### Takeaway
On Shopify's India page, Basic is ₹1,499/mo billed yearly or ₹1,994/mo billed monthly. Grow is ₹5,599/₹7,447 and Advanced ₹22,680/₹30,164. Starter is ₹399/mo. New stores get ₹20/mo for the first 3 months. Shopify charges 18% GST on top of these prices. Shopify Payments does not work in India, so every prepaid order pays a Shopify third-party transaction fee on top of the gateway fee: 2% on Basic, 1% on Grow, 0.6% on Advanced. COD orders do not pay it.

### Cited Findings
- **Basic: ₹1,499/mo billed yearly. Grow: ₹5,599/mo. Advanced: ₹22,680/mo. The yearly discount is 25% on Basic, Grow and Advanced. Offer: "₹20/month for first 3 months".** Source: [Shopify India pricing page (search snapshot)](https://www.shopify.com/in/pricing). The same snapshot shows Advanced's first-month (monthly-billing) price as ₹30,164.
- **Monthly-billing prices: Basic ₹1,994, Grow ₹7,447, Advanced ₹30,164. Basic is "approximately ₹1,769/month" after 18% GST on annual billing, and Advanced ≈ ₹26,762.** Sources: [Avada (2026)](https://avada.io/blog/shopify-price-in-india/), [Crawlapps (2026)](https://crawlapps.com/blogs/news/shopify-pricing-in-india), [Bybtraction (2026)](https://bybtraction.com/shopify-pricing-india-plans-fees-hidden-costs/). Grow is also cited as ₹5,585 by [Skailama](https://www.skailama.com/blog/shopify-pricing-plan); that is exactly ₹7,447 × 0.75, so it is a rounding variant.
- **Starter: ₹399 INR/month.** It is positioned for selling "through social media, email, SMS, WhatsApp, and anywhere else you might want to share a link to a product". The page says transaction fees are "5% when you use Shopify Payments". That page is about 4.5 years old. Source: [Shopify India Starter page](https://www.shopify.com/in/starter). One blog says Starter is billed monthly only, plus 18% GST, with a 5% fee: [Crawlapps](https://crawlapps.com/blogs/news/shopify-pricing-in-india).
- **Plus: "Starting at ₹1,75,000 INR/month billed yearly" on a 3-year term.** This comes from an old cached India page and may be outdated. Source: [Shopify India pricing (older snapshot)](https://www.shopify.com/in/pricing).
- **Free trial and ₹20 offer details:**
  - The standard trial is 3 days. Signup needs no card, but you cannot take real orders during the trial.
  - The ₹20/month rate covers 3 months (90 days), and you enter card or PayPal details when you upgrade.
  - One blog says the offer applies to Basic, Grow or Advanced, so it may not cover Starter.
  - Sources: [Noir & Blanco](https://noirandblanco.com/shopify-pricing-in-india/), [Shoptrial.in](https://www.shoptrial.in/), [Crawlapps](https://crawlapps.com/blogs/news/shopify-pricing-in-india).
- **Billing currency:** Shopify bills subscriptions in local currency, including Indian rupees, depending on location. Source: [Shopify Help Center – pricing overview](https://help.shopify.com/en/manual/intro-to-shopify/pricing-plans/pricing-overview). A Shopify Community thread reports Indian users being charged more than the listed rate on Basic: [Shopify Community – Shopify Billing India](https://community.shopify.com/t/shopify-billing-india/393276).
- **GST:** Shopify charges 18% GST on all subscriptions and fees for Indian businesses. If you enter a valid GSTIN at signup you can claim input tax credit; without one, the GST is still charged and cannot be recovered. Source: [PayGlocal blog](https://payglocal.in/blog/shopify-price-india-guide).
  - For foreign vendors with no Indian GSTIN, the Indian buyer pays 18% IGST under reverse charge. This covers Shopify subscriptions and most paid apps, and the tax must be paid in cash. Some vendors bill through an Indian arm and charge GST directly. Source: [The GST Co.](https://thegstco.com/pages/d2c-and-shopify-accounting-services).
  - Not verified against Shopify or CBIC documents.
- **Shopify Payments is unavailable in India.** Indian merchants must use a third-party gateway such as Razorpay, PayU or Cashfree, and Shopify's transaction fee then applies on top of the gateway fee. Sources: [DEV Community post](https://dev.to/preciousky_45d956626d31c3/shopify-payments-doesnt-operate-in-india-heres-what-that-actually-costs-you-30lp), [Xflowpay](https://www.xflowpay.com/blog/shopify-payment-gateway-india), [Shopify Community India payments thread](https://community.shopify.com/t/regional-support-payments-india/23357/67).
- **Third-party transaction fee by plan:** Starter 5%, Basic 2%, Grow 1%, Advanced 0.6%, Plus 0.15%. Sources: [Bybtraction](https://bybtraction.com/shopify-pricing-india-plans-fees-hidden-costs/), [Avada](https://avada.io/blog/shopify-price-in-india/), [Mith.tech](https://mith.tech/blog/shopify-cost-india). One Indian guide gives 0.5% for Advanced instead. Razorpay's blog gives a range of "0.5% to 2% depending on plan".
- **COD orders are exempt from the Shopify surcharge** because the fee applies only to gateway-processed payments. Source: [Razorpay blog – Shopify gateway pricing](https://razorpay.com/blog/razorpay-shopify-payment-gateway-pricing-explained/). This is a gateway's own claim and is not confirmed on a Shopify page.
- **Total payment stack:** One source estimates Shopify fee + gateway MDR + GST on MDR at roughly 4–5% of revenue. Source: [DEV Community post](https://dev.to/vyaparnext/1499-is-only-the-first-line-the-real-cost-of-shopify-for-an-indian-fashion-store-18ml).

### Inferences
- **Shopify plan cost incl. 18% GST (my arithmetic):**

| Plan | Monthly billing (incl. GST) | Annual billing, per month (incl. GST) | Annual billing, per year (incl. GST) | 3rd-party txn fee |
|---|---|---|---|---|
| Starter | ₹470.82 | n/a (monthly only, unverified) | — | 5% (old page) |
| Basic | ₹2,352.92 | ₹1,768.82 | ₹21,225.84 (₹17,988 + GST) | 2% |
| Grow | ₹8,787.46 | ₹6,606.82 | ₹79,281.84 (₹67,188 + GST) | 1% |
| Advanced | ₹35,593.52 | ₹26,762.40 | ₹3,21,148.80 (₹2,72,160 + GST) | 0.6% (0.5% per one source) |
| Intro offer | ₹20/mo × 3 = ₹60 + GST = ₹70.80 | — | — | — |

- **Payment-fee stack per ₹1,000 prepaid order, Razorpay at 2% + GST:**
  - Basic: ₹23.60 gateway + ₹23.60 Shopify = **₹47.20 (4.72%)**
  - Grow: ₹23.60 + ₹11.80 = **₹35.40 (3.54%)**
  - Advanced: ₹23.60 + ₹7.08 = **₹30.68**
  - This assumes 18% GST also applies to Shopify's transaction fee, which PayGlocal says it does.
- **Basic vs Grow break-even:**
  - On annual billing, Grow costs ₹4,100/mo more ex-GST and saves 1 percentage point. It pays off only above about **₹4.1 lakh/month of prepaid (non-COD) GMV**.
  - On monthly billing the break-even is about ₹5.45 lakh/month.
  - A new store should start on Basic.
- **Year-1 cost of Basic is almost the same either way:**
  - ₹20 offer for 3 months, then 9 months of monthly Basic: ₹70.80 + 9 × ₹2,352.92 ≈ ₹21,247.
  - Annual Basic from day one: ₹21,226.
  - Monthly billing keeps the option to quit after testing a niche, which suits a dropshipping test.
- **Starter is not a real storefront option for this project.** It is a link-in-bio / social-selling product, and its fee (5% on an old page) is far higher than Basic's 2%. Whether the full online-store theme is excluded on Starter was not confirmed in this research.

### Gaps
- The live shopify.com/in/pricing page could not be fetched, so the INR figures rest on search snapshots plus 2026 blogs. Whether the ₹20 offer can be combined with annual billing is unverified.
- No official Shopify Help Center page confirming the India per-plan third-party fees, or the Starter fee when a third-party gateway is used, was retrieved.
- How Shopify bills USD-priced app charges to Indian accounts (INR conversion, GST) was not confirmed.

---

## 2. Payment gateways for Indian Shopify stores

### Takeaway
None of the mainstream gateways (Razorpay, Cashfree, PhonePe PG, PayU, Paytm) charges a setup fee or AMC on its standard plan. Domestic rates sit at about 1.95–2% + 18% GST, and premium methods (Amex, Diners, EMI, international cards) cost about 3%.

UPI has a 0% government-mandated MDR, but gateways still charge their ~2% "platform fee" on UPI. So for a Shopify merchant, UPI is not free.

New-merchant promotions exist:
- **Razorpay:** 0% platform fee for 90 days on up to ₹5 lakh, for merchants activated on or after 1 July 2026.
- **PhonePe:** a "limited period" zero-fee offer.
- **Cashfree:** its 0% offer had a 31 July 2026 signup cutoff; status unclear.

CCAvenue is the outlier, with an AMC.

### Cited Findings
**Razorpay**
- Standard pricing: 2% per transaction, no setup fee, no annual maintenance fee. Sources: [Razorpay pricing page (search snapshot)](https://razorpay.com/pricing/), [Razorpay – no hidden charges](https://razorpay.com/blog/payment-gateway-transparent-pricing-explained/).
- Effective rate on Shopify is about 2.36% including GST. Source: [Razorpay blog – Shopify pricing](https://razorpay.com/blog/razorpay-shopify-payment-gateway-pricing-explained/).
- Premium methods (EMI, Amex, international cards) cost 3%. RuPay credit cards on UPI cost 2.15%. Source: [Razorpay 0% offer guide](https://razorpay.com/blog/razorpay-0-percent-platform-fee-offer-90-days-new-merchants-2026/).
- UPI: bank-account UPI has 0% MDR by government mandate, but Razorpay still adds its 2% platform fee. RuPay credit card on UPI carries a bank MDR of roughly 1.1–2% and a Razorpay fee of 2.15%. Source: [Razorpay – UPI charges: MDR vs platform fees](https://razorpay.com/blog/upi-charges-explained-mdr-vs-platform-fees/).
- **New-merchant offer:** the platform fee is waived for 90 days on up to ₹5 lakh of domestic volume, for merchants activated on or after 1 July 2026. The waiver excludes prepaid, corporate credit, AMEX, Diners, EMI and international cards, and standard pricing resumes automatically afterwards. Sources: [Razorpay 0% offer guide](https://razorpay.com/blog/razorpay-0-percent-platform-fee-offer-90-days-new-merchants-2026/), [Razorpay transparent pricing](https://razorpay.com/blog/payment-gateway-transparent-pricing-explained/).
- Custom pricing is available above about ₹5 lakh/month GMV. Source: [Razorpay payment gateway FAQ](https://razorpay.com/payment-gateway/).
- 18% GST applies only to the fee, not to the cart value. Source: [Razorpay low-cost gateway guide](https://razorpay.com/blog/low-cost-payment-gateway-in-india-the-complete-decision-guide/).
- Razorpay's own pages conflict on RuPay debit: one says 2%, another says 0% MDR for eligible merchants. This is unresolved.

**Cashfree**
- Pricing FAQ: **1.95%** for UPI (Intent, Collect, Credit Line, PPI) and for domestic credit and debit cards (Visa, Mastercard, RuPay, Maestro). UPI on RuPay credit card is **2.15%**. No setup fee and no AMC. Source: [Cashfree Pricing FAQs](https://www.cashfree.com/docs/help/account/pricing).
- Some Cashfree pages still show 1.90% or 2%; these look older. Source: [Cashfree PG charges page](https://www.cashfree.com/payment-gateway-charges/).
- **0% offer:** a 0% platform fee on domestic transactions up to ₹20 lakh GMV/month for new merchants, but only for those who signed up before **31 July 2026**, which has passed. A "festive offer" 0% marker also appeared. Status is unclear. Source: [Cashfree blog – "free" gateways](https://www.cashfree.com/blog/payment-gateway-charges-india-free-payment-gateway/).
- Settlement: next-day settlements are standard. Instant settlement costs extra, listed as a 0.30% platform fee (possibly outdated). Sources: [Cashfree homepage](https://www.cashfree.com/), [Cashfree PG charges](https://www.cashfree.com/payment-gateway-charges/).
- Qualifying RuPay debit card transactions are zero-MDR under RBI rules. Source: [Cashfree – debit card MDR](https://www.cashfree.com/blog/debit-card-mdr-charges/).

**PhonePe Payment Gateway**
- "Limited-period offer": fees "starting at 1.99%", with zero setup, zero annual maintenance and zero hidden charges. Fees "can vary slightly by payment method", and per-method rates are not published. Source: [PhonePe PG pricing](https://www.phonepe.com/business-solutions/payment-gateway/pricing/).
- Another PhonePe page offers "zero transaction fee, zero setup fee & zero hidden charges for a limited time period". Source: [PhonePe Business – Payment Gateway](https://business.phonepe.com/payment-gateway).
- A PhonePe article cites "1 to 2 per cent" for Indian cards, UPI and net banking. Source: [PhonePe – PG charges in India](https://business.phonepe.com/articles/payment-gateway-charges-in-india-complete-mdr-and-fee-breakdown).

**PayU**
- 2% for Visa, Mastercard, net banking, BNPL and wallets. 3% for Diners, Amex, EMI and international. No setup, onboarding or annual fees. Zero MDR on UPI under government guidelines.
- Other listings give 1.99–2.5% domestic and 3.5% international.
- Sources: 2026 comparisons [Xflowpay](https://www.xflowpay.com/blog/payment-gateway-charges-comparison), [Qikink](https://qikink.com/blog/best-payment-gateways-india/), [AppAdvisor](https://appadvisor.in/blogs/best-payment-gateway-india-charges-compared).

**Paytm PG**
- Standard plan 1.99% + GST, with free setup and no AMC. One source lists a 2.99% platform fee for some instruments. Source: [UPI MDR Calculator comparison](https://upimdrcalculator.com/payment-gateway-charges/).

**CCAvenue**
- 2% + GST domestic and 4.99% international cards. AMC is commonly cited at ₹1,200–₹6,000 depending on plan.
- Setup fee reports conflict: it historically charged ₹30,000–60,000 but reportedly now has free tiers; another source says ₹3,500–7,500.
- Sources: [Qikink](https://qikink.com/blog/best-payment-gateways-india/), [Wovlab](https://www.wovlab.in/blogs/payment-gateway/payment-gateway-fees-india-2026.html), [PaymentProviders.io](https://paymentproviders.io/blog/best-payment-gateways-india).

**Easebuzz**
- Quote-based. Figures cited range from 1.5% and 1.75% up to 1.9–2.3% + GST. Sources: [Qikink](https://qikink.com/blog/best-payment-gateways-india/), [Xflowpay](https://www.xflowpay.com/blog/payment-gateway-charges-comparison).

**Settlement times (comparison blogs)**
- Cashfree T+1; PayU and PhonePe T+1 or T+2; CCAvenue T+2 to T+5; Easebuzz T+1 or T+2. Standard settlement is "generally T+2" across gateways, and instant settlement is a paid add-on. Sources: [Qikink](https://qikink.com/blog/best-payment-gateways-india/), [Xflowpay](https://www.xflowpay.com/blog/payment-gateway-charges-comparison).

**KYC**
- Razorpay says KYC is mandatory and varies by business type, including proprietorships. Common items are PAN, Aadhaar, bank proof and website/app details. GST, PAN and bank proof "help generate tax reports", but the page does not say GST is mandatory. Source: [Razorpay – documents required](https://razorpay.com/blog/documents-required-for-payment-gateway).
- For RazorpayX current accounts (a different product), sole-proprietor entity proof is two items such as a Shop & Establishment certificate, ITR or another statutory registration. Udyog Aadhaar is not accepted. Source: [RazorpayX sole-prop KYC docs](https://razorpay.com/docs/x/rbl-ybl-current-account/sole-proprietorship/kyc.md).

### Inferences
- **Fee comparison on a ₹1,000 prepaid order (gateway only, incl. GST):**
  - Razorpay 2% → ₹23.60
  - Cashfree 1.95% → ₹23.01
  - PhonePe 1.99% → about ₹23.48
  - The differences are negligible next to Shopify's own 2% fee on Basic.
- **The real choice comes down to:**
  - which new-merchant 0% offer is live at signup (Razorpay's 90-day/₹5-lakh offer is the only one clearly current in October 2026);
  - Shopify integration quality;
  - access to that gateway's one-click checkout (Razorpay Magic).
- **Recommendation:** Razorpay as the primary gateway. Ask Cashfree and PhonePe for a written quote as a fallback.
- **Avoid CCAvenue** at launch because of its AMC and higher international rate.
- **UPI is not cheaper** than cards on Shopify-integrated gateways under standard pricing, because the platform fee replaces the MDR.
- **COD is likely to dominate** a new India dropshipping store. COD orders pay neither a gateway fee nor Shopify's surcharge, but they carry courier COD charges and RTO risk, which are outside this layer.

### Gaps
- Whether an unregistered sole proprietor (PAN + Aadhaar, no GSTIN) can activate Razorpay, Cashfree or PhonePe PG for a live website was not confirmed from official onboarding docs. Ask each gateway's sales or onboarding team directly.
- Razorpay's standard settlement cycle (T+2 is commonly cited) was not confirmed from an official 2026 page.
- PhonePe's per-method rates and the end date of its offer are not published.
- The current status of Cashfree's festive 0% offer is unknown.
- PayU's and Easebuzz's official 2026 rate cards were not retrieved; their figures come from comparison blogs.

---

## 3. One-click checkout and COD tools (GoKwik, Shopflo, Razorpay Magic, Shiprocket Checkout)

### Takeaway
None of the four publishes a clean self-serve rate card for a tiny store. Shopflo's published floor is ₹10,000/month (a ₹3,000 waitlist Starter plan is also mentioned). GoKwik and Razorpay Magic are quote-based, though one blog cites Magic at 0.65% per transaction. Several sources say orders through these checkouts avoid Shopify's 2% third-party fee, which can partly offset their cost, but this may not last. Their RTO-reduction claims (GoKwik: 26–38% lower COD RTO) are all vendor-reported.

### Cited Findings
**Shopflo**
- Pricing tiers: **Professional 1.0% of sales (from ₹10,000/month); Growth 0.6% (from ₹20,000/month); Enterprise 0.4% (from ₹40,000/month)**, all billed monthly. There is also a Starter plan "for upcoming D2C brands which begins at ₹3,000 per month" that is waitlist-only. Source: [Shopflo pricing](https://www.shopflo.com/pricing).
- The sign-up FAQ says "Our base plan starts at ₹10,000 per month". Source: [Shopflo sign-up](https://shopflo.com/sign-up).
- Shopflo says orders on its checkout "do not attract any Shopify transaction fees". Source: [Shopflo pricing](https://www.shopflo.com/pricing).
- Shopflo's competitor page describes GoKwik as "commission-based, starts at 2% GMV" and Shopflo as a flat fee from ₹5,000/month. This is marketing. Source: [Shopflo compare](https://shopflo.com/compare).
- The referral page claims "28% higher order value". Source: [Shopflo refer-a-brand](https://www.shopflo.com/refer-a-brand).
- The RTO Suite includes a COD-to-prepaid discount but gives no outcome numbers. Source: [Shopflo RTO Suite](https://www.shopflo.com/help/shopflos-rto-suite).
- A third-party source quotes Shopflo terms of "0.4% of GMV or INR 50,000 per month, whichever is higher" + GST. Source: [Shiprocket Checkout blog – Shopflo alternatives](https://checkout.shiprocket.in/blog/shopflo-alternatives/), a competitor.

**GoKwik**
- As of August 2026, GoKwik publishes no rate card; its pricing page ends in "get custom quote". Possible fee models are a per-order fee, a % take-rate on checkout GMV, or a success fee on COD-to-prepaid conversion and RTO avoided. Source: [TheShizz – GoKwik vs Razorpay Magic (2026)](https://theshizz.in/blog/gokwik-vs-razorpay-magic-checkout-comparison-d2c).
- One blog cites a COD fee of 0.5% after the first 1,000 COD orders/month (single source). Source: [WiserReview – GoKwik alternatives](https://wiserreview.com/blog/gokwik-alternatives/).
- **RTO claims (vendor-reported, no independent audit):**
  - COD RTO fell 26% across its network in a festive season.
  - RTO fell 30% for fashion and 38% for health and wellness.
  - Sources: [Free Press Journal – GoKwik network 100M](https://www.freepressjournal.in/business/gokwik-network-touches-100-million-base), [IndiaRetailing](https://www.indiaretailing.com/?p=170205).
  - In 2023, electronics COD RTO fell 28%, and boAt saw "up to 32%" lower RTO. Source: [Free Press Journal – ₹130 Cr RTO savings 2023](https://www.freepressjournal.in/amp/business/gokwik-helps-ecommerce-brands-save-over-130-cr-worth-of-rto-losses-in-2023).
- **Conversion uplift claims (vendor-reported, by category):** beauty & personal 2.93%, mobile accessories 10.81%, beauty & cosmetics 2.74%, healthcare 5%. Source: same FPJ/IndiaRetailing coverage.

**Razorpay Magic Checkout**
- Optional "RTO Protection" reimburses verified COD orders that return-to-origin despite approval by Magic's risk engine. It requires COD Intelligence to be enabled. Sources: [Razorpay Magic](https://razorpay.com/magic/), [Razorpay MagicX for Shopify Plus](https://razorpay.com/blog/razorpay-magicx-for-shopify-plus/).
- The COD fee is merchant-set by order-value slabs and can be ₹0. Source: [Magic Checkout Shopify configuration docs](https://razorpay.com/docs/payments/magic-checkout/shopify/configuration/?preferred-country=IN).
- **Price:** sources conflict. One blog cites 0.65% per transaction with zero setup or maintenance fee. A 2026 analysis says Razorpay lists Magic as enterprise / contact-sales pricing. Sources: [ControlF5 – what is Magic Checkout](https://www.controlf5.in/what-is-magic-checkout-shopify/), [TheShizz](https://theshizz.in/blog/gokwik-vs-razorpay-magic-checkout-comparison-d2c).

**Shiprocket Checkout**
- Reported COD charges of about 1–2%, with plans that vary. This comes mostly from Shiprocket's own content and may be outdated. Source: [WiserReview – Shiprocket Checkout alternatives](https://wiserreview.com/blog/shiprocket-checkout-alternatives/).

**Shopify fee bypass**
- An Indian agency explains why Shopify's transaction fee doesn't apply to GoKwik, Magic and Shopflo orders: they are pushed back as paid draft orders. It also asks "how long this will last". Source: [Mayday Internet (2026)](https://www.maydayinternet.com/why-shopify-transaction-fees-dont-apply-to-quick-checkouts-like-gokwik-razorpay-magic-checkout-shopflo-in-india-and-how-long-this-will-last).

**General advice**
- Pilot a checkout tool on a slice of traffic and compare conversion and RTO before committing. Source: [eChai Ventures – are GoKwik/Shopflo worth it](https://echai.ventures/d2c/d2c-payments-cod/one-click-checkout-gokwik-shopflo-worth-it).

### Inferences
- At launch volumes, Shopflo's ₹10,000/month floor (≈ ₹11,800 incl. GST) is more than the entire rest of the recommended software stack, so it is not worth it on day one.
- **Rough break-even if the Shopify-fee bypass holds:**
  - On Basic, a quick checkout saves 2% + GST = 2.36% of prepaid GMV.
  - A 0.65% Magic fee, if confirmed, would make Magic net-cheaper than native checkout on prepaid orders.
  - Shopflo's ₹10,000 floor would need about ₹4.2 lakh/month of prepaid GMV to be paid back by the fee saving alone.
- **Revisit these tools** once the store has steady COD volume (on the order of hundreds of COD orders per month), and get written quotes from Razorpay Magic and GoKwik.

### Gaps
- There are no official, current per-order or %-of-GMV prices for GoKwik, Razorpay Magic or Shiprocket Checkout. All three need sales quotes.
- None of the RTO or conversion claims is independently verified, and baselines and sample sizes are not disclosed.
- Shopify's official position on the draft-order fee bypass was not found.

---

## 4. Domain: new .in / .com vs a subdomain of gdhomefabric.in

### Takeaway
A subdomain such as shop.gdhomefabric.in can be connected to Shopify with a single CNAME record pointing to shops.myshopify.com, so no new domain purchase is needed. A fresh .in costs ₹1–₹599 in year 1 depending on the promo, then renews at about ₹800–₹1,133/year. A .com costs ₹1–₹83 promo in year 1 and renews at about ₹1,499.

### Cited Findings
- **Shopify subdomain connection:**
  - Point the subdomain's CNAME record to `shops.myshopify.com`. No A record is needed, even when the subdomain is the primary domain.
  - Verify the connection in Settings > Domains.
  - You must already own the root domain.
  - Source: [Shopify Help Center – connecting a third-party subdomain](https://help.shopify.com/en/manual/domains/add-a-domain/connecting-domains/connect-subdomain).
- DNS changes usually take effect within a couple of hours but can take up to 48 hours. Source: [Websouls guide](https://websouls.com/blog/how-to-connect-domain-with-shopify).
- **.in prices:**
  - **Hostinger:** ₹1 first year, renewal ₹899/year. Source: [Hostinger India .in page (official)](https://www.hostinger.com/in/tld/in-domain).
  - **GoDaddy:** ₹599 first year and ₹800 renewal per one guide; ₹349 first year per another. Sources: [Codeshoppy (2026)](https://codeshoppy.com/blog/domain-hosting-costs-india-2026/), [Bonghosting (2026)](https://bonghosting.com/blog/top-10-cheapest-domain-registration-sites-in-india-2026-updated-list/).
  - **Namecheap:** ₹550 per one source; ₹943.54 registration and ₹1,132.62 renewal per another. Sources: [Cybernews](https://cybernews.com/best-domain-registrars/best-india-domain-registrars/), [DomainOffer](https://domainoffer.net/tld/in).
- **.com prices:**
  - **Hostinger:** ₹1 first year, renewal ₹1,499 (dated 29 Aug 2026). Source: [Zoutons – Hostinger domain price India 2026](https://zoutons.com/news/hostinger-domain-price-india-2026).
  - **GoDaddy:** from about ₹83 first year on promotion (June 2026), with higher renewals. Source: [Zoutons – GoDaddy vs Hostinger 2026](https://zoutons.com/news/godaddy-vs-hostinger-2026-first-website).

### Inferences
- **Cheapest option:** shop.gdhomefabric.in costs ₹0 extra, and the owner already pays for gdhomefabric.in.
- **Trade-off:**
  - A dropshipping store in an unrelated niche would carry the GD Home Fabric brand in its URL.
  - Any chargebacks, fraud or spam flags on email from that domain could also affect the main brand's reputation.
  - If the niche is unrelated to home textiles, a separate .in costs only about ₹349–₹599 in year 1 and ₹800–₹900/year after (≈ ₹75/month). That is cheap insurance for a separate brand.
- **Domain GST:** registrar prices may or may not include 18% GST; check at checkout.

### Gaps
- Shopify's own INR price for buying a domain through Shopify was not found.
- Whether Shopify charges anything to connect a third-party domain or subdomain was not stated in the retrieved sources. It is generally understood to be free, but that is not confirmed here.
- Live registrar prices change daily; the figures above are snapshots.

---

## 5. Themes: free vs premium

### Takeaway
Shopify's free themes (Horizon is now the default; Dawn is still available) cost ₹0. Paid Theme Store themes are one-time purchases with a median of about $315 (≈ ₹30,400, ≈ ₹35,900 incl. GST). Half of them cost $220–$360, and about 14% cost $400 or more.

### Cited Findings
- The default theme for new stores changed from Dawn to **Horizon**, which is listed as Free. Sources: [Shopify Theme Store – Horizon](https://themes.shopify.com/themes/horizon/styles/horizon), [PulseV – new free Shopify themes](https://www.pulsev.com/en/blogs/our-blog/new-free-themes-created-by-shopify).
- Across 306 paid themes (updated Aug 2026): median **$315**, average **$286.93**, half between **$220 and $360**, and 42 themes (13.7%) at $400 or more. Source: [ShopThemeDetector theme pricing stats](https://shopthemedetector.com/shopify-statistics/theme-pricing).
- Example prices (July 2026 review): Turbo about $425, Booster about $398. Source: [Dupple – Pixel Union review](https://dupple.com/reviews/pixel-union).

### Inferences
- **INR at ₹96.5/$:**
  - $220 ≈ ₹21,230 (≈ ₹25,050 incl. GST)
  - $315 ≈ ₹30,400 (≈ ₹35,870 incl. GST)
  - $360 ≈ ₹34,740 (≈ ₹40,990 incl. GST)
  - $425 ≈ ₹41,010 (≈ ₹48,400 incl. GST)
  - GST treatment may be reverse charge; see section 1.
  - Add any card forex markup, which is bank-specific and not researched here.
- For a dropshipping test store whose niche is not yet chosen, a free theme (Horizon or Dawn) is sensible. A premium theme is a one-time cost to consider only after a niche proves itself.

### Gaps
- Exact current prices for individual popular themes (Impact, Prestige, etc.) were not confirmed from Theme Store pages.
- Whether Shopify charges Indian buyers for themes in INR or USD was not confirmed.

---

## 6. Essential apps: supplier sync, reviews, WhatsApp, COD verification, email, GST invoices, pixel

### Takeaway
A lean stack can run almost free:
- Judge.me free reviews
- Shopify Email with 10,000 free emails/month
- A free or $3–5/mo GST invoice app
- Meta WhatsApp utility messages at ₹0.115 each for COD confirmation

The main paid line items are:
- A WhatsApp BSP platform (about ₹1,500–₹5,000/mo)
- A COD form/verification app (about $29/mo for Releasit, or ₹500–2,500/mo per a blog estimate)
- Judge.me Awesome ($15/mo)
- A supplier-sync app if the supplier needs one ($0–$79+/mo)

### Cited Findings

**Supplier sync and dropshipping apps (India)**
- **Syncee** starts at $39.99/month after a free plan. Source: [StoreCensus – Syncee](https://www.storecensus.com/shopify-apps/syncee-1).
- **Sync2Fashion** costs from $49/month and is fashion-focused. Source: [Shopify App Store – Sync2Fashion](https://apps.shopify.com/sync2fashion-1).
- **vFulfill** plans are $79 (Mover), $149 (Shaker) and $249 (Earth-Quaker) per month, and some tiers add a per-delivered-order fee. Source: [Dropship.io – India suppliers](https://www.dropship.io/blog/best-dropshipping-suppliers-in-india).
- **Dropship India** (Shopify app) is free to install and rated 3.3 from 21 reviews. **Printrove** has a free plan, with a ₹5,000 credit recharge for its Business plan. **Baapstore** offers white-label dropshipping with COD; its pricing was not found. Sources: [DoDropshipping – India suppliers](https://dodropshipping.com/best-dropshipping-suppliers-in-india/), [Dropship.io](https://www.dropship.io/blog/best-dropshipping-suppliers-in-india).
- **Shopify Collective** is free for Shopify users. Source: [Shopify India blog – dropshipping suppliers](https://www.shopify.com/in/blog/dropshipping-suppliers).

**Reviews**
- **Judge.me:** a free plan (unlimited reviews, basic widget, photo and video reviews, basic email requests). The **Awesome plan is $15/month** flat regardless of order volume. Source: [WiserReview – Judge.me review](https://wiserreview.com/blog/judge-me-review/).
- **Loox:**
  - No free-forever plan, but a 14-day trial.
  - Prices rise with order volume.
  - The June 2026 listing shows Beginner from $0, Convert $49.99 and Unlimited $299.99.
  - Other sources cite Beginner at $9.99 or $12.99.
  - Sources: [WiserReview – Loox pricing 2026](https://wiserreview.com/blog/loox-pricing/), [Stackdex – Judge.me vs Loox](https://www.stackdex.io/compare/judge-me-vs-loox).

**Meta WhatsApp Business Platform charges (India)**
- **Billing model:** per-message billing since 1 July 2025, priced by category and the recipient's country code, and charged only on delivery. Conversation-based pricing is deprecated.
- **Free allowances:** 1,000 free service messages per business number per month. Messages inside a free entry-point window are not charged.
- India marketing rates rose effective 1 Jan 2026. India changes also took effect 1 July 2026 and 1 Oct 2026. From October 2026, utility messages sent inside an open 24-hour window are charged; they had been free since July 2025.
- Sources: [Meta – WhatsApp pricing](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing), [Meta – non-template message pricing updates](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing/non-template-messages), [WhatsApp Business Platform pricing](https://business.whatsapp.com/products/platform-pricing?category=Authentication).
- **India per-message rates (secondary sources quoting the Meta rate card), before 18% GST:**
  - **Marketing ₹0.8631**, raised in Jan 2026 from ₹0.7846
  - **Utility ₹0.115**
  - **Authentication ₹0.115**
  - Authentication-international ₹2.4971 for eligible businesses
  - Service replies are charged ₹0.115 after the first 1,000 free per number per month, from 1 Oct 2026
  - GST at 18% is added on invoices from Facebook India.
  - Sources: [Amomic – WhatsApp API pricing India 2026](https://amomic.in/blog/whatsapp-business-api-pricing-india), [ChatMaxima – India pricing](https://chatmaxima.com/whatsapp-api-pricing/india/), [CyberElite](https://cyberelite.in/blog/whatsapp-business-api-pricing-india/).
  - An outlier lists ₹0.88 marketing and ₹0.13 utility; this looks like a reseller's marked-up price on a page about 399 days old. Source: [2Factor](https://2factor.in/v3/lp/whatsapp-business-api-pricing.php).

**WhatsApp BSP platforms (platform fee on top of Meta charges; sources conflict)**
- **AiSensy:**
  - Basic ₹1,500/mo and Pro ₹3,200/mo, with 10% off yearly. Source: [TheShizz – Interakt vs WATI vs AiSensy (2026)](https://theshizz.in/blog/whatsapp-marketing-tools-pricing-interakt-wati-aisensy).
  - Another source says the base platform is free with prepaid messages, and marketing at ₹1.09/msg. Source: [Codingclave (2026)](https://codingclave.com/guides/whatsapp-api-pricing-india-2026-comparison).
- **Interakt:**
  - A third-party listing (about 18 days old) gives Starter ₹3,499/quarter, Growth ₹7,699/quarter and Advanced ₹10,499/quarter. Quarterly billing is the default, with an 8% discount.
  - Interakt's older official page and blogs (about 500–600 days old) list Starter at ₹2,757 or ₹6,897 per quarter and Growth at ₹2,499/mo or $55/mo.
  - Marketing costs about ₹0.970/msg on Starter. The Starter plan supports only the Shopify integration.
  - Sources: [Interakt pricing page (old snapshot)](https://www.interakt.shop/pricing-us/), [Interakt blog – costing](https://www.interakt.shop/blog/wa-business-api-pricing/), [ReplyKaro (2026)](https://www.replykaro.com/blog/wati-vs-aisensy-vs-interakt-2026).
  - Interakt is the most often recommended for Shopify D2C because of native cart-abandonment and catalogue features. Source: [TheShizz](https://theshizz.in/blog/whatsapp-marketing-tools-pricing-interakt-wati-aisensy).
- **WATI:** Growth ₹4,999/mo (₹3,749/mo billed yearly), Pro ₹9,999/mo, plus WATI's own per-message rate card. Source: [ReplyKaro](https://www.replykaro.com/blog/wati-vs-aisensy-vs-interakt-2026).
- **Gallabox:**
  - Basic ₹2,399/mo (3-user cap) and Essential ₹5,599/mo. Source: [Fidusflo – AiSensy vs Gallabox (2026)](https://fidusflo.com/compare/aisensy-vs-gallabox.php).
  - Another source lists Growth at ₹5,999/mo. Source: [Cleomitra (2026)](https://www.cleomitra.com/blog/whatsapp-api-providers-india-pricing-comparison-2026).

**COD form and verification apps**
- **Releasit COD Form & Upsells:** includes order-confirmation automation and WhatsApp follow-ups. Source: [Shopify App Store – Releasit](https://apps.shopify.com/releasit-cod-order-form).
  - A merchant review mentions paying $29/month. A comparison site lists the Unlimited plan at $69.99/month. Source: [Digismoothie – Releasit](https://www.digismoothie.com/de/app/releasit-cod-form).
- An Indian setup guide estimates a COD app at **₹500–₹2,500/month**; this is a blog estimate. The same guide notes Shopify's default order confirmation is not a GST tax invoice. Source: [Thriftizer – Shopify store setup cost India](https://www.thriftizer.com/blog/shopify-store-setup-cost-in-india-the-real-launch-stack-breakdown).
- GoKwik's Shopify app "Kwik COD & Checkout" also exists; pricing is quote-based. Source: [Shopify App Store – Kwik COD](https://apps.shopify.com/kwikcheckout).

**Email marketing**
- **Shopify Email:**
  - 10,000 free emails at the start of every month.
  - Then **$1 per 1,000** up to 300,000 emails; $0.65 per 1,000 after 300k; $0.55 per 1,000 after 750k.
  - Charges count per recipient, and unused free emails expire.
  - Abandoned-checkout automations are always free and not counted.
  - Source: [Shopify Help Center – Shopify Email pricing](https://help.shopify.com/manual/promoting-marketing/create-marketing/shopify-email/shopify-email-cost).
- **Klaviyo:**
  - Free plan: 250 active profiles, 500 email sends/month and 150 SMS credits, with Klaviyo branding and support limited to 60 days.
  - Email plans start at $20/mo for 251–500 profiles, then about $30/mo at 1,000 and $150/mo at 10,000 profiles.
  - Billing is by active profile.
  - Sources: [MoEngage – Klaviyo pricing 2026](https://www.moengage.com/blog/klaviyo-pricing/), [AutomationAtlas (2026)](https://automationatlas.io/answers/klaviyo-pricing-explained-2026/), [Sender – Klaviyo free plan](https://www.sender.net/reviews/klaviyo/pricing/free-plan).

**GST invoice apps (Shopify App Store, USD)**
- **iGST: India GST Invoices** – $3/mo, 3-day trial. Source: [Shopify App Store](https://apps.shopify.com/igst-india-gst-invoice).
- **GST Invoice For Ecom** – $3.99, $8.90 or $18.90/mo, 7-day trial. Source: [Shopify App Store](https://apps.shopify.com/gst-invoice-for-ecom).
- **WebPlanex GST Invoice India** – $4.99, $9.90, $19.90 or $49.90/mo, 7-day trial. Source: [Shopify App Store](https://apps.shopify.com/gst-invoice-india?locale=es).
- **Indian GST Invoice** – Business $14.99/mo ($161/yr), Advanced $49.99/mo. Source: [Shopify App Store](https://apps.shopify.com/indian-gst-invoice).
- **India GST Suite** – free, but rated 1.0 from one review. Source: [Shopify App Store](https://apps.shopify.com/indiagstsuite).

**Pixel / Conversions API apps**
- **Trackify:** entry tier $84/year (per a competitor). Another roundup describes a free one-pixel tier and $8.99/mo unlimited, and says it supports Meta CAPI, TikTok and Snapchat. Sources: [WeltPixel – Trackify comparison](https://weltpixel.com/pages/compare-trackify), [EasySell – pixel apps 2026](https://easysellapp.com/blogs/wiki/best-shopify-pixel-tracking-apps-2026).
- **Elevar:** $0 starter with a small order allowance. Paid plans are about $200–$225/mo for up to roughly 1,000–2,000 orders. Sources: [TagFly – Elevar alternatives](https://tagfly.io/blog/elevar-alternatives-for-shopify-conversion-tracking/), [Attribuly – Elevar pricing](https://attribuly.com/blogs/elevar-pricing-ultimate-guide-shopify-server-side-tracking/).

### Inferences
- **INR equivalents at ₹96.5/$ (ex-GST → incl. 18% GST):**
  - Judge.me Awesome $15 → ₹1,448 → ₹1,708/mo
  - Releasit $29 → ₹2,798 → ₹3,302/mo
  - iGST $3 → ₹290 → ₹342/mo
  - GST Invoice for Ecom $3.99 → ₹385 → ₹454/mo
  - Klaviyo $20 → ₹1,930 → ₹2,277/mo
  - Syncee $39.99 → ₹3,859 → ₹4,554/mo
  - vFulfill Mover $79 → ₹7,624 → ₹8,996/mo
  - Shopify Email overage: $1 per 1,000 ≈ ₹96.5 per 1,000 emails.
- **Meta WhatsApp costs per use (incl. GST):**
  - One COD-confirmation utility template per order ≈ **₹0.136/order**, or ≈ ₹136 per 1,000 orders.
  - One marketing broadcast to 5,000 contacts ≈ ₹4,316 + GST ≈ **₹5,092**.
  - BSPs that publish their own rate (AiSensy ₹1.09, Interakt ₹0.97 marketing) appear to mark up Meta's ₹0.8631.
- **For COD confirmation at launch:** a COD-form app with built-in WhatsApp/OTP, or AiSensy/Interakt at their entry tier, is the cheapest proper setup. Manual confirmation using the free WhatsApp Business app is possible at very low volume; that point comes from general knowledge, not from a cited source.
- **Pixel:** Shopify's native Facebook & Instagram sales channel is generally used for Meta Pixel and CAPI at no extra cost. Its price was not confirmed in this research; see Gaps. Elevar is overkill for a new store.

### Gaps
- No official 2026 pricing pages were retrieved for AiSensy, WATI or Gallabox, and Interakt's official page snapshot is about 1.5 years old. Get vendor quotes.
- Releasit's current official plan prices are unconfirmed, and no INR pricing for Indian COD-verification apps (e.g., Priya COD Form, Progus COD Form & OTP SMS) was found.
- The cost of Shopify's Facebook & Instagram channel (Meta CAPI) was not confirmed.
- Pricing for Baapstore, Roposo Clout and GlowRoad supplier-sync was not found.
- Meta's India rate card was quoted through secondary sources, not read directly from Meta's rate-card file.

---

## 7. Business email, branding, and other software

### Takeaway
Business email costs about ₹59/user/month with Zoho Mail Lite or about ₹270/user/month with Google Workspace Business Starter (annual, + 18% GST). Canva Pro in India costs about ₹3,999–₹4,500/year or ₹499/month, and Canva Free is enough to make a logo.

### Cited Findings
- **Google Workspace Business Starter:** about ₹270/user/month on an annual commitment + 18% GST via India partners; Business Standard about ₹1,080/user/month.
  - One blog lists ₹125 incl. GST; this is an outlier.
  - A cheaper India-only "Base" option at ₹99 for up to 20 users is mentioned by one reseller and is unverified.
  - Sources: [Netspace India](https://www.netspaceindia.com/email-solutions/google-workspace-pricing/), [Unico Connect (2026)](https://unicoconnect.com/google-workspace-pricing-india), [Wbeen](https://wbeen.com/products/google-workspace/).
- **Zoho Mail Lite:** ₹59/user/month on annual billing; the 10 GB tier is ₹75. Source: [Cloudfy Systems – Zoho Mail pricing India 2026](https://www.cloudfysystems.com/blog/zoho-mail-pricing-plans-india-2025).
- **Canva Pro India:**
  - ₹4,500/year (profile updated May 2026). Source: [ProductGrowth.in](https://productgrowth.in/tools/design/canva/).
  - ₹3,999/year (≈ ₹333/mo) or ₹499/month. Source: [Wiuwi](https://wiuwi.com/blogs/207324/Complete-Guide-to-Canva-Subscription-Pricing-in-India).
  - ₹499/month is attributed to a regional discount. Source: [Miracamp](https://www.miracamp.com/learn/canva/pricing-plans).
  - An older ₹1,299/year figure is likely outdated.

### Inferences
- **Incl. GST:**
  - Zoho Mail Lite ≈ ₹69.62/user/month (₹835/user/year)
  - Google Workspace Starter ≈ ₹318.60/user/month (₹3,823/user/year)
  - Whether Canva's INR price includes GST was not confirmed.
- **If using shop.gdhomefabric.in:** the owner may already have mailboxes on gdhomefabric.in. Adding a new alias costs ₹0 on most plans; this is an inference, since the existing email setup is unknown.
- **Branding:** Canva Free is enough for a logo at launch; buy Canva Pro (₹333–375/mo equivalent) only if producing many ad creatives.

### Gaps
- Official Google Workspace India and Canva India pricing pages were not retrieved; the figures come from reseller and blog pages.
- Zoho Mail's free plan availability for custom domains in 2026 was not checked.

---

## 8. Cost sheet: cheapest sensible setup vs recommended setup

### Takeaway
The cheapest sensible setup costs about **₹2,200/month fixed** incl. GST (Shopify Basic annual + a ₹3 GST invoice app + Zoho Mail) plus about **4.72% of prepaid GMV** in payment fees. The first 3 months on the ₹20 offer cost about ₹71 total. The recommended setup costs about **₹7,000–₹9,800/month fixed** incl. GST. Neither setup has any mandatory one-time cost; a premium theme (≈ ₹25k–48k) and a new domain (≈ ₹349–599) are optional.

### Cited Findings
Every unit price below is cited in sections 1–7: Shopify plan prices and fees, gateway rates, theme, domain, app, Meta WhatsApp, email and Canva prices. Totals are my arithmetic at ₹96.5/$ and 18% GST.

### Inferences

**A. Cheapest sensible setup (launch / niche-testing phase)**

| Item | One-time (₹) | Monthly (₹, incl. GST) | Notes |
|---|---|---|---|
| Shopify trial + intro | 0 | ₹70.80 total for first 3 months (₹20 × 3 + GST) | 3-day free trial first |
| Shopify Basic (after intro) | — | **₹1,768.82** (annual, ₹21,226 upfront) or ₹2,352.92 (monthly) | Monthly billing is better while testing niches |
| Domain | 0 | 0 | Subdomain shop.gdhomefabric.in via CNAME → shops.myshopify.com |
| Theme | 0 | 0 | Horizon / Dawn (free) |
| Payment gateway (Razorpay) | 0 setup, 0 AMC | 0 fixed | 2% + GST per prepaid txn; 0% for first 90 days up to ₹5 lakh if activated after 1 Jul 2026 |
| Shopify 3rd-party txn fee | — | — | 2% (+GST) of prepaid GMV on Basic; COD exempt |
| COD | 0 | 0 | Native Shopify COD (manual payment) |
| Reviews | 0 | 0 | Judge.me Free |
| Email marketing | 0 | 0 | Shopify Email (10,000 free/month) |
| GST invoice | 0 | ₹0–342 | India GST Suite (free, poorly rated) or iGST $3 |
| WhatsApp confirmation | 0 | ≈ ₹0.136/order (Meta utility) or ₹0 manual | Manual via WhatsApp Business app at very low volume |
| Business email | 0 | ₹69.62 | Zoho Mail Lite, 1 user |
| Logo / creatives | 0 | 0 | Canva Free |
| Pixel / CAPI | 0 | 0 | Shopify's Facebook & Instagram channel (cost unverified) |
| **Total fixed** | **₹0** | **≈ ₹2,180/mo** (annual Basic) / ≈ ₹2,765/mo (monthly Basic) | |
| **Variable** | | **≈ 4.72% of prepaid GMV** (≈ 2.36% during Razorpay's 90-day 0% window) | Plus Meta message charges |

**B. Recommended setup (once a niche is chosen and ads are running)**

| Item | One-time (₹) | Monthly (₹, incl. GST) | Notes |
|---|---|---|---|
| Shopify Basic, annual | — | ₹1,768.82 | Move to Grow only above ≈ ₹4.1 lakh/mo prepaid GMV |
| Own brand domain (.in) | ≈ ₹349–599 yr-1 | ≈ ₹67–75 (renewal ₹800–899/yr) | Keeps the new brand separate from GD Home Fabric |
| Theme | ₹0 now; optional premium ≈ ₹25,050–48,400 incl. GST later | 0 | Median paid theme $315 ≈ ₹35,870 incl. GST |
| Gateway: Razorpay (+ COD) | 0 | 0 fixed | Get Cashfree/PhonePe quotes as fallback |
| Judge.me Awesome | — | ₹1,708 | $15 |
| COD form + verification app | — | ₹590–3,302 | Blog estimate ₹500–2,500 + GST, up to Releasit ≈ $29 |
| WhatsApp BSP (AiSensy Basic or Interakt Starter) | — | ≈ ₹1,376–1,770 | AiSensy ₹1,500/mo; Interakt ₹3,499/qtr; + Meta per-message charges |
| Meta WhatsApp messages | — | ≈ ₹136 per 1,000 COD confirmations; ≈ ₹1.02 per marketing msg | Utility ₹0.115, marketing ₹0.8631 + GST |
| GST invoice app | — | ₹454 | GST Invoice For Ecom $3.99 |
| Email marketing | — | ₹0 (Shopify Email) | Switch to Klaviyo ($20+/mo ≈ ₹2,277) only at scale |
| Google Workspace Business Starter | — | ₹318.60/user | Or Zoho ₹69.62 |
| Canva Pro | — | ≈ ₹333–375 | ₹3,999–4,500/yr |
| Supplier-sync app | — | ₹0–4,554+ | Free supplier apps (Dropship India, Printrove free) up to Syncee $39.99; vFulfill $79+ |
| **Total fixed (excl. supplier app)** | **≈ ₹350–600** (+ optional theme) | **≈ ₹7,000–9,800/mo** | |
| **Variable** | | **≈ 4.72% of prepaid GMV + Meta messages** | |

- **Annualized:** the cheapest setup is about ₹26,000/year. The recommended setup is about ₹84,000–₹1,18,000/year before ads, supplier costs and courier/RTO costs.
- **Not recommended at launch:**
  - Shopify Grow/Advanced
  - Shopflo (₹10,000/mo floor)
  - Premium themes
  - Klaviyo paid
  - Elevar
  - GoKwik / Razorpay Magic, until COD volume justifies a quote. Ask Razorpay early, though: if the reported 0.65% Magic fee and the Shopify-fee bypass both hold, Magic may lower prepaid fees.

### Gaps
- These totals exclude:
  - Ad spend
  - Shipping and COD courier fees
  - RTO losses
  - Supplier margins
  - GST registration and compliance costs
  - Bank forex markup on USD app charges
  - These are outside the store + payments scope or were not researched.
- Every figure that rests on a third-party blog (flagged in sections 1–7) should be re-checked on the live vendor page before budgeting.
