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

  /* ── переключатель темы: пока только кнопка-демо ─────
     Показывает, что в шапке предусмотрено место под смену темы.
     Саму тёмную тему не применяем — переключается только иконка
     и состояние кнопки, без реального изменения палитры. */
  const themeToggles = $$("[data-theme-toggle]");
  if (themeToggles.length) {
    themeToggles.forEach((btn) =>
      btn.addEventListener("click", () => {
        const pressed = btn.getAttribute("aria-pressed") !== "true";
        themeToggles.forEach((b) => b.setAttribute("aria-pressed", String(pressed)));
      })
    );
  }

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

  /* Акции: разворот листается страницами, а не каруселью */
  const cxPages = $$("[data-cx-page]");
  const cxNum = $("[data-cx-num]");
  if (cxPages.length > 1 && cxNum) {
    let cxIndex = 0;
    const showSpread = (next) => {
      cxIndex = (next + cxPages.length) % cxPages.length;
      cxPages.forEach((page, index) => {
        page.hidden = index !== cxIndex;
      });
      cxNum.textContent = String(cxIndex + 1);
    };
    const cxPrev = $("[data-cx-prev]");
    const cxNext = $("[data-cx-next]");
    if (cxPrev) cxPrev.addEventListener("click", () => showSpread(cxIndex - 1));
    if (cxNext) cxNext.addEventListener("click", () => showSpread(cxIndex + 1));
  }

  /* ── витрина с лентой выбора (акции, позже — кейсы) ────
     На десктопе кадр меняется на наведении, на мобильном — по
     нажатию. Скрипт общий: каждый [data-showcase] живёт сам по себе. */
  $$("[data-showcase]").forEach((showcase) => {
    const tabs = $$("[data-show-tab]", showcase);
    const panels = $$("[data-show-panel]", showcase);
    const index = $("[data-show-index]", showcase);
    const pad = (value) => String(value).padStart(2, "0");

    const show = (tab) => {
      if (tab.classList.contains("is-active")) return;
      const id = tab.dataset.showTab;

      tabs.forEach((item) => {
        const active = item === tab;
        item.classList.toggle("is-active", active);
        item.setAttribute("aria-selected", String(active));
      });
      panels.forEach((panel) => panel.classList.toggle("is-shown", panel.dataset.showPanel === id));
      if (index) index.textContent = `${pad(tabs.indexOf(tab) + 1)} / ${pad(tabs.length)}`;
    };

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => show(tab));
      tab.addEventListener("mouseenter", () => {
        if (!isMobile()) show(tab);
      });
      tab.addEventListener("focus", () => {
        if (!isMobile()) show(tab);
      });
    });
  });

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

    /* Города, локации внутри города и количество поверхностей —
       демонстрационные: реальный инвентарь заказчик передаёт отдельно.
       Структура та, которая нужна по правке: несколько городов сразу
       и уточнение до районов и адресов внутри каждого. */
    const CITIES = [
      {
        id: "msk",
        name: "Москва",
        surfaces: 1240,
        spots: ["Центр", "Север", "Юго-Запад", "Восток", "Вдоль ТТК"],
      },
      {
        id: "spb",
        name: "Санкт-Петербург",
        surfaces: 860,
        spots: ["Центральный", "Приморский", "Московский", "Невский"],
      },
      { id: "krd", name: "Краснодар", surfaces: 410, spots: ["Центр", "ФМР", "ЗИП", "Музыкальный"] },
      {
        id: "rnd",
        name: "Ростов-на-Дону",
        surfaces: 380,
        spots: ["Центр", "Западный", "Северный", "Левенцовка"],
      },
      {
        id: "sci",
        name: "Сочи",
        surfaces: 240,
        spots: ["Центр", "Адлер", "Хоста", "Красная Поляна"],
      },
      {
        id: "vlg",
        name: "Волгоград",
        surfaces: 210,
        spots: ["Центр", "Дзержинский", "Красноармейский"],
      },
      { id: "vrn", name: "Воронеж", surfaces: 195, spots: ["Центр", "Северный", "Левый берег"] },
      { id: "stv", name: "Ставрополь", surfaces: 160, spots: ["Центр", "Юго-Запад", "Северо-Запад"] },
    ];

    // Виды рекламы: ключи совпадают с каналами медиамикса
    const FORMATS = [
      { id: "outdoor", name: "Наружная реклама", note: "щиты, суперсайты, ситиборды" },
      { id: "dooh", name: "Digital / DOOH", note: "экраны и медиафасады" },
      { id: "lift", name: "Реклама в лифтах", note: "стенды в жилых домах" },
      { id: "indoor", name: "Indoor", note: "ТЦ, бизнес-центры, фитнес" },
      { id: "radio", name: "Радио", note: "городские и сетевые станции" },
      { id: "tv", name: "ТВ", note: "региональные врезки" },
      { id: "transit", name: "Транспорт", note: "борта, салоны, метро" },
      { id: "production", name: "Production", note: "печать, монтаж, ролики" },
    ];

    // Поверхности по каналам — для списка точек на карте
    const SURFACES = {
      outdoor: ["Щит 3×6", "Суперсайт", "Ситиборд"],
      dooh: ["Медиафасад", "Цифровой экран"],
      lift: ["Стенды в лифтах, 40 домов", "Стенды в лифтах, 25 домов"],
      indoor: ["Стойка в ТЦ", "Экран в бизнес-центре"],
      radio: ["Эфир на городской станции"],
      tv: ["Региональная врезка"],
      transit: ["Борта автобусов", "Экран в метро"],
      production: ["Печать и монтаж"],
    };

    /* Масштаб кампании система выводит из выбора: уточнили локации внутри
       города — это район, один город — городская, несколько — мультигород,
       пять и больше — широкая география. */
    const SCOPE_BASE = {
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

    // Поправка на период: короткий — быстрые каналы, длинный — постоянные
    const PERIOD_BONUS = {
      14: { dooh: 8, radio: 6 },
      30: {},
      45: { outdoor: 6, lift: 4 },
      60: { outdoor: 8, lift: 6 },
      90: { outdoor: 10, tv: 6, lift: 4 },
    };

    const SCOPE_REACH_K = { district: 2.2, city: 3.0, cities: 3.4, russia: 4.1 };

    const DESCRIPTIONS = {
      district:
        "Плотное покрытие выбранных локаций: контакт рядом с домом и точкой продаж, каждый день.",
      city: "Городская кампания: заметный охват плюс повторный контакт по дороге и в эфире.",
      cities: "Мультигород: один медиаплан, синхронный запуск и общий отчёт по всем городам.",
      russia: "Широкая география: единый план с адаптацией сообщения по регионам.",
    };

    const plural = (count, one, few, many) => {
      const mod10 = count % 10;
      const mod100 = count % 100;
      if (mod10 === 1 && mod100 !== 11) return `${count} ${one}`;
      if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${count} ${few}`;
      return `${count} ${many}`;
    };

    /* ── состояние выбора ────────────────────────────────
       Города и локации живут в наборах, а не в <select>: выбор
       множественный и двухуровневый. Локация хранится как «город:район». */
    const picked = { cities: new Set(["msk"]), spots: new Set(), formats: new Set() };
    let autoMix = true;

    const cityById = (id) => CITIES.find((city) => city.id === id);
    const cityNames = () => [...picked.cities].map((id) => cityById(id).name);

    const scopeOf = () => {
      if (picked.spots.size) return "district";
      const count = picked.cities.size;
      if (count <= 1) return "city";
      if (count <= 4) return "cities";
      return "russia";
    };

    /* ── выпадашки: город и вид рекламы ─────────────────── */
    const pickers = $$("[data-picker]", builderForm);
    const closePickers = (except) =>
      pickers.forEach((picker) => {
        if (picker === except) return;
        $("[data-picker-pop]", picker).hidden = true;
        $("[data-picker-toggle]", picker).setAttribute("aria-expanded", "false");
      });

    pickers.forEach((picker) => {
      const toggle = $("[data-picker-toggle]", picker);
      const pop = $("[data-picker-pop]", picker);
      toggle.addEventListener("click", () => {
        const open = pop.hidden;
        closePickers(picker);
        pop.hidden = !open;
        toggle.setAttribute("aria-expanded", String(open));
        // на телефоне подсказка о карте стоит ровно там, где разворачивается
        // список: просим её убраться. Через событие, а не нажатие крестика —
        // синтетический клик всплыл бы до документа и тут же закрыл выпадашку.
        if (open) document.dispatchEvent(new CustomEvent("nudge:hide"));
      });
      $$("[data-picker-close]", picker).forEach((button) =>
        button.addEventListener("click", () => {
          pop.hidden = true;
          toggle.setAttribute("aria-expanded", "false");
        })
      );
    });

    document.addEventListener("click", (event) => {
      if (!event.target.closest("[data-picker]")) closePickers(null);
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closePickers(null);
    });

    /* ── список городов с локациями ─────────────────────── */
    const citiesList = $("[data-cities-list]", builderForm);
    const citiesHint = $('[data-picker="cities"] .picker-hint', builderForm);
    const citiesHintText = citiesHint.textContent.trim();

    citiesList.innerHTML = CITIES.map(
      (city) => `
        <div class="picker-city" data-city="${city.id}">
          <label class="picker-row">
            <input type="checkbox" data-city-check value="${city.id}" />
            <span class="picker-name">${city.name}</span>
            <span class="picker-meta">${city.surfaces} пов.</span>
          </label>
          <div class="picker-spots" hidden>
            ${city.spots
              .map(
                (spot) => `
              <label class="picker-chip">
                <input type="checkbox" data-spot-check value="${city.id}:${spot}" />
                <span>${spot}</span>
              </label>`
              )
              .join("")}
          </div>
        </div>`
    ).join("");

    const syncCities = () => {
      $$("[data-city-check]", citiesList).forEach((input) => {
        const on = picked.cities.has(input.value);
        input.checked = on;
        $(".picker-spots", input.closest(".picker-city")).hidden = !on;
      });
      $$("[data-spot-check]", citiesList).forEach((input) => {
        input.checked = picked.spots.has(input.value);
      });
    };

    /* ── список видов рекламы ───────────────────────────── */
    const formatsList = $("[data-formats-list]", builderForm);
    const autoInput = $("[data-formats-auto]", builderForm);

    formatsList.innerHTML = FORMATS.map(
      (format) => `
        <label class="picker-row picker-row--format">
          <input type="checkbox" data-format-check value="${format.id}" />
          <span class="picker-name">${format.name}<i>${format.note}</i></span>
        </label>`
    ).join("");

    const syncFormats = () => {
      autoInput.checked = autoMix;
      formatsList.classList.toggle("is-muted", autoMix);
      $$("[data-format-check]", formatsList).forEach((input) => {
        input.checked = picked.formats.has(input.value);
      });
    };

    /* ── подписи на кнопках и в сводке ──────────────────── */
    const businessLabel = () =>
      $('[name="business"]', builderForm).selectedOptions[0].textContent.trim();
    const periodValue = () => Number($('[name="period"]', builderForm).value);
    const periodLabel = () =>
      $('[name="period"]', builderForm).selectedOptions[0].textContent.trim();
    const budgetValue = () => Number($('[name="budget"]', builderForm).value);

    const geoLabel = () => {
      const names = cityNames();
      if (!names.length) return "Город не выбран";
      let text =
        names.length <= 2
          ? names.join(", ")
          : `${names[0]} и ещё ${plural(names.length - 1, "город", "города", "городов")}`;
      if (picked.spots.size) {
        text += ` · ${plural(picked.spots.size, "локация", "локации", "локаций")}`;
      }
      return text;
    };

    const formatsLabel = () => {
      if (autoMix || !picked.formats.size) return "Медиамикс от системы";
      const names = [...picked.formats].map(
        (id) => FORMATS.find((format) => format.id === id).name
      );
      return names.length <= 2 ? names.join(", ") : `${names[0]} и ещё ${names.length - 1}`;
    };

    const updateLabels = () => {
      const names = cityNames();
      let cityText = "Выберите город";
      if (names.length === 1) cityText = names[0];
      if (names.length > 1) cityText = `${names[0]} +${names.length - 1}`;
      if (names.length && picked.spots.size) cityText += ` · ${picked.spots.size} лок.`;
      $('[data-picker="cities"] [data-picker-label]', builderForm).textContent = cityText;

      let formatText = "Собрать медиамикс";
      if (!autoMix && picked.formats.size) {
        formatText =
          picked.formats.size === 1
            ? FORMATS.find((format) => format.id === [...picked.formats][0]).name
            : `Выбрано ${picked.formats.size}`;
      }
      $('[data-picker="formats"] [data-picker-label]', builderForm).textContent = formatText;
    };

    /* ── медиамикс ──────────────────────────────────────── */
    const addWeights = (target, source = {}) => {
      Object.entries(source).forEach(([key, value]) => {
        target[key] = (target[key] || 0) + value;
      });
      return target;
    };

    const normalize = (items) => {
      const sorted = [...items].sort((a, b) => b[1] - a[1]);
      const total = sorted.reduce((sum, [, value]) => sum + value, 0) || 1;
      const shares = sorted.map(([key, value]) => [key, Math.round((value / total) * 100)]);
      // добираем округление до ровных 100%
      const diff = 100 - shares.reduce((sum, [, share]) => sum + share, 0);
      if (shares.length) shares[0][1] += diff;
      return shares;
    };

    const buildMix = ({ business, scope, period, budget }) => {
      const weights = addWeights({}, SCOPE_BASE[scope]);
      addWeights(weights, BUSINESS_BONUS[business]);
      addWeights(weights, PERIOD_BONUS[period]);

      // Виды рекламы выбраны руками: система ничего не добавляет сверху,
      // только расставляет доли внутри отмеченных каналов.
      if (!autoMix && picked.formats.size) {
        return normalize([...picked.formats].map((key) => [key, Math.max(weights[key] || 0, 10)]));
      }

      // Бюджет: ТВ и большая наружка не имеют смысла на малых суммах
      if (budget < 400000) {
        delete weights.tv;
        weights.outdoor = (weights.outdoor || 0) * 0.5;
        weights.lift = (weights.lift || 0) + 8;
      }
      if (budget >= 2000000) {
        weights.tv = (weights.tv || 0) + 10;
        weights.production = (weights.production || 0) + 4;
      }

      const items = Object.entries(weights)
        .filter(([, value]) => value > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, budget < 400000 ? 3 : 4);

      return normalize(items);
    };

    const reachFor = (budget, scope, period) => {
      // период тянет охват мягко: 30 дней — точка отсчёта
      const contacts = budget * SCOPE_REACH_K[scope] * (0.55 + (0.45 * period) / 30);
      if (contacts >= 1000000) {
        return `${(contacts / 1000000).toFixed(1).replace(".", ",")} млн`;
      }
      return `${Math.round(contacts / 1000)} тыс.`;
    };

    let lastMix = [];

    const renderResult = () => {
      const params = {
        business: $('[name="business"]', builderForm).value,
        scope: scopeOf(),
        period: periodValue(),
        budget: budgetValue(),
      };

      const mix = buildMix(params);
      lastMix = mix;

      $("[data-result-title]").textContent = mix
        .slice(0, 3)
        .map(([key]) => CHANNELS[key])
        .join(" + ");
      $("[data-result-desc]").textContent = DESCRIPTIONS[params.scope];

      // один тон на канал: им же красятся полоса, сектор кольца и метка кадра
      const TONES = ["var(--ink)", "var(--tone-1)", "var(--tone-2)", "var(--tone-3)"];
      const tone = (index) => TONES[index % TONES.length];

      $("[data-result-mix]").innerHTML = mix
        .map(
          ([key, share], index) => `
            <li class="mix-item" style="--c:${tone(index)}">
              <b>${CHANNELS[key]}</b>
              <span class="mix-bar"><i style="--w:${share}%"></i></span>
              <span class="mix-share">${share}%</span>
            </li>`
        )
        .join("");

      $("[data-result-visuals]").innerHTML = mix
        .map(
          ([key, share], index) => `
            <figure class="result-shot" style="--c:${tone(index)}">
              <div class="photo-slot" data-photo-label="Фото · ${CHANNELS[key]}"></div>
              <figcaption><b>${CHANNELS[key]}</b><span>${share}%</span></figcaption>
            </figure>`
        )
        .join("");

      let angle = 0;
      const stops = mix.map(([, share], index) => {
        const from = angle;
        angle += share * 3.6;
        return `${tone(index)} ${from}deg ${angle}deg`;
      });
      $("[data-result-donut]").style.setProperty("--donut", `conic-gradient(${stops.join(", ")})`);
      $("[data-result-count]").textContent = mix.length;

      $("[data-result-budget]").textContent = money(params.budget);
      $("[data-result-period]").textContent = periodLabel();
      $("[data-result-geo]").textContent = geoLabel();
      $("[data-result-reach]").textContent = reachFor(params.budget, params.scope, params.period);
    };

    const budgetInput = $('input[name="budget"]', builderForm);
    const budgetOutput = $("[data-budget-output]", builderForm);
    budgetInput?.addEventListener("input", () => {
      budgetOutput.textContent = money(Number(budgetInput.value));
    });

    // Результат — только после контакта, но сразу, без ожидания менеджера.
    // Контакт спрашиваем один раз: дальше параметры можно менять свободно.
    const gate = $("[data-builder-gate]");
    const gateStatus = $("[data-gate-status]", gate);
    const gateSummary = $("[data-gate-summary]", gate);
    let lead = null;

    const scrollTo = (element, block = "nearest") =>
      element.scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth", block });

    const renderSummary = () => {
      gateSummary.innerHTML = [
        businessLabel(),
        geoLabel(),
        periodLabel(),
        money(budgetValue()),
        formatsLabel(),
      ]
        .map((item) => `<li>${item}</li>`)
        .join("");
    };

    // Пока результат или шаг контакта открыт — они пересчитываются на лету
    const syncLive = () => {
      updateLabels();
      if (!builderResult.hidden) renderResult();
      if (!gate.hidden) renderSummary();
    };

    citiesList.addEventListener("change", (event) => {
      const cityCheck = event.target.closest("[data-city-check]");
      if (cityCheck) {
        if (cityCheck.checked) {
          picked.cities.add(cityCheck.value);
        } else {
          picked.cities.delete(cityCheck.value);
          // локации без города не живут
          [...picked.spots]
            .filter((spot) => spot.startsWith(`${cityCheck.value}:`))
            .forEach((spot) => picked.spots.delete(spot));
        }
      }
      const spotCheck = event.target.closest("[data-spot-check]");
      if (spotCheck) {
        if (spotCheck.checked) picked.spots.add(spotCheck.value);
        else picked.spots.delete(spotCheck.value);
      }
      if (picked.cities.size) {
        citiesHint.textContent = citiesHintText;
        citiesHint.classList.remove("is-warning");
      }
      syncCities();
      syncLive();
    });

    $("[data-cities-reset]", builderForm)?.addEventListener("click", () => {
      picked.cities = new Set(["msk"]);
      picked.spots.clear();
      citiesHint.textContent = citiesHintText;
      citiesHint.classList.remove("is-warning");
      syncCities();
      syncLive();
    });

    formatsList.addEventListener("change", (event) => {
      const check = event.target.closest("[data-format-check]");
      if (!check) return;
      if (check.checked) picked.formats.add(check.value);
      else picked.formats.delete(check.value);
      // отметили канал руками — автоподбор выключается сам
      autoMix = picked.formats.size === 0;
      syncFormats();
      syncLive();
    });

    autoInput.addEventListener("change", () => {
      autoMix = autoInput.checked;
      if (autoMix) picked.formats.clear();
      syncFormats();
      syncLive();
    });

    $("[data-formats-reset]", builderForm)?.addEventListener("click", () => {
      picked.formats.clear();
      autoMix = true;
      syncFormats();
      syncLive();
    });

    const openResult = () => {
      renderResult();
      $("[data-result-lead]").textContent = lead.contact;
      builderResult.hidden = false;
      scrollTo(builderResult);
    };

    builderForm.addEventListener("submit", (event) => {
      event.preventDefault();

      // без города считать нечего: открываем выпадашку и говорим об этом
      if (!picked.cities.size) {
        const picker = $('[data-picker="cities"]', builderForm);
        closePickers(picker);
        $("[data-picker-pop]", picker).hidden = false;
        $("[data-picker-toggle]", picker).setAttribute("aria-expanded", "true");
        citiesHint.textContent = "Выберите хотя бы один город.";
        citiesHint.classList.add("is-warning");
        scrollTo(picker, "center");
        return;
      }

      if (lead) {
        openResult();
        return;
      }
      renderSummary();
      builderResult.hidden = true;
      gate.hidden = false;
      scrollTo(gate);
      $('input[name="name"]', gate).focus({ preventScroll: true });
    });

    gate.addEventListener("submit", (event) => {
      event.preventDefault();
      const name = $('input[name="name"]', gate);
      const contact = $('input[name="contact"]', gate);
      // телефон — хотя бы 10 цифр, Telegram — @ и ник
      const value = contact.value.trim();
      const contactOk = value.replace(/\D/g, "").length >= 10 || /^@\w{4,}$/.test(value);
      name.classList.toggle("is-invalid", !name.value.trim());
      contact.classList.toggle("is-invalid", !contactOk);

      if (!name.value.trim()) {
        gateStatus.textContent = "Как к вам обращаться?";
        name.focus();
        return;
      }
      if (!contactOk) {
        gateStatus.textContent = "Укажите телефон (10+ цифр) или ник в Telegram через @.";
        contact.focus();
        return;
      }

      lead = { name: name.value.trim(), contact: value };
      gateStatus.textContent = "";
      gate.hidden = true;
      openResult();
    });

    $("[data-gate-close]")?.addEventListener("click", () => {
      gate.hidden = true;
      scrollTo(builderForm, "center");
    });

    $$("[data-builder-input]", builderForm).forEach((input) =>
      input.addEventListener("change", syncLive)
    );

    $("[data-result-close]")?.addEventListener("click", () => {
      builderResult.hidden = true;
      scrollTo(builderForm, "center");
    });

    /* ── карта размещений из результата ──────────────────
       Заказчик: из медиаплана нужно сразу попадать на карту, где дальше
       выбирается точка и идёт бронирование. Панель выезжает справа,
       страница под ней остаётся на месте. */
    const mapDrawer = $("[data-map-drawer]");
    if (mapDrawer) {
      const mapStatus = $("[data-map-status]", mapDrawer);
      const mapPoints = $("[data-map-points]", mapDrawer);

      const buildPoints = () => {
        // точки раскладываются по выбранным локациям, а если локации
        // не уточняли — по городам; поверхность берётся из медиамикса
        const places = [];
        [...picked.cities].forEach((id) => {
          const city = cityById(id);
          const spots = [...picked.spots]
            .filter((spot) => spot.startsWith(`${id}:`))
            .map((spot) => spot.split(":")[1]);
          if (spots.length) spots.forEach((spot) => places.push(`${city.name} · ${spot}`));
          else places.push(city.name);
        });
        if (!places.length) places.push("Город не выбран");

        // по одной поверхности на пару «локация + канал», города чередуются,
        // чтобы в коротком списке не было повторов и перекоса в один город
        const channels = lastMix.length ? lastMix.map(([key]) => key) : ["outdoor"];
        const depth = Math.max(...channels.map((key) => (SURFACES[key] || []).length || 1));
        const points = [];
        for (let level = 0; level < depth; level += 1) {
          places.forEach((place) => {
            channels.forEach((key) => {
              const list = SURFACES[key] || ["Поверхность"];
              if (level >= list.length || points.length >= 6) return;
              points.push({ place, surface: list[level], channel: CHANNELS[key] });
            });
          });
        }
        return points;
      };

      const openMap = () => {
        $("[data-map-scope]", mapDrawer).textContent = `${geoLabel()} · ${periodLabel()} · ${money(
          budgetValue()
        )}`;
        mapPoints.innerHTML = buildPoints()
          .map(
            (point) => `
              <li>
                <div>
                  <b>${point.surface}</b>
                  <span>${point.place} · ${point.channel}</span>
                </div>
                <button type="button" data-map-pick>Выбрать</button>
              </li>`
          )
          .join("");
        mapStatus.textContent = "";
        mapDrawer.hidden = false;
        // перерисовка кадра, иначе переход от hidden срабатывает мгновенно;
        // таймер — страховка для вкладки, которая в этот момент не рисует
        window.requestAnimationFrame(() => mapDrawer.classList.add("is-open"));
        window.setTimeout(() => mapDrawer.classList.add("is-open"), 60);
      };

      const closeMap = () => {
        mapDrawer.classList.remove("is-open");
        window.setTimeout(() => {
          mapDrawer.hidden = true;
        }, 320);
      };

      $("[data-result-map]")?.addEventListener("click", openMap);
      $$("[data-map-close]", mapDrawer).forEach((button) =>
        button.addEventListener("click", closeMap)
      );
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !mapDrawer.hidden) closeMap();
      });

      mapPoints.addEventListener("click", (event) => {
        const button = event.target.closest("[data-map-pick]");
        if (!button) return;
        button.closest("li").classList.add("is-picked");
        button.textContent = "В заявке";
        button.disabled = true;
        mapStatus.textContent =
          "Точка отложена в заявку. Это прототип: в рабочей версии отсюда идёт бронирование на платформе.";
      });
    }

    // Подробный разбор — по желанию: параметры и контакт уже есть,
    // переспрашивать ничего не нужно
    const reviewButton = $("[data-result-review]");
    reviewButton?.addEventListener("click", () => {
      const title = $("[data-result-title]").textContent;
      $("[data-result-review-status]").textContent = `Передали «${title}» менеджеру вместе с параметрами — он свяжется по контакту ${lead.contact}. Это прототип: данные никуда не уходят, но сценарий рабочий.`;
      reviewButton.disabled = true;
    });

    syncCities();
    syncFormats();
    updateLabels();
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

  /* ── попап «Стать партнёром» — своя форма, без перехода на страницу ── */
  const partnerModal = $("[data-partner-modal]");
  if (partnerModal) {
    const partnerForm = $("[data-partner-form]", partnerModal);
    const partnerStatus = $("[data-partner-status]", partnerModal);
    let lastFocused = null;

    const openPartnerModal = () => {
      lastFocused = document.activeElement;
      partnerModal.hidden = false;
      document.body.classList.add("modal-open");
      // синхронный reflow — чтобы переход по opacity сработал сразу,
      // не полагаясь на requestAnimationFrame
      void partnerModal.offsetHeight;
      partnerModal.classList.add("is-visible");
      $('input[name="name"]', partnerForm)?.focus();
    };

    const closePartnerModal = () => {
      partnerModal.classList.remove("is-visible");
      document.body.classList.remove("modal-open");
      window.setTimeout(() => {
        partnerModal.hidden = true;
      }, 200);
      lastFocused?.focus();
    };

    $$('[data-open-partner-modal]').forEach((trigger) =>
      trigger.addEventListener("click", (event) => {
        event.preventDefault();
        openPartnerModal();
      })
    );
    $$("[data-partner-close]", partnerModal).forEach((btn) =>
      btn.addEventListener("click", closePartnerModal)
    );
    partnerModal.addEventListener("click", (event) => {
      if (event.target === partnerModal) closePartnerModal();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !partnerModal.hidden) closePartnerModal();
    });

    partnerForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const required = $$("input[required]", partnerForm);
      const empty = required.filter((input) => !input.value.trim());
      required.forEach((input) => input.classList.toggle("is-invalid", !input.value.trim()));

      if (empty.length) {
        partnerStatus.textContent = "Заполните имя и контакт — так мы сможем ответить.";
        empty[0].focus();
        return;
      }

      partnerStatus.textContent =
        "Заявка партнёра принята. Это прототип: данные никуда не уходят, но сценарий формы работает.";
      partnerForm.reset();
    });
  }

  /* ── попап акции «Подробнее» ────────────────────────────
     Один диалог на все акции: карточка передаёт свой id, скрипт
     подставляет условия, локацию, подпись к фото и обе цены.
     Содержимое демонстрационное — реальные условия и прайс
     заказчик передаёт отдельно. */
  const PROMOS = {
    hotels: {
      tag: "Спецразмещение",
      title: "Реклама в отелях 5 звёзд",
      lead: "Контакт с платёжеспособной аудиторией в точках спокойного внимания.",
      terms: [
        "Пакет на 3 месяца: сентябрь — ноябрь, оплата помесячно.",
        "12 отелей: лифтовые холлы, лобби и зоны ресепшена.",
        "Дизайн макета и печать — за наш счёт при брони до конца месяца.",
      ],
      place: "Москва · Тверская, Пресня, Арбат, Сити",
      map: "Здесь будет карта отелей с точками размещения",
      photo: "Фото: стенд в лобби отеля",
      old: "420 000 ₽",
      now: "310 000 ₽",
      unit: "за месяц, все 12 отелей",
    },
    stadium: {
      tag: "Событийная реклама",
      title: "Бренд на стадионе",
      lead: "Размещение в событиях с высокой эмоциональной вовлечённостью.",
      terms: [
        "Сезон 26/27: 18 домашних матчей.",
        "Статичные борта по периметру поля плюс экран в перерыве.",
        "90 секунд бренда в каждом матче, ролик делаем мы.",
      ],
      place: "ЮФО · Краснодар, Ростов-на-Дону, Сочи",
      map: "Здесь будет карта стадионов",
      photo: "Фото: борт у кромки поля",
      old: "1 250 000 ₽",
      now: "890 000 ₽",
      unit: "за сезон, три стадиона",
    },
    launch: {
      tag: "Для девелоперов",
      title: "Пакет на старт продаж",
      lead: "Наружная у объекта, лифты в радиусе и радио на весь город.",
      terms: [
        "Минимальный срок — 2 месяца, старт в любую дату.",
        "4 щита 3×6 у объекта, 120 лифтов в радиусе 2 км, 3 радиостанции.",
        "Замена макета внутри периода — без доплаты.",
      ],
      place: "Краснодар · ФМР, ЗИП, Музыкальный",
      map: "Здесь будет карта поверхностей вокруг объекта",
      photo: "Фото: щит у строительной площадки",
      old: "760 000 ₽",
      now: "590 000 ₽",
      unit: "за 2 месяца, весь пакет",
    },
    boards: {
      tag: "Осенний тариф",
      title: "Осенний тариф на щиты 3×6",
      lead: "Скидка за длительный период при бронировании до конца месяца.",
      terms: [
        "−15% к прайсу при периоде от 3 месяцев.",
        "Стороны А и Б на выбор, приоритетные адреса — по наличию.",
        "Печать и монтаж включены, дальше — только аренда.",
      ],
      place: "Москва и область · вдоль ТТК, Ленинградское и Каширское шоссе",
      map: "Здесь будет карта щитов с точками размещения",
      photo: "Фото: щит 3×6 на трассе",
      old: "78 000 ₽",
      now: "66 300 ₽",
      unit: "за щит в месяц",
    },
    federal: {
      tag: "Федеральный пакет",
      title: "Одна кампания — вся страна",
      lead: "Единый медиаплан, один договор и управляемый запуск по регионам.",
      terms: [
        "Регионы включаются волнами — платите за те, что уже в эфире.",
        "8 городов присутствия, 12 400 поверхностей в общем пуле.",
        "Отчёт с фотофиксацией по каждому городу раз в две недели.",
      ],
      place: "Россия · Москва, Петербург, Краснодар, Ростов, Сочи, Волгоград, Воронеж, Ставрополь",
      map: "Здесь будет карта присутствия по городам",
      photo: "Фото: сводка кампании по регионам",
      old: "4 800 000 ₽",
      now: "3 900 000 ₽",
      unit: "за волну, 8 городов",
    },
    lifts: {
      tag: "Indoor",
      title: "Лифты в жилых кварталах",
      lead: "Ежедневный контакт в замкнутом пространстве, без конкуренции за внимание.",
      terms: [
        "Минимальный объём — 100 подъездов, шаг 50.",
        "Формат А3 в рамах, замена макета раз в месяц.",
        "При брони от 3 месяцев четвёртый — в подарок.",
      ],
      place: "Санкт-Петербург · Приморский, Московский, Невский районы",
      map: "Здесь будет карта домов с лифтовыми стендами",
      photo: "Фото: стенд в кабине лифта",
      old: "240 000 ₽",
      now: "185 000 ₽",
      unit: "за месяц, 100 подъездов",
    },
    radio: {
      tag: "Радио",
      title: "Радио на утренний трафик",
      lead: "Пакет роликов в часы, когда город стоит в пробках.",
      terms: [
        "Минимальный период — 2 недели.",
        "40 выходов в неделю в окне 07:00 — 10:00.",
        "Производство ролика и голос диктора включены.",
      ],
      place: "Ростов-на-Дону · городские и сетевые станции",
      map: "Здесь будет карта покрытия станций",
      photo: "Фото: студия и эфирный пульт",
      old: "310 000 ₽",
      now: "248 000 ₽",
      unit: "за 2 недели, все выходы",
    },
    transit: {
      tag: "Транспорт",
      title: "Транзит: борта и салоны",
      lead: "Маршруты подбираются под район, где нужен охват, а не «по остаточному».",
      terms: [
        "Период от 1 месяца, маршруты согласуем до старта.",
        "30 бортов и 200 стикеров в салонах.",
        "Оклейка и снятие — за наш счёт.",
      ],
      place: "Воронеж · маршруты через центр и левый берег",
      map: "Здесь будет карта маршрутов",
      photo: "Фото: борт автобуса с макетом",
      old: "520 000 ₽",
      now: "415 000 ₽",
      unit: "за месяц, 30 бортов",
    },
  };

  const promoModal = $("[data-promo-modal]");
  if (promoModal) {
    const promoFields = {
      tag: $("[data-promo-tag]", promoModal),
      title: $("[data-promo-title]", promoModal),
      lead: $("[data-promo-lead]", promoModal),
      terms: $("[data-promo-terms]", promoModal),
      place: $("[data-promo-place]", promoModal),
      map: $("[data-promo-map]", promoModal),
      photo: $("[data-promo-photo]", promoModal),
      old: $("[data-promo-old]", promoModal),
      now: $("[data-promo-new]", promoModal),
      unit: $("[data-promo-unit]", promoModal),
    };
    const promoClose = $("[data-promo-close]", promoModal);
    let promoLastFocused = null;

    const fillPromo = (promo) => {
      promoFields.tag.textContent = promo.tag;
      promoFields.title.textContent = promo.title;
      promoFields.lead.textContent = promo.lead;
      promoFields.place.textContent = promo.place;
      promoFields.map.textContent = promo.map;
      promoFields.photo.setAttribute("data-photo-label", promo.photo);
      promoFields.old.textContent = promo.old;
      promoFields.now.textContent = promo.now;
      promoFields.unit.textContent = promo.unit;

      promoFields.terms.replaceChildren(
        ...promo.terms.map((text) => {
          const item = document.createElement("li");
          item.textContent = text;
          return item;
        })
      );
    };

    const openPromoModal = (id) => {
      const promo = PROMOS[id];
      if (!promo) return;
      promoLastFocused = document.activeElement;
      fillPromo(promo);
      promoModal.hidden = false;
      document.body.classList.add("modal-open");
      // тот же приём, что и в попапе партнёра: синхронный reflow,
      // иначе переход по opacity не успевает включиться
      void promoModal.offsetHeight;
      promoModal.classList.add("is-visible");
      promoClose?.focus();
    };

    const closePromoModal = () => {
      promoModal.classList.remove("is-visible");
      document.body.classList.remove("modal-open");
      window.setTimeout(() => {
        promoModal.hidden = true;
      }, 200);
      promoLastFocused?.focus();
    };

    $$("[data-promo-open]").forEach((trigger) =>
      trigger.addEventListener("click", () => openPromoModal(trigger.dataset.promoOpen))
    );
    promoClose?.addEventListener("click", closePromoModal);
    promoModal.addEventListener("click", (event) => {
      if (event.target === promoModal) closePromoModal();
    });
    // кнопка «Забронировать» ведёт к форме — попап при этом закрывается
    $("[data-promo-cta]", promoModal)?.addEventListener("click", closePromoModal);
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !promoModal.hidden) closePromoModal();
    });
  }

  /* ── «напоминашка» о карте присутствия ──────────────────
     Одно окошко-щит, а не набор всплывашек по всему сайту: выезжает
     после первого экрана и уходит, как только человек добрался
     до карты сам или закрыл подсказку. */
  const nudge = $("[data-nudge]");
  const geoSection = $("#geo");
  if (nudge && geoSection && "IntersectionObserver" in window) {
    let nudgeDone = false;

    const hideNudge = () => {
      nudgeDone = true;
      nudge.classList.remove("is-shown");
      window.setTimeout(() => {
        nudge.hidden = true;
      }, 420);
    };

    $$("[data-nudge-close], [data-nudge-go]", nudge).forEach((element) =>
      element.addEventListener("click", hideNudge)
    );

    // подсказку убирает и конструктор, когда разворачивает список городов
    document.addEventListener("nudge:hide", hideNudge);

    // карта попала в кадр — подсказка больше не нужна
    new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) hideNudge();
      },
      { threshold: 0.2 }
    ).observe(geoSection);

    const showNudge = () => {
      if (nudgeDone || !nudge.hidden) return;
      nudge.hidden = false;
      // перерисовка кадра, иначе переход от hidden срабатывает мгновенно
      window.requestAnimationFrame(() =>
        window.requestAnimationFrame(() => nudge.classList.add("is-shown"))
      );
    };

    // Триггер — конструктор: заказчик просил показывать подсказку позже,
    // уже после того как человек пролистал акции. Наблюдатель, а не
    // событие scroll: после перезагрузки браузер восстанавливает позицию,
    // и события прокрутки может не быть вовсе.
    new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) showNudge();
      },
      { threshold: 0.15 }
    ).observe($("#builder"));
  }

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
