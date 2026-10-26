# Blind judge panel, eighth round, October 25, 2026 (evening)

The same three agents from three vendors, the same [brief](evidence/judge-panel-2026-10-25d-brief.md) as the seven
earlier rounds (the latest: [seventh round](JUDGE-PANEL-2026-10-25c.md)), against the live site as it stood on the
round-eight release (`round8-20261025`, source `c78a6d1`). A fourth seat, GPT-6.1 Sol, ran the same brief at the same
time; its score is reported beside the panel and kept out of the mean so the eight rounds stay comparable. Reports:
[GPT-5.6](evidence/judge-panel-2026-10-25d-gpt.md) · [Claude Opus 5.5](evidence/judge-panel-2026-10-25d-opus.md) ·
[Grok 4.7](evidence/judge-panel-2026-10-25d-grok.md) · [GPT-6.1 (fourth seat)](evidence/judge-panel-2026-10-25d-gpt61.md).
No crashes and no fabricated place. GPT-5.6 and GPT-6.1 found no High defect.

**This is automated independent review, not user testing.** Devpost copy must not call these evaluators users or
testers.

## Scores

| Criterion | GPT | Opus | Grok | Mean | 7th | 6th | 5th | 4th | 3rd | 2nd | 1st | GPT-6.1 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| LLM + Qloo use | 5 | 4 | 4 | 4.3 | 4.3 | 4.0 | 4.3 | 4.3 | 3.8 | 4.3 | 3.7 | 4 |
| Technical execution | 4 | 4 | 4 | 4.0 | 4.0 | 3.3 | 4.0 | 4.0 | 3.8 | 3.3 | 4.0 | 4 |
| Originality | 5 | 4 | 4 | 4.3 | 4.3 | 4.3 | 4.3 | 4.3 | 4.3 | 4.3 | 4.3 | 4 |
| Real-world impact | 4 | 3 | 4 | 3.7 | 3.3 | 3.3 | 3.7 | 3.3 | 3.3 | 3.3 | 3.3 | 3 |
| **Total / 20** | **18** | **15** | **16** | **16.3** | **16.0** | **15.0** | **16.3** | **16.0** | **15.3** | **15.3** | **15.3** | **15** |

16.3, level with the best round (the fifth). Real-world impact rose from 3.3 to 3.7 on Grok's point. Eight rounds read
15.3, 15.3, 15.3, 16.0, 16.3, 15.0, 16.0, 16.3.

**Caveat on Grok's High.** Its session ran out of model turns after three live answers. The cap is 40 model turns per
visitor address per UTC day, and the four evaluators ran at once from one address that had also run the round-eight
live checks that UTC day, so a judge on their own address would most likely not hit it that early. What it exposed is still real: once the rules fallback
answers, "¿Dónde comen los fans de Vico C en Mayagüez?" becomes a name search for "Comen Vico C", and a profit
question opens a popularity list.

## What the round-eight cut fixed, as the panel saw it

- GPT-5.6: at 390 px "a clear 'Show the answer' control preserves access"; typing Spanish "does switch the entire UI
  correctly". GPT-6.1: "No horizontal overflow or complete interaction blocker was observed."
- All four quote "Qloo lists these bars under restaurants, which is why they appear here."
- No evaluator reported an unasked vegan, parking or budget disclaimer.

## Found this round, by how many evaluators hit it

- **High (Opus; GPT-5.6 Med).** An island-wide question falls back to the open town: "¿En qué pueblo abro una
  cafetería?" for Marc Anthony fans answered only for Culebra; a failed Björk ranking retitled the panel "Björk fans
  in Maricao".
- **High (Grok).** After the model cap, the rules fallback turns artist and follow-up questions into place-name
  searches ("Comen Vico C", "Alli Se Vende Bien") instead of saying the model is out of turns.
- **Med (Opus, GPT-6.1).** After "Ask again without Qloo", the side panel keeps the artist title and a Qloo list
  while the answer says those places were removed.
- **Med (all four).** "Where do fans eat" still returns mostly bars, El Techo "Closed today"; La Placita shows "Open
  24 hours" on the card and "Hoy 5:00 pm–3:00 am" on its page.
- **Med (Opus, GPT-5.6).** Spanish is not visible on the first screen; the switch is "EN · Andromeda", which reads as a
  voice setting.
- **Med (GPT-5.6).** "Abriría cerca del centro, junto a la plaza, donde ya hay movimiento" for Maricao, with no
  foot-traffic data behind it.
- **Med (Opus).** A Mayagüez against Caguas comparison shows only Caguas cards, about 111 km away.
- **Med (Grok).** The answer dock survives opening another place (a Culebra verdict on La Placita's page); the spoken
  line says "5 per hundred thousand" where the panel says "0.5 per 10,000"; two phones from two sources under one
  label.
- **Med (GPT-6.1).** "Strong match … (96%)" has no plain definition and reads as patronage.
- **Low.** A raw English refusal in the Spanish interface; "brecha" in an English answer; "1 lugares"; "¿Y allí?"
  switched towns without asking; card hours carry no snapshot date; a profit refusal assumed no employees; two San
  Juan populations (PRCS and Wikidata); a speech request seen right after an answer, before playback was pressed
  (Opus; to check).

## What each evaluator asked for first

- GPT-5.6: an evidence boundary on business advice (a town and a field plan, never "near the plaza").
- Opus: island-wide scope for "which town" questions, with cards for every town compared.
- Grok: when the model cap is hit, say so and stop; never rewrite a question as a name search.
- GPT-6.1: an airtight control (no stale title, a defined percentage) and a small field check against a catalog-only
  shortlist.
