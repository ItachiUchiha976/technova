# DESIGN.md — Système de design TechNova (technovaboutique.fr)

> **À lire AVANT toute édition du site.** Ce document décrit le système de design RÉEL,
> extrait des fichiers sources (`styles.css`, `bos-modern.css`, styles inline des pages,
> `bos-promo.js`, `bos-reveal.js`, `bos-retractation.js`) le 17/07/2026.
> Toute nouvelle page ou modification doit s'y conformer. En cas de doute : ouvrir les
> sources citées, elles font foi.

---

## 1. Identité

**TechNova** = boutique tech / smart-home **dark-mode « space »**, ambiance futuriste IA :
fond quasi-noir bleuté, dégradés **indigo → cyan**, glows lumineux, champ d'étoiles animé
dans le hero. Le site doit toujours donner cette impression de profondeur sombre et de
lumière colorée — jamais de fond blanc, jamais de flat gris neutre.

- Logo texte : `Tech<em>Nova</em>` en dégradé `indigo-light → cyan` (classe `.logo`).
- Fichiers socles : `styles.css` (base, ~817 lignes) + `bos-modern.css` (couche additive
  « premium » 16/07/2026 : hero vivant, boutons brillance, reveal au scroll, sticky ATC,
  header auto-masquant, typo descriptions). **`bos-modern.css` n'écrase jamais la base,
  il enrichit.** Respecter cette séparation pour tout ajout.

---

## 2. Palette (tokens exacts — `styles.css :root`)

### Fonds (du plus profond au plus clair)
| Token | Hex | Usage |
|---|---|---|
| `--space` | `#050914` | Fond du `body` |
| `--dark1` | `#0d1421` | Hero, footer, sections alternées, menu mobile |
| `--dark2` | `#141c2e` | Cartes produit, feature strip, résumé panier |
| `--dark3` | `#1e2740` | Cartes « why », toasts, boutons panier, cookie banner |
| `--dark4` | `#252f47` | Hover nav, toggles off |

### Accents
| Token | Hex | Usage |
|---|---|---|
| `--indigo` | `#6366f1` | Couleur de marque n°1 : boutons, badges, compteurs |
| `--indigo-dark` | `#4f46e5` | 2ᵉ borne des dégradés boutons `linear-gradient(135deg, indigo, indigo-dark)` |
| `--indigo-light` | `#818cf8` | Liens, textes accent, 1ʳᵉ borne du dégradé logo/titres |
| `--indigo-glow` | `rgba(99,102,241,.18)` | Fonds de badges/icônes |
| `--cyan` | `#22d3ee` | Accent n°2 : prix sticky, icônes bénéfices, `strong` des descriptions, 2ᵉ borne du dégradé logo |
| `--cyan-dark` | `#0891b2` | Topbar (dégradé `indigo-dark → cyan-dark`) |
| `--cyan-pale` | `rgba(34,211,238,.12)` | Fonds subtils cyan |
| `--gold` | `#f59e0b` | Étoiles d'avis, badge « promo » produit |
| `--gold-dark` | `#d97706` | Variante gold |

### Textes (hiérarchie à 3 niveaux — la respecter)
| Token | Hex | Usage |
|---|---|---|
| `--text` | `#f1f5f9` | Titres, prix, texte principal |
| `--text-med` | `#cbd5e1` | Sous-titres, paragraphes |
| `--text-light` | `#94a3b8` | Métadonnées, notes, footer |

### Bordures & états
| Token | Valeur | Usage |
|---|---|---|
| `--border` | `rgba(255,255,255,0.08)` | Bordure par défaut (1px partout) |
| `--border-active` | `rgba(99,102,241,0.4)` | Bordure hover/active/focus |
| `--success` | `#10b981` | Confirmations, économies, checks |
| `--danger` | `#ef4444` | Suppression, erreurs |
| `--white` | `#ffffff` | Texte sur boutons pleins |

### Ombres & glows
| Token | Valeur |
|---|---|
| `--shadow` | `0 1px 3px rgba(0,0,0,.3), 0 4px 16px rgba(0,0,0,.25)` |
| `--shadow2` | `0 8px 30px rgba(0,0,0,.4), 0 2px 8px rgba(0,0,0,.2)` |
| `--glow-indigo` | `0 0 40px rgba(99,102,241,0.25)` |
| `--glow-cyan` | `0 0 30px rgba(34,211,238,0.2)` |

**Règle** : toujours utiliser les tokens `var(--…)`, jamais de hex en dur dans du nouveau
code (exception tolérée : les scripts BOS injectés qui doivent rester autonomes).

---

## 3. Typographies

