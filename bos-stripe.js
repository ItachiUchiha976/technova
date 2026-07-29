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
  document.addEventListener('click', function () {
    setTimeout(bosPrecocherCGV, 250);
    setTimeout(bosPurgerPanier, 250);
  }, true);

  /* Le panier est souvent rendu par JS après coup : on repasse plusieurs fois. */
  setTimeout(bosPrecocherCGV, 400);
  setTimeout(bosPrecocherCGV, 1500);
  setTimeout(bosPrecocherCGV, 4000);
  setTimeout(bosPurgerPanier, 900);
  setTimeout(bosPurgerPanier, 3000);
  document.addEventListener('click', function () {
    setTimeout(bosPrecocherCGV, 250);
    setTimeout(bosPurgerPanier, 250);
  }, true);

  /* Le panier est souvent rendu par JS après coup : on repasse plusieurs fois. */
  setTimeout(bosPrecocherCGV, 400);
  setTimeout(bosPrecocherCGV, 1500);
  setTimeout(bosPrecocherCGV, 4000);
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
    return items().map(function(i){ return ID_TO_FULFILL[i.id] || i.id; });
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
    try { if (window.umami) umami.track('buy_now_cb', {produit: key, prix: amount, boutique: BOUTIQUE}); } catch(e){}
    go(btn, { amount: amount, currency: 'eur', boutique: BOUTIQUE,
              products: key ? [key] : [], cancelPath: location.pathname });
  };
})();
