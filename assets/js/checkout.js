/* Checkout: turns a cart plus a customer into (a) a payment and (b) a
 * fulfilment record Print Poppa can print from.
 *
 * The two are deliberately separate. Payment is Stripe's problem; fulfilment is
 * Print Poppa's. Swapping either one out does not touch the other. */
(function (global) {
  'use strict';

  var CFG = global.SITE_CONFIG;
  var Store = global.Store;

  function orderRef() {
    var d = new Date();
    var stamp = String(d.getFullYear()).slice(2) +
      String(d.getMonth() + 1).padStart(2, '0') +
      String(d.getDate()).padStart(2, '0');
    var rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    return 'TAP-' + stamp + '-' + rand;
  }

  /**
   * Build the fulfilment record. Everything Print Poppa needs to print and post
   * the order without a follow-up phone call: garment code, colour, size, qty,
   * placement, and a resolvable link to the artwork file.
   */
  function buildOrder(data, customer, shippingId) {
    var items = Store.Cart.items();
    var sub = Store.Cart.subtotal();
    var ship = Store.Cart.shipping(data.catalog, shippingId);
    var total = sub + ship.price;
    var origin = location.origin + location.pathname.replace(/[^/]*$/, '');

    return {
      reference: orderRef(),
      placedAt: new Date().toISOString(),
      currency: data.catalog.currency,
      store: CFG.brand.name,
      fulfilmentPartner: CFG.fulfilment.partner,
      customer: {
        name: customer.name,
        email: customer.email,
        phone: customer.phone || '',
        address: {
          line1: customer.line1,
          line2: customer.line2 || '',
          suburb: customer.suburb || '',
          city: customer.city,
          postcode: customer.postcode,
          country: customer.country
        },
        notes: customer.notes || ''
      },
      shipping: {
        method: ship.option ? ship.option.label : '',
        eta: ship.option ? ship.option.eta : '',
        price: ship.price,
        freeShippingApplied: !!ship.free
      },
      items: items.map(function (i) {
        var design = data.design(i.designId);
        var garment = data.garment(i.garmentId);
        return {
          quantity: i.qty,
          garment: garment ? garment.name : i.garmentId,
          garmentCode: garment ? garment.printPoppaCode : '',
          colour: i.colour,
          size: i.size,
          printMethod: garment ? garment.printMethod : '',
          design: design ? design.title : i.designId,
          artist: design ? design.artist.name : '',
          artwork: design ? origin + design.art.replace(/^\.\//, '') : '',
          placement: design ? design.placement : '',
          unitPrice: i.price,
          lineTotal: +(i.price * i.qty).toFixed(2)
        };
      }),
      totals: {
        subtotal: +sub.toFixed(2),
        shipping: +ship.price.toFixed(2),
        total: +total.toFixed(2),
        gstIncluded: +Store.gstComponent(total, data.catalog.gstRate).toFixed(2)
      }
    };
  }

  /** The same record as a plain-text run sheet, for email or a printed docket. */
  function orderToText(order) {
    var L = [];
    L.push('ORDER ' + order.reference);
    L.push(order.store + ' — print & fulfil via ' + order.fulfilmentPartner);
    L.push('Placed ' + new Date(order.placedAt).toLocaleString('en-NZ'));
    L.push('');
    L.push('SHIP TO');
    L.push('  ' + order.customer.name);
    L.push('  ' + order.customer.address.line1);
    if (order.customer.address.line2) L.push('  ' + order.customer.address.line2);
    if (order.customer.address.suburb) L.push('  ' + order.customer.address.suburb);
    L.push('  ' + order.customer.address.city + ' ' + order.customer.address.postcode);
    L.push('  ' + order.customer.address.country);
    L.push('  ' + order.customer.email + (order.customer.phone ? ' / ' + order.customer.phone : ''));
    L.push('  ' + order.shipping.method + ' (' + order.shipping.eta + ')');
    L.push('');
    L.push('PRINT');
    order.items.forEach(function (i, n) {
      L.push('  ' + (n + 1) + '. ' + i.quantity + ' x ' + i.garment + ' [' + i.garmentCode + ']');
      L.push('     Colour: ' + i.colour + '   Size: ' + i.size);
      L.push('     Design: ' + i.design + ' — ' + i.artist);
      L.push('     Placement: ' + i.placement + '   Method: ' + i.printMethod);
      L.push('     Artwork: ' + i.artwork);
    });
    L.push('');
    L.push('TOTALS (' + order.currency + ', GST inclusive)');
    L.push('  Subtotal  ' + order.totals.subtotal.toFixed(2));
    L.push('  Shipping  ' + order.totals.shipping.toFixed(2));
    L.push('  Total     ' + order.totals.total.toFixed(2));
    L.push('  of which GST ' + order.totals.gstIncluded.toFixed(2));
    if (order.customer.notes) { L.push(''); L.push('NOTES: ' + order.customer.notes); }
    return L.join('\n');
  }

  /** Send the record wherever fulfilment is configured to listen. */
  function submitOrder(order) {
    var endpoint = CFG.fulfilment.orderEndpoint;
    if (!endpoint) return Promise.resolve({ delivered: false, reason: 'no-endpoint' });
    return fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ order: order, summary: orderToText(order) })
    }).then(function (r) {
      if (!r.ok) throw new Error('Fulfilment endpoint returned ' + r.status);
      return { delivered: true };
    });
  }

  /**
   * Hand off to Stripe. The endpoint creates a Checkout Session server-side and
   * returns its URL; prices are re-derived from the catalogue there, never
   * trusted from this payload.
   */
  function startPayment(order) {
    var endpoint = CFG.payments.checkoutEndpoint;
    if (!endpoint) return Promise.resolve({ paid: false, preview: true });
    return fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reference: order.reference,
        email: order.customer.email,
        currency: order.currency,
        shipping: order.shipping,
        items: order.items.map(function (i) {
          return {
            designId: i.design, garmentCode: i.garmentCode,
            colour: i.colour, size: i.size, quantity: i.quantity
          };
        })
      })
    }).then(function (r) {
      if (!r.ok) throw new Error('Payment endpoint returned ' + r.status);
      return r.json();
    }).then(function (session) {
      if (!session.url) throw new Error('Payment endpoint returned no redirect URL');
      location.href = session.url;
      return { paid: true, redirected: true };
    });
  }

  function downloadOrder(order) {
    var blob = new Blob([orderToText(order)], { type: 'text/plain' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = order.reference + '.txt';
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  global.Checkout = {
    buildOrder: buildOrder,
    orderToText: orderToText,
    submitOrder: submitOrder,
    startPayment: startPayment,
    downloadOrder: downloadOrder
  };
})(window);