| Rôle | Famille | Token / sélecteur | Graisse |
|---|---|---|---|
| **Titres** (h1, section-title, noms produit, logo) | **Outfit** | `--f-title: 'Outfit', 'Segoe UI', system-ui, sans-serif` | 700–800, `letter-spacing:-.02em à -.03em` |
| **Corps** | **Inter** | `--f-body: 'Inter', 'Segoe UI', system-ui, sans-serif` | 400–600 |
| **Descriptions produit** (typo distinctive, ajoutée 17/07/2026) | **Space Grotesk** | `#tab-desc p` dans `bos-modern.css` §6 | 400 (500 pour `strong`) |

- Chargement : Google Fonts dans le `<head>` de chaque page —
  `Outfit:wght@400;500;600;700;800` + `Inter:wght@400;500;600` partout, **+
  `Space+Grotesk:wght@400;500` sur les 8 pages produit** (obligatoire si la page a un
  panneau `#tab-desc`).
- **Typo descriptions (17/07)** : les `<p>` du panneau Description (`#tab-desc`
  UNIQUEMENT — jamais `#tab-specs` ni `#tab-faq`) reçoivent Space Grotesk 1.02rem/1.7,
  couleur `#E8E4F5`, dans un encadré `background: rgba(30,20,60,.55)` + bordure
  `1px solid rgba(34,211,238,.4)` + `border-radius:10px` + padding `1.1rem 1.4rem`.
  Les `strong` passent en `var(--cyan)`. La règle gagne par spécificité d'ID, **sans
  `!important`** — ne pas la contourner.
- Échelle fluide des titres : `clamp(2rem, 4.5vw, 3.2rem)` (hero) ;
  `clamp(1.6rem, 3.5vw, 2.4rem)` (sections) ; `clamp(1.5rem, 3vw, 2rem)` (nom produit).
- Mot-clé du hero : `<em>` (non-italique) en dégradé texte `indigo-light → cyan`
  (`background-clip:text`), animé par `bosShine` (voir §6).

---

## 4. Espacement, rayons, layout

- **Conteneur** : `.container` → `max-width: var(--max-w) = 1180px`, padding latéral `20px`.
- **Sections** : `padding: 72px 0` (email-section : 56px ; vip-band : 40px).
- **Rayons** : `--r: 10px` (boutons, inputs, encadrés) · `--r2: 20px` (cartes, gros blocs)
  · `100px` (pills/badges) · `50%` (avatars, compteurs).
- **Transition standard** : `--t: .22s ease` — l'utiliser pour tout hover.
- Gaps courants : grilles produits `24px`, hero `56px`, why `64px`, footer `40px`.
- **Grilles responsives** : produits `repeat(auto-fill, minmax(260px,1fr))` ;
  breakpoints `1024px` (hero/why → 1 colonne), `768px` (nav → hamburger, produits 2 col),
  `640px` (fiche produit 1 col), `480px` (tout 1 col + fix panier mobile).

---

## 5. Composants récurrents

- **Topbar** : bandeau dégradé `90deg, indigo-dark → cyan-dark`, texte blanc `.82rem`,
  contenu = réassurance honnête (« Livraison offerte · estimée 12 à 20 jours ouvrés ·
  Retours 30 jours »).
- **Header** : sticky, `rgba(5,9,20,.92)` + `backdrop-filter: blur(14px)`, hauteur 64px.
  **Auto-masquant au scroll** (16/07) : descente → `.bos-nav-hidden`
  (`translateY(-110%)`), remontée → réapparaît ; ne se cache jamais si le menu mobile
  est ouvert (logique dans `bos-reveal.js`).
- **Menu mobile** : panneau fixe 280px, fond `--dark1`, `overflow-y:auto` +
  `-webkit-overflow-scrolling:touch` (le menu défile, pas la page). Le même `nav-list` /
  `mobile-menu` doit être identique sur TOUTES les pages (règle CLAUDE.md §12.36).
- **Boutons** : `.btn-primary` = dégradé `135deg, indigo → indigo-dark`, blanc, 700,
  `padding:14px 28px`, ombre indigo, hover `translateY(-2px)` + ombre renforcée + effet
  **brillance balayante** (`::after` skewX(-18deg), `bos-modern.css`). `.btn-outline` =
  transparent, bordure `--border`, hover `--border-active`. `.add-to-cart-btn` /
  `.checkout-btn` = mêmes dégradés indigo pleine largeur.
- **Cartes produit** : `.product-card` fond `--dark2`, bordure 1px `--border`, `--r2`.
  Hover : bordure active + `translateY(-8px)` + `--glow-indigo` + zoom image `scale(1.06)`.
  `.product-visual` en `aspect-ratio:4/3` + vignettage bas permanent (`::after` dégradé noir).
