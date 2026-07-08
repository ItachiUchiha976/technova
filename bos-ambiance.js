/* BOS — Son d'ambiance discret avec toggle. Ajout 08/07/2026.
   Chaque boutique a un son thématique. Bouton discret en bas à droite. */

(function(){
  'use strict';

  // === SONS PAR BOUTIQUE ===
  var SOUNDS = {
    'curiosaboutique.fr': 'https://cdn.freesound.org/previews/749/749395_16414967-lq.mp3',
    'serenlabboutique.fr': 'https://cdn.freesound.org/previews/683/683447_6494688-lq.mp3',
    'technovaboutique.fr': 'https://cdn.freesound.org/previews/462/462267_8391234-lq.mp3',
    'focuslabboutique.fr': 'https://cdn.freesound.org/previews/341/341244_5121236-lq.mp3',
    'footperf.fr': 'https://cdn.freesound.org/previews/513/513747_3190614-lq.mp3',
  };

  var host = location.hostname.replace(/^www\./, '');
  var soundUrl = SOUNDS[host];
  if (!soundUrl) return;

  // === ETAT ===
  var isPlaying = false;
  var audio = null;

  // === BOUTON ===
  var btn = document.createElement('button');
  btn.id = 'bos-ambiance-btn';
  btn.setAttribute('aria-label', 'Son d ambiance');
  btn.innerHTML = '🔇';
  btn.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:9998;width:44px;height:44px;border-radius:50%;border:none;background:rgba(0,0,0,0.6);color:#fff;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);transition:background 0.2s;';
  btn.onmouseover = function(){ this.style.background = 'rgba(99,102,241,0.8)'; };
  btn.onmouseout  = function(){ this.style.background = 'rgba(0,0,0,0.6)'; };

  btn.addEventListener('click', function(){
    if (isPlaying) {
      if (audio) { audio.pause(); audio = null; }
      btn.innerHTML = '🔇';
      isPlaying = false;
    } else {
      audio = new Audio(soundUrl);
      audio.loop = true;
      audio.volume = 0.15; // très discret
      audio.play().catch(function(){});
      btn.innerHTML = '🔊';
      isPlaying = true;
    }
  });

  function appendBtn() {
    document.body.appendChild(btn);
  }
  if (document.body) {
    appendBtn();
  } else {
    document.addEventListener('DOMContentLoaded', appendBtn);
  }

  // Tracking
  try {
    if (window.umami && typeof umami.track === 'function') {
      umami.track('view_ambiance_button', {boutique: host, page: location.pathname});
    }
  } catch(e) {}
})();
