/**
 * Bivio Bistrot — rendering del menu
 * ---------------------------------------------------------------------------
 * Legge window.BIVIO_MENU (menu-data.js) e costruisce il DOM con createElement +
 * textContent (mai innerHTML con dati). Nessuna dipendenza, nessun modulo.
 * Gestisce anche la lingua (IT/EN), i pulsanti Maps/WhatsApp e i testi statici
 * marcati con data-i18n / data-i18n-aria in index.html.
 */
(function () {
  "use strict";

  var MENU = window.BIVIO_MENU;
  var NS_SVG = "http://www.w3.org/2000/svg";

  // ---------------------------------------------------------------- Riferimenti DOM
  var mainEl = document.getElementById("menu");
  var navEl = document.querySelector(".menu-nav");
  var tabsEl = document.querySelector(".tabs");
  var subnavEl = document.querySelector(".subnav");
  var toTopEl = document.querySelector(".to-top");
  var topEl = document.getElementById("top");
  var yearEl = document.getElementById("year");

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  /** Anno corrente nel footer. */
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // ---------------------------------------------------------------- Helper
  /**
   * Crea un elemento.
   * @param {string} tag
   * @param {Object=} attrs  "class", "text" (textContent) o attributi arbitrari; null/false = ignorato
   * @param {Array=} children  nodi o stringhe
   */
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        var value = attrs[key];
        if (value === null || value === undefined || value === false) return;
        if (key === "class") node.className = value;
        else if (key === "text") node.textContent = value;
        else node.setAttribute(key, value === true ? "" : value);
      });
    }
    (children || []).forEach(function (child) {
      if (child === null || child === undefined) return;
      node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
    });
    return node;
  }

  /** Crea un elemento SVG (namespace corretto). */
  function svg(tag, attrs) {
    var node = document.createElementNS(NS_SVG, tag);
    Object.keys(attrs || {}).forEach(function (key) { node.setAttribute(key, attrs[key]); });
    return node;
  }

  // ---------------------------------------------------------------- Lingua
  var LOCALES = { it: "it-IT", en: "en-GB" };
  var STORAGE_KEY = "bivio-lang";
  var lang = "it";

  function hasLang(code) {
    return !!(MENU && MENU.meta && MENU.meta.languages && MENU.meta.languages.indexOf(code) !== -1);
  }

  /** Priorità: ?lang= > localStorage > meta.defaultLanguage (mai la lingua del browser). */
  function detectLanguage() {
    var fromQuery = null;
    try { fromQuery = new URLSearchParams(location.search).get("lang"); } catch (e) { /* URLSearchParams assente */ }
    if (fromQuery && hasLang(fromQuery)) return fromQuery;
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved && hasLang(saved)) return saved;
    } catch (e) { /* localStorage bloccato: non è critico */ }
    return (MENU && MENU.meta && MENU.meta.defaultLanguage) || "it";
  }

  /** Stringa dell'interfaccia; fallback italiano, poi la chiave stessa. */
  function t(key) {
    var ui = (MENU && MENU.ui) || {};
    if (ui[lang] && ui[lang][key] !== undefined) return ui[lang][key];
    if (ui.it && ui.it[key] !== undefined) return ui.it[key];
    return key;
  }

  /** Campo di contenuto tradotto: obj.en[field] se presente, altrimenti il campo base (italiano). */
  function tr(obj, field) {
    if (lang !== "it" && obj && obj[lang] && obj[lang][field] !== undefined && obj[lang][field] !== null) {
      return obj[lang][field];
    }
    return obj ? obj[field] : undefined;
  }

  // I formattatori sono costosi da creare: una istanza per locale, in cache.
  var priceFormatters = {};
  var abvFormatters = {};
  function locale() { return LOCALES[lang] || "it-IT"; }
  function formatPrice(n) {
    var loc = locale();
    if (!priceFormatters[loc]) priceFormatters[loc] = new Intl.NumberFormat(loc, { style: "currency", currency: "EUR" });
    return priceFormatters[loc].format(n);
  }
  function formatAbv(n) {
    var loc = locale();
    if (!abvFormatters[loc]) abvFormatters[loc] = new Intl.NumberFormat(loc, { maximumFractionDigits: 1 });
    return abvFormatters[loc].format(n) + " % Vol";
  }

  function scrollBehavior() {
    return reducedMotion.matches ? "auto" : "smooth";
  }

  function navHeight() {
    return navEl ? navEl.offsetHeight : 0;
  }

  // ---------------------------------------------------------------- Guard
  if (!MENU || !MENU.sections || !mainEl) {
    if (mainEl) {
      mainEl.appendChild(el("p", { class: "menu__notice", text: "Il menu non è al momento disponibile. Riprova tra qualche istante. / The menu is currently unavailable." }));
    }
    return;
  }

  // ---------------------------------------------------------------- Stato
  var activeSectionId = null;
  var spyObserver = null;

  function findSection(id) {
    for (var i = 0; i < MENU.sections.length; i++) {
      if (MENU.sections[i].id === id) return MENU.sections[i];
    }
    return null;
  }

  /** Legge l'hash: "#vini" o "#vini/rossi" -> { section, category }. */
  function parseHash() {
    var raw = (location.hash || "").replace(/^#/, "");
    try { raw = decodeURIComponent(raw); } catch (e) { /* hash malformato: usa il testo grezzo */ }
    var parts = raw.split("/");
    var section = findSection(parts[0]);
    return { section: section, category: section ? parts[1] || null : null };
  }

  function updateHash(value) {
    try {
      history.replaceState(null, "", "#" + value);
    } catch (e) {
      /* file:// in alcuni browser può rifiutare replaceState: non è critico */
    }
  }

  // ---------------------------------------------------------------- Immagini
  /** Segnaposto grafico: piatto con posate, line-art. */
  function buildFallbackIcon() {
    var s = svg("svg", { viewBox: "0 0 64 64", "class": "dish__icon", fill: "none", stroke: "currentColor", "stroke-width": "1.5", "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true", focusable: "false" });
    s.appendChild(svg("circle", { cx: "32", cy: "32", r: "13" }));
    s.appendChild(svg("circle", { cx: "32", cy: "32", r: "8" }));
    s.appendChild(svg("path", { d: "M11 14v10a3 3 0 0 0 3 3v23M11 14v8M15 14v8M19 14v10a3 3 0 0 1-3 3" }));
    s.appendChild(svg("path", { d: "M53 14c-3 2-4.500 6-4.500 11 0 3 1.500 4 4.500 4v21M53 14v15" }));
    return s;
  }

  /**
   * Catena di fallback per la foto di un piatto:
   *   1. dish.image        -> foto locale (assets/images/<categoria>/<id>.jpg)
   *   2. dish.placeholder  -> foto Unsplash tematica, provata una sola volta
   *   3. icona SVG         -> il box (aspect-ratio 4/3) resta identico: nessun salto di layout
   * Gli handler vanno impostati PRIMA di assegnare src.
   */
  function attachImageFallback(img, figure, dish) {
    var triedPlaceholder = false;

    function showIcon() {
      img.onerror = null;
      if (img.parentNode) img.parentNode.removeChild(img);
      figure.classList.add("dish__media--fallback");
      figure.appendChild(buildFallbackIcon());
    }

    img.onerror = function () {
      if (!triedPlaceholder && dish.placeholder) {
        triedPlaceholder = true;
        img.src = dish.placeholder;
      } else {
        showIcon();
      }
    };
    img.src = dish.image;
  }

  // ---------------------------------------------------------------- Renderer
  function renderDish(d, i) {
    var img = el("img", { alt: tr(d, "name"), loading: "lazy", decoding: "async", width: "800", height: "600" });
    var figure = el("figure", { class: "dish__media" }, [img]);
    attachImageFallback(img, figure, d);

    var head = el("div", { class: "dish__head" }, [
      el("h3", { class: "dish__name", text: tr(d, "name") }),
      el("data", { class: "dish__price", value: String(d.price), text: formatPrice(d.price) })
    ]);
    var body = el("div", { class: "dish__body" }, [head]);
    var desc = tr(d, "description");
    if (desc) body.appendChild(el("p", { class: "dish__desc", text: desc }));

    var article = el("article", { class: "dish" }, [figure, body]);
    article.style.setProperty("--i", String(Math.min(i, 12)));
    return article;
  }

  function priceCell(label, value) {
    // L'etichetta (.wine__label) è sempre nel DOM: visibile su mobile, solo screen reader su desktop
    var missing = value === null || value === undefined;
    return el("div", { class: "wine__price" }, [
      el("span", { class: "wine__label", text: label }),
      missing ? el("span", { text: "—" }) : el("data", { value: String(value), text: formatPrice(value) })
    ]);
  }

  function renderWine(w) {
    var nameLine = [el("h3", { class: "wine__name", text: tr(w, "name") })];
    if (w.organic) nameLine.push(el("span", { class: "badge", text: t("organic") }));
    nameLine.push(el("span", { class: "leader", "aria-hidden": "true" }));

    // Meta: unisce con " · " solo i campi valorizzati
    var abv = typeof w.abv === "number" ? formatAbv(w.abv) : w.abv;
    var meta = [w.winery, tr(w, "detail"), w.vintage, abv].filter(Boolean).join(" · ");

    var li = el("li", { class: "wine" }, [
      el("div", { class: "wine__head" }, nameLine),
      el("div", { class: "wine__prices" }, [priceCell(t("glass"), w.glassPrice), priceCell(t("bottle"), w.bottlePrice)]),
      meta ? el("p", { class: "wine__meta", text: meta }) : null
    ]);
    return li;
  }

  function renderSpirit(s) {
    return el("li", { class: "spirit" }, [
      el("div", { class: "spirit__head" }, [
        el("h3", { class: "spirit__name", text: tr(s, "name") }),
        tr(s, "kind") ? el("span", { class: "spirit__kind", text: tr(s, "kind") }) : null,
        el("span", { class: "leader", "aria-hidden": "true" })
      ]),
      el("data", { class: "spirit__price", value: String(s.price), text: formatPrice(s.price) })
    ]);
  }

  /** Renderizza una categoria; restituisce null se non contiene voci. */
  function renderCategory(section, cat, index) {
    var source = section.type === "food" ? MENU.dishes : section.type === "wine" ? MENU.wines : MENU.spirits;
    var items = (source || []).filter(function (item) { return item.category === cat.id; });
    if (!items.length) return null;

    var titleId = "title-" + cat.id;
    var heading = el("div", { class: "category__heading" }, [
      el("h2", { class: "category__title", id: titleId, text: tr(cat, "label") }),
      tr(cat, "subtitle") ? el("p", { class: "category__subtitle", text: tr(cat, "subtitle") }) : null
    ]);
    var wrapper = el("section", { class: "category category--" + section.type, id: "cat-" + cat.id, "aria-labelledby": titleId }, [heading]);
    wrapper.style.setProperty("--i", String(Math.min(index, 12)));

    if (section.type === "food") {
      wrapper.appendChild(el("div", { class: "dish-grid" }, items.map(renderDish)));
    } else if (section.type === "wine") {
      // Intestazione colonne (solo desktop, decorativa: le etichette sono ripetute per lo screen reader)
      wrapper.appendChild(el("div", { class: "wine-cols", "aria-hidden": "true" }, [
        el("span", { text: t("glass") }), el("span", { text: t("bottle") })
      ]));
      wrapper.appendChild(el("ul", { class: "wine-list" }, items.map(renderWine)));
    } else {
      wrapper.appendChild(el("ul", { class: "spirit-list" }, items.map(renderSpirit)));
    }
    return wrapper;
  }

  function renderSection(section) {
    var frag = document.createDocumentFragment();
    section.categories.forEach(function (cat, index) {
      var node = renderCategory(section, cat, index);
      if (node) frag.appendChild(node);
    });
    return frag;
  }

  // ---------------------------------------------------------------- Tab
  function renderTabs() {
    tabsEl.textContent = "";
    MENU.sections.forEach(function (section) {
      var selected = section.id === activeSectionId;
      var btn = el("button", {
        class: "tab", type: "button", role: "tab", id: "tab-" + section.id,
        "aria-selected": selected ? "true" : "false", "aria-controls": "menu",
        tabindex: selected ? "0" : "-1", "data-section": section.id, text: tr(section, "label")
      });
      btn.addEventListener("click", function () { setSection(section.id, { scroll: true }); });
      tabsEl.appendChild(btn);
    });
  }

  function syncTabs() {
    Array.prototype.forEach.call(tabsEl.children, function (btn) {
      var on = btn.getAttribute("data-section") === activeSectionId;
      btn.setAttribute("aria-selected", on ? "true" : "false");
      btn.setAttribute("tabindex", on ? "0" : "-1");
    });
    mainEl.setAttribute("role", "tabpanel");
    mainEl.setAttribute("aria-labelledby", "tab-" + activeSectionId);
  }

  /** Tastiera: frecce, Home, End spostano focus e attivano la tab. */
  tabsEl.addEventListener("keydown", function (e) {
    var ids = MENU.sections.map(function (s) { return s.id; });
    var idx = ids.indexOf(activeSectionId);
    var next;
    if (e.key === "ArrowRight") next = (idx + 1) % ids.length;
    else if (e.key === "ArrowLeft") next = (idx - 1 + ids.length) % ids.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = ids.length - 1;
    else return;
    e.preventDefault();
    setSection(ids[next], { scroll: false });
    var btn = document.getElementById("tab-" + ids[next]);
    if (btn) btn.focus();
  });

  // ---------------------------------------------------------------- Subnav + scrollspy
  function renderSubnav(section) {
    subnavEl.textContent = "";
    section.categories.forEach(function (cat) {
      if (!document.getElementById("cat-" + cat.id)) return; // categorie vuote non renderizzate
      var chip = el("a", { class: "chip", href: "#cat-" + cat.id, "data-cat": cat.id, text: tr(cat, "label") });
      chip.addEventListener("click", function (e) {
        e.preventDefault();
        scrollToCategory(cat.id);
        updateHash(section.id + "/" + cat.id);
      });
      subnavEl.appendChild(chip);
    });
  }

  function scrollToCategory(catId, instant) {
    var target = document.getElementById("cat-" + catId);
    if (target) target.scrollIntoView({ behavior: instant ? "auto" : scrollBehavior(), block: "start" });
  }

  /** Evidenzia la chip attiva e la centra nella subnav senza scrollare la pagina. */
  function markChip(catId) {
    Array.prototype.forEach.call(subnavEl.children, function (chip) {
      var on = chip.getAttribute("data-cat") === catId;
      if (on) chip.setAttribute("aria-current", "true");
      else chip.removeAttribute("aria-current");
      if (on && subnavEl.scrollWidth > subnavEl.clientWidth) {
        var left = chip.offsetLeft - (subnavEl.clientWidth - chip.offsetWidth) / 2;
        subnavEl.scrollTo({ left: Math.max(0, left), behavior: scrollBehavior() });
      }
    });
  }

  function setupScrollSpy() {
    if (spyObserver) spyObserver.disconnect();
    if (!("IntersectionObserver" in window)) return;

    var visible = {};
    var cats = mainEl.querySelectorAll(".category");
    var order = Array.prototype.map.call(cats, function (c) { return c.id; });

    spyObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { visible[entry.target.id] = entry.isIntersecting; });
      // La prima categoria (in ordine di documento) nella fascia attiva vince
      for (var i = 0; i < order.length; i++) {
        if (visible[order[i]]) { markChip(order[i].replace(/^cat-/, "")); return; }
      }
    }, { rootMargin: "-" + (navHeight() + 10) + "px 0px -60% 0px" });

    Array.prototype.forEach.call(cats, function (c) { spyObserver.observe(c); });
    if (order.length) markChip(order[0].replace(/^cat-/, ""));
  }

  // ---------------------------------------------------------------- Cambio sezione
  /** Ridisegna sezione attiva + subnav + scrollspy. animate=false: nessuna animazione d'ingresso. */
  function renderActive(animate) {
    var section = findSection(activeSectionId);
    if (!section) return;
    mainEl.textContent = "";
    mainEl.appendChild(renderSection(section));
    // Riavvia l'animazione di ingresso: rimuove la classe, forza il reflow, la riaggiunge
    mainEl.classList.remove("is-entering");
    mainEl.classList.toggle("no-anim", !animate);
    void mainEl.offsetWidth;
    mainEl.classList.add("is-entering");
    renderSubnav(section);
    setupScrollSpy();
  }

  /**
   * @param {string} id  id sezione
   * @param {{scroll?: boolean, category?: string, keepHash?: boolean}=} opts
   */
  function setSection(id, opts) {
    opts = opts || {};
    var section = findSection(id);
    if (!section) return;
    var changed = id !== activeSectionId;
    activeSectionId = id;
    syncTabs();

    if (changed || !mainEl.firstChild || mainEl.querySelector(".menu__notice")) {
      renderActive(true);
    }

    if (!opts.keepHash) updateHash(opts.category ? id + "/" + opts.category : id);

    if (opts.category && document.getElementById("cat-" + opts.category)) {
      scrollToCategory(opts.category, true);
    } else if (opts.scroll && window.scrollY > topEl.offsetHeight) {
      // Portati all'inizio del menu, così il cambio tab non lascia a metà pagina
      var y = mainEl.getBoundingClientRect().top + window.scrollY - navHeight();
      window.scrollTo({ top: Math.max(0, y), behavior: "auto" });
    }
  }

  // ---------------------------------------------------------------- Altezza nav -> CSS var
  function updateNavHeight() {
    document.documentElement.style.setProperty("--nav-h", navHeight() + "px");
  }
  updateNavHeight();
  if ("ResizeObserver" in window && navEl) new ResizeObserver(updateNavHeight).observe(navEl);
  else window.addEventListener("resize", updateNavHeight);

  // ---------------------------------------------------------------- Back to top
  var toTopVisible = false;
  function setToTop(show) {
    toTopVisible = show;
    toTopEl.classList.toggle("is-visible", show);
    toTopEl.setAttribute("aria-hidden", show ? "false" : "true");
    toTopEl.tabIndex = show ? 0 : -1;
  }
  if (toTopEl) {
    toTopEl.hidden = false;
    setToTop(false);
    var ticking = false;
    window.addEventListener("scroll", function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        ticking = false;
        var show = window.scrollY > 600;
        if (show !== toTopVisible) setToTop(show);
      });
    }, { passive: true });
    toTopEl.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: scrollBehavior() });
      if (topEl) topEl.focus({ preventScroll: true });
    });
  }

  // ---------------------------------------------------------------- Hash + avvio
  function syncFromHash(initial) {
    var parsed = parseHash();
    var section = parsed.section || MENU.sections[0];
    if (!section) return;
    setSection(section.id, { category: parsed.category, keepHash: !parsed.section || (initial && !parsed.category) });
  }

  // Ignora hash che non puntano a una sezione (es. ancore interne)
  window.addEventListener("hashchange", function () {
    if (parseHash().section) syncFromHash(false);
  });

  // ---------------------------------------------------------------- Testi statici + link
  /** Solo URL https: protegge da javascript: e simili. */
  function safeHttps(url) {
    if (typeof url !== "string" || !url) return "";
    try { return new URL(url).protocol === "https:" ? url : ""; } catch (e) { return ""; }
  }

  function applyLinks() {
    var links = (MENU.meta && MENU.meta.links) || {};
    Array.prototype.forEach.call(document.querySelectorAll("[data-link]"), function (a) {
      var url = safeHttps(links[a.getAttribute("data-link")]);
      if (url) {
        a.setAttribute("href", url);
        a.removeAttribute("aria-disabled");
        a.removeAttribute("title");
      } else {
        a.removeAttribute("href");
        a.setAttribute("aria-disabled", "true");
        a.setAttribute("title", t("comingSoon"));
      }
    });
  }

  function applyStaticText() {
    Array.prototype.forEach.call(document.querySelectorAll("[data-i18n]"), function (n) {
      n.textContent = t(n.getAttribute("data-i18n"));
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-i18n-aria]"), function (n) {
      n.setAttribute("aria-label", t(n.getAttribute("data-i18n-aria")));
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-i18n-content]"), function (n) {
      n.setAttribute("content", t(n.getAttribute("data-i18n-content")));
    });
    document.documentElement.lang = lang;
    document.title = t("pageTitle");
    Array.prototype.forEach.call(document.querySelectorAll(".lang-switch__btn"), function (b) {
      b.setAttribute("aria-pressed", b.getAttribute("data-lang") === lang ? "true" : "false");
    });
    applyLinks();
  }

  /** Cambia lingua mantenendo sezione attiva e posizione di scroll, senza animazioni. */
  function setLanguage(code, opts) {
    if (!hasLang(code)) return;
    opts = opts || {};
    var changed = code !== lang;
    lang = code;
    if (!opts.initial) {
      try { localStorage.setItem(STORAGE_KEY, code); } catch (e) { /* non critico */ }
      // Rimuove ?lang= dall'URL: altrimenti al ricaricamento vincerebbe sulla scelta appena fatta
      try {
        if (/[?&]lang=/.test(location.search)) {
          var params = new URLSearchParams(location.search);
          params.delete("lang");
          var qs = params.toString();
          history.replaceState(null, "", location.pathname + (qs ? "?" + qs : "") + location.hash);
        }
      } catch (e) { /* non critico */ }
    }
    applyStaticText();
    if (opts.initial || !changed) return;
    var y = window.scrollY;
    renderTabs();
    renderActive(false);
    window.scrollTo({ top: y, behavior: "instant" }); // "instant": "auto" seguirebbe scroll-behavior: smooth del CSS
  }

  Array.prototype.forEach.call(document.querySelectorAll(".lang-switch__btn"), function (b) {
    b.addEventListener("click", function () { setLanguage(b.getAttribute("data-lang")); });
  });

  // ---------------------------------------------------------------- Modale scelta lingua (primo accesso)
  /** true se esiste una scelta esplicita: ?lang= valido oppure valore valido in localStorage. */
  function hasExplicitLanguage() {
    try {
      var q = new URLSearchParams(location.search).get("lang");
      if (q && hasLang(q)) return true;
    } catch (e) { /* URLSearchParams assente */ }
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved && hasLang(saved)) return true;
    } catch (e) { return false; } // localStorage bloccato: il modale compare comunque
    return false;
  }

  function setupLanguageModal() {
    var dialog = document.querySelector(".lang-modal");
    if (!dialog || typeof window.HTMLDialogElement === "undefined" || typeof dialog.showModal !== "function") return;
    if (hasExplicitLanguage()) return;

    var root = document.documentElement;
    var closing = false;

    /** Chiusura con fade-out (classe .is-closing); animationend + timeout di sicurezza. */
    function closeModal() {
      if (closing || !dialog.open) return;
      closing = true;
      var done = false;
      function finish() {
        if (done) return;
        done = true;
        dialog.removeEventListener("animationend", onEnd);
        dialog.classList.remove("is-closing");
        if (dialog.open) dialog.close();
        root.classList.remove("is-modal-open"); // subito, senza attendere l'evento close
      }
      function onEnd(e) { if (e.target === dialog && e.animationName === "lang-modal-out") finish(); }
      dialog.addEventListener("animationend", onEnd);
      dialog.classList.add("is-closing");
      window.setTimeout(finish, 400);
    }

    // Sblocca lo scroll a qualsiasi chiusura
    dialog.addEventListener("close", function () {
      root.classList.remove("is-modal-open");
      closing = false;
    });

    /** Esc o click sul backdrop: conferma la lingua corrente (default it) così il modale non ricompare. */
    function dismiss() {
      try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) { /* non critico */ }
      closeModal();
    }
    dialog.addEventListener("cancel", function (e) { e.preventDefault(); dismiss(); });
    dialog.addEventListener("click", function (e) { if (e.target === dialog) dismiss(); });

    Array.prototype.forEach.call(dialog.querySelectorAll("[data-lang]"), function (b) {
      b.addEventListener("click", function () {
        setLanguage(b.getAttribute("data-lang")); // salva in localStorage
        closeModal();
      });
    });

    root.classList.add("is-modal-open");
    try {
      dialog.showModal();
    } catch (e) {
      root.classList.remove("is-modal-open");
      return;
    }
    // Focus iniziale sul pannello, non su un pulsante: l'anello di focus sembrerebbe una lingua
    // già preselezionata. Con Tab si passa subito a "Italiano" / "English".
    var panel = dialog.querySelector(".lang-modal__panel");
    if (panel) panel.focus({ preventScroll: true });
  }

  lang = detectLanguage();
  setLanguage(lang, { initial: true });
  renderTabs();
  syncFromHash(true);
  setupLanguageModal(); // dopo il rendering del menu
})();
