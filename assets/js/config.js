/* Site configuration.
 *
 * This is the only file that needs editing to take the store live. Nothing here
 * is a secret — Stripe's publishable key and the order endpoint URL are both
 * safe in client code. Secret keys live on the server behind `checkoutEndpoint`.
 */
window.SITE_CONFIG = {
  brand: {
    name: 'Dope Designs',
    tagline: 'Wearable generative art',
    email: 'hello@example.co.nz',
    instagram: '',
    location: 'Aotearoa New Zealand'
  },

  /* --- Fulfilment ------------------------------------------------------
   * Print Poppa (Auckland) prints and ships every order. They had no public
   * API at the time of writing, so the default mode packages each paid order
   * into a fulfilment record and posts it to `orderEndpoint`, which is where
   * it gets emailed / dropped in a sheet / forwarded to Campbell.
   *
   * If Print Poppa provide a direct feed, set `mode: 'api'` and point
   * `orderEndpoint` at the server route that talks to it — nothing else on the
   * site needs to change.
   */
  fulfilment: {
    partner: 'Print Poppa',
    partnerUrl: 'https://www.printpoppa.co.nz/',
    mode: 'forward',            // 'forward' | 'api'
    orderEndpoint: '',          // e.g. a Formspree/Netlify/Worker URL. Empty -> download + mailto fallback.
    notifyEmail: ''             // where the fulfilment record is emailed when no endpoint is set
  },

  /* --- Payments --------------------------------------------------------
   * Leave `checkoutEndpoint` empty to run the site in preview mode: the cart
   * and checkout work end to end but no money moves, and the confirmation
   * screen says so plainly. Set it to your Stripe Checkout Session endpoint
   * (see README) to take real payments.
   */
  payments: {
    provider: 'stripe',
    checkoutEndpoint: '',
    publishableKey: '',
    currency: 'NZD'
  },

  /* Preview mode is inferred, not configured — it turns off the moment a real
     checkout endpoint exists. */
  get previewMode() {
    return !this.payments.checkoutEndpoint;
  }
};
