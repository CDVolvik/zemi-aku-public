// Business dossier: everything we hold on one place, each line with its source.
(function () {
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

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
    if (place?.qlooImage) return { src: place.qlooImage, credit: "Photo · Qloo" };
    if (place?.image) return { src: place.image, credit: `Photo · ${place.imageSource || "Wikimedia Commons"}` };
    if (place?.logo) return { src: place.logo, credit: "Logo · Wikimedia Commons", logo: true };
    const domain = domainOf(place);
    if (domain) return { src: `https://icons.duckduckgo.com/ip3/${domain}.ico`, credit: "Site icon", logo: true };
    const initial = String(place?.name || "?").trim().charAt(0).toUpperCase() || "?";
    return { letter: true, initial, tone: chipTone(place), credit: "" };
  }

  function locationThumb(place) {
    if (!place?.aerial) return null;
    return { src: place.aerial, credit: "Location · Esri World Imagery" };
  }

  function stars(rating) {
    return rating != null ? `<span class="star" aria-hidden="true">★</span> ${esc(rating)}<span class="sr"> stars</span>` : "";
  }

  function factRows(place) {
    return (place.facts || []).map((item) => {
      const value = item.href
        ? `<a href="${esc(item.href)}" target="_blank" rel="noopener noreferrer">${esc(item.text)}</a>`
        : esc(item.text);
      return `<li><span>${esc(item.label)}: ${value}</span><span class="src">${esc(item.source)}</span></li>`;
    }).join("");
  }

  function chips(title, items) {
    if (!items?.length) return "";
    return `<p class="section">${esc(title)} <span class="src">Qloo</span></p><div class="chips">${items.map((item) => `<span class="chip">${esc(item)}</span>`).join("")}</div>`;
  }

  function prose(title, text) {
    return text ? `<p class="section">${esc(title)}</p><p class="prose">${esc(text)}</p>` : "";
  }

  function markup(place, { show3D = false, artist = "" } = {}) {
    const d = place.details || {};
    const home = place.municipality || place.city || "";
    const barrio = place.neighborhood || (place.city && place.city !== home ? place.city : "");
    const where = [place.genre, barrio, home].filter(Boolean).join(" · ");
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
      place.hours ? esc(place.hours) : "",
    ].filter(Boolean).map((html) => `<span class="badge">${html}</span>`).join("");
    const overview = place.description || d.standout;
    const about = overview ? `<p class="about place-overview">${esc(overview)} <span class="src">Qloo</span></p>` : "";
    const artistLine = artist
      ? `<p class="artist-link note">Linked to ${esc(artist)} fans by Qloo</p>`
      : "";
    const why = place.why ? `<p class="why-line">${esc(place.why)} <span class="src">Qloo</span></p>` : "";
    const more = [
      prose("About", place.description),
      prose("Why people go", d.standout),
      chips("People mention", d.keywords),
      chips("Specialty dishes", d.dishes),
      chips("Good for", d.goodFor),
      chips("On site", d.features),
      prose("The feel", d.ambience),
      prose("The setting", d.setting),
      prose("Amenities", d.amenities),
      prose("The food", d.cuisine),
      prose("Service", d.service),
      prose("Who comes", d.crowd),
    ].join("");
    const wiki = place.wiki ? `<p><a href="${esc(place.wiki)}" target="_blank" rel="noopener noreferrer">Wikipedia</a></p>` : "";
    const taste = place.id
      ? `<section class="aud taste-links" data-culture><h4 class="section">Its fans also love <span class="src">Qloo</span></h4><p class="note">Reading Qloo’s music and travel connections…</p></section>`
      : "";
    const audience = place.id
      ? `<details class="more"><summary>Audience and taste map <span class="src">Qloo</span></summary><section class="aud" data-aud><p class="note">Reading Qloo…</p></section><p class="note" data-foot>Reading the taste footprint…</p></details>`
      : "";
    return `<div class="place-intro"><div class="place-heading"><h3>${esc(place.name)}</h3><p class="muted">${esc(where)}</p>`
      + (badges ? `<div class="badges">${badges}</div>` : "")
      + (show3D ? `<button type="button" class="ghost place-3d" data-place-3d>See in 3D</button>` : "") + `</div>${hero}</div>`
      + artistLine + why + about + taste
      + locationHtml
      + (more ? `<details class="more"><summary>About this place</summary>${more}<p class="note">Qloo place details.</p></details>` : "")
      + audience
      + `<details class="more"><summary>Contact and sources</summary><ul>${factRows(place)}</ul>${wiki}<p class="note">${esc(place.sourceLine || "Qloo record.")}</p></details>`;
  }

  function word(value) {
    if (value >= 0.05) return "above average";
    if (value <= -0.05) return "below average";
    return "about average";
  }

  function audienceMarkup(data) {
    const head = `<p class="section">Who likes it <span class="src">Qloo</span></p>`;
    const rows = [...(data?.age || []), ...(data?.gender || [])];
    if (data?.status !== "ok" || !rows.length) return `${head}<p class="note">Qloo had no audience data for this place.</p>`;
    const bar = (row) => {
      const pct = Math.min(50, Math.abs(row.value) * 100);
      const span = row.value >= 0 ? `left:50%;width:${pct}%` : `left:${50 - pct}%;width:${pct}%`;
      return `<li><span>${esc(row.label)}</span><span class="track"><i class="${row.value >= 0 ? "up" : "down"}" style="${span}"></i></span><span class="src">${word(row.value)}</span></li>`;
    };
    return `${head}<ul class="bars">${rows.map(bar).join("")}</ul><p class="note">Compared with Qloo's average audience. Not a customer count.</p>`;
  }

  // Qloo's cross-domain taste: what people who like this place also like, in music and travel.
  function cultureMarkup(data) {
    const head = `<h4 class="section">Its fans also love <span class="src">Qloo</span></h4>`;
    if (data?.status !== "ok" || (!data.artists?.length && !data.trips?.length)) return `${head}<p class="note">Qloo had no taste links for this place.</p>`;
    const row = (label, items) => (items?.length
      ? `<p class="note">${label}</p><div class="chips">${items.map((item) => `<span class="chip">${esc(item.name)}</span>`).join("")}</div>`
      : "");
    const artists = data.artists || [], trips = data.trips || [];
    const more = row("More music", artists.slice(3)) + row("More trips", trips.slice(3));
    return head + row("Music", artists.slice(0, 3)) + row("Trips", trips.slice(0, 3))
      + `<p class="note">Qloo audience connections, not the place's own playlist.</p>`
      + (more ? `<details class="more"><summary>More taste connections</summary>${more}</details>` : "");
  }

  function footprintLine(data, name) {
    if (data?.status !== "ok" || !data.points?.length) return "Qloo had no taste footprint for this place.";
    return `Violet glow: the ${data.points.length} areas of the island where ${name}'s taste is strongest. Qloo where-popular.`;
  }

  window.ZemiDossier = { markup, audienceMarkup, cultureMarkup, footprintLine, pictureOf, locationThumb, chipTone, CHIP, stars };
})();
