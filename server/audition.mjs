// Voice audition: the Aura-2 candidates Carlos listens to before a pair per language is chosen
// (docs/SPEC-2026-10-11-natural-voices.md; French, Italian and German added 2026-10-14, plan item 6).
// Pure data and the HTML page; the script runs it, optionally for a few languages only.

const slot = (lang, gender, names) => names.map((name) => ({
  id: `aura-2-${name}-${lang}`, lang, gender, name: name[0].toUpperCase() + name.slice(1),
}));

export const CANDIDATES = [
  ...slot("en", "female", ["andromeda", "delia", "phoebe", "helena"]),
  ...slot("en", "male", ["apollo", "arcas", "aries", "orion"]),
  ...slot("es", "female", ["selena", "gloria", "olivia", "estrella"]),
  ...slot("es", "male", ["aquila", "javier", "luciano", "sirio"]),
  // Deepgram lists two French voices, nine Italian and seven German (developers.deepgram.com/docs/tts-models).
  ...slot("fr", "female", ["agathe"]),
  ...slot("fr", "male", ["hector"]),
  ...slot("it", "female", ["melia", "livia", "demetra", "maia"]),
  ...slot("it", "male", ["elio", "cesare", "flavio", "dionisio"]),
  ...slot("de", "female", ["elara", "viktoria", "aurelia", "kara"]),
  ...slot("de", "male", ["julius", "fabian"]),
];

// The same two lines for every voice: short, contractions, two town names an English voice may trip on.
export const LINES = {
  en: "Hi, I'm Zemi-Aku. Let's look at Mayagüez. There's a lively food scene by the plaza, and a handful of cafés show up in Qloo. Want to see who's nearby, or should we jump over to Bayamón?",
  es: "Hola, soy Zemi-Aku. Vamos a mirar Mayagüez. Hay buen ambiente de comida cerca de la plaza, y en Qloo aparecen varias cafeterías. ¿Quiere ver quién está cerca, o pasamos a Bayamón?",
  fr: "Bonjour, je suis Zemi-Aku. Regardons Mayagüez. Il y a une belle scène gourmande près de la place, et quelques cafés apparaissent dans Qloo. Voulez-vous voir qui est à côté, ou passons-nous à Bayamón ?",
  it: "Ciao, sono Zemi-Aku. Guardiamo Mayagüez. C'è una bella scena gastronomica vicino alla piazza, e in Qloo compaiono alcuni caffè. Vuole vedere chi c'è nei dintorni, o passiamo a Bayamón?",
  de: "Hallo, ich bin Zemi-Aku. Schauen wir uns Mayagüez an. Rund um den Platz gibt es eine lebendige Essensszene, und in Qloo tauchen ein paar Cafés auf. Möchten Sie sehen, wer in der Nähe ist, oder gehen wir nach Bayamón?",
};

const SLOTS = [
  ["en", "female", "English · female"], ["en", "male", "English · male"],
  ["es", "female", "Español · femenina"], ["es", "male", "Español · masculina"],
  ["fr", "female", "Français · féminine"], ["fr", "male", "Français · masculine"],
  ["it", "female", "Italiano · femminile"], ["it", "male", "Italiano · maschile"],
  ["de", "female", "Deutsch · weiblich"], ["de", "male", "Deutsch · männlich"],
];

const escape = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// results: [{ id, lang, gender, name, file, status }], file null when Deepgram refused the id.
export function renderIndex(results) {
  const sections = SLOTS.map(([lang, gender, title]) => {
    const rows = results.filter((r) => r.lang === lang && r.gender === gender);
    if (!rows.length) return "";
    const figures = rows.map((r) => `<figure>
  <figcaption><strong>${escape(r.name)}</strong> <code>${escape(r.id)}</code></figcaption>
  ${r.file ? `<audio controls src="${escape(r.file)}"></audio>` : `<p class="missing">unavailable (${Number(r.status) || 0})</p>`}
</figure>`).join("\n");
    return `<section>
<h2>${escape(title)}</h2>
<p class="line">${escape(LINES[lang])}</p>
${figures}
</section>`;
  }).join("\n");
  return `<!doctype html>
<meta charset="utf-8">
<title>Zemi-Aku voice audition</title>
<style>
body { font: 16px/1.4 system-ui, sans-serif; max-width: 720px; margin: 24px auto; padding: 0 16px; }
section { border-top: 1px solid #ddd; padding-top: 12px; }
figure { margin: 0 0 16px; }
.line { color: #444; }
.missing { color: #a00; }
code { font-size: 13px; color: #666; }
audio { width: 100%; }
</style>
<h1>Zemi-Aku voice audition</h1>
<p>Pick one voice per slot and the default. Listen on a phone too.</p>
${sections}
`;
}
