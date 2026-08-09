/* Stripe Checkout Session endpoint — reference implementation.
 *
 * The storefront is a static site, so this is the one piece that needs a server.
 * It is written as a plain handler so it can be dropped into Netlify Functions,
 * Vercel, Cloudflare Workers or an Express route with a few lines of glue (see
 * the bottom of this file).
 *
 * The rule this file exists to enforce: PRICES COME FROM THE CATALOGUE, NEVER
 * FROM THE REQUEST. The browser sends what was ordered — garment code, colour,
 * size, quantity — and the amount is looked up here. Otherwise anyone can edit
 * the payload and buy a hoodie for a dollar.
 *
 * Setup
 *   1. npm install stripe
 *   2. Set STRIPE_SECRET_KEY and SITE_URL in the environment.
 *   3. Deploy, then put the deployed URL in assets/js/config.js as
 *      payments.checkoutEndpoint.
 */

'use strict';

const Stripe = require('stripe');
const catalog = require('../data/catalog.json');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const SITE_URL = process.env.SITE_URL || 'https://example.co.nz';

/* Garment code -> garment, so a request can only ever name something real. */
const byCode = new Map(catalog.garments.map((g) => [g.printPoppaCode, g]));

function centsOf(nzd) {
  return Math.round(nzd * 100);
}

function resolveLineItems(items) {
  if (!Array.isArray(items) || !items.length) {
    throw new Error('No items in the order');
  }

  return items.map((item) => {
    const garment = byCode.get(item.garmentCode);
    if (!garment) throw new Error(`Unknown garment code: ${item.garmentCode}`);

    if (!garment.sizes.includes(item.size)) {
      throw new Error(`Unknown size for ${garment.name}: ${item.size}`);
    }
    if (!garment.colours.some((c) => c.name === item.colour)) {
      throw new Error(`Unknown colour for ${garment.name}: ${item.colour}`);
    }

    const quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      throw new Error('Invalid quantity');
    }

    return {
      quantity,
      price_data: {
        currency: catalog.currency.toLowerCase(),
        unit_amount: centsOf(garment.price),          // authoritative price
        product_data: {
          name: `${item.designId} — ${garment.name}`,
          description: `${item.colour} · Size ${item.size}`
        }
      }
    };
  });
}

/* Shipping is recalculated too, including the free-shipping threshold. */
function resolveShipping(lineItems, shippingId) {
  const option = catalog.shipping.find((s) => s.id === shippingId) || catalog.shipping[0];
  const subtotal = lineItems.reduce(
    (sum, li) => sum + li.price_data.unit_amount * li.quantity, 0
  );
  const free = subtotal >= centsOf(catalog.freeShippingThreshold) && option.regions.includes('NZ');

  return {
    shipping_rate_data: {
      type: 'fixed_amount',
      display_name: option.label,
      fixed_amount: { amount: free ? 0 : centsOf(option.price), currency: catalog.currency.toLowerCase() },
      delivery_estimate: undefined
    }
  };
}

async function createSession(body) {
  const lineItems = resolveLineItems(body.items);
  const shipping = resolveShipping(lineItems, body.shipping && body.shipping.id);

  return stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: lineItems,
    customer_email: body.email,
    client_reference_id: body.reference,
    /* Stripe collects the delivery address itself so it matches what was paid for. */
    shipping_address_collection: { allowed_countries: ['NZ', 'AU'] },
    shipping_options: [shipping],
    /* Prices in the catalogue are GST-inclusive, so tax is not added on top. */
    metadata: {
      reference: body.reference,
      fulfilmentPartner: 'Print Poppa'
    },
    success_url: `${SITE_URL}/checkout.html?paid=1&ref=${encodeURIComponent(body.reference)}`,
    cancel_url: `${SITE_URL}/cart.html`
  });
}

/* --- Netlify Functions / AWS Lambda ------------------------------------- */
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }
  try {
    const session = await createSession(JSON.parse(event.body));
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: session.url })
    };
  } catch (err) {
    console.error('Checkout session failed', err);
    return { statusCode: 400, body: JSON.stringify({ error: err.message }) };
  }
};

/* --- Vercel / Express ---------------------------------------------------- */
exports.default = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const session = await createSession(req.body);
    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Checkout session failed', err);
    res.status(400).json({ error: err.message });
  }
};

exports.createSession = createSession;
