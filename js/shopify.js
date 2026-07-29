// OVERTIME — Shopify Buy Button integration
//
// Purchase options are prepaid supply bundles (everything ships at once):
//   Single Pack $16.99 · 3-Month Supply $42.99 · 6-Month Supply $79.99 · Annual Supply $139.99
//
// Each .variant-pills .pill carries data-variant matching a Shopify variant
// title on the product. Until a variant exists in Shopify, its pill's Add to
// Cart falls back to the button's plain href (the Shopify product page), so a
// missing variant can never charge the wrong amount.

const SHOPIFY_CONFIG = {
  domain: 'y9t80a-dv.myshopify.com',
  storefrontAccessToken: '398e08a9555db8674696dc81e1986bf2',
  productId: '9233890672861',
};

(function () {
  const configured = !Object.values(SHOPIFY_CONFIG).some((v) => String(v).includes('REPLACE_ME'));
  const cartButtons = document.querySelectorAll('[data-add-to-cart]');
  if (!configured || !cartButtons.length) return;

  const SDK_URL = 'https://sdks.shopifycdn.com/buy-button/latest/buy-button-storefront.min.js';
  const BRAND = { blue: '#2f7bff', blueHot: '#4d9aff', font: '"Inter", sans-serif' };

  const money = (amount) => '$' + Number(amount).toFixed(2);
  const variantPrice = (variant) => (variant.price && variant.price.amount) || variant.price;

  function loadSdk(cb) {
    if (window.ShopifyBuy && window.ShopifyBuy.UI) { cb(); return; }
    const script = document.createElement('script');
    script.src = SDK_URL;
    script.async = true;
    script.onload = cb;
    document.head.appendChild(script);
  }

  loadSdk(() => {
    const client = ShopifyBuy.buildClient({
      domain: SHOPIFY_CONFIG.domain,
      storefrontAccessToken: SHOPIFY_CONFIG.storefrontAccessToken,
    });

    const productGid = /^\d+$/.test(String(SHOPIFY_CONFIG.productId))
      ? 'gid://shopify/Product/' + SHOPIFY_CONFIG.productId
      : SHOPIFY_CONFIG.productId;

    let cart = null;
    let variantByTitle = null;

    ShopifyBuy.UI.onReady(client).then((ui) => {
      ui.createComponent('cart', {
        options: {
          cart: {
            popup: false,
            text: { title: 'Your Cart', button: 'Checkout', total: 'Subtotal' },
            styles: {
              button: {
                'font-family': BRAND.font,
                'font-weight': '600',
                'background-color': BRAND.blue,
                'border-radius': '10px',
                ':hover': { 'background-color': BRAND.blueHot },
                ':focus': { 'background-color': BRAND.blueHot },
              },
            },
          },
          toggle: {
            styles: {
              toggle: {
                'font-family': BRAND.font,
                'background-color': BRAND.blue,
                ':hover': { 'background-color': BRAND.blueHot },
                ':focus': { 'background-color': BRAND.blueHot },
              },
            },
          },
          lineItem: {
            styles: { variantTitle: { color: '#5a636e' }, title: { color: '#0e1116' } },
          },
        },
      }).then((component) => { cart = component; });
    });

    // Live product data: map each pill to its Shopify variant and show real prices
    client.product.fetch(productGid).then((product) => {
      const variants = product.variants || [];
      const byTitle = {};
      variants.forEach((v) => { byTitle[v.title] = v; });
      // A store that hasn't set up bundle variants yet has one "Default Title"
      // variant — treat it as the single pack.
      if (!byTitle['Single Pack'] && variants[0] && variants[0].title === 'Default Title') {
        byTitle['Single Pack'] = variants[0];
      }
      variantByTitle = byTitle;

      document.querySelectorAll('.product-card').forEach((card) => {
        card.querySelectorAll('.variant-pills .pill[data-variant]').forEach((pill) => {
          const variant = byTitle[pill.dataset.variant];
          if (variant) pill.dataset.price = money(variantPrice(variant));
        });
        const active = card.querySelector('.variant-pills .pill.active');
        const priceEl = card.querySelector('#prod-price');
        if (active && priceEl && active.dataset.price) priceEl.textContent = active.dataset.price;
      });
    }).catch((err) => console.error('Shopify product fetch failed:', err));

    cartButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const card = btn.closest('.product-card');
        const active = card ? card.querySelector('.variant-pills .pill.active') : null;
        const wanted = active ? active.dataset.variant : 'Single Pack';
        const variant = variantByTitle && variantByTitle[wanted];
        if (cart && variant) {
          e.preventDefault();
          cart.open();
          cart.addVariantToCart(variant, 1);
        }
        // else: fall through to the button's href fallback
      });
    });
  });
})();
