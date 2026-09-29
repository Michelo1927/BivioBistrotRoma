/**
 * Bivio Bistrot — dati del menu
 * ---------------------------------------------------------------------------
 * Unico oggetto globale congelato: window.BIVIO_MENU (nessun modulo, nessun fetch:
 * il sito funziona aprendo index.html direttamente da file://).
 *
 * STRUTTURA
 *  - meta       : dati generali (nome, città, valuta, lingue, link di contatto).
 *  - ui         : stringhe dell'interfaccia per lingua ({ it: {...}, en: {...} }).
 *  - sections   : sezioni del menu, nell'ordine in cui compaiono come tab.
 *                 `type` decide il renderer: "food" | "wine" | "spirit".
 *                 Ogni sezione ha le sue `categories` (ordine = ordine di rendering).
 *  - dishes     : piatti   -> { id, name, description, price, category, image, placeholder }
 *  - wines      : vini     -> { id, name, winery, detail, vintage, abv (numero, es. 12.5), organic, bottlePrice, glassPrice, category }
 *  - spirits    : distillati -> { id, name, kind, price, category }
 *
 * COME AGGIUNGERE UN PIATTO
 *  Aggiungi un oggetto in `dishes` sotto il commento della categoria giusta.
 *  `id` deve essere univoco (kebab-case), `category` deve esistere nella sezione "cucina",
 *  `price` è un numero (euro). Lascia `description: ""` se non c'è descrizione.
 *
 * COME AGGIUNGERE UN VINO / UN DISTILLATO
 *  Aggiungi un oggetto in `wines` / `spirits` con `category` valida per la sezione "vini" / "distillati".
 *  Campi opzionali (winery, detail, vintage, kind) = null se assenti.
 *
 * LINGUE (IT / EN)
 *  L'italiano sta nei campi base (label, subtitle, name, description, detail, kind).
 *  Ogni section, category, dish, wine e spirit può avere un blocco opzionale
 *    en: { label, subtitle, name, description, detail, kind }
 *  con le sole traduzioni necessarie. Se `en` o un suo campo manca, si usa l'italiano.
 *  Le stringhe dell'interfaccia stanno in `ui.it` / `ui.en` (stesse chiavi in entrambe).
 *  Per aggiungere una lingua: aggiungila a meta.languages, crea ui.<lingua> e i blocchi <lingua>.
 *
 * LINK DI CONTATTO
 *  meta.links.maps / meta.links.whatsapp: URL https definitivi. Stringa vuota = pulsante "in arrivo".
 *
 * IMMAGINI DEI PIATTI
 *  Salva la foto come  assets/images/<category>/<id>.jpg  (rapporto 4:3, consigliato 1200x900 o 800x600, < 300 KB).
 *  Una cartella per categoria (per-iniziare, per-continuare, per-finire, insieme-a, in-dolcezza);
 *  vini e distillati non hanno immagini. Nomi file in minuscolo (su hosting Linux sono case-sensitive).
 *  Il campo `image` è già preconfigurato con quel percorso; il file può non esistere ancora.
 *
 * CATENA DI FALLBACK DELLE IMMAGINI (gestita da script.js)
 *  1. `image`        -> foto locale assets/images/<category>/<id>.jpg
 *  2. `placeholder`  -> foto Unsplash tematica (se non null) quando la locale manca
 *  3. icona grafica  -> segnaposto SVG con lo stesso rapporto d'aspetto (nessun salto di layout)
 */
