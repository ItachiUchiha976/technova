/* ===== IA Décodée — logique de l'app ===== */
(function () {
  "use strict";

  /* ---------- Utilitaires ---------- */
  // Normalisation qui PRÉSERVE la longueur (1 char -> 1 char) pour mapper les index.
  var ACCENTS = { "à":"a","â":"a","ä":"a","á":"a","ã":"a","å":"a","é":"e","è":"e","ê":"e","ë":"e","î":"i","ï":"i","í":"i","ì":"i","ô":"o","ö":"o","ó":"o","ò":"o","õ":"o","ù":"u","û":"u","ü":"u","ú":"u","ç":"c","œ":"o","æ":"a","ñ":"n" };
  function normChar(c) {
    var l = c.toLowerCase();
    return ACCENTS[l] || l;
  }
  function normalize(str) {
    var out = "";
    for (var i = 0; i < str.length; i++) out += normChar(str[i]);
    return out;
  }
  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, function (m) {
      return { "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m];
    });
  }
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $all(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  // Pré-compile une regex par terme
  TERMS.forEach(function (t) {
    var pats = t.match.map(function (p) { return normalize(p); });
    t._re = new RegExp("(?:" + pats.join("|") + ")", "g");
  });

  /* ========================================================= */
  /* ONGLETS                                                    */
  /* ========================================================= */
  $all(".tab").forEach(function (tab) {
    tab.addEventListener("click", function () {
      var id = tab.getAttribute("data-tab");
      $all(".tab").forEach(function (t) { t.classList.toggle("is-active", t === tab); t.setAttribute("aria-selected", t === tab); });
      $all("main > .panel").forEach(function (p) { p.hidden = p.id !== id; p.classList.toggle("is-active", p.id === id); });
    });
  });

  /* ========================================================= */
  /* DÉCODEUR DE TEXTE                                          */
  /* ========================================================= */
  var SAMPLE = "Ce nouvel assistant repose sur un LLM multimodal. Pour limiter les hallucinations, l'équipe a branché un système de RAG sur ses propres documents, puis a fait du fine-tuning. Avec une grande fenêtre de contexte, le modèle traite de longs textes via son API, facturée au token. Attention toutefois aux biais présents dans les données d'entraînement.";

  var txtEl = $("#decoder-text");
  var resEl = $("#decoder-result");
  var detEl = $("#decoder-terms");

  function decode() {
    var raw = (txtEl.value || "").slice(0, 20000);
    if (!raw.trim()) {
      resEl.className = "decoder-result placeholder";
      resEl.innerHTML = "<p>Colle d'abord un texte 🙂</p>";
      detEl.innerHTML = "";
      return;
    }
    var norm = normalize(raw);
    var hits = [];
    TERMS.forEach(function (t, ti) {
      t._re.lastIndex = 0;
      var m;
      while ((m = t._re.exec(norm)) !== null) {
        if (m[0].length === 0) { t._re.lastIndex++; continue; }
        hits.push({ start: m.index, end: m.index + m[0].length, ti: ti });
      }
    });
    // Tri : début croissant, puis le plus long d'abord
    hits.sort(function (a, b) { return a.start - b.start || (b.end - b.start) - (a.end - a.start); });
    // Sélection sans chevauchement
    var picked = [], lastEnd = -1;
    hits.forEach(function (h) { if (h.start >= lastEnd) { picked.push(h); lastEnd = h.end; } });

    // Construction du HTML surligné
    var html = "", cur = 0;
    picked.forEach(function (h) {
      html += escapeHtml(raw.slice(cur, h.start));
      html += '<mark class="term-hit" data-ti="' + h.ti + '" title="Cliquer pour la définition">' + escapeHtml(raw.slice(h.start, h.end)) + "</mark>";
      cur = h.end;
    });
    html += escapeHtml(raw.slice(cur));

    resEl.className = "decoder-result";
    resEl.innerHTML = html.replace(/\n/g, "<br>");

    // Liste des termes détectés (uniques, ordre d'apparition)
    var seen = {}, order = [];
    picked.forEach(function (h) { if (!seen[h.ti]) { seen[h.ti] = true; order.push(h.ti); } });

    if (order.length === 0) {
      detEl.innerHTML = '<p class="detected-head">Aucun terme technique repéré dans ce texte.</p>';
    } else {
      var out = '<p class="detected-head">' + order.length + " terme" + (order.length > 1 ? "s" : "") + " détecté" + (order.length > 1 ? "s" : "") + " 👇</p>";
      order.forEach(function (ti) {
        var t = TERMS[ti];
        out += '<div class="det-card"><h4>' + escapeHtml(t.term) + "</h4><p>" + escapeHtml(t.short) + "</p></div>";
      });
      out += '<a class="decoder-next" href="https://boutiquefred.gumroad.com/l/maitriser-ia-2026" target="_blank" rel="noopener">📘 Tu veux vraiment maîtriser l\'IA&nbsp;? → Le guide pratique 2026 (13&nbsp;€)</a>';
      out += '<a class="decoder-next decoder-next-alt" href="https://itachiuchiha976.github.io/comparateur-ia" target="_blank" rel="sponsored nofollow noopener">🧠 Ou compare les outils IA gratuitement →</a>';
      detEl.innerHTML = out;
    }

    // clic sur un surlignage -> modal
    $all("mark.term-hit", resEl).forEach(function (mk) {
      mk.addEventListener("click", function () { openModal(TERMS[+mk.getAttribute("data-ti")]); });
    });
  }

  $("#btn-decode").addEventListener("click", decode);
  $("#btn-sample").addEventListener("click", function () { txtEl.value = SAMPLE; decode(); txtEl.scrollIntoView({ behavior: "smooth", block: "center" }); });
  $("#btn-clear").addEventListener("click", function () { txtEl.value = ""; resEl.className = "decoder-result placeholder"; resEl.innerHTML = "<p>Texte effacé. Colle un nouveau texte pour le décoder.</p>"; detEl.innerHTML = ""; });

  /* ========================================================= */
  /* GLOSSAIRE                                                  */
  /* ========================================================= */
  var grid = $("#glossary-grid");
  var searchEl = $("#search");
  var countEl = $("#result-count");
  var noRes = $("#no-result");
  var catBox = $("#cat-filters");
  var activeCat = "all";

  // chips de catégorie
  var chips = '<button class="chip is-active" data-cat="all">Tout (' + TERMS.length + ")</button>";
  Object.keys(CATEGORIES).forEach(function (k) {
    var n = TERMS.filter(function (t) { return t.cat === k; }).length;
    chips += '<button class="chip" data-cat="' + k + '" style="--c:' + CATEGORIES[k].color + '">' + CATEGORIES[k].label + " (" + n + ")</button>";
  });
  catBox.innerHTML = chips;
  $all(".chip", catBox).forEach(function (c) {
    c.addEventListener("click", function () {
      activeCat = c.getAttribute("data-cat");
      $all(".chip", catBox).forEach(function (x) {
        var on = x === c;
        x.classList.toggle("is-active", on);
        x.style.background = on && activeCat !== "all" ? (CATEGORIES[activeCat] ? CATEGORIES[activeCat].color : "var(--cyan)") : "";
        if (on && activeCat === "all") x.style.background = "var(--cyan)";
        if (!on) x.style.background = "";
      });
      render();
    });
  });
  // état initial chip "Tout"
  $(".chip[data-cat='all']", catBox).style.background = "var(--cyan)";

  function cardHtml(t, idx) {
    var c = CATEGORIES[t.cat];
    return '<article class="term-card" data-idx="' + idx + '" style="--cat:' + c.color + '" tabindex="0">' +
      "<h3>" + escapeHtml(t.term) + "</h3>" +
      '<p class="short">' + escapeHtml(t.short) + "</p>" +
      '<div class="term-meta">' +
      '<span class="tag tag-cat" style="background:' + c.color + '">' + c.label + "</span>" +
      '<span class="tag tag-lvl">' + LEVELS[t.level] + "</span>" +
      "</div></article>";
  }

  function render() {
    var q = normalize(searchEl.value.trim());
    var list = TERMS.map(function (t, i) { return { t: t, i: i }; }).filter(function (o) {
      if (activeCat !== "all" && o.t.cat !== activeCat) return false;
      if (!q) return true;
      var hay = normalize(o.t.term + " " + o.t.short + " " + o.t.def + " " + o.t.match.join(" "));
      return hay.indexOf(q) !== -1;
    });
    grid.innerHTML = list.map(function (o) { return cardHtml(o.t, o.i); }).join("");
    countEl.textContent = list.length + " terme" + (list.length > 1 ? "s" : "");
    noRes.hidden = list.length !== 0;
    $all(".term-card", grid).forEach(function (card) {
      var t = TERMS[+card.getAttribute("data-idx")];
      card.addEventListener("click", function () { openModal(t); });
      card.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openModal(t); } });
    });
  }
  searchEl.addEventListener("input", render);
  render();

  /* ========================================================= */
  /* MODAL                                                      */
  /* ========================================================= */
  var modal = $("#term-modal");
  var modalBody = $("#modal-body");
  function openModal(t) {
    var c = CATEGORIES[t.cat];
    modalBody.innerHTML =
      "<h3>" + escapeHtml(t.term) + "</h3>" +
      '<div class="modal-meta">' +
      '<span class="tag tag-cat" style="background:' + c.color + '">' + c.label + "</span>" +
      '<span class="tag tag-lvl">' + LEVELS[t.level] + "</span></div>" +
      '<p class="m-def">' + escapeHtml(t.def) + "</p>" +
      '<div class="m-example"><b>Exemple concret&nbsp;:</b> ' + escapeHtml(t.example) + "</div>";
    modal.hidden = false;
    document.body.style.overflow = "hidden";
  }
  function closeModal() { modal.hidden = true; document.body.style.overflow = ""; }
  $all("[data-close]", modal).forEach(function (el) { el.addEventListener("click", closeModal); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !modal.hidden) closeModal(); });

  /* ========================================================= */
  /* QUIZ                                                       */
  /* ========================================================= */
  var quizBox = $("#quiz-box");
  var QN = 10;
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var tmp = a[i]; a[i] = a[j]; a[j] = tmp; } return a; }

  function startQuiz() {
    var pool = shuffle(TERMS).slice(0, QN);
    var qs = pool.map(function (t) {
      var distract = shuffle(TERMS.filter(function (x) { return x.term !== t.term; })).slice(0, 3).map(function (x) { return x.term; });
      var opts = shuffle(distract.concat([t.term]));
      return { def: t.short, correct: t.term, opts: opts, example: t.example, full: t };
    });
    var idx = 0, score = 0;

    function renderQ() {
      if (idx >= qs.length) return renderEnd();
      var q = qs[idx];
      var html = '<p class="quiz-progress">Question ' + (idx + 1) + " / " + qs.length + " · Score : " + score + '</p>';
      html += '<p class="quiz-q">Quel terme correspond à&nbsp;: «&nbsp;' + escapeHtml(q.def) + "&nbsp;»&nbsp;?</p>";
      html += '<div class="quiz-options">';
      q.opts.forEach(function (o) { html += '<button class="quiz-opt" data-opt="' + escapeHtml(o) + '">' + escapeHtml(o) + "</button>"; });
      html += "</div><div class='quiz-feedback'></div>";
      quizBox.innerHTML = html;
      $all(".quiz-opt", quizBox).forEach(function (btn) {
        btn.addEventListener("click", function () {
          var chosen = btn.getAttribute("data-opt");
          var ok = chosen === q.correct;
          if (ok) score++;
          $all(".quiz-opt", quizBox).forEach(function (b) {
            b.disabled = true;
            if (b.getAttribute("data-opt") === q.correct) b.classList.add("correct");
            else if (b === btn) b.classList.add("wrong");
          });
          $(".quiz-feedback", quizBox).innerHTML =
            (ok ? "✅ Bravo&nbsp;! " : "❌ La réponse était <b>" + escapeHtml(q.correct) + "</b>. ") +
            "<br><b>" + escapeHtml(q.correct) + "</b> — " + escapeHtml(q.example) +
            '<div class="quiz-next"><button class="btn btn-primary" id="qnext">' + (idx + 1 >= qs.length ? "Voir mon score" : "Question suivante") + "</button></div>";
          $("#qnext", quizBox).addEventListener("click", function () { idx++; renderQ(); });
        });
      });
    }

    function renderEnd() {
      var msg = score >= 8 ? "Impressionnant, tu décodes l'IA comme un pro&nbsp;! 🧠" :
                score >= 5 ? "Pas mal&nbsp;! Tu as de bonnes bases. 👍" :
                "C'est un début&nbsp;! Le glossaire est là pour progresser. 🚀";
      quizBox.innerHTML =
        "<h3>Résultat</h3>" +
        '<p class="quiz-score"><span class="grad">' + score + " / " + qs.length + "</span></p>" +
        "<p>" + msg + "</p>" +
        '<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:18px">' +
        '<button class="btn btn-ghost" id="quiz-again">Rejouer</button>' +
        '<a class="btn btn-sub" href="https://www.youtube.com/@iadecodefr?sub_confirmation=1" target="_blank" rel="noopener"><span class="yt-ico">▶</span> S\'abonner pour en apprendre plus</a>' +
        '<a class="btn btn-primary" href="https://boutiquefred.gumroad.com/l/maitriser-ia-2026" target="_blank" rel="noopener">📘 Maîtriser l\'IA en 2026 (13&nbsp;€) →</a>' +
        '<a class="btn btn-ghost" href="https://itachiuchiha976.github.io/comparateur-ia" target="_blank" rel="sponsored nofollow noopener">Comparer les outils IA (gratuit) →</a>' +
        "</div>";
      $("#quiz-again", quizBox).addEventListener("click", startQuiz);
    }
    renderQ();
  }
  document.addEventListener("click", function (e) {
    if (e.target && e.target.id === "btn-quiz-start") startQuiz();
  });

  /* ========================================================= */
  /* CAPTURE EMAIL (Web3Forms — AJAX)                           */
  /* ========================================================= */
  var emailForm = $("#email-form");
  if (emailForm) {
    emailForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var val = ($("#email-input").value || "").trim();
      if (!val) return;
      var btn = $("button[type='submit']", emailForm);
      if (btn) { btn.disabled = true; btn.textContent = "Envoi…"; }
      fetch(emailForm.action, {
        method: "POST",
        headers: { "Accept": "application/json" },
        body: new FormData(emailForm)
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data && data.success) {
            emailForm.style.display = "none";
            $("#email-msg").hidden = false;
          } else {
            if (btn) { btn.disabled = false; btn.textContent = "Je m'abonne"; }
            $("#email-msg").hidden = false;
            $("#email-msg").textContent = "Hmm, une erreur est survenue. Réessaie dans un instant.";
            $("#email-msg").style.color = "var(--amber)";
          }
        })
        .catch(function () {
          if (btn) { btn.disabled = false; btn.textContent = "Je m'abonne"; }
          $("#email-msg").hidden = false;
          $("#email-msg").textContent = "Connexion impossible. Vérifie ta connexion et réessaie.";
          $("#email-msg").style.color = "var(--amber)";
        });
    });
  }

})();
