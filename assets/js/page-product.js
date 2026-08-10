/* Product configurator.
 *
 * One design, four possible garments, N colours, M sizes. Every change redraws
 * the mockup so what is on screen is always the exact thing in the cart. */
(function () {
  'use strict';

  var Store = window.Store;

  function param(name) {
    return new URLSearchParams(location.search).get(name);
  }

  Store.load().then(function (data) {
    var root = document.querySelector('[data-product-root]');
    var design = data.design(param('design')) || data.designs[0];

    if (!design) {
      root.innerHTML = '<div class="empty-state"><p class="h2">That piece could not be found.</p>' +
        '<p style="margin-top:1.5rem"><a class="btn" href="shop.html">Back to the shop</a></p></div>';
      return;
    }

    /* State: garment, colour and size, each defaulting to the first valid option. */
    var wanted = param('garment');
    var state = {
      garmentId: design.garments.indexOf(wanted) !== -1 ? wanted : design.garments[0],
      colourName: null,
      size: null,
      qty: 1,
      showPrintArea: false
    };

    function garment() { return data.garment(state.garmentId); }

    function colour() {
      var g = garment();
      return g.colours.filter(function (c) { return c.name === state.colourName; })[0] || g.colours[0];
    }

    /* Colour and size belong to the garment, so switching garment resets any
       choice the new garment does not offer. */
    function reconcile() {
      var g = garment();
      if (!g.colours.some(function (c) { return c.name === state.colourName; })) {
        state.colourName = g.colours[0].name;
      }
      if (g.sizes.indexOf(state.size) === -1) {
        state.size = g.sizes.length === 1 ? g.sizes[0] : null;
      }
    }

    document.title = design.title + ' — ' + window.SITE_CONFIG.brand.name;

    function shell() {
      return '' +
        '<nav class="meta" style="margin-bottom:2rem">' +
          '<a href="shop.html">Shop</a> / ' + Store.escapeHtml(design.collection) + ' / ' +
          Store.escapeHtml(design.title) +
        '</nav>' +
        '<div class="product">' +
          '<div class="product__stage" data-stage></div>' +
          '<div data-panel></div>' +
        '</div>';
    }

    function stageMarkup() {
      return window.GarmentMockup.render(
        state.garmentId, colour(), design.artHref,
        { showPrintArea: state.showPrintArea, size: 'stage', alt: design.title + ' on ' + garment().name }
      );
    }

    function panelMarkup() {
      var g = garment();
      var c = colour();

      return '' +
        '<p class="eyebrow">' + Store.escapeHtml(design.collection) + ' &middot; ' + design.year + '</p>' +
        '<h1 class="h1" style="margin:.5rem 0 .35rem">' + Store.escapeHtml(design.title) + '</h1>' +
        '<p class="meta">Artwork by <a href="artists.html#' + design.artistId + '" ' +
          'style="border-bottom:1px solid var(--line)">' + Store.escapeHtml(design.artist.name) + '</a></p>' +
        '<p class="lede" style="margin:1.4rem 0 0;font-size:1rem">' + Store.escapeHtml(design.blurb) + '</p>' +

        '<p class="h2" style="margin:1.8rem 0 0">' + Store.money(g.price) +
          ' <span class="meta" style="font-size:.62rem">NZD incl. GST</span></p>' +

        /* Garment */
        '<div class="option">' +
          '<div class="option__head"><span class="eyebrow">Garment</span>' +
            '<span class="option__value">' + Store.escapeHtml(g.name) + '</span></div>' +
          '<div class="garment-picker" data-garments>' +
            design.garments.map(function (gid) {
              var go = data.garment(gid);
              return '<button class="garment-opt" type="button" data-garment="' + gid + '" ' +
                'aria-pressed="' + (gid === state.garmentId) + '">' +
                '<strong>' + Store.escapeHtml(go.category) + '</strong>' +
                '<span>' + Store.money(go.price) + '</span></button>';
            }).join('') +
          '</div>' +
        '</div>' +

        /* Colour */
        '<div class="option">' +
          '<div class="option__head"><span class="eyebrow">Colour</span>' +
            '<span class="option__value" data-colour-note>' + Store.escapeHtml(c.name) + '</span></div>' +
          '<div class="swatches" data-colours>' +
            g.colours.map(function (co) {
              return '<button class="swatch" type="button" style="--c:' + co.hex + '" ' +
                'data-colour="' + Store.escapeHtml(co.name) + '" title="' + Store.escapeHtml(co.name) + '" ' +
                'aria-label="' + Store.escapeHtml(co.name) + '" ' +
                'aria-pressed="' + (co.name === c.name) + '"></button>';
            }).join('') +
          '</div>' +
        '</div>' +

        /* Size */
        '<div class="option">' +
          '<div class="option__head"><span class="eyebrow">Size</span>' +
            '<span class="option__value" data-size-note>' +
              (state.size ? Store.escapeHtml(state.size) : 'Choose a size') + '</span></div>' +
          '<div class="sizes" data-sizes>' +
            g.sizes.map(function (s) {
              return '<button class="size" type="button" data-size="' + s + '" ' +
                'aria-pressed="' + (s === state.size) + '">' + s + '</button>';
            }).join('') +
          '</div>' +
        '</div>' +

        /* Quantity + add */
        '<div class="option" style="border-bottom:0">' +
          '<div style="display:flex;flex-wrap:wrap;gap:.8rem;align-items:center">' +
            '<div class="qty">' +
              '<button type="button" data-qty="-1" aria-label="Decrease quantity">&minus;</button>' +
              '<output data-qty-value>' + state.qty + '</output>' +
              '<button type="button" data-qty="1" aria-label="Increase quantity">+</button>' +
            '</div>' +
            '<button class="btn btn--solid" style="flex:1;min-width:200px" data-add>Add to cart</button>' +
          '</div>' +
          '<p class="meta" style="margin-top:1rem">Printed to order &middot; ships in 3&ndash;5 working days ' +
            '&middot; free NZ shipping over ' + Store.money(data.catalog.freeShippingThreshold) + '</p>' +
        '</div>' +

        /* Specs */
        '<details class="spec"><summary>About this piece</summary>' +
          '<div class="spec__body"><p>' + Store.escapeHtml(design.story) + '</p>' +
          '<p style="margin-top:1rem"><span class="meta">Placement &middot; ' +
            Store.escapeHtml(design.placement) + '</span></p>' +
          '<p style="margin-top:.6rem"><button class="btn btn--sm btn--ghost" type="button" ' +
            'data-toggle-print>' + (state.showPrintArea ? 'Hide' : 'Show') + ' print area</button></p>' +
          '</div></details>' +

        '<details class="spec"><summary>Garment &amp; print</summary>' +
          '<div class="spec__body">' +
            '<p>' + Store.escapeHtml(g.blurb) + '</p>' +
            '<p style="margin-top:1rem"><span class="meta">Fabric &middot; ' + Store.escapeHtml(g.fabric) +
              '<br>Print &middot; ' + Store.escapeHtml(g.printMethod) +
              '<br>Fit &middot; ' + Store.escapeHtml(g.fit) + '</span></p>' +
          '</div></details>' +

        '<details class="spec"><summary>Sizes</summary>' +
          '<div class="spec__body"><p>This is the ' + Store.escapeHtml(g.name) +
            ' (style ' + Store.escapeHtml(g.asColourStyle) + '), available in ' +
            g.sizes.length + (g.sizes.length === 1 ? ' size' : ' sizes') + ': ' +
            g.sizes.map(Store.escapeHtml).join(', ') + '.</p>' +
            '<p style="margin-top:1rem">Full garment measurements are published by AS Colour — ' +
            '<a href="https://www.ascolour.co.nz/assets" target="_blank" rel="noopener" ' +
            'style="border-bottom:1px solid var(--line)">see their size guides</a>.</p></div></details>' +

        '<details class="spec"><summary>Shipping &amp; returns</summary>' +
          '<div class="spec__body"><p>Printed and posted from Tāmaki Makaurau by Print Poppa. ' +
            'New Zealand 3&ndash;5 working days, Australia 7&ndash;12, rest of world 10&ndash;20.</p>' +
            '<p style="margin-top:1rem">Because every piece is printed to order we cannot accept ' +
            'change-of-mind returns, but anything faulty or misprinted is replaced or refunded — ' +
            'email us within 30 days.</p></div></details>';
    }

    function paintStage() {
      document.querySelector('[data-stage]').innerHTML = stageMarkup();
    }

    function render() {
      reconcile();
      root.innerHTML = shell();
      paintStage();
      document.querySelector('[data-panel]').innerHTML = panelMarkup();
      bind();
    }

    function bind() {
      var panel = document.querySelector('[data-panel]');

      panel.querySelector('[data-garments]').addEventListener('click', function (e) {
        var btn = e.target.closest('[data-garment]');
        if (!btn) return;
        state.garmentId = btn.getAttribute('data-garment');
        var url = new URL(location.href);
        url.searchParams.set('garment', state.garmentId);
        history.replaceState(null, '', url);
        render();
      });

      panel.querySelector('[data-colours]').addEventListener('click', function (e) {
        var btn = e.target.closest('[data-colour]');
        if (!btn) return;
        state.colourName = btn.getAttribute('data-colour');
        panel.querySelectorAll('[data-colour]').forEach(function (b) {
          b.setAttribute('aria-pressed', String(b === btn));
        });
        panel.querySelector('[data-colour-note]').textContent = state.colourName;
        paintStage();
      });

      panel.querySelector('[data-sizes]').addEventListener('click', function (e) {
        var btn = e.target.closest('[data-size]');
        if (!btn) return;
        state.size = btn.getAttribute('data-size');
        panel.querySelectorAll('[data-size]').forEach(function (b) {
          b.setAttribute('aria-pressed', String(b === btn));
        });
        panel.querySelector('[data-size-note]').textContent = state.size;
      });

      panel.querySelectorAll('[data-qty]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var delta = Number(btn.getAttribute('data-qty'));
          state.qty = Math.max(1, Math.min(99, state.qty + delta));
          panel.querySelector('[data-qty-value]').textContent = state.qty;
        });
      });

      var toggle = panel.querySelector('[data-toggle-print]');
      if (toggle) {
        toggle.addEventListener('click', function () {
          state.showPrintArea = !state.showPrintArea;
          toggle.textContent = (state.showPrintArea ? 'Hide' : 'Show') + ' print area';
          paintStage();
        });
      }

      panel.querySelector('[data-add]').addEventListener('click', function () {
        if (!state.size) {
          Store.toast('Choose a size first');
          panel.querySelector('[data-sizes]').scrollIntoView({ block: 'center' });
          return;
        }
        var g = garment();
        Store.Cart.add({
          designId: design.id,
          designTitle: design.title,
          artHref: design.art,
          garmentId: g.id,
          garmentName: g.name,
          colour: colour().name,
          colourHex: colour().hex,
          size: state.size,
          qty: state.qty,
          price: g.price
        });
        Store.toast('Added — ' + design.title + ' / ' + g.category + ' / ' + state.size);
      });
    }

    render();

    /* --- Related -------------------------------------------------------- */
    var related = data.designs.filter(function (d) { return d.id !== design.id; }).slice(0, 4);
    if (related.length) {
      var section = document.querySelector('[data-related-section]');
      section.hidden = false;
      document.querySelector('[data-related-grid]').innerHTML = related.map(function (d) {
        var gid = d.garments[0];
        var g = data.garment(gid);
        return '<a class="card" href="product.html?design=' + d.id + '">' +
            '<div class="card__media">' +
              window.GarmentMockup.render(gid, Store.previewColour(g, d), d.artHref) + '</div>' +
            '<div class="card__body"><div class="card__row">' +
              '<span class="card__title">' + Store.escapeHtml(d.title) + '</span>' +
              '<span class="card__price">from ' + Store.money(Store.fromPrice(data, d)) + '</span>' +
            '</div><span class="meta">' + Store.escapeHtml(d.artist.name) + '</span></div></a>';
      }).join('');
    }
  });
})();
