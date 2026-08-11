/* Cart page: line items, quantity edits, shipping estimate, totals. */
(function () {
  'use strict';

  var Store = window.Store;

  Store.load().then(function (data) {
    var root = document.querySelector('[data-cart-root]');
    var shippingId = data.catalog.shipping[0].id;

    function render() {
      var items = Store.Cart.items();

      if (!items.length) {
        root.innerHTML =
          '<div class="empty-state">' +
            '<p class="h2">Nothing in the bag yet.</p>' +
            '<p class="lede" style="margin:1.2rem auto 2rem">Every piece is printed after you order ' +
              'it, so the range is never sold out — only unmade.</p>' +
            '<a class="btn btn--solid" href="shop.html">Browse the range</a>' +
          '</div>';
        return;
      }

      var sub = Store.Cart.subtotal();
      var ship = Store.Cart.shipping(data.catalog, shippingId);
      var total = sub + ship.price;
      var toFree = data.catalog.freeShippingThreshold - sub;

      root.innerHTML =
        '<div class="cart-layout">' +
          '<div>' +
            items.map(function (i) {
              var key = Store.Cart.key(i);
              /* Look the colour up rather than trusting the stored hex, so a line
                 saved before a photo shoot still renders with the new imagery.
                 A colour retired since it was added falls back to the hex. */
              var g = data.garment(i.garmentId);
              var colour = (g && g.colours.filter(function (c) {
                return c.name === i.colour;
              })[0]) || { hex: i.colourHex };

              return '<div class="line-item" data-key="' + Store.escapeHtml(key) + '">' +
                  '<div class="line-item__media">' +
                    window.GarmentMockup.render(i.garmentId, colour, Store.base + i.artHref,
                      { area: Store.printArea(g, data.design(i.designId)) }) +
                  '</div>' +
                  '<div>' +
                    '<p class="line-item__title">' + Store.escapeHtml(i.designTitle) + '</p>' +
                    '<p class="line-item__opts">' +
                      Store.escapeHtml(i.garmentName) + '<br>' +
                      Store.escapeHtml(i.colour) + ' &middot; Size ' + Store.escapeHtml(i.size) +
                    '</p>' +
                    '<div style="display:flex;align-items:center;gap:1rem;margin-top:.7rem">' +
                      '<div class="qty">' +
                        '<button type="button" data-step="-1" aria-label="Decrease quantity">&minus;</button>' +
                        '<output>' + i.qty + '</output>' +
                        '<button type="button" data-step="1" aria-label="Increase quantity">+</button>' +
                      '</div>' +
                      '<button class="line-item__remove" type="button" data-remove>Remove</button>' +
                    '</div>' +
                  '</div>' +
                  '<div class="line-item__price card__price">' + Store.money(i.price * i.qty) + '</div>' +
                '</div>';
            }).join('') +
          '</div>' +

          '<aside class="summary">' +
            '<h2 class="h3" style="margin-bottom:1rem">Summary</h2>' +
            '<div class="field" style="margin-bottom:1.2rem">' +
              '<label for="ship">Shipping to</label>' +
              '<select id="ship" data-shipping>' +
                data.catalog.shipping.map(function (s) {
                  return '<option value="' + s.id + '"' + (s.id === shippingId ? ' selected' : '') + '>' +
                    Store.escapeHtml(s.label) + ' — ' + Store.money(s.price) + '</option>';
                }).join('') +
              '</select>' +
            '</div>' +
            '<div class="summary__row"><span>Subtotal</span><span>' + Store.money(sub) + '</span></div>' +
            '<div class="summary__row"><span>Shipping</span><span>' +
              (ship.free ? 'Free' : Store.money(ship.price)) + '</span></div>' +
            '<div class="summary__row summary__row--total"><span>Total</span><span>' +
              Store.money(total) + '</span></div>' +
            '<p class="meta" style="margin:.4rem 0 1.4rem">Includes ' +
              Store.money(Store.gstComponent(total, data.catalog.gstRate)) + ' GST &middot; ' +
              Store.escapeHtml(ship.option.eta) + '</p>' +
            (toFree > 0
              ? '<p class="notice" style="margin-bottom:1.2rem">' + Store.money(toFree) +
                ' from free New Zealand shipping.</p>'
              : '') +
            '<a class="btn btn--solid btn--block" href="checkout.html">Checkout</a>' +
            '<p class="meta" style="text-align:center;margin-top:1rem">Printed to order by Print Poppa</p>' +
          '</aside>' +
        '</div>';

      root.querySelector('[data-shipping]').addEventListener('change', function (e) {
        shippingId = e.target.value;
        render();
      });
    }

    /* Delegated so the handlers survive every re-render. */
    root.addEventListener('click', function (e) {
      var row = e.target.closest('[data-key]');
      if (!row) return;
      var key = row.getAttribute('data-key');

      if (e.target.closest('[data-remove]')) {
        Store.Cart.remove(key);
        render();
        return;
      }
      var step = e.target.closest('[data-step]');
      if (step) {
        var item = Store.Cart.items().filter(function (i) { return Store.Cart.key(i) === key; })[0];
        if (item) {
          Store.Cart.setQty(key, item.qty + Number(step.getAttribute('data-step')));
          render();
        }
      }
    });

    render();
  });
})();
