/* BOS — Pop-up promotionnel 20% + compte à rebours 1h. Ajout 08/07/2026.
   Overlay plein écran avec compte à rebours d'1h pour urgence.
   Code promo BIENVENUE20. Cookie 7j après fermeture. */

(function(){
  'use strict';

  var DISCOUNT_CODE = 'BIENVENUE20';
  var DISCOUNT_PCT = 20;
  var COUNTDOWN_MINUTES = 60; // 1 heure
  var VERSION = 2; // incrémente si changement de durée → reset localStorage

  function init() {
    // Cookie anti-réaffichage 7j
    if (document.cookie.indexOf('bos_promo_seen=1') !== -1) return;

    // Versioning : reset si durée changée
    var storedVer = localStorage.getItem('bos_promo_ver');
    if (storedVer !== String(VERSION)) {
      localStorage.removeItem('bos_promo_end');
      localStorage.setItem('bos_promo_ver', String(VERSION));
    }

    // Compte à rebours
    var promoEnd = getEndTime();

    function getEndTime() {
      var stored = localStorage.getItem('bos_promo_end');
      if (stored) return parseInt(stored, 10);
      var end = Date.now() + COUNTDOWN_MINUTES * 60 * 1000;
      localStorage.setItem('bos_promo_end', end.toString());
      return end;
    }

    function formatTime(ms) {
      if (ms <= 0) return "C'est fini !";
      var m = Math.floor(ms / 60000);
      var s = Math.floor((ms % 60000) / 1000);
      return String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
    }

    // === OVERLAY ===
    var overlay = document.createElement('div');
    overlay.id = 'bos-promo-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;';

    // === MODAL ===
    var modal = document.createElement('div');
    modal.style.cssText = 'background:linear-gradient(135deg,#1e1b4b 0%,#312e81 40%,#4c1d95 100%);color:#fff;border-radius:20px;padding:40px 32px 28px;max-width:440px;width:90%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.5);position:relative;animation:bos-fadein 0.4s ease;';

    modal.innerHTML =
      // Badge
      '<div style="display:inline-block;background:#f59e0b;color:#000;font-size:12px;font-weight:800;padding:4px 12px;border-radius:20px;margin-bottom:16px;letter-spacing:1px;">OFFRE DE BIENVENUE</div>' +
      // Titre
      '<p style="font-size:28px;font-weight:900;margin:0 0 8px;line-height:1.2;">-' + DISCOUNT_PCT + '% <span style="color:#f59e0b">sur ta 1ère commande</span></p>' +
      // Sous-titre
      '<p style="font-size:14px;opacity:0.8;margin:0 0 24px;">Profites-en, cette offre expire dans :</p>' +
      // Compte à rebours
      '<div style="background:rgba(0,0,0,0.3);border-radius:12px;padding:16px;margin:0 0 20px;">' +
        '<span id="bos-countdown" style="font-size:42px;font-weight:900;letter-spacing:2px;color:#f59e0b;font-variant-numeric:tabular-nums;">--:--</span>' +
      '</div>' +
      // Code
      '<div style="background:rgba(255,255,255,0.1);border:1px dashed rgba(255,255,255,0.3);border-radius:12px;padding:12px;margin:0 0 24px;">' +
        '<p style="font-size:12px;opacity:0.7;margin:0 0 4px;">Ton code promo</p>' +
        '<p style="font-size:22px;font-weight:800;margin:0;letter-spacing:1px;font-variant-numeric:tabular-nums;">' + DISCOUNT_CODE + '</p>' +
      '</div>' +
      // CTA
      '<button id="bos-promo-cta" style="width:100%;background:#f59e0b;color:#000;border:none;padding:14px;border-radius:12px;font-size:16px;font-weight:700;cursor:pointer;transition:transform 0.15s;">🎁 J\'en profite maintenant</button>' +
      // Lien discret
      '<button id="bos-promo-close" style="background:none;border:none;color:rgba(255,255,255,0.4);font-size:12px;margin-top:12px;cursor:pointer;text-decoration:underline;">Non merci, je paierai le prix fort</button>';

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // === ANIMATION CSS ===
    var style = document.createElement('style');
    style.textContent = '@keyframes bos-fadein{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}} @keyframes bos-pulse{0%,100%{opacity:1}50%{opacity:0.5}}';
    document.head.appendChild(style);

    // === COMPTE À REBOURS ===
    var countdownEl = document.getElementById('bos-countdown');
    function tick() {
      var remaining = promoEnd - Date.now();
      if (remaining <= 0) {
        countdownEl.textContent = "00:00";
        countdownEl.style.color = '#ef4444';
        countdownEl.style.animation = 'bos-pulse 0.8s infinite';
        return;
      }
      countdownEl.textContent = formatTime(remaining);
      if (remaining < 300000) { // <5 min
        countdownEl.style.color = '#ef4444';
        countdownEl.style.animation = 'bos-pulse 0.5s infinite';
      }
    }
    tick();
    setInterval(tick, 1000);

    // === FERMER ===
    function closePopup() {
      overlay.style.display = 'none';
      document.cookie = 'bos_promo_seen=1;path=/;max-age=' + (7*86400);
    }
    document.getElementById('bos-promo-close').addEventListener('click', closePopup);
    document.getElementById('bos-promo-cta').addEventListener('click', function(){
      closePopup();
      window.scrollTo({top:0,behavior:'smooth'});
    });

    // Fermer en cliquant hors de la modale
    overlay.addEventListener('click', function(e){
      if (e.target === overlay) closePopup();
    });

    // === APPLIQUER CODE PROMO ===
    var couponInput = document.querySelector('[name="coupon"], [name="discount"], .coupon-input, #coupon');
    if (couponInput && !couponInput.value) {
      couponInput.value = DISCOUNT_CODE;
    }

    // Tracking
    try {
      if (window.umami && typeof umami.track === 'function') {
        umami.track('view_promo_popup', {discount: DISCOUNT_PCT, page: location.pathname});
      }
    } catch(e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
