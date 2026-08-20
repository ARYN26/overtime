// OVERTIME — shared site JS

// Mobile nav toggle
const navToggle = document.querySelector('.nav-toggle');
const navLinks = document.querySelector('.nav-links');
if (navToggle) {
  navToggle.addEventListener('click', () => navLinks.classList.toggle('open'));
}

// Home: transparent nav over the video hero → frosted bar on scroll
const nav = document.querySelector('.nav');
if (document.querySelector('.hero')) {
  document.body.classList.add('has-hero');
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 40);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}

// Reveal on scroll
const revealEls = document.querySelectorAll('.reveal');
if (revealEls.length) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.12 });
  revealEls.forEach((el) => io.observe(el));
}

// Count-up stat numbers (Sila-style)
const counters = document.querySelectorAll('.stat-num[data-count]');
if (counters.length) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const animate = (el) => {
    const target = parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    if (reduced) { el.textContent = target + suffix; return; }
    const start = performance.now();
    const dur = 1200;
    const tick = (now) => {
      const t = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  const cio = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { animate(e.target); cio.unobserve(e.target); }
    });
  }, { threshold: 0.5 });
  counters.forEach((el) => cio.observe(el));
}

// Product block: supply-plan picker + thumbnail gallery
const productCard = document.querySelector('.product-card');
if (productCard) {
  // The radio inputs handle exclusivity; we only mirror it onto the row for styling.
  // Browsers restore radio state across a reload, which can leave the restored
  // input disagreeing with the .selected class baked into the markup — so the
  // inputs are the source of truth and the class is derived from them, never the
  // other way round. shopify.js re-fires 'change' after syncing prices and after
  // moving off a sold-out plan, and that bubbles to here.
  const picker = productCard.querySelector('.plan-picker');
  if (picker) {
    const options = picker.querySelectorAll('.purchase-option');
    const sync = () => {
      let checked = picker.querySelector('input[type="radio"]:checked');
      if (!checked) {
        checked = picker.querySelector('input[type="radio"]:not(:disabled)');
        if (checked) checked.checked = true;
      }
      options.forEach((o) => o.classList.toggle('selected', !!checked && o.contains(checked)));
    };
    picker.addEventListener('change', sync);
    sync();
  }

  const mainImg = productCard.querySelector('#prod-main');
  const thumbs = productCard.querySelectorAll('.thumb');
  thumbs.forEach((thumb) => {
    thumb.addEventListener('click', () => {
      thumbs.forEach((t) => t.classList.remove('active'));
      thumb.classList.add('active');
      if (mainImg) mainImg.src = thumb.src;
    });
  });
}

// FAQ: only one open at a time
const faqItems = document.querySelectorAll('.faq-item');
faqItems.forEach((item) => {
  item.addEventListener('toggle', () => {
    if (item.open) faqItems.forEach((o) => { if (o !== item) o.open = false; });
  });
});

// Rotating quote (home)
const quoteEls = document.querySelectorAll('.quotes .quote');
if (quoteEls.length > 1) {
  let qi = 0;
  setInterval(() => {
    quoteEls[qi].classList.remove('active');
    qi = (qi + 1) % quoteEls.length;
    quoteEls[qi].classList.add('active');
  }, 2500);
}

// Auth: account management is handled by Shopify's hosted customer accounts
// (linked from login.html) — the site never collects credentials itself.
