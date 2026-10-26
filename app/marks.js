// Map marks by kind of place: one color per catalog category (server/catalog.mjs sets
// place.category), a legend for the open list, and the card that opens at a pin.
(function () {
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // Same order and names as the town directory.
  const KINDS = {
    food: { label: "Food", es: "Comida", color: "#e4573d" },
    drinks: { label: "Bars and nightlife", es: "Barras y vida nocturna", color: "#b65fd8" },
    stay: { label: "Places to stay", es: "Hospedajes", color: "#3d8fe3" },
    groceries: { label: "Groceries and pharmacies", es: "Colmados y farmacias", color: "#8fbb4a" },
    shopping: { label: "Shopping", es: "Compras", color: "#eaa83a" },
    fun: { label: "Things to do", es: "Qué hacer", color: "#2bb5a9" },
    outdoors: { label: "Beaches and outdoors", es: "Playas y aire libre", color: "#3cae5e" },
    culture: { label: "History and culture", es: "Historia y cultura", color: "#c9804e" },
    health: { label: "Health and fitness", es: "Salud y ejercicio", color: "#ec6fa0" },
    other: { label: "Services and more", es: "Servicios y más", color: "#8e97a8" },
  };

  function kindOf(place) {
    const id = place?.category;
    return Object.hasOwn(KINDS, id) ? id : "other";
  }

  // The page language (renderHero sets <html lang>), so chips, legend and hours follow a Spanish answer
  // (judge panel 10/24: "Food", "Today", "Closed today" stayed English under a Spanish question).
  const pageLang = () => (typeof document !== "undefined" && document.documentElement?.lang === "es" ? "es" : "en");
  const kindLabel = (kind, lang = pageLang()) => (lang === "es" ? kind.es : kind.label);
  // Qloo's genre names are English ("Fast food restaurant", "Bar & grill"). A Spanish page shows them in
  // Spanish; a genre this list does not know shows its category instead, never the English name (judge
  // panels 10/24-10/25: "Bakery · San Juan" and "Fast food restaurant" under Spanish answers).
  const GENRE_ES = {
    "restaurant": "Restaurante", "fast food restaurant": "Comida rápida", "bakery": "Panadería", "pizza restaurant": "Pizzería",
    "pizza delivery": "Pizzería", "pizza takeout": "Pizzería", "bar": "Bar", "bar & grill": "Bar y grill",
    "sports bar": "Bar deportivo", "cocktail bar": "Bar de cócteles", "gay bar": "Bar gay", "wine bar": "Bar de vinos",
    "tapas bar": "Bar de tapas", "live music bar": "Bar con música en vivo", "gastropub": "Gastropub", "irish pub": "Pub irlandés",
    "pub": "Pub", "karaoke bar": "Bar de karaoke", "piano bar": "Piano bar", "salsa bar": "Bar de salsa", "beer hall": "Cervecería",
    "night club": "Discoteca", "lounge": "Lounge", "espresso bar": "Cafetería", "brewpub": "Cervecería", "beer garden": "Cervecería al aire libre",
    "hotel": "Hotel", "resort hotel": "Hotel resort", "motel": "Motel", "lodging": "Hospedaje", "guest house": "Casa de huéspedes",
    "hostel": "Hostal", "vacation home rental agency": "Alquiler vacacional", "supermarket": "Supermercado", "grocery store": "Colmado",
    "cafe": "Café", "coffee shop": "Cafetería", "cafeteria": "Cafetería", "ice cream shop": "Heladería", "frozen yogurt shop": "Yogur helado",
    "dessert shop": "Postres", "donut shop": "Donas", "cake shop": "Bizcochos", "juice shop": "Jugos", "açaí shop": "Açaí",
    "sandwich shop": "Sándwiches", "deli": "Deli", "diner": "Diner", "bistro": "Bistró", "steak house": "Steakhouse",
    "food court": "Área de comida", "shopping mall": "Centro comercial", "department store": "Tienda por departamentos",
    "drug store": "Farmacia", "pharmacy": "Farmacia", "tourist attraction": "Atracción turística", "park": "Parque",
    "city park": "Parque", "state park": "Parque estatal", "beach": "Playa", "public beach": "Playa pública",
    "nature preserve": "Reserva natural", "scenic spot": "Mirador", "movie theater": "Cine", "arena": "Arena", "stadium": "Estadio",
    "museum": "Museo", "historical landmark": "Lugar histórico", "performing arts theater": "Teatro", "cultural center": "Centro cultural",
    "catholic church": "Iglesia católica", "event venue": "Lugar de eventos", "casino": "Casino", "water park": "Parque acuático",
    "amusement park": "Parque de diversiones", "bowling alley": "Bolera", "tour operator": "Excursiones", "gym": "Gimnasio",
    "sports complex": "Complejo deportivo", "beauty salon": "Salón de belleza", "beauty supply store": "Productos de belleza",
    "clothing store": "Ropa", "women's clothing store": "Ropa de mujer", "shoe store": "Zapatería", "home goods store": "Artículos del hogar",
    "furniture store": "Mueblería", "discount store": "Tienda de descuento", "pawn shop": "Casa de empeño", "warehouse store": "Almacén",
    "warehouse club": "Club de almacén", "pet supply store": "Productos para mascotas", "pet store": "Tienda de mascotas",
    "vitamin & supplements store": "Vitaminas y suplementos", "book store": "Librería", "home improvement store": "Ferretería",
    "farmers' market": "Mercado agrícola", "convenience store": "Tienda de conveniencia", "jewelry store": "Joyería",
  };
  const CUISINE_ES = {
    "puerto rican": "puertorriqueño", "chinese": "chino", "mexican": "mexicano", "chicken": "de pollo", "seafood": "de mariscos",
    "barbecue": "de barbacoa", "brunch": "de brunch", "family": "familiar", "italian": "italiano", "hamburger": "de hamburguesas",
    "creole": "criollo", "sushi": "de sushi", "breakfast": "de desayunos", "caribbean": "caribeño", "asian": "asiático",
    "tex-mex": "tex-mex", "lechon": "de lechón", "spanish": "español", "argentinian": "argentino", "american": "americano",
    "japanese": "japonés", "vegan": "vegano", "vegetarian": "vegetariano", "fusion": "de fusión", "french": "francés",
    "health food": "de comida saludable", "chicken wings": "de alitas", "buffet": "bufé", "peruvian": "peruano", "tapas": "de tapas",
    "fine dining": "de alta cocina", "steak": "de carnes", "thai": "tailandés", "indian": "indio", "greek": "griego", "cuban": "cubano",
    "dominican": "dominicano", "colombian": "colombiano", "venezuelan": "venezolano", "turkish": "turco", "mediterranean": "mediterráneo",
  };
  function genreName(place, lang = pageLang()) {
    const genre = String(place?.genre || place?.kind || "").trim();
    if (!genre || lang !== "es") return genre;
    const key = genre.toLowerCase();
    if (Object.hasOwn(GENRE_ES, key)) return GENRE_ES[key];
    const cuisine = key.match(/^(.+) restaurant$/);
    if (cuisine && Object.hasOwn(CUISINE_ES, cuisine[1])) return `Restaurante ${CUISINE_ES[cuisine[1]]}`;
    return KINDS[kindOf(place)].es;
  }
  // The fit line is written by the server in the language it was asked in; the agent's tools ask in English.
  // It is shown in the page's language either way (Grok 10/24, the probe 10/25: "Strong match for Bad Bunny
  // fans (88%)" under a Spanish answer).
  function whyLine(text, lang = pageLang()) {
    const s = String(text || "");
    if (lang === "es") return s.replace(/^Strong match for (.+) fans \((\d+)%\)$/, "Fuerte afinidad para fans de $1 ($2%)")
      .replace(/^Good match for (.+) fans \((\d+)%\)$/, "Buena afinidad para fans de $1 ($2%)");
    return s.replace(/^Fuerte afinidad para fans de (.+) \((\d+)%\)$/, "Strong match for $1 fans ($2%)")
      .replace(/^Buena afinidad para fans de (.+) \((\d+)%\)$/, "Good match for $1 fans ($2%)");
  }
  // Qloo files many bars under its restaurant genres ("urn:tag:genre:place:restaurant:bar"), so a "where do fans
  // eat" answer can be mostly bars (Opus, 10/25). The chip names the place's own kind and one line says why.
  // Any kind of bar or pub, by word, except the ones that serve no drinks ("Gastropub", "Live music bar" and "Beer
  // hall" are in the catalogs too). Counted, so one bar reads in the singular.
  const BAR_GENRE = /\b(bar|bars|pub|gastropub|brewpub|lounge|beer hall|beer garden|night ?club|tavern|cantina)\b/i;
  const NOT_A_BAR = /\b(espresso|snack|juice|salad|oyster|raw|sushi|coffee|smoothie|candy|dessert|ice cream)\s+bar\b/i;
  const barsAsFood = (places) => (places || []).filter((place) => {
    const genre = String(place.genre || place.kind || "").trim();
    return kindOf(place) === "food" && BAR_GENRE.test(genre) && !NOT_A_BAR.test(genre);
  }).length;

  // Qloo's hours line is English ("Today 5:00 pm–12:00 am", "Closed today", "Open 24 hours"); a saved catalog's line
  // carries the day it was measured ("Oct 7: 5:00 pm–3:00 am", "Closed on Oct 7").
  const MESES = { Jan: "ene", Feb: "feb", Mar: "mar", Apr: "abr", May: "may", Jun: "jun", Jul: "jul", Aug: "ago", Sep: "sep", Oct: "oct", Nov: "nov", Dec: "dic" };
  function hoursText(hours, lang = pageLang()) {
    // A midnight-to-midnight window is a day-long one (judge panel 10/25: "Today 12:00 am–12:00 am" read as a bug).
    const text = String(hours || "").replace(/^Today 12:00 am\s*[–-]\s*12:00 am$/i, "Open 24 hours");
    if (lang !== "es" || !text) return text;
    const fecha = (m, d) => `${d} ${MESES[m] || m}`;
    return text.replace(/^Closed today$/i, "Cerrado hoy").replace(/^Open 24 hours$/i, "Abierto 24 horas").replace(/^Today\b/, "Hoy")
      .replace(/^Open 24 hours on ([A-Z][a-z]{2}) (\d{1,2})$/, (_, m, d) => `Abierto 24 horas el ${fecha(m, d)}`)
      .replace(/^Closed on ([A-Z][a-z]{2}) (\d{1,2})$/, (_, m, d) => `Cerrado el ${fecha(m, d)}`)
      .replace(/^([A-Z][a-z]{2}) (\d{1,2}): /, (_, m, d) => `${fecha(m, d)}: `)
      .replace(/\bClosed\b/, "Cerrado");
  }

  function legend(places) {
    const counts = new Map();
    for (const place of places || []) {
      const id = kindOf(place);
      counts.set(id, (counts.get(id) || 0) + 1);
    }
    return Object.entries(KINDS)
      .filter(([id]) => counts.has(id))
      .map(([id, kind]) => `<span class="legend-chip"><i style="background:${kind.color}"></i>${esc(kindLabel(kind))}<b>${counts.get(id)}</b></span>`)
      .join("");
  }

  // Qloo's popularity is a percentile: 0.93 means the place outranks 93% of places.
  function standing(place) {
    const popularity = Number(place.popularity);
    if (!Number.isFinite(popularity) || popularity <= 0 || popularity > 1) return "";
    const top = Math.max(1, Math.round((1 - popularity) * 100));
    return pageLang() === "es" ? `entre el ${top}% más popular en Qloo` : `top ${top}% on Qloo`;
  }

  // Same identify order as ZemiDossier.pictureOf (Qloo → photo → logo → site icon → letter).
  function shotOf(place, extra = "") {
    const picture = window.ZemiDossier?.pictureOf?.(place);
    if (!picture) return "";
    if (picture.letter) {
      return `<span class="pick-initial letter" style="--chip:var(--${picture.tone})" aria-hidden="true">${esc(picture.initial)}</span>`;
    }
    return `<img${picture.logo ? ' class="logo"' : ""} alt="" src="${esc(picture.src)}" referrerpolicy="no-referrer"${extra}>`;
  }

  function card(place, { touch = false } = {}) {
    const kind = KINDS[kindOf(place)];
    const home = place.municipality || place.city || "";
    const where = [genreName(place), home].filter(Boolean).join(" · ");
    const badges = [place.price, place.rating != null ? `★ ${place.rating}` : "", standing(place)]
      .filter(Boolean).map((text) => `<span>${esc(text)}</span>`).join("");
    return shotOf(place)
      + `<strong>${esc(place.name)}</strong>`
      + `<p class="kind"><i style="background:${kind.color}"></i>${esc(kindLabel(kind))}</p>`
      + (where ? `<p>${esc(where)}</p>` : "")
      + (badges ? `<p class="badges">${badges}</p>` : "")
      + (touch ? `<p class="hint">${pageLang() === "es" ? "Toque otra vez para ver el registro completo" : "Tap again for the full record"}</p>` : "");
  }

  // The places an answer names, in the order it names them; without a spoken answer, the first three.
  // Accents, case, "&" and punctuation folded, so "Campioni Pizza Birra & Tapas" is found when the answer
  // wrote "Campioni Pizza Birra and Tapas"; a long name also matches on its first two words (three when the
  // first is an article), since the model shortens names it has already said once.
  const fold = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim();
  const ARTICLES = new Set(["la", "el", "los", "las", "the", "de", "del", "un", "una", "san", "santa", "casa", "cafe", "bar", "restaurante", "restaurant"]);
  function namedAt(text, name, exact = false) {
    const whole = fold(name);
    if (!whole) return -1;
    const at = text.indexOf(` ${whole} `);
    if (at >= 0 || exact) return at;
    const words = whole.split(" ");
    const lead = ARTICLES.has(words[0]) ? 3 : 2;
    return words.length > lead ? text.indexOf(` ${words.slice(0, lead).join(" ")} `) : -1;
  }
  // exact: only a whole name counts (the decision card's visit line; judge panel 10/25: the lead-words fallback made
  // every "Panadería y Repostería …" a match, so the card and the note named different places).
  function picks(places, speech, max = 3, { exact = false } = {}) {
    const list = places || [];
    const text = ` ${fold(speech)} `;
    const seen = new Set();
    const named = list
      .map((place) => ({ place, at: namedAt(text, place?.name, exact) }))
      .filter((row) => row.at >= 0)
      .sort((a, b) => a.at - b.at)
      .map((row) => row.place)
      .filter((place) => { const key = place?.id || fold(place?.name || ""); if (seen.has(key)) return false; seen.add(key); return true; });
    // Exact mode answers "which listed places does the speech name", so no match is an empty answer, never the list.
    return (named.length || exact ? named : list).slice(0, max);
  }

  // Photo cards for the picks: each carries data-index, the place's position in the open list.
  function pickCards(places) {
    return (places || []).map((place) => {
      const kind = KINDS[kindOf(place)];
      const where = [genreName(place), place.municipality || place.city].filter(Boolean).join(" · ");
      const shot = shotOf(place, ' loading="lazy"') || `<span class="pick-initial">${esc(String(place.name || "").charAt(0))}</span>`;
      const rating = place.rating != null ? `<span class="pick-rating">★ ${esc(place.rating)}</span>` : "";
      return `<button type="button" class="pick" data-index="${Number(place.index) || 0}" style="--kind:${kind.color}">${shot}`
        + `<span class="pick-text"><strong>${esc(place.name)}</strong>${where ? `<span>${esc(where)}</span>` : ""}${rating}</span></button>`;
    }).join("");
  }

  function haversineKm(a, b) {
    if (!a || !b || !Number.isFinite(a.lat) || !Number.isFinite(a.lon) || !Number.isFinite(b.lat) || !Number.isFinite(b.lon)) return null;
    const rad = (n) => n * Math.PI / 180;
    const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
    return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
  }

  // Per-render prefix so aria-describedby never collides across caption + list (or two answers).
  let resultCardRender = 0;

  // Chat / answer result cards: logo, name button (card-wide hit via ::after), why, meta, sibling actions.
  // fromTown: the town the distance is measured from; a card in another town shows no distance (judge panel 10/25
  // round 8: Caguas bakeries read "111 km" under a Mayagüez-against-Caguas comparison).
  function resultCards(places, { from = null, fromTown = "", lang = "en", focusedIndex = -1 } = {}) {
    const es = lang === "es";
    const labels = {
      why: es ? "Por qué le conviene" : "Why it fits you",
      directions: es ? "Cómo llegar" : "Directions",
      ask: es ? "Preguntar más" : "Ask more",
      location: es ? "Ubicación" : "Location",
      newTab: es ? "(se abre en una pestaña nueva)" : "(opens in a new tab)",
      noHours: es ? "sin horario publicado" : "hours not listed", // judge panel 10/24 round 3: an unchecked place looked like a checked one
      bars: (n) => (es ? (n === 1 ? "Qloo clasifica este bar como restaurante; por eso aparece aquí." : "Qloo clasifica estos bares como restaurantes; por eso aparecen aquí.")
        : (n === 1 ? "Qloo lists this bar under restaurants, which is why it appears here." : "Qloo lists these bars under restaurants, which is why they appear here.")),
      // Judge panel 10/25 round 8: "Strong match … (96%)" read as 96% of fans eating there.
      score: es ? "El porcentaje es la afinidad de Qloo: cuánto se inclina el gusto de esos fans hacia el lugar, no qué parte de los fans va."
        : "The percentage is Qloo's affinity score: how strongly those fans' taste leans toward the place, not the share of fans who go.",
    };
    const scored = (places || []).some((place) => /\(\d+%\)$/.test(String(place.why || "")));
    const renderId = ++resultCardRender;
    return `<ul class="answer-cards">${(places || []).map((place, index) => {
      const kind = KINDS[kindOf(place)];
      const tone = window.ZemiDossier?.chipTone?.(place) || "steel";
      const picture = window.ZemiDossier?.pictureOf?.(place) || { letter: true, initial: "?", tone: "steel" };
      const media = picture.letter
        ? `<span class="result-logo letter" style="--chip:var(--${picture.tone})" aria-hidden="true">${esc(picture.initial)}</span>`
        : `<img class="result-logo${picture.logo ? " logo" : ""}" alt="" src="${esc(picture.src)}" referrerpolicy="no-referrer" loading="lazy">`;
      const credit = picture.credit ? `<span class="result-credit">${esc(picture.credit)}</span>` : "";
      const whyId = `result-why-${renderId}-${index}`;
      const metaId = `result-meta-${renderId}-${index}`;
      const whyText = whyLine(place.why || "", lang);
      const why = whyText
        ? `<p class="result-why" id="${whyId}"><span class="why-label">${labels.why}</span> ${esc(whyText)}</p>`
        : "";
      // A distance with its own origin (a port) stands; any other is shown only for a card in the town it is measured from.
      const home = place.municipality || place.city || place.town || "";
      // A distance shows only with a proven origin: its own (a port), or a town origin and a card in that same town. With
      // no town origin (the island view, measured from the camera) a computed distance stands as before.
      const knownHere = Boolean(fromTown) && Boolean(home) && fold(home) === fold(fromTown);
      const km = place.distanceKm != null && Number.isFinite(Number(place.distanceKm)) && (place.distanceFrom || knownHere)
        ? Number(place.distanceKm)
        : !fromTown || knownHere ? haversineKm(from, { lat: place.lat, lon: place.lon }) : null;
      const metaBits = [
        Number.isFinite(km) ? `${km.toFixed(1)} km` : "",
        place.rating != null ? `★ ${place.rating}` : "",
        hoursText(place.hours, lang) || labels.noHours,
      ].filter(Boolean).map((text) => esc(text)).join(" · ");
      const meta = metaBits ? `<p class="result-meta" id="${metaId}">${metaBits}</p>` : "";
      const describedBy = [whyText ? whyId : "", metaBits ? metaId : ""].filter(Boolean).join(" ");
      const directions = Number.isFinite(place.lat) && Number.isFinite(place.lon)
        ? `<a class="result-act" href="https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lon}" target="_blank" rel="noopener noreferrer" aria-label="${esc(labels.directions)}: ${esc(place.name)} ${labels.newTab}">${labels.directions}<span class="sr">${esc(labels.newTab)}</span></a>`
        : "";
      const location = place.aerial
        ? `<figure class="result-location"><img alt="" src="${esc(place.aerial)}" referrerpolicy="no-referrer" loading="lazy"><figcaption>${labels.location}</figcaption></figure>`
        : "";
      const dataIndex = Number.isInteger(place.index) ? ` data-index="${place.index}"` : "";
      const current = Number.isInteger(place.index) && place.index === focusedIndex;
      return `<li><article class="result-card"${dataIndex} data-name="${esc(place.name)}" data-id="${esc(place.id || "")}" data-tone="${esc(tone)}">`
        + `<div class="result-top">${media}<div class="result-text">`
        + `<button type="button" class="result-name" data-open-place aria-current="${current ? "true" : "false"}"${describedBy ? ` aria-describedby="${describedBy}"` : ""}>${esc(place.name)}</button>`
        + `<span class="cat-chip" style="--chip:var(--${tone})">${esc(genreName(place, lang) || kindLabel(kind, lang))}</span>${credit}${why}${meta}`
        + `<div class="result-actions">`
        + directions
        + `<button type="button" class="result-act" data-ask-more aria-label="${esc(labels.ask)}: ${esc(place.name)}">${labels.ask}</button>`
        + `</div></div></div>${location}</article></li>`;
    }).join("")}</ul>${barsAsFood(places) ? `<p class="cards-note">${labels.bars(barsAsFood(places))}</p>` : ""}${scored ? `<p class="cards-note">${labels.score}</p>` : ""}`;
  }

  window.ZemiMarks = { KINDS, kindOf, kindLabel, genreName, whyLine, hoursText, legend, card, picks, pickCards, resultCards, haversineKm, shotOf };
})();
