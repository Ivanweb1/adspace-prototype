/* =========================================================
   ADSPACE Group — правка 29 (29.10): эффекты блока «Акции».
   Атрибут data-promofx на <html>:
     base   — как сейчас: разворот меняется мгновенно
     drum   — А · барабан: блок прилипает, прокрутка крутит
              карточки на цилиндре (обычная прокрутка страницы,
              ничего не перехватываем — на телефоне это свайп)
     cutout — Б · вырезка из газеты: карточка «вырезается»,
              «Подробнее» вылетает из карточки к центру экрана
     fly    — В · вылет: карточки влетают по очереди, фото
              стартует крупным и садится на место
   Задаётся ссылкой ?promofx=… или кнопками в нижней панели.
   ========================================================= */
(function () {
  function init() {
    var root = document.documentElement;
    var promos = document.querySelector(".promos");
    var wrap = document.querySelector("[data-pr-wrap]");
    var stage = document.querySelector("[data-pr-stage]");
    if (!promos || !wrap || !stage) return;

    var FX = ["base", "drum", "cutout", "fly"];
    var pages = Array.prototype.slice.call(promos.querySelectorAll("[data-cx-page]"));
    var cards = Array.prototype.slice.call(promos.querySelectorAll(".pr-card"));
    var flipLabel = promos.querySelector(".pr-flip > span");
    var flipLabelHtml = flipLabel ? flipLabel.innerHTML : "";
    var hint = promos.querySelector(".pr-drum-hint");
    var touch = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
    var panel = document.querySelector("[data-fontpick]");
    var buttons = panel ? panel.querySelectorAll("[data-promofx-set]") : [];
    var pad = function (n) { return String(n).padStart(2, "0"); };

    // порядковый номер карточки внутри разворота — для очереди «влёта»
    pages.forEach(function (page) {
      page.querySelectorAll(".pr-card").forEach(function (card, i) {
        card.style.setProperty("--n", i);
      });
    });

    function fx() {
      return root.getAttribute("data-promofx") || "base";
    }

    /* ── В · вылет: проигрываем заново при каждом показе разворота ── */
    function replay(page) {
      if (fx() !== "fly" || !page || page.hidden) return;
      page.classList.remove("is-enter");
      void page.offsetWidth;
      page.classList.add("is-enter");
    }
    if ("MutationObserver" in window) {
      pages.forEach(function (page) {
        new MutationObserver(function () { if (!page.hidden) replay(page); })
          .observe(page, { attributes: true, attributeFilter: ["hidden"] });
      });
    }
    // первый показ — когда блок доезжает до экрана
    if ("IntersectionObserver" in window) {
      var seen = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        pages.forEach(replay);
      }, { threshold: 0.25 });
      seen.observe(stage);
    }

    /* ── Б · вырезка: окно «Подробнее» вылетает из карточки ── */
    document.addEventListener("click", function (e) {
      if (fx() !== "cutout") return;
      var btn = e.target.closest && e.target.closest("[data-promo-open]");
      if (!btn) return;
      var card = btn.closest(".pr-card");
      var modalPanel = document.querySelector(".promo-modal-panel");
      if (!card || !modalPanel || !modalPanel.animate) return;
      // окно уже открыто обработчиком кнопки — меряем конечное положение
      requestAnimationFrame(function () {
        var from = card.getBoundingClientRect();
        var to = modalPanel.getBoundingClientRect();
        var dx = from.left + from.width / 2 - (to.left + to.width / 2);
        var dy = from.top + from.height / 2 - (to.top + to.height / 2);
        var s = Math.min(from.width / to.width, from.height / to.height);
        modalPanel.animate(
          [
            { transform: "translate(" + dx + "px," + dy + "px) scale(" + s + ") rotate(-2deg)", opacity: 0.4 },
            { transform: "translate(0,0) scale(1.02) rotate(0.4deg)", opacity: 1, offset: 0.75 },
            { transform: "none", opacity: 1 },
          ],
          { duration: 700, easing: "cubic-bezier(0.2, 0.7, 0.2, 1)" }
        );
      });
    });

    /* ── А · барабан ─────────────────────────────────────── */
    var STEP = 26; // градусов между карточками на цилиндре
    var drumIndex = 0;
    var ticking = false;

    function drumMetrics() {
      var w = wrap.getBoundingClientRect();
      var travel = Math.max(1, wrap.offsetHeight - stage.offsetHeight);
      return { top: w.top, travel: travel };
    }
    function drawDrum() {
      ticking = false;
      if (fx() !== "drum") return;
      var m = drumMetrics();
      var stickTop = parseFloat(getComputedStyle(stage).top) || 0;
      var progress = Math.min(1, Math.max(0, (stickTop - m.top) / m.travel));
      var p = progress * (cards.length - 1);
      var h = cards[0] ? cards[0].offsetHeight : 400;
      var radius = h / 2 / Math.tan((STEP / 2) * Math.PI / 180);
      cards.forEach(function (card, i) {
        var d = i - p;
        var ad = Math.abs(d);
        card.style.transform =
          "translate(-50%, -50%) translateZ(" + -radius + "px) rotateX(" + -d * STEP + "deg) translateZ(" + radius + "px)";
        // соседние — плотные (иначе сквозь них просвечивает красный),
        // гаснут только дальние; глубину даёт затемнение
        card.style.opacity = ad <= 1 ? "1" : String(Math.max(0, 1 - (ad - 1) * 1.4));
        card.style.filter = "brightness(" + (1 - Math.min(ad, 2) * 0.16) + ")";
        card.style.zIndex = String(100 - Math.round(ad * 10));
        card.style.pointerEvents = ad < 0.5 ? "auto" : "none";
      });
      drumIndex = Math.round(p);
      var label = "Акция <b>" + pad(drumIndex + 1) + "</b> / " + pad(cards.length);
      if (flipLabel) flipLabel.innerHTML = label;
      // заголовок с листалкой уезжает вверх — счётчик дублируем под барабаном
      if (hint) hint.innerHTML = label + (touch ? " · листайте" : " · крутите колесо");
    }
    function onScroll() {
      if (ticking || fx() !== "drum") return;
      ticking = true;
      requestAnimationFrame(drawDrum);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    // стрелки в барабане — к соседней акции прокруткой страницы
    promos.addEventListener("click", function (e) {
      if (fx() !== "drum") return;
      var prev = e.target.closest && e.target.closest("[data-cx-prev]");
      var next = e.target.closest && e.target.closest("[data-cx-next]");
      if (!prev && !next) return;
      e.stopPropagation();
      var target = Math.min(cards.length - 1, Math.max(0, drumIndex + (next ? 1 : -1)));
      var m = drumMetrics();
      var stickTop = parseFloat(getComputedStyle(stage).top) || 0;
      var y = window.scrollY + m.top - stickTop + (target / (cards.length - 1)) * m.travel;
      window.scrollTo({ top: y + 1, behavior: "smooth" });
    }, true);

    function leaveDrum() {
      cards.forEach(function (card) {
        ["transform", "opacity", "filter", "zIndex", "pointerEvents"].forEach(function (k) { card.style[k] = ""; });
      });
      if (flipLabel) flipLabel.innerHTML = flipLabelHtml;
    }

    /* ── переключатель ───────────────────────────────────── */
    function apply(name) {
      var was = fx();
      root.setAttribute("data-promofx", name);
      buttons.forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.promofxSet === name)); });
      if (was === "drum" && name !== "drum") leaveDrum();
      if (name === "drum") requestAnimationFrame(drawDrum);
      if (name === "fly") pages.forEach(replay);
    }
    var saved;
    try { saved = localStorage.getItem("dz-promofx"); } catch (e) {}
    var fromUrl = new URLSearchParams(location.search).get("promofx");
    apply(FX.indexOf(fromUrl) > -1 ? fromUrl : FX.indexOf(saved) > -1 ? saved : "base");
    buttons.forEach(function (b) {
      b.addEventListener("click", function () {
        apply(b.dataset.promofxSet);
        try { localStorage.setItem("dz-promofx", b.dataset.promofxSet); } catch (e) {}
      });
    });

    /* ── правка 32: видео-сторис в главной карточке ───────────
       Полоски сверху — сцены ролика (границы в секундах), заполняются
       по времени видео. Вне экрана ролик на паузе. */
    var story = promos.querySelector("[data-story]");
    var video = story && story.querySelector("video");
    var bars = story ? story.querySelectorAll("[data-story-bars] i") : [];
    var CUTS = [0, 3.25, 6.25, 9.5];
    function paintBars() {
      if (!video) return;
      var t = video.currentTime;
      bars.forEach(function (bar, i) {
        var p = (t - CUTS[i]) / (CUTS[i + 1] - CUTS[i]);
        bar.style.setProperty("--p", Math.min(1, Math.max(0, p)));
      });
      if (!video.paused) requestAnimationFrame(paintBars);
    }
    if (video) {
      video.addEventListener("play", paintBars);
      var play = function () { var r = video.play(); if (r && r.catch) r.catch(function () {}); };
      if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (entries) {
          if (entries[0].isIntersecting) play(); else video.pause();
        }, { threshold: 0.2 }).observe(story);
      } else {
        play();
      }
    }

    /* ── правка 32: название блока — «Афиша акций и спецпредложений» или «Афиша» ── */
    var TITLES = { long: "Афиша акций и спецпредложений", short: "Афиша" };
    var titleEl = promos.querySelector("[data-promos-title]");
    var titleButtons = panel ? panel.querySelectorAll("[data-ptitle-set]") : [];
    function applyTitle(name) {
      if (titleEl) titleEl.textContent = TITLES[name];
      titleButtons.forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.ptitleSet === name)); });
    }
    var savedTitle;
    try { savedTitle = localStorage.getItem("dz-ptitle"); } catch (e) {}
    var titleUrl = new URLSearchParams(location.search).get("ptitle");
    applyTitle(TITLES[titleUrl] ? titleUrl : TITLES[savedTitle] ? savedTitle : "long");
    titleButtons.forEach(function (b) {
      b.addEventListener("click", function () {
        applyTitle(b.dataset.ptitleSet);
        try { localStorage.setItem("dz-ptitle", b.dataset.ptitleSet); } catch (e) {}
      });
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
