/* bos-nav-produits.js — menu catalogue des boutiques BOS (29/07/2026)

   POURQUOI CE FICHIER EXISTE
   Constat du 29/07 : les menus des boutiques ne listaient quasiment aucun produit.
   Curiosa affichait 0 produit sur 6, FocusLab 0 sur 7. Un visiteur arrivé sur une
   page produit n'avait aucun moyen de découvrir le reste du catalogue — il repartait.

   CE QUE FAIT CE SCRIPT
   1. injecte dans le <nav> existant un menu « Boutique » déroulant, organisé en
      CATÉGORIES, listant TOUS les produits vendables de la marque ;
   2. masque la barre de menu quand on défile vers le bas, la fait revenir quand on
      remonte (même comportement que le site maths, `bos-nav-shrink.js`) ;
   3. ⭐ n'affiche JAMAIS un produit suspendu : la liste des non-livrables est lue
      dans `window.BOS_NON_LIVRABLES`, exposée par bos-stripe.js. Un produit sans SKU
      disparaît donc du menu tout seul, et réapparaît dès qu'il est re-sourcé.

   Aucune retouche HTML des pages : tout est injecté en JS. Idempotent.
*/
(function () {
  'use strict';

  /* Catalogue par marque. Le domaine décide de la marque : un seul fichier sert
     les 5 boutiques, ce qui évite d'avoir 5 versions à maintenir en parallèle. */
  var CATALOGUE = {
    'curiosaboutique.fr': [
      { titre: 'Objets de curiosité', produits: [
        { nom: 'Lampe Lune en lévitation', url: 'produit-globe-levitation.html', cle: 'lampe-lune-3d' },
        { nom: 'Statuette égyptienne',     url: 'produit-statuette.html',        cle: 'statue-bastet' },
        { nom: 'Sablier magnétique',       url: 'produit-sablier.html',          cle: 'sablier-magnetique' },
        { nom: 'Boîte-énigme',             url: 'produit-boite-enigme.html',     cle: 'puzzle-box' } ] },
      { titre: 'Papeterie', produits: [
        { nom: 'Carnet de voyage',         url: 'produit-carnet.html',           cle: 'journal-infini' },
        { nom: 'Carte du monde',           url: 'produit-carte.html',            cle: 'carte-du-monde-vintage' } ] }
    ],
    'serenlabboutique.fr': [
      { titre: 'Sommeil', produits: [
        { nom: 'Masque Bluetooth',         url: 'produit-masque-bluetooth.html', cle: 'masque-sommeil-bluetooth' },
        { nom: 'Lampe de lecture',         url: 'produit-lampe-lecture.html',    cle: 'lampe-de-lecture-led' },
        { nom: 'Oreiller rafraîchissant',  url: 'produit-oreiller-gel.html',     cle: 'oreiller-rafraichissant' },
        { nom: 'Machine à sons blancs',    url: 'produit-machine-sons.html',     cle: 'machine-a-sons-blancs' } ] },
      { titre: 'Soin & récupération', produits: [
        { nom: 'Masque LED visage',        url: 'produit-masque-led.html',       cle: 'masque-led-visage' },
        { nom: 'Masque gel yeux',          url: 'produit-masque-gel.html',       cle: 'masque-gel-yeux' },
        { nom: 'Gua Sha & Roller',         url: 'produit-gua-sha.html',          cle: 'kit-gua-sha-premium' } ] }
    ],
    'technovaboutique.fr': [
      { titre: 'Image & son', produits: [
        { nom: 'Projecteur Wi-Fi',         url: 'produit-projecteur-wifi.html',  cle: 'mini-projecteur-portable' },
        { nom: 'Enceinte à lévitation',    url: 'produit-enceinte-levitation.html', cle: 'enceinte-levitation-blanc' },
        { nom: 'Micro-cravate sans fil',   url: 'produit-micro-cravate.html',    cle: 'microphone-pro-streaming' } ] },
      { titre: 'Bureau connecté', produits: [
        { nom: 'Lampe de bureau 3-en-1',   url: 'produit-lampe-bureau-3en1.html', cle: 'lampe-led-bureau' },
        { nom: 'Chargeur sans fil 3-en-1', url: 'produit-chargeur-sans-fil.html', cle: 'chargeur-sans-fil-3-en-1' },
        { nom: 'Ventilateur de bureau',    url: 'produit-ventilateur-bureau.html', cle: 'ventilateur-portable' },
        { nom: 'Bundle écran + trépied',   url: 'produit-bundle-ecran-trepied.html', cle: 'bundle-ecran' } ] }
    ],
    'focuslabboutique.fr': [
      { titre: 'Concentration', produits: [
        { nom: 'Minuteur Pomodoro',        url: 'produit-minuteur-pomodoro.html', cle: 'timer-pomodoro' },
        { nom: 'Barre lumineuse écran',    url: 'produit-barre-lumineuse.html',   cle: 'barre-lumineuse-ecran' },
        { nom: 'Lampe LED de bureau',      url: 'produit-lampe-led.html',         cle: 'lampe-led-focus' } ] },
      { titre: 'Poste de travail', produits: [
        { nom: 'Tapis de bureau XXL',      url: 'produit-tapis-bureau.html',      cle: 'tapis-bureau-premium' },
        { nom: 'Support ordinateur',       url: 'produit-support-laptop.html',    cle: 'support-pc-portable' },
        { nom: 'Organiseur de câbles',     url: 'produit-organiseur-cables.html', cle: 'organisateur-cables' },
        { nom: 'Tiroir sous-bureau',       url: 'produit-tiroir-invisible.html',  cle: 'tiroir-sous-bureau' } ] }
    ]
  };

  function marque() {
    var h = location.hostname.replace(/^www\./, '');
    for (var d in CATALOGUE) if (h.indexOf(d.split('.')[0]) !== -1) return CATALOGUE[d];
    return null;
  }

  /* Liste de SECOURS des produits suspendus.
     Pourquoi la dupliquer ici : bos-stripe.js (qui expose window.BOS_NON_LIVRABLES)
     n'est chargé que sur les pages AYANT un bouton d'achat — pas sur l'accueil ni
     sur les pages annexes. Sans ce filet, le menu de l'accueil proposerait des
     produits qu'on ne sait pas expédier. La liste de bos-stripe.js reste
     prioritaire quand elle existe : une seule source de vérité à mettre à jour. */
  var SUSPENDUS_SECOURS = [
    'masque-de-nuit-premium', 'machine-a-sons-blancs', 'enceinte-bluetooth-vintage',
    'ecran-secondaire-portable', 'mini-imprimante-portable', 'bundle-ecran', 'lampe-led-focus', 'tiroir-sous-bureau', 'cible-de-precision', 'protege-tibias-carbone',
    'gants-gardien-pro', 'parachute-de-resistance', 'cones-de-marquage',
    'echelle-agilite', 'balle-de-reaction'
  ];
  /* Produits RETIRÉS définitivement (marge impossible) : leur page existe encore mais
     ils ne doivent apparaître nulle part dans la navigation. Sans cette liste, leur
     onglet restait dans la barre — constaté le 29/07 avec « Imprimante » sur TechNova. */
  var PAGES_RETIREES = ['produit-imprimante-thermique'];

  var PAGES_SECOURS = [
    'produit-machine-sons', 'produit-masque-nuit', 'produit-imprimante-thermique',
    'produit-bundle-ecran-trepied', 'produit-tiroir-invisible',
    'produit-cible-precision', 'produit-protege-tibias', 'produit-gants-gardien',
    'produit-parachute', 'produit-cones', 'produit-echelle-agilite', 'produit-balle-reaction'
  ];

  /* Un produit suspendu (sans SKU fournisseur) ne doit pas apparaître au menu :
     inutile d'envoyer un visiteur vers une page où il ne peut pas acheter. */
  function estSuspendu(cle, url) {
    var liste = (window.BOS_NON_LIVRABLES && window.BOS_NON_LIVRABLES.length)
                ? window.BOS_NON_LIVRABLES : SUSPENDUS_SECOURS;
    var pages = (window.BOS_PAGES_NON_LIVRABLES && window.BOS_PAGES_NON_LIVRABLES.length)
                ? window.BOS_PAGES_NON_LIVRABLES : PAGES_SECOURS;
    if (liste.indexOf(cle) !== -1) return true;
    var f = (url || '').replace(/\.html?$/, '');
    return pages.indexOf(f) !== -1;
  }

  function styles() {
    if (document.getElementById('bos-nav-produits-css')) return;
    var s = document.createElement('style');
    s.id = 'bos-nav-produits-css';
    s.textContent = [
      '.header{transition:transform .28s ease}',
      '.header.nav-hidden{transform:translateY(-100%)}',
      '.bos-cat{position:relative}',
      '.bos-cat>summary{list-style:none;cursor:pointer;display:inline-flex;align-items:center;gap:5px}',
      '.bos-cat>summary::-webkit-details-marker{display:none}',
      '.bos-cat>summary::after{content:"";border:4px solid transparent;border-top-color:currentColor;margin-top:3px}',
      '.bos-cat[open]>summary::after{transform:rotate(180deg);margin-top:-3px}',
      '.bos-cat-menu{position:absolute;top:100%;left:0;min-width:232px;z-index:120;',
      ' background:#fff;border:1px solid rgba(0,0,0,.12);border-radius:10px;',
      ' box-shadow:0 12px 30px rgba(0,0,0,.14);padding:8px;margin-top:8px}',
      '.bos-cat-menu h4{margin:8px 10px 4px;font-size:.72rem;letter-spacing:.06em;',
      ' text-transform:uppercase;color:#6b7280}',
      '.bos-cat-menu a{display:block;padding:8px 10px;border-radius:7px;text-decoration:none;',
      ' font-size:.92rem;color:#16202e;white-space:nowrap}',   /* JAMAIS color:inherit : le fond
         du menu est blanc alors que les boutiques sombres (TechNova) heritent d'un texte gris
         clair -> libelles invisibles. Bug constate le 29/07. */
      '.bos-cat-menu a:hover{background:rgba(0,0,0,.06)}',
      '@media(max-width:900px){.bos-cat-menu{position:static;box-shadow:none;border:0;',
      ' min-width:0;padding:0;margin:4px 0 8px 10px}}'
    ].join('');
    document.head.appendChild(s);
  }

  function init() {
    var cats = marque();
    if (!cats) return;
    var header = document.querySelector('header, .header');
    if (!header || header.dataset.bosNavProduits) return;
    var liste = header.querySelector('.nav-list, nav ul');
    if (!liste) return;
    header.dataset.bosNavProduits = '1';
    styles();

    var d = document.createElement('details');
    d.className = 'bos-cat';
    var s = document.createElement('summary');
    s.className = 'nav-link';
    s.textContent = 'Boutique';
    d.appendChild(s);

    var menu = document.createElement('div');
    menu.className = 'bos-cat-menu';
    var total = 0;
    cats.forEach(function (c) {
      var visibles = c.produits.filter(function (p) { return !estSuspendu(p.cle, p.url); });
      if (!visibles.length) return;
      var h4 = document.createElement('h4');
      h4.textContent = c.titre;
      menu.appendChild(h4);
      visibles.forEach(function (p) {
        var a = document.createElement('a');
        a.href = p.url;
        a.textContent = p.nom;
        menu.appendChild(a);
        total++;
      });
    });
    if (!total) return;            // aucune raison d'ajouter un menu vide
    d.appendChild(menu);

    var li = document.createElement('li');
    li.appendChild(d);
    liste.insertBefore(li, liste.children[1] || null);

    /* ── MENU MOBILE ────────────────────────────────────────────────────────
       Les boutiques ont un panneau mobile distinct (`nav.mobile-menu`), qui ne
       listait que 4 produits sur 6 chez SérénLab — les deux re-sourcés du 29/07
       n'y étaient pas. Or la majorité du trafic vient du mobile (Shorts) : un
       catalogue invisible sur téléphone, c'est un catalogue qui n'existe pas.
       On complète donc ce panneau avec les produits manquants, et on en retire
       ceux qui ne sont plus livrables. */
    function enrichirMenuMobile() {
    var mob = document.querySelector('nav.mobile-menu, .mobile-menu');
    if (mob) {
      var deja = {};
      Array.prototype.forEach.call(mob.querySelectorAll('a'), function (a) {
        var h = (a.getAttribute('href') || '').split('/').pop();
        deja[h] = a;
      });
      var modele = mob.querySelector('a');
      cats.forEach(function (c) {
        c.produits.forEach(function (p) {
          var suspendu = estSuspendu(p.cle, p.url);
          if (deja[p.url]) {                    // déjà listé : on le retire s'il est suspendu
            if (suspendu) deja[p.url].style.display = 'none';
            return;
          }
          if (suspendu || !modele) return;      // absent et suspendu : on ne l'ajoute pas
          var a = document.createElement('a');
          a.href = p.url;
          a.textContent = p.nom;
          a.className = modele.className;
          /* inséré juste après le dernier produit connu, pour rester groupé avec eux */
          var ancre = null;
          Object.keys(deja).forEach(function (h) { if (/^produit-/.test(h)) ancre = deja[h]; });
          if (ancre && ancre.parentNode) ancre.parentNode.insertBefore(a, ancre.nextSibling);
          else mob.appendChild(a);
          deja[p.url] = a;
        });
      });
    }
    }

    /* Le panneau mobile est reconstruit par le script de la boutique à CHAQUE
       ouverture (constaté le 29/07 : les liens ajoutés disparaissaient au clic).
       On ré-applique donc l'enrichissement après chaque ouverture, et on observe
       le DOM pour couvrir les reconstructions asynchrones. */
    enrichirMenuMobile();
    document.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('.hamburger, .nav-burger, [class*=burger]')) {
        setTimeout(enrichirMenuMobile, 60);
        setTimeout(enrichirMenuMobile, 350);
      }
    }, true);
    try {
      var cible = document.querySelector('nav.mobile-menu, .mobile-menu');
      if (cible && window.MutationObserver) {
        var obs = new MutationObserver(function () {
          if (obs._occupe) return;
          obs._occupe = true;
          setTimeout(function () { enrichirMenuMobile(); obs._occupe = false; }, 80);
        });
        obs.observe(cible, { childList: true });
      }
    } catch (e) {}


    /* La barre était déjà pleine : en y ajoutant « Boutique », les entrées produits
       individuelles faisaient doublon et débordaient sur deux lignes (constaté en
       capture le 29/07). Comme le menu contient TOUS les produits, on retire de la
       barre les liens qui pointent vers une page produit — le menu devient la seule
       porte d'entrée du catalogue, et la barre respire. */
    try {
    var urlsDuMenu = {};
    cats.forEach(function (c) { c.produits.forEach(function (p) { urlsDuMenu[p.url] = 1; }); });
    Array.prototype.slice.call(liste.querySelectorAll('li')).forEach(function (item) {
      if (item === li) return;
      var liens = item.querySelectorAll('a');
      if (!liens.length) return;
      /* Certains <li> mêlent un lien produit ET un lien d'article (ex. « Masque
         Bluetooth » + « Lumière bleue & sommeil »). On ne masque alors QUE le lien
         produit : l'article reste accessible, et les deux libellés ne se collent plus. */
      var produits = 0;
      Array.prototype.forEach.call(liens, function (a) {
        var href = (a.getAttribute('href') || '').split('/').pop();
        var retire = PAGES_RETIREES.indexOf(href.replace(/\.html?$/, '')) !== -1;
        if (urlsDuMenu[href] || retire) { a.style.display = 'none'; produits++; }
      });
      if (produits === liens.length) item.style.display = 'none';
    });
    } catch (e) { /* le nettoyage est cosmétique : il ne doit jamais bloquer le reste */ }

    /* fermeture au clic extérieur et à Échap */
    document.addEventListener('click', function (e) { if (!d.contains(e.target)) d.removeAttribute('open'); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') d.removeAttribute('open'); });

    /* masquage au défilement (repris du site maths) */
    var lastY = window.pageYOffset || 0, ticking = false;
    var ZONE_HAUTE = 60, SEUIL = 6;
    function update() {
      ticking = false;
      var y = window.pageYOffset || document.documentElement.scrollTop || 0;
      if (y <= ZONE_HAUTE) { header.classList.remove('nav-hidden'); lastY = y; return; }
      if (Math.abs(y - lastY) < SEUIL) return;
      if (y > lastY) { header.classList.add('nav-hidden'); d.removeAttribute('open'); }
      else header.classList.remove('nav-hidden');
      lastY = y;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { window.requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
  }

  /* bos-stripe.js expose BOS_NON_LIVRABLES : on lui laisse le temps de se charger,
     sinon un produit suspendu s'afficherait quand même au premier rendu. */
  function demarrer() { setTimeout(init, 350); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', demarrer);
  else demarrer();
})();
