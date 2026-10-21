// The spoken answer. It only restates the records the server already picked (the brief).
// The lines themselves live in server/spoken.mjs ("catalog" kind); this keeps the old entry point.
import { spoken } from "./spoken.mjs";

export function speechFor(lang, brief = {}) {
  return spoken("catalog", brief, lang);
}

export function firstSentence(text) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  const dot = clean.indexOf(". ");
  if (dot > 40 && dot < 280) return clean.slice(0, dot + 1);
  return clean.slice(0, 220);
}
