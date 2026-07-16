/* ============================================================
   BOS reveal au scroll — TechNova — 16/07/2026
   Auto-applique un fade-up discret aux blocs cles, sans flash :
   les elements deja visibles au chargement sont reveles
   immediatement (aucune frame masquee). Respecte reduced-motion.
   Adapte de la couche Curiosa aux classes reelles TechNova
   (product-card identique a Curiosa ; feature-item/why-card/proof-card
   en plus ; pas de bundle-card/reassurance/story/vip-strip).
   ============================================================ */
(function () {
  try {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!('IntersectionObserver' in window)) return;

    var selectors = [
      '.product-card', '.feature-item', '.why-card', '.proof-card',
      '.section-title', '.section-sub'
    ];

    var seen = [];
    selectors.forEach(function (sel) {
      var nodes = document.querySelectorAll(sel);
      for (var i = 0; i < nodes.length; i++) {
        var el = nodes[i];
        if (!el.hasAttribute('data-reveal')) {
          el.setAttribute('data-reveal', '');
          seen.push(el);
        }
      }
    });

    /* Decalage en cascade a l'interieur des grilles */
    ['.products-grid', '.features-grid', '.testimonials-grid', '.reviews-grid'].forEach(function (gSel) {
      var grids = document.querySelectorAll(gSel);
      for (var g = 0; g < grids.length; g++) {
        var kids = grids[g].children;
        for (var k = 0; k < kids.length; k++) {
          if (kids[k].hasAttribute('data-reveal')) {
            kids[k].setAttribute('data-reveal-delay', String((k % 3) + 1));
          }
        }
      }
    });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.01, rootMargin: '0px 0px -40px 0px' });

    /* Filet de securite : tout element deja depasse par le scroll (haut au-dessus
       du bas du viewport) est revele, meme si l'IO l'a manque sur un scroll rapide
       ou un saut d'ancre. Aucun contenu ne peut donc rester invisible. */
    var safety = function () {
      var vhh = window.innerHeight || document.documentElement.clientHeight;
      for (var i = seen.length - 1; i >= 0; i--) {
        var el = seen[i];
        if (el.classList.contains('is-in')) { seen.splice(i, 1); continue; }
        if (el.getBoundingClientRect().top < vhh) { el.classList.add('is-in'); io.unobserve(el); seen.splice(i, 1); }
      }
    };
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return; ticking = true;
      window.requestAnimationFrame(function () { safety(); ticking = false; });
    }, { passive: true });

    /* Meme pass synchrone : les elements au-dessus de la ligne de flottaison
       recoivent 'is-in' avant tout repaint => aucun flash masque->visible. */
    var vh = window.innerHeight || document.documentElement.clientHeight;
    seen.slice().forEach(function (el) {
      var top = el.getBoundingClientRect().top;
      if (top < vh * 0.88) { el.classList.add('is-in'); }
      io.observe(el);
    });

    /* Backstop dur : apres 5 s, tout element encore masque est revele coute que coute.
       Garantit qu'aucun contenu ne reste jamais invisible, meme si IO + scroll echouent
       (ex. dernier bloc au ras du footer, saut d'ancre, scroll inertiel). L'animation
       reste active pour le scroll normal avant cette echeance. */
    window.setTimeout(function () {
      var nodes = document.querySelectorAll('[data-reveal]:not(.is-in)');
      for (var i = 0; i < nodes.length; i++) { nodes[i].classList.add('is-in'); }
    }, 5000);

    /* ---- Barre d'achat sticky mobile (fiches produit) ----
       Construite depuis le 1er bouton [data-add-cart] de la page
       (TechNova utilise deja cet attribut, comme Curiosa) : zero
       duplication de logique (le clic proxifie le vrai bouton, donc
       panier + Stripe + compteurs restent la source unique). Si
       l'ancienne barre bos-sticky-cta.js tourne encore sur une page
       (residu), on ne construit pas la notre par-dessus pour eviter
       2 barres empilees. */
    (function stickyAtc() {
      if (document.querySelector('.bos-sticky-atc') || document.querySelector('.bos-sticky-cta')) return;
      var mainBtn = document.querySelector('[data-add-cart]') || document.querySelector('.add-to-cart-btn');
      if (!mainBtn) return;
      var name = mainBtn.getAttribute('data-name') || document.title.split(String.fromCharCode(8212))[0];
      var price = mainBtn.getAttribute('data-price');

      var bar = document.createElement('div');
      bar.className = 'bos-sticky-atc';
      var meta = document.createElement('div');
      meta.className = 'bos-sticky-atc__meta';
      var priceEl = document.createElement('div');
      priceEl.className = 'bos-sticky-atc__price';
      priceEl.textContent = price ? (price + ' €') : '';
      var nameEl = document.createElement('div');
      nameEl.className = 'bos-sticky-atc__name';
      nameEl.textContent = name || '';
      meta.appendChild(priceEl); meta.appendChild(nameEl);
      var btn = document.createElement('button');
      btn.className = 'bos-sticky-atc__btn';
      btn.type = 'button';
      btn.textContent = 'Ajouter au panier';
      btn.addEventListener('click', function () {
        mainBtn.click();
        btn.textContent = '✓ Ajouté au panier';
        window.setTimeout(function () { btn.textContent = 'Ajouter au panier'; }, 2200);
      });
      bar.appendChild(meta); bar.appendChild(btn);
      document.body.appendChild(bar);

      /* Visible uniquement quand le CTA principal est hors ecran (au-dessus) */
      var toggle = function (show) {
        bar.classList.toggle('is-visible', show);
        document.body.classList.toggle('bos-atc-open', show);
      };
      if ('IntersectionObserver' in window) {
        var obs = new IntersectionObserver(function (entries) {
          var e = entries[0];
          toggle(!e.isIntersecting && e.boundingClientRect.top < 0);
        }, { threshold: 0 });
        obs.observe(mainBtn);
      } else {
        toggle(true);
      }
    })();

    /* ---- Header auto-masquant au scroll (16/07, demande Fred) ----
       Descente = le menu se range ; remontee = il revient. Ne se cache
       jamais quand le menu mobile est ouvert. */
    (function autoHideHeader() {
      var h = document.querySelector('.header') || document.querySelector('header');
      if (!h) return;
      var lastY = window.scrollY, tk = false;
      window.addEventListener('scroll', function () {
        if (tk) return; tk = true;
        window.requestAnimationFrame(function () {
          var y = window.scrollY;
          var menuOpen = document.querySelector('.mobile-menu.open');
          if (!menuOpen && y > lastY + 8 && y > 160) h.classList.add('bos-nav-hidden');
          else if (y < lastY - 8 || y <= 160) h.classList.remove('bos-nav-hidden');
          lastY = y; tk = false;
        });
      }, { passive: true });
    })();
  } catch (err) { /* en cas d'erreur, on laisse le contenu visible (CSS reduced-motion non atteint : fail-safe) */
    document.querySelectorAll('[data-reveal]').forEach(function (el) { el.classList.add('is-in'); });
  }
})();
