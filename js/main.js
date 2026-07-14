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

// Product block: variant pills (price swap) + thumbnail gallery
const productCard = document.querySelector('.product-card');
if (productCard) {
  const pills = productCard.querySelectorAll('.variant-pills .pill');
  const priceEl = productCard.querySelector('#prod-price');
  const perEl = productCard.querySelector('#prod-per');
  pills.forEach((pill) => {
    pill.addEventListener('click', () => {
      pills.forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      if (priceEl && pill.dataset.price) priceEl.textContent = pill.dataset.price;
      if (perEl && pill.dataset.per) perEl.textContent = pill.dataset.per;
    });
  });

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

// Auth page: tabs + first-signup discount modal after 5s
const authForm = document.getElementById('auth-form');
if (authForm) {
  const tabs = document.querySelectorAll('.auth-tab');
  const submitBtn = authForm.querySelector('button[type="submit"]');
  const nameField = document.getElementById('name-field');
  let mode = 'login';

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      mode = tab.dataset.mode;
      nameField.style.display = mode === 'signup' ? '' : 'none';
      submitBtn.textContent = mode === 'signup' ? 'Create account' : 'Log in';
    });
  });

  authForm.addEventListener('submit', (e) => {
    e.preventDefault();
    localStorage.setItem('overtime_user', '1');
    submitBtn.textContent = mode === 'signup' ? 'Welcome to the team ✓' : 'Logged in ✓';
    // First-time signup → discount modal after 5 seconds
    if (mode === 'signup' && !localStorage.getItem('overtime_discount_shown')) {
      localStorage.setItem('overtime_discount_shown', '1');
      setTimeout(() => {
        document.getElementById('discount-modal').classList.add('show');
      }, 5000);
    }
  });

  const modal = document.getElementById('discount-modal');
  modal.addEventListener('click', (e) => {
    if (e.target === modal || e.target.closest('.modal-close')) modal.classList.remove('show');
  });
}
