/**
 * Bivio Bistrot — dati del menu
 * ---------------------------------------------------------------------------
 * Unico oggetto globale congelato: window.BIVIO_MENU (nessun modulo, nessun fetch:
 * il sito funziona aprendo index.html direttamente da file://).
 *
 * STRUTTURA
 *  - meta       : dati generali (nome, città, valuta, lingue, link di contatto, orari `hours`).
 *  - ui         : stringhe dell'interfaccia per lingua ({ it: {...}, en: {...} }).
 *  - sections   : sezioni del menu, nell'ordine in cui compaiono come tab.
 *                 `type` decide il renderer: "food" | "list2" | "spirit".
 *                 Ogni sezione ha le sue `categories` (ordine = ordine di rendering).
 *                 "list2" = elenco a DUE prezzi (vini, caffetteria); la sezione dichiara:
 *                   source       : nome dell'array di voci da usare ("wines" | "cafe");
 *                   priceColumns : [{ key, label }, { key, label }] -> `key` = campo prezzo della voce,
 *                                  `label` = chiave `ui` dell'intestazione colonna (es. "glass", "counter").
 *                 Campo opzionale di sezione: `note` (riquadro informativo in cima alla scheda).
 *                 Campo opzionale di categoria: `firstFrom: "HH:MM"` = dalle HH:MM (ora di Roma) fino a
 *                 mezzanotte la categoria passa in prima posizione. Solo per debug: `?ora=HH:MM` nell'URL
 *                 forza l'ora (ignorato se malformato).
 *  - dishes     : piatti   -> { id, name, description, price (null = nessun prezzo mostrato), allergens, frozen?, category, image, placeholder }
 *  - allergens  : i 14 allergeni del regolamento UE 1169/2011 -> { id (1-14), name, en: { name } }
 *  - wines      : vini     -> { id, name, winery, detail, vintage, abv (numero, es. 12.5), organic, bottlePrice, glassPrice, category }
 *  - spirits    : distillati -> { id, name, kind, price, category }
 *  - cafe       : caffetteria -> { id, name, detail?, counterPrice (banco), tablePrice (tavolo), category, allergens?, link?, linkAsName? }
 *
 * COME AGGIUNGERE UN PIATTO
 *  Aggiungi un oggetto in `dishes` sotto il commento della categoria giusta.
 *  `id` deve essere univoco (kebab-case), `category` deve esistere nella sezione "cucina",
 *  `price` è un numero (euro). Lascia `description: ""` se non c'è descrizione.
 *
 * ALLERGENI E PRODOTTI GELO (solo piatti)
 *  `allergens` sul piatto:
 *    - array di id (1-14, vedi `allergens`) = allergeni presenti, mostrati nell'ordine degli id;
 *    - []                                   = nessun allergene dichiarato (non si mostra nulla);
 *    - "chef"                               = allergeni comunicati separatamente in base alla ricetta della Chef;
 *    - "ask"                                = (caffetteria) nota "chiedi al personale" sotto la voce.
 *  `frozen: true` = prodotto gelo: un asterisco dopo il nome rimanda alla nota in fondo alla legenda.
 *
 * COLLEGAMENTO INTERNO DI UNA VOCE (`link`, opzionale, righe a due prezzi)
 *  link: { section, category, label } -> sotto il nome compare un collegamento "label" (corsivo, sottolineato) che porta
 *  alla categoria `category` della sezione `section` (es. { section: "distillati", category: "amari", label: "seeSelection" }).
 *  `section` e `category` sono id esistenti; `label` è una chiave di `ui` (tradotta in IT/EN). L'href è "#section/category".
 *  linkAsName: true (opzionale, accanto a `link`) -> il collegamento prende il posto del nome nella riga: il nome resta
 *  solo per gli screen reader e il link sta nell'intestazione, prima del leader ("label ········ prezzi").
 *
 * COME AGGIUNGERE UN VINO / UN DISTILLATO
 *  Aggiungi un oggetto in `wines` / `spirits` / `cafe` con `category` valida per la sezione "vini" / "distillati" / "caffetteria".
 *  Campi opzionali (winery, detail, vintage, kind) = null se assenti.
 *
 * LINGUE (IT / EN)
 *  L'italiano sta nei campi base (label, subtitle, name, description, detail, kind).
 *  Ogni section, category, dish, wine, spirit e voce cafe può avere un blocco opzionale
 *    en: { label, subtitle, note, name, description, detail, kind }
 *  con le sole traduzioni necessarie. Se `en` o un suo campo manca, si usa l'italiano.
 *  Le stringhe dell'interfaccia stanno in `ui.it` / `ui.en` (stesse chiavi in entrambe).
 *  Per aggiungere una lingua: aggiungila a meta.languages, crea ui.<lingua> e i blocchi <lingua>.
 *
 * ORARI
 *  meta.hours: 7 elementi, da lunedì (indice 0) a domenica (indice 6). Ogni elemento è
 *  { open: "HH:MM", close: "HH:MM" } oppure null = chiuso tutto il giorno.
 *  Se close <= open la chiusura è dopo mezzanotte (giorno successivo): es. 11:30-02:00.
 *  Alimenta la pill di stato nell'header e l'elenco orari nel footer (orari di Roma).
 *  Solo per debug: `?ora=HH:MM` e `?giorno=1..7` (1 = lunedì) nell'URL forzano ora e giorno.
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
    // Orari di apertura, lunedì -> domenica (indice 0 = lunedì). null = chiuso tutto il giorno.
    // close <= open = chiusura dopo mezzanotte (es. sabato 11:30-02:00 chiude alle 02:00 di domenica).
    hours: [
      { open: "07:30", close: "22:00" }, // lun
      { open: "07:30", close: "23:00" }, // mar
      { open: "07:30", close: "23:00" }, // mer
      { open: "07:30", close: "00:00" }, // gio
      { open: "07:30", close: "01:00" }, // ven
      { open: "11:30", close: "02:00" }, // sab
      { open: "11:30", close: "22:00" }  // dom
    ],
    // Link di contatto: incolla qui gli URL definitivi. Stringa vuota = pulsante mostrato come "in arrivo" (non cliccabile).
    links: {
      maps: "https://maps.app.goo.gl/19F1xGau4LCWjnEJA",
      whatsapp: "https://wa.me/393780670878"  // es. "https://wa.me/39XXXXXXXXXX" (numero con prefisso, senza + né spazi)
    }
  },

  // Stringhe dell'interfaccia
  ui: {
    it: {
      tagline: "Cucina di stagione, vini e distillati", skip: "Vai al menu", navLabel: "Sezioni del menu",
      categoriesLabel: "Categorie", glass: "Calice", bottle: "Bottiglia", counter: "Banco", table: "Tavolo", organic: "Bio",
      toTop: "Torna su", allergens: "Per allergie e intolleranze chiedi al nostro personale.",
      maps: "Mappa", whatsapp: "WhatsApp", comingSoon: "Link in arrivo",
      langLabel: "Lingua", unavailable: "Il menu non è al momento disponibile. Riprova tra qualche istante.",
      pageTitle: "Menu — Bivio Bistrot Roma",
      description: "Il menu di Bivio Bistrot a Roma: cucina di stagione, carta dei vini e distillati.",
      sections: "Sezioni",
      galleryPill: "Il locale", galleryOpen: "Guarda le foto del locale",
      close: "Chiudi", prev: "Foto precedente", next: "Foto successiva", openPhoto: "Apri foto",
      allergensTitle: "Allergeni", allergensLabel: "Allergeni", allergensInfoTitle: "Informazioni sugli allergeni",
      allergensChef: "Allergeni comunicati separatamente in base alla ricetta della Chef",
      frozenNote: "Prodotto gelo: i prodotti alimentari freschi e/o preparati nel nostro laboratorio possono subire una corretta procedura di abbattimento e rinvenimento per garantire un prodotto sempre di alta qualità.",
      allergyAsk: "Per favore comunica qualsiasi allergia al personale.",
      allergensAsk: "Allergeni: chiedi al personale",
      frozenMark: "Prodotto gelo",
      seeSelection: "vedi la selezione in Distillati",
      hoursTitle: "Orari", openNow: "Aperto", closedNow: "Chiuso",
      closesAt: "chiude alle {t}", opensAt: "apre alle {t}", opensTomorrow: "apre domani alle {t}",
      opensOn: "apre {d} alle {t}", closedDay: "chiuso"
    },
    en: {
      tagline: "Seasonal kitchen, wines and spirits", skip: "Skip to menu", navLabel: "Menu sections",
      categoriesLabel: "Categories", glass: "Glass", bottle: "Bottle", counter: "Bar", table: "Table", organic: "Organic",
      toTop: "Back to top", allergens: "For allergies and intolerances, please ask our staff.",
      maps: "Map", whatsapp: "WhatsApp", comingSoon: "Link coming soon",
      langLabel: "Language", unavailable: "The menu is currently unavailable. Please try again shortly.",
      pageTitle: "Menu — Bivio Bistrot Rome",
      description: "The Bivio Bistrot menu in Rome: seasonal kitchen, wine list and spirits.",
      sections: "Sections",
      galleryPill: "The place", galleryOpen: "See photos of the place",
      close: "Close", prev: "Previous photo", next: "Next photo", openPhoto: "Open photo",
      allergensTitle: "Allergens", allergensLabel: "Allergens", allergensInfoTitle: "Allergen information",
      allergensChef: "Allergens provided separately, based on the Chef's recipe",
      frozenNote: "Frozen product: fresh food and/or products made in our kitchen may undergo a proper blast-chilling and thawing process to guarantee consistently high quality.",
      allergyAsk: "Please let our staff know about any allergies.",
      allergensAsk: "Allergens: please ask our staff",
      frozenMark: "Frozen product",
      seeSelection: "see the selection in Spirits",
      hoursTitle: "Opening hours", openNow: "Open", closedNow: "Closed",
      closesAt: "closes at {t}", opensAt: "opens at {t}", opensTomorrow: "opens tomorrow at {t}",
      opensOn: "opens {d} at {t}", closedDay: "closed"
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
      id: "vini", label: "Cantina", en: { label: "Wine List" }, type: "list2",
      source: "wines", priceColumns: [{ key: "glassPrice", label: "glass" }, { key: "bottlePrice", label: "bottle" }],
      categories: [
        { id: "prosecco", label: "Prosecco DOC", en: { label: "Prosecco DOC" } },
        { id: "bollicine", label: "Bollicine", en: { label: "Sparkling" } },
        { id: "bianchi", label: "Bianchi", en: { label: "Whites" } },
        { id: "rose", label: "Rosé", en: { label: "Rosé" } },
        { id: "rossi", label: "Rossi", en: { label: "Reds" } }
      ]
    },
    {
      id: "distillati", label: "Distillati", en: { label: "Spirits" }, type: "spirit",
      categories: [
        { id: "amari", label: "Amari", en: { label: "Amari", subtitle: "Italian bitters" } },
        { id: "whiskey", label: "Whiskey", subtitle: "Tradizionali", en: { label: "Whiskey", subtitle: "Classics" } },
        { id: "premium", label: "Premium Spirits & Tonic", en: { label: "Premium Spirits & Tonic" } }
      ]
    },
    {
      id: "caffetteria", label: "Caffetteria", en: { label: "Café", note: "The table surcharge also applies when seated without table service." },
      type: "list2", source: "cafe", priceColumns: [{ key: "counterPrice", label: "counter" }, { key: "tablePrice", label: "table" }],
      note: "La maggiorazione al tavolo verrà applicata anche per l'utilizzo senza il servizio",
      categories: [
        { id: "caffe", label: "Caffè", en: { label: "Coffee" } },
        { id: "latte-cappuccini", label: "Latte e cappuccini", en: { label: "Milk & cappuccino" } },
        { id: "cioccolata-infusi", label: "Cioccolata e infusi", en: { label: "Hot chocolate & infusions" } },
        { id: "dolci-lieviti", label: "Dolci e lieviti", en: { label: "Pastries & cakes" } },
        { id: "bibite", label: "Bibite", en: { label: "Soft drinks" }, firstFrom: "11:00" },
        { id: "amari-caffetteria", label: "Amari", en: { label: "Amari" } }
      ]
    }
  ],

  // ------------------------------------------------------------------ GALLERIA "IL LOCALE"
  // COME AGGIUNGERE UNA FOTO: metti l'originale in assets/images/locale/{esterni,interni,dettagli}/,
  // lancia `python tools/ottimizza-foto.py` (crea i derivati in locale/web/), poi aggiungi qui un oggetto:
  // { id, src (-1600), srcSmall (-800), width, height (del -1600), alt, caption, en: { alt, caption } }.
  // width/height (del -1600) servono a script.js per scegliere tra -800 e -1600 in base allo schermo. Ordine = ordine in pagina.
  gallery: [
    {
      id: "esterni-terrazzino", src: "assets/images/locale/web/esterni-terrazzino-1600.jpg", srcSmall: "assets/images/locale/web/esterni-terrazzino-800.jpg",
      width: 1200, height: 1600, alt: "Tavolo apparecchiato sul terrazzino tra le piante", caption: "Il terrazzino",
      en: { alt: "Table set on the terrace among the plants", caption: "The terrace" }
    },
    {
      id: "interni-cucina-a-vista-3", src: "assets/images/locale/web/interni-cucina-a-vista-3-1600.jpg", srcSmall: "assets/images/locale/web/interni-cucina-a-vista-3-800.jpg",
      width: 1600, height: 1200, alt: "Bancone in mosaico davanti alla cucina a vista", caption: "La cucina a vista",
      en: { alt: "Mosaic counter in front of the open kitchen", caption: "The open kitchen" }
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

  // ------------------------------------------------------------------ ALLERGENI
  // I 14 allergeni da dichiarare secondo il regolamento UE 1169/2011. L'id è il numero ufficiale
  // usato da `dish.allergens`; l'ordine dell'array è l'ordine della legenda.
  allergens: [
    { id: 1,  name: "Glutine",                       en: { name: "Gluten" } },
    { id: 2,  name: "Crostacei",                     en: { name: "Crustaceans" } },
    { id: 3,  name: "Uova",                          en: { name: "Eggs" } },
    { id: 4,  name: "Pesce",                         en: { name: "Fish" } },
    { id: 5,  name: "Arachidi",                      en: { name: "Peanuts" } },
    { id: 6,  name: "Soia",                          en: { name: "Soy" } },
    { id: 7,  name: "Latte",                         en: { name: "Milk" } },
    { id: 8,  name: "Frutta a guscio",               en: { name: "Tree nuts" } },
    { id: 9,  name: "Sedano",                        en: { name: "Celery" } },
    { id: 10, name: "Senape",                        en: { name: "Mustard" } },
    { id: 11, name: "Semi di sesamo",                en: { name: "Sesame seeds" } },
    { id: 12, name: "Anidride solforosa e solfiti",  en: { name: "Sulphur dioxide and sulphites" } },
    { id: 13, name: "Lupini",                        en: { name: "Lupin" } },
    { id: 14, name: "Molluschi",                     en: { name: "Molluscs" } }
  ],

  // ------------------------------------------------------------------ CUCINA
  dishes: [
    // --- Per Iniziare
    {
      id: "uovo-croccante", name: "Uovo croccante",
      description: "Dal cuore morbido, su fonduta di Parmigiano al profumo di limone",
      price: 15, allergens: [1, 3, 7], category: "per-iniziare", image: "assets/images/per-iniziare/uovo-croccante.jpg",
      en: { name: "Crispy egg", description: "Soft-centred, on Parmigiano fondue scented with lemon" },
      // DEMO: foto Unsplash d'esempio, da togliere quando c'è la foto vera
      placeholder: "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=800&h=600&q=70"
    },
    {
      id: "millefoglie-melanzane", name: "Millefoglie di melanzane", description: "",
      price: 13, allergens: [3, 5, 8, 9], category: "per-iniziare", image: "assets/images/per-iniziare/millefoglie-melanzane.jpg",
      en: { name: "Aubergine millefeuille", description: "" },
      // DEMO: foto Unsplash d'esempio, da togliere quando c'è la foto vera
      placeholder: "https://images.unsplash.com/photo-1632229095740-8c75082087c5?auto=format&fit=crop&w=800&h=600&q=70"
    },
    {
      id: "burrata", name: "Burrata", description: "Pomodorini confit, basilico e olio EVO",
      price: 13, allergens: [7, 8], category: "per-iniziare", image: "assets/images/per-iniziare/burrata.jpg",
      en: { name: "Burrata", description: "Confit cherry tomatoes, basil and extra virgin olive oil" },
      placeholder: null
    },
    {
      id: "pane-burro-alici", name: "Pane, burro e alici", description: "Alici del Cantabrico",
      price: 18, allergens: [1, 4, 7], category: "per-iniziare", image: "assets/images/per-iniziare/pane-burro-alici.jpg",
      en: { name: "Bread, butter and anchovies", description: "Cantabrian anchovies" },
      placeholder: null
    },
    {
      id: "arancino", name: "Arancino della Chef", description: "",
      price: 7, allergens: "chef", category: "per-iniziare", image: "assets/images/per-iniziare/arancino.jpg",
      en: { name: "Chef's arancino", description: "" },
      placeholder: null
    },

    // --- Per Continuare
    {
      id: "mezze-maniche-norma", name: "Mezze maniche alla Norma", description: "",
      price: 18, allergens: [1, 7, 8], category: "per-continuare", image: "assets/images/per-continuare/mezze-maniche-norma.jpg",
      en: { name: "Mezze maniche alla Norma", description: "" },
      placeholder: null
    },
    {
      id: "gnocchetti-pistacchio", name: "Gnocchetti al pesto di pistacchio",
      description: "Pistacchio di Bronte, guanciale e granella di pistacchio",
      price: 20, allergens: [1, 7, 8], category: "per-continuare", image: "assets/images/per-continuare/gnocchetti-pistacchio.jpg",
      en: { name: "Gnocchetti with pistachio pesto", description: "Bronte pistachio, guanciale and crushed pistachios" },
      placeholder: null
    },
    {
      id: "tonnarello", name: "Tonnarello", description: "Pomodorino confit e stracciatella",
      price: 20, allergens: [1, 3, 7], category: "per-continuare", image: "assets/images/per-continuare/tonnarello.jpg",
      en: { name: "Tonnarello", description: "Confit cherry tomatoes and stracciatella" },
      placeholder: null
    },
    {
      id: "piatto-del-giorno", name: "Piatto del giorno",
      description: "Chiedi al personale la proposta di oggi",
      price: null, allergens: "chef", category: "per-continuare", image: "assets/images/per-continuare/piatto-del-giorno.jpg",
      en: { name: "Dish of the day", description: "Ask our staff for today's special" },
      placeholder: null
    },

    // --- Per Finire
    {
      id: "tagliata-pollo", name: "Tagliata di pollo", description: "Glassata al miele, senape e limone",
      price: 25, allergens: [10, 12], category: "per-finire", image: "assets/images/per-finire/tagliata-pollo.jpg",
      en: { name: "Sliced chicken", description: "Glazed with honey, mustard and lemon" },
      placeholder: null
    },
    {
      id: "tartare-fassona", name: "Tartare di fassona / scottona", description: "Con mango e mayo-senape",
      price: 22, allergens: [3, 10, 12], frozen: true, category: "per-finire", image: "assets/images/per-finire/tartare-fassona.jpg",
      en: { name: "Fassona / Scottona beef tartare", description: "With mango and mustard mayo" },
      placeholder: null
    },
    {
      id: "entrecote", name: "Entrecôte danese ai ferri", description: "Con patate al rosmarino",
      price: 22, allergens: [12], category: "per-finire", image: "assets/images/per-finire/entrecote.jpg",
      en: { name: "Grilled Danish entrecôte", description: "With rosemary potatoes" },
      placeholder: null
    },
    {
      id: "guancia-brasata", name: "Guancia brasata", description: "Con purè al Parmigiano",
      price: 28, allergens: [7], category: "per-finire", image: "assets/images/per-finire/guancia-brasata.jpg",
      en: { name: "Braised beef cheek", description: "With Parmigiano mash" },
      placeholder: null
    },

    // --- Insieme A (contorni)
    {
      id: "broccoletti", name: "Broccoletti saltati", description: "",
      price: 8, allergens: [], category: "insieme-a", image: "assets/images/insieme-a/broccoletti.jpg",
      en: { name: "Sautéed broccoli rabe", description: "" },
      placeholder: null
    },
    {
      id: "cicoria", name: "Cicoria saltata", description: "",
      price: 8, allergens: [], category: "insieme-a", image: "assets/images/insieme-a/cicoria.jpg",
      en: { name: "Sautéed chicory", description: "" },
      placeholder: null
    },
    {
      id: "verdure-griglia", name: "Verdura di stagione alla griglia", description: "",
      price: 8, allergens: [], category: "insieme-a", image: "assets/images/insieme-a/verdure-griglia.jpg",
      en: { name: "Grilled seasonal vegetables", description: "" },
      placeholder: null
    },

    // --- In Dolcezza (dessert)
    {
      id: "cannolo", name: "Cannolo siciliano", description: "",
      price: 8, allergens: [1, 3, 7], frozen: true, category: "in-dolcezza", image: "assets/images/in-dolcezza/cannolo.jpg",
      en: { name: "Sicilian cannolo", description: "" },
      placeholder: null
    },
    {
      id: "cheesecake", name: "Cheesecake", description: "",
      price: 8, allergens: [1, 3, 7], category: "in-dolcezza", image: "assets/images/in-dolcezza/cheesecake.jpg",
      en: { name: "Cheesecake", description: "" },
      placeholder: null
    }
  ],

  // -------------------------------------------------------------------- VINI
  wines: [
    // --- Bianchi
    { id: "traminer", name: "Traminer", winery: "Torre Rosazza", detail: null, vintage: null, abv: 12, organic: false, bottlePrice: 40, glassPrice: 8, category: "bianchi" },
    { id: "pecorino", name: "Pecorino", winery: "Tenuta Tre Gemme", detail: null, vintage: null, abv: 13, organic: true, bottlePrice: 45, glassPrice: 8, category: "bianchi" },
    { id: "ribolla-gialla", name: "Ribolla Gialla", winery: "Torre Rosazza", detail: null, vintage: null, abv: 13, organic: false, bottlePrice: 45, glassPrice: 8, category: "bianchi" },
    { id: "gavi", name: "Gavi", winery: "Bricco dei Guazzi", detail: null, vintage: null, abv: 12.5, organic: false, bottlePrice: 45, glassPrice: 8, category: "bianchi" },

    // --- Rossi
    { id: "valpolicella", name: "Valpolicella", winery: "Costa Arente", detail: "Valpantena Superiore", vintage: "2021", abv: 13.5, organic: false, bottlePrice: 45, glassPrice: 8, category: "rossi" },
    { id: "barbera-asti", name: "Barbera d'Asti", winery: "Bricco dei Guazzi", detail: null, vintage: null, abv: 14, organic: false, bottlePrice: 50, glassPrice: 8, category: "rossi" },

    // --- Rosé
    { id: "bandolo-matassa", name: "Bandolo della Matassa", winery: "Cantina Le Macchie", detail: null, vintage: null, abv: 13, organic: false, bottlePrice: 55, glassPrice: 12, category: "rose" },

    // --- Prosecco DOC
    { id: "v8-valdobbiadene", name: "V8 Valdobbiadene Superiore Extra Dry", winery: "Metodo Martinelli", detail: null, vintage: null, abv: 11, organic: false, bottlePrice: 55, glassPrice: 8, category: "prosecco" },
    { id: "v8-extra-dry", name: "V8 Extra Dry", winery: null, detail: null, vintage: null, abv: 11, organic: false, bottlePrice: 50, glassPrice: 8, category: "prosecco" },
    { id: "v8-brut", name: "V8 Brut", winery: null, detail: null, vintage: null, abv: 11, organic: false, bottlePrice: 45, glassPrice: 8, category: "prosecco" },

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
    { id: "zacapa-23", name: "Zacapa", kind: "Rum", price: 17, category: "premium" },
    { id: "beluga-tonic", name: "Beluga Noble Tonic", kind: "Vodka", price: 17, category: "premium" },
    { id: "belvedere-tonic", name: "Belvedere Tonic", kind: "Vodka", price: 15, category: "premium" },
    { id: "grey-goose-tonic", name: "Grey Goose Tonic", kind: "Vodka", price: 15, category: "premium" },
    { id: "monkey-47-tonic", name: "Monkey 47 Tonic", kind: "Gin", price: 18, category: "premium" },
    { id: "hendricks-tonic", name: "Hendrick's Tonic", kind: "Gin", price: 15, category: "premium" },
    { id: "malfy-rosa-tonic", name: "Malfy Pompelmo Rosa Tonic", kind: "Gin", price: 15, category: "premium", en: { name: "Malfy Pink Grapefruit Tonic" } },
    { id: "bombay-tonic", name: "Bombay Tonic", kind: "Gin", price: 15, category: "premium" },
    { id: "gin-mare-tonic", name: "Gin Mare Tonic", kind: "Gin", price: 15, category: "premium" },
    { id: "bulldog-tonic", name: "Bulldog Tonic", kind: "Gin", price: 15, category: "premium" }
  ],

  // ----------------------------------------------------------------- CAFFETTERIA
  // Due prezzi: counterPrice = al banco, tablePrice = al tavolo (con servizio).
  cafe: [
    // --- Caffè
    { id: "caffe", name: "Caffè", counterPrice: 1.30, tablePrice: 2.50, category: "caffe", en: { name: "Espresso" } },
    { id: "caffe-decaffeinato", name: "Caffè decaffeinato", counterPrice: 1.70, tablePrice: 2.80, category: "caffe", en: { name: "Decaf espresso" } },
    { id: "caffe-americano", name: "Caffè americano", counterPrice: 2.00, tablePrice: 3.50, category: "caffe", en: { name: "Americano" } },
    { id: "caffe-marocchino", name: "Caffè marocchino", counterPrice: 2.20, tablePrice: 3.50, category: "caffe", en: { name: "Marocchino" } },
    { id: "caffe-doppio", name: "Caffè doppio", counterPrice: 2.30, tablePrice: 3.50, category: "caffe", en: { name: "Double espresso" } },
    { id: "caffe-shakerato", name: "Caffè shakerato", counterPrice: 3.50, tablePrice: 4.00, category: "caffe", en: { name: "Shaken iced espresso" } },
    { id: "caffe-corretto", name: "Caffè corretto", counterPrice: 2.20, tablePrice: 3.00, category: "caffe", en: { name: "Espresso with a dash of liqueur" } },
    { id: "caffe-latte", name: "Caffè latte", counterPrice: 2.40, tablePrice: 3.50, category: "caffe", en: { name: "Caffè latte" } },
    { id: "ginseng-piccolo", name: "Caffè al ginseng piccolo", counterPrice: 1.70, tablePrice: 2.60, category: "caffe", en: { name: "Small ginseng coffee" } },
    { id: "ginseng-grande", name: "Caffè al ginseng grande", counterPrice: 2.30, tablePrice: 3.00, category: "caffe", en: { name: "Large ginseng coffee" } },
    { id: "orzo-piccolo", name: "Caffè d'orzo piccolo", counterPrice: 1.70, tablePrice: 2.60, category: "caffe", en: { name: "Small barley coffee" } },
    { id: "orzo-grande", name: "Caffè d'orzo grande", counterPrice: 2.30, tablePrice: 3.00, category: "caffe", en: { name: "Large barley coffee" } },
    { id: "caffe-freddo", name: "Caffè freddo", counterPrice: 2.20, tablePrice: 3.50, category: "caffe", en: { name: "Iced coffee" } },

    // --- Latte e cappuccini
    { id: "latte-macchiato", name: "Latte macchiato", counterPrice: 2.00, tablePrice: 3.00, category: "latte-cappuccini", en: { name: "Latte macchiato" } },
    { id: "latte-bianco", name: "Latte bianco", counterPrice: 1.60, tablePrice: 2.20, category: "latte-cappuccini", en: { name: "Hot milk" } },
    { id: "cappuccino", name: "Cappuccino", counterPrice: 1.80, tablePrice: 3.00, category: "latte-cappuccini", en: { name: "Cappuccino" } },
    { id: "cappuccino-decaffeinato", name: "Cappuccino decaffeinato", counterPrice: 2.20, tablePrice: 3.50, category: "latte-cappuccini", en: { name: "Decaf cappuccino" } },
    { id: "cappuccino-soia-zymil", name: "Cappuccino soia / Zymil", counterPrice: 2.50, tablePrice: 3.50, category: "latte-cappuccini", en: { name: "Soy / lactose-free (Zymil) cappuccino" } },
    { id: "cappuccino-freddo", name: "Cappuccino freddo", counterPrice: 2.80, tablePrice: 3.70, category: "latte-cappuccini", en: { name: "Iced cappuccino" } },
    { id: "cappuccino-orzo", name: "Cappuccino d'orzo", counterPrice: 2.00, tablePrice: 2.70, category: "latte-cappuccini", en: { name: "Barley cappuccino" } },

    // --- Cioccolata e infusi
    { id: "cioccolata-calda", name: "Cioccolata calda", detail: "Con panna: maggiorazione di 1,00 €", counterPrice: 4.50, tablePrice: 6.00, category: "cioccolata-infusi", en: { name: "Hot chocolate", detail: "With whipped cream: €1.00 extra" } },
    { id: "infusi", name: "Infusi", counterPrice: 4.50, tablePrice: 6.00, category: "cioccolata-infusi", en: { name: "Herbal teas & infusions" } },

    // --- Dolci e lieviti
    { id: "lieviti", name: "Lieviti", counterPrice: 1.80, tablePrice: 2.20, category: "dolci-lieviti", allergens: "ask", en: { name: "Pastries" } },
    { id: "lievito-vegano", name: "Lievito vegano", counterPrice: 2.20, tablePrice: 2.80, category: "dolci-lieviti", allergens: "ask", en: { name: "Vegan pastry" } },
    { id: "ciambellone-crostata", name: "Ciambellone / Crostata", counterPrice: 4.50, tablePrice: 6.00, category: "dolci-lieviti", allergens: "ask", en: { name: "Ring cake / Tart" } },

    // --- Bibite
    { id: "succhi", name: "Succhi di frutta", counterPrice: 3.50, tablePrice: 4.50, category: "bibite", en: { name: "Fruit juices" } },
    { id: "soft-drink", name: "Soft drink", detail: "Coca-Cola, Fanta, Sprite, Chinotto, Cedrata", counterPrice: 3.50, tablePrice: 4.50, category: "bibite", en: { name: "Soft drinks", detail: "Coca-Cola, Fanta, Sprite, Chinotto, Cedrata" } },
    { id: "crodino-bitter", name: "Crodino / Bitter", counterPrice: 4.50, tablePrice: 6.00, category: "bibite", en: { name: "Crodino / Bitter" } },
    { id: "acqua", name: "Acqua 0,5 L", counterPrice: 1.80, tablePrice: 2.50, category: "bibite", en: { name: "Water 0.5 L" } },

    // --- Amari
    { id: "amari-caffetteria", name: "Amari", counterPrice: 5.00, tablePrice: 6.00, category: "amari-caffetteria", link: { section: "distillati", category: "amari", label: "seeSelection" }, linkAsName: true, en: { name: "Amari" } }
  ]
});
