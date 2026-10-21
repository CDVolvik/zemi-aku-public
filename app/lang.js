// Which language a typed question is in, so the answer comes back in it. Only English and Spanish
// are told apart: a strong Spanish mark (¿ ¡ á é í ó ú ñ) or more Spanish words than English ones.
// Anything unclear ("Ponce", "mofongo") returns "" and the page keeps the language it had.
(function () {
  const ES = new Set(("dónde donde qué que cuál cuáles cómo como cuándo quién quiénes hay comer comida restaurante " +
    "restaurantes cerca mejor mejores para con los las del una un el la de en es son y me mi quiero busco dame " +
    "muéstrame recomienda recomiéndame lugares sitios pueblo playa playas abrir negocio cafetería tienda hotel " +
    "fanáticos gente dónde está están tiene tienen ver visitar cenar desayunar almorzar algo bueno buena").split(" "));
  const EN = new Set(("where what which how when who the is are best near eat do for with and of in to should open " +
    "want like good place places town beach stay find show me my any some nearby around there here food " +
    "restaurant restaurants cafe coffee dinner lunch breakfast visit see").split(" "));

  function guessLang(text) {
    const s = String(text || "").toLowerCase();
    let es = /[¿¡]/.test(s) ? 3 : 0;
    es += (s.match(/[áéíóúñ]/g) || []).length;
    let en = 0;
    for (const word of s.split(/[^\p{L}]+/u).filter(Boolean)) {
      if (ES.has(word)) es += 1;
      else if (EN.has(word)) en += 1;
    }
    if (es && es > en) return "es";
    if (en && en > es) return "en";
    return "";
  }

  // Affinity why-lines are generated server-side (server/lib.mjs affinityWhy) and arrive as place.why.
  window.ZemiLang = { guessLang };
})();
