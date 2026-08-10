/* Home page: featured designs, the garment range, and the artist strip. */
(function () {
  'use strict';

  var Store = window.Store;

  Store.load().then(function (data) {
    /* --- Featured designs, shown on their first available garment ------- */
    var featured = data.designs.filter(function (d) { return d.featured; }).slice(0, 6);
    var grid = document.querySelector('[data-featured-grid]');
    if (grid) {
      grid.innerHTML = featured.map(function (d) {
        var garment = data.garment(d.garments[0]);
        var colour = Store.previewColour(garment, d);
        return '<a class="card" href="product.html?design=' + d.id + '" data-reveal>' +
            '<div class="card__media">' +
              window.GarmentMockup.render(garment.id, colour, d.artHref) +
            '</div>' +
            '<div class="card__body">' +
              '<div class="card__row">' +
                '<span class="card__title">' + Store.escapeHtml(d.title) + '</span>' +
                '<span class="card__price">from ' + Store.money(Store.fromPrice(data, d)) + '</span>' +
              '</div>' +
              '<span class="meta">' + Store.escapeHtml(d.artist.name) + ' &middot; ' +
                Store.escapeHtml(d.collection) + '</span>' +
              '<div class="card__swatches">' +
                garment.colours.slice(0, 6).map(function (c) {
                  return '<span class="card__swatch" style="background:' + c.hex + '" title="' +
                    Store.escapeHtml(c.name) + '"></span>';
                }).join('') +
              '</div>' +
            '</div>' +
          '</a>';
      }).join('');
    }

    /* --- Garment range -------------------------------------------------- */
    var gGrid = document.querySelector('[data-garment-grid]');
    if (gGrid) {
      /* Show each garment carrying a design that is actually available on it. */
      gGrid.innerHTML = data.garments.map(function (g) {
        var design = data.designs.filter(function (d) {
          return d.garments.indexOf(g.id) !== -1;
        })[0] || data.designs[0];
        return '<a class="card" href="shop.html#' + g.id + '" data-reveal>' +
            '<div class="card__media">' +
              window.GarmentMockup.render(g.id, g.colours[0], design.artHref) +
            '</div>' +
            '<div class="card__body">' +
              '<div class="card__row">' +
                '<span class="card__title">' + Store.escapeHtml(g.category) + '</span>' +
                '<span class="card__price">' + Store.money(g.price) + '</span>' +
              '</div>' +
              '<span class="meta">' + Store.escapeHtml(g.name) + ' &middot; ' +
                g.colours.length + ' colours</span>' +
            '</div>' +
          '</a>';
      }).join('');
    }

    /* --- Artist strip --------------------------------------------------- */
    var strip = document.querySelector('[data-artist-strip]');
    if (strip) {
      strip.innerHTML = data.artists.map(function (a) {
        var works = data.designs.filter(function (d) { return d.artistId === a.id; });
        return '<a class="card" href="artists.html#' + a.id + '" data-reveal>' +
            '<div class="card__media" style="aspect-ratio:1/1;display:grid;place-items:center">' +
              (works[0] ? '<img src="' + works[0].artHref + '" alt="" loading="lazy">' : '') +
            '</div>' +
            '<div class="card__body">' +
              '<span class="card__title">' + Store.escapeHtml(a.name) + '</span>' +
              '<span class="meta">' + Store.escapeHtml(a.role) + ' &middot; ' + works.length +
                ' piece' + (works.length === 1 ? '' : 's') + '</span>' +
            '</div>' +
          '</a>';
      }).join('');
    }

    Store.mountReveal();
  });
})();
