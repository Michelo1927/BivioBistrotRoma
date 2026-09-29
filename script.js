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
  var NAV_TARGETS = ".category, .menu-info"; // blocchi che hanno una chip nella subnav e vengono osservati dallo scrollspy
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

  // ---------------------------------------------------------------- Allergeni
  function findAllergen(id) {
    var list = MENU.allergens || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }

  /** Icona "i" line-art in un cerchio (decorativa). size in px. */
  function buildInfoIcon(size) {
    var s = svg("svg", { viewBox: "0 0 24 24", width: String(size), height: String(size), "class": "info-icon", fill: "none", stroke: "currentColor", "stroke-width": "1.6", "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true", focusable: "false" });
    s.appendChild(svg("circle", { cx: "12", cy: "12", r: "10" }));
    s.appendChild(svg("path", { d: "M12 11v5.500M12 7.800v.01" }));
    return s;
  }

  /**
   * Allergeni del piatto. `allergens`: array di id = presenti; [] o assente = nulla;
   * "chef" = comunicati separatamente. Restituisce null se non c'è nulla da mostrare.
   * Sotto il piatto: solo cerchietti numerati (aria-hidden) dentro un link discreto alla legenda;
   * il testo per screen reader ("Allergeni: Glutine, Uova") è in uno span visually-hidden.
   */
  function renderDishAllergens(d) {
    var a = d.allergens;
    if (a === "chef") {
      return el("p", { class: "dish__allergens dish__allergens--chef", text: t("allergensChef") });
    }
    if (!Array.isArray(a) || !a.length) return null;
    var names = [];
    var circles = [];
    a.slice().sort(function (x, y) { return x - y; }).forEach(function (id) {
      var al = findAllergen(id);
      if (!al) return;
      var label = tr(al, "name");
      names.push(label);
      circles.push(el("span", { class: "dish__allergen", "aria-hidden": "true", "data-allergen": String(id), title: id + " · " + label, text: String(id) }));
    });
    if (!circles.length) return null;
    var link = el("a", { class: "dish__allergens-link", href: "#cat-allergeni" },
      [el("span", { class: "visually-hidden", text: t("allergensLabel") + ": " + names.join(", ") })].concat(circles));
    link.addEventListener("click", function (e) {
      e.preventDefault();
      // Stesso percorso delle chip della subnav: scroll alla legenda + hash sezione/categoria
      scrollToCategory("allergeni");
      updateHash(activeSectionId + "/allergeni");
    });
    return el("p", { class: "dish__allergens" }, [link]);
  }

  /**
   * Pannello informativo sugli allergeni (solo sezione Cucina, dopo l'ultima categoria):
   * non è una categoria del menu, ma mantiene id "cat-allergeni" per subnav e scrollspy.
   * Restituisce un frammento: divisore + pannello.
   */
  function renderAllergenLegend() {
    var list = MENU.allergens || [];
    if (!list.length) return null;
    var frag = document.createDocumentFragment();
    frag.appendChild(el("div", { class: "menu-divider", "aria-hidden": "true" }, [el("span", { class: "menu-divider__gem" })]));
    frag.appendChild(el("aside", { class: "menu-info", id: "cat-allergeni", "aria-labelledby": "title-allergeni", "data-nav-label": t("allergensTitle") }, [
      el("div", { class: "menu-info__head" }, [
        buildInfoIcon(20),
        el("h2", { class: "menu-info__title", id: "title-allergeni", text: t("allergensInfoTitle") })
      ]),
      el("ol", { class: "allergen-list" }, list.map(function (al) {
        return el("li", { class: "allergen", "data-allergen": String(al.id) }, [
          el("span", { class: "allergen__num", "aria-hidden": "true", text: String(al.id) }),
          el("span", { class: "allergen__name", text: tr(al, "name") })
        ]);
      })),
      el("p", { class: "allergen-note" }, [el("span", { class: "allergen-note__mark", "aria-hidden": "true", text: "*" }), " " + t("frozenNote")]),
      el("p", { class: "allergen-ask", text: t("allergyAsk") })
    ]));
    return frag;
  }

  // ---------------------------------------------------------------- Renderer
  function renderDish(d, i) {
    var img = el("img", { alt: tr(d, "name"), loading: "lazy", decoding: "async", width: "800", height: "600" });
    var figure = el("figure", { class: "dish__media" }, [img]);
    attachImageFallback(img, figure, d);

    // Nome + eventuale asterisco "prodotto gelo"
    var nameEl = el("h3", { class: "dish__name", text: tr(d, "name") });
    if (d.frozen) {
      nameEl.appendChild(el("span", { class: "dish__frozen", title: t("frozenMark"), "aria-label": t("frozenMark"), text: "*" }));
    }
    // Prezzo assente (price: null): l'elemento non viene creato
    var hasPrice = typeof d.price === "number";
    var head = el("div", { class: "dish__head" }, [
      nameEl,
      hasPrice ? el("data", { class: "dish__price", value: String(d.price), text: formatPrice(d.price) }) : null
    ]);
    var body = el("div", { class: "dish__body" }, [head]);
    var desc = tr(d, "description");
    if (desc) body.appendChild(el("p", { class: "dish__desc", text: desc }));
    var allergenLine = renderDishAllergens(d);
    if (allergenLine) body.appendChild(allergenLine);

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
    var wrapper = el("section", { class: "category category--" + section.type, id: "cat-" + cat.id, "aria-labelledby": titleId, "data-nav-label": tr(cat, "label") }, [heading]);
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
    // Blocco extra della Cucina: legenda allergeni dopo l'ultima categoria
    if (section.type === "food") {
      var legend = renderAllergenLegend();
      if (legend) frag.appendChild(legend);
    }
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
    // Una chip per ogni blocco navigabile effettivamente renderizzato: categorie (.category) + pannelli informativi (.menu-info)
    Array.prototype.forEach.call(mainEl.querySelectorAll(NAV_TARGETS), function (node) {
      var catId = node.id.replace(/^cat-/, "");
      var isInfo = node.classList.contains("menu-info");
      var label = node.getAttribute("data-nav-label") || catId;
      var chip = el("a", { class: isInfo ? "chip chip--info" : "chip", href: "#" + node.id, "data-cat": catId }, isInfo ? [buildInfoIcon(12), label] : [label]);
      chip.addEventListener("click", function (e) {
        e.preventDefault();
        scrollToCategory(catId);
        updateHash(section.id + "/" + catId);
      });
      // Filetto verticale che stacca le chip informative da quelle delle categorie
      if (isInfo && subnavEl.children.length) subnavEl.appendChild(el("span", { class: "subnav__sep", "aria-hidden": "true" }));
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
    var cats = mainEl.querySelectorAll(NAV_TARGETS);
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

  // ---------------------------------------------------------------- Galleria "Il locale" + lightbox
  var galleryPillEl = document.querySelector(".pill-link--gallery");
  var lightboxEl = document.querySelector(".lightbox");
  var lbState = { index: 0, open: false };
  var lbReady = false;
  var lbOpener = null; // elemento che ha aperto la lightbox: riceve il focus alla chiusura

  function galleryItems() {
    return (MENU.gallery && MENU.gallery.length) ? MENU.gallery : [];
  }

  /** Aggiorna la pillola "Il locale" (nascosta se non ci sono foto) e la lightbox aperta al cambio lingua. */
  function syncGallery() {
    if (galleryPillEl) galleryPillEl.hidden = !galleryItems().length;
    if (lbState.open) showPhoto(lbState.index, true); // cambio lingua con lightbox aperta
  }

  /** Pillola: click apre la prima foto; la prima foto grande viene precaricata una sola volta. */
  function setupGalleryPill() {
    if (!galleryPillEl) return;
    var preloaded = false;
    function preload() {
      if (preloaded) return;
      var items = galleryItems();
      if (!items.length) return;
      preloaded = true;
      new Image().src = items[0].src;
    }
    galleryPillEl.addEventListener("pointerenter", preload);
    galleryPillEl.addEventListener("focus", preload);
    galleryPillEl.addEventListener("click", function () {
      if (galleryItems().length) openLightbox(0);
    });
  }

  /** Mostra la foto i nella lightbox (ciclico). instant = senza dissolvenza. */
  function showPhoto(i, instant) {
    var items = galleryItems();
    if (!items.length || !lightboxEl) return;
    var n = items.length;
    lbState.index = ((i % n) + n) % n;
    var g = items[lbState.index];
    var img = lightboxEl.querySelector(".lightbox__img");
    var caption = tr(g, "caption") || "";
    lightboxEl.querySelector(".lightbox__text").textContent = caption;
    lightboxEl.querySelector(".lightbox__count").textContent = (lbState.index + 1) + " / " + n;
    img.alt = tr(g, "alt") || caption;
    if (img.getAttribute("src") !== g.src) {
      if (!instant) img.classList.add("is-loading");
      img.onload = img.onerror = function () { img.classList.remove("is-loading"); };
      img.src = g.src;
      if (img.complete) img.classList.remove("is-loading");
    }
    // Precarica le vicine per una navigazione fluida
    [1, -1].forEach(function (d) {
      var nb = items[(lbState.index + d + n) % n];
      if (nb) new Image().src = nb.src;
    });
  }

  function openLightbox(i) {
    if (!lightboxEl) return;
    var items = galleryItems();
    if (typeof lightboxEl.showModal !== "function") {
      // Fallback: nessun <dialog> -> la foto si apre in una nuova scheda
      window.open(items[i].src, "_blank", "noopener");
      return;
    }
    setupLightbox();
    lbOpener = document.activeElement;
    lbState.index = i;
    lbState.open = true;
    lightboxEl.querySelector(".lightbox__img").removeAttribute("src");
    document.documentElement.classList.add("is-modal-open");
    try { lightboxEl.showModal(); } catch (e) {
      lbState.open = false;
      document.documentElement.classList.remove("is-modal-open");
      window.open(items[i].src, "_blank", "noopener");
      return;
    }
    showPhoto(i, true);
    lightboxEl.querySelector(".lightbox__close").focus({ preventScroll: true });
  }

  /** Listener della lightbox: registrati una sola volta, alla prima apertura. */
  function setupLightbox() {
    if (lbReady) return;
    lbReady = true;
    var root = document.documentElement;
    lightboxEl.querySelector(".lightbox__close").addEventListener("click", function () { lightboxEl.close(); });
    lightboxEl.querySelector(".lightbox__prev").addEventListener("click", function () { showPhoto(lbState.index - 1); });
    lightboxEl.querySelector(".lightbox__next").addEventListener("click", function () { showPhoto(lbState.index + 1); });

    // Alla chiusura (Esc, X o backdrop): sblocca lo scroll e riporta il focus all'elemento che ha aperto
    lightboxEl.addEventListener("close", function () {
      lbState.open = false;
      root.classList.remove("is-modal-open");
      if (lbOpener && document.contains(lbOpener) && typeof lbOpener.focus === "function") {
        lbOpener.focus({ preventScroll: true });
      }
      lbOpener = null;
    });

    lightboxEl.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") { e.preventDefault(); showPhoto(lbState.index - 1); }
      else if (e.key === "ArrowRight") { e.preventDefault(); showPhoto(lbState.index + 1); }
    });

    // Swipe orizzontale (touch/penna); soglia 40px, prevale l'asse orizzontale
    var startX = null, startY = 0, swiped = false;
    lightboxEl.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "mouse") return;
      startX = e.clientX; startY = e.clientY; swiped = false;
    });
    lightboxEl.addEventListener("pointerup", function (e) {
      if (startX === null) return;
      var dx = e.clientX - startX, dy = e.clientY - startY;
      startX = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
        swiped = true;
        showPhoto(lbState.index + (dx < 0 ? 1 : -1));
      }
    });
    lightboxEl.addEventListener("pointercancel", function () { startX = null; });

    // Click sullo sfondo (fuori da foto, didascalia e bottoni) chiude
    lightboxEl.addEventListener("click", function (e) {
      if (swiped) { swiped = false; return; }
      if (e.target.closest("button, .lightbox__img, .lightbox__caption")) return;
      lightboxEl.close();
    });
  }

  setupGalleryPill();

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
    syncGallery();
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
