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
  'proj-wifi': {
    name: 'Mini Projecteur WiFi Portable',
    price: 79,
    sku: 'TN-PROJ-001',
    visual: 'proj',
    emoji: '🎬',
    url: 'produit-projecteur-wifi.html'
  },
  'led-rgb': {
    name: 'Ruban LED WiFi RGB 5m',
    price: 34,
    sku: 'TN-LED-001',
    visual: 'led',
    emoji: '💡',
    url: 'produit-ruban-led.html'
  },
  'prise-wifi': {
    name: 'Prise Connectée WiFi (lot de 2)',
    price: 19,
    sku: 'TN-PLUG-001',
    visual: 'plug',
    emoji: '🔌',
    url: 'produit-prise-connectee.html'
  },
  'cam-wifi': {
    name: 'Caméra Surveillance WiFi Extérieure',
    price: 59,
    sku: 'TN-CAM-001',
    visual: 'cam',
    emoji: '📷',
    url: 'produit-camera-wifi.html'
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
  const shipping = 0;
  const total    = subtotal + shipping;

  const subEl = document.getElementById('summary-subtotal');
  const shipEl= document.getElementById('summary-shipping');
  const totEl = document.getElementById('summary-total');
  if (subEl)  subEl.textContent  = subtotal.toFixed(2) + ' €';
  if (shipEl) shipEl.textContent = 'Offerte';
  if (totEl)  totEl.textContent  = total.toFixed(2) + ' €';
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
    });
  }
  if (closeBtn && mobileMenu) {
    closeBtn.addEventListener('click', () => {
      mobileMenu.classList.remove('open');
      hamburger && hamburger.setAttribute('aria-expanded', 'false');
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
