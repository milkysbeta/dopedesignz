/* Shop: the full range, filtered by garment and collection.
 * The garment filter doubles as a preview control — filtering to Hoodies shows
 * every design rendered on a hoodie, which is the thing you actually want to see. */
(function () {
  'use strict';

  var Store = window.Store;

  var state = {
    garment: 'all',
    collection: 'all'
  };

  Store.load().then(function (data) {
    var grid = document.querySelector('[data-shop-grid]');
    var countEl = document.querySelector('[data-result-count]');

    var collections = data.designs.reduce(function (acc, d) {
      if (acc.indexOf(d.collection) === -1) acc.push(d.collection);
      return acc;
    }, []);

    /* A garment in the URL hash (#hoodie, linked from the home page and footer)
       preselects that filter. */
    var hash = location.hash.replace('#', '');
    if (data.garment(hash)) state.garment = hash;

    function chips(host, options, key) {
      host.innerHTML = options.map(function (o) {
        return '<button class="chip" type="button" data-value="' + o.value + '" ' +
          'aria-pressed="' + (state[key] === o.value) + '">' + Store.escapeHtml(o.label) + '</button>';
      }).join('');
      host.addEventListener('click', function (e) {
        var btn = e.target.closest('.chip');
        if (!btn) return;
        state[key] = btn.getAttribute('data-value');
        host.querySelectorAll('.chip').forEach(function (c) {
          c.setAttribute('aria-pressed', String(c === btn));
        });
        render();
      });
    }

    chips(
      document.querySelector('[data-filter-garment]'),
      [{ value: 'all', label: 'All garments' }].concat(data.garments.map(function (g) {
        return { value: g.id, label: g.category };
      })),
      'garment'
    );

    chips(
      document.querySelector('[data-filter-collection]'),
      [{ value: 'all', label: 'All collections' }].concat(collections.map(function (c) {
        return { value: c, label: c };
      })),
      'collection'
    );

    function render() {
      var matches = data.designs.filter(function (d) {
        var okG = state.garment === 'all' || d.garments.indexOf(state.garment) !== -1;
        var okC = state.collection === 'all' || d.collection === state.collection;
        return okG && okC;
      });

      countEl.textContent = matches.length + (matches.length === 1 ? ' piece' : ' pieces');

      if (!matches.length) {
        grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1">' +
          '<p class="h3">Nothing in that combination yet.</p>' +
          '<p class="lede" style="margin:1rem auto 0">Try another garment or collection.</p></div>';
        return;
      }

      grid.innerHTML = matches.map(function (d) {
        /* Render on the filtered garment when one is chosen, otherwise the
           design's own first choice. */
        var gid = state.garment !== 'all' ? state.garment : d.garments[0];
        var garment = data.garment(gid);
        var colour = Store.previewColour(garment, d);
        var href = 'product.html?design=' + d.id + '&garment=' + gid;

        return '<a class="card" href="' + href + '" data-reveal>' +
            '<div class="card__media">' +
              window.GarmentMockup.render(gid, colour, d.artHref,
                { area: Store.printArea(garment, d), alt: d.title + ' on ' + garment.name }) +
            '</div>' +
            '<div class="card__body">' +
              '<div class="card__row">' +
                '<span class="card__title">' + Store.escapeHtml(d.title) + '</span>' +
                '<span class="card__price">' + Store.money(garment.price) + '</span>' +
              '</div>' +
              '<span class="meta">' + Store.escapeHtml(garment.name) + ' &middot; ' +
                Store.escapeHtml(d.artist.name) + '</span>' +
              '<div class="card__swatches">' +
                garment.colours.map(function (c) {
                  return '<span class="card__swatch" style="background:' + c.hex + '" title="' +
                    Store.escapeHtml(c.name) + '"></span>';
                }).join('') +
              '</div>' +
            '</div>' +
          '</a>';
      }).join('');

      Store.mountReveal();
    }

    render();
  });
})();
