/* Garment mockups — real product photography with the artwork composited on.
 *
 * Every mockup is a photograph of the actual AS Colour blank Print Poppa prints,
 * with the design composited into the print area. Nothing here is illustrated.
 *
 * A flat paste of artwork onto a photo always reads as fake, because real ink
 * takes the fabric's light. Three passes fix that:
 *
 *   1. Displacement — the artwork is warped by the garment's own brightness
 *      gradient, so it bends over folds and seams instead of lying flat.
 *   2. Shading — the garment's light and shadow inside the print area is
 *      multiplied onto the artwork, so a shadowed chest darkens the print by
 *      the same amount it darkens the cloth.
 *   3. Fabric masking — anything falling outside the garment silhouette is cut
 *      away, so a wide print never bleeds onto the studio background.
 *
 * Painting is deferred: render() returns a placeholder element, and a
 * MutationObserver composites it once it is in the document. Results are cached
 * by garment+colour+design+size, so re-filtering the shop grid is free.
 */
(function (global) {
  'use strict';

  var CACHE = {};          // composite key -> data URL
  var IMAGES = {};         // src -> Promise<Image>
  var PENDING = {};        // composite key -> Promise<string>

  /* Cards do not need stage resolution; compositing cost is per pixel. */
  var SIZES = { card: 620, stage: 1100 };

  function loadImage(src) {
    if (IMAGES[src]) return IMAGES[src];
    IMAGES[src] = new Promise(function (resolve, reject) {
      var img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error('image failed: ' + src)); };
      img.src = src;
    });
    return IMAGES[src];
  }

  function canvasOf(w, h) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }

  /**
   * Composite one mockup.
   * @returns {Promise<string>} data URL of the finished image
   */
  function composite(opts) {
    var key = [opts.photo, opts.art, opts.size, opts.showPrintArea ? 'g' : '',
               opts.area.x, opts.area.y, opts.area.w, opts.area.h].join('|');
    if (CACHE[key]) return Promise.resolve(CACHE[key]);
    if (PENDING[key]) return PENDING[key];

    PENDING[key] = Promise.all([loadImage(opts.photo), opts.art ? loadImage(opts.art) : null])
      .then(function (parts) {
        var photo = parts[0], art = parts[1];
        var S = opts.size;

        var out = canvasOf(S, S);
        var ctx = out.getContext('2d');
        ctx.drawImage(photo, 0, 0, S, S);
        if (!art) return out.toDataURL('image/jpeg', 0.9);

        var a = opts.area;
        var px = Math.round(a.x * S), py = Math.round(a.y * S);
        var pw = Math.round(a.w * S), ph = Math.round(a.h * S);

        /* Artwork, fitted inside the print area preserving aspect. */
        var layer = canvasOf(pw, ph);
        var lctx = layer.getContext('2d');
        var scale = Math.min(pw / art.width, ph / art.height);
        var aw = art.width * scale, ah = art.height * scale;
        lctx.drawImage(art, (pw - aw) / 2, (ph - ah) / 2, aw, ah);

        var garment = ctx.getImageData(px, py, pw, ph);
        var ink = lctx.getImageData(0, 0, pw, ph);
        var g = garment.data, k = ink.data;

        /* Mean brightness of the fabric under the print, used as the neutral
           point so shading darkens and lightens around the true fabric tone. */
        var mean = 0, n = pw * ph;
        for (var i = 0; i < n; i++) {
          mean += (g[i * 4] * 0.299 + g[i * 4 + 1] * 0.587 + g[i * 4 + 2] * 0.114);
        }
        mean = Math.max(mean / n, 1);

        var warped = new Uint8ClampedArray(k.length);
        var AMP = opts.displace;

        for (var y = 0; y < ph; y++) {
          for (var x = 0; x < pw; x++) {
            var o = (y * pw + x) * 4;

            /* 1. Displacement from the fabric's brightness gradient. */
            var xl = Math.max(x - 2, 0), xr = Math.min(x + 2, pw - 1);
            var yu = Math.max(y - 2, 0), yd = Math.min(y + 2, ph - 1);
            var lum = function (ix, iy) {
              var q = (iy * pw + ix) * 4;
              return g[q] * 0.299 + g[q + 1] * 0.587 + g[q + 2] * 0.114;
            };
            var dx = (lum(xr, y) - lum(xl, y)) / 255 * AMP;
            var dy = (lum(x, yd) - lum(x, yu)) / 255 * AMP;

            var sx = Math.min(Math.max(Math.round(x - dx), 0), pw - 1);
            var sy = Math.min(Math.max(Math.round(y - dy), 0), ph - 1);
            var s = (sy * pw + sx) * 4;

            /* 2. Shading: scale the ink by how light or dark the cloth is here. */
            var shade = lum(x, y) / mean;
            shade = 1 + (shade - 1) * opts.shading;
            shade = Math.min(Math.max(shade, 0.25), 1.6);

            warped[o]     = k[s] * shade;
            warped[o + 1] = k[s + 1] * shade;
            warped[o + 2] = k[s + 2] * shade;

            /* 3. Fabric mask: fade the ink out over the studio background. */
            var r = g[(y * pw + x) * 4], gg = g[(y * pw + x) * 4 + 1], bb = g[(y * pw + x) * 4 + 2];
            var offGarment = (r > 246 && gg > 246 && bb > 246) ? 0 : 1;
            warped[o + 3] = k[s + 3] * opts.inkOpacity * offGarment;
          }
        }

        lctx.putImageData(new ImageData(warped, pw, ph), 0, 0);
        ctx.drawImage(layer, px, py);

        if (opts.showPrintArea) {
          ctx.save();
          ctx.strokeStyle = opts.tone === 'light' ? '#0f6d8c' : '#8fe8ff';
          ctx.lineWidth = Math.max(S / 380, 2);
          ctx.setLineDash([S / 60, S / 80]);
          ctx.strokeRect(px, py, pw, ph);
          ctx.restore();
        }
        return out.toDataURL('image/jpeg', 0.92);
      })
      .then(function (url) {
        CACHE[key] = url;
        delete PENDING[key];
        return url;
      })
      .catch(function (err) {
        delete PENDING[key];
        console.error('Mockup failed', err);
        return opts.photo;          // fall back to the bare garment photo
      });

    return PENDING[key];
  }

  /* --- Public API --------------------------------------------------------- */

  /**
   * Markup for one mockup. The element paints itself once it lands in the DOM.
   *
   * @param {string} garmentId
   * @param {object} colour  { name, hex, tone, image, printArea, displace, shading }
   * @param {string} [artHref]
   * @param {object} [opts]  { showPrintArea, size: 'card'|'stage', alt }
   */
  function render(garmentId, colour, artHref, opts) {
    opts = opts || {};
    if (typeof colour === 'string') colour = { hex: colour };
    if (!colour.image) return '';
    var area = opts.area || colour.printArea;
    if (!area) return '';

    var attrs = {
      'data-mockup': '',
      'data-photo': colour.image,
      'data-art': artHref || '',
      'data-area': [area.x, area.y, area.w, area.h].join(','),
      'data-tone': colour.tone || 'dark',
      'data-displace': colour.displace != null ? colour.displace : 9,
      'data-shading': colour.shading != null ? colour.shading : 0.85,
      'data-ink': colour.inkOpacity != null ? colour.inkOpacity : 0.97,
      'data-size': opts.size === 'stage' ? SIZES.stage : SIZES.card,
      'data-guide': opts.showPrintArea ? '1' : ''
    };
    var s = '';
    for (var k in attrs) s += ' ' + k + '="' + String(attrs[k]).replace(/"/g, '&quot;') + '"';
    return '<img class="mockup" alt="' + (opts.alt || '').replace(/"/g, '&quot;') + '"' + s + '>';
  }

  function hydrate(el) {
    if (el.getAttribute('data-mockup') === 'done') return;
    el.setAttribute('data-mockup', 'done');
    var area = el.getAttribute('data-area').split(',').map(Number);
    composite({
      photo: el.getAttribute('data-photo'),
      art: el.getAttribute('data-art') || null,
      area: { x: area[0], y: area[1], w: area[2], h: area[3] },
      tone: el.getAttribute('data-tone'),
      displace: Number(el.getAttribute('data-displace')),
      shading: Number(el.getAttribute('data-shading')),
      inkOpacity: Number(el.getAttribute('data-ink')),
      size: Number(el.getAttribute('data-size')),
      showPrintArea: !!el.getAttribute('data-guide')
    }).then(function (url) { el.src = url; });
  }

  function scan(root) {
    (root || document).querySelectorAll('img.mockup[data-mockup=""]').forEach(hydrate);
  }

  if (typeof MutationObserver !== 'undefined') {
    new MutationObserver(function () { scan(); }).observe(
      document.documentElement, { childList: true, subtree: true }
    );
  }
  document.addEventListener('DOMContentLoaded', function () { scan(); });

  global.GarmentMockup = { render: render, scan: scan };
})(window);
