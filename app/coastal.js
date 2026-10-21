(function () {
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fold = value => String(value).normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

  window.ZemiCoastal = { mount({ viewer, Cesium, onHome, onPlaces, onMapMode }) {
    const source = new Cesium.CustomDataSource("coast");
    viewer.dataSources.add(source);
    let mode = "places", ports = [], ships = [], selectedPort = null, selectedShip = null, request = null, timer = null, generation = 0;
    let category = "all", artist = "", portAttribution = "";
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
        const line = mode === "ports" ? `${row.unlocode} · harbor reference point` : `Declared destination: ${row.destination || "unknown"}`;
        return `<button type="button" class="coast-card" data-coast-record="${esc(key)}" aria-pressed="${selected}"><strong>${esc(row.name)}</strong><span>${esc(line)}</span></button>`;
      }).join("") : `<p class="small">${query ? "No records match this search." : mode === "ships" ? "No recent ship positions received for this area." : "No ports available."}</p>`;
    }
    function portDetail(port, move = true) {
      generation++; request?.abort(); request = null;
      selectedPort = port; selectedShip = null; category = "all"; artist = "";
      const detail = $("coastal-detail");
      detail.hidden = false;
      detail.innerHTML = `<h3>${esc(port.name)}</h3><p class="small">${esc(port.unlocode)} · ${esc(port.town)}</p><p class="small">Explore Qloo places within 5 km of this harbor reference point. Distances are straight-line, not walking routes.</p>
        <div class="seg" role="group" aria-label="Places ashore"><button type="button" data-coast-category="all" aria-pressed="true">Explore</button><button type="button" data-coast-category="food" aria-pressed="false">Food</button><button type="button" data-coast-category="culture" aria-pressed="false">Culture</button></div>
        <label for="coastal-artist">An artist you like (optional)</label><input id="coastal-artist" placeholder="For example, Bad Bunny" maxlength="80">
        <button type="button" id="coastal-go">Find places ashore</button><p class="small" id="coastal-result" role="status"></p>`;
      paint(); list(); if (move) frame(port);
    }
    function shipDetail(ship, move = true) {
      selectedShip = ship; selectedPort = null;
      const declared = fold(ship.destination).replace(/\s/g, "");
      const destination = ports.find(p => [p.unlocode, p.name, p.town].some(value => fold(value).replace(/\s/g, "") === declared));
      const nearest = [...ports].sort((a, b) => distance(ship, a) - distance(ship, b))[0];
      const port = destination || nearest;
      $("coastal-detail").hidden = false;
      $("coastal-detail").innerHTML = `<h3>${esc(ship.name)}</h3><p class="small">MMSI ${esc(ship.mmsi)}</p><p>Declared destination: <strong>${esc(ship.destination || "unknown")}</strong></p><p class="small">Speed: ${ship.speedKnots === null ? "unknown" : esc(ship.speedKnots) + " kn"} · Course: ${ship.course === null ? "unknown" : esc(ship.course) + "°"}</p>
        <p class="small">Received ${esc(new Date(ship.receivedAt).toLocaleTimeString())}. ${ship.positionAt ? "Position timestamp: " + esc(new Date(ship.positionAt).toLocaleTimeString()) : "Position timestamp unavailable."}</p>
        <p class="small">AIS declarations can be outdated. No arrival or route is confirmed.</p>
        ${port ? `<button type="button" data-ship-port="${esc(port.id)}">${destination ? "Explore declared port" : "Explore nearby port"}: ${esc(port.name)}</button>${destination ? "" : '<p class="small">The nearby port is selected by location, not the declared voyage destination.</p>'}` : ""}`;
      list(); if (move) frame(ship);
    }
    async function pollShips(token) {
      try {
        const response = await fetch("/api/coastal/ships", { signal: AbortSignal.timeout(10000) });
        if (!response.ok) throw new Error();
        const data = await response.json();
        if (token !== generation || mode !== "ships") return;
        ships = data.ships;
        $("coastal-note").textContent = `${data.state === "disabled" ? "Not connected" : data.state === "connected" ? "Feed connected" : data.state === "unavailable" ? "Feed unavailable" : "Waiting for positions"} · ${ships.length} recent vessels. ${data.note}`;
        paint(); list();
        if (selectedShip) {
          const fresh = ships.find(s => s.mmsi === selectedShip.mmsi);
          if (fresh) shipDetail(fresh, false); else { selectedShip = null; $("coastal-detail").hidden = true; }
        }
        if (data.state === "disabled") return;
      } catch {
        if (token !== generation) return;
        ships = []; selectedShip = null; $("coastal-detail").hidden = true; paint(); list();
        $("coastal-note").textContent = "Ship positions could not refresh. Ports and places ashore are still available.";
      }
      if (token === generation && mode === "ships") timer = setTimeout(() => pollShips(token), 15000);
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
      $("coastal-title").textContent = mode === "ports" ? "Arrive by sea. Explore ashore." : "Ships around Puerto Rico";
      $("coastal-search").placeholder = mode === "ports" ? "Search a port" : "Search a ship or destination";
      $("coastal-search").value = ""; $("coastal-detail").hidden = true;
      $("coastal-note").textContent = "Loading coastal records…";
      const token = generation;
      try {
        if (!ports.length) {
          const response = await fetch("/api/coastal/ports", { signal: AbortSignal.timeout(10000) });
          if (!response.ok) throw new Error();
          const data = await response.json(); ports = data.ports;
          portAttribution = `<a href="${esc(data.url)}" target="_blank" rel="noopener noreferrer">${esc(data.source)}</a> · retrieved ${esc(data.retrieved)}. ${esc(data.note)}`;
        }
        if (token !== generation) return;
        $("coastal-source").innerHTML = mode === "ships"
          ? `<a href="https://aisstream.io/" target="_blank" rel="noopener noreferrer">Ship positions: AISStream</a>. Only recent received reports are shown.<br>Harbor references: ${portAttribution}`
          : portAttribution;
        paint(); list(); frame(ports[0]);
        if (mode === "ships") await pollShips(token);
        else $("coastal-note").textContent = "Choose a port, then find food, culture and Qloo taste matches nearby.";
      } catch {
        if (token === generation) $("coastal-note").textContent = "Coastal records could not load. Switch to Places to explore the island.";
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
      $("coastal-result").textContent = artist ? "Reading Qloo's taste connections…" : "Reading the saved Qloo catalog…";
      try {
        const query = new URLSearchParams({ port: port.id, category, artist });
        const response = await fetch(`/api/coastal/places?${query}`, { signal: controller.signal });
        const data = await response.json();
        if (token !== generation) return;
        if (!response.ok) throw new Error(data.error || "Places could not load.");
        await open("places", false); selectedPort = port;
        onPlaces(data);
        $("coast-return").textContent = `Back to ${port.name} port`; $("coast-return").hidden = false;
      } catch (error) {
        if (token === generation) $("coastal-result").textContent = error.name === "AbortError" ? "The request took too long. Please try again." : error.message;
      } finally {
        clearTimeout(timeout); if (request === controller) request = null;
        if ($("coastal-go")) $("coastal-go").disabled = false;
      }
    });
    document.addEventListener("visibilitychange", () => {
      if (mode !== "ships") return;
      if (document.hidden) { generation++; clearTimeout(timer); } else pollShips(++generation);
    });
    return { open, pick(entity) {
      if (mode === "places") return false;
      if (entity?.coastalPort) { const port = ports.find(p => p.id === entity.coastalPort); open("ports", false).then(() => port && portDetail(port)); return true; }
      if (entity?.coastalShip) { const ship = ships.find(s => s.mmsi === entity.coastalShip); if (ship) shipDetail(ship); return true; }
      return true;
    } };
  } };
}());
