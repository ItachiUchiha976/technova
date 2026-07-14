/* BOS — Bouton PayPal sur le PANIER (complément de bos-stripe.js). Ajouté le 14/07/2026.
   POURQUOI : les boutiques n'acceptaient QUE la carte. Sur une boutique inconnue, une part
   importante des acheteurs français refuse de saisir sa carte mais paierait via PayPal
   (compte déjà enregistré, protection acheteur). Second rail = conversions récupérées.
   COHÉRENCE DES PRIX : on ne branche PayPal QUE sur le panier, là où la remise -10 % du
   bandeau est réellement appliquée (même règle que bos-stripe.js depuis le 13/07/2026).
   Dépend de bos-paypal.js (window.bosPayPalCheckout), qui calcule lui-même la remise. */
(function () {
  'use strict';

  var TRIES = 0;

  function isCartPage() {
    return location.pathname.indexOf('panier') !== -1 || !!document.getElementById('cartFooter');
  }

  function cartIsEmpty() {
    try {
      if (typeof window.getCart === 'function') {
        var c = window.getCart();
        return !Array.isArray(c) || c.length === 0;
      }
    } catch (e) {}
    return false; // dans le doute, on affiche le bouton (bos-paypal.js gère le panier vide)
  }

  function build() {
    if (document.querySelector('[data-bos-paypal]')) return true;         // déjà posé
    if (typeof window.bosPayPalCheckout !== 'function') return false;     // bos-paypal.js pas encore chargé

    // On s'ancre sur le bouton CB (posé par bos-stripe.js) pour que les 2 rails soient côte à côte.
    var cb = document.querySelector('[data-bos-cb]');
    var container = cb ? cb.parentNode : (document.querySelector('.checkout-stripe') || document.getElementById('cartFooter'));
    if (!container) return false;

    var btn = document.createElement('button');
    btn.setAttribute('data-bos-paypal', '1');
    btn.type = 'button';
    btn.style.cssText = [
      'display:block', 'width:100%', 'margin-top:10px', 'padding:14px 18px',
      'border:0', 'border-radius:10px', 'cursor:pointer',
      'background:#ffc439', 'color:#003087',
      'font-weight:700', 'font-size:1rem', 'font-family:inherit',
      'line-height:1.2'
    ].join(';');
    btn.innerHTML = '<span style="display:flex;align-items:center;justify-content:center;gap:8px;">' +
                    '<strong style="font-style:italic;">PayPal</strong>' +
                    '<span style="font-weight:600;">— payer sans saisir ma carte</span></span>';

    var LABEL = btn.innerHTML;

    btn.addEventListener('click', function () {
      if (cartIsEmpty()) { alert('Ton panier est vide.'); return; }

      // bosPayPalCheckout() peut SORTIR SANS RIEN FAIRE (panier vide, CGV non cochées) :
      // on ne bloque donc jamais le bouton définitivement, sinon le client reste coincé
      // sur « ⏳ Redirection… » et ne peut plus payer du tout.
      btn.disabled = true;
      btn.innerHTML = '<span>⏳ Redirection vers PayPal…</span>';
      var restore = setTimeout(function () {
        btn.disabled = false;
        btn.innerHTML = LABEL;
      }, 3500);

      try {
        window.bosPayPalCheckout();
      } catch (e) {
        clearTimeout(restore);
        btn.disabled = false;
        btn.innerHTML = LABEL;
        alert('Le paiement PayPal est momentanément indisponible. Réessaie ou paie par carte.');
      }
    });

    container.appendChild(btn);
    return true;
  }

  function boot() {
    if (!isCartPage()) return;
    if (build()) return;
    // bos-stripe.js injecte son bouton de façon asynchrone (et le panier se re-rend) → on retente.
    if (TRIES++ < 40) setTimeout(boot, 250);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  // Le panier se re-rend quand on change les quantités → on remet le bouton s'il a été effacé.
  var mo = new MutationObserver(function () {
    if (isCartPage() && !document.querySelector('[data-bos-paypal]')) { TRIES = 0; boot(); }
  });
  try { mo.observe(document.body, { childList: true, subtree: true }); } catch (e) {}
})();
