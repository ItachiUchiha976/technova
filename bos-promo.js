/* BOS — Bandeau promo -10% (HONNÊTE, sans fausse urgence). Refonte 13/07/2026.

   Conformité DGCCRF (pratique commerciale trompeuse — art. L121-2 et s. du Code de la consommation) :
   - AUCUN compte à rebours. La remise -10% est PERMANENTE dans le code : afficher un chrono
     "l'offre expire dans 59:12" alors qu'elle n'expire jamais = fausse urgence = interdit.
   - Le bandeau n'annonce QUE ce qui est réellement appliqué et vérifiable au panier.
   - Le bandeau ne s'affiche QUE sur les pages qui ont un panier (la remise s'applique au panier).

   SOURCE DE VÉRITÉ UNIQUE du calcul : window.BOS_PROMO.discount(cart).
   Elle est utilisée par le panier (affichage) ET par le checkout (montant réellement facturé,
   PayPal + Stripe) → le total affiché est TOUJOURS égal au total facturé. */

(function(){
  'use strict';

  var DISCOUNT_PCT = 10;

  // ===== SOURCE DE VÉRITÉ UNIQUE =====
  // -10% sur l'article le plus cher du panier (1 unité), ARRONDI AU CENTIME.
  // L'arrondi doit être fait ici et nulle part ailleurs : sinon l'affichage et la facturation
  // peuvent diverger d'un centime (ex. 34,99 € → 3,499 €).
  window.BOS_PROMO = {
    PCT: DISCOUNT_PCT,
    discount: function(cart){
      if (!cart || !cart.length) return 0;
      var max = 0;
      for (var i = 0; i < cart.length; i++) {
        var p = Number(cart[i].price) || 0;
        if (p > max) max = p;
      }
      if (max <= 0) return 0;
      return Math.round(max * DISCOUNT_PCT) / 100; // arrondi(max * 0.10) au centime
    },
    text: '-' + DISCOUNT_PCT + '% appliqué automatiquement sur le produit le plus cher du panier'
  };

  // Nettoyage des anciennes clés du chrono factice (versions <= 5).
  try {
    localStorage.removeItem('bos_promo_end');
    localStorage.removeItem('bos_promo_ver');
  } catch(e) {}

  // Le bandeau promet une remise "au panier" → ne l'afficher que là où un panier existe.
  function hasCart(){
    if (/panier/i.test(location.pathname)) return true;
    // Les 5 boutiques n'utilisent pas le meme markup pour "Ajouter au panier" :
    // classe (.add-to-cart-btn, .btn-addcart, .fiche-add) OU id (#add-to-cart-btn) OU data-*.
    return !!document.querySelector(
      '.add-to-cart-btn, #add-to-cart-btn, .btn-addcart, [data-add-cart], [data-product-id], ' +
      '.fiche-add, .cart-table, #cart-items, #cartItems, #cartFooter'
    );
  }

  function init(){
    if (document.getElementById('bos-promo-banner')) return;
    if (!hasCart()) return;

    var banner = document.createElement('div');
    banner.id = 'bos-promo-banner';
    banner.style.cssText = 'position:sticky;top:0;z-index:9999;background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 50%,#a855f7 100%);color:#fff;text-align:center;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,0.15);';
    banner.innerHTML =
      '<div style="max-width:1200px;margin:0 auto;display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:4px 12px;padding:10px 16px;">' +
        '<span style="font-size:14px;font-weight:700;">-' + DISCOUNT_PCT + '% sur le produit le plus cher de votre panier</span>' +
        '<span style="font-size:13px;opacity:0.92;">Remise appliquée automatiquement au panier, sans code.</span>' +
      '</div>';
    document.body.insertBefore(banner, document.body.firstChild);

    try { if (window.umami) umami.track('view_promo', {discount: DISCOUNT_PCT, page: location.pathname}); } catch(e) {}
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
