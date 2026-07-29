/* BOS — Checkout Stripe. Ajout 08/07/2026.
   - Pages produit : lien direct Stripe Payment Link (1 produit = 1 lien).
   - Page panier : endpoint VPS qui crée une session checkout avec le montant exact.
   Encaisse vers le compte Stripe de la boutique. */

(function(){
  'use strict';

  /* ─────────────────────────────────────────────────────────────────────────
     BOS 29/07/2026 — GARDE-FOU « PRODUIT NON LIVRABLE »

     Pourquoi : 24 des 47 produits du mapping d'expédition n'ont AUCUN SKU
     fournisseur (`cj_sku: null`, vérifié sur l'API CJ le 28/07). Leur page
     restait pourtant entièrement achetable : un client pouvait payer un
     article que nous ne savons pas commander. Le back-office alerte bien
     dans ce cas, mais l'argent est déjà encaissé et le client attend.

     Ce garde-fou coupe la vente EN AMONT : plus de bouton de paiement, plus
     d'ajout au panier, et un message honnête à la place. La page reste en
     ligne (référencement, catalogue) — seul l'achat est suspendu.

     Pour remettre un produit en vente : retirer sa clé de la liste ci-dessous
     APRÈS avoir renseigné son cj_sku dans fulfillment_products.json, et
     seulement si les photos de la page correspondent au produit réel (§12.23).
     ───────────────────────────────────────────────────────────────────────── */
  /* MAJ 29/07/2026 : 4 produits RETIRES de cette liste apres re-sourcing par
     recherche d'image CJ (BOITE 101) et verification de marge :
     lampe-de-lecture-led, oreiller-rafraichissant, masque-bluetooth-duo,
     microphone-pro-streaming. Ils sont de nouveau achetables. */
  /* Produits RETIRÉS DÉFINITIVEMENT (aucun fournisseur ne tient leur prix public).
     Ils méritent un message différent de « temporairement indisponible » : des
     publicités déjà en ligne renvoient encore vers ces pages (une épingle Pinterest
     annonce même l'imprimante à 49 €), et l'API ne permet pas de les supprimer sur
     Pinterest/Instagram/TikTok. Plutôt qu'un cul-de-sac trompeur, on dit la vérité
     et on renvoie vers le reste de la boutique. */
  var BOS_RETIRES = ['mini-imprimante-portable', 'buts-pop-up'];
  var BOS_PAGES_RETIREES = ['produit-imprimante-thermique', 'produit-buts-pop-up'];

  /* ⚠️ CAS PARTICULIER — une PAGE D'ACCUEIL peut être elle-même une page produit.
     Trou découvert le 29/07/2026 : footperf.fr/ vendait les buts pop-up à 44,00 €
     (panier + carte + PayPal) alors que le produit coûte 51,57 USD port compris et
     n'a aucun SKU dans le mapping — donc vente à perte ET aucune commande
     fournisseur n'aurait été créée. Le garde-fou ne voyait rien parce qu'il
     identifie le produit par le NOM DE FICHIER, et l'accueil s'appelle « index ».
     Un but de foot est encombrant : 40 USD de fret pour un article à 11 USD. Aucun
     fournisseur ne changera cela, et c'est une commodité qu'on trouve en magasin
     (§12.27) → produit retiré, la boutique garde son Guide Coupe du Monde à 4,90 €,
     qui est digital, livré automatiquement et sans aucun coût fournisseur.

     ⚠️ Sur un accueil, le message doit NOMMER le produit retiré. Première version
     testée le 29/07 : le bandeau « Ce produit n'est plus proposé » s'insérait sous
     le <h1>, or ce <h1> est celui du Guide Coupe du Monde — le visiteur lisait donc
     que LE GUIDE n'était plus vendu, alors qu'il est justement le seul produit
     rentable de la page. Un message générique n'est pas neutre : sur une page qui
     présente plusieurs produits, il désigne le mauvais. */
  var BOS_ACCUEILS_PRODUIT = {
    'footperf.fr': {
      cle: 'buts-pop-up',
      nom: 'Le set de 2 buts de foot pop-up',
      /* #produits : ancre réellement présente dans la page (vérifiée le 29/07).
         « #guide » n'existe pas — un lien mort dans un message d'excuse est pire
         que pas de lien du tout. */
      suite: '<a href="#produits" style="color:#8a6d3b;font-weight:600">' +
             'Le Guide &amp; Grand Quiz de la Coupe du Monde 2026 reste disponible — 4,90 € →</a>'
    }
  };

  var BOS_NON_LIVRABLES = [
    'balle-de-reaction',
    'bundle-ecran',
    'cible-de-precision',
    'cones-de-marquage',
    'echelle-agilite',
    'ecran-secondaire-portable',
    'enceinte-bluetooth-vintage',
    'gants-gardien-pro',
    'masque-de-nuit-premium',
    'mini-imprimante-portable',
    'parachute-de-resistance',
    'protege-tibias-carbone',
    'tiroir-sous-bureau'
  ];

  /* Les URL des pages ne reprennent pas toujours la clé du mapping
     (ex. « produit-micro-cravate.html » = microphone-pro-streaming).
     On liste donc aussi les noms de fichiers réellement en ligne. */
  var BOS_PAGES_NON_LIVRABLES = [
    'produit-bundle-ecran-trepied',
    'produit-imprimante-thermique',
    'produit-tiroir-invisible'
  ];

  /* Exposé au reste de la page : le menu catalogue (bos-nav-produits.js) s'en sert
     pour ne PAS proposer un produit qu'on ne peut pas vendre. Une seule source de
     vérité, donc aucun risque que le menu et le bouton d'achat se contredisent. */
  window.BOS_NON_LIVRABLES = BOS_NON_LIVRABLES;
  window.BOS_PAGES_NON_LIVRABLES = BOS_PAGES_NON_LIVRABLES;

  /* Charge le menu catalogue. Passer par ici plutot que d'ajouter une balise
     <script> dans les dizaines de pages produit : un seul point d'entree, et le
     menu s'execute forcement APRES que les listes ci-dessus existent. */
  (function () {
    if (document.getElementById('bos-nav-produits-js')) return;
    var s = document.createElement('script');
    s.id = 'bos-nav-produits-js';
    s.src = 'bos-nav-produits.js?v=20260729';
    s.defer = true;
    document.head.appendChild(s);
  })();

  /* L'adresse affichée au client doit être celle de SA boutique, pas notre boîte
     personnelle : écrire « apprentissage.feynman@gmail.com » sur une page TechNova
     trahit l'amateurisme et casse la confiance au moment le plus fragile.
     Chaque domaine a son contact@ (redirection OVH vers la boîte maître). */
  function bosEmailBoutique() {
    var h = location.hostname.replace(/^www\./, '');
    return /^[a-z0-9.-]+\.[a-z]{2,}$/.test(h) ? 'contact@' + h : 'contact@' + h;
  }

  /* Fiche de l'accueil-produit courant (ou null). Voir BOS_ACCUEILS_PRODUIT. */
  function bosAccueilProduit() {
    var f = location.pathname.replace(/\.html?$/, '').split('/').pop() || '';
    if (f && f !== 'index') return null;
    return BOS_ACCUEILS_PRODUIT[location.hostname.replace(/^www\./, '')] || null;
  }

  function bosProduitDAccueil() {
    var a = bosAccueilProduit();
    return a ? a.cle : null;
  }

  function bosPageNonLivrable() {
    var acc = bosProduitDAccueil();
    if (acc) return BOS_RETIRES.indexOf(acc) !== -1 ||
                    BOS_NON_LIVRABLES.indexOf(acc) !== -1;
    var f = location.pathname.replace(/\.html?$/, '').split('/').pop() || '';
    if (BOS_PAGES_NON_LIVRABLES.indexOf(f) !== -1) return true;
    var k = f.replace(/^produit-/, '');
    return BOS_NON_LIVRABLES.indexOf(k) !== -1;
  }

  /* ═══ CIBLAGE PAR BLOC PRODUIT ═══════════════════════════════════════════
     Chaque bouton d'ajout porte sa clé : addToCart('buts-pop-up'). C'est
     l'identifiant le plus fiable disponible, et il est identique sur les
     5 boutiques. On s'en sert pour neutraliser UNIQUEMENT le bloc concerné.

     ⚠️ Pourquoi ce ciblage est vital — régression réelle du 29/07/2026 :
     la première version masquait TOUS les boutons de la page dès qu'un produit
     était bloqué. Sur l'accueil FootPerf, qui présente 8 produits ET un guide,
     elle a masqué **18 boutons pour 3 à retirer** — les 7 autres articles, le
     panier et le bouton de paiement du guide. Le site était cassé.
     Règle : **une page qui présente plusieurs produits ne se traite jamais
     globalement.** Seule une fiche mono-produit peut l'être. */
  function bosCleDuBouton(el) {
    var oc = (el.getAttribute && el.getAttribute('onclick')) || '';
    var m = oc.match(/addToCart\(\s*['"]([^'"]+)['"]/);
    return m ? m[1] : null;
  }

  /* Remonte au conteneur qui représente CE produit (carte de grille, section
     vedette…), sans jamais dépasser le body. */
  function bosConteneurProduit(el) {
    var n = el;
    for (var i = 0; n && n !== document.body && i < 8; i++) {
      if (n.id && /^card-/.test(n.id)) return n;
      if (n.className && typeof n.className === 'string' &&
          /product-card|fiche-grid/.test(n.className)) return n;
      if (n.tagName === 'SECTION') return n;
      n = n.parentElement;
    }
    return el.parentElement || el;
  }

  function bosEstBoutonAchat(el) {
    var t = (el.textContent || '').toLowerCase();
    if (/retour|continuer mes achats|mentions|politique|livraison|rétractation/.test(t)) return false;
    if (bosCleDuBouton(el)) return true;
    var cl = (el.className && typeof el.className === 'string') ? el.className : '';
    if (/add-to-cart|buy-now|fiche-add|fiche-paypal|btn-buy|bos-cb-btn/.test(cl)) return true;
    var oc = (el.getAttribute && el.getAttribute('onclick')) || '';
    if (/bosProductCB|bosBuyNow|bosPayPalCheckout|ajouterAuPanier/.test(oc)) return true;
    /* « paypal » est inclus SANS risque parce que cette fonction ne s'applique
       qu'à l'intérieur d'un bloc produit déjà identifié comme bloqué — jamais à
       la page entière. Sans lui, le bouton « PayPal — payer sans saisir ma
       carte » du bloc buts restait cliquable sous le message de retrait
       (constaté en capture le 29/07). */
    return /ajouter au panier|acheter maintenant|payer par carte|paypal/.test(t);
  }

  /* Le message, en version pleine page ou compacte (dans une carte de grille). */
  function bosCreerMessage(cle, definitif, compact) {
    var box = document.createElement('div');
    box.className = 'bos-indispo-bloc';
    box.style.cssText = 'margin:' + (compact ? '10px 0 0' : '24px 0') + ';padding:' +
      (compact ? '10px 12px' : '18px 20px') + ';border:1px solid #e2c391;background:#fdf6e9;' +
      'border-radius:10px;color:#5b4a2a;font-size:' + (compact ? '13px' : '15px') +
      ';line-height:1.5;' + (compact ? '' : 'max-width:640px');
    var fiche = bosAccueilProduit();
    var nom = (fiche && fiche.cle === cle && fiche.nom) ? fiche.nom : null;
    if (definitif) {
      var titre = nom ? nom + " n'est plus proposé" : "Ce produit n'est plus proposé";
      var suite = (fiche && fiche.cle === cle && fiche.suite) ? fiche.suite : '';
      box.innerHTML = '<strong style="display:block;margin-bottom:4px">' + titre + '</strong>' +
        'Nous avons retiré cet article : nous ne pouvions plus le proposer au prix annoncé ' +
        'sans rogner sur la qualité ou les délais. Nous préférons vous le dire franchement.' +
        (suite ? '<br><br>' + suite : '');
      return box;
    }
    /* ⚠️ Formulation honnête : plusieurs de ces articles n'ont JAMAIS eu de
       fournisseur — parler de « réapprovisionnement » serait faux. */
    box.innerHTML = '<strong style="display:block;margin-bottom:4px">Bientôt disponible</strong>' +
      "Cet article n'est pas encore ouvert à la commande : nous préférons attendre un " +
      'fournisseur qui tienne nos délais plutôt que de vous faire patienter.<br>' +
      'Écrivez-nous à <a href="mailto:' + bosEmailBoutique() + '" style="color:#8a6d3b">' +
      bosEmailBoutique() + '</a> pour être prévenu(e).';
    return box;
  }

  function bosNeutraliserBloc(bloc, cle, definitif) {
    if (!bloc || bloc.getAttribute('data-bos-bloque')) return;
    bloc.setAttribute('data-bos-bloque', cle);
    var compact = !!(bloc.id && /^card-/.test(bloc.id));

    /* Une CARTE de grille dont le produit n'est pas vendable disparaît, au lieu
       d'afficher un message : dans une grille où d'autres articles s'achètent,
       une liste d'indisponibles donne l'image d'une boutique en panne. Le
       message n'a de sens que sur une fiche produit — là, le visiteur est venu
       pour CET article et mérite une explication. (29/07/2026) */
    if (compact) {
      bloc.style.display = 'none';
      return;
    }
    var ancre = null;
    Array.prototype.forEach.call(bloc.querySelectorAll('button, a, .checkout-stripe'),
      function (el) {
        if (!bosEstBoutonAchat(el)) return;
        if (!ancre && el.parentNode) ancre = el;
        el.style.display = 'none';
      });
    var msg = bosCreerMessage(cle, definitif, compact);
    /* On insère à la place des boutons masqués : le message se trouve donc là
       où le visiteur cherchait à acheter, pas en haut d'une autre section. */
    if (ancre && ancre.parentNode) ancre.parentNode.insertBefore(msg, ancre);
    else bloc.appendChild(msg);
  }

  /* Traite chaque produit bloqué présent dans la page, un bloc à la fois. */
  function bosTraiterBlocs() {
    var boutons = document.querySelectorAll('[onclick*="addToCart"]');
    Array.prototype.forEach.call(boutons, function (el) {
      var cle = bosCleDuBouton(el);
      if (!cle) return;
      var retire = BOS_RETIRES.indexOf(cle) !== -1;
      if (!retire && BOS_NON_LIVRABLES.indexOf(cle) === -1) return;
      bosNeutraliserBloc(bosConteneurProduit(el), cle, retire);
    });
    bosRangerGrilleVide();
  }

  /* Une grille où PLUS AUCUN article n'est achetable ne doit pas rester
     affichée : sept cartes barrées donnent l'image d'une boutique à l'abandon.
     On les retire et on laisse un seul message, qui oriente vers ce qui reste
     réellement en vente. Décision du 29/07/2026 sur FootPerf : les accessoires
     de foot sont des commodités (Decathlon les vend moins cher et les livre en
     2 jours) et le fret depuis la Chine mange la marge — 25 % sur l'échelle
     d'agilité, 40 % sur les gants, calculs faits à l'API. La boutique assume
     donc son produit rentable : le guide Coupe du Monde. */
  function bosRangerGrilleVide() {
    var grilles = document.querySelectorAll('#productsGrid, .products-grid, .product-grid');
    Array.prototype.forEach.call(grilles, function (g) {
      if (g.getAttribute('data-bos-range')) return;
      var cartes = g.querySelectorAll('[id^="card-"]');
      if (!cartes.length) return;
      var bloquees = g.querySelectorAll('[id^="card-"][data-bos-bloque]');
      if (bloquees.length !== cartes.length) return;   // il reste du vendable
      g.setAttribute('data-bos-range', '1');
      Array.prototype.forEach.call(cartes, function (c) { c.style.display = 'none'; });
      var fiche = bosAccueilProduit();
      var mot = document.createElement('div');
      mot.className = 'bos-indispo-bloc';
      mot.style.cssText = 'margin:8px auto;padding:20px 22px;border:1px solid #e2c391;' +
        'background:#fdf6e9;border-radius:12px;color:#5b4a2a;font-size:15px;' +
        'line-height:1.6;max-width:680px;text-align:center';
      mot.innerHTML = '<strong style="display:block;margin-bottom:6px;font-size:17px">' +
        'Le rayon équipement est fermé pour le moment</strong>' +
        'Nous ne voulions pas vous vendre du matériel que vous trouvez moins cher et ' +
        'plus vite ailleurs, ni vous faire attendre deux semaines pour des cônes. ' +
        'Nous préférons le dire franchement.' +
        (fiche && fiche.suite ? '<br><br>' + fiche.suite : '');
      g.parentNode.insertBefore(mot, g);
    });
  }

  /* Une fiche mono-produit peut, elle, être traitée globalement : toute la page
     ne parle que de ce produit. */
  function bosFicheMonoProduit() {
    var f = location.pathname.replace(/\.html?$/, '').split('/').pop() || '';
    return /^produit-/.test(f) || BOS_PAGES_NON_LIVRABLES.indexOf(f) !== -1 ||
           BOS_PAGES_RETIREES.indexOf(f) !== -1;
  }

  function bosBloquerAchat() {
    bosTraiterBlocs();
    if (!bosPageNonLivrable() || !bosFicheMonoProduit()) return;

    // 1) neutraliser tout ce qui déclenche un paiement ou un ajout au panier
    var selecteurs = [
      '.btn-buy', '[data-bos-cb]', '.checkout-stripe', '.bos-cb-btn',
      '[onclick*="addToCart"]', '[onclick*="ajouterAuPanier"]',
      '.add-to-cart', '.btn-add-cart', '.btn-panier', '#add-to-cart'
    ];
    /* On repère l'ancre AVANT de masquer quoi que ce soit : insérer le message
       dans un conteneur qu'on vient de passer en display:none le rendrait
       invisible (bug constaté en live le 29/07 : le message atterrissait dans
       .checkout-stripe, déjà masqué). L'ancre est donc le <h1>, jamais masqué. */
    var ancreVisible = document.querySelector('h1');

    var vus = [];
    selecteurs.forEach(function (s) {
      Array.prototype.forEach.call(document.querySelectorAll(s), function (el) {
        if (vus.indexOf(el) !== -1) return;
        vus.push(el);
        el.style.display = 'none';
      });
    });
    /* ⚠️ Ne JAMAIS couper le paiement d'un produit DIGITAL au passage.
       Sur footperf.fr, l'accueil vend à la fois les buts (retirés) et le Guide
       Coupe du Monde à 4,90 € — qui est livré par token, sans fournisseur, et
       constitue le seul produit rentable de cette boutique. Son bouton s'appelle
       « Payer par carte bancaire » : le filtre générique l'aurait masqué, tuant
       la seule vente possible de la page. On remonte donc quelques niveaux pour
       reconnaître un bloc digital et l'épargner. */
    function bosEstDigital(el) {
      var n = el, i = 0;
      while (n && i++ < 5) {
        if (n.getAttribute && n.getAttribute('data-bos-product-id')) return true;
        var t = (n.textContent || '').toLowerCase();
        if (/guide|pdf|t[ée]l[ée]charger|ebook|quiz/.test(t) && t.length < 700) return true;
        n = n.parentElement;
      }
      return false;
    }

    // tout bouton dont le texte parle de payer / panier / acheter
    Array.prototype.forEach.call(document.querySelectorAll('button, a'), function (el) {
      var t = (el.textContent || '').toLowerCase();
      if (/payer|ajouter au panier|acheter|commander|paypal/.test(t) &&
          !/retour|continuer mes achats|mentions/.test(t)) {
        if (bosEstDigital(el)) return;
        if (vus.indexOf(el) === -1) { vus.push(el); el.style.display = 'none'; }
      }
    });

    // 2) message honnête à la place
    if (!document.querySelector('#bos-indispo')) {
      var box = document.createElement('div');
      box.id = 'bos-indispo';
      box.style.cssText = 'margin:24px 0;padding:18px 20px;border:1px solid #e2c391;' +
        'background:#fdf6e9;border-radius:10px;color:#5b4a2a;font-size:15px;line-height:1.55;max-width:640px';
      var f = location.pathname.replace(/\.html?$/, '').split('/').pop() || '';
      var acc = bosProduitDAccueil();
      var definitif = BOS_PAGES_RETIREES.indexOf(f) !== -1 ||
                      BOS_RETIRES.indexOf(f.replace(/^produit-/, '')) !== -1 ||
                      (acc && BOS_RETIRES.indexOf(acc) !== -1);
      if (definitif) {
        /* Sur un accueil-produit, « voir le reste de la boutique » renverrait sur
           la page où l'on se trouve déjà — et un titre générique désignerait le
           mauvais produit. On nomme donc l'article retiré et on oriente vers
           l'offre qui reste réellement achetable. */
        var fiche = bosAccueilProduit();
        var titre = (fiche && fiche.nom)
          ? fiche.nom + " n'est plus proposé"
          : "Ce produit n'est plus proposé";
        var suite = (fiche && fiche.suite) ? fiche.suite
          : '<a href="index.html" style="color:#8a6d3b;font-weight:600">' +
            'Voir le reste de la boutique →</a>';
        box.innerHTML = '<strong style="display:block;margin-bottom:6px;font-size:16px">' +
          titre + '</strong>' +
          'Nous avons retiré cet article de la boutique : nous ne pouvions plus le proposer ' +
          'au prix annoncé sans rogner sur la qualité ou les délais. Nous préférons vous le ' +
          'dire franchement plutôt que de vous faire attendre.<br><br>' + suite;
        var ancre0 = document.querySelector('h1');
        if (ancre0 && ancre0.parentNode) ancre0.parentNode.insertBefore(box, ancre0.nextSibling);
        else document.body.insertBefore(box, document.body.firstChild);
        return;
      }
      box.innerHTML = '<strong style="display:block;margin-bottom:6px;font-size:16px">' +
        'Temporairement indisponible</strong>' +
        'Ce produit est en cours de réapprovisionnement chez notre fournisseur : ' +
        'nous préférons suspendre la vente plutôt que de vous faire attendre une commande ' +
        'que nous ne pourrions pas expédier tout de suite.<br><br>' +
        'Écrivez-nous à <a href="mailto:' + bosEmailBoutique() + '" ' +
        'style="color:#8a6d3b">' + bosEmailBoutique() + '</a> pour être prévenu(e) de son retour.';
      if (ancreVisible && ancreVisible.parentNode) {
        ancreVisible.parentNode.insertBefore(box, ancreVisible.nextSibling);
      } else {
        var principal = document.querySelector('main, .product, .container') || document.body;
        principal.insertBefore(box, principal.firstChild);
      }
    }
  }

  /* ═══ « COMPLÉTEZ VOTRE COMMANDE » — le panier multiple est le vrai levier ═
     Mesuré le 29/07/2026 sur l'API du fournisseur : le fret est PARTIELLEMENT
     MUTUALISÉ. Un article coûte 6,38 $ de port, deux articles 8,82 $, trois
     articles 10,90 $ — soit 3,63 $ par article au lieu de 6,38 $, une baisse
     de 43 %. Autrement dit : un panier de trois articles nous rapporte
     beaucoup plus que trois commandes d'un article. C'est un levier de marge
     supérieur au choix du transporteur, et il ne coûte rien au client.

     ⚠️ L'argument affiché n'est PAS « économisez sur la livraison » : elle est
     déjà offerte, ce serait un faux avantage. Les deux arguments sont vrais :
     tout arrive dans le même colis, et la remise de 10 % porte sur l'article le
     plus cher du panier (bos-promo.js). */
  function bosCompleterCommande() {
    if (document.querySelector('#bos-cross-sell')) return;
    var cat = window.BOS_CATALOGUE;
    if (!cat) return;
    var hote = location.hostname.replace(/^www\./, '');
    var groupes = null;
    for (var d in cat) { if (hote.indexOf(d.split('.')[0]) !== -1) { groupes = cat[d]; break; } }
    if (!groupes) return;

    var ici = location.pathname.split('/').pop() || '';
    var bloques = (BOS_NON_LIVRABLES || []).concat(BOS_RETIRES || []);
    var choix = [];
    groupes.forEach(function (g) {
      (g.produits || []).forEach(function (p) {
        if (!p.prix || p.url === ici) return;
        if (bloques.indexOf(p.cle) !== -1) return;
        choix.push(p);
      });
    });
    if (choix.length < 2) return;

    /* Ordre stable (pas d'aléatoire : deux visites doivent montrer la même
       chose) : on met en avant les articles les moins chers, ceux qu'on ajoute
       le plus facilement à une commande déjà décidée. */
    choix.sort(function (a, b) { return a.prix - b.prix; });
    choix = choix.slice(0, 3);

    /* ⚠️ Le bloc se place APRÈS les deux moyens de paiement, jamais entre eux.
       Constaté en capture le 29/07 : inséré derrière le bouton carte, il
       séparait « Payer par carte » de « PayPal » — or §12.35 veut les deux
       côte à côte. Une suggestion d'achat ne doit jamais couper un tunnel. */
    var anc = document.querySelector('#bos-note-remise') ||
              document.querySelector('#bos-paypal-fiche') ||
              document.querySelector('[data-bos-cb][data-bos-price]') ||
              document.querySelector('#add-to-cart-btn');
    if (!anc || !anc.offsetParent) return;

    var box = document.createElement('div');
    box.id = 'bos-cross-sell';
    box.style.cssText = 'margin:26px auto 0;padding:16px 18px;max-width:520px;' +
      'border:1px solid #e5e7eb;border-radius:12px;background:#fafafa;' +
      'font-size:14px;line-height:1.55;color:#1f2937';
    var lignes = choix.map(function (p) {
      return '<a href="' + p.url + '" style="display:flex;justify-content:space-between;' +
        'gap:12px;padding:8px 0;color:#1f2937;text-decoration:none;border-top:1px solid #eee">' +
        '<span>' + p.nom + '</span><strong style="white-space:nowrap">' +
        String(p.prix).replace('.', ',') + ' €</strong></a>';
    }).join('');
    box.innerHTML =
      '<strong style="display:block;margin-bottom:4px;font-size:15px">Complétez votre commande</strong>' +
      '<span style="color:#4b5563">Tout arrive dans le même colis, et la remise de ' +
      '10 % s’applique à l’article le plus cher de votre panier.</span>' + lignes;
    anc.parentNode.insertBefore(box, anc.nextSibling);
  }

  /* ═══ PAYPAL SUR LA FICHE PRODUIT ═════════════════════════════════════════
     Constat du 29/07/2026 : aucune des 23 fiches produit ne proposait PayPal —
     il n'existait que sur la page panier. Le rail fonctionnait donc, mais il
     obligeait un détour (fiche → panier → PayPal) alors que PayPal est le
     moyen qui rassure le plus en France. §12.35 veut les deux côte à côte.

     ⚠️ Le prix n'est JAMAIS lu dans du texte — ce serait le meilleur moyen de
     facturer un mauvais montant. Il est pris dans `data-bos-price`, l'attribut
     que le bouton carte utilise déjà, et la remise est calculée par la même
     fonction (window.BOS_PROMO.discount). Les deux boutons facturent donc, par
     construction, exactement la même somme. */
  function bosEuros(n) {
    var s = Number(n).toFixed(2).replace('.', ',');
    return s.replace(/,00$/, '') + ' €';
  }

  /* La remise vient TOUJOURS de la même source que le panier et que le bouton
     carte : window.BOS_PROMO.discount(). Elle porte sur l'article le plus cher
     de la commande — donc sur UN exemplaire, même si l'on en achète trois.
     C'est ce qu'annonce le bandeau ; on ne raconte pas autre chose ici. */
  function bosRemise(prix, qte) {
    if (window.BOS_PROMO && typeof window.BOS_PROMO.discount === 'function') {
      return window.BOS_PROMO.discount([{ price: prix, qty: qte }]) || 0;
    }
    return Math.round(prix * 10) / 100;
  }

  function bosTotal(prix, qte) {
    return Math.round((prix * qte - bosRemise(prix, qte)) * 100) / 100;
  }

  /* Réécrit le montant affiché sur le bouton carte pour qu'il corresponde à ce
     qui sera débité. On ne touche qu'au nombre : le reste du libellé (icône,
     formulation) appartient à la page. */
  function bosHarmoniserPrixCarte(cb, prix, total) {
    var t = cb.textContent || '';
    if (!/\d/.test(t)) return;
    var neuf = t.replace(/\d[\d  ]*(?:[.,]\d{1,2})?\s*€/, bosEuros(total));
    /* Libellé court et identique partout : « Acheter maintenant par carte »
       passait sur deux lignes sur mobile (69 px de haut) alors que « Payer par
       carte » tient sur une (49 px). Signalé par Fred le 29/07. */
    neuf = neuf.replace(/Acheter maintenant par carte/i, 'Payer par carte');
    if (neuf === t) return;
    cb.textContent = neuf;
    /* La remise est dite UNE fois, sous les boutons — pas dans chacun d'eux. */
    if (total < prix && !document.querySelector('#bos-note-remise')) {
      var n = document.createElement('div');
      n.id = 'bos-note-remise';
      n.style.cssText = 'max-width:420px;margin:6px auto 0;text-align:center;' +
        'font-size:12.5px;color:#4b5563';
      n.textContent = 'Remise de 10 % déjà déduite du montant affiché.';
      if (cb.parentNode) cb.parentNode.insertBefore(n, cb.nextSibling);
    }
  }

  /* La quantité vient du sélecteur NATIF de la page — chaque boutique a le sien
     (#qty-value sur FocusLab). Signalé par Fred le 29/07 : il montait à 3 sans
     que les boutons de paiement suivent, le client voyait donc le prix d'un
     seul exemplaire. On lit sa valeur au lieu d'en ajouter un deuxième. */
  function bosChampQuantite() {
    /* ⚠️ Chaque boutique nomme son sélecteur autrement — relevé le 29/07 :
         FocusLab  → #qty-value / #qty-plus   (identifiants)
         SérénLab  → .qty-val   / .qty-inc    (CLASSES, aucun id)
         Curiosa, TechNova, FootPerf → aucun sélecteur.
       Ne chercher que des identifiants laissait SérénLab sans mise à jour du
       prix : le client montait à 3 et voyait toujours le tarif d'un seul.
       Signalé par Fred sur produit-masque-bluetooth. */
    var sels = ['#qty-value', '#quantity-value', '[id*="qty-value"]',
                '.qty-val', '.qty-value', '.quantity-value', '[class*="qty-val"]',
                'input[name="quantity"]', 'input[type=number][id*=qty]',
                'input[type=number][class*=qty]'];
    for (var i = 0; i < sels.length; i++) {
      var e = document.querySelector(sels[i]);
      if (e && e.offsetParent) return e;
    }
    return null;
  }

  function bosQuantite() {
    var c = bosChampQuantite();
    if (!c) return 1;
    var v = ('value' in c && c.value !== undefined && c.value !== '') ? c.value : c.textContent;
    var n = parseInt(String(v).replace(/\D/g, ''), 10);
    return (n > 0 && n < 100) ? n : 1;
  }

  /* Le sélecteur natif ne prévient personne quand il change : on l'observe. */
  function bosSuivreQuantite(prix) {
    var c = bosChampQuantite();
    if (!c || c.getAttribute('data-bos-suivi')) return;
    c.setAttribute('data-bos-suivi', '1');
    var maj = function () { setTimeout(function () { bosRafraichirMontants(prix); }, 60); };
    if (window.MutationObserver) {
      new MutationObserver(maj).observe(c, { childList: true, characterData: true, subtree: true });
    }
    c.addEventListener('change', maj);
    c.addEventListener('input', maj);
    /* Les boutons + / − : on écoute le conteneur, ce qui couvre les deux. */
    var boite = c.closest ? c.closest('.qty-selector, .qty-controls, .qty-ctrl, .qty-row, .quantity') : null;
    if (boite) boite.addEventListener('click', maj, true);
    /* Filet : on écoute aussi les boutons + / − où qu'ils soient. */
    Array.prototype.forEach.call(
      document.querySelectorAll('.qty-inc, .qty-dec, #qty-plus, #qty-minus, [class*="qty-btn"]'),
      function (b) { b.addEventListener('click', maj); });
  }

  /* Sélecteur de quantité — demandé par Fred le 29/07/2026, et c'est aussi le
     levier de marge mesuré ce jour-là : le fret est partiellement mutualisé
     (1 article 6,38 $, 2 articles 8,82 $, 3 articles 10,90 $). Deux exemplaires
     dans une commande nous coûtent donc bien moins que deux commandes. */
  function bosAjouterSelecteurQuantite(ancre, prix) {
    if (document.querySelector('#bos-qte')) return;
    var box = document.createElement('div');
    box.id = 'bos-qte';
    box.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:14px;' +
      'margin:14px auto 4px;max-width:420px;font-size:15px;color:#1f2937';
    var bStyle = 'width:38px;height:38px;border:1px solid #d1d5db;background:#fff;' +
      'border-radius:9px;font-size:20px;line-height:1;cursor:pointer;color:#111';
    box.innerHTML = '<span>Quantité</span>' +
      '<button type="button" id="bos-qte-moins" aria-label="Diminuer la quantité" style="' + bStyle + '">−</button>' +
      '<strong id="bos-qte-val" style="min-width:26px;text-align:center;font-size:17px">1</strong>' +
      '<button type="button" id="bos-qte-plus" aria-label="Augmenter la quantité" style="' + bStyle + '">+</button>';
    /* On choisit la quantité AVANT d'ajouter au panier : le sélecteur se place
       donc au-dessus du premier bouton d'action, pas entre deux boutons. */
    var premier = bosBoutonPanier();
    var cible = (premier && premier.offsetParent) ? premier : ancre;
    cible.parentNode.insertBefore(box, cible);

    function change(pas) {
      var v = document.getElementById('bos-qte-val');
      var n = Math.min(20, Math.max(1, parseInt(v.textContent, 10) + pas));
      v.textContent = String(n);
      bosRafraichirMontants(prix);
    }
    document.getElementById('bos-qte-moins').addEventListener('click', function () { change(-1); });
    document.getElementById('bos-qte-plus').addEventListener('click', function () { change(1); });
  }

  /* Un seul endroit met à jour les deux boutons : ils ne peuvent pas diverger. */
  function bosRafraichirMontants(prix) {
    var qte = bosQuantite();
    var total = bosTotal(prix, qte);
    var cb = document.querySelector('[data-bos-cb][data-bos-price]');
    if (cb) {
      if (!cb.getAttribute('data-bos-libelle')) {
        cb.setAttribute('data-bos-libelle', cb.textContent || '');
      }
      cb.textContent = cb.getAttribute('data-bos-libelle');
      bosHarmoniserPrixCarte(cb, prix * qte, total);
    }
    var pp = document.querySelector('#bos-paypal-fiche');
    /* Même libellé court qu'à la création : sans cela, cette fonction
       réécrivait le bouton avec l'ancien texte long et le faisait repasser
       sur deux lignes (constaté le 29/07 — deux endroits écrivaient la même
       chose, et le second gagnait). */
    if (pp) { pp.innerHTML = '🅿 PayPal — ' + bosEuros(total); }
    var atc = bosBoutonPanier();
    if (atc) {
      if (!atc.getAttribute('data-bos-libelle')) {
        atc.setAttribute('data-bos-libelle', atc.textContent || 'Ajouter au panier');
      }
      atc.textContent = qte > 1
        ? 'Ajouter ' + qte + ' au panier'
        : atc.getAttribute('data-bos-libelle');
    }
  }

  /* ⚠️ NE JAMAIS injecter dans un conteneur FLEX HORIZONTAL.
     Défaut créé puis corrigé le 29/07/2026 : le bouton carte vit dans un
     conteneur en `display:flex` qui passe en colonne sur mobile mais reste en
     LIGNE sur ordinateur. Mes blocs (PayPal, note de remise, suggestions) y
     sont devenus des colonnes sœurs : « Ajouter au panier » s'étirait à
     **636 px de haut** sur 207 de large, et les blocs se retrouvaient côte à
     côte. Invisible en 390 px, catastrophique en 1440 px — d'où le fait que
     Fred et moi ne voyions pas le même site.
     Règle : on force la colonne sur ce conteneur, et nos blocs prennent
     toute la largeur. */
  function bosNormaliserConteneurActions() {
    var cb = document.querySelector('[data-bos-cb][data-bos-price]');
    if (!cb || !cb.parentNode) return null;
    /* On remonte : le conteneur fautif n'est pas toujours le parent direct
       (sur FocusLab c'est « .product-ctas », deux niveaux plus haut). */
    var n = cb, dernier = null;
    for (var i = 0; n && n !== document.body && i < 5; i++) {
      var s = window.getComputedStyle(n);
      if ((s.display === 'flex' || s.display === 'inline-flex') && s.flexDirection !== 'column') {
        n.style.flexDirection = 'column';
        n.style.alignItems = 'stretch';
        dernier = n;
      } else if (s.display === 'grid' && n.children.length > 1) {
        n.style.gridTemplateColumns = '1fr';
        dernier = n;
      }
      n = n.parentElement;
    }
    return dernier || cb.parentNode;
  }

  function bosAjouterPayPalFiche() {
    var cb = document.querySelector('[data-bos-cb][data-bos-price]');
    if (!cb || document.querySelector('#bos-paypal-fiche')) return;
    if (!cb.offsetParent) return;          // produit bloqué : on n'ajoute rien
    var prix = parseFloat(cb.getAttribute('data-bos-price'));
    if (!(prix > 0)) return;
    var cle = cb.getAttribute('data-bos-key') || '';
    if (BOS_RETIRES.indexOf(cle) !== -1 || BOS_NON_LIVRABLES.indexOf(cle) !== -1) return;

    /* ⛔ SÉLECTEUR DE QUANTITÉ DÉSACTIVÉ le 29/07/2026, volontairement.
       Il s'affichait bien, mais le panier ne recevait qu'UN article quand le
       client en demandait trois (mesuré sur les 4 boutiques). Un composant qui
       promet trois exemplaires et n'en met qu'un est pire que pas de composant :
       il fait douter le client au moment de payer.
       Ce qui reste à comprendre avant de le réactiver : cliquer le bouton natif
       en série n'ajoute qu'une unité — chaque boutique a sa propre fonction
       addToCart (signatures différentes) et probablement une garde anti-double-
       clic. La piste sûre est d'écrire directement dans le panier localStorage
       après avoir lu son format sur chaque boutique, puis de rafraîchir
       l'affichage — et de le PROUVER boutique par boutique avant déploiement. */
    var montant = bosTotal(prix, 1);
    var nom = (document.querySelector('[data-product-name]') || {}).getAttribute
      ? document.querySelector('[data-product-name]').getAttribute('data-product-name')
      : (document.querySelector('h1') || {}).textContent || 'Commande';

    /* ⚠️ Les deux boutons doivent afficher LE MÊME montant — celui qui sera
       réellement débité. Signalé par Fred le 29/07/2026 : le bouton carte
       annonçait 75 € et le bouton PayPal 67,50 €, alors que les deux
       prélèvent 67,50 € (la remise de 10 % est appliquée par bosProductCB).
       Voir deux prix pour le même achat fait douter au pire moment. On aligne
       donc l'affichage sur le montant facturé, et on nomme la remise. */
    bosHarmoniserPrixCarte(cb, prix, montant);

    var b = document.createElement('button');
    b.id = 'bos-paypal-fiche';
    b.type = 'button';
    /* ⚠️ Libellé COURT et hauteur contenue : signalé par Fred le 29/07 — avec
       la mention « (−10 % inclus) » dans le bouton, le texte passait sur deux
       lignes et le bouton montait à 69 px de haut sur mobile. La remise est
       désormais rappelée une seule fois, en petit, SOUS les deux boutons. */
    b.style.cssText = 'display:block;width:100%;max-width:420px;margin:8px auto 0;' +
      'padding:12px 16px;background:#ffc439;color:#111;border:none;border-radius:10px;' +
      'font-size:15px;font-weight:800;cursor:pointer;line-height:1.2';
    b.innerHTML = '🅿 PayPal — ' + bosEuros(montant);
    b.addEventListener('click', function () {
      var qte = bosQuantite();
      /* Au-delà d'un exemplaire, on passe par le panier : son calcul de remise
         est déjà éprouvé et sert de source unique. Mieux vaut un clic de plus
         qu'un montant faux. Si le panier n'a pas pu être rempli, on retombe
         sur l'achat direct d'un exemplaire plutôt que de perdre la vente. */
      if (qte > 1 && bosVersPanier(qte)) { return; }
      if (typeof window.bosBuyNow === 'function') {
        window.bosBuyNow(String(nom).trim().slice(0, 120), bosTotal(prix, 1), cle);
      } else {
        location.href = 'panier.html';     // repli sûr : jamais de clic mort
      }
    });
    cb.parentNode.insertBefore(b, cb.nextSibling);

    /* Interception liée à la quantité — inactive tant que le sélecteur l'est. */
    if (!cb.getAttribute('data-bos-qte-branche')) {
      cb.setAttribute('data-bos-qte-branche', '1');
      cb.addEventListener('click', function (ev) {
        if (bosQuantite() <= 1) return;
        /* On n'intercepte QUE si l'on sait remplir le panier. Sinon on laisse
           le paiement direct suivre son cours : sans ce garde-fou, le client
           atterrissait sur un panier vide et la vente était perdue. */
        if (!bosBoutonPanier()) return;
        ev.preventDefault();
        ev.stopImmediatePropagation();
        bosVersPanier(bosQuantite());
      }, true);
    }

    /* « Ajouter au panier » doit ajouter la quantité choisie, pas une unité. */
    var atc = bosBoutonPanier();
    if (false && atc && !atc.getAttribute('data-bos-qte-branche')) {
      atc.setAttribute('data-bos-qte-branche', '1');
      atc.addEventListener('click', function () {
        if (bosAjoutEnCours) return;       // c'est nous qui cliquons : ne pas boucler
        var reste = bosQuantite() - 1;     // le clic d'origine en ajoute déjà un
        for (var i = 0; i < reste; i++) { bosAjouterUneFois(); }
      }, false);
    }

    bosNormaliserConteneurActions();
    bosSuivreQuantite(prix);
    bosRafraichirMontants(prix);
  }

  /* Le bouton « ajouter au panier » de la page, quel que soit son habillage.
     ⚠️ Les 5 boutiques ne le nomment PAS pareil : FocusLab utilise l'id
     `#add-to-cart-btn`, SérénLab et TechNova une CLASSE homonyme
     `.add-to-cart-btn`, Curiosa `.btn-addcart` + `[data-add-cart]`. */
  function bosBoutonPanier() {
    var sels = ['#add-to-cart-btn', '.add-to-cart-btn', '.btn-addcart',
                '[data-add-cart]', '.add-to-cart', '.btn-add-cart'];
    for (var i = 0; i < sels.length; i++) {
      var e = document.querySelector(sels[i]);
      if (e && e.offsetParent) return e;
    }
    return null;
  }

  /* Ajoute UN exemplaire en CLIQUANT le bouton d'origine.
     ⚠️ Correctif du 29/07/2026 — régression que j'avais introduite le matin
     même : la version précédente appelait window.addToCart(id, nom, prix, img)
     après avoir cherché `#add-to-cart-btn`. Deux défauts, chacun suffisant :
       1. cet id n'existe que sur FocusLab → sur 24 pages, la fonction sortait
          aussitôt et le client était renvoyé vers un panier VIDE ;
       2. la signature d'addToCart diffère par boutique — Curiosa
          (id,name,price,qty), SérénLab (id,name,price,emoji), TechNova
          (productId,qty) — donc même avec le bon id, le 4ᵉ argument aurait
          corrompu la quantité.
     Cliquer le bouton natif laisse chaque page appliquer SA propre logique :
     c'est la seule approche qui vaille sur cinq balisages différents. */
  /* ⚠️ Verrou de réentrance. bosAjouterUneFois() CLIQUE le bouton natif ; or
     notre propre écouteur est branché sur ce même bouton. Sans ce drapeau, le
     premier clic relance la boucle et le navigateur s'arrête au bout d'un tour :
     le panier recevait 1 article au lieu de 3 (mesuré le 29/07 sur les
     4 boutiques). Le verrou dit à l'écouteur « c'est moi, laisse passer ». */
  var bosAjoutEnCours = false;

  function bosAjouterUneFois() {
    var b = bosBoutonPanier();
    if (!b) return false;
    bosAjoutEnCours = true;
    try { b.click(); } finally { bosAjoutEnCours = false; }
    return true;
  }

  /* ⛔ NE JAMAIS envoyer le client vers un panier qu'on n'a pas réussi à
     remplir : il croirait avoir tout perdu et partirait. Si l'ajout échoue,
     on laisse le paiement direct se faire (un exemplaire vaut mieux que zéro)
     et on le dit au client. */
  /* UN SEUL clic : le bouton natif lit lui-même le sélecteur de quantité de la
     page et ajoute le bon nombre. Cliquer N fois n'ajoutait qu'un article
     (garde anti-double-clic) — erreur mesurée le 29/07 sur les 4 boutiques. */
  function bosVersPanier(qte) {
    if (!bosAjouterUneFois()) return false;
    if (typeof window.openCart === 'function') { window.openCart(); }
    else { location.href = 'panier.html'; }
    return true;
  }

  /* bos-paypal.js porte bosBuyNow() ; il n'était chargé que par la page panier.
     On le charge ici pour les fiches, sans toucher aux dizaines de pages. */
  (function () {
    if (document.querySelector('script[src*="bos-paypal.js"]')) return;
    if (!document.querySelector('[data-bos-cb][data-bos-price]')) return;
    var s = document.createElement('script');
    s.src = 'bos-paypal.js';
    s.onload = function () { setTimeout(bosAjouterPayPalFiche, 100); };
    document.head.appendChild(s);
  })();

  /* ═══ BOUTONS PLUS COMPACTS ════════════════════════════════════════════════
     Signalé par Fred le 29/07 : « les boutons Ajouter au panier et Voir le
     panier sont trop grands ». Sur un écran de 390 px, empiler six boutons de
     45 à 53 px repousse le contenu et donne une impression de formulaire.
     On réduit l'espacement intérieur et la police SANS toucher à la largeur —
     un bouton d'achat doit rester large et facile à viser au pouce. */
  (function () {
    if (document.getElementById('bos-css-boutons')) return;
    var s = document.createElement('style');
    s.id = 'bos-css-boutons';
    s.textContent =
      '.btn--secondary.btn--sm,.bos-sticky-cta__btn,.bos-sticky-atc__btn,' +
      '.add-to-cart-btn,.btn-addcart,#add-to-cart-btn{' +
      'padding:11px 18px!important;font-size:15px!important;line-height:1.25!important}' +
      '#bos-paypal-fiche{padding:11px 16px!important;font-size:15px!important}';
    (document.head || document.documentElement).appendChild(s);
  })();

  /* ═══ ENCART PRODUIT SUR UN ACCUEIL ════════════════════════════════════════
     Le rayon équipement de FootPerf est fermé et sa grille est reconstruite en
     JavaScript — une carte ajoutée dans le HTML y est effacée au chargement
     (constaté le 29/07/2026 : la page produit existait mais AUCUN lien n'y
     menait, donc « la boutique n'a pas changé » était exact du point de vue du
     visiteur). On injecte donc l'encart après coup, juste avant la grille. */
  var BOS_ENCARTS_ACCUEIL = {
    'footperf.fr': {
      cle: 'lampe-photo-foot',
      url: 'produit-lampe-photo-foot.html',
      img: 'img/lampe-photo-foot.jpg',
      titre: 'Lampe Football Personnalisée',
      prix: '49,00 €',
      texte: 'Vous envoyez une photo — lui, son équipe, son but décisif — et elle est ' +
             "gravée dans le verre. Le cadeau qu'on ne trouve pas en magasin."
    }
  };

  function bosEncartAccueil() {
    var f = location.pathname.replace(/\.html?$/, '').split('/').pop() || '';
    if (f && f !== 'index') return;
    if (document.querySelector('#bos-encart-produit')) return;
    var e = BOS_ENCARTS_ACCUEIL[location.hostname.replace(/^www\./, '')];
    if (!e) return;
    if (BOS_NON_LIVRABLES.indexOf(e.cle) !== -1 || BOS_RETIRES.indexOf(e.cle) !== -1) return;
    var g = document.querySelector('#productsGrid, .products-grid') ||
            document.querySelector('#produits');
    if (!g) return;

    var d = document.createElement('a');
    d.id = 'bos-encart-produit';
    d.href = e.url;
    d.style.cssText = 'display:block;max-width:520px;margin:14px auto 22px;padding:16px;' +
      'background:#fff;border:2px solid #c8f000;border-radius:14px;text-decoration:none;' +
      'color:#0d3b2a;box-shadow:0 4px 20px rgba(0,0,0,.10)';
    d.innerHTML =
      '<div style="display:flex;gap:14px;align-items:center">' +
        '<img src="' + e.img + '" alt="' + e.titre + '" ' +
             'style="width:96px;height:96px;object-fit:cover;border-radius:10px;flex:none">' +
        '<div>' +
          '<span style="display:inline-block;background:#c8f000;color:#0d3b2a;font-weight:800;' +
                'padding:3px 10px;border-radius:99px;font-size:11.5px">⭐ Cadeau personnalisé</span>' +
          '<div style="font-weight:800;font-size:17px;margin:6px 0 3px">' + e.titre + '</div>' +
          '<div style="font-size:13.5px;line-height:1.45;opacity:.88">' + e.texte + '</div>' +
          '<div style="font-weight:800;margin-top:7px">' + e.prix +
            ' <span style="font-weight:600;font-size:13px;opacity:.75">— découvrir →</span></div>' +
        '</div>' +
      '</div>';
    g.parentNode.insertBefore(d, g);
  }

  /* ═══ PURGE DU PANIER ═════════════════════════════════════════════════════
     Masquer les boutons ne suffit pas : un article ajouté AVANT le retrait
     reste dans le panier du visiteur (localStorage) et demeure payable.
     Constaté en capture le 29/07/2026 : le panier contenait encore « Set de 2
     buts pop-up — 44,00 € » avec un bouton « Payer par carte » actif, alors
     que le produit venait d'être retiré. On retire donc l'article du panier et
     on l'explique — un panier qui se vide sans un mot inquiète le client. */
  function bosPurgerPanier() {
    if (typeof window.getCart !== 'function' || typeof window.saveCart !== 'function') return;
    var cart;
    try { cart = window.getCart(); } catch (e) { return; }
    if (!Array.isArray(cart) || !cart.length) return;
    var enleves = [];
    var restants = cart.filter(function (it) {
      var id = String((it && it.id) || '');
      if (BOS_RETIRES.indexOf(id) === -1 && BOS_NON_LIVRABLES.indexOf(id) === -1) return true;
      enleves.push((it && it.name) || id);
      return false;
    });
    if (!enleves.length) return;
    try { window.saveCart(restants); } catch (e) { return; }
    if (document.querySelector('#bos-panier-purge')) return;
    var note = document.createElement('div');
    note.id = 'bos-panier-purge';
    note.style.cssText = 'margin:10px 0;padding:10px 12px;border:1px solid #e2c391;' +
      'background:#fdf6e9;border-radius:8px;color:#5b4a2a;font-size:13px;line-height:1.5';
    note.innerHTML = '<strong>' + (enleves.length > 1 ? 'Articles retirés' : 'Article retiré') +
      ' de votre panier</strong><br>' + enleves.join(', ') +
      ' : nous ne pouvons plus l’expédier dans les délais annoncés. ' +
      'Désolé pour la déception — le reste de votre panier est intact.';
    var cible = document.querySelector('#cart, .cart-panel, .cart-drawer, #cartPanel') ||
                document.querySelector('h1');
    if (cible && cible.parentNode) cible.insertBefore(note, cible.firstChild || null);
  }

  /* ═══ CGV PRÉ-COCHÉES — moins de friction au moment de payer ══════════════
     Demandé par Fred le 29/07/2026. La case reste VISIBLE et le lien vers les
     CGV reste cliquable : le client peut la décocher et lire les conditions.
     Seule la coche par défaut change, pour qu'un acheteur pressé ne soit pas
     arrêté par un « merci d'accepter les CGV » au dernier clic.

     ℹ️ À savoir : la formule la plus sûre juridiquement reste « en validant
     votre commande, vous acceptez nos CGV » sous le bouton (le clic est alors
     l'acte positif d'acceptation) — c'est ce que font Amazon et Shopify par
     défaut. La case pré-cochée est plus fragile en cas de litige. */
  function bosPrecocherCGV() {
    var cases = document.querySelectorAll(
      '#cgv-check, input[type=checkbox][id*="cgv"], input[type=checkbox][name*="cgv"]');
    Array.prototype.forEach.call(cases, function (c) {
      if (c.checked || c.getAttribute('data-bos-precoche')) return;
      c.checked = true;
      c.setAttribute('data-bos-precoche', '1');
      try { c.dispatchEvent(new Event('change', { bubbles: true })); } catch (e) {}
    });
  }

  /* Filet de sécurité : si un autre script masque le conteneur du message
     après coup, on le déplace dans le premier parent réellement visible. */
  function bosVerifierVisibilite() {
    var b = document.querySelector('#bos-indispo');
    if (!b || b.offsetParent) return;
    var h1 = document.querySelector('h1');
    if (h1 && h1.parentNode) h1.parentNode.insertBefore(b, h1.nextSibling);
  }

  // au chargement ET après coup : d'autres scripts injectent leurs boutons plus tard
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bosBloquerAchat);
  } else {
    bosBloquerAchat();
  }
  setTimeout(bosBloquerAchat, 800);
  setTimeout(bosBloquerAchat, 2500);
  setTimeout(bosBloquerAchat, 6000);
  setTimeout(bosVerifierVisibilite, 1200);
  setTimeout(bosVerifierVisibilite, 3000);
  setTimeout(bosVerifierVisibilite, 7000);
  /* Le panier est souvent rendu par JS après coup : on repasse plusieurs fois. */
  setTimeout(bosPrecocherCGV, 400);
  setTimeout(bosPrecocherCGV, 1500);
  setTimeout(bosPrecocherCGV, 4000);
  setTimeout(bosPurgerPanier, 900);
  setTimeout(bosPurgerPanier, 3000);
  /* Après le garde-fou : on n'ajoute PayPal que si l'achat est resté ouvert. */
  setTimeout(bosAjouterPayPalFiche, 1800);
  setTimeout(bosAjouterPayPalFiche, 4500);
  setTimeout(bosAjouterPayPalFiche, 8000);
  /* Après le menu (qui expose le catalogue) et après le garde-fou. */
  setTimeout(bosEncartAccueil, 1500);
  setTimeout(bosEncartAccueil, 4000);
  setTimeout(bosEncartAccueil, 8000);
  setTimeout(bosCompleterCommande, 3200);
  setTimeout(bosCompleterCommande, 7000);
  setTimeout(bosCompleterCommande, 10500);
  document.addEventListener('click', function () {
    setTimeout(bosPrecocherCGV, 250);
    setTimeout(bosPurgerPanier, 250);
  }, true);

  /* Le panier est souvent rendu par JS après coup : on repasse plusieurs fois. */
  /* Après le garde-fou : on n'ajoute PayPal que si l'achat est resté ouvert. */
  /* Après le menu (qui expose le catalogue) et après le garde-fou. */
  document.addEventListener('click', function () {
  }, true);

  /* Le panier est souvent rendu par JS après coup : on repasse plusieurs fois. */
  /* Après le garde-fou : on n'ajoute PayPal que si l'achat est resté ouvert. */
  /* Après le menu (qui expose le catalogue) et après le garde-fou. */
  document.addEventListener('click', function () {
  }, true);

  /* Le panier est souvent rendu par JS après coup : on repasse plusieurs fois. */
  /* Après le garde-fou : on n'ajoute PayPal que si l'achat est resté ouvert. */
  /* Après le menu (qui expose le catalogue) et après le garde-fou. */
  document.addEventListener('click', function () {
  }, true);

  /* Le panier est souvent rendu par JS après coup : on repasse plusieurs fois. */
  /* Après le garde-fou : on n'ajoute PayPal que si l'achat est resté ouvert. */
  /* Après le menu (qui expose le catalogue) et après le garde-fou. */
  setTimeout(bosCompleterCommande, 2500);
  setTimeout(bosCompleterCommande, 6000);
  setTimeout(bosCompleterCommande, 9500);
  document.addEventListener('click', function () {
  }, true);

  /* Le panier est souvent rendu par JS après coup : on repasse plusieurs fois. */
  /* Après le garde-fou : on n'ajoute PayPal que si l'achat est resté ouvert. */
  /* Après le menu (qui expose le catalogue) et après le garde-fou. */
  document.addEventListener('click', function () {
  }, true);

  /* Le panier est souvent rendu par JS après coup : on repasse plusieurs fois. */
  /* Après le garde-fou : on n'ajoute PayPal que si l'achat est resté ouvert. */
  /* Après le menu (qui expose le catalogue) et après le garde-fou. */
  document.addEventListener('click', function () {
  }, true);

  /* Le panier est souvent rendu par JS après coup : on repasse plusieurs fois. */
  /* Après le garde-fou : on n'ajoute PayPal que si l'achat est resté ouvert. */
  /* Après le menu (qui expose le catalogue) et après le garde-fou. */
  document.addEventListener('click', function () {
  }, true);

  /* Le panier est souvent rendu par JS après coup : on repasse plusieurs fois. */
  /* Après le garde-fou : on n'ajoute PayPal que si l'achat est resté ouvert. */
  /* Après le menu (qui expose le catalogue) et après le garde-fou. */
  document.addEventListener('click', function () {
  }, true);

  /* Le panier est souvent rendu par JS après coup : on repasse plusieurs fois. */
  /* Après le garde-fou : on n'ajoute PayPal que si l'achat est resté ouvert. */
  /* Après le menu (qui expose le catalogue) et après le garde-fou. */
  document.addEventListener('click', function () {
  }, true);

  /* Le panier est souvent rendu par JS après coup : on repasse plusieurs fois. */
  /* Après le garde-fou : on n'ajoute PayPal que si l'achat est resté ouvert. */
  /* Après le menu (qui expose le catalogue) et après le garde-fou. */
  document.addEventListener('click', function () {
  }, true);

  /* Le panier est souvent rendu par JS après coup : on repasse plusieurs fois. */
  /* Après le garde-fou : on n'ajoute PayPal que si l'achat est resté ouvert. */
  /* Après le menu (qui expose le catalogue) et après le garde-fou. */
  document.addEventListener('click', function () {
  }, true);

  /* Le panier est souvent rendu par JS après coup : on repasse plusieurs fois. */
  /* Après le garde-fou : on n'ajoute PayPal que si l'achat est resté ouvert. */
  /* Après le menu (qui expose le catalogue) et après le garde-fou. */
  document.addEventListener('click', function () {
  }, true);

  /* Le panier est souvent rendu par JS après coup : on repasse plusieurs fois. */
  /* Après le garde-fou : on n'ajoute PayPal que si l'achat est resté ouvert. */
  /* Après le menu (qui expose le catalogue) et après le garde-fou. */
  document.addEventListener('click', function () {
  }, true);

  /* Le panier est souvent rendu par JS après coup : on repasse plusieurs fois. */
  /* Après le garde-fou : on n'ajoute PayPal que si l'achat est resté ouvert. */
  /* Après le menu (qui expose le catalogue) et après le garde-fou. */
  document.addEventListener('click', function () {
  }, true);

  /* Le panier est souvent rendu par JS après coup : on repasse plusieurs fois. */
  /* Après le garde-fou : on n'ajoute PayPal que si l'achat est resté ouvert. */
  /* Après le menu (qui expose le catalogue) et après le garde-fou. */
  document.addEventListener('click', function () {
  }, true);

  /* Le panier est souvent rendu par JS après coup : on repasse plusieurs fois. */
  /* Après le garde-fou : on n'ajoute PayPal que si l'achat est resté ouvert. */
  document.addEventListener('click', function () {
  }, true);

  /* Le panier est souvent rendu par JS après coup : on repasse plusieurs fois. */
  document.addEventListener('click', function () {
  }, true);

  /* Le panier est souvent rendu par JS après coup : on repasse plusieurs fois. */
  document.addEventListener('click', function () {
  }, true);

  /* Le panier est souvent rendu par JS après coup : on repasse plusieurs fois. */
  document.addEventListener('click', function () { setTimeout(bosPrecocherCGV, 250); }, true);





















  // API VPS (Cloudflare Tunnel HTTPS → reverse proxy → Node Stripe)
  var STRIPE_API = 'https://api.tonargentexplique.fr/create-checkout-session';

  // Mapping produit -> lien Stripe Payment Link (pages produit)
  var STRIPE_LINKS = {
    'masque-led-visage':    'https://buy.stripe.com/6oUcN5fbddLH7aa2ck5Vu06',
    'masque-sommeil-bluetooth': 'https://buy.stripe.com/bJe00j0gjcHDdyycQY5Vu07',
    'masque-gel-yeux':      'https://buy.stripe.com/5kQ8wPbZ15fb7aa7wE5Vu08',
    'kit-gua-sha-premium':  'https://buy.stripe.com/eVq28r3sv4b7eCC6sA5Vu09',
    'oreiller-rafraichissant': 'https://buy.stripe.com/fZubJ1gfhfTPamm2ck5Vu0a',
    'machine-a-sons-blancs': 'https://buy.stripe.com/dRmeVefbd22Z9ii9EM5Vu0b',
    'lampe-de-lecture-led': 'https://buy.stripe.com/cNi4gz2or0YV7aa8AI5Vu0c',
    'masque-de-nuit-premium': 'https://buy.stripe.com/4gM5kD3sv373fGG9EM5Vu0d',
    'enceinte-bluetooth-vintage': 'https://buy.stripe.com/8x2aEX0gjcHD2TU4ks5Vu0e',
    'mini-projecteur-portable':   'https://buy.stripe.com/8x24gzd354b79ii7wE5Vu0f',
    'microphone-pro-streaming':   'https://buy.stripe.com/6oU9AT9QTgXTcuug3a5Vu0g',
    'ecran-secondaire-portable':  'https://buy.stripe.com/cNifZh8MPePL9iieZ65Vu0h',
    'mini-imprimante-portable':   'https://buy.stripe.com/14A28r4wzePLammeZ65Vu0i',
    'chargeur-sans-fil-3-en-1':   'https://buy.stripe.com/6oU3cv7IL4b72TU6sA5Vu0j',
    'ventilateur-portable':       'https://buy.stripe.com/28EdR9bZ19vrdyycQY5Vu0k',
    'lampe-led-bureau':           'https://buy.stripe.com/6oUdR9gfh9vr3XYcQY5Vu0l',
    'timer-pomodoro':             'https://buy.stripe.com/4gM28r7ILcHD522g3a5Vu0m',
    'tapis-bureau-premium':       'https://buy.stripe.com/8x2fZh0gjfTPeCC2ck5Vu0n',
    'organisateur-cables':        'https://buy.stripe.com/5kQ3cv9QTbDzeCC5ow5Vu0o',
    'tiroir-sous-bureau':         'https://buy.stripe.com/eVq14ngfh4b7amm18g5Vu0p',
    'support-pc-portable':        'https://buy.stripe.com/cNi14n8MP6jfcuu3go5Vu0q',
    'lampe-led-focus':            'https://buy.stripe.com/4gM4gz4wz4b76669EM5Vu0r',
    'barre-lumineuse-ecran':      'https://buy.stripe.com/cNi8wPd35dLHcuu6sA5Vu0s',
    'balle-de-reaction':          'https://buy.stripe.com/5kQ6oH2orcHDgKK6sA5Vu0t',
    'echelle-d-agilite':          'https://buy.stripe.com/3cIeVdgfh5fbcuu4ks5Vu0u',
    'cones-de-marquage':          'https://buy.stripe.com/aFa14ngfh8rn52204c5Vu0v',
    'parachute-de-resistance':    'https://buy.stripe.com/fZu14nbZ1bDz1PQg3a5Vu0w',
    'gants-gardien-pro':          'https://buy.stripe.com/5kQ4gz0gjfTPbqqaIQ5Vu0x',
    'protege-tibias-carbone':     'https://buy.stripe.com/bJe3cv9QT3732TUg3a5Vu0y',
    'cible-de-precision':         'https://buy.stripe.com/8x214n8MPdLH52218g5Vu0z',
    'buts-pop-up':                'https://buy.stripe.com/bJe3cv4wz5fb522bMU5Vu0A',
  };

  var CART_ID_TO_STRIPE = {};

  function normalize(str) {
    return str.toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function findProductKey() {
    var path = location.pathname.replace(/\.html?$/, '').split('/').pop();
    if (path && path !== 'index') {
      var key = normalize(path.replace(/^produit-/, ''));
      if (STRIPE_LINKS[key]) return key;
    }
    var el = document.querySelector('[data-stripe-product]');
    if (el) {
      var key = normalize(el.getAttribute('data-stripe-product'));
      if (STRIPE_LINKS[key]) return key;
    }
    var h1 = document.querySelector('h1');
    if (h1) {
      var key = normalize(h1.textContent);
      if (STRIPE_LINKS[key]) return key;
    }
    return null;
  }

  // BOS 13/07/2026 — Total REELLEMENT facture = sous-total - remise -10%,
  // calcule a partir du panier (meme formule que l'affichage panier et que PayPal).
  // Avant : lecture fragile du DOM -> risque d'ecart entre prix affiche et prix facture.
  function getCartTotal() {
    var cart = null;
    try { if (typeof window.getCart === 'function') { var c = window.getCart(); if (Array.isArray(c)) cart = c; } } catch(e) {}
    if (!cart || !cart.length) {
      try {
        var keys = ['footperf_v2_cart', 'curiosa_cart', 'serenlab_cart', 'technova_cart', 'focuslab_cart', 'footperf_cart'];
        for (var i = 0; i < keys.length; i++) {
          var v = JSON.parse(localStorage.getItem(keys[i]) || 'null');
          if (Array.isArray(v) && v.length) { cart = v; break; }
        }
      } catch(e) {}
    }
    if (!cart || !cart.length) return 0;
    var subtotal = cart.reduce(function(s, i) {
      return s + (Number(i.price) || 0) * Math.max(1, parseInt(i.qty || 1, 10));
    }, 0);
    var discount = 0;
    if (window.BOS_PROMO && typeof window.BOS_PROMO.discount === 'function') {
      discount = window.BOS_PROMO.discount(cart);
    } else {
      var max = 0;
      cart.forEach(function(i) { var p = Number(i.price) || 0; if (p > max) max = p; });
      discount = max > 0 ? Math.round(max * 10) / 100 : 0;
    }
    return Math.round((subtotal - discount) * 100) / 100;
  }


  var _stripeDone = false;
  function addStripeButton(productKey) {
    if (_stripeDone) return;
    var isCart = location.pathname.indexOf('panier') !== -1 || !!document.getElementById('cartFooter');
    /* BOS 13/07/2026 (coherence des prix) — le Payment Link des fiches produit encaissait le
       PLEIN TARIF alors que le bandeau annonce -10% : deux prix pour le meme produit selon le
       bouton clique. On ne propose donc le paiement CB que depuis le PANIER, ou la remise est
       reellement appliquee. Les fiches produit gardent "Ajouter au panier" comme CTA d'achat.
       (Les produits digitaux ont leur propre bos-stripe.js dans leur sous-dossier : non impactes.) */
    if (!isCart) return;
    var link = productKey ? (STRIPE_LINKS[productKey] || null) : null;

    var container = document.querySelector('.checkout-stripe') || document.getElementById('stripe-btn-container');
    if (!container) {
      var anchor = document.querySelector('.btn-checkout') ||
                   document.querySelector('.btn-addcart, [data-add-cart]') ||
                   document.querySelector('h1');
      if (anchor && anchor.parentNode) {
        container = document.createElement('div');
        container.className = 'checkout-stripe';
        container.style.cssText = 'margin-top:12px;text-align:center;';
        anchor.parentNode.insertBefore(container, anchor.nextSibling);
      }
    }
    if (!container) return;

    var btn = document.createElement(isCart ? 'button' : 'a');
    if (link) { btn.href = link; btn.target = '_top'; btn.rel = 'noopener'; }
    btn.className = isCart ? 'btn btn-stripe-cart' : 'btn btn-stripe';
    btn.innerHTML = '<span style="display:flex;align-items:center;justify-content:center;gap:8px;">' +
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 4.5c-2.5 0-4.5 2-4.5 4.5s2 4.5 4.5 4.5 4.5-2 4.5-4.5-2-4.5-4.5-4.5z"/><rect x="2" y="4" width="20" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>' +
      '<span>💳 Payer par CB</span></span>';
    btn.style.cssText = 'display:inline-block;width:100%;max-width:400px;padding:14px 24px;background:#635BFF;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;cursor:pointer;border:none;transition:background 0.2s;';
    btn.onmouseover = function(){ this.style.background = '#4F46E5'; };
    btn.onmouseout  = function(){ this.style.background = '#635BFF'; };

    if (isCart) {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        var total = getCartTotal();
        if (total <= 0) { alert('Ton panier est vide.'); return; }
        btn.textContent = '⏳ Redirection vers Stripe...';
        btn.disabled = true;
        fetch(STRIPE_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: total, currency: 'eur', cancelPath: '/panier.html' }),
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (data.url) { window.location.href = data.url; }
          else { alert('Erreur de paiement : ' + (data.error || 'inconnue')); btn.textContent = '💳 Payer par CB'; btn.disabled = false; }
        })
        .catch(function(err) {
          alert('Impossible de contacter le serveur de paiement. Réessaie dans quelques instants.');
          btn.textContent = '💳 Payer par CB';
          btn.disabled = false;
        });
      });
    }

    container.appendChild(btn);
    _stripeDone = true;

    try {
      if (window.umami && typeof umami.track === 'function') {
        umami.track('view_stripe_button', {page: location.pathname});
      }
    } catch(e) {}
  }

  function init() {
    // BOS 13/07/2026 : les boutons CB sont desormais explicites dans le HTML
    // (data-bos-cb). Plus d'injection auto : elle plaçait le bouton au petit
    // bonheur (ancre = bouton PayPal) et ne survivait pas aux re-rendus du panier.
    if (document.querySelector('[data-bos-cb]')) return;
    if (location.pathname.indexOf('panier') !== -1 ||
        document.getElementById('cart-wrapper') ||
        document.getElementById('cartFooter') ||
        document.getElementById('cartItems')) return;
    // Détecter page panier OU panier intégré (FootPerf one-page)
    var isCart = location.pathname.indexOf('panier') !== -1 || !!document.getElementById('cartFooter');
    if (isCart) {
      addStripeButton(null);
    } else {
      var key = findProductKey();
      if (key) addStripeButton(key);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Exposer pour les paniers dynamiques (FootPerf)
  window.initStripe = init;
})();

