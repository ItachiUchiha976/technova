/* bos-sticky-cta.js — barre d'achat sticky sur mobile (<=768px) pour les fiches produit.
   Clone l'action du bouton "Ajouter au panier" existant : aucune logique dupliquee.
   Sur, idempotent, masque en desktop. Contraste texte auto selon le fond herite. */
(function () {
  function lum(rgb) {
    var m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(rgb || '');
    if (!m) return 0;
    var r = +m[1] / 255, g = +m[2] / 255, b = +m[3] / 255;
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  function init() {
    if (document.querySelector('.bos-sticky-cta')) return; // idempotent

    // 1) add-to-cart (classe ou id), 2) checkout Stripe direct, 3) texte
    var main = document.querySelector('.add-to-cart-btn, #add-to-cart-btn');
    if (!main) {
      var keys = Array.prototype.slice.call(document.querySelectorAll('[data-bos-key]'));
      main = keys.filter(function (b) { return /panier/i.test(b.textContent || ''); })[0] || keys[0];
    }
    if (!main) {
      main = Array.prototype.slice.call(document.querySelectorAll('button,a'))
        .filter(function (b) { return /ajouter au panier|acheter maintenant/i.test(b.textContent || ''); })[0];
    }
    if (!main) return;

    var label = (main.textContent || '').trim().replace(/\s+/g, ' ');
    if (/panier/i.test(label)) label = 'Ajouter au panier';
    if (label.length > 42) label = label.slice(0, 42);
    if (!label) label = 'Ajouter au panier';

    var bar = document.createElement('div');
    bar.className = 'bos-sticky-cta';
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'bos-sticky-cta__btn';
    btn.textContent = label;
    btn.addEventListener('click', function () {
      try { main.click(); } catch (e) {}
    });
    bar.appendChild(btn);
    document.body.appendChild(bar);

    // Couleur : herite du fond plein du bouton principal, texte contraste auto
    try {
      var bg = getComputedStyle(main).backgroundColor;
      if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
        btn.style.background = bg;
        btn.style.color = (lum(bg) > 0.6) ? '#111' : '#fff';
      }
    } catch (e) {}

    var css = document.createElement('style');
    css.textContent =
      '.bos-sticky-cta{display:none}' +
      '@media(max-width:768px){' +
      '.bos-sticky-cta{display:block;position:fixed;left:0;right:0;bottom:0;z-index:350;' +
      'background:rgba(255,255,255,.97);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);' +
      'border-top:1px solid rgba(0,0,0,.12);padding:10px 14px calc(10px + env(safe-area-inset-bottom));' +
      'box-shadow:0 -4px 20px rgba(0,0,0,.15)}' +
      '.bos-sticky-cta__btn{display:block;width:100%;border:0;border-radius:999px;padding:14px;' +
      'font-size:1rem;font-weight:800;cursor:pointer;background:#111;color:#fff;font-family:inherit;line-height:1.2}' +
      'body.has-bos-sticky{padding-bottom:78px}' +
      '@media(prefers-color-scheme:dark){.bos-sticky-cta{background:rgba(20,20,22,.97);border-top-color:rgba(255,255,255,.12)}}' +
      '}';
    document.head.appendChild(css);
    document.body.classList.add('has-bos-sticky');
  }
  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
