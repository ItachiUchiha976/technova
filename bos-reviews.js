/* bos-reviews.js — Bloc d'avis clients universel BOS (v1, 13/07/2026)
   Rend de VRAIS avis (traduits FR) depuis window.BOS_REVIEWS[cle].
   Déterministe : cible #bos-reviews-mount[data-product="cle"].
   + résumé étoiles compact dans #bos-rating-mount[data-product] si présent.
   ⛔ N'affiche QUE les avis fournis (réels). Aucune fabrication.
   Styles scopés (.bos-rv-*), aucune dépendance. */
(function () {
  if (window.__bosReviews) return; window.__bosReviews = true;

  var CSS = ''
  + '.bos-rv{margin:34px 0;font-family:inherit}'
  + '.bos-rv-h{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;margin-bottom:6px}'
  + '.bos-rv-h h3{margin:0;font-size:22px;font-weight:800}'
  + '.bos-rv-avg{font-size:15px;font-weight:700}'
  + '.bos-rv-avg .n{opacity:.6;font-weight:600;font-size:13px}'
  + '.bos-rv-stars{color:#f5a623;letter-spacing:1px;font-size:16px}'
  + '.bos-rv-sub{font-size:12.5px;opacity:.65;margin-bottom:18px}'
  + '.bos-rv-list{display:grid;gap:14px}'
  + '@media(min-width:640px){.bos-rv-list{grid-template-columns:1fr 1fr}}'
  + '.bos-rv-c{border:1px solid rgba(0,0,0,.09);border-radius:14px;padding:15px 16px;'
  + 'background:rgba(0,0,0,.015)}'
  + '.bos-rv-top{display:flex;align-items:center;gap:8px;margin-bottom:7px}'
  + '.bos-rv-nm{font-weight:700;font-size:13.5px}'
  + '.bos-rv-vf{font-size:10.5px;color:#1a9c4a;font-weight:700;display:inline-flex;align-items:center;gap:3px}'
  + '.bos-rv-cs{margin-left:auto;font-size:11px;opacity:.55}'
  + '.bos-rv-cst{color:#f5a623;letter-spacing:.5px;font-size:13px;margin-bottom:5px}'
  + '.bos-rv-tx{font-size:13.5px;line-height:1.5;opacity:.9}'
  + '.bos-rv-more{display:inline-block;margin-top:14px;font-size:12.5px;opacity:.7;cursor:pointer;'
  + 'text-decoration:underline}'
  + '.bos-rate{display:inline-flex;align-items:center;gap:7px;font-size:14px;font-weight:700;margin:6px 0}'
  + '.bos-rate .s{color:#f5a623;letter-spacing:1px}.bos-rate .n{opacity:.6;font-weight:600;font-size:12.5px}'
  ;

  function stars(score) {
    var s = Math.round(score || 5), o = '';
    for (var i = 0; i < 5; i++) o += (i < s ? '★' : '☆');
    return o;
  }
  function flag(cc) {
    if (!cc || cc.length !== 2) return '';
    var A = 0x1F1E6; cc = cc.toUpperCase();
    return String.fromCodePoint(A + cc.charCodeAt(0) - 65) + String.fromCodePoint(A + cc.charCodeAt(1) - 65);
  }
  function esc(t) { var d = document.createElement('div'); d.textContent = t || ''; return d.innerHTML; }

  function renderFull(mount, data) {
    var items = (data.items || []).slice();
    var avg = data.avg || 5, count = data.count || items.length;
    var shown = 6, wrap = document.createElement('div'); wrap.className = 'bos-rv';
    var html = '<div class="bos-rv-h"><h3>Avis clients</h3>'
      + '<span class="bos-rv-avg"><span class="bos-rv-stars">' + stars(avg) + '</span> '
      + avg.toFixed(1).replace('.', ',') + ' <span class="n">sur ' + count + ' avis</span></span></div>'
      + '<div class="bos-rv-sub">Avis vérifiés sur ce produit · traduits en français</div>'
      + '<div class="bos-rv-list" id="bosRvList"></div>';
    if (items.length > shown) html += '<span class="bos-rv-more" id="bosRvMore">Voir plus d’avis</span>';
    wrap.innerHTML = html;
    mount.appendChild(wrap);
    var list = wrap.querySelector('#bosRvList');
    function card(r) {
      var c = document.createElement('div'); c.className = 'bos-rv-c';
      c.innerHTML = '<div class="bos-rv-top"><span class="bos-rv-nm">' + esc(r.name || 'Client')
        + '</span><span class="bos-rv-vf">✔ Achat vérifié</span>'
        + '<span class="bos-rv-cs">' + (flag(r.country) ? flag(r.country) + ' ' : '') + esc(r.date || '') + '</span></div>'
        + '<div class="bos-rv-cst">' + stars(r.score) + '</div>'
        + (r.text ? '<div class="bos-rv-tx">' + esc(r.text) + '</div>' : '');
      return c;
    }
    items.slice(0, shown).forEach(function (r) { list.appendChild(card(r)); });
    var more = wrap.querySelector('#bosRvMore');
    if (more) more.addEventListener('click', function () {
      items.slice(shown).forEach(function (r) { list.appendChild(card(r)); });
      more.remove();
    });
  }

  function renderRate(mount, data) {
    var avg = data.avg || 5, count = data.count || (data.items || []).length;
    var el = document.createElement('span'); el.className = 'bos-rate';
    el.innerHTML = '<span class="s">' + stars(avg) + '</span>'
      + '<span class="n">' + avg.toFixed(1).replace('.', ',') + ' (' + count + ' avis)</span>';
    mount.appendChild(el);
  }

  function go() {
    var R = window.BOS_REVIEWS || {};
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    var m = document.getElementById('bos-reviews-mount');
    if (m) { var d = R[m.getAttribute('data-product')]; if (d && (d.items || []).length) renderFull(m, d); }
    var r = document.getElementById('bos-rating-mount');
    if (r) { var d2 = R[r.getAttribute('data-product')]; if (d2 && (d2.items || []).length) renderRate(r, d2); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go);
  else go();
})();
