// Business dossier: everything we hold on one place, each line with its source.
(function () {
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // The page language (renderHero sets <html lang>). The card's own labels follow it; Qloo's descriptions stay as
  // Qloo wrote them, in English, and say so (judge panels 10/24-10/25: "Its fans also love", "See in 3D",
  // "Contact and sources" and "stars" inside a Spanish session).
  const isEs = () => typeof document !== "undefined" && document.documentElement?.lang === "es";
  const tr = (en, es) => (isEs() ? es : en);
  const qlooSrc = () => (isEs() ? "Qloo · en inglés" : "Qloo");
  const FACT_ES = { Address: "Dirección", Hours: "Horario", Phone: "Teléfono", "Other phone": "Otro teléfono", Website: "Sitio web", Menu: "Menú",
    "Google listing": "Ficha de Google", Rating: "Calificación", "Qloo place id": "id de lugar en Qloo" };
  const AUDIENCE_ES = { "24 and under": "24 o menos", "55 and over": "55 o más", Women: "Mujeres", Men: "Hombres" };
  function sourceText(line) {
    const s = String(line || "Qloo record.");
    if (!isEs()) return s;
    return s.replace(/^Qloo record\. OpenStreetMap did not answer\.$/, "Registro de Qloo. OpenStreetMap no respondió.")
      .replace(/^Qloo record\. No OpenStreetMap match at this pin\.$/, "Registro de Qloo. OpenStreetMap no tiene este lugar en este punto.")
      .replace(/^Qloo record\.$/, "Registro de Qloo.").replace(/^Sources: /, "Fuentes: ");
  }

  // Category chip / letter-tile colors (CSS tokens on the page).
  const CHIP = {
    food: "coral", drinks: "mauve", stay: "steel", groceries: "sage", shopping: "amber",
    fun: "lilac", outdoors: "sage", culture: "amber", health: "mauve", other: "steel",
  };

  function chipTone(place) {
    const id = place?.category;
    return Object.hasOwn(CHIP, id) ? CHIP[id] : "steel";
  }

  // Same list as server/lib.mjs domainOf: a social page's icon is the platform's logo, not the place's.
  const SOCIAL_HOSTS = /(^|\.)(facebook\.com|fb\.com|m\.me|instagram\.com|twitter\.com|x\.com|tiktok\.com|linktr\.ee|linkedin\.com|youtube\.com|whatsapp\.com|wa\.me|yelp\.com|tripadvisor\.com|google\.com|goo\.gl|bit\.ly)$/i;

  function domainOf(place) {
    let host = "";
    if (place?.domain) {
      host = String(place.domain).replace(/^www\./i, "");
    } else {
      try {
        const url = new URL(String(place?.website || ""));
        if (url.protocol !== "http:" && url.protocol !== "https:") return "";
        host = url.hostname.replace(/^www\./i, "");
      } catch {
        return "";
      }
    }
    return SOCIAL_HOSTS.test(host) ? "" : host;
  }

  // Identify the place: Qloo image → Commons/OSM photo → brand logo → site icon → letter tile.
  // The aerial is not a face picture; callers put it in locationThumb instead.
  function pictureOf(place) {
    if (place?.qlooImage) return { src: place.qlooImage, credit: tr("Photo · Qloo", "Foto · Qloo") };
    if (place?.image) return { src: place.image, credit: `${tr("Photo", "Foto")} · ${place.imageSource || "Wikimedia Commons"}` };
    if (place?.logo) return { src: place.logo, credit: "Logo · Wikimedia Commons", logo: true };
    const domain = domainOf(place);
    if (domain) return { src: `https://icons.duckduckgo.com/ip3/${domain}.ico`, credit: "", logo: true }; // no caption: "Site icon" read as stray text
    const initial = String(place?.name || "?").trim().charAt(0).toUpperCase() || "?";
    return { letter: true, initial, tone: chipTone(place), credit: "" };
  }

  function locationThumb(place) {
    if (!place?.aerial) return null;
    return { src: place.aerial, credit: `${tr("Location", "Ubicación")} · Esri World Imagery` };
  }

  function stars(rating) {
    return rating != null ? `<span class="star" aria-hidden="true">★</span> ${esc(rating)}<span class="sr">${tr(" stars", " estrellas")}</span>` : "";
  }

  function factRows(place) {
    return (place.facts || []).map((item) => {
      const text = item.label === "Hours" && window.ZemiMarks?.hoursText ? window.ZemiMarks.hoursText(item.text) : item.text;
      const value = item.href
        ? `<a href="${esc(item.href)}" target="_blank" rel="noopener noreferrer">${esc(text)}</a>`
        : esc(text);
      return `<li><span>${esc(isEs() ? FACT_ES[item.label] || item.label : item.label)}: ${value}</span><span class="src">${esc(isEs() ? FACT_ES[item.source] || item.source : item.source)}</span></li>`;
    }).join("");
  }

  function chips(title, items) {
    if (!items?.length) return "";
    return `<p class="section">${esc(title)} <span class="src">${qlooSrc()}</span></p><div class="chips" lang="en">${items.map((item) => `<span class="chip">${esc(item)}</span>`).join("")}</div>`;
  }

  function prose(title, text) {
    return text ? `<p class="section">${esc(title)}</p><p class="prose" lang="en">${esc(text)}</p>` : "";
  }

  function markup(place, { show3D = false, artist = "" } = {}) {
    const d = place.details || {};
    const home = place.municipality || place.city || "";
    const barrio = place.neighborhood || (place.city && place.city !== home ? place.city : "");
    const where = [window.ZemiMarks?.genreName?.(place) ?? place.genre, barrio, home].filter(Boolean).join(" · ");
    const picture = pictureOf(place);
    const hero = picture.letter
      ? `<figure class="hero-shot"><span class="shot letter" style="--chip:var(--${picture.tone})" aria-hidden="true">${esc(picture.initial)}</span></figure>`
      : `<figure class="hero-shot"><img class="shot${picture.logo ? " logo" : ""}" alt="" src="${esc(picture.src)}" referrerpolicy="no-referrer"><figcaption>${esc(picture.credit)}</figcaption></figure>`;
    const location = locationThumb(place);
    const locationHtml = location
      ? `<figure class="location-shot"><img class="location-thumb" alt="" src="${esc(location.src)}" referrerpolicy="no-referrer" loading="lazy"><figcaption>${esc(location.credit)}</figcaption></figure>`
      : "";
    const badges = [
      place.price ? esc(place.price) : "",
      d.priceRange ? esc(d.priceRange) : "",
      stars(place.rating),
      place.hours ? esc(window.ZemiMarks?.hoursText ? window.ZemiMarks.hoursText(place.hours) : place.hours) : "",
    ].filter(Boolean).map((html) => `<span class="badge">${html}</span>`).join("");
    const overview = place.description || d.standout;
    const about = overview ? `<p class="about place-overview"><span lang="en">${esc(overview)}</span> <span class="src">${qlooSrc()}</span></p>` : "";
    const artistLine = artist
      ? `<p class="artist-link note">${tr(`Linked to ${esc(artist)} fans by Qloo`, `Qloo lo vincula con fans de ${esc(artist)}`)}</p>`
      : "";
    const whyText = window.ZemiMarks?.whyLine?.(place.why) ?? place.why;
    const why = whyText ? `<p class="why-line">${esc(whyText)} <span class="src">Qloo</span></p>` : "";
    const more = [
      prose(tr("About", "Descripción"), place.description),
      prose(tr("Why people go", "Por qué va la gente"), d.standout),
      chips(tr("People mention", "La gente menciona"), d.keywords),
      chips(tr("Specialty dishes", "Platos especiales"), d.dishes),
      chips(tr("Good for", "Bueno para"), d.goodFor),
      chips(tr("On site", "En el lugar"), d.features),
      prose(tr("The feel", "El ambiente"), d.ambience),
      prose(tr("The setting", "El entorno"), d.setting),
      prose(tr("Amenities", "Comodidades"), d.amenities),
      prose(tr("The food", "La comida"), d.cuisine),
      prose(tr("Service", "Servicio"), d.service),
      prose(tr("Who comes", "Quién va"), d.crowd),
    ].join("");
    const wiki = place.wiki ? `<p><a href="${esc(place.wiki)}" target="_blank" rel="noopener noreferrer">Wikipedia</a></p>` : "";
    const taste = place.id
      ? `<section class="aud taste-links" data-culture><h4 class="section">${tr("Its fans also love", "A sus fans también les gusta")} <span class="src">Qloo</span></h4><p class="note">${tr("Reading Qloo’s music and travel connections…", "Leyendo las conexiones de música y viajes en Qloo…")}</p></section>`
      : "";
    const audience = place.id
      ? `<details class="more"><summary>${tr("Audience and taste map", "Público y mapa de gusto")} <span class="src">Qloo</span></summary><section class="aud" data-aud><p class="note">${tr("Reading Qloo…", "Leyendo Qloo…")}</p></section><p class="note" data-foot>${tr("Reading the taste footprint…", "Leyendo la huella de gusto…")}</p></details>`
      : "";
    return `<div class="place-intro"><div class="place-heading"><h3>${esc(place.name)}</h3><p class="muted">${esc(where)}</p>`
      + (badges ? `<div class="badges">${badges}</div>` : "")
      + (show3D ? `<button type="button" class="ghost place-3d" data-place-3d>${tr("See in 3D", "Ver en 3D")}</button>` : "") + `</div>${hero}</div>`
      + artistLine + why + about + taste
      + locationHtml
      + (more ? `<details class="more"><summary>${tr("About this place", "Sobre este lugar")}</summary>${more}<p class="note">${tr("Qloo place details.", "Detalles del lugar en Qloo, en inglés.")}</p></details>` : "")
      + audience
      + `<details class="more"><summary>${tr("Contact and sources", "Contacto y fuentes")}</summary><ul>${factRows(place)}</ul>${wiki}<p class="note">${esc(sourceText(place.sourceLine))}</p></details>`;
  }

  function word(value) {
    if (value >= 0.05) return tr("above average", "sobre el promedio");
    if (value <= -0.05) return tr("below average", "bajo el promedio");
    return tr("about average", "cerca del promedio");
  }

  function audienceMarkup(data) {
    const head = `<p class="section">${tr("Who likes it", "A quién le gusta")} <span class="src">Qloo</span></p>`;
    const rows = [...(data?.age || []), ...(data?.gender || [])];
    if (data?.status !== "ok" || !rows.length) return `${head}<p class="note">${tr("Qloo had no audience data for this place.", "Qloo no tiene datos de público para este lugar.")}</p>`;
    const bar = (row) => {
      const pct = Math.min(50, Math.abs(row.value) * 100);
      const span = row.value >= 0 ? `left:50%;width:${pct}%` : `left:${50 - pct}%;width:${pct}%`;
      return `<li><span>${esc(isEs() ? AUDIENCE_ES[row.label] || row.label : row.label)}</span><span class="track"><i class="${row.value >= 0 ? "up" : "down"}" style="${span}"></i></span><span class="src">${word(row.value)}</span></li>`;
    };
    return `${head}<ul class="bars">${rows.map(bar).join("")}</ul><p class="note">${tr("Compared with Qloo's average audience. Not a customer count.", "Comparado con el público promedio de Qloo. No es un conteo de clientes.")}</p>`;
  }

  // Qloo's cross-domain taste: what people who like this place also like, in music and travel.
  function cultureMarkup(data) {
    const head = `<h4 class="section">${tr("Its fans also love", "A sus fans también les gusta")} <span class="src">Qloo</span></h4>`;
    if (data?.status !== "ok" || (!data.artists?.length && !data.trips?.length)) return `${head}<p class="note">${tr("Qloo had no taste links for this place.", "Qloo no tiene conexiones de gusto para este lugar.")}</p>`;
    const row = (label, items) => (items?.length
      ? `<p class="note">${label}</p><div class="chips">${items.map((item) => `<span class="chip">${esc(item.name)}</span>`).join("")}</div>`
      : "");
    const artists = data.artists || [], trips = data.trips || [];
    const more = row(tr("More music", "Más música"), artists.slice(3)) + row(tr("More trips", "Más viajes"), trips.slice(3));
    return head + row(tr("Music", "Música"), artists.slice(0, 3)) + row(tr("Trips", "Viajes"), trips.slice(0, 3))
      + `<p class="note">${tr("Qloo audience connections, not the place's own playlist.", "Conexiones del público en Qloo, no la música del lugar.")}</p>`
      + (more ? `<details class="more"><summary>${tr("More taste connections", "Más conexiones de gusto")}</summary>${more}</details>` : "");
  }

  function footprintLine(data, name) {
    if (data?.status !== "ok" || !data.points?.length) return tr("Qloo had no taste footprint for this place.", "Qloo no tiene huella de gusto para este lugar.");
    return tr(`Violet glow: the ${data.points.length} areas of the island where ${name}'s taste is strongest. Qloo where-popular.`,
      `Brillo violeta: las ${data.points.length} zonas de la isla donde el gusto por ${name} es más fuerte. Qloo, dónde es popular.`);
  }

  window.ZemiDossier = { markup, audienceMarkup, cultureMarkup, footprintLine, pictureOf, locationThumb, chipTone, CHIP, stars };
})();
