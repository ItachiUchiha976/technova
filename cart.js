/* ================================================
   TECHNOVA — Cart Manager (localStorage)
   ------------------------------------------------
   Modèle ARRAY canonique [{id,name,price,qty}] sous la clé 'technova_cart'
   (identique à Curiosa/FocusLab + directement lisible par bos-paypal.js).
   ⚠️ Refonte 03/07/2026 : l'ancien modèle OBJET {id:qty} sous 'technova_cart_v1'
   était CASSÉ — l'override window.getCart (ajouté 01/07 pour le checkout PayPal
   cross-page) écrasait le getCart interne → addToCart opérait sur le mauvais store
   → quantité bloquée à 1 + badge "0[object Object]" (bug remonté par Fred :
   "2× le même produit = un seul prix"). Un seul store array supprime le conflit.
   ================================================ */

const CART_KEY = 'technova_cart';

const PRODUCTS = {
  'TN-PROJ-001': {
    name: 'Mini Projecteur Portable Autofocus',
    price: 79,
    emoji: '🎬',
    url: 'produit-projecteur-wifi.html'
  },
  'TN-BUNDLE-001': {
    name: 'Pack Écran de Projection + Trépied',
    price: 24,
    emoji: '🖥️',
    url: 'produit-bundle-ecran-trepied.html'
  },
  'TN-CHG-001': {
    name: 'Chargeur Sans Fil 3-en-1',
    price: 29,
    emoji: '🔋',
    url: 'produit-chargeur-sans-fil.html'
  },
  'TN-PRINT-001': {
    name: 'Imprimante Thermique Sans Encre',
    price: 49,
    emoji: '🖨️',
    url: 'produit-imprimante-thermique.html'
  },
  'TN-MIC-001': {
    name: 'Micro-cravate Sans Fil',
    price: 44,
    emoji: '🎤',
    url: 'produit-micro-cravate.html'
  },
  'TN-SPK-001': {
    name: 'Enceinte à Lévitation Magnétique Bluetooth',
    price: 159,
    emoji: '🔊',
    url: 'produit-enceinte-levitation.html'
  },
  'TN-LAMP-001': {
    name: 'Lampe de Bureau LED 3-en-1',
    price: 69,
    emoji: '💡',
    url: 'produit-lampe-bureau-3en1.html'
  },
  'TN-VEN-001': {
    name: 'Ventilateur Bureau Silencieux',
    price: 25,
    emoji: '🌀',
    url: 'produit-ventilateur-bureau.html'
  }
};

/* ---------- Core (modèle array [{id,name,price,qty}]) ---------- */

function getCart() {
  try {
    const arr = JSON.parse(localStorage.getItem(CART_KEY));
    return Array.isArray(arr) ? arr : [];
  } catch (e) { return []; }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadge();
}

function addToCart(productId, qty = 1) {
  const p = PRODUCTS[productId];
  if (!p) { /* produit hors catalogue : ne rien casser */ return; }
  const cart = getCart();
  const existing = cart.find(i => i.id === productId);
  if (existing) { existing.qty += qty; }
  else { cart.push({ id: productId, name: p.name, price: p.price, qty: qty }); }
  saveCart(cart);
  showToast('Produit ajouté au panier !');
  /* BOS — Umami funnel event. Defensif, jamais bloquant. */
  try {
    if (window.umami && typeof umami.track === 'function') {
      umami.track('add_to_cart', { produit: p.name, prix: p.price, boutique: 'technova' });
    }
  } catch (e) {}
  /* BOS — Pinterest tag (pintrk), consentement CNIL requis (bos-consent.js). */
  try {
    if (window.pintrk) {
      window.pintrk('track', 'addtocart', { value: p.price, currency: 'EUR', order_quantity: qty });
    }
  } catch (e) {}
}

function removeFromCart(productId) {
  saveCart(getCart().filter(i => i.id !== productId));
  if (document.querySelector('.cart-page')) renderCart();
}

function setQty(productId, qty) {
  let cart = getCart();
  if (qty <= 0) {
    cart = cart.filter(i => i.id !== productId);
  } else {
    const it = cart.find(i => i.id === productId);
    if (it) it.qty = qty;
  }
  saveCart(cart);
  if (document.querySelector('.cart-page')) renderCart();
}

function cartTotal() {
  return getCart().reduce((sum, i) => sum + (Number(i.price) || 0) * (i.qty || 0), 0);
}

function cartItemCount() {
  return getCart().reduce((s, i) => s + (i.qty || 0), 0);
}

/* ---------- UI ---------- */

function updateCartBadge() {
  const count = cartItemCount();
  document.querySelectorAll('.cart-count').forEach(el => {
    el.textContent = count;
    el.style.display = count > 0 ? 'flex' : 'none';
  });
}

function showToast(msg) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => { if (t.parentNode) t.remove(); }, 3000);
}

