/* TECH NOVA — Panier dynamique · -10% auto sur le + cher */
'use strict';
const CART_KEY = 'technova_cart';
const PROMO_DISCOUNT = 0.10;

function loadCart() { try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { return []; } }
function saveCart(c) { localStorage.setItem(CART_KEY, JSON.stringify(c)); }

function refreshBadge() {
  const cart = loadCart();
  const total = cart.reduce((s, i) => s + i.qty, 0);
  document.querySelectorAll('.cart-count').forEach(el => {
    el.textContent = total; el.style.display = total > 0 ? 'flex' : 'none';
  });
}

function addToCart(id, name, price, qty) {
  qty = qty || 1;
  const cart = loadCart();
  const idx = cart.findIndex(i => i.id === id);
  if (idx >= 0) cart[idx].qty += qty;
  else cart.push({ id, name, price, qty });
  saveCart(cart); refreshBadge();
  // Feedback visuel
  const fb = document.createElement('div');
  fb.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:99999;background:#10b981;color:#fff;padding:10px 20px;border-radius:8px;font-weight:600;font-size:14px;';
  fb.textContent = '✅ Ajouté au panier !';
  document.body.appendChild(fb);
  setTimeout(() => { fb.style.opacity = '0'; fb.style.transition = 'opacity 0.3s'; }, 1500);
  setTimeout(() => fb.remove(), 2000);
}

function removeFromCart(id) {
  saveCart(loadCart().filter(i => i.id !== id));
  refreshBadge(); renderCart();
}

function updateQty(id, delta) {
  const cart = loadCart();
  const item = cart.find(i => i.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) cart.splice(cart.indexOf(item), 1);
  saveCart(cart); refreshBadge(); renderCart();
}

function renderCart() {
  const wrapper = document.getElementById('cart-wrapper');
  if (!wrapper) return;
  const cart = loadCart();
  if (cart.length === 0) {
    wrapper.innerHTML = '<div style="text-align:center;padding:3rem"><h2>Panier vide</h2><p style="margin:1rem 0">Ajoute des produits TechNova !</p><a href="index.html" class="btn-primary" style="display:inline-block;padding:12px 24px;background:#4F46E5;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Voir le catalogue</a></div>';
    return;
  }
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const maxPrice = Math.max(...cart.map(i => i.price));
  const discount = maxPrice * PROMO_DISCOUNT;
  const total = subtotal - discount;

  wrapper.innerHTML = `
    <div style="overflow-x:auto">
      <table style="width:100%;border-collapse:collapse">
        <thead><tr><th>Produit</th><th>Qté</th><th>Prix</th><th></th></tr></thead>
        <tbody>${cart.map(item => `
          <tr>
            <td>${item.name}</td>
            <td><button onclick="updateQty('${item.id}',-1)" style="border:1px solid #ccc;background:#fff;width:28px;height:28px;border-radius:4px;cursor:pointer">-</button> <span>${item.qty}</span> <button onclick="updateQty('${item.id}',1)" style="border:1px solid #ccc;background:#fff;width:28px;height:28px;border-radius:4px;cursor:pointer">+</button></td>
            <td>${(item.price * item.qty).toFixed(2).replace('.',',')} €</td>
            <td><button onclick="removeFromCart('${item.id}')" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:18px">✕</button></td>
          </tr>`).join('')}</tbody>
      </table>
    </div>
    ${discount > 0 ? `
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:8px 16px;margin:12px 0;text-align:center">
        <span style="font-size:13px;color:#166534">🎉 -10% appliqué sur le produit le + cher</span>
      </div>
    ` : ''}
    <div style="text-align:right;margin:12px 0">
      <h3 style="margin:0">
        ${discount > 0 ? `<span style="text-decoration:line-through;color:#9ca3af;font-size:16px;margin-right:8px">${subtotal.toFixed(2).replace('.',',')} €</span>` : ''}
        <span style="color:${discount > 0 ? '#10b981' : 'inherit'}">${total.toFixed(2).replace('.',',')} €</span>
      </h3>
    </div>
    <div style="text-align:center;margin-top:16px">
      <button class="btn-checkout" onclick="bosPayPalCheckout()" style="display:block;width:100%;max-width:400px;margin:0 auto 12px;padding:14px;background:#0070ba;color:#fff;border:none;border-radius:8px;font-size:16px;font-weight:600;cursor:pointer">Payer par Carte ou PayPal</button>
    </div>
    <p style="text-align:center;font-size:.82rem;color:#6b7280;margin:8px 0">Paiement 100% sécurisé. Carte bancaire sans compte PayPal. Livraison offerte · Satisfait ou remboursé 30 jours.</p>
    <p style="text-align:center;font-size:.75rem;color:#9ca3af">Tu seras redirigé(e) vers PayPal. Aucune donnée bancaire stockée.</p>
  `;
  // bos-stripe.js s'occupe d'ajouter le bouton Stripe après le render
  setTimeout(() => {
    if (typeof window.initStripe === 'function') window.initStripe();
  }, 100);
}

// Init sur les pages
document.addEventListener('DOMContentLoaded', () => {
  refreshBadge();
  if (document.getElementById('cart-wrapper')) renderCart();
  // Attacher les événements add-to-cart
  document.querySelectorAll('[data-add-cart]').forEach(btn => {
    btn.addEventListener('click', function() {
      addToCart(this.dataset.id, this.dataset.name, parseFloat(this.dataset.price));
    });
  });
});
