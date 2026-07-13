/* BOS — Checkout PayPal (Payments Standard, cart upload, 0 backend). Ajout 01/07/2026.
   Encaisse vers le compte PayPal de la boutique. Carte bancaire acceptee (pas besoin de compte PayPal cote acheteur). */
(function(){
  'use strict';
  var BUSINESS='fredsoule976@gmail.com';
  function findCart(){
    try{ if(typeof window.getCart==='function'){ var c=window.getCart(); if(Array.isArray(c)) return c; } }catch(e){}
    try{ if(window.BOS_CART_KEY){ var vv=JSON.parse(localStorage.getItem(window.BOS_CART_KEY)); if(Array.isArray(vv)) return vv; } }catch(e){}
    try{
      for(var i=0;i<localStorage.length;i++){
        var k=localStorage.key(i);
        if(/_cart$|^cart$/i.test(k)){
          try{ var v=JSON.parse(localStorage.getItem(k)); if(Array.isArray(v)&&v.length&&v[0]&&('price' in v[0])) return v; }catch(e){}
        }
      }
    }catch(e){}
    return [];
  }
  function merciUrl(){ var u=location.origin + location.pathname.replace(/[^\/]*$/,'merci.html'); if(window._bosEagerToken) u+='?token='+encodeURIComponent(window._bosEagerToken); return u; }
  // BOS 09/07/2026 — génération eager de token pour produits digitaux (anti-vol PDF)
  window._bosEagerToken=null;
  (function eagerToken(){
    var pid=document.querySelector('[data-bos-product-id]'); if(!pid) return;
    var productId=pid.getAttribute('data-bos-product-id');
    var TOKEN_API='https://api.tonargentexplique.fr/generate-token';
    fetch(TOKEN_API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({product:productId})})
      .then(function(r){return r.json();}).then(function(d){window._bosEagerToken=d.token;}).catch(function(){});
  })();
  function toast(m){ if(typeof window.showToast==='function') window.showToast(m); else alert(m); }
  /* BOS — Umami events (funnel add_to_cart -> checkout_paypal/buy_now_click). Defensif, jamais bloquant. Ajout 02/07/2026. */
  function bosBoutiqueSlug(){
    try{ var p=location.pathname.split('/').filter(Boolean); return p[0]||location.hostname||'boutique'; }catch(e){ return 'boutique'; }
  }
  function bosTrack(name, props){
    try{ if(window.umami && typeof umami.track==='function') umami.track(name, props); }catch(e){}
    /* BOS — Pinterest tag (pintrk), consentement CNIL requis (bos-consent.js). Ajout 02/07/2026. */
    try{
      if(window.pintrk && (name==='checkout_paypal' || name==='buy_now_click')){
        var val=props && (props.montant!==undefined ? props.montant : props.prix);
        window.pintrk('track','checkout',{value:Number(val||0),currency:'EUR',order_quantity:1});
      }
    }catch(e){}
  }
  /* BOS 13/07/2026 — La remise -10% annoncee par le bandeau doit etre REELLEMENT facturee.
     Avant : le panier affichait le total remise mais PayPal encaissait le PLEIN TARIF.
     Source de verite du calcul = window.BOS_PROMO.discount() (bos-promo.js). */
  function bosPromoDiscount(cart){
    if(window.BOS_PROMO && typeof window.BOS_PROMO.discount==='function') return window.BOS_PROMO.discount(cart);
    if(!cart || !cart.length) return 0;
    var max=0;
    cart.forEach(function(i){ var p=Number(i.price)||0; if(p>max) max=p; });
    return max>0 ? Math.round(max*10)/100 : 0; // arrondi(max*0.10) au centime
  }
  function bosPromoLines(cart){
    var lines=cart.map(function(it){
      return {name:(it.name||'Article').toString(), price:Number(it.price||0),
              qty:Math.max(1,parseInt(it.qty||1,10)), id:it.id};
    });
    var d=bosPromoDiscount(cart);
    if(!(d>0) || !lines.length) return lines;
    var maxPrice=0, idx=-1;
    lines.forEach(function(l,i){ if(l.price>maxPrice){ maxPrice=l.price; idx=i; } });
    if(idx<0 || maxPrice<=0) return lines;
    var t=lines[idx];
    var discounted=Math.round((t.price-d)*100)/100;
    if(discounted<0) discounted=0;
    var promoLine={name:(t.name+' (remise -10%)').slice(0,120), price:discounted, qty:1, id:t.id};
    if(t.qty>1) lines.splice(idx,1,promoLine,{name:t.name,price:t.price,qty:t.qty-1,id:t.id});
    else lines[idx]=promoLine;
    return lines; // somme des lignes == sous-total - remise == total affiche au panier
  }
  window.bosPayPalCheckout=function(){
    var cart=findCart();
    if(!cart.length){ toast('Ton panier est vide.'); return; }
    var cgv=document.getElementById('cgv-check');
    if(cgv && !cgv.checked){ toast('Merci d’accepter les CGV pour continuer.'); return; }
    var lines=bosPromoLines(cart);
    var total=0;
    lines.forEach(function(it){ total += Number(it.price||0)*Math.max(1,parseInt(it.qty||1,10)); });
    bosTrack('checkout_paypal', {montant:Number(total.toFixed(2)), boutique:bosBoutiqueSlug(), page:location.pathname});
    var f=document.createElement('form');
    f.method='POST'; f.action='https://www.paypal.com/cgi-bin/webscr'; f.style.display='none'; f.target='_top';
    function add(n,v){ var i=document.createElement('input'); i.type='hidden'; i.name=n; i.value=v; f.appendChild(i); }
    add('cmd','_cart'); add('upload','1'); add('business',BUSINESS);
    add('currency_code','EUR'); add('lc','FR'); add('no_note','1'); add('rm','2');
    add('return',merciUrl()); add('cancel_return',location.href);
    lines.forEach(function(it,idx){
      var n=idx+1;
      add('item_name_'+n,(it.name||('Article '+n)).toString().slice(0,120));
      add('amount_'+n,Number(it.price||0).toFixed(2));
      add('quantity_'+n,Math.max(1,parseInt(it.qty||1,10)));
      if(it.id) add('item_number_'+n,String(it.id));
    });
    document.body.appendChild(f); f.submit();
  };
  // Bouton "Acheter maintenant" mono-produit (footperf mono-page ou fiches produit) : bosBuyNow(name, price, id?)
  window.bosBuyNow=function(name, price, id){
    bosTrack('buy_now_click', {produit:(name||'Commande').toString().slice(0,120), prix:Number(price||0), boutique:bosBoutiqueSlug(), page:location.pathname});
    var f=document.createElement('form');
    f.method='POST'; f.action='https://www.paypal.com/cgi-bin/webscr'; f.style.display='none'; f.target='_top';
    function add(n,v){ var i=document.createElement('input'); i.type='hidden'; i.name=n; i.value=v; f.appendChild(i); }
    add('cmd','_xclick'); add('business',BUSINESS); add('currency_code','EUR'); add('lc','FR');
    add('no_note','1'); add('rm','2'); add('return',merciUrl()); add('cancel_return',location.href);
    add('item_name',(name||'Commande').toString().slice(0,120)); add('amount',Number(price||0).toFixed(2));
    if(id) add('item_number',String(id));
    document.body.appendChild(f); f.submit();
  };
})();
