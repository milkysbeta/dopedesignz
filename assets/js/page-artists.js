/* Artists page: one block per artist with their pieces underneath. */
(function () {
  'use strict';

  var Store = window.Store;

  Store.load().then(function (data) {
    var root = document.querySelector('[data-artists-root]');

    root.innerHTML = data.artists.map(function (a) {
      var works = data.designs.filter(function (d) { return d.artistId === a.id; });

      return '<article class="artist" id="' + Store.escapeHtml(a.id) + '" data-reveal>' +
          '<div>' +
            '<h2 class="h2">' + Store.escapeHtml(a.name) + '</h2>' +
            '<p class="meta" style="margin-top:.6rem">' + Store.escapeHtml(a.role) + '<br>' +
              Store.escapeHtml(a.location) + '</p>' +
            (a.links.length
              ? '<p style="margin-top:1rem">' + a.links.map(function (l) {
                  /* An artist's own profile lives on someone else's site, so it
                   * opens in a new tab — following it in place would drop the
                   * visitor out of the shop. rel guards the opener reference. */
                  var ext = /^https?:/i.test(l.href);
                  return '<a class="link-arrow" href="' + Store.escapeHtml(l.href) + '"' +
                    (ext ? ' target="_blank" rel="noopener noreferrer"' : '') + '>' +
                    Store.escapeHtml(l.label) + '</a>';
                }).join(' ') + '</p>'
              : '') +
          '</div>' +
          '<div>' +
            '<p class="lede" style="font-size:1rem">' + Store.escapeHtml(a.bio) + '</p>' +
            /* An artist can be on the roster before their first drop is up.
             * Saying so is better than an unexplained "0 pieces" next to an
             * empty grid, which just reads as a broken page. */
            '<p class="meta" style="margin-top:1.4rem">' +
              (works.length
                ? works.length + ' piece' + (works.length === 1 ? '' : 's') + ' in rotation'
                : 'First pieces landing soon') + '</p>' +
            '<div class="artist__works">' +
              works.map(function (d) {
                return '<a class="artist__work" href="product.html?design=' + d.id + '" ' +
                  'title="' + Store.escapeHtml(d.title) + '">' +
                  '<img src="' + d.artHref + '" alt="' + Store.escapeHtml(d.title) + '" loading="lazy">' +
                  '</a>';
              }).join('') +
            '</div>' +
          '</div>' +
        '</article>';
    }).join('');

    Store.mountReveal();

    /* Deep links from the home page land on a specific artist. */
    if (location.hash) {
      var target = document.querySelector(location.hash);
      if (target) target.scrollIntoView();
    }
  });
})();
