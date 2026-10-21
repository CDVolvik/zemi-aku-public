// Weather on the map: RainViewer rain radar and infrared cloud tiles as imagery layers, National
// Hurricane Center storms as marks, and one forecast line for the open town. The agent turns the
// rain on when it talks about it; the visitor can turn either layer on from the map menu.
(function () {
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // "Tuesday: 90°F / 32°C, 60% chance of rain, chance showers and thunderstorms." The first daytime
  // period, or the first one there is. An active alert leads.
  function line(data) {
    const periods = data?.forecast?.periods || [];
    const period = periods.find((p) => p.daytime) || periods[0];
    if (!period) return "";
    const bits = [`${period.fahrenheit}°F / ${period.celsius}°C`];
    if (period.rainChance != null) bits.push(`${period.rainChance}% chance of rain`);
    if (period.forecast) bits.push(period.forecast.toLowerCase());
    const alert = data?.alerts?.alerts?.[0];
    const warning = alert ? `${alert.event} in effect (weather.gov). ` : "";
    return `${warning}${period.name}: ${bits.join(", ")}.`;
  }

  function mount({ viewer, Cesium, fetchJson }) {
    const layers = { radar: null, clouds: null };
    const storms = new Cesium.CustomDataSource("storms");
    viewer.dataSources.add(storms);
    let manifest = null;
    let manifestAt = 0;
    async function frames() {
      if (manifest && !manifest.error && Date.now() - manifestAt < 5 * 60 * 1000) return manifest;
      manifest = await fetchJson("/api/weather/radar").catch(() => ({ error: "unavailable" }));
      manifestAt = Date.now();
      return manifest;
    }
    // kind: "radar" (rain) or "clouds" (infrared). Returns whether the layer is on afterwards.
    async function show(kind, on) {
      if (!on) {
        if (layers[kind]) viewer.imageryLayers.remove(layers[kind], true);
        layers[kind] = null;
        return false;
      }
      if (layers[kind]) return true;
      const m = await frames();
      const frame = kind === "radar" ? m.radar : m.infrared;
      if (m.error || !frame?.path) return false;
      if (layers[kind]) return true;
      const url = kind === "radar"
        ? `${m.host}${frame.path}/256/{z}/{x}/{y}/2/1_1.png`
        : `${m.host}${frame.path}/256/{z}/{x}/{y}/0/0_0.png`;
      // RainViewer serves zoom 7 at most (closer tiles come back as a "not supported" card); Cesium scales the last level up.
      const layer = viewer.imageryLayers.addImageryProvider(new Cesium.UrlTemplateImageryProvider({ url, credit: new Cesium.Credit('<a href="https://www.rainviewer.com/" target="_blank" rel="noopener noreferrer">Weather data by RainViewer</a>'), maximumLevel: 7 }));
      layer.alpha = kind === "radar" ? 0.8 : 0.55;
      layers[kind] = layer;
      return true;
    }
    const isOn = (kind) => Boolean(layers[kind]);

    function drawStorms(list) {
      storms.entities.removeAll();
      for (const storm of list || []) {
        if (storm.lat == null || storm.lon == null) continue;
        storms.entities.add({
          position: Cesium.Cartesian3.fromDegrees(storm.lon, storm.lat, 0),
          point: { pixelSize: 16, color: Cesium.Color.fromCssColorString("#e4573d").withAlpha(0.9), outlineColor: Cesium.Color.WHITE, outlineWidth: 3,
            disableDepthTestDistance: Number.POSITIVE_INFINITY },
          label: { text: `${storm.kind} ${storm.name}`.trim(), font: "600 13px system-ui, sans-serif", fillColor: Cesium.Color.WHITE,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE, outlineColor: Cesium.Color.BLACK.withAlpha(0.8), outlineWidth: 4,
            pixelOffset: new Cesium.Cartesian2(0, -22), disableDepthTestDistance: Number.POSITIVE_INFINITY },
          stormName: storm.name,
        });
      }
    }

    return { show, isOn, drawStorms, line, esc };
  }

  window.ZemiWeather = { mount, line };
})();
