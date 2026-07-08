/* BOS — Promo -20% : pop-up → bannière sticky · chrono 1h · cookie 10 min anti-harcèlement.
   Flow : pop-up au 1er chargement → fermé → bannière + cookie 10 min.
   Pendant 10 min : juste la bannière. Après 10 min : pop-up peut resurgir.
   Chrono expiré → tout disparaît. */

(function(){
  'use strict';

  var DISCOUNT_CODE = 'BIENVENUE20';
  var DISCOUNT_PCT = 10;
  var COUNTDOWN_MINUTES = 60;
  var POPUP_COOLDOWN = 600; // 10 minutes en secondes
  var VERSION = 5;

  function init() {
    // Chrono expiré → rien
    var storedEnd = localStorage.getItem('bos_promo_end');
    if (storedEnd && parseInt(storedEnd, 10) < Date.now()) return;

    // Versioning
    var storedVer = localStorage.getItem('bos_promo_ver');
    if (storedVer !== String(VERSION)) {
      localStorage.removeItem('bos_promo_end');
      localStorage.setItem('bos_promo_ver', String(VERSION));
    }

    var promoEnd = getEndTime();
    function getEndTime() {
      var s = localStorage.getItem('bos_promo_end');
      if (s) return parseInt(s, 10);
      var e = Date.now() + COUNTDOWN_MINUTES * 60 * 1000;
      localStorage.setItem('bos_promo_end', e.toString());
      return e;
    }

    function formatTime(ms) {
      if (ms <= 0) return '00:00';
      var m = Math.floor(ms / 60000);
      var s = Math.floor((ms % 60000) / 1000);
      return String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
    }

    // CSS
    var style = document.createElement('style');
    style.textContent = '@keyframes bos-fadein{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}} @keyframes bos-pulse{0%,100%{opacity:1}50%{opacity:0.5}}';
    document.head.appendChild(style);

    var ticking = true;

    // ===== BANNIÈRE STICKY =====
    var banner = document.createElement('div');
    banner.id = 'bos-promo-banner';
    banner.style.cssText = 'display:none;position:sticky;top:0;z-index:9999;background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 50%,#a855f7 100%);color:#fff;text-align:center;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,0.15);';
    banner.innerHTML =
      '<div style="max-width:1200px;margin:0 auto;display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:6px 12px;padding:10px 16px;">' +
        '<span style="font-size:14px;font-weight:600;">-' + DISCOUNT_PCT + '% sur le produit le + cher</span>' +
        '<span style="font-size:13px;opacity:0.9;">Appliqué automatiquement au panier</span>' +
        '<span id="bos-countdown-banner" style="font-size:14px;font-weight:700;min-width:80px;text-align:center;"></span>' +
        '<button id="bos-banner-close" aria-label="Fermer" style="background:none;border:1px solid rgba(255,255,255,0.4);color:#fff;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:12px;">✕</button>' +
      '</div>';
    document.body.insertBefore(banner, document.body.firstChild);

    // ===== POP-UP PLEIN ÉCRAN =====
    var overlay = document.createElement('div');
    overlay.id = 'bos-promo-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.7);display:none;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;';

    var modal = document.createElement('div');
    modal.style.cssText = 'background:linear-gradient(135deg,#1e1b4b 0%,#312e81 40%,#4c1d95 100%);color:#fff;border-radius:20px;padding:40px 32px 28px;max-width:440px;width:90%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.5);animation:bos-fadein 0.4s ease;';

    modal.innerHTML =
      '<div style="display:inline-block;background:#f59e0b;color:#000;font-size:12px;font-weight:800;padding:4px 12px;border-radius:20px;margin-bottom:16px;letter-spacing:1px;">PROMO FLASH</div>' +
      '<p style="font-size:28px;font-weight:900;margin:0 0 8px;line-height:1.2;">-' + DISCOUNT_PCT + '% <span style="color:#f59e0b">sur le produit le + cher</span></p>' +
      '<p style="font-size:14px;opacity:0.8;margin:0 0 24px;">Appliqué automatiquement au panier. Cette offre expire dans :</p>' +
      '<div style="background:rgba(0,0,0,0.3);border-radius:12px;padding:16px;margin:0 0 20px;">' +
        '<span id="bos-countdown-popup" style="font-size:42px;font-weight:900;letter-spacing:2px;color:#f59e0b;">--:--</span>' +
      '</div>' +
      '<p style="font-size:13px;opacity:0.7;margin:0 0 24px;">Ajoute tes articles au panier, la réduction se fait toute seule.</p>' +
      '<button id="bos-promo-cta" style="width:100%;background:#f59e0b;color:#000;border:none;padding:14px;border-radius:12px;font-size:16px;font-weight:700;cursor:pointer;">🛍️ Voir le catalogue</button>' +
      '<button id="bos-promo-close" style="background:none;border:none;color:rgba(255,255,255,0.4);font-size:12px;margin-top:12px;cursor:pointer;text-decoration:underline;">Fermer</button>';

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // ===== COMPTE À REBOURS =====
    function tickAll() {
      var remaining = promoEnd - Date.now();
      if (remaining <= 0) {
        overlay.style.display = 'none';
        banner.style.display = 'none';
        ticking = false;
        return;
      }
      var timeStr = formatTime(remaining);
      var urgent = remaining < 300000;

      var cdPopup = document.getElementById('bos-countdown-popup');
      if (cdPopup) {
        cdPopup.textContent = timeStr;
        if (urgent) { cdPopup.style.color = '#ef4444'; cdPopup.style.animation = 'bos-pulse 0.5s infinite'; }
      }
      var cdBanner = document.getElementById('bos-countdown-banner');
      if (cdBanner) {
        cdBanner.textContent = '⏳ ' + timeStr;
        if (urgent) { cdBanner.style.color = '#fbbf24'; cdBanner.style.animation = 'bos-pulse 1s infinite'; }
      }
    }
    tickAll();
    var timer = setInterval(function(){ if (ticking) tickAll(); else clearInterval(timer); }, 1000);

    // ===== AFFICHAGE =====
    function showBanner() {
      overlay.style.display = 'none';
      banner.style.display = 'block';
    }

    function showPopup() {
      overlay.style.display = 'flex';
      banner.style.display = 'none';
    }

    function closePopup() {
      overlay.style.display = 'none';
      banner.style.display = 'block';
      document.cookie = 'bos_popup_closed=1;path=/;max-age=' + POPUP_COOLDOWN;
    }

    // Cookie < 10 min ? → bannière seule. Sinon → pop-up.
    if (document.cookie.indexOf('bos_popup_closed=1') !== -1) {
      showBanner();
    } else {
      showPopup();
    }

    // ===== BOUTONS =====
    document.getElementById('bos-promo-close').addEventListener('click', closePopup);

    document.getElementById('bos-promo-cta').addEventListener('click', function(){
      // Tout fermer, la réduction est automatique
      overlay.style.display = 'none';
      banner.style.display = 'none';
      document.cookie = 'bos_popup_closed=1;path=/;max-age=' + POPUP_COOLDOWN;
      window.scrollTo({top:0,behavior:'smooth'});
    });

    overlay.addEventListener('click', function(e){ if (e.target === overlay) closePopup(); });

    document.getElementById('bos-banner-close').addEventListener('click', function(){
      banner.style.display = 'none';
    });

    // Appliquer code promo
    var ci = document.querySelector('[name="coupon"], [name="discount"], .coupon-input, #coupon');
    if (ci && !ci.value) ci.value = DISCOUNT_CODE;

    try { if (window.umami) umami.track('view_promo', {discount: DISCOUNT_PCT, page: location.pathname}); } catch(e) {}
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
