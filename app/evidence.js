// The evidence drawer under an agent answer: what the model called, what each call returned, which
// Qloo IDs it resolved, and when. Pure markup from the server's `evidence` object; the page appends it
// to the caption. Folded by default so a phone sees one extra line.
(function () {
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const T = {
    en: { evidence: "Evidence", model: "live model", rules: "rules router", replay: "saved replay", call: (n) => `${n} tool call${n === 1 ? "" : "s"}`,
      noTurn: "no model turn", unfinished: "model did not finish", place: (n) => `${n} place${n === 1 ? "" : "s"}`, measured: "catalog measured", read: "read", refused: "refused",
      done: "done", more: (n) => `+${n} more`, modelLine: (m) => `Model ${m} via OpenRouter`, rounds: (n) => `${n} round${n === 1 ? "" : "s"}`, answered: "answered", ids: "Qloo IDs",
      rulesBody: "Answered by the rule-based router from the saved Qloo catalog", replayBody: "A saved run, replayed; the times are when its data was read",
      reasons: { clarify: "a question back, no record read", hours: "the note gave opening hours; the cards carry them", phone: "the note gave a phone number", quote: "the note quoted the tool", budget: "daily model budget spent", "visitor-cap": "your model turns for today are used", "no-key": "no model configured",
        echo: "the model repeated the verdict", number: "the model restated a figure; the verdict carries the numbers", claim: "the model made a claim the data cannot carry", language: "the note is written in English and Spanish only" },
      failed: (code) => `the model did not answer: ${code}`, decimal: ".",
      sources: (n) => `${n} source${n === 1 ? "" : "s"}`, kinds: { business: "business research", opportunity: "opportunity map" },
      sourcesBody: "Answered from these sources without a model turn",
      hybrid: "sources + live model", hybridBody: "The verdict sentence is rule-based from these sources; the model wrote the closing sentences from the same data",
      noteSkipped: (why) => `the model's closing note was skipped: ${why}`,
      control: "without Qloo tools, no history", again: "Ask again without Qloo" },
    es: { evidence: "Evidencia", model: "modelo en vivo", rules: "reglas", replay: "repetición guardada", call: (n) => `${n} llamada${n === 1 ? "" : "s"}`,
      noTurn: "sin turno del modelo", unfinished: "el modelo no terminó", place: (n) => `${n} lugar${n === 1 ? "" : "es"}`, measured: "catálogo medido", read: "leído", refused: "rechazada",
      done: "hecho", more: (n) => `+${n} más`, modelLine: (m) => `Modelo ${m} vía OpenRouter`, rounds: (n) => `${n} ronda${n === 1 ? "" : "s"}`, answered: "respondió", ids: "IDs de Qloo",
      rulesBody: "Respondió el enrutador de reglas desde el catálogo guardado de Qloo", replayBody: "Una corrida guardada, repetida; las horas son de cuando se leyeron sus datos",
      reasons: { clarify: "una pregunta de vuelta, sin leer registros", hours: "la nota dio horarios; las tarjetas los llevan", phone: "la nota dio un teléfono", quote: "la nota citó la herramienta", budget: "presupuesto diario del modelo agotado", "visitor-cap": "sus turnos del modelo de hoy se usaron", "no-key": "sin modelo configurado",
        echo: "el modelo repitió el veredicto", number: "el modelo repitió una cifra; el veredicto lleva los números", claim: "el modelo afirmó algo que los datos no sostienen", language: "la nota solo se escribe en inglés y español" },
      failed: (code) => `el modelo no respondió: ${code}`, decimal: ",",
      sources: (n) => `${n} fuente${n === 1 ? "" : "s"}`, kinds: { business: "investigación de negocio", opportunity: "mapa de oportunidad" },
      sourcesBody: "Respondido desde estas fuentes, sin turno del modelo",
      hybrid: "fuentes + modelo en vivo", hybridBody: "La oración del veredicto sale de reglas sobre estas fuentes; el modelo escribió las oraciones finales con los mismos datos",
      noteSkipped: (why) => `la nota final del modelo se omitió: ${why}`,
      control: "sin las herramientas de Qloo, sin historial", again: "Preguntar otra vez sin Qloo" },
  };
  const short = (id) => (/^[0-9a-fA-F-]{36}$/.test(id) ? `${id.slice(0, 4)}…${id.slice(-4)}` : id);
  const utc = (iso) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 16).replace("T", " ") + " UTC";
  };
  const seconds = (ms, t) => (Math.round(ms / 100) / 10).toFixed(1).replace(".", t.decimal) + " s";

  function callLine(call, t) {
    const args = Object.values(call.args || {}).map((v) => esc(short(String(v)))).join(", ");
    const head = `<code>${esc(call.tool)}</code>${args ? " " + args : ""}`;
    if (!call.ok) return `<li>${head} → ${t.refused}: ${esc(call.error || "")}</li>`;
    const parts = [];
    if (call.source) parts.push(esc(call.source));
    if (Number.isInteger(call.count)) parts.push(t.place(call.count));
    if (call.measured) parts.push(`${t.measured} ${esc(call.measured)}`);
    if (call.retrievedAt) parts.push(`${t.read} ${utc(call.retrievedAt)}`);
    if (call.note) parts.push(esc(call.note));
    if (call.ms >= 50) parts.push(seconds(call.ms, t));
    if (call.error) parts.push(esc(call.error));
    return `<li>${head} → ${parts.length ? parts.join(" · ") : t.done}</li>`;
  }

  function html(lang, evidence) {
    if (!evidence || typeof evidence !== "object" || !["model", "rules", "replay", "sources"].includes(evidence.mode)) return "";
    const t = T[lang] || T.en;
    const calls = Array.isArray(evidence.calls) ? evidence.calls : [];
    const when = evidence.at ? utc(evidence.at) : "";
    let summary, body;
    if (evidence.mode === "sources") {
      // A deterministic answer (business research, opportunity map): the sources it was read from. With a
      // closing note the line says "sources + live model" and offers the control run; a skipped note says why.
      const note = evidence.note && typeof evidence.note === "object" ? evidence.note : null;
      const hybrid = Boolean(note?.model);
      summary = hybrid
        ? `${t.evidence} · ${t.kinds[evidence.kind] || t.rules} · ${t.hybrid} · ${t.sources(calls.length)} · ${seconds(note.ms || 0, t)}`
        : `${t.evidence} · ${t.kinds[evidence.kind] || t.rules} · ${t.noTurn} · ${t.sources(calls.length)}`;
      body = `<ul>${calls.map((call) => callLine(call, t)).join("")}</ul><p>${hybrid ? `${t.hybridBody} · ${t.modelLine(esc(note.model))}` : t.sourcesBody}${when ? ` · ${when}` : ""}</p>`
        + (hybrid ? `<p><button type="button" class="control-run" data-control-run>${t.again}</button></p>`
          : note?.fallback ? `<p>${t.noteSkipped(t.reasons[note.fallback] || esc(String(note.fallback)))}</p>` : "");
    } else if (evidence.mode === "rules") {
      const why = t.reasons[evidence.reason] || t.failed(esc(String(evidence.reason || "unknown")));
      if (calls.length) {
        summary = `${t.evidence} · ${t.rules} · ${t.unfinished} (${why}) · ${t.call(calls.length)}`;
        body = `<ul>${calls.map((call) => callLine(call, t)).join("")}</ul><p>${t.rulesBody}${when ? ` · ${when}` : ""}</p>`;
      } else {
        summary = `${t.evidence} · ${t.rules} · ${t.noTurn} (${why})`;
        body = `<p>${t.rulesBody}${when ? ` · ${when}` : ""}</p>`;
      }
    } else {
      const ids = [...new Set(calls.flatMap((call) => call.ids || []))].map(short);
      const list = calls.length ? `<ul>${calls.map((call) => callLine(call, t)).join("")}</ul>` : "";
      if (evidence.mode === "model") {
        // A control run says so in the folded line; a normal run offers the same question without Qloo.
        const control = evidence.control === "no-qloo";
        summary = `${t.evidence} · ${t.model}${control ? ` · ${t.control}` : ""} · ${t.call(calls.length)} · ${seconds(evidence.ms || 0, t)}`;
        // The control is offered only when a Qloo tool answered; a refusal or a map-only turn has nothing to remove
        // (judge panel 10/25 round 6).
        const usedQloo = calls.some((call) => call.ok !== false && (/qloo/i.test(String(call.source || "")) || /^(qloo_|artist_places|fans_also_love|town_catalog|find_places|place_details|opportunity_map)/.test(String(call.tool || ""))));
        body = `${list}<p>${t.modelLine(esc(evidence.model || "?"))} · ${t.rounds(evidence.rounds || 1)}${when ? ` · ${t.answered} ${when}` : ""}</p>`
          + (control || !usedQloo ? "" : `<p><button type="button" class="control-run" data-control-run>${t.again}</button></p>`);
      } else {
        summary = `${t.evidence} · ${t.replay} · ${t.call(calls.length)}`;
        body = `${list}<p>${t.replayBody}${when ? ` · ${when}` : ""}</p>`;
      }
      if (ids.length) body += `<p>${t.ids}: ${ids.slice(0, 8).map(esc).join(", ")}${ids.length > 8 ? `, ${t.more(ids.length - 8)}` : ""}</p>`;
    }
    return `<details class="evidence small"><summary>${summary}</summary>${body}</details>`;
  }

  // Answer body for the caption: optional place result cards, then the folded evidence line at the bottom.
  function answerBody(lang, evidence, placesHtml = "") {
    return `${placesHtml || ""}${html(lang, evidence)}`;
  }

  window.ZemiEvidence = { html, answerBody };
})();
