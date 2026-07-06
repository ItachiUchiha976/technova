// Comparateur IA — interactions partagées

// 1) Menu mobile (hamburger)
document.querySelectorAll('.nav-toggle').forEach(function (btn) {
  btn.addEventListener('click', function () {
    var nav = document.querySelector('.nav');
    if (!nav) return;
    var open = nav.classList.toggle('open');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
});

// 2) Capture email Web3Forms (envoi AJAX, sans rechargement)
document.querySelectorAll('form.capture-form').forEach(function (form) {
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var wrap = form.parentElement;
    var btn = form.querySelector('button[type=submit]');
    var note = wrap.querySelector('.capture-note');
    var success = wrap.querySelector('.capture-success');
    if (btn) { btn.disabled = true; btn.textContent = 'Envoi…'; }
    fetch(form.action, {
      method: 'POST',
      headers: { 'Accept': 'application/json' },
      body: new FormData(form)
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.success) {
          form.style.display = 'none';
          if (note) note.style.display = 'none';
          if (success) success.hidden = false;
        } else {
          if (btn) { btn.disabled = false; btn.textContent = 'Réessayer →'; }
          if (note) note.textContent = "Oups, une erreur est survenue. Réessaie dans un instant.";
        }
      })
      .catch(function () {
        if (btn) { btn.disabled = false; btn.textContent = 'Réessayer →'; }
        if (note) note.textContent = "Oups, problème réseau. Réessaie dans un instant.";
      });
  });
});