/* ==========================================================================
   BOS 13/07/2026 - RAIL CARTE UNIQUE POUR LES PRODUITS PHYSIQUES
   PayPal a ete retire du parcours physique : il envoyait les PRIX PLEINS
   (sans la remise affichee dans le panier) et aucun fulfillment ne lisait
   ses ventes -> le client payait trop cher et n'etait jamais livre.
   Ici : le montant envoye a Stripe est EXACTEMENT celui affiche au client,
   et metadata.products porte les cles de fulfillment_products.json (VPS)
   pour que la commande fournisseur parte bien apres paiement.
   ========================================================================== */
(function(){
  'use strict';
  var API = 'https://api.tonargentexplique.fr/create-checkout-session';
  var BOUTIQUE = 'technova';
  var CART_KEY = 'technova_cart';
  var ID_TO_FULFILL = {
      "TN-PROJ-001": "mini-projecteur-portable",
      "TN-LAMP-001": "lampe-led-bureau",
      "TN-CHG-001": "chargeur-sans-fil-3-en-1",
      "TN-PRINT-001": "mini-imprimante-portable",
      "TN-MIC-001": "microphone-pro-streaming",
      "TN-VEN-001": "ventilateur-portable"
  };

  function items(){
    try { var v = JSON.parse(localStorage.getItem(CART_KEY) || '[]'); return Array.isArray(v) ? v : []; }
    catch(e){ return []; }
  }
  function fulfillKeys(){
    /* La quantite voyage collee a la cle : « timer-pomodoro*3 ». Sans elle, un
       panier de 3 etait facture 3 fois et n'en faisait expedier qu'UN seul
       (defaut mesure le 29/07/2026). Le serveur relit ce suffixe. */
    return items().map(function(i){
      var c = ID_TO_FULFILL[i.id] || i.id;
      var q = parseInt(i && i.qty, 10);
      return (q > 1) ? (c + '*' + Math.min(q, 20)) : c;
    });
  }
  /* Total EXACT affiche au client (remise incluse), expose par le panier. */
  function displayedTotal(){
    if (typeof window.bosCartTotal === 'function') {
      var t = Number(window.bosCartTotal());
      if (isFinite(t) && t > 0) return Math.round(t * 100) / 100;
    }
    return 0;
  }
  function fail(btn, label, msg){ alert(msg); btn.disabled = false; btn.innerHTML = label; }

  function go(btn, payload){
    var label = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = 'Redirection securisee...';
    fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(function(r){ return r.json(); })
    .then(function(d){
      if (d && d.url) { window.location.href = d.url; }
      else { fail(btn, label, 'Erreur de paiement : ' + ((d && d.error) || 'inconnue')); }
    })
    .catch(function(){
      fail(btn, label, 'Impossible de contacter le serveur de paiement. Reessaie dans quelques instants.');
    });
  }

  /* Panier -> session au montant exact affiche. */
  window.bosCartCB = function(btn){
    var cgv = document.getElementById('cgv-check');
    if (cgv && !cgv.checked) { alert('Merci d\u2019accepter les CGV pour continuer.'); return; }
    var total = displayedTotal();
    if (!(total > 0)) { alert('Ton panier est vide.'); return; }
    try { if (window.umami) umami.track('checkout_cb', {montant: total, boutique: BOUTIQUE}); } catch(e){}
    go(btn, { amount: total, currency: 'eur', boutique: BOUTIQUE,
              products: fulfillKeys(), cancelPath: '/panier.html' });
  };

  /* Fiche produit -> session au prix EXACT affiche sur la fiche.
     On n'utilise plus les Payment Links statiques : leurs montants avaient
     derive des prix affiches (ex. 79 EUR affiche / 59 EUR preleve). */
  window.bosProductCB = function(btn){
    var price = parseFloat(btn.getAttribute('data-bos-price'));
    var key   = btn.getAttribute('data-bos-key') || '';
    if (!(price > 0)) { alert('Produit indisponible pour le moment.'); return; }
    var amount = price;
    if (window.BOS_PROMO && typeof window.BOS_PROMO.discount === 'function') { var _d = window.BOS_PROMO.discount([{ price: price, qty: 1 }]) || 0; amount = Math.round((price - _d) * 100) / 100; }
    else { /* meme repli que le bouton PayPal : sans lui, les deux boutons
             debiteraient des montants differents si bos-promo.js tombait. */
      amount = Math.round(price * 90) / 100; }
    try { if (window.umami) umami.track('buy_now_cb', {produit: key, prix: amount, boutique: BOUTIQUE}); } catch(e){}
    go(btn, { amount: amount, currency: 'eur', boutique: BOUTIQUE,
              products: key ? [key] : [], cancelPath: location.pathname });
  };
})();
