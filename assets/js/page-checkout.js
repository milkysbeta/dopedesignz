/* Checkout page: collect the delivery details, hand payment to Stripe, and send
 * the fulfilment record to Print Poppa.
 *
 * With no payment endpoint configured the page runs in preview mode — the whole
 * flow works and produces a real fulfilment record, but says plainly that no
 * money moved. That is what lets the site be demoed before Stripe is live. */
(function () {
  'use strict';

  var Store = window.Store;
  var CFG = window.SITE_CONFIG;

  var FIELDS = [
    { id: 'name',     label: 'Full name',        required: true,  auto: 'name',            width: 'full' },
    { id: 'email',    label: 'Email',            required: true,  auto: 'email', type: 'email' },
    { id: 'phone',    label: 'Phone (optional)', required: false, auto: 'tel',   type: 'tel' },
    { id: 'line1',    label: 'Street address',   required: true,  auto: 'address-line1',   width: 'full' },
    { id: 'line2',    label: 'Apartment, unit (optional)', required: false, auto: 'address-line2', width: 'full' },
    { id: 'suburb',   label: 'Suburb',           required: false, auto: 'address-level3' },
    { id: 'city',     label: 'City',             required: true,  auto: 'address-level2' },
    { id: 'postcode', label: 'Postcode',         required: true,  auto: 'postal-code' }
  ];

  Store.load().then(function (data) {
    var root = document.querySelector('[data-checkout-root]');
    var shippingId = data.catalog.shipping[0].id;

    if (!Store.Cart.items().length) {
      root.innerHTML =
        '<div class="empty-state"><p class="h2">Your cart is empty.</p>' +
        '<p style="margin-top:1.5rem"><a class="btn btn--solid" href="shop.html">Browse the range</a></p></div>';
      return;
    }

    function summaryMarkup() {
      var items = Store.Cart.items();
      var sub = Store.Cart.subtotal();
      var ship = Store.Cart.shipping(data.catalog, shippingId);
      var total = sub + ship.price;

      return '<aside class="summary">' +
          '<h2 class="h3" style="margin-bottom:1.2rem">Order</h2>' +
          items.map(function (i) {
            return '<div class="summary__row"><span>' + i.qty + ' &times; ' +
              Store.escapeHtml(i.designTitle) + '<br><span style="opacity:.6">' +
              Store.escapeHtml(i.garmentName) + ' &middot; ' + Store.escapeHtml(i.colour) +
              ' &middot; ' + Store.escapeHtml(i.size) + '</span></span><span>' +
              Store.money(i.price * i.qty) + '</span></div>';
          }).join('') +
          '<div class="summary__row" style="border-top:1px solid var(--line);margin-top:.8rem;padding-top:1rem">' +
            '<span>Subtotal</span><span>' + Store.money(sub) + '</span></div>' +
          '<div class="summary__row"><span>Shipping</span><span>' +
            (ship.free ? 'Free' : Store.money(ship.price)) + '</span></div>' +
          '<div class="summary__row summary__row--total"><span>Total</span><span>' +
            Store.money(total) + '</span></div>' +
          '<p class="meta" style="margin-top:.4rem">Includes ' +
            Store.money(Store.gstComponent(total, data.catalog.gstRate)) + ' GST</p>' +
        '</aside>';
    }

    function render() {
      root.innerHTML =
        '<div class="section-head"><div>' +
          '<p class="eyebrow">Almost there</p><h1 class="h1">Checkout</h1>' +
        '</div><a class="link-arrow" href="cart.html">Back to cart</a></div>' +

        (CFG.previewMode
          ? '<div class="notice notice--warn" style="margin-bottom:2rem">' +
            '<strong>Preview mode.</strong> No payment provider is connected yet, so this checkout ' +
            'will not charge anything. It still produces a complete Print Poppa order record so the ' +
            'flow can be tested end to end.</div>'
          : '') +

        '<form class="cart-layout" data-form novalidate>' +
          '<div>' +
            '<h2 class="h3" style="margin-bottom:1.2rem">Delivery</h2>' +
            '<div class="field-row">' +
              FIELDS.map(function (f) {
                return '<div class="field" data-field="' + f.id + '"' +
                    (f.width === 'full' ? ' style="grid-column:1/-1"' : '') + '>' +
                    '<label for="f-' + f.id + '">' + Store.escapeHtml(f.label) + '</label>' +
                    '<input id="f-' + f.id + '" name="' + f.id + '" type="' + (f.type || 'text') +
                      '" autocomplete="' + f.auto + '"' + (f.required ? ' required' : '') + '>' +
                    '<span class="field__error" hidden></span>' +
                  '</div>';
              }).join('') +
              '<div class="field"><label for="f-country">Country</label>' +
                '<select id="f-country" name="country" autocomplete="country-name">' +
                  '<option>New Zealand</option><option>Australia</option><option>Other</option>' +
                '</select></div>' +
              '<div class="field"><label for="f-shipping">Shipping</label>' +
                '<select id="f-shipping" name="shippingId">' +
                  data.catalog.shipping.map(function (s) {
                    return '<option value="' + s.id + '"' + (s.id === shippingId ? ' selected' : '') + '>' +
                      Store.escapeHtml(s.label) + ' — ' + Store.money(s.price) + ' (' +
                      Store.escapeHtml(s.eta) + ')</option>';
                  }).join('') +
                '</select></div>' +
              '<div class="field" style="grid-column:1/-1">' +
                '<label for="f-notes">Notes for the print studio (optional)</label>' +
                '<textarea id="f-notes" name="notes" rows="3" ' +
                  'placeholder="Anything Print Poppa should know about this order"></textarea>' +
              '</div>' +
            '</div>' +

            '<button class="btn btn--solid btn--block" type="submit" style="margin-top:1.5rem" data-submit>' +
              (CFG.previewMode ? 'Place test order' : 'Continue to payment') +
            '</button>' +
            '<p class="meta" style="margin-top:1rem">' +
              (CFG.previewMode
                ? 'Nothing will be charged.'
                : 'You will be taken to Stripe to pay. Card details never touch this site.') +
            '</p>' +
          '</div>' +
          summaryMarkup() +
        '</form>';

      var form = root.querySelector('[data-form]');

      form.querySelector('[name=shippingId]').addEventListener('change', function (e) {
        shippingId = e.target.value;
        var old = root.querySelector('.summary');
        old.outerHTML = summaryMarkup();
      });

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        submit(form);
      });
    }

    function validate(form) {
      var ok = true;
      FIELDS.forEach(function (f) {
        var wrap = form.querySelector('[data-field=' + f.id + ']');
        var input = form.querySelector('[name=' + f.id + ']');
        var err = wrap.querySelector('.field__error');
        var value = input.value.trim();
        var message = '';

        if (f.required && !value) message = 'Required';
        else if (f.type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          message = 'That email does not look right';
        }

        wrap.classList.toggle('field--error', !!message);
        err.textContent = message;
        err.hidden = !message;
        if (message) ok = false;
      });
      return ok;
    }

    function submit(form) {
      if (!validate(form)) {
        Store.toast('Check the highlighted fields');
        form.querySelector('.field--error input').focus();
        return;
      }

      var btn = form.querySelector('[data-submit]');
      btn.disabled = true;
      btn.textContent = 'Working…';

      var fd = new FormData(form);
      var customer = {};
      fd.forEach(function (v, k) { customer[k] = String(v).trim(); });

      var order = window.Checkout.buildOrder(data, customer, customer.shippingId || shippingId);

      /* Fulfilment is sent first: if the payment redirect happens, this page is
         gone, and Print Poppa still needs the record either way. */
      window.Checkout.submitOrder(order)
        .catch(function (err) {
          console.error('Fulfilment handoff failed', err);
          return { delivered: false, reason: 'error' };
        })
        .then(function (fulfilment) {
          return window.Checkout.startPayment(order).then(function (payment) {
            return { fulfilment: fulfilment, payment: payment };
          });
        })
        .then(function (result) {
          if (result.payment && result.payment.redirected) return;  // leaving the page
          showConfirmation(order, result.fulfilment);
        })
        .catch(function (err) {
          console.error(err);
          btn.disabled = false;
          btn.textContent = CFG.previewMode ? 'Place test order' : 'Continue to payment';
          Store.toast('Something went wrong — try again');

          var warning = document.createElement('div');
          warning.className = 'notice notice--warn';
          warning.setAttribute('style', 'grid-column:1/-1;margin-bottom:1.5rem');
          warning.innerHTML = '<strong>The order could not be sent.</strong> ' +
            Store.escapeHtml(err.message || 'Unknown error') + '. Nothing has been charged.';
          form.prepend(warning);
        });
    }

    function showConfirmation(order, fulfilment) {
      Store.Cart.clear();

      var delivered = fulfilment && fulfilment.delivered;
      root.innerHTML =
        '<div style="max-width:640px;margin-inline:auto;text-align:center;padding-block:clamp(2rem,7vw,5rem)">' +
          '<p class="eyebrow">Order ' + Store.escapeHtml(order.reference) + '</p>' +
          '<h1 class="h1" style="margin:.8rem 0 1.2rem">' +
            (CFG.previewMode ? 'Test order recorded' : 'Thank you') + '</h1>' +
          '<p class="lede" style="margin-inline:auto">' +
            (CFG.previewMode
              ? 'No payment was taken — this store is still in preview. The order record below is ' +
                'exactly what Print Poppa would receive for a real sale.'
              : 'Your order is with Print Poppa in Tāmaki Makaurau. You will get an email at ' +
                Store.escapeHtml(order.customer.email) + ' when it ships.') +
          '</p>' +

          '<div class="notice ' + (delivered ? 'notice--ok' : 'notice--warn') +
            '" style="text-align:left;margin:2rem 0">' +
            (delivered
              ? '<strong>Sent to fulfilment.</strong> The print record has been delivered to the ' +
                'configured endpoint.'
              : '<strong>Not yet sent to fulfilment.</strong> No order endpoint is configured, so ' +
                'this record has not gone anywhere automatically. Download it and forward it to ' +
                'Print Poppa, or set <code>fulfilment.orderEndpoint</code> in ' +
                '<code>assets/js/config.js</code>.') +
          '</div>' +

          '<details class="spec" style="text-align:left"><summary>View the print record</summary>' +
            '<div class="spec__body"><pre style="white-space:pre-wrap;font-family:var(--mono);' +
              'font-size:.72rem;line-height:1.8">' +
              Store.escapeHtml(window.Checkout.orderToText(order)) + '</pre></div></details>' +

          '<div style="display:flex;gap:.8rem;justify-content:center;flex-wrap:wrap;margin-top:2rem">' +
            '<button class="btn" type="button" data-download>Download record</button>' +
            '<a class="btn btn--ghost" href="shop.html">Back to the shop</a>' +
          '</div>' +
        '</div>';

      root.querySelector('[data-download]').addEventListener('click', function () {
        window.Checkout.downloadOrder(order);
      });
    }

    render();
  });
})();
