// Instant samples (plan item 10): three saved model runs served when the model cannot answer (daily
// budget spent, provider down, a refused round). The page shows them as the real thing, with the
// evidence drawer labeled "saved replay" and the time the data was read. Nothing here calls a model.
import fs from "node:fs";
import path from "node:path";
import { fold } from "./lib.mjs";

export const SAMPLE_PROMPTS = [
  { id: "bad-bunny-bayamon", lang: "en", question: "Where do Bad Bunny fans eat in Bayamón?" },
  { id: "maricao", lang: "en", question: "What is there to do in Maricao?" },
  { id: "mofongo-ponce", lang: "es", question: "¿Dónde comer mofongo en Ponce?" },
];

// A saved run as the page should receive it: the answer and its map actions as they were, the
// evidence re-labeled as a replay with the save time on every call.
// A saved place's "Today 8:00 am–4:30 pm" was true on the save day only; the replay drops it.
function timeless(action) {
  const strip = ({ hours, ...place }) => place;
  const out = { ...action };
  if (Array.isArray(action.places)) out.places = action.places.map(strip);
  if (action.place && typeof action.place === "object") out.place = strip(action.place);
  return out;
}

export function replayOf(sample) {
  const calls = (sample.evidence?.calls || []).map((call) => ({ ...call, retrievedAt: sample.savedAt }));
  return {
    agent: true, chat: true, replay: true, speech: sample.speech, spoken: sample.spoken, actions: (sample.actions || []).map(timeless),
    evidence: { mode: "replay", model: sample.model, at: sample.savedAt, calls },
  };
}

export function createSamples({ dir }) {
  const byKey = new Map();
  if (fs.existsSync(dir)) {
    for (const name of fs.readdirSync(dir).filter((file) => file.endsWith(".json"))) {
      try {
        const sample = JSON.parse(fs.readFileSync(path.join(dir, name), "utf8"));
        if (typeof sample.question === "string" && typeof sample.speech === "string" && sample.lang) byKey.set(`${sample.lang}:${fold(sample.question)}`, sample);
      } catch { /* a bad file is skipped, never served */ }
    }
  }
  return {
    size: byKey.size,
    // Exact question in the same language, compared without accents, case or punctuation.
    match({ question, lang = "en" }) {
      const sample = byKey.get(`${lang}:${fold(question)}`);
      return sample ? replayOf(sample) : null;
    },
  };
}
