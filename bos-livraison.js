/* bos-livraison.js — BOS 25/07/2026 (v2)
 *
 * POURQUOI : les fiches annonçaient « Livraison estimée 12 à 20 jours ouvrés » — une FOURCHETTE de
 * 8 jours ouvrés (17 à 28 jours calendaires). Les données de Purple Dot (2025, dizaines de milliers
 * de produits) montrent que ce n'est pas la LONGUEUR de l'attente qui fait chuter la conversion,
 * mais la LARGEUR de la fenêtre annoncée : « la conversion risque d'être divisée par deux ».
 * Un acheteur supporte d'attendre ; il ne supporte pas de ne pas savoir quand.
 *
 * CE QUE FAIT CE SCRIPT : il remplace la fourchette abstraite par une DATE CALENDAIRE au plus tard,
 * recalculée à chaque chargement. On annonce la BORNE HAUTE (jamais une date optimiste) : la promesse
 * est donc toujours tenable, et souvent battue — ce qui produit un client content plutôt que déçu.
 *
 * v2 : ne réécrit QUE le segment de délai, sans réintroduire « Livraison offerte » (qui précède
 * souvent déjà dans la phrase) — évite « Livraison offerte — Livraison offerte — … ».
 *
 * DÉGRADATION GRACIEUSE : si le script ne se charge pas, le texte d'origine reste affiché.
 */
(function () {
  'use strict';

  var JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  var MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
              'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

  // 20 jours ouvrés de transit + 3 de préparation = borne haute, convertie en calendaire (~1,4×)
  function dateAuPlusTard() {
    var d = new Date();
    d.setDate(d.getDate() + 32);
    return JOURS[d.getDay()] + ' ' + d.getDate() + ' ' + MOIS[d.getMonth()];
  }

  function remplacer() {
    var date = dateAuPlusTard();
    var phrase = 'chez vous au plus tard le ' + date;

    // Chaque motif est remplacé par SA propre formulation, adaptée au contexte de la phrase.
    var regles = [
      [/Livraison\s+estim[ée]e?\s*:?\s*12\s*[àa]\s*20\s*jours\s*ouvr[ée]s/gi, 'Livraison ' + phrase],
      [/estim[ée]e?\s+12\s*[àa]\s*20\s*jours\s*ouvr[ée]s/gi, phrase],
      [/Livraison\s*12\s*-\s*20\s*j\b/gi, 'Livré avant le ' + date],
      [/12\s*[àa]\s*20\s*jours\s*ouvr[ée]s/gi, phrase]
    ];

    var it = document.createNodeIterator(document.body, NodeFilter.SHOW_TEXT, null);
    var n, cibles = [];
    while ((n = it.nextNode())) {
      var t = n.nodeValue;
      if (!t || t.indexOf('20') === -1) continue;
      for (var i = 0; i < regles.length; i++) {
        regles[i][0].lastIndex = 0;
        if (regles[i][0].test(t)) { cibles.push(n); break; }
      }
    }

    cibles.forEach(function (node) {
      var v = node.nodeValue;
      regles.forEach(function (r) { r[0].lastIndex = 0; v = v.replace(r[0], r[1]); });
      // nettoyage : jamais deux « Livraison offerte » de suite
      v = v.replace(/(Livraison offerte[\s—\-·]*){2,}/gi, 'Livraison offerte — ');
      node.nodeValue = v;
    });
    return cibles.length;
  }

  function go() {
    try {
      remplacer();
      var passes = 0;
      var t = setInterval(function () {
        remplacer();
        if (++passes > 6) clearInterval(t);
      }, 900);
    } catch (e) { /* silence : on laisse le texte d'origine */ }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go);
  else go();
})();
