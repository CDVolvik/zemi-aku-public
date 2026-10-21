// Missions: a question-led tour that plays itself, from live Qloo data, and ends on a Qloo place.
// Each beat does one thing (fly, load, open, say). Any touch on the map stops the tour and hands
// the page over. Everything spoken is templated from what the data actually returned.
(function () {
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // Lines in both languages. {name} style slots are filled from the data of the mission so far.
  const T = {
    en: {
      intro: "Start with an artist. Qloo knows what {artist}'s fans also love, and where that taste gathers in Puerto Rico.",
      count: "Across the island, Qloo links {count} places to {artist}'s audience. The strongest is {place}, {kind} in {town}.",
      countOne: "Qloo links one place to {artist}'s audience: {place}, {kind} in {town}.",
      countAmong: "Across the island, Qloo links {count} places to {artist}'s audience. Among them, {place}, {kind} in {town}.",
      place: "{place}. {about}",
      fans: "People who love this place also follow {fan}, and travel to {trip}.",
      fansOnly: "People who love this place also follow {fan}.",
      town: "This is {town}. Qloo knows {count} places here, and it knows what the town loves: {tastes}.",
      townCafes: "Its best-known cafés and bakeries, by Qloo popularity, start with {place}.",
      end: "Ask me anything about Puerto Rico, in English or Spanish. Tap the orb to talk.",
      none: "Qloo returned nothing for that just now. Ask me anything about Puerto Rico instead.",
    },
    es: {
      intro: "Empiece con un artista. Qloo sabe qué más le gusta al público de {artist}, y dónde se reúne ese gusto en Puerto Rico.",
      count: "En toda la isla, Qloo conecta {count} lugares con el público de {artist}. El más fuerte es {place}, {kind} en {town}.",
      countOne: "Qloo conecta un lugar con el público de {artist}: {place}, {kind} en {town}.",
      countAmong: "En toda la isla, Qloo conecta {count} lugares con el público de {artist}. Entre ellos, {place}, {kind} en {town}.",
      place: "{place}. {about}",
      fans: "A quienes les encanta este lugar también siguen a {fan}, y viajan a {trip}.",
      fansOnly: "A quienes les encanta este lugar también siguen a {fan}.",
      town: "Esto es {town}. Qloo conoce {count} lugares aquí, y sabe lo que le gusta al pueblo: {tastes}.",
      townCafes: "Sus cafés y panaderías más conocidos, por popularidad en Qloo, empiezan con {place}.",
      end: "Pregúnteme lo que quiera sobre Puerto Rico, en español o en inglés. Toque la esfera para hablar.",
      none: "Qloo no devolvió nada ahora mismo. Pregúnteme lo que quiera sobre Puerto Rico.",
    },
  };

  const MISSIONS = [
    { id: "bad-bunny", lang: "en", title: "Where Bad Bunny's fans eat", artist: "Bad Bunny", kind: "artist" },
    { id: "vico-c", lang: "en", title: "Vico C, into real places", artist: "Vico C", kind: "artist" },
    { id: "ponce", lang: "es", title: "Ponce, en español", town: "Ponce", kind: "town" },
  ];

  function fill(line, data) {
    return line.replace(/\{(\w+)\}/g, (_, key) => String(data[key] ?? "")).replace(/\s+/g, " ").trim();
  }
  // Short, speakable: the first sentence of a description, at most 160 characters. A period after a
  // single letter or a street abbreviation (C. Luis Muñoz Rivera, Ave. Hostos) does not end a sentence.
  const ABBR = /(?:^|\s)(?:[A-Za-z]|ave|avda|blvd|carr|urb|bo|km|no|núm|num|st|dr|apt|ste)\.$/i;
  function firstSentence(text, max = 160) {
    const parts = String(text || "").split(/(?<=[.!?])\s+/);
    let s = parts.shift() || "";
    while (parts.length && ABBR.test(s)) s += " " + parts.shift();
    return s.length > max ? s.slice(0, max).replace(/\s+\S*$/, "") + "…" : s;
  }
  const home = (place) => place?.municipality || place?.city || "";

  // deps: { select, showCatalog, openFoundPlace, say, fetchJson, lang, voiceLang, flyHome, onStop }
  // say(text) speaks and captions, resolving when the speech ends. Any user input calls stop().
  function create(deps) {
    let running = null;
    let token = 0;

    async function beat(my, fn) {
      if (my !== token) throw new Error("stopped");
      const out = await fn();
      if (my !== token) throw new Error("stopped");
      return out;
    }

    async function artistMission(mission, my, t) {
      const artist = mission.artist;
      await beat(my, () => deps.say(fill(t.intro, { artist })));
      const data = await beat(my, () => deps.fetchJson("/api/ask", { artist, lang: mission.lang }).catch(() => null));
      const places = (data?.places || []).filter((p) => p.lat != null && p.lon != null);
      if (!places.length) return deps.say(fill(t.none, {}));
      await beat(my, async () => deps.showCatalog(data));
      // The place to open: the strongest match that has a photo, among the first five; else the strongest.
      const first = places.slice(0, 5).find((p) => p.image) || places[0];
      const slots = { artist, count: places.length, place: first.name, kind: first.genre || "", town: home(first) };
      const line = places.length === 1 ? t.countOne : first === places[0] ? t.count : t.countAmong;
      await beat(my, () => deps.say(fill(line, slots)));
      await beat(my, () => deps.openFoundPlace(first, home(first)));
      const about = firstSentence(first.description || first.details?.standout || "");
      if (about) await beat(my, () => deps.say(fill(t.place, { place: first.name, about })));
      const culture = first.id ? await beat(my, () => deps.fetchJson(`/api/place/${encodeURIComponent(first.id)}/culture`).catch(() => null)) : null;
      const fan = culture?.artists?.find((a) => a?.name && a.name !== artist)?.name || culture?.artists?.[0]?.name;
      const trip = culture?.trips?.[0]?.name;
      if (fan && trip) await beat(my, () => deps.say(fill(t.fans, { fan, trip })));
      else if (fan) await beat(my, () => deps.say(fill(t.fansOnly, { fan })));
      await beat(my, () => deps.say(fill(t.end, {})));
    }

    async function townMission(mission, my, t) {
      const town = mission.town;
      await beat(my, () => deps.select(town));
      const [profile, cafes] = await beat(my, () => Promise.all([
        deps.fetchJson(`/api/town/profile?town=${encodeURIComponent(town)}`).catch(() => null),
        deps.fetchJson(`/api/catalog?town=${encodeURIComponent(town)}&category=food&kind=${encodeURIComponent("Cafe")}`).catch(() => null),
      ]));
      // "What the town loves": its standout vibes first, then the rest, three in all.
      const vibes = profile?.profile?.vibe || [];
      const tastes = [...vibes.filter((v) => v.standout), ...vibes.filter((v) => !v.standout)].slice(0, 3).map((v) => v?.name).filter(Boolean);
      const count = profile?.stats?.qloo ?? cafes?.count ?? "";
      await beat(my, () => deps.say(fill(t.town, { town, count, tastes: tastes.join(", ") || (mission.lang === "es" ? "lo puertorriqueño" : "Puerto Rican places") })));
      const places = (cafes?.places || []).filter((p) => p.lat != null && p.lon != null);
      if (!places.length) return deps.say(fill(t.none, {}));
      await beat(my, async () => deps.showCatalog({ town, places, focus: cafes.focus || "Cafés" }));
      await beat(my, () => deps.say(fill(t.townCafes, { place: places[0].name })));
      await beat(my, () => deps.openFoundPlace(places[0], town));
      const about = firstSentence(places[0].description || places[0].details?.standout || "");
      if (about) await beat(my, () => deps.say(fill(t.place, { place: places[0].name, about })));
      await beat(my, () => deps.say(fill(t.end, {})));
    }

    async function play(id) {
      const mission = MISSIONS.find((m) => m.id === id);
      if (!mission) return false;
      stop();
      const my = ++token;
      running = mission;
      deps.voiceLang?.(mission.lang);
      deps.onStart?.(mission);
      const t = T[mission.lang] || T.en;
      try {
        if (mission.kind === "artist") await artistMission(mission, my, t);
        else await townMission(mission, my, t);
      } catch (err) {
        if (err?.message !== "stopped") deps.onError?.(err);
      } finally {
        if (my === token) { running = null; deps.onEnd?.(mission); }
      }
      return true;
    }

    function stop() {
      if (!running) return;
      token += 1;
      const was = running;
      running = null;
      deps.onStop?.(was);
    }

    return { play, stop, playing: () => running, MISSIONS };
  }

  function chips(lang = "en") {
    const label = lang === "es" ? "Ver un recorrido" : "Watch a tour";
    return `<span class="mission-label">${label}</span>` + MISSIONS.map((m) =>
      `<button type="button" data-mission="${m.id}" lang="${m.lang}">▶ ${esc(m.title)}</button>`).join("");
  }

  window.ZemiMissions = { create, chips, fill, firstSentence, MISSIONS, T };
})();
