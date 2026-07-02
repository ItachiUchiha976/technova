/* BOS — Consentement CNIL + balise publicitaire Pinterest (Tag ID 2612580380373). Ajout 02/07/2026.
   Bandeau discret bas de page : Accepter / Refuser. Choix persiste en localStorage, par boutique.
   Accepte (au clic ou au retour) -> charge le code Pinterest officiel (pintrk) + evenement
   pagevisit sur les fiches produit. Refuse (ou aucun choix) -> AUCUN script tiers n'est charge. */
(function () {
  'use strict';
  var PINTEREST_TAG_ID = '2612580380373';

  function boutiqueSlug() {
    try {
      var p = location.pathname.split('/').filter(Boolean);
      return p[0] || location.hostname || 'boutique';
    } catch (e) { return 'boutique'; }
  }
  var CONSENT_KEY = 'bos_consent_pinterest_' + boutiqueSlug();

  function getConsent() {
    try { return localStorage.getItem(CONSENT_KEY); } catch (e) { return null; }
  }
  function setConsent(v) {
    try { localStorage.setItem(CONSENT_KEY, v); } catch (e) {}
  }

  function isProductPage() {
    try {
      var file = (location.pathname.split('/').pop() || '');
      return /^produit-/.test(file);
    } catch (e) { return false; }
  }

  function firePageVisit() {
    try { if (window.pintrk && isProductPage()) window.pintrk('track', 'pagevisit'); } catch (e) {}
  }

  function loadPinterestTag() {
    if (window.pintrk) { firePageVisit(); return; }
    !function (e) {
      if (!window.pintrk) {
        window.pintrk = function () { window.pintrk.queue.push(Array.prototype.slice.call(arguments)); };
        var n = window.pintrk; n.queue = []; n.version = '3.0';
        var t = document.createElement('script'); t.async = true; t.src = e;
        var r = document.getElementsByTagName('script')[0];
        r.parentNode.insertBefore(t, r);
      }
    }('https://s.pinimg.com/ct/core.js');
    window.pintrk('load', PINTEREST_TAG_ID);
    window.pintrk('page');
    firePageVisit();
  }

  function removeBanner() {
    var el = document.getElementById('bos-consent-banner');
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  function showBanner() {
    if (document.getElementById('bos-consent-banner')) return;
    var offset = 0;
    try {
      var other = document.querySelector('.cookie-banner');
      if (other && other.offsetParent !== null) offset = other.offsetHeight;
    } catch (e) {}
    var el = document.createElement('div');
    el.id = 'bos-consent-banner';
    el.setAttribute('style',
      'position:fixed;left:0;right:0;bottom:' + offset + 'px;z-index:99999;' +
      'background:rgba(18,18,20,.96);color:#f2f2f2;padding:14px 16px;' +
      'font:14px/1.45 -apple-system,Segoe UI,Roboto,Arial,sans-serif;' +
      'display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:12px;' +
      'box-shadow:0 -2px 12px rgba(0,0,0,.3)');
    el.innerHTML =
      '<span style="flex:1 1 260px;min-width:200px">🍪 On utilise une balise Pinterest pour mesurer nos publicités.</span>' +
      '<span style="display:flex;gap:8px;flex-shrink:0">' +
      '<button type="button" id="bos-consent-refuse" style="background:transparent;color:#f2f2f2;border:1px solid #888;border-radius:6px;padding:9px 16px;cursor:pointer;font-size:13px;min-height:40px">Refuser</button>' +
      '<button type="button" id="bos-consent-accept" style="background:#e60023;color:#fff;border:none;border-radius:6px;padding:9px 16px;cursor:pointer;font-size:13px;font-weight:600;min-height:40px">Accepter</button>' +
      '</span>';
    document.body.appendChild(el);
    document.getElementById('bos-consent-accept').addEventListener('click', function () {
      setConsent('yes'); removeBanner(); loadPinterestTag();
    });
    document.getElementById('bos-consent-refuse').addEventListener('click', function () {
      setConsent('no'); removeBanner();
    });
  }

  function init() {
    var c = getConsent();
    if (c === 'yes') { loadPinterestTag(); return; }
    if (c === 'no') { return; }
    showBanner();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* Expose pour debug/QA */
  window.bosConsentStatus = getConsent;
})();
