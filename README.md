# Dope Designs

A print-on-demand storefront for wearable generative art — tees, hoodies, jackets and
hats carrying shader-built artwork, printed to order in Tāmaki Makaurau by
[Print Poppa](https://www.printpoppa.co.nz/) and shipped direct to the customer.

The artwork comes from **The Awakening Process**, the generative art project whose
Liquid Chrome shader also drives this site's hero. Dope Designs is the shop; The
Awakening Process is the house artist on the roster. Change either name in
`assets/js/config.js` (`brand.name`) and `data/artists.json`.

Static site. No build step, no framework, no npm install to run it. Open a server on the
folder and it works.

---

## Run it locally

Browsers block `fetch` on `file://` URLs, and the catalogue is loaded with `fetch`, so
opening `index.html` by double-clicking will show an error. Use any static server:

```bash
npx http-server . -p 8080     # or: python3 -m http.server 8080
```

Then visit <http://127.0.0.1:8080>.

## Deploy it

Anything that serves static files: GitHub Pages, Netlify, Cloudflare Pages, Vercel.
Push the repo, point the host at the root directory, done. The only server-side piece is
the Stripe endpoint (see *Taking payments* below), and the site runs without it.

---

## What is where

```
index.html            Home — Liquid Chrome hero, featured drop, garment range
shop.html             Filterable catalogue (by garment, by collection)
product.html          Configurator: garment / colour / size, live mockup
artists.html          Artist profiles and their pieces
about.html            Story, shipping, returns, sizing
cart.html             Cart and totals
checkout.html         Delivery details, payment handoff, order confirmation
art/liquid-chrome.html   The original interactive art piece, untouched

assets/css/site.css   The whole design system
assets/js/
  config.js           ← the only file you need to edit to go live
  store.js            Catalogue loading, cart, money, shared header/footer
  garments.js         Photo mockups — artwork composited onto real product shots
  checkout.js         Order record + payment adapter
  liquid-chrome-*.js  The hero background (shader extracted from the art piece)
  page-*.js           One file per page
data/
  catalog.json        Garments, colours, sizes, prices, shipping
  designs.json        Artwork records
  artists.json        Artist profiles
server/
  create-checkout-session.js   Stripe endpoint (reference implementation)
```

---

## ⚠️ Placeholders to replace before launch

Everything below is invented and needs real values. Nothing else in the codebase does.

| What | Where | Notes |
|---|---|---|
| **Retail prices** | `data/catalog.json` → `price` | NZD, **GST-inclusive**. Set from Print Poppa's print cost + margin; `wholesaleExGst` alongside is AS Colour's real trade price. |
| **Print Poppa codes** | `data/catalog.json` → `printPoppaCode` | Currently `AS<style>`. Must match however Print Poppa reference these blanks on an order. |
| **Stock availability** | `data/catalog.json` | Colours and sizes are AS Colour's real range — confirm Print Poppa carry the ones you list. |
| **Shipping rates** | `data/catalog.json` → `shipping` | Confirm with Print Poppa; the free-shipping threshold is `freeShippingThreshold`. |
| **Artwork** | `assets/designs/*.svg` | Generated stand-ins, built light-on-dark. Replace with real files (see below). |
| **Artist names and bios** | `data/artists.json` | Two of the three artists are placeholders. |
| **Contact email** | `assets/js/config.js` → `brand.email` | Also appears in `about.html` and `artists.html`. |

---

## Adding a design

1. Drop the artwork in `assets/designs/`.
   **300dpi PNG on a transparent background** is what DTG wants. Portrait 4:5 fits the
   print areas cleanly (e.g. 3600 × 4500px). SVG works too and stays sharp at any size.
2. Add a record to `data/designs.json`:

```json
{
  "id": "your-design",
  "title": "Your Design",
  "artistId": "house",
  "collection": "Liquid Chrome",
  "year": 2026,
  "art": "assets/designs/your-design.png",
  "blurb": "One or two lines, shown on the card and product page.",
  "story": "Longer text, shown under 'About this piece'.",
  "garments": ["tee", "hoodie"],
  "placement": "Front centre",
  "featured": true,
  "accent": "#8fe8ff"
}
```

`garments` controls which garments it can be bought on. `featured: true` puts it on the
home page. That is the whole process — no rebuild, no deploy step beyond pushing the files.

Adding an artist works the same way in `data/artists.json`; `artistId` on a design points
at it.

---

## Taking payments

Out of the box the site runs in **preview mode**: the cart and checkout work end to end
and produce a real fulfilment record, but no money moves and the confirmation screen says
so. That is deliberate — it lets the store be demoed before Stripe exists.

To take real payments:

1. Deploy `server/create-checkout-session.js` (Netlify Functions, Vercel, Workers and
   Express are all supported by the exports at the bottom of that file).
2. Set `STRIPE_SECRET_KEY` and `SITE_URL` in that function's environment.
3. Put the deployed URL in `assets/js/config.js`:

```js
payments: {
  checkoutEndpoint: 'https://your-site.netlify.app/.netlify/functions/create-checkout-session',
  publishableKey: 'pk_live_…'
}
```

Preview mode switches itself off as soon as `checkoutEndpoint` is set.

**The endpoint re-derives every price from `data/catalog.json` and ignores the amounts the
browser sends.** Do not "simplify" that away — without it, anyone can edit the request in
devtools and buy a jacket for a dollar.

Prices are stored GST-inclusive, so GST is backed *out* of the total for display rather
than added on top. If the business is not GST registered, set `gstRate` to `0` in
`data/catalog.json`.

---

## Getting orders to Print Poppa

Print Poppa had no public API or storefront integration when this was built, so the site
packages each order into a **fulfilment record** — everything needed to print and post
without a follow-up phone call: garment code, colour, size, quantity, placement, print
method, a resolvable link to the artwork file, and the delivery address.

Configure where it goes in `assets/js/config.js`:

```js
fulfilment: {
  mode: 'forward',
  orderEndpoint: 'https://formspree.io/f/xxxx',   // or a Worker, Zapier hook, Sheets webhook
  notifyEmail: 'orders@example.co.nz'
}
```

The record is POSTed as JSON with both a structured `order` object and a plain-text
`summary` suitable for pasting into an email or printing as a docket.

With no `orderEndpoint` set, the confirmation screen says the order has **not** been sent
and offers the record as a download — so an order can never silently vanish.

If Print Poppa later provide a direct feed, set `mode: 'api'` and point `orderEndpoint` at
a server route that talks to it. Nothing else in the site changes.

---

## The Liquid Chrome background

`art/liquid-chrome.html` is the original interactive piece and is left exactly as it was.

The site hero runs the *same* fragment shader, extracted verbatim into
`assets/js/liquid-chrome-shader.js` and driven by `assets/js/liquid-chrome-bg.js` in raw
WebGL — no three.js, so the centrepiece visual does not depend on a CDN staying up. It
animates itself with slow drift and periodic swells, leans towards the pointer, pauses
when scrolled out of view or the tab is hidden, and falls back to a CSS gradient when
WebGL is unavailable or the visitor prefers reduced motion.

Two presets, chosen with the `data-liquid-chrome` attribute: `hero` and `quiet`.

One gotcha worth knowing: the art piece ships `uEffBlend` at `0` because its GUI expects
you to raise it. At `0` the surface is fully transparent and the canvas renders black — so
the background module sets it explicitly per preset.

If the shader is ever changed in the art piece, regenerate the extracted copy rather than
hand-editing it:

```bash
{ printf '/* Shaders extracted verbatim from art/liquid-chrome.html — the source artwork.\n   Do not hand-edit: regenerate from the art piece if the shader changes. */\n(function(global){\n'
  sed -n '72,401p' art/liquid-chrome.html
  printf '\n  global.LIQUID_CHROME_SHADER = { VERT: VERT, FRAG: FRAG };\n})(window);\n'
} > assets/js/liquid-chrome-shader.js
```

---

## Garment mockups

Every mockup is a **photograph of the actual AS Colour blank** with the artwork
composited onto it. Nothing is illustrated.

The garments, colourways, hex codes, sizes and photography all come from AS Colour's
public product feed (`ascolour.co.nz/assets`), which publishes `Products`,
`ProductVariants` and `ProductImage` CSVs for the whole catalogue:

| Site garment | AS Colour style | Colours | Sizes |
|---|---|---|---|
| T-Shirts | 5080 Heavy Tee | 6 | S–5XL |
| Hoodies | 5146 Heavy Hood | 5 | XS–3XL |
| Jackets | 5520 Coach Jacket (back view) | 3 | XS–3XL |
| Hats | 1100 Stock Cap | 4 | One size |

`wholesaleExGst` on each garment is AS Colour's listed trade price. The retail `price`
is still a placeholder — set it from Print Poppa's print cost plus your margin.

### How the compositing works

A flat paste of artwork onto a photo always reads as fake, because real ink takes the
fabric's light. `assets/js/garments.js` does three passes:

1. **Displacement** — the artwork is warped by the garment's own brightness gradient, so
   it bends over folds and seams instead of lying flat.
2. **Shading** — the garment's light and shadow inside the print area is multiplied onto
   the artwork, so a shadowed chest darkens the print by the same amount it darkens the
   cloth.
3. **Fabric masking** — anything falling outside the garment silhouette is cut away, so a
   wide print never bleeds onto the studio background.

Compositing happens in a canvas at load time and is cached per garment+colour+design, so
re-filtering the shop grid costs nothing. Mockups paint themselves via a MutationObserver
once they enter the DOM — no call site has to trigger them.

### Adding a garment or colourway

Photos live in `assets/garments/`, named `<garment>-<colour>.jpg`. Add the file, then add
the colour to `data/catalog.json` with its `name`, `hex`, `tone` and `image`.

`tone` matters: it drives the print-area guide colour and is used to merchandise the shop
grid, which prefers dark colourways because this range is light-on-dark artwork.

Print position comes from the garment's `photo.printArea`, expressed as fractions of the
image (`0`–`1`) so it is resolution-independent. One measurement covers every colour of a
style shot on the same template — which AS Colour's photography is.

### ⚠️ Before launch: confirm image rights

The product photography is **AS Colour's copyright**. They publish it openly for the
people who buy and decorate their blanks, and a product feed with image URLs is plainly
meant for building storefronts — but that is an inference, not a written licence. Their
brand guidelines cover logo use and do not address product imagery.

Confirm with Print Poppa (or AS Colour directly) that you may use it on this store before
you make the site public. If the answer is no, the fix is small: replace the files in
`assets/garments/` with your own photography of the same garments, shot front-on with
consistent framing, and retune `printArea`.

## Known gaps

Worth knowing before this goes in front of customers:

- **Products render client-side**, so search engines see an empty shop page. Fine for a
  launch driven by social and word of mouth; if SEO matters, pre-render the product pages
  or move to a platform that does it.
- **No order database.** The fulfilment record is fire-and-forget. If the endpoint is down
  when an order is placed, the confirmation screen says so, but there is no retry queue.
- **No email to the customer.** Stripe sends its own receipt; a branded "your order is
  printing" email would need adding.
- **Artist royalties are recorded, not paid.** `royalty` in `data/artists.json` rides along
  on the order record for reconciliation; actual payouts are manual.
