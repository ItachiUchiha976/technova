/* bos-livraison.js — BOS 25/07/2026
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
    var cible = dateAuPlusTard();
    var motifs = [
      /Livraison\s+estim[ée]e?\s*:?\s*12\s*[àa]\s*20\s*jours\s*ouvr[ée]s/gi,
      /Livraison\s*12\s*-\s*20\s*j\b/gi,
      /12\s*[àa]\s*20\s*jours\s*ouvr[ée]s/gi
    ];
    var remplacement = 'Livraison offerte — chez vous au plus tard le ' + cible;

    var it = document.createNodeIterator(document.body, NodeFilter.SHOW_TEXT, null);
    var n, aTraiter = [];
    while ((n = it.nextNode())) {
      var t = n.nodeValue;
      if (!t || t.indexOf('20') === -1) continue;
      for (var i = 0; i < motifs.length; i++) {
        if (motifs[i].test(t)) { aTraiter.push(n); break; }
      }
    }
    aTraiter.forEach(function (node) {
      var v = node.nodeValue;
      motifs.forEach(function (m) { v = v.replace(m, remplacement); });
      node.nodeValue = v;
    });
    return aTraiter.length;
  }

  function go() {
    try {
      var n = remplacer();
      // le panier et les onglets se construisent après coup : on repasse quelques fois
      var passes = 0;
      var t = setInterval(function () {
        remplacer();
        if (++passes > 6) clearInterval(t);
      }, 900);
      if (window.console && n) console.debug('[BOS] délai de livraison affiché en date calendaire');
    } catch (e) { /* silence : on laisse le texte d'origine */ }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go);
  else go();
})();
