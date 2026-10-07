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

  // ---------------------------------------------------------------- Ora (ordine dinamico delle categorie)
  /** "HH:MM" -> minuti dalla mezzanotte (NaN se malformato). Pura. */
  function minutes(v) {
    var m = /^(\d{1,2}):(\d{2})$/.exec(String(v));
    return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : NaN;
  }

  /**
   * true se `now` ("HH:MM") cade nella fascia che parte da `from`. Pura.
   * Senza `until`: da `from` fino a mezzanotte. Con `until` > `from`: from <= now < until.
   * Con `until` <= `from` la fascia scavalca la mezzanotte: now >= from || now < until.
   * Valori malformati -> false.
   */
  function inWindow(from, until, now) {
    var a = minutes(from), n = minutes(now);
    if (isNaN(a) || isNaN(n)) return false;
    if (until === undefined || until === null || until === "") return n >= a;
    var u = minutes(until);
    if (isNaN(u)) return false;
    return u > a ? (n >= a && n < u) : (n >= a || n < u);
  }

  /**
   * Ora corrente "HH:MM" a Roma (fallback: ora locale se timeZone non è supportato).
   * SOLO PER DEBUG: `?ora=HH:MM` nell'URL forza l'ora (ignorato se malformato).
   */
  function currentTime() {
    try {
      var forced = new URLSearchParams(location.search).get("ora");
      if (forced && /^([01]\d|2[0-3]):[0-5]\d$/.test(forced)) return forced;
    } catch (e) { /* URLSearchParams assente */ }
    try {
      var parts = new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
      var h = "", m = "";
      parts.forEach(function (p) { if (p.type === "hour") h = p.value; else if (p.type === "minute") m = p.value; });
      if (h && m) return h + ":" + m;
    } catch (e) { /* Intl/timeZone non supportati: ora locale */ }
    var d = new Date();
    return (d.getHours() < 10 ? "0" : "") + d.getHours() + ":" + (d.getMinutes() < 10 ? "0" : "") + d.getMinutes();
  }

  /** Categorie della sezione nell'ordine di rendering: quelle la cui fascia `firstFrom`/`firstUntil` è attiva passano in testa (in ordine di dichiarazione). */
  function orderedCategories(section) {
    var now = currentTime();
    var first = [], rest = [];
    section.categories.forEach(function (cat) {
      (cat.firstFrom && inWindow(cat.firstFrom, cat.firstUntil, now) ? first : rest).push(cat);
    });
    return first.concat(rest);
  }

  // ---------------------------------------------------------------- Orari
  var DAY_KEYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  var dayFormatters = {};

  /**
   * Giorno della settimana a Roma: 0 = lunedì … 6 = domenica (fallback: giorno locale).
   * SOLO PER DEBUG: `?giorno=1..7` nell'URL forza il giorno, 1 = lunedì (ignorato se malformato).
   */
  function currentDay() {
    try {
      var forced = new URLSearchParams(location.search).get("giorno");
      if (forced && /^[1-7]$/.test(forced)) return parseInt(forced, 10) - 1;
    } catch (e) { /* URLSearchParams assente */ }
    try {
      var name = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Rome", weekday: "short" }).format(new Date());
      var idx = DAY_KEYS.indexOf(name);
      if (idx !== -1) return idx;
    } catch (e) { /* Intl/timeZone non supportati: giorno locale */ }
    return (new Date().getDay() + 6) % 7;
  }

  /** Orari validi (array di 7) o null: senza, pill e orari del footer non compaiono. */
  function weekHours() {
    var h = MENU && MENU.meta && MENU.meta.hours;
    return Array.isArray(h) && h.length === 7 ? h : null;
  }

  /** true se la chiusura cade dopo mezzanotte (close <= open). */
  function pastMidnight(slot) {
    return minutes(slot.close) <= minutes(slot.open);
  }

  /** Nome del giorno i (0 = lunedì) nella lingua corrente. style: "long" | "short". Prima lettera maiuscola. */
  function dayName(i, style) {
    var key = locale() + style;
    if (!dayFormatters[key]) dayFormatters[key] = new Intl.DateTimeFormat(locale(), { weekday: style });
    var name = dayFormatters[key].format(new Date(2024, 0, 1 + i)); // 1 gennaio 2024 era un lunedì
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  /** Orario da mostrare: la chiusura "00:00" diventa "24:00", il resto invariato. */
  function shownTime(hhmm, isClose) {
    return isClose && hhmm === "00:00" ? "24:00" : hhmm;
  }

  /** Sostituisce {t} e {d} nella stringa di interfaccia `key`. */
  function fmt(key, time, day) {
    return t(key).replace("{t}", time).replace("{d}", day || "");
  }

  /**
   * Stato attuale: { open: bool, text } oppure null se non ci sono orari.
   * Aperto anche nella "coda" di ieri se ieri chiudeva dopo mezzanotte.
   */
  function openingStatus() {
    var hours = weekHours();
    if (!hours) return null;
    var now = minutes(currentTime());
    var d = currentDay();
    var today = hours[d];
    var yesterday = hours[(d + 6) % 7];

    if (today && now >= minutes(today.open) && (pastMidnight(today) || now < minutes(today.close))) {
      return { open: true, text: t("openNow") + " · " + fmt("closesAt", shownTime(today.close, true)) };
    }
    if (yesterday && pastMidnight(yesterday) && now < minutes(yesterday.close)) {
      return { open: true, text: t("openNow") + " · " + fmt("closesAt", shownTime(yesterday.close, true)) };
    }
    var closed = t("closedNow") + " · ";
    if (today && now < minutes(today.open)) {
      return { open: false, text: closed + fmt("opensAt", shownTime(today.open, false)) };
    }
    for (var n = 1; n <= 7; n++) {
      var slot = hours[(d + n) % 7];
      if (!slot) continue;
      var time = shownTime(slot.open, false);
      if (n === 1) return { open: false, text: closed + fmt("opensTomorrow", time) };
      return { open: false, text: closed + fmt("opensOn", time, dayName((d + n) % 7, "long").toLowerCase()) };
    }
    return null;
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
  var NAV_TARGETS = ".category"; // blocchi che hanno una chip nella subnav e vengono osservati dallo scrollspy
  var spyObserver = null;
  var activeCategory = {}; // id sezione -> id categoria aperta (solo sezioni "paged"): tornando nella scheda si riapre l'ultima vista
  var printAll = false;    // true durante la stampa: le sezioni "paged" mostrano tutte le categorie

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

  // ---------------------------------------------------------------- Sezioni a pagine
  /** Voci di una categoria (array sorgente scelto dal tipo di sezione, filtrato per categoria). */
  function categoryItems(section, cat) {
    var source = section.type === "food" ? MENU.dishes : section.type === "list2" ? MENU[section.source] : MENU.spirits;
    return (source || []).filter(function (item) { return item.category === cat.id; });
  }

  /** Categorie nell'ordine di rendering, solo quelle con almeno una voce. */
  function visibleCategories(section) {
    return orderedCategories(section).filter(function (cat) { return categoryItems(section, cat).length > 0; });
  }

  /** true se la sezione mostra una categoria alla volta (non durante la stampa). */
  function isPaged(section) {
    return section.paged === true && !printAll;
  }

  /** Categoria aperta di una sezione a pagine: quella ricordata se valida, altrimenti la prima; null se non ce ne sono. */
  function currentCategory(section) {
    var cats = visibleCategories(section);
    for (var i = 0; i < cats.length; i++) {
      if (cats[i].id === activeCategory[section.id]) return cats[i];
    }
    return cats.length ? cats[0] : null;
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
   *                           (se image è null si parte direttamente da qui)
   *   3. icona SVG         -> ripiego se un file indicato non si carica; il box (aspect-ratio 4/3) resta identico
   * Se image e placeholder sono entrambi null non si arriva qui: renderDish non crea il riquadro.
   * Gli handler vanno impostati PRIMA di assegnare src.
   */
  function attachImageFallback(img, figure, dish) {
    var triedPlaceholder = false;
    var start = dish.image;
    if (!start && dish.placeholder) {
      triedPlaceholder = true;
      start = dish.placeholder;
    }

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
    img.src = start;
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
   * Sotto il piatto: solo cerchietti numerati (aria-hidden) dentro un pulsante discreto che apre il pop-up allergeni;
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
    var link = el("button", { type: "button", class: "dish__allergens-link", "aria-haspopup": "dialog" },
      [el("span", { class: "visually-hidden", text: t("allergensLabel") + ": " + names.join(", ") })].concat(circles));
    link.addEventListener("click", function () { openAllergens(d, link); });
    return el("p", { class: "dish__allergens" }, [link]);
  }

  /**
   * Elenco numerato dei 14 allergeni (ol.allergen-list), usato dal pop-up e dalla legenda di stampa.
   * `presenti`: array di id degli allergeni del piatto (evidenziati) oppure null (elenco neutro).
   */
  function renderAllergenList(presenti) {
    var evidenzia = Array.isArray(presenti) && presenti.length > 0;
    return el("ol", { class: evidenzia ? "allergen-list allergen-list--piatto" : "allergen-list" }, (MENU.allergens || []).map(function (al) {
      var presente = evidenzia && presenti.indexOf(al.id) !== -1;
      return el("li", { class: presente ? "allergen is-presente" : "allergen", "data-allergen": String(al.id) }, [
        el("span", { class: "allergen__num", "aria-hidden": "true", text: String(al.id) }),
        el("span", { class: "allergen__name", text: tr(al, "name") }),
        presente ? el("span", { class: "visually-hidden", text: t("allergensPresent") }) : null
      ]);
    }));
  }

  /**
   * Legenda allergeni per la sola stampa (sezione Cucina, dopo il pager): a schermo è nascosta,
   * il cliente usa il pop-up (openAllergens). Intestazione + elenco + invito a comunicare le allergie.
   */
  function renderAllergenLegend() {
    if (!(MENU.allergens || []).length) return null;
    return el("aside", { class: "menu-info menu-info--stampa", "aria-labelledby": "title-allergeni" }, [
      el("div", { class: "menu-info__head" }, [
        buildInfoIcon(20),
        el("h2", { class: "menu-info__title", id: "title-allergeni", text: t("allergensInfoTitle") })
      ]),
      renderAllergenList(null),
      el("p", { class: "allergen-ask", text: t("allergyAsk") })
    ]);
  }

  /** Note sotto i piatti della Cucina: invito a toccare i numeri (solo a schermo) + nota "prodotto gelo". */
  function renderMenuNotes() {
    return el("div", { class: "menu-notes" }, [
      el("p", { class: "menu-notes__hint" }, [buildInfoIcon(14), el("span", { text: t("allergensHint") })]),
      el("p", { class: "allergen-note" }, [el("span", { class: "allergen-note__mark", "aria-hidden": "true", text: "*" }), " " + t("frozenNote")])
    ]);
  }

  // ---------------------------------------------------------------- Pop-up allergeni
  var allergenModalEl = document.querySelector(".allergen-modal");
  var allergenState = { open: false, dish: null };
  var allergenReady = false;
  var allergenOpener = null; // elemento che ha aperto il pop-up: riceve il focus alla chiusura

  /** Icona X (chiudi), line-art, decorativa. size in px. */
  function buildCloseIcon(size) {
    var s = svg("svg", { viewBox: "0 0 24 24", width: String(size), height: String(size), fill: "none", stroke: "currentColor", "stroke-width": "1.6", "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true", focusable: "false" });
    s.appendChild(svg("path", { d: "M6 6l12 12M18 6 6 18" }));
    return s;
  }

  /** Ricostruisce il contenuto del pop-up nella lingua corrente per `dish` (o per l'elenco completo se null). */
  function renderAllergenModal(dish) {
    var panel = allergenModalEl.querySelector(".allergen-modal__panel");
    if (!panel) return;
    var presenti = [];
    if (dish && Array.isArray(dish.allergens)) {
      dish.allergens.forEach(function (id) { if (findAllergen(id)) presenti.push(id); });
    }
    panel.textContent = "";

    var closeBtn = el("button", { type: "button", class: "allergen-modal__close", "aria-label": t("close") }, [buildCloseIcon(24)]);
    closeBtn.addEventListener("click", function () { allergenModalEl.close(); });
    panel.appendChild(closeBtn);
    panel.appendChild(el("h2", { class: "allergen-modal__title", id: "allergen-modal-title", text: t("allergensInfoTitle") }));

    if (presenti.length) {
      // Il nome del piatto va in evidenza: si spezza il testo sul segnaposto {d}
      var parts = fmt("allergensContains", "", "\u0001").split("\u0001");
      var nomi = presenti.slice().sort(function (x, y) { return x - y; }).map(function (id) { return tr(findAllergen(id), "name"); });
      panel.appendChild(el("p", { class: "allergen-modal__piatto" }, [
        parts[0], el("strong", { text: tr(dish, "name") }), (parts[1] || "") + " " + nomi.join(", ")
      ]));
    }

    panel.appendChild(renderAllergenList(presenti));
    panel.appendChild(el("p", { class: "allergen-ask", text: t("allergyAsk") }));
  }

  /**
   * Apre il pop-up allergeni. `dish` (può essere null): evidenzia i suoi allergeni nell'elenco;
   * `opener`: elemento che riceve il focus alla chiusura.
   */
  function openAllergens(dish, opener) {
    if (!allergenModalEl) return;
    setupAllergenModal();
    if (allergenState.open) return;
    allergenOpener = opener || document.activeElement;
    allergenState.dish = dish || null;
    renderAllergenModal(allergenState.dish);
    allergenState.open = true;
    if (typeof allergenModalEl.showModal === "function") {
      document.documentElement.classList.add("is-modal-open");
      try { allergenModalEl.showModal(); } catch (e) {
        document.documentElement.classList.remove("is-modal-open");
        allergenModalEl.setAttribute("open", "");
      }
    } else {
      // Nessun <dialog> modale: l'informazione deve comunque essere leggibile
      allergenModalEl.setAttribute("open", "");
    }
    var panel = allergenModalEl.querySelector(".allergen-modal__panel");
    if (panel) panel.focus({ preventScroll: true });
  }

  /** Listener del pop-up: registrati una sola volta, alla prima apertura. */
  function setupAllergenModal() {
    if (allergenReady) return;
    allergenReady = true;
    // Alla chiusura (Esc, X o sfondo): sblocca lo scroll e riporta il focus all'elemento che ha aperto
    allergenModalEl.addEventListener("close", function () {
      allergenState.open = false;
      allergenState.dish = null;
      document.documentElement.classList.remove("is-modal-open");
      // Aperto da #sezione/allergeni: toglie "allergeni" dall'hash, altrimenti un ricaricamento riaprirebbe il pop-up
      if (/\/allergeni$/.test(location.hash)) updateHash(activeSectionId);
      if (allergenOpener && document.contains(allergenOpener) && typeof allergenOpener.focus === "function") {
        allergenOpener.focus({ preventScroll: true });
      }
      allergenOpener = null;
    });
    // Click sullo sfondo: il padding sta sul pannello, quindi e.target === dialog solo fuori dal pannello
    allergenModalEl.addEventListener("click", function (e) {
      if (e.target === allergenModalEl) allergenModalEl.close();
    });
  }

  // ---------------------------------------------------------------- Renderer
  function renderDish(d, i) {
    // Senza image né placeholder: card solo testo, nessun riquadro
    var figure = null;
    if (d.image || d.placeholder) {
      var img = el("img", { alt: tr(d, "name"), loading: "lazy", decoding: "async", width: "800", height: "600" });
      figure = el("figure", { class: "dish__media" }, [img]);
      attachImageFallback(img, figure, d);
    }

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

    var article = el("article", { class: figure ? "dish" : "dish dish--no-media" }, [figure, body]);
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

  /**
   * Riga a due prezzi (vini, caffetteria). Le classi wine__* sono generiche: valgono per ogni sezione "list2".
   * `columns` = section.priceColumns ([{ key, label }, { key, label }]).
   */
  function renderPriceRow(w, columns) {
    // Collegamento interno opzionale (w.link): porta a una categoria di un'altra sezione
    var linkEl = null;
    var linkAsName = false;
    if (w.link && findSection(w.link.section)) {
      var link = w.link;
      linkAsName = w.linkAsName === true;
      linkEl = el("a", { class: "row-link", href: "#" + link.section + (link.category ? "/" + link.category : ""), text: t(link.label) });
      linkEl.addEventListener("click", function (e) {
        e.preventDefault();
        setSection(link.section, { category: link.category });
        // Dopo il re-render il layout può assestarsi (animazione d'ingresso, altezza pagina): riallinea al frame successivo
        window.requestAnimationFrame(function () { scrollToCategory(link.category, true); });
      });
    }

    // linkAsName: il nome resta solo per gli screen reader e il link lo sostituisce nell'intestazione
    var nameLine = [el("h3", { class: linkAsName ? "wine__name visually-hidden" : "wine__name", text: tr(w, "name") })];
    if (linkAsName) nameLine.push(linkEl);
    if (w.organic) nameLine.push(el("span", { class: "badge", text: t("organic") }));
    nameLine.push(el("span", { class: "leader", "aria-hidden": "true" }));

    // Meta: unisce con " · " solo i campi valorizzati
    var abv = typeof w.abv === "number" ? formatAbv(w.abv) : w.abv;
    var meta = [w.winery, tr(w, "detail"), w.vintage, abv].filter(Boolean).join(" · ");

    var li = el("li", { class: "wine" }, [
      el("div", { class: "wine__head" }, nameLine),
      el("div", { class: "wine__prices" }, columns.map(function (col) { return priceCell(t(col.label), w[col.key]); })),
      meta ? el("p", { class: "wine__meta", text: meta }) : null,
      linkAsName ? null : linkEl,
      // Allergeni "ask": stessa resa della nota chef dei piatti
      w.allergens === "ask" ? el("p", { class: "dish__allergens dish__allergens--chef wine__ask", text: t("allergensAsk") }) : null
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
    var items = categoryItems(section, cat);
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
    } else if (section.type === "list2") {
      // Intestazione colonne (solo desktop, decorativa: le etichette sono ripetute per lo screen reader)
      var columns = section.priceColumns;
      wrapper.appendChild(el("div", { class: "wine-cols", "aria-hidden": "true" }, columns.map(function (col) {
        return el("span", { text: t(col.label) });
      })));
      wrapper.appendChild(el("ul", { class: "wine-list" }, items.map(function (item) { return renderPriceRow(item, columns); })));
    } else {
      wrapper.appendChild(el("ul", { class: "spirit-list" }, items.map(renderSpirit)));
    }
    return wrapper;
  }

  /** Pager di una sezione a pagine: categoria precedente a sinistra, successiva a destra (senza ciclo); null se non c'è né la precedente né la successiva. */
  function renderPager(section) {
    var cats = visibleCategories(section);
    var current = currentCategory(section);
    var idx = -1;
    for (var i = 0; i < cats.length; i++) {
      if (current && cats[i].id === current.id) idx = i;
    }
    var prev = idx > 0 ? cats[idx - 1] : null;
    var next = idx !== -1 && idx < cats.length - 1 ? cats[idx + 1] : null;
    if (!prev && !next) return null;

    function button(cat, dir) {
      var btn = el("button", { type: "button", class: "pager__btn pager__btn--" + dir }, [
        el("span", { class: "pager__name", text: tr(cat, "label") })
      ]);
      btn.addEventListener("click", function () { setCategory(section, cat.id, { focus: true }); });
      return btn;
    }
    return el("nav", { class: "pager", "aria-label": t("pagerLabel") }, [
      prev ? button(prev, "prev") : null,
      next ? button(next, "next") : null
    ]);
  }

  function renderSection(section) {
    var frag = document.createDocumentFragment();
    // Nota di sezione (riquadro sobrio prima della prima categoria)
    var note = tr(section, "note");
    if (note) frag.appendChild(el("p", { class: "section-note" }, [buildInfoIcon(14), el("span", { text: note })]));
    if (isPaged(section)) {
      // Sezione a pagine: una sola categoria, poi il pager
      var current = currentCategory(section);
      var page = current ? renderCategory(section, current, 0) : null;
      if (page) frag.appendChild(page);
      // Note della Cucina: subito dopo la categoria, prima del pager
      if (section.type === "food") frag.appendChild(renderMenuNotes());
      var pager = renderPager(section);
      if (pager) frag.appendChild(pager);
    } else {
      orderedCategories(section).forEach(function (cat, index) {
        var node = renderCategory(section, cat, index);
        if (node) frag.appendChild(node);
      });
      if (section.type === "food") frag.appendChild(renderMenuNotes());
    }
    // Cucina: legenda allergeni completa, visibile solo in stampa
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
      // Riga tab scorrevole (schermi stretti): porta la tab attiva in vista senza scrollare la pagina
      if (on && tabsEl.scrollWidth > tabsEl.clientWidth) {
        tabsEl.scrollTo({ left: Math.max(0, btn.offsetLeft - (tabsEl.clientWidth - btn.offsetWidth) / 2), behavior: "auto" });
      }
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

    /** Chip di una categoria: link all'ancora; `onClick` gestisce il clic (preventDefault già fatto). */
    function addChip(catId, label, href, onClick) {
      var chip = el("a", { class: "chip", href: href, "data-cat": catId }, [label]);
      chip.addEventListener("click", function (e) {
        e.preventDefault();
        onClick();
      });
      subnavEl.appendChild(chip);
    }

    function scrollChip(catId) {
      scrollToCategory(catId);
      updateHash(section.id + "/" + catId);
    }

    /** Chip informativa "Allergeni" (solo Cucina): pulsante che apre il pop-up, staccato dalle categorie da un filetto. */
    function addAllergenChip() {
      if (section.type !== "food" || !(MENU.allergens || []).length) return;
      var chip = el("button", { type: "button", class: "chip chip--info", "aria-haspopup": "dialog", "data-cat": "allergeni" }, [buildInfoIcon(12), t("allergensTitle")]);
      chip.addEventListener("click", function () { openAllergens(null, chip); });
      if (subnavEl.children.length) subnavEl.appendChild(el("span", { class: "subnav__sep", "aria-hidden": "true" }));
      subnavEl.appendChild(chip);
    }

    if (isPaged(section)) {
      // Sezione a pagine: nel DOM c'è una sola categoria, quindi le chip si costruiscono dai dati
      visibleCategories(section).forEach(function (cat) {
        addChip(cat.id, tr(cat, "label"), "#" + section.id + "/" + cat.id, function () { setCategory(section, cat.id); });
      });
    } else {
      // Una chip per ogni categoria effettivamente renderizzata
      Array.prototype.forEach.call(mainEl.querySelectorAll(NAV_TARGETS), function (node) {
        var catId = node.id.replace(/^cat-/, "");
        addChip(catId, node.getAttribute("data-nav-label") || catId, "#" + node.id, function () { scrollChip(catId); });
      });
    }
    addAllergenChip();
  }

  /** Porta la pagina all'inizio del menu; senza `always` non scende mai (se l'utente è ancora sull'header resta dov'è). */
  function scrollToMenuTop(always) {
    var y = mainEl.getBoundingClientRect().top + window.scrollY - navHeight();
    if (always || window.scrollY > y) window.scrollTo({ top: Math.max(0, y), behavior: "auto" });
  }

  /**
   * Apre una categoria di una sezione a pagine: ridisegna il contenuto, aggiorna l'hash e riporta in cima al menu.
   * Le chip restano le stesse (non vengono ricreate): così il trattino della chip attiva si anima e il focus resta dov'è.
   * opts.focus: focus su #menu (il pulsante del pager cliccato viene distrutto dal re-render).
   */
  function setCategory(section, catId, opts) {
    opts = opts || {};
    activeCategory[section.id] = catId;
    renderActive(true, true);
    updateHash(section.id + "/" + catId);
    scrollToMenuTop();
    if (opts.focus) mainEl.focus({ preventScroll: true });
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
    var activeSection = findSection(activeSectionId);
    if (activeSection && isPaged(activeSection)) {
      // Sezione a pagine: la chip attiva è la categoria aperta, niente scrollspy
      var open = currentCategory(activeSection);
      if (open) markChip(open.id);
      return;
    }
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
  /** Ridisegna sezione attiva + subnav + scrollspy. animate=false: nessuna animazione d'ingresso. keepSubnav=true: lascia le chip esistenti (cambio categoria in una sezione a pagine). */
  function renderActive(animate, keepSubnav) {
    var section = findSection(activeSectionId);
    if (!section) return;
    mainEl.textContent = "";
    mainEl.appendChild(renderSection(section));
    // Riavvia l'animazione di ingresso: rimuove la classe, forza il reflow, la riaggiunge
    mainEl.classList.remove("is-entering");
    mainEl.classList.toggle("no-anim", !animate);
    void mainEl.offsetWidth;
    mainEl.classList.add("is-entering");
    if (!keepSubnav) renderSubnav(section);
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

    // Sezione a pagine con una categoria richiesta: la imposta prima del render
    var pagedCat = null;
    var catChanged = false;
    if (isPaged(section) && opts.category) {
      visibleCategories(section).forEach(function (cat) {
        if (cat.id === opts.category) pagedCat = cat.id;
      });
      if (pagedCat) {
        catChanged = currentCategory(section).id !== pagedCat;
        activeCategory[id] = pagedCat;
      }
    }

    if (changed || catChanged || !mainEl.firstChild || mainEl.querySelector(".menu__notice")) {
      renderActive(true, !changed && catChanged && subnavEl.children.length > 0);
    }

    if (!opts.keepHash) updateHash(opts.category ? id + "/" + opts.category : id);

    if (opts.category === "allergeni" && section.type === "food" && (MENU.allergens || []).length) {
      // #cucina/allergeni: apre il pop-up con l'elenco completo (opener = chip Allergeni)
      openAllergens(null, subnavEl.querySelector('[data-cat="allergeni"]'));
    } else if (pagedCat) {
      scrollToMenuTop();
    } else if (opts.category && document.getElementById("cat-" + opts.category)) {
      scrollToCategory(opts.category, true);
    } else if (opts.scroll && window.scrollY > topEl.offsetHeight) {
      // Portati all'inizio del menu, così il cambio tab non lascia a metà pagina
      scrollToMenuTop(true);
    }
  }

  // ---------------------------------------------------------------- Stampa
  // In stampa le sezioni a pagine mostrano tutte le categorie: il foglio non deve contenere una sola pagina del menu
  function setPrintAll(on) {
    var section = findSection(activeSectionId);
    printAll = on;
    if (section && section.paged === true) renderActive(false);
  }
  window.addEventListener("beforeprint", function () { setPrintAll(true); });
  window.addEventListener("afterprint", function () { setPrintAll(false); });

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

  /**
   * Sceglie la versione della foto per la lightbox: -800 (srcSmall) se basta ai pixel fisici
   * che il riquadro (92vw x 80vh, come .lightbox__img) può mostrare, altrimenti -1600 (src).
   */
  function photoSrc(g) {
    if (!g.width || !g.height) return g.src;
    var boxW = window.innerWidth * 0.92;
    var boxH = window.innerHeight * 0.80;
    var s = Math.min(boxW / g.width, boxH / g.height, 1);
    var needed = s * Math.max(g.width, g.height) * (window.devicePixelRatio || 1);
    return (g.srcSmall && needed <= 800) ? g.srcSmall : g.src;
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
      new Image().src = photoSrc(items[0]);
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
    var wanted = photoSrc(g);
    if (img.getAttribute("src") !== wanted) {
      if (!instant) img.classList.add("is-loading");
      img.onload = img.onerror = function () { img.classList.remove("is-loading"); };
      img.src = wanted;
      if (img.complete) img.classList.remove("is-loading");
    }
    // Precarica le vicine per una navigazione fluida
    [1, -1].forEach(function (d) {
      var nb = items[(lbState.index + d + n) % n];
      if (nb) new Image().src = photoSrc(nb);
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

  // ---------------------------------------------------------------- Orari: rendering (pill header + footer)
  var statusEl = document.querySelector(".status-pill");
  var statusPanelEl = document.querySelector(".status-panel");
  var hoursEl = document.querySelector(".hours");

  /** Pill "Aperto · chiude alle 23:00" / "Chiuso · apre alle 07:30"; nascosta se non ci sono orari. */
  function renderStatus() {
    if (!statusEl) return;
    var st = openingStatus();
    statusEl.textContent = "";
    statusEl.hidden = !st;
    if (!st) {
      setStatusPanel(false); // senza orari niente pannello aperto
      return;
    }
    // classList (non className): non deve perdere "is-open" a pannello aperto
    statusEl.classList.toggle("status-pill--open", st.open);
    statusEl.classList.toggle("status-pill--closed", !st.open);
    statusEl.appendChild(el("span", { class: "status-pill__dot", "aria-hidden": "true" }));
    statusEl.appendChild(el("span", { class: "status-pill__text", text: st.text }));
    var chevron = svg("svg", { viewBox: "0 0 24 24", "class": "status-pill__chevron", width: "12", height: "12", fill: "none", stroke: "currentColor", "stroke-width": "1.8", "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true", focusable: "false" });
    chevron.appendChild(svg("path", { d: "M6 9l6 6 6-6" }));
    statusEl.appendChild(chevron);
  }

  /** Apre/chiude il pannello degli orari sotto la pill e tiene allineati aria-expanded e classe. */
  function setStatusPanel(open) {
    if (!statusEl || !statusPanelEl) return;
    statusEl.setAttribute("aria-expanded", open ? "true" : "false");
    statusEl.classList.toggle("is-open", open);
    statusPanelEl.hidden = !open;
  }

  /** Pannello sotto la pill: titolo + elenco orari (stesso elenco del footer). */
  function renderStatusPanel() {
    if (!statusPanelEl) return;
    statusPanelEl.textContent = "";
    var list = buildHoursList();
    if (!list) return;
    statusPanelEl.appendChild(el("p", { class: "status-panel__title", text: t("hoursTitle") }));
    statusPanelEl.appendChild(list);
  }

  /** Testo orario di un giorno: "07:30–24:00" oppure "chiuso". */
  function slotText(slot) {
    return slot ? shownTime(slot.open, false) + "–" + shownTime(slot.close, true) : t("closedDay");
  }

  /** Elenco orari (dl): giorni consecutivi con orari identici raggruppati ("Mar–Mer 07:30–23:00"); null senza orari. */
  function buildHoursList() {
    var hours = weekHours();
    if (!hours) return null;
    var today = currentDay();
    var rows = [];
    var start = 0;
    while (start < 7) {
      var end = start;
      while (end + 1 < 7 && slotText(hours[end + 1]) === slotText(hours[start])) end++;
      var label = start === end ? dayName(start, "short") : dayName(start, "short") + "–" + dayName(end, "short");
      var isToday = today >= start && today <= end;
      rows.push(el("div", { class: isToday ? "hours__row hours__row--today" : "hours__row", "aria-current": isToday ? "date" : null }, [
        el("dt", { text: label }),
        el("dd", { text: slotText(hours[start]) })
      ]));
      start = end + 1;
    }
    return el("dl", { class: "hours__list" }, rows);
  }

  /** Orari nel footer. */
  function renderHours() {
    if (!hoursEl) return;
    var list = buildHoursList();
    hoursEl.textContent = "";
    hoursEl.hidden = !list;
    if (!list) return;
    hoursEl.appendChild(el("h2", { class: "hours__title visually-hidden", text: t("hoursTitle") }));
    hoursEl.appendChild(list);
  }

  // Pill = pulsante: apre/chiude il pannello; si chiude con clic fuori o Esc (listener registrati una volta sola)
  if (statusEl && statusPanelEl) {
    statusEl.addEventListener("click", function () {
      setStatusPanel(statusPanelEl.hidden);
    });
    document.addEventListener("click", function (e) {
      if (statusPanelEl.hidden) return;
      if (statusEl.contains(e.target) || statusPanelEl.contains(e.target)) return;
      setStatusPanel(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape" || statusPanelEl.hidden) return;
      setStatusPanel(false);
      statusEl.focus();
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
    renderStatus();
    renderStatusPanel();
    renderHours();
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
    if (allergenState.open) renderAllergenModal(allergenState.dish); // cambio lingua con pop-up allergeni aperto
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
  // Pill di stato e giorno evidenziato (pannello e footer) si aggiornano ogni minuto (senza ridisegnare il menu)
  window.setInterval(function () { renderStatus(); renderStatusPanel(); renderHours(); }, 60000);
})();
