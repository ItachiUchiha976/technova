/* BOS — Checkout Stripe (Payment Links, 0 backend). Ajout 08/07/2026.
   Ajoute un bouton "Payer par carte" a cote du bouton PayPal.
   Encaisse vers le compte Stripe soulefred@hotmail.fr. */

(function(){
  'use strict';

  // Mapping produit -> lien Stripe (nom du produit normalise)
  var STRIPE_LINKS = {
    // SérénLab
    'masque-led-visage':    'https://buy.stripe.com/6oUcN5fbddLH7aa2ck5Vu06',
    'masque-sommeil-bluetooth': 'https://buy.stripe.com/bJe00j0gjcHDdyycQY5Vu07',
    'masque-gel-yeux':      'https://buy.stripe.com/5kQ8wPbZ15fb7aa7wE5Vu08',
    'kit-gua-sha-premium':  'https://buy.stripe.com/eVq28r3sv4b7eCC6sA5Vu09',
    'oreiller-rafraichissant': 'https://buy.stripe.com/fZubJ1gfhfTPamm2ck5Vu0a',
    'machine-a-sons-blancs': 'https://buy.stripe.com/dRmeVdfbd22Z9ii9EM5Vu0b',
    'lampe-de-lecture-led': 'https://buy.stripe.com/cNi4gz2or0YV7aa8AI5Vu0c',
    'masque-de-nuit-premium': 'https://buy.stripe.com/4gM5kD3sv373fGG9EM5Vu0d',
    // Curiosa
    'lampe-lune-3d':        'https://buy.stripe.com/aFabJ18MPePLbqq6sA5Vu00',
    'boite-mystere-puzzle': 'https://buy.stripe.com/cNiaEX1kn0YV3XY6sA5Vu01',
    'sablier-magnetique':   'https://buy.stripe.com/dRm9AT0gjdLH8ee18g5Vu02',
    'journal-infini':       'https://buy.stripe.com/5kQcN5gfhbDz522bMU5Vu03',
    'statue-bastet':        'https://buy.stripe.com/8x23cvbZ19vr52218g5Vu04',
    'carte-du-monde-vintage': 'https://buy.stripe.com/3cIbJ1d358rn522eZ65Vu05',
    // TechNova
    'enceinte-bluetooth-vintage': 'https://buy.stripe.com/8x2aEX0gjcHD2TU4ks5Vu0e',
    'mini-projecteur-portable':   'https://buy.stripe.com/8x24gzd354b79ii7wE5Vu0f',
    'microphone-pro-streaming':   'https://buy.stripe.com/6oU9AT9QTgXTcuug3a5Vu0g',
    'ecran-secondaire-portable':  'https://buy.stripe.com/cNifZh8MPePL9iieZ65Vu0h',
    'mini-imprimante-portable':   'https://buy.stripe.com/14A28r4wzePLammeZ65Vu0i',
    'chargeur-sans-fil-3-en-1':   'https://buy.stripe.com/6oU3cv7IL4b72TU6sA5Vu0j',
    'ventilateur-portable':       'https://buy.stripe.com/28EdR9bZ19vrdyycQY5Vu0k',
    'lampe-led-bureau':           'https://buy.stripe.com/6oUdR9gfh9vr3XYcQY5Vu0l',
    // FocusLab
    'timer-pomodoro':             'https://buy.stripe.com/4gM28r7ILcHD522g3a5Vu0m',
    'tapis-bureau-premium':       'https://buy.stripe.com/8x2fZh0gjfTPeCC2ck5Vu0n',
    'organisateur-cables':        'https://buy.stripe.com/5kQ3cv9QTbDzeCC5ow5Vu0o',
    'tiroir-sous-bureau':         'https://buy.stripe.com/eVq14ngfh4b7amm18g5Vu0p',
    'support-pc-portable':        'https://buy.stripe.com/cNi14n8MP6jfcuu3go5Vu0q',
    'lampe-led-focus':            'https://buy.stripe.com/4gM4gz4wz4b76669EM5Vu0r',
    'barre-lumineuse-ecran':      'https://buy.stripe.com/cNi8wPd35dLHcuu6sA5Vu0s',
    // FootPerf
    'balle-de-reaction':          'https://buy.stripe.com/5kQ6oH2orcHDgKK6sA5Vu0t',
    'echelle-d-agilite':          'https://buy.stripe.com/3cIeVdgfh5fbcuu4ks5Vu0u',
    'cones-de-marquage':          'https://buy.stripe.com/aFa14ngfh8rn52204c5Vu0v',
    'parachute-de-resistance':    'https://buy.stripe.com/fZu14nbZ1bDz1PQg3a5Vu0w',
    'gants-gardien-pro':          'https://buy.stripe.com/5kQ4gz0gjfTPbqqaIQ5Vu0x',
    'protege-tibias-carbone':     'https://buy.stripe.com/bJe3cv9QT3732TUg3a5Vu0y',
    'cible-de-precision':         'https://buy.stripe.com/8x214n8MPdLH52218g5Vu0z',
    'buts-pop-up':                'https://buy.stripe.com/bJe3cv4wz5fb522bMU5Vu0A',
  };

  // Normaliser un nom de produit pour le matching
  function normalize(str) {
    return str.toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '') // enlever accents
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  // Trouver le produit sur cette page
  function findProductKey() {
    // Chercher dans l'URL (ex: /produit-masque-led.html)
    var path = location.pathname.replace(/\.html?$/, '').split('/').pop();
    if (path && path !== 'index') {
      var key = normalize(path.replace(/^produit-/, ''));
      if (STRIPE_LINKS[key]) return key;
    }

    // Chercher dans un attribut data-stripe-product sur la page
    var el = document.querySelector('[data-stripe-product]');
    if (el) {
      var key = normalize(el.getAttribute('data-stripe-product'));
      if (STRIPE_LINKS[key]) return key;
    }

    // Chercher dans le titre h1
    var h1 = document.querySelector('h1');
    if (h1) {
      var key = normalize(h1.textContent);
      if (STRIPE_LINKS[key]) return key;
    }

    return null;
  }

  // Ajouter le bouton Stripe a cote du PayPal
  function addStripeButton(productKey) {
    var link = STRIPE_LINKS[productKey] || null;
    var isCart = location.pathname.indexOf('panier') !== -1;
    if (!link && !isCart) return;

    // Chercher un conteneur de checkout existant
    var container = document.querySelector('.checkout-stripe') ||
                    document.getElementById('stripe-btn-container');

    if (!container) {
      // Chercher un ancrage : priorité PayPal, sinon bouton add-cart, sinon h1
      var anchor = document.querySelector('.paypal-btn, #paypal-btn, [onclick*="bosPayPalCheckout"], button[onclick*="paypal"]') ||
                   document.querySelector('.btn-checkout') ||  // bouton principal du panier
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

    // Creer le bouton Stripe
    var btn = document.createElement('a');
    btn.href = link || '#checkout';
    btn.target = '_top';
    btn.rel = 'noopener';
    btn.className = 'btn btn-stripe';
    btn.innerHTML = '<span style="display:flex;align-items:center;justify-content:center;gap:8px;">' +
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 4.5c-2.5 0-4.5 2-4.5 4.5s2 4.5 4.5 4.5 4.5-2 4.5-4.5-2-4.5-4.5-4.5z"/><rect x="2" y="4" width="20" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>' +
      '<span>Payer par carte</span></span>';
    btn.style.cssText = 'display:inline-block;padding:12px 32px;background:#635BFF;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;transition:background 0.2s;';
    btn.onmouseover = function(){ this.style.background = '#4F46E5'; };
    btn.onmouseout  = function(){ this.style.background = '#635BFF'; };

    container.appendChild(btn);

    // Tracking Umami
    try {
      if (window.umami && typeof umami.track === 'function') {
        umami.track('view_stripe_button', {product: productKey, page: location.pathname});
      }
    } catch(e) {}
  }

  // Init au chargement — toujours actif sur le panier
  function init() {
    var isCart = location.pathname.indexOf('panier') !== -1;
    var key = findProductKey();

    // Sur le panier sans produit trouvé : chercher dans le localStorage
    if (isCart && !key) {
      key = findCartProductKey();
    }

    if (isCart || key) {
      addStripeButton(key || 'panier');
    }
  }

  // Mapping ID panier → clé Stripe
  var CART_ID_TO_STRIPE = {
    'lune-levitation-001': 'lampe-lune-3d',
    'boite-enigme-001': 'boite-mystere-puzzle',
    'sablier-001': 'sablier-magnetique',
    'carnet-001': 'journal-infini',
    'statuette-001': 'statue-bastet',
    'carte-001': 'carte-du-monde-vintage',
  };

  // Trouver le produit le plus cher du panier localStorage
  function findCartProductKey() {
    try {
      var cartKeys = ['curiosa_cart', 'serenlab_cart', 'technova_cart', 'focuslab_cart', 'footperf_cart'];
      for (var c = 0; c < cartKeys.length; c++) {
        var cart = JSON.parse(localStorage.getItem(cartKeys[c]) || '[]');
        if (cart.length > 0) {
          // Produit le plus cher
          var sorted = cart.slice().sort(function(a, b) { return b.price - a.price; });
          for (var i = 0; i < sorted.length; i++) {
            var sk = CART_ID_TO_STRIPE[sorted[i].id];
            if (sk && STRIPE_LINKS[sk]) return sk;
            // Fallback: normaliser le nom
            var nk = normalize(sorted[i].name || '');
            if (STRIPE_LINKS[nk]) return nk;
          }
        }
      }
    } catch(e) {}
    return null;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
