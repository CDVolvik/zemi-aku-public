// The opening plan: one town's verdict for one industry on one printed page, to take on the visit. It reads
// /api/plan (the map's rule-based verdict, no model turn) and writes the same sentences as the map's decision
// card (app/decision.js). The QR code is drawn with app/vendor/qrcode.js (qrcode-generator 2.0.4, MIT).
(function () {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const params = new URLSearchParams(location.search);
  const lang = params.get("lang") === "es" ? "es" : "en";
  const es = lang === "es";
  document.documentElement.lang = lang;

  const T = es ? {
    kicker: "Zemi-Aku · Plan de apertura", title: (kind, town) => `${kind} en ${town}`, made: "Preparado el", print: "Imprimir o guardar PDF",
    map: "Abrir en el mapa", other: "English", verdict: "El veredicto", compare: "Para comparar", visits: "Lista de visitas",
    checklist: "En el terreno", limits: "Lo que estos datos no dicen", sources: "Fuentes",
    noCompare: "No hay otro pueblo del grupo brecha para esta industria.", basis: { next: "el siguiente pueblo del grupo brecha por gusto", top: "el primer pueblo del grupo brecha por gusto" }, away: (km) => `a ${km} km en línea recta`,
    rows: ["Grupo", "Gusto (Qloo)", "Negocios con empleados (Censo)", "Por cada 10,000 residentes"], rank: (n, of) => `#${n} de ${of}`,
    median: (m) => `Los grupos se dividen en la mediana de ${m} por cada 10,000.`, upTo: (n) => `hasta ${n}`,
    noPlaces: "Ni Qloo ni Overture tienen lugares de este tipo aquí; la visita es la lista.", noPlacesQloo: "Qloo no tiene lugares de este tipo aquí y los datos de Overture no están disponibles; la visita es la lista.", noHours: "sin horario publicado", noAddress: "sin dirección en el catálogo", notes: "Notas",
    overture: "Del mapa de Overture; no está en el catálogo de Qloo, así que no hay dirección ni horario aquí.",
    compareNamed: (town, basis) => `Compare con ${town}, ${basis} (tabla de arriba), antes de decidir.`,
    count: "Cuente usted los negocios de este tipo en la calle principal y compárelo con el conteo del Censo de arriba.",
    screening: "Es un primer filtro: dónde el gusto va por delante de la oferta. No es un plan de negocio ni una proyección de ventas.",
    scan: "Escanee para abrir este veredicto en el mapa en vivo", failed: "No se pudo preparar el plan. Vuelva al mapa y pruebe otra vez.",
    missing: "Escoja una industria y un pueblo en el mapa para preparar un plan.", loading: "Preparando el plan…",
  } : {
    kicker: "Zemi-Aku · Opening plan", title: (kind, town) => `${kind} in ${town}`, made: "Prepared on", print: "Print or save as PDF",
    map: "Open on the map", other: "Español", verdict: "The verdict", compare: "To compare", visits: "Visit list",
    checklist: "In the field", limits: "What this data cannot tell you", sources: "Sources",
    noCompare: "There is no other gap-group town for this industry.", basis: { next: "the next gap-group town by taste rank", top: "the top gap-group town by taste rank" }, away: (km) => `${km} km away in a straight line`,
    rows: ["Group", "Taste (Qloo)", "Businesses with employees (Census)", "Per 10,000 residents"], rank: (n, of) => `#${n} of ${of}`,
    median: (m) => `Groups split at the median of ${m} per 10,000.`, upTo: (n) => `up to ${n}`,
    noPlaces: "Neither Qloo nor Overture lists places of this type here; the visit is the list.", noPlacesQloo: "Qloo lists no places of this type here and Overture's data is unavailable; the visit is the list.", noHours: "hours not listed", noAddress: "no address in the catalog", notes: "Notes",
    overture: "From Overture's map; not in Qloo's catalog, so no address or hours here.",
    compareNamed: (town, basis) => `Compare with ${town}, ${basis} (the table above), before you decide.`,
    count: "Count this kind of business on the main street yourself and compare it with the Census count above.",
    screening: "This is a screening: where taste runs ahead of supply. It is not a business plan or a sales forecast.",
    scan: "Scan to open this verdict on the live map", failed: "The plan could not be prepared. Go back to the map and try again.",
    missing: "Pick an industry and a town on the map to prepare a plan.", loading: "Preparing the plan…",
  };

  const fix = (n) => Number(n).toFixed(1);
  const groupName = (group) => String(ZemiOpportunity.LABELS[lang][group] || "").split(": ")[0];
  const capital = (s) => String(s).charAt(0).toUpperCase() + String(s).slice(1);
  // One Letter page holds seven visits only if no catalog string runs long (Codex review 10/26): each is clipped.
  const clip = (s, n) => { const t = String(s ?? "").replace(/\s+/g, " ").trim(); return t.length > n ? `${t.slice(0, n - 1)}…` : t; };
  const fact = (place, label) => clip((place.facts || []).find((row) => row.label === label)?.text || "", 72);
  // Catalog phones are stored as +1 and ten digits; a printed sheet reads them as (787) 555-0100.
  const phoneText = (raw) => String(raw).replace(/^\+?1?(\d{3})(\d{3})(\d{4})$/, "($1) $2-$3");

  function rowCells(row, digits = 1) {
    const fix = (n) => Number(n).toFixed(digits);
    const businesses = row.suppressed ? `0–${row.establishmentsMax ?? 2}` : String(row.establishments ?? "—");
    const per = row.suppressed ? (Number.isFinite(row.perTenThousandMax) ? T.upTo(fix(row.perTenThousandMax)) : "—")
      : Number.isFinite(row.perTenThousand) ? fix(row.perTenThousand) : "—";
    return [groupName(row.group), Number.isFinite(row.tasteRank) ? T.rank(row.tasteRank, row.ranked) : "—", businesses, per];
  }

  function compareTable(town, o, compare) {
    if (!compare) return `<p>${esc(T.noCompare)}</p>`;
    const rate = (r) => (r.suppressed ? r.perTenThousandMax : r.perTenThousand);
    const close = Number(rate(o)).toFixed(1) === Number(rate(compare)).toFixed(1) && rate(o) !== rate(compare);
    const mine = rowCells(o, close ? 2 : 1), theirs = rowCells(compare, close ? 2 : 1);
    const median = Number.isFinite(o.medianPerTenThousand) ? `<p class="small">${esc(T.median(fix(o.medianPerTenThousand)))}</p>` : "";
    return `<table class="versus"><thead><tr><th></th><th>${esc(town)}</th><th>${esc(compare.town)}<span class="away">${esc([T.basis[compare.basis], Number.isFinite(compare.distanceKm) ? T.away(compare.distanceKm) : ""].filter(Boolean).join(" · "))}</span></th></tr></thead><tbody>`
      + T.rows.map((label, i) => `<tr><th>${esc(label)}</th><td>${esc(mine[i])}</td><td>${esc(theirs[i])}</td></tr>`).join("")
      + `</tbody></table>${median}`;
  }

  function visitList(places, supply) {
    const rows = places.slice(0, 5).map((place) => {
      const address = fact(place, "Address") || T.noAddress;
      const hours = clip(ZemiMarks.hoursText(place.hours, lang), 56) || T.noHours;
      const phone = phoneText(fact(place, "Phone"));
      return `<li><b>${esc(clip(place.name, 60))}</b><span>${esc(address)}</span><span>${esc(hours)}${phone ? ` · ${esc(phone)}` : ""}</span><span class="write">${esc(T.notes)}:</span></li>`;
    });
    const seen = new Set(places.slice(0, 5).map((p) => String(p.name).toLowerCase()));
    const ground = (supply?.places || []).map((p) => p?.name).filter((n) => n && !seen.has(String(n).toLowerCase())).slice(0, 2);
    for (const name of ground) rows.push(`<li><b>${esc(clip(name, 60))}</b><span>${esc(T.overture)}</span><span class="write">${esc(T.notes)}:</span></li>`);
    return rows.length ? `<ol class="visits">${rows.join("")}</ol>` : `<p>${esc(supply ? T.noPlaces : T.noPlacesQloo)}</p>`;
  }

  // Dark modules as one SVG path; a 4-module quiet zone all round, as scanners expect.
  function qrSvg(text) {
    const code = qrcode(0, "M");
    code.addData(text);
    code.make();
    const n = code.getModuleCount();
    let d = "";
    for (let r = 0; r < n; r += 1) for (let c = 0; c < n; c += 1) if (code.isDark(r, c)) d += `M${c + 4} ${r + 4}h1v1h-1z`;
    return `<svg viewBox="0 0 ${n + 8} ${n + 8}" role="img" aria-label="QR"><rect width="100%" height="100%" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
  }

  function render(plan) {
    const business = plan.business, o = business.evidence.opportunity;
    // The map's visit line: the places the map's card named (their ids ride in the link), else the places the verdict
    // names, then the rest of the list.
    const linked = [...new Set((params.get("visit") || "").split(","))].map((id) => plan.places.find((p) => p.id === id)).filter(Boolean).slice(0, 3);
    const named = linked.length ? linked : ZemiMarks.picks(plan.places, plan.speech, 3, { exact: true });
    const keys = new Set(named.map((p) => p.id || p.name));
    const places = [...named, ...plan.places.filter((p) => !keys.has(p.id || p.name))];
    // The checklist repeats the visit names; they print clipped there too, so no catalog string grows the page, while the
    // Qloo and Overture lists are matched on the full names (Codex review 10/26 r2, r3).
    const { says, cannot, checks } = ZemiDecision.parts(business, o, places, lang, { shown: (name) => clip(name, 60) });
    // A gap town's third check asks for the next gap town; the plan names it, as the verdict note does.
    if (o.group === "gap" && plan.compare) checks[2] = esc(T.compareNamed(plan.compare.town, T.basis[plan.compare.basis]));
    // The verdict's first sentence (group and rank) leads in bold; the counts follow.
    const cut = says.indexOf(". ");
    const lead = cut < 0 ? says : says.slice(0, cut + 1), rest = cut < 0 ? "" : says.slice(cut + 2);
    const kind = capital(plan.label[lang]);
    const live = `${location.origin}/app?${new URLSearchParams({ town: plan.town, ask: ZemiOpportunity.townQuestion(lang, plan.industry, plan.town), ...(es ? { lang: "es" } : {}) })}`;
    const made = new Date(plan.at).toLocaleDateString(es ? "es-PR" : "en-US", { year: "numeric", month: "long", day: "numeric" });
    document.title = `${T.title(kind, plan.town)} · ${T.kicker}`;
    $("kicker").textContent = T.kicker;
    $("title").textContent = T.title(kind, plan.town);
    $("made").textContent = `${T.made} ${made}`;
    $("map").href = live;
    $("plan").innerHTML = `<section class="verdict"><h2>${esc(T.verdict)}</h2>`
      + `<p class="group"><span class="swatch" style="background:${ZemiOpportunity.GROUP_COLORS[o.group] || "#6b7280"}"></span><span>${lead}</span></p>${rest ? `<p>${rest}</p>` : ""}</section>`
      + `<section><h2>${esc(T.compare)}</h2>${compareTable(plan.town, o, plan.compare)}</section>`
      + `<section class="wide"><h2>${esc(T.visits)}</h2>${visitList(places, business.evidence.supply)}</section>`
      + `<section><h2>${esc(T.checklist)}</h2><ul class="checks">${[...checks, esc(T.count)].map((c) => `<li>${c}</li>`).join("")}</ul></section>`
      + `<section><h2>${esc(T.limits)}</h2><p>${cannot}</p><p>${esc(T.screening)}</p></section>`
      + `<footer class="wide"><div class="qr">${qrSvg(live)}</div><div><p><b>${esc(T.scan)}</b></p><p class="url">${esc(decodeURI(live))}</p>`
      + `<h2>${esc(T.sources)}</h2><div class="sources">${(o.notes || []).map((line) => `<p class="small">${esc(line)}</p>`).join("")}</div></div></footer>`;
  }

  async function load() {
    const industry = params.get("industry") || "", town = params.get("town") || "";
    const other = new URLSearchParams(params);
    if (es) other.delete("lang"); else other.set("lang", "es");
    $("other").href = `/plan?${other}`;
    $("other").textContent = T.other;
    $("print").textContent = T.print;
    $("map").textContent = T.map;
    $("kicker").textContent = T.kicker;
    if (!industry || !town) { $("plan").innerHTML = `<p>${esc(T.missing)}</p>`; return; }
    $("plan").innerHTML = `<p>${esc(T.loading)}</p>`;
    try {
      const res = await fetch(`/api/plan?${new URLSearchParams({ industry, town, lang })}`);
      if (!res.ok) throw new Error(String(res.status));
      render(await res.json());
    } catch {
      $("plan").innerHTML = `<p>${esc(T.failed)}</p>`;
    }
  }

  $("print").addEventListener("click", () => window.print());
  load();
})();
