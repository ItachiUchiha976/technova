/* BOS — Fonction de rétractation en ligne (obligation légale depuis le 19/06/2026).
   Ordonnance n°2026-2 + décret n°2026-3 (transposition directive UE 2023/2673).
   - Lien "Renoncer au contrat / Droit de rétractation" accessible en permanence.
   - Formulaire dédié + bouton de confirmation "Confirmer la rétractation".
   - Le back-end (VPS api.tonargentexplique.fr/retractation) envoie un accusé de
     réception au client (support durable = email) ET notifie le marchand.
   Composant autonome, sans dépendance externe. */
(function () {
  'use strict';
  function init() {
  if (document.getElementById('bos-retract-link')) return;

  var API = 'https://api.tonargentexplique.fr/retractation';
  var domaine = location.hostname.replace(/^www\./, '');

  // ---- styles (injectés une fois) ----
  var css = '' +
    '#bos-retract-link{position:fixed;left:12px;bottom:12px;z-index:9998;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-size:12px;color:#fff;background:rgba(30,27,75,.82);border:1px solid rgba(255,255,255,.25);border-radius:20px;padding:6px 12px;cursor:pointer;text-decoration:none;box-shadow:0 2px 8px rgba(0,0,0,.2);backdrop-filter:blur(4px);}' +
    '#bos-retract-link:hover{background:rgba(30,27,75,.95);}' +
    '#bos-retract-overlay{position:fixed;inset:0;z-index:10050;background:rgba(0,0,0,.55);display:none;align-items:flex-start;justify-content:center;overflow-y:auto;padding:24px 12px;}' +
    '#bos-retract-modal{background:#fff;color:#1f2937;max-width:520px;width:100%;border-radius:14px;padding:22px 22px 18px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;box-shadow:0 12px 40px rgba(0,0,0,.3);margin:auto;}' +
    '#bos-retract-modal h2{margin:0 0 4px;font-size:19px;color:#312e81;}' +
    '#bos-retract-modal p.sub{margin:0 0 14px;font-size:13px;color:#6b7280;line-height:1.5;}' +
    '#bos-retract-modal label{display:block;font-size:13px;font-weight:600;margin:10px 0 4px;color:#374151;}' +
    '#bos-retract-modal input,#bos-retract-modal textarea{width:100%;box-sizing:border-box;padding:9px 11px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;font-family:inherit;}' +
    '#bos-retract-modal textarea{min-height:64px;resize:vertical;}' +
    '#bos-retract-modal .req{color:#dc2626;}' +
    '#bos-retract-actions{display:flex;gap:10px;margin-top:16px;flex-wrap:wrap;}' +
    '#bos-retract-confirm{flex:1;min-width:180px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:0;border-radius:9px;padding:12px;font-size:15px;font-weight:700;cursor:pointer;}' +
    '#bos-retract-confirm:disabled{opacity:.6;cursor:default;}' +
    '#bos-retract-cancel{background:#f3f4f6;color:#374151;border:0;border-radius:9px;padding:12px 16px;font-size:14px;cursor:pointer;}' +
    '#bos-retract-msg{margin-top:12px;font-size:14px;line-height:1.5;}' +
    '#bos-retract-msg.ok{color:#059669;}#bos-retract-msg.ko{color:#dc2626;}' +
    '#bos-retract-legal{margin-top:14px;font-size:11px;color:#9ca3af;line-height:1.45;}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  // ---- lien permanent ----
  var link = document.createElement('a');
  link.id = 'bos-retract-link';
  link.href = 'javascript:void(0)';
  link.setAttribute('role', 'button');
  link.textContent = '↩ Droit de rétractation';
  document.body.appendChild(link);

  // ---- modale ----
  var overlay = document.createElement('div');
  overlay.id = 'bos-retract-overlay';
  overlay.innerHTML =
    '<div id="bos-retract-modal" role="dialog" aria-modal="true" aria-label="Formulaire de rétractation">' +
      '<h2>Renoncer au contrat (droit de rétractation)</h2>' +
      '<p class="sub">Vous disposez d\'un délai de <b>14 jours</b> pour vous rétracter, sans avoir à vous justifier. Remplissez ce formulaire : vous recevrez un <b>accusé de réception par email</b>. Le remboursement éventuel se fait sur le même moyen de paiement, sans frais.</p>' +
      '<label>Nom et prénom <span class="req">*</span></label>' +
      '<input id="bos-r-nom" type="text" autocomplete="name" />' +
      '<label>Email (celui de la commande) <span class="req">*</span></label>' +
      '<input id="bos-r-email" type="email" autocomplete="email" inputmode="email" />' +
      '<label>N° ou date de commande</label>' +
      '<input id="bos-r-cmd" type="text" placeholder="ex. commande du 12/07/2026" />' +
      '<label>Produit concerné</label>' +
      '<input id="bos-r-prod" type="text" />' +
      '<label>Motif (facultatif)</label>' +
      '<textarea id="bos-r-motif" placeholder="Optionnel — aucune justification n\'est requise."></textarea>' +
      '<div id="bos-retract-actions">' +
        '<button id="bos-retract-confirm" type="button">Confirmer la rétractation</button>' +
        '<button id="bos-retract-cancel" type="button">Annuler</button>' +
      '</div>' +
      '<div id="bos-retract-msg"></div>' +
      '<p id="bos-retract-legal">Conformément aux articles L221-18 et suivants du Code de la consommation. Cette fonction est accessible pendant toute la durée du délai de rétractation. Vous pouvez aussi nous écrire directement par email.</p>' +
    '</div>';
  document.body.appendChild(overlay);

  function open() { overlay.style.display = 'flex'; document.getElementById('bos-r-nom').focus(); }
  function close() { overlay.style.display = 'none'; }

  link.addEventListener('click', open);
  overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
  document.getElementById('bos-retract-cancel').addEventListener('click', close);

  var msg = overlay.querySelector('#bos-retract-msg');
  var btn = overlay.querySelector('#bos-retract-confirm');

  btn.addEventListener('click', function () {
    var nom = document.getElementById('bos-r-nom').value.trim();
    var email = document.getElementById('bos-r-email').value.trim();
    var cmd = document.getElementById('bos-r-cmd').value.trim();
    var prod = document.getElementById('bos-r-prod').value.trim();
    var motif = document.getElementById('bos-r-motif').value.trim();

    msg.className = '';
    if (!nom || !email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      msg.className = 'ko';
      msg.textContent = 'Merci d\'indiquer au moins votre nom et un email valide.';
      return;
    }
    btn.disabled = true; msg.className = ''; msg.textContent = 'Envoi en cours…';

    fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nom: nom, email: email, commande: cmd, produit: prod, motif: motif, domaine: domaine })
    })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (res.ok && res.j && res.j.ok) {
          msg.className = 'ok';
          msg.innerHTML = '✅ Votre demande de rétractation a bien été enregistrée. Un accusé de réception vient de vous être envoyé par email.';
          btn.style.display = 'none';
          document.getElementById('bos-retract-cancel').textContent = 'Fermer';
        } else {
          throw new Error('server');
        }
      })
      .catch(function () {
        btn.disabled = false;
        msg.className = 'ko';
        msg.innerHTML = 'Une erreur est survenue. Vous pouvez aussi nous écrire directement à <b>contact@' + domaine + '</b>.';
      });
  });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
