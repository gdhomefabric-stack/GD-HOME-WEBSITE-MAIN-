# GD Home Fabric — The Villa

The website for [gdhomefabric.in](https://gdhomefabric.in): an interactive 3D villa showroom where visitors walk
from room to room, open and close the curtains, try every curtain collection in place, and dress the beds in
goose feather pillows. It is built with Next.js (static export), React Three Fiber and Three.js.

## The experience

**Villa overview → select a room → select a window → choose a collection → customise → add to cart / request a quote**

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

- **Dollhouse overview.** Facades facing the camera fold down so every room reads from above. Drag to turn, scroll or pinch to zoom, within gentle limits.
- **Controlled camera.** Every step (room, window, fabric close-up, bed) is a framed shot reached by a smooth transition, never free flight.
- **Curtains.** Each panel is a live cloth mesh: opening compresses the folds with a lagging hem; pleat heading (French pinch, wave, eyelet, pencil, goblet), length (sill, below sill, floor, puddle) and lining all change the drape and the light.
- **Light.** Day, Sunset and Night presets. Closing the curtains changes the light in the room: the daylight patch on the floor, the window light, the ambient level and the glow through the fabric all follow each fabric's real light transmission (sheer ≈ 78 %, linen ≈ 42 %, velvet ≈ 10 %, blackout ≈ 0 %), tinted by the fabric's colour.
- **Compare.** Renders the same window with velvet, blackout, linen and embroidered curtains drawn, side by side.
- **Goose Feather Pillows.** In the bedrooms, choose size, fill, support and cover, then add pillows to the bed. They settle into a hotel-style arrangement: Euro squares at the back, sleeping pillows, then a boudoir cushion in front.
- **Save, cart, quote.** Looks are saved with a snapshot. The cart and saved looks persist in the browser. Quote and consultation requests open the visitor's email app, addressed to `sales@gdhomefabric.in` with the full selection.
- **Custom Print Pillow Studio** (`/custom-pillows/`). Customers design their own printed pillow in four steps (shape & size → design → fabric & finish → review & order):
  - 11 shapes: square, lumbar, round, heart, star, cloud, hexagon, crescent moon, arch, flower, and any letter or number, in several sizes, priced live.
  - Designs are built from templates (photo pillow, pet portrait, monogram, family name, wedding, quote, kid's name, festive), an **AI image generator** (patterns or artwork, in 13 styles including Indian block print and Madhubani, 4 variations at a time), 17 built-in pattern generators with editable palettes (these work offline and print crisp at any size), uploaded photos, and text (9 fonts, curved text, outlines, shadows).
  - Drag, resize and rotate anything on the preview; undo and redo; the front and back can be designed separately. Warns about low-resolution photos.
  - Previews: the sewn and filled pillow (satin sheen, velvet, linen and canvas textures; piping, flange, pom-poms or tassels), the flat print file with cutting line and safe area, and the pillow to scale on a sofa.
  - Exports a print-ready PNG with bleed (150 dpi) and a one-page proof sheet. Designs are kept in the browser's IndexedDB; cart lines can reopen or download their design.
- **Skip 3D.** "Skip 3D · Browse collections" is always visible, and the collections page is a normal catalogue with a 2D fabric studio.

### Devices, performance and accessibility

`src/lib/device.ts` picks a tier on load. The URL override `?mode=high|lite|gallery` forces a tier.

- **high** (desktop): shadows, window area lights, N8AO ambient occlusion, bloom, SMAA.
- **lite** (phones, tablets and modest hardware): no shadows or post-processing, and a lower pixel ratio. Panels become bottom sheets and rooms become swipeable cards.
- **gallery** (no WebGL2, data-saver, or on request): rendered room images, the same customiser, and a 2D curtain study.

The canvas renders on demand, so it draws nothing while idle. A frame-time watchdog lowers the resolution and then offers the lighter mode. Losing the WebGL context falls back to the gallery.

Every 3D action has a DOM equivalent: the floor plan, room and window buttons, and radio-group options. Keyboard shortcuts: `←/→` switch rooms, `1–8` jump to a room, `Esc` goes back, `O` opens or closes the curtains, `C` shows the close-up, `L` cycles the lighting, and `?` opens help. State changes are announced through a live region. The site honours `prefers-reduced-motion` and passes axe-core WCAG 2.1 AA checks on every page.

## Project layout

```
src/data/villa.ts        villa layout: rooms, windows, beds, lamps, camera views (shared with the asset scripts)
src/data/catalog.ts      collections, products, colours, pleats, lengths, linings, pillows, prices (CURRENCY here)
src/data/lighting.ts     Day / Sunset / Night presets
src/store/               zustand stores — experience state, and the persisted cart + saved looks
src/components/villa/    VillaExperience (tiering, UI), VillaCanvas (R3F), scene/*, ui/*, StaticVilla (gallery)
src/components/shop/     collections browser + studio, cart & quote, consultation
src/components/print/    the Custom Print Pillow Studio (stage, steps, AI tab)
src/data/printPillows.ts print pillow shapes, sizes, fabrics, finishes and prices
src/lib/print/           print studio engine: shapes, patterns, renderer & print export, AI client, storage
scripts/                 asset pipeline (below)
public/models/villa.glb  the villa (generated)
public/textures/fabric/  curtain fabrics as KTX2 + close-up WebPs (generated)
public/renders/          static room renders for the gallery, room cards, poster and OG image (generated)
```

## Commands

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # static export to out/
npm run typecheck
```

### Asset pipeline

The 3D assets are generated from code, so the villa can be edited in `src/data/villa.ts` and `scripts/build-villa.ts`:

```bash
npm run assets:textures   # procedural, tileable fabrics & materials → KTX2 (Basis Universal) + WebP close-ups
npm run assets:villa      # architecture + furniture → villa.glb (meshopt-compressed, quantised, KTX2 textures)
npm run assets:renders -- http://localhost:3000   # re-render public/renders/* from a running site
```

`villa.glb` is about 2 MB, and all fabric textures together are about 1.7 MB. They are GPU-compressed, so they stay small in video memory too. The Basis transcoder is copied from three.js into `public/basis/` at build time, so no third-party CDN is involved.

## Deployment (GitHub Pages)

`.github/workflows/deploy.yml` type-checks and builds every push and pull request. On `main` it publishes `out/` to GitHub Pages; `public/CNAME` keeps the custom domain.

**One-time setup:** in the repository settings, go to **Pages** and set **Source** to **GitHub Actions**.

## Editing content

- **Prices:** `pricePerSqft` per product and `CURRENCY` in `src/data/catalog.ts`. Prices are made-to-measure estimates for a pair.
- **Colours / new products:** add them to `PRODUCTS` in `src/data/catalog.ts`. A new product that reuses one of the five fabric looks needs no new textures.
- **Room recommendations:** `ROOM_DEFAULTS` and `DEFAULT_PILLOWS` in `src/data/catalog.ts`.
- **Print pillows:** shapes, sizes, fabrics, trims and prices are in `src/data/printPillows.ts`; templates in `src/lib/print/templates.ts`; AI styles and idea prompts in `src/lib/print/ai.ts`.
- **AI image service:** the site is static, so the generator calls [Pollinations](https://pollinations.ai) straight from the browser (free, no key). To use another service, set `NEXT_PUBLIC_AI_IMAGE_URL` at build time to a URL template with `{prompt}`, `{width}`, `{height}`, `{seed}` (and optionally `{key}`, filled from `NEXT_PUBLIC_AI_IMAGE_KEY` — use only a publishable key, since it ships to the browser). The built-in pattern generator always works, even if the AI service is down.
- **Enquiries:** the site is static, so forms compose an email. To receive submissions directly, point `src/components/shop/mailto.ts` at a form service.
