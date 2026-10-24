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
  // Qloo's hours line is English ("Today 5:00 pm–12:00 am", "Closed today", "Open 24 hours").
  function hoursText(hours, lang = pageLang()) {
    const text = String(hours || "");
    if (lang !== "es" || !text) return text;
    return text.replace(/^Closed today$/i, "Cerrado hoy").replace(/^Open 24 hours$/i, "Abierto 24 horas").replace(/^Today\b/, "Hoy")
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
    return `top ${Math.max(1, Math.round((1 - popularity) * 100))}% on Qloo`;
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
    const where = [place.genre, home].filter(Boolean).join(" · ");
    const badges = [place.price, place.rating != null ? `★ ${place.rating}` : "", standing(place)]
      .filter(Boolean).map((text) => `<span>${esc(text)}</span>`).join("");
    return shotOf(place)
      + `<strong>${esc(place.name)}</strong>`
      + `<p class="kind"><i style="background:${kind.color}"></i>${esc(kindLabel(kind))}</p>`
      + (where ? `<p>${esc(where)}</p>` : "")
      + (badges ? `<p class="badges">${badges}</p>` : "")
      + (touch ? `<p class="hint">Tap again for the full record</p>` : "");
  }

  // The places an answer names, in the order it names them; without a spoken answer, the first three.
  // Accents, case, "&" and punctuation folded, so "Campioni Pizza Birra & Tapas" is found when the answer
  // wrote "Campioni Pizza Birra and Tapas"; a long name also matches on its first two words (three when the
  // first is an article), since the model shortens names it has already said once.
  const fold = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim();
  const ARTICLES = new Set(["la", "el", "los", "las", "the", "de", "del", "un", "una", "san", "santa", "casa", "cafe", "bar", "restaurante", "restaurant"]);
  function namedAt(text, name) {
    const whole = fold(name);
    if (!whole) return -1;
    const at = text.indexOf(` ${whole} `);
    if (at >= 0) return at;
    const words = whole.split(" ");
    const lead = ARTICLES.has(words[0]) ? 3 : 2;
    return words.length > lead ? text.indexOf(` ${words.slice(0, lead).join(" ")} `) : -1;
  }
  function picks(places, speech, max = 3) {
    const list = places || [];
    const text = ` ${fold(speech)} `;
    const named = list
      .map((place) => ({ place, at: namedAt(text, place?.name) }))
      .filter((row) => row.at >= 0)
      .sort((a, b) => a.at - b.at)
      .map((row) => row.place);
    return (named.length ? named : list).slice(0, max);
  }

  // Photo cards for the picks: each carries data-index, the place's position in the open list.
  function pickCards(places) {
    return (places || []).map((place) => {
      const kind = KINDS[kindOf(place)];
      const where = [place.genre, place.municipality || place.city].filter(Boolean).join(" · ");
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
  function resultCards(places, { from = null, lang = "en", focusedIndex = -1 } = {}) {
    const es = lang === "es";
    const labels = {
      why: es ? "Por qué te queda" : "Why it fits you",
      directions: es ? "Cómo llegar" : "Directions",
      ask: es ? "Preguntar más" : "Ask more",
      location: es ? "Ubicación" : "Location",
      newTab: es ? "(se abre en una pestaña nueva)" : "(opens in a new tab)",
    };
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
      const whyText = place.why || "";
      const why = whyText
        ? `<p class="result-why" id="${whyId}"><span class="why-label">${labels.why}</span> ${esc(whyText)}</p>`
        : "";
      const km = place.distanceKm != null && Number.isFinite(Number(place.distanceKm))
        ? Number(place.distanceKm)
        : haversineKm(from, { lat: place.lat, lon: place.lon });
      const metaBits = [
        Number.isFinite(km) ? `${km.toFixed(1)} km` : "",
        place.rating != null ? `★ ${place.rating}` : "",
        hoursText(place.hours, lang),
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
        + `<span class="cat-chip" style="--chip:var(--${tone})">${esc(kindLabel(kind, lang))}</span>${credit}${why}${meta}`
        + `<div class="result-actions">`
        + directions
        + `<button type="button" class="result-act" data-ask-more aria-label="${esc(labels.ask)}: ${esc(place.name)}">${labels.ask}</button>`
        + `</div></div></div>${location}</article></li>`;
    }).join("")}</ul>`;
  }

  window.ZemiMarks = { KINDS, kindOf, kindLabel, hoursText, legend, card, picks, pickCards, resultCards, haversineKm, shotOf };
})();
