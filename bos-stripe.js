/* BOS — Checkout Stripe. Ajout 08/07/2026.
   - Pages produit : lien direct Stripe Payment Link (1 produit = 1 lien).
   - Page panier : endpoint VPS qui crée une session checkout avec le montant exact.
   Encaisse vers le compte Stripe de la boutique. */

(function(){
  'use strict';

  /* ─────────────────────────────────────────────────────────────────────────
     BOS 29/07/2026 — GARDE-FOU « PRODUIT NON LIVRABLE »

     Pourquoi : 24 des 47 produits du mapping d'expédition n'ont AUCUN SKU
     fournisseur (`cj_sku: null`, vérifié sur l'API CJ le 28/07). Leur page
     restait pourtant entièrement achetable : un client pouvait payer un
     article que nous ne savons pas commander. Le back-office alerte bien
     dans ce cas, mais l'argent est déjà encaissé et le client attend.

     Ce garde-fou coupe la vente EN AMONT : plus de bouton de paiement, plus
     d'ajout au panier, et un message honnête à la place. La page reste en
     ligne (référencement, catalogue) — seul l'achat est suspendu.

     Pour remettre un produit en vente : retirer sa clé de la liste ci-dessous
     APRÈS avoir renseigné son cj_sku dans fulfillment_products.json, et
     seulement si les photos de la page correspondent au produit réel (§12.23).
     ───────────────────────────────────────────────────────────────────────── */
  /* MAJ 29/07/2026 : 4 produits RETIRES de cette liste apres re-sourcing par
     recherche d'image CJ (BOITE 101) et verification de marge :
     lampe-de-lecture-led, oreiller-rafraichissant, masque-bluetooth-duo,
     microphone-pro-streaming. Ils sont de nouveau achetables. */
  /* Produits RETIRÉS DÉFINITIVEMENT (aucun fournisseur ne tient leur prix public).
     Ils méritent un message différent de « temporairement indisponible » : des
     publicités déjà en ligne renvoient encore vers ces pages (une épingle Pinterest
     annonce même l'imprimante à 49 €), et l'API ne permet pas de les supprimer sur
     Pinterest/Instagram/TikTok. Plutôt qu'un cul-de-sac trompeur, on dit la vérité
     et on renvoie vers le reste de la boutique. */
  var BOS_RETIRES = ['mini-imprimante-portable', 'buts-pop-up'];
  var BOS_PAGES_RETIREES = ['produit-imprimante-thermique', 'produit-buts-pop-up'];

  /* ⚠️ CAS PARTICULIER — une PAGE D'ACCUEIL peut être elle-même une page produit.
     Trou découvert le 29/07/2026 : footperf.fr/ vendait les buts pop-up à 44,00 €
     (panier + carte + PayPal) alors que le produit coûte 51,57 USD port compris et
     n'a aucun SKU dans le mapping — donc vente à perte ET aucune commande
     fournisseur n'aurait été créée. Le garde-fou ne voyait rien parce qu'il
     identifie le produit par le NOM DE FICHIER, et l'accueil s'appelle « index ».
     Un but de foot est encombrant : 40 USD de fret pour un article à 11 USD. Aucun
     fournisseur ne changera cela, et c'est une commodité qu'on trouve en magasin
     (§12.27) → produit retiré, la boutique garde son Guide Coupe du Monde à 4,90 €,
     qui est digital, livré automatiquement et sans aucun coût fournisseur. */
  var BOS_ACCUEILS_PRODUIT = { 'footperf.fr': 'buts-pop-up' };

  var BOS_NON_LIVRABLES = [
    'balle-de-reaction',
    'bundle-ecran',
    'cible-de-precision',
    'cones-de-marquage',
    'echelle-agilite',
    'ecran-secondaire-portable',
    'enceinte-bluetooth-vintage',
    'gants-gardien-pro',
    'lampe-led-focus',
    'masque-de-nuit-premium',
    'microphone-pro-streaming',
    'mini-imprimante-portable',
    'parachute-de-resistance',
    'protege-tibias-carbone',
    'tiroir-sous-bureau'
  ];

  /* Les URL des pages ne reprennent pas toujours la clé du mapping
     (ex. « produit-micro-cravate.html » = microphone-pro-streaming).
     On liste donc aussi les noms de fichiers réellement en ligne. */
  var BOS_PAGES_NON_LIVRABLES = [
    'produit-bundle-ecran-trepied',
    'produit-imprimante-thermique',
    'produit-lampe-led',
    'produit-micro-cravate',
    'produit-tiroir-invisible'
  ];

  /* Exposé au reste de la page : le menu catalogue (bos-nav-produits.js) s'en sert
     pour ne PAS proposer un produit qu'on ne peut pas vendre. Une seule source de
     vérité, donc aucun risque que le menu et le bouton d'achat se contredisent. */
  window.BOS_NON_LIVRABLES = BOS_NON_LIVRABLES;
  window.BOS_PAGES_NON_LIVRABLES = BOS_PAGES_NON_LIVRABLES;

  /* Charge le menu catalogue. Passer par ici plutot que d'ajouter une balise
     <script> dans les dizaines de pages produit : un seul point d'entree, et le
     menu s'execute forcement APRES que les listes ci-dessus existent. */
  (function () {
    if (document.getElementById('bos-nav-produits-js')) return;
    var s = document.createElement('script');
    s.id = 'bos-nav-produits-js';
    s.src = 'bos-nav-produits.js?v=20260729';
    s.defer = true;
    document.head.appendChild(s);
  })();

  /* L'adresse affichée au client doit être celle de SA boutique, pas notre boîte
     personnelle : écrire « apprentissage.feynman@gmail.com » sur une page TechNova
     trahit l'amateurisme et casse la confiance au moment le plus fragile.
     Chaque domaine a son contact@ (redirection OVH vers la boîte maître). */
  function bosEmailBoutique() {
    var h = location.hostname.replace(/^www\./, '');
    return /^[a-z0-9.-]+\.[a-z]{2,}$/.test(h) ? 'contact@' + h : 'contact@' + h;
  }

  /* Clé produit de l'accueil, quand l'accueil EST une page produit (cf. FootPerf). */
  function bosProduitDAccueil() {
    var f = location.pathname.replace(/\.html?$/, '').split('/').pop() || '';
    if (f && f !== 'index') return null;
    return BOS_ACCUEILS_PRODUIT[location.hostname.replace(/^www\./, '')] || null;
  }

  function bosPageNonLivrable() {
    var acc = bosProduitDAccueil();
    if (acc) return BOS_RETIRES.indexOf(acc) !== -1 ||
                    BOS_NON_LIVRABLES.indexOf(acc) !== -1;
    var f = location.pathname.replace(/\.html?$/, '').split('/').pop() || '';
    if (BOS_PAGES_NON_LIVRABLES.indexOf(f) !== -1) return true;
    var k = f.replace(/^produit-/, '');
    return BOS_NON_LIVRABLES.indexOf(k) !== -1;
  }

  function bosBloquerAchat() {
    if (!bosPageNonLivrable()) return;

    // 1) neutraliser tout ce qui déclenche un paiement ou un ajout au panier
    var selecteurs = [
      '.btn-buy', '[data-bos-cb]', '.checkout-stripe', '.bos-cb-btn',
      '[onclick*="addToCart"]', '[onclick*="ajouterAuPanier"]',
      '.add-to-cart', '.btn-add-cart', '.btn-panier', '#add-to-cart'
    ];
    /* On repère l'ancre AVANT de masquer quoi que ce soit : insérer le message
       dans un conteneur qu'on vient de passer en display:none le rendrait
       invisible (bug constaté en live le 29/07 : le message atterrissait dans
       .checkout-stripe, déjà masqué). L'ancre est donc le <h1>, jamais masqué. */
    var ancreVisible = document.querySelector('h1');

    var vus = [];
    selecteurs.forEach(function (s) {
      Array.prototype.forEach.call(document.querySelectorAll(s), function (el) {
        if (vus.indexOf(el) !== -1) return;
        vus.push(el);
        el.style.display = 'none';
      });
    });
    /* ⚠️ Ne JAMAIS couper le paiement d'un produit DIGITAL au passage.
       Sur footperf.fr, l'accueil vend à la fois les buts (retirés) et le Guide
       Coupe du Monde à 4,90 € — qui est livré par token, sans fournisseur, et
       constitue le seul produit rentable de cette boutique. Son bouton s'appelle
       « Payer par carte bancaire » : le filtre générique l'aurait masqué, tuant
       la seule vente possible de la page. On remonte donc quelques niveaux pour
       reconnaître un bloc digital et l'épargner. */
    function bosEstDigital(el) {
      var n = el, i = 0;
      while (n && i++ < 5) {
        if (n.getAttribute && n.getAttribute('data-bos-product-id')) return true;
        var t = (n.textContent || '').toLowerCase();
        if (/guide|pdf|t[ée]l[ée]charger|ebook|quiz/.test(t) && t.length < 700) return true;
        n = n.parentElement;
      }
      return false;
    }

    // tout bouton dont le texte parle de payer / panier / acheter
    Array.prototype.forEach.call(document.querySelectorAll('button, a'), function (el) {
      var t = (el.textContent || '').toLowerCase();
      if (/payer|ajouter au panier|acheter|commander|paypal/.test(t) &&
          !/retour|continuer mes achats|mentions/.test(t)) {
        if (bosEstDigital(el)) return;
        if (vus.indexOf(el) === -1) { vus.push(el); el.style.display = 'none'; }
      }
    });

    // 2) message honnête à la place
    if (!document.querySelector('#bos-indispo')) {
      var box = document.createElement('div');
      box.id = 'bos-indispo';
      box.style.cssText = 'margin:24px 0;padding:18px 20px;border:1px solid #e2c391;' +
        'background:#fdf6e9;border-radius:10px;color:#5b4a2a;font-size:15px;line-height:1.55;max-width:640px';
      var f = location.pathname.replace(/\.html?$/, '').split('/').pop() || '';
      var acc = bosProduitDAccueil();
      var definitif = BOS_PAGES_RETIREES.indexOf(f) !== -1 ||
                      BOS_RETIRES.indexOf(f.replace(/^produit-/, '')) !== -1 ||
                      (acc && BOS_RETIRES.indexOf(acc) !== -1);
      if (definitif) {
        /* Sur un accueil-produit, « voir le reste de la boutique » renverrait sur
           la page où l'on se trouve déjà. On propose donc une vraie alternative :
           chez FootPerf, le guide Coupe du Monde — digital, livré tout de suite. */
        var suite = acc
          ? '<a href="coupe-du-monde-2026.html" style="color:#8a6d3b;font-weight:600">' +
            'Découvrir le Guide &amp; Grand Quiz de la Coupe du Monde 2026 — 4,90 € →</a>'
          : '<a href="index.html" style="color:#8a6d3b;font-weight:600">' +
            'Voir le reste de la boutique →</a>';
        box.innerHTML = '<strong style="display:block;margin-bottom:6px;font-size:16px">' +
          "Ce produit n'est plus proposé</strong>" +
          'Nous avons retiré cet article de la boutique : nous ne pouvions plus le proposer ' +
          'au prix annoncé sans rogner sur la qualité ou les délais. Nous préférons vous le ' +
          'dire franchement plutôt que de vous faire attendre.<br><br>' + suite;
        var ancre0 = document.querySelector('h1');
        if (ancre0 && ancre0.parentNode) ancre0.parentNode.insertBefore(box, ancre0.nextSibling);
        else document.body.insertBefore(box, document.body.firstChild);
        return;
      }
      box.innerHTML = '<strong style="display:block;margin-bottom:6px;font-size:16px">' +
        'Temporairement indisponible</strong>' +
        'Ce produit est en cours de réapprovisionnement chez notre fournisseur : ' +
        'nous préférons suspendre la vente plutôt que de vous faire attendre une commande ' +
        'que nous ne pourrions pas expédier tout de suite.<br><br>' +
        'Écrivez-nous à <a href="mailto:' + bosEmailBoutique() + '" ' +
        'style="color:#8a6d3b">' + bosEmailBoutique() + '</a> pour être prévenu(e) de son retour.';
      if (ancreVisible && ancreVisible.parentNode) {
        ancreVisible.parentNode.insertBefore(box, ancreVisible.nextSibling);
      } else {
        var principal = document.querySelector('main, .product, .container') || document.body;
        principal.insertBefore(box, principal.firstChild);
      }
    }
  }

  /* Filet de sécurité : si un autre script masque le conteneur du message
     après coup, on le déplace dans le premier parent réellement visible. */
  function bosVerifierVisibilite() {
    var b = document.querySelector('#bos-indispo');
    if (!b || b.offsetParent) return;
    var h1 = document.querySelector('h1');
    if (h1 && h1.parentNode) h1.parentNode.insertBefore(b, h1.nextSibling);
  }

  // au chargement ET après coup : d'autres scripts injectent leurs boutons plus tard
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bosBloquerAchat);
  } else {
    bosBloquerAchat();
  }
  setTimeout(bosBloquerAchat, 800);
  setTimeout(bosBloquerAchat, 2500);
  setTimeout(bosBloquerAchat, 6000);
  setTimeout(bosVerifierVisibilite, 1200);
  setTimeout(bosVerifierVisibilite, 3000);
  setTimeout(bosVerifierVisibilite, 7000);
















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

  // BOS 13/07/2026 — Total REELLEMENT facture = sous-total - remise -10%,
  // calcule a partir du panier (meme formule que l'affichage panier et que PayPal).
  // Avant : lecture fragile du DOM -> risque d'ecart entre prix affiche et prix facture.
  function getCartTotal() {
    var cart = null;
    try { if (typeof window.getCart === 'function') { var c = window.getCart(); if (Array.isArray(c)) cart = c; } } catch(e) {}
    if (!cart || !cart.length) {
      try {
        var keys = ['footperf_v2_cart', 'curiosa_cart', 'serenlab_cart', 'technova_cart', 'focuslab_cart', 'footperf_cart'];
        for (var i = 0; i < keys.length; i++) {
          var v = JSON.parse(localStorage.getItem(keys[i]) || 'null');
          if (Array.isArray(v) && v.length) { cart = v; break; }
        }
      } catch(e) {}
    }
    if (!cart || !cart.length) return 0;
    var subtotal = cart.reduce(function(s, i) {
      return s + (Number(i.price) || 0) * Math.max(1, parseInt(i.qty || 1, 10));
    }, 0);
    var discount = 0;
    if (window.BOS_PROMO && typeof window.BOS_PROMO.discount === 'function') {
      discount = window.BOS_PROMO.discount(cart);
    } else {
      var max = 0;
      cart.forEach(function(i) { var p = Number(i.price) || 0; if (p > max) max = p; });
      discount = max > 0 ? Math.round(max * 10) / 100 : 0;
    }
    return Math.round((subtotal - discount) * 100) / 100;
  }


  var _stripeDone = false;
  function addStripeButton(productKey) {
    if (_stripeDone) return;
    var isCart = location.pathname.indexOf('panier') !== -1 || !!document.getElementById('cartFooter');
    /* BOS 13/07/2026 (coherence des prix) — le Payment Link des fiches produit encaissait le
       PLEIN TARIF alors que le bandeau annonce -10% : deux prix pour le meme produit selon le
       bouton clique. On ne propose donc le paiement CB que depuis le PANIER, ou la remise est
       reellement appliquee. Les fiches produit gardent "Ajouter au panier" comme CTA d'achat.
       (Les produits digitaux ont leur propre bos-stripe.js dans leur sous-dossier : non impactes.) */
    if (!isCart) return;
    var link = productKey ? (STRIPE_LINKS[productKey] || null) : null;

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
          body: JSON.stringify({ amount: total, currency: 'eur', cancelPath: '/panier.html' }),
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
    // BOS 13/07/2026 : les boutons CB sont desormais explicites dans le HTML
    // (data-bos-cb). Plus d'injection auto : elle plaçait le bouton au petit
    // bonheur (ancre = bouton PayPal) et ne survivait pas aux re-rendus du panier.
    if (document.querySelector('[data-bos-cb]')) return;
    if (location.pathname.indexOf('panier') !== -1 ||
        document.getElementById('cart-wrapper') ||
        document.getElementById('cartFooter') ||
        document.getElementById('cartItems')) return;
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

/* ==========================================================================
   BOS 13/07/2026 - RAIL CARTE UNIQUE POUR LES PRODUITS PHYSIQUES
   PayPal a ete retire du parcours physique : il envoyait les PRIX PLEINS
   (sans la remise affichee dans le panier) et aucun fulfillment ne lisait
   ses ventes -> le client payait trop cher et n'etait jamais livre.
   Ici : le montant envoye a Stripe est EXACTEMENT celui affiche au client,
   et metadata.products porte les cles de fulfillment_products.json (VPS)
   pour que la commande fournisseur parte bien apres paiement.
   ========================================================================== */
(function(){
  'use strict';
  var API = 'https://api.tonargentexplique.fr/create-checkout-session';
  var BOUTIQUE = 'technova';
  var CART_KEY = 'technova_cart';
  var ID_TO_FULFILL = {
      "TN-PROJ-001": "mini-projecteur-portable",
      "TN-LAMP-001": "lampe-led-bureau",
      "TN-CHG-001": "chargeur-sans-fil-3-en-1",
      "TN-PRINT-001": "mini-imprimante-portable",
      "TN-MIC-001": "microphone-pro-streaming",
      "TN-VEN-001": "ventilateur-portable"
  };

  function items(){
    try { var v = JSON.parse(localStorage.getItem(CART_KEY) || '[]'); return Array.isArray(v) ? v : []; }
    catch(e){ return []; }
  }
  function fulfillKeys(){
    return items().map(function(i){ return ID_TO_FULFILL[i.id] || i.id; });
  }
  /* Total EXACT affiche au client (remise incluse), expose par le panier. */
  function displayedTotal(){
    if (typeof window.bosCartTotal === 'function') {
      var t = Number(window.bosCartTotal());
      if (isFinite(t) && t > 0) return Math.round(t * 100) / 100;
    }
    return 0;
  }
  function fail(btn, label, msg){ alert(msg); btn.disabled = false; btn.innerHTML = label; }

  function go(btn, payload){
    var label = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = 'Redirection securisee...';
    fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(function(r){ return r.json(); })
    .then(function(d){
      if (d && d.url) { window.location.href = d.url; }
      else { fail(btn, label, 'Erreur de paiement : ' + ((d && d.error) || 'inconnue')); }
    })
    .catch(function(){
      fail(btn, label, 'Impossible de contacter le serveur de paiement. Reessaie dans quelques instants.');
    });
  }

  /* Panier -> session au montant exact affiche. */
  window.bosCartCB = function(btn){
    var cgv = document.getElementById('cgv-check');
    if (cgv && !cgv.checked) { alert('Merci d\u2019accepter les CGV pour continuer.'); return; }
    var total = displayedTotal();
    if (!(total > 0)) { alert('Ton panier est vide.'); return; }
    try { if (window.umami) umami.track('checkout_cb', {montant: total, boutique: BOUTIQUE}); } catch(e){}
    go(btn, { amount: total, currency: 'eur', boutique: BOUTIQUE,
              products: fulfillKeys(), cancelPath: '/panier.html' });
  };

  /* Fiche produit -> session au prix EXACT affiche sur la fiche.
     On n'utilise plus les Payment Links statiques : leurs montants avaient
     derive des prix affiches (ex. 79 EUR affiche / 59 EUR preleve). */
  window.bosProductCB = function(btn){
    var price = parseFloat(btn.getAttribute('data-bos-price'));
    var key   = btn.getAttribute('data-bos-key') || '';
    if (!(price > 0)) { alert('Produit indisponible pour le moment.'); return; }
    var amount = price;
    if (window.BOS_PROMO && typeof window.BOS_PROMO.discount === 'function') { var _d = window.BOS_PROMO.discount([{ price: price, qty: 1 }]) || 0; amount = Math.round((price - _d) * 100) / 100; }
    try { if (window.umami) umami.track('buy_now_cb', {produit: key, prix: amount, boutique: BOUTIQUE}); } catch(e){}
    go(btn, { amount: amount, currency: 'eur', boutique: BOUTIQUE,
              products: key ? [key] : [], cancelPath: location.pathname });
  };
})();
