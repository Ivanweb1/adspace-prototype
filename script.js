/* =========================================================
   ADSPACE Group — логика прототипа главной страницы
   ========================================================= */
(() => {
  "use strict";

  const $ = (sel, scope = document) => scope.querySelector(sel);
  const $$ = (sel, scope = document) => [...scope.querySelectorAll(sel)];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const isMobile = () => window.matchMedia("(max-width: 720px)").matches;
  const money = (value) => `${new Intl.NumberFormat("ru-RU").format(Math.round(value))} ₽`;

  // Блоки прячутся до появления только при работающем JS
  document.documentElement.classList.add("has-js");

  /* ── мобильное меню ─────────────────────────────────── */
  const menuButton = $(".menu-button");
  const mobileMenu = $("#mobile-menu");

  const setMenu = (open) => {
    menuButton.setAttribute("aria-expanded", String(open));
    mobileMenu.hidden = !open;
  };

  menuButton?.addEventListener("click", () => {
    setMenu(menuButton.getAttribute("aria-expanded") !== "true");
  });
  $$("#mobile-menu a").forEach((link) => link.addEventListener("click", () => setMenu(false)));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setMenu(false);
  });

  /* ── выбор города: шапка + мобильное меню + живой баннер ── */
  const citySelects = $$("[data-city-select]");
  const cityTicker = $("[data-city-ticker]");

  // Демонстрационные данные — реальные цифры инвентаря по городам не переданы
  const CITY_DATA = {
    krasnodar: { loc: "в Краснодаре", count: 10 },
    rostov: { loc: "в Ростове-на-Дону", count: 10 },
    moscow: { loc: "в Москве", count: 34 },
    sochi: { loc: "в Сочи", count: 7 },
    kazan: { loc: "в Казани", count: 15 },
  };

  const applyCity = (key) => {
    const data = CITY_DATA[key] || CITY_DATA.krasnodar;
    citySelects.forEach((select) => {
      if (select.value !== key) select.value = key;
    });
    if (cityTicker) {
      $("[data-ticker-count]", cityTicker).textContent = data.count;
      $("[data-ticker-city]", cityTicker).textContent = data.loc;
    }
  };

  citySelects.forEach((select) =>
    select.addEventListener("change", () => applyCity(select.value))
  );
  if (citySelects.length) applyCity(citySelects[0].value);

  /* ── первый экран: смена сюжетов ────────────────────── */
  const stage = $("[data-stage]");
  if (stage) {
    const titles = {
      outdoor: "Наружная реклама",
      indoor: "Indoor и лифты",
      broadcast: "Радио и ТВ",
      calc: "Калькулятор кампании",
      plan: "Готовый медиаплан",
      booking: "Онлайн-бронирование",
    };
    const scenes = $$("[data-scene]", stage);
    const dots = $$("[data-stage-dot]", stage);
    const caption = $("[data-stage-title]", stage);
    let index = 0;
    let timer = null;

    const countUp = (node) => {
      const target = Number(node.dataset.countTo);
      if (reduceMotion.matches) {
        node.textContent = money(target);
        return;
      }
      const start = performance.now();
      const step = (now) => {
        const progress = Math.min((now - start) / 900, 1);
        node.textContent = money(target * (1 - Math.pow(1 - progress, 3)));
        if (progress < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    const showScene = (next) => {
      index = (next + scenes.length) % scenes.length;
      scenes.forEach((scene, i) => scene.classList.toggle("is-active", i === index));
      dots.forEach((dot, i) => dot.setAttribute("aria-selected", String(i === index)));
      caption.textContent = titles[scenes[index].dataset.scene] || "";
      const counter = $("[data-count-to]", scenes[index]);
      if (counter) countUp(counter);
    };

    const play = () => {
      if (reduceMotion.matches) return;
      stop();
      timer = window.setInterval(() => showScene(index + 1), 4200);
    };
    const stop = () => {
      if (timer) window.clearInterval(timer);
      timer = null;
    };

    dots.forEach((dot, i) =>
      dot.addEventListener("click", () => {
        showScene(i);
        play();
      })
    );
    stage.addEventListener("mouseenter", stop);
    stage.addEventListener("mouseleave", play);
    stage.addEventListener("focusin", stop);
    stage.addEventListener("focusout", play);

    showScene(0);
    play();
  }

  /* ── акции: горизонтальная листалка ─────────────────── */
  const track = $("[data-promo-track]");
  if (track) {
    const cards = $$("[data-promo-card]", track);
    const counter = $("[data-promo-current]");
    const step = () => {
      if (cards.length < 2) return track.clientWidth;
      return cards[1].offsetLeft - cards[0].offsetLeft;
    };

    const updateCounter = () => {
      const maxScroll = track.scrollWidth - track.clientWidth;
      const atEnd = track.scrollLeft >= maxScroll - 2;
      const current = atEnd
        ? cards.length
        : Math.round((track.scrollLeft - cards[0].offsetLeft) / step()) + 1;
      counter.textContent = String(Math.min(Math.max(current, 1), cards.length)).padStart(2, "0");
    };

    const scrollByCard = (direction) => {
      track.scrollBy({
        left: step() * direction,
        behavior: reduceMotion.matches ? "auto" : "smooth",
      });
    };

    $("[data-promo-prev]")?.addEventListener("click", () => scrollByCard(-1));
    $("[data-promo-next]")?.addEventListener("click", () => scrollByCard(1));
    track.addEventListener("scroll", () => window.requestAnimationFrame(updateCounter), {
      passive: true,
    });
    track.addEventListener("keydown", (event) => {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        scrollByCard(1);
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        scrollByCard(-1);
      }
    });
    updateCounter();
  }

  /* ── конструктор кампании ───────────────────────────── */
  const builderForm = $("[data-builder-form]");
  const builderResult = $("[data-builder-result]");

  if (builderForm && builderResult) {
    const CHANNELS = {
      outdoor: "Outdoor",
      dooh: "Digital / DOOH",
      radio: "Radio",
      tv: "TV",
      transit: "Transit",
      indoor: "Indoor",
      lift: "Реклама в лифтах",
      production: "Production",
    };

    // Базовый вес каналов по географии
    const GEO_BASE = {
      district: { lift: 42, indoor: 28, dooh: 16, production: 10 },
      city: { outdoor: 34, radio: 22, dooh: 20, indoor: 14, production: 8 },
      cities: { outdoor: 30, dooh: 24, radio: 22, indoor: 12, production: 8 },
      russia: { outdoor: 26, tv: 22, radio: 20, dooh: 16, transit: 8, production: 8 },
    };

    // Поправка на тип бизнеса
    const BUSINESS_BONUS = {
      local: { lift: 16, indoor: 12, dooh: 4 },
      developer: { outdoor: 18, radio: 10, lift: 8 },
      network: { dooh: 12, indoor: 10, radio: 6 },
      fmcg: { tv: 16, outdoor: 12, radio: 8 },
      auto: { transit: 16, dooh: 10, radio: 6 },
      mall: { indoor: 16, dooh: 10, radio: 4 },
    };

    // Поправка на цель кампании
    const GOAL_BONUS = {
      clients: { lift: 8, indoor: 8, dooh: 6 },
      awareness: { outdoor: 12, tv: 8, radio: 6 },
      launch: { dooh: 10, radio: 8, production: 8 },
      sales: { radio: 8, indoor: 6, transit: 6 },
    };

    const GEO_LABEL = {
      district: "Один район",
      city: "Весь город",
      cities: "Несколько городов",
      russia: "Вся Россия",
    };

    const GEO_REACH_K = { district: 2.2, city: 3.0, cities: 3.4, russia: 4.1 };

    const DESCRIPTIONS = {
      district: "Плотное покрытие района: контакт рядом с домом и точкой продаж, каждый день.",
      city: "Городская кампания: заметный охват плюс повторный контакт по дороге и в эфире.",
      cities: "Мультигород: один медиаплан, синхронный запуск и общий отчёт по всем городам.",
      russia: "Федеральный микс: широкий охват с адаптацией сообщения по регионам.",
    };

    const addWeights = (target, source = {}) => {
      Object.entries(source).forEach(([key, value]) => {
        target[key] = (target[key] || 0) + value;
      });
      return target;
    };

    const buildMix = ({ business, goal, geo, budget }) => {
      const weights = addWeights({}, GEO_BASE[geo]);
      addWeights(weights, BUSINESS_BONUS[business]);
      addWeights(weights, GOAL_BONUS[goal]);

      // Бюджет: ТВ и федеральная наружка не имеют смысла на малых суммах
      if (budget < 400000) {
        delete weights.tv;
        weights.outdoor = (weights.outdoor || 0) * 0.5;
        weights.lift = (weights.lift || 0) + 8;
      }
      if (budget >= 2000000) {
        weights.tv = (weights.tv || 0) + 10;
        weights.production = (weights.production || 0) + 4;
      }

      let items = Object.entries(weights).filter(([, value]) => value > 0);
      items.sort((a, b) => b[1] - a[1]);
      items = items.slice(0, budget < 400000 ? 3 : 4);

      const total = items.reduce((sum, [, value]) => sum + value, 0);
      const shares = items.map(([key, value]) => [key, Math.round((value / total) * 100)]);

      // Добираем округление до ровных 100%
      const diff = 100 - shares.reduce((sum, [, share]) => sum + share, 0);
      if (shares.length) shares[0][1] += diff;

      return shares;
    };

    const periodFor = (budget) => {
      if (budget < 300000) return "14 дней";
      if (budget < 900000) return "30 дней";
      if (budget < 2500000) return "45 дней";
      return "60–90 дней";
    };

    const reachFor = (budget, geo) => {
      const contacts = budget * GEO_REACH_K[geo];
      if (contacts >= 1000000) {
        return `${(contacts / 1000000).toFixed(1).replace(".", ",")} млн`;
      }
      return `${Math.round(contacts / 1000)} тыс.`;
    };

    const renderResult = () => {
      const data = new FormData(builderForm);
      const params = {
        business: data.get("business"),
        goal: data.get("goal"),
        geo: data.get("geo"),
        budget: Number(data.get("budget")),
      };

      const mix = buildMix(params);
      $("[data-result-title]").textContent = mix
        .slice(0, 3)
        .map(([key]) => CHANNELS[key])
        .join(" + ");
      $("[data-result-desc]").textContent = DESCRIPTIONS[params.geo];

      $("[data-result-mix]").innerHTML = mix
        .map(
          ([key, share]) => `
            <li class="mix-item">
              <b>${CHANNELS[key]}</b>
              <span class="mix-bar"><i style="--w:${share}%"></i></span>
              <span class="mix-share">${share}%</span>
            </li>`
        )
        .join("");

      $("[data-result-budget]").textContent = money(params.budget);
      $("[data-result-period]").textContent = periodFor(params.budget);
      $("[data-result-geo]").textContent = GEO_LABEL[params.geo];
      $("[data-result-reach]").textContent = reachFor(params.budget, params.geo);
    };

    const budgetInput = $('input[name="budget"]', builderForm);
    const budgetOutput = $("[data-budget-output]", builderForm);
    budgetInput?.addEventListener("input", () => {
      budgetOutput.textContent = money(Number(budgetInput.value));
    });

    builderForm.addEventListener("submit", (event) => {
      event.preventDefault();
      renderResult();
      builderResult.hidden = false;
      builderResult.scrollIntoView({
        behavior: reduceMotion.matches ? "auto" : "smooth",
        block: "nearest",
      });
    });

    // Пока результат открыт — он пересчитывается на лету
    $$("[data-builder-input]", builderForm).forEach((input) =>
      input.addEventListener("change", () => {
        if (!builderResult.hidden) renderResult();
      })
    );

    $("[data-result-close]")?.addEventListener("click", () => {
      builderResult.hidden = true;
      builderForm.scrollIntoView({
        behavior: reduceMotion.matches ? "auto" : "smooth",
        block: "center",
      });
    });
  }

  /* ── рекламные решения: смена визуала ───────────────── */
  const solutionList = $("[data-solution-list]");
  if (solutionList) {
    const buttons = $$("button", solutionList);
    const canvas = $("[data-preview-canvas]");
    const indexLabel = $("[data-preview-index]");
    const titleLabel = $("[data-preview-title]");
    const descLabel = $("[data-preview-desc]");

    const activate = (button) => {
      buttons.forEach((item) => {
        const active = item === button;
        item.classList.toggle("is-active", active);
        item.setAttribute("aria-expanded", String(active));
      });
      canvas.dataset.kind = button.dataset.solution;
      indexLabel.textContent = `${String(buttons.indexOf(button) + 1).padStart(2, "0")} / ${String(
        buttons.length
      ).padStart(2, "0")}`;
      titleLabel.textContent = button.dataset.title;
      descLabel.textContent = button.dataset.desc;
    };

    buttons.forEach((button) => {
      button.addEventListener("mouseenter", () => {
        if (!isMobile()) activate(button);
      });
      button.addEventListener("focus", () => {
        if (!isMobile()) activate(button);
      });
      button.addEventListener("click", () => {
        // на мобильном повторное нажатие сворачивает описание
        if (isMobile() && button.classList.contains("is-active")) {
          button.classList.remove("is-active");
          button.setAttribute("aria-expanded", "false");
          return;
        }
        activate(button);
      });
    });
  }

  /* ── карта географии ────────────────────────────────── */
  const geoMap = $("[data-geo-map]");
  if (geoMap) {
    const GEO_DATA = {
      ufo: { cities: "18", surfaces: "3 900", operators: "24" },
      rf: { cities: "70+", surfaces: "12 400", operators: "90+" },
    };
    const cities = $("[data-geo-cities]");
    const surfaces = $("[data-geo-surfaces]");
    const operators = $("[data-geo-operators]");

    $$("[data-geo]").forEach((button) =>
      button.addEventListener("click", () => {
        const mode = button.dataset.geo;
        $$("[data-geo]").forEach((item) => item.classList.toggle("is-active", item === button));
        geoMap.dataset.mode = mode;
        geoMap.style.backgroundSize = mode === "rf" ? "14px 14px" : "18px 18px";
        cities.textContent = GEO_DATA[mode].cities;
        surfaces.textContent = GEO_DATA[mode].surfaces;
        operators.textContent = GEO_DATA[mode].operators;
      })
    );
  }

  /* ── презентация ────────────────────────────────────── */
  $("[data-presentation]")?.addEventListener("click", () => {
    $("[data-presentation-status]").textContent =
      "Файл презентации ещё не передан. В прототипе кнопка ведёт на форму запроса материалов.";
    $("#contact")?.scrollIntoView({
      behavior: reduceMotion.matches ? "auto" : "smooth",
      block: "start",
    });
  });

  /* ── финальная форма ────────────────────────────────── */
  const contactForm = $("[data-contact-form]");
  contactForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const status = $("[data-form-status]", contactForm);
    const required = $$("input[required]", contactForm);
    const empty = required.filter((input) => !input.value.trim());

    required.forEach((input) => input.classList.toggle("is-invalid", !input.value.trim()));

    if (empty.length) {
      status.textContent = "Заполните имя и контакт — так мы сможем ответить.";
      empty[0].focus();
      return;
    }

    status.textContent = "Спасибо! Это прототип: заявка не отправляется, но сценарий формы работает.";
    contactForm.reset();
  });

  /* ── появление блоков при скролле ───────────────────── */
  const revealTargets = $$(".reveal");
  if (reduceMotion.matches || !("IntersectionObserver" in window)) {
    revealTargets.forEach((element) => element.classList.add("is-visible"));
  } else {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    revealTargets.forEach((element) => observer.observe(element));

    // страховка: если наблюдатель почему-то не сработал — показываем всё
    window.setTimeout(() => {
      revealTargets
        .filter((element) => element.getBoundingClientRect().top < window.innerHeight)
        .forEach((element) => element.classList.add("is-visible"));
    }, 2500);
  }

})();
