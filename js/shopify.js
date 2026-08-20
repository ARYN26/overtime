// OVERTIME — Shopify Storefront Cart API integration (Headless channel)
//
// Purchase options are prepaid supply bundles built with the Shopify Bundles
// app, so selling a bundle automatically deducts the right number of single
// packs from inventory. Each .plan-picker .purchase-option carries data-variant,
// which maps to a Shopify product below. Add to Cart creates a cart via the
// Storefront API and sends the buyer straight to the branded Shopify checkout.
//
// Prices, per-pack cost and the "save X%" badges are all rendered from the live
// Storefront response rather than hardcoded, so they cannot drift away from what
// the store actually charges. Plans whose product is missing or out of stock are
// disabled — the buyer can never be charged a wrong amount or get dumped on the
// old-theme product page.

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
    // Savings are measured against what a single pack costs today, so a bundle
    // only ever claims a discount it genuinely gives.
    const single = offerByKey['Single Pack'];
    const baseline = single && single.available ? single.price : null;

    document.querySelectorAll('.product-card').forEach((card) => {
      const options = [].slice.call(card.querySelectorAll('.plan-picker .purchase-option[data-variant]'));
      if (!options.length) return;

      let best = null;

      options.forEach((opt) => {
        const offer = offerByKey[opt.dataset.variant];
        const input = opt.querySelector('input[type="radio"]');
        const nameEl = opt.querySelector('.opt-name');
        const subEl = opt.querySelector('.opt-sub');
        const packs = Number(opt.dataset.packs) || 1;

        // drop whatever the static fallback markup shipped with before recomputing
        const staleBadge = nameEl && nameEl.querySelector('.save-pill');
        if (staleBadge) staleBadge.remove();
        const staleTag = subEl && subEl.querySelector('.opt-tag');
        if (staleTag) staleTag.remove();

        const usable = !!offer && offer.available;
        if (input) input.disabled = !usable;
        opt.classList.toggle('is-unavailable', !usable);
        if (!offer) return;

        const perPack = offer.price / packs;
        opt.dataset.price = money(offer.price);
        const priceEl = opt.querySelector('.opt-price');
        if (priceEl) priceEl.textContent = money(offer.price);
        const unitEl = opt.querySelector('.opt-unit');
        if (unitEl) unitEl.textContent = money(perPack);

        if (baseline && nameEl) {
          const saving = Math.round((1 - perPack / baseline) * 100);
          if (saving >= 1) {
            const badge = document.createElement('span');
            badge.className = 'save-pill';
            badge.textContent = 'Save ' + saving + '%';
            nameEl.appendChild(badge);
          }
        }

        if (usable && (!best || perPack < best.perPack)) best = { opt: opt, perPack: perPack };
      });

      // "Best value" only means something if that plan actually beats buying singles
      if (best && baseline && Math.round((1 - best.perPack / baseline) * 100) >= 1) {
        const subEl = best.opt.querySelector('.opt-sub');
        if (subEl) {
          const tag = document.createElement('span');
          tag.className = 'opt-tag';
          tag.textContent = 'Best value';
          subEl.appendChild(document.createTextNode(' '));
          subEl.appendChild(tag);
        }
      }

      // if the preselected plan turned out to be unavailable, fall to the first that isn't
      const checked = card.querySelector('.plan-picker input[type="radio"]:checked');
      if (!checked || checked.disabled) {
        const next = card.querySelector('.plan-picker input[type="radio"]:not(:disabled)');
        if (next) {
          next.checked = true;
          next.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
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
      const checked = card ? card.querySelector('.plan-picker input[type="radio"]:checked') : null;
      const row = checked ? checked.closest('.purchase-option') : null;
      const wanted = row ? row.dataset.variant : 'Single Pack';
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
