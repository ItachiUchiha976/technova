/* ================================================
   TECHNOVA — Cart Manager (localStorage)
   ================================================ */

const CART_KEY = 'technova_cart_v1';

const PRODUCTS = {
  'proj-wifi': {
    name: 'Mini Projecteur WiFi Portable',
    price: 89,
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

/* ---------- Core ---------- */

function getCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || {}; }
  catch { return {}; }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadge();
  syncPayPalCartMirror(cart);
}

/* Miroir panier au format tableau [{id,name,price,qty}] dans 'technova_cart' —
   lu par bos-paypal.js (checkout PayPal) qui ne connait pas le format objet ci-dessus. */
function syncPayPalCartMirror(cart) {
  try {
    const items = Object.entries(cart)
      .filter(([id, qty]) => PRODUCTS[id] && qty > 0)
      .map(([id, qty]) => ({ id, name: PRODUCTS[id].name, price: PRODUCTS[id].price, qty }));
    localStorage.setItem('technova_cart', JSON.stringify(items));
  } catch (e) { /* silencieux */ }
}

function addToCart(productId, qty = 1) {
  const cart = getCart();
  cart[productId] = (cart[productId] || 0) + qty;
  saveCart(cart);
  showToast('Produit ajouté au panier !');
  /* BOS — Umami funnel event. Defensif, jamais bloquant. Ajout 02/07/2026. */
  try {
    if (window.umami && typeof umami.track === 'function') {
      const p = PRODUCTS[productId];
      umami.track('add_to_cart', { produit: p ? p.name : productId, prix: p ? p.price : 0, boutique: 'technova' });
    }
  } catch (e) {}
}

function removeFromCart(productId) {
  const cart = getCart();
  delete cart[productId];
  saveCart(cart);
  if (document.querySelector('.cart-page')) renderCart();
}

function setQty(productId, qty) {
  const cart = getCart();
  if (qty <= 0) { delete cart[productId]; }
  else { cart[productId] = qty; }
  saveCart(cart);
  if (document.querySelector('.cart-page')) renderCart();
}

function cartTotal() {
  const cart = getCart();
  return Object.entries(cart).reduce((sum, [id, qty]) => {
    const p = PRODUCTS[id];
    return sum + (p ? p.price * qty : 0);
  }, 0);
}

function cartItemCount() {
  const cart = getCart();
  return Object.values(cart).reduce((s, q) => s + q, 0);
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
  const cart = getCart();
  const container = document.getElementById('cart-items');
  const summary   = document.getElementById('cart-summary');
  const emptyMsg  = document.getElementById('cart-empty');

  if (!container) return;

  const keys = Object.keys(cart).filter(id => PRODUCTS[id] && cart[id] > 0);

  if (keys.length === 0) {
    container.innerHTML = '';
    if (summary)   summary.style.display   = 'none';
    if (emptyMsg)  emptyMsg.style.display  = 'block';
    return;
  }
  if (summary)   summary.style.display   = 'block';
  if (emptyMsg)  emptyMsg.style.display  = 'none';

  container.innerHTML = keys.map(id => {
    const p   = PRODUCTS[id];
    const qty = cart[id];
    const tot = (p.price * qty).toFixed(2);
    return `
      <div class="cart-item" data-id="${id}">
        <div class="cart-item-visual ${p.visual}">${p.emoji}</div>
        <div class="cart-item-info">
          <div class="cart-item-name">${p.name}</div>
          <div class="cart-item-price">${p.price.toFixed(2)} € / unité</div>
        </div>
        <div class="cart-item-qty">
          <button class="qty-btn" onclick="setQty('${id}', ${qty - 1})">−</button>
          <span class="qty-val">${qty}</span>
          <button class="qty-btn" onclick="setQty('${id}', ${qty + 1})">+</button>
        </div>
        <div class="cart-item-total">${tot} €</div>
        <button class="cart-remove" onclick="removeFromCart('${id}')" aria-label="Supprimer">✕</button>
      </div>
    `;
  }).join('');

  const subtotal = cartTotal();
  const shipping = subtotal >= 49 ? 0 : 4.99;
  const total    = subtotal + shipping;

  const subEl = document.getElementById('summary-subtotal');
  const shipEl= document.getElementById('summary-shipping');
  const totEl = document.getElementById('summary-total');
  if (subEl)  subEl.textContent  = subtotal.toFixed(2) + ' €';
  if (shipEl) shipEl.textContent = shipping === 0 ? 'Offerte' : shipping.toFixed(2) + ' €';
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
  if (localStorage.getItem('technova_cookie_choice')) return;
  const bar = document.createElement('div');
  bar.className = 'cookie-banner';
  bar.innerHTML = '<p>Ce site utilise des polices Google (CDN) pour l\'affichage. Aucune donnée n\'est revendue. <a href="cgv.html#rgpd" style="color:var(--indigo-light)">En savoir plus</a></p>'
    + '<div class="cookie-actions"><button class="cookie-btn" data-c="refuse">Refuser</button><button class="cookie-btn primary" data-c="accept">Accepter</button></div>';
  document.body.appendChild(bar);
  bar.querySelectorAll('.cookie-btn').forEach(b => b.addEventListener('click', () => {
    localStorage.setItem('technova_cookie_choice', b.dataset.c);
    bar.remove();
  }));
}

/* ---------- Init ---------- */

document.addEventListener('DOMContentLoaded', () => {
  updateCartBadge();
  syncPayPalCartMirror(getCart());
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

/* BOS — expose panier pour checkout PayPal cross-page (fix isolation cart multi-boutique, 01/07/2026).
   Le panier interne (CART_KEY='technova_cart_v1') est un OBJET {id:qty} ; le checkout PayPal
   a besoin d'un TABLEAU [{id,name,price,qty}] -> on utilise le miroir 'technova_cart' deja
   maintenu par syncPayPalCartMirror(). */
try {
  window.getCart = function () {
    try {
      var arr = JSON.parse(localStorage.getItem('technova_cart'));
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  };
  window.BOS_CART_KEY = 'technova_cart';
} catch (e) {}
