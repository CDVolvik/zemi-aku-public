(function () {
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fold = value => String(value).normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  // The page language (renderHero sets <html lang>); the feeds' own notes stay as their sources wrote them.
  const isEs = () => document.documentElement.lang === "es";
  const tr = (en, es) => (isEs() ? es : en);

  window.ZemiCoastal = { mount({ viewer, Cesium, onHome, onPlaces, onMapMode }) {
    const source = new Cesium.CustomDataSource("coast");
    viewer.dataSources.add(source);
    let mode = "places", ports = [], ships = [], selectedPort = null, selectedShip = null, request = null, timer = null, generation = 0;
    let category = "all", artist = "", portAttribution = "", note = null;
    // The status line is kept as a function of the language, so a language switch can redraw it.
    const setNote = (render) => { note = render; $("coastal-note").textContent = render ? render() : ""; };
    const distance = (a, b) => Math.hypot((a.lat - b.lat) * 111, (a.lon - b.lon) * 105);
    const frame = point => viewer.camera.flyTo({ destination: Cesium.Cartesian3.fromDegrees(point.lon + .04, point.lat, 24000), duration: matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 1.1 });
    function paint() {
      source.entities.removeAll();
      for (const port of ports) {
        const entity = source.entities.add({ position: Cesium.Cartesian3.fromDegrees(port.lon, port.lat, 10),
          point: { pixelSize: selectedPort?.id === port.id ? 16 : 11, color: Cesium.Color.fromCssColorString("#f5b35b"), outlineColor: Cesium.Color.BLACK, outlineWidth: 2, disableDepthTestDistance: Infinity },
          label: { text: port.name, font: "12px sans-serif", fillColor: Cesium.Color.WHITE, showBackground: true, backgroundColor: Cesium.Color.BLACK.withAlpha(.75), pixelOffset: new Cesium.Cartesian2(0, -22), distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 100000), disableDepthTestDistance: Infinity } });
        entity.coastalPort = port.id;
      }
      if (mode === "ships") for (const ship of ships) {
        const entity = source.entities.add({ position: Cesium.Cartesian3.fromDegrees(ship.lon, ship.lat, 15),
          point: { pixelSize: 9, color: Cesium.Color.fromCssColorString("#66dbc2"), outlineColor: Cesium.Color.BLACK, outlineWidth: 2, disableDepthTestDistance: Infinity } });
        entity.coastalShip = ship.mmsi;
      }
      source.show = mode !== "places";
    }
    function list() {
      const query = fold($("coastal-search").value);
      const rows = mode === "ports" ? ports : ships;
      const shown = rows.filter(row => fold(`${row.name} ${row.town || row.destination || row.mmsi}`).includes(query));
      $("coastal-list").innerHTML = shown.length ? shown.map(row => {
        const key = mode === "ports" ? row.id : row.mmsi;
        const selected = mode === "ports" ? selectedPort?.id === key : selectedShip?.mmsi === key;
        const line = mode === "ports" ? `${row.unlocode} · ${tr("harbor reference point", "punto de referencia del puerto")}`
          : `${tr("Declared destination", "Destino declarado")}: ${row.destination || tr("unknown", "desconocido")}`;
        return `<button type="button" class="coast-card" data-coast-record="${esc(key)}" aria-pressed="${selected}"><strong>${esc(row.name)}</strong><span>${esc(line)}</span></button>`;
      }).join("") : `<p class="small">${query ? tr("No records match this search.", "Ningún registro coincide con esta búsqueda.")
        : mode === "ships" ? tr("No recent ship positions received for this area.", "No llegaron posiciones recientes de barcos en esta zona.")
        : tr("No ports available.", "No hay puertos disponibles.")}</p>`;
    }
    function portDetail(port, move = true) {
      generation++; request?.abort(); request = null;
      selectedPort = port; selectedShip = null; category = "all"; artist = "";
      const detail = $("coastal-detail");
      detail.hidden = false;
      const typed = $("coastal-artist")?.value || "";
      detail.innerHTML = `<h3>${esc(port.name)}</h3><p class="small">${esc(port.unlocode)} · ${esc(port.town)}</p><p class="small">${tr("Explore Qloo places within 5 km of this harbor reference point. Distances are straight-line, not walking routes.", "Explore lugares de Qloo a menos de 5 km de este punto del puerto. Las distancias son en línea recta, no rutas a pie.")}</p>
        <div class="seg" role="group" aria-label="${tr("Places ashore", "Lugares en tierra")}"><button type="button" data-coast-category="all" aria-pressed="true">${tr("Explore", "Explorar")}</button><button type="button" data-coast-category="food" aria-pressed="false">${tr("Food", "Comida")}</button><button type="button" data-coast-category="culture" aria-pressed="false">${tr("Culture", "Cultura")}</button></div>
        <label for="coastal-artist">${tr("An artist you like (optional)", "Un artista que le guste (opcional)")}</label><input id="coastal-artist" placeholder="${tr("For example, Bad Bunny", "Por ejemplo, Bad Bunny")}" maxlength="80" value="${esc(typed)}">
        <button type="button" id="coastal-go">${tr("Find places ashore", "Buscar lugares en tierra")}</button><p class="small" id="coastal-result" role="status"></p>`;
      paint(); list(); if (move) frame(port);
    }
    function shipDetail(ship, move = true) {
      selectedShip = ship; selectedPort = null;
      const declared = fold(ship.destination).replace(/\s/g, "");
      const destination = ports.find(p => [p.unlocode, p.name, p.town].some(value => fold(value).replace(/\s/g, "") === declared));
      const nearest = [...ports].sort((a, b) => distance(ship, a) - distance(ship, b))[0];
      const port = destination || nearest;
      $("coastal-detail").hidden = false;
      const unknown = tr("unknown", "desconocido");
      $("coastal-detail").innerHTML = `<h3>${esc(ship.name)}</h3><p class="small">MMSI ${esc(ship.mmsi)}</p><p>${tr("Declared destination", "Destino declarado")}: <strong>${esc(ship.destination || unknown)}</strong></p><p class="small">${tr("Speed", "Velocidad")}: ${ship.speedKnots === null ? unknown : esc(ship.speedKnots) + " kn"} · ${tr("Course", "Rumbo")}: ${ship.course === null ? unknown : esc(ship.course) + "°"}</p>
        <p class="small">${tr("Received", "Recibido")} ${esc(new Date(ship.receivedAt).toLocaleTimeString())}. ${ship.positionAt ? tr("Position timestamp: ", "Hora de la posición: ") + esc(new Date(ship.positionAt).toLocaleTimeString()) : tr("Position timestamp unavailable.", "Sin hora de la posición.")}</p>
        <p class="small">${tr("AIS declarations can be outdated. No arrival or route is confirmed.", "Las declaraciones AIS pueden estar desactualizadas. No se confirma llegada ni ruta.")}</p>
        ${port ? `<button type="button" data-ship-port="${esc(port.id)}">${destination ? tr("Explore declared port", "Explorar el puerto declarado") : tr("Explore nearby port", "Explorar el puerto cercano")}: ${esc(port.name)}</button>${destination ? "" : `<p class="small">${tr("The nearby port is selected by location, not the declared voyage destination.", "El puerto cercano se escoge por ubicación, no por el destino declarado del viaje.")}</p>`}` : ""}`;
      list(); if (move) frame(ship);
    }
    async function pollShips(token) {
      try {
        const response = await fetch("/api/coastal/ships", { signal: AbortSignal.timeout(10000) });
        if (!response.ok) throw new Error();
        const data = await response.json();
        if (token !== generation || mode !== "ships") return;
        ships = data.ships;
        const count = ships.length;
        setNote(() => `${data.state === "disabled" ? tr("Not connected", "Sin conexión") : data.state === "connected" ? tr("Feed connected", "Fuente conectada") : data.state === "unavailable" ? tr("Feed unavailable", "Fuente no disponible") : tr("Waiting for positions", "Esperando posiciones")} · ${count} ${tr("recent vessels", "barcos recientes")}. ${data.note ? tr(data.note, `Nota de la fuente, en inglés: ${data.note}`) : ""}`.trim());
        paint(); list();
        if (selectedShip) {
          const fresh = ships.find(s => s.mmsi === selectedShip.mmsi);
          if (fresh) shipDetail(fresh, false); else { selectedShip = null; $("coastal-detail").hidden = true; }
        }
        if (data.state === "disabled") return;
      } catch {
        if (token !== generation) return;
        ships = []; selectedShip = null; $("coastal-detail").hidden = true; paint(); list();
        setNote(() => tr("Ship positions could not refresh. Ports and places ashore are still available.", "Las posiciones de los barcos no se actualizaron. Los puertos y los lugares en tierra siguen disponibles."));
      }
      if (token === generation && mode === "ships") timer = setTimeout(() => pollShips(token), 15000);
    }
    function labels() {
      $("coastal-title").textContent = mode === "ports" ? tr("Arrive by sea. Explore ashore.", "Llegue por mar. Explore en tierra.") : tr("Ships around Puerto Rico", "Barcos alrededor de Puerto Rico");
      $("coastal-search").placeholder = mode === "ports" ? tr("Search a port", "Busque un puerto") : tr("Search a ship or destination", "Busque un barco o un destino");
      $("coastal-search").setAttribute("aria-label", tr("Search coastal records", "Buscar en los registros costeros"));
    }
    function sourceLine() {
      const ports = typeof portAttribution === "function" ? portAttribution() : "";
      $("coastal-source").innerHTML = mode === "ships"
        ? `<a href="https://aisstream.io/" target="_blank" rel="noopener noreferrer">${tr("Ship positions: AISStream", "Posiciones de barcos: AISStream")}</a>. ${tr("Only recent received reports are shown.", "Solo se muestran los reportes recientes.")}<br>${tr("Harbor references", "Referencias de puertos")}: ${ports}`
        : ports;
    }
    // A language switch redraws the open coast view in place: title, status, list, source and the open record.
    let relabelPending = false;
    function relabel() {
      if (mode === "places") return;
      if (request) relabelPending = true; // the open port's detail redraws when its request settles
      labels();
      if (note) $("coastal-note").textContent = note();
      sourceLine();
      list();
      if (selectedPort && !request && !$("coastal-detail").hidden) {
        const pressed = category;
        portDetail(selectedPort, false);
        category = pressed;
        for (const b of $("coastal-detail").querySelectorAll("[data-coast-category]")) b.setAttribute("aria-pressed", String(b.dataset.coastCategory === pressed));
      } else if (selectedShip && !$("coastal-detail").hidden) shipDetail(selectedShip, false);
    }
    async function open(next, reset = true) {
      generation++; clearTimeout(timer); request?.abort(); request = null;
      mode = next;
      onMapMode(mode);
      for (const button of $("explore-nav").querySelectorAll("button")) button.setAttribute("aria-pressed", String(button.dataset.explore === mode));
      if (reset) { onHome(); $("coast-return").hidden = true; }
      source.show = mode !== "places";
      $("coastal-panel").hidden = mode === "places";
      $("dockbar").hidden = mode !== "places";
      if (mode === "places") return;
      $("hero").hidden = $("suggest").hidden = true;
      $("panel").hidden = true;
      labels();
      $("coastal-search").value = ""; $("coastal-detail").hidden = true;
      setNote(() => tr("Loading coastal records…", "Cargando los registros costeros…"));
      const token = generation;
      try {
        if (!ports.length) {
          const response = await fetch("/api/coastal/ports", { signal: AbortSignal.timeout(10000) });
          if (!response.ok) throw new Error();
          const data = await response.json(); ports = data.ports;
          portAttribution = () => `<a href="${esc(data.url)}" target="_blank" rel="noopener noreferrer">${esc(data.source)}</a> · ${tr("retrieved", "consultado el")} ${esc(data.retrieved)}. <span lang="en">${esc(data.note)}</span>`;
        }
        if (token !== generation) return;
        sourceLine();
        paint(); list(); frame(ports[0]);
        if (mode === "ships") await pollShips(token);
        else setNote(() => tr("Choose a port, then find food, culture and Qloo taste matches nearby.", "Escoja un puerto y busque comida, cultura y afinidades de Qloo cerca."));
      } catch {
        if (token === generation) setNote(() => tr("Coastal records could not load. Switch to Places to explore the island.", "Los registros costeros no cargaron. Cambie a Lugares para explorar la isla."));
      }
    }
    $("explore-nav").addEventListener("click", event => { const b = event.target.closest("[data-explore]"); if (b) open(b.dataset.explore); });
    $("coastal-search").addEventListener("input", list);
    $("coastal-list").addEventListener("click", event => {
      const id = event.target.closest("[data-coast-record]")?.dataset.coastRecord;
      if (mode === "ports") { const port = ports.find(p => p.id === id); if (port) portDetail(port); }
      else { const ship = ships.find(s => s.mmsi === id); if (ship) shipDetail(ship); }
    });
    $("coast-return").addEventListener("click", async () => { const port = selectedPort; await open("ports"); if (port) portDetail(port); });
    $("coastal-detail").addEventListener("click", async event => {
      const portId = event.target.closest("[data-ship-port]")?.dataset.shipPort;
      if (portId) { await open("ports"); const port = ports.find(p => p.id === portId); if (port) portDetail(port); return; }
      const cat = event.target.closest("[data-coast-category]");
      if (cat) { category = cat.dataset.coastCategory; for (const b of $("coastal-detail").querySelectorAll("[data-coast-category]")) b.setAttribute("aria-pressed", String(b === cat)); return; }
      if (!event.target.closest("#coastal-go") || !selectedPort || request) return;
      artist = $("coastal-artist").value.trim();
      const port = selectedPort, token = generation, controller = new AbortController(); request = controller;
      const timeout = setTimeout(() => controller.abort(), 30000);
      $("coastal-go").disabled = true;
      $("coastal-result").textContent = artist ? tr("Reading Qloo's taste connections…", "Leyendo las conexiones de gusto de Qloo…") : tr("Reading the saved Qloo catalog…", "Leyendo el catálogo guardado de Qloo…");
      try {
        const query = new URLSearchParams({ port: port.id, category, artist, lang: isEs() ? "es" : "en" });
        const response = await fetch(`/api/coastal/places?${query}`, { signal: controller.signal });
        const data = await response.json();
        if (token !== generation) return;
        if (!response.ok) throw new Error(data.error || tr("Places could not load.", "Los lugares no cargaron."));
        await open("places", false); selectedPort = port;
        onPlaces(data);
        $("coast-return").textContent = tr(`Back to ${port.name} port`, `Volver al puerto de ${port.name}`); $("coast-return").hidden = false;
      } catch (error) {
        if (token === generation) $("coastal-result").textContent = error.name === "AbortError" ? tr("The request took too long. Please try again.", "La consulta tardó demasiado. Intente otra vez.") : error.message;
      } finally {
        clearTimeout(timeout); if (request === controller) request = null;
        if ($("coastal-go")) $("coastal-go").disabled = false;
        if (relabelPending) { relabelPending = false; relabel(); }
      }
    });
    document.addEventListener("visibilitychange", () => {
      if (mode !== "ships") return;
      if (document.hidden) { generation++; clearTimeout(timer); } else pollShips(++generation);
    });
    return { open, relabel, pick(entity) {
      if (mode === "places") return false;
      if (entity?.coastalPort) { const port = ports.find(p => p.id === entity.coastalPort); open("ports", false).then(() => port && portDetail(port)); return true; }
      if (entity?.coastalShip) { const ship = ships.find(s => s.mmsi === entity.coastalShip); if (ship) shipDetail(ship); return true; }
      return true;
    } };
  } };
}());
