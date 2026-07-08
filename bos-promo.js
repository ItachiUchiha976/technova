/* BOS — Bannière promotionnelle 20% + compte à rebours. Ajout 08/07/2026.
   Affiche une barre sticky en haut avec un compte à rebours de 24h.
   Code promo BIENVENUE20 appliqué automatiquement. */

(function(){
  'use strict';

  // === CONFIG ===
  var DISCOUNT_CODE = 'BIENVENUE20';
  var DISCOUNT_PCT = 20;
  var COUNTDOWN_HOURS = 1;

  function init() {
    // Ne pas afficher si déjà vu (cookie 7j)
    if (document.cookie.indexOf('bos_promo_seen=1') !== -1) return;

    // === COMPTE A REBOURS ===
    function getEndTime() {
      var stored = localStorage.getItem('bos_promo_end');
      if (stored) return parseInt(stored, 10);
      var end = Date.now() + COUNTDOWN_HOURS * 3600 * 1000;
      localStorage.setItem('bos_promo_end', end.toString());
      return end;
    }

    var promoEnd = getEndTime();

    function formatTime(ms) {
      if (ms <= 0) return 'Offre expirée';
      var h = Math.floor(ms / 3600000);
      var m = Math.floor((ms % 3600000) / 60000);
      var s = Math.floor((ms % 60000) / 1000);
      return h + 'h ' + String(m).padStart(2,'0') + 'm ' + String(s).padStart(2,'0') + 's';
    }

    // === HTML ===
    var bar = document.createElement('div');
    bar.id = 'bos-promo-bar';
    bar.innerHTML =
      '<div style="max-width:1200px;margin:0 auto;display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:6px 16px;padding:8px 16px;">' +
        '<span style="font-size:15px;font-weight:600;">-' + DISCOUNT_PCT + '% sur ta 1ère commande</span>' +
        '<span style="font-size:13px;opacity:0.9;">Code <strong style="background:rgba(255,255,255,0.25);padding:2px 8px;border-radius:4px;">' + DISCOUNT_CODE + '</strong></span>' +
        '<span id="bos-countdown" style="font-size:14px;font-weight:700;min-width:100px;text-align:center;"></span>' +
        '<button id="bos-promo-close" aria-label="Fermer" style="background:none;border:1px solid rgba(255,255,255,0.4);color:#fff;padding:4px 10px;border-radius:4px;cursor:pointer;font-size:13px;">✕</button>' +
      '</div>';
    bar.style.cssText = 'background:linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%);color:#fff;position:sticky;top:0;z-index:9999;text-align:center;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,0.15);';

    document.body.insertBefore(bar, document.body.firstChild);

    // === COMPTE A REBOURS TICK ===
    var countdownEl = document.getElementById('bos-countdown');
    function tick() {
      var remaining = promoEnd - Date.now();
      if (remaining <= 0) {
        countdownEl.textContent = 'Dernière chance !';
        countdownEl.style.animation = 'none';
        return;
      }
      countdownEl.textContent = '⏳ ' + formatTime(remaining);
      if (remaining < 3600000) {
        countdownEl.style.animation = 'bos-pulse 1s infinite';
      }
    }
    tick();
    setInterval(tick, 1000);

    // === BOUTON FERMER ===
    document.getElementById('bos-promo-close').addEventListener('click', function(){
      bar.style.display = 'none';
      document.cookie = 'bos_promo_seen=1;path=/;max-age=' + (7*86400);
    });

    // === APPLIQUER LE CODE PROMO ===
    var couponInput = document.querySelector('[name="coupon"], [name="discount"], .coupon-input, #coupon');
    if (couponInput && !couponInput.value) {
      couponInput.value = DISCOUNT_CODE;
    }

    // Animation CSS
    var style = document.createElement('style');
    style.textContent = '@keyframes bos-pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }';
    document.head.appendChild(style);

    // Tracking
    try {
      if (window.umami && typeof umami.track === 'function') {
        umami.track('view_promo_bar', {discount: DISCOUNT_PCT, page: location.pathname});
      }
    } catch(e) {}
  }

  // DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