window.BIVIO_MENU = Object.freeze({
  meta: {
    name: "Bivio Bistrot", city: "Roma", currency: "EUR", locale: "it-IT",
    languages: ["it", "en"], defaultLanguage: "it",
    // Link di contatto: incolla qui gli URL definitivi. Stringa vuota = pulsante mostrato come "in arrivo" (non cliccabile).
    links: {
      maps: "https://maps.app.goo.gl/19F1xGau4LCWjnEJA",
      whatsapp: "https://wa.me/3780670878"   // es. "https://wa.me/39XXXXXXXXXX" (numero con prefisso, senza + né spazi)
    }
  },

  // Stringhe dell'interfaccia
  ui: {
    it: {
      tagline: "Cucina di stagione, vini e distillati", skip: "Vai al menu", navLabel: "Sezioni del menu",
      categoriesLabel: "Categorie", glass: "Calice", bottle: "Bottiglia", organic: "Bio",
      toTop: "Torna su", allergens: "Per allergie e intolleranze chiedi al nostro personale.",
      maps: "Mappa", whatsapp: "WhatsApp", comingSoon: "Link in arrivo",
      langLabel: "Lingua", unavailable: "Il menu non è al momento disponibile. Riprova tra qualche istante.",
      pageTitle: "Menu — Bivio Bistrot Roma",
      description: "Il menu di Bivio Bistrot a Roma: cucina di stagione, carta dei vini e distillati.",
      sections: "Sezioni",
      galleryPill: "Il locale", galleryOpen: "Guarda le foto del locale",
      close: "Chiudi", prev: "Foto precedente", next: "Foto successiva", openPhoto: "Apri foto"
    },
    en: {
      tagline: "Seasonal kitchen, wines and spirits", skip: "Skip to menu", navLabel: "Menu sections",
      categoriesLabel: "Categories", glass: "Glass", bottle: "Bottle", organic: "Organic",
      toTop: "Back to top", allergens: "For allergies and intolerances, please ask our staff.",
      maps: "Map", whatsapp: "WhatsApp", comingSoon: "Link coming soon",
      langLabel: "Language", unavailable: "The menu is currently unavailable. Please try again shortly.",
      pageTitle: "Menu — Bivio Bistrot Rome",
      description: "The Bivio Bistrot menu in Rome: seasonal kitchen, wine list and spirits.",
      sections: "Sections",
      galleryPill: "The place", galleryOpen: "See photos of the place",
      close: "Close", prev: "Previous photo", next: "Next photo", openPhoto: "Open photo"
    }
  },

  // Ordine = ordine di rendering. `type` decide il renderer.
  sections: [
    {
      id: "cucina", label: "Cucina", en: { label: "Kitchen" }, type: "food",
      categories: [
        { id: "per-iniziare", label: "Per Iniziare", en: { label: "To Start" } },
        { id: "per-continuare", label: "Per Continuare", en: { label: "To Continue" } },
        { id: "per-finire", label: "Per Finire", en: { label: "Mains" } },
        { id: "insieme-a", label: "Insieme A", subtitle: "Contorni", en: { label: "On the Side", subtitle: "Sides" } },
        { id: "in-dolcezza", label: "In Dolcezza", subtitle: "Dessert", en: { label: "Something Sweet", subtitle: "Desserts" } }
      ]
    },
    {
      id: "vini", label: "Carta dei Vini", en: { label: "Wine List" }, type: "wine",
      categories: [
        { id: "bianchi", label: "Bianchi", en: { label: "Whites" } },
        { id: "rossi", label: "Rossi", en: { label: "Reds" } },
        { id: "rose", label: "Rosé", en: { label: "Rosé" } },
        { id: "prosecco", label: "Prosecco D.O.C.G.", en: { label: "Prosecco D.O.C.G." } },
        { id: "bollicine", label: "Bollicine", en: { label: "Sparkling" } }
      ]
    },
    {
      id: "distillati", label: "Distillati & Spirits", en: { label: "Spirits" }, type: "spirit",
      categories: [
        { id: "amari", label: "Amari", en: { label: "Amari", subtitle: "Italian bitters" } },
        { id: "whiskey", label: "Whiskey", subtitle: "Tradizionali", en: { label: "Whiskey", subtitle: "Classics" } },
        { id: "premium", label: "Premium Spirits & Tonic", en: { label: "Premium Spirits & Tonic" } }
      ]
    }
  ],

  // ------------------------------------------------------------------ GALLERIA "IL LOCALE"
  // COME AGGIUNGERE UNA FOTO: metti l'originale in assets/images/locale/{esterni,interni,dettagli}/,
  // lancia `python tools/ottimizza-foto.py` (crea i derivati in locale/web/), poi aggiungi qui un oggetto:
  // { id, src (-1600), srcSmall (-800), width, height (del -1600), alt, caption, en: { alt, caption }, wide?: true }.
  // `wide: true` fa occupare due colonne (solo per foto orizzontali). Ordine = ordine in pagina.
  gallery: [
    {
      id: "esterni-terrazzino", src: "assets/images/locale/web/esterni-terrazzino-1600.jpg", srcSmall: "assets/images/locale/web/esterni-terrazzino-800.jpg",
      width: 1200, height: 1600, alt: "Tavolo apparecchiato sul terrazzino tra le piante", caption: "Il terrazzino",
      en: { alt: "Table set on the terrace among the plants", caption: "The terrace" }
    },
    {
      id: "interni-cucina-a-vista-3", src: "assets/images/locale/web/interni-cucina-a-vista-3-1600.jpg", srcSmall: "assets/images/locale/web/interni-cucina-a-vista-3-800.jpg",
      width: 1600, height: 1200, alt: "Bancone in mosaico davanti alla cucina a vista", caption: "La cucina a vista",
      en: { alt: "Mosaic counter in front of the open kitchen", caption: "The open kitchen" }, wide: true
    },
    {
      id: "interni-tavolo-con-piatti", src: "assets/images/locale/web/interni-tavolo-con-piatti-1600.jpg", srcSmall: "assets/images/locale/web/interni-tavolo-con-piatti-800.jpg",
      width: 1200, height: 1600, alt: "Due piatti di pasta al pomodoro su un tavolo apparecchiato", caption: "A tavola",
      en: { alt: "Two plates of tomato pasta on a set table", caption: "At the table" }
    },
    {
      id: "interni-cucina-a-vista-2", src: "assets/images/locale/web/interni-cucina-a-vista-2-1600.jpg", srcSmall: "assets/images/locale/web/interni-cucina-a-vista-2-800.jpg",
      width: 1200, height: 1600, alt: "Sgabelli al bancone con la cucina alle spalle", caption: "Il bancone",
      en: { alt: "Stools at the counter with the kitchen behind", caption: "The counter" }
    },
    {
      id: "interni-tavoli-al-buio", src: "assets/images/locale/web/interni-tavoli-al-buio-1600.jpg", srcSmall: "assets/images/locale/web/interni-tavoli-al-buio-800.jpg",
      width: 1200, height: 1600, alt: "Tavoli apparecchiati alla luce delle candele", caption: "La sera",
      en: { alt: "Tables set by candlelight", caption: "In the evening" }
    },
    {
      id: "interni-tavolo-con-piatto", src: "assets/images/locale/web/interni-tavolo-con-piatto-1600.jpg", srcSmall: "assets/images/locale/web/interni-tavolo-con-piatto-800.jpg",
      width: 1200, height: 1600, alt: "Pasta al pomodoro con formaggio grattugiato", caption: "Dalla cucina",
      en: { alt: "Tomato pasta with grated cheese", caption: "From the kitchen" }
    },
    {
      id: "interni-cucina-a-vista", src: "assets/images/locale/web/interni-cucina-a-vista-1600.jpg", srcSmall: "assets/images/locale/web/interni-cucina-a-vista-800.jpg",
      width: 1200, height: 1600, alt: "Piatto servito sul bancone davanti alla cucina", caption: "Al bancone",
      en: { alt: "Dish served at the counter in front of the kitchen", caption: "At the counter" }
    }
  ],

  // ------------------------------------------------------------------ CUCINA
  dishes: [
    // --- Per Iniziare
    {
      id: "uovo-croccante", name: "Uovo croccante",
      description: "Dal cuore morbido, su fonduta di parmigiano al profumo di limone",
      price: 15, category: "per-iniziare", image: "assets/images/per-iniziare/uovo-croccante.jpg",
      en: { name: "Crispy egg", description: "Soft-centred, on Parmigiano fondue scented with lemon" },
      placeholder: "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=800&h=600&q=70"
    },
    {
      id: "millefoglie-melanzane", name: "Millefoglie di melanzane", description: "",
      price: 15, category: "per-iniziare", image: "assets/images/per-iniziare/millefoglie-melanzane.jpg",
      en: { name: "Aubergine millefeuille", description: "" },
      placeholder: "https://images.unsplash.com/photo-1632229095740-8c75082087c5?auto=format&fit=crop&w=800&h=600&q=70"
    },
    {
      id: "burrata", name: "Burrata", description: "Pomodorini confit, basilico e olio EVO",
      price: 13, category: "per-iniziare", image: "assets/images/per-iniziare/burrata.jpg",
      en: { name: "Burrata", description: "Confit cherry tomatoes, basil and extra virgin olive oil" },
      placeholder: "https://images.unsplash.com/photo-1555072930-714bba1d24e2?auto=format&fit=crop&w=800&h=600&q=70"
    },
    {
      id: "pane-burro-alici", name: "Pane, burro e alici", description: "Alici del Cantabrico",
      price: 18, category: "per-iniziare", image: "assets/images/per-iniziare/pane-burro-alici.jpg",
      en: { name: "Bread, butter and anchovies", description: "Cantabrian anchovies" },
      placeholder: "https://images.unsplash.com/photo-1560174122-cac0c0bdacc6?auto=format&fit=crop&w=800&h=600&q=70"
    },
    {
      id: "arancino", name: "Arancino della chef", description: "",
      price: 7, category: "per-iniziare", image: "assets/images/per-iniziare/arancino.jpg",
      en: { name: "Chef's arancino", description: "" },
      placeholder: "https://images.unsplash.com/photo-1688458296759-91020b4ff2ba?auto=format&fit=crop&w=800&h=600&q=70"
    },

    // --- Per Continuare
    {
      id: "mezze-maniche-norma", name: "Mezze maniche alla Norma", description: "",
      price: 18, category: "per-continuare", image: "assets/images/per-continuare/mezze-maniche-norma.jpg",
      en: { name: "Mezze maniche alla Norma", description: "" },
      placeholder: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?auto=format&fit=crop&w=800&h=600&q=70"
    },
    {
      id: "gnocchetti-pistacchio", name: "Gnocchetti al pesto di pistacchio",
      description: "Pistacchio di Bronte, guanciale e granella di pistacchio",
      price: 20, category: "per-continuare", image: "assets/images/per-continuare/gnocchetti-pistacchio.jpg",
      en: { name: "Gnocchetti with pistachio pesto", description: "Bronte pistachio, guanciale and crushed pistachios" },
      placeholder: "https://images.unsplash.com/photo-1584434127023-0c7135f8f18c?auto=format&fit=crop&w=800&h=600&q=70"
    },
    {
      id: "tonnarello", name: "Tonnarello", description: "Pomodorino confit e stracciatella",
      price: 20, category: "per-continuare", image: "assets/images/per-continuare/tonnarello.jpg",
      en: { name: "Tonnarello", description: "Confit cherry tomatoes and stracciatella" },
      placeholder: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=800&h=600&q=70"
    },
    {
      id: "piatto-del-giorno", name: "Piatto del giorno",
      description: "Chiedi al personale la proposta di oggi",
      price: 20, category: "per-continuare", image: "assets/images/per-continuare/piatto-del-giorno.jpg",
      en: { name: "Dish of the day", description: "Ask our staff for today's special" },
      placeholder: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&h=600&q=70"
    },

    // --- Per Finire
    {
      id: "tagliata-pollo", name: "Tagliata di pollo", description: "Glassata al miele, senape e limone",
      price: 25, category: "per-finire", image: "assets/images/per-finire/tagliata-pollo.jpg",
      en: { name: "Sliced chicken", description: "Glazed with honey, mustard and lemon" },
      placeholder: "https://images.unsplash.com/photo-1675984491214-609854c3ab8d?auto=format&fit=crop&w=800&h=600&q=70"
    },
    {
      id: "tartare-fassona", name: "Tartare di fassona / scottona", description: "Con mango e mayo-senape",
      price: 22, category: "per-finire", image: "assets/images/per-finire/tartare-fassona.jpg",
      en: { name: "Fassona / Scottona beef tartare", description: "With mango and mustard mayo" },
      placeholder: "https://images.unsplash.com/photo-1770210627300-d4fa9b75dbb7?auto=format&fit=crop&w=800&h=600&q=70"
    },
    {
      id: "entrecote", name: "Entrecôte danese ai ferri", description: "Con patate al rosmarino",
      price: 28, category: "per-finire", image: "assets/images/per-finire/entrecote.jpg",
      en: { name: "Grilled Danish entrecôte", description: "With rosemary potatoes" },
      placeholder: "https://images.unsplash.com/photo-1600891964092-4316c288032e?auto=format&fit=crop&w=800&h=600&q=70"
    },
    {
      id: "guancia-brasata", name: "Guancia brasata", description: "Con purè al parmigiano",
      price: 28, category: "per-finire", image: "assets/images/per-finire/guancia-brasata.jpg",
      en: { name: "Braised beef cheek", description: "With Parmigiano mash" },
      placeholder: "https://images.unsplash.com/photo-1769773183948-d24e3c5a2b82?auto=format&fit=crop&w=800&h=600&q=70"
    },

    // --- Insieme A (contorni)
    {
      id: "broccoletti", name: "Broccoletti saltati", description: "",
      price: 8, category: "insieme-a", image: "assets/images/insieme-a/broccoletti.jpg",
      en: { name: "Sautéed broccoli rabe", description: "" },
      placeholder: "https://images.unsplash.com/photo-1732185370983-14bb41f68e47?auto=format&fit=crop&w=800&h=600&q=70"
    },
    {
      id: "cicoria", name: "Cicoria saltata", description: "",
      price: 8, category: "insieme-a", image: "assets/images/insieme-a/cicoria.jpg",
      en: { name: "Sautéed chicory", description: "" },
      placeholder: "https://images.unsplash.com/photo-1732185370983-14bb41f68e47?auto=format&fit=crop&w=800&h=600&q=70"
    },
    {
      id: "verdure-griglia", name: "Verdure di stagione alla griglia", description: "",
      price: 8, category: "insieme-a", image: "assets/images/insieme-a/verdure-griglia.jpg",
      en: { name: "Grilled seasonal vegetables", description: "" },
      placeholder: "https://images.unsplash.com/photo-1625944227313-4f7f68e6b3fa?auto=format&fit=crop&w=800&h=600&q=70"
    },

    // --- In Dolcezza (dessert)
    {
      id: "cannolo", name: "Cannolo siciliano", description: "",
      price: 8, category: "in-dolcezza", image: "assets/images/in-dolcezza/cannolo.jpg",
      en: { name: "Sicilian cannolo", description: "" },
      placeholder: "https://images.unsplash.com/photo-1752079432431-43f97209f979?auto=format&fit=crop&w=800&h=600&q=70"
    },
    {
      id: "cheesecake", name: "Cheesecake", description: "",
      price: 8, category: "in-dolcezza", image: "assets/images/in-dolcezza/cheesecake.jpg",
      en: { name: "Cheesecake", description: "" },
      placeholder: "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=800&h=600&q=70"
    }
  ],

  // -------------------------------------------------------------------- VINI
  wines: [
    // --- Bianchi
    { id: "traminer", name: "Traminer", winery: "Torre Rosazza", detail: null, vintage: null, abv: 12, organic: false, bottlePrice: 40, glassPrice: 8, category: "bianchi" },
    { id: "pecorino", name: "Pecorino", winery: "Tenuta Tre Gemme", detail: null, vintage: null, abv: 13, organic: true, bottlePrice: 45, glassPrice: 8, category: "bianchi" },
    { id: "ribolla-gialla", name: "Ribolla Gialla", winery: "Torre Rosazza", detail: null, vintage: null, abv: 13, organic: false, bottlePrice: 45, glassPrice: 8, category: "bianchi" },
    { id: "gavi", name: "Gavi", winery: "Bricco dei Guazzi", detail: null, vintage: null, abv: 12.5, organic: false, bottlePrice: 50, glassPrice: 8, category: "bianchi" },

    // --- Rossi
    { id: "valpolicella", name: "Valpolicella", winery: "Costa Arente", detail: "Valpantena Superiore", vintage: "2021", abv: 13.5, organic: false, bottlePrice: 45, glassPrice: 8, category: "rossi" },
    { id: "barbera-asti", name: "Barbera d'Asti", winery: "Bricco dei Guazzi", detail: null, vintage: null, abv: 14, organic: false, bottlePrice: 50, glassPrice: 8, category: "rossi" },

    // --- Rosé
    { id: "bandolo-matassa", name: "Bandolo della Matassa", winery: "Cantina Le Macchie", detail: null, vintage: null, abv: 13, organic: false, bottlePrice: 55, glassPrice: 12, category: "rose" },

    // --- Prosecco D.O.C.G.
    { id: "v8-valdobbiadene", name: "V8 Valdobbiadene Superiore Extra Dry", winery: "Metodo Martinelli", detail: null, vintage: null, abv: 11, organic: false, bottlePrice: 55, glassPrice: 8, category: "prosecco" },
    { id: "v8-extra-dry", name: "V8 Extra Dry", winery: null, detail: null, vintage: null, abv: 11, organic: false, bottlePrice: 50, glassPrice: 8, category: "prosecco" },
    { id: "v8-brut", name: "V8 Brut", winery: null, detail: null, vintage: null, abv: 11.5, organic: false, bottlePrice: 45, glassPrice: 8, category: "prosecco" },
    { id: "strappo-regola", name: "Strappo alla Regola", winery: "Cantina Le Macchie", detail: "Millesimato Rosé", vintage: null, abv: 12.5, organic: false, bottlePrice: 60, glassPrice: 13, category: "prosecco", en: { detail: "Vintage Rosé" } },

    // --- Bollicine
    { id: "franciacorta-barone", name: "Franciacorta", winery: "Barone di Erbusco", detail: null, vintage: null, abv: 12.5, organic: false, bottlePrice: 65, glassPrice: 15, category: "bollicine" },
    { id: "franciacorta-buizza", name: "Franciacorta", winery: "Benedetta Buizza Martinelli", detail: null, vintage: null, abv: 12.5, organic: false, bottlePrice: 65, glassPrice: 15, category: "bollicine" }
  ],

  // -------------------------------------------------------------- DISTILLATI
  spirits: [
    // --- Amari
    { id: "montenegro", name: "Montenegro", kind: null, price: 6, category: "amari" },
    { id: "averna", name: "Averna", kind: null, price: 6, category: "amari" },
    { id: "jagermeister", name: "Jägermeister", kind: null, price: 6, category: "amari" },
    { id: "fernet-branca", name: "Fernet Branca", kind: null, price: 6, category: "amari" },
    { id: "branca-menta", name: "Branca Menta", kind: null, price: 6, category: "amari" },
    { id: "amaro-del-capo", name: "Amaro del Capo", kind: null, price: 6, category: "amari" },
    { id: "amaro-lucano", name: "Amaro Lucano", kind: null, price: 6, category: "amari" },
    { id: "limoncello", name: "Limoncello", kind: null, price: 6, category: "amari" },

    // --- Whiskey
    { id: "jb", name: "J&B", kind: "Whisky", price: 10, category: "whiskey" },
    { id: "jim-beam-white", name: "Jim Beam White", kind: "Bourbon", price: 10, category: "whiskey" },
    { id: "jim-beam-rye", name: "Jim Beam Rye", kind: "Rye Whiskey", price: 10, category: "whiskey" },

    // --- Premium Spirits & Tonic
    { id: "oban-14", name: "Oban 14 anni", kind: "Whisky", price: 15, category: "premium", en: { name: "Oban 14 Year Old" } },
    { id: "talisker-10", name: "Talisker 10 anni", kind: "Whisky", price: 15, category: "premium", en: { name: "Talisker 10 Year Old" } },
    { id: "zacapa-23", name: "Zacapa 23", kind: "Rum", price: 17, category: "premium" },
    { id: "beluga-tonic", name: "Beluga Noble Tonic", kind: "Vodka", price: 17, category: "premium" },
    { id: "belvedere-tonic", name: "Belvedere Tonic", kind: "Vodka", price: 15, category: "premium" },
    { id: "grey-goose-tonic", name: "Grey Goose Tonic", kind: "Vodka", price: 15, category: "premium" },
    { id: "monkey-47-tonic", name: "Monkey 47 Tonic", kind: "Gin", price: 18, category: "premium" },
    { id: "hendricks-tonic", name: "Hendrick's Tonic", kind: "Gin", price: 15, category: "premium" },
    { id: "malfy-rosa-tonic", name: "Malfy Pompelmo Rosa Tonic", kind: "Gin", price: 15, category: "premium", en: { name: "Malfy Pink Grapefruit Tonic" } },
    { id: "bombay-tonic", name: "Bombay Tonic", kind: "Gin", price: 15, category: "premium" },
    { id: "gin-mare-tonic", name: "Gin Mare Tonic", kind: "Gin", price: 15, category: "premium" },
    { id: "bulldog-tonic", name: "Bulldog Tonic", kind: "Gin", price: 15, category: "premium" }
  ]
});
