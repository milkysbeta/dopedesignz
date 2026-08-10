/* Garment mockups.
 *
 * Vector silhouettes that take a colour and a design and return a finished SVG
 * string. Drawn rather than photographed so every colourway is available with no
 * asset library — swap these for real Print Poppa product photography when it is
 * available and only `render()` needs to change.
 *
 * Each garment declares a `print` rect in its own viewBox coordinates; the design
 * is fitted inside it with aspect ratio preserved.
 */
(function (global) {
  'use strict';

  var uid = 0;

  /* Shared paint: a soft roll of shading across the body plus a warm top light,
     so a flat fill reads as fabric rather than a sticker. */
  function paint(id, colour) {
    return (
      '<linearGradient id="roll' + id + '" x1="0" y1="0" x2="1" y2="0">' +
        '<stop offset="0" stop-color="#000" stop-opacity="0.34"/>' +
        '<stop offset="0.18" stop-color="#000" stop-opacity="0.06"/>' +
        '<stop offset="0.45" stop-color="#fff" stop-opacity="0.07"/>' +
        '<stop offset="0.82" stop-color="#000" stop-opacity="0.10"/>' +
        '<stop offset="1" stop-color="#000" stop-opacity="0.36"/>' +
      '</linearGradient>' +
      '<linearGradient id="top' + id + '" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0" stop-color="#fff" stop-opacity="0.12"/>' +
        '<stop offset="0.35" stop-color="#fff" stop-opacity="0"/>' +
        '<stop offset="1" stop-color="#000" stop-opacity="0.22"/>' +
      '</linearGradient>'
    );
  }

  var SEAM = 'fill="none" stroke="#000" stroke-opacity="0.22" stroke-width="2"';

  var GARMENTS = {
    tee: {
      viewBox: '0 0 600 700',
      print: { x: 196, y: 196, w: 208, h: 260 },
      body:
        'M240 96 C265 140 335 140 360 96 L458 122 L562 208 L506 292 L444 240 ' +
        'L448 646 L152 646 L156 240 L94 292 L38 208 L142 122 Z',
      detail:
        '<path d="M240 96 C265 140 335 140 360 96" ' + SEAM + '/>' +
        '<path d="M232 88 C262 140 338 140 368 88" fill="none" stroke="#000" stroke-opacity="0.13" stroke-width="9"/>' +
        '<path d="M444 240 L506 292" ' + SEAM + '/>' +
        '<path d="M156 240 L94 292" ' + SEAM + '/>' +
        '<path d="M152 632 L448 632" fill="none" stroke="#000" stroke-opacity="0.14" stroke-width="3"/>'
    },

    hoodie: {
      viewBox: '0 0 600 700',
      print: { x: 194, y: 244, w: 212, h: 226 },
      body:
        'M228 128 C250 196 350 196 372 128 L470 152 L566 244 L512 326 L462 276 ' +
        'L466 656 L134 656 L138 276 L88 326 L34 244 L130 152 Z',
      detail:
        /* Hood sits above the body path, so it needs its own base fill before
           the shadow — otherwise it renders as a hole on light colourways. */
        '<path d="M228 128 C236 60 364 60 372 128 C346 178 254 178 228 128 Z" fill="var(--gc)"/>' +
        '<path d="M228 128 C236 60 364 60 372 128 C346 178 254 178 228 128 Z" ' +
          'fill="#000" fill-opacity="0.13"/>' +
        '<path d="M228 128 C236 60 364 60 372 128" ' + SEAM + '/>' +
        '<path d="M258 148 C280 186 320 186 342 148" fill="none" stroke="#000" stroke-opacity="0.30" stroke-width="3"/>' +
        /* drawcords */
        '<path d="M268 152 L262 232" fill="none" stroke="#fff" stroke-opacity="0.55" stroke-width="4" stroke-linecap="round"/>' +
        '<path d="M332 152 L340 228" fill="none" stroke="#fff" stroke-opacity="0.55" stroke-width="4" stroke-linecap="round"/>' +
        /* kangaroo pocket */
        '<path d="M186 486 L414 486 L404 604 L196 604 Z" fill="none" stroke="#000" stroke-opacity="0.26" stroke-width="3"/>' +
        /* cuffs + hem ribbing */
        '<path d="M462 276 L512 326" ' + SEAM + '/>' +
        '<path d="M138 276 L88 326" ' + SEAM + '/>' +
        '<rect x="134" y="618" width="332" height="38" fill="#000" fill-opacity="0.14"/>'
    },

    jacket: {
      viewBox: '0 0 600 700',
      /* Shown from the back: a coach jacket's snap placket splits the front, so
         the back panel is the print surface. */
      print: { x: 190, y: 262, w: 220, h: 254 },
      body:
        'M232 118 L368 118 L468 146 L566 236 L510 318 L460 268 L464 644 L136 644 ' +
        'L140 268 L90 318 L34 236 L132 146 Z',
      detail:
        /* back collar */
        '<path d="M232 118 C258 156 342 156 368 118 L392 132 C352 186 248 186 208 132 Z" ' +
          'fill="var(--gc)"/>' +
        '<path d="M232 118 C258 156 342 156 368 118 L392 132 C352 186 248 186 208 132 Z" ' +
          'fill="#000" fill-opacity="0.26"/>' +
        '<path d="M232 118 C258 156 342 156 368 118" ' + SEAM + '/>' +
        /* yoke seam across the shoulders */
        '<path d="M140 214 C220 244 380 244 460 214" fill="none" stroke="#000" ' +
          'stroke-opacity="0.20" stroke-width="3"/>' +
        /* elastic cuffs + hem */
        '<rect x="136" y="612" width="328" height="32" fill="#000" fill-opacity="0.16"/>' +
        '<path d="M460 268 L510 318" ' + SEAM + '/>' +
        '<path d="M140 268 L90 318" ' + SEAM + '/>'
    },

    cap: {
      viewBox: '0 0 600 700',
      print: { x: 224, y: 250, w: 152, h: 130 },
      body:
        'M300 150 C412 150 470 232 470 404 L130 404 C130 232 188 150 300 150 Z',
      detail:
        /* panel seams */
        '<path d="M300 152 L300 404" ' + SEAM + '/>' +
        '<path d="M196 178 C182 250 176 322 176 404" ' + SEAM + '/>' +
        '<path d="M404 178 C418 250 424 322 424 404" ' + SEAM + '/>' +
        /* button */
        '<circle cx="300" cy="154" r="12" fill="#000" fill-opacity="0.28"/>' +
        /* brim, drawn after the crown so it sits in front */
        '<path d="M132 404 C132 404 118 470 176 500 C240 532 396 532 452 494 ' +
          'C500 462 468 404 468 404 Z" fill="var(--gc)"/>' +
        '<path d="M132 404 C132 404 118 470 176 500 C240 532 396 532 452 494 ' +
          'C500 462 468 404 468 404 Z" fill="#000" fill-opacity="0.30"/>' +
        '<path d="M150 424 C160 480 230 512 300 512 C370 512 440 480 450 424" ' +
          'fill="none" stroke="#fff" stroke-opacity="0.10" stroke-width="3"/>' +
        '<rect x="130" y="392" width="340" height="16" fill="#000" fill-opacity="0.18"/>'
    }
  };

  /* --- Photo mode -------------------------------------------------------
   * When a colourway has a real product photo, that photo is the mockup and the
   * drawn silhouette is skipped entirely. The garment's `photo.printArea` says
   * where the print sits, as fractions of the image, so one measurement covers
   * every colourway shot on the same template.
   */
  var PHOTO_BOX = { w: 1000, h: 1250 };   // normalised 4:5 canvas

  function renderPhoto(colour, artHref, opts) {
    var id = 'p' + ++uid;
    /* store.js copies the garment's default print area onto each photographed
       colour, so by here it is always a property of the colour itself. */
    var area = colour.printArea || { x: 0.31, y: 0.22, w: 0.38, h: 0.34 };

    var x = area.x * PHOTO_BOX.w;
    var y = area.y * PHOTO_BOX.h;
    var w = area.w * PHOTO_BOX.w;
    var h = area.h * PHOTO_BOX.h;

    /* On light fabric the ink sits in the weave, so multiply keeps the garment's
       folds and shadows visible through the print. On dark fabric DTG lays a
       white underbase first and the print is opaque — multiply would wrongly
       make it vanish. */
    var blend = colour.tone === 'light' ? 'multiply' : 'normal';

    var art = artHref
      ? '<g style="mix-blend-mode:' + blend + '">' +
          '<image href="' + artHref + '" xlink:href="' + artHref + '" ' +
          'x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" ' +
          'width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '" ' +
          'preserveAspectRatio="xMidYMid meet"/>' +
        '</g>'
      : '';

    /* The cyan guide disappears against a pale garment, so darken it there. */
    var guideStroke = colour.tone === 'light' ? '#0f6d8c' : '#8fe8ff';
    var guide = opts.showPrintArea
      ? '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" ' +
        'width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '" fill="none" ' +
        'stroke="' + guideStroke + '" stroke-opacity="0.85" stroke-width="3" stroke-dasharray="10 8"/>'
      : '';

    return (
      '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ' +
        'viewBox="0 0 ' + PHOTO_BOX.w + ' ' + PHOTO_BOX.h + '" role="img">' +
        '<image href="' + colour.image + '" xlink:href="' + colour.image + '" ' +
          'x="0" y="0" width="' + PHOTO_BOX.w + '" height="' + PHOTO_BOX.h + '" ' +
          'preserveAspectRatio="xMidYMid slice"/>' +
        art + guide +
      '</svg>'
    );
  }

  /**
   * Render a garment mockup.
   *
   * Uses the colourway's real product photo when it has one, and falls back to
   * the drawn silhouette when it does not — so photographed and unphotographed
   * colours can coexist in the same grid while a shoot is still coming in.
   *
   * @param {string} garmentId  tee | hoodie | jacket | cap
   * @param {object|string} colour  colour record, or a bare hex string
   * @param {string} [artHref]  URL of the design to place in the print area
   * @param {object} [opts]     { showPrintArea: boolean }
   * @returns {string} SVG markup
   */
  function render(garmentId, colour, artHref, opts) {
    var g = GARMENTS[garmentId];
    if (!g) return '';
    opts = opts || {};
    if (typeof colour === 'string') colour = { hex: colour };

    if (colour.image) return renderPhoto(colour, artHref, opts);

    var id = 'g' + ++uid;
    var p = g.print;
    var hex = colour.hex;

    var art = '';
    if (artHref) {
      art =
        '<image href="' + artHref + '" xlink:href="' + artHref + '" ' +
        'x="' + p.x + '" y="' + p.y + '" width="' + p.w + '" height="' + p.h + '" ' +
        'preserveAspectRatio="xMidYMid meet" opacity="0.97"/>';
    }

    var guide = opts.showPrintArea
      ? '<rect x="' + p.x + '" y="' + p.y + '" width="' + p.w + '" height="' + p.h + '" ' +
        'fill="none" stroke="#8fe8ff" stroke-opacity="0.5" stroke-width="1.5" stroke-dasharray="6 5"/>'
      : '';

    return (
      '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ' +
        'viewBox="' + g.viewBox + '" role="img" style="--gc:' + hex + '">' +
        '<defs>' + paint(id, hex) +
          '<clipPath id="clip' + id + '"><path d="' + g.body + '"/></clipPath>' +
        '</defs>' +
        '<path d="' + g.body + '" fill="' + hex + '"/>' +
        /* The print sits under the shading so it picks up the fabric's roll. */
        '<g clip-path="url(#clip' + id + ')">' + art + '</g>' +
        '<path d="' + g.body + '" fill="url(#roll' + id + ')"/>' +
        '<path d="' + g.body + '" fill="url(#top' + id + ')"/>' +
        '<path d="' + g.body + '" fill="none" stroke="#000" stroke-opacity="0.35" stroke-width="2"/>' +
        g.detail +
        guide +
      '</svg>'
    );
  }

  global.GarmentMockup = { render: render, garments: GARMENTS };
})(window);
