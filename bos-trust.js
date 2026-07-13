/* bos-trust.js — Bloc de réassurance universel BOS (v1, 13/07/2026)
   Injecte une rangée de garanties sous le bouton d'achat + une bannière confiance.
   Déterministe : cible #bos-trust-mount si présent, sinon s'insère après le 1er
   bouton d'achat détecté. Styles scopés (.bos-tr-*), aucune dépendance. */
(function () {
  if (window.__bosTrust) return; window.__bosTrust = true;

  var CSS = ''
  + '.bos-tr{margin:22px 0;font-family:inherit}'
  + '.bos-tr-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin:0}'
  + '@media(min-width:560px){.bos-tr-grid{grid-template-columns:repeat(4,1fr)}}'
  + '.bos-tr-item{display:flex;flex-direction:column;align-items:center;text-align:center;'
  + 'gap:6px;padding:14px 8px;border:1px solid rgba(0,0,0,.08);border-radius:14px;'
  + 'background:rgba(0,0,0,.02)}'
  + '.bos-tr-ic{font-size:22px;line-height:1}'
  + '.bos-tr-t{font-weight:700;font-size:13px;line-height:1.2}'
  + '.bos-tr-s{font-size:11.5px;opacity:.7;line-height:1.25}'
  + '.bos-tr-pay{display:flex;align-items:center;justify-content:center;gap:10px;flex-wrap:wrap;'
  + 'margin-top:14px;font-size:12px;opacity:.8}'
  + '.bos-tr-pay b{font-weight:700}'
  + '.bos-tr-badge{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;'
  + 'border-radius:999px;background:rgba(0,0,0,.05);font-weight:600;font-size:11.5px}'
  ;

  var ITEMS = [
    { ic: '🔒', t: 'Paiement sécurisé', s: 'Carte & PayPal cryptés' },
    { ic: '🚚', t: 'Livraison suivie', s: 'Numéro de suivi fourni' },
    { ic: '↩️', t: 'Satisfait ou remboursé', s: '30 jours pour changer d’avis' },
    { ic: '💬', t: 'Support réactif', s: 'Une question ? On répond' }
  ];

  function build() {
    var wrap = document.createElement('div');
    wrap.className = 'bos-tr';
    var grid = '<div class="bos-tr-grid">';
    ITEMS.forEach(function (i) {
      grid += '<div class="bos-tr-item"><span class="bos-tr-ic">' + i.ic + '</span>'
        + '<span class="bos-tr-t">' + i.t + '</span>'
        + '<span class="bos-tr-s">' + i.s + '</span></div>';
    });
    grid += '</div>';
    grid += '<div class="bos-tr-pay"><span class="bos-tr-badge">🔒 Commande protégée</span>'
      + '<span>Expédié sous 24-48h · <b>Paiement 100% sécurisé</b></span></div>';
    wrap.innerHTML = grid;
    return wrap;
  }

  function mount() {
    if (document.querySelector('.bos-tr')) return;
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    var el = build();
    var target = document.getElementById('bos-trust-mount');
    if (target) { target.appendChild(el); return; }
    // fallback : après le bouton d'achat
    var btn = document.querySelector('[data-add-cart],.add-to-cart-btn,.btn-addcart,[data-buy-now],.buy-now');
    if (btn) {
      var host = btn.closest('.product-actions,.product__actions,.buy-box,form') || btn.parentElement;
      host.parentNode.insertBefore(el, host.nextSibling);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
