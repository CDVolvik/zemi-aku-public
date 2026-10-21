import WebSocket from "ws";

export const COAST_BOUNDS = [[17.5, -67.5], [18.8, -65]];
const TTL = 10 * 60 * 1000;
const clean = value => typeof value === "string" ? value.replace(/[@\u0000-\u001f\u007f]/g, "").trim().slice(0, 80) : "";
const numberIn = (value, min, max) => Number.isFinite(value) && value >= min && value < max ? value : null;

export function createShipStore(clock = Date.now) {
  const ships = new Map();
  function prune() {
    for (const [id, ship] of ships) if (clock() - ship.receivedAt > TTL) ships.delete(id);
    while (ships.size > 500) ships.delete(ships.keys().next().value);
  }
  return {
    ingest(event) {
      const meta = event?.MetaData;
      const id = String(meta?.MMSI || "");
      if (!/^[1-9]\d{8}$/.test(id)) return;
      const report = event.Message?.[event.MessageType];
      if (!report || report.Valid === false) return;
      const previous = ships.get(id);
      if (event.MessageType === "ShipStaticData") {
        // A voyage report contains no new position. Never refresh a marker's age from it.
        if (previous) {
          previous.destination = clean(report.Destination);
          previous.name = clean(report.Name) || previous.name;
          previous.voyageReceivedAt = clock();
        }
        return;
      }
      if (!["PositionReport", "StandardClassBPositionReport", "ExtendedClassBPositionReport"].includes(event.MessageType)) return;
      const lat = report.Latitude, lon = report.Longitude;
      if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < 17.5 || lat > 18.8 || lon < -67.5 || lon > -65) return;
      const parsed = typeof meta.time_utc === "string" ? Date.parse(meta.time_utc.replace(/ UTC$/, "")) : NaN;
      const positionAt = Number.isFinite(parsed) ? parsed : null;
      if (positionAt !== null && (clock() - positionAt > TTL || positionAt > clock() + 60000 || (previous?.positionAt && positionAt < previous.positionAt))) return;
      ships.set(id, { mmsi: id, name: clean(meta.ShipName) || previous?.name || `Vessel ${id}`, lat, lon,
        speedKnots: numberIn(report.Sog, 0, 102.3), course: numberIn(report.Cog, 0, 360), heading: numberIn(report.TrueHeading, 0, 360),
        receivedAt: clock(), positionAt, destination: previous?.destination || "", voyageReceivedAt: previous?.voyageReceivedAt || null });
      prune();
    },
    snapshot() {
      prune();
      return [...ships.values()].filter(s => clock() - (s.positionAt ?? s.receivedAt) <= TTL).map(s => ({ ...s }));
    },
  };
}

// One server-side stream shared by visitors. No browser key, no new dependency, no paid tier.
export function createShipFeed({ key, enabled = false, Socket = WebSocket, clock = Date.now }) {
  const store = createShipStore(clock);
  let socket, retry, monitor, attempts = 0, lastVisit = 0, lastPong = 0, state = enabled && key ? "idle" : "disabled";
  const stop = () => {
    clearTimeout(retry); clearInterval(monitor);
    retry = monitor = null;
    if (socket) { const old = socket; socket = null; old.terminate(); }
    if (state !== "disabled") state = "idle";
  };
  function connect() {
    if (socket || state === "disabled" || attempts >= 3) return;
    attempts++;
    state = "connecting";
    const current = new Socket("wss://stream.aisstream.io/v0/stream", { perMessageDeflate: true, maxPayload: 65536, handshakeTimeout: 10000 });
    socket = current;
    current.on("open", () => {
      lastPong = clock();
      current.send(JSON.stringify({ APIKey: key, BoundingBoxes: [COAST_BOUNDS],
        FilterMessageTypes: ["PositionReport", "StandardClassBPositionReport", "ExtendedClassBPositionReport", "ShipStaticData"] }));
      state = "waiting";
    });
    current.on("pong", () => { if (socket === current) lastPong = clock(); });
    current.on("message", bytes => {
      let event;
      try { event = JSON.parse(bytes.toString()); } catch { return; }
      if (event.error || event.Error) { state = "unavailable"; attempts = 3; current.close(); return; }
      store.ingest(event);
      if (event.MetaData) state = "connected";
    });
    current.on("error", () => { state = "unavailable"; });
    current.on("close", () => {
      if (socket !== current) return;
      socket = null;
      state = "unavailable";
      if (attempts < 3 && clock() - lastVisit < 90000) retry = setTimeout(connect, 5000 * 2 ** (attempts - 1) + Math.random() * 1000).unref();
    });
    if (!monitor) monitor = setInterval(() => {
      if (clock() - lastVisit > 90000) { stop(); attempts = 0; }
      else if (socket?.readyState === WebSocket.OPEN) {
        if (clock() - lastPong > 60000) socket.terminate();
        else socket.ping();
      }
    }, 30000).unref();
  }
  return {
    snapshot() {
      lastVisit = clock();
      connect();
      return { state, source: "AISStream", bounds: COAST_BOUNDS, maxAgeMinutes: 10, ships: store.snapshot(),
        note: state === "disabled" ? "Live ship positions are not connected yet. Ports and places ashore are available."
          : "Received AIS positions only. Coverage can be incomplete; declared destinations are not confirmed arrivals. No predicted routes or ETAs." };
    },
    close: stop,
  };
}