function renderCart() {
  const container = document.getElementById('cart-items');
  const summary   = document.getElementById('cart-summary');
  const emptyMsg  = document.getElementById('cart-empty');
  if (!container) return;

  const cart = getCart().filter(i => i.qty > 0);

  if (cart.length === 0) {
    container.innerHTML = '';
    if (summary)  summary.style.display  = 'none';
    if (emptyMsg) emptyMsg.style.display = 'block';
    return;
  }
  if (summary)  summary.style.display  = 'block';
  if (emptyMsg) emptyMsg.style.display = 'none';

  container.innerHTML = cart.map(it => {
    const meta = PRODUCTS[it.id] || {};
    const tot  = (it.price * it.qty).toFixed(2);
    return `
      <div class="cart-item" data-id="${it.id}">
        <div class="cart-item-visual ${meta.visual || ''}">${meta.emoji || '📦'}</div>
        <div class="cart-item-info">
          <div class="cart-item-name">${it.name}</div>
          <div class="cart-item-price">${it.price.toFixed(2)} € / unité</div>
        </div>
        <div class="cart-item-qty">
          <button class="qty-btn" onclick="setQty('${it.id}', ${it.qty - 1})">−</button>
          <span class="qty-val">${it.qty}</span>
          <button class="qty-btn" onclick="setQty('${it.id}', ${it.qty + 1})">+</button>
        </div>
        <div class="cart-item-total">${tot} €</div>
        <button class="cart-remove" onclick="removeFromCart('${it.id}')" aria-label="Supprimer">✕</button>
      </div>
    `;
  }).join('');

  /* BOS 04/07/2026 : livraison TOUJOURS offerte (aligné avec bos-paypal.js qui ne facture
     jamais de frais de port) — plus de seuil 49 €, pour que l'affichage panier corresponde
     exactement au montant réellement débité par PayPal. */
  const subtotal = cartTotal();
  // -10% automatique sur le produit le plus cher
  const maxPrice = cart.length > 0 ? Math.max(...cart.map(i => i.price)) : 0;
  const discount = maxPrice * 0.10;
  const shipping = 0;
  const total    = subtotal - discount + shipping;

  const subEl = document.getElementById('summary-subtotal');
  const shipEl= document.getElementById('summary-shipping');
  const totEl = document.getElementById('summary-total');
  if (subEl)  subEl.textContent  = subtotal.toFixed(2) + ' €';
  if (shipEl) shipEl.textContent = 'Offerte';
  if (discount > 0 && totEl) {
    totEl.innerHTML = '<span style="text-decoration:line-through;color:#9ca3af;font-size:14px;margin-right:8px">' + subtotal.toFixed(2) + ' €</span><span style="color:#10b981">' + total.toFixed(2) + ' €</span>';
    // Ajouter bannière promo si pas déjà présente
    if (!document.getElementById('cart-promo')) {
      const p = document.createElement('div');
      p.id = 'cart-promo';
      p.style.cssText = 'background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:6px 12px;margin-bottom:8px;text-align:center;font-size:13px;color:#166534;font-weight:600';
      p.textContent = '🎉 -10% appliqué sur le produit le + cher';
      const summary = document.getElementById('cart-summary');
      if (summary) summary.insertBefore(p, summary.firstChild);
    }
  } else if (totEl) {
    totEl.textContent = total.toFixed(2) + ' €';
  }
}

/* ---------- VIP / Web3Forms lead capture ---------- */

function initVipForms() {
  document.querySelectorAll('.vip-form').forEach(form => {
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      const label = btn ? btn.innerHTML : '';
      if (btn) { btn.disabled = true; btn.innerHTML = 'Envoi…'; }
      try {
        const res = await fetch(form.action, {
          method: 'POST',
          headers: { 'Accept': 'application/json' },
          body: new FormData(form)
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success) {
          const wrap = form.closest('.vip-wrap') || form.parentNode;
          wrap.innerHTML = '<p class="email-success">✅ Merci ! Tu es sur la liste VIP — tu recevras ton code -10 % dès l\'ouverture de la boutique.</p>';
        } else {
          throw new Error((data && data.message) || 'Erreur réseau');
        }
      } catch (err) {
        if (btn) { btn.disabled = false; btn.innerHTML = label; }
        showToast('Oups, un souci est survenu. Réessaie dans un instant.');
      }
    });
  });
}

/* ---------- Bandeau cookies (Google Fonts) ---------- */

function initCookieBanner() {
  return; /* BOS 03/07/2026 (Fred) : ZÉRO FRICTION — plus de bandeau "polices Google" affiché au client. */
}

/* ---------- Init ---------- */

document.addEventListener('DOMContentLoaded', () => {
  updateCartBadge();
  initVipForms();
  initCookieBanner();

  // Mobile menu
  const hamburger  = document.querySelector('.hamburger');
  const mobileMenu = document.querySelector('.mobile-menu');
  const closeBtn   = document.querySelector('.mobile-menu__close');
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      mobileMenu.classList.add('open');
      hamburger.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden'; /* BOS 09/07/2026 — bloque défilement page derrière le menu */
    });
  }
  if (closeBtn && mobileMenu) {
    closeBtn.addEventListener('click', () => {
      mobileMenu.classList.remove('open');
      hamburger && hamburger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = ''; /* BOS 09/07/2026 — restaure défilement page */
    });
  }
  /* BOS 09/07/2026 — fermer menu au clic sur un lien + restaurer scroll */
  if (mobileMenu) {
    mobileMenu.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        mobileMenu.classList.remove('open');
        hamburger && hamburger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
  }

  // Tabs on product pages
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      const tc = document.getElementById('tab-' + target);
      if (tc) tc.classList.add('active');
    });
  });

  // Cart page render
  if (document.querySelector('.cart-page')) renderCart();
});

/* BOS — expose panier pour checkout PayPal cross-page.
   Le store canonique 'technova_cart' EST déjà un tableau [{id,name,price,qty}] :
   window.getCart le renvoie directement (plus de conflit avec le getCart interne). */
try {
  window.getCart = getCart;
  window.BOS_CART_KEY = CART_KEY;
} catch (e) {}

// BOS — listener data-add-cart (toutes les pages produit)
document.addEventListener("DOMContentLoaded", function() {
  document.querySelectorAll("[data-add-cart]").forEach(function(btn) {
    if (btn._bosBound) return;
    btn._bosBound = true;
    btn.addEventListener("click", function(e) {
      e.preventDefault();
      var id = this.dataset.id;
      if (id) addToCart(id);
    });
  });
});

