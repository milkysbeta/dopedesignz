# The Awakening Process

A print-on-demand storefront for wearable generative art — tees, hoodies, jackets and
hats carrying shader-built artwork, printed to order in Tāmaki Makaurau by
[Print Poppa](https://www.printpoppa.co.nz/) and shipped direct to the customer.

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
  garments.js         Vector garment mockups that recolour live
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
| **Garment prices** | `data/catalog.json` | All NZD, **GST-inclusive**. Currently guesses. |
| **Garment codes** | `data/catalog.json` → `printPoppaCode` | Must match Print Poppa's actual SKUs — these go on the print docket. |
| **Colours and sizes** | `data/catalog.json` | Should mirror what Print Poppa actually stocks. |
| **Shipping rates** | `data/catalog.json` → `shipping` | Confirm with Print Poppa; the free-shipping threshold is `freeShippingThreshold`. |
| **Artwork** | `assets/designs/*.svg` | Generated stand-ins. Replace with real files (see below). |
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

`assets/js/garments.js` draws the tee, hoodie, jacket and cap as vectors and fills them
with the selected colour, so every colourway exists without a photo library. Each garment
declares a `print` rectangle that the artwork is fitted into.

The jacket is drawn from the **back**, because a coach jacket's snap placket splits the
front — the back panel is the print surface.

When real Print Poppa product photography is available, replacing `render()` is the only
change needed; every page calls through it.

---

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
