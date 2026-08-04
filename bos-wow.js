/* ============================================================
   bos-wow.js — Couche WOW additive BOS (04/08/2026)
   Reveal d'entree en cascade pour les sites SANS bos-reveal.js
   (maths, argent). Sur les boutiques qui ont deja bos-reveal.js,
   ce script ne fait RIEN (detection du script existant).
   Fail-safe : en cas d'erreur ou de reduced-motion, aucun
   contenu ne reste masque.
   ============================================================ */
(function () {
  try {
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var hasReveal = !!document.querySelector('script[src*="bos-reveal"]');
    if (hasReveal || reduce || !('IntersectionObserver' in window)) {
      /* Rien a faire : ne jamais masquer de contenu */
      return;
    }
    var sels = [
      '.hub-card', '.card-level', '.review-card', '.feature-card',
      '.why-card', '.offer-item', '.section-title', '.badge',
      '.product-card', '.faq-item', '.footer-col'
    ];
    var seen = [];
    sels.forEach(function (s) {
      var nodes = document.querySelectorAll(s);
      for (var i = 0; i < nodes.length; i++) {
        var el = nodes[i];
        if (!el.hasAttribute('data-reveal') && !el.classList.contains('wow-in')) {
          el.classList.add('wow-in');
          seen.push(el);
        }
      }
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-wow'); io.unobserve(e.target); }
      });
    }, { threshold: 0.01, rootMargin: '0px 0px -40px 0px' });
    var vh = window.innerHeight || document.documentElement.clientHeight;
    seen.slice().forEach(function (el) {
      if (el.getBoundingClientRect().top < vh * 0.92) { el.classList.add('is-wow'); }
      io.observe(el);
    });
    /* Backstop dur : apres 5 s, tout element encore masque est revele. */
    window.setTimeout(function () {
      var rest = document.querySelectorAll('.wow-in:not(.is-wow)');
      for (var j = 0; j < rest.length; j++) { rest[j].classList.add('is-wow'); }
    }, 5000);
  } catch (e) {
    var els = document.querySelectorAll('.wow-in');
    for (var k = 0; k < els.length; k++) { els[k].classList.add('is-wow'); }
  }
})();