- **Badges** : `.hero-badge` / `.product-page-badge` = pill `--indigo-glow` + bordure
  active + texte `--indigo-light` ; `.product-badge-pos` (indigo, blanc) et
  `.product-badge-sale` (gold, noir) posés sur le visuel.
- **Barre promo −10 % permanente** (`bos-promo.js`) : bannière sticky top injectée en JS,
  dégradé `#6366f1 → #8b5cf6 → #a855f7`, texte « −10 % sur le produit le plus cher de
  votre commande — appliquée automatiquement au panier, sans code ». **Source de vérité
  unique du calcul = `window.BOS_PROMO.discount(cart)`** (arrondi au centime, utilisée par
  l'affichage panier ET la facturation PayPal/Stripe). Ne s'affiche que sur les pages qui
  ont un panier. **Sans compte à rebours, par conception** (voir INTERDITS).
- **Pastille rétractation** (`bos-retractation.js`) : lien flottant
  « ↩ Droit de rétractation » bas-gauche, fond `rgba(30,27,75,.82)` + blur — **uniquement
  sur les pages d'achat** (fiche produit / panier / CGV / merci) ; ailleurs = lien texte
  dans le footer. Se cache en descendant, revient en remontant. Modal blanc de formulaire
  → API VPS `api.tonargentexplique.fr/retractation`. Obligation légale : ne jamais retirer.
- **Barre d'achat sticky mobile** (`.bos-sticky-atc`, construite par `bos-reveal.js`) :
  visible < 768px quand le CTA principal `[data-add-cart]` sort de l'écran ; prix en
  `--cyan`, bouton dégradé indigo ; proxifie le vrai bouton (zéro duplication de logique).
  Quand elle est ouverte, la pastille rétractation remonte (`bottom: 88px`).
- **Preuve sociale** : `.testimonial-card` / `.review-card` (fond dark, étoiles `--gold`,
  texte italique) ; `.proof-card` avec source citée (honnêteté).
- **Capture email** : `.email-section` / `.vip-block` / `.cart-vip` — input fond `--dark2`,
  focus bordure indigo ; succès = encadré `--success`.
- **Toast** : bas-droite, `--dark3` + bordure active, animation `toast-in .3s`.
- **Cookie banner** : `.cookie-banner` bas de page, fond `--dark3`.

---

## 6. Animations — principes

Toutes définies dans `bos-modern.css` + `bos-reveal.js` + inline SVG des pages produit.

1. **Reveal au scroll** : `bos-reveal.js` pose `[data-reveal]` sur `.product-card`,
   `.feature-item`, `.why-card`, `.proof-card`, `.section-title`, `.section-sub` ; fade-up
   26px en `.7s cubic-bezier(.2,.7,.2,1)` via `.is-in` ; cascade `data-reveal-delay` 1–3
   (.08s/.16s/.24s) dans les grilles. **3 filets de sécurité obligatoires** : pass
   synchrone au chargement (aucun flash), pass au scroll (rAF), et **backstop dur 5 s**
   (tout élément encore masqué est révélé coûte que coûte). En cas d'erreur JS → tout est
   révélé (fail-safe). Ne jamais ajouter un reveal sans ces filets.
2. **Hero vivant** : halo `bosGlow` 6s (respiration du radial indigo/cyan), flottaison
   image `bosFloat` 7s (±14px + micro-rotation), champ d'étoiles `bosTwinkle` 5s alternate
   (7 radial-gradients en teintes `#c7d2fe` / `#a5f3fc` — cyan/indigo, pas de blanc
   chaud), reflet titre `bosShine` 6.5s linear sur le `<em>`.
3. **Animations SVG produit** (inline dans chaque page produit, préfixe `bosLev*` /
   équivalents) : mouvements doux et courts en boucle — ex. enceinte :
   `bosLevFloat` (flottaison), `bosLevShadow` (ombre qui respire), `bosLevRing` (onde qui
   s'évanouit). Chaque nouvelle fiche produit peut avoir son animation SVG signature du
   même esprit : subtile, lente (4–8s), boucle infinie, dans la palette.
4. **`prefers-reduced-motion: reduce`** : OBLIGATOIRE. Le bloc existant coupe
   `bosFloat/bosGlow/bosTwinkle/bosShine/brillance boutons` et force `[data-reveal]`
   visible sans transition ; `bos-reveal.js` sort immédiatement. Toute nouvelle animation
   doit être ajoutée à ce bloc.
5. **Hovers** : légers et rapides (`--t: .22s ease`), translation ≤ 8px, jamais de
   rotation/scale agressifs.

---

## 7. Ton de voix (FR)

- **Tutoiement** systématique, direct et concret : « Ton cinéma plein air cet été — en 2 min. »
- Bénéfice d'usage AVANT la fiche technique : on décrit la scène vécue (« Pose-le sur la
  table du jardin… une image jusqu'à 120 pouces apparaît »), les specs viennent ensuite.
- **Honnêteté factuelle** : délais réels affichés (« Livraison estimée 12 à 20 jours
  ouvrés »), preuves sourcées (`.proof-source`), pas de superlatifs creux ni de promesses
  invérifiables.
- Français impeccable : **tous les accents** (é, è, à, ç…), typographie française
  (espaces insécables avant € et unités : `&nbsp;€`), **genre masculin** pour Fred
  (« ravi », jamais « ravie »).
- Vocabulaire tech maîtrisé mais accessible — on explique, on ne jargonne pas.

---

## 8. ⛔ INTERDITS (à vérifier avant tout commit)

1. **JAMAIS de compte à rebours, de fausse urgence ou de faux stock limité**
   (DGCCRF, pratique commerciale trompeuse — art. L121-2 Code conso). La promo −10 % est
   permanente et annoncée comme telle. Ne pas réintroduire de chrono dans `bos-promo.js`
   (refonte conformité 13/07/2026).
2. **JAMAIS de prix barré / prix de référence fictif.** Les classes historiques
   `.product-price-old` / `.product-page-price-old` existent encore dans `styles.css`
   mais ne sont utilisées par AUCUNE page — les laisser mortes, ne pas les réactiver.
3. **JAMAIS de lien `github.io` brut en public** (CLAUDE.md §12.28) : tout lien visible
   pointe vers `technovaboutique.fr` (ou le domaine officiel du produit concerné).
4. **Contraste AA minimum** (WCAG 2.1) : sur les fonds sombres, le texte descend au plus
   bas à `--text-light` (#94a3b8) — jamais moins contrasté pour du texte porteur de sens.
5. **Accents français corrects partout** — un texte sans accents = inacceptable
   (attention aux pipelines PowerShell→JSON qui les détruisent, CLAUDE.md §12.17 V3).
6. **NE JAMAIS casser la chaîne de paiement** :
   - `bos-stripe.js` (Payment Links + endpoint VPS `create-checkout-session`),
   - `bos-paypal.js` / `bos-paypal-cart.js` (business `fredsoule976`, tokens eager
     ebooks),
   - les attributs **`data-bos-key`**, `data-bos-cb`, `data-bos-price`,
     `data-bos-product-id`, `data-add-cart` sur les boutons — les clés `data-bos-key`
     mappent les Payment Links Stripe : ne pas les renommer, ne pas les supprimer.
   - `window.BOS_PROMO.discount(cart)` = source de vérité unique du calcul de remise
     (affichage = facturation) : ne jamais dupliquer ce calcul ailleurs.
   Après toute édition d'une page d'achat : re-tester le tunnel comme un client
   (CLAUDE.md §12.40 TEMPS 3).
7. **Ne pas retirer** `bos-retractation.js` (obligation légale), `bos-consent.js`
   (cookies), ni le respect de `prefers-reduced-motion`.
8. **Pas de fond clair / thème light** : TechNova est dark-mode par identité.
9. **Espace réservé pour tout élément fixe** : rien ne doit jamais recouvrir un bouton
   d'action (précédent : pastille rétractation remontée au-dessus de la sticky ATC,
   `body.bos-atc-open #bos-retract-link{bottom:88px}`). Vérifier le rendu réel
   (Playwright screenshot), jamais un grep.

---

## 9. Check-list avant commit d'une modification visuelle

- [ ] Tokens `var(--…)` utilisés (pas de hex en dur).
- [ ] Outfit pour les titres, Inter pour le corps, Space Grotesk réservé à `#tab-desc`.
- [ ] Nouvelle animation ajoutée au bloc `prefers-reduced-motion`.
- [ ] Menus desktop + mobile identiques aux autres pages.
- [ ] Aucun compte à rebours, prix barré, ou lien github.io introduit.
- [ ] Boutons de paiement et `data-bos-*` intacts ; tunnel re-testé côté client.
- [ ] Accents français vérifiés ; rendu vérifié sur mobile (~360px) ET desktop.

*Document créé le 17/07/2026 (recommandation Analyse_jmjgljCC-O4_design.md). Source de
vérité du code = les fichiers cités ; ce document décrit, il n'invente pas.*
