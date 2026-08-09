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
                  return '<a class="link-arrow" href="' + Store.escapeHtml(l.href) + '">' +
                    Store.escapeHtml(l.label) + '</a>';
                }).join(' ') + '</p>'
              : '') +
          '</div>' +
          '<div>' +
            '<p class="lede" style="font-size:1rem">' + Store.escapeHtml(a.bio) + '</p>' +
            '<p class="meta" style="margin-top:1.4rem">' + works.length + ' piece' +
              (works.length === 1 ? '' : 's') + ' in rotation</p>' +
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
