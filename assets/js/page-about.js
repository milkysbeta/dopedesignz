/* About page: shipping and fit tables are driven from the catalogue so they can
 * never drift out of step with what checkout actually charges. */
(function () {
  'use strict';

  var Store = window.Store;

  Store.load().then(function (data) {
    var tbody = document.querySelector('[data-shipping-table] tbody');
    if (tbody) {
      tbody.innerHTML = data.catalog.shipping.map(function (s) {
        return '<tr><td>' + Store.escapeHtml(s.label) + '</td><td>' + Store.money(s.price) +
          '</td><td>' + Store.escapeHtml(s.eta) + '</td></tr>';
      }).join('');
    }

    var note = document.querySelector('[data-free-note]');
    if (note) {
      note.textContent = 'Free standard shipping within New Zealand on orders over ' +
        Store.money(data.catalog.freeShippingThreshold) + '. All prices in NZD, GST inclusive.';
    }

    var fit = document.querySelector('[data-fit-grid]');
    if (fit) {
      fit.innerHTML = data.garments.map(function (g) {
        return '<div class="card" style="padding:1.2rem">' +
            '<p class="card__title">' + Store.escapeHtml(g.category) + '</p>' +
            '<p class="meta" style="margin-top:.5rem;line-height:2">' +
              Store.escapeHtml(g.fit) + '<br>' + Store.escapeHtml(g.fabric) + '</p>' +
          '</div>';
      }).join('');
    }

    Store.mountReveal();
  });
})();
