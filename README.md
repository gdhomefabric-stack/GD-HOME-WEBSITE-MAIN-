# GD Home Fabric — The Villa

The website for [gdhomefabric.in](https://gdhomefabric.in): a made-to-measure curtain and goose feather pillow
atelier, with an interactive villa where visitors stand in eight real-lit rooms, open and close the curtains, try
every collection in place, and dress the beds. It is built with Next.js (static export), React Three Fiber and
Three.js. The rooms are modelled, lit and path-traced in Blender, so they look like photographs rather than a game.

## The site

| Page | What it is for |
| --- | --- |
| `/` | Home: the house, the rooms, the collections, how a commission works, guides and journal |
| `/villa/` | The interactive villa (`?room=<id>` opens a room) |
| `/collections/`, `/collections/<id>/` | The five curtain collections, each with specifications, linings and a fabric studio |
| `/pillows/` | Goose feather pillows: sizes, fills, support, covers |
| `/made-to-measure/` | Headings, lengths, linings and fullness, explained |
| `/fabric-guide/`, `/measuring-guide/`, `/care/` | Practical guides |
| `/hospitality/` | Hotels, serviced apartments and developers |
| `/journal/`, `/journal/<slug>/` | Long-form articles |
| `/about/`, `/faq/`, `/contact/`, `/consultation/`, `/cart/` | The house, answers, enquiries, cart and quotes |

Copy lives in `src/data/content.ts` (process, guides, FAQs, articles) and `src/data/catalog.ts` (products).
The design tokens (paper, forest and gold) are at the top of `src/app/globals.css`; layouts and the scroll
animations (`data-reveal`, `data-parallax`) are in `src/app/site.css` and `src/components/site/Reveal.tsx`.

## The villa

**Floor plan → a room → a window → a collection → customise → add to cart / request a quote**

| Room | Signature collection |
| --- | --- |
| Grand Living Room | Velvet |
| Master Bedroom | Blackout + Goose Feather Pillows |
| Dining Room | Embroidered |
| Coastal Guest Bedroom | Linen |
| Home Theatre | Premium blackout (Nuit Absolue) |
| Nursery | Soft blackout (Doux Sommeil) |
| Study | Library velvet |
| Boutique Hotel Suite | Velvet + layered goose feather pillows |

- **Real light.** Each room's light is baked in Blender with Cycles for Day, Sunset and Night: bounced light, soft shadows, sunlight through the windows and lamps at night. The view out of the windows is a rendered garden panorama.
- **Standing in the room.** The camera is at eye level: drag to look around, pinch or scroll to zoom gently. A floor plan takes you to any room.
- **Curtains.** Each panel is a live cloth mesh: opening compresses the folds with a lagging hem; pleat heading (French pinch, wave, eyelet, pencil, goblet), length (sill, below sill, floor, puddle) and lining all change the drape. Drawing the curtains changes the light in the room: the sun patches on the floor are masked by each panel, and daylight through the cloth follows its real transmission (sheer ≈ 78 %, linen ≈ 42 %, velvet ≈ 10 %, blackout ≈ 0 %), tinted by its colour.
- **Compare.** Renders the same window with velvet, blackout, linen and embroidered curtains drawn, side by side.
- **Goose Feather Pillows.** In the bedrooms, choose size, fill, support and cover, then add pillows to the bed. They settle into a hotel-style arrangement: Euro squares at the back, sleeping pillows, then a boudoir cushion in front.
- **Save, cart, quote.** Looks are saved with a snapshot. The cart and saved looks persist in the browser. Quote and consultation requests open the visitor's email app, addressed to `sales@gdhomefabric.in` with the full selection.

### Devices, performance and accessibility

`src/lib/device.ts` picks a tier on load. The URL override `?mode=high|lite|gallery` forces a tier.

- **high** (desktop): a higher pixel ratio, fabric sheen, bloom, film grain and SMAA.
- **lite** (phones, tablets and modest hardware): no post-processing and a lower pixel ratio. Panels become bottom sheets.
- **gallery** (no WebGL2, data-saver, or on request): the rendered room photographs, the same customiser, and a 2D curtain study.

Only the room you are in is loaded (about 2–3 MB); the next room preloads while you look around. The canvas renders on demand, so it draws nothing while idle. A frame-time watchdog lowers the resolution and then offers the lighter mode. Losing the WebGL context falls back to the gallery.

Every 3D action has a DOM equivalent: the floor plan, room and window buttons, and radio-group options. Keyboard shortcuts: `←/→` switch rooms, `1–8` jump to a room, `P` opens the floor plan, `Esc` goes back, `O` opens or closes the curtains, `C` shows the close-up, `L` cycles the lighting, and `?` opens help. State changes are announced through a live region. The site honours `prefers-reduced-motion`.

## Project layout

```
src/app/                 pages (static export) and the stylesheets
src/data/villa.ts        villa layout: rooms, windows, beds, lamps, camera views (shared with the Blender scripts)
src/data/catalog.ts      collections, products, colours, pleats, lengths, linings, pillows, prices (CURRENCY here)
src/data/content.ts      guides, FAQs, journal articles
src/store/               zustand stores — experience state, and the persisted cart + saved looks
src/components/site/     header, footer, page blocks, scroll animations
src/components/villa/    VillaExperience (tiering, UI), VillaCanvas (R3F), scene/*, ui/*, StaticVilla (gallery)
src/components/shop/     collections browser + studio, pillows, cart & quote, consultation
scripts/blender/         the rooms in Blender: materials, furniture, lighting, bakes, photographs
public/rooms/<room>/     room.glb, lightmaps, light probes and garden panoramas per preset (generated)
public/textures/         room materials (KTX2 / WebP) and curtain fabrics (generated)
public/renders/          the photographs used across the site and the OG image (generated)
```

## Commands

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # static export to out/
npm run typecheck
```

### Asset pipeline

Everything is generated from code: the villa is edited in `src/data/villa.ts` and `scripts/blender/`. The Blender
steps use Blender as a Python module (`pip install bpy==4.5.*`, Python 3.11) and render on the CPU.

```bash
npm run assets:textures          # curtain fabrics (KTX2 + WebP close-ups) and artwork
npm run assets:layout            # villa.ts → scripts/blender/layout.json, materials → src/data/roomMaterials.json
python3 scripts/blender/tex.py   # tileable material textures for the rooms
npm run assets:bake -- living    # build, light and bake one room (≈ 17 min on 4 cores)
npm run assets:rooms             # pack room GLBs (meshopt) and textures (KTX2 / WebP) into public/
npm run assets:renders           # path-traced photographs → public/renders/*.webp and og.jpg
```

A bake writes `public/rooms/<room>/`: lightmaps for ambient and sun light per preset, vertex-baked light for the
furniture, HDR light probes for reflections, and the garden panoramas. The curtains and pillows stay live in the
browser and are lit by the room's probe and window lights. The Basis transcoder is copied from three.js into
`public/basis/` at build time, so no third-party CDN is involved.

## Deployment (GitHub Pages)

`.github/workflows/deploy.yml` type-checks and builds every push and pull request. On `main` it publishes `out/` to GitHub Pages.

The root `CNAME` file sets the custom domain while Pages publishes from a branch; do not delete it, or the site drops off gdhomefabric.in. The workflow waits for GitHub's own branch build to finish, then deploys the villa over it.

**Recommended:** in the repository settings, go to **Pages**, set **Source** to **GitHub Actions**, and check that **Custom domain** reads `gdhomefabric.in` with **Enforce HTTPS** ticked. The branch build then stops running.

## Editing content

- **Prices:** `pricePerSqft` per product and `CURRENCY` in `src/data/catalog.ts`. Prices are made-to-measure estimates for a pair.
- **Colours / new products:** add them to `PRODUCTS` in `src/data/catalog.ts`. A new product that reuses one of the five fabric looks needs no new textures.
- **Room recommendations:** `ROOM_DEFAULTS` and `DEFAULT_PILLOWS` in `src/data/catalog.ts`.
- **Enquiries:** the site is static, so forms compose an email. To receive submissions directly, point `src/components/shop/mailto.ts` at a form service.
