// OVERTIME — Shopify Storefront Cart API integration (Headless channel)
//
// Purchase options are prepaid supply bundles built with the Shopify Bundles
// app, so selling a bundle automatically deducts the right number of single
// packs from inventory. Each .variant-pills .pill carries data-variant, which
// maps to a Shopify product below. Add to Cart creates a cart via the
// Storefront API and sends the buyer straight to the branded Shopify checkout.
//
// Pills whose product is missing or out of stock are disabled — the buyer can
// never be charged a wrong amount or get dumped on the old-theme product page.

const SHOPIFY_CONFIG = {
  domain: 'y9t80a-dv.myshopify.com',
  storefrontAccessToken: 'b69c6202feabcc8eabdb1377893d5e41',
  apiVersion: '2024-04',
  // data-variant key on each pill → Shopify product (and variant title when
  // the product has more than one variant)
  offers: {
    'Single Pack':    { handle: 'nasal-strips', variantTitle: 'Single Pack' },
    '3-Month Supply': { handle: 'nasal-strips-3-month-supply' },
    '6-Month Supply': { handle: 'nasal-strips-6-month-supply' },
    'Annual Supply':  { handle: 'nasal-strips-annual-supply' },
  },
};

(function () {
  const cartButtons = document.querySelectorAll('[data-add-to-cart]');
  if (!cartButtons.length) return;

  const endpoint = 'https://' + SHOPIFY_CONFIG.domain + '/api/' + SHOPIFY_CONFIG.apiVersion + '/graphql.json';
  const money = (amount) => '$' + Number(amount).toFixed(2);

  function gql(query, variables) {
    return fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': SHOPIFY_CONFIG.storefrontAccessToken,
      },
      body: JSON.stringify({ query: query, variables: variables }),
    }).then((r) => r.json());
  }

  // data-variant key → { merchandiseId, price, available }
  const offerByKey = {};

  const PRODUCT_QUERY =
    'query Offer($handle: String!) { product(handle: $handle) {' +
    ' variants(first: 10) { edges { node { id title availableForSale price { amount } } } } } }';

  Promise.all(Object.keys(SHOPIFY_CONFIG.offers).map((key) => {
    const offer = SHOPIFY_CONFIG.offers[key];
    return gql(PRODUCT_QUERY, { handle: offer.handle }).then((res) => {
      const product = res.data && res.data.product;
      if (!product) return;
      const variants = product.variants.edges.map((e) => e.node);
      // Match by title when specified; a lone "Default Title" variant counts too.
      const variant = offer.variantTitle
        ? variants.filter((v) => v.title === offer.variantTitle)[0]
          || (variants.length === 1 && variants[0].title === 'Default Title' ? variants[0] : null)
        : variants[0];
      if (variant) {
        offerByKey[key] = {
          merchandiseId: variant.id,
          price: Number(variant.price.amount),
          available: variant.availableForSale,
        };
      }
    }).catch((err) => console.error('Shopify product fetch failed:', offer.handle, err));
  })).then(() => {
    document.querySelectorAll('.product-card').forEach((card) => {
      card.querySelectorAll('.variant-pills .pill[data-variant]').forEach((pill) => {
        const offer = offerByKey[pill.dataset.variant];
        if (offer) pill.dataset.price = money(offer.price);
        pill.disabled = !offer || !offer.available;
      });
      const active = card.querySelector('.variant-pills .pill.active');
      const priceEl = card.querySelector('#prod-price');
      if (active && priceEl && active.dataset.price) priceEl.textContent = active.dataset.price;
    });
  });

  const CART_CREATE =
    'mutation CartCreate($merchandiseId: ID!) {' +
    ' cartCreate(input: { lines: [{ merchandiseId: $merchandiseId, quantity: 1 }] }) {' +
    ' cart { checkoutUrl } userErrors { message } } }';

  cartButtons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const card = btn.closest('.product-card');
      const active = card ? card.querySelector('.variant-pills .pill.active') : null;
      const wanted = active ? active.dataset.variant : 'Single Pack';
      const offer = offerByKey[wanted];
      if (!offer || !offer.available || btn.classList.contains('is-loading')) return;

      btn.classList.add('is-loading');
      const label = btn.textContent;
      btn.textContent = 'Heading to checkout…';

      gql(CART_CREATE, { merchandiseId: offer.merchandiseId }).then((res) => {
        const result = res.data && res.data.cartCreate;
        if (result && result.cart && result.cart.checkoutUrl) {
          window.location.href = result.cart.checkoutUrl;
          return;
        }
        const messages = result && result.userErrors && result.userErrors.map((u) => u.message).join(', ');
        throw new Error(messages || 'cartCreate failed');
      }).catch((err) => {
        console.error('Shopify checkout failed:', err);
        btn.classList.remove('is-loading');
        btn.textContent = label;
      });
    });
  });
})();
