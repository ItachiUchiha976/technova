/* BOS — Checkout Stripe (produit digital "guide-ia"). Ajouté 13/07/2026.
   Le bouton crée une session Checkout via l'API VPS (stripe-api) qui génère
   le token de téléchargement (livraison du PDF) injecté dans success_url.
   Fichier scopé à ce produit uniquement — ne remplace PAS ../bos-stripe.js
   (physiques, Payment Links) qui reste chargé pour le reste de la boutique. */

(function(){
  'use strict';

  var STRIPE_API = 'https://api.tonargentexplique.fr/create-checkout-session';

  // Produit digital de cette page (prix TTC = prix affiché sur la page)
  var DIGITAL = {
    'guide-ia': { amount: 13.00, boutique: 'technovaboutique' }
  };

  function findProduct() {
    var el = document.querySelector('[data-bos-product-id]');
    if (el) {
      var pid = el.getAttribute('data-bos-product-id');
      if (DIGITAL[pid]) return pid;
    }
    return null;
  }

  var _done = false;
  function addStripeButton(pid) {
    if (_done) return;
    var p = DIGITAL[pid];
    if (!p) return;

    var container = document.querySelector('.checkout-stripe') || document.getElementById('stripe-btn-container');
    if (!container) {
      var anchor = document.querySelector('.bos-paypal-btn') ||
                   document.querySelector('.btn-checkout') ||
                   document.querySelector('.btn-addcart, [data-add-cart]') ||
                   document.querySelector('#btn-hero') ||
                   document.querySelector('h1');
      if (anchor && anchor.parentNode) {
        container = document.createElement('div');
        container.className = 'checkout-stripe';
        container.style.cssText = 'margin-top:12px;text-align:center;';
        anchor.parentNode.insertBefore(container, anchor.nextSibling);
      }
    }
    if (!container) return;

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-stripe';
    btn.innerHTML = '<span style="display:flex;align-items:center;justify-content:center;gap:8px;">' +
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="4" width="20" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><line x1="2" y1="9" x2="22" y2="9" stroke="currentColor" stroke-width="1.5"/></svg>' +
      '<span>💳 Payer par CB</span></span>';
    btn.style.cssText = 'display:inline-block;width:100%;max-width:400px;padding:14px 24px;background:#635BFF;color:#fff;border-radius:8px;font-weight:600;font-size:16px;cursor:pointer;border:none;transition:background 0.2s;';
    btn.onmouseover = function(){ this.style.background = '#4F46E5'; };
    btn.onmouseout  = function(){ this.style.background = '#635BFF'; };

    btn.addEventListener('click', function(e) {
      e.preventDefault();
      btn.textContent = '⏳ Redirection vers le paiement...';
      btn.disabled = true;
      fetch(STRIPE_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: p.amount, currency: 'eur', boutique: p.boutique, products: [pid],
          /* BOS 13/07/2026 : sans returnPath, Stripe renvoyait vers /merci.html a la RACINE du domaine
             (404 ou page sans code token) => le client payait et ne recevait rien. */
          returnPath: location.pathname.replace(/[^\/]*$/, 'merci.html'),
          cancelPath: location.pathname })
      })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data.url) { window.location.href = data.url; }
        else {
          alert('Erreur de paiement : ' + (data.error || 'inconnue') + '. Tu peux aussi payer par PayPal juste au-dessus.');
          btn.innerHTML = '💳 Payer par CB'; btn.disabled = false;
        }
      })
      .catch(function() {
        alert('Impossible de contacter le serveur de paiement. Réessaie dans quelques instants, ou utilise le bouton PayPal.');
        btn.innerHTML = '💳 Payer par CB'; btn.disabled = false;
      });
    });

    container.appendChild(btn);
    _done = true;

    try {
      if (window.umami && typeof umami.track === 'function') {
        umami.track('view_stripe_button', {page: location.pathname});
      }
    } catch(e) {}
  }

  function init() {
    var pid = findProduct();
    if (pid) addStripeButton(pid);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
