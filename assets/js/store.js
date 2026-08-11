/* Store core: catalogue loading, cart state, money, and shared page chrome.
 * Everything else on the site builds on this. */
(function (global) {
  'use strict';

  var CFG = global.SITE_CONFIG;
  var CART_KEY = 'tap.cart.v1';

  /* Pages sit at the site root except art/, so relative data paths work as-is.
     `base` keeps that assumption in one place. */
  var base = document.body.getAttribute('data-base') || '';

  /* --- Data ------------------------------------------------------------- */
  var cache = null;

  function load() {
    if (cache) return cache;
    cache = Promise.all([
      fetch(base + 'data/catalog.json').then(function (r) { return r.json(); }),
      fetch(base + 'data/designs.json').then(function (r) { return r.json(); }),
      fetch(base + 'data/artists.json').then(function (r) { return r.json(); })
    ]).then(function (parts) {
      var catalog = parts[0], designs = parts[1].designs, artists = parts[2].artists;
      var byGarment = {}, byArtist = {}, byDesign = {};
      catalog.garments.forEach(function (g) {
        byGarment[g.id] = g;
        /* Resolve photo paths and push the garment's default print area down
           onto each photographed colour, so the mockup renderer only ever needs
           the colour record. A colour may override the area — useful when one
           colourway was shot on a different template. */
        g.colours.forEach(function (c) {
          if (c.image) c.image = base + c.image;
        });
      });
      artists.forEach(function (a) { byArtist[a.id] = a; });
      designs.forEach(function (d) {
        d.artist = byArtist[d.artistId] || { id: d.artistId, name: 'Unknown artist' };
        d.artHref = base + d.art;
        byDesign[d.id] = d;
      });
      return {
        catalog: catalog,
        garments: catalog.garments,
        designs: designs,
        artists: artists,
        garment: function (id) { return byGarment[id]; },
        design: function (id) { return byDesign[id]; },
        artistOf: function (id) { return byArtist[id]; }
      };
    }).catch(function (err) {
      console.error('Catalogue failed to load', err);
      var host = document.querySelector('[data-catalog-error]') || document.body;
      var p = document.createElement('div');
      p.className = 'wrap section';
      p.innerHTML = '<div class="notice notice--warn"><strong>The catalogue could not be loaded.</strong> ' +
        'If you are opening these files directly from disk, run a local server instead — ' +
        'browsers block <code>fetch</code> on <code>file://</code> URLs. See the README.</div>';
      host.prepend(p);
      throw err;
    });
    return cache;
  }

  /* --- Money ------------------------------------------------------------ */
  function money(n) {
    return '$' + Number(n).toFixed(2);
  }

  /* Prices are stored GST-inclusive, so the GST component is backed out of the
     total rather than added to it. */
  function gstComponent(total, rate) {
    return total - total / (1 + rate);
  }

  /* --- Cart ------------------------------------------------------------- */
  function readCart() {
    try {
      var raw = localStorage.getItem(CART_KEY);
      var items = raw ? JSON.parse(raw) : [];
      return Array.isArray(items) ? items : [];
    } catch (e) {
      return [];
    }
  }

  function writeCart(items) {
    try { localStorage.setItem(CART_KEY, JSON.stringify(items)); } catch (e) { /* private mode */ }
    document.dispatchEvent(new CustomEvent('cart:change', { detail: items }));
  }

  function lineKey(item) {
    return [item.designId, item.garmentId, item.colour, item.size].join('|');
  }

  var Cart = {
    items: readCart,

    add: function (item) {
      var items = readCart();
      var key = lineKey(item);
      var existing = items.filter(function (i) { return lineKey(i) === key; })[0];
      if (existing) existing.qty += item.qty;
      else items.push(item);
      writeCart(items);
      return items;
    },

    setQty: function (key, qty) {
      var items = readCart().map(function (i) {
        if (lineKey(i) === key) i.qty = Math.max(1, Math.min(99, qty));
        return i;
      });
      writeCart(items);
      return items;
    },

    remove: function (key) {
      writeCart(readCart().filter(function (i) { return lineKey(i) !== key; }));
    },

    clear: function () { writeCart([]); },

    count: function () {
      return readCart().reduce(function (n, i) { return n + i.qty; }, 0);
    },

    subtotal: function () {
      return readCart().reduce(function (n, i) { return n + i.price * i.qty; }, 0);
    },

    /** Shipping for a region id, honouring the free-shipping threshold. */
    shipping: function (catalog, shippingId) {
      var sub = this.subtotal();
      if (!sub) return { price: 0, option: null };
      var opt = catalog.shipping.filter(function (s) { return s.id === shippingId; })[0] || catalog.shipping[0];
      var free = sub >= catalog.freeShippingThreshold && opt.regions.indexOf('NZ') !== -1;
      return { price: free ? 0 : opt.price, option: opt, free: free };
    },

    key: lineKey
  };

  /* --- Toast ------------------------------------------------------------ */
  var toastEl, toastTimer;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      toastEl.setAttribute('role', 'status');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    requestAnimationFrame(function () { toastEl.setAttribute('data-show', 'true'); });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.setAttribute('data-show', 'false'); }, 2600);
  }

  /* --- Shared chrome ---------------------------------------------------- */
  var NAV = [
    { href: 'shop.html', label: 'Shop' },
    { href: 'artists.html', label: 'Artists' },
    { href: 'about.html', label: 'About' },
    { href: 'art/liquid-chrome.html', label: 'Liquid Chrome' }
  ];

  function mountChrome() {
    var page = document.body.getAttribute('data-page');

    var header = document.querySelector('[data-site-header]');
    if (header) {
      header.className = 'site-header';
      header.innerHTML =
        '<div class="wrap site-header__inner">' +
          '<a class="brand" href="' + base + 'index.html">' +
            '<span class="brand__mark">' + CFG.brand.name + '</span>' +
            '<span class="brand__sub">NZ</span>' +
          '</a>' +
          '<button class="nav-toggle" aria-expanded="false" aria-controls="primary-nav" aria-label="Menu">' +
            '<span></span><span></span><span></span>' +
          '</button>' +
          '<nav class="nav" id="primary-nav">' +
            NAV.map(function (n) {
              var id = n.href.replace(/^art\//, '').replace('.html', '');
              var current = id === page ? ' aria-current="page"' : '';
              return '<a href="' + base + n.href + '"' + current + '>' + n.label + '</a>';
            }).join('') +
            '<a class="cart-btn" href="' + base + 'cart.html">Cart' +
              '<span class="cart-btn__count" data-cart-count hidden>0</span>' +
            '</a>' +
          '</nav>' +
        '</div>';

      var toggle = header.querySelector('.nav-toggle');
      var nav = header.querySelector('.nav');
      toggle.addEventListener('click', function () {
        var open = nav.getAttribute('data-open') === 'true';
        nav.setAttribute('data-open', String(!open));
        toggle.setAttribute('aria-expanded', String(!open));
      });
    }

    var footer = document.querySelector('[data-site-footer]');
    if (footer) {
      footer.className = 'site-footer';
      footer.innerHTML =
        '<div class="wrap">' +
          '<div class="site-footer__grid">' +
            '<div>' +
              '<p class="brand__mark" style="margin-bottom:.7rem">' + CFG.brand.name + '</p>' +
              '<p class="meta" style="max-width:28ch;line-height:2">' + CFG.brand.tagline +
                '. Printed to order in ' + CFG.brand.location + '.</p>' +
            '</div>' +
            '<div><h4>Shop</h4><ul>' +
              '<li><a href="' + base + 'shop.html">All pieces</a></li>' +
              '<li><a href="' + base + 'shop.html#tee">T-Shirts</a></li>' +
              '<li><a href="' + base + 'shop.html#hoodie">Hoodies</a></li>' +
              '<li><a href="' + base + 'shop.html#jacket">Jackets</a></li>' +
              '<li><a href="' + base + 'shop.html#cap">Hats</a></li>' +
            '</ul></div>' +
            '<div><h4>Studio</h4><ul>' +
              '<li><a href="' + base + 'artists.html">Artists</a></li>' +
              '<li><a href="' + base + 'about.html">About</a></li>' +
              '<li><a href="' + base + 'art/liquid-chrome.html">Liquid Chrome</a></li>' +
            '</ul></div>' +
            '<div><h4>Help</h4><ul>' +
              '<li><a href="' + base + 'about.html#shipping">Shipping &amp; returns</a></li>' +
              '<li><a href="' + base + 'about.html#sizing">Sizing</a></li>' +
              '<li><a href="mailto:' + CFG.brand.email + '">' + CFG.brand.email + '</a></li>' +
            '</ul></div>' +
          '</div>' +
          '<div class="site-footer__base">' +
            '<span class="meta">&copy; ' + new Date().getFullYear() + ' ' + CFG.brand.name + '</span>' +
            '<span class="meta">Printed &amp; shipped by <a href="' + CFG.fulfilment.partnerUrl +
              '" target="_blank" rel="noopener">' + CFG.fulfilment.partner + '</a>, Tāmaki Makaurau</span>' +
          '</div>' +
        '</div>';
    }

    syncCartCount();
    document.addEventListener('cart:change', syncCartCount);
  }

  function syncCartCount() {
    var n = Cart.count();
    document.querySelectorAll('[data-cart-count]').forEach(function (el) {
      el.textContent = n;
      el.hidden = n === 0;
    });
  }

  /* --- Reveal on scroll -------------------------------------------------- */
  function mountReveal() {
    var els = document.querySelectorAll('[data-reveal]');
    if (!els.length) return;
    if (!('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    els.forEach(function (el) { io.observe(el); });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /**
   * Where a design prints on a garment.
   *
   * A design names a position ("leftChest") rather than carrying coordinates, so
   * the same design lands correctly on every garment — and a design can override
   * per garment when one cut needs different treatment.
   */
  function printArea(garment, design) {
    var areas = (garment.photo && garment.photo.printAreas) || {};
    var want = design && design.placement;
    if (want && typeof want === 'object') want = want[garment.id];      // per-garment override
    return areas[want] || areas.frontCentre || { x: 0.35, y: 0.33, w: 0.30, h: 0.30 };
  }

  var PLACEMENT_LABELS = {
    frontCentre: 'Front centre',
    leftChest: 'Left chest',
    fullFront: 'Full front'
  };

  /** Human wording for a design's print position on a given garment. */
  function placementLabel(design, garment) {
    var want = design && design.placement;
    if (want && typeof want === 'object') want = want[garment.id];
    if (garment.id === 'cap') return 'Cap front';
    if (garment.id === 'jacket' && want === 'frontCentre') return 'Back panel';
    return PLACEMENT_LABELS[want] || 'Front centre';
  }

  /**
   * Pick a preview colourway for a card. Deterministic per design+garment so the
   * grid never reshuffles between loads, but varied enough that a page of cards
   * is not eight identical black tees.
   */
  function previewColour(garment, design) {
    var seed = 0;
    var key = design.id + garment.id;
    for (var i = 0; i < key.length; i++) seed = (seed * 31 + key.charCodeAt(i)) >>> 0;

    /* Prefer a dark colourway: the range is iridescent light-on-dark artwork,
       which is what it is designed to sit on. Falls back to the full set for a
       garment that only comes in pale colours. */
    var pool = garment.colours.filter(function (c) { return c.tone !== 'light'; });
    if (!pool.length) pool = garment.colours;
    return pool[seed % pool.length];
  }

  /** Cheapest garment a design is available on — what the card price shows. */
  function fromPrice(data, design) {
    return design.garments.reduce(function (min, gid) {
      var g = data.garment(gid);
      return g && (min === null || g.price < min) ? g.price : min;
    }, null);
  }

  global.Store = {
    base: base,
    load: load,
    money: money,
    gstComponent: gstComponent,
    Cart: Cart,
    toast: toast,
    escapeHtml: escapeHtml,
    fromPrice: fromPrice,
    previewColour: previewColour,
    printArea: printArea,
    placementLabel: placementLabel,
    mountReveal: mountReveal
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountChrome);
  } else {
    mountChrome();
  }
})(window);
