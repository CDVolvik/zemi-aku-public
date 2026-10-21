// URL hash history for the map: town / place / mode. parse + serialize are pure;
// create() wires navigation with injected deps so node tests can drive it without Cesium.
// autoTilt / userToggle are pure tilt-preference helpers used by setStyle and #tilt-btn.
(function () {
  function isAutoTiltMode(mode) {
    return mode === "buildings" || mode === "photo";
  }

  // Entering buildings/photo auto-enables tilt and remembers the prior preference;
  // leaving restores it. Pure: callers apply tiltEnabled via setTiltEnabled.
  function autoTilt({ mode, prevMode, tiltEnabled, tiltBeforeAuto }) {
    void prevMode; // callers pass it for clarity; enter/leave is driven by mode + tiltBeforeAuto
    if (isAutoTiltMode(mode)) {
      return {
        tiltEnabled: true,
        tiltBeforeAuto: tiltBeforeAuto === null ? !!tiltEnabled : tiltBeforeAuto,
      };
    }
    if (tiltBeforeAuto !== null) {
      return { tiltEnabled: !!tiltBeforeAuto, tiltBeforeAuto: null };
    }
    return { tiltEnabled: !!tiltEnabled, tiltBeforeAuto: null };
  }

  // User toggles #tilt-btn. In buildings/photo, the new choice becomes the leave-restore value.
  function userToggle({ tiltEnabled, mode }) {
    const next = !tiltEnabled;
    return {
      tiltEnabled: next,
      tiltBeforeAuto: isAutoTiltMode(mode) ? next : null,
    };
  }

  function parseHash(hash) {
    const raw = String(hash || "").replace(/^#/, "");
    if (!raw) return {};
    try { return Object.fromEntries(new URLSearchParams(raw)); } catch { return {}; }
  }

  function serializeHash({ town, place, mode } = {}) {
    const params = new URLSearchParams();
    if (town) params.set("town", town);
    if (place) params.set("place", place);
    if (mode && mode !== "eagle") params.set("mode", mode);
    return params.toString();
  }

  function create(deps) {
    const {
      select, openPlace, goHome, showCatalog, setStyle, getState, resolveTown,
      history: hist, location: loc,
    } = deps;
    void showCatalog; // beginUserNav is called from the app's showCatalog; kept for a uniform surface

    let hashQuiet = false;
    let hashReady = false; // first write (boot / restore) uses replaceState; later user nav uses pushState
    let navSeq = 0;

    function beginUserNav() {
      navSeq += 1;
      hashQuiet = false;
    }

    function readHash() {
      return parseHash(loc.hash);
    }

    function syncHash({ replace = false } = {}) {
      if (hashQuiet) return;
      const state = getState();
      const place = state.step === "place" ? state.openPlaces[state.focusedIndex] : null;
      const next = serializeHash({
        town: state.pickedId,
        place: place?.id || place?.name || "",
        mode: state.styleName,
      });
      const cur = String(loc.hash || "").replace(/^#/, "");
      if (cur === next) { hashReady = true; return; }
      const url = next ? `#${next}` : `${loc.pathname || ""}${loc.search || ""}`;
      if (replace || !hashReady) hist.replaceState(null, "", url);
      else hist.pushState(null, "", url);
      hashReady = true;
    }

    function findOpenPlace(key, openPlaces) {
      if (!key) return null;
      return openPlaces.find((p) => p.id === key) || openPlaces.find((p) => p.name === key) || null;
    }

    async function restoreHash() {
      const seq = ++navSeq;
      // Coalesce double-fires in the same turn (e.g. rapid Back) before any work.
      await Promise.resolve();
      if (seq !== navSeq) return;
      const { town: rawTown, place, mode } = readHash();
      const town = resolveTown(rawTown);
      // syncHash omits eagle; a hash without mode means eagle, so Back from buildings restores it.
      const want = mode || "eagle";
      hashQuiet = true;
      try {
        const state = getState();
        if (["eagle", "satellite", "buildings", "photo"].includes(want) && want !== state.styleName) {
          try { await setStyle(want, { reframe: false, waitTiles: false }); } catch {}
          if (seq !== navSeq) return;
        }
        if (!town) {
          if (getState().step !== "island") goHome({ fromHistory: true });
          return;
        }
        await select(town, { frame: true, fromHistory: true });
        if (seq !== navSeq) return;
        if (place) {
          const found = findOpenPlace(place, getState().openPlaces);
          if (found) openPlace(found, { fly: true, fromHistory: true });
        }
      } finally {
        if (seq === navSeq) hashQuiet = false;
      }
      if (seq !== navSeq) return;
      if (town) syncHash({ replace: true });
    }

    async function onHistoryNav() {
      await restoreHash();
    }

    return {
      beginUserNav,
      readHash,
      syncHash,
      restoreHash,
      onHistoryNav,
      findOpenPlace,
      // Test / debug accessors
      isQuiet: () => hashQuiet,
      navSeq: () => navSeq,
      markReady: () => { hashReady = true; },
    };
  }

  window.ZemiHistory = { create, parseHash, serializeHash, autoTilt, userToggle };
})();
