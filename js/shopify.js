// OVERTIME — Shopify Buy Button integration
//
// SETUP: paste the three values from your Buy Button embed code below.
// (Shopify admin → Sales channels → Buy Button → create a Buy Button for the
// product → "Copy code" → the snippet contains domain, storefrontAccessToken,
// and the product id.)
//
// Until these are filled in, the site falls back to the plain links in the HTML.

const SHOPIFY_CONFIG = {
  domain: 'y9t80a-dv.myshopify.com',
  storefrontAccessToken: '398e08a9555db8674696dc81e1986bf2',
  productId: '9233890672861',
  // Optional: where the "Subscribe & Save" purchase happens (Shopify-hosted
  // product page with the subscription widget). Leave '' to auto-use the
  // store's product page.
  // Hardcoded to the permanent myshopify.com URL: the store's primary domain is
  // currently overtimestrips.com (the old site), which will stop pointing at
  // Shopify once this static site takes over the domain.
  subscribeUrl: 'https://y9t80a-dv.myshopify.com/products/nasal-strips',
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
    let oneTimeVariant = null;
    let subscribeUrl = SHOPIFY_CONFIG.subscribeUrl;

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

    // Live product data: real variant for the cart + real prices in the UI
    client.product.fetch(productGid).then((product) => {
      oneTimeVariant = product.variants[0];
      if (!subscribeUrl) {
        subscribeUrl = product.onlineStoreUrl
          || 'https://' + SHOPIFY_CONFIG.domain + '/products/' + product.handle;
      }

      const price = Number(variantPrice(oneTimeVariant));
      document.querySelectorAll('.product-card').forEach((card) => {
        const pills = card.querySelectorAll('.variant-pills .pill');
        if (pills[0]) pills[0].dataset.price = money(price);
        if (pills[1]) pills[1].dataset.price = money(price * 0.75);
        const active = card.querySelector('.variant-pills .pill.active');
        const priceEl = card.querySelector('#prod-price');
        if (active && priceEl) priceEl.textContent = active.dataset.price;
      });
    }).catch((err) => console.error('Shopify product fetch failed:', err));

    cartButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const card = btn.closest('.product-card');
        const pills = card ? card.querySelectorAll('.variant-pills .pill') : [];
        const subscribeSelected = pills[1] && pills[1].classList.contains('active');

        if (subscribeSelected && subscribeUrl) {
          e.preventDefault();
          window.location.href = subscribeUrl;
          return;
        }
        if (cart && oneTimeVariant) {
          e.preventDefault();
          cart.open();
          cart.addVariantToCart(oneTimeVariant, 1);
        }
        // else: fall through to the button's href fallback
      });
    });
  });
})();
