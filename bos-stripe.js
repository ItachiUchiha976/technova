/* BOS — Checkout Stripe. Ajout 08/07/2026.
   - Pages produit : lien direct Stripe Payment Link (1 produit = 1 lien).
   - Page panier : endpoint VPS qui crée une session checkout avec le montant exact.
   Encaisse vers le compte Stripe de la boutique. */

(function(){
  'use strict';

  // API VPS (Cloudflare Tunnel HTTPS → reverse proxy → Node Stripe)
  var STRIPE_API = 'https://api.tonargentexplique.fr/create-checkout-session';

  // Mapping produit -> lien Stripe Payment Link (pages produit)
  var STRIPE_LINKS = {
    'masque-led-visage':    'https://buy.stripe.com/6oUcN5fbddLH7aa2ck5Vu06',
    'masque-sommeil-bluetooth': 'https://buy.stripe.com/bJe00j0gjcHDdyycQY5Vu07',
    'masque-gel-yeux':      'https://buy.stripe.com/5kQ8wPbZ15fb7aa7wE5Vu08',
    'kit-gua-sha-premium':  'https://buy.stripe.com/eVq28r3sv4b7eCC6sA5Vu09',
    'oreiller-rafraichissant': 'https://buy.stripe.com/fZubJ1gfhfTPamm2ck5Vu0a',
    'machine-a-sons-blancs': 'https://buy.stripe.com/dRmeVefbd22Z9ii9EM5Vu0b',
    'lampe-de-lecture-led': 'https://buy.stripe.com/cNi4gz2or0YV7aa8AI5Vu0c',
    'masque-de-nuit-premium': 'https://buy.stripe.com/4gM5kD3sv373fGG9EM5Vu0d',
    'enceinte-bluetooth-vintage': 'https://buy.stripe.com/8x2aEX0gjcHD2TU4ks5Vu0e',
    'mini-projecteur-portable':   'https://buy.stripe.com/8x24gzd354b79ii7wE5Vu0f',
    'microphone-pro-streaming':   'https://buy.stripe.com/6oU9AT9QTgXTcuug3a5Vu0g',
    'ecran-secondaire-portable':  'https://buy.stripe.com/cNifZh8MPePL9iieZ65Vu0h',
    'mini-imprimante-portable':   'https://buy.stripe.com/14A28r4wzePLammeZ65Vu0i',
    'chargeur-sans-fil-3-en-1':   'https://buy.stripe.com/6oU3cv7IL4b72TU6sA5Vu0j',
    'ventilateur-portable':       'https://buy.stripe.com/28EdR9bZ19vrdyycQY5Vu0k',
    'lampe-led-bureau':           'https://buy.stripe.com/6oUdR9gfh9vr3XYcQY5Vu0l',
    'timer-pomodoro':             'https://buy.stripe.com/4gM28r7ILcHD522g3a5Vu0m',
    'tapis-bureau-premium':       'https://buy.stripe.com/8x2fZh0gjfTPeCC2ck5Vu0n',
    'organisateur-cables':        'https://buy.stripe.com/5kQ3cv9QTbDzeCC5ow5Vu0o',
    'tiroir-sous-bureau':         'https://buy.stripe.com/eVq14ngfh4b7amm18g5Vu0p',
    'support-pc-portable':        'https://buy.stripe.com/cNi14n8MP6jfcuu3go5Vu0q',
    'lampe-led-focus':            'https://buy.stripe.com/4gM4gz4wz4b76669EM5Vu0r',
    'barre-lumineuse-ecran':      'https://buy.stripe.com/cNi8wPd35dLHcuu6sA5Vu0s',
    'balle-de-reaction':          'https://buy.stripe.com/5kQ6oH2orcHDgKK6sA5Vu0t',
    'echelle-d-agilite':          'https://buy.stripe.com/3cIeVdgfh5fbcuu4ks5Vu0u',
    'cones-de-marquage':          'https://buy.stripe.com/aFa14ngfh8rn52204c5Vu0v',
    'parachute-de-resistance':    'https://buy.stripe.com/fZu14nbZ1bDz1PQg3a5Vu0w',
    'gants-gardien-pro':          'https://buy.stripe.com/5kQ4gz0gjfTPbqqaIQ5Vu0x',
    'protege-tibias-carbone':     'https://buy.stripe.com/bJe3cv9QT3732TUg3a5Vu0y',
    'cible-de-precision':         'https://buy.stripe.com/8x214n8MPdLH52218g5Vu0z',
    'buts-pop-up':                'https://buy.stripe.com/bJe3cv4wz5fb522bMU5Vu0A',
  };

  var CART_ID_TO_STRIPE = {};

  function normalize(str) {
    return str.toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function findProductKey() {
    var path = location.pathname.replace(/\.html?$/, '').split('/').pop();
    if (path && path !== 'index') {
      var key = normalize(path.replace(/^produit-/, ''));
      if (STRIPE_LINKS[key]) return key;
    }
    var el = document.querySelector('[data-stripe-product]');
    if (el) {
      var key = normalize(el.getAttribute('data-stripe-product'));
      if (STRIPE_LINKS[key]) return key;
    }
    var h1 = document.querySelector('h1');
    if (h1) {
      var key = normalize(h1.textContent);
      if (STRIPE_LINKS[key]) return key;
    }
    return null;
  }

  // Lire le total RÉDUIT du panier (prix vert = avec -10%)
  function getCartTotal() {
    // Priorité : le prix en vert dans le DOM (déjà réduit par app.js)
    var greenPrice = document.querySelector('.cart-total span[style*="color:#10b981"], .cart-total span[style*="color: #10b981"]');
    if (greenPrice) {
      var m = greenPrice.textContent.match(/(\d+[.,]\d{2})/);
      if (m) return parseFloat(m[1].replace(',', '.'));
    }
    // Fallback : dernier nombre dans le total (le prix réduit est après le barré)
    var totalEl = document.querySelector('.cart-total h3');
    if (totalEl) {
      var matches = totalEl.textContent.match(/\d+[.,]\d{2}/g);
      if (matches && matches.length > 0) {
        // Prendre le DERNIER prix (le réduit, après le barré)
        return parseFloat(matches[matches.length - 1].replace(',', '.'));
      }
    }
    // Fallback : localStorage (même calcul que app.js)
    try {
      var keys = ['curiosa_cart', 'serenlab_cart', 'technova_cart', 'focuslab_cart', 'footperf_cart'];
      for (var c = 0; c < keys.length; c++) {
        var cart = JSON.parse(localStorage.getItem(keys[c]) || '[]');
        if (cart.length > 0) {
          var subtotal = cart.reduce(function(s, i) { return s + i.price * i.qty; }, 0);
          var maxPrice = Math.max.apply(null, cart.map(function(i) { return i.price; }));
          return subtotal - maxPrice * 0.10;
        }
      }
    } catch(e) {}
    return 0;
  }

  var _stripeDone = false;
  function addStripeButton(productKey) {
    if (_stripeDone) return;
    var isCart = location.pathname.indexOf('panier') !== -1 || !!document.getElementById('cartFooter');
    var link = productKey ? (STRIPE_LINKS[productKey] || null) : null;
    if (!link && !isCart) return;

    var container = document.querySelector('.checkout-stripe') || document.getElementById('stripe-btn-container');
    if (!container) {
      var anchor = document.querySelector('.btn-checkout') ||
                   document.querySelector('.btn-addcart, [data-add-cart]') ||
                   document.querySelector('h1');
      if (anchor && anchor.parentNode) {
        container = document.createElement('div');
        container.className = 'checkout-stripe';
        container.style.cssText = 'margin-top:12px;text-align:center;';
        anchor.parentNode.insertBefore(container, anchor.nextSibling);
      }
    }
    if (!container) return;

    var btn = document.createElement(isCart ? 'button' : 'a');
    if (link) { btn.href = link; btn.target = '_top'; btn.rel = 'noopener'; }
    btn.className = isCart ? 'btn btn-stripe-cart' : 'btn btn-stripe';
    btn.innerHTML = '<span style="display:flex;align-items:center;justify-content:center;gap:8px;">' +
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 4.5c-2.5 0-4.5 2-4.5 4.5s2 4.5 4.5 4.5 4.5-2 4.5-4.5-2-4.5-4.5-4.5z"/><rect x="2" y="4" width="20" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>' +
      '<span>💳 Payer par CB</span></span>';
    btn.style.cssText = 'display:inline-block;width:100%;max-width:400px;padding:14px 24px;background:#635BFF;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;cursor:pointer;border:none;transition:background 0.2s;';
    btn.onmouseover = function(){ this.style.background = '#4F46E5'; };
    btn.onmouseout  = function(){ this.style.background = '#635BFF'; };

    if (isCart) {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        var total = getCartTotal();
        if (total <= 0) { alert('Ton panier est vide.'); return; }
        btn.textContent = '⏳ Redirection vers Stripe...';
        btn.disabled = true;
        fetch(STRIPE_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: total, currency: 'eur' }),
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (data.url) { window.location.href = data.url; }
          else { alert('Erreur de paiement : ' + (data.error || 'inconnue')); btn.textContent = '💳 Payer par CB'; btn.disabled = false; }
        })
        .catch(function(err) {
          alert('Impossible de contacter le serveur de paiement. Réessaie dans quelques instants.');
          btn.textContent = '💳 Payer par CB';
          btn.disabled = false;
        });
      });
    }

    container.appendChild(btn);
    _stripeDone = true;

    try {
      if (window.umami && typeof umami.track === 'function') {
        umami.track('view_stripe_button', {page: location.pathname});
      }
    } catch(e) {}
  }

  function init() {
    // Détecter page panier OU panier intégré (FootPerf one-page)
    var isCart = location.pathname.indexOf('panier') !== -1 || !!document.getElementById('cartFooter');
    if (isCart) {
      addStripeButton(null);
    } else {
      var key = findProductKey();
      if (key) addStripeButton(key);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Exposer pour les paniers dynamiques (FootPerf)
  window.initStripe = init;
})();
